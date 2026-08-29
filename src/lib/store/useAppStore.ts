import { create } from "zustand";
import { Language, translations } from "../i18n";
import { DSMSession, SystemInfo, SystemUtilization, NotificationItem, AppNotifyItem, AiProviderType } from "../dsm/types";
import { dsmClient } from "../dsm/client";
import { clearPersistedSession } from "../sessionStorage";

export type NavTab = "dashboard" | "monitor" | "snmp" | "traffic" | "files" | "docker" | "download" | "storage" | "packages" | "services" | "firewall" | "notifications" | "terminal" | "mcp" | "settings";
export type ThemeMode = "system" | "light" | "gemini" | "dark";
export type ExperienceMode = "beginner" | "advance";

interface AppState {
  language: Language;
  theme: ThemeMode;
  experienceMode: ExperienceMode;
  activeTab: NavTab;
  session: DSMSession;
  systemInfo: SystemInfo | null;
  utilization: SystemUtilization | null;
  utilizationHistory: SystemUtilization[];
  isLoginModalOpen: boolean;
  isPowerModalOpen: boolean;
  isAiChatOpen: boolean;
  showAiChatBubble: boolean;
  aiProvider: AiProviderType;
  aiApiKeys: Record<string, string>;
  aiModels: Record<string, string>;
  aiCustomBaseUrls: Record<string, string>;
  isMobileDrawerOpen: boolean;
  isSidebarCollapsed: boolean;
  powerModalType: "reboot" | "shutdown";
  notifications: NotificationItem[];
  appNotifications: AppNotifyItem[];
  notificationsLoading: boolean;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setExperienceMode: (mode: ExperienceMode) => void;
  setActiveTab: (tab: NavTab) => void;
  setSession: (session: DSMSession) => void;
  setSystemInfo: (info: SystemInfo) => void;
  updateUtilization: (util: SystemUtilization) => void;
  openLoginModal: (open: boolean) => void;
  openPowerModal: (type: "reboot" | "shutdown") => void;
  closePowerModal: () => void;
  setAiChatOpen: (open: boolean) => void;
  toggleAiChat: () => void;
  setShowAiChatBubble: (show: boolean) => void;
  setAiProvider: (provider: AiProviderType) => void;
  setAiApiKey: (provider: string, key: string) => void;
  setAiModel: (provider: string, model: string) => void;
  setAiCustomBaseUrl: (provider: string, url: string) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  logout: () => void;
  fetchNotifications: (silent?: boolean) => Promise<void>;
  clearNotifications: () => Promise<boolean>;
  addLocalNotification: (notif: NotificationItem) => void;
  t: typeof translations["vi"];
}

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "gemini" ||
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark", "gemini");
  } else {
    root.classList.remove("dark", "gemini");
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  language: "vi",
  theme: "system",
  experienceMode: "beginner",
  activeTab: "dashboard",
  session: {
    sid: "",
    isConnected: false,
    dsmVersion: 7,
    versionString: "",
    model: "",
    hostname: "",
    account: "",
  },
  systemInfo: null,
  utilization: null,
  utilizationHistory: [],
  isLoginModalOpen: false,
  isPowerModalOpen: false,
  isAiChatOpen: false,
  showAiChatBubble: true,
  aiProvider: "gemini",
  aiApiKeys: {},
  aiModels: {
    gemini: "gemini-2.0-flash",
    deepseek: "deepseek-chat",
    claude: "claude-3-7-sonnet-latest",
    openai: "gpt-4o-mini",
    openrouter: "anthropic/claude-3.7-sonnet",
    opencode: "opencode-interpreter",
  },
  aiCustomBaseUrls: {
    openrouter: "https://openrouter.ai/api/v1",
    opencode: "http://localhost:4096/v1",
  },
  isMobileDrawerOpen: false,
  isSidebarCollapsed: false,
  powerModalType: "reboot",
  notifications: [],
  appNotifications: [],
  notificationsLoading: false,
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

  setExperienceMode: (mode: ExperienceMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dsm_experience_mode", mode);
    }
    set({ experienceMode: mode });
  },

  setActiveTab: (tab: NavTab) => {
    if (typeof window !== "undefined") {
      // auto scroll to top on tab switch - handles both window and main scroll container
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" } as any);
      } catch (_) {}
    }
    set({ activeTab: tab, isMobileDrawerOpen: false });
  },

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

  setAiChatOpen: (open: boolean) => set({ isAiChatOpen: open }),
  toggleAiChat: () => set((s) => ({ isAiChatOpen: !s.isAiChatOpen })),

  setShowAiChatBubble: (show: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dsm_show_ai_bubble", show ? "true" : "false");
    }
    set({ showAiChatBubble: show });
  },

  setAiProvider: (provider: AiProviderType) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dsm_ai_provider", provider);
    }
    set({ aiProvider: provider });
  },

  setAiApiKey: (provider: string, key: string) => {
    set((state) => {
      const updated = { ...state.aiApiKeys, [provider]: key };
      if (typeof window !== "undefined") {
        localStorage.setItem("dsm_ai_keys", JSON.stringify(updated));
      }
      return { aiApiKeys: updated };
    });
  },

  setAiModel: (provider: string, model: string) => {
    set((state) => {
      const updated = { ...state.aiModels, [provider]: model };
      if (typeof window !== "undefined") {
        localStorage.setItem("dsm_ai_models", JSON.stringify(updated));
      }
      return { aiModels: updated };
    });
  },

  setAiCustomBaseUrl: (provider: string, url: string) => {
    set((state) => {
      const updated = { ...state.aiCustomBaseUrls, [provider]: url };
      if (typeof window !== "undefined") {
        localStorage.setItem("dsm_ai_base_urls", JSON.stringify(updated));
      }
      return { aiCustomBaseUrls: updated };
    });
  },

  setMobileDrawerOpen: (open: boolean) => set({ isMobileDrawerOpen: open }),

  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  logout: () => {
    dsmClient.logout();
    clearPersistedSession();
    set({
      session: {
        sid: "",
        isConnected: false,
        dsmVersion: 7,
        versionString: "",
        model: "",
        hostname: "",
        account: "",
      },
      systemInfo: null,
      utilization: null,
      utilizationHistory: [],
      notifications: [],
      appNotifications: [],
    });
  },

  fetchNotifications: async (silent = false) => {
    if (!silent) set({ notificationsLoading: true });
    try {
      const [notifs, appNotifs] = await Promise.all([
        dsmClient.getNotifications().catch(() => []),
        dsmClient.getAppNotifications().catch(() => []),
      ]);
      set({ notifications: notifs, appNotifications: appNotifs });
    } finally {
      if (!silent) set({ notificationsLoading: false });
    }
  },

  clearNotifications: async () => {
    const ok = await dsmClient.clearNotifications();
    if (ok) set({ notifications: [], appNotifications: [] });
    return ok;
  },

  addLocalNotification: (notif: NotificationItem) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
    }));
  },
}));
