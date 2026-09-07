"use client";

import React, { useState, useMemo } from "react";
import {
  Copy,
  Check,
  Download,
  Search,
  Maximize2,
  Minimize2,
  Terminal,
  WrapText,
  Sparkles,
  ChevronsUpDown,
  HardDrive,
  Server,
  AlertTriangle,
  CheckCircle2,
  Hash,
  LayoutList,
  Flame,
} from "lucide-react";
import { stripAnsi, SMART_DESCRIPTIONS, formatLifetimeSpan } from "@/lib/storage/synoSmartParser";

interface SynoSmartAnsiViewerProps {
  rawAnsi: string;
  title?: string;
  isScanning?: boolean;
  isEn?: boolean;
}

interface TextChunk {
  text: string;
  className: string;
}

export type ClassifiedLine =
  | {
      type: "host";
      raw: string;
      hostname: string;
      model: string;
      dsm: string;
      isAlert?: boolean;
    }
  | {
      type: "drive_header";
      raw: string;
      slot: string;
      model: string;
      serial: string;
      dev: string;
      isAlert?: boolean;
    }
  | {
      type: "smart_table_header";
      raw: string;
      isAlert?: boolean;
    }
  | {
      type: "smart_row";
      raw: string;
      id: number;
      name: string;
      flag: string;
      value: string;
      worst: string;
      thresh: string;
      attrType: string;
      updated: string;
      whenFailed: string;
      rawValue: string;
      status: "OK" | "WARN" | "FAIL";
      description?: string;
      isAlert?: boolean;
    }
  | {
      type: "key_value";
      raw: string;
      key: string;
      value: string;
      badgeType?: "passed" | "failed" | "warn" | "temp" | "wear" | "poh" | "capacity" | "default";
      isAlert?: boolean;
    }
  | {
      type: "divider";
      raw: string;
      isAlert?: boolean;
    }
  | {
      type: "plain";
      raw: string;
      isAlert?: boolean;
    };

