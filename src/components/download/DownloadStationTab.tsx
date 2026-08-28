"use client";

import React, { useState, useEffect } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DownloadTask } from "@/lib/dsm/types";
import { formatBytes, formatSpeed } from "@/lib/utils";
import {
  DownloadCloud,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";

export const DownloadStationTab: React.FC = () => {
  const { t } = useAppStore();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "downloading" | "finished" | "paused">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const list = await dsmClient.getDownloadTasks();
      setTasks(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const timer = setInterval(loadTasks, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);
    try {
      await dsmClient.addDownloadTask(urlInput.trim());
      setUrlInput("");
      setAddTaskModalOpen(false);
      await loadTasks();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "pause" | "resume" | "delete") => {
    setActionLoadingId(id);
    try {
      await dsmClient.toggleDownloadTask(id, action);
      await loadTasks();
    } finally {
      setActionLoadingId(null);
    }
  };

  const downloadingTasks = tasks.filter((t) => t.status === "downloading");
  const finishedTasks = tasks.filter((t) => t.status === "finished");

  const totalDlSpeed = downloadingTasks.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0);
  const totalUlSpeed = downloadingTasks.reduce((acc, t) => acc + (t.uploadSpeed || 0), 0);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "downloading" && task.status === "downloading") ||
      (statusFilter === "finished" && task.status === "finished") ||
      (statusFilter === "paused" && task.status !== "downloading" && task.status !== "finished");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đang tải ({downloadingTasks.length})
            </p>
            <p className="text-sm sm:text-2xl font-bold text-sky-600 dark:text-sky-400 mt-0.5 sm:mt-1 font-mono truncate">
              ↓ {formatSpeed(totalDlSpeed)}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tải lên
            </p>
            <p className="text-sm sm:text-2xl font-bold text-amber-500 mt-0.5 sm:mt-1 font-mono truncate">
              ↑ {formatSpeed(totalUlSpeed)}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Hoàn thành
            </p>
            <p className="text-sm sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
              {finishedTasks.length}/{tasks.length}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
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
            placeholder="Tìm kiếm tác vụ..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              Tất cả ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter("downloading")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "downloading"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Đang tải ({downloadingTasks.length})
            </button>
            <button
              onClick={() => setStatusFilter("finished")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "finished"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Xong ({finishedTasks.length})
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setAddTaskModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm tải</span>
            </button>

            <button
              onClick={loadTasks}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t.download.noTasks}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDownloading = task.status === "downloading";
            const isFinished = task.status === "finished";
            const isLoading = actionLoadingId === task.id;

            return (
              <div key={task.id} className="p-3.5 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors space-y-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div
                      className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                        isFinished
                          ? "bg-emerald-500/10 text-emerald-500"
                          : isDownloading
                          ? "bg-sky-500/10 text-sky-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={task.title}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatBytes(task.size)} • {task.type}
                      </p>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {isDownloading ? (
                      <button
                        onClick={() => handleAction(task.id, "pause")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                        title={t.download.pause}
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : !isFinished ? (
                      <button
                        onClick={() => handleAction(task.id, "resume")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                        title={t.download.resume}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleAction(task.id, "delete")}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                      title="Xóa tác vụ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Speed Row (When downloading) */}
                {isDownloading && (
                  <div className="flex items-center space-x-3 text-[11px] font-mono">
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <ArrowDownCircle className="w-3 h-3" />
                      {formatSpeed(task.downloadSpeed)}
                    </span>
                    {task.uploadSpeed > 0 && (
                      <span className="text-amber-500 font-bold flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3" />
                        {formatSpeed(task.uploadSpeed)}
                      </span>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFinished
                          ? "bg-emerald-500"
                          : isDownloading
                          ? "bg-sky-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    <span>
                      {isFinished
                        ? t.download.completedTasks
                        : isDownloading
                        ? t.download.activeTasks
                        : t.download.pausedTasks}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{task.progress}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Download Task Modal */}
      {addTaskModalOpen && (
        <ResponsiveModal open={addTaskModalOpen} onClose={() => setAddTaskModalOpen(false)} maxWidth="lg" title={t.download.addTask} icon={<DownloadCloud className="w-5 h-5" />}>
          <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Liên kết tải (URL / Magnet Link)
                </label>
                <textarea
                  required
                  rows={3}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t.download.urlPlaceholder}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {loading ? "Đang gửi..." : t.common.confirm}
                </button>
              </div>
            </form>
        </ResponsiveModal>
      )}
    </div>
  );
};
