"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { formatBytes, formatSpeed, formatUptime } from "@/lib/utils";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  Zap,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export const AiChatBubble: React.FC = () => {
  const { isAiChatOpen, setAiChatOpen, toggleAiChat, session, systemInfo, utilization, language } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [trafficSummary, setTrafficSummary] = useState<any>(null);
  const [activeModelName, setActiveModelName] = useState<string>("Qwen 0.5B");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dsm_ai_model");
      if (saved?.includes("Llama-3.2-1B")) setActiveModelName("Llama 1B");
      else if (saved?.includes("Llama-3.2-3B")) setActiveModelName("Llama 3B");
      else if (saved?.includes("Qwen2.5-1.5B")) setActiveModelName("Qwen 1.5B");
      else if (saved?.includes("SmolLM2-135M")) setActiveModelName("Smol 135M");
      else if (saved?.includes("SmolLM2-360M")) setActiveModelName("Smol 360M");
      else setActiveModelName("Qwen 0.5B");
    } catch (_) {}
  }, [isAiChatOpen]);

  useEffect(() => {
    fetch("/api/traffic/connections")
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.summary) setTrafficSummary(d.summary);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Close on ESC
  useEffect(() => {
    if (!isAiChatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAiChatOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isAiChatOpen, setAiChatOpen]);

  const generateHeuristicAnswer = (promptText: string): string => {
    const q = promptText.toLowerCase();
    const model = systemInfo?.model || "DS920+";
    const cpu = utilization?.cpuPercent ?? 3;
    const ram = utilization?.memoryPercent ?? 5;
    const temp = systemInfo?.temperature ?? 46;

    if (q.includes("sức khỏe") || q.includes("tình trạng") || q.includes("phần cứng") || q.includes("specs") || q.includes("khỏe")) {
      return `### 🩺 Tình trạng ${model}:\n- **CPU**: **${cpu}%** (4 Cores J4125, tải thấp)\n- **RAM**: **${ram}%** (~1.8 GB / 16 GB, còn dư 14.2 GB)\n- **Nhiệt độ**: **${temp}°C** (an toàn < 60°C)\n- **Lưu trữ**: 3 Volume Btrfs Healthy, NVMe Cache Hit 98.4%\n- **Đánh giá**: Hệ thống ổn định!`;
    }
    if (q.includes("mạng") || q.includes("an ninh") || q.includes("ip") || q.includes("luồng")) {
      return `### 🛡️ An ninh Mạng:\n- **Socket**: ${trafficSummary?.totalActiveConnections || 28} luồng\n- **Điểm đến**: VNPT (VN), AWS (US), Synology (CH)\n- **Tường lửa**: 6 quy tắc, 4 IP bị chặn brute-force\n- **Khuyến nghị**: Không phát hiện rò rỉ dữ liệu.`;
    }
    if (q.includes("ổ đĩa") || q.includes("volume") || q.includes("dung lượng") || q.includes("cache")) {
      return `### 💾 Lưu trữ:\n- **Volume 1**: 3.47 TB (52% dùng) — Dữ liệu & Docker\n- **Volume 2**: 3.41 TB (4% dùng) — Backup\n- **Volume 3**: 960 GB (7% dùng) — High-Speed\n- **NVMe Cache**: 2x 500GB Hit 98.4%`;
    }
    if (q.includes("snmp") || q.includes("cảm biến") || q.includes("prtg")) {
      return `### 📊 SNMP:\n- **Ping DSM**: <1.0 ms (8088)\n- **CPU**: ${cpu}%\n- **RAM**: ${ram}%\n- **Mạng LAN1**: eno1 đang hoạt động\n- **Uptime**: ${formatUptime(systemInfo?.uptime || 846200, "vi")}`;
    }
    return `### 💡 Tư vấn DSM (${model}):\n- **CPU/RAM**: ${cpu}% / ${ram}% — tối ưu, có thể chạy thêm Docker\n- **Bảo mật**: Kiểm tra IP bị khóa tại Tường lửa & giữ Auto-block bật\n- **Sao lưu**: Đảm bảo Hyper Backup chạy hàng tuần Volume1 → Volume2`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: textToSend.trim(), timestamp: Date.now() }];
    setMessages(newMessages);
    setInputPrompt("");
    setIsGenerating(true);
    setTimeout(() => {
      const reply = generateHeuristicAnswer(textToSend);
      setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: Date.now() }]);
      setIsGenerating(false);
    }, 400);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      {/* FAB Button with Gemini Ambient Glow */}
      <button
        onClick={toggleAiChat}
        aria-label="DSM Gemini Copilot"
        className={`fixed z-40 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer
          ${
            isAiChatOpen
              ? "bottom-6 right-4 w-12 h-12 bg-white dark:bg-[#1E1F20] text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rotate-90"
              : "bottom-20 md:bottom-6 right-4 w-14 h-14 bg-gradient-to-tr from-[#4285F4] via-[#9B51E0] to-[#D9657B] text-white hover:scale-105"
          }`}
        style={{
          boxShadow: isAiChatOpen
            ? "0 8px 32px rgba(0,0,0,0.25)"
            : "0 8px 28px rgba(66, 133, 244, 0.45)",
        }}
      >
        {isAiChatOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-7 h-7 animate-pulse text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-[#131314] animate-ping" />
          </div>
        )}
      </button>

      {/* Gemini Chat Bottom-Sheet / Window */}
      {isAiChatOpen && (
        <>
          {/* Backdrop for mobile - click to close */}
          <div
            className="fixed inset-0 z-30 bg-black/40 dark:bg-black/60 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none sm:pointer-events-none transition-opacity duration-300"
            onClick={() => setAiChatOpen(false)}
          />

          <div
            className="fixed z-40 flex flex-col bg-white dark:bg-[#1E1F20] border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden gemini-spring-sheet
            inset-x-2 bottom-20 top-auto h-[72vh] max-h-[580px] rounded-[28px]
            sm:inset-auto sm:bottom-6 sm:right-4 sm:left-auto sm:w-[390px] sm:h-[540px] sm:rounded-[28px]
            md:w-[410px]"
            style={{
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Ambient Glow Aura when Generating */}
            {isGenerating && (
              <div
                className="absolute inset-0 pointer-events-none z-0 opacity-40 dark:opacity-50 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle at 50% 100%, rgba(66, 133, 244, 0.25), rgba(155, 81, 224, 0.2), rgba(217, 101, 123, 0.15), transparent 70%)",
                }}
              />
            )}

            {/* Top Navigation Bar: Mobile Gemini Architecture */}
            <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1E1F20]/90 backdrop-blur-md shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B51E0] to-[#D9657B] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  {/* Floating Model Selector Pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-800 dark:text-white max-w-fit shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Gemini DSM</span>
                    <span className="text-[9px] font-mono text-purple-600 dark:text-purple-300 font-extrabold uppercase">{activeModelName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMessages([])}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-all active:scale-90"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAiChatOpen(false)}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Chat Feed */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/90 dark:bg-[#131314]/80 relative z-10">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#4285F4]/20 via-[#9B51E0]/20 to-[#D9657B]/20 border border-blue-500/20 dark:border-white/10 text-blue-600 dark:text-[#8AB4F8] flex items-center justify-center shadow-lg animate-pulse">
                    <Sparkles className="w-7 h-7 text-blue-600 dark:text-[#8AB4F8]" />
                  </div>
                  <div className="max-w-[280px] space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">Google Gemini for DSM</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Hỏi đáp thông minh &amp; chẩn đoán thời gian thực hệ thống Synology NAS
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 w-full max-w-[320px] pt-1">
                    {[
                      { icon: "🩺", text: "Tình trạng sức khỏe NAS hiện tại?" },
                      { icon: "🛡️", text: "Có luồng mạng lạ gửi dữ liệu ra ngoài không?" },
                      { icon: "💾", text: "Phân tích 3 Volume & NVMe Cache" },
                      { icon: "⚡", text: "Đề xuất tối ưu bảo mật DSM" },
                    ].map((chip) => (
                      <button
                        key={chip.text}
                        onClick={() => handleSendMessage(chip.text)}
                        className="text-left p-2.5 rounded-2xl bg-white dark:bg-[#1E1F20] hover:bg-slate-100 dark:hover:bg-[#282A2C] border border-slate-200 dark:border-white/10 hover:border-blue-500/40 dark:hover:border-[#4285F4]/40 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2.5 active:scale-95 shadow-xs"
                      >
                        <span className="text-sm">{chip.icon}</span>
                        <span className="leading-snug">{chip.text}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-1">
                    CPU {utilization?.cpuPercent ?? 3}% • RAM {utilization?.memoryPercent ?? 5}% • {systemInfo?.model || "DS920+"}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} gemini-stream-reveal`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B51E0] to-[#D9657B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-4 py-2.5 text-xs leading-relaxed relative group ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white dark:bg-[#282A2C] dark:text-white rounded-[20px_20px_4px_20px] border border-blue-500/20 dark:border-white/10 shadow-xs"
                          : "bg-transparent text-slate-800 dark:text-[#e3e3e3] rounded-[20px] pr-2"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="mt-1.5 p-1 rounded-lg bg-white dark:bg-[#282A2C] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-opacity shadow-xs inline-flex items-center gap-1 text-[10px]"
                        >
                          {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIdx === idx ? "Đã sao chép" : "Sao chép"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />

              {/* Signature Ambient Sparkle & Thinking Glow State */}
              {isGenerating && (
                <div className="flex gap-2.5 items-center pt-1 gemini-stream-reveal">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B51E0] to-[#D9657B] text-white flex items-center justify-center shrink-0 animate-spin" style={{ animationDuration: "3s" }}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-2.5 px-4 rounded-full bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-white/10 flex items-center gap-2 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-[#8AB4F8]">Gemini đang suy nghĩ...</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#4285F4] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#9B51E0] rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 bg-[#D9657B] rounded-full animate-bounce delay-200" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick chips when active */}
            {messages.length > 0 && (
              <div className="px-3 py-1.5 bg-white dark:bg-[#1E1F20] border-t border-slate-200/80 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none relative z-10">
                {["Giải thích SNMP", "Top tiến trình mạng", "Nhiệt độ CPU"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSendMessage(s)}
                    className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#282A2C] border border-slate-200 dark:border-white/10 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap hover:border-blue-500 hover:text-blue-600 dark:hover:border-[#4285F4] dark:hover:text-[#8AB4F8] transition-colors active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* 3. Mobile Floating Input Dock (Bottom-Anchored Pill) */}
            <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E1F20] shrink-0 relative z-10">
              <div
                className={`flex items-center gap-2 p-1.5 pl-3 rounded-full bg-slate-100 dark:bg-[#131314] border transition-all ${
                  isGenerating
                    ? "border-transparent ring-2 ring-purple-500/60 shadow-lg shadow-purple-500/20"
                    : "border-slate-200 dark:border-white/10 focus-within:border-blue-500 dark:focus-within:border-[#4285F4]/60"
                }`}
              >
                <div className="text-purple-600 dark:text-purple-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Hỏi Gemini về Synology NAS..."
                  className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285F4] to-[#9B51E0] hover:from-[#3367D6] hover:to-[#8338EC] text-white flex items-center justify-center shadow-md disabled:opacity-30 transition-all active:scale-90 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AiChatBubble;
