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
} from "lucide-react";

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const primaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Tổng quan", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "docker", label: "Docker", icon: <Boxes className="w-5 h-5" /> },
    { id: "files", label: "Tệp tin", icon: <FolderOpen className="w-5 h-5" /> },
    { id: "monitor", label: "Giám sát", icon: <Activity className="w-5 h-5" /> },
    { id: "settings", label: "Cài đặt", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {primaryTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[56px] transition-all ${
              isActive
                ? "text-sky-500 font-bold scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isActive ? "bg-sky-500/10 text-sky-500" : ""}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
