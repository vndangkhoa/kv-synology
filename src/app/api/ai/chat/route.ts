import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RequestBody {
  action?: "chat" | "test";
  provider?: "gemini" | "deepseek" | "claude" | "openai" | "opencode" | "openrouter" | "webllm" | "heuristic";
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  messages?: ChatMessage[];
  telemetryContext?: string;
}

export interface McpToolCallAction {
  tool: string;
  params: Record<string, any>;
  description: string;
}

const MCP_AVAILABLE_TOOLS = [
  {
    name: "dsm_control_package",
    description: "Khởi động (start), tạm dừng (stop), hoặc khởi động lại (restart) một gói ứng dụng trên DSM.",
    params: { package_id: "string (VD: AudioStation, ContainerManager, PlexMediaServer)", action: "start | stop | restart" },
  },
  {
    name: "dsm_update_package",
    description: "Cập nhật / nâng cấp gói ứng dụng DSM lên phiên bản mới nhất.",
    params: { package_id: "string (VD: SynoCliTools, HomeAssistant)" },
  },
  {
    name: "dsm_install_package",
    description: "Cài đặt gói ứng dụng mới từ kho Synology hoặc Community.",
    params: { name: "string", package_id: "string (tùy chọn)", url: "string (tùy chọn)" },
  },
  {
    name: "dsm_uninstall_package",
    description: "Gỡ bỏ gói ứng dụng khỏi hệ thống Synology NAS.",
    params: { package_id: "string" },
  },
  {
    name: "dsm_control_docker_container",
    description: "Khởi động (start), dừng (stop), restart container Docker / Container Manager.",
    params: { name: "string (tên container)", action: "start | stop | restart" },
  },
  {
    name: "dsm_power_action",
    description: "Khởi động lại (reboot) hoặc tắt nguồn (shutdown) thiết bị Synology NAS.",
    params: { action: "reboot | shutdown" },
  },
  {
    name: "dsm_unblock_ip",
    description: "Mở khóa địa chỉ IP bị Tường lửa / Auto-block chặn brute-force.",
    params: { ip: "string (VD: 192.168.1.50 hoặc public IP)" },
  },
  {
    name: "dsm_control_service",
    description: "Bật/Tắt các dịch vụ hệ thống như SMB, SSH, FTP, NFS, WebDAV.",
    params: { service_id: "string (smb | ssh | ftp | nfs | webdav)", action: "start | stop | restart" },
  },
  {
    name: "dsm_list_files",
    description: "Liệt kê tệp tin và thư mục trong File Station.",
    params: { path: "string (VD: /docker, /video, /downloads)" },
  },
  {
    name: "dsm_get_system_info",
    description: "Lấy thông tin hệ thống chi tiết (CPU, RAM, Uptime, Nhiệt độ, Serial).",
    params: {},
  },
  {
    name: "dsm_get_system_utilization",
    description: "Lấy thông số tải phần cứng thời gian thực (CPU%, RAM%, Băng thông Mạng, Đọc/Ghi đĩa).",
    params: {},
  },
];

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const action = body.action || "chat";
    const provider = body.provider || "gemini";
    const apiKey = body.apiKey?.trim() || "";
    const customBaseUrl = body.customBaseUrl?.trim() || "";
    const model = body.model?.trim();

    // 1. ACTION: TEST CONNECTION
    if (action === "test") {
      if (!apiKey && provider !== "webllm" && provider !== "heuristic" && provider !== "opencode") {
        return NextResponse.json(
          { success: false, error: "Vui lòng nhập API Key trước khi kiểm tra kết nối." },
          { status: 400 }
        );
      }

      const startTime = Date.now();
      const testPrompt = [{ role: "user" as const, content: "Ping test. Reply with 'OK'." }];

      try {
        const reply = await callProvider(provider, apiKey, model, customBaseUrl, testPrompt, "You are an assistant. Reply concisely with 'OK'.");
        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          latencyMs,
          message: `Kết nối thành công tới ${provider.toUpperCase()} (${latencyMs}ms)!`,
          preview: reply.slice(0, 100),
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: err.message || "Không thể kết nối đến nhà cung cấp AI. Vui lòng kiểm tra lại API Key, Endpoint hoặc tên mô hình.",
          },
          { status: 400 }
        );
      }
    }

    // 2. ACTION: CHAT
    const messages = body.messages || [];
    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Danh sách tin nhắn trống." },
        { status: 400 }
      );
    }

    // Embed MCP tools instructions into system prompt
    const mcpInstructions = `
BẠN ĐƯỢC TÍCH HỢP TRỰC TIẾP VỚI MCP SERVER (MODEL CONTEXT PROTOCOL) ĐỂ ĐIỀU KHIỂN THIẾT BỊ SYNOLOGY NAS.
Các công cụ MCP sẵn có bạn có thể gọi khi người dùng yêu cầu thực hiện hành động trên NAS:
${MCP_AVAILABLE_TOOLS.map((t) => `- \`${t.name}\`: ${t.description} -> Tham số: ${JSON.stringify(t.params)}`).join("\n")}

