import {
  ReportPeriod,
  ReportSummary,
  PowerReportData,
  NetworkReportData,
  StorageHealthReportData,
  DiskWearReportData,
  SecurityReportData,
  VulnerabilityReportData,
  ExecutiveHealthScore,
  DailyOperationalRecord,
  DailyOperationalEvent,
} from "@/lib/dsm/types";

// Base electricity price in Vietnam: Tier 3 average ~3,000 VND / kWh
export const VND_PER_KWH = 3000;

/**
 * Calculates a weighted composite Executive Health Score (0 - 100)
 */
export function computeHealthScore(
  power: PowerReportData,
  storage: StorageHealthReportData,
  security: SecurityReportData,
  network: NetworkReportData,
  diskWear: DiskWearReportData,
  vuln: VulnerabilityReportData
): ExecutiveHealthScore {
  // 1. Power Score (Max 20 pts)
  let powerScore = 20;
  if (power.improperShutdowns > 0) {
    powerScore -= Math.min(15, power.improperShutdowns * 10);
  }
  if (power.outagesCount > 3) {
    powerScore -= 3;
  }
  powerScore = Math.max(0, powerScore);

  // 2. Storage & SMART Score (Max 30 pts)
  let storageScore = 30;
  if (storage.poolsStatus === "critical") storageScore -= 25;
  else if (storage.poolsStatus === "warning") storageScore -= 12;

  let totalBadOrPending = 0;
  for (const d of storage.drives) {
    if (d.pendingSectors > 0) totalBadOrPending += d.pendingSectors;
    if (d.reallocatedSectors > 0) totalBadOrPending += d.reallocatedSectors;
    if (d.tempC >= 50) storageScore -= 3;
  }
  if (totalBadOrPending > 0) {
    storageScore -= Math.min(15, totalBadOrPending * 3);
  }
  storageScore = Math.max(0, storageScore);

  // 3. Security Score (Max 25 pts)
  let securityScore = 25;
  if (!vuln.defaultAdminDisabled) securityScore -= 7;
  if (vuln.sshPort === 22) securityScore -= 4;
  if (!vuln.twoFactorEnabled) securityScore -= 4;
  if (vuln.dsmUpdateAvailable) securityScore -= 5;
  if (vuln.vulnerablePackagesCount > 0) {
    securityScore -= Math.min(5, vuln.vulnerablePackagesCount * 2);
  }
  securityScore = Math.max(0, securityScore);

  // 4. Network Score (Max 15 pts)
  let networkScore = 15;
  if (network.uptimePercent < 99.0) networkScore -= 8;
  else if (network.uptimePercent < 99.9) networkScore -= 3;
  if (network.outagesCount > 5) networkScore -= 4;
  networkScore = Math.max(0, networkScore);

  // 5. Disk Wear Score (Max 10 pts)
  let wearScore = 10;
  for (const ssd of diskWear.ssds) {
    if (ssd.lifeLeftPercent < 20) wearScore -= 5;
    else if (ssd.lifeLeftPercent < 50) wearScore -= 2;
  }
  for (const hdd of diskWear.hdds) {
    if (hdd.hibernationRiskLevel === "high") wearScore -= 3;
  }
  wearScore = Math.max(0, wearScore);

  const totalScore = Math.round(powerScore + storageScore + securityScore + networkScore + wearScore);

  let grade: "A+" | "A" | "B" | "C" | "D" = "A";
  let statusText = "Hệ thống hoạt động rất tốt & ổn định";

  if (totalScore >= 95) {
    grade = "A+";
    statusText = "Xuất sắc: Phần cứng & bảo mật đạt trạng thái tối ưu";
  } else if (totalScore >= 85) {
    grade = "A";
    statusText = "Rất tốt: Toàn bộ dịch vụ vận hành an toàn và bền bỉ";
  } else if (totalScore >= 70) {
    grade = "B";
    statusText = "Khá: Có một số cảnh báo cần theo dõi định kỳ";
  } else if (totalScore >= 50) {
    grade = "C";
    statusText = "Cảnh báo: Cần can thiệp cấu hình hoặc kiểm tra phần cứng";
  } else {
    grade = "D";
    statusText = "Nguy hiểm: Phát hiện sự cố nghiêm trọng đe dọa an toàn dữ liệu";
  }

  const summaryHighlights: string[] = [];
  if (power.improperShutdowns === 0) {
    summaryHighlights.push("0 lần sập nguồn đột ngột");
  } else {
    summaryHighlights.push(`⚠️ ${power.improperShutdowns} lần sập nguồn đột ngột`);
  }

  if (totalBadOrPending === 0) {
    summaryHighlights.push("Toàn bộ đĩa cứng không có bad sector");
  } else {
    summaryHighlights.push(`⚠️ Phát hiện ${totalBadOrPending} sectors bất thường`);
  }

  summaryHighlights.push(`Đã chặn ${security.blockedIpsCount} IP tấn công dò quét`);
  summaryHighlights.push(`Độ khả dụng mạng đạt ${network.uptimePercent}%`);

  return {
    score: totalScore,
    grade,
    statusText,
    summaryHighlights,
    powerScore,
    storageScore,
    securityScore,
    networkScore,
    wearScore,
  };
}

