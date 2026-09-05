"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { ServiceItem, PackageItem, ServiceCategory } from "@/lib/dsm/types";
import {
  Server,
  Share2,
  HardDrive,
  UploadCloud,
  Terminal,
  TerminalSquare,
  Globe,
  RefreshCw,
  Search,
  Power,
  CheckCircle2,
  XCircle,
  Settings2,
  Layers,
  Package,
  Play,
  Square,
  Apple,
  Network,
  FileText,
  Lock,
  Copy,
  Save,
  AlertCircle,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  List,
  Columns4,
} from "lucide-react";

type ViewGridMode = "grid-3" | "grid-4" | "grid-2" | "list";

const categoryLabels: Record<string, string> = {
  all: "Tất cả",
  file: "Chia sẻ tệp",
  system: "Hệ thống",
  network: "Mạng",
  application: "Ứng dụng",
};

const serviceIcons: Record<string, React.ReactNode> = {
  smb: <Share2 className="w-5 h-5" />,
  afp: <Apple className="w-5 h-5" />,
  nfs: <HardDrive className="w-5 h-5" />,
  ftp: <UploadCloud className="w-5 h-5" />,
  sftp: <Lock className="w-5 h-5" />,
  ssh: <Terminal className="w-5 h-5" />,
  telnet: <TerminalSquare className="w-5 h-5" />,
  rsync: <Copy className="w-5 h-5" />,
  webdav: <Globe className="w-5 h-5" />,
};

const categoryIcons: Record<ServiceCategory, React.ReactNode> = {
  file: <Share2 className="w-4 h-4" />,
  system: <Terminal className="w-4 h-4" />,
  network: <Network className="w-4 h-4" />,
  application: <Package className="w-4 h-4" />,
};

