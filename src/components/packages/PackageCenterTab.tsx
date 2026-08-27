"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { PackageItem } from "@/lib/dsm/types";
import { mockPackages } from "@/lib/dsm/mockData";
import {
  Package,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Search,
  CheckCircle2,
  Boxes,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  List,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Check,
} from "lucide-react";

type ViewMode = "standard" | "compact" | "detailed" | "list";

export const PackageCenterTab: React.FC = () => {
  const { t, session } = useAppStore();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "official" | "community">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Restore saved view mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pkg_view_mode") as ViewMode;
      if (saved && ["standard", "compact", "detailed", "list"].includes(saved)) {
        setViewMode(saved);
      }
    } catch (_) {}
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("pkg_view_mode", mode);
    } catch (_) {}
  };

  const loadPackages = async () => {
    setLoading(true);
    try {
      let list = await dsmClient.getPackages();
      if (!list || list.length === 0) {
        list = mockPackages;
      }
      setPackages(list);
    } catch (_) {
      setPackages(mockPackages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleToggle = async (pkg: PackageItem, forceAction?: "start" | "stop") => {
    setActionLoadingId(pkg.id);
    const nextAction = forceAction || (pkg.status === "running" ? "stop" : "start");
    try {
      // Optimistic update
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: nextAction === "start" ? "running" : "stopped" } : p))
      );
      if (selectedPkg?.id === pkg.id) {
        setSelectedPkg((prev) => (prev ? { ...prev, status: nextAction === "start" ? "running" : "stopped" } : null));
      }

      const ok = await dsmClient.togglePackage(pkg.id, nextAction);
      if (ok) {
        setFeedbackMsg({
          type: "success",
          text: `Đã ${nextAction === "start" ? "khởi chạy" : "dừng"} gói "${pkg.name}" thành công!`,
        });
      } else {
        // Revert on real NAS error
        await loadPackages();
        setFeedbackMsg({
          type: "error",
          text: `Không thể ${nextAction === "start" ? "khởi chạy" : "dừng"} "${pkg.name}". Hãy thử lại.`,
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: `Lỗi thao tác gói: ${e.message}`,
      });
      await loadPackages();
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleRestart = async (pkg: PackageItem) => {
    setActionLoadingId(pkg.id);
    try {
      await dsmClient.togglePackage(pkg.id, "stop");
      await new Promise((r) => setTimeout(r, 800));
      await dsmClient.togglePackage(pkg.id, "start");
      setFeedbackMsg({
        type: "success",
        text: `Đã khởi động lại gói "${pkg.name}" thành công!`,
      });
      await loadPackages();
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: `Lỗi khởi động lại: ${e.message}`,
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const runningCount = packages.filter((p) => p.status === "running").length;
  const stoppedCount = packages.length - runningCount;
  const officialCount = packages.filter((p) => p.maintainer.includes("Synology")).length;
  const communityCount = packages.length - officialCount;

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.maintainer.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && p.status === "running") ||
        (statusFilter === "stopped" && p.status !== "running");

      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "official" && p.maintainer.includes("Synology")) ||
        (sourceFilter === "community" && !p.maintainer.includes("Synology"));

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [packages, search, statusFilter, sourceFilter]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 w-full">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 shadow-sm ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          onClick={() => {
            setStatusFilter("all");
            setSourceFilter("all");
          }}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "all" && sourceFilter === "all"
              ? "bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tổng số gói cài đặt
            </p>
            <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 font-mono">
              {packages.length}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("running")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "running"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đang hoạt động
            </p>
            <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 font-mono">
              {runningCount}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Play className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("stopped")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "stopped"
              ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đã tạm dừng
            </p>
            <p className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 font-mono">
              {stoppedCount}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
            <Square className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setSourceFilter(sourceFilter === "community" ? "all" : "community")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            sourceFilter === "community"
              ? "bg-indigo-500/10 border-indigo-500/40 ring-2 ring-indigo-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Gói bên thứ ba (Community)
            </p>
            <p className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1 font-mono">
              {communityCount}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm gói theo tên, mô tả, nhà phát triển..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
            {[
              { id: "all", label: "Tất cả" },
              { id: "running", label: "Đang chạy" },
              { id: "stopped", label: "Đã dừng" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === f.id
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Source Filter Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
            {[
              { id: "all", label: "Tất cả nguồn" },
              { id: "official", label: "Synology" },
              { id: "community", label: "Community" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSourceFilter(s.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sourceFilter === s.id
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-slate-500">
            <button
              onClick={() => handleSetViewMode("standard")}
              title="Lưới tiêu chuẩn (3 cột)"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "standard"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("compact")}
              title="Lưới nhỏ gọn (4 cột)"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "compact"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("detailed")}
              title="Lưới chi tiết (2 cột)"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "detailed"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("list")}
              title="Danh sách bảng"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadPackages}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Packages Content: Grid or List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Không tìm thấy gói ứng dụng nào phù hợp
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* TABLE / LIST VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Gói ứng dụng</th>
                  <th className="px-4 py-3">Phiên bản</th>
                  <th className="px-4 py-3">Nhà phát triển</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((pkg) => {
                  const isRunning = pkg.status === "running";
                  const isActionLoading = actionLoadingId === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {pkg.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {pkg.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {pkg.version}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {pkg.maintainer}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {isRunning ? "Đang chạy" : "Đã dừng"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(pkg)}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isRunning
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            } disabled:opacity-50`}
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isRunning ? (
                              <Square className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                            <span>{isRunning ? "Dừng" : "Chạy"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID MODES: Standard, Compact, or Detailed */
        <div
          className={`grid gap-3 sm:gap-4 ${
            viewMode === "compact"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : viewMode === "detailed"
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {filtered.map((pkg) => {
            const isRunning = pkg.status === "running";
            const isActionLoading = actionLoadingId === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg)}
                className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-600 dark:text-sky-400 shrink-0 ring-1 ring-sky-500/20">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-500 transition-colors">
                          {pkg.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          v{pkg.version}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isRunning
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {isRunning ? "Đang chạy" : "Đã dừng"}
                    </span>
                  </div>

                  {/* Description */}
                  {viewMode !== "compact" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {pkg.description || "Ứng dụng Synology Package Center"}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[130px]">
                    {pkg.maintainer}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isRunning && (
                      <button
                        onClick={() => handleRestart(pkg)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors disabled:opacity-50"
                        title="Khởi động lại gói"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggle(pkg)}
                      disabled={isActionLoading}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isRunning
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      } disabled:opacity-50`}
                    >
                      {isActionLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isRunning ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{isRunning ? "Tạm dừng" : "Kích hoạt"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Inspector Modal */}
      {selectedPkg && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPkg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    {selectedPkg.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">ID: {selectedPkg.id}</span>
                    <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">v{selectedPkg.version}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPkg(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mô tả chi tiết:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {selectedPkg.description || "Gói ứng dụng chính thức từ Synology Package Center."}
              </p>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Trạng thái:</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedPkg.status === "running" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {selectedPkg.status === "running" ? "Đang chạy (Active)" : "Đã tạm dừng (Stopped)"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Nhà phát triển:</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 truncate block">
                  {selectedPkg.maintainer}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button
                onClick={() => setSelectedPkg(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {selectedPkg.status === "running" && (
                  <button
                    onClick={() => handleRestart(selectedPkg)}
                    disabled={actionLoadingId === selectedPkg.id}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Khởi động lại</span>
                  </button>
                )}

                <button
                  onClick={() => handleToggle(selectedPkg)}
                  disabled={actionLoadingId === selectedPkg.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 ${
                    selectedPkg.status === "running"
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {actionLoadingId === selectedPkg.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : selectedPkg.status === "running" ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{selectedPkg.status === "running" ? "Tạm dừng dịch vụ" : "Kích hoạt ứng dụng"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
