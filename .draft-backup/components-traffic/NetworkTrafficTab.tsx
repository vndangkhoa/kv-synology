"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { NetworkConnectionItem, TrafficSummary, TrafficDirection, TrustLevel } from "@/lib/traffic/types";
import { IpDetailModal } from "./IpDetailModal";
import { formatBytes, formatSpeed } from "@/lib/utils";
import {
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Building,
  Layers,
  HardDrive,
  Download,
  Filter,
  CheckCircle2,
  ExternalLink,
  Ban,
  Activity,
  Zap,
  Server,
  FileText,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Radio,
  LayoutList,
  LayoutGrid,
} from "lucide-react";

export const NetworkTrafficTab: React.FC = () => {
  const { session, utilization, language } = useAppStore();

  const [connections, setConnections] = useState<NetworkConnectionItem[]>([]);
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | TrafficDirection | "foreign" | "suspicious">("all");
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // 3s default
  const [selectedIpForModal, setSelectedIpForModal] = useState<string | null>(null);
  const [blockedFeedback, setBlockedFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const dsmCfg = dsmClient.getConfig();
      if (session?.isConnected && session.hostname) {
        headers["x-dsm-host"] = session.hostname;
        headers["x-dsm-port"] = String(dsmCfg?.port || 5001);
        headers["x-dsm-https"] = dsmCfg?.https ? "true" : "false";
        if (session.sid) headers["x-dsm-sid"] = session.sid;
        if (session.synoToken) headers["x-dsm-synotoken"] = session.synoToken;
      }

      const res = await fetch("/api/traffic/connections", { headers });
      const data = await res.json();
      if (data.success) {
        setConnections(data.connections || []);
        setSummary(data.summary || null);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConnections();
    if (refreshInterval > 0) {
      const timer = setInterval(fetchConnections, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [refreshInterval, fetchConnections]);

  const handleExportCsv = () => {
    if (connections.length === 0) return;
    const headers = "Direction,LocalAddress,LocalPort,RemoteAddress,RemotePort,Country,ISP,Process,Protocol,State,RxSpeed,TxSpeed,TotalRx,TotalTx\n";
    const rows = connections
      .map(
        (c) =>
          `"${c.direction}","${c.localAddress}",${c.localPort},"${c.remoteAddress}",${c.remotePort},"${c.geo.countryName}","${c.geo.isp}","${c.processName}","${c.protocol}","${c.state}",${c.rxSpeedBytes},${c.txSpeedBytes},${c.totalRxBytes},${c.totalTxBytes}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nas_network_connections_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered connections list
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      const matchesSearch =
        conn.remoteAddress.toLowerCase().includes(search.toLowerCase()) ||
        conn.localAddress.toLowerCase().includes(search.toLowerCase()) ||
        conn.geo.isp.toLowerCase().includes(search.toLowerCase()) ||
        conn.geo.countryName.toLowerCase().includes(search.toLowerCase()) ||
        conn.processName.toLowerCase().includes(search.toLowerCase()) ||
        String(conn.remotePort).includes(search) ||
        String(conn.localPort).includes(search);

      if (!matchesSearch) return false;

      if (directionFilter === "outbound") return conn.direction === "outbound";
      if (directionFilter === "inbound") return conn.direction === "inbound";
      if (directionFilter === "local") return conn.direction === "local";
      if (directionFilter === "foreign") return !conn.geo.isPrivate && conn.geo.countryCode !== "VN";
      if (directionFilter === "suspicious") return conn.geo.trustLevel === "suspicious";

      return true;
    });
  }, [connections, search, directionFilter]);

  // Live speed derived from real telemetry
  const liveInboundSpeed = utilization?.networkRxBytes ?? summary?.currentInboundSpeed ?? 0;
  const liveOutboundSpeed = utilization?.networkTxBytes ?? summary?.currentOutboundSpeed ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {blockedFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{blockedFeedback}</span>
          </div>
          <button onClick={() => setBlockedFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Overview Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Giám sát Lưu lượng &amp; Luồng Dữ liệu NAS
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                IP Geo &amp; ISP Watchdog
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nắm trọn dữ liệu từ NAS đang chạy đi đâu, nhận diện cờ Quốc gia và Nhà mạng ISP sở hữu
            </p>
          </div>
        </div>

        {/* Live Traffic Stats Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono flex items-center gap-1.5">
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Nhận: {formatSpeed(liveInboundSpeed)}</span>
          </div>

          <div className="px-3 py-1.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold font-mono flex items-center gap-1.5">
            <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Gửi đi: {formatSpeed(liveOutboundSpeed)}</span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
            {[
              { label: "2s", val: 2000 },
              { label: "3s", val: 3000 },
              { label: "5s", val: 5000 },
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
            onClick={fetchConnections}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            title="Làm mới ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Xuất danh sách kết nối ra CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Hero Visualizer: "DỮ LIỆU TỪ NAS CHẠY ĐI ĐÂU NẮM LUÔN" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Left 2 Cols: Outbound Country Destination Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Phân bổ Quốc gia Đích (Dữ liệu gửi ra ngoài từ NAS)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
              Tổng đẩy ra: {formatBytes(summary?.totalOutboundBytes || 0)}
            </span>
          </div>

          {/* Destination Country Progress Bars */}
          <div className="space-y-3 pt-1">
            {summary?.topCountries && summary.topCountries.length > 0 ? (
              summary.topCountries.slice(0, 5).map((country) => (
                <div key={country.countryCode} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <span className="text-base shrink-0">{country.flagEmoji}</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate">{country.countryName}</span>
                      <span className="text-[11px] text-slate-400 font-normal truncate hidden sm:inline">
                        ({country.primaryIsps.join(", ") || country.countryCode})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono shrink-0">
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {formatBytes(country.outboundBytes || 0)}
                      </span>
                      <span className="text-slate-400 font-semibold text-[11px]">
                        ({country.percentOutbound || 0}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        country.countryCode === "VN"
                          ? "bg-gradient-to-r from-red-500 to-amber-500"
                          : country.countryCode === "TW"
                          ? "bg-gradient-to-r from-sky-500 to-indigo-500"
                          : country.countryCode === "US"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : country.countryCode === "LOCAL"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : "bg-gradient-to-r from-purple-500 to-pink-500"
                      }`}
                      style={{ width: `${Math.max(country.percentOutbound || 4, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Đang đọc luồng dữ liệu socket thực tế từ NAS...
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <strong>Minh bạch luồng dữ liệu:</strong> Toàn bộ kết nối ra Cloud Synology, Google Backup và Docker đều được giám sát.
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
              {summary?.outboundConnections || 0} luồng Outbound
            </span>
          </div>
        </div>

        {/* Right Col: Top Outbound Processes on NAS */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 sm:space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Tiến trình gửi nhiều dữ liệu nhất
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.topProcesses && summary.topProcesses.length > 0 ? (
                summary.topProcesses.map((proc, idx) => (
                  <div key={proc.name} className="py-2 sm:py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
                        {idx + 1}. {proc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {proc.connections} socket kết nối
                      </div>
                    </div>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0">
                      {formatBytes(proc.outboundBytes || 0)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Chưa ghi nhận tiến trình gửi dữ liệu
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/[0.05] border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Bảo mật Quyền riêng tư
            </div>
            <p className="text-[11px] mt-1 opacity-80">
              Dễ dàng phát hiện các container hoặc tiến trình lạ tự ý gửi dữ liệu về máy chủ nước ngoài.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Direction & Risk Filter Tabs (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: `Tất cả (${connections.length})` },
            { id: "outbound", label: `↗️ Gửi ra ngoài (${summary?.outboundConnections || 0})` },
            { id: "inbound", label: `↙️ Kết nối vào (${summary?.inboundConnections || 0})` },
            { id: "local", label: `🔄 Nội bộ LAN (${summary?.localConnections || 0})` },
            { id: "foreign", label: "🌐 Ngoài nước (Ngoài VN)" },
            { id: "suspicious", label: `⚠️ Đáng ngờ (${summary?.suspiciousCount || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDirectionFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                directionFilter === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo IP, ISP, Quốc gia, Tiến trình..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Chế độ Bảng"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Chế độ Lưới / Thẻ (Mobile Friendly)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Responsive Table or Grid */}
      {viewMode === "table" ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold sticky top-0">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Chiều</th>
                  <th className="py-3 px-2 sm:px-3 hidden md:table-cell">IP Nguồn (Local)</th>
                  <th className="py-3 px-3">IP Đích (Remote)</th>
                  <th className="py-3 px-3">Quốc gia &amp; Cờ</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Nhà mạng / ISP Sở hữu</th>
                  <th className="py-3 px-3">Dịch vụ / Tiến trình</th>
                  <th className="py-3 px-2 sm:px-3 hidden lg:table-cell">Trạng thái</th>
                  <th className="py-3 px-3">Lưu lượng</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredConnections.map((conn) => {
                  const isOutbound = conn.direction === "outbound";
                  const isInbound = conn.direction === "inbound";
                  const isSuspicious = conn.geo.trustLevel === "suspicious";

                  return (
                    <tr
                      key={conn.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSuspicious ? "bg-rose-500/[0.04] dark:bg-rose-950/20" : ""
                      }`}
                    >
                      {/* Direction */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOutbound
                              ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
                              : isInbound
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {isOutbound ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-sky-500" /> Ra ngoài
                            </>
                          ) : isInbound ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Vào trong
                            </>
                          ) : (
                            <>
                              <Radio className="w-3 h-3 text-slate-400" /> Nội bộ
                            </>
                          )}
                        </span>
                      </td>

                      {/* Local IP:Port */}
                      <td className="py-3 px-2 sm:px-3 font-mono hidden md:table-cell whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{conn.localAddress}</span>
                        <span className="text-slate-400">:{conn.localPort}</span>
                      </td>

                      {/* Remote IP:Port */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{conn.remoteAddress}</span>
                          <span className="text-slate-400">:{conn.remotePort}</span>
                        </div>
                      </td>

                      {/* Country & Flag */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-base sm:text-lg shrink-0">{conn.geo.flagEmoji}</span>
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-[140px]">
                            {conn.geo.countryName}
                          </span>
                        </div>
                      </td>

                      {/* ISP / Owner */}
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <div className="max-w-[160px] sm:max-w-[200px] truncate" title={conn.geo.isp}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {conn.geo.isp}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{conn.geo.asn}</span>
                        </div>
                      </td>

                      {/* Process / Service */}
                      <td className="py-3 px-3">
                        <div className="max-w-[120px] sm:max-w-[160px] truncate" title={conn.processName}>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400 truncate block">
                            {conn.processName}
                          </span>
                          {conn.pid && <span className="text-[10px] text-slate-400 font-mono">PID: {conn.pid}</span>}
                        </div>
                      </td>

                      {/* Protocol & State */}
                      <td className="py-3 px-2 sm:px-3 hidden lg:table-cell whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {conn.protocol} {conn.state}
                        </span>
                      </td>

                      {/* Bandwidth & Data Sent */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {isOutbound ? `↑ ${formatSpeed(conn.txSpeedBytes)}` : `↓ ${formatSpeed(conn.rxSpeedBytes)}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tổng: {formatBytes(conn.totalTxBytes + conn.totalRxBytes)}
                        </div>
                      </td>

                      {/* Actions: Block & Inspect */}
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedIpForModal(conn.remoteAddress)}
                            className="px-2 sm:px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors"
                            title="Tra cứu thông tin chi tiết IP"
                          >
                            Chi tiết
                          </button>

                          {!conn.geo.isPrivate && (
                            <button
                              onClick={() => setSelectedIpForModal(conn.remoteAddress)}
                              className="p-1 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Chặn IP này trong Firewall"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredConnections.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy kết nối nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile-Friendly Grid / Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredConnections.map((conn) => {
            const isOutbound = conn.direction === "outbound";
            const isInbound = conn.direction === "inbound";
            const isSuspicious = conn.geo.trustLevel === "suspicious";

            return (
              <div
                key={conn.id}
                className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-all hover:border-sky-500/40 ${
                  isSuspicious ? "bg-rose-500/[0.04] border-rose-500/30" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isOutbound
                        ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
                        : isInbound
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {isOutbound ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-sky-500" /> Ra ngoài
                      </>
                    ) : isInbound ? (
                      <>
                        <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Vào trong
                      </>
                    ) : (
                      <>
                        <Radio className="w-3 h-3 text-slate-400" /> Nội bộ
                      </>
                    )}
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {conn.protocol} {conn.state}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl shrink-0">{conn.geo.flagEmoji}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {conn.geo.countryName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate" title={conn.geo.isp}>
                        {conn.geo.isp}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Đích:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {conn.remoteAddress}:{conn.remotePort}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Nguồn:</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {conn.localAddress}:{conn.localPort}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-400 font-sans">Tiến trình:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400 truncate max-w-[140px]">
                      {conn.processName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="font-mono text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {isOutbound ? `↑ ${formatSpeed(conn.txSpeedBytes)}` : `↓ ${formatSpeed(conn.rxSpeedBytes)}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tổng: {formatBytes(conn.totalTxBytes + conn.totalRxBytes)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setSelectedIpForModal(conn.remoteAddress)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors"
                    >
                      Chi tiết
                    </button>
                    {!conn.geo.isPrivate && (
                      <button
                        onClick={() => setSelectedIpForModal(conn.remoteAddress)}
                        className="p-1 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                        title="Chặn IP"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* IP Detail Modal */}
      {selectedIpForModal && (
        <IpDetailModal
          isOpen={!!selectedIpForModal}
          onClose={() => setSelectedIpForModal(null)}
          ip={selectedIpForModal}
          onBlockSuccess={(blockedIp) => {
            setBlockedFeedback(`Đã kích hoạt chặn thành công IP: ${blockedIp}`);
            setTimeout(() => setBlockedFeedback(null), 5000);
          }}
        />
      )}
    </div>
  );
};
