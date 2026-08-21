"use client";

import React from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { formatSpeed } from "@/lib/utils";
import {
  Sun,
  Moon,
  Laptop,
  Power,
  Cpu,
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export const Header: React.FC = () => {
  const {
    activeTab,
    language,
    setLanguage,
    theme,
    setTheme,
    session,
    utilization,
    openLoginModal,
    openPowerModal,
    setMobileDrawerOpen,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    t,
  } = useAppStore();

  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return t.nav.dashboard;
      case "monitor":
        return t.nav.resourceMonitor;
      case "files":
        return t.nav.fileStation;
      case "docker":
        return t.nav.docker;
      case "download":
        return t.nav.downloadStation;
      case "storage":
        return t.nav.storageManager;
      case "packages":
        return t.nav.packageCenter;
      case "settings":
        return t.nav.settings;
      default:
        return "";
    }
  };

  const handleCycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  const getThemeIcon = () => {
    if (theme === "system") return <Laptop className="w-4 h-4 text-sky-500" />;
    if (theme === "dark") return <Moon className="w-4 h-4 text-indigo-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
      {/* Left: Hamburger Sidebar Toggle + Full Title */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden md:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-sky-500" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
          {getTabTitle()}
        </h2>

        {session.isConnected && (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {session.isDemo ? "Demo" : session.model || session.hostname}
          </span>
        )}
      </div>

      {/* Center Live Telemetry */}
      {utilization && (
        <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-500" />
            <span>CPU:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {utilization.cpuPercent}%
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>RAM:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {utilization.memoryPercent}%
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>↓ {formatSpeed(utilization.networkRxBytes)}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>↑ {formatSpeed(utilization.networkTxBytes)}</span>
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold">
          <button
            onClick={() => setLanguage("vi")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              language === "vi"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
            title="Tiếng Việt (Mặc định)"
          >
            VI
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              language === "en"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
            title="English"
          >
            EN
          </button>
        </div>

        {/* 3-State Theme Button */}
        <button
          onClick={handleCycleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          title={`Giao diện: ${theme === "system" ? "Hệ thống" : theme === "dark" ? "Tối" : "Sáng"}`}
        >
          {getThemeIcon()}
        </button>

        {/* Power Menu */}
        {session.isConnected && (
          <button
            onClick={() => openPowerModal("reboot")}
            className="hidden sm:flex p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title={t.settings.powerControls}
          >
            <Power className="w-4 h-4" />
          </button>
        )}

        {/* Connect / Demo Switch Button */}
        {(!session.isConnected || session.isDemo) && (
          <button
            onClick={() => openLoginModal(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all shrink-0"
          >
            {session.isDemo ? "Kết nối thật" : t.common.connect}
          </button>
        )}
      </div>
    </header>
  );
};
