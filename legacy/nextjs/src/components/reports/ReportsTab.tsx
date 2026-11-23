"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { ReportPeriod, ReportSummary } from "@/lib/dsm/types";
import { generateTelegramDigest } from "@/lib/reports/reportEngine";
import {
  BarChart3,
  Calendar,
  Zap,
  Activity,
  HardDrive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Globe,
  RefreshCw,
  Printer,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Server,
  Cpu,
  Flame,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Filter,
  Download,
  Sparkles,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { ReportDrilldownModal, DrilldownTarget } from "./ReportDrilldownModal";

export type ReportViewTab = "all" | "overview" | "hardware" | "security" | "daily";
export type DailyDisplayMode = "cards" | "table";

export const ReportsTab: React.FC = () => {
  const { session, t } = useAppStore();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [dailyFilter, setDailyFilter] = useState<"all" | "optimal" | "warning">("all");
  const [drilldownTarget, setDrilldownTarget] = useState<DrilldownTarget | null>(null);
  const [viewTab, setViewTab] = useState<ReportViewTab>("all");
  const [dailyDisplayMode, setDailyDisplayMode] = useState<DailyDisplayMode>("cards");

  const fetchReport = async (p: ReportPeriod = period) => {
    if (!session.isConnected) {
      setLoading(false);
      setReport(null);
      return;
    }
    setLoading(true);
    try {
      const data = await dsmClient.getReportSummary(p);
      setReport(data);
    } catch (e: any) {
      console.error("Error fetching report:", e);
      showToast("error", "Không thể tải dữ liệu báo cáo: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(period);
  }, [period, session.isConnected]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleExportPrint = () => {
    if (!session.isConnected) {
      showToast("error", "Vui lòng đăng nhập Synology DSM để xuất báo cáo!");
      return;
    }
    const hostParam = encodeURIComponent(session.hostname || "Synology-NAS");
    const modelParam = encodeURIComponent(session.model || "DS920+");
    if (report) {
      try {
        localStorage.setItem("kv_current_report", JSON.stringify(report));
      } catch (_) {}
    }
    window.open(`/api/reports/export?period=${period}&host=${hostParam}&model=${modelParam}`, "_blank");
  };

  const handleExportCSV = () => {
    if (!report || !report.dailyRecords || report.dailyRecords.length === 0) {
      showToast("error", "Chưa có dữ liệu bảng kê từng ngày để xuất CSV!");
      return;
    }
    const headers = [
      "Ngày",
      "Thứ",
      "Trạng thái",
      "Điện năng (kWh)",
      "Tiền điện ước tính (VND)",
      "Công suất đỉnh (W)",
      "Số lần mất điện",
      "Thời gian UPS pin (giây)",
      "Tải về Rx (GB)",
      "Tải lên Tx (GB)",
      "Tốc độ mạng tối đa (MB/s)",
      "Độ trễ trung bình (ms)",
      "Nhiệt độ đĩa cao nhất (C)",
      "Khay đĩa nóng nhất",
      "Sector lỗi mới",
      "SSD Cache ghi (GB)",
      "Lỗi đăng nhập",
      "Số IP bị AutoBlock",
      "CPU đỉnh (%)",
      "RAM đỉnh (%)",
    ];

    const rows = report.dailyRecords.map((r) => [
      r.fullDate,
      r.dayOfWeek,
      r.status === "optimal" ? "Tối ưu" : "Cảnh báo",
      r.power.kwh,
      r.power.costVND,
      r.power.peakWatts,
      r.power.outagesCount,
      r.power.batteryRuntimeSec,
      r.network.rxGB,
      r.network.txGB,
      r.network.peakSpeedMBs,
      r.network.avgLatencyMs,
      r.storage.maxTempC,
      `"${r.storage.hottestDrive}"`,
      r.storage.newBadSectors,
      r.storage.ssdCacheWrittenGB,
      r.security.failedLogins,
      r.security.blockedIpsCount,
      r.system.peakCpuPercent,
      r.system.peakMemPercent,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao-cao-van-hanh-NAS-${period}-${report.startDate.replace(/\//g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "Đã xuất bảng kê CSV thành công!");
  };

  const handleSendTelegram = async () => {
    if (!report) return;
    setSendingTelegram(true);

    const tgBotToken = localStorage.getItem("dsm_tg_bot_token") || "";
    const tgChatId = localStorage.getItem("dsm_tg_chat_id") || "";

    if (!tgBotToken.trim() || !tgChatId.trim()) {
      showToast(
        "error",
        "Chưa cài đặt Telegram Bot! Vui lòng vào tab 'Thông báo' > 'Kênh cảnh báo' để điền Bot Token & Chat ID."
      );
      setSendingTelegram(false);
      return;
    }

    try {
      const message = generateTelegramDigest(report);
      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          message,
          botToken: tgBotToken.trim(),
          chatId: tgChatId.trim(),
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        showToast("success", "Đã gửi bản tóm tắt Báo cáo trực tiếp tới Telegram của bạn!");
      } else {
        showToast("error", `Telegram báo lỗi: ${resData.error || "Gửi thất bại"}`);
      }
    } catch (e: any) {
      showToast("error", "Lỗi gửi Telegram: " + e.message);
    } finally {
      setSendingTelegram(false);
    }
  };

  const filteredDailyRecords = (report?.dailyRecords || []).filter((r) => {
    if (dailyFilter === "optimal") return r.status === "optimal";
    if (dailyFilter === "warning") return r.status !== "optimal";
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-sm font-medium transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center flex-wrap gap-2">
                <span>Báo Cáo Vận Hành</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  {period === "weekly" ? "7 ngày" : "30 ngày"}
                </span>
                {session.isConnected && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live NAS ({session.hostname || "Synology"})</span>
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tổng hợp sự cố mất điện, năng lượng, sức khỏe đĩa & an toàn thông tin
              </p>
            </div>
          </div>
        </div>

        {/* Period Switcher & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Period Toggle */}
          <div className="grid grid-cols-2 w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setPeriod("weekly")}
              className={`py-2 px-3 sm:px-3.5 sm:py-1.5 rounded-xl font-semibold text-center transition-all cursor-pointer ${
                period === "weekly"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="sm:hidden">7 ngày qua</span>
              <span className="hidden sm:inline">Báo cáo Tuần (7 ngày)</span>
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`py-2 px-3 sm:px-3.5 sm:py-1.5 rounded-xl font-semibold text-center transition-all cursor-pointer ${
                period === "monthly"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="sm:hidden">30 ngày qua</span>
              <span className="hidden sm:inline">Báo cáo Tháng (30 ngày)</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              className="p-2 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Làm mới báo cáo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleExportPrint}
              className="px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="In hoặc lưu PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!report}
              className="px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Xuất bảng kê kiểm toán ra file Excel CSV"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>

            <button
              onClick={handleSendTelegram}
              disabled={sendingTelegram || !report}
              className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTelegram ? "Đang gửi..." : "Telegram"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation View Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto no-scrollbar touch-pan-x shadow-xs">
        <button
          onClick={() => setViewTab("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === "all"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Toàn bộ báo cáo</span>
        </button>

        <button
          onClick={() => setViewTab("overview")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === "overview"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
          <span>⭐ Tổng quan sức khỏe</span>
        </button>

        <button
          onClick={() => setViewTab("hardware")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === "hardware"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>⚡ Điện & Ổ cứng</span>
        </button>

        <button
          onClick={() => setViewTab("security")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === "security"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <span>🛡️ Mạng & Bảo mật</span>
        </button>

        <button
          onClick={() => setViewTab("daily")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === "daily"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-sky-500" />
          <span>📅 Bảng kê từng ngày</span>
          {report && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold">
              {report.dailyRecords?.length || 0}
            </span>
          )}
        </button>
      </div>

      {loading && !report ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm text-slate-500">Đang tổng hợp dữ liệu báo cáo vận hành...</p>
        </div>
      ) : report ? (
        <>
          {/* Executive Health Score Banner */}
          {(viewTab === "all" || viewTab === "overview") && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
                        Chỉ số sức khỏe tổng thể
                      </span>
                      <span className="text-xs text-sky-100">
                        Kỳ: {report.startDate} – {report.endDate}
                      </span>
                    </div>

                    <div className="flex items-baseline space-x-4">
                      <div className="text-5xl sm:text-6xl font-black tracking-tight">
                        {report.healthScore.score}
                        <span className="text-2xl sm:text-3xl font-bold opacity-80">/100</span>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-white/20 text-xl font-black">
                        Hạng {report.healthScore.grade}
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-sky-50 font-medium">
                      {report.healthScore.statusText}
                    </p>

                    {/* Highlight badges & Drilldown trigger */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {report.healthScore.summaryHighlights.map((h, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-semibold text-white/95"
                        >
                          {h}
                        </span>
                      ))}
                      <button
                        onClick={() => setDrilldownTarget({ type: "health_score" })}
                        className="px-2.5 py-1 rounded-lg bg-white/25 hover:bg-white/35 backdrop-blur-sm text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs group"
                        title="Xem chi tiết các tiêu chí bị trừ điểm & giải pháp"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-sky-200 group-hover:scale-110 transition-transform" />
                        <span>Chi tiết khấu trừ điểm (Audit)</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-scores breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                    <div
                      onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem telemetry nguồn điện & xả pin"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Nguồn điện</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-lg font-bold">{report.healthScore.powerScore}/20</div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${(report.healthScore.powerScore / 20) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setDrilldownTarget({
                          type: "drive_smart",
                          slot: report.storage.drives[0]?.slot || "Drive 1",
                        })
                      }
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem 25+ chỉ số S.M.A.R.T ổ cứng"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Ổ đĩa & SMART</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-lg font-bold">{report.healthScore.storageScore}/30</div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${(report.healthScore.storageScore / 30) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={() => setDrilldownTarget({ type: "security_threats" })}
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem danh sách IP bị chặn & phân tích lỗ hổng"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Bảo mật</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-lg font-bold">{report.healthScore.securityScore}/25</div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-amber-300 h-1.5 rounded-full"
                          style={{ width: `${(report.healthScore.securityScore / 25) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem phân tích giao thức mạng & ping jitter"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Mạng Internet</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-lg font-bold">{report.healthScore.networkScore}/15</div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${(report.healthScore.networkScore / 15) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setDrilldownTarget({
                          type: "drive_smart",
                          slot: report.storage.drives[0]?.slot || "Drive 1",
                        })
                      }
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem chu kỳ ghi TBW và tuổi thọ ổ đĩa"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Tiêu hao đĩa</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-lg font-bold">{report.healthScore.wearScore}/10</div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${(report.healthScore.wearScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={() => setDrilldownTarget({ type: "health_score" })}
                      className="space-y-1 p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-all active:scale-95 group"
                      title="Nhấp để xem nhật ký uptime hệ thống"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-sky-200 uppercase font-semibold">Uptime</span>
                        <ArrowUpRight className="w-3 h-3 text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm font-bold truncate">{report.uptimeString}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Domain Navigation Hub (Overview Mode) */}
              {viewTab === "overview" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in pt-1">
                  <div
                    onClick={() => setViewTab("hardware")}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>NGUỒN ĐIỆN & UPS</span>
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {report.power.averageWattage} W
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {report.power.outagesCount} sự cố mất điện • {report.power.estimatedCostVND.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                      <span>Xem chi tiết phần cứng</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <div
                    onClick={() => setViewTab("security")}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-400/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>MẠNG & UPTIME</span>
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                        <Globe className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {report.network.uptimePercent}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {report.network.totalRxGB} GB tải về • Ping {report.network.averageLatencyMs}ms
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                      <span>Xem phân tích mạng</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <div
                    onClick={() => setViewTab("hardware")}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-400/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>KHAY ĐĨA & SMART</span>
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                        <HardDrive className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {report.storage.drives.length} Khay đĩa
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Pool: {report.storage.poolsStatus} • Đã dùng {report.storage.usedPercent}%
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <span>Kiểm tra S.M.A.R.T</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <div
                    onClick={() => setViewTab("security")}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-400/60 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>PHÒNG VỆ MẠNG</span>
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
                        <Shield className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                        Chặn {report.security.blockedIpsCount} IP
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {report.security.failedLoginsCount} lượt thử sai • Chặn {report.security.bruteForceBlockedRate}%
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                      <span>Điều tra pháp y IP</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Power & Energy Consumption */}
          {(viewTab === "all" || viewTab === "hardware") && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>1. Nguồn Điện & Điện Năng Tiêu Thụ</span>
                </h2>
                <button
                  onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 sm:py-1 rounded-xl group self-start sm:self-auto"
                  title="Xem chi tiết biểu đồ xả pin, điện áp AC & thông số NUT"
                >
                  <span className="sm:hidden">Biểu đồ xả pin NUT</span>
                  <span className="hidden sm:inline">Biểu đồ xả pin & Voltage NUT</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Outages count */}
                <div
                  onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để xem nhật ký xả pin chi tiết"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    <span>MẤT ĐIỆN LƯỚI</span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {report.power.outagesCount}
                    </span>
                    <span className="text-xs text-slate-500">lần trong kỳ</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    UPS pin giữ an toàn: <strong>{Math.round(report.power.totalBatterySeconds / 60)} phút</strong>
                  </p>
                </div>

                {/* Improper shutdowns */}
                <div
                  onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để kiểm tra an toàn ngắt nguồn"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    <span>SẬP NGUỒN ĐỘT NGỘT</span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          report.power.improperShutdowns > 0 ? "text-rose-500" : "text-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span
                      className={`text-2xl font-black ${
                        report.power.improperShutdowns > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {report.power.improperShutdowns}
                    </span>
                    <span className="text-xs text-slate-500">lần</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {report.power.improperShutdowns === 0
                      ? "Không có sập nguồn, an toàn dữ liệu 100%"
                      : "Cần kiểm tra lại cáp nguồn hoặc pin UPS"}
                  </p>
                </div>

                {/* Power consumption kWh */}
                <div
                  onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để xem công suất tải và phân bổ điện"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    <span>ĐIỆN TIÊU THỤ ƯỚC TÍNH</span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Cpu className="w-4 h-4 text-sky-500" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {report.power.estimatedKWh}
                    </span>
                    <span className="text-xs text-slate-500">kWh</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Công suất TB: <strong>{report.power.averageWattage} W</strong>
                  </p>
                </div>

                {/* Estimated cost VND */}
                <div
                  onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để xem chi tiết tiền điện & tải UPS"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    <span>TIỀN ĐIỆN DỰ KIẾN</span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">VNĐ</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {report.power.estimatedCostVND.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-xs text-slate-500">đ</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Biểu giá bậc 3 (~3.000đ/kWh)
                  </p>
                </div>
              </div>

              {/* UPS Status badge & History chart */}
              <div
                onClick={() => setDrilldownTarget({ type: "power_telemetry" })}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                title="Nhấp để mở đồ thị xả pin UPS và tham số NUT"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      UPS: {report.power.upsModel || "APC Smart/Back-UPS"}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                        Đang kết nối USB
                      </span>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Chi tiết xả pin & điện áp <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Dung lượng pin: <strong>{report.power.upsBatteryPercent ?? 100}%</strong> • Tải UPS:{" "}
                      <strong>{report.power.upsLoadPercent ?? 18}%</strong>
                    </div>
                  </div>
                </div>

                {/* Power spark history */}
                <div className="flex items-center gap-2 overflow-x-auto">
                  {report.power.powerHistory.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[54px]">
                      <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{item.kwh}k</span>
                      {item.outages > 0 ? (
                        <span className="text-[9px] text-amber-500 font-bold">⚡{item.outages}</span>
                      ) : (
                        <span className="text-[9px] text-slate-400">0</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Network Outages & Latency */}
          {(viewTab === "all" || viewTab === "security") && (
            <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-500 shrink-0" />
                <span>2. Mạng & Độ Sẵn Sàng Internet</span>
              </h2>
              <button
                onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 sm:py-1 rounded-xl group self-start sm:self-auto"
                title="Phân tích lưu lượng SMB, Drive, Jitter & NIC eth0/eth1"
              >
                <span className="sm:hidden">Protocol & Jitter</span>
                <span className="hidden sm:inline">Phân tích Protocol & Jitter</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-400/60 hover:shadow-md transition-all group"
                title="Nhấp để xem sự cố rớt mạng & ping jitter"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <span>SỰ CỐ RỚT MẠNG</span>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Globe className="w-4 h-4 text-sky-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {report.network.outagesCount}
                  </span>
                  <span className="text-xs text-slate-500">lần</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tổng thời gian downtime: <strong>{report.network.downtimeMinutes} phút</strong>
                </p>
              </div>

              <div
                onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-400/60 hover:shadow-md transition-all group"
                title="Nhấp để xem tỷ lệ uptime & SLA mạng"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <span>TỶ LỆ UPTIME MẠNG</span>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {report.network.uptimePercent}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đạt chuẩn khả dụng cao 99.9%+
                </p>
              </div>

              <div
                onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-400/60 hover:shadow-md transition-all group"
                title="Nhấp để xem biểu đồ biến thiên độ trễ ping & packet loss"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <span>ĐỘ TRỄ PING TRUNG BÌNH</span>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Activity className="w-4 h-4 text-indigo-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {report.network.averageLatencyMs}
                  </span>
                  <span className="text-xs text-slate-500">ms</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ping Gateway & DNS ổn định
                </p>
              </div>

              <div
                onClick={() => setDrilldownTarget({ type: "network_profiler" })}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-400/60 hover:shadow-md transition-all group"
                title="Nhấp để xem phân bổ băng thông theo giao thức SMB, Web, Download"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <span>LƯU LƯỢNG MẠNG TỔNG</span>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Layers className="w-4 h-4 text-sky-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {report.network.totalRxGB}
                  </span>
                  <span className="text-xs text-slate-500">GB tải về</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tải lên: <strong>{report.network.totalTxGB} GB</strong>
                </p>
              </div>
            </div>
          </div>
        )}

          {/* Section 3: Drive Health & Wear Analysis */}
          {(viewTab === "all" || viewTab === "hardware") && (
            <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                3. Tình Trạng Sức Khỏe & Tiêu Hao Ổ Cứng
              </h2>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Nhấp vào khay đĩa để chạy Quick Test & xem 25+ S.M.A.R.T
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Storage Pool & Volumes
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold uppercase">
                      {report.storage.poolsStatus}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đã dùng <strong>{report.storage.usedPercent}%</strong> (
                    {(report.storage.usedStorageBytes / 1e12).toFixed(1)} TB /{" "}
                    {(report.storage.totalStorageBytes / 1e12).toFixed(1)} TB)
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Data Scrubbing:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">Hoàn tất kiểm tra</strong>
                </div>
              </div>

              {/* Drives Table (Desktop: hidden md:block) */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Khay đĩa</th>
                      <th className="py-3 px-4">Model & Loại</th>
                      <th className="py-3 px-4">Nhiệt độ</th>
                      <th className="py-3 px-4">Bad Sector (ID 5)</th>
                      <th className="py-3 px-4">Pending (ID 197)</th>
                      <th className="py-3 px-4">Giờ chạy (POH)</th>
                      <th className="py-3 px-4">Đánh giá sức khỏe</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.storage.drives.map((d, i) => (
                      <tr
                        key={i}
                        onClick={() => setDrilldownTarget({ type: "drive_smart", slot: d.slot })}
                        className="hover:bg-sky-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition-all group"
                        title={`Nhấp để xem 25+ chỉ số S.M.A.R.T & chạy chẩn đoán khay ${d.slot}`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                          {d.slot}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div>{d.model}</div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            {d.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              d.tempC >= 45 ? "text-amber-500" : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {d.tempC}°C
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">(max {d.maxTempC}°C)</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={
                              d.reallocatedSectors > 0
                                ? "text-rose-500 font-bold"
                                : "text-slate-600 dark:text-slate-400"
                            }
                          >
                            {d.reallocatedSectors}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={
                              d.pendingSectors > 0
                                ? "text-amber-500 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded"
                                : "text-slate-600 dark:text-slate-400"
                            }
                          >
                            {d.pendingSectors}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {d.powerOnHours.toLocaleString()}h
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              d.status === "normal"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {d.healthLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                            S.M.A.R.T
                            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Drives Cards (md:hidden) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {report.storage.drives.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => setDrilldownTarget({ type: "drive_smart", slot: d.slot })}
                    className="p-4 space-y-2.5 active:bg-sky-500/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {d.slot}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {d.type}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          d.status === "normal"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {d.healthLabel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                      {d.model}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Nhiệt độ</span>
                        <span className={`font-bold ${d.tempC >= 45 ? "text-amber-500" : "text-slate-800 dark:text-slate-200"}`}>
                          {d.tempC}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Bad Sector</span>
                        <span className={`font-bold font-mono ${d.reallocatedSectors > 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-200"}`}>
                          {d.reallocatedSectors}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Giờ chạy</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {d.powerOnHours.toLocaleString()}h
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 pt-1">
                      <span>Chẩn đoán 25+ S.M.A.R.T</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Wear Analysis Cards (SSD TBW & HDD Load Cycles) */}
              <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SSD Wear */}
                <div
                  onClick={() =>
                    setDrilldownTarget({
                      type: "drive_smart",
                      slot: "M.2 NVMe Cache",
                    })
                  }
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-indigo-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để xem thông số chi tiết SSD Cache & TBW"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      Tiêu hao SSD Cache NVMe
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">
                        Còn {report.diskWear.ssds[0]?.lifeLeftPercent ?? 100}%
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p>
                      Đã ghi trong kỳ:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        +{report.diskWear.ssds[0]?.tbwWrittenInPeriod ?? 0} TBW
                      </strong>{" "}
                      (Tổng tích lũy: {report.diskWear.ssds[0]?.totalTbwWritten} TBW / Định mức{" "}
                      {report.diskWear.ssds[0]?.ratedTbw} TBW)
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      🎯 Dự báo tuổi thọ còn lại:{" "}
                      <strong>~{report.diskWear.ssds[0]?.estimatedYearsRemaining ?? 5} năm</strong>
                    </p>
                  </div>
                </div>

                {/* HDD Mechanics & Hibernation */}
                <div
                  onClick={() =>
                    setDrilldownTarget({
                      type: "drive_smart",
                      slot: report.storage.drives[0]?.slot || "Drive 1",
                    })
                  }
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-amber-400/60 hover:shadow-md transition-all group"
                  title="Nhấp để xem chu kỳ Load/Unload HDD và S.M.A.R.T"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Hao mòn Cơ khí HDD & Ngủ đông
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[11px]">Định mức 300.000 chu kỳ</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {report.diskWear.hibernationRecommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Section 4 & 5: Security & Vulnerabilities */}
          {(viewTab === "all" || viewTab === "security") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Section 4: Intrusion & Attack Defense */}
            <div className="space-y-3 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>4. Phòng Thủ Tấn Công Mạng</span>
                </h2>
                <button
                  onClick={() => setDrilldownTarget({ type: "security_threats" })}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 sm:py-1 rounded-xl group self-start sm:self-auto"
                  title="Xem danh sách điều tra pháp y IP bị chặn & phân tích GeoIP"
                >
                  <span className="sm:hidden">Quản lý IP & GeoIP</span>
                  <span className="hidden sm:inline">Điều tra pháp y & Quản lý IP</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div
                      onClick={() => setDrilldownTarget({ type: "security_threats" })}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                      title="Nhấp để xem nhật ký dò mật khẩu"
                    >
                      <div className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1">
                        <span>DÒ MẬT KHẨU</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {report.security.failedLoginsCount}
                      </div>
                      <div className="text-[10px] text-slate-400">Lượt thử sai</div>
                    </div>

                    <div
                      onClick={() => setDrilldownTarget({ type: "security_threats" })}
                      className="p-3 rounded-2xl bg-rose-500/10 cursor-pointer hover:bg-rose-500/20 transition-all group ring-1 ring-rose-500/20"
                      title="Nhấp để xem danh sách IP bị AutoBlock & mở khóa"
                    >
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center gap-1">
                        <span>AUTOBLOCK</span>
                        <ArrowUpRight className="w-3 h-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {report.security.blockedIpsCount}
                      </div>
                      <div className="text-[10px] text-rose-500 font-medium">IP bị chặn</div>
                    </div>

                    <div
                      onClick={() => setDrilldownTarget({ type: "security_threats" })}
                      className="p-3 rounded-2xl bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/20 transition-all group"
                      title="Nhấp để xem tỷ lệ ngăn chặn xâm nhập"
                    >
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                        <span>HIỆU LỰC</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {report.security.bruteForceBlockedRate}%
                      </div>
                      <div className="text-[10px] text-emerald-500">Chặn tuyệt đối</div>
                    </div>
                  </div>

                  {/* Top attacking countries */}
                  <div
                    onClick={() => setDrilldownTarget({ type: "security_threats" })}
                    className="mt-4 cursor-pointer group"
                    title="Nhấp để điều tra nguồn tấn công GeoIP"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Top nguồn tấn công theo quốc gia (GeoIP)
                      </h4>
                      <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Pháp y IP <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {report.security.topAttackingCountries.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs"
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                            <span className="text-base">{c.flagEmoji}</span>
                            {c.countryName}
                          </span>
                          <span className="font-bold text-slate-600 dark:text-slate-400">
                            {c.attackCount} lượt
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Targeted services */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Dịch vụ bị nhắm tới nhiều nhất
                  </h4>
                  <div className="space-y-2">
                    {report.security.targetedServices.map((s, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{s.service}</span>
                          <span className="text-slate-500">
                            {s.count} lượt ({s.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                          <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${s.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Vulnerabilities & Hardening */}
            <div className="space-y-3 flex flex-col">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                5. Lỗ Hổng & Khuyến Nghị Bảo Mật
              </h2>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <div>
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Điểm An toàn (Security Advisor)
                    </div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                      {report.vulnerabilities.securityAdvisorScore}/100
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                    Có cảnh báo cần xử lý
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {report.vulnerabilities.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          {f.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/10 text-amber-600">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">
                        {f.description}
                      </p>
                      <p className="text-xs text-sky-600 dark:text-sky-400 pl-5 font-medium">
                        💡 Khuyến nghị: {f.recommendation}
                      </p>
                    </div>
                  ))}
                </div>

                {report.vulnerabilities.dsmUpdateAvailable ? (
                  <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 flex items-center justify-between mt-auto">
                    <div>
                      <div className="text-xs font-bold text-sky-700 dark:text-sky-300">
                        Bản vá bảo mật DSM mới
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {report.vulnerabilities.dsmLatestVersion}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                      Cập nhật ngay <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        DSM đang ở phiên bản bảo mật mới nhất
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {report.dsmVersion}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Daily Operational Ledger (Extreme Details) */}
        {(viewTab === "all" || viewTab === "daily") && (
          <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-500" />
                    6. Bảng Kê Chi Tiết Từng Ngày (Daily Operational Ledger)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hồ sơ kiểm toán vận hành chi tiết 24 giờ: Điện năng, Mạng, Ổ đĩa, Bảo mật & Nhật ký sự cố
                  </p>
                </div>

                {/* Filter pills, View mode toggle & Export CSV */}
                {report.dailyRecords && (
                  <div className="flex items-center flex-wrap gap-2.5">
                    {/* Status filter pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        onClick={() => setDailyFilter("all")}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          dailyFilter === "all"
                            ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        Tất cả ({report.dailyRecords.length})
                      </button>
                      <button
                        onClick={() => setDailyFilter("optimal")}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          dailyFilter === "optimal"
                            ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        Tối ưu ({report.dailyRecords.filter((r) => r.status === "optimal").length})
                      </button>
                      <button
                        onClick={() => setDailyFilter("warning")}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          dailyFilter === "warning"
                            ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        Có sự cố ({report.dailyRecords.filter((r) => r.status !== "optimal").length})
                      </button>
                    </div>

                    {/* View mode toggle: Dạng Thẻ vs Dạng Bảng */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        onClick={() => setDailyDisplayMode("cards")}
                        className={`px-2.5 py-1 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          dailyDisplayMode === "cards"
                            ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        title="Hiển thị dạng thẻ chi tiết (thích ứng 100% màn hình, không cuộn ngang)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Dạng thẻ</span>
                      </button>
                      <button
                        onClick={() => setDailyDisplayMode("table")}
                        className={`px-2.5 py-1 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          dailyDisplayMode === "table"
                            ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        title="Hiển thị dạng bảng bảng tính"
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        <span>Dạng bảng</span>
                      </button>
                    </div>

                    {/* Export CSV button */}
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-500/20 transition-all cursor-pointer"
                      title="Xuất bảng kê kiểm toán sang CSV / Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất CSV</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Activity Heatmap Strip (Calendar Tiles) */}
              {report.dailyRecords && report.dailyRecords.length > 0 && (
                <div className="space-y-2.5 bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      Dòng thời gian ({period === "weekly" ? "7 ngày qua" : "30 ngày qua"}) • <span className="sm:hidden text-sky-600 dark:text-sky-400">Vuốt ngang ➔</span><span className="hidden sm:inline">Nhấp thẻ để lọc / xem nhanh</span>
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      🟢 Tối ưu: {report.dailyRecords.filter((r) => r.status === "optimal").length} • 🟡 Cảnh báo: {report.dailyRecords.filter((r) => r.status !== "optimal").length}
                    </span>
                  </div>

                  <div className="flex sm:grid sm:grid-cols-4 md:grid-cols-7 gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1">
                    {report.dailyRecords.map((rec) => {
                      const isSelected = expandedDate === rec.fullDate;
                      const isWarning = rec.status !== "optimal";
                      return (
                        <button
                          key={rec.fullDate}
                          onClick={() => setExpandedDate(isSelected ? null : rec.fullDate)}
                          className={`w-36 sm:w-auto shrink-0 snap-start p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[118px] ${
                            isSelected
                              ? "bg-sky-500/15 border-sky-500 text-sky-900 dark:text-sky-100 ring-2 ring-sky-500/40 shadow-sm"
                              : isWarning
                              ? "bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/40 text-slate-800 dark:text-slate-200"
                              : "bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <span className="text-xs font-black block">{rec.date}</span>
                              <span className="text-[10px] text-slate-400 block -mt-0.5">{rec.dayOfWeek}</span>
                            </div>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isWarning ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                              }`}
                            />
                          </div>

                          <div className="space-y-0.5 my-1 text-[11px]">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-400 text-[10px]">Điện:</span>
                              <span>{rec.power.kwh}k</span>
                            </div>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-400 text-[10px]">Mạng:</span>
                              <span>↓{rec.network.rxGB}G</span>
                            </div>
                          </div>

                          <div className="pt-1.5 mt-auto border-t border-slate-100 dark:border-slate-800/80 w-full">
                            {rec.power.outagesCount > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 truncate block text-center">
                                ⚡ {rec.power.outagesCount} lần UPS
                              </span>
                            ) : rec.security.blockedIpsCount > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 truncate block text-center">
                                🛡️ Chặn {rec.security.blockedIpsCount} IP
                              </span>
                            ) : rec.storage.newBadSectors > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 truncate block text-center">
                                💾 +{rec.storage.newBadSectors} sector
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Tối ưu 100%
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day-by-Day View: Responsive Cards vs Table */}
              {dailyDisplayMode === "cards" ? (
                <div className="space-y-3">
                  {filteredDailyRecords.map((rec) => {
                    const isExpanded = expandedDate === rec.fullDate;
                    const isWarning = rec.status !== "optimal";
                    return (
                      <div
                        key={rec.fullDate}
                        className={`rounded-3xl border transition-all ${
                          isExpanded
                            ? "bg-white dark:bg-slate-900 border-sky-500/60 shadow-md ring-2 ring-sky-500/20"
                            : isWarning
                            ? "bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500/60 shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                        } p-4 sm:p-5`}
                      >
                        {/* Top Row: Date, Status, and Action Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900 dark:text-white">
                                  {rec.date}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  ({rec.dayOfWeek})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {rec.fullDate}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                rec.status === "optimal"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  rec.status === "optimal" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                }`}
                              />
                              {rec.status === "optimal" ? "Vận hành tối ưu" : "Có cảnh báo / Sự cố"}
                            </span>
                          </div>

                          {/* Action Button: Chi tiết nhật ký */}
                          <button
                            onClick={() => setExpandedDate(isExpanded ? null : rec.fullDate)}
                            className={`w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer ${
                              isExpanded
                                ? "bg-sky-500 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-sky-500/10 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200/60 dark:border-slate-700"
                            }`}
                          >
                            <span>{isExpanded ? "Thu gọn nhật ký" : `Chi tiết nhật ký (${rec.events.length})`}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {/* 4-KPI Grid Strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          {/* 1. Điện năng */}
                          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1 font-medium">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                Điện năng tiêu thụ
                              </span>
                            </div>
                            <div className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                              {rec.power.kwh} kWh
                              <span className="text-slate-400 text-[10px] font-normal ml-1">
                                (~{rec.power.costVND.toLocaleString("vi-VN")}đ)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {rec.power.outagesCount > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  ⚡ {rec.power.outagesCount} lần UPS ({Math.round(rec.power.batteryRuntimeSec / 60)}p pin)
                                </span>
                              ) : (
                                <span>100% Điện lưới AC ổn định</span>
                              )}
                            </div>
                          </div>

                          {/* 2. Mạng & Băng thông */}
                          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1 font-medium">
                                <Globe className="w-3.5 h-3.5 text-sky-500" />
                                Băng thông mạng
                              </span>
                            </div>
                            <div className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                              <span className="text-sky-600 dark:text-sky-400 font-bold">↓{rec.network.rxGB}G</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">↑{rec.network.txGB}G</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              Ping: <strong>{rec.network.avgLatencyMs}ms</strong> • {rec.network.downtimeMinutes > 0 ? (
                                <span className="text-rose-600 font-semibold">{rec.network.downtimeMinutes}p mất</span>
                              ) : (
                                <span>100% Online</span>
                              )}
                            </div>
                          </div>

                          {/* 3. Ổ đĩa & Nhiệt độ */}
                          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1 font-medium">
                                <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                                Ổ cứng & Nhiệt độ
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold ${
                                  rec.storage.maxTempC >= 40
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <Flame className="w-3 h-3 text-amber-500" />
                                {rec.storage.maxTempC}°C ({rec.storage.hottestDrive})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {rec.storage.newBadSectors > 0 ? (
                                <span className="text-rose-600 font-semibold">+{rec.storage.newBadSectors} bad sector</span>
                              ) : (
                                <span>0 Bad sector • Đạt chuẩn</span>
                              )}
                            </div>
                          </div>

                          {/* 4. An ninh & Tải hệ thống */}
                          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1 font-medium">
                                <Shield className="w-3.5 h-3.5 text-rose-500" />
                                Bảo mật & CPU/RAM
                              </span>
                            </div>
                            <div className="mt-1 font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                              {rec.security.blockedIpsCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shadow-xs">
                                  Chặn {rec.security.blockedIpsCount} IP
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                  An toàn 100%
                                </span>
                              )}
                              <span className="text-slate-400 text-[11px] font-normal">
                                ({rec.security.failedLogins} dò mk)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              CPU đỉnh: <strong>{rec.system.peakCpuPercent}%</strong> • RAM đỉnh: <strong>{rec.system.peakMemPercent}%</strong>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Drawer (Deep dive 3 columns) */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
                              {/* Column 1: Subsystem Deep-dive */}
                              <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                                  Thông số phần cứng chi tiết ({rec.date})
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-slate-500">Công suất đỉnh (Peak W):</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {rec.power.peakWatts} W
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-slate-500">Tốc độ mạng tối đa:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {rec.network.peakSpeedMBs} MB/s
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-slate-500">Khay đĩa nóng nhất:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {rec.storage.hottestDrive} ({rec.storage.maxTempC}°C)
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-slate-500">SSD Cache ghi trong ngày:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      +{rec.storage.ssdCacheWrittenGB} GB
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-slate-500">Thời gian gián đoạn mạng:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {rec.network.downtimeMinutes > 0 ? `${rec.network.downtimeMinutes} phút` : "0 phút (100% Online)"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: AutoBlock Forensic Card */}
                              <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-rose-500" />
                                  AutoBlock & An ninh mạng ({rec.date})
                                </div>
                                {rec.security.blockedIps.length > 0 ? (
                                  <div className="space-y-2">
                                    {rec.security.blockedIps.map((b, bIdx) => (
                                      <div
                                        key={bIdx}
                                        className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs"
                                      >
                                        <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                                          <span>{b.ip}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                                            Đã khóa vĩnh viễn
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                          Quốc gia: <strong>{b.country}</strong> • Dịch vụ: <strong>{b.service}</strong> • Lúc: {b.time}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-28 flex flex-col items-center justify-center text-center p-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                      Không có IP nào vượt ngưỡng bị AutoBlock
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Chỉ có {rec.security.failedLogins} lần dò quét thông thường, tường lửa hấp thụ 100%.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Column 3: Chronological Log Timeline */}
                              <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                                  Nhật ký sự kiện trong ngày
                                </div>
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                  {rec.events.map((ev, evIdx) => (
                                    <div
                                      key={evIdx}
                                      className="flex items-start space-x-2.5 text-xs p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
                                    >
                                      <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0 mt-0.5">
                                        {ev.time}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                              ev.level === "critical"
                                                ? "bg-rose-500"
                                                : ev.level === "warning"
                                                ? "bg-amber-500"
                                                : "bg-sky-500"
                                            }`}
                                          />
                                          <p className="text-slate-800 dark:text-slate-200 leading-tight">
                                            {ev.message}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3.5 px-4 w-32">Ngày</th>
                          <th className="py-3.5 px-4 w-28">Trạng thái</th>
                          <th className="py-3.5 px-4 w-36">Điện năng</th>
                          <th className="py-3.5 px-4 w-40">Sự cố nguồn / UPS</th>
                          <th className="py-3.5 px-4 w-44">Mạng (Rx / Tx)</th>
                          <th className="py-3.5 px-4 w-36">Nhiệt độ đĩa</th>
                          <th className="py-3.5 px-4 w-36">Bảo mật</th>
                          <th className="py-3.5 px-4 w-32">CPU / RAM Đỉnh</th>
                          <th className="py-3.5 px-4 w-32 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredDailyRecords.map((rec) => {
                          const isExpanded = expandedDate === rec.fullDate;
                          return (
                            <React.Fragment key={rec.fullDate}>
                              <tr
                                onClick={() => setExpandedDate(isExpanded ? null : rec.fullDate)}
                                className={`transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                  isExpanded
                                    ? "bg-sky-50/60 dark:bg-sky-950/25"
                                    : ""
                                }`}
                              >
                                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{rec.date}</span>
                                    <span className="text-[11px] text-slate-400 font-normal">({rec.dayOfWeek})</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                      rec.status === "optimal"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        rec.status === "optimal" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                      }`}
                                    />
                                    {rec.status === "optimal" ? "Tối ưu" : "Cảnh báo"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {rec.power.kwh} kWh
                                    <span className="text-slate-400 text-[10px] font-normal ml-1">
                                      (~{rec.power.costVND.toLocaleString("vi-VN")}đ)
                                    </span>
                                  </div>
                                  <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                                    <div
                                      className="bg-amber-400 h-full rounded-full"
                                      style={{ width: `${Math.min(100, (rec.power.kwh / 1.0) * 100)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {rec.power.outagesCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                      <Zap className="w-3 h-3 text-amber-500" />
                                      {rec.power.outagesCount} lần ({Math.round(rec.power.batteryRuntimeSec / 60)}p pin)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal text-xs">0 sự cố (100% AC)</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center space-x-1 font-semibold text-xs">
                                    <span className="text-sky-600 dark:text-sky-400 font-bold">↓{rec.network.rxGB}G</span>
                                    <span className="text-slate-400">/</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">↑{rec.network.txGB}G</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">Ping: {rec.network.avgLatencyMs}ms</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                                        rec.storage.maxTempC >= 40
                                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      <Flame className="w-3 h-3 text-amber-500" />
                                      {rec.storage.maxTempC}°C
                                    </span>
                                    {rec.storage.newBadSectors > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/20">
                                        +{rec.storage.newBadSectors} sector
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                                      {rec.security.failedLogins} lỗi
                                    </span>
                                    {rec.security.blockedIpsCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500 text-white shadow-xs">
                                        Chặn {rec.security.blockedIpsCount} IP
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                  {rec.system.peakCpuPercent}% <span className="text-slate-400 text-[10px] font-normal">CPU</span> / {rec.system.peakMemPercent}% <span className="text-slate-400 text-[10px] font-normal">RAM</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDate(isExpanded ? null : rec.fullDate);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer ${
                                      isExpanded
                                        ? "bg-sky-500 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 hover:bg-sky-500/10 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
                                    }`}
                                  >
                                    <span>{isExpanded ? "Đóng" : `Chi tiết (${rec.events.length})`}</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Row Detail */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800">
                                  <td colSpan={9} className="p-4 sm:p-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Subsystem Deep-dive */}
                                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                          <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                                          Thông số phần cứng chi tiết ({rec.date})
                                        </div>
                                        <div className="space-y-2 text-xs">
                                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500">Công suất đỉnh (Peak W):</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {rec.power.peakWatts} W
                                            </span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500">Tốc độ mạng tối đa:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {rec.network.peakSpeedMBs} MB/s
                                            </span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500">Khay đĩa nhiệt độ cao nhất:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {rec.storage.hottestDrive} ({rec.storage.maxTempC}°C)
                                            </span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500">SSD Cache ghi trong ngày:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              +{rec.storage.ssdCacheWrittenGB} GB
                                            </span>
                                          </div>
                                          <div className="flex justify-between py-1">
                                            <span className="text-slate-500">Tỷ lệ rớt mạng (Downtime):</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {rec.network.downtimeMinutes > 0 ? `${rec.network.downtimeMinutes} phút` : "0 phút"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Column 2: Blocked Attackers if any */}
                                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                          <Shield className="w-3.5 h-3.5 text-rose-500" />
                                          AutoBlock & Cảnh báo an ninh ({rec.date})
                                        </div>
                                        {rec.security.blockedIps.length > 0 ? (
                                          <div className="space-y-2">
                                            {rec.security.blockedIps.map((b, bIdx) => (
                                              <div
                                                key={bIdx}
                                                className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 text-xs"
                                              >
                                                <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                                                  <span>{b.ip}</span>
                                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                                                    Đã khóa vĩnh viễn
                                                  </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                  Quốc gia: <strong>{b.country}</strong> • Dịch vụ: <strong>{b.service}</strong> • Lúc: {b.time}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="h-28 flex flex-col items-center justify-center text-center p-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                              Không có IP nào vượt ngưỡng bị AutoBlock
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                              Chỉ có {rec.security.failedLogins} lần dò quét thông thường, tường lửa hấp thụ 100%.
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Column 3: Chronological Log Timeline */}
                                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                                          Nhật ký sự kiện trong ngày
                                        </div>
                                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                          {rec.events.map((ev, evIdx) => (
                                            <div
                                              key={evIdx}
                                              className="flex items-start space-x-2.5 text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                                            >
                                              <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0 mt-0.5">
                                                {ev.time}
                                              </span>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                                      ev.level === "critical"
                                                        ? "bg-rose-500"
                                                        : ev.level === "warning"
                                                        ? "bg-amber-500"
                                                        : "bg-sky-500"
                                                    }`}
                                                  />
                                                  <p className="text-slate-800 dark:text-slate-200 leading-tight">
                                                    {ev.message}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Drilldown Deep Statistics Modal */}
          {report && (
            <ReportDrilldownModal
              target={drilldownTarget}
              onClose={() => setDrilldownTarget(null)}
              report={report}
            />
          )}
        </>
      ) : null}
    </div>
  );
};
