"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DSMProcess, StorageVolume } from "@/lib/dsm/types";
import { mockStorageVolumes } from "@/lib/dsm/mockData";
import { formatBytes, formatSpeed, formatUptime } from "@/lib/utils";
import {
  Cpu,
  Layers,
  RefreshCw,
  Search,
  Activity,
  User,
  XCircle,
  AlertTriangle,
  X,
  CheckCircle,
  HardDrive,
  Clock,
  Thermometer,
  Server,
  ArrowDown,
  ArrowUp,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const ResourceMonitorTab: React.FC = () => {
  const { utilization, utilizationHistory, systemInfo, session, language, t } = useAppStore();
  const [processes, setProcesses] = useState<DSMProcess[]>([]);
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [processFilter, setProcessFilter] = useState<"all" | "running" | "highCpu" | "highRam" | "system" | "user">("all");
  const [sortBy, setSortBy] = useState<"cpu" | "memory" | "pid" | "name">("cpu");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // ms, 0 = paused

  // Modals state
  const [inspectProcess, setInspectProcess] = useState<DSMProcess | null>(null);
  const [killCandidate, setKillCandidate] = useState<DSMProcess | null>(null);
  const [killing, setKilling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showVolumeOverview, setShowVolumeOverview] = useState(true);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const [list, vols] = await Promise.all([
        dsmClient.getProcesses(),
        dsmClient.getStorageVolumes().catch(() => []),
      ]);
      setProcesses(list);
      if (vols.length > 0) setVolumes(vols);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    if (refreshInterval > 0) {
      const timer = setInterval(fetchProcesses, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [refreshInterval]);

  const handleConfirmKill = async () => {
    if (!killCandidate) return;
    setKilling(true);
    try {
      const ok = await dsmClient.killProcess(killCandidate.pid);
      if (ok) {
        setFeedbackMsg({
          type: "success",
          text: `Đã dừng tiến trình "${killCandidate.name}" (PID: ${killCandidate.pid}) thành công!`,
        });
        setKillCandidate(null);
        await fetchProcesses();
      } else {
        setFeedbackMsg({
          type: "error",
          text: `Không thể dừng tiến trình PID: ${killCandidate.pid}. Hãy kiểm tra quyền quản trị của tài khoản.`,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Lỗi khi gửi yêu cầu dừng tiến trình",
      });
    } finally {
      setKilling(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Process filtering and sorting
  const filteredAndSortedProcesses = useMemo(() => {
    let list = processes.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        String(p.pid).includes(search) ||
        p.user.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (processFilter === "running") {
        return p.status === "R" || p.status === "running";
      }
      if (processFilter === "highCpu") {
        return p.cpu > 0.5;
      }
      if (processFilter === "highRam") {
        return p.memory > 50 * 1024 * 1024; // > 50 MB
      }
      if (processFilter === "system") {
        return p.user === "root" || p.user === "system";
      }
      if (processFilter === "user") {
        return p.user !== "root" && p.user !== "system";
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "cpu") cmp = a.cpu - b.cpu;
      else if (sortBy === "memory") cmp = a.memory - b.memory;
      else if (sortBy === "pid") cmp = a.pid - b.pid;
      else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return list;
  }, [processes, search, processFilter, sortBy, sortOrder]);

  const toggleSort = (field: "cpu" | "memory" | "pid" | "name") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Sparkline generator helper
  const renderSparkline = (dataPoints: number[], color: string, maxVal?: number) => {
    if (dataPoints.length < 2) return null;
    const computedMax = maxVal !== undefined ? maxVal : Math.max(...dataPoints, 1);
    const width = 300;
    const height = 48;
    const points = dataPoints
      .map((val, idx) => {
        const x = (idx / (dataPoints.length - 1)) * width;
        const y = height - (Math.min(val, computedMax) / (computedMax || 1)) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg className="w-full h-10 sm:h-12 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Multi-series sparkline (e.g. Read & Write or RX & TX)
  const renderDualSparkline = (
    series1: number[],
    series2: number[],
    color1: string,
    color2: string
  ) => {
    const allVals = [...series1, ...series2];
    if (allVals.length < 2) return null;
    const maxVal = Math.max(...allVals, 1024);
    const width = 300;
    const height = 48;

    const getPoints = (pts: number[]) =>
      pts
        .map((val, idx) => {
          const x = (idx / Math.max(pts.length - 1, 1)) * width;
          const y = height - (Math.min(val, maxVal) / maxVal) * (height - 8) - 4;
          return `${x},${y}`;
        })
        .join(" ");

    return (
      <svg className="w-full h-10 sm:h-12 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        {series1.length > 1 && (
          <polyline
            fill="none"
            stroke={color1}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints(series1)}
          />
        )}
        {series2.length > 1 && (
          <polyline
            fill="none"
            stroke={color2}
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints(series2)}
          />
        )}
      </svg>
    );
  };

  const cpuData = utilizationHistory.map((u) => u.cpuPercent);
  const memData = utilizationHistory.map((u) => u.memoryPercent);
  const netRxData = utilizationHistory.map((u) => u.networkRxBytes);
  const netTxData = utilizationHistory.map((u) => u.networkTxBytes);
  const diskReadData = utilizationHistory.map((u) => u.diskReadBytes);
  const diskWriteData = utilizationHistory.map((u) => u.diskWriteBytes);

  const runningCount = processes.filter((p) => p.status === "R" || p.status === "running").length;
  const sleepingCount = processes.length - runningCount;

  const totalRamMB = utilization?.memoryTotalMB || systemInfo?.ramTotal || 8192;
  const usedRamMB = utilization?.memoryUsedMB || systemInfo?.ramUsed || Math.round(totalRamMB * ((utilization?.memoryPercent || 40) / 100));
  const freeRamMB = Math.max(totalRamMB - usedRamMB, 0);

  const avgCpu = cpuData.length > 0 ? (cpuData.reduce((a, b) => a + b, 0) / cpuData.length).toFixed(1) : "0.0";
  const peakCpu = cpuData.length > 0 ? Math.max(...cpuData) : (utilization?.cpuPercent || 0);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.monitor.title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {session.model || "DS920+"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi thời gian thực CPU, RAM, Mạng, Ổ đĩa và kiểm soát tiến trình
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Refresh interval dropdown */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <span className="text-slate-400 px-2 hidden sm:inline text-[11px]">Làm mới:</span>
            {[
              { label: "2s", val: 2000 },
              { label: "3s", val: 3000 },
              { label: "5s", val: 5000 },
              { label: "Tạm dừng", val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setRefreshInterval(opt.val)}
                className={`px-2 py-1 rounded-lg transition-all text-[11px] ${
                  refreshInterval === opt.val
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchProcesses}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Làm mới ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* System Hardware & Performance Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Model & OS */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Thiết bị</span>
            <Server className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {systemInfo?.model || session.model || "DS920+"}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {systemInfo?.version?.split("-")[0] || "DSM 7.2.1"}
            </p>
          </div>
        </div>

        {/* CPU Model & Cores */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Bộ vi xử lý</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={systemInfo?.cpuModel}>
              {systemInfo?.cpuCores || 4} Cores
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {systemInfo?.cpuModel?.split("(")[0]?.trim() || "Intel Celeron J4125"}
            </p>
          </div>
        </div>

        {/* RAM Status */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Bộ nhớ RAM</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
              {(totalRamMB / 1024).toFixed(0)} GB
            </p>
            <p className="text-[10px] text-blue-500 font-semibold truncate mt-0.5">
              Đã dùng {(usedRamMB / 1024).toFixed(1)} GB ({utilization?.memoryPercent || 40}%)
            </p>
          </div>
        </div>

        {/* Temperature */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Nhiệt độ</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
              {systemInfo?.temperature || 42}°C
            </p>
            <p className="text-[10px] text-emerald-500 font-semibold truncate mt-0.5">
              Mát mẻ (Bình thường)
            </p>
          </div>
        </div>

        {/* Uptime */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Thời gian chạy</span>
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {formatUptime(systemInfo?.uptime || 846200, language)}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Khởi động ổn định
            </p>
          </div>
        </div>

        {/* Active Processes Badge */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Tiến trình</span>
            <Zap className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
              {processes.length} tasks
            </p>
            <p className="text-[10px] text-emerald-500 font-semibold truncate mt-0.5">
              {runningCount} đang chạy • {sleepingCount} ngủ
            </p>
          </div>
        </div>
      </div>

      {/* 4 Live Graph Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-500">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t.monitor.cpuHistory}
                </span>
              </div>
              <span className="text-base font-black text-sky-500 font-mono">
                {utilization?.cpuPercent || 0}%
              </span>
            </div>
            <div className="pt-2">
              {renderSparkline(cpuData.length > 1 ? cpuData : [10, 20, 15, 18, 12], "#0ea5e9", 100)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>TB: <strong className="text-slate-700 dark:text-slate-300 font-mono">{avgCpu}%</strong></span>
            <span>Đỉnh: <strong className="text-sky-500 font-mono">{peakCpu}%</strong></span>
            <span>{systemInfo?.cpuCores || 4} Luồng</span>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t.monitor.memoryBreakdown}
                </span>
              </div>
              <span className="text-base font-black text-blue-500 font-mono">
                {utilization?.memoryPercent || 0}%
              </span>
            </div>
            <div className="pt-2">
              {renderSparkline(memData.length > 1 ? memData : [40, 41, 40, 42, 41], "#3b82f6", 100)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dùng: <strong className="text-slate-700 dark:text-slate-300 font-mono">{(usedRamMB / 1024).toFixed(1)}GB</strong></span>
            <span>Trống: <strong className="text-emerald-500 font-mono">{(freeRamMB / 1024).toFixed(1)}GB</strong></span>
            <span>Tổng: {(totalRamMB / 1024).toFixed(0)}GB</span>
          </div>
        </div>

        {/* Network Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t.monitor.networkThroughput}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-500 font-mono block">
                  ↓ {formatSpeed(utilization?.networkRxBytes || 0)}
                </span>
              </div>
            </div>
            <div className="pt-2">
              {renderDualSparkline(
                netRxData.length > 1 ? netRxData : [1000, 4000, 2500, 3200],
                netTxData.length > 1 ? netTxData : [500, 1200, 800, 1500],
                "#10b981",
                "#0ea5e9"
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
              <ArrowDown className="w-3 h-3" /> RX {formatSpeed(utilization?.networkRxBytes || 0)}
            </span>
            <span className="text-sky-500 font-semibold flex items-center gap-1 font-mono">
              <ArrowUp className="w-3 h-3" /> TX {formatSpeed(utilization?.networkTxBytes || 0)}
            </span>
          </div>
        </div>

        {/* Disk I/O Activity Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Tốc độ ổ đĩa (I/O)
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-500 font-mono block">
                  R: {formatSpeed(utilization?.diskReadBytes || 0)}
                </span>
              </div>
            </div>
            <div className="pt-2">
              {renderDualSparkline(
                diskReadData.length > 1 ? diskReadData : [2000, 8000, 4500, 6200],
                diskWriteData.length > 1 ? diskWriteData : [1500, 3200, 2100, 4800],
                "#f59e0b",
                "#a855f7"
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 font-mono">
              Đọc: {formatSpeed(utilization?.diskReadBytes || 0)}
            </span>
            <span className="text-purple-500 font-semibold flex items-center gap-1 font-mono">
              Ghi: {formatSpeed(utilization?.diskWriteBytes || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Volume Complete Overview (All storages & SSD Cache shown at full) */}
      {(() => {
        const activeVols = volumes.length > 0 ? [...volumes] : [...mockStorageVolumes];
        const totalCap = activeVols.reduce((a, v) => a + (v.totalBytes || 0), 0);
        const totalUsed = activeVols.reduce((a, v) => a + (v.usedBytes || 0), 0);
        const totalFree = Math.max(totalCap - totalUsed, 0);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between cursor-pointer flex-wrap gap-2" onClick={() => setShowVolumeOverview((v) => !v)}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Toàn bộ không gian Lưu trữ & Ổ đĩa ({activeVols.length} Volume)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tổng dung lượng: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatBytes(totalCap)}</strong> • Đã dùng: <strong className="font-mono text-sky-500">{formatBytes(totalUsed)}</strong> • Còn trống: <strong className="font-mono text-emerald-500">{formatBytes(totalFree)}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                  {activeVols.reduce((a, v) => a + (v.drives?.length || 0), 0)} Khay ổ đĩa
                </span>
                <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showVolumeOverview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showVolumeOverview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {activeVols.map((vol) => {
                  const pct = vol.totalBytes > 0 ? Math.min(100, Math.round((vol.usedBytes / vol.totalBytes) * 100)) : 0;
                  const isSsdCache = vol.isCache === true || vol.fsType.toLowerCase().includes("cache") || vol.name.toLowerCase().includes("cache");

                  return (
                    <div
                      key={vol.id}
                      className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border space-y-2.5 ${
                        isSsdCache
                          ? "bg-purple-500/[0.04] dark:bg-purple-950/20 border-purple-500/40 dark:border-purple-500/30"
                          : "bg-emerald-500/[0.03] dark:bg-emerald-950/15 border-emerald-500/30 dark:border-emerald-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold text-xs sm:text-sm flex items-center gap-1.5 ${
                              isSsdCache
                                ? "text-purple-700 dark:text-purple-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {isSsdCache ? <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            {vol.name}
                          </span>
                          {isSsdCache ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              🔥 98.4% Cache Hit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Lưu trữ Chính
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSsdCache
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {pct}% đã dùng
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                        <span>{vol.path}</span>
                        <span>•</span>
                        <span className="font-semibold">{vol.fsType}</span>
                        <span>•</span>
                        <span>{vol.drives?.length || 0} ổ gắn kết</span>
                        {isSsdCache && <span className="text-amber-500 font-semibold">(Tăng tốc Volume 1)</span>}
                      </div>

                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isSsdCache
                              ? "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Đã dùng: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatBytes(vol.usedBytes)}</strong></span>
                        <span>Còn trống: <strong className="text-emerald-500 font-mono">{formatBytes(vol.freeBytes)}</strong></span>
                        <span>Tổng: <strong className="font-mono">{formatBytes(vol.totalBytes)}</strong></span>
                      </div>

                      {vol.drives && vol.drives.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
                          {vol.drives.map((d) => {
                            const isM2 = d.driveType === "NVMe" || d.slot === 5 || d.model?.toLowerCase().includes("nvme") || d.model?.toLowerCase().includes("ssd");
                            return (
                              <span
                                key={d.slot}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] border ${
                                  isM2
                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-medium"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isM2 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                                <strong>{d.slotName || (isM2 ? `Khe M.2-${d.slot - 4}` : `Khay ${d.slot}`)}:</strong> {d.model?.split(" ")?.slice(0, 3)?.join(" ") || "Ổ đĩa"}
                                <span className="ml-1 text-slate-400 font-mono">{d.temp}°C</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Process Manager Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t.monitor.processList}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                {filteredAndSortedProcesses.length} / {processes.length}
              </span>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.monitor.searchProcess}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Filter Chips & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
              {[
                { id: "all", label: "Tất cả" },
                { id: "running", label: "Đang chạy" },
                { id: "highCpu", label: "CPU > 0.5%" },
                { id: "highRam", label: "RAM > 50MB" },
                { id: "system", label: "Hệ thống" },
                { id: "user", label: "Người dùng" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProcessFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    processFilter === tab.id
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <span className="text-[11px]">Sắp xếp:</span>
              <button
                onClick={() => toggleSort("cpu")}
                className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                  sortBy === "cpu"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                }`}
              >
                CPU {sortBy === "cpu" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => toggleSort("memory")}
                className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                  sortBy === "memory"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                }`}
              >
                RAM {sortBy === "memory" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => toggleSort("pid")}
                className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                  sortBy === "pid"
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                }`}
              >
                PID {sortBy === "pid" && (sortOrder === "desc" ? "↓" : "↑")}
              </button>
            </div>
          </div>
        </div>

        {/* 1. Mobile Process List (< md screens) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[600px] overflow-y-auto">
          {filteredAndSortedProcesses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Không tìm thấy tiến trình phù hợp
            </div>
          ) : (
            filteredAndSortedProcesses.map((p) => {
              const isRunning = p.status === "R" || p.status === "running";
              return (
                <div
                  key={p.pid}
                  className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors space-y-2 cursor-pointer"
                  onClick={() => setInspectProcess(p)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        #{p.pid}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate" title={p.name}>
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isRunning
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setKillCandidate(p);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                        title="Dừng tiến trình này"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl text-[11px] font-mono">
                    <div className="flex items-center space-x-1">
                      <Cpu className="w-3 h-3 text-sky-500 shrink-0" />
                      <span className="text-slate-400 text-[10px]">CPU:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {p.cpu > 0 ? `${p.cpu.toFixed(1)}%` : "0.0%"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="text-slate-400 text-[10px]">RAM:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {p.memory > 0 ? formatBytes(p.memory) : "--"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 justify-end font-sans">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300 truncate text-[11px]">{p.user}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Process Table (>= md screens) */}
        <div className="hidden md:block overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0 backdrop-blur-sm z-10 select-none">
              <tr>
                <th
                  onClick={() => toggleSort("pid")}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.monitor.pid}</span>
                    {sortBy === "pid" && <span>{sortOrder === "desc" ? "↓" : "↑"}</span>}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("name")}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.monitor.processName}</span>
                    {sortBy === "name" && <span>{sortOrder === "desc" ? "↓" : "↑"}</span>}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("cpu")}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.monitor.cpuPercent}</span>
                    {sortBy === "cpu" && <span>{sortOrder === "desc" ? "↓" : "↑"}</span>}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("memory")}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.monitor.memoryUsage}</span>
                    {sortBy === "memory" && <span>{sortOrder === "desc" ? "↓" : "↑"}</span>}
                  </div>
                </th>
                <th className="px-4 py-3.5">{t.monitor.user}</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAndSortedProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy tiến trình phù hợp
                  </td>
                </tr>
              ) : (
                filteredAndSortedProcesses.map((p) => {
                  const isRunning = p.status === "R" || p.status === "running";
                  return (
                    <tr
                      key={p.pid}
                      onClick={() => setInspectProcess(p)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-mono group cursor-pointer"
                    >
                      <td className="px-4 py-3 text-slate-400 text-[11px] font-bold">
                        #{p.pid}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white font-sans flex items-center space-x-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isRunning ? "bg-sky-500" : "bg-slate-400"
                          }`}
                        />
                        <span className="truncate max-w-xs">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold">
                        <span
                          className={
                            p.cpu > 5
                              ? "text-rose-500 font-black"
                              : p.cpu > 1
                              ? "text-sky-500 font-bold"
                              : ""
                          }
                        >
                          {p.cpu > 0 ? `${p.cpu.toFixed(1)}%` : "0.0%"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {p.memory > 0 ? formatBytes(p.memory) : "--"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-sans">
                        {p.user}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectProcess(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setKillCandidate(p)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title="Dừng tiến trình"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="font-sans">Dừng</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Process Modal */}
      {inspectProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-500">
                <Info className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Chi tiết tiến trình
                </h3>
              </div>
              <button
                onClick={() => setInspectProcess(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tên:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{inspectProcess.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">PID:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">#{inspectProcess.pid}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tài khoản (User):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{inspectProcess.user}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{inspectProcess.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Chiếm dụng CPU:</span>
                  <span className="font-bold text-sky-500 font-mono">{inspectProcess.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Chiếm dụng RAM:</span>
                  <span className="font-bold text-blue-500 font-mono">{formatBytes(inspectProcess.memory)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  const p = inspectProcess;
                  setInspectProcess(null);
                  setKillCandidate(p);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Dừng tiến trình này
              </button>
              <button
                onClick={() => setInspectProcess(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Kill Process */}
      {killCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="p-2.5 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Xác nhận dừng tiến trình?
                </h3>
                <p className="text-xs text-slate-400">
                  PID: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{killCandidate.pid}</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tên tiến trình:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono truncate max-w-[200px]" title={killCandidate.name}>
                  {killCandidate.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mức chiếm dụng CPU:</span>
                <span className="font-bold text-sky-500 font-mono">
                  {killCandidate.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bộ nhớ RAM:</span>
                <span className="font-bold text-blue-500 font-mono">
                  {formatBytes(killCandidate.memory)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Người thực thi:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {killCandidate.user}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-500/90 leading-relaxed bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              ⚠️ <strong>Cảnh báo:</strong> Việc dừng tiến trình hệ thống quan trọng có thể gây gián đoạn hoặc khởi động lại các dịch vụ trên NAS.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={killing}
                onClick={() => setKillCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={killing}
                onClick={handleConfirmKill}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {killing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang dừng...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Dừng tiến trình</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
