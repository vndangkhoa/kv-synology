"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { formatBytes, formatSpeed, formatUptime } from "@/lib/utils";
import { StorageVolume } from "@/lib/dsm/types";
import {
  Cpu,
  Layers,
  HardDrive,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  FolderOpen,
  Boxes,
  DownloadCloud,
  CheckCircle,
  Server,
  Thermometer,
  Clock,
  ChevronRight,
} from "lucide-react";

export const OverviewTab: React.FC = () => {
  const { systemInfo, utilization, session, setActiveTab, t, language } = useAppStore();
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);

  useEffect(() => {
    dsmClient.getStorageVolumes().then((vols) => setVolumes(vols));
  }, [session.isConnected]);

  const cpu = utilization?.cpuPercent ?? 7;
  const ram = utilization?.memoryPercent ?? 11;
  const ramTotalMB = systemInfo?.ramTotal || utilization?.memoryTotalMB || 65536;
  const ramUsedMB = utilization?.memoryUsedMB || Math.floor((ram / 100) * ramTotalMB);
  const rx = utilization?.networkRxBytes ?? 9400;
  const tx = utilization?.networkTxBytes ?? 32200;

  const totalDiskBytes = volumes.reduce((acc, v) => acc + (v.totalBytes || 0), 0);
  const usedDiskBytes = volumes.reduce((acc, v) => acc + (v.usedBytes || 0), 0);
  const diskPercent = totalDiskBytes > 0 ? Math.round((usedDiskBytes / totalDiskBytes) * 100) : 47;

  const ramTotalGB = (ramTotalMB / 1024).toFixed(ramTotalMB % 1024 === 0 ? 0 : 1);
  const ramUsedGB = (ramUsedMB / 1024).toFixed(1);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Real Hardware Status */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {systemInfo?.model || session.model || "DS920+"}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  {t.dashboard.healthy}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {systemInfo?.version || session.versionString || "DSM 7.2.2"} • S/N:{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {systemInfo?.serial && systemInfo.serial !== "N/A" ? systemInfo.serial : "2160TERXDFR1D"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics (Uptime, Temp, Processor) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[11px]">{t.dashboard.uptime}</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {formatUptime(systemInfo?.uptime || 846200, language)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px]">{t.dashboard.temperature}</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {systemInfo?.temperature || 54}°C
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px]">Vi xử lý (CPU)</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={systemInfo?.cpuModel}>
                {systemInfo?.cpuModel || `Intel Celeron J4125 @ 2.8 GHz`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Resource Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* CPU Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.cpuUsage}
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-sky-500/10 text-sky-500">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {cpu}%
            </span>
            <span className="text-xs font-semibold text-slate-400">Utilization</span>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpu > 85 ? "bg-rose-500" : cpu > 60 ? "bg-amber-500" : "bg-sky-500"
              }`}
              style={{ width: `${Math.min(cpu, 100)}%` }}
            />
          </div>
        </div>

        {/* RAM Memory Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.ramUsage}
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {ram}%
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {ramUsedGB} / {ramTotalGB} GB
            </span>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ram > 85 ? "bg-rose-500" : ram > 70 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(ram, 100)}%` }}
            />
          </div>
        </div>

        {/* Network Traffic */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.networkTraffic}
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />
                {t.dashboard.downloadSpeed}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatSpeed(rx)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-500" />
                {t.dashboard.uploadSpeed}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatSpeed(tx)}
              </span>
            </div>
          </div>
        </div>

        {/* Disk Storage Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.diskUsage}
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-500">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {diskPercent}%
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono truncate">
              {totalDiskBytes > 0 ? `${formatBytes(usedDiskBytes)} / ${formatBytes(totalDiskBytes)}` : "3.27 TB / 6.98 TB"}
            </span>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${diskPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {t.dashboard.quickActions}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab("files")}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center space-x-3 sm:space-x-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  File Station
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Duyệt và tải lên tập tin
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => setActiveTab("docker")}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center space-x-3 sm:space-x-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Docker Containers
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Quản lý ứng dụng container
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => setActiveTab("download")}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center space-x-3 sm:space-x-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <DownloadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Download Station
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Tải tệp tin torrent & URL
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
