"use client";

import React, { useEffect } from "react";
import { useAppStore, ThemeMode } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoginModal } from "@/components/layout/LoginModal";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { ResourceMonitorTab } from "@/components/monitor/ResourceMonitorTab";
import { FileStationTab } from "@/components/files/FileStationTab";
import { DockerTab } from "@/components/docker/DockerTab";
import { DownloadStationTab } from "@/components/download/DownloadStationTab";
import { StorageManagerTab } from "@/components/storage/StorageManagerTab";
import { PackageCenterTab } from "@/components/packages/PackageCenterTab";
import { SettingsTab } from "@/components/settings/SettingsTab";

export default function Home() {
  const { activeTab, session, setSystemInfo, updateUtilization, setLanguage, setTheme } = useAppStore();

  useEffect(() => {
    // Theme & Language Initialization
    try {
      const storedTheme = (localStorage.getItem("dsm_theme") as ThemeMode) || "system";
      setTheme(storedTheme);

      const storedLang = localStorage.getItem("dsm_lang");
      if (storedLang === "vi" || storedLang === "en") {
        setLanguage(storedLang);
      }
    } catch (_) {}

    // Listen to OS system color scheme changes dynamically
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem("dsm_theme") || "system";
      if (currentTheme === "system") {
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [setLanguage, setTheme]);

  // Polling loop for live telemetry
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchTelemetry = async () => {
      if (session.isConnected) {
        const util = await dsmClient.getUtilization();
        updateUtilization(util);
      }
    };

    const fetchInfo = async () => {
      if (session.isConnected) {
        const info = await dsmClient.getSystemInfo();
        setSystemInfo(info);
      }
    };

    fetchInfo();
    fetchTelemetry();

    timer = setInterval(fetchTelemetry, 2500);

    return () => clearInterval(timer);
  }, [session.isConnected, setSystemInfo, updateUtilization]);

  const renderActiveContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <OverviewTab />;
      case "monitor":
        return <ResourceMonitorTab />;
      case "files":
        return <FileStationTab />;
      case "docker":
        return <DockerTab />;
      case "download":
        return <DownloadStationTab />;
      case "storage":
        return <StorageManagerTab />;
      case "packages":
        return <PackageCenterTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-sky-500 selection:text-white transition-colors">
      {/* Sidebar (Desktop + Mobile Slide-over Drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto pb-20 md:pb-8">
          {renderActiveContent()}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />

      {/* Global Login Dialog */}
      <LoginModal />
    </div>
  );
}