/**
 * Generates day-by-day operational records with granular metrics and incident events
 */
export function generateDailyRecords(
  period: ReportPeriod = "weekly",
  daysCount = 7,
  now = new Date()
): DailyOperationalRecord[] {
  const records: DailyOperationalRecord[] = [];
  const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = dayNames[d.getDay()];
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const fullDate = `${date}/${d.getFullYear()}`;

    // Deterministic pseudo-random seed based on day and month
    const daySeed = (d.getDate() * 19 + (d.getMonth() + 1) * 37 + i * 11) % 100;

    // Daily power metrics
    const kwh = Number((0.74 + (daySeed % 10) * 0.01).toFixed(2));
    const costVND = Math.round(kwh * VND_PER_KWH);
    const peakWatts = 42 + (daySeed % 14);

    // Daily network metrics
    const rxGB = Number((16.5 + (daySeed % 15) * 0.8).toFixed(1));
    const txGB = Number((9.2 + (daySeed % 10) * 0.6).toFixed(1));
    const peakSpeedMBs = 68 + (daySeed % 35);
    const avgLatencyMs = Number((3.1 + (daySeed % 7) * 0.2).toFixed(1));

    // Daily storage metrics
    const maxTempC = 36 + (daySeed % 5);
    const ssdCacheWrittenGB = 40 + (daySeed % 25);

    // Daily security metrics
    const failedLogins = 4 + (daySeed % 9);

    // Daily system performance
    const peakCpuPercent = 24 + (daySeed % 26);
    const peakMemPercent = 48 + (daySeed % 10);

    let status: "optimal" | "warning" | "critical" = "optimal";
    let outagesCount = 0;
    let batteryRuntimeSec = 0;
    let newBadSectors = 0;
    let blockedIpsCount = 0;
    let blockedIps: { ip: string; country: string; service: string; time: string }[] = [];
    let netOutages = 0;
    let downtimeMinutes = 0;

    const events: DailyOperationalEvent[] = [
      {
        time: "02:00",
        level: "info",
        category: "backup",
        message: "Nhiệm vụ Hyper Backup (Offsite Storage) hoàn tất an toàn (+8.6 GB delta, 14 phút).",
      },
    ];

    // Power incident (Day 3 in weekly or day 18 in monthly)
    if ((period === "weekly" && i === 3) || (period === "monthly" && i === 18)) {
      status = "warning";
      outagesCount = 1;
      batteryRuntimeSec = 480;
      events.push({
        time: "14:15",
        level: "warning",
        category: "power",
        message: "Mất điện lưới AC đột ngột! UPS APC Back-UPS chuyển tải sang pin an toàn.",
      });
      events.push({
        time: "14:23",
        level: "info",
        category: "power",
        message: "Điện lưới đã phục hồi (Pin đã dùng: 8 phút, còn 89%). Bắt đầu nạp lại.",
      });
    }

    // AutoBlock brute force ban (Day 1 in weekly or day 6 in monthly)
    if ((period === "weekly" && i === 1) || (period === "monthly" && i === 6)) {
      status = "warning";
      blockedIpsCount = 1;
      blockedIps.push({
        ip: "185.220.101.5",
        country: "Nga",
        service: "SSH (Port 22)",
        time: "21:40",
      });
      events.push({
        time: "21:38",
        level: "warning",
        category: "security",
        message: "Phát hiện 18 lần thử mật khẩu SSH thất bại liên tiếp từ 185.220.101.5.",
      });
      events.push({
        time: "21:40",
        level: "info",
        category: "security",
        message: "AutoBlock đã tự động khóa vĩnh viễn địa chỉ IP 185.220.101.5 (Nga).",
      });
    }

    // SMART test warning (Day 4 in weekly or day 24 in monthly)
    if ((period === "weekly" && i === 4) || (period === "monthly" && i === 24)) {
      newBadSectors = 2;
      status = "warning";
      events.push({
        time: "04:00",
        level: "info",
        category: "storage",
        message: "Bắt đầu chạy S.M.A.R.T Quick Test tự động định kỳ.",
      });
      events.push({
        time: "04:06",
        level: "warning",
        category: "storage",
        message: "Khay Bay 3 (WD Red Plus): Phát hiện 2 pending sectors mới (ID 197).",
      });
    }

    // Network WAN glitch (Day 14 in monthly)
    if (period === "monthly" && i === 14) {
      status = "warning";
      netOutages = 1;
      downtimeMinutes = 8;
      events.push({
        time: "03:22",
        level: "warning",
        category: "network",
        message: "Mất kết nối gateway Internet WAN (PPPoE timeout trong 8 phút).",
      });
      events.push({
        time: "03:30",
        level: "info",
        category: "network",
        message: "Tái kết nối WAN Internet thành công. IP ngoại mạng mới được gán.",
      });
    }

    records.push({
      date,
      fullDate,
      dayOfWeek,
      status,
      power: {
        kwh,
        costVND,
        peakWatts,
        outagesCount,
        batteryRuntimeSec,
      },
      network: {
        rxGB,
        txGB,
        peakSpeedMBs,
        avgLatencyMs,
        outagesCount: netOutages,
        downtimeMinutes,
      },
      storage: {
        maxTempC,
        hottestDrive: "Bay 2 (Seagate IronWolf)",
        newBadSectors,
        ssdCacheWrittenGB,
      },
      security: {
        failedLogins,
        blockedIpsCount,
        blockedIps,
      },
      system: {
        peakCpuPercent,
        peakMemPercent,
      },
      events,
    });
  }

  return records;
}

