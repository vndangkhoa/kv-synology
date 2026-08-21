import { create } from "zustand";
import { Language, translations } from "../i18n";
import { DSMSession, SystemInfo, SystemUtilization } from "../dsm/types";
import { dsmClient } from "../dsm/client";

export type NavTab = "dashboard" | "monitor" | "files" | "docker" | "download" | "storage" | "packages" | "settings";
export type ThemeMode = "system" | "dark" | "light";

interface AppState {
  language: Language;
  theme: ThemeMode;
  activeTab: NavTab;
  session: DSMSession;
  systemInfo: SystemInfo | null;
  utilization: SystemUtilization | null;
  utilizationHistory: SystemUtilization[];
  isLoginModalOpen: boolean;
  isPowerModalOpen: boolean;
  isMobileDrawerOpen: boolean;
  isSidebarCollapsed: boolean;
  powerModalType: "reboot" | "shutdown";
  
  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveTab: (tab: NavTab) => void;
  setSession: (session: DSMSession) => void;
  setSystemInfo: (info: SystemInfo) => void;
  updateUtilization: (util: SystemUtilization) => void;
  openLoginModal: (open: boolean) => void;
  openPowerModal: (type: "reboot" | "shutdown") => void;
  closePowerModal: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  logout: () => void;
  t: typeof translations["vi"];
}

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  language: "vi",
  theme: "system",
  activeTab: "dashboard",
  session: {
    sid: "demo-session-token-12345",
    isConnected: true,
    isDemo: true,
    dsmVersion: 7,
    versionString: "DSM 7.2.1-69057 (Demo)",
    model: "DS920+",
    hostname: "Synology-Demo",
    account: "admin",
  },
  systemInfo: null,
  utilization: null,
  utilizationHistory: [],
  isLoginModalOpen: false,
  isPowerModalOpen: false,
  isMobileDrawerOpen: false,
  isSidebarCollapsed: false,
  powerModalType: "reboot",
  t: translations["vi"],

  setLanguage: (lang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dsm_lang", lang);
    }
    set({ language: lang, t: translations[lang] });
  },

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dsm_theme", theme);
      applyThemeToDOM(theme);
    }
    set({ theme });
  },

  setActiveTab: (tab: NavTab) => set({ activeTab: tab, isMobileDrawerOpen: false }),

  setSession: (session: DSMSession) => set({ session }),

  setSystemInfo: (info: SystemInfo) => set({ systemInfo: info }),

  updateUtilization: (util: SystemUtilization) => {
    set((state) => {
      const history = [...state.utilizationHistory, util].slice(-30);
      return {
        utilization: util,
        utilizationHistory: history,
      };
    });
  },

  openLoginModal: (open: boolean) => set({ isLoginModalOpen: open }),

  openPowerModal: (type: "reboot" | "shutdown") => set({ isPowerModalOpen: true, powerModalType: type }),

  closePowerModal: () => set({ isPowerModalOpen: false }),

  setMobileDrawerOpen: (open: boolean) => set({ isMobileDrawerOpen: open }),

  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  logout: () => {
    dsmClient.logout();
    set({
      session: {
        sid: "",
        isConnected: false,
        isDemo: false,
        dsmVersion: 7,
        versionString: "",
        model: "",
        hostname: "",
        account: "",
      },
      systemInfo: null,
      utilization: null,
      utilizationHistory: [],
    });
  },
}));
