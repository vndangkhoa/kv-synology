"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DockerContainer } from "@/lib/dsm/types";
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  LayoutGrid,
  List,
} from "lucide-react";

export const DockerTab: React.FC = () => {
  const { t } = useAppStore();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const list = await dsmClient.getDockerContainers();
      setContainers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    const timer = setInterval(fetchContainers, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = async (container: DockerContainer, action: "start" | "stop" | "restart") => {
    setActionLoadingId(container.id);
    try {
      await dsmClient.toggleDockerContainer(container.name || container.id, action);
      await fetchContainers();
    } finally {
      setActionLoadingId(null);
    }
  };

  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.length - runningCount;

  const filteredContainers = containers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && c.status === "running") ||
      (statusFilter === "stopped" && c.status !== "running");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "all"
              ? "bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {t.docker.totalContainers}
            </p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1">
              {containers.length}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("running")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "running"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {t.docker.runningCount}
            </p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
              {runningCount}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("stopped")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "stopped"
              ? "bg-slate-500/10 border-slate-500/40 ring-2 ring-slate-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {t.docker.stoppedCount}
            </p>
            <p className="text-lg sm:text-2xl font-bold text-slate-500 mt-0.5 sm:mt-1">
              {stoppedCount}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Square className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm container..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Status Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl text-[11px] font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Tất cả ({containers.length})
            </button>
            <button
              onClick={() => setStatusFilter("running")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "running"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Chạy ({runningCount})
            </button>
            <button
              onClick={() => setStatusFilter("stopped")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "stopped"
                  ? "bg-white dark:bg-slate-700 text-slate-500 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Dừng ({stoppedCount})
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "text-slate-400"
                }`}
                title="Dạng lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "text-slate-400"
                }`}
                title="Dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={fetchContainers}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Mode (Default for all screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredContainers.map((container) => {
          const isRunning = container.status === "running";
          const isLoading = actionLoadingId === container.id;

          return (
            <div
              key={container.id}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={container.name}>
                      {container.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={container.image}>
                      {container.image}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                      isRunning
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl sm:rounded-2xl text-[11px] mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="text-slate-400">CPU:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {typeof container.cpuUsage === "number" ? `${container.cpuUsage.toFixed(1)}%` : "0.0%"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-slate-400">RAM:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                      {container.memoryUsage || "0 MB"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {isRunning ? (
                  <>
                    <button
                      onClick={() => handleToggle(container, "restart")}
                      disabled={isLoading}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                      title="Khởi động lại"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>

                    <button
                      onClick={() => handleToggle(container, "stop")}
                      disabled={isLoading}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <Square className="w-3 h-3" />
                      <span>Dừng</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleToggle(container, "start")}
                    disabled={isLoading}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    <span>Khởi chạy</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
