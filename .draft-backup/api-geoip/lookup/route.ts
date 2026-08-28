import { NextRequest, NextResponse } from "next/server";
import { resolveIpGeo, isPrivateIp } from "@/lib/traffic/geoIpService";
import dns from "dns/promises";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get("ip");
  if (!ip) {
    return NextResponse.json({ success: false, error: "Thiếu tham số ip" }, { status: 400 });
  }

  try {
    const geo = await resolveIpGeo(ip);

    // Try reverse DNS lookup for hostname
    let reverseDns = "";
    if (!isPrivateIp(ip)) {
      try {
        const hostnames = await dns.reverse(ip);
        if (hostnames && hostnames.length > 0) {
          reverseDns = hostnames[0];
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        ...geo,
        reverseDns: reverseDns || "Không có bản ghi PTR",
        whoisLink: `https://whois.domaintools.com/${ip}`,
        abuseIpDbLink: `https://www.abuseipdb.com/check/${ip}`,
        bgpLink: `https://bgp.he.net/ip/${ip}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
