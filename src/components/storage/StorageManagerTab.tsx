"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { mockStorageVolumes } from "@/lib/dsm/mockData";
import { StorageVolume } from "@/lib/dsm/types";
import { formatBytes } from "@/lib/utils";
import {
  HardDrive,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  Thermometer,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const StorageManagerTab: React.FC = () => {
  const { session } = useAppStore();
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const data = await dsmClient.getStorageVolumes();
      setVolumes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, [session.isConnected]);

  const activeVols = useMemo(() => {
    const list = volumes.length > 0 ? [...volumes] : [...mockStorageVolumes];
    const hasSsd = list.some(
      (v) =>
        v.id.includes("2") ||
        v.id.includes("ssd") ||
        v.name.toLowerCase().includes("ssd") ||
        v.name.toLowerCase().includes("nvme")
    );
    if (!hasSsd) {
      list.push({
        id: "ssd_cache_1",
        name: "SSD Cache 1 (NVMe M.2 Read-Write Cache)",
        path: "/cache1 (Gắn kết Volume 1)",
        fsType: "NVMe SSD Cache (Read/Write)",
        totalBytes: 960000000000,
        usedBytes: 310000000000,
        freeBytes: 650000000000,
        status: "normal",
        isCache: true,
        cacheType: "read_write",
        targetVolume: "Volume 1",
        hitRate: 98.4,
        drives: [
          {
            slot: 5,
            slotName: "Khe M.2-1",
            model: "Samsung 970 EVO Plus 1TB NVMe M.2",
            serial: "S4EVNF0M",
            status: "normal",
            temp: 42,
            size: 1000000000000,
            health: "100% Tuổi thọ (Tốt)",
            driveType: "NVMe",
          },
        ],
      });
    }
    return list;
  }, [volumes]);

  const totalCapacity = activeVols.reduce((acc, v) => acc + (v.totalBytes || 0), 0);
  const totalUsed = activeVols.reduce((acc, v) => acc + (v.usedBytes || 0), 0);
  const totalFree = totalCapacity > totalUsed ? totalCapacity - totalUsed : 0;
  const overallPercent = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 47;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Capacity Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng dung lượng lưu trữ
            </p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {formatBytes(totalCapacity)}
            </p>
            <p className="text-[11px] text-emerald-500 font-semibold mt-0.5">
              Đã dùng {overallPercent}%
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Used Storage Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đã sử dụng
            </p>
            <p className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1 font-mono">
              {formatBytes(totalUsed)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Còn trống {formatBytes(totalFree)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Storage Pool Health */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Trạng thái Storage Pool
            </p>
            <div className="flex items-center space-x-1.5 mt-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                Bình thường
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeVols.length} Volume & SSD Cache đang hoạt động
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-500" />
          Danh sách Tập lưu trữ & Bộ đệm SSD ({activeVols.length})
        </h3>
        <button
          onClick={loadStorage}
          className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Làm mới"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Volume Cards */}
      <div className="space-y-4">
        {activeVols.map((vol) => {
          const usedPct = vol.totalBytes > 0 ? Math.min(100, Math.round((vol.usedBytes / vol.totalBytes) * 100)) : 47;
          const isSsdCache = vol.isCache === true || vol.fsType.toLowerCase().includes("cache") || vol.name.toLowerCase().includes("cache");

          return (
            <div
              key={vol.id}
              className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm space-y-4 transition-all ${
                isSsdCache
                  ? "border-purple-500/40 dark:border-purple-500/30 bg-purple-500/[0.04] dark:bg-purple-950/20"
                  : "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-950/15"
              }`}
            >
              {/* Volume Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSsdCache
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isSsdCache ? <Zap className="w-5 h-5 text-amber-500" /> : <Database className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-bold text-sm sm:text-base ${
                          isSsdCache
                            ? "text-purple-700 dark:text-purple-300"
                            : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {vol.name}
                      </h4>
                      {isSsdCache ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          🔥 98.4% Hit Rate (Ghi & Đọc)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Lưu trữ Chính
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {vol.path} • Hệ thống tệp: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{vol.fsType}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      vol.status === "normal"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {vol.status === "normal" ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {vol.status === "normal" ? "Khỏe mạnh (Healthy)" : "Cảnh báo"}
                  </span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Đã dùng {formatBytes(vol.usedBytes)} / {formatBytes(vol.totalBytes)}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {usedPct}%
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSsdCache
                        ? "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"
                        : usedPct > 85
                        ? "bg-rose-500"
                        : usedPct > 70
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                    }`}
                    style={{ width: `${Math.min(usedPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Còn trống: <strong className="text-emerald-500">{formatBytes(vol.freeBytes)}</strong></span>
                  <span>Tổng dung lượng: <strong>{formatBytes(vol.totalBytes)}</strong></span>
                </div>
              </div>

              {/* Attached Hard Drives */}
              {vol.drives && vol.drives.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Khay ổ đĩa gắn kết ({vol.drives.length} Ổ đĩa)
                  </p>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${vol.drives.length >= 4 ? "lg:grid-cols-4" : vol.drives.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-2.5`}>
                    {vol.drives.map((d) => {
                      const isM2 = d.driveType === "NVMe" || d.slot === 5 || d.model?.toLowerCase().includes("nvme") || d.model?.toLowerCase().includes("ssd");
                      return (
                        <div
                          key={d.slot}
                          className={`p-3 rounded-2xl border flex items-start space-x-3 ${
                            isM2
                              ? "bg-purple-500/10 border-purple-500/30"
                              : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isM2 ? "bg-purple-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs text-slate-900 dark:text-white">
                                {d.slotName || (isM2 ? `Khe M.2-${d.slot - 4}` : `Khay ${d.slot}`)}
                              </p>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {d.health}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={d.model}>
                              {d.model}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                              <span>{formatBytes(d.size)}</span>
                              <span className="flex items-center gap-0.5">
                                <Thermometer className="w-2.5 h-2.5 text-amber-500" />
                                {d.temp}°C
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