/**
 * Generates high quality, realistic mock report data for Weekly or Monthly period
 */
export function generateMockReport(
  period: ReportPeriod = "weekly",
  hostName = "Synology-DS920+",
  model = "DS920+",
  dsmVersion = "DSM 7.2.1-69057 Update 3"
): ReportSummary {
  const isWeekly = period === "weekly";
  const days = isWeekly ? 7 : 30;

  const now = new Date();
  const endDateStr = now.toLocaleDateString("vi-VN");
  const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startDateStr = pastDate.toLocaleDateString("vi-VN");

  // Power metrics
  const outagesCount = isWeekly ? 1 : 2;
  const improperShutdowns = 0;
  const totalBatterySeconds = isWeekly ? 480 : 1620; // 8 mins vs 27 mins
  const avgWatt = 32.5; // Watts
  const totalHours = days * 24;
  const estimatedKWh = Number(((avgWatt * totalHours) / 1000).toFixed(1));
  const estimatedCostVND = Math.round(estimatedKWh * VND_PER_KWH);
  const dailyRecords = generateDailyRecords(period, days, now);

  const powerHistory = isWeekly
    ? dailyRecords.map((r) => ({
        label: r.dayOfWeek.replace("Thứ ", "T").replace("Chủ Nhật", "CN"),
        kwh: r.power.kwh,
        outages: r.power.outagesCount,
      }))
    : [
        { label: "Tuần 1", kwh: 5.4, outages: 0 },
        { label: "Tuần 2", kwh: 5.6, outages: 1 },
        { label: "Tuần 3", kwh: 5.3, outages: 0 },
        { label: "Tuần 4", kwh: 5.5, outages: 1 },
      ];

  const power: PowerReportData = {
    outagesCount,
    improperShutdowns,
    totalBatterySeconds,
    estimatedKWh,
    estimatedCostVND,
    averageWattage: avgWatt,
    upsConnected: true,
    upsModel: "APC Back-UPS Pro 900VA",
    upsBatteryPercent: 100,
    upsLoadPercent: 18,
    powerHistory,
  };

  // Network metrics
  const networkOutages = isWeekly ? 0 : 1;
  const downtimeMins = isWeekly ? 0 : 8;
  const uptimePct = isWeekly ? 100.0 : 99.98;

  const network: NetworkReportData = {
    outagesCount: networkOutages,
    downtimeMinutes: downtimeMins,
    uptimePercent: uptimePct,
    averageLatencyMs: 3.8,
    totalRxGB: isWeekly ? 142.5 : 598.2,
    totalTxGB: isWeekly ? 84.1 : 341.6,
    dnsFailures: isWeekly ? 0 : 2,
    recentEvents: isWeekly
      ? []
      : [
          {
            time: "14/09 03:22",
            event: "Mất kết nối gateway Internet (WAN PPPoE)",
            duration: "8 phút",
            type: "wan",
          },
        ],
  };

  // Storage Health
  const storage: StorageHealthReportData = {
    poolsStatus: "normal",
    volumesCount: 1,
    totalStorageBytes: 11627885000000, // ~10.8 TB (RAID 5)
    usedStorageBytes: 7751923333333,   // ~7.2 TB (66.7%)
    freeStorageBytes: 3875961666667,
    usedPercent: 66.7,
    scrubbingDone: true,
    drives: [
      {
        slot: "Bay 1",
        model: "WD Red Plus WD40EFRX",
        type: "HDD",
        status: "normal",
        tempC: 36,
        maxTempC: 39,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
        crcErrors: 0,
        powerOnHours: 14250,
        healthLabel: "Tốt (100%)",
      },
      {
        slot: "Bay 2",
        model: "Seagate IronWolf ST4000VN008",
        type: "HDD",
        status: "normal",
        tempC: 38,
        maxTempC: 41,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
        crcErrors: 0,
        powerOnHours: 9840,
        healthLabel: "Tốt (100%)",
      },
      {
        slot: "Bay 3",
        model: "WD Red Plus WD40EFRX",
        type: "HDD",
        status: "warning",
        tempC: 37,
        maxTempC: 40,
        reallocatedSectors: 0,
        pendingSectors: 2,
        uncorrectableSectors: 0,
        crcErrors: 0,
        powerOnHours: 13910,
        healthLabel: "Cảnh báo (2 pending sectors)",
      },
      {
        slot: "Bay 4",
        model: "Seagate IronWolf ST4000VN008",
        type: "HDD",
        status: "normal",
        tempC: 37,
        maxTempC: 40,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
        crcErrors: 0,
        powerOnHours: 9780,
        healthLabel: "Tốt (100%)",
      },
      {
        slot: "M.2 Slot 1",
        model: "Samsung 970 EVO Plus 500GB",
        type: "NVMe",
        status: "normal",
        tempC: 42,
        maxTempC: 46,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
        crcErrors: 0,
        powerOnHours: 8120,
        healthLabel: "Tốt (NVMe Cache)",
      },
    ],
  };

  // Disk Wear
  const diskWear: DiskWearReportData = {
    ssds: [
      {
        slot: "M.2 Slot 1",
        model: "Samsung 970 EVO Plus 500GB",
        lifeLeftPercent: 94,
        tbwWrittenInPeriod: isWeekly ? 0.45 : 1.82,
        totalTbwWritten: 38.4,
        ratedTbw: 300, // 300 TBW rating for 500GB
        wearRatePercentPerMonth: 0.6,
        estimatedYearsRemaining: 4.8,
      },
    ],
    hdds: [
      {
        slot: "Bay 1",
        model: "WD Red Plus 4TB",
        powerOnHours: 14250,
        powerOnYears: 1.63,
        loadCycleCount: 11200,
        ratedLoadCycles: 300000,
        hibernationRiskLevel: "low",
        startStopCount: 48,
        powerCycleCount: 42,
      },
      {
        slot: "Bay 2",
        model: "Seagate IronWolf 4TB",
        powerOnHours: 9840,
        powerOnYears: 1.12,
        loadCycleCount: 8940,
        ratedLoadCycles: 300000,
        hibernationRiskLevel: "low",
        startStopCount: 36,
        powerCycleCount: 31,
      },
      {
        slot: "Bay 3",
        model: "WD Red Plus 4TB",
        powerOnHours: 13910,
        powerOnYears: 1.59,
        loadCycleCount: 28400,
        ratedLoadCycles: 300000,
        hibernationRiskLevel: "medium",
        startStopCount: 65,
        powerCycleCount: 58,
      },
      {
        slot: "Bay 4",
        model: "Seagate IronWolf 4TB",
        powerOnHours: 9780,
        powerOnYears: 1.11,
        loadCycleCount: 9100,
        ratedLoadCycles: 300000,
        hibernationRiskLevel: "low",
        startStopCount: 34,
        powerCycleCount: 29,
      },
    ],
    overallDriveEnduranceStatus: "good",
    hibernationRecommendation:
      "Tần suất đỗ đầu từ (Load Cycles) trên các ổ đang ở mức an toàn. Bay 3 có số lần đỗ cao hơn nhẹ, nên giữ chế độ HDD Hibernation ở mức 20 phút trở lên để bảo vệ cơ học.",
  };

  // Security Report
  const failedLogins = isWeekly ? 48 : 184;
  const blockedIps = isWeekly ? 3 : 7;

  const security: SecurityReportData = {
    failedLoginsCount: failedLogins,
    blockedIpsCount: blockedIps,
    dosProtectionTriggers: isWeekly ? 12 : 54,
    topAttackingCountries: [
      { countryCode: "RU", countryName: "Nga", attackCount: isWeekly ? 22 : 84, flagEmoji: "🇷🇺" },
      { countryCode: "CN", countryName: "Trung Quốc", attackCount: isWeekly ? 14 : 52, flagEmoji: "🇨🇳" },
      { countryCode: "NL", countryName: "Hà Lan", attackCount: isWeekly ? 7 : 28, flagEmoji: "🇳🇱" },
      { countryCode: "US", countryName: "Hoa Kỳ", attackCount: isWeekly ? 5 : 20, flagEmoji: "🇺🇸" },
    ],
    targetedServices: [
      { service: "SSH (Port 22)", count: Math.round(failedLogins * 0.72), percent: 72 },
      { service: "DSM Web (Port 5000/5001)", count: Math.round(failedLogins * 0.21), percent: 21 },
      { service: "FTP (Port 21)", count: Math.round(failedLogins * 0.07), percent: 7 },
    ],
    recentAttackers: [
      { ip: "185.220.101.5", country: "Nga", time: "Hôm qua 21:40", attempts: 18, service: "SSH" },
      { ip: "45.155.205.233", country: "Hà Lan", time: "18/09 04:12", attempts: 15, service: "DSM Web" },
      { ip: "218.92.0.114", country: "Trung Quốc", time: "16/09 11:05", attempts: 24, service: "SSH" },
    ],
    bruteForceBlockedRate: 100.0,
  };

  // Vulnerabilities
  const vulnerabilities: VulnerabilityReportData = {
    securityAdvisorScore: 88,
    securityAdvisorStatus: "warning",
    defaultAdminDisabled: false,
    twoFactorEnabled: true,
    defaultSshPortChanged: false,
    sshPort: 22,
    httpExposedToWan: false,
    dsmUpdateAvailable: true,
    dsmCurrentVersion: "DSM 7.2.1-69057 Update 3",
    dsmLatestVersion: "DSM 7.2.1-69057 Update 5 (Bản vá khẩn)",
    vulnerablePackagesCount: 1,
    findings: [
      {
        id: "vuln_admin",
        category: "account",
        severity: "warning",
        title: "Tài khoản 'admin' mặc định vẫn đang kích hoạt",
        description: "Tài khoản có tên 'admin' thường là mục tiêu đầu tiên của các đợt quét mật khẩu tự động.",
        recommendation: "Tạo tài khoản quản trị viên mới với tên riêng và vô hiệu hóa tài khoản 'admin'.",
        fixed: false,
      },
      {
        id: "vuln_ssh",
        category: "network",
        severity: "warning",
        title: "Cổng dịch vụ SSH đang sử dụng cổng 22 mặc định",
        description: "Cổng 22 mặc định thu hút 70%+ các bot tự động quét trên toàn cầu.",
        recommendation: "Đổi cổng SSH sang dải cổng cao bảo mật (ví dụ: 2222 hoặc 22122).",
        fixed: false,
      },
      {
        id: "vuln_dsm_patch",
        category: "system",
        severity: "warning",
        title: "Bản cập nhật bảo mật DSM 7.2.1 Update 5 có sẵn",
        description: "Bản cập nhật này khắc phục 2 lỗ hổng bảo mật cấp cao liên quan đến giao thức chia sẻ tệp SMB.",
        recommendation: "Truy cập Cài đặt hệ thống để cập nhật ngay trong kỳ bảo trì tiếp theo.",
        fixed: false,
      },
    ],
  };

  const healthScore = computeHealthScore(power, storage, security, network, diskWear, vulnerabilities);

  return {
    period,
    startDate: startDateStr,
    endDate: endDateStr,
    generatedAt: now.toLocaleTimeString("vi-VN") + " " + now.toLocaleDateString("vi-VN"),
    hostName,
    model,
    dsmVersion,
    uptimeString: "45 ngày 14 giờ",
    healthScore,
    power,
    network,
    storage,
    diskWear,
    security,
    vulnerabilities,
    dailyRecords,
  };
}

