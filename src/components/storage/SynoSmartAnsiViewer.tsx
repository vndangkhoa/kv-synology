"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, Download, Search, Maximize2, Minimize2, Terminal, WrapText, Sparkles, ChevronsUpDown } from "lucide-react";
import { stripAnsi } from "@/lib/storage/synoSmartParser";

interface SynoSmartAnsiViewerProps {
  rawAnsi: string;
  title?: string;
  isScanning?: boolean;
}

interface TextChunk {
  text: string;
  className: string;
}


// Map ANSI code to Tailwind utility classes
function ansiToClasses(codes: number[]): string {
  const classes: string[] = [];

  for (const c of codes) {
    switch (c) {
      case 0:
        // Reset
        return "";
      case 1:
        classes.push("font-bold");
        break;
      case 2:
        classes.push("opacity-75");
        break;
      case 4:
        classes.push("underline");
        break;
      case 7:
        classes.push("bg-slate-200 dark:bg-slate-700 text-black dark:text-white");
        break;

      // Standard foregrounds
      case 30:
        classes.push("text-slate-400 dark:text-slate-500");
        break;
      case 31:
        classes.push("text-rose-600 dark:text-rose-400");
        break;
      case 32:
        classes.push("text-emerald-600 dark:text-emerald-400");
        break;
      case 33:
        classes.push("text-amber-500 dark:text-amber-400");
        break;
      case 34:
        classes.push("text-sky-600 dark:text-sky-400");
        break;
      case 35:
        classes.push("text-purple-600 dark:text-purple-400");
        break;
      case 36:
        classes.push("text-cyan-600 dark:text-cyan-400");
        break;
      case 37:
        classes.push("text-slate-200 dark:text-slate-100");
        break;

      // Bright foregrounds
      case 90:
        classes.push("text-slate-400");
        break;
      case 91:
        classes.push("text-rose-500 dark:text-rose-300 font-semibold");
        break;
      case 92:
        classes.push("text-emerald-500 dark:text-emerald-300 font-semibold");
        break;
      case 93:
        classes.push("text-amber-400 dark:text-amber-300 font-semibold");
        break;
      case 94:
        classes.push("text-sky-400 dark:text-sky-300 font-semibold");
        break;
      case 95:
        classes.push("text-purple-400 dark:text-purple-300 font-semibold");
        break;
      case 96:
        classes.push("text-cyan-400 dark:text-cyan-300 font-semibold");
        break;
      case 97:
        classes.push("text-white font-semibold");
        break;

      // Backgrounds
      case 41:
        classes.push("bg-rose-700 text-white px-1.5 py-0.5 rounded");
        break;
      case 42:
        classes.push("bg-emerald-700 text-white px-1.5 py-0.5 rounded");
        break;
      case 43:
        classes.push("bg-amber-600 text-slate-900 px-1.5 py-0.5 rounded");
        break;
    }
  }

  return classes.join(" ");
}

/**
 * Tokenize string with ANSI escape codes into styled chunks
 */
function parseAnsiTokens(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const regex = /\x1B\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentCodes: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawTextBefore = text.slice(lastIndex, match.index);
    if (rawTextBefore) {
      chunks.push({
        text: rawTextBefore,
        className: ansiToClasses(currentCodes),
      });
    }

    const codeStr = match[1];
    if (!codeStr || codeStr === "0") {
      currentCodes = [];
    } else {
      const parsedList = codeStr.split(";").map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
      for (const n of parsedList) {
        if (n === 0) currentCodes = [];
        else currentCodes.push(n);
      }
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    chunks.push({
      text: remaining,
      className: ansiToClasses(currentCodes),
    });
  }

  return chunks;
}

