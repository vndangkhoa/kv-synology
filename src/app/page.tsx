"use client";

import React, { useEffect } from "react";
import { useAppStore, ThemeMode } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { NasTabBar } from "@/components/layout/NasTabBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoginModal } from "@/components/layout/LoginModal";
import { PowerModal } from "@/components/settings/PowerModal";
import { AiChatBubble } from "@/components/ai/AiChatBubble";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { ResourceMonitorTab } from "@/components/monitor/ResourceMonitorTab";
import { SnmpTab } from "@/components/snmp/SnmpTab";
import { NetworkTrafficTab } from "@/components/traffic/NetworkTrafficTab";
import { FileStationTab } from "@/components/files/FileStationTab";
import { DockerTab } from "@/components/docker/DockerTab";
import { DownloadStationTab } from "@/components/download/DownloadStationTab";
import { StorageManagerTab } from "@/components/storage/StorageManagerTab";
import { PackageCenterTab } from "@/components/packages/PackageCenterTab";
import { ServicesTab } from "@/components/services/ServicesTab";
import { ReverseProxyTab } from "@/components/services/ReverseProxyTab";
import { FirewallManagerTab } from "@/components/security/FirewallManagerTab";
import { PermissionInspectorTab } from "@/components/permissions/PermissionInspectorTab";
import { NotificationsTab } from "@/components/notifications/NotificationsTab";
import { TerminalTab } from "@/components/terminal/TerminalTab";
import { McpDocsTab } from "@/components/mcp/McpDocsTab";
import { SettingsTab } from "@/components/settings/SettingsTab";

export default function Home() {
  const {
    activeTab,
    session,
    setSystemInfo,
    updateUtilization,
    setLanguage,
    setTheme,
    setExperienceMode,
    fetchNotifications,
    setSession,
    showAiChatBubble,
    setShowAiChatBubble,
    setAiProvider,
    setAiApiKey,
    setAiModel,
    setAiCustomBaseUrl,
  } = useAppStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Theme, Language & Experience Mode Initialization
    try {
      const storedTheme = (localStorage.getItem("dsm_theme") as ThemeMode) || "system";
      setTheme(storedTheme);

      const storedLang = localStorage.getItem("dsm_lang");
      if (storedLang === "vi" || storedLang === "en") {
        setLanguage(storedLang);
      }

      const storedExp = localStorage.getItem("dsm_experience_mode");
      if (storedExp === "beginner" || storedExp === "advance") {
        setExperienceMode(storedExp as any);
      }

      const storedShowBubble = localStorage.getItem("dsm_show_ai_bubble");
      if (storedShowBubble !== null) {
        setShowAiChatBubble(storedShowBubble === "true");
      }

      const storedAiProvider = localStorage.getItem("dsm_ai_provider");
      if (storedAiProvider) {
        setAiProvider(storedAiProvider as any);
      }

      const storedAiKeys = localStorage.getItem("dsm_ai_keys");
      if (storedAiKeys) {
        const parsed = JSON.parse(storedAiKeys);
        Object.entries(parsed).forEach(([k, v]) => setAiApiKey(k, v as string));
      }

      const storedAiModels = localStorage.getItem("dsm_ai_models");
      if (storedAiModels) {
        const parsed = JSON.parse(storedAiModels);
        Object.entries(parsed).forEach(([k, v]) => setAiModel(k, v as string));
      }

      const storedBaseUrls = localStorage.getItem("dsm_ai_base_urls");
      if (storedBaseUrls) {
        const parsed = JSON.parse(storedBaseUrls);
        Object.entries(parsed).forEach(([k, v]) => setAiCustomBaseUrl(k, v as string));
      }
    } catch (_) {}

    // Restore persisted 7-day session if available
    try {
      const raw = localStorage.getItem("dsm_session_v2");
      if (raw) {
        const persisted = JSON.parse(raw);
        const now = Date.now();
        if (persisted?.expiry && now < persisted.expiry && persisted.session?.isConnected) {
          // restore client session + config
          dsmClient.setSession(persisted.session, persisted.config as any);
          // also ensure store reflects restored session
          setSession(persisted.session);
          // verify sid still valid in background; if invalid, fallback will clear on next fetch
          // proactive check: try lightweight call, ignore error
          dsmClient.getSystemInfo().catch(() => {
            // if DSM reports invalid sid, next polling will handle, but we can also clear
            // keep as is; user will be prompted to re-login on next action
          });
        } else if (persisted?.expiry && now >= persisted.expiry) {
          localStorage.removeItem("dsm_session_v2");
        }
      }
    } catch {}

    // Listen to OS system color scheme changes dynamically
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem("dsm_theme") || "system";
      if (currentTheme === "system") {
        if (e.matches) {
          document.documentElement.classList.add("dark", "gemini");
        } else {
          document.documentElement.classList.remove("dark", "gemini");
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [setLanguage, setTheme, setSession]);

  // Polling loop for live telemetry + notifications
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchTelemetry = async () => {
      if (session.isConnected) {
        try {
          const util = await dsmClient.getUtilization();
          updateUtilization(util);
        } catch (_) {}
      }
    };

    const fetchInfo = async () => {
      if (session.isConnected) {
        try {
          const info = await dsmClient.getSystemInfo();
          setSystemInfo(info);
          fetchNotifications();
        } catch (_) {}
      }
    };

    fetchInfo();
    fetchTelemetry();

    timer = setInterval(fetchTelemetry, 2500);
    const notifTimer = setInterval(() => { if (session.isConnected) fetchNotifications(true); }, 30000);

    return () => { clearInterval(timer); clearInterval(notifTimer); };
  }, [session.isConnected, setSystemInfo, updateUtilization, fetchNotifications]);

  // Auto scroll to top when switching tabs (mobile + desktop)
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const renderActiveContent = () => {
    if (!mounted) {
      return <div className="h-[60vh] bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-200 dark:border-slate-800" />;
    }
    switch (activeTab) {
      case "dashboard":
        return <OverviewTab />;
      case "monitor":
        return <ResourceMonitorTab />;
      case "snmp":
        return <SnmpTab />;
      case "traffic":
        return <NetworkTrafficTab />;
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
      case "services":
        return <ServicesTab />;
      case "reverse-proxy":
        return <ReverseProxyTab />;
      case "firewall":
        return <FirewallManagerTab />;
      case "permissions":
        return <PermissionInspectorTab />;
      case "notifications":
        return <NotificationsTab />;
      case "terminal":
        return <TerminalTab />;
      case "mcp":
        return <McpDocsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div suppressHydrationWarning className="flex h-screen w-full max-w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-sky-500 selection:text-white transition-colors">
      {/* Sidebar (Desktop + Mobile Slide-over Drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <NasTabBar />

        <main className="flex-1 min-h-0 p-2.5 sm:p-4 lg:p-5 w-full max-w-full overflow-y-auto overflow-x-hidden pb-24 md:pb-6">
          <div className="w-full max-w-[1720px] mx-auto min-w-0">
            {renderActiveContent()}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />

      {/* Global Login Dialog */}
      <LoginModal />
      {/* Global Power Modal (Restart/Shutdown) - available from any tab */}
      <PowerModal />
      {/* Global AI Chat Bubble - floating on all pages */}
      <AiChatBubble />
    </div>
  );
}
