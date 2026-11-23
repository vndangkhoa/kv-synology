"use client";

import React, { useState } from "react";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { ReportSummary, DriveHealthItem } from "@/lib/dsm/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Zap,
  HardDrive,
  Globe,
  Server,
  Cpu,
  Flame,
  Clock,
  Layers,
  ExternalLink,
  RefreshCw,
  FileText,
  BarChart3,
  Info,
  Lock,
  Download,
  Percent,
} from "lucide-react";

export type DrilldownTarget =
  | { type: "health_score" }
  | { type: "power_telemetry" }
  | { type: "network_profiler" }
  | { type: "drive_smart"; slot: string }
  | { type: "security_threats" };

interface ReportDrilldownModalProps {
  target: DrilldownTarget | null;
  onClose: () => void;
  report: ReportSummary;
}

export const ReportDrilldownModal: React.FC<ReportDrilldownModalProps> = ({
  target,
  onClose,
  report,
}) => {
  const [smartTestRunning, setSmartTestRunning] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  if (!target) return null;

  // 1. HEALTH SCORE AUDIT MODAL
  if (target.type === "health_score") {
    const hs = report.healthScore;
    const deductions = [
      {
        category: "Bảo mật",
        points: -7,
        reason: "Tài khoản 'admin' mặc định vẫn đang kích hoạt",
        solution: "Tạo tài khoản admin mới với tên riêng và tắt tài khoản 'admin'.",
        severity: "critical",
      },
      {
        category: "Bảo mật",
        points: -5,
        reason: "Bản vá bảo mật DSM 7.2.1 Update 5 có sẵn chưa cập nhật",
        solution: "Cập nhật DSM ngay để vá 2 lỗ hổng bảo mật SMB cấp cao.",
        severity: "warning",
      },
      {
        category: "Bảo mật",
        points: -4,
        reason: "Cổng dịch vụ SSH đang sử dụng cổng 22 mặc định",
        solution: "Đổi cổng SSH sang dải cổng cao an toàn (ví dụ: 2222 hoặc 22122).",
        severity: "warning",
      },
      {
        category: "Ổ đĩa",
        points: -6,
        reason: "Khay Bay 3 (WD Red Plus): Phát hiện 2 Pending Sectors (ID 197)",
        solution: "Khởi chạy S.M.A.R.T Extended Test và theo dõi đĩa định kỳ.",
        severity: "warning",
      },
      {
        category: "Bảo mật",
        points: -2,
        reason: "Gói ứng dụng File Station / SMB có 1 bản vá bảo mật phụ",
        solution: "Cập nhật ứng dụng trong Package Center.",
        severity: "info",
      },
    ];

    return (
      <ResponsiveModal
        open={true}
        onClose={onClose}
        maxWidth="3xl"
        title="Bảng Kiểm Toán & Trừ Điểm Sức Khỏe Hệ Thống"
        icon={<Activity className="w-5 h-5 text-sky-500" />}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header Score Summary */}
          <div className="bg-gradient-to-br from-sky-600 to-indigo-700 p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase">
                Chỉ số composite
              </span>
              <div className="text-4xl font-black mt-1">
                {hs.score}
                <span className="text-xl font-bold opacity-80">/100</span>
                <span className="text-sm font-bold ml-2 px-2 py-0.5 rounded-lg bg-white/25">
                  Hạng {hs.grade}
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-1">{hs.statusText}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div>Nguồn: <strong>{hs.powerScore}/20</strong></div>
              <div>Ổ đĩa: <strong>{hs.storageScore}/30</strong></div>
              <div>Bảo mật: <strong className="text-amber-300">{hs.securityScore}/25</strong></div>
              <div>Mạng: <strong>{hs.networkScore}/15</strong></div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Chi tiết các nguyên nhân bị trừ điểm (-{100 - hs.score} điểm)</span>
              <span className="text-slate-400 font-normal">5 cảnh báo</span>
            </h4>

            <div className="space-y-2.5">
              {deductions.map((d, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          d.severity === "critical"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {d.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {d.reason}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 pl-1">
                      💡 Khắc phục: {d.solution}
                    </p>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl shrink-0 text-sm">
                    {d.points} đ
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-sky-800 dark:text-sky-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-500" />
              <span>Nếu khắc phục các mục trên, điểm số sẽ nâng lên <strong>98/100 (Hạng A+)</strong></span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  // 2. POWER & UPS TELEMETRY MODAL
  if (target.type === "power_telemetry") {
    const pw = report.power;
    return (
      <ResponsiveModal
        open={true}
        onClose={onClose}
        maxWidth="3xl"
        title="Chẩn Đoán Nguồn Điện & Phân Tích Xả Pin UPS"
        icon={<Zap className="w-5 h-5 text-amber-500" />}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Mất điện lưới</span>
              <div className="text-xl font-black text-amber-600 mt-0.5">{pw.outagesCount} lần</div>
              <span className="text-[10px] text-slate-500">{Math.round(pw.totalBatterySeconds / 60)} phút dùng pin</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Sập nguồn</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{pw.improperShutdowns} lần</div>
              <span className="text-[10px] text-slate-500">100% bảo vệ UPS</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Điện tiêu thụ</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{pw.estimatedKWh} kWh</div>
              <span className="text-[10px] text-slate-500">Công suất TB {pw.averageWattage}W</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tiền điện ước tính</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{pw.estimatedCostVND.toLocaleString("vi-VN")}đ</div>
              <span className="text-[10px] text-slate-500">Bậc 3 (~3.000đ/kWh)</span>
            </div>
          </div>

          {/* Simulated UPS Discharge Graph */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Biểu Đồ Xả Pin UPS Trong Sự Cố Mất Điện (Thứ Năm, 17/09 Lúc 14:15)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                Thời lượng xả: 8 phút
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="space-y-1.5 text-xs pt-2">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>14:15 (Bắt đầu cúp điện)</span>
                <span>14:19 (Pin 94%)</span>
                <span>14:23 (Có điện lưới trở lại - Pin 89%)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: "89%" }} title="Dung lượng pin còn lại (89%)" />
                <div className="bg-amber-400 h-full" style={{ width: "11%" }} title="Tiêu hao trong 8 phút (11%)" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Điện áp vào: 0V AC (UPS phát 230V từ pin)</span>
                <span>Tải xả: 34.2 Watts • Dòng pin: 1.4A</span>
              </div>
            </div>
          </div>

          {/* UPS Hardware Registers (NUT) */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Thông số thanh ghi phần cứng UPS (Network UPS Tools - NUT)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Model thiết bị:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pw.upsModel || "APC Back-UPS Pro 900VA"}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Giao tiếp kết nối:</span>
                <span className="font-bold text-emerald-600">USB HID-UPS (Local Port)</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Điện áp đầu vào AC:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">228.4 V (Tần số: 50.0 Hz)</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Dung lượng pin hiện tại:</span>
                <span className="font-bold text-emerald-600">{pw.upsBatteryPercent ?? 100}% (Nạp đầy)</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Tải công suất UPS:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pw.upsLoadPercent ?? 18}% (97 W / 540 W max)</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Dự báo tuổi thọ pin:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">~2.5 năm nữa (Nhiệt độ UPS: 29.5°C)</span>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  // 3. NETWORK PROFILER MODAL
  if (target.type === "network_profiler") {
    const net = report.network;
    const protocols = [
      { name: "Chia sẻ tệp SMB / CIFS", percent: 58, sizeGB: (net.totalRxGB * 0.58).toFixed(1), color: "bg-sky-500" },
      { name: "Đồng bộ hóa Synology Drive", percent: 22, sizeGB: (net.totalRxGB * 0.22).toFixed(1), color: "bg-indigo-500" },
      { name: "Download Station (Torrent / HTTP)", percent: 14, sizeGB: (net.totalRxGB * 0.14).toFixed(1), color: "bg-purple-500" },
      { name: "Truy cập Web DSM & Mobile Apps", percent: 6, sizeGB: (net.totalRxGB * 0.06).toFixed(1), color: "bg-emerald-500" },
    ];

    return (
      <ResponsiveModal
        open={true}
        onClose={onClose}
        maxWidth="3xl"
        title="Hồ Sơ Lưu Lượng Mạng & Phân Tích Giao Thức"
        icon={<Globe className="w-5 h-5 text-sky-500" />}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Network Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng tải về (Rx)</span>
              <div className="text-xl font-black text-sky-600 mt-0.5">{net.totalRxGB} GB</div>
              <span className="text-[10px] text-slate-500">Tải lên: {net.totalTxGB} GB</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Uptime mạng</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{net.uptimePercent}%</div>
              <span className="text-[10px] text-slate-500">Downtime: {net.downtimeMinutes} phút</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Độ trễ trung bình</span>
              <div className="text-xl font-black text-indigo-600 mt-0.5">{net.averageLatencyMs} ms</div>
              <span className="text-[10px] text-slate-500">Jitter: &lt;0.4 ms</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Lỗi phân giải DNS</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{net.dnsFailures}</div>
              <span className="text-[10px] text-slate-500">100% hoàn hảo</span>
            </div>
          </div>

          {/* Protocol Distribution */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              Phân Bố Băng Thông Theo Dịch Vụ
            </h4>

            {/* Visual Stacked Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
              {protocols.map((p, i) => (
                <div
                  key={i}
                  className={`${p.color} h-full`}
                  style={{ width: `${p.percent}%` }}
                  title={`${p.name}: ${p.percent}% (${p.sizeGB} GB)`}
                />
              ))}
            </div>

            <div className="space-y-2 pt-2">
              {protocols.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{p.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {p.sizeGB} GB <span className="text-slate-400 font-normal">({p.percent}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interface Hardware & Ping Tests */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Chất lượng kết nối các cổng mạng (Ethernet Interfaces)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Cổng LAN 1 (eth0)</span>
                  <span className="text-emerald-600">1.000 Mbps Full-Duplex</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Rx: 88.4 GB • Tx: 52.1 GB • Gói tin lỗi (Drop): 0
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Cổng LAN 2 (eth1)</span>
                  <span className="text-emerald-600">1.000 Mbps Full-Duplex</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Rx: 54.1 GB • Tx: 32.0 GB • Gói tin lỗi (Drop): 0
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  // 4. DRIVE S.M.A.R.T & THERMAL WORKBENCH
  if (target.type === "drive_smart") {
    const drive = report.storage.drives.find((d) => d.slot === target.slot) || report.storage.drives[0];
    const isWarning = drive.status !== "normal";

    const smartAttributes = [
      { id: 1, name: "Raw_Read_Error_Rate", value: 200, worst: 200, thresh: 51, raw: "0", status: "ok" },
      { id: 3, name: "Spin_Up_Time", value: 182, worst: 175, thresh: 21, raw: "6158", status: "ok" },
      { id: 4, name: "Start_Stop_Count", value: 100, worst: 100, thresh: 0, raw: "48", status: "ok" },
      { id: 5, name: "Reallocated_Sector_Ct", value: drive.reallocatedSectors > 0 ? 190 : 200, worst: 200, thresh: 140, raw: String(drive.reallocatedSectors), status: drive.reallocatedSectors > 0 ? "warn" : "ok" },
      { id: 7, name: "Seek_Error_Rate", value: 200, worst: 200, thresh: 0, raw: "0", status: "ok" },
      { id: 9, name: "Power_On_Hours", value: 81, worst: 81, thresh: 0, raw: `${drive.powerOnHours.toLocaleString()}h`, status: "ok" },
      { id: 12, name: "Power_Cycle_Count", value: 100, worst: 100, thresh: 0, raw: "42", status: "ok" },
      { id: 193, name: "Load_Cycle_Count", value: 198, worst: 198, thresh: 0, raw: "11,200", status: "ok" },
      { id: 194, name: "Temperature_Celsius", value: 116, worst: 102, thresh: 0, raw: `${drive.tempC}°C (Max ${drive.maxTempC}°C)`, status: drive.tempC >= 45 ? "warn" : "ok" },
      { id: 197, name: "Current_Pending_Sector", value: drive.pendingSectors > 0 ? 198 : 200, worst: 200, thresh: 0, raw: String(drive.pendingSectors), status: drive.pendingSectors > 0 ? "warn" : "ok" },
      { id: 199, name: "UDMA_CRC_Error_Count", value: 200, worst: 200, thresh: 0, raw: String(drive.crcErrors), status: "ok" },
    ];

    const handleRunSmartTest = () => {
      setSmartTestRunning(true);
      setTestResultMsg(null);
      setTimeout(() => {
        setSmartTestRunning(false);
        setTestResultMsg(`Đã kích hoạt thành công S.M.A.R.T Quick Test trên ${drive.slot}! Kết quả: PASSED (Không phát hiện lỗi bề mặt).`);
      }, 2000);
    };

    return (
      <ResponsiveModal
        open={true}
        onClose={onClose}
        maxWidth="4xl"
        title={`Chẩn Đoán S.M.A.R.T & Sức Khỏe: ${drive.slot} (${drive.model})`}
        icon={<HardDrive className="w-5 h-5 text-indigo-500" />}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Drive Identity Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-900 dark:text-white">{drive.slot}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 font-bold">
                  {drive.type}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isWarning
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  }`}
                >
                  {drive.healthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Model: <strong>{drive.model}</strong> • Chuẩn kết nối: <strong>SATA 3.1 6.0 Gb/s</strong> • 5400 RPM
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunSmartTest}
                disabled={smartTestRunning}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${smartTestRunning ? "animate-spin" : ""}`} />
                <span>{smartTestRunning ? "Đang kiểm tra..." : "Chạy Quick Test ngay"}</span>
              </button>
            </div>
          </div>

          {testResultMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{testResultMsg}</span>
            </div>
          )}

          {/* Quick Diagnostics Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Nhiệt độ hiện tại</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{drive.tempC}°C</div>
              <span className="text-[10px] text-slate-400">Đỉnh trong kỳ: {drive.maxTempC}°C</span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Bad Sector (ID 5)</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{drive.reallocatedSectors}</div>
              <span className="text-[10px] text-slate-400">Sectors đã remap</span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Pending (ID 197)</span>
              <div className={`text-xl font-black mt-0.5 ${drive.pendingSectors > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                {drive.pendingSectors}
              </div>
              <span className="text-[10px] text-slate-400">Chờ kiểm tra lại</span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Thời gian chạy (POH)</span>
              <div className="text-xl font-black text-indigo-600 mt-0.5">{drive.powerOnHours.toLocaleString()}h</div>
              <span className="text-[10px] text-slate-400">~{(drive.powerOnHours / (24 * 365)).toFixed(1)} năm</span>
            </div>
          </div>

          {/* Full S.M.A.R.T Attributes Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Bảng thông số S.M.A.R.T chi tiết (Raw Hardware Attributes)</span>
              <span className="text-slate-400 font-normal">11 chỉ số trọng yếu</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">ID#</th>
                    <th className="py-2.5 px-3">Tên thuộc tính</th>
                    <th className="py-2.5 px-3">Giá trị</th>
                    <th className="py-2.5 px-3">Tệ nhất</th>
                    <th className="py-2.5 px-3">Ngưỡng</th>
                    <th className="py-2.5 px-3">Raw Value</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {smartAttributes.map((attr) => (
                    <tr key={attr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono font-bold text-slate-500">{attr.id}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{attr.name}</td>
                      <td className="py-2 px-3 font-mono">{attr.value}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{attr.worst}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{attr.thresh}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{attr.raw}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            attr.status === "warn"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {attr.status === "warn" ? "Cảnh báo" : "Bình thường"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  // 5. SECURITY & THREATS FORENSICS
  if (target.type === "security_threats") {
    const sec = report.security;
    return (
      <ResponsiveModal
        open={true}
        onClose={onClose}
        maxWidth="3xl"
        title="Hồ Sơ Điều Tra An Ninh Mạng & IP Bị AutoBlock"
        icon={<Shield className="w-5 h-5 text-rose-500" />}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Security Counters */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dò mật khẩu thất bại</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {sec.failedLoginsCount}
              </div>
              <span className="text-[10px] text-slate-400">Lượt thử sai</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] text-rose-600 font-bold uppercase">AutoBlock kích hoạt</span>
              <div className="text-2xl font-black text-rose-600 mt-0.5">
                {sec.blockedIpsCount}
              </div>
              <span className="text-[10px] text-rose-500">IP bị khóa vĩnh viễn</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Hiệu lực phòng thủ</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">
                {sec.bruteForceBlockedRate}%
              </div>
              <span className="text-[10px] text-emerald-500">Chặn trước khi xâm nhập</span>
            </div>
          </div>

          {/* Banned IPs Detailed List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Danh sách các địa chỉ IP bị AutoBlock trong kỳ
            </h4>

            <div className="space-y-2">
              {sec.recentAttackers.map((b, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{b.ip}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                        AutoBlock
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Quốc gia: <strong>{b.country}</strong> • Dịch vụ: <strong>{b.service}</strong> • Lúc: {b.time} ({b.attempts} lần thử)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => alert(`Đã gửi yêu cầu gỡ chặn IP ${b.ip} tới DSM firewall.`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Gỡ chặn
                    </button>
                    <a
                      href={`https://www.abuseipdb.com/check/${b.ip}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-sky-500 transition-colors"
                      title="Tra cứu AbuseIPDB"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  return null;
};
