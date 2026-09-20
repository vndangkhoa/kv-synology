import { NextRequest, NextResponse } from "next/server";
import { ReportPeriod } from "@/lib/dsm/types";
import { generateMockReport } from "@/lib/reports/reportEngine";

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

    // Generate comprehensive report summary
    const summary = generateMockReport(period, hostName, model);

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
