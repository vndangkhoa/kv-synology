"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { SnmpDevice, SnmpSensor, SnmpStatus, SnmpCategory } from "@/lib/snmp/types";
import { createDefaultSnmpDevices, createDefaultSnmpSensors, SYNOLOGY_SNMP_PRESETS } from "@/lib/snmp/presets";
import { SnmpAddDeviceModal } from "./SnmpAddDeviceModal";
import { SnmpAddSensorModal } from "./SnmpAddSensorModal";
import { SnmpWalkModal } from "./SnmpWalkModal";
import {
  Activity,
  Plus,
  Compass,
  RefreshCw,
  Server,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  Trash2,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Cpu,
  HardDrive,
  Thermometer,
  Zap,
  BatteryCharging,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

export const SnmpMonitorTab: React.FC = () => {
  const { session, language } = useAppStore();

  // Devices & Selected Device
  const [devices, setDevices] = useState<SnmpDevice[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("snmp_devices_v1");
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return createDefaultSnmpDevices(session.hostname || "192.168.1.10");
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || "dev_synology_primary");

  // Sensors
  const [sensors, setSensors] = useState<SnmpSensor[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("snmp_sensors_v1");
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return createDefaultSnmpSensors("dev_synology_primary");
  });

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "warn" | "critical" | "paused">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SnmpCategory>("all");
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5s default
  const [polling, setPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());
  const [copiedOid, setCopiedOid] = useState<string | null>(null);

  // Modals
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddSensorOpen, setIsAddSensorOpen] = useState(false);
  const [isWalkOpen, setIsWalkOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("snmp_devices_v1", JSON.stringify(devices));
    } catch (_) {}
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem("snmp_sensors_v1", JSON.stringify(sensors));
    } catch (_) {}
  }, [sensors]);

  const activeDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId) || devices[0];
  }, [devices, selectedDeviceId]);

  const activeSensors = useMemo(() => {
    return sensors.filter((s) => s.deviceId === selectedDeviceId);
  }, [sensors, selectedDeviceId]);

  // Evaluate sensor status according to thresholds
  const evaluateStatus = (sensor: SnmpSensor, val: number | string | null): { status: SnmpStatus; message?: string } => {
    if (val === null || val === undefined) return { status: "unknown", message: "Chưa nhận dữ liệu" };
    if (!sensor.enabled) return { status: "paused", message: "Đang tạm dừng" };

    const th = sensor.thresholds;
    if (!th) return { status: "ok" };

    if (sensor.type === "state") {
      if (th.matchValue !== undefined) {
        const isMatch = String(val) === String(th.matchValue);
        return isMatch
          ? { status: "ok", message: th.normalText || "Bình thường" }
          : { status: "critical", message: `Trạng thái bất thường: ${val}` };
      }
      return { status: "ok" };
    }

    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (isNaN(num)) return { status: "ok" };

    if (th.critMax !== undefined && num >= th.critMax) {
      return { status: "critical", message: `Vượt ngưỡng nguy hiểm (>= ${th.critMax}${sensor.unit || ""})` };
    }
    if (th.critMin !== undefined && num <= th.critMin) {
      return { status: "critical", message: `Dưới ngưỡng nguy hiểm (<= ${th.critMin}${sensor.unit || ""})` };
    }
    if (th.warnMax !== undefined && num >= th.warnMax) {
      return { status: "warn", message: `Vượt ngưỡng cảnh báo (>= ${th.warnMax}${sensor.unit || ""})` };
    }
    if (th.warnMin !== undefined && num <= th.warnMin) {
      return { status: "warn", message: `Dưới ngưỡng cảnh báo (<= ${th.warnMin}${sensor.unit || ""})` };
    }

    return { status: "ok", message: "Hoạt động trong ngưỡng tối ưu" };
  };

  // Poll active sensors via API or simulation
  const pollSensors = useCallback(async () => {
    if (!activeDevice || activeSensors.length === 0) return;
    setPolling(true);

    try {
      const activeOids = activeSensors.filter((s) => s.enabled && s.oid).map((s) => s.oid as string);

      // Attempt live SNMP query if device is enabled
      let apiSuccess = false;
      if (activeOids.length > 0) {
        try {
          const res = await fetch("/api/snmp/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: activeDevice.host,
              port: activeDevice.port,
              version: activeDevice.version,
              community: activeDevice.community,
              v3Config: activeDevice.v3Config,
              oids: activeOids,
              timeout: activeDevice.timeout || 2500,
            }),
          });

          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            apiSuccess = true;
            const resultMap = new Map<string, any>();
            data.data.forEach((item: any) => {
              resultMap.set(item.oid, item.value);
            });

            setSensors((prev) =>
              prev.map((s) => {
                if (s.deviceId !== activeDevice.id || !s.enabled) return s;
                const raw = s.oid ? resultMap.get(s.oid) : undefined;
                if (raw === undefined) return s;

                let parsedVal = raw;
                if (typeof raw === "number") {
                  if (s.multiplier) parsedVal = parsedVal * s.multiplier;
                  if (s.divisor) parsedVal = parsedVal / s.divisor;
                  if (s.decimals !== undefined) parsedVal = Number(parsedVal.toFixed(s.decimals));
                }

                const { status, message } = evaluateStatus(s, parsedVal);
                const prevHist = s.history || [];
                const history = typeof parsedVal === "number"
                  ? [...prevHist, { timestamp: Date.now(), value: parsedVal }].slice(-20)
                  : prevHist;

                const nums = history.map((h) => h.value);
                const minVal = nums.length ? Math.min(...nums) : undefined;
                const maxVal = nums.length ? Math.max(...nums) : undefined;
                const avgVal = nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)) : undefined;

                return {
                  ...s,
                  currentValue: parsedVal,
                  displayValue: `${parsedVal}${s.unit ? ` ${s.unit}` : ""}`,
                  rawResponse: raw,
                  status,
                  statusMessage: message,
                  history,
                  minVal,
                  maxVal,
                  avgVal,
                  lastUpdated: Date.now(),
                };
              })
            );
          }
        } catch (_) {}
      }

      // If live SNMP query fails or times out, report real unreachable status (NO FAKE DATA)
      if (!apiSuccess) {
        setSensors((prev) =>
          prev.map((s) => {
            if (s.deviceId !== activeDevice.id || !s.enabled) return s;
            return {
              ...s,
              status: "unknown" as SnmpStatus,
              statusMessage: `Không nhận được phản hồi SNMP từ ${activeDevice.host}:${activeDevice.port} (Timeout/Chưa bật SNMP trên DSM).`,
              lastUpdated: Date.now(),
            };
          })
        );
      }

      setLastPollTime(new Date());
    } finally {
      setPolling(false);
    }
  }, [activeDevice, activeSensors]);

  // Auto-polling timer
  useEffect(() => {
    pollSensors();
    if (refreshInterval > 0) {
      const timer = setInterval(pollSensors, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [refreshInterval, selectedDeviceId]);

  // Auto-discover Synology standard sensors with 1 click
  const handleAutoDiscoverSynology = () => {
    const existingOids = new Set(activeSensors.map((s) => s.oid));
    const toAdd: SnmpSensor[] = [];

    SYNOLOGY_SNMP_PRESETS.forEach((preset) => {
      if (!existingOids.has(preset.oid)) {
        toAdd.push({
          id: `sensor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          deviceId: selectedDeviceId,
          name: preset.name,
          oid: preset.oid,
          type: preset.type,
          category: preset.category,
          unit: preset.unit,
          multiplier: preset.multiplier,
          divisor: preset.divisor,
          decimals: preset.decimals,
          thresholds: preset.thresholds,
          status: "ok",
          currentValue: null,
          displayValue: "Đang chờ cập nhật...",
          enabled: true,
          history: [],
          lastUpdated: Date.now(),
        });
      }
    });

    if (toAdd.length > 0) {
      setSensors((prev) => [...prev, ...toAdd]);
      setTimeout(pollSensors, 300);
    }
  };

  const handleToggleSensor = (sensorId: string) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === sensorId ? { ...s, enabled: !s.enabled, status: !s.enabled ? "ok" : "paused" } : s))
    );
  };

  const handleDeleteSensor = (sensorId: string) => {
    setSensors((prev) => prev.filter((s) => s.id !== sensorId));
  };

  const handleCopy = (oid: string) => {
    navigator.clipboard.writeText(oid);
    setCopiedOid(oid);
    setTimeout(() => setCopiedOid(null), 2000);
  };

  // Sparkline renderer for mini graphs
  const renderMiniSparkline = (data: Array<{ timestamp: number; value: number }>, status: SnmpStatus) => {
    if (data.length < 2) return <div className="h-7 w-full bg-slate-100 dark:bg-slate-800/40 rounded-lg" />;
    const vals = data.map((d) => d.value);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const w = 120;
    const h = 28;

    const points = vals
      .map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
      .join(" ");

    const color =
      status === "critical"
        ? "#f43f5e"
        : status === "warn"
        ? "#f59e0b"
        : status === "paused"
        ? "#94a3b8"
        : "#0ea5e9";

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Filtered sensor list
  const filteredSensors = useMemo(() => {
    return activeSensors.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.oid || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.displayValue || "").toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;

      return true;
    });
  }, [activeSensors, search, statusFilter, categoryFilter]);

  // Status breakdown counts
  const counts = useMemo(() => {
    return {
      total: activeSensors.length,
      ok: activeSensors.filter((s) => s.status === "ok").length,
      warn: activeSensors.filter((s) => s.status === "warn").length,
      critical: activeSensors.filter((s) => s.status === "critical").length,
      paused: activeSensors.filter((s) => !s.enabled || s.status === "paused").length,
    };
  }, [activeSensors]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Device Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Giám sát SNMP (PRTG Monitor)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Direct Screen • No Separate Server
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi OID phần cứng, cảm biến và trạng thái thiết bị thời gian thực theo chuẩn PRTG
            </p>
          </div>
        </div>

        {/* Device Switcher & Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.host}:{d.port})
                </option>
              ))}
            </select>
            <Server className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="px-3 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Thiết bị</span>
          </button>

          <button
            onClick={() => setIsWalkOpen(true)}
            className="px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duyệt OID (Walk)</span>
          </button>
        </div>
      </div>

      {/* PRTG Sensor Status Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        {[
          { label: "Tổng Sensor", count: counts.total, color: "text-slate-900 dark:text-white", bg: "bg-white dark:bg-slate-900", border: "border-slate-200 dark:border-slate-800", dot: "bg-indigo-500", key: "all" },
          { label: "Bình thường (OK)", count: counts.ok, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/[0.04] dark:bg-emerald-950/20", border: "border-emerald-500/20", dot: "bg-emerald-500", key: "ok" },
          { label: "Cảnh báo (Warning)", count: counts.warn, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/[0.04] dark:bg-amber-950/20", border: "border-amber-500/20", dot: "bg-amber-500", key: "warn" },
          { label: "Nguy hiểm (Error)", count: counts.critical, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/[0.04] dark:bg-rose-950/20", border: "border-rose-500/20", dot: "bg-rose-500", key: "critical" },
          { label: "Tạm dừng (Paused)", count: counts.paused, color: "text-slate-500", bg: "bg-slate-100/50 dark:bg-slate-800/30", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400", key: "paused" },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => setStatusFilter(item.key as any)}
            className={`p-3.5 rounded-2xl border ${item.border} ${item.bg} shadow-xs cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
              statusFilter === item.key ? "ring-2 ring-indigo-500" : ""
            }`}
          >
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${item.dot} ${item.count > 0 && item.key !== "all" && item.key !== "paused" ? "animate-pulse" : ""}`} />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
              </div>
              <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${item.color}`}>{item.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sensor Controls Bar (Search, Category Filters, Add Sensor Button) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Tất cả Sensor" },
            { id: "cpu_ram", label: "CPU & RAM" },
            { id: "storage", label: "Lưu trữ" },
            { id: "network", label: "Mạng" },
            { id: "environment", label: "Môi trường / Nhiệt độ" },
            { id: "ups", label: "Bộ lưu điện UPS" },
            { id: "system", label: "Hệ thống" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                categoryFilter === cat.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Action buttons & Refresh selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc sensor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          {/* Polling Interval */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
            {[
              { label: "2s", val: 2000 },
              { label: "5s", val: 5000 },
              { label: "10s", val: 10000 },
              { label: "Pause", val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setRefreshInterval(opt.val)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  refreshInterval === opt.val
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={pollSensors}
            disabled={polling}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1"
            title="Quét dữ liệu ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${polling ? "animate-spin text-sky-500" : ""}`} />
          </button>

          <button
            onClick={handleAutoDiscoverSynology}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1"
            title="Tự động nhận diện toàn bộ OID Synology"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto MIB</span>
          </button>

          <button
            onClick={() => setIsAddSensorOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Sensor</span>
          </button>
        </div>
      </div>

      {/* PRTG Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredSensors.map((sensor) => {
          const isCrit = sensor.status === "critical";
          const isWarn = sensor.status === "warn";
          const isPaused = !sensor.enabled || sensor.status === "paused";

          return (
            <div
              key={sensor.id}
              className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between space-y-3.5 ${
                isCrit
                  ? "bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/30 dark:border-rose-500/30 ring-1 ring-rose-500/20"
                  : isWarn
                  ? "bg-amber-500/[0.04] dark:bg-amber-950/20 border-amber-500/30 dark:border-amber-500/30 ring-1 ring-amber-500/20"
                  : isPaused
                  ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              {/* Card Top: Title & Status Badge */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={sensor.name}>
                      {sensor.name}
                    </h3>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[170px]" title={sensor.oid}>
                        {sensor.oid}
                      </span>
                      <button
                        onClick={() => handleCopy(sensor.oid || "")}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Sao chép OID"
                      >
                        {copiedOid && copiedOid === sensor.oid ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1 ${
                      isCrit
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : isWarn
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : isPaused
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCrit ? "bg-rose-500 animate-pulse" : isWarn ? "bg-amber-500 animate-pulse" : isPaused ? "bg-slate-400" : "bg-emerald-500"
                      }`}
                    />
                    {isCrit ? "Critical" : isWarn ? "Warning" : isPaused ? "Paused" : "OK"}
                  </span>
                </div>

                {/* Main Metric Value Display */}
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {sensor.displayValue || "—"}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {sensor.type}
                  </span>
                </div>

                {/* Status description message */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {sensor.statusMessage || "Giá trị đọc từ SNMP"}
                </p>
              </div>

              {/* Sparkline & Min/Max/Avg telemetry */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {sensor.history && sensor.history.length > 1 && renderMiniSparkline(sensor.history, sensor.status || "ok")}

                {sensor.minVal !== undefined && sensor.maxVal !== undefined && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Min: <strong className="text-slate-600 dark:text-slate-300">{sensor.minVal}{sensor.unit}</strong></span>
                    <span>Avg: <strong className="text-slate-600 dark:text-slate-300">{sensor.avgVal}{sensor.unit}</strong></span>
                    <span>Max: <strong className="text-slate-600 dark:text-slate-300">{sensor.maxVal}{sensor.unit}</strong></span>
                  </div>
                )}
              </div>

              {/* Sensor Card Footer Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[10px]">
                  {sensor.lastUpdated ? `${Math.round((Date.now() - sensor.lastUpdated) / 1000)}s trước` : "Chờ"}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleSensor(sensor.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={sensor.enabled ? "Tạm dừng sensor" : "Tiếp tục sensor"}
                  >
                    {sensor.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button
                    onClick={() => handleDeleteSensor(sensor.id)}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Xóa sensor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSensors.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Không tìm thấy Sensor phù hợp</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Bấm nút &quot;Thêm Sensor&quot; hoặc &quot;Auto MIB&quot; để tạo nhanh bộ cảm biến giám sát cho thiết bị này.
          </p>
          <button
            onClick={handleAutoDiscoverSynology}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-2xl shadow-xs"
          >
            Tạo nhanh bộ Sensor Synology MIB
          </button>
        </div>
      )}

      {/* Modals */}
      <SnmpAddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onSave={(newDev) => {
          setDevices((prev) => [...prev, newDev]);
          setSelectedDeviceId(newDev.id);
        }}
      />

      <SnmpAddSensorModal
        isOpen={isAddSensorOpen}
        onClose={() => setIsAddSensorOpen(false)}
        deviceId={activeDevice.id}
        deviceName={activeDevice.name}
        onAddSensor={(newSensor) => {
          setSensors((prev) => [...prev, newSensor]);
          setTimeout(pollSensors, 300);
        }}
      />

      <SnmpWalkModal
        isOpen={isWalkOpen}
        onClose={() => setIsWalkOpen(false)}
        device={activeDevice}
        onAddSensorFromOid={(newSensor) => {
          setSensors((prev) => [...prev, newSensor]);
          setIsWalkOpen(false);
          setTimeout(pollSensors, 300);
        }}
      />
    </div>
  );
};