KHI NGƯỜI DÙNG YÊU CẦU THỰC HIỆN MỘT THAO TÁC (như khởi động lại gói, dừng container, mở khóa IP, cập nhật gói, kiểm tra tài nguyên):
Hãy trả lời rõ ràng giải thích hành động, đồng thời thêm thẻ lệnh JSON MCP ở cuối câu trả lời theo cú pháp:
\`\`\`mcp_action
{
  "tool": "tên_công_cụ",
  "params": { ...các tham số... },
  "description": "Mô tả ngắn hành động vừa thực hiện"
}
\`\`\`
Hệ thống sẽ tự động bắt thẻ này và thực thi trực tiếp trên Synology NAS qua MCP Server!
`;

    const systemContext = (body.telemetryContext || `Bạn là "DSM AI Copilot" - Trợ lý Trí tuệ Nhân tạo thông minh, hỗ trợ quản trị và chẩn đoán toàn diện thiết bị Synology NAS.
Hãy trả lời ngắn gọn, chuẩn xác, thân thiện và hữu ích bằng Tiếng Việt.`) + "\n\n" + mcpInstructions;

    if (!apiKey && provider !== "opencode" && provider !== "webllm" && provider !== "heuristic") {
      return NextResponse.json(
        {
          success: false,
          error: `Chưa cấu hình API Key cho ${provider.toUpperCase()}. Vui lòng vào Cài đặt -> AI Copilot để nhập API Key.`,
        },
        { status: 400 }
      );
    }

    const reply = await callProvider(provider, apiKey, model, customBaseUrl, messages, systemContext);

    // Extract any embedded MCP actions from the AI reply
    const mcpActions: McpToolCallAction[] = [];
    const mcpRegex = /```(?:mcp_action|json:mcp)\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = mcpRegex.exec(reply)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool) {
          mcpActions.push({
            tool: parsed.tool,
            params: parsed.params || {},
            description: parsed.description || `Thực thi ${parsed.tool}`,
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      provider,
      model: model || getDefaultModel(provider),
      reply,
      mcpActions: mcpActions.length > 0 ? mcpActions : undefined,
    });
  } catch (error: any) {
    console.error("[AI Chat API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi trong quá trình xử lý yêu cầu AI.",
      },
      { status: 500 }
    );
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.0-flash";
    case "deepseek":
      return "deepseek-chat";
    case "claude":
      return "claude-3-5-sonnet-latest";
    case "openai":
      return "gpt-4o-mini";
    case "openrouter":
      return "anthropic/claude-3.5-sonnet";
    case "opencode":
      return "opencode-interpreter";
    default:
      return "gpt-4o-mini";
  }
}

async function callProvider(
  provider: string,
  apiKey: string,
  modelName: string | undefined,
  customBaseUrl: string | undefined,
  messages: Array<{ role: string; content: string }>,
  systemContext: string
): Promise<string> {
  const model = modelName || getDefaultModel(provider);

  // 1. GOOGLE GEMINI
  if (provider === "gemini") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiContents = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const payload = {
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: systemContext }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Google Gemini API Error (${res.status})`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ Google Gemini.");
    }
    return text;
  }

  // 2. OPENROUTER
  if (provider === "openrouter") {
    const baseUrl = customBaseUrl || "https://openrouter.ai/api/v1";
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const openAiMessages = [
      { role: "system", content: systemContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const payload = {
      model: model || "anthropic/claude-3.5-sonnet",
      messages: openAiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "KV Synology DSM Copilot",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `OpenRouter API Error (${res.status})`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ OpenRouter.");
    }
    return text;
  }

  // 3. OPENCODE (Local / Remote OpenCode API)
  if (provider === "opencode") {
    const baseUrl = customBaseUrl || "http://localhost:4096/v1";
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const openAiMessages = [
      { role: "system", content: systemContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const payload = {
      model: model || "opencode-interpreter",
      messages: openAiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `OpenCode API Error (${res.status})`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ OpenCode.");
    }
    return text;
  }

  // 4. DEEPSEEK
  if (provider === "deepseek") {
    const baseUrl = customBaseUrl || "https://api.deepseek.com";
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const openAiMessages = [
      { role: "system", content: systemContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const payload = {
      model: model || "deepseek-chat",
      messages: openAiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `DeepSeek API Error (${res.status})`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ DeepSeek.");
    }
    return text;
  }

  // 5. ANTHROPIC CLAUDE
  if (provider === "claude") {
    const endpoint = "https://api.anthropic.com/v1/messages";

    const claudeMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const payload = {
      model: model || "claude-3-5-sonnet-latest",
      max_tokens: 2048,
      system: systemContext,
      messages: claudeMessages,
      temperature: 0.7,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Anthropic Claude API Error (${res.status})`);
    }

    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ Anthropic Claude.");
    }
    return text;
  }

  // 6. OPENAI
  if (provider === "openai") {
    const baseUrl = customBaseUrl || "https://api.openai.com/v1";
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const openAiMessages = [
      { role: "system", content: systemContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const payload = {
      model: model || "gpt-4o-mini",
      messages: openAiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `OpenAI API Error (${res.status})`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ OpenAI.");
    }
    return text;
  }

  throw new Error(`Nhà cung cấp AI "${provider}" không được hỗ trợ.`);
}
