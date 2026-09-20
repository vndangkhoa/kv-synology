"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore, ThemeMode } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  loadPersistedSession,
  getSessionRemainingDays,
  saveCurrentSessionExplicit,
  clearPersistedSession,
} from "@/lib/sessionStorage";
import {
  Globe,
  Sun,
  Moon,
  Laptop,
  Power,
  RotateCw,
  Server,
  ShieldCheck,
  Info,
  Clock,
  BookmarkCheck,
  Trash2,
  Shield,
  Save,
  CheckCircle2,
  Download,
  Upload,
  Smartphone,
  Terminal,
  Bot,
  Sparkles,
  SlidersHorizontal,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  LogOut,
  LogIn,
  AlertTriangle,
  X,
  Key,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  FileJson,
  Layers,
} from "lucide-react";
import { AiProviderType } from "@/lib/dsm/types";

const AI_PROVIDERS: Array<{
  id: AiProviderType;
  name: string;
  badge: string;
  icon: string;
  desc: string;
  defaultModel: string;
  models: Array<{ id: string; label: string; desc: string }>;
  apiKeyPlaceholder: string;
  docsUrl: string;
  keyName: string;
}> = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Mặc định / Khuyên dùng",
    icon: "✨",
    desc: "Mô hình thế hệ mới từ Google DeepMind với khả năng suy luận nhanh, ngữ cảnh rộng và hỗ trợ Tiếng Việt xuất sắc.",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Thế hệ mới nhất - Siêu tốc)", desc: "Mô hình mới nhất, độ trễ cực thấp, tối ưu cho DSM" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Suy luận sâu nâng cao)", desc: "Mô hình suy luận mạnh mẽ giải quyết tác vụ phức tạp" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Nhanh & Thông minh - Khuyên dùng)", desc: "Cân bằng hoàn hảo giữa tốc độ, trí tuệ và độ chính xác" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Tiết kiệm tài nguyên)", desc: "Độ trễ thấp nhất, tối ưu cho phản hồi nhanh" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Tiêu chuẩn)", desc: "Tốc độ ổn định cho các tác vụ hàng ngày" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Ngữ cảnh 2M Tokens)", desc: "Khả năng phân tích hệ thống và tài liệu kỹ thuật dài" },
    ],
    apiKeyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    keyName: "Google AI Studio API Key",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "Đa mô hình",
    icon: "🌐",
    desc: "Cổng kết nối AI toàn năng hỗ trợ mọi mô hình hàng đầu (Claude 3.7, Claude 3.5, GPT-4o, DeepSeek-V3, Llama 3.3, Gemini 2.0) chỉ với 1 API Key duy nhất.",
    defaultModel: "anthropic/claude-3.7-sonnet",
    models: [
      { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet (anthropic/claude-3.7-sonnet)", desc: "Mô hình lập luận Hybrid hàng đầu thế giới của Anthropic" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)", desc: "Khả năng phân tích hệ thống và lập luận kỹ thuật chuẩn xác" },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku (anthropic/claude-3.5-haiku)", desc: "Mô hình siêu tốc độ, chi phí thấp" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (deepseek/deepseek-chat)", desc: "Mô hình tổng quát 671B tham số hiệu năng cao" },
      { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (deepseek/deepseek-r1)", desc: "Mô hình chuỗi suy luận sâu giải quyết lỗi khó" },
      { id: "openai/gpt-4o", label: "GPT-4o (openai/gpt-4o)", desc: "Mô hình đa phương thức hàng đầu OpenAI" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (openai/gpt-4o-mini)", desc: "Mô hình nhỏ gọn, phản hồi tức thì" },
      { id: "openai/o3-mini", label: "o3-mini (openai/o3-mini)", desc: "Mô hình lý luận nhanh mới nhất của OpenAI" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)", desc: "Mã nguồn mở thế hệ mới của Meta" },
      { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B (qwen/qwen-2.5-72b-instruct)", desc: "Mô hình tiếng Việt và đa ngữ xuất sắc từ Alibaba" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (google/gemini-2.0-flash-001)", desc: "Mô hình Google Flash qua OpenRouter" },
    ],
    apiKeyPlaceholder: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
    keyName: "OpenRouter API Key",
  },
  {
    id: "deepseek",
    name: "DeepSeek AI",
    badge: "Tiết kiệm & Suy luận",
    icon: "⚡",
    desc: "Mô hình mã nguồn mở thế hệ mới DeepSeek-V3 và DeepSeek-R1 với năng lực toán học, code và suy luận logic vượt trội.",
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek-V3 (deepseek-chat - Khuyên dùng)", desc: "Mô hình tổng quát đa nhiệm mạnh mẽ và tốc độ cao" },
      { id: "deepseek-reasoner", label: "DeepSeek-R1 (deepseek-reasoner - Suy luận sâu)", desc: "Mô hình chuỗi suy luận sâu (Reasoning Chain) chuyên biệt" },
    ],
    apiKeyPlaceholder: "sk-...",
    docsUrl: "https://platform.deepseek.com/",
    keyName: "DeepSeek Platform API Key",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    badge: "Chính xác cao",
    icon: "🧠",
    desc: "Dòng mô hình Claude 3.7 và 3.5 Sonnet hàng đầu thế giới về hiểu ngữ cảnh kỹ thuật, chẩn đoán an ninh và hỗ trợ quản trị hệ thống.",
    defaultModel: "claude-3-7-sonnet-latest",
    models: [
      { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (Mới nhất - Khuyên dùng)", desc: "Mô hình thế hệ mới nhất với năng lực lập luận hybrid vượt trội" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Đỉnh cao)", desc: "Khả năng lập luận và giải quyết sự cố DSM chuẩn xác nhất" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Siêu tốc)", desc: "Phản hồi tức thì, chi phí siêu rẻ" },
      { id: "claude-3-opus-latest", label: "Claude 3 Opus (Phân tích chuyên sâu)", desc: "Khả năng xử lý tác vụ tư duy phức tạp" },
    ],
    apiKeyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/",
    keyName: "Anthropic Console API Key",
  },
  {
    id: "openai",
    name: "OpenAI ChatGPT",
    badge: "Phổ biến toàn cầu",
    icon: "🚀",
    desc: "Mô hình GPT-4o và GPT-4o-mini tiên tiến của OpenAI với kho tri thức rộng lớn và tính ổn định cao.",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini (Nhanh & Nhẹ - Khuyên dùng)", desc: "Hiệu năng ấn tượng, chi phí tối thiểu cho DSM" },
      { id: "gpt-4o", label: "GPT-4o (Toàn năng Flagship)", desc: "Mô hình mạnh nhất của OpenAI" },
      { id: "o3-mini", label: "o3-mini (Suy luận nhanh)", desc: "Mô hình lý luận logic mới tốc độ cao" },
      { id: "o1", label: "o1 (Lý luận chuyên sâu)", desc: "Mô hình suy luận sâu cho các bài toán phức tạp" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Mô hình GPT-4 kinh điển ổn định" },
    ],
    apiKeyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    keyName: "OpenAI Platform API Key",
  },
  {
    id: "webllm",
    name: "WebLLM Local (WebGPU)",
    badge: "100% Ngoại tuyến",
    icon: "💻",
    desc: "Chạy mô hình AI trực tiếp trong trình duyệt máy tính của bạn thông qua WebGPU — không cần API key, không gửi dữ liệu ra ngoài.",
    defaultModel: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    models: [
      { id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", label: "Qwen 2.5 (0.5B Micro - 380MB)", desc: "Siêu nhẹ, tải trong 5-10s, chạy mượt trên mọi máy tính" },
      { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", label: "Llama 3.2 (1B Universal - 880MB)", desc: "Mô hình Meta AI thế hệ mới, hỗ trợ WebGPU" },
      { id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", label: "Qwen 2.5 (1.5B Tiếng Việt - 1.1GB)", desc: "Hiểu sâu ngữ cảnh Tiếng Việt và thuật ngữ Synology" },
      { id: "SmolLM2-360M-Instruct-q0f32-MLC", label: "SmolLM2 (360M Gọn nhẹ - 260MB)", desc: "Mô hình tiêu thụ ít RAM nhất" },
    ],
    apiKeyPlaceholder: "Không cần API Key",
    docsUrl: "https://webllm.mlc.ai/",
    keyName: "WebGPU Local In-Browser",
  },
];

type SettingsCategory = "all" | "system" | "appearance" | "ai" | "remote";

const CATEGORIES: Array<{ id: SettingsCategory; label: string; icon: any; desc: string }> = [
  { id: "all", label: "Tất cả", icon: SlidersHorizontal, desc: "Tổng quan toàn bộ cài đặt" },
  { id: "system", label: "Hệ thống & Nguồn", icon: Server, desc: "Kết nối NAS, Nguồn & SSH" },
  { id: "appearance", label: "Giao diện & PWA", icon: Globe, desc: "Chủ đề, ngôn ngữ & PWA" },
  { id: "ai", label: "AI Copilot Hub", icon: Bot, desc: "Nhà cung cấp AI, Keys & Models" },
  { id: "remote", label: "Cổng từ xa", icon: ExternalLink, desc: "Synology Hub & Liên kết DDNS" },
];

export const SettingsTab: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    experienceMode,
    setExperienceMode,
    session,
    setActiveTab,
    openPowerModal,
    openLoginModal,
    logout,
    t,
    showAiChatBubble,
    setShowAiChatBubble,
    aiProvider,
    setAiProvider,
    aiApiKeys,
    setAiApiKey,
    aiModels,
    setAiModel,
    aiCustomBaseUrls,
    setAiCustomBaseUrl,
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("all");
  const [persistInfo, setPersistInfo] = useState<{ expiry: number; daysLeft: number } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Terminal & SSH State
  const [terminalInfo, setTerminalInfo] = useState<{ enable_ssh: boolean; enable_telnet: boolean; ssh_port: number } | null>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalSaving, setTerminalSaving] = useState(false);
  const [sshPortInput, setSshPortInput] = useState("22");
  const [terminalFeedback, setTerminalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBeginner = experienceMode === "beginner";

  // AI Provider & Key Management State
  const [activeAiTab, setActiveAiTab] = useState<AiProviderType>(aiProvider || "gemini");
  const [showKeyPassword, setShowKeyPassword] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; text?: string }>>({});
  const [showAdvancedAi, setShowAdvancedAi] = useState<Record<string, boolean>>({});
  const [dynamicModels, setDynamicModels] = useState<Record<string, Array<{ id: string; label: string; desc: string }>>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [fetchModelMsg, setFetchModelMsg] = useState<Record<string, string>>({});

  const [selectedAiModel, setSelectedAiModel] = useState<string>("Qwen2.5-0.5B-Instruct-q4f32_1-MLC");
  const [aiDownloadProgress, setAiDownloadProgress] = useState<number | null>(null);
  const [aiDownloadText, setAiDownloadText] = useState<string>("");
  const [isAiDownloading, setIsAiDownloading] = useState<boolean>(false);
  const [aiDownloadSuccess, setAiDownloadSuccess] = useState<boolean>(false);
  const [copiedHubUrl, setCopiedHubUrl] = useState<string | null>(null);

  const handleFetchLiveModels = async (provider: AiProviderType) => {
    const key = aiApiKeys[provider] || "";
    const baseUrl = aiCustomBaseUrls[provider] || "";

    setFetchingModels((prev) => ({ ...prev, [provider]: true }));
    setFetchModelMsg((prev) => ({ ...prev, [provider]: "Đang tải danh sách mô hình từ API..." }));

    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: key,
          customBaseUrl: baseUrl,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setDynamicModels((prev) => ({ ...prev, [provider]: data.models }));
        setFetchModelMsg((prev) => ({
          ...prev,
          [provider]: data.message || `Đã tải thành công ${data.models.length} mô hình!`,
        }));
      } else {
        setFetchModelMsg((prev) => ({
          ...prev,
          [provider]: data.error || "Không thể tải danh sách mô hình từ API.",
        }));
      }
    } catch (e: any) {
      setFetchModelMsg((prev) => ({
        ...prev,
        [provider]: `Lỗi: ${e.message}`,
      }));
    } finally {
      setFetchingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  useEffect(() => {
    if (aiProvider) setActiveAiTab(aiProvider);
  }, [aiProvider]);

  const handleTestConnection = async (provider: AiProviderType) => {
    const key = aiApiKeys[provider] || "";
    const model = aiModels[provider] || "";
    const baseUrl = aiCustomBaseUrls[provider] || "";

    if (provider !== "webllm" && !key.trim()) {
      setTestStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, success: false, text: "Vui lòng nhập API Key trước khi kiểm tra." },
      }));
      return;
    }

    setTestStatus((prev) => ({
      ...prev,
      [provider]: { loading: true, text: "Đang kiểm tra kết nối tới máy chủ AI..." },
    }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider,
          apiKey: key,
          model,
          customBaseUrl: baseUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, success: true, text: data.message || "Kết nối thành công!" },
        }));
      } else {
        setTestStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, success: false, text: data.error || "Lỗi kiểm tra API Key." },
        }));
      }
    } catch (e: any) {
      setTestStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, success: false, text: `Lỗi mạng: ${e.message}` },
      }));
    }
  };

  const handleDownloadAiModel = async () => {
    setIsAiDownloading(true);
    setAiDownloadSuccess(false);
    setAiDownloadProgress(0);
    setAiDownloadText("Đang khởi tạo WebLLM & chuẩn bị bộ nhớ đệm...");
    try {
      const webllm = await import("@mlc-ai/web-llm");
      await webllm.CreateMLCEngine(selectedAiModel, {
        initProgressCallback: (report: any) => {
          setAiDownloadText(report.text || "Đang tải dữ liệu mô hình...");
          const pct = Math.round((report.progress || 0) * 100);
          setAiDownloadProgress(pct);
        },
      });
      setAiDownloadSuccess(true);
      setAiDownloadProgress(100);
      setAiDownloadText("Đã tải và lưu trữ mô hình vào bộ nhớ Cache trình duyệt thành công!");
    } catch (err: any) {
      setAiDownloadText(`Tải mô hình: ${err?.message || "Trình duyệt không hỗ trợ WebGPU"}`);
    } finally {
      setIsAiDownloading(false);
    }
  };

  const refreshPersistInfo = () => {
    const p = loadPersistedSession();
    if (p?.expiry) {
      setPersistInfo({ expiry: p.expiry, daysLeft: getSessionRemainingDays(p.expiry) });
    } else {
      setPersistInfo(null);
    }
  };

  useEffect(() => {
    refreshPersistInfo();
    const id = setInterval(refreshPersistInfo, 60000);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsPwaInstalled(true);
    }
    window.addEventListener("appinstalled", () => setIsPwaInstalled(true));
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [session.sid]);

  useEffect(() => {
    if (!session.isConnected) return;
    setTerminalLoading(true);
    dsmClient
      .getTerminalInfo()
      .then((info) => {
        setTerminalInfo(info);
        setSshPortInput(String(info.ssh_port || 22));
      })
      .catch(() => {})
      .finally(() => setTerminalLoading(false));
  }, [session.isConnected, session.sid]);

  const handleSaveSession = () => {
    if (!session.isConnected) return;
    const clientCfg = dsmClient.getConfig() || {
      host: session.hostname || "192.168.1.10",
      port: 5001,
      https: true,
      account: session.account || "admin",
    };

    saveCurrentSessionExplicit(session, clientCfg);
    refreshPersistInfo();
    setSaveFeedback("Đã lưu phiên làm việc 7 ngày thành công!");
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleClearSession = () => {
    clearPersistedSession();
    refreshPersistInfo();
    setSaveFeedback("Đã xóa phiên lưu trữ.");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveTerminal = async () => {
    const portNum = parseInt(sshPortInput, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setTerminalFeedback({ type: "error", text: "Cổng SSH không hợp lệ (1 - 65535)" });
      return;
    }
    setTerminalSaving(true);
    try {
      const ok = await dsmClient.setTerminal(
        terminalInfo?.enable_ssh ?? true,
        terminalInfo?.enable_telnet ?? false,
        portNum
      );
      if (ok) {
        setTerminalInfo((prev) => (prev ? { ...prev, ssh_port: portNum } : { enable_ssh: true, enable_telnet: false, ssh_port: portNum }));
        setTerminalFeedback({ type: "success", text: `Đã cập nhật cổng SSH sang ${portNum} thành công!` });
      } else {
        setTerminalFeedback({ type: "error", text: "Không thể lưu cổng SSH. Kiểm tra quyền DSM." });
      }
    } catch (e: any) {
      setTerminalFeedback({ type: "error", text: `Lỗi: ${e.message}` });
    } finally {
      setTerminalSaving(false);
      setTimeout(() => setTerminalFeedback(null), 4000);
    }
  };

  const handleToggleSsh = async () => {
    if (!terminalInfo) return;
    const nextState = !terminalInfo.enable_ssh;
    setTerminalSaving(true);
    try {
      const ok = await dsmClient.setTerminal(
        nextState,
        terminalInfo.enable_telnet,
        terminalInfo.ssh_port
      );
      if (ok) {
        setTerminalInfo((prev) => (prev ? { ...prev, enable_ssh: nextState } : null));
        setTerminalFeedback({
          type: "success",
          text: `Đã ${nextState ? "bật" : "tắt"} dịch vụ SSH thành công!`,
        });
      }
    } catch (e: any) {
      setTerminalFeedback({ type: "error", text: `Lỗi: ${e.message}` });
    } finally {
      setTerminalSaving(false);
      setTimeout(() => setTerminalFeedback(null), 4000);
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleExportSettings = () => {
    const configData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      theme,
      language,
      experienceMode,
      showAiChatBubble,
      aiProvider,
      aiApiKeys,
      aiModels,
      aiCustomBaseUrls,
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsm-helper-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveFeedback("Đã xuất file cấu hình JSON thành công!");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.experienceMode) setExperienceMode(parsed.experienceMode);
        if (typeof parsed.showAiChatBubble === "boolean") setShowAiChatBubble(parsed.showAiChatBubble);
        if (parsed.aiProvider) setAiProvider(parsed.aiProvider);
        if (parsed.aiApiKeys && typeof parsed.aiApiKeys === "object") {
          Object.entries(parsed.aiApiKeys).forEach(([p, k]) => {
            if (k) setAiApiKey(p as any, k as string);
          });
        }
        if (parsed.aiModels && typeof parsed.aiModels === "object") {
          Object.entries(parsed.aiModels).forEach(([p, m]) => {
            if (m) setAiModel(p as any, m as string);
          });
        }
        if (parsed.aiCustomBaseUrls && typeof parsed.aiCustomBaseUrls === "object") {
          Object.entries(parsed.aiCustomBaseUrls).forEach(([p, u]) => {
            if (u) setAiCustomBaseUrl(p as any, u as string);
          });
        }
        setSaveFeedback("Đã phục hồi cài đặt từ file JSON thành công!");
        setTimeout(() => setSaveFeedback(null), 3500);
      } catch (err: any) {
        setTerminalFeedback({ type: "error", text: "File cấu hình JSON không hợp lệ!" });
        setTimeout(() => setTerminalFeedback(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Sub-components for each section
  const renderSystemSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* CARD: Session & Device */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-500" />
                Phiên kết nối &amp; Thiết bị
              </h3>
              {session.isConnected ? (
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {session.model || "DS920+"}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Chưa kết nối
                </span>
              )}
            </div>

            {session.isConnected ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Máy chủ (Host):</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {session.hostname || "192.168.1.10"}
                    {dsmClient.getConfig()?.port ? `:${dsmClient.getConfig()?.port}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Tài khoản:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {session.account || "admin"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Phiên bản DSM:</span>
                  <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                    {session.versionString || "DSM 7.2.1-69057"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Lưu phiên 7 ngày:</span>
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {persistInfo ? `Còn ${persistInfo.daysLeft} ngày` : "Chưa kích hoạt"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Chưa có phiên kết nối NAS</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Để xem dữ liệu phần cứng, quản trị lưu trữ và giám sát hệ thống, vui lòng đăng nhập tài khoản DSM.
                </p>
                <button
                  onClick={() => openLoginModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập DSM ngay</span>
                </button>
              </div>
            )}
          </div>

          {session.isConnected && (
            <div className="pt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSaveSession}
                className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Gia hạn 7 ngày</span>
              </button>
              {persistInfo && (
                <button
                  onClick={handleClearSession}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 transition-colors cursor-pointer"
                  title="Xóa phiên đã lưu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* CARD: Power Lifecycle */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Power className="w-4 h-4 text-rose-500" />
                Kiểm soát Nguồn thiết bị
              </h3>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                An toàn 2 lớp
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Khởi động lại hoặc tắt máy Synology NAS từ xa an toàn. Mỗi thao tác đều yêu cầu xác nhận trước khi gửi lệnh thực thi đến kernel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => openPowerModal("reboot")}
              disabled={!session.isConnected}
              className="min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all border border-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-98"
            >
              <RotateCw className="w-4 h-4" />
              <span>Khởi động lại</span>
            </button>
            <button
              onClick={() => openPowerModal("shutdown")}
              disabled={!session.isConnected}
              className="min-h-[44px] py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-98"
            >
              <Power className="w-4 h-4" />
              <span>Tắt máy</span>
            </button>
          </div>
        </div>

        {/* CARD: SSH & Terminal Management */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Dịch vụ SSH &amp; Bảo mật Port
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                terminalInfo?.enable_ssh
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
              }`}>
                {terminalInfo?.enable_ssh ? "SSH Đang Bật" : "SSH Đang Tắt"}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bật/tắt SSH daemon và cấu hình cổng truy cập. Đổi cổng mặc định 22 sang cổng khác giúp ngăn 99% đợt rà quét tự động từ Internet.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Trạng thái SSH Daemon
                </span>
                <button
                  onClick={handleToggleSsh}
                  disabled={terminalLoading || terminalSaving || !session.isConnected}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                    terminalInfo?.enable_ssh
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {terminalInfo?.enable_ssh ? "✓ Đang Bật" : "✕ Đang Tắt"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Cổng SSH:</span>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={sshPortInput}
                  onChange={(e) => setSshPortInput(e.target.value)}
                  disabled={terminalLoading || terminalSaving || !session.isConnected}
                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  onClick={handleSaveTerminal}
                  disabled={terminalLoading || terminalSaving || !session.isConnected}
                  className="flex-1 py-1 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Cổng</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Yêu cầu quyền quản trị viên DSM</span>
            <span className="font-mono text-emerald-500 font-bold">Port 1 - 65535</span>
          </div>
        </div>

        {/* CARD: Backup & Restore Configuration */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileJson className="w-4 h-4 text-purple-500" />
                Sao lưu &amp; Phục hồi Cấu hình
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                JSON Config
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Xuất hoặc nhập toàn bộ cài đặt giao diện, các API Key trí tuệ nhân tạo và tùy chọn cá nhân hóa để sử dụng trên thiết bị hoặc trình duyệt khác.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleExportSettings}
              className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold transition-all border border-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* CARD: Theme & Styling */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Chủ đề hiển thị (Theme)
              </h3>
            </div>

            <div className="space-y-2">
              {[
                { id: "system", label: "Theo hệ thống", icon: Laptop, desc: "Đồng bộ tự động với chế độ máy tính/điện thoại" },
                { id: "light", label: "Giao diện Sáng", icon: Sun, desc: "Nền trắng thanh lịch, tương phản rõ nét ban ngày" },
                { id: "gemini", label: "Tối (Gemini AI Glow)", icon: Sparkles, badge: "OLED", desc: "Tối ưu màn hình OLED với viền sáng đa sắc" },
              ].map((tOpt) => {
                const Icon = tOpt.icon;
                const isSel = theme === tOpt.id;
                const isGemini = tOpt.id === "gemini";
                return (
                  <button
                    key={tOpt.id}
                    onClick={() => setTheme(tOpt.id as ThemeMode)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSel
                        ? isGemini
                          ? "bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-rose-500/10 border-purple-500/50 text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                          : "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold shadow-xs"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSel
                          ? isGemini
                            ? "bg-gradient-to-tr from-blue-600 via-purple-600 to-rose-500 text-white"
                            : "bg-sky-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}>
                        <Icon className={`w-4 h-4 ${isGemini && isSel ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{tOpt.label}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{tOpt.desc}</span>
                      </div>
                    </div>
                    {isSel && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Tự động lưu vào trình duyệt của bạn.
          </div>
        </div>

        {/* CARD: Language & Mode */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                Ngôn ngữ &amp; Trải nghiệm
              </h3>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Ngôn ngữ (Language)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                {[
                  { id: "vi", label: "🇻🇳 Tiếng Việt" },
                  { id: "en", label: "🇬🇧 English" },
                ].map((lOpt) => {
                  const isSel = language === lOpt.id;
                  return (
                    <button
                      key={lOpt.id}
                      onClick={() => setLanguage(lOpt.id as any)}
                      className={`min-h-[38px] py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        isSel
                          ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {lOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Mode Toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Chế độ Trải nghiệm (Experience Mode)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setExperienceMode("beginner")}
                  className={`min-h-[38px] py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    experienceMode === "beginner"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${experienceMode === "beginner" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  <span>🟢 Cơ bản</span>
                </button>
                <button
                  onClick={() => setExperienceMode("advance")}
                  className={`min-h-[38px] py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    experienceMode === "advance"
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span>⚡ Nâng cao</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                {experienceMode === "beginner"
                  ? "Cơ bản: Tinh gọn chỉ số, ẩn các bảng MIB/OID phức tạp, phù hợp người mới."
                  : "Nâng cao: Hiển thị đầy đủ biểu đồ chi tiết per-core, socket TCP và Terminal."}
              </p>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Áp dụng tức thì cho toàn bộ ứng dụng.
          </div>
        </div>

        {/* CARD: PWA & Mobile Installation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                Ứng dụng Web PWA
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                v1.0.0 Pro
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cài đặt DSM Helper như một ứng dụng độc lập trên màn hình chính của iPhone, Android hoặc máy tính để mở nhanh không viền trình duyệt.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            {isPwaInstalled ? (
              <div className="min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Đã cài đặt trên thiết bị</span>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallPwa}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Cài đặt ứng dụng PWA</span>
              </button>
            ) : (
              <div className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold text-center flex items-center justify-center">
                Sẵn sàng qua trình duyệt
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAiSection = () => {
    const currentP = AI_PROVIDERS.find((p) => p.id === activeAiTab) || AI_PROVIDERS[0];
    const currentKey = aiApiKeys[currentP.id] || "";
    const currentModel = aiModels[currentP.id] || currentP.defaultModel;
    const currentBaseUrl = aiCustomBaseUrls[currentP.id] || "";
    const status = testStatus[currentP.id];
    const isWebLlm = currentP.id === "webllm";
    const isAdvOpen = showAdvancedAi[currentP.id] || false;

    return (
      <div className="space-y-4">
        {/* Floating Bubble Control */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                Bong bóng AI Bot trên màn hình
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {showAiChatBubble
                  ? "Đang hiển thị nút trò chuyện tròn nổi ở góc dưới màn hình"
                  : "Đã ẩn nút trò chuyện nổi khỏi giao diện để tập trung vào bảng điều khiển"}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const nextVal = !showAiChatBubble;
              setShowAiChatBubble(nextVal);
              setSaveFeedback(nextVal ? "Đã bật hiển thị bong bóng AI Copilot." : "Đã ẩn bong bóng AI Copilot khỏi màn hình.");
              setTimeout(() => setSaveFeedback(null), 3000);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer self-start sm:self-center ${
              showAiChatBubble
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {showAiChatBubble ? "✓ Đang hiển thị" : "✕ Đã ẩn"}
          </button>
        </div>

        {/* AI Provider Horizontal Selector Strip */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
            Chọn Nhà cung cấp Trí tuệ Nhân tạo (AI Provider)
          </label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x pb-1">
            {AI_PROVIDERS.map((p) => {
              const isActive = activeAiTab === p.id;
              const isDefaultChosen = aiProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveAiTab(p.id);
                    setAiProvider(p.id);
                  }}
                  className={`min-h-[44px] py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border-transparent scale-100"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700"
                  }`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span>{p.name}</span>
                  {isDefaultChosen && (
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-purple-500"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Provider Workspace Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{currentP.icon}</span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {currentP.name}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  {currentP.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {currentP.desc}
              </p>
            </div>
            {currentP.docsUrl && (
              <a
                href={currentP.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Lấy API Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {!isWebLlm ? (
            <div className="space-y-3.5">
              {/* API Key Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-500" />
                    {currentP.keyName}
                  </span>
                  {currentKey && <span className="text-emerald-500 font-bold text-xs">✓ Đã lưu</span>}
                </label>
                <div className="relative">
                  <input
                    type={showKeyPassword[currentP.id] ? "text" : "password"}
                    value={currentKey}
                    onChange={(e) => setAiApiKey(currentP.id, e.target.value)}
                    placeholder={currentP.apiKeyPlaceholder}
                    className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKeyPassword((prev) => ({ ...prev, [currentP.id]: !prev[currentP.id] }))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showKeyPassword[currentP.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Selector & Live Fetch */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mô hình AI (Model)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFetchLiveModels(currentP.id)}
                    disabled={fetchingModels[currentP.id]}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${fetchingModels[currentP.id] ? "animate-spin" : ""}`} />
                    <span>{fetchingModels[currentP.id] ? "Đang tải danh sách..." : "Lấy danh sách Live Models"}</span>
                  </button>
                </div>

                {fetchModelMsg[currentP.id] && (
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 mb-1.5 font-medium">
                    {fetchModelMsg[currentP.id]}
                  </p>
                )}

                <select
                  value={currentModel}
                  onChange={(e) => setAiModel(currentP.id, e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {(dynamicModels[currentP.id] || currentP.models).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collapsible Advanced Settings (Base URL) */}
              {(currentP.id === "deepseek" || currentP.id === "openai" || currentP.id === "openrouter") && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedAi((prev) => ({ ...prev, [currentP.id]: !isAdvOpen }))}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1 cursor-pointer py-1"
                  >
                    <span>Tùy chọn nâng cao (Custom Endpoint / Proxy)</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAdvOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isAdvOpen && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                        Custom Base URL / API Endpoint
                      </label>
                      <input
                        type="text"
                        value={currentBaseUrl}
                        onChange={(e) => setAiCustomBaseUrl(currentP.id, e.target.value)}
                        placeholder={
                          currentP.id === "openrouter"
                            ? "https://openrouter.ai/api/v1"
                            : currentP.id === "deepseek"
                            ? "https://api.deepseek.com"
                            : "https://api.openai.com/v1"
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Status Banner */}
              {status?.text && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    status.success
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : status.loading
                      ? "bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {status.loading ? (
                      <RotateCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : status.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="truncate">{status.text}</span>
                  </div>
                </div>
              )}

              {/* Test Connection Action Button */}
              <button
                onClick={() => handleTestConnection(currentP.id)}
                disabled={status?.loading || !currentKey.trim()}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {status?.loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra kết nối tới máy chủ AI...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Kiểm tra kết nối API Key ({currentP.name})</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* WebLLM Downloader Subview */
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chọn Mô hình Local WebGPU
              </label>
              <select
                value={selectedAiModel}
                onChange={(e) => setSelectedAiModel(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                {currentP.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleDownloadAiModel}
                disabled={isAiDownloading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-rose-500 hover:opacity-90 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isAiDownloading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Đang tải ({aiDownloadProgress || 0}%)...</span>
                  </>
                ) : aiDownloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Mô hình đã sẵn sàng trong Cache Trình duyệt!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Tải &amp; Lưu mô hình vào WebGPU Cache</span>
                  </>
                )}
              </button>

              {aiDownloadText && (
                <p className="text-xs text-purple-600 dark:text-purple-400 text-center font-medium">
                  {aiDownloadText}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRemoteSection = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              Synology Hub &amp; Cổng Truy Cập Từ Xa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Liên kết trực tiếp tới trung tâm điều khiển Synology Hub và tên miền Synology DDNS chính thức:
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Trực tuyến
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Synology Hub (vndns.net)", url: "https://syno.vndns.net", desc: "Cổng thông tin & điều khiển chính" },
            { title: "Synology Package & DDNS (pkg.khoavo.myds.me)", url: "https://pkg.khoavo.myds.me", desc: "Tên miền Synology DDNS chính thức" },
          ].map((linkItem) => {
            const isCopied = copiedHubUrl === linkItem.url;
            return (
              <div
                key={linkItem.url}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
                      {linkItem.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {linkItem.desc}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                    HTTPS
                  </span>
                </div>

                <p className="font-mono text-xs text-sky-600 dark:text-sky-400 truncate bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {linkItem.url}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(linkItem.url);
                      setCopiedHubUrl(linkItem.url);
                      setTimeout(() => setCopiedHubUrl(null), 2000);
                    }}
                    className="flex-1 min-h-[38px] py-1.5 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Đã chép link" : "Sao chép"}</span>
                  </button>
                  <a
                    href={linkItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-h-[38px] py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Mở tab mới</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200 w-full">
      {/* Toast Feedback */}
      {(saveFeedback || terminalFeedback) && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 shadow-sm ${
            terminalFeedback?.type === "error"
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{saveFeedback || terminalFeedback?.text}</span>
          </div>
          <button
            onClick={() => {
              setSaveFeedback(null);
              setTerminalFeedback(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
            <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.settings.title}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                session.isConnected
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}>
                {session.isConnected ? "Đã kết nối" : "Chưa kết nối"}
              </span>
              {isBeginner && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🟢 Cơ bản</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cấu hình tài khoản, giao diện, SSH, kiểm soát nguồn và tích hợp API / MCP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {session.isConnected ? (
            <button
              onClick={() => openLoginModal(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-500" />
              <span>Chuyển tài khoản</span>
            </button>
          ) : (
            <button
              onClick={() => openLoginModal(true)}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Kết nối NAS</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Category Tabs (Mobile Sticky Bar) */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 backdrop-blur-md bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSel = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-[40px] py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isSel
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Category Content */}
      <div className="space-y-6 pt-1">
        {activeCategory === "all" && (
          <div className="space-y-6">
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1">
                <Server className="w-3.5 h-3.5 text-sky-500" />
                Hệ thống &amp; Nguồn thiết bị
              </h3>
              {renderSystemSection()}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Giao diện &amp; Trải nghiệm
              </h3>
              {renderAppearanceSection()}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                Trí tuệ nhân tạo (AI Copilot Hub)
              </h3>
              {renderAiSection()}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1">
                <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                Cổng truy cập từ xa
              </h3>
              {renderRemoteSection()}
            </section>
          </div>
        )}

        {activeCategory === "system" && renderSystemSection()}
        {activeCategory === "appearance" && renderAppearanceSection()}
        {activeCategory === "ai" && renderAiSection()}
        {activeCategory === "remote" && renderRemoteSection()}
      </div>
    </div>
  );
};
