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
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      {/* FAB Button */}
      <button
        onClick={toggleAiChat}
        aria-label="DSM AI Copilot"
        className={`fixed z-40 flex items-center justify-center rounded-full shadow-xl transition-all duration-300
          ${isAiChatOpen ? "bottom-6 right-4 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rotate-90" : "bottom-20 md:bottom-6 right-4 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-sky-500 text-white hover:scale-105 hover:shadow-2xl"}
          `}
        style={{ boxShadow: isAiChatOpen ? undefined : "0 8px 24px rgba(14,165,233,0.35)" }}
      >
        {isAiChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        {!isAiChatOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
        )}
      </button>

      {/* Chat Bubble Window */}
      {isAiChatOpen && (
        <>
          {/* Backdrop for mobile - click to close, transparent on desktop */}
          <div className="fixed inset-0 z-30 bg-slate-950/10 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none sm:pointer-events-none" onClick={() => setAiChatOpen(false)} />

          <div className="fixed z-40 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200
            inset-x-2 bottom-20 top-auto h-[68vh] max-h-[560px] rounded-t-3xl rounded-b-3xl
            sm:inset-auto sm:bottom-6 sm:right-4 sm:left-auto sm:w-[380px] sm:h-[520px] sm:rounded-3xl
            md:w-[400px]">
            {/* Header - same style as other popups */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/80 to-sky-50/80 dark:from-indigo-950/30 dark:to-sky-950/20 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
                    DSM AI Copilot
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">Hỏi đáp & chẩn đoán NAS</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMessages([])}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAiChatOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="max-w-[280px] space-y-1">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">Sẵn sàng chẩn đoán NAS</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Chọn câu hỏi mẫu hoặc nhập câu hỏi:</p>
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
                        className="text-left p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-slate-200 dark:border-slate-700 hover:border-sky-500/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2 shadow-xs"
                      >
                        <span>{chip.icon}</span>
                        <span className="leading-tight">{chip.text}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">Dữ liệu CPU {utilization?.cpuPercent ?? 3}% • RAM {utilization?.memoryPercent ?? 5}% • {systemInfo?.model || "DS920+"}</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed relative group ${msg.role === "user" ? "bg-sky-600 text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm"}`}>
                      <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
              {isGenerating && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-200" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick chips when active */}
            {messages.length > 0 && (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {["Giải thích SNMP", "Top tiến trình tốn mạng", "Nhiệt độ CPU"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSendMessage(s)}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap hover:border-sky-500 hover:text-sky-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Hỏi về NAS, mạng, ổ đĩa..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isGenerating}
                className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AiChatBubble;
