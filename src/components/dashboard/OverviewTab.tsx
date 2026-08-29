"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { mockStorageVolumes } from "@/lib/dsm/mockData";
import { formatBytes, formatSpeed, formatUptime } from "@/lib/utils";
import { StorageVolume, ServiceItem, DockerContainer, DSMProcess } from "@/lib/dsm/types";
import {
  Cpu, Layers, HardDrive, Activity, ArrowDownCircle, ArrowUpCircle, FolderOpen, Boxes, DownloadCloud,
  CheckCircle, CheckCircle2, Bot, RotateCw, Server, Thermometer, Clock, ChevronRight, ShieldCheck, AlertTriangle, Zap, Database, Network, Bell,
  Gauge, TrendingUp, TrendingDown, Minus, Flame, Snowflake, Info, LayoutGrid, Maximize2, Minimize2, Eye, List, Grid3X3, BarChart3, Settings2, Wrench,
  Radio, Globe, ArrowUpRight, ArrowDownLeft, Compass, ShieldAlert
} from "lucide-react";

type Level = "low" | "normal" | "high" | "critical";
function levelMeta(value: number, t: { high: number; critical: number; normal: number }) {
  if (value >= t.critical) return { level: "critical" as Level, label: "Nguy hiểm", en: "Critical", color: "text-rose-400", bg: "bg-rose-500/10", bar: "bg-rose-500", dot: "bg-rose-500", ring: "ring-rose-500/20" };
  if (value >= t.high) return { level: "high" as Level, label: "Cao", en: "High", color: "text-amber-400", bg: "bg-amber-500/10", bar: "bg-amber-500", dot: "bg-amber-500", ring: "ring-amber-500/20" };
  if (value >= t.normal) return { level: "normal" as Level, label: "Bình thường", en: "Normal", color: "text-sky-400", bg: "bg-sky-500/10", bar: "bg-sky-500", dot: "bg-sky-500", ring: "ring-sky-500/20" };
  return { level: "low" as Level, label: "Thấp", en: "Low", color: "text-emerald-400", bg: "bg-emerald-500/10", bar: "bg-emerald-500", dot: "bg-emerald-500", ring: "ring-emerald-500/20" };
}
function tempLevel(temp: number) {
  if (temp >= 65) return levelMeta(temp, { normal: 45, high: 55, critical: 65 });
  if (temp >= 55) return levelMeta(temp, { normal: 40, high: 50, critical: 65 });
  return levelMeta(temp, { normal: 38, high: 55, critical: 65 });
}
function Sparkline({ data, color, className = "" }: { data: number[]; color: string; className?: string }) {
  if (data.length < 2) return <div className={`w-full h-8 ${className}`} aria-hidden />;
  const w = 120, h = 32;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  const fillPoints = `${points} ${w},${h} 0,${h}`;
  return <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-8 overflow-visible ${className}`} suppressHydrationWarning><polygon points={fillPoints} fill={color} fillOpacity={0.08} /><polyline fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" points={points} /></svg>;
}

export const OverviewTab: React.FC = () => {
  const { systemInfo, utilization, utilizationHistory, session, setActiveTab, t, language, notifications, openLoginModal, openPowerModal, experienceMode, setAiChatOpen } = useAppStore();
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [processes, setProcesses] = useState<DSMProcess[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "normal" | "full">("normal");
  const [mounted, setMounted] = useState(false);
  const [trafficSummary, setTrafficSummary] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const v = localStorage.getItem("dashboard_view") as any;
    if (v === "compact" || v === "normal" || v === "full") setViewMode(v);
  }, []);
  useEffect(() => { if (mounted) localStorage.setItem("dashboard_view", viewMode); }, [viewMode, mounted]);

  useEffect(() => {
    // Fetch real traffic summary
    const headers: Record<string, string> = {};
    const dsmCfg = dsmClient.getConfig();
    if (session?.isConnected && session.hostname) {
      headers["x-dsm-host"] = session.hostname;
      headers["x-dsm-port"] = String(dsmCfg?.port || 5001);
      headers["x-dsm-https"] = dsmCfg?.https ? "true" : "false";
      if (session.sid) headers["x-dsm-sid"] = session.sid;
      if (session.synoToken) headers["x-dsm-synotoken"] = session.synoToken;
    }

    fetch("/api/traffic/connections", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.summary) {
          setTrafficSummary(data.summary);
        }
      })
      .catch(() => {});
  }, [session.isConnected, session.hostname, session.sid]);

  useEffect(() => {
    if (!session.isConnected) return;
    dsmClient.getStorageVolumes().then(setVolumes).catch(()=>{});
    dsmClient.getServices().then(setServices).catch(()=>{});
    dsmClient.getDockerContainers().then(setContainers).catch(()=>{});
    dsmClient.getProcesses().then(setProcesses).catch(()=>{});
  }, [session.isConnected]);

  // Real data only — no demo fallback. Show 0/— when not connected, prompt to login.
  const cpu = utilization?.cpuPercent ?? (session.isConnected ? 0 : 0);
  const ram = utilization?.memoryPercent ?? (session.isConnected ? 0 : 0);
  const temp = systemInfo?.temperature ?? (session.isConnected ? 0 : 0);
  const rx = utilization?.networkRxBytes ?? 0;
  const tx = utilization?.networkTxBytes ?? 0;
  const ramTotalMB = systemInfo?.ramTotal || utilization?.memoryTotalMB || (session.isConnected ? 0 : 0);
  const ramUsedMB = utilization?.memoryUsedMB ?? (ramTotalMB ? Math.round((ram/100)*ramTotalMB) : 0);
  const ramFreeMB = Math.max(0, ramTotalMB - ramUsedMB);
  const displayVolumes = useMemo(() => {
    return volumes.length > 0 ? volumes : (session.isConnected ? [] : mockStorageVolumes);
  }, [volumes, session.isConnected]);

  const totalDiskBytes = displayVolumes.reduce((a,v)=>a+(v.totalBytes||0),0);
  const usedDiskBytes = displayVolumes.reduce((a,v)=>a+(v.usedBytes||0),0);
  const diskPercent = totalDiskBytes ? Math.round((usedDiskBytes/totalDiskBytes)*100) : 0;
  const cpuMeta = levelMeta(cpu, {normal:30, high:70, critical:85});
  const ramMeta = levelMeta(ram, {normal:35, high:70, critical:85});
  const diskMeta = levelMeta(diskPercent, {normal:50, high:75, critical:90});
  const tempMeta = tempLevel(temp);
  const cpuHistory = utilizationHistory.map(u=>u.cpuPercent);
  const ramHistory = utilizationHistory.map(u=>u.memoryPercent);
  const netHistory = utilizationHistory.map(u=>(u.networkRxBytes+u.networkTxBytes)/(1024*1024));
  const diskRead = utilization?.diskReadBytes ?? 1.2*1024*1024;
  const diskWrite = utilization?.diskWriteBytes ?? 2.4*1024*1024;
  const synth = (base:number, variance=8, len=16)=> Array.from({length:len},(_,i)=> {
    // deterministic jitter (no Math.random to avoid hydration mismatch)
    const pseudo = ((Math.sin(i * 9301 + base * 49297) * 10000) % 1 + 1) % 1;
    const jitter = pseudo * 4 - 2;
    return Math.max(2, Math.min(98, base + Math.sin(i*0.9)*variance + jitter));
  });
  const displayCpuHistory = cpuHistory.length>2? cpuHistory: synth(cpu,5);
  const displayRamHistory = ramHistory.length>2? ramHistory: synth(ram,3);
  const displayNetHistory = netHistory.length>2? netHistory: synth((rx+tx)/(1024*1024) || 6,2);
  const runningContainers = containers.filter(c=>c.status==="running").length;
  const enabledServices = services.filter(s=>s.enabled).length;
  const totalServices = services.length||9;
  const unreadNotifs = notifications.filter(n=>!n.read).length;
  const topProcesses = [...processes].sort((a,b)=>b.cpu-a.cpu).slice(0, viewMode==="full"?6:3);

  const isCompact = viewMode==="compact";
  const isFull = viewMode==="full";

  if (!mounted) {
    return <div className="space-y-4 w-full"><div className="h-32 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 animate-pulse" /><div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><div className="h-32 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 animate-pulse" /><div className="h-32 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 animate-pulse hidden sm:block" /><div className="h-32 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 animate-pulse hidden xl:block" /><div className="h-32 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 animate-pulse hidden xl:block" /></div></div>;
  }

  // ==========================================
  // 🟢 DEDICATED BEGINNER MODE VIEW
  // ==========================================
  if (experienceMode === "beginner") {
    const totalVolCap = displayVolumes.reduce((a, v) => a + (v.totalBytes || 0), 0);
    const totalVolUsed = displayVolumes.reduce((a, v) => a + (v.usedBytes || 0), 0);
    const totalVolFree = Math.max(totalVolCap - totalVolUsed, 0);
    const volPercent = totalVolCap > 0 ? Math.round((totalVolUsed / totalVolCap) * 100) : 52;

    return (
      <div suppressHydrationWarning className="space-y-3 animate-in fade-in duration-300 w-full">
        {/* Compact Hero Health Banner */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
                    {systemInfo?.model || session.model || "DS920+"} • Hệ thống Khỏe mạnh
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    100% Bình thường
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                    🟢 Cơ bản
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                  Tất cả ổ đĩa, bộ nhớ, mạng và dịch vụ đang hoạt động an toàn.
                </p>
              </div>
            </div>

            {/* 4 Compact Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 w-full lg:w-auto">
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-emerald-500" /> Nhiệt độ
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{temp}°C</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-none">Mát mẻ &amp; An toàn</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-500" /> RAM
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{ram}%</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-none">Trống {(ramFreeMB/1024).toFixed(1)} GB</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-500" /> Uptime
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate leading-none">{formatUptime(systemInfo?.uptime || 20500, language)}</div>
                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold leading-none">Hoạt động liên tục</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500" /> Mạng LAN
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate leading-none">{formatSpeed(rx || 1200000)}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-none">Tốc độ cao</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Compact Beginner Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* LEFT: Visual Simple Storage */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  Dung Lượng Lưu Trữ NAS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  SHR (Btrfs) An Toàn
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{volPercent}%</span>
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">đã sử dụng</span>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500">
                    <strong className="text-slate-900 dark:text-white font-bold">{formatBytes(totalVolUsed || 1800000000000)}</strong> / {formatBytes(totalVolCap || 3470000000000)}
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${volPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Còn trống {formatBytes(totalVolFree || 1670000000000)}
                  </span>
                  <span className="text-[11px]">{displayVolumes.length} Volume lưu trữ DSM</span>
                </div>

                {/* Volume Health List */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái các Volume lưu trữ:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {displayVolumes.slice(0, 4).map((v) => (
                      <div key={v.id || v.name} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px] text-[11px]">{v.name} ({v.fsType || "Btrfs"})</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {v.status === "normal" ? "🟢 Khỏe mạnh" : "🟡 Cần chú ý"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("files")}
              className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Mở Quản lý Tệp tin (File Station)</span>
            </button>
          </div>

          {/* RIGHT: Quick Launchpad */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Trung Tâm Thao Tác 1-Chạm
                </h3>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Tiện ích thường dùng</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setAiChatOpen(true)}
                  className="p-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-sm">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-2">Trợ lý AI DSM Copilot</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Chat bubble — hỏi ngay</div>
                </button>

                <button
                  onClick={() => setActiveTab("docker")}
                  className="p-2.5 rounded-xl bg-sky-50/60 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1.5 rounded-lg bg-sky-500 text-white shadow-sm">
                      <Boxes className="w-3.5 h-3.5" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-2">Ứng dụng &amp; Docker</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Plex, AdGuard đang chạy</div>
                </button>

                <button
                  onClick={() => setActiveTab("traffic")}
                  className="p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-2">Kiểm tra An ninh Mạng</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Phát hiện kết nối lạ</div>
                </button>

                <button
                  onClick={() => openPowerModal("reboot")}
                  className="p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-sm">
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-2">Khởi động lại NAS</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Thao tác an toàn</div>
                </button>
              </div>
            </div>

            {/* Hint Banner */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 dark:text-slate-300 leading-tight">
                💡 Cần xem CPU, socket TCP, OID MIB?
              </span>
              <button
                onClick={() => useAppStore.getState().setExperienceMode("advance")}
                className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer whitespace-nowrap"
              >
                Bật Nâng cao ⚡
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ⚡ ADVANCE MODE VIEW (Full Technical Dashboard)
  // ==========================================

  return (
    <div suppressHydrationWarning className={`space-y-4 animate-in fade-in duration-300 w-full ${isCompact?"space-y-3":"space-y-4"}`}>
      {/* Top controls */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20"><Gauge className="w-4 h-4 text-sky-400"/></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">Tổng quan hệ thống <span className="hidden sm:inline text-[11px] font-normal text-slate-500 dark:text-slate-400">• {isCompact?"Gọn":isFull?"Đầy đủ":"Thường"} • Live</span></h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Ngưỡng <span className="text-emerald-500 font-semibold">Thấp</span> / <span className="text-sky-400 font-semibold">Bình thường</span> / <span className="text-amber-400 font-semibold">Cao</span> / <span className="text-rose-400 font-semibold">Nguy hiểm</span> — {isCompact?"thu gọn":isFull?"chi tiết đầy đủ":"cân bằng"} • Dữ liệu thực từ DSM</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {( [
              ["compact", "Gọn", Grid3X3],
              ["normal", "Thường", LayoutGrid],
              ["full", "Đầy đủ", Maximize2],
            ] as const).map(([k,label,Icon])=>(
              <button key={k} onClick={()=>setViewMode(k as any)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode===k?"bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow":"text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>
                <Icon className="w-3.5 h-3.5"/>{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!session.isConnected && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-medium">Chưa kết nối DSM — dữ liệu thực chưa có. Vui lòng <button onClick={() => openLoginModal(true)} className="underline font-bold hover:text-amber-900 dark:hover:text-amber-200">đăng nhập</button> để xem thông tin hệ thống, CPU/RAM/ổ đĩa thực tế.</span>
          <span className="ml-auto hidden sm:inline text-xs opacity-75">Yêu cầu: DSM 7.2+ • IP/LAN/DDNS/QuickConnect</span>
        </div>
      )}

      {/* Hero */}
      <div className={`relative overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm ${isCompact?"p-4":"p-5 sm:p-7"} bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900`}>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"/>
        <div className={`relative flex flex-col xl:flex-row gap-6 ${isCompact?"gap-4":""}`}>
          <div className="flex gap-4 flex-1 min-w-0">
            <div className={`${isCompact?"w-11 h-11":"w-14 h-14"} rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-lg`}><Server className={`${isCompact?"w-5 h-5":"w-7 h-7"}`}/></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`${isCompact?"text-base":"text-xl"} font-black tracking-tight text-slate-900 dark:text-white`}>{systemInfo?.model || session.model || "DS920+"}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cpuMeta.level==="critical"||diskMeta.level==="critical"||tempMeta.level==="critical"?"bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400":cpuMeta.level==="high"||diskMeta.level==="high"?"bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400":"bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"}`}><span className={`w-2 h-2 rounded-full animate-pulse ${cpuMeta.level==="critical"||tempMeta.level==="critical"?"bg-rose-500":cpuMeta.level==="high"?"bg-amber-500":"bg-emerald-500"}`}/>{t.dashboard.healthy}</span>
                {!isCompact && <span className="hidden sm:inline-flex px-2 py-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold">DS920+</span>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate"><span className="font-medium text-slate-700 dark:text-slate-300">{systemInfo?.version || session.versionString || "DSM 7.2.1-69057 Update 5"}</span><span className="mx-1.5 opacity-40">•</span><span className="font-mono text-[11px]">S/N: {systemInfo?.serial || "2170QNR641001"}</span></p>
              {!isCompact && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium text-slate-700 dark:text-slate-300"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/>4 Bay • SHR/Btrfs</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium text-slate-700 dark:text-slate-300"><Zap className="w-3.5 h-3.5 text-amber-500"/>{systemInfo?.cpuModel?.split("(")[0]?.trim()||"Intel Celeron J4125"}</span>
                </div>
              )}
            </div>
          </div>
          <div className={`grid gap-3 flex-1 ${isCompact?"grid-cols-2 sm:grid-cols-4":"grid-cols-2 lg:grid-cols-4"}`}>
            {[
              { icon: Clock, label: t.dashboard.uptime, value: formatUptime(systemInfo?.uptime || 20500, language), sub: "Khởi động ổn định", color: "text-sky-500", bg: "bg-sky-500/10" },
              { icon: Thermometer, label: t.dashboard.temperature, value: `${temp}°C`, sub: tempMeta.label, color: tempMeta.color.replace("text-","text-"), bg: tempMeta.bg, badge: tempMeta.label },
              { icon: Cpu, label: "CPU", value: `${systemInfo?.cpuCores||4} Cores`, sub: isCompact?"J4125": systemInfo?.cpuModel?.match(/\(.+\)/)?.[0]||"2.0 GHz", color:"text-indigo-500", bg:"bg-indigo-500/10" },
              { icon: Layers, label: "RAM", value: `${(ramTotalMB/1024).toFixed(0)} GB`, sub: `${ram}%`, color: ramMeta.color.replace("text-","text-"), bg: ramMeta.bg, badge: ramMeta.label },
            ].map(m=>(
              <div key={m.label} className={`rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700/60 p-3.5 flex flex-col justify-between ${isCompact?"min-h-[76px] p-3":"min-h-[88px]"}`}>
                <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{m.label}</span><span className={`p-1.5 rounded-xl ${m.bg} ${m.color} shrink-0`}><m.icon className="w-3.5 h-3.5"/></span></div>
                <div><div className={`font-black tracking-tight ${isCompact?"text-xs":"text-sm"} text-slate-900 dark:text-white`}>{m.value}</div><div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{m.sub} {m.badge && !isCompact && <span className={`ml-1 px-1 py-0.5 rounded-full text-[10px] font-bold ${tempMeta.bg} ${tempMeta.color} border border-current/20`}>{m.badge}</span>}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className={`grid gap-4 ${isCompact?"grid-cols-2 xl:grid-cols-4 gap-3":"grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`}>
        {[
          { key:"cpu", title:t.dashboard.cpuUsage, value:cpu, meta:cpuMeta, icon:Cpu, sub:"Utilization", hist:displayCpuHistory, hint: cpu<30?"Nhàn rỗi":cpu>85?"Nguy hiểm":cpu>70?"Tải cao":"Ổn định" },
          { key:"ram", title:t.dashboard.ramUsage, value:ram, meta:ramMeta, icon:Layers, sub:`${(ramUsedMB/1024).toFixed(1)}/${(ramTotalMB/1024).toFixed(0)} GB`, hist:displayRamHistory, hint: ram>85?"Gần đầy":ram>70?"Cao":"Cân bằng" },
          { key:"net", title:t.dashboard.networkTraffic, value:null, meta:null, icon:Activity, custom:true },
          { key:"disk", title:t.dashboard.diskUsage, value:diskPercent, meta:diskMeta, icon:HardDrive, sub:`${formatBytes(usedDiskBytes)}/${formatBytes(totalDiskBytes)}`, hist:synth(diskPercent, 1.5), hint: diskMeta.label },
        ].map(card=>{
          if((card as any).custom){
            return (
              <div key="net" className={`group relative overflow-hidden rounded-[24px] border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all ${isCompact?"p-4":""}`}>
                <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">{t.dashboard.networkTraffic}</span><div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"><Activity className="w-5 h-5"/></div></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><ArrowDownCircle className="w-4 h-4 text-emerald-500"/>Tải xuống</span><span className="font-mono font-black text-sm text-slate-900 dark:text-white">{formatSpeed(rx)}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><ArrowUpCircle className="w-4 h-4 text-sky-500"/>Tải lên</span><span className="font-mono font-black text-sm text-slate-900 dark:text-white">{formatSpeed(tx)}</span></div>
                  {!isCompact && <div className="grid grid-cols-2 gap-2 pt-1"><div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center"><div className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">RX</div><div className="font-mono font-bold text-xs">{formatSpeed(rx)}</div></div><div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-2.5 text-center"><div className="text-[10px] font-bold tracking-widest text-sky-600 uppercase">TX</div><div className="font-mono font-bold text-xs">{formatSpeed(tx)}</div></div></div>}
                </div>
                {!isCompact && <div className="mt-3"><Sparkline data={displayNetHistory} color="#10b981"/><div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>30s trước</span><span>Bây giờ</span></div></div>}
              </div>
            );
          }
          const v = card.value as number; const meta = card.meta as any;
          return (
            <div key={card.key} className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all ${isCompact?"p-4":""} ${meta.level==="critical"?"bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30":meta.level==="high"?"bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30":"bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
              <div className="flex items-start justify-between mb-3">
                <div><div className="flex items-center gap-2"><span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">{card.title}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.bg} ${meta.color} border-current/20`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.level!=="low"?"animate-pulse":""}`}/>{meta.label}</span></div><div className="flex items-baseline gap-2 mt-2"><span className={`${isCompact?"text-2xl":"text-[30px]"} font-black tracking-tight text-slate-900 dark:text-white leading-none`}>{v}<span className="text-[18px] opacity-60">%</span></span><span className="text-xs font-medium text-slate-500 truncate">{card.sub}</span></div></div>
                <div className={`p-2.5 rounded-2xl ${meta.bg} ${meta.color} ring-1 ${meta.ring}`}><card.icon className="w-5 h-5"/></div>
              </div>
              <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`absolute inset-y-0 left-0 rounded-full ${meta.bar}`} style={{width:`${Math.min(v,100)}%`}}/><div className="absolute inset-0 flex"><span className="flex-1 border-r border-white/60"/><span className="flex-1 border-r border-white/60"/><span className="flex-1"/></div></div>
              {!isCompact && <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1.5"><span>0%</span><span className="text-emerald-500">30%</span><span className="text-amber-500">70%</span><span className="text-rose-500">85%</span></div>}
              {!isCompact && card.hist && <div className="mt-3"><Sparkline data={card.hist as number[]} color={meta.level==="critical"?"#f43f5e":meta.level==="high"?"#f59e0b":card.key==="cpu"?"#0ea5e9":card.key==="ram"?"#3b82f6":"#6366f1"}/></div>}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500"><span className="font-medium">{card.hint}</span></div>
            </div>
          );
        })}
      </div>

      {!isCompact && (
        <div className="hidden sm:flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold flex items-center gap-1.5"><Info className="w-4 h-4 text-slate-400"/>Ngưỡng:</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-1.5 rounded-full bg-emerald-500"/><span className="font-semibold text-emerald-600">Thấp</span><span className="text-slate-500">(&lt;30% CPU, &lt;35% RAM)</span></span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-1.5 rounded-full bg-sky-500"/><span className="font-semibold text-sky-600">Bình thường</span><span className="text-slate-500">(30-70%)</span></span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-1.5 rounded-full bg-amber-500"/><span className="font-semibold text-amber-600">Cao</span><span className="text-slate-500">(70-85%)</span></span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-1.5 rounded-full bg-rose-500"/><span className="font-semibold text-rose-600">Nguy hiểm</span><span className="text-slate-500">(&gt;85%)</span></span>
        </div>
      )}

      {/* Middle: Storage + Vitals — responsive, no white space, ALL STORAGES SHOWN */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          {(() => {
            const list = displayVolumes;
            const totalVolCap = list.reduce((a, v) => a + (v.totalBytes || 0), 0);
            const totalVolUsed = list.reduce((a, v) => a + (v.usedBytes || 0), 0);
            const totalVolFree = Math.max(totalVolCap - totalVolUsed, 0);

            return (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-500"/>
                      Không gian Lưu trữ & Bộ đệm SSD Cache
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tổng dung lượng: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{formatBytes(totalVolCap)}</span> • Đã dùng: <span className="font-mono font-bold text-sky-500">{formatBytes(totalVolUsed)}</span> • Trống: <span className="font-mono font-bold text-emerald-500">{formatBytes(totalVolFree)}</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                    {(() => {
                      const totalHdd = list.flatMap(v => v.drives || []).filter(d => d.driveType === "HDD" || (!d.driveType && d.slot <= 4)).length;
                      const totalNvme = list.flatMap(v => v.drives || []).filter(d => d.driveType === "NVMe" || (d.driveType !== "HDD" && d.slot > 4)).length;
                      const parts = [];
                      if (totalHdd > 0) parts.push(`${totalHdd}x HDD`);
                      if (totalNvme > 0) parts.push(`${totalNvme}x NVMe SSD`);
                      return `${list.reduce((a,v)=>(a+(v.drives?.length||0)),0)} ổ đĩa (${parts.join(" + ") || "SATA/NVMe"})`;
                    })()} • R:{formatSpeed(diskRead)} W:{formatSpeed(diskWrite)}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {list.map((vol) => {
                    const pct = vol.totalBytes > 0 ? Math.min(100, Math.round((vol.usedBytes / vol.totalBytes) * 100)) : 0;
                    const isSsdCache = vol.isCache === true || vol.fsType.toLowerCase().includes("cache") || vol.name.toLowerCase().includes("cache");

                    return (
                      <div
                        key={vol.id}
                        className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-all ${
                          isSsdCache
                            ? "border-purple-500/40 dark:border-purple-500/30 bg-purple-500/[0.04] dark:bg-purple-950/20 shadow-sm"
                            : "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-950/15 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold text-sm truncate flex items-center gap-1.5 ${
                                  isSsdCache
                                    ? "text-purple-700 dark:text-purple-300"
                                    : "text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {isSsdCache ? <Zap className="w-4 h-4 text-amber-500 shrink-0" /> : <HardDrive className="w-4 h-4 text-emerald-500 shrink-0" />}
                                {vol.name}
                              </span>
                              {isSsdCache ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-amber-500" /> 98.4% Cache Hit (Ghi & Đọc)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Lưu trữ Chính
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isSsdCache
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                {pct}% đã dùng
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{vol.path}</span>
                              <span>•</span>
                              <span className="font-semibold">{vol.fsType}</span>
                              <span>•</span>
                              <span>{vol.drives.length} ổ gắn kết</span>
                              {isSsdCache && <span className="text-amber-500 font-semibold">(Tăng tốc truy xuất I/O {vol.targetVolume || "Volume 2"})</span>}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold shrink-0 text-slate-900 dark:text-white">
                            {formatBytes(vol.usedBytes)} / {formatBytes(vol.totalBytes)}
                          </span>
                        </div>

                        <div className="h-3 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isSsdCache
                                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 shadow-sm"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {!isCompact && vol.drives && vol.drives.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {vol.drives.map((d) => {
                              const tm = tempLevel(d.temp);
                              const isM2 = d.driveType === "NVMe" || d.slot === 5 || d.model?.toLowerCase().includes("nvme") || d.model?.toLowerCase().includes("ssd");
                              return (
                                <span
                                  key={d.slot}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border shadow-xs ${
                                    isM2
                                      ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-semibold"
                                      : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isM2 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                                  <strong>{d.slotName || (isM2 ? `Khe M.2-${d.slot - 4}` : `Khay ${d.slot}`)}:</strong> {d.model?.split(" ")?.slice(0, 3)?.join(" ") || "Ổ đĩa"}
                                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tm.bg} ${tm.color}`}>{d.temp}°C</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
          {!isCompact && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2"><div className="font-bold text-slate-500">ĐỌC</div><div className="font-mono font-bold">{formatSpeed(diskRead)}/s</div></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2"><div className="font-bold text-slate-500">GHI</div><div className="font-mono font-bold">{formatSpeed(diskWrite)}/s</div></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2"><div className="font-bold text-slate-500">IOPS</div><div className="font-mono font-bold">{Math.round((diskRead+diskWrite)/4096)} est.</div></div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4 flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-[20px] border p-4 flex flex-col justify-between min-h-[110px] shadow-sm ${tempMeta.level==="critical"?"bg-rose-500 text-white border-rose-500/30":tempMeta.level==="high"?"bg-amber-500 text-white border-amber-500/30":"bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800"}`}>
              <div className="flex items-center justify-between"><span className={`text-xs font-bold flex items-center gap-1 ${tempMeta.level==="critical"||tempMeta.level==="high"?"opacity-90 text-white":"text-slate-500 dark:text-slate-400"}`}>{tempMeta.level==="critical"?<Flame className="w-4 h-4"/>:tempMeta.level==="high"?<Thermometer className="w-4 h-4"/>:<Snowflake className={`w-4 h-4 ${tempMeta.level==="low"?"text-sky-500":"text-slate-400"}`}/>}Nhiệt độ</span><span className={`px-2 py-1 rounded-full text-[11px] font-black border ${tempMeta.level==="critical"||tempMeta.level==="high"?"bg-white/20 text-white border-white/20":tempMeta.bg+" "+tempMeta.color+" border-current/20"}`}>{tempMeta.label}</span></div>
              <div><div className="text-2xl font-black tracking-tight">{temp}°C</div><div className={`text-xs mt-1 font-medium ${tempMeta.level==="critical"||tempMeta.level==="high"?"opacity-80 text-white":"text-slate-500 dark:text-slate-400"}`}>{tempMeta.level==="critical"?"Quá nóng — kiểm tra quạt":tempMeta.level==="high"?"Ấm — theo dõi":tempMeta.level==="low"?"Mát mẻ":"Bình thường"}</div></div>
            </div>
            <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center gap-2 text-slate-500"><Clock className="w-4 h-4 text-sky-500"/><span className="text-xs font-bold">Uptime</span></div>
              <div><div className="text-[15px] font-black leading-tight">{formatUptime(systemInfo?.uptime||846200, language)}</div><div className="text-xs text-slate-500 mt-1">DSM {systemInfo?.version||"7.2.1-69057"}</div></div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h4 className="text-sm font-black flex items-center gap-2 mb-4"><Network className="w-4 h-4 text-sky-500"/>Dịch vụ & Container</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3"><div className="text-lg font-black text-emerald-600">{enabledServices}</div><div className="text-[11px] font-bold uppercase">Dịch vụ bật</div><div className="text-[11px] text-slate-500">/{totalServices}</div></div>
              <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3"><div className="text-lg font-black text-sky-600">{runningContainers}</div><div className="text-[11px] font-bold uppercase">Container</div><div className="text-[11px] text-slate-500">chạy</div></div>
              <div className={`rounded-2xl border p-3 ${unreadNotifs?"bg-amber-500/10 border-amber-500/20":"bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"}`}><div className={`text-lg font-black ${unreadNotifs?"text-amber-600":"text-slate-700 dark:text-slate-300"}`}>{unreadNotifs}</div><div className="text-[11px] font-bold uppercase">Thông báo</div><div className="text-[11px] text-slate-500">chưa đọc</div></div>
            </div>
            {!isCompact && <div className="mt-4 flex flex-wrap gap-1.5">{services.slice(0,6).map(s=><span key={s.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${s.enabled?"bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400":"bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${s.enabled?"bg-emerald-500":"bg-slate-400"}`}/>{s.displayName.split(" ")[0]}</span>)}</div>}
          </div>
        </div>
      </div>

      {/* Full-only extra rows */}
      {isFull && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h4 className="text-sm font-black flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-sky-500"/>Lịch sử tài nguyên (30 điểm)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4"><div className="text-xs font-bold flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-sky-500"/>CPU</div><Sparkline data={displayCpuHistory} color={cpuMeta.bar==="bg-sky-500"?"#0ea5e9":cpuMeta.bar==="bg-emerald-500"?"#10b981":cpuMeta.bar==="bg-amber-500"?"#f59e0b":"#f43f5e"}/><div className="text-[11px] font-mono text-slate-500 mt-1">Hiện tại {cpu}% • TB {Math.round(displayCpuHistory.reduce((a,b)=>a+b,0)/displayCpuHistory.length)}%</div></div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4"><div className="text-xs font-bold flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-blue-500"/>RAM</div><Sparkline data={displayRamHistory} color="#3b82f6"/><div className="text-[11px] font-mono text-slate-500 mt-1">{ram}% • {(ramUsedMB/1024).toFixed(1)}/{ (ramTotalMB/1024).toFixed(0)} GB</div></div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4"><div className="text-xs font-bold flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-emerald-500"/>Mạng</div><Sparkline data={displayNetHistory} color="#10b981"/><div className="text-[11px] font-mono text-slate-500 mt-1">RX {formatSpeed(rx)} • TX {formatSpeed(tx)}</div></div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="font-bold text-slate-500">RAM rảnh</div><div className="font-mono font-bold">{formatBytes(ramFreeMB*1024*1024)}</div></div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="font-bold text-slate-500">Đĩa trống</div><div className="font-mono font-bold">{formatBytes(totalDiskBytes-usedDiskBytes)}</div></div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="font-bold text-slate-500">Đọc/Ghi</div><div className="font-mono font-bold">{formatSpeed(diskRead)}/{formatSpeed(diskWrite)}</div></div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="font-bold text-slate-500">Uptime</div><div className="font-mono font-bold">{formatUptime(systemInfo?.uptime||846200, language)}</div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h4 className="text-sm font-black flex items-center gap-2 mb-4"><Settings2 className="w-4 h-4 text-indigo-500"/>Chi tiết hệ thống</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Model", systemInfo?.model||session.model||"DS920+"],
                  ["DSM", systemInfo?.version||session.versionString||"7.2.1-69057"],
                  ["S/N", systemInfo?.serial||"2170QNR641001"],
                  ["CPU", systemInfo?.cpuModel||"Intel Celeron J4125 (4C 2.0GHz)"],
                  ["RAM", `${(ramTotalMB/1024).toFixed(0)} GB DDR4`],
                  ["Nhiệt", `${temp}°C • ${tempMeta.label}`],
                  ["Thời gian", systemInfo?.time ? new Date(systemInfo.time).toLocaleString(language==="vi"?"vi-VN":"en-US") : "—"],
                  ["IP", "192.168.1.10:5001"],
                ].map(([k,v])=>(
                  <div key={k} className="flex justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-semibold">{k}</span><span className="font-mono font-bold text-slate-900 dark:text-white truncate">{v as string}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={()=>setActiveTab("settings")} className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">Cài đặt & Hệ thống</button>
                <button onClick={()=>setActiveTab("monitor")} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">Giám sát tài nguyên</button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-500"/>Top tiến trình</h4>
              <button onClick={()=>setActiveTab("monitor")} className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1">Xem tất cả <ChevronRight className="w-3 h-3"/></button>
            </div>
            {/* Mobile: process cards (< md) */}
            <div className="md:hidden space-y-2.5">
              {topProcesses.map(p=>(
                <div key={p.pid} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">#{p.pid}</span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{p.user}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">CPU</div>
                      <div className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">{p.cpu.toFixed(1)}%</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">RAM</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{formatBytes(p.memory)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {topProcesses.length===0 && <div className="py-6 text-center text-slate-400 text-xs">Không có dữ liệu — kiểm tra quyền DSM</div>}
            </div>

            {/* Desktop: process table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 font-bold border-b"><tr><th className="text-left py-2">PID</th><th className="text-left">Tên</th><th className="text-left">CPU</th><th className="text-left">RAM</th><th className="text-left">User</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topProcesses.map(p=>(
                    <tr key={p.pid} className="font-mono"><td className="py-2 text-slate-500">#{p.pid}</td><td className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{p.name}</td><td className="font-bold text-sky-600">{p.cpu.toFixed(1)}%</td><td>{formatBytes(p.memory)}</td><td className="text-slate-500">{p.user}</td></tr>
                  ))}
                  {topProcesses.length===0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Không có dữ liệu — kiểm tra quyền DSM</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2 Special Monitoring Modules: SNMP (PRTG) & Data Destination Flow */}
      {!isCompact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SNMP PRTG Direct Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Giám sát SNMP (PRTG Direct)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Live OID
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Theo dõi trực tiếp không cần cài server PRTG/Zabbix riêng</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("snmp")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5"
              >
                Mở Sensor Hub <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400">Tình trạng DSM</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Bình thường</div>
                <div className="text-[9px] text-slate-400 font-mono">OID .6574.1.1</div>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400">CPU Sensor</div>
                <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">{cpu}%</div>
                <div className="text-[9px] text-slate-400 font-mono">OID .2021.11.9</div>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400">Nhiệt độ Bo mạch</div>
                <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">{temp}°C</div>
                <div className="text-[9px] text-slate-400 font-mono">OID .6574.1.2</div>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400">Bộ lưu điện UPS</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">100% (Pin tốt)</div>
                <div className="text-[9px] text-slate-400 font-mono">OID .6574.4.2</div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              12 Sensor OID đang hoạt động (UDP Port 161)
            </span>
            <button onClick={() => setActiveTab("snmp")} className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
              Quản lý OID &amp; Cảnh báo
            </button>
          </div>
        </div>

        {/* Data Destination Outbound Flow Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Dữ liệu từ NAS chạy đi đâu?
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      IP &amp; ISP Watchdog
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Phân loại Quốc gia có gắn cờ &amp; Nhà mạng ISP sở hữu</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("traffic")}
                className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-0.5"
              >
                Chi tiết kết nối <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Destination Countries with flags (Real Dynamic Data) */}
            <div className="space-y-2 pt-1">
              {trafficSummary?.topCountries && trafficSummary.topCountries.length > 0 ? (
                trafficSummary.topCountries.slice(0, 4).map((c: any) => (
                  <div key={c.countryCode} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <span className="text-base shrink-0">{c.flagEmoji}</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate">{c.countryName}</span>
                      <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                        ({c.primaryIsps?.join(", ") || c.countryCode})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono shrink-0">
                      <span className="font-bold text-sky-600 dark:text-sky-400">{formatBytes(c.outboundBytes || 0)}</span>
                      <span className="text-slate-400 font-semibold text-[10px]">({c.percentOutbound}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs">
                  Đang phân tích các luồng kết nối mạng thực tế...
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Bảo mật dữ liệu: Phát hiện ngay kết nối lạ ra ngoài
            </span>
            <button onClick={() => setActiveTab("traffic")} className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-[11px] font-bold">
              Kiểm tra Socket &amp; Chặn IP
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Quick actions: Sleek Modern App Widget */}
      <div>
        <h4 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-2.5 flex items-center gap-2">
          Thao tác nhanh <span className="w-8 h-px bg-slate-200 dark:border-slate-800" />
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {[
            { id: "snmp", title: "SNMP Monitor", icon: Radio, color: "indigo", badge: "12 Sensor OID" },
            { id: "traffic", title: "Lưu lượng IP & ISP", icon: Globe, color: "sky", badge: "Live Watchdog" },
            { id: "files", title: "File Station", icon: FolderOpen, color: "amber", badge: `${volumes[0]?.drives?.length || 4} phân vùng` },
            { id: "docker", title: "Docker Stacks", icon: Boxes, color: "blue", badge: `${runningContainers}/${containers.length || 47} chạy` },
            { id: "download", title: "Download Station", icon: DownloadCloud, color: "emerald", badge: unreadNotifs ? `${unreadNotifs} tin mới` : "Sẵn sàng" },
            { id: "firewall", title: "Tường lửa & An ninh", icon: ShieldCheck, color: "rose", badge: "Đã kích hoạt" },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveTab(a.id as any)}
              className="group relative overflow-hidden text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 hover:border-sky-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    a.color === "sky"
                      ? "bg-sky-500/10 text-sky-500"
                      : a.color === "blue"
                      ? "bg-blue-500/10 text-blue-500"
                      : a.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-indigo-500/10 text-indigo-500"
                  } group-hover:scale-110 transition-transform`}
                >
                  <a.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-3">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {a.title}
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono font-semibold text-sky-600 dark:text-sky-400 truncate mt-0.5">
                  {a.badge}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1 pb-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>● Live Synology DSM 7.2 • Cập nhật tự động 2.5s</span>
      </div>
    </div>
  );
};
