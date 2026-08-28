"use client";

import React, { useState, useMemo } from "react";
import { NetworkConnectionItem, TrafficSummary } from "@/lib/traffic/types";
import { formatBytes, formatSpeed } from "@/lib/utils";
import {
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Maximize2,
  Minimize2,
  Zap,
  Layers,
  Building,
  Server,
  Activity,
  Filter,
  X,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Radio,
  Sliders,
  Play,
  RotateCcw,
} from "lucide-react";

interface DataFlowGraphProps {
  connections: NetworkConnectionItem[];
  summary: TrafficSummary | null;
  onSelectIp: (ip: string) => void;
  onBlockIp?: (ip: string) => void;
}

interface ProcessNode {
  id: string;
  name: string;
  connections: number;
  outboundBytes: number;
  inboundBytes: number;
  txSpeed: number;
  rxSpeed: number;
  pids: number[];
}

interface CountryNode {
  id: string;
  code: string;
  name: string;
  flag: string;
  connections: number;
  outboundBytes: number;
  inboundBytes: number;
  txSpeed: number;
  rxSpeed: number;
  isps: string[];
}

interface IspNode {
  id: string;
  name: string;
  countryCode: string;
  connections: number;
  outboundBytes: number;
  txSpeed: number;
  ips: string[];
  trustLevel: string;
}