// Map ANSI code to Tailwind utility classes
function ansiToClasses(codes: number[]): string {
  const classes: string[] = [];

  for (const c of codes) {
    switch (c) {
      case 0:
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
        classes.push("text-rose-500 dark:text-rose-400");
        break;
      case 32:
        classes.push("text-emerald-500 dark:text-emerald-400");
        break;
      case 33:
        classes.push("text-amber-400 dark:text-amber-300");
        break;
      case 34:
        classes.push("text-sky-400 dark:text-sky-300");
        break;
      case 35:
        classes.push("text-purple-400 dark:text-purple-300");
        break;
      case 36:
        classes.push("text-cyan-400 dark:text-cyan-300");
        break;
      case 37:
        classes.push("text-slate-200 dark:text-slate-100");
        break;

      // Bright foregrounds
      case 90:
        classes.push("text-slate-400");
        break;
      case 91:
        classes.push("text-rose-400 font-semibold");
        break;
      case 92:
        classes.push("text-emerald-400 font-semibold");
        break;
      case 93:
        classes.push("text-amber-300 font-semibold");
        break;
      case 94:
        classes.push("text-sky-300 font-semibold");
        break;
      case 95:
        classes.push("text-purple-300 font-semibold");
        break;
      case 96:
        classes.push("text-cyan-300 font-semibold");
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
      const parsedList = codeStr
        .split(";")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n));
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

/**
 * Classifies a raw output line into structured SMART sections with diagnostic alerts
 */
function classifyLine(rawLine: string, isEn: boolean): ClassifiedLine {
  const clean = stripAnsi(rawLine).trim();

  if (!clean) {
    return { type: "plain", raw: rawLine };
  }

  // 1. Divider line (===, ---, ___)
  if (/^[=\-_*#]{4,}$/.test(clean)) {
    return { type: "divider", raw: rawLine };
  }

  // 2. Host banner line (e.g. Synology-NAS DS920+ DSM 7.2.1-69057 Update 5)
  if (
    clean.includes("DSM ") &&
    (clean.includes("DS") ||
      clean.includes("SA") ||
      clean.includes("RS") ||
      clean.includes("FS") ||
      clean.includes("DVA") ||
      clean.toLowerCase().includes("synology"))
  ) {
    const parts = clean.split(/\s+/);
    if (parts.length >= 3) {
      return {
        type: "host",
        raw: rawLine,
        hostname: parts[0],
        model: parts[1],
        dsm: parts.slice(2).join(" "),
      };
    }
  }

  // 3. Drive header line (e.g. Drive 1 WD40EFRX-68N32N0 WD-WCC7K1234567 /dev/sata1)
  const driveHeaderRegex =
    /^(?:(M\.2\s+Drive\s+\d+|Drive\s+\d+|Disk\s+\d+|SATA\s+\d+|NVMe\s+\d+))\s+([A-Za-z0-9_\-\.\s]+?)\s+([A-Z0-9_\-]{5,})\s+(\/dev\/[a-z0-9]+)/i;
  const driveFallbackRegex =
    /^(?:(M\.2\s+Drive\s+\d+|Drive\s+\d+|Disk\s+\d+))\s+(.+?)\s+(\/dev\/[a-z0-9]+)/i;

  const dMatch = clean.match(driveHeaderRegex);
  if (dMatch) {
    return {
      type: "drive_header",
      raw: rawLine,
      slot: dMatch[1].trim(),
      model: dMatch[2].trim(),
      serial: dMatch[3].trim(),
      dev: dMatch[4].trim(),
    };
  }

  const dFallMatch = clean.match(driveFallbackRegex);
  if (dFallMatch) {
    const middleParts = dFallMatch[2].trim().split(/\s+/);
    const serial = middleParts.length > 1 ? middleParts.pop()! : "";
    const model = middleParts.join(" ") || "Unknown Model";
    return {
      type: "drive_header",
      raw: rawLine,
      slot: dFallMatch[1].trim(),
      model,
      serial,
      dev: dFallMatch[3].trim(),
    };
  }

  // 4. SMART Table Header (ID# ATTRIBUTE_NAME ...)
  if (clean.startsWith("ID#") && clean.includes("ATTRIBUTE_NAME")) {
    return { type: "smart_table_header", raw: rawLine };
  }

  // 5. SMART Table Row (e.g. 5 Reallocated_Sector_Ct 0x0033 200 200 140 Pre-fail Always - 0)
  if (!clean.startsWith("ID#") && !clean.startsWith("ATTRIBUTE_NAME")) {
    const tokens = clean.split(/\s+/);
    if (
      tokens.length >= 8 &&
      /^\d{1,3}$/.test(tokens[0]) &&
      /^[A-Za-z0-9_\-]+$/.test(tokens[1]) &&
      /^\d+$/.test(tokens[3]) &&
      /^\d+$/.test(tokens[4])
    ) {
      const id = parseInt(tokens[0], 10);
      const name = tokens[1];
      const flag = tokens[2];
      const value = tokens[3];
      const worst = tokens[4];
      const thresh = tokens[5];
      const attrType = tokens[6];
      const updated = tokens[7];

      let whenFailed = "-";
      let rawValue = "";

      if (
        tokens.length >= 10 &&
        (tokens[8] === "-" || tokens[8] === "FAILING_NOW" || tokens[8] === "In_the_past")
      ) {
        whenFailed = tokens[8];
        rawValue = tokens.slice(9).join(" ");
      } else {
        rawValue = tokens.slice(8).join(" ");
      }

      // Determine attribute status & whether it triggers an alert
      let status: "OK" | "WARN" | "FAIL" = "OK";
      let isAlert = false;

      const numVal = parseInt(value, 10);
      const numThresh = parseInt(thresh, 10);
      const numRaw = parseInt(rawValue.replace(/\D.*$/, ""), 10);

      if (
        whenFailed === "FAILING_NOW" ||
        (!isNaN(numThresh) && numThresh > 0 && !isNaN(numVal) && numVal <= numThresh)
      ) {
        status = "FAIL";
        isAlert = true;
      } else if (whenFailed === "In_the_past") {
        status = "WARN";
        isAlert = true;
      } else if (id === 5 || id === 197 || id === 198) {
        if (!isNaN(numRaw) && numRaw > 0) {
          status = numRaw > 20 ? "FAIL" : "WARN";
          isAlert = true;
        }
      } else if (id === 199) {
        if (!isNaN(numRaw) && numRaw > 0) {
          status = "WARN";
          isAlert = true;
        }
      } else if (id === 10 || id === 184 || id === 187) {
        if (!isNaN(numRaw) && numRaw > 0) {
          status = "WARN";
          isAlert = true;
        }
      } else if (id === 190 || id === 194) {
        if (!isNaN(numRaw) && numRaw >= 50) {
          status = "WARN";
          isAlert = true;
        }
      }

      const desc = isEn ? SMART_DESCRIPTIONS[id]?.en : SMART_DESCRIPTIONS[id]?.vi;

      return {
        type: "smart_row",
        raw: rawLine,
        id,
        name,
        flag,
        value,
        worst,
        thresh,
        attrType,
        updated,
        whenFailed,
        rawValue,
        status,
        description: desc,
        isAlert,
      };
    }
  }

  // 6. Key-Value telemetry lines (e.g. SMART overall-health self-assessment test result: PASSED)
  const kvMatch = clean.match(/^([A-Za-z0-9_\-\.\s\/\(\)]+?):\s*(.+)$/);
  if (kvMatch && kvMatch[1].length <= 48) {
    const key = kvMatch[1].trim();
    const value = kvMatch[2].trim();
    const keyLower = key.toLowerCase();
    const valLower = value.toLowerCase();

    let badgeType: "passed" | "failed" | "warn" | "temp" | "wear" | "poh" | "capacity" | "default" = "default";
    let isAlert = false;

    if (valLower.includes("passed") || valLower === "ok" || valLower.includes("no errors")) {
      badgeType = "passed";
    } else if (
      valLower.includes("failed") ||
      valLower.includes("failing") ||
      valLower.includes("critical")
    ) {
      badgeType = "failed";
      isAlert = true;
    } else if (keyLower.includes("error counter") || keyLower.includes("error log")) {
      const errNum = parseInt(value.replace(/\D.*$/, ""), 10);
      if (!isNaN(errNum) && errNum > 0) {
        badgeType = "failed";
        isAlert = true;
      } else {
        badgeType = "passed";
      }
    } else if (keyLower.includes("percentage used") || keyLower.includes("wear")) {
      badgeType = "wear";
      const wearVal = parseInt(value.replace(/\D.*$/, ""), 10);
      if (!isNaN(wearVal) && wearVal >= 80) isAlert = true;
    } else if (keyLower.includes("temperature")) {
      badgeType = "temp";
      const tempVal = parseInt(value.replace(/\D.*$/, ""), 10);
      if (!isNaN(tempVal) && tempVal >= 50) isAlert = true;
    } else if (keyLower.includes("power") && keyLower.includes("hour")) {
      badgeType = "poh";
    } else if (keyLower.includes("capacity")) {
      badgeType = "capacity";
    } else if (keyLower.includes("warning") && !valLower.includes("0x00") && valLower !== "0") {
      badgeType = "warn";
      isAlert = true;
    }

    return {
      type: "key_value",
      raw: rawLine,
      key,
      value,
      badgeType,
      isAlert,
    };
  }

  // 7. Plain line fallback
  const isErr =
    clean.toLowerCase().includes("failed") ||
    clean.toLowerCase().includes("error") ||
    clean.toLowerCase().includes("critical");
  return {
    type: "plain",
    raw: rawLine,
    isAlert: isErr,
  };
}

export const SynoSmartAnsiViewer: React.FC<SynoSmartAnsiViewerProps> = ({
  rawAnsi,
  title = "S.M.A.R.T. Raw Diagnostic Output (syno_smart_info.sh)",
  isScanning = false,
  isEn = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedForAi, setCopiedForAi] = useState(false);
  const [filter, setFilter] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const cleanText = useMemo(() => stripAnsi(rawAnsi), [rawAnsi]);

  // Parse lines and classify them
  const classifiedLines = useMemo(() => {
    const rawLines = rawAnsi.split(/\r?\n/);
    return rawLines.map((line) => classifyLine(line, isEn));
  }, [rawAnsi, isEn]);

  // Identify which drive headers have alerts associated with them
  const alertDriveHeaders = useMemo(() => {
    const setOfAlertDrives = new Set<string>();
    let currentSlot = "";
    for (const item of classifiedLines) {
      if (item.type === "drive_header") {
        currentSlot = `${item.slot}-${item.dev}`;
      } else if (item.isAlert && currentSlot) {
        setOfAlertDrives.add(currentSlot);
      }
    }
    return setOfAlertDrives;
  }, [classifiedLines]);

  // Filter lines based on text search and alert toggle
  const displayItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let currentSlot = "";

    return classifiedLines
      .map((item, idx) => ({ item, lineNum: idx + 1 }))
      .filter(({ item }) => {
        if (item.type === "drive_header") {
          currentSlot = `${item.slot}-${item.dev}`;
        }

        // Alert filter
        if (showOnlyAlerts) {
          if (item.type === "drive_header") {
            return alertDriveHeaders.has(currentSlot);
          }
          if (!item.isAlert) {
            return false;
          }
        }

        // Text query filter
        if (q) {
          const cleanLine = stripAnsi(item.raw).toLowerCase();
          return cleanLine.includes(q);
        }

        return true;
      });
  }, [classifiedLines, filter, showOnlyAlerts, alertDriveHeaders]);

  const alertCount = useMemo(() => {
    return classifiedLines.filter((l) => l.isAlert).length;
  }, [classifiedLines]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyForAi = () => {
    const aiPrompt = isEn
      ? `Analyze the following Synology NAS S.M.A.R.T. diagnostic report:\n1. Health assessment of each drive (PASSED, WARNING, CRITICAL).\n2. Check critical failure indicators: Bad/Reallocated sectors (ID 5), Pending sectors (ID 197), UDMA CRC (ID 199), Temperature, Power-on Hours, and NVMe Wear.\n3. Recommend concrete actions.\n\n=== SYNOLOGY S.M.A.R.T. REPORT ===\n${cleanText}\n=================================`
      : `Phân tích báo cáo S.M.A.R.T. ổ cứng Synology NAS bên dưới. Vui lòng cho tôi biết:
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

  /**
   * Render diagnostic raw value badge with color coding
   */
  const renderSmartRawValue = (row: Extract<ClassifiedLine, { type: "smart_row" }>) => {
    const numRaw = parseInt(row.rawValue.replace(/\D.*$/, ""), 10);

    // Bad/Reallocated/Pending Sectors
    if (row.id === 5 || row.id === 197 || row.id === 198) {
      if (!isNaN(numRaw) && numRaw > 0) {
        return (
          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold inline-flex items-center gap-1 shadow-sm">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{row.rawValue} Bad</span>
          </span>
        );
      }
      return <span className="text-emerald-400 font-semibold">{row.rawValue} (0)</span>;
    }

    // UDMA CRC Errors (SATA link/cable issue)
    if (row.id === 199) {
      if (!isNaN(numRaw) && numRaw > 0) {
        return (
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{row.rawValue} CRC</span>
          </span>
        );
      }
      return <span className="text-slate-400">{row.rawValue}</span>;
    }

    // Temperature
    if (row.id === 194 || row.id === 190) {
      const isHot = !isNaN(numRaw) && numRaw >= 48;
      return (
        <span
          className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
            isHot
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
          }`}
        >
          🌡️ {row.rawValue}°C
        </span>
      );
    }

    // Power-On Hours
    if (row.id === 9) {
      return (
        <span
          className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[11px] font-medium border border-sky-500/20"
          title={formatLifetimeSpan(numRaw)}
        >
          ⏱️ {row.rawValue}h
        </span>
      );
    }

    // Spin Retry, End-to-End, Uncorrectable
    if (row.id === 10 || row.id === 184 || row.id === 187) {
      if (!isNaN(numRaw) && numRaw > 0) {
        return (
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
            {row.rawValue}
          </span>
        );
      }
    }

    if (row.status === "FAIL") {
      return <span className="text-rose-400 font-bold">{row.rawValue}</span>;
    }
    if (row.status === "WARN") {
      return <span className="text-amber-300 font-semibold">{row.rawValue}</span>;
    }

    return <span className="text-slate-300">{row.rawValue}</span>;
  };

  /**
   * Render Key-Value telemetry with color badges
   */
  const renderKeyValueBadge = (item: Extract<ClassifiedLine, { type: "key_value" }>) => {
    switch (item.badgeType) {
      case "passed":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{item.value}</span>
          </span>
        );
      case "failed":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[11px] inline-flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{item.value}</span>
          </span>
        );
      case "warn":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px] inline-flex items-center gap-1">
            ⚠️ {item.value}
          </span>
        );
      case "temp":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
            🌡️ {item.value}
          </span>
        );
      case "wear":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
            🔋 {item.value}
          </span>
        );
      case "poh":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium text-[11px]">
            ⏱️ {item.value}
          </span>
        );
      case "capacity":
        return <span className="text-cyan-300 font-semibold">{item.value}</span>;
      default:
        return <span className="text-slate-200 font-medium">{item.value}</span>;
    }
  };

  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden transition-all flex flex-col ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "w-full"
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-2.5 flex-wrap">
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

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 ml-1">
            <button
              onClick={() => setViewMode("formatted")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "formatted"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Định dạng cột ngay ngắn, căn lề và tô màu trực quan"
            >
              <LayoutList className="w-3 h-3" />
              <span>{isEn ? "Formatted" : "Căn lề & Tô màu"}</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "raw"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Xem văn bản lệnh terminal gốc"
            >
              <Terminal className="w-3 h-3" />
              <span>{isEn ? "Raw ANSI" : "Terminal Gốc"}</span>
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alerts Only Toggle */}
          <button
            onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showOnlyAlerts
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : alertCount > 0
                ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                : "border-slate-700 text-slate-400 hover:bg-slate-800"
            }`}
            title="Lọc chỉ hiển thị các dòng có cảnh báo, lỗi sector, nhiệt độ cao hoặc ổ đĩa gặp vấn đề"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {isEn ? "Alerts" : "Cảnh báo"} {alertCount > 0 ? `(${alertCount})` : ""}
            </span>
          </button>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={isEn ? "Filter (e.g. 5, PASSED)..." : "Lọc (VD: 5, PASSED, sda)..."}
              className="pl-7 pr-6 py-1 bg-slate-800/90 text-slate-200 rounded-xl text-[11px] border border-slate-700 focus:outline-none focus:border-sky-500 w-36 sm:w-48"
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

          {/* Line Numbers Toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showLineNumbers
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-slate-700 hover:bg-slate-800 text-slate-400"
            }`}
            title="Bật/Tắt số thứ tự dòng (#)"
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          {/* Text Wrap Toggle */}
          <button
            onClick={() => setWrapText(!wrapText)}
            className={`p-1.5 rounded-xl border transition-colors ${
              wrapText
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-slate-700 hover:bg-slate-800 text-slate-400"
            }`}
            title={wrapText ? "Tắt tự xuống dòng (No Wrap)" : "Bật tự xuống dòng (Wrap Text)"}
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
            title={
              isExpanded
                ? "Thu gọn chiều cao (Fixed Height)"
                : "Hiển thị đầy đủ không giới hạn chiều cao (Expand Full Height)"
            }
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy for AI Button */}
          <button
            onClick={handleCopyForAi}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Sao chép toàn bộ báo cáo kèm câu lệnh gợi ý để dán vào AI phân tích (ChatGPT, Claude, Gemini, WebLLM)"
          >
            {copiedForAi ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span className="hidden sm:inline">{copiedForAi ? "Đã chép cho AI!" : "Copy cho AI"}</span>
          </button>

          {/* Copy Clean Text */}
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy clean report to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Download Text */}
          <button
            onClick={handleDownload}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download report (.txt)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Fullscreen Toggle */}
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
        className={`p-3 sm:p-4 font-mono text-xs sm:text-[13px] leading-relaxed overflow-auto ${
          isFullscreen ? "flex-1" : isExpanded ? "max-h-none min-h-[360px]" : "max-h-[580px]"
        } select-text selection:bg-sky-500/30 selection:text-white`}
      >
        {displayItems.length === 0 ? (
          <div className="text-slate-500 text-center py-12 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6 text-slate-600" />
            <span>
              {showOnlyAlerts
                ? isEn
                  ? "🎉 No warnings or errors detected! All drives are healthy."
                  : "🎉 Tuyệt vời! Không phát hiện cảnh báo hoặc lỗi nào trên các ổ đĩa."
                : `Không có dòng nào khớp với "${filter}"`}
            </span>
            {showOnlyAlerts && (
              <button
                onClick={() => setShowOnlyAlerts(false)}
                className="mt-2 text-xs text-sky-400 hover:underline font-semibold"
              >
                {isEn ? "View all lines" : "Xem lại toàn bộ báo cáo"}
              </button>
            )}
          </div>
        ) : viewMode === "raw" ? (
          /* RAW ANSI MODE */
          displayItems.map(({ item, lineNum }, idx) => {
            const tokens = parseAnsiTokens(item.raw);
            return (
              <div
                key={idx}
                className={`flex items-start ${wrapText ? "break-words" : "whitespace-pre"} py-0.5 hover:bg-slate-900/60 px-1 rounded transition-colors`}
              >
                {showLineNumbers && (
                  <span className="w-10 text-right pr-3 text-slate-600 select-none text-[11px] shrink-0 font-mono">
                    {lineNum}
                  </span>
                )}
                <div className="flex-1">
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
              </div>
            );
          })
        ) : (
          /* FORMATTED & JUSTIFIED MODE */
          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-0.5">
              {displayItems.map(({ item, lineNum }, idx) => {
                const renderGutter = () =>
                  showLineNumbers ? (
                    <div className="w-10 text-right pr-2 text-slate-600 select-none text-[11px] shrink-0 font-mono py-1">
                      {lineNum}
                    </div>
                  ) : null;

                // 1. Host banner
                if (item.type === "host") {
                  return (
                    <div key={idx} className="flex items-center py-1">
                      {renderGutter()}
                      <div className="flex-1 my-1 p-3 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-500/30 flex items-center justify-between gap-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <Server className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="font-bold text-white text-sm">{item.hostname}</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
                            {item.model}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          {item.dsm}
                        </span>
                      </div>
                    </div>
                  );
                }

                // 2. Drive Header card
                if (item.type === "drive_header") {
                  return (
                    <div key={idx} className="flex items-center pt-3 pb-1">
                      {renderGutter()}
                      <div className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-sky-500/30 shadow-md flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                            <HardDrive className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs border border-sky-500/30">
                              {item.slot}
                            </span>
                            <span className="font-bold text-white text-sm">{item.model}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-amber-300/90 border border-slate-700">
                            S/N: {item.serial}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700">
                            {item.dev}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 3. SMART Table Header (Justified Column Titles)
                if (item.type === "smart_table_header") {
                  return (
                    <div key={idx} className="flex items-center sticky top-0 z-10">
                      {renderGutter()}
                      <div className="flex-1 flex items-center text-[11px] font-mono font-bold uppercase tracking-wider py-2 px-2.5 bg-slate-900/95 text-slate-400 border-y border-slate-800 rounded-lg select-none backdrop-blur shadow-sm">
                        <div className="w-12 text-right pr-2 shrink-0">ID#</div>
                        <div className="w-56 sm:w-64 shrink-0 pl-1">ATTRIBUTE NAME</div>
                        <div className="w-16 text-center shrink-0">FLAG</div>
                        <div className="w-12 text-right pr-2 shrink-0">VAL</div>
                        <div className="w-12 text-right pr-2 shrink-0">WORST</div>
                        <div className="w-14 text-right pr-2 shrink-0">THRESH</div>
                        <div className="w-20 text-center shrink-0">TYPE</div>
                        <div className="w-18 text-center shrink-0">UPDATED</div>
                        <div className="w-20 text-center shrink-0">STATUS</div>
                        <div className="w-36 text-right pr-2 shrink-0">RAW VALUE</div>
                      </div>
                    </div>
                  );
                }

                // 4. SMART Table Row (Justified Values & Diagnostic Badges)
                if (item.type === "smart_row") {
                  const isFail = item.status === "FAIL";
                  const isWarn = item.status === "WARN";

                  return (
                    <div key={idx} className="flex items-center group">
                      {renderGutter()}
                      <div
                        className={`flex-1 flex items-center text-xs font-mono py-1 px-2.5 rounded-lg transition-colors border-b border-slate-900/50 ${
                          isFail
                            ? "bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/20"
                            : isWarn
                            ? "bg-amber-950/15 hover:bg-amber-950/30 border-amber-500/20"
                            : "hover:bg-slate-900/80"
                        }`}
                      >
                        {/* ID */}
                        <div className="w-12 text-right pr-2 text-cyan-400 font-semibold shrink-0">
                          {item.id}
                        </div>

                        {/* Name + Tooltip */}
                        <div
                          className="w-56 sm:w-64 shrink-0 pl-1 flex items-center gap-1.5 overflow-hidden"
                          title={item.description ? `${item.name}: ${item.description}` : item.name}
                        >
                          <span
                            className={`font-semibold truncate ${
                              isFail
                                ? "text-rose-400"
                                : isWarn
                                ? "text-amber-300"
                                : "text-slate-200"
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>

                        {/* Flag */}
                        <div className="w-16 text-center text-slate-500 text-[11px] shrink-0 font-mono">
                          {item.flag}
                        </div>

                        {/* Value */}
                        <div className="w-12 text-right pr-2 text-slate-300 font-medium shrink-0 font-mono">
                          {item.value}
                        </div>

                        {/* Worst */}
                        <div className="w-12 text-right pr-2 text-slate-400 shrink-0 font-mono">
                          {item.worst}
                        </div>

                        {/* Thresh */}
                        <div className="w-14 text-right pr-2 text-slate-400 shrink-0 font-mono">
                          {item.thresh}
                        </div>

                        {/* Type */}
                        <div className="w-20 text-center text-slate-400 text-[11px] shrink-0 font-mono">
                          {item.attrType}
                        </div>

                        {/* Updated */}
                        <div className="w-18 text-center text-slate-400 text-[11px] shrink-0 font-mono">
                          {item.updated}
                        </div>

                        {/* Status (When Failed) */}
                        <div className="w-20 text-center shrink-0">
                          {item.whenFailed === "FAILING_NOW" ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/40 animate-pulse">
                              FAILING
                            </span>
                          ) : item.whenFailed === "In_the_past" ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                              PAST_ERR
                            </span>
                          ) : (
                            <span className="text-emerald-400/80 font-semibold">-</span>
                          )}
                        </div>

                        {/* Raw Value */}
                        <div className="w-36 text-right pr-2 font-mono shrink-0">
                          {renderSmartRawValue(item)}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 5. Key-Value telemetry line
                if (item.type === "key_value") {
                  return (
                    <div key={idx} className="flex items-center">
                      {renderGutter()}
                      <div className="flex-1 flex items-center justify-between gap-3 py-1 px-3 hover:bg-slate-900/50 rounded-lg transition-colors text-xs font-mono">
                        <div className="flex items-center gap-2 text-slate-400 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                          <span className="truncate font-medium">{item.key}</span>
                        </div>
                        <div className="shrink-0">{renderKeyValueBadge(item)}</div>
                      </div>
                    </div>
                  );
                }

                // 6. Section divider
                if (item.type === "divider") {
                  return (
                    <div key={idx} className="flex items-center py-1">
                      {renderGutter()}
                      <div className="flex-1 border-t border-slate-800/80 my-1.5" />
                    </div>
                  );
                }

                // 7. Plain line
                const tokens = parseAnsiTokens(item.raw);
                return (
                  <div key={idx} className="flex items-center">
                    {renderGutter()}
                    <div
                      className={`flex-1 py-0.5 px-2 hover:bg-slate-900/50 rounded text-slate-400 ${
                        wrapText ? "break-words" : "whitespace-pre"
                      }`}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status & Color Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
            <span>{isEn ? "Passed / Healthy (0 Bad)" : "Bình thường / 0 Bad"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm" />
            <span>{isEn ? "Warning / Temp / CRC" : "Cảnh báo / Nhiệt độ / CRC"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-sm" />
            <span>{isEn ? "Failed / Bad Sectors" : "Nguy hiểm / Bad Sector"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block shadow-sm" />
            <span>{isEn ? "NVMe Wear %" : "Hao mòn NVMe %"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block shadow-sm" />
            <span>{isEn ? "Power-On Hours" : "Giờ chạy (POH)"}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono">
          {showOnlyAlerts && (
            <span className="text-amber-400 font-semibold">
              {isEn ? "Filtering Alerts" : "Đang lọc cảnh báo"} •
            </span>
          )}
          <span>
            {displayItems.length} {isEn ? "lines" : "dòng"}
          </span>
        </div>
      </div>
    </div>
  );
};

