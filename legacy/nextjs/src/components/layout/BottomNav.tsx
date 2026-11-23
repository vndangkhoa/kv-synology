"use client";

import React from "react";
import { useAppStore, NavTab } from "@/lib/store/useAppStore";
import { hapticSelection } from "@/lib/native";
import {
  LayoutDashboard,
  FolderOpen,
  Boxes,
  DownloadCloud,
  HardDrive,
  Menu,
} from "lucide-react";

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setMobileDrawerOpen, isMobileDrawerOpen, notifications, t } = useAppStore();

  const unreadCount = notifications ? notifications.filter((n) => !n.read).length : 0;

  const primaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: t.nav.dashboard || "Tổng quan", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "files", label: t.nav.fileStation || "Tập tin", icon: <FolderOpen className="w-5 h-5" /> },
    { id: "docker", label: t.nav.docker || "Docker", icon: <Boxes className="w-5 h-5" /> },
    { id: "download", label: t.nav.downloadStation || "Tải xuống", icon: <DownloadCloud className="w-5 h-5" /> },
    { id: "storage", label: t.nav.storageManager || "Lưu trữ", icon: <HardDrive className="w-5 h-5" /> },
  ];

  const handleTabClick = (tabId: NavTab) => {
    hapticSelection();
    setActiveTab(tabId);
    if (isMobileDrawerOpen) {
      setMobileDrawerOpen(false);
    }
  };

  const handleMenuClick = () => {
    hapticSelection();
    setMobileDrawerOpen(!isMobileDrawerOpen);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl w-full max-w-full">
      {primaryTabs.map((tab) => {
        const isActive = activeTab === tab.id && !isMobileDrawerOpen;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-0.5 rounded-2xl transition-all cursor-pointer select-none active:scale-95 text-center ${
              isActive
                ? "text-sky-600 dark:text-sky-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            }`}
          >
            {/* Material 3 Capsule Indicator */}
            <div
              className={`px-3 py-1 rounded-2xl transition-all flex items-center justify-center ${
                isActive
                  ? "bg-sky-500/15 dark:bg-sky-400/20 text-sky-600 dark:text-sky-400 scale-105 shadow-xs"
                  : "bg-transparent"
              }`}
            >
              {tab.icon}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate w-full block text-center">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* 6. More / Drawer Button matching Android Navigation Suite */}
      <button
        onClick={handleMenuClick}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center py-0.5 rounded-2xl transition-all cursor-pointer select-none active:scale-95 text-center ${
          isMobileDrawerOpen
            ? "text-sky-600 dark:text-sky-400 font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
        }`}
      >
        <div
          className={`relative px-3 py-1 rounded-2xl transition-all flex items-center justify-center ${
            isMobileDrawerOpen
              ? "bg-sky-500/15 dark:bg-sky-400/20 text-sky-600 dark:text-sky-400 scale-105 shadow-xs"
              : "bg-transparent"
          }`}
        >
          <Menu className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight truncate w-full block text-center">
          Thêm
        </span>
      </button>
    </nav>
  );
};