export const DataFlowGraph: React.FC<DataFlowGraphProps> = ({
  connections,
  summary,
  onSelectIp,
  onBlockIp,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<{
    type: "process" | "nas" | "country" | "isp" | "ip";
    id: string;
    data: any;
  } | null>(null);
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [customTrustMap, setCustomTrustMap] = useState<Record<string, "trusted" | "suspicious" | "blocked">>({});

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Group & Aggregate Process Nodes
  const processNodes: ProcessNode[] = useMemo(() => {
    const map = new Map<string, ProcessNode>();
    for (const c of connections) {
      const pName = c.processName.split(" ")[0] || c.processName || "system";
      if (!map.has(pName)) {
        map.set(pName, {
          id: `proc_${pName}`,
          name: pName,
          connections: 0,
          outboundBytes: 0,
          inboundBytes: 0,
          txSpeed: 0,
          rxSpeed: 0,
          pids: [],
        });
      }
      const node = map.get(pName)!;
      node.connections++;
      node.outboundBytes += c.totalTxBytes || 0;
      node.inboundBytes += c.totalRxBytes || 0;
      node.txSpeed += c.txSpeedBytes || 0;
      node.rxSpeed += c.rxSpeedBytes || 0;
      if (c.pid && !node.pids.includes(c.pid)) node.pids.push(c.pid);
    }
    return Array.from(map.values())
      .sort((a, b) => b.outboundBytes - a.outboundBytes)
      .slice(0, 6);
  }, [connections]);

  // 2. Group & Aggregate Country Nodes
  const countryNodes: CountryNode[] = useMemo(() => {
    const map = new Map<string, CountryNode>();
    for (const c of connections) {
      const cCode = c.geo.countryCode || "UNKNOWN";
      if (!map.has(cCode)) {
        map.set(cCode, {
          id: `country_${cCode}`,
          code: cCode,
          name: c.geo.countryName || cCode,
          flag: c.geo.flagEmoji || "🌐",
          connections: 0,
          outboundBytes: 0,
          inboundBytes: 0,
          txSpeed: 0,
          rxSpeed: 0,
          isps: [],
        });
      }
      const node = map.get(cCode)!;
      node.connections++;
      node.outboundBytes += c.totalTxBytes || 0;
      node.inboundBytes += c.totalRxBytes || 0;
      node.txSpeed += c.txSpeedBytes || 0;
      node.rxSpeed += c.rxSpeedBytes || 0;
      if (c.geo.isp && !node.isps.includes(c.geo.isp)) node.isps.push(c.geo.isp);
    }
    return Array.from(map.values())
      .sort((a, b) => b.outboundBytes - a.outboundBytes)
      .slice(0, 5);
  }, [connections]);

  // 3. Group & Aggregate ISP Target Nodes
  const ispNodes: IspNode[] = useMemo(() => {
    const map = new Map<string, IspNode>();
    for (const c of connections) {
      const ispName = c.geo.isp || "Unknown Provider";
      if (!map.has(ispName)) {
        map.set(ispName, {
          id: `isp_${ispName}`,
          name: ispName,
          countryCode: c.geo.countryCode || "UN",
          connections: 0,
          outboundBytes: 0,
          txSpeed: 0,
          ips: [],
          trustLevel: customTrustMap[ispName] || c.geo.trustLevel || "standard_foreign",
        });
      }
      const node = map.get(ispName)!;
      node.connections++;
      node.outboundBytes += c.totalTxBytes || 0;
      node.txSpeed += c.txSpeedBytes || 0;
      if (!node.ips.includes(c.remoteAddress)) node.ips.push(c.remoteAddress);
    }
    return Array.from(map.values())
      .sort((a, b) => b.outboundBytes - a.outboundBytes)
      .slice(0, 6);
  }, [connections, customTrustMap]);

  // Filter connections if a node is isolated
  const activeConnections = useMemo(() => {
    if (!isolatedNodeId) return connections;
    if (isolatedNodeId.startsWith("proc_")) {
      const pName = isolatedNodeId.replace("proc_", "");
      return connections.filter((c) => c.processName.startsWith(pName));
    }
    if (isolatedNodeId.startsWith("country_")) {
      const cCode = isolatedNodeId.replace("country_", "");
      return connections.filter((c) => (c.geo.countryCode || "UNKNOWN") === cCode);
    }
    if (isolatedNodeId.startsWith("isp_")) {
      const ispName = isolatedNodeId.replace("isp_", "");
      return connections.filter((c) => c.geo.isp === ispName);
    }
    return connections;
  }, [connections, isolatedNodeId]);

  // NAS Host Master Aggregated Data
  const nasNodeData = useMemo(() => ({
    id: "nas_master",
    name: "Synology DSM Host Master (192.168.31.71)",
    outboundBytes: summary?.totalOutboundBytes || connections.reduce((a, c) => a + (c.totalTxBytes || 0), 0),
    inboundBytes: summary?.totalInboundBytes || connections.reduce((a, c) => a + (c.totalRxBytes || 0), 0),
    txSpeed: summary?.currentOutboundSpeed || connections.reduce((a, c) => a + (c.txSpeedBytes || 0), 0),
    rxSpeed: summary?.currentInboundSpeed || connections.reduce((a, c) => a + (c.rxSpeedBytes || 0), 0),
    connections: summary?.totalConnections || connections.length,
    destinations: countryNodes.length,
    isps: ispNodes.length,
  }), [summary, connections, countryNodes.length, ispNodes.length]);

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 p-4 sm:p-8 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in"
          : "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      }`}
    >
      {/* Visualizer Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Sơ đồ Luồng Dữ liệu &amp; Định tuyến IP Trực quan (Interactive Data Flow Graph)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Click để Mở rộng &amp; Điều chỉnh Luồng
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi trực tiếp đường đi của gói tin từ Tiến trình NAS ➔ Cổng Gateway ➔ Quốc gia ➔ Nhà mạng &amp; IP đích
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isolatedNodeId && (
            <button
              onClick={() => setIsolatedNodeId(null)}
              className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1 hover:bg-amber-500/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Bỏ cô lập luồng
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
            title={isFullscreen ? "Thu nhỏ về bảng" : "Mở rộng toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas & Visual Hierarchy */}
      {connections.length === 0 ? (
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-sky-500/20 animate-ping absolute" />
            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/40 animate-pulse absolute" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
              <Activity className="w-6 h-6 animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              Đang quét toàn bộ luồng mạng &amp; phân giải GeoIP...
            </h4>
            <p className="text-xs text-slate-400">
              Khởi tạo radar phân tích 4 tầng (Tiến trình NAS ➔ Gateway ➔ Quốc gia ➔ Nhà mạng ISP).
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 relative pt-2">
        {/* Tier 1: NAS Local Processes */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              1. Tiến trình &amp; Dịch vụ NAS
            </span>
            <span className="font-mono text-[10px] text-slate-400">{processNodes.length} active</span>
          </div>

          <div className="space-y-2">
            {processNodes.map((p) => {
              const isSelected = selectedNode?.id === p.id;
              const isIsolated = isolatedNodeId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedNode({ type: "process", id: p.id, data: p })}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group select-none ${
                    isIsolated
                      ? "border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/30"
                      : isSelected
                      ? "border-sky-500 bg-sky-500/10 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-purple-500/50 hover:bg-purple-50/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400 truncate max-w-[130px]">
                      {p.name}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-300">
                      {p.connections} sock
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1.5">
                    <span>↑ {formatSpeed(p.txSpeed)}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBytes(p.outboundBytes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 2: NAS Host Gateway Hub */}
        <div className="space-y-2.5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 px-1 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-sky-500" />
            2. Cổng Host &amp; Mạng Cục bộ
          </div>

          <div
            onClick={() => setSelectedNode({ type: "nas", id: "nas_master", data: nasNodeData })}
            className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 ${
              selectedNode?.id === "nas_master"
                ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20"
                : "border-sky-500/30 bg-sky-500/[0.04] hover:border-sky-500/60"
            }`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <Server className="w-6 h-6" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>

            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                Synology DSM Master
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {connections[0]?.localAddress || "192.168.31.71"}
              </div>
            </div>

            <div className="w-full pt-2 border-t border-slate-200/50 dark:border-slate-700/50 grid grid-cols-2 gap-1 text-[11px] font-mono">
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <div className="text-[9px] font-sans text-slate-400">Tải về</div>
                <div className="font-bold">{formatSpeed(summary?.currentInboundSpeed || 0)}</div>
              </div>
              <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <div className="text-[9px] font-sans text-slate-400">Tải lên</div>
                <div className="font-bold">{formatSpeed(summary?.currentOutboundSpeed || 0)}</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Tổng kết nối socket: <strong className="text-slate-700 dark:text-slate-200">{connections.length}</strong>
          </div>
        </div>

        {/* Tier 3: Destination Countries */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              3. Quốc gia Đích
            </span>
            <span className="font-mono text-[10px] text-slate-400">{countryNodes.length} vùng</span>
          </div>

          <div className="space-y-2">
            {countryNodes.map((c) => {
              const isSelected = selectedNode?.id === c.id;
              const isIsolated = isolatedNodeId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedNode({ type: "country", id: c.id, data: c })}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group select-none ${
                    isIsolated
                      ? "border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/30"
                      : isSelected
                      ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-500/50 hover:bg-indigo-50/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate min-w-0">
                      <span className="text-base shrink-0">{c.flag}</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {c.connections} luồng
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1.5">
                    <span className="text-sky-600 dark:text-sky-400">↑ {formatSpeed(c.txSpeed)}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBytes(c.outboundBytes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 4: ISPs / Remote Endpoints & Cloud Providers */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-500" />
              4. Nhà mạng ISP &amp; Đích đến
            </span>
            <span className="font-mono text-[10px] text-slate-400">{ispNodes.length} ISP</span>
          </div>

          <div className="space-y-2">
            {ispNodes.map((isp) => {
              const isSelected = selectedNode?.id === isp.id;
              const isIsolated = isolatedNodeId === isp.id;
              const isBlocked = isp.trustLevel === "blocked";
              const isSuspicious = isp.trustLevel === "suspicious";

              return (
                <div
                  key={isp.id}
                  onClick={() => setSelectedNode({ type: "isp", id: isp.id, data: isp })}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group select-none ${
                    isBlocked
                      ? "border-rose-500/50 bg-rose-500/10"
                      : isSuspicious
                      ? "border-amber-500/50 bg-amber-500/10"
                      : isIsolated
                      ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30"
                      : isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500/50 hover:bg-emerald-50/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[130px]" title={isp.name}>
                      {isp.name}
                    </div>
                    {isBlocked ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white">
                        BỊ CHẶN
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        {isp.ips.length} IP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1.5">
                    <span>↑ {formatSpeed(isp.txSpeed)}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBytes(isp.outboundBytes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Interactive Expandable Node Inspector & Flow Action Drawer */}
      {selectedNode && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-500/[0.04] via-indigo-500/[0.04] to-purple-500/[0.04] dark:bg-slate-800/80 shadow-md space-y-3.5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bảng Điều khiển Luồng Dữ liệu
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {selectedNode.type === "nas"
                      ? "CỔNG GATEWAY MASTER"
                      : selectedNode.type === "process"
                      ? "TIẾN TRÌNH NAS"
                      : selectedNode.type === "country"
                      ? "QUỐC GIA ĐÍCH"
                      : "NHÀ MẠNG ISP"}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedNode.data.name || selectedNode.data.id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Isolate Flow Action */}
              <button
                onClick={() => {
                  setIsolatedNodeId(isolatedNodeId === selectedNode.id ? null : selectedNode.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  isolatedNodeId === selectedNode.id
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {isolatedNodeId === selectedNode.id ? "Đang cô lập luồng này" : "Cô lập luồng dữ liệu"}
              </button>

              {/* Close Inspector */}
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                title="Đóng bảng điều khiển"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Node Specific Controls & Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-xs">
              <div className="text-[11px] text-slate-400 font-semibold">Tải lên (Outbound):</div>
              <div className="font-mono font-black text-sm sm:text-base text-sky-600 dark:text-sky-400">
                {formatBytes(selectedNode.data.outboundBytes || 0)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-xs">
              <div className="text-[11px] text-slate-400 font-semibold">Tốc độ Hiện tại:</div>
              <div className="font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                {formatSpeed((selectedNode.data.txSpeed || 0) + (selectedNode.data.rxSpeed || 0))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-xs">
              <div className="text-[11px] text-slate-400 font-semibold">Số Socket Kết nối:</div>
              <div className="font-mono font-black text-sm sm:text-base text-purple-600 dark:text-purple-400">
                {selectedNode.data.connections || 0} luồng
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-center gap-1.5 text-xs shadow-xs">
              {selectedNode.type === "isp" && (
                <button
                  onClick={() => {
                    const newTrust = selectedNode.data.trustLevel === "blocked" ? "trusted" : "blocked";
                    setCustomTrustMap((prev) => ({ ...prev, [selectedNode.data.name]: newTrust }));
                    if (onBlockIp && selectedNode.data.ips?.[0]) {
                      onBlockIp(selectedNode.data.ips[0]);
                    }
                  }}
                  className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                    selectedNode.data.trustLevel === "blocked"
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {selectedNode.data.trustLevel === "blocked" ? "Bỏ chặn ISP" : "Chặn toàn bộ ISP"}
                </button>
              )}

              {selectedNode.type === "nas" && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 text-center">
                  <span className="text-emerald-500 font-bold">● Kết nối an toàn</span>
                  <div className="text-[10px] opacity-75 mt-0.5">{selectedNode.data.destinations} quốc gia đích</div>
                </div>
              )}

              {selectedNode.type === "process" && selectedNode.data.pids?.length > 0 && (
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>PIDs: {selectedNode.data.pids.join(", ")}</span>
                  <span className="text-purple-600 font-bold">Đang chạy</span>
                </div>
              )}

              {selectedNode.type === "country" && (
                <div className="text-[11px] text-slate-500 truncate">
                  ISPs: {selectedNode.data.isps?.slice(0, 2).join(", ") || "Đa nhà mạng"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
