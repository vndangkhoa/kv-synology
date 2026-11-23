import { SynoSmartParsedReport, SynoSmartDriveSummary, SmartAttributeRow, NvmeSpecRow } from "@/lib/dsm/types";

/**
 * Descriptions for common S.M.A.R.T. attributes in English & Vietnamese
 */
export const SMART_DESCRIPTIONS: Record<number, { en: string; vi: string; isCritical?: boolean }> = {
  1: { en: "Raw Read Error Rate - hardware read errors from disk surface", vi: "Tỷ lệ lỗi đọc thô từ bề mặt đĩa", isCritical: true },
  3: { en: "Spin Up Time - average time to spin up platers", vi: "Thời gian khởi động tăng tốc đĩa từ" },
  4: { en: "Start/Stop Count - tally of spindle start/stop cycles", vi: "Số lần bật/dừng trục quay đĩa" },
  5: { en: "Reallocated Sectors Count - damaged sectors retired by drive", vi: "Số sector bị lỗi đã được thay thế (Rất quan trọng)", isCritical: true },
  7: { en: "Seek Error Rate - rate of positioning errors of magnetic heads", vi: "Tỷ lệ lỗi định vị đầu đọc" },
  8: { en: "Seek Time Performance - average performance of seek operations", vi: "Hiệu năng thời gian tìm kiếm track" },
  9: { en: "Power-On Hours - total hours in power-on state", vi: "Tổng số giờ đĩa đã chạy thực tế" },
  10: { en: "Spin Retry Count - count of spin-start attempts that failed", vi: "Số lần thử lại khởi động trục quay thất bại", isCritical: true },
  11: { en: "Calibration Retry Count - count of recalibration requests", vi: "Số lần thử hiệu chuẩn lại cơ học" },
  12: { en: "Power Cycle Count - count of full on/off power cycles", vi: "Số lần bật tắt nguồn thiết bị" },
  183: { en: "SATA Downshift Error Count - interface link speed drops", vi: "Số lần hạ tốc độ băng thông kết nối SATA" },
  184: { en: "End-to-End Error - parity/checksum error in internal cache", vi: "Lỗi toàn vẹn dữ liệu bộ nhớ đệm nội bộ", isCritical: true },
  187: { en: "Reported Uncorrectable Errors - errors unfixable via ECC", vi: "Lỗi không thể sửa bằng mã sửa lỗi phần cứng", isCritical: true },
  188: { en: "Command Timeout - aborted commands due to timeout", vi: "Số lệnh bị hủy do quá thời gian chờ (Timeout)" },
  190: { en: "Airflow Temperature - internal airflow sensor", vi: "Nhiệt độ luồng khí làm mát bên trong" },
  191: { en: "G-Sense Error Rate - shock/vibration sensor triggers", vi: "Số lần phát hiện va đập/rung lắc cơ học" },
  192: { en: "Power-off Retract Count - emergency head unloads", vi: "Số lần rút đầu đọc khẩn cấp khi ngắt điện đột ngột" },
  193: { en: "Load/Unload Cycle Count - count of head park/load cycles", vi: "Chu kỳ đóng/đỗ đầu đọc từ" },
  194: { en: "Temperature Celsius - internal temperature sensor", vi: "Nhiệt độ cảm biến lõi ổ đĩa (°C)" },
  195: { en: "Hardware ECC Recovered - on-the-fly ECC error recoveries", vi: "Số lỗi đã được khôi phục tức thời bằng phần cứng ECC" },
  196: { en: "Reallocation Event Count - attempts to reallocate bad sectors", vi: "Số lần thực hiện hoán đổi sector hỏng", isCritical: true },
  197: { en: "Current Pending Sector Count - unstable sectors awaiting reallocation", vi: "Số sector lỗi đang chờ phân bổ lại (Rất nguy hiểm)", isCritical: true },
  198: { en: "Offline Uncorrectable Sector Count - uncorrectable sectors found during offline scan", vi: "Số sector hỏng vĩnh viễn không thể cứu dữ liệu", isCritical: true },
  199: { en: "UDMA CRC Error Count - interface communication cable/backplane errors", vi: "Lỗi bắt tay tín hiệu truyền dẫn cáp / khay cắm SATA" },
  200: { en: "Multi-Zone Error Rate - write error rate detected", vi: "Tỷ lệ lỗi ghi nhiều vùng trên đĩa" },
  231: { en: "SSD Life Left / Temperature", vi: "Tuổi thọ chip nhớ SSD còn lại (%)" },
  232: { en: "Available Reserved Space - SSD spare blocks percentage", vi: "Tỷ lệ dung lượng dự phòng SSD còn lại" },
  233: { en: "Media Wearout Indicator - flash endurance consumed", vi: "Chỉ số độ mòn chip nhớ flash SSD" },
  240: { en: "Head Flying Hours - head active time", vi: "Thời gian đầu từ bay trên mặt đĩa" },
  241: { en: "Total LBAs Written - lifetime volume written", vi: "Tổng dung lượng khối dữ liệu LBA đã ghi" },
  242: { en: "Total LBAs Read - lifetime volume read", vi: "Tổng dung lượng khối dữ liệu LBA đã đọc" },
};

