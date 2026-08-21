"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { PackageItem } from "@/lib/dsm/types";
import {
  Package,
  Play,
  Square,
  RefreshCw,
  Search,
  CheckCircle2,
  Boxes,
} from "lucide-react";

export const PackageCenterTab: React.FC = () => {
  const { t } = useAppStore();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const list = await dsmClient.getPackages();
      setPackages(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleToggle = async (pkg: PackageItem) => {
    setActionLoadingId(pkg.id);
    const nextAction = pkg.status === "running" ? "stop" : "start";
    try {
      await dsmClient.togglePackage(pkg.id, nextAction);
      await loadPackages();
    } finally {
      setActionLoadingId(null);
    }
  };

  const runningCount = packages.filter((p) => p.status === "running").length;
  const stoppedCount = packages.length - runningCount;

  const filtered = packages.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.maintainer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && p.status === "running") ||
      (statusFilter === "stopped" && p.status !== "running");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "all"
              ? "bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tổng số gói
            </p>
            <p className="text-sm sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1">
              {packages.length}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("running")}
          className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "running"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đang chạy
            </p>
            <p className="text-sm sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
              {runningCount}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("stopped")}
          className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            statusFilter === "stopped"
              ? "bg-slate-500/10 border-slate-500/40 ring-2 ring-slate-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đã tạm dừng
            </p>
            <p className="text-sm sm:text-2xl font-bold text-slate-500 mt-0.5 sm:mt-1">
              {stoppedCount}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Square className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar: Search + Status Filter Pills + Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm gói ứng dụng..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl text-[11px] font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Tất cả
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

          <button
            onClick={loadPackages}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title={t.common.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((pkg) => {
          const isRunning = pkg.status === "running";
          const isLoading = actionLoadingId === pkg.id;

          return (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={pkg.name}>
                        {pkg.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        v{pkg.version} • {pkg.maintainer}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap flex items-center gap-1 ${
                      isRunning
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 my-2.5 leading-relaxed">
                  {pkg.description || "Gói ứng dụng cài đặt từ Synology Package Center."}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggle(pkg)}
                  disabled={isLoading}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    isRunning
                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>{isLoading ? "Đang dừng..." : t.packages.stop}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{isLoading ? "Đang chạy..." : t.packages.run}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
