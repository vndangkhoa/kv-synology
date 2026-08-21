"use client";

import React from "react";
import { useAppStore, ThemeMode } from "@/lib/store/useAppStore";
import { PowerModal } from "./PowerModal";
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
} from "lucide-react";

export const SettingsTab: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    session,
    openPowerModal,
    openLoginModal,
    t,
  } = useAppStore();

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200 pb-16 md:pb-6">
      {/* Theme Section (3 Options: System, Dark, Light) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.settings.theme}
            </h4>
            <p className="text-xs text-slate-400">Chọn phong cách hiển thị (Mặc định: Theo hệ thống)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* System Default */}
          <button
            onClick={() => setTheme("system")}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
              theme === "system"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Laptop className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.settings.themeSystem}</p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Tự động (Mặc định)</p>
              </div>
            </div>
            {theme === "system" && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
              theme === "dark"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.settings.themeDark}</p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Nền tối hiện đại</p>
              </div>
            </div>
            {theme === "dark" && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
          </button>

          {/* Light Mode */}
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
              theme === "light"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.settings.themeLight}</p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Nền sáng</p>
              </div>
            </div>
            {theme === "light" && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.settings.language}
            </h4>
            <p className="text-xs text-slate-400">{t.settings.languageDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setLanguage("vi")}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
              language === "vi"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">Tiếng Việt</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5">Mặc định (Default)</p>
            </div>
            {language === "vi" && (
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            )}
          </button>

          <button
            onClick={() => setLanguage("en")}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
              language === "en"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">English</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5">Global standard</p>
            </div>
            {language === "en" && (
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            )}
          </button>
        </div>
      </div>

      {/* Active NAS Connection */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.settings.connectionSettings}
              </h4>
              <p className="text-xs text-slate-400">
                {session.isConnected ? (session.isDemo ? "Chế độ Demo" : "Đã kết nối trực tiếp") : "Chưa kết nối"}
              </p>
            </div>
          </div>

          <button
            onClick={() => openLoginModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            {session.isConnected ? "Đổi kết nối NAS" : t.common.connect}
          </button>
        </div>

        {session.isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Máy chủ (Host):</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">{session.hostname}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Tài khoản (User):</span>
              <span className="font-semibold text-slate-900 dark:text-white">{session.account}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Phiên bản DSM:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{session.versionString}</span>
            </div>
          </div>
        )}
      </div>

      {/* Power Operations */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.settings.powerControls}
            </h4>
            <p className="text-xs text-slate-400">Khởi động lại hoặc tắt nguồn thiết bị Synology an toàn</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={() => openPowerModal("reboot")}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all"
          >
            <RotateCw className="w-4 h-4" />
            <span>{t.settings.reboot}</span>
          </button>

          <button
            onClick={() => openPowerModal("shutdown")}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all"
          >
            <Power className="w-4 h-4" />
            <span>{t.settings.shutdown}</span>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-2">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-sky-500" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
            {t.settings.about}
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.settings.aboutDesc}
        </p>
      </div>

      {/* Power Action Confirmation Modal */}
      <PowerModal />
    </div>
  );
};
