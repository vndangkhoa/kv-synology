"use client";

import React from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { formatSpeed } from "@/lib/utils";
import { NasSwitcherDropdown } from "./NasSwitcherDropdown";
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
  Bell,
} from "lucide-react";

export const Header: React.FC = () => {
  const {
    activeTab,
    language,
    setLanguage,
    theme,
    setTheme,
    experienceMode,
    setExperienceMode,
    session,
    utilization,
    openLoginModal,
    openPowerModal,
    setMobileDrawerOpen,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    setActiveTab,
    notifications,
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
      case "services":
        return t.nav.services;
      case "firewall":
        return t.nav.firewall;
      case "notifications":
        return t.nav.notifications;
      case "terminal":
        return t.nav.terminal;
      case "mcp":
        return t.nav.mcp;
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
    <header className="h-14 sm:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-1.5 sm:gap-3 w-full max-w-full overflow-x-hidden">
      {/* Left: Hamburger Sidebar Toggle + Full Title */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Mở menu"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
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

        <h2 className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[80px] xs:max-w-[110px] sm:max-w-none">
          {getTabTitle()}
        </h2>

        {/* Multi-NAS Switcher */}
        <div className="hidden sm:block">
          <NasSwitcherDropdown />
        </div>
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
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Experience Mode Switcher (Beginner vs Advance) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-[10px] sm:text-[11px] font-bold shadow-xs">
          <button
            onClick={() => setExperienceMode("beginner")}
            className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              experienceMode === "beginner"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
            title="Chế độ Cơ bản (Thân thiện, dễ dùng cho người mới)"
          >
            <span className={`w-2 h-2 rounded-full ${experienceMode === "beginner" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span className="hidden sm:inline">Cơ bản</span>
          </button>
          <button
            onClick={() => setExperienceMode("advance")}
            className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              experienceMode === "advance"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
            title="Chế độ Nâng cao (Đầy đủ thông số kỹ thuật, OID MIB, sockets)"
          >
            <span className="text-amber-500">⚡</span>
            <span className="hidden sm:inline">Nâng cao</span>
          </button>
        </div>

        {/* Language Switcher (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold">
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
          className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          title={`Giao diện: ${theme === "system" ? "Hệ thống" : theme === "dark" ? "Tối" : "Sáng"}`}
        >
          {getThemeIcon()}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => setActiveTab("notifications")}
          className="relative p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
          title={t.nav.notifications}
        >
          <Bell className="w-4 h-4" />
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
            </span>
          )}
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

        {/* Mobile Multi-NAS Switcher Trigger */}
        <div className="sm:hidden">
          <NasSwitcherDropdown />
        </div>

        {/* Connect Button */}
        {!session.isConnected && (
          <button
            onClick={() => openLoginModal(true)}
            className="hidden sm:flex px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all shrink-0"
          >
            {t.common.connect}
          </button>
        )}
      </div>
    </header>
  );
};
