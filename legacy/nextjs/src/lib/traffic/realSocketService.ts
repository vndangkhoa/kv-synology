import fs from "fs";
import path from "path";
import { NetworkConnectionItem, TrafficDirection, TrustLevel } from "./types";
import { resolveIpGeo, isPrivateIp } from "./geoIpService";

function parseHexIpv4(hex: string): string {
  if (!hex || hex.length !== 8) return "0.0.0.0";
  const parts: number[] = [];
  for (let i = 6; i >= 0; i -= 2) {
    parts.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return parts.join(".");
}

function parseHexIpv6(hex: string): string {
  if (!hex || hex.length !== 32) return "::";
  if (
    hex.toLowerCase().startsWith("0000000000000000ffff0000") ||
    hex.toLowerCase().startsWith("00000000000000000000ffff")
  ) {
    const v4hex = hex.substring(24);
    return parseHexIpv4(v4hex);
  }
  const groups: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    const chunk = hex.substring(i, i + 4);
    const rev = chunk.substring(2, 4) + chunk.substring(0, 2);
    groups.push(parseInt(rev, 16).toString(16));
  }
  const uncompressed = groups.join(":");
  return uncompressed.replace(/(?:^|:)(?:0(?::0)+)(?=:|$)/, "::");
}

function parseHexPort(hex: string): number {
  return parseInt(hex, 16) || 0;
}

const TCP_STATES: Record<string, NetworkConnectionItem["state"]> = {
  "01": "ESTABLISHED",
  "02": "SYN_SENT",
  "03": "SYN_SENT",
  "04": "TIME_WAIT",
  "05": "TIME_WAIT",
  "06": "TIME_WAIT",
  "07": "CLOSE_WAIT",
  "08": "CLOSE_WAIT",
  "09": "CLOSE_WAIT",
  "0A": "LISTEN",
  "0B": "CLOSE_WAIT",
};

// In-memory tracker for rate delta calculation
let prevNetDevSample: { rx: number; tx: number; time: number } | null = null;
const socketTrafficHistory = new Map<string, { totalRx: number; totalTx: number; lastRx: number; lastTx: number; lastTime: number }>();

export interface InterfaceStats {
  totalRxBytes: number;
  totalTxBytes: number;
  currentRxSpeed: number;
  currentTxSpeed: number;
}

/**
 * Read system-wide network interface counters from /proc/net/dev
 */
export function getNetworkInterfaceStats(): InterfaceStats {
  let totalRx = 0;
  let totalTx = 0;

  try {
    if (fs.existsSync("/proc/net/dev")) {
      const lines = fs.readFileSync("/proc/net/dev", "utf8").split("\n").slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/[:\s]+/);
        if (parts.length < 10) continue;
        const iface = parts[0];
        if (iface === "lo") continue; // Exclude loopback
        const rx = parseInt(parts[1], 10) || 0;
        const tx = parseInt(parts[9], 10) || 0;
        totalRx += rx;
        totalTx += tx;
      }
    }
  } catch (_) {}

  const now = Date.now();
  let currentRxSpeed = 0;
  let currentTxSpeed = 0;

  if (prevNetDevSample && now > prevNetDevSample.time) {
    const dt = (now - prevNetDevSample.time) / 1000;
    if (dt > 0.3) {
      currentRxSpeed = Math.max(0, Math.round((totalRx - prevNetDevSample.rx) / dt));
      currentTxSpeed = Math.max(0, Math.round((totalTx - prevNetDevSample.tx) / dt));
      prevNetDevSample = { rx: totalRx, tx: totalTx, time: now };
    }
  } else {
    prevNetDevSample = { rx: totalRx, tx: totalTx, time: now };
  }

  return {
    totalRxBytes: totalRx,
    totalTxBytes: totalTx,
    currentRxSpeed,
    currentTxSpeed,
  };
}

/**
 * Read process I/O counters from /proc/[pid]/io
 */
export function getProcessIoCounters(pid?: number): { readBytes: number; writeBytes: number } {
  if (!pid) return { readBytes: 0, writeBytes: 0 };
  try {
    const ioPath = path.join("/proc", String(pid), "io");
    if (!fs.existsSync(ioPath)) return { readBytes: 0, writeBytes: 0 };
    const content = fs.readFileSync(ioPath, "utf8");
    let r = 0;
    let w = 0;
    for (const line of content.split("\n")) {
      if (line.startsWith("read_bytes:") || line.startsWith("rchar:")) {
        const val = parseInt(line.split(":")[1]?.trim() || "0", 10);
        if (val > r) r = val;
      }
      if (line.startsWith("write_bytes:") || line.startsWith("wchar:")) {
        const val = parseInt(line.split(":")[1]?.trim() || "0", 10);
        if (val > w) w = val;
      }
    }
    return { readBytes: r, writeBytes: w };
  } catch (_) {
    return { readBytes: 0, writeBytes: 0 };
  }
}

/**
 * Builds a fast map of socket inode -> { pid, processName, readBytes, writeBytes }
 */