/**
 * Accurately formats power-on hours into human-readable operating lifetime span.
 * Converts hours to exact days, months, and years without fake data.
 */
export function formatLifetimeSpan(hours?: number | null): string {
  if (hours === null || hours === undefined || isNaN(hours) || hours <= 0) return "—";
  const days = Math.floor(hours / 24);
  const years = (hours / 8760).toFixed(1);
  if (days < 30) return `${hours.toLocaleString()}h (${days} ngày)`;
  const months = Math.floor(days / 30.4375);
  if (months < 12) return `${hours.toLocaleString()}h (~${months} tháng)`;
  const remMonths = Math.floor((days % 365) / 30);
  return `${hours.toLocaleString()}h (~${years} năm${remMonths > 0 ? ` ${remMonths}th` : ""})`;
}

/**
 * Strips ANSI escape codes from string for clean text matching
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1B\(B/g, "");
}

/**
 * Parses raw text/ANSI output from syno_smart_info.sh into structured diagnostics,
 * capturing complete SMART tables, NVMe telemetry, and specs without cut-offs.
 */
export function parseSynoSmartOutput(raw: string): SynoSmartParsedReport {
  const clean = stripAnsi(raw);
  const lines = clean.split(/\r?\n/);

  const report: SynoSmartParsedReport = {
    drives: [],
    overallHealth: "PASSED",
  };

  if (!raw || raw.trim().length === 0) {
    report.overallHealth = "UNKNOWN";
    return report;
  }

  // Look for header (hostname model DSM version)
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const l = lines[i].trim();
    if (l.includes("DSM ") && (l.includes("DS") || l.includes("SA") || l.includes("RS") || l.includes("FS") || l.includes("DVA"))) {
      const parts = l.split(/\s+/);
      if (parts.length >= 3) {
        report.hostname = parts[0];
        report.nasModel = parts[1];
        report.dsmVersion = parts.slice(2).join(" ");
      }
      break;
    }
  }

  // Regex to detect drive headers, e.g.:
  // "Drive 1  WD40EFRX-68N32N0  WD-WCC7K1234567  /dev/sata1"
  // "M.2 Drive 1  Samsung 970 EVO Plus 1TB  S4EVNF0M123456  /dev/nvme0n1"
  // "Drive 2  ST4000VN008-2DR166  ZA123456  /dev/sata2"
  const driveHeaderRegex = /^(?:(M\.2\s+Drive\s+\d+|Drive\s+\d+|Disk\s+\d+|SATA\s+\d+|NVMe\s+\d+))\s+([A-Za-z0-9_\-\.\s]+?)\s+([A-Z0-9_\-]{5,})\s+(\/dev\/[a-z0-9]+)/i;
  // Fallback looser match for "Drive 1 ... /dev/..."
  const driveFallbackRegex = /^(?:(M\.2\s+Drive\s+\d+|Drive\s+\d+|Disk\s+\d+))\s+(.+?)\s+(\/dev\/[a-z0-9]+)/i;

  interface RawDriveBlock {
    header: string;
    slot: string;
    model: string;
    serial: string;
    device: string;
    lines: string[];
  }

  const driveBlocks: RawDriveBlock[] = [];
  let currentBlock: RawDriveBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(driveHeaderRegex);
    const fallbackMatch = !match ? trimmed.match(driveFallbackRegex) : null;

    if (match) {
      if (currentBlock) driveBlocks.push(currentBlock);
      currentBlock = {
        header: trimmed,
        slot: match[1].trim(),
        model: match[2].trim(),
        serial: match[3].trim(),
        device: match[4].trim(),
        lines: [],
      };
      continue;
    } else if (fallbackMatch) {
      if (currentBlock) driveBlocks.push(currentBlock);
      const middleParts = fallbackMatch[2].trim().split(/\s+/);
      const serial = middleParts.length > 1 ? middleParts.pop()! : "";
      const model = middleParts.join(" ") || "Unknown Model";
      currentBlock = {
        header: trimmed,
        slot: fallbackMatch[1].trim(),
        model,
        serial,
        device: fallbackMatch[3].trim(),
        lines: [],
      };
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(trimmed);
    }
  }
  if (currentBlock) {
    driveBlocks.push(currentBlock);
  }

  let hasCritical = false;
  let hasWarning = false;

  for (const b of driveBlocks) {
    let health: "PASSED" | "OK" | "WARNING" | "CRITICAL" | "UNKNOWN" = "UNKNOWN";
    let tempC: number | null = null;
    let powerOnHours: number | null = null;
    let reallocatedSectors: number | null = null;
    let pendingSectors: number | null = null;
    let crcErrors: number | null = null;
    let nvmeWearPercent: number | null = null;
    let capacity: string | undefined;
    let firmware: string | undefined;
    let rotationRate: string | undefined;
    let sataVersion: string | undefined;

    const smartAttributes: SmartAttributeRow[] = [];
    const nvmeSpecs: NvmeSpecRow[] = [];

    for (const l of b.lines) {
      const lower = l.toLowerCase();

      // Health status checks
      if (
        lower.includes("smart overall-health self-assessment test result: passed") ||
        lower.includes("smart health status: ok") ||
        lower.includes("overall-health self-assessment: passed") ||
        lower.includes("self-assessment: passed")
      ) {
        if (health === "UNKNOWN") {
          health = "PASSED";
        }
      } else if (lower.includes("failed") || (lower.includes("error counter log: ") && !lower.includes("no errors logged"))) {
        const errMatch = l.match(/Error Counter Log:\s*([0-9]+)/i);
        if (errMatch && parseInt(errMatch[1], 10) > 0) {
          hasWarning = true;
          health = "WARNING";
        }
      }

      // Metadata Detection
      if (lower.includes("user capacity:") || lower.includes("total nvm capacity:")) {
        const capMatch = l.match(/(?:User Capacity|Total NVM Capacity):\s*(.+)$/i);
        if (capMatch) capacity = capMatch[1].trim();
      }
      if (lower.includes("firmware version:")) {
        const fwMatch = l.match(/Firmware Version:\s*(.+)$/i);
        if (fwMatch) firmware = fwMatch[1].trim();
      }
      if (lower.includes("rotation rate:")) {
        const rotMatch = l.match(/Rotation Rate:\s*(.+)$/i);
        if (rotMatch) rotationRate = rotMatch[1].trim();
      }
      if (lower.includes("sata version is:")) {
        const sataMatch = l.match(/SATA Version is:\s*(.+)$/i);
        if (sataMatch) sataVersion = sataMatch[1].trim();
      }

      // Temperature
      const tempMatch =
        l.match(/(?:Temperature_Celsius|Airflow_Temperature_Cel|Temperature|Temperature Celsius)[^\d]*(\d{1,3})\s*(?:C)?(?:\s|$)/i) ||
        l.match(/194\s+[A-Za-z0-9_]+\s+\d+\s+\d+\s+\d+\s+[^\d]*\s+(\d{1,2})/);
      if (tempMatch && tempC === null) {
        const t = parseInt(tempMatch[1], 10);
        if (t > 0 && t < 100) tempC = t;
      }

      // Power-On Hours
      const pohMatch =
        l.match(/^(?:9|09)\s+Power_On_Hours\s+\d+\s+\d+\s+\d+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+(\d+)/i) ||
        l.match(/Power[-_\s]on Hours:\s*([\d,]+)/i);
      if (pohMatch && powerOnHours === null) {
        powerOnHours = parseInt(pohMatch[1].replace(/,/g, ""), 10);
      }

      // Reallocated Sector Count (ID 5)
      const realMatch =
        l.match(/^(?:5|05)\s+Reallocated_Sector_Ct\s+\d+\s+\d+\s+\d+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+(\d+)/i) ||
        l.match(/Reallocated Sector(?:s| Count)?:\s*(\d+)/i);
      if (realMatch && reallocatedSectors === null) {
        reallocatedSectors = parseInt(realMatch[1], 10);
      }

      // Pending Sector Count (ID 197)
      const pendMatch =
        l.match(/^(?:197)\s+Current_Pending_Sector\s+\d+\s+\d+\s+\d+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+(\d+)/i) ||
        l.match(/Pending Sector(?:s| Count)?:\s*(\d+)/i);
      if (pendMatch && pendingSectors === null) {
        pendingSectors = parseInt(pendMatch[1], 10);
      }

      // UDMA CRC Error Count (ID 199)
      const crcMatch =
        l.match(/^(?:199)\s+UDMA_CRC_Error_Count\s+\d+\s+\d+\s+\d+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+(\d+)/i) ||
        l.match(/UDMA CRC Error(?:s| Count)?:\s*(\d+)/i);
      if (crcMatch && crcErrors === null) {
        crcErrors = parseInt(crcMatch[1], 10);
      }

      // NVMe wear
      const wearMatch = l.match(/Percentage Used:\s*(\d+)%/i);
      if (wearMatch && nvmeWearPercent === null) {
        nvmeWearPercent = parseInt(wearMatch[1], 10);
      }

      // FULL SMART TABLE PARSER (SATA/SAS/HDD/SSD)
      // Check for row starting with ID# (1 to 3 digits) and alphanumeric name
      if (!l.startsWith("ID#") && !l.startsWith("ATTRIBUTE_NAME")) {
        const tokens = l.split(/\s+/);
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
          const type = tokens[6];
          const updated = tokens[7];

          let whenFailed: string | undefined;
          let rawValue = "";

          if (tokens.length >= 10 && (tokens[8] === "-" || tokens[8] === "FAILING_NOW" || tokens[8] === "In_the_past")) {
            whenFailed = tokens[8];
            rawValue = tokens.slice(9).join(" ");
          } else {
            rawValue = tokens.slice(8).join(" ");
          }

          // Determine attribute status
          let attrStatus: "OK" | "WARN" | "FAIL" = "OK";
          const numVal = parseInt(value, 10);
          const numThresh = parseInt(thresh, 10);
          const numRaw = parseInt(rawValue.replace(/\D.*$/, ""), 10);

          if (whenFailed === "FAILING_NOW" || (!isNaN(numThresh) && numThresh > 0 && !isNaN(numVal) && numVal <= numThresh)) {
            attrStatus = "FAIL";
          } else if (whenFailed === "In_the_past") {
            attrStatus = "WARN";
          } else if (id === 5 || id === 197 || id === 198) {
            if (!isNaN(numRaw) && numRaw > 0) {
              attrStatus = numRaw > 20 ? "FAIL" : "WARN";
            }
          } else if (id === 199) {
            if (!isNaN(numRaw) && numRaw > 0) {
              attrStatus = "WARN";
            }
          } else if (id === 10 || id === 184 || id === 187) {
            if (!isNaN(numRaw) && numRaw > 0) {
              attrStatus = "WARN";
            }
          }

          const desc = SMART_DESCRIPTIONS[id]?.vi || SMART_DESCRIPTIONS[id]?.en;

          smartAttributes.push({
            id,
            name,
            flag,
            value,
            worst,
            thresh,
            type,
            updated,
            whenFailed,
            rawValue,
            status: attrStatus,
            description: desc,
          });
        }
      }

      // NVME SPECIFICATION KEY-VALUE PARSER
      const nvmeMatch = l.match(/^([A-Za-z0-9\s\/\.\-_]+?):\s*(.+)$/);
      if (nvmeMatch) {
        const k = nvmeMatch[1].trim();
        const v = nvmeMatch[2].trim();
        const skipKeys = [
          "Local Time is",
          "SMART overall-health self-assessment test result",
          "SMART health status",
          "ID# ATTRIBUTE_NAME",
          "Vendor Specific SMART Attributes with Thresholds",
          "SMART Attributes Data Structure revision number",
        ];
        if (
          !skipKeys.some((sk) => k.toLowerCase().includes(sk.toLowerCase())) &&
          k.length > 2 &&
          !/^\d+$/.test(k)
        ) {
          let nvmeStatus: "OK" | "WARN" | "FAIL" = "OK";
          const kLower = k.toLowerCase();
          if (kLower.includes("critical warning") && v !== "0x00" && v !== "0") {
            nvmeStatus = "FAIL";
          } else if (kLower.includes("media and data integrity") && v !== "0") {
            nvmeStatus = "FAIL";
          } else if (kLower.includes("percentage used")) {
            const wearVal = parseInt(v.replace(/\D/g, ""), 10);
            if (!isNaN(wearVal)) {
              if (wearVal >= 95) nvmeStatus = "FAIL";
              else if (wearVal >= 80) nvmeStatus = "WARN";
            }
          } else if (kLower.includes("available spare")) {
            const spareVal = parseInt(v.replace(/\D/g, ""), 10);
            if (!isNaN(spareVal)) {
              if (spareVal < 10) nvmeStatus = "FAIL";
              else if (spareVal < 20) nvmeStatus = "WARN";
            }
          }

          nvmeSpecs.push({
            key: k,
            label: k,
            value: v,
            status: nvmeStatus,
          });
        }
      }
    }

    if ((reallocatedSectors && reallocatedSectors > 50) || (pendingSectors && pendingSectors > 10)) {
      health = "CRITICAL";
      hasCritical = true;
    } else if ((reallocatedSectors && reallocatedSectors > 0) || (pendingSectors && pendingSectors > 0) || (crcErrors && crcErrors > 5)) {
      health = "WARNING";
      hasWarning = true;
    } else if (health === "UNKNOWN") {
      health = "OK";
    }

    report.drives.push({
      slot: b.slot,
      model: b.model,
      serial: b.serial,
      device: b.device,
      capacity,
      firmware,
      rotationRate,
      sataVersion,
      health,
      tempC,
      powerOnHours,
      reallocatedSectors,
      pendingSectors,
      crcErrors,
      nvmeWearPercent,
      attributesCount: smartAttributes.length > 0 ? smartAttributes.length : undefined,
      smartAttributes: smartAttributes.length > 0 ? smartAttributes : undefined,
      nvmeSpecs: nvmeSpecs.length > 0 ? nvmeSpecs : undefined,
      rawLines: b.lines,
    });
  }

  if (hasCritical) {
    report.overallHealth = "CRITICAL";
  } else if (hasWarning) {
    report.overallHealth = "WARNING";
  } else if (report.drives.length > 0) {
    report.overallHealth = "PASSED";
  }

  return report;
}

