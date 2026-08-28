"use client";

import React from "react";
import { useAppStore, NavTab } from "@/lib/store/useAppStore";
import {
  LayoutDashboard,
  Activity,
  FolderOpen,
  Boxes,
  Settings,
  Settings2,
  Bell,
  Terminal,
  Gauge,
} from "lucide-react";

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const primaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Tổng quan", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "docker", label: "Docker", icon: <Boxes className="w-5 h-5" /> },
    { id: "files", label: "Tệp tin", icon: <FolderOpen className="w-5 h-5" /> },
    { id: "monitor", label: "Giám sát", icon: <Activity className="w-5 h-5" /> },
    { id: "snmp", label: "SNMP", icon: <Gauge className="w-5 h-5" /> },
    { id: "settings", label: "Cài đặt", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-1 py-1 flex items-center justify-between pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg w-full max-w-full overflow-x-hidden">
      {primaryTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 text-center ${
              isActive
                ? "text-sky-600 dark:text-sky-400 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 scale-105 shadow-xs" : ""}`}>
              {tab.icon}
            </div>
            <span className="text-[9.5px] xs:text-[10px] mt-0.5 tracking-tight truncate w-full block text-center">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
