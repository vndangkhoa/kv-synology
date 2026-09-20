import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, message, botToken, chatId, webhookUrl } = body;

    if (!channel) {
      return NextResponse.json({ success: false, error: "Missing notification channel" }, { status: 400 });
    }

    if (channel === "telegram") {
      const token = botToken?.trim();
      const chat = chatId?.trim();

      if (!token || !chat) {
        return NextResponse.json(
          { success: false, error: "Vui lòng cung cấp Telegram Bot Token và Chat ID" },
          { status: 400 }
        );
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: message || "Thông báo thử nghiệm từ KV-Synology",
          parse_mode: "Markdown",
        }),
      });

      const resData = await res.json();
      if (!resData.ok) {
        return NextResponse.json(
          { success: false, error: resData.description || "Lỗi gửi tin nhắn Telegram" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "Đã gửi thông báo Telegram thành công!" });
    }

    if (channel === "webhook") {
      const url = webhookUrl?.trim();
      if (!url) {
        return NextResponse.json({ success: false, error: "Vui lòng cung cấp Webhook URL" }, { status: 400 });
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          content: message,
          username: "KV-Synology Monitor",
        }),
      });

      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Webhook trả về mã lỗi HTTP ${res.status}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "Đã gửi thông báo Webhook thành công!" });
    }

    return NextResponse.json({ success: false, error: "Kênh thông báo không hỗ trợ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Notification Dispatch Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi máy chủ khi gửi thông báo" },
      { status: 500 }
    );
  }
}