function buildInodeProcessMap(): Map<string, { pid: number; processName: string; readBytes: number; writeBytes: number }> {
  const map = new Map<string, { pid: number; processName: string; readBytes: number; writeBytes: number }>();

  try {
    if (!fs.existsSync("/proc")) return map;
    const entries = fs.readdirSync("/proc");

    for (const entry of entries) {
      if (!/^[0-9]+$/.test(entry)) continue;
      const pid = parseInt(entry, 10);
      const fdDir = path.join("/proc", entry, "fd");

      try {
        if (!fs.existsSync(fdDir)) continue;
        let comm = "";
        try {
          comm = fs.readFileSync(path.join("/proc", entry, "comm"), "utf8").trim();
        } catch (_) {}

        if (!comm || comm === "node" || comm === "python" || comm === "python3") {
          try {
            const cmdline = fs.readFileSync(path.join("/proc", entry, "cmdline"), "utf8");
            const firstArg = cmdline.split("\0")[0] || "";
            const base = path.basename(firstArg);
            if (base) comm = base;
          } catch (_) {}
        }

        const io = getProcessIoCounters(pid);

        const fds = fs.readdirSync(fdDir);
        for (const fd of fds) {
          try {
            const link = fs.readlinkSync(path.join(fdDir, fd));
            const match = link.match(/^socket:\[([0-9]+)\]$/);
            if (match) {
              map.set(match[1], {
                pid,
                processName: comm || "system",
                readBytes: io.readBytes,
                writeBytes: io.writeBytes,
              });
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (_) {}

  return map;
}

export interface RawSocketEntry {
  protocol: "TCP" | "UDP";
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: NetworkConnectionItem["state"];
  inode: string;
  pid?: number;
  processName: string;
  rxQueue?: number;
  txQueue?: number;
  procReadBytes?: number;
  procWriteBytes?: number;
}

/**
 * Read live sockets directly from Linux /proc/net/tcp, tcp6, udp, udp6
 */
export function getLiveLinuxSockets(): RawSocketEntry[] {
  const list: RawSocketEntry[] = [];
  const inodeMap = buildInodeProcessMap();

  const files: Array<{ file: string; proto: "TCP" | "UDP"; isV6: boolean }> = [
    { file: "/proc/net/tcp", proto: "TCP", isV6: false },
    { file: "/proc/net/tcp6", proto: "TCP", isV6: true },
    { file: "/proc/net/udp", proto: "UDP", isV6: false },
    { file: "/proc/net/udp6", proto: "UDP", isV6: true },
  ];

  for (const { file, proto, isV6 } of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n").slice(1);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;

        const [localHexIp, localHexPort] = parts[1].split(":");
        const [remHexIp, remHexPort] = parts[2].split(":");
        const stateHex = parts[3];
        const txQueueHex = parts[4]?.split(":")[0] || "0";
        const rxQueueHex = parts[4]?.split(":")[1] || "0";
        const inode = parts[9];

        const localAddress = isV6 ? parseHexIpv6(localHexIp) : parseHexIpv4(localHexIp);
        const localPort = parseHexPort(localHexPort);
        const remoteAddress = isV6 ? parseHexIpv6(remHexIp) : parseHexIpv4(remHexIp);
        const remotePort = parseHexPort(remHexPort);

        if (remoteAddress === "0.0.0.0" || remoteAddress === "::" || remotePort === 0) {
          continue;
        }

        const state: NetworkConnectionItem["state"] = proto === "UDP"
          ? "UDP"
          : TCP_STATES[stateHex] || "ESTABLISHED";

        const proc = inodeMap.get(inode) || {
          pid: undefined,
          processName: "system",
          readBytes: 0,
          writeBytes: 0,
        };

        list.push({
          protocol: proto,
          localAddress,
          localPort,
          remoteAddress,
          remotePort,
          state,
          inode,
          pid: proc.pid,
          processName: proc.processName,
          rxQueue: parseInt(rxQueueHex, 16) || 0,
          txQueue: parseInt(txQueueHex, 16) || 0,
          procReadBytes: proc.readBytes,
          procWriteBytes: proc.writeBytes,
        });
      }
    } catch (_) {}
  }

  return list;
}

/**
 * Fetch real active connected users and client IPs from Synology DSM API (SYNO.Core.CurrentConnection)
 */
export async function getLiveDsmConnections(dsmConfig?: {
  host: string;
  port: number;
  https: boolean;
  sid?: string;
  synoToken?: string;
}): Promise<RawSocketEntry[]> {
  if (!dsmConfig?.host || !dsmConfig.sid) return [];

  try {
    const protocol = dsmConfig.https ? "https" : "http";
    const url = `${protocol}://${dsmConfig.host}:${dsmConfig.port}/webapi/entry.cgi`;

    const formData = new URLSearchParams();
    formData.append("api", "SYNO.Core.CurrentConnection");
    formData.append("version", "1");
    formData.append("method", "list");
    formData.append("offset", "0");
    formData.append("limit", "200");
    formData.append("sort_by", '"time"');
    formData.append("sort_direction", '"DESC"');
    formData.append("_sid", dsmConfig.sid);
    if (dsmConfig.synoToken) {
      formData.append("SynoToken", dsmConfig.synoToken);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: `id=${dsmConfig.sid}`,
        ...(dsmConfig.synoToken ? { "X-SYNO-TOKEN": dsmConfig.synoToken } : {}),
      },
      body: formData.toString(),
    });

    const data = await res.json();
    if (data.success && (Array.isArray(data.data?.items) || Array.isArray(data.data?.connections))) {
      const items = data.data.items || data.data.connections;
      return items.map((item: any) => {
        const clientIp = item.who || item.ip || item.client_ip || "127.0.0.1";
        const service = item.type || item.service || item.descr || "DSM Service";
        const user = item.user ? ` (${item.user})` : "";

        return {
          protocol: "TCP",
          localAddress: dsmConfig.host,
          localPort: dsmConfig.port,
          remoteAddress: clientIp,
          remotePort: 0,
          state: "ESTABLISHED",
          inode: `dsm_${item.time || Date.now()}`,
          processName: `dsm_${service.toLowerCase()}${user}`,
        };
      });
    }
  } catch (_) {}

  return [];
}
