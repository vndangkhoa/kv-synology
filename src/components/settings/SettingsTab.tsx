"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, ThemeMode } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  loadPersistedSession,
  getSessionRemainingDays,
  saveCurrentSessionExplicit,
  clearPersistedSession,
} from "@/lib/sessionStorage";
import {
  Globe,
  Sun,
  Moon,
  Laptop,
  Power,
  RotateCw,
  Server,
  ShieldCheck,
  Info,
  Clock,
  BookmarkCheck,
  Trash2,
  Shield,
  Save,
  CheckCircle2,
  Download,
  Smartphone,
  Terminal,
  Bot,
  SlidersHorizontal,
  Check,
  ExternalLink,
  ChevronRight,
  LogOut,
  LogIn,
  AlertTriangle,
  X,
} from "lucide-react";

export const SettingsTab: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    experienceMode,
    setExperienceMode,
    session,
    setActiveTab,
    openPowerModal,
    openLoginModal,
    logout,
    t,
  } = useAppStore();

  const [persistInfo, setPersistInfo] = useState<{ expiry: number; daysLeft: number } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [terminalInfo, setTerminalInfo] = useState<{ enable_ssh: boolean; enable_telnet: boolean; ssh_port: number } | null>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalSaving, setTerminalSaving] = useState(false);
  const [sshPortInput, setSshPortInput] = useState("22");
  const [terminalFeedback, setTerminalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const isBeginner = experienceMode === "beginner";

  const refreshPersistInfo = () => {
    const p = loadPersistedSession();
    if (p?.expiry) {
      setPersistInfo({ expiry: p.expiry, daysLeft: getSessionRemainingDays(p.expiry) });
    } else {
      setPersistInfo(null);
    }
  };

  useEffect(() => {
    refreshPersistInfo();
    const id = setInterval(refreshPersistInfo, 60000);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsPwaInstalled(true);
    }
    window.addEventListener("appinstalled", () => setIsPwaInstalled(true));
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [session.sid]);

  useEffect(() => {
    if (!session.isConnected) return;
    setTerminalLoading(true);
    dsmClient
      .getTerminalInfo()
      .then((info) => {
        setTerminalInfo(info);
        setSshPortInput(String(info.ssh_port || 22));
      })
      .catch(() => {})
      .finally(() => setTerminalLoading(false));
  }, [session.isConnected, session.sid]);

  const handleSaveSession = () => {
    if (!session.isConnected) return;
    const clientCfg = dsmClient.getConfig() || {
      host: session.hostname || "192.168.1.10",
      port: 5001,
      https: true,
      account: session.account || "admin",
    };

    saveCurrentSessionExplicit(session, clientCfg);
    refreshPersistInfo();
    setSaveFeedback("Đã lưu phiên làm việc 7 ngày thành công!");
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleClearSession = () => {
    clearPersistedSession();
    refreshPersistInfo();
    setSaveFeedback("Đã xóa phiên lưu trữ.");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveTerminal = async () => {
    const portNum = parseInt(sshPortInput, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setTerminalFeedback({ type: "error", text: "Cổng SSH không hợp lệ (1 - 65535)" });
      return;
    }
    setTerminalSaving(true);
    try {
      const ok = await dsmClient.setTerminal(
        terminalInfo?.enable_ssh ?? true,
        terminalInfo?.enable_telnet ?? false,
        portNum
      );
      if (ok) {
        setTerminalInfo((prev) => (prev ? { ...prev, ssh_port: portNum } : { enable_ssh: true, enable_telnet: false, ssh_port: portNum }));
        setTerminalFeedback({ type: "success", text: `Đã cập nhật cổng SSH sang ${portNum} thành công!` });
      } else {
        setTerminalFeedback({ type: "error", text: "Không thể lưu cổng SSH. Kiểm tra quyền DSM." });
      }
    } catch (e: any) {
      setTerminalFeedback({ type: "error", text: `Lỗi: ${e.message}` });
    } finally {
      setTerminalSaving(false);
      setTimeout(() => setTerminalFeedback(null), 4000);
    }
  };

  const handleToggleSsh = async () => {
    if (!terminalInfo) return;
    const nextState = !terminalInfo.enable_ssh;
    setTerminalSaving(true);
    try {
      const ok = await dsmClient.setTerminal(
        nextState,
        terminalInfo.enable_telnet,
        terminalInfo.ssh_port
      );
      if (ok) {
        setTerminalInfo((prev) => (prev ? { ...prev, enable_ssh: nextState } : null));
        setTerminalFeedback({
          type: "success",
          text: `Đã ${nextState ? "bật" : "tắt"} dịch vụ SSH thành công!`,
        });
      }
    } catch (e: any) {
      setTerminalFeedback({ type: "error", text: `Lỗi: ${e.message}` });
    } finally {
      setTerminalSaving(false);
      setTimeout(() => setTerminalFeedback(null), 4000);
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className={`${isBeginner ? "space-y-2 sm:space-y-3" : "space-y-4 sm:space-y-5"} animate-in fade-in duration-200 w-full`}>
      {/* Toast Feedback */}
      {(saveFeedback || terminalFeedback) && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 shadow-sm ${
            (terminalFeedback?.type === "error")
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{saveFeedback || terminalFeedback?.text}</span>
          </div>
          <button
            onClick={() => {
              setSaveFeedback(null);
              setTerminalFeedback(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner - ultra compact on mobile */}
      <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5"} border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between ${isBeginner ? "gap-1.5 sm:gap-2" : "gap-3"}`}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`${isBeginner ? "p-1.5 sm:p-2 rounded-lg sm:rounded-xl" : "p-2.5 sm:p-3 rounded-2xl"} bg-sky-500/10 text-sky-500 shrink-0`}>
            <SlidersHorizontal className={`${isBeginner ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-6 sm:h-6"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`${isBeginner ? "text-sm" : "text-base sm:text-lg"} font-bold text-slate-900 dark:text-white`}>
                {t.settings.title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {session.isConnected ? (session.sid === "mock_sid" ? "Chế độ Demo" : "Đã kết nối") : "Chưa kết nối"}
              </span>
              {isBeginner && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🟢 Cơ bản</span>
              )}
            </div>
            <p className={`${isBeginner ? "text-[11px]" : "text-xs"} text-slate-500 dark:text-slate-400 mt-0.5`}>
              {isBeginner ? "Tài khoản, giao diện và nguồn — gọn nhẹ cho người mới." : "Cấu hình tài khoản, giao diện, SSH, kiểm soát nguồn và tích hợp API / MCP"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {session.isConnected ? (
            <button
              onClick={() => openLoginModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-500" />
              <span>Chuyển tài khoản</span>
            </button>
          ) : (
            <button
              onClick={() => openLoginModal(true)}
              className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Kết nối NAS</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Settings Grid - compact for beginner & mobile */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isBeginner ? "gap-2 sm:gap-3" : "gap-3.5 sm:gap-4"}`}>
        {/* CARD 1: Connection & Session */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-500" />
                Phiên kết nối & Thiết bị
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {session.model || "DS920+"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Máy chủ (Host):</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {session.hostname || "192.168.1.10"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Tài khoản:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {session.account || "admin"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Phiên bản DSM:</span>
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                  {session.versionString || "DSM 7.2.1-69057"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Lưu phiên 7 ngày:</span>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {persistInfo ? `Còn ${persistInfo.daysLeft} ngày` : "Chưa kích hoạt"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSaveSession}
              className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Gia hạn 7 ngày</span>
            </button>
            {persistInfo && (
              <button
                onClick={handleClearSession}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 transition-colors"
                title="Xóa phiên đã lưu"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: Appearance & Localization */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                Giao diện & Ngôn ngữ
              </h3>
            </div>

            {/* Theme Toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Chủ đề hiển thị (Theme)
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                {[
                  { id: "system", label: "Hệ thống", icon: Laptop },
                  { id: "light", label: "Sáng", icon: Sun },
                  { id: "dark", label: "Tối", icon: Moon },
                ].map((tOpt) => {
                  const Icon = tOpt.icon;
                  const isSel = theme === tOpt.id;
                  return (
                    <button
                      key={tOpt.id}
                      onClick={() => setTheme(tOpt.id as ThemeMode)}
                      className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                        isSel
                          ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tOpt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Ngôn ngữ (Language)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                {[
                  { id: "vi", label: "🇻🇳 Tiếng Việt" },
                  { id: "en", label: "🇬🇧 English" },
                ].map((lOpt) => {
                  const isSel = language === lOpt.id;
                  return (
                    <button
                      key={lOpt.id}
                      onClick={() => setLanguage(lOpt.id as any)}
                      className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                        isSel
                          ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {lOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Mode Toggle: Beginner vs Advance */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Chế độ Trải nghiệm (Experience Mode)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setExperienceMode("beginner")}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    experienceMode === "beginner"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${experienceMode === "beginner" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  <span>🟢 Cơ bản (Người mới)</span>
                </button>
                <button
                  onClick={() => setExperienceMode("advance")}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    experienceMode === "advance"
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span>⚡ Nâng cao (Pro)</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {experienceMode === "beginner"
                  ? "Chế độ Cơ bản tinh gọn các chỉ số, ẩn các bảng OID/socket phức tạp, phù hợp người mới dùng."
                  : "Chế độ Nâng cao mở khóa toàn bộ biểu đồ chi tiết per-core, socket TCP, OID MIB và terminal."}
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Tự động ghi nhớ tùy chọn vào trình duyệt của bạn.
          </div>
        </div>

        {/* CARD 3: Power & Lifecycle Management */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Power className="w-4 h-4 text-rose-500" />
                Kiểm soát Nguồn thiết bị
              </h3>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hoạt động
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Thực hiện tắt máy hoặc khởi động lại Synology NAS từ xa an toàn với hộp thoại xác nhận bảo vệ.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => openPowerModal("reboot")}
              className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all border border-amber-500/20 flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Khởi động lại</span>
            </button>
            <button
              onClick={() => openPowerModal("shutdown")}
              className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Tắt máy (Shutdown)</span>
            </button>
          </div>
        </div>

        {/* Beginner toggle for advanced cards - mobile ultra compact */}
        {isBeginner && !showAdvancedSettings && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              🔧 <strong>4 cài đặt nâng cao</strong> (SSH, AI &amp; MCP, PWA, Tường lửa) đang được gọn bớt cho người mới.
            </span>
            <button
              onClick={() => setShowAdvancedSettings(true)}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              Hiển thị thêm
            </button>
          </div>
        )}

        {(!isBeginner || showAdvancedSettings) && (
          <>
        {/* CARD 4: Terminal & SSH Port Management */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Cấu hình Terminal SSH
              </h3>
              <button
                onClick={handleToggleSsh}
                disabled={terminalLoading || terminalSaving}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  terminalInfo?.enable_ssh
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}
              >
                {terminalInfo?.enable_ssh ? "SSH: Đang bật" : "SSH: Đã tắt"}
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Số hiệu cổng SSH (Port)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={sshPortInput}
                  onChange={(e) => setSshPortInput(e.target.value)}
                  placeholder="22"
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={handleSaveTerminal}
                  disabled={terminalSaving || terminalLoading}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {terminalSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu cổng</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span>API: <code className="font-mono text-slate-600 dark:text-slate-300">SYNO.Core.Terminal v3</code></span>
            <span>Telnet: {terminalInfo?.enable_telnet ? "Bật" : "Tắt"}</span>
          </div>
        </div>

        {/* CARD 5: AI & MCP Integration */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-500" />
                Tích hợp AI & MCP Server
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                42 Tools Ready
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cung cấp đầy đủ công cụ Model Context Protocol cho Claude, Cursor, VS Code, Roo Code điều khiển DSM trực tiếp.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("mcp")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
              <span>Xem tài liệu & Tạo file cấu hình AI</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 6: PWA & Client App */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                Ứng dụng Web PWA
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                v1.0.0 Pro
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cài đặt DSM Helper như một ứng dụng độc lập trên máy tính và điện thoại để nhận thông báo và truy cập nhanh.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {isPwaInstalled ? (
              <div className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Đã cài đặt trên thiết bị</span>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài đặt ứng dụng PWA</span>
              </button>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold text-center">
                Sẵn sàng qua trình duyệt
              </div>
            )}
          </div>
        </div>

        {/* CARD 7: Firewall & Security */}
        <div className={`bg-white dark:bg-slate-900 ${isBeginner ? "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-sm space-y-2 sm:space-y-3" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"} border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between`}>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Tường lửa & Bảo mật DSM
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Đang bảo vệ
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Thiết lập danh sách quy tắc tường lửa lọc cổng, kích hoạt tự động khóa IP Brute-Force và chống DoS.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("firewall")}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Quản trị Quy tắc Tường lửa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
          </>
        )}
        {isBeginner && showAdvancedSettings && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
            <button
              onClick={() => setShowAdvancedSettings(false)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              Thu gọn cài đặt nâng cao ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
