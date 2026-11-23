import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body.url || "").trim();
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // 1. Google Drive direct resolver
    if (url.includes("drive.google.com")) {
      let fileId = "";
      const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match1) fileId = match1[1];
      else if (match2) fileId = match2[1];

      if (fileId) {
        const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        return NextResponse.json({
          success: true,
          originalUrl: url,
          directUrl,
          host: "Google Drive",
          filename: `gdrive_file_${fileId}.bin`,
          message: "Đã chuyển đổi Google Drive sang link tải trực tiếp!",
        });
      }
    }

    // 2. Fshare.vn resolver / handler
    if (url.includes("fshare.vn")) {
      const match = url.match(/fshare\.vn\/file\/([a-zA-Z0-9]+)/);
      const fileCode = match ? match[1] : "";
      return NextResponse.json({
        success: true,
        originalUrl: url,
        directUrl: url,
        host: "Fshare.vn",
        fileCode,
        note: "Đã gửi link tới Synology Fshare Host Plugin để tải với tài khoản VIP/Free.",
      });
    }

    // 3. Mediafire
    if (url.includes("mediafire.com")) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const html = await res.text();
          const dMatch = html.match(/href="([^"]+mediafire\.com\/[^"]+)"\s+id="downloadButton"/i) || html.match(/aria-label="Download file"\s+href="([^"]+)"/i);
          if (dMatch && dMatch[1]) {
            return NextResponse.json({
              success: true,
              originalUrl: url,
              directUrl: dMatch[1],
              host: "MediaFire",
            });
          }
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      originalUrl: url,
      directUrl: url,
      host: "Generic",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Resolver error" }, { status: 500 });
  }
}
