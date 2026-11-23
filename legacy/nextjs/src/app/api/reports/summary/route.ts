import { NextRequest, NextResponse } from "next/server";
import { ReportPeriod } from "@/lib/dsm/types";
import { buildLiveReportSummary } from "@/lib/reports/reportEngine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const period: ReportPeriod = periodParam === "monthly" ? "monthly" : "weekly";

    // Read NAS connection headers
    const host = request.headers.get("x-dsm-host");
    const sid = request.headers.get("x-dsm-sid");
    if (!host && !sid) {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu đăng nhập Synology DSM để tạo và xem báo cáo vận hành.",
        },
        { status: 401 }
      );
    }

    const hostName = host || "Synology-NAS";
    const model = request.headers.get("x-dsm-model") || "DS920+";

    // Build report summary with actual host & model parameters
    const summary = buildLiveReportSummary({
      period,
      hostName,
      model,
      dsmVersion: request.headers.get("x-dsm-version") || "DSM 7.2",
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[Reports API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate report summary",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body && body.report) {
      return NextResponse.json({ success: true, data: body.report });
    }
    const summary = buildLiveReportSummary(body);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Invalid report payload" },
      { status: 400 }
    );
  }
}
