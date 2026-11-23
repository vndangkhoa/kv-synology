import { NextRequest, NextResponse } from "next/server";
import { ReportPeriod, ReportSummary } from "@/lib/dsm/types";
import { buildLiveReportSummary } from "@/lib/reports/reportEngine";

export const dynamic = "force-dynamic";

function renderReportHtml(report: ReportSummary, isWeekly: boolean): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Vận Hành Synology NAS - ${isWeekly ? "Tuần" : "Tháng"} (${report.startDate} - ${report.endDate})</title>
  <style>
    :root {
      --primary: #0284c7;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --bg: #f8fafc;
      --text: #0f172a;
      --card-bg: #ffffff;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); line-height: 1.5; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .meta-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #334155; }
    
    .score-card { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; border-radius: 14px; padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .score-num { font-size: 48px; font-weight: 900; line-height: 1; }
    .score-desc { font-size: 15px; opacity: 0.95; margin-top: 6px; }
    .score-highlights { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .highlight-pill { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }

    .card { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .metric-value { font-size: 26px; font-weight: 800; color: #0f172a; }
    .metric-sub { font-size: 13px; color: #64748b; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13.5px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; color: #475569; font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: #1e293b; }
    tr:last-child td { border-bottom: none; }

    .badge-ok { background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-warn { background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-err { background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }

    .print-bar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 16px; }
    .btn { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #0369a1; }
    
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-bar">
      <button class="btn" onclick="window.print()">🖨️ In hoặc Lưu PDF</button>
      <button class="btn" style="background:#475569;" onclick="window.close()">Đóng</button>
    </div>

    <div class="header">
      <div>
        <div class="title">BÁO CÁO VẬN HÀNH HỆ THỐNG NAS</div>
        <div class="subtitle">Kỳ báo cáo: ${isWeekly ? "Tuần" : "Tháng"} (${report.startDate} - ${report.endDate}) • Tạo lúc: ${report.generatedAt}</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-badge">${report.model} • ${report.hostName}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Uptime: ${report.uptimeString}</div>
      </div>
    </div>

    <!-- Health Score Banner -->
    <div class="score-card">
      <div>
        <div style="font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Chỉ Số Sức Khỏe Tổng Thể</div>
        <div class="score-desc">${report.healthScore.statusText}</div>
        <div class="score-highlights">
          ${report.healthScore.summaryHighlights.map((h) => `<span class="highlight-pill">${h}</span>`).join("")}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="score-num">${report.healthScore.score}<span style="font-size: 24px; font-weight: 600;">/100</span></div>
        <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">Hạng ${report.healthScore.grade}</div>
      </div>
    </div>

    <!-- 1. Power & Energy -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">⚡ 1. Nguồn Điện & Năng Lượng Tiêu Thụ</h3>
    <div class="grid-4">
      <div class="card">
        <div class="card-title">Mất Điện Lưới</div>
        <div class="metric-value">${report.power.outagesCount} <span style="font-size: 14px; font-weight: 500;">lần</span></div>
        <div class="metric-sub">UPS pin: ${Math.round(report.power.totalBatterySeconds / 60)} phút</div>
      </div>
      <div class="card">
        <div class="card-title">Tắt Đột Ngột</div>
        <div class="metric-value" style="color: ${report.power.improperShutdowns > 0 ? "var(--danger)" : "var(--success)"};">
          ${report.power.improperShutdowns} <span style="font-size: 14px; font-weight: 500;">lần</span>
        </div>
        <div class="metric-sub">Không qua bảo vệ UPS</div>
      </div>
      <div class="card">
        <div class="card-title">Điện Năng Ước Tính</div>
        <div class="metric-value">${report.power.estimatedKWh} <span style="font-size: 14px; font-weight: 500;">kWh</span></div>
        <div class="metric-sub">Công suất TB: ${report.power.averageWattage}W</div>
      </div>
      <div class="card">
        <div class="card-title">Tiền Điện Ước Tính</div>
        <div class="metric-value">${report.power.estimatedCostVND.toLocaleString("vi-VN")} <span style="font-size: 14px; font-weight: 500;">đ</span></div>
        <div class="metric-sub">Biểu giá bậc 3 (~3.000đ/kWh)</div>
      </div>
    </div>

    <!-- 2. Network & Outages -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">🌐 2. Mạng & Độ Sẵn Sàng Internet</h3>
    <div class="grid-4">
      <div class="card">
        <div class="card-title">Sự Cố Rớt Mạng</div>
        <div class="metric-value">${report.network.outagesCount} <span style="font-size: 14px; font-weight: 500;">lần</span></div>
        <div class="metric-sub">Downtime: ${report.network.downtimeMinutes} phút</div>
      </div>
      <div class="card">
        <div class="card-title">Tỷ Lệ Uptime Mạng</div>
        <div class="metric-value" style="color: var(--success);">${report.network.uptimePercent}%</div>
        <div class="metric-sub">Đạt chuẩn khả dụng cao</div>
      </div>
      <div class="card">
        <div class="card-title">Độ Trễ Trung Bình</div>
        <div class="metric-value">${report.network.averageLatencyMs} <span style="font-size: 14px; font-weight: 500;">ms</span></div>
        <div class="metric-sub">Ping Gateway & DNS</div>
      </div>
      <div class="card">
        <div class="card-title">Lưu Lượng Dữ Liệu</div>
        <div class="metric-value">${report.network.totalRxGB} <span style="font-size: 14px; font-weight: 500;">GB</span></div>
        <div class="metric-sub">Tải lên: ${report.network.totalTxGB} GB</div>
      </div>
    </div>

    <!-- 3. Drive Health & Wear -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">💾 3. Sức Khỏe Ổ Đĩa & Phân Tích Tiêu Hao</h3>
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">Chi Tiết Tình Trạng Các Ổ Đĩa (S.M.A.R.T & Sức Khỏe)</div>
      <table>
        <thead>
          <tr>
            <th>Khay</th>
            <th>Model Ổ Đĩa</th>
            <th>Loại</th>
            <th>Nhiệt Độ</th>
            <th>Bad Sector (ID 5)</th>
            <th>Pending (ID 197)</th>
            <th>Giờ Chạy (POH)</th>
            <th>Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          ${report.storage.drives
            .map(
              (d) => `<tr>
            <td><strong>${d.slot}</strong></td>
            <td>${d.model}</td>
            <td><span class="meta-badge">${d.type}</span></td>
            <td>${d.tempC}°C (Max ${d.maxTempC}°C)</td>
            <td>${d.reallocatedSectors}</td>
            <td style="color: ${d.pendingSectors > 0 ? "var(--warning)" : "inherit"}; font-weight: ${d.pendingSectors > 0 ? "700" : "normal"};">${d.pendingSectors}</td>
            <td>${d.powerOnHours.toLocaleString()}h</td>
            <td><span class="${d.status === "normal" ? "badge-ok" : "badge-warn"}">${d.healthLabel}</span></td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      
      <!-- Wear Analysis details -->
      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border); display: flex; gap: 24px; flex-wrap: wrap;">
        <div>
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">TIÊU HAO SSD CACHE:</span>
          <div style="font-size: 13.5px; font-weight: 600; margin-top: 2px;">
            Tuổi thọ còn ${report.diskWear.ssds[0]?.lifeLeftPercent ?? 100}% • Đã ghi +${report.diskWear.ssds[0]?.tbwWrittenInPeriod ?? 0} TBW • Dự kiến còn ~${report.diskWear.ssds[0]?.estimatedYearsRemaining ?? 5} năm
          </div>
        </div>
        <div>
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">KHUYẾN NGHỊ ĐỖ ĐẦU TỪ (HIBERNATION):</span>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">
            ${report.diskWear.hibernationRecommendation ?? "Các ổ hoạt động bình thường, tần suất chu kỳ quay an toàn."}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Security & Intrusion -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">🛡️ 4. Phòng Thủ Tấn Công & An Toàn Bảo Mật</h3>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Hoạt Động Tấn Công Phát Hiện</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div class="metric-value">${report.security.failedLoginsCount}</div>
            <div class="metric-sub">Dò mật khẩu thất bại</div>
          </div>
          <div>
            <div class="metric-value" style="color: var(--danger);">${report.security.blockedIpsCount}</div>
            <div class="metric-sub">Địa chỉ IP bị AutoBlock</div>
          </div>
          <div>
            <div class="metric-value" style="color: var(--success);">${report.security.bruteForceBlockedRate}%</div>
            <div class="metric-sub">Tỷ lệ chặn thành công</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
          <strong>Top nguồn tấn công:</strong> ${report.security.topAttackingCountries.map((c) => `${c.flagEmoji} ${c.countryName} (${c.attackCount})`).join(", ")}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Đánh Giá Lỗ Hổng (Security Advisor)</div>
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
          Điểm đánh giá bảo mật: <span style="color: var(--warning);">${report.vulnerabilities.securityAdvisorScore}/100</span>
        </div>
        <ul style="padding-left: 18px; font-size: 13px; color: #475569;">
          ${report.vulnerabilities.findings.map((f) => `<li style="margin-bottom: 6px;"><strong>${f.title}</strong>: ${f.recommendation}</li>`).join("")}
        </ul>
      </div>
    </div>

    <!-- 5. Day-by-Day Operational Ledger -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">📅 5. Bảng Kê Chi Tiết Hoạt Động Từng Ngày (Daily Audit Ledger)</h3>
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">Nhật Ký Kiểm Toán Từng Chu Kỳ 24h</div>
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Trạng Thái</th>
            <th>Điện Năng</th>
            <th>Sự Cố Nguồn</th>
            <th>Mạng (Rx/Tx)</th>
            <th>Đĩa (Max °C)</th>
            <th>Bảo Mật</th>
            <th>CPU/RAM</th>
            <th>Sự Kiện Nổi Bật Trong Ngày</th>
          </tr>
        </thead>
        <tbody>
          ${(report.dailyRecords || [])
            .map(
              (r) => `<tr>
            <td><strong>${r.date}</strong> <span style="font-size: 11px; color: #64748b;">(${r.dayOfWeek})</span></td>
            <td><span class="${r.status === "optimal" ? "badge-ok" : "badge-warn"}">${r.status === "optimal" ? "Tối ưu" : "Cảnh báo"}</span></td>
            <td><strong>${r.power.kwh} kWh</strong> <span style="font-size: 11px; color: #64748b;">(~${r.power.costVND.toLocaleString("vi-VN")}đ)</span></td>
            <td>${r.power.outagesCount > 0 ? `<span style="color: var(--warning); font-weight: 700;">⚡ ${r.power.outagesCount} lần (${Math.round(r.power.batteryRuntimeSec / 60)}p pin)</span>` : `<span style="color: #64748b;">0 sự cố</span>`}</td>
            <td>↓${r.network.rxGB}G / ↑${r.network.txGB}G</td>
            <td>${r.storage.maxTempC}°C ${r.storage.newBadSectors > 0 ? `<span style="color: var(--danger); font-weight: 700;">(+${r.storage.newBadSectors} sector)</span>` : ""}</td>
            <td>${r.security.failedLogins} lỗi ${r.security.blockedIpsCount > 0 ? `<span class="badge-err">Chặn ${r.security.blockedIpsCount} IP</span>` : ""}</td>
            <td>${r.system.peakCpuPercent}% / ${r.system.peakMemPercent}%</td>
            <td style="font-size: 12px; color: #475569;">
              ${r.events.map((e) => `<div style="margin-bottom: 2px;"><strong>${e.time}</strong>: ${e.message}</div>`).join("")}
            </td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
      Báo cáo được tự động tạo bởi KV-Synology DSM Web Manager & AI Engine.
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const period: ReportPeriod = periodParam === "monthly" ? "monthly" : "weekly";

    const host = request.headers.get("x-dsm-host") || searchParams.get("host");
    const model = request.headers.get("x-dsm-model") || searchParams.get("model") || "DS920+";

    if (!host) {
      return new Response("Yêu cầu kết nối Synology DSM để xuất báo cáo.", { status: 401 });
    }

    const report = buildLiveReportSummary({ period, hostName: host, model });
    const isWeekly = period === "weekly";
    const html = renderReportHtml(report, isWeekly);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    return new NextResponse(`Lỗi tạo báo cáo: ${error?.message}`, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report: ReportSummary = body.report || body;
    const isWeekly = report.period === "weekly";
    const html = renderReportHtml(report, isWeekly);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    return new NextResponse(`Lỗi tạo báo cáo: ${error?.message}`, { status: 500 });
  }
}