export const SynoSmartAnsiViewer: React.FC<SynoSmartAnsiViewerProps> = ({
  rawAnsi,
  title = "S.M.A.R.T. Raw Diagnostic Output (syno_smart_info.sh)",
  isScanning = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedForAi, setCopiedForAi] = useState(false);
  const [filter, setFilter] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const cleanText = useMemo(() => stripAnsi(rawAnsi), [rawAnsi]);

  const filteredLines = useMemo(() => {
    if (!filter.trim()) return rawAnsi.split(/\r?\n/);
    const q = filter.toLowerCase();
    return rawAnsi.split(/\r?\n/).filter((line) => stripAnsi(line).toLowerCase().includes(q));
  }, [rawAnsi, filter]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyForAi = () => {
    const aiPrompt = `Phân tích báo cáo S.M.A.R.T. ổ cứng Synology NAS bên dưới. Vui lòng cho tôi biết:
1. Đánh giá sức khỏe tổng quan của từng ổ cứng (PASSED, OK, Cảnh báo WARNING hay Nguy hiểm CRITICAL).
2. Kiểm tra các chỉ số rủi ro hỏng hóc:
   - Bad Sectors & Reallocated Sectors (ID 5)
   - Current Pending Sectors (ID 197)
   - UDMA CRC Errors (ID 199 - lỗi cáp/tiếp xúc SATA)
   - Nhiệt độ hoạt động (°C)
   - Thời gian hoạt động (Power-On Hours ID 9)
   - Độ hao mòn NVMe Wear Leveling (Percentage Used)
3. Đề xuất hành động cụ thể cho tôi (ổ nào an toàn, ổ nào cần theo dõi sát sao, ổ nào cần sao lưu và thay thế gấp).

=== DỮ LIỆU BÁO CÁO S.M.A.R.T. SYNOLOGY ===
${cleanText}
==========================================`;
    navigator.clipboard.writeText(aiPrompt);
    setCopiedForAi(true);
    setTimeout(() => setCopiedForAi(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `synology_smart_report_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden transition-all flex flex-col ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "w-full"
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-300">{title}</span>
            {isScanning && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Scanning...
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter output (e.g. Drive, PASSED)..."
              className="pl-7 pr-2.5 py-1 bg-slate-800/90 text-slate-200 rounded-xl text-[11px] border border-slate-700 focus:outline-none focus:border-sky-500 w-44 sm:w-56"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setWrapText(!wrapText)}
            className={`p-1.5 rounded-xl border transition-colors ${
              wrapText
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-slate-700 hover:bg-slate-800 text-slate-400"
            }`}
            title={wrapText ? "Disable Text Wrap" : "Enable Text Wrap"}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Expand Height Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-xl border transition-colors ${
              isExpanded
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-slate-700 hover:bg-slate-800 text-slate-400"
            }`}
            title={isExpanded ? "Thu gọn chiều cao (Fixed Height)" : "Hiển thị đầy đủ không giới hạn chiều cao (Expand Full Height)"}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy for AI Button */}
          <button
            onClick={handleCopyForAi}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Sao chép toàn bộ báo cáo kèm câu lệnh gợi ý để dán vào AI phân tích (ChatGPT, Claude, Gemini, WebLLM)"
          >
            {copiedForAi ? <Check className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>{copiedForAi ? "Đã chép cho AI!" : "Copy cho AI"}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy clean report to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download report (.txt)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        className={`p-4 font-mono text-xs sm:text-[13px] leading-relaxed overflow-auto ${
          isFullscreen ? "flex-1" : isExpanded ? "max-h-none min-h-[300px]" : "max-h-[520px]"
        } select-text selection:bg-sky-500/30 selection:text-white`}
      >
        {filteredLines.length === 0 ? (
          <div className="text-slate-500 text-center py-12">
            No lines match &ldquo;{filter}&rdquo;
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            const tokens = parseAnsiTokens(line);
            return (
              <div
                key={idx}
                className={`${wrapText ? "break-words" : "whitespace-pre"} py-0.5 hover:bg-slate-900/60 px-1 rounded transition-colors`}
              >
                {tokens.length > 0 ? (
                  tokens.map((tok, tIdx) => (
                    <span key={tIdx} className={tok.className}>
                      {tok.text}
                    </span>
                  ))
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Drive Header
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Passed / OK
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Error / Bad
          </span>
        </div>
        <span className="font-mono">{filteredLines.length} lines</span>
      </div>
    </div>
  );
};
