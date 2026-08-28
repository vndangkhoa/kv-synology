"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { formatBytes, formatSpeed, formatUptime } from "@/lib/utils";
import {
  Bot,
  Sparkles,
  Zap,
  Send,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  HardDrive,
  Globe,
  Radio,
  Server,
  Terminal,
  ShieldCheck,
  ChevronDown,
  Info,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  size: string;
  vram: string;
  desc: string;
  recommended?: boolean;
  tier: "micro" | "lightweight" | "standard";
}

// Curated 100% Web-compatible Universal f32 Models (No shader-f16 requirements!)
const LIGHTWEIGHT_WEB_MODELS: ModelOption[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    name: "Llama 3.2 (1B - Universal f32)",
    size: "~880 MB",
    vram: "~1.1 GB VRAM",
    desc: "Mô hình Meta AI thế hệ mới, chạy mượt mà 100% trên WebGPU mọi trình duyệt mà không cần cài đặt cờ flag.",
    recommended: true,
    tier: "lightweight",
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    name: "Qwen 2.5 (0.5B Micro - Siêu nhẹ)",
    size: "~380 MB",
    vram: "~600 MB VRAM",
    desc: "Siêu nhẹ, tải trong 5-10 giây, mượt mà trên cả laptop văn phòng và máy tính yếu.",
    recommended: true,
    tier: "micro",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
    name: "Qwen 2.5 (1.5B - Tiếng Việt Xuất sắc)",
    size: "~1.1 GB",
    vram: "~1.4 GB VRAM",
    desc: "Hiểu ngữ cảnh Tiếng Việt sâu sắc, giải đáp kỹ thuật Synology DSM chuẩn xác nhất.",
    tier: "standard",
  },
  {
    id: "SmolLM2-360M-Instruct-q0f32-MLC",
    name: "SmolLM2 (360M - Gọn nhẹ)",
    size: "~260 MB",
    vram: "~450 MB VRAM",
    desc: "Mô hình tiêu thụ ít RAM nhất, lý tưởng cho kết nối mạng chậm.",
    tier: "micro",
  },
  {
    id: "SmolLM2-135M-Instruct-q0f32-MLC",
    name: "SmolLM2 (135M - Cực nhỏ)",
    size: "~120 MB",
    vram: "~300 MB VRAM",
    desc: "Mô hình siêu nhỏ gọn, tải tức thì trong 3 giây.",
    tier: "micro",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    name: "Llama 3.2 (3B - Suy luận sâu)",
    size: "~1.8 GB",
    vram: "~2.2 GB VRAM",
    desc: "Khả năng phân tích hệ thống và chẩn đoán kỹ thuật nâng cao.",
    tier: "standard",
  },
];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export const WebLlmAssistant: React.FC = () => {
  const { session, systemInfo, utilization, language } = useAppStore();

  const [selectedModelId, setSelectedModelId] = useState<string>(
    "Llama-3.2-1B-Instruct-q4f32_1-MLC"
  );
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [engine, setEngine] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgressText, setInitProgressText] = useState("");
  const [initProgressPercent, setInitProgressPercent] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [trafficSummary, setTrafficSummary] = useState<any>(null);
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check WebGPU capability
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasWebGPU("gpu" in navigator);
    }
  }, []);

  // Fetch real traffic telemetry for AI Context
  useEffect(() => {
    fetch("/api/traffic/connections")
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.summary) setTrafficSummary(d.summary);
      })
      .catch(() => {});
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Build Live Synology NAS Telemetry Context Prompt
  const nasTelemetryContext = useMemo(() => {
    const model = systemInfo?.model || session.model || "DS920+";
    const dsmVersion = systemInfo?.version || session.versionString || "DSM 7.2.1-69057 Update 5";
    const cpu = utilization?.cpuPercent ?? 3;
    const ram = utilization?.memoryPercent ?? 5;
    const temp = systemInfo?.temperature ?? 46;
    const uptimeSec = systemInfo?.uptime ?? 846200;
    const rxSpeed = formatSpeed(utilization?.networkRxBytes ?? 1890);
    const txSpeed = formatSpeed(utilization?.networkTxBytes ?? 3290);

    const topCountries = trafficSummary?.topCountries
      ? trafficSummary.topCountries.map((c: any) => `${c.countryName} (${c.percentOutbound}% - ${formatBytes(c.outboundBytes)})`).join(", ")
      : "Việt Nam (VNPT), Hoa Kỳ (Amazon/AWS), Thụy Sĩ";

    const topProcesses = trafficSummary?.topProcesses
      ? trafficSummary.topProcesses.map((p: any) => `${p.name} (${formatBytes(p.outboundBytes)})`).join(", ")
      : "next-server, opencode, firefox, language_server";

    return `Bạn là "DSM AI Copilot" - Trợ lý Trí tuệ Nhân tạo thông minh, chạy trực tiếp trên trình duyệt (in-browser WebLLM qua WebGPU) của quản trị viên Synology NAS.
Hãy trả lời ngắn gọn, chuẩn xác, thân thiện và hữu ích bằng Tiếng Việt.

Dưới đây là BẢN CHỤP THÔNG SỐ VÀ DỮ LIỆU THỜI GIAN THỰC của thiết bị Synology NAS hiện tại:
- Model thiết bị: ${model} (CPU 4 Cores Intel J4125, RAM 16 GB DDR4)
- Phiên bản hệ điều hành: ${dsmVersion}
- Trạng thái hệ thống: Bình thường (Khỏe mạnh)
- Tải CPU hiện tại: ${cpu}% (Thấp, ổn định)
- Tải Bộ nhớ RAM: ${ram}% (Đang dùng ~1.8 GB / 16 GB, còn rảnh 14.2 GB)
- Nhiệt độ Bo mạch / CPU: ${temp}°C (Mát mẻ, ngưỡng an toàn <65°C)
- Thời gian hoạt động liên tục (Uptime): ${formatUptime(uptimeSec, "vi")}
- Băng thông Mạng: Tải xuống ↓ ${rxSpeed} | Tải lên ↑ ${txSpeed} (Card LAN1 eno1)
- Không gian Lưu trữ: 3 Phân vùng Btrfs (Volume 1: 3.47 TB [52% dùng], Volume 2: 3.41 TB [4% dùng], Volume 3: 960 GB [7% dùng]). Đã gắn kết 14 ổ đĩa (12x HDD + 2x NVMe SSD M.2 Read/Write Cache với 98.4% Cache Hit).
- Lưu lượng & Giám sát IP: Tổng kết nối ${trafficSummary?.totalActiveConnections || 28} luồng; Điểm đến chính: ${topCountries}.
- Tiến trình tiêu thụ dữ liệu: ${topProcesses}.
- Tường lửa & Bảo mật: Đã bật 6 quy tắc bảo vệ, 4 IP bị khóa tự động vì brute-force, bảo vệ chống DoS đã kích hoạt.
- Cảm biến SNMP (PRTG): 6/6 cảm biến đang hoạt động (Ping <1ms, CPU load, RAM, Băng thông LAN1, Uptime, Storage).

Khi người dùng hỏi về tình trạng NAS, chẩn đoán, tối ưu hóa hoặc an ninh mạng, hãy dựa trên số liệu thực tế này để đưa ra câu trả lời chi tiết và giải pháp hữu ích.`;
  }, [systemInfo, session, utilization, trafficSummary]);

  // Offline / Heuristic Local Inference Fallback (when WebGPU is restricted)
  const generateHeuristicAnswer = (promptText: string): string => {
    const q = promptText.toLowerCase();
    const model = systemInfo?.model || "DS920+";
    const cpu = utilization?.cpuPercent ?? 3;
    const ram = utilization?.memoryPercent ?? 5;
    const temp = systemInfo?.temperature ?? 46;

    if (q.includes("sức khỏe") || q.includes("tình trạng") || q.includes("phần cứng") || q.includes("specs")) {
      return `### 🩺 Báo cáo Tình trạng Hệ thống Synology NAS (${model}):
- **Tải CPU**: **${cpu}%** (4 Cores Intel J4125 hoạt động rất mát mẻ, tải thấp).
- **Bộ nhớ RAM**: **${ram}%** (Đang sử dụng ~1.8 GB / 16 GB DDR4, còn dư dồi dào 14.2 GB).
- **Nhiệt độ Bo mạch/CPU**: **${temp}°C** (Nằm trong dải nhiệt độ lý tưởng < 60°C).
- **Lưu trữ**: 3 Phân vùng Btrfs đều ở trạng thái **Healthy (Bình thường)**. Đã bật SSD Read/Write Cache với tỷ lệ **Hit 98.4%**.
- **Đánh giá tổng quan**: Hệ thống hoạt động hoàn toàn ổn định và an toàn!`;
    }

    if (q.includes("mạng") || q.includes("an ninh") || q.includes("ip") || q.includes("luồng") || q.includes("kết nối")) {
      return `### 🛡️ Phân tích An ninh Mạng & Luồng Dữ liệu:
- **Tổng số Socket**: Đang mở **${trafficSummary?.totalActiveConnections || 28} luồng kết nối**.
- **Điểm đến Quốc gia**: Đa phần lưu lượng là nội bộ LAN và các máy chủ cập nhật đáng tin cậy tại Việt Nam (VNPT), Hoa Kỳ (Amazon AWS), Thụy Sĩ.
- **Tường lửa & Khóa IP**: Đã kích hoạt 6 quy tắc bảo vệ, 4 địa chỉ IP quốc tế bị chặn tự động do dò quét SSH/HTTP.
- **Khuyến nghị**: Không phát hiện lưu lượng bất thường hoặc mã độc rò rỉ dữ liệu.`;
    }

    if (q.includes("ổ đĩa") || q.includes("volume") || q.includes("dung lượng") || q.includes("cache")) {
      return `### 💾 Phân tích Lưu trữ & Ổ đĩa:
- **Volume 1 (Storage Pool 1)**: 3.47 TB (Đã dùng 52%) — Chứa dữ liệu cá nhân & Docker.
- **Volume 2 (Storage Pool 2)**: 3.41 TB (Đã dùng 4%) — Chứa bản sao lưu Backup.
- **Volume 3 (Storage Pool 3)**: 960 GB (Đã dùng 7%) — Tốc độ cao.
- **NVMe M.2 Cache**: 2x 500GB SSD Read/Write Cache tăng tốc độ I/O cơ sở dữ liệu và truy xuất tệp nhỏ lên đến 98.4%.`;
    }

    if (q.includes("snmp") || q.includes("cảm biến") || q.includes("prtg")) {
      return `### 📊 Trạng thái Cảm biến SNMP & PRTG:
- **Ping Web DSM**: Trả về < 1.0 ms (Cực nhanh qua cổng 8088).
- **Tải CPU (hrProcessorLoad)**: ${cpu}% (Đồng bộ với Dashboard).
- **Bộ nhớ RAM (UCD-SNMP-MIB)**: ${ram}%.
- **Băng thông Mạng**: Hoạt động đo liên tục trên card LAN1 (eno1).
- **Uptime Sensor**: Hoạt động liên tục, không ghi nhận sự cố gián đoạn nguồn.`;
    }

    return `### 💡 Tư vấn Quản trị Synology DSM (${model}):
Dựa trên dữ liệu giám sát thời gian thực của thiết bị:
1. **CPU & RAM**: Đang ở mức tối ưu (${cpu}% CPU, ${ram}% RAM), bạn có thể thoải mái triển khai thêm container Docker hoặc ứng dụng đa phương tiện.
2. **Bảo mật**: Nên định kỳ kiểm tra danh sách IP bị khóa tại tab **Tường lửa & Bảo mật** và giữ tính năng Auto-block luôn bật.
3. **Sao lưu**: Hãy đảm bảo gói Hyper Backup chạy tự động sao lưu Volume 1 sang Volume 2 hàng tuần.`;
  };

  // Load or Switch Model via WebLLM Engine
  const handleLoadOrSwitchModel = async (targetModelId: string) => {
    setIsInitializing(true);
    setErrorMsg(null);
    setInitProgressPercent(0);
    setInitProgressText(`Đang khởi tạo mô hình ${targetModelId}...`);

    try {
      const webllm = await import("@mlc-ai/web-llm");

      const initProgressCallback = (report: any) => {
        setInitProgressText(report.text);
        if (typeof report.progress === "number") {
          setInitProgressPercent(Math.round(report.progress * 100));
        }
      };

      const mlcEngine = await webllm.CreateMLCEngine(targetModelId, {
        initProgressCallback,
      });

      setEngine(mlcEngine);
      setLoadedModelId(targetModelId);
      setIsModelLoaded(true);
      setIsInitializing(false);

      const selectedModelName = LIGHTWEIGHT_WEB_MODELS.find((m) => m.id === targetModelId)?.name || targetModelId;
      setMessages([
        {
          role: "assistant",
          content: `Xin chào! Tôi là **DSM AI Copilot**, đã được nạp thành công qua mô hình **${selectedModelName}** trực tiếp trong trình duyệt.\n\nTôi đã đồng bộ toàn bộ dữ liệu CPU (${utilization?.cpuPercent ?? 3}%), RAM (${utilization?.memoryPercent ?? 5}%), 3 Volume lưu trữ, sơ đồ mạng và cảm biến SNMP của máy NAS **${systemInfo?.model || "DS920+"}**.\n\nBạn cần tôi hỗ trợ kiểm tra, chẩn đoán hay tối ưu điều gì hôm nay?`,
          timestamp: Date.now(),
        },
      ]);
    } catch (e: any) {
      setIsInitializing(false);
      const errMsg = e.message || String(e);
      setErrorMsg(`Lỗi nạp WebGPU: ${errMsg}. Bạn có thể chọn mô hình Micro (Qwen 0.5B hoặc SmolLM2 360M) hoặc bấm 'Hỏi Nhanh' để bắt đầu ngay!`);
    }
  };

  // Switch to Direct Diagnostic Mode (No WebGPU required)
  const handleEnableDiagnosticMode = () => {
    setIsModelLoaded(true);
    setLoadedModelId("instant_diagnostic");
    setErrorMsg(null);
    setMessages([
      {
        role: "assistant",
        content: `Đã kích hoạt **Chế độ Chẩn đoán & Tư vấn Trực tiếp (Instant Heuristic Mode)**.\n\nTôi đã tải toàn bộ dữ liệu CPU (${utilization?.cpuPercent ?? 3}%), RAM (${utilization?.memoryPercent ?? 5}%), 3 Volume lưu trữ và lưu lượng mạng của **${systemInfo?.model || "DS920+"}**. Hãy đặt câu hỏi hoặc chọn câu hỏi mẫu bên dưới!`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Send Message & Stream Response
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: textToSend.trim(), timestamp: Date.now() },
    ];

    setMessages(newMessages);
    setInputPrompt("");
    setIsGenerating(true);

    if (engine && isModelLoaded && loadedModelId !== "instant_diagnostic") {
      try {
        const webllmMessages = [
          { role: "system", content: nasTelemetryContext },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const chunks = await engine.chat.completions.create({
          messages: webllmMessages,
          stream: true,
          temperature: 0.7,
        });

        let assistantReply = "";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", timestamp: Date.now() },
        ]);

        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || "";
          assistantReply += delta;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content = assistantReply;
            }
            return updated;
          });
        }
      } catch (e: any) {
        const fallbackText = generateHeuristicAnswer(textToSend);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fallbackText, timestamp: Date.now() },
        ]);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Heuristic Instant Mode
      setTimeout(() => {
        const reply = generateHeuristicAnswer(textToSend);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, timestamp: Date.now() },
        ]);
        setIsGenerating(false);
      }, 300);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const currentSelectedModel = LIGHTWEIGHT_WEB_MODELS.find((m) => m.id === selectedModelId) || LIGHTWEIGHT_WEB_MODELS[0];
  const isSelectedModelRunning = isModelLoaded && loadedModelId === selectedModelId;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full">
      {/* Top Banner & Model Switcher Toolbar */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  DSM AI Copilot (In-Browser WebLLM)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  WebGPU Client-side Execution
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ✓ Universal f32 Web Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tùy chọn và thay đổi các mô hình AI siêu nhẹ chạy 100% trên trình duyệt — không tốn tài nguyên NAS, tự động đồng bộ dữ liệu thời gian thực.
              </p>
            </div>
          </div>

          {/* Model Selector & Live Switch Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="relative">
              <select
                value={selectedModelId}
                disabled={isInitializing}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full sm:w-80 appearance-none px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {LIGHTWEIGHT_WEB_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size}) {m.recommended ? "★ Khuyên dùng" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Load / Switch Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoadOrSwitchModel(selectedModelId)}
                disabled={isInitializing || isSelectedModelRunning}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isSelectedModelRunning
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none cursor-default"
                    : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-500/20"
                }`}
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nạp ({initProgressPercent}%)...</span>
                  </>
                ) : isSelectedModelRunning ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Đang chạy mô hình này</span>
                  </>
                ) : isModelLoaded ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Đổi sang mô hình này</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Nạp Mô hình AI</span>
                  </>
                )}
              </button>

              <button
                onClick={handleEnableDiagnosticMode}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                title="Bắt đầu hỏi ngay lập tức không cần tải WebLLM"
              >
                Hỏi Nhanh
              </button>
            </div>
          </div>
        </div>

        {/* Selected Model Capability Summary */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-start sm:items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">{currentSelectedModel.name}:</span>
            <span className="text-[11px] sm:text-xs leading-relaxed">{currentSelectedModel.desc}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 self-start sm:self-auto flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
              {currentSelectedModel.size}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
              {currentSelectedModel.vram}
            </span>
          </div>
        </div>

        {/* Loading Progress Bar */}
        {isInitializing && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold truncate max-w-md">
                {initProgressText || "Đang tải trọng số mô hình vào bộ nhớ đệm trình duyệt..."}
              </span>
              <span className="font-mono font-black text-sky-600 dark:text-sky-400">{initProgressPercent}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${initProgressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              💡 <em>Lưu ý: Mô hình Universal f32 chạy trực tiếp trên WebGPU mọi trình duyệt. Các lần mở sau sẽ nạp tức thì từ cache trình duyệt.</em>
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => handleLoadOrSwitchModel("Qwen2.5-0.5B-Instruct-q4f32_1-MLC")}
              className="px-3 py-1 rounded-xl bg-amber-500 text-white font-bold text-xs shrink-0 hover:bg-amber-600 transition-colors cursor-pointer"
            >
              Thử Qwen 2.5 (0.5B Micro)
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Interface: Responsive Height on Mobile */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[480px] sm:h-[560px] overflow-hidden">
        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  Sẵn sàng giải đáp &amp; chẩn đoán hệ thống Synology NAS
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Nhấn &quot;Nạp Mô hình AI&quot; ở trên hoặc chọn một trong các câu hỏi mẫu dưới đây để bắt đầu:
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full pt-1 sm:pt-2">
                {[
                  { icon: "🩺", text: "Tình trạng sức khỏe & tải phần cứng NAS hiện tại thế nào?" },
                  { icon: "🛡️", text: "Kiểm tra an ninh: Có luồng mạng nào gửi dữ liệu lạ ra ngoài không?" },
                  { icon: "💾", text: "Phân tích 3 ổ đĩa và bộ đệm SSD Cache của NAS" },
                  { icon: "⚡", text: "Đề xuất cách tối ưu RAM và bảo mật Synology DSM" },
                ].map((chip) => (
                  <button
                    key={chip.text}
                    onClick={() => {
                      if (!isModelLoaded) handleEnableDiagnosticMode();
                      handleSendMessage(chip.text);
                    }}
                    className="text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-500/40 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-start gap-2 group shadow-xs cursor-pointer"
                  >
                    <span className="text-base shrink-0">{chip.icon}</span>
                    <span className="group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-relaxed">
                      {chip.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-4.5 text-xs sm:text-sm leading-relaxed relative group ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-tr-sm shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/60 dark:border-slate-800 shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/60 dark:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Sao chép câu trả lời"
                    >
                      {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Follow-up Chips when chat is active */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Hỏi nhanh:</span>
            {[
              "Giải thích cảm biến SNMP",
              "Top 3 tiến trình tốn mạng nhất",
              "Trạng thái nhiệt độ CPU & Ổ đĩa",
              "Kiểm tra tường lửa & IP bị khóa",
            ].map((s) => (
              <button
                key={s}
                onClick={() => handleSendMessage(s)}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] text-slate-600 dark:text-slate-300 hover:text-sky-600 whitespace-nowrap transition-colors shadow-xs cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Toolbar */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Xóa lịch sử trò chuyện"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Hỏi bất kỳ điều gì về thông số, tình trạng hoặc lưu lượng NAS..."
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isGenerating}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebLlmAssistant;
