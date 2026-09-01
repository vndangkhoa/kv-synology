import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url.trim()) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(url.trim(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SynologyDownloadStation/7.2 RSS Reader)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: 502 });
    }

    const xml = await res.text();

    // Basic XML RSS / Atom parser
    const titleMatch = xml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    const items: Array<{
      id: string;
      title: string;
      url: string;
      description?: string;
      publish_date?: string;
      size?: number;
    }> = [];

    // Match <item> blocks
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < 60) {
      const itemXml = match[0];
      const iTitle = (itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || "Untitled").trim();
      
      // Look for magnet link or torrent url or link
      let downloadUrl = "";
      const enclosureMatch = itemXml.match(/<enclosure[\s\S]*?url=["']([^"']+)["']/i);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const magnetMatch = itemXml.match(/(magnet:\?xt=urn:[^"'\s<>]+)/i);

      if (magnetMatch) {
        downloadUrl = magnetMatch[1];
      } else if (enclosureMatch) {
        downloadUrl = enclosureMatch[1];
      } else if (linkMatch) {
        downloadUrl = linkMatch[1].trim();
      }

      const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
      const desc = (itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] || "").replace(/<[^>]*>?/gm, "").slice(0, 160).trim();
      const sizeMatch = itemXml.match(/length=["'](\d+)["']/i) || itemXml.match(/<size>(\d+)<\/size>/i);
      const size = sizeMatch ? Number(sizeMatch[1]) : 0;

      if (downloadUrl) {
        items.push({
          id: `rss_item_${count++}`,
          title: iTitle,
          url: downloadUrl,
          description: desc,
          publish_date: pubDate ? new Date(pubDate).toLocaleDateString() : "",
          size,
        });
      }
    }

    return NextResponse.json({
      title: siteTitle,
      url,
      items,
      total: items.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch RSS" }, { status: 500 });
  }
}
