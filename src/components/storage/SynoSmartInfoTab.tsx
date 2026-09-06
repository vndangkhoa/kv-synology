"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { SynoSmartResult, SynoSmartParsedReport, SynoSmartDriveSummary } from "@/lib/dsm/types";
import { stripAnsi, formatLifetimeSpan } from "@/lib/storage/synoSmartParser";
import { SynoSmartAnsiViewer } from "./SynoSmartAnsiViewer";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import {
  Activity,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Play,
  Settings,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Server,
  Clock,
  Thermometer,
  Cpu,
  Layers,
  Terminal,
  Info,
  Check,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HeartPulse,
  Search,
  Copy,
  FileText,
  CheckCheck,
  Filter,
} from "lucide-react";

export const SynoSmartInfoTab: React.FC = () => {
  const { session, language, setShowAiChatBubble } = useAppStore();
  const isEn = language === "en";

  // Scan state - Default to "-a" (Show all SMART attributes without cut-off)
  const [option, setOption] = useState<string>("-a");
  const [execMode, setExecMode] = useState<"auto" | "cgi" | "ssh">("auto");
  const [loading, setLoading] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [smartResult, setSmartResult] = useState<SynoSmartResult | null>(null);
  const [copiedForAi, setCopiedForAi] = useState(false);
  const [showExplainer, setShowExplainer] = useState(true);

  // Selected drive full specs modal state
  const [selectedDriveForSpecs, setSelectedDriveForSpecs] = useState<SynoSmartDriveSummary | null>(null);
  const [specsFilter, setSpecsFilter] = useState("");
  const [specsViewMode, setSpecsViewMode] = useState<"table" | "raw">("table");
  const [copiedDriveRaw, setCopiedDriveRaw] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OK" | "WARN" | "FAIL">("ALL");

  // Package check & detection state
  const [checkingPackage, setCheckingPackage] = useState(false);
  const [isPackageInstalled, setIsPackageInstalled] = useState<boolean | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Modals
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [sshSettingsModal, setSshSettingsModal] = useState(false);

  // SSH config from storage or session
  const [sshConfig, setSshConfig] = useState({
    host: "",
    port: 22,
    username: "admin",
    password: "",
  });

  // Load saved SSH config if exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ssh_terminal_conn");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSshConfig({
          host: parsed.host || "",
          port: parsed.port ? Number(parsed.port) : 22,
          username: parsed.username || "admin",
          password: parsed.password || "",
        });
      } else {
        const cfg: any = (dsmClient as any).getConfig?.();
        if (cfg?.host && cfg.host !== "Synology-NAS") {
          setSshConfig((prev) => ({
            ...prev,
            host: cfg.host,
            username: cfg.account || "admin",
          }));
        }
      }
    } catch (_) {}
  }, []);

  // Timer while scanning
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setScanElapsed(0);
      timer = setInterval(() => setScanElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [loading]);

  // Check package presence on mount or connection change
  const checkStatus = useCallback(async () => {
    setCheckingPackage(true);
    try {
      const res = await dsmClient.checkSynoSmartInfoStatus();
      setIsPackageInstalled(res.success);
      if (res.systemInfo) setSystemInfo(res.systemInfo);
    } catch (_) {
      setIsPackageInstalled(false);
    } finally {
      setCheckingPackage(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus, session.isConnected]);

  // Trigger S.M.A.R.T. scan
  const handleRunScan = async () => {
    setLoading(true);
    try {
      const res = await dsmClient.runSynoSmartInfo(
        option,
        execMode,
        execMode === "ssh" || execMode === "auto" ? sshConfig : undefined
      );
      setSmartResult(res);
      if (res.systemInfo) setSystemInfo(res.systemInfo);
      if (res.source === "cgi" && res.success) {
        setIsPackageInstalled(true);
      }
    } catch (err: any) {
      setSmartResult({
        success: false,
        source: "cgi",
        message: err.message || "Quá trình quét thất bại",
        result: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const getAiFormattedPrompt = () => {
    const clean = smartResult?.result ? stripAnsi(smartResult.result) : "";
    return `Phân tích báo cáo S.M.A.R.T. ổ cứng Synology NAS bên dưới. Vui lòng cho tôi biết:
1. Đánh giá sức khỏe tổng quan của từng ổ cứng (PASSED, OK, Cảnh báo WARNING hay Nguy hiểm CRITICAL).
2. Kiểm tra các chỉ số rủi ro hỏng hóc:
   - Bad Sectors & Reallocated Sectors (ID 5)
   - Current Pending Sectors (ID 197)
   - UDMA CRC Errors (ID 199 - lỗi cáp/tiếp xúc SATA)
   - Nhiệt độ hoạt động (°C)
   - Thời gian hoạt động (Power-On Hours ID 9)
   - Độ hao mòn NVMe Wear Leveling (Percentage Used)
3. Đề xuất hành động cụ thể cho tôi (ổ nào an toàn, ổ nào cần theo dõi sát sao, ổ nào cần sao lưu và thay thế gấp).

=== DỮ LIỆU BÁO CÁO S.M.A.R.T. SYNOLOGY ===
${clean}
==========================================`;
  };

  const handleCopyForAi = () => {
    const prompt = getAiFormattedPrompt();
    navigator.clipboard.writeText(prompt);
    setCopiedForAi(true);
    setTimeout(() => setCopiedForAi(false), 2500);
  };

  const handleAskAi = () => {
    handleCopyForAi();
    setShowAiChatBubble(true);
  };

  // Run initial scan once on mount if no result yet
  useEffect(() => {
    if (!smartResult && !loading) {
      handleRunScan();
    }
  }, []);

  const parsedReport: SynoSmartParsedReport | undefined = smartResult?.parsed;
  const drives: SynoSmartDriveSummary[] = parsedReport?.drives || [];
  const overallHealth = parsedReport?.overallHealth || "PASSED";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Info */}
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 relative shrink-0">
              <Activity className="w-6 h-6" />
              <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute -bottom-0.5 -right-0.5 fill-white dark:fill-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                  Syno Smart Info
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  PeterSuh-Q3 & 007revad
                </span>

                {/* Package Status Badge */}
                {checkingPackage ? (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> {isEn ? "Checking package..." : "Đang kiểm tra gói..."}
                  </span>
                ) : isPackageInstalled ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {isEn ? "DSM Package Active" : "Đã kích hoạt DSM Package"}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> {isEn ? "SSH Direct / Demo Mode" : "Chế độ SSH / Dự phòng"}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                {isEn
                  ? "Restore full S.M.A.R.T. attributes, raw values, NVMe health, and temperatures hidden by DSM 7.2.1+. Powered by syno_smart_info.sh."
                  : "Khôi phục toàn bộ thuộc tính S.M.A.R.T. chi tiết, nhiệt độ, chỉ số hao mòn SSD NVMe và giá trị thô bị ẩn trên DSM 7.2.1+. Chạy thông qua syno_smart_info.sh."}
              </p>
            </div>
          </div>

          {/* Quick Guide & Actions Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-sky-500" />
              <span>{isEn ? "Package Guide" : "Hướng dẫn cài đặt"}</span>
            </button>
            <button
              onClick={() => setSshSettingsModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>{isEn ? "SSH Config" : "Cấu hình SSH"}</span>
            </button>
            <a
              href="https://github.com/PeterSuh-Q3/SynoSmartInfo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>

        {/* Scan Controls Row */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Scan Option Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                {isEn ? "Scan Option:" : "Tùy chọn quét:"}
              </label>
              <select
                value={option}
                onChange={(e) => setOption(e.target.value)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="-a">{isEn ? "All SMART Attributes (-a) [Recommended - Full Specs]" : "Toàn bộ thuộc tính S.M.A.R.T. chi tiết (-a) [Khuyên dùng - Đầy đủ]"}</option>
                <option value="">{isEn ? "Standard Health Scan (Default)" : "Kiểm tra sức khỏe tiêu chuẩn"}</option>
                <option value="-i">{isEn ? "Increased Attributes Only (-i)" : "Chỉ thuộc tính có biến động / tăng (-i)"}</option>
                <option value="-v">{isEn ? "Script Version & Info (-v)" : "Phiên bản Script & Thông tin hệ thống (-v)"}</option>
              </select>
            </div>

            {/* Mode Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                {isEn ? "Execution Engine:" : "Phương thức thực thi:"}
              </label>
              <select
                value={execMode}
                onChange={(e) => setExecMode(e.target.value as any)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="auto">{isEn ? "Auto-Detect (CGI > SSH)" : "Tự động (Ưu tiên CGI > SSH)"}</option>
                <option value="cgi">{isEn ? "DSM Package CGI Only" : "Chỉ dùng DSM Package CGI"}</option>
                <option value="ssh">{isEn ? "SSH Direct Runner" : "Thực thi trực tiếp qua SSH"}</option>
              </select>
            </div>
          </div>

          {/* Action Buttons: Run Scan & AI Help */}
          <div className="flex items-center gap-2 flex-wrap">
            {loading && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                {scanElapsed}s
              </span>
            )}

            {/* Run Button */}
            <button
              onClick={handleRunScan}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? (isEn ? "Scanning..." : "Đang quét...") : isEn ? "Run Scan" : "Quét S.M.A.R.T."}</span>
            </button>

            {/* Copy for AI Button */}
            <button
              onClick={handleCopyForAi}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title={isEn ? "Copy formatted report with AI prompt" : "Sao chép báo cáo kèm câu lệnh gợi ý cho AI"}
            >
              {copiedForAi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              <span>{copiedForAi ? (isEn ? "Copied!" : "Đã sao chép!") : (isEn ? "Copy for AI" : "Chép cho AI")}</span>
            </button>

            {/* Ask AI Assistant Button */}
            <button
              onClick={handleAskAi}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              title={isEn ? "Open AI assistant to analyze disk health" : "Mở Trợ lý AI để chẩn đoán chuyên sâu sức khỏe ổ đĩa"}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isEn ? "Ask AI Assistant" : "Hỏi Trợ lý AI"}</span>
            </button>
          </div>
        </div>

        {/* Warning if sudoers / helper missing */}
        {smartResult?.sudoers_missing && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">
                {isEn ? "Package Permission Setup Required" : "Cần cấu hình quyền thực thi (Permission)"}
              </strong>
              <p>
                {isEn
                  ? "The setuid helper for syno_smart_info is not ready on DSM. Reinstalling the package usually resolves this automatically, or configure sudoers."
                  : "Helper setuid chưa được cấp quyền thực thi trên DSM. Hãy thử cài đặt lại package qua Package Center để DSM tự động kích hoạt quyền setuid, hoặc chạy qua SSH."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: S.M.A.R.T. DIAGNOSTIC VERDICT & PARAMETER GUIDE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEn ? "S.M.A.R.T. Health Verdict & Parameter Guide" : "Đánh giá sức khỏe & Hướng dẫn đọc chỉ số S.M.A.R.T."}</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {isEn ? "What SMART is saying" : "Ý nghĩa chỉ số"}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                {isEn
                  ? "Self-Monitoring, Analysis and Reporting Technology diagnostic summary and attribute explanations"
                  : "Tổng quan tình trạng ổ đĩa và giải thích ý nghĩa các thông số kỹ thuật cốt lõi"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>{showExplainer ? (isEn ? "Hide Guide" : "Thu gọn") : (isEn ? "Show Guide" : "Xem hướng dẫn")}</span>
            {showExplainer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Verdict Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 transition-all ${
            overallHealth === "PASSED"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
              : overallHealth === "WARNING"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
              : "bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200"
          }`}
        >
          {overallHealth === "PASSED" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : overallHealth === "WARNING" ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="font-bold text-sm">
                {isEn ? "Overall Health Assessment:" : "Đánh giá sức khỏe tổng thể:"}
              </strong>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                  overallHealth === "PASSED"
                    ? "bg-emerald-600 text-white"
                    : overallHealth === "WARNING"
                    ? "bg-amber-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {overallHealth}
              </span>
            </div>

            <p className="text-xs leading-relaxed opacity-90">
              {overallHealth === "PASSED"
                ? isEn
                  ? "All scanned drives passed their internal SMART self-assessment tests. No uncorrectable read errors, bad reallocated sectors, or interface communication CRC faults were detected. Disks are operating in good mechanical & electronic health."
                  : "Tất cả các ổ đĩa đều vượt qua bài kiểm tra tự chẩn đoán nội bộ. Không phát hiện sector hỏng (Reallocated), không có sector lỗi đọc (Pending) hay lỗi bắt tay SATA (CRC). Ổ đĩa đang vận hành trong tình trạng cơ khí và chip nhớ an toàn."
                : overallHealth === "WARNING"
                ? isEn
                  ? "One or more drives reported non-zero reallocated sectors, pending read errors, or elevated interface CRC faults. The drives are still functioning, but you should monitor them periodically and ensure regular backups."
                  : "Một hoặc nhiều ổ đĩa xuất hiện sector đã phân bổ lại, lỗi đọc hoặc lỗi giao tiếp CRC. Ổ đĩa vẫn đang hoạt động nhưng cần theo dõi sát sao chỉ số này định kỳ và duy trì bản sao lưu."
                : isEn
                ? "CRITICAL WARNING: Significant hardware defects detected (high bad sectors or failed SMART self-test). Immediate backup of essential files is strongly recommended before drive failure occurs!"
                : "CẢNH BÁO NGUY CẤP: Phát hiện dấu hiệu hỏng hóc phần cứng nghiêm trọng (Bad sector tăng cao hoặc bài kiểm tra SMART thất bại). Khuyến cáo sao lưu toàn bộ dữ liệu quan trọng ngay lập tức và thay thế ổ đĩa!"}
            </p>
          </div>
        </div>

        {/* Expandable Parameter Cards */}
        {showExplainer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {/* Card 1: ID 5 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>ID 5: Reallocated Sectors</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Number of bad magnetic sectors that were permanently remapped to spare reserve area. Ideal value is 0. If this count increases over time, the disk platter is physically degrading."
                  : "Số cung từ bị hỏng vật lý đã được hoán đổi sang vùng dự phòng. Chuẩn lý tưởng là 0. Nếu con số này xuất hiện và tăng dần sau các tuần, đĩa từ đang bị xước hoặc thoái hóa."}
              </p>
            </div>

            {/* Card 2: ID 197 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>ID 197: Current Pending Sectors</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Sectors waiting for remapping due to read/write errors. If a write succeeds later, count decreases; otherwise becomes a bad sector. High numbers indicate potential data corruption."
                  : "Các sector đang trong diện 'chờ xử lý' do lỗi đọc/ghi bất ổn định. Khi ghi lại thành công, số này sẽ giảm. Nếu con số này tăng, nguy cơ mất tệp tin tại vùng đó rất cao."}
              </p>
            </div>

            {/* Card 3: ID 199 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>ID 199: UDMA CRC Errors</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Data transmission checksum errors between disk controller and NAS motherboard. Almost always caused by loose SATA cables, dusty backplane connectors, or drive bay vibration, NOT a bad disk."
                  : "Lỗi truyền dữ liệu giữa ổ cứng và bo mạch NAS qua giao tiếp SATA. Thường do cáp SATA lỏng, tiếp xúc khay cắm bám bụi bẩn hoặc rung lắc, KHÔNG phải do hỏng bề mặt đĩa."}
              </p>
            </div>

            {/* Card 4: Temperature */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Nhiệt độ (Temperature - ID 194)</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Ideal safe operating zone is 30°C - 45°C. Temperatures continuously exceeding 50°C dramatically accelerate mechanical wear and flash cell leakage. Ensure NAS fan speed is adequate."
                  : "Ngưỡng hoạt động tối ưu là 32°C - 45°C. Nếu nhiệt độ liên tục vượt 50°C, tuổi thọ vòng bi cơ khí và chip nhớ sẽ giảm nhanh chóng. Hãy kiểm tra tốc độ quạt làm mát của NAS."}
              </p>
            </div>

            {/* Card 5: Power On Hours */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>ID 9: Power-On Hours</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Total powered-on operating hours (1 full year of 24/7 NAS runtime ≈ 8,760 hours). Commercial NAS drives (WD Red, IronWolf) typically run reliably for 40,000 - 60,000 hours (~5-7 years)."
                  : "Tổng số giờ ổ đĩa đã cắm điện hoạt động (1 năm chạy 24/7 tương đương khoảng 8,760 giờ). Ổ đĩa chuyên dụng cho NAS thường có tuổi thọ thiết kế 40,000 - 60,000 giờ (~5-7 năm)."}
              </p>
            </div>

            {/* Card 6: NVMe Wear */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>NVMe Wear / Percentage Used</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isEn
                  ? "Percentage of SSD flash endurance consumed based on vendor TBW (Total Bytes Written) rating. 0% means brand new, while 100% means rated warranty endurance is reached."
                  : "Tỷ lệ phần trăm tuổi thọ ô nhớ flash NAND đã bị tiêu hao theo chuẩn TBW (Total Bytes Written). 0% là SSD mới tinh, 100% là đã dùng hết chỉ số ghi bảo hành từ hãng."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: STRUCTURED DRIVE CARDS (SUMMARY METRICS) */}
      {drives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sky-500" />
              <span>{isEn ? "Detected Drives & Diagnostics" : "Danh sách ổ đĩa & Trạng thái S.M.A.R.T."}</span>
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              {drives.length} {isEn ? "Drives inspected" : "ổ đĩa đã kiểm tra"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drives.map((d, idx) => {
              const isNvme = d.slot.toLowerCase().includes("m.2") || d.slot.toLowerCase().includes("nvme") || d.device.includes("nvme");
              const isHealthy = d.health === "PASSED" || d.health === "OK";
              const isWarning = d.health === "WARNING";
              const isCritical = d.health === "CRITICAL";

              return (
                <div
                  key={idx}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 hover:border-sky-300 dark:hover:border-sky-800 transition-all"
                >
                  {/* Drive Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-2xl shrink-0 ${
                          isNvme
                            ? "bg-purple-500/10 text-purple-600"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                        }`}
                      >
                        {isNvme ? <Zap className="w-5 h-5 text-purple-500" /> : <HardDrive className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {d.slot}
                          </h5>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              isNvme
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {isNvme ? "NVMe SSD" : "SATA HDD/SSD"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate">{d.device}</p>
                      </div>
                    </div>

                    {/* Health Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1 border ${
                        isHealthy
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isHealthy ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {d.health}
                    </span>
                  </div>

                  {/* Model, Serial, Capacity & Firmware Info */}
                  <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Model:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={d.model}>
                        {d.model}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">Serial:</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={d.serial}>
                        {d.serial || "—"}
                      </span>
                    </div>
                    {(d.capacity || d.firmware || d.rotationRate) && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        {d.capacity ? (
                          <span className="font-semibold text-sky-600 dark:text-sky-400">
                            {d.capacity.includes("[") ? d.capacity.split("[")[1].replace("]", "") : d.capacity}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">{d.sataVersion || "SATA"}</span>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                          {d.rotationRate && <span>{d.rotationRate}</span>}
                          {d.firmware && <span>FW: {d.firmware}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4 Metric Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Temperature */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {isEn ? "Temperature" : "Nhiệt độ"}
                      </p>
                      <p className="font-bold font-mono text-sm text-amber-500 mt-0.5">
                        {d.tempC !== null ? `${d.tempC}°C / ${Math.round((d.tempC * 9) / 5 + 32)}°F` : "—"}
                      </p>
                    </div>

                    {/* Power on Hours & Operating Lifetime Span */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {isEn ? "Operating Lifetime" : "Thời gian chạy"}
                      </p>
                      <p className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={d.powerOnHours !== null ? `${d.powerOnHours.toLocaleString()} giờ hoạt động` : undefined}>
                        {d.powerOnHours !== null ? formatLifetimeSpan(d.powerOnHours) : "—"}
                      </p>
                    </div>

                    {/* Reallocated Sectors (ID 5) */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Reallocated (ID 5)</p>
                      <p
                        className={`font-bold font-mono text-sm mt-0.5 ${
                          (d.reallocatedSectors || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {d.reallocatedSectors ?? 0}
                      </p>
                    </div>

                    {/* UDMA CRC / Pending */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">CRC Error (ID 199)</p>
                      <p
                        className={`font-bold font-mono text-sm mt-0.5 ${
                          (d.crcErrors || 0) > 0 ? "text-amber-500" : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {d.crcErrors ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* NVMe wear if present */}
                  {d.nvmeWearPercent !== undefined && d.nvmeWearPercent !== null && (
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-between text-xs">
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        {isEn ? "NVMe Wear / Percentage Used:" : "Mức độ hao mòn NVMe:"}
                      </span>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        {d.nvmeWearPercent}%
                      </span>
                    </div>
                  )}

                  {/* Full Specifications Button */}
                  <button
                    onClick={() => {
                      setSelectedDriveForSpecs(d);
                      setSpecsFilter("");
                      setStatusFilter("ALL");
                      setSpecsViewMode("table");
                    }}
                    className="w-full py-2 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-500" />
                    <span>{isEn ? "Full SMART Specs" : "Xem toàn bộ thông số SMART"}</span>
                    {(d.smartAttributes?.length || d.nvmeSpecs?.length) ? (
                      <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {d.smartAttributes ? `${d.smartAttributes.length} attr` : `${d.nvmeSpecs?.length} specs`}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: RAW TERMINAL ANSI VIEWER */}
      {smartResult?.result ? (
        <SynoSmartAnsiViewer
          rawAnsi={smartResult.result}
          title={
            isEn
              ? `S.M.A.R.T. Full Diagnostic Report [Source: ${smartResult.source.toUpperCase()}]`
              : `Báo cáo chi tiết S.M.A.R.T. [Nguồn: ${smartResult.source.toUpperCase()}]`
          }
          isScanning={loading}
        />
      ) : (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-base text-slate-700 dark:text-slate-300">
            {isEn ? "No S.M.A.R.T. scan data yet" : "Chưa có dữ liệu quét S.M.A.R.T."}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isEn
              ? "Click the 'Run S.M.A.R.T. Scan' button above to inspect health, attributes, and bad sectors on all drives."
              : "Nhấn nút 'Bắt đầu quét S.M.A.R.T.' ở trên để kiểm tra toàn bộ thông số sức khỏe và cung cấp báo cáo chi tiết."}
          </p>
        </div>
      )}

      {/* MODAL 1: INSTALLATION & PACKAGE GUIDE MODAL */}
      <ResponsiveModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title={isEn ? "SynoSmartInfo Package Installation Guide" : "Hướng dẫn cài đặt gói SynoSmartInfo"}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
            <h4 className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600" />
              {isEn ? "Why is this package needed?" : "Vì sao cần công cụ SynoSmartInfo?"}
            </h4>
            <p className="text-xs text-sky-800 dark:text-sky-300">
              {isEn
                ? "From DSM 7.2.1 and DSM 7.2.2 onward, Synology removed detailed SMART attribute tables and raw values for non-Synology branded HDDs and NVMe drives. SynoSmartInfo by PeterSuh-Q3 & 007revad restores complete drive health telemetry."
                : "Từ phiên bản DSM 7.2.1 và 7.2.2 trở đi, Synology đã ẩn hoàn toàn bảng thuộc tính S.M.A.R.T. chi tiết cho các ổ cứng thông dụng và toàn bộ ổ M.2 NVMe. Gói SynoSmartInfo từ PeterSuh-Q3 & 007revad khôi phục lại toàn bộ dữ liệu này."}
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              {isEn ? "Method A: Install via Community Package Center (Recommended)" : "Cách 1: Thêm nguồn Package Center (Khuyên dùng)"}
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs text-slate-600 dark:text-slate-300">
              <li>Mở **Package Center** trên DSM Synology.</li>
              <li>Vào **Settings** &gt; chuyển sang tab **Package Sources** &gt; nhấn **Add**.</li>
              <li>
                Nhập Tên: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">007revad</code> | URL:{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-sky-600">https://spkrepo.007daver.workers.dev/</code>
              </li>
              <li>Quay lại Package Center &gt; chọn mục **Community** &gt; tìm **Syno Smart Info** &gt; bấm **Install**.</li>
            </ol>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              {isEn ? "Method B: Manual SPK Download" : "Cách 2: Tải file .SPK thủ công"}
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Truy cập trang Releases tại GitHub{" "}
              <a
                href="https://github.com/PeterSuh-Q3/SynoSmartInfo/releases"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 underline font-semibold"
              >
                PeterSuh-Q3/SynoSmartInfo/releases
              </a>
              , tải file <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">Synosmartinfo_*.spk</code> và chọn **Manual Install** trong Package Center.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              {isEn ? "Method C: Zero-Install via SSH Direct Runner" : "Cách 3: Chạy trực tiếp qua SSH không cần cài đặt"}
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Chỉ cần cấu hình thông tin SSH của NAS trong mục **Cấu hình SSH**. Webapp sẽ tự động chạy script `syno_smart_info.sh` với quyền root mà không cần cài đặt thêm package nào lên NAS!
            </p>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => setShowGuideModal(false)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
            >
              {isEn ? "Close" : "Đã hiểu"}
            </button>
          </div>
        </div>
      </ResponsiveModal>

      {/* MODAL 2: SSH CONFIG MODAL */}
      <ResponsiveModal
        open={sshSettingsModal}
        onClose={() => setSshSettingsModal(false)}
        title={isEn ? "SSH Connection Settings (For Direct Runner)" : "Cấu hình SSH (Dành cho chế độ thực thi trực tiếp)"}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            {isEn
              ? "Provide SSH credentials to run syno_smart_info.sh directly on your NAS when the Synosmartinfo package is not installed."
              : "Cung cấp thông tin đăng nhập SSH để chạy trực tiếp syno_smart_info.sh trên NAS khi chưa cài đặt gói SPK."}
          </p>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Host (IP hoặc DDNS):</label>
            <input
              type="text"
              value={sshConfig.host}
              onChange={(e) => setSshConfig({ ...sshConfig, host: e.target.value })}
              placeholder="e.g. 192.168.1.10"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Port:</label>
              <input
                type="number"
                value={sshConfig.port}
                onChange={(e) => setSshConfig({ ...sshConfig, port: Number(e.target.value) || 22 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">User:</label>
              <input
                type="text"
                value={sshConfig.username}
                onChange={(e) => setSshConfig({ ...sshConfig, username: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Password:</label>
            <input
              type="password"
              value={sshConfig.password}
              onChange={(e) => setSshConfig({ ...sshConfig, password: e.target.value })}
              placeholder="Password..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={() => setSshSettingsModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold"
            >
              {isEn ? "Cancel" : "Hủy"}
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.setItem("ssh_terminal_conn", JSON.stringify(sshConfig));
                } catch (_) {}
                setSshSettingsModal(false);
              }}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
            >
              {isEn ? "Save & Use" : "Lưu & Sử dụng"}
            </button>
          </div>
        </div>
      </ResponsiveModal>

      {/* MODAL 3: FULL DRIVE S.M.A.R.T. SPECIFICATIONS MODAL */}
      {selectedDriveForSpecs && (
        <ResponsiveModal
          open={!!selectedDriveForSpecs}
          onClose={() => setSelectedDriveForSpecs(null)}
          title={`${selectedDriveForSpecs.slot}: ${selectedDriveForSpecs.model}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Drive High-Level Specs Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedDriveForSpecs.slot}
                    </h4>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                      {selectedDriveForSpecs.device}
                    </span>
                    <span
                      className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        selectedDriveForSpecs.health === "PASSED" || selectedDriveForSpecs.health === "OK"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : selectedDriveForSpecs.health === "WARNING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {selectedDriveForSpecs.health}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Model: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{selectedDriveForSpecs.model}</strong> | Serial:{" "}
                    <span className="font-mono">{selectedDriveForSpecs.serial || "—"}</span>
                  </p>
                </div>

                {/* Quick Indicators */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedDriveForSpecs.capacity && (
                    <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300">
                      <span className="text-[10px] block opacity-70">Dung lượng:</span>
                      <span className="font-bold">
                        {selectedDriveForSpecs.capacity.includes("[")
                          ? selectedDriveForSpecs.capacity.split("[")[1].replace("]", "")
                          : selectedDriveForSpecs.capacity}
                      </span>
                    </div>
                  )}
                  {selectedDriveForSpecs.tempC !== null && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                      <span className="text-[10px] block opacity-70">Nhiệt độ:</span>
                      <span className="font-bold font-mono">{selectedDriveForSpecs.tempC}°C</span>
                    </div>
                  )}
                  {selectedDriveForSpecs.powerOnHours !== null && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      <span className="text-[10px] block opacity-70">Tuổi thọ đã chạy:</span>
                      <span className="font-bold font-mono">{formatLifetimeSpan(selectedDriveForSpecs.powerOnHours)}</span>
                    </div>
                  )}
                  {selectedDriveForSpecs.nvmeWearPercent !== null && selectedDriveForSpecs.nvmeWearPercent !== undefined && (
                    <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
                      <span className="text-[10px] block opacity-70">Tuổi thọ SSD còn lại:</span>
                      <span className="font-bold font-mono">{Math.max(0, 100 - selectedDriveForSpecs.nvmeWearPercent)}% (Đã dùng {selectedDriveForSpecs.nvmeWearPercent}%)</span>
                    </div>
                  )}
                  {selectedDriveForSpecs.firmware && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      <span className="text-[10px] block opacity-70">Firmware:</span>
                      <span className="font-bold font-mono">{selectedDriveForSpecs.firmware}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Sub-Specs */}
              {(selectedDriveForSpecs.rotationRate || selectedDriveForSpecs.sataVersion) && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDriveForSpecs.rotationRate && (
                    <span>Tốc độ quay: <strong className="text-slate-700 dark:text-slate-300">{selectedDriveForSpecs.rotationRate}</strong></span>
                  )}
                  {selectedDriveForSpecs.sataVersion && (
                    <span>Giao diện: <strong className="text-slate-700 dark:text-slate-300">{selectedDriveForSpecs.sataVersion}</strong></span>
                  )}
                  {selectedDriveForSpecs.reallocatedSectors !== null && (
                    <span>Reallocated (ID 5): <strong className={selectedDriveForSpecs.reallocatedSectors > 0 ? "text-rose-600" : "text-emerald-600"}>{selectedDriveForSpecs.reallocatedSectors}</strong></span>
                  )}
                  {selectedDriveForSpecs.crcErrors !== null && (
                    <span>UDMA CRC (ID 199): <strong className={selectedDriveForSpecs.crcErrors > 0 ? "text-amber-600" : "text-slate-700 dark:text-slate-300"}>{selectedDriveForSpecs.crcErrors}</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* View Mode Switcher & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start">
                <button
                  onClick={() => setSpecsViewMode("table")}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                    specsViewMode === "table"
                      ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {isEn ? "Full Attributes Table" : "Bảng thông số chi tiết"}
                </button>
                <button
                  onClick={() => setSpecsViewMode("raw")}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                    specsViewMode === "raw"
                      ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {isEn ? "Raw Output Block" : "Bản ghi thô (Raw)"}
                </button>
              </div>

              {specsViewMode === "table" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={specsFilter}
                      onChange={(e) => setSpecsFilter(e.target.value)}
                      placeholder={isEn ? "Search attribute / spec..." : "Tìm thuộc tính SMART..."}
                      className="pl-8 pr-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {specsFilter && (
                      <button
                        onClick={() => setSpecsFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter for SMART attributes */}
                  {selectedDriveForSpecs.smartAttributes && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value="ALL">{isEn ? "All Statuses" : "Tất cả trạng thái"}</option>
                      <option value="OK">{isEn ? "Normal Only (OK)" : "Chỉ thuộc tính bình thường (OK)"}</option>
                      <option value="WARN">{isEn ? "Warnings Only" : "Chỉ cảnh báo (WARN)"}</option>
                      <option value="FAIL">{isEn ? "Critical / Fails Only" : "Chỉ nguy cấp (FAIL)"}</option>
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: STRUCTURED TABLE (SATA OR NVME) */}
            {specsViewMode === "table" && (
              <div className="space-y-3">
                {/* 1A: SATA SMART ATTRIBUTES TABLE */}
                {selectedDriveForSpecs.smartAttributes && selectedDriveForSpecs.smartAttributes.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[460px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center font-mono">ID#</th>
                            <th className="py-2.5 px-3 min-w-[200px]">{isEn ? "Attribute Name & Description" : "Thuộc tính S.M.A.R.T. & Diễn giải"}</th>
                            <th className="py-2.5 px-2.5 text-center font-mono w-16">{isEn ? "Value" : "Hiện tại"}</th>
                            <th className="py-2.5 px-2.5 text-center font-mono w-16">{isEn ? "Worst" : "Tệ nhất"}</th>
                            <th className="py-2.5 px-2.5 text-center font-mono w-16">{isEn ? "Thresh" : "Ngưỡng"}</th>
                            <th className="py-2.5 px-3 font-mono min-w-[110px]">{isEn ? "Raw Value" : "Giá trị thô"}</th>
                            <th className="py-2.5 px-3 text-center w-24">{isEn ? "Status" : "Trạng thái"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {selectedDriveForSpecs.smartAttributes
                            .filter((attr) => {
                              if (statusFilter !== "ALL" && attr.status !== statusFilter) return false;
                              if (!specsFilter.trim()) return true;
                              const q = specsFilter.toLowerCase();
                              return (
                                String(attr.id).includes(q) ||
                                attr.name.toLowerCase().includes(q) ||
                                (attr.description && attr.description.toLowerCase().includes(q)) ||
                                attr.rawValue.toLowerCase().includes(q)
                              );
                            })
                            .map((attr, idx) => {
                              const isCrit = attr.status === "FAIL";
                              const isWarn = attr.status === "WARN";

                              return (
                                <tr
                                  key={idx}
                                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                                    isCrit
                                      ? "bg-rose-500/5 dark:bg-rose-950/20"
                                      : isWarn
                                      ? "bg-amber-500/5 dark:bg-amber-950/20"
                                      : ""
                                  }`}
                                >
                                  <td className="py-2 px-3 text-center text-slate-400 font-bold">
                                    {attr.id}
                                  </td>
                                  <td className="py-2 px-3 font-sans">
                                    <div className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                      {attr.name}
                                    </div>
                                    {attr.description && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        {attr.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-center text-slate-700 dark:text-slate-300">
                                    {attr.value}
                                  </td>
                                  <td className="py-2 px-2.5 text-center text-slate-400">
                                    {attr.worst}
                                  </td>
                                  <td className="py-2 px-2.5 text-center text-slate-400">
                                    {attr.thresh}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                                    {attr.rawValue}
                                  </td>
                                  <td className="py-2 px-3 text-center font-sans">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                        isCrit
                                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                          : isWarn
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      }`}
                                    >
                                      {attr.status || "OK"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : selectedDriveForSpecs.nvmeSpecs && selectedDriveForSpecs.nvmeSpecs.length > 0 ? (
                  /* 1B: NVME TELEMETRY SPECS GRID */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {selectedDriveForSpecs.nvmeSpecs
                      .filter((spec) => {
                        if (!specsFilter.trim()) return true;
                        const q = specsFilter.toLowerCase();
                        return spec.label.toLowerCase().includes(q) || spec.value.toLowerCase().includes(q);
                      })
                      .map((spec, sIdx) => {
                        const isWarn = spec.status === "WARN";
                        const isFail = spec.status === "FAIL";

                        return (
                          <div
                            key={sIdx}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                              isFail
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                                : isWarn
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80"
                            }`}
                          >
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {spec.label}:
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {spec.value}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p>{isEn ? "No structured attributes parsed for this drive. Check raw block below." : "Chưa có bảng thuộc tính chi tiết cho ổ này. Vui lòng xem bản ghi thô bên dưới."}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: RAW MONOSPACE OUTPUT FOR THIS DRIVE */}
            {specsViewMode === "raw" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{selectedDriveForSpecs.rawLines?.length || 0} dòng dữ liệu thô từ smartctl</span>
                  <button
                    onClick={() => {
                      const text = selectedDriveForSpecs.rawLines?.join("\n") || "";
                      navigator.clipboard.writeText(text);
                      setCopiedDriveRaw(true);
                      setTimeout(() => setCopiedDriveRaw(false), 2000);
                    }}
                    className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors font-semibold"
                  >
                    {copiedDriveRaw ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDriveRaw ? "Đã sao chép" : "Chép bản ghi thô"}</span>
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs max-h-[460px] overflow-auto whitespace-pre leading-relaxed select-text border border-slate-800">
                  {selectedDriveForSpecs.rawLines?.map((line, lIdx) => (
                    <div key={lIdx} className="hover:bg-slate-900/60 px-1 py-0.5 rounded">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => {
                  const content = `Ổ đĩa: ${selectedDriveForSpecs.slot} (${selectedDriveForSpecs.model})\nSức khỏe: ${selectedDriveForSpecs.health}\nNhiệt độ: ${selectedDriveForSpecs.tempC}°C\nGiờ chạy: ${selectedDriveForSpecs.powerOnHours}h\nSector hỏng (ID 5): ${selectedDriveForSpecs.reallocatedSectors}\nPending Sector: ${selectedDriveForSpecs.pendingSectors}\nCRC Errors: ${selectedDriveForSpecs.crcErrors}\n\n=== CHI TIẾT THUỘC TÍNH S.M.A.R.T. ===\n${selectedDriveForSpecs.rawLines?.join("\n") || ""}`;
                  navigator.clipboard.writeText(content);
                  setShowAiChatBubble(true);
                  setSelectedDriveForSpecs(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{isEn ? "Ask AI about this drive" : "Hỏi Trợ lý AI về ổ đĩa này"}</span>
              </button>

              <button
                onClick={() => setSelectedDriveForSpecs(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold transition-colors"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
};
