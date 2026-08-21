"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DSMProcess } from "@/lib/dsm/types";
import { formatBytes, formatSpeed } from "@/lib/utils";
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
} from "lucide-react";

export const ResourceMonitorTab: React.FC = () => {
  const { utilization, utilizationHistory, t } = useAppStore();
  const [processes, setProcesses] = useState<DSMProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Kill Process modal state
  const [killCandidate, setKillCandidate] = useState<DSMProcess | null>(null);
  const [killing, setKilling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const list = await dsmClient.getProcesses();
      setProcesses(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const timer = setInterval(fetchProcesses, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const filteredProcesses = processes.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    String(p.pid).includes(search) ||
    p.user.toLowerCase().includes(search.toLowerCase())
  );

  // Sparkline generator helper
  const renderSparkline = (dataPoints: number[], color: string, maxVal = 100) => {
    if (dataPoints.length < 2) return null;
    const width = 300;
    const height = 50;
    const points = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * width;
      const y = height - (Math.min(val, maxVal) / maxVal) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(" ");

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

  const cpuData = utilizationHistory.map((u) => u.cpuPercent);
  const memData = utilizationHistory.map((u) => u.memoryPercent);
  const netData = utilizationHistory.map((u) => (u.networkRxBytes + u.networkTxBytes) / (1024 * 1024));

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
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

      {/* Live Graph Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* CPU Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t.monitor.cpuHistory}
              </span>
            </div>
            <span className="text-sm font-bold text-sky-500 font-mono">
              {utilization?.cpuPercent || 0}%
            </span>
          </div>
          <div className="pt-1">
            {renderSparkline(cpuData.length > 1 ? cpuData : [10, 20, 15, 18], "#0ea5e9", 100)}
          </div>
        </div>

        {/* Memory Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t.monitor.memoryBreakdown}
              </span>
            </div>
            <span className="text-sm font-bold text-blue-500 font-mono">
              {utilization?.memoryPercent || 0}%
            </span>
          </div>
          <div className="pt-1">
            {renderSparkline(memData.length > 1 ? memData : [11, 11, 11, 11], "#3b82f6", 100)}
          </div>
        </div>

        {/* Network Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t.monitor.networkThroughput}
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-500 font-mono">
              {formatSpeed(utilization?.networkRxBytes || 0)}
            </span>
          </div>
          <div className="pt-1">
            {renderSparkline(netData.length > 1 ? netData : [1, 3, 2, 4], "#10b981", Math.max(...netData, 5))}
          </div>
        </div>
      </div>

      {/* Process Manager Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t.monitor.processList}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                {processes.length}
              </span>
            </div>
            <button
              onClick={fetchProcesses}
              className="sm:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.monitor.searchProcess}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={fetchProcesses}
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.common.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 1. Mobile Process List (< md screens) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[540px] overflow-y-auto">
          {filteredProcesses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Không tìm thấy tiến trình phù hợp
            </div>
          ) : (
            filteredProcesses.map((p) => {
              const isRunning = p.status === "R" || p.status === "running" || p.status === "S";
              return (
                <div
                  key={p.pid}
                  className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors space-y-2"
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
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={() => setKillCandidate(p)}
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
        <div className="hidden md:block overflow-x-auto max-h-[540px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-4 py-3.5">{t.monitor.pid}</th>
                <th className="px-4 py-3.5">{t.monitor.processName}</th>
                <th className="px-4 py-3.5">{t.monitor.cpuPercent}</th>
                <th className="px-4 py-3.5">{t.monitor.memoryUsage}</th>
                <th className="px-4 py-3.5">{t.monitor.user}</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy tiến trình phù hợp
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((p) => (
                  <tr
                    key={p.pid}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-mono group"
                  >
                    <td className="px-4 py-3 text-slate-400 text-[11px] font-bold">
                      {p.pid}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white font-sans flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === "R" || p.status === "running" ? "bg-sky-500" : "bg-slate-400"}`} />
                      <span className="truncate">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-bold">
                      {p.cpu > 0 ? `${p.cpu.toFixed(1)}%` : "0.0%"}
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
                          p.status === "R" || p.status === "running"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setKillCandidate(p)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Dừng tiến trình"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="font-sans">Dừng</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal to Kill Process */}
      {killCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
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