/**
 * Formats a report into an executive Telegram digest ready for bot sending
 */
export function generateTelegramDigest(report: ReportSummary): string {
  const isWeekly = report.period === "weekly";
  const title = isWeekly
    ? `📊 *[KV-SYNOLOGY] BÁO CÁO VẬN HÀNH TUẦN (${report.startDate} - ${report.endDate})*`
    : `📊 *[KV-SYNOLOGY] BÁO CÁO VẬN HÀNH THÁNG (${report.startDate} - ${report.endDate})*`;

  const gradeEmoji =
    report.healthScore.score >= 90 ? "🟢" : report.healthScore.score >= 75 ? "🟡" : "🔴";

  return `${title}
🖥️ *Thiết bị:* ${report.model} (${report.hostName}) | ${report.dsmVersion}
⏱️ *Thời gian chạy (Uptime):* ${report.uptimeString}
${gradeEmoji} *Đánh giá sức khỏe tổng thể:* *${report.healthScore.score}/100* (${report.healthScore.grade} - ${report.healthScore.statusText})

───────────────────────────────
⚡ *1. NGUỒN ĐIỆN & TIÊU THỤ:*
• Số lần mất điện lưới: *${report.power.outagesCount} lần* (UPS pin giữ ${Math.round(report.power.totalBatterySeconds / 60)} phút)
• Tắt đột ngột không qua UPS: *${report.power.improperShutdowns} lần*
• Tiêu thụ ước tính: *${report.power.estimatedKWh} kWh* (~${report.power.estimatedCostVND.toLocaleString("vi-VN")} VNĐ)
• Công suất trung bình: *${report.power.averageWattage} W*

🌐 *2. MẠNG & ĐƯỜNG TRUYỀN:*
• Sự cố mất mạng: *${report.network.outagesCount} lần* (Downtime: ${report.network.downtimeMinutes} phút)
• Độ khả dụng mạng: *${report.network.uptimePercent}%* (Ping: ${report.network.averageLatencyMs}ms)
• Băng thông: Tải về *${report.network.totalRxGB} GB* / Tải lên *${report.network.totalTxGB} GB*

💾 *3. SỨC KHỎE & TIÊU HAO Ổ CỨNG:*
• Trạng thái Volume: *${report.storage.poolsStatus.toUpperCase()}* (${report.storage.usedPercent}% / ${Math.round(report.storage.totalStorageBytes / 1e12)} TB)
• Ổ đĩa cảnh báo: ${report.storage.drives.filter((d) => d.status !== "normal").map((d) => `${d.slot}: ${d.healthLabel}`).join(", ") || "Không có, tất cả 100% tốt"}
• Tiêu hao SSD Cache: *Còn ${report.diskWear.ssds[0]?.lifeLeftPercent ?? 100}%* (Đã ghi +${report.diskWear.ssds[0]?.tbwWrittenInPeriod ?? 0} TBW trong kỳ)
• Dự kiến tuổi thọ SSD còn lại: *${report.diskWear.ssds[0]?.estimatedYearsRemaining ?? 5} năm*

🛡️ *4. BẢO MẬT & PHÒNG THỦ TẤN CÔNG:*
• Dò mật khẩu thất bại: *${report.security.failedLoginsCount} lượt*
• Đã chặn tự động (AutoBlock): *${report.security.blockedIpsCount} địa chỉ IP*
• Top nguồn tấn công: ${report.security.topAttackingCountries.map((c) => `${c.flagEmoji} ${c.countryName} (${c.attackCount})`).join(", ")}
• Điểm An toàn Security Advisor: *${report.vulnerabilities.securityAdvisorScore}/100*
${report.vulnerabilities.findings.map((f) => `  ⚠️ ${f.title}`).join("\n")}
───────────────────────────────
👉 _Xem chi tiết và xuất báo cáo PDF tại giao diện Web KV-Synology._`;
}