export const ServicesTab: React.FC = () => {
  const { session } = useAppStore();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "all">("all");
  const [gridMode, setGridMode] = useState<ViewGridMode>("grid-3");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showPackages, setShowPackages] = useState(true);
  const [editingPorts, setEditingPorts] = useState<Record<string, string>>({});
  const [savingPortId, setSavingPortId] = useState<string | null>(null);
  const [portError, setPortError] = useState<string | null>(null);

  // Load gridMode preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dsm_services_view_mode") as ViewGridMode;
      if (saved && ["grid-3", "grid-4", "grid-2", "list"].includes(saved)) {
        setGridMode(saved);
      }
    } catch {}
  }, []);

  const changeGridMode = (mode: ViewGridMode) => {
    setGridMode(mode);
    try {
      localStorage.setItem("dsm_services_view_mode", mode);
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [svc, pkgs] = await Promise.all([
        dsmClient.getServices(),
        dsmClient.getPackages().catch(() => []),
      ]);
      setServices(svc);
      setPackages(pkgs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [session.isConnected]);

  // Sync editing ports when services load
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const s of services) {
      if (["ssh", "sftp", "ftp"].includes(s.id) && s.port) {
        if (!(s.id in editingPorts)) next[s.id] = String(s.port);
      }
    }
    if (Object.keys(next).length) setEditingPorts((prev) => ({ ...next, ...prev }));
  }, [services]);

  const handleToggle = async (svc: ServiceItem) => {
    setTogglingId(svc.id);
    const next = !svc.enabled;
    try {
      await dsmClient.toggleService(svc.id, next);
      setServices((prev) =>
        prev.map((s) =>
          s.id === svc.id
            ? {
                ...s,
                enabled: next,
                running: next,
                status: next ? "running" : "stopped",
                details: {
                  ...s.details,
                  ...(s.id === "smb"
                    ? { enable_samba: next }
                    : s.id === "afp"
                    ? { enable_afp: next }
                    : s.id === "nfs"
                    ? { enable_nfs: next }
                    : s.id === "ftp"
                    ? { enable_ftp: next }
                    : s.id === "sftp"
                    ? { enable: next }
                    : s.id === "ssh"
                    ? { enable_ssh: next }
                    : s.id === "telnet"
                    ? { enable_telnet: next }
                    : {}),
                },
              }
            : s
        )
      );
      setTimeout(() => loadAll(), 800);
    } catch (e: any) {
      alert(e.message || "Không thể thay đổi trạng thái dịch vụ");
    } finally {
      setTogglingId(null);
    }
  };

  const handlePackageToggle = async (pkg: PackageItem) => {
    setTogglingId(pkg.id);
    try {
      await dsmClient.togglePackage(pkg.id, pkg.status === "running" ? "stop" : "start");
      const pkgs = await dsmClient.getPackages();
      setPackages(pkgs);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveSshPort = async (svc: ServiceItem) => {
    const raw = editingPorts[svc.id];
    const port = parseInt(raw, 10);
    if (!raw || isNaN(port) || port < 1 || port > 65535) {
      setPortError("Cổng phải từ 1–65535");
      setTimeout(() => setPortError(null), 2500);
      return;
    }
    setSavingPortId(svc.id);
    setPortError(null);
    try {
      if (svc.id === "ssh") {
        const cur = services.find((s) => s.id === "ssh");
        const telnet = services.find((s) => s.id === "telnet");
        const enableSsh = cur?.enabled ?? svc.enabled;
        const enableTelnet = telnet?.enabled ?? false;
        await dsmClient.setTerminal(enableSsh, enableTelnet, port);
      } else if (svc.id === "sftp") {
        await dsmClient.toggleService("sftp", svc.enabled);
        await dsmClient.setTerminal(
          services.find((s) => s.id === "ssh")?.enabled ?? true,
          services.find((s) => s.id === "telnet")?.enabled ?? false,
          port
        );
      } else if (svc.id === "ftp") {
        const cur: any = await (dsmClient as any).postEntry?.("SYNO.Core.FileServ.FTP", "get", 3).catch(() => null);
        if (cur?.success) {
          await (dsmClient as any).postEntry("SYNO.Core.FileServ.FTP", "set", 3, {
            enable_ftp: String(svc.enabled),
            enable_ftps: String(!!cur.data.enable_ftps),
            timeout: String(cur.data.timeout || 300),
            portnum: String(port),
            custom_port_range: JSON.stringify(cur.data.custom_port_range || ""),
            use_ext_ip: String(!!cur.data.use_ext_ip),
            enable_fxp: String(!!cur.data.enable_fxp),
            enable_fips: String(!!cur.data.enable_fips),
            enable_ascii: String(!!cur.data.enable_ascii),
            utf8_mode: JSON.stringify(cur.data.utf8_mode || "auto"),
          });
        } else {
          await dsmClient.toggleService("ftp", svc.enabled);
        }
      }
      await loadAll();
    } catch (e: any) {
      setPortError(e.message || "Không thể đổi cổng");
      setTimeout(() => setPortError(null), 3000);
    } finally {
      setSavingPortId(null);
    }
  };

  const enabledCount = services.filter((s) => s.enabled).length;
  const disabledCount = services.length - enabledCount;
  const runningPkgs = packages.filter((p) => p.status === "running").length;

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.displayName.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [services, search, categoryFilter]);

  const filteredPackages = useMemo(() => {
    if (!showPackages) return [];
    if (categoryFilter !== "all" && categoryFilter !== "application") return [];
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [packages, search, categoryFilter, showPackages]);

  const grouped = useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {};
    for (const s of filteredServices) {
      const cat = s.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filteredServices]);

  // CSS class for selected grid mode
  const getGridClasses = () => {
    switch (gridMode) {
      case "grid-4":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5";
      case "grid-2":
        return "grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4";
      case "grid-3":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-sky-500" />
            Dịch vụ hệ thống & Ứng dụng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý các dịch vụ chia sẻ tệp, mạng và gói ứng dụng trên Synology DSM
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={loadAll}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          onClick={() => setCategoryFilter("all")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            categoryFilter === "all"
              ? "bg-sky-500/10 border-sky-500/30 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng dịch vụ
            </p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {services.length + (showPackages ? packages.length : 0)}
            </p>
            <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
              {services.length} hệ thống + {packages.length} ứng dụng
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setCategoryFilter("all")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
            categoryFilter === "all"
              ? "bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đang bật / chạy
            </p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {enabledCount + runningPkgs}
            </p>
            <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
              {enabledCount} dịch vụ + {runningPkgs} gói
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đã tắt / dừng
            </p>
            <p className="text-lg sm:text-2xl font-bold text-slate-500 mt-0.5">
              {disabledCount + (packages.length - runningPkgs)}
            </p>
            <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
              Có thể bật lại khi cần
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar with Search, Categories & Grid Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm dịch vụ, cổng, mô tả..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Categories & View Options */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
          {/* Category Filter Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl sm:rounded-2xl text-[11px] font-semibold overflow-x-auto">
            {(["all", "file", "system", "network", "application"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* Grid Mode Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-slate-500">
            <button
              onClick={() => changeGridMode("grid-3")}
              className={`p-1.5 rounded-lg transition-colors ${
                gridMode === "grid-3"
                  ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="3 Cột (Tiêu chuẩn)"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeGridMode("grid-4")}
              className={`p-1.5 rounded-lg transition-colors ${
                gridMode === "grid-4"
                  ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="4 Cột (Đậm đặc)"
            >
              <Columns4 className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeGridMode("grid-2")}
              className={`p-1.5 rounded-lg transition-colors ${
                gridMode === "grid-2"
                  ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="2 Cột (Chi tiết)"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeGridMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                gridMode === "list"
                  ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Danh sách (List view)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Packages toggle */}
          <button
            onClick={() => setShowPackages((v) => !v)}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors ${
              showPackages
                ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            title="Hiện / ẩn gói ứng dụng"
          >
            <Package className="w-3.5 h-3.5 sm:mr-1 inline" />
            <span className="hidden sm:inline">{showPackages ? "Ẩn gói" : "Hiện gói"}</span>
          </button>
        </div>
      </div>

      {/* Services Content: Grid or List */}
      {gridMode === "list" ? (
        /* List / Table Mode */
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Mobile card list (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredServices.map((svc) => {
              const isToggling = togglingId === svc.id;
              const enabled = svc.enabled;
              return (
                <div
                  key={svc.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        enabled
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {serviceIcons[svc.id] || <Server className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {svc.displayName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {enabled ? "Đang bật" : "Đã tắt"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                          {categoryIcons[svc.category]} {categoryLabels[svc.category]}
                        </span>
                        {svc.port ? (
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                            :{svc.port}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggle(svc)}
                      disabled={isToggling || !svc.canToggle}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-10 h-5 rounded-full peer transition-all ${
                        enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                        isToggling ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        } flex items-center justify-center`}
                      >
                        {isToggling && (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Desktop table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Dịch vụ</th>
                  <th className="px-4 py-3.5">Loại</th>
                  <th className="px-4 py-3.5">Cổng</th>
                  <th className="px-4 py-3.5">Mô tả</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Bật / Tắt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredServices.map((svc) => {
                  const isToggling = togglingId === svc.id;
                  const enabled = svc.enabled;
                  return (
                    <tr
                      key={svc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              enabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {serviceIcons[svc.id] || <Server className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {svc.displayName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {svc.api ? svc.api.split(".").pop() : svc.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium capitalize">
                          {categoryIcons[svc.category]} {categoryLabels[svc.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {svc.port ? `:${svc.port}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {svc.description}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {enabled ? "Đang bật" : "Đã tắt"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => handleToggle(svc)}
                            disabled={isToggling || !svc.canToggle}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-10 h-5 rounded-full peer transition-all ${
                              enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                            } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                              isToggling ? "opacity-50" : ""
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                                enabled ? "translate-x-5" : "translate-x-0"
                              } flex items-center justify-center`}
                            >
                              {isToggling && (
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />
                              )}
                            </div>
                          </div>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Modes (3-col, 4-col, 2-col) */
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 capitalize">
              <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                {categoryIcons[cat as ServiceCategory] || <Settings2 className="w-4 h-4" />}
              </span>
              {cat === "file"
                ? "Dịch vụ chia sẻ tệp"
                : cat === "system"
                ? "Dịch vụ hệ thống"
                : cat === "network"
                ? "Dịch vụ mạng"
                : cat}
              <span className="text-xs font-normal text-slate-400">({list.length})</span>
            </h3>

            <div className={getGridClasses()}>
              {list.map((svc) => {
                const isToggling = togglingId === svc.id;
                const enabled = svc.enabled;
                const isCompact = gridMode === "grid-4";

                return (
                  <div
                    key={svc.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      isCompact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`rounded-2xl flex items-center justify-center shrink-0 ${
                              isCompact ? "w-9 h-9" : "w-10 h-10 sm:w-11 sm:h-11"
                            } ${
                              enabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {serviceIcons[svc.id] || <Server className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <h4
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate"
                              title={svc.displayName}
                            >
                              {svc.displayName}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              {svc.api && (
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                  {svc.api.split(".").pop()}
                                </span>
                              )}
                              {svc.port ? `:${svc.port}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {enabled ? "Bật" : "Tắt"}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3 min-h-[30px]">
                        {svc.description}
                      </p>

                      {/* Details Box */}
                      {svc.details && Object.keys(svc.details).length > 0 && !isCompact && (
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-2.5 mb-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-1">
                          {Object.entries(svc.details)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2 truncate">
                                <span className="text-slate-400 truncate">{k}:</span>
                                <span className="text-slate-800 dark:text-slate-200 truncate font-semibold">
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Port Changer */}
                    {(svc.id === "ssh" || svc.id === "ftp" || svc.id === "sftp") && (
                      <div className="mb-3 p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5 text-sky-500" />
                            Đổi cổng {svc.id.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {svc.port ? `hiện tại: ${svc.port}` : "tắt"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={65535}
                            value={editingPorts[svc.id] ?? ""}
                            onChange={(e) =>
                              setEditingPorts((prev) => ({ ...prev, [svc.id]: e.target.value }))
                            }
                            placeholder={svc.port ? String(svc.port) : "22"}
                            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <button
                            onClick={() => handleSaveSshPort(svc)}
                            disabled={savingPortId === svc.id}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            {savingPortId === svc.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Lưu
                          </button>
                        </div>
                        {portError && savingPortId === svc.id && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {portError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Card Footer Toggle */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Power className="w-3 h-3" />
                        {svc.port ? `Cổng ${svc.port}` : "Không cổng"}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToggle(svc)}
                          disabled={isToggling || !svc.canToggle}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-11 h-6 rounded-full peer transition-all ${
                            enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                            isToggling ? "opacity-50" : ""
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            } flex items-center justify-center`}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                            ) : enabled ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Package Services Section */}
      {showPackages && filteredPackages.length > 0 && (categoryFilter === "all" || categoryFilter === "application") && (
        gridMode === "list" ? (
          /* List / Table Mode for Packages */
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                <Package className="w-4 h-4" />
              </span>
              Dịch vụ ứng dụng (Gói Package) <span className="text-xs font-normal text-slate-400">({filteredPackages.length})</span>
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Mobile card list (< md) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPackages.map((pkg) => {
                  const isRunning = pkg.status === "running";
                  const isLoading = togglingId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {pkg.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRunning
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                }`}
                              />
                              {isRunning ? "Đang chạy" : "Đã dừng"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                              v{pkg.version}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {pkg.maintainer}
                            </span>
                          </div>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isRunning}
                          onChange={() => handlePackageToggle(pkg)}
                          disabled={isLoading}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-10 h-5 rounded-full peer transition-all ${
                            isRunning ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                            isLoading ? "opacity-50" : ""
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                              isRunning ? "translate-x-5" : "translate-x-0"
                            } flex items-center justify-center`}
                          >
                            {isLoading && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Gói ứng dụng</th>
                      <th className="px-4 py-3.5">Nhà phát triển</th>
                      <th className="px-4 py-3.5">Phiên bản / ID</th>
                      <th className="px-4 py-3.5">Mô tả</th>
                      <th className="px-4 py-3.5">Trạng thái</th>
                      <th className="px-4 py-3.5 text-right">Bật / Tắt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredPackages.map((pkg) => {
                      const isRunning = pkg.status === "running";
                      const isLoading = togglingId === pkg.id;
                      return (
                        <tr
                          key={pkg.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isRunning
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                }`}
                              >
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {pkg.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {pkg.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                              {pkg.maintainer || "Synology Inc."}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                            v{pkg.version}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={pkg.description}>
                            {pkg.description}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRunning
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
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
                          <td className="px-4 py-3.5 text-right">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isRunning}
                                onChange={() => handlePackageToggle(pkg)}
                                disabled={isLoading}
                                className="sr-only peer"
                              />
                              <div
                                className={`w-10 h-5 rounded-full peer transition-all ${
                                  isRunning ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                                } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                                  isLoading ? "opacity-50" : ""
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                                    isRunning ? "translate-x-5" : "translate-x-0"
                                  } flex items-center justify-center`}
                                >
                                  {isLoading && (
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />
                                  )}
                                </div>
                              </div>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Grid Modes for Packages (3-col, 4-col, 2-col) */
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                <Package className="w-4 h-4" />
              </span>
              Dịch vụ ứng dụng (Gói Package) <span className="text-xs font-normal text-slate-400">({filteredPackages.length})</span>
            </h3>

            <div className={getGridClasses()}>
              {filteredPackages.map((pkg) => {
                const isRunning = pkg.status === "running";
                const isLoading = togglingId === pkg.id;
                const isCompact = gridMode === "grid-4";

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      isCompact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`rounded-2xl flex items-center justify-center shrink-0 ${
                              isCompact ? "w-9 h-9" : "w-10 h-10 sm:w-11 sm:h-11"
                            } ${
                              isRunning
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate"
                              title={pkg.name}
                            >
                              {pkg.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                v{pkg.version}
                              </span>
                              <span>• {pkg.maintainer}</span>
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
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
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Card Footer Toggle - Same design & alignment as system service cards */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono truncate max-w-[150px]">
                        <Package className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{pkg.id}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRunning}
                          onChange={() => handlePackageToggle(pkg)}
                          disabled={isLoading}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-11 h-6 rounded-full peer transition-all ${
                            isRunning ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          } peer-focus:ring-2 peer-focus:ring-sky-500/20 ${
                            isLoading ? "opacity-50" : ""
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                              isRunning ? "translate-x-5" : "translate-x-0"
                            } flex items-center justify-center`}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                            ) : isRunning ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {filteredServices.length === 0 && filteredPackages.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Không tìm thấy dịch vụ nào khớp.</p>
        </div>
      )}
    </div>
  );
};
