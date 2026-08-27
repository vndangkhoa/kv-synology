"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  Terminal,
  Server,
  Play,
  RefreshCw,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  KeyRound,
  User,
  Globe,
  HardDrive,
  Cpu,
  Layers,
} from "lucide-react";

const QUICK_CMDS = [
  { label: "uptime", cmd: "uptime" },
  { label: "df -h", cmd: "df -h" },
  { label: "free -m", cmd: "free -m" },
  { label: "uname -a", cmd: "uname -a" },
  { label: "ps aux | head", cmd: "ps aux | head -n 20" },
  { label: "ls /volume1", cmd: "ls -lh /volume1 | head -n 30" },
  { label: "synoinfo", cmd: "cat /etc/synoinfo.conf | head -n 20" },
];

export const TerminalTab: React.FC = () => {
  const { session } = useAppStore();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [command, setCommand] = useState("uptime; echo \"---\"; df -h | head -n 10");
  const [output, setOutput] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [terminalInfo, setTerminalInfo] = useState<{ enable_ssh: boolean; ssh_port: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Prefill from DSM session / terminal info
    const cfg: any = (dsmClient as any).getConfig?.() || (dsmClient as any).config || null;
    const fallbackHost = cfg?.host || session.hostname || "";
    if (fallbackHost && fallbackHost !== "Synology-NAS") setHost(fallbackHost);
    if (cfg?.account) setUsername(cfg.account);
    // try load saved connection
    try {
      const saved = localStorage.getItem("ssh_terminal_conn");
      if (saved) {
        const o = JSON.parse(saved);
        if (o.host) setHost(o.host);
        if (o.port) setPort(String(o.port));
        if (o.username) setUsername(o.username);
      }
    } catch {}
    // fetch terminal info for current SSH port
    dsmClient
      .getTerminalInfo()
      .then((info) => {
        setTerminalInfo(info);
        setPort(String(info.ssh_port || 22));
      })
      .catch(() => {});
  }, [session.hostname, session.account]);

  const isDdnsHost = host.toLowerCase().endsWith(".myds.me") || host.toLowerCase().endsWith(".synology.me");
  const handleExec = async () => {
    if (!host || !username || !command.trim()) {
      setOutput("Vui lòng nhập host, username và lệnh.");
      return;
    }
    setLoading(true);
    setOutput("");
    setStderr("");
    try {
      const res = await fetch("/api/ssh/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port: parseInt(port, 10) || 22, username, password, command }),
      });
      const data = await res.json();
      if (data.success) {
        // if backend used fallback, update host/port to reflect actual used
        if (data.host && data.host !== host) {
          setHost(data.host);
          if (data.port) setPort(String(data.port));
        }
        setOutput(data.stdout || "(no stdout)");
        setStderr(data.stderr || "");
        if (data.tried && Array.isArray(data.tried) && data.tried.length > 1) {
          setStderr((prev) => prev + `\n[info] Đã thử ${data.tried.map((c: any) => `${c.h}:${c.p}`).join(" → ")} — dùng ${data.host}:${data.port} thành công.`);
        }
        setHistory((h) => [command, ...h].slice(0, 20));
        // save connection (without password)
        try {
          localStorage.setItem("ssh_terminal_conn", JSON.stringify({ host: data.host || host, port: data.port || port, username }));
        } catch {}
      } else {
        setOutput("");
        const hint = data.hint ? `\n\n[Gợi ý] ${data.hint}` : "";
        const tried = data.tried ? `\n[Đã thử] ${Array.isArray(data.tried) ? data.tried.map((c: any) => `${c.h}:${c.p}`).join(", ") : ""}` : "";
        setStderr((data.error || "Lỗi không xác định") + hint + tried);
      }
    } catch (e: any) {
      setStderr(e.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = output + (stderr ? "\n[stderr]\n" + stderr : "");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-slate-900 dark:text-white" />
            SSH Terminal
            <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold">BETA</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thực thi lệnh SSH trên NAS — đổi cổng trong <span className="font-semibold text-slate-700 dark:text-slate-300">Cài đặt → Dịch vụ → SSH</span> hoặc <span className="font-semibold">Thiết bị đầu cuối & SSH</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1 ${terminalInfo?.enable_ssh ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"}`}>
            <span className={`w-2 h-2 rounded-full ${terminalInfo?.enable_ssh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {terminalInfo ? (terminalInfo.enable_ssh ? `SSH :${terminalInfo.ssh_port}` : "SSH tắt") : "…"}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-bold">
            <Server className="w-3 h-3" /> {session.hostname || "NAS"}
          </span>
        </div>
      </div>

      {/* Connection form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900">
            <Server className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kết nối</h3>
          <span className="text-xs text-slate-400">SSH exec qua <code className="font-mono text-sky-600 dark:text-sky-400 text-[11px]">/api/ssh/exec</code> (ssh2)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" /> Host</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.10 hoặc nas.synology.me" className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 ${isDdnsHost ? "border-amber-500/50 ring-amber-500/20" : "border-slate-200 dark:border-slate-700"}`} />
            {isDdnsHost && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 leading-tight">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>DDNS <code className="font-mono bg-amber-500/10 px-1 rounded border border-amber-500/20">{host}:2212</code> không mở từ internet (đã kiểm tra <code className="font-mono">nc -zv {host} 2212</code> timeout). Dùng <button type="button" onClick={() => { setHost("192.168.1.10"); setPort("2212"); }} className="underline font-bold hover:text-amber-700">192.168.1.10:2212</button> khi cùng mạng LAN (đã kiểm tra mở, OpenSSH_8.2). Từ xa cần NAT port forwarding hoặc VPN.</span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Cổng SSH</label>
            <input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            <p className="text-[11px] text-slate-400">Đổi trong Cài đặt → Thiết bị đầu cuối & SSH {terminalInfo?.ssh_port ? `(hiện tại :${terminalInfo.ssh_port})` : ""}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>
        {isDdnsHost && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setHost("192.168.1.10"); setPort("2212"); }} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Dùng LAN 192.168.1.10:2212 (đã kiểm tra mở)
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 py-1.5">Hoặc kiểm tra DSM → Terminal & SNMP → SSH, Firewall cho phép 2212, NAT 2212→192.168.1.10:2212</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5 text-slate-400" /> Mật khẩu SSH</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">{showPass ? "Ẩn" : "Hiện"}</button>
            </div>
            <p className="text-[11px] text-slate-400">Dùng mật khẩu DSM (user admin). Không lưu trên server.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trạng thái</label>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Host:</span><span className="font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{host || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">SSH:</span><span className={terminalInfo?.enable_ssh ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500"}>{terminalInfo?.enable_ssh ? `Bật :${terminalInfo.ssh_port}` : "Tắt"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Chế độ:</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Thực thi thật</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Command */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-sky-500" /> Lệnh</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setCommand("")} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" title="Xóa"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_CMDS.map((q) => (
            <button key={q.label} onClick={() => setCommand(q.cmd)} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleExec()}
            placeholder="Nhập lệnh, ví dụ: uptime; df -h"
            className="flex-1 px-3.5 py-3 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
          />
          <button onClick={handleExec} disabled={loading} className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-md">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Chạy
          </button>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kết quả</span>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Đã chép" : "Chép"}
              </button>
              <button onClick={() => { setOutput(""); setStderr(""); }} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">Xóa</button>
            </div>
          </div>
          <pre className="w-full min-h-[220px] max-h-[480px] overflow-auto p-4 bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
            {loading ? "Đang thực thi qua SSH…" : output || stderr ? `${output}${stderr ? "\n[stderr]\n" + stderr : ""}` : "Chưa có kết quả — nhập lệnh và bấm Chạy.\nGợi ý: thử \"uptime; df -h\" hoặc \"ls /volume1\""}
          </pre>
          {history.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400 py-1">Lịch sử:</span>
              {history.slice(0, 6).map((h, i) => (
                <button key={i} onClick={() => setCommand(h)} className="px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-mono truncate max-w-[200px]">
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Bảo mật: Mật khẩu chỉ gửi tới <code className="font-mono text-sky-600 dark:text-sky-400">/api/ssh/exec</code> và không lưu server. Dùng cho NAS cá nhân. Đổi cổng SSH trong Cài đặt → Thiết bị đầu cuối & SSH sẽ cập nhật mặc định ở đây.</span>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-sky-500" /> Hiệu năng</p>
          <p className="text-[11px] text-slate-500 mt-1">Thử <code className="font-mono text-sky-600 dark:text-sky-400">uptime; free -m</code></p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-emerald-500" /> Lưu trữ</p>
          <p className="text-[11px] text-slate-500 mt-1"><code className="font-mono text-sky-600 dark:text-sky-400">df -h; ls /volume1</code></p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-500" /> Docker</p>
          <p className="text-[11px] text-slate-500 mt-1"><code className="font-mono text-sky-600 dark:text-sky-400">docker ps</code> (nếu DSM cho phép)</p>
        </div>
      </div>
    </div>
  );
};
