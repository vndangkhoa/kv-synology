"use client";

import React from "react";
import { useAppStore, NavTab } from "@/lib/store/useAppStore";
import {
  LayoutDashboard,
  Activity,
  Radio,
  Globe,
  FolderOpen,
  Boxes,
  DownloadCloud,
  HardDrive,
  Package,
  Settings,
  Server,
  LogOut,
  LogIn,
  X,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Bell,
  Terminal,
  Bot,
  Shield,
  Gauge,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    session,
    logout,
    openLoginModal,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    language,
    setLanguage,
    t,
  } = useAppStore();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: t.nav.dashboard, icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "monitor", label: t.nav.resourceMonitor, icon: <Activity className="w-5 h-5" /> },
    { id: "snmp", label: t.nav.snmp, icon: <Radio className="w-5 h-5" /> },
    { id: "traffic", label: t.nav.traffic, icon: <Globe className="w-5 h-5" /> },
    { id: "files", label: t.nav.fileStation, icon: <FolderOpen className="w-5 h-5" /> },
    { id: "docker", label: t.nav.docker, icon: <Boxes className="w-5 h-5" /> },
    { id: "download", label: t.nav.downloadStation, icon: <DownloadCloud className="w-5 h-5" /> },
    { id: "storage", label: t.nav.storageManager, icon: <HardDrive className="w-5 h-5" /> },
    { id: "packages", label: t.nav.packageCenter, icon: <Package className="w-5 h-5" /> },
    { id: "services", label: t.nav.services, icon: <Settings2 className="w-5 h-5" /> },
    { id: "firewall", label: t.nav.firewall, icon: <Shield className="w-5 h-5" /> },
    { id: "notifications", label: t.nav.notifications, icon: <Bell className="w-5 h-5" /> },
    { id: "terminal", label: t.nav.terminal, icon: <Terminal className="w-5 h-5" /> },
    { id: "mcp", label: t.nav.mcp, icon: <Bot className="w-5 h-5" /> },
    { id: "settings", label: t.nav.settings, icon: <Settings className="w-5 h-5" /> },
  ];

  const renderContent = (collapsed = false) => (
    <div className="flex flex-col justify-between h-full">
      {/* Top Header & Navigation */}
      <div>
        {/* Brand Header */}
        <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-sky-500/20 shrink-0 ring-1 ring-sky-500/10">
              <img src="/logo.svg" alt="S logo" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                  DSM Helper
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  Web Edition
                </p>
              </div>
            )}
          </div>

          {/* Close button inside mobile drawer */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Status Badge */}
        <div className="p-3">
          <div
            onClick={() => {
              if (!session.isConnected) openLoginModal(true);
              setMobileDrawerOpen(false);
            }}
            title={session.isConnected ? session.hostname : "Chưa kết nối"}
            className={`flex items-center ${collapsed ? "justify-center p-2.5" : "justify-between p-2.5"} rounded-xl border text-xs cursor-pointer transition-all ${
              session.isConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500"
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  session.isConnected
                    ? "bg-emerald-500"
                    : "bg-slate-400"
                }`}
              />
              {!collapsed && (
                <span className="font-semibold truncate">
                  {session.isConnected
                    ? session.hostname
                    : t.common.disconnected}
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                {(session.versionString || "DSM").split(" ")[0] || "DSM"}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="px-2.5 space-y-1 mt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileDrawerOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? "justify-center px-2 py-3" : "space-x-3 px-3.5 py-3"} rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile, Language & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {session.isConnected ? (
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                {(session.account || "A").charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {session.account || "User"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {session.model || "Synology"}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => {
                  logout();
                  setMobileDrawerOpen(false);
                }}
                title={t.common.disconnect}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              openLoginModal(true);
              setMobileDrawerOpen(false);
            }}
            title={t.common.connect}
            className={`w-full flex items-center justify-center ${collapsed ? "p-3" : "space-x-2 py-3 px-4"} bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-600/20 transition-all`}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t.common.connect} NAS</span>}
          </button>
        )}

        {!collapsed && (
          <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold w-full">
            <button
              onClick={() => setLanguage("vi")}
              className={`flex-1 py-1 rounded-lg transition-all text-center ${
                language === "vi"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`flex-1 py-1 rounded-lg transition-all text-center ${
                language === "en"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Full or Collapsed Rail) */}
      <aside
        className={`hidden md:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 z-20 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent(isSidebarCollapsed)}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-left duration-200 flex flex-col justify-between">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
