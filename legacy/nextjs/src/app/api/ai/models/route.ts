import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ModelItem {
  id: string;
  label: string;
  desc: string;
}

const FALLBACK_MODELS: Record<string, ModelItem[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Thế hệ mới nhất - Siêu tốc)", desc: "Mô hình mới nhất, độ trễ cực thấp, tối ưu cho DSM" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Suy luận sâu nâng cao)", desc: "Mô hình suy luận mạnh mẽ giải quyết tác vụ phức tạp" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Nhanh & Thông minh - Khuyên dùng)", desc: "Cân bằng hoàn hảo giữa tốc độ, trí tuệ và độ chính xác" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Tiết kiệm tài nguyên)", desc: "Độ trễ thấp nhất, tối ưu cho phản hồi nhanh" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Tiêu chuẩn)", desc: "Tốc độ ổn định cho các tác vụ hàng ngày" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Ngữ cảnh 2M Tokens)", desc: "Khả năng phân tích hệ thống và tài liệu kỹ thuật dài" },
  ],
  openrouter: [
    { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet (anthropic/claude-3.7-sonnet)", desc: "Mô hình lập luận Hybrid hàng đầu thế giới của Anthropic" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)", desc: "Khả năng phân tích hệ thống và lập luận kỹ thuật chuẩn xác" },
    { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku (anthropic/claude-3.5-haiku)", desc: "Mô hình siêu tốc độ, chi phí thấp" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (deepseek/deepseek-chat)", desc: "Mô hình tổng quát 671B tham số hiệu năng cao" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (deepseek/deepseek-r1)", desc: "Mô hình chuỗi suy luận sâu giải quyết lỗi khó" },
    { id: "openai/gpt-4o", label: "GPT-4o (openai/gpt-4o)", desc: "Mô hình đa phương thức hàng đầu OpenAI" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (openai/gpt-4o-mini)", desc: "Mô hình nhỏ gọn, phản hồi tức thì" },
    { id: "openai/o3-mini", label: "o3-mini (openai/o3-mini)", desc: "Mô hình lý luận nhanh mới nhất của OpenAI" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)", desc: "Mã nguồn mở thế hệ mới của Meta" },
    { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B (qwen/qwen-2.5-72b-instruct)", desc: "Mô hình tiếng Việt và đa ngữ xuất sắc từ Alibaba" },
    { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (google/gemini-2.0-flash-001)", desc: "Mô hình Google Flash qua OpenRouter" },
  ],
  deepseek: [
    { id: "deepseek-chat", label: "DeepSeek-V3 (deepseek-chat - Khuyên dùng)", desc: "Mô hình tổng quát đa nhiệm mạnh mẽ, tốc độ cao" },
    { id: "deepseek-reasoner", label: "DeepSeek-R1 (deepseek-reasoner - Suy luận sâu)", desc: "Mô hình chuỗi suy luận Chain of Thought chuyên sâu" },
  ],
  claude: [
    { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (Mới nhất - Khuyên dùng)", desc: "Mô hình thế hệ mới nhất với năng lực lập luận hybrid vượt trội" },
    { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Tiêu chuẩn kỹ thuật)", desc: "Chuẩn xác cao trong chẩn đoán và khắc phục sự cố DSM" },
    { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Siêu tốc)", desc: "Phản hồi cực nhanh, tiết kiệm token" },
    { id: "claude-3-opus-latest", label: "Claude 3 Opus (Phân tích chuyên sâu)", desc: "Khả năng xử lý tác vụ tư duy phức tạp" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini (Nhanh & Nhẹ - Khuyên dùng)", desc: "Tối ưu chi phí và độ trễ cho quản trị DSM" },
    { id: "gpt-4o", label: "GPT-4o (Toàn năng Flagship)", desc: "Mô hình mạnh mẽ hàng đầu của OpenAI" },
    { id: "o3-mini", label: "o3-mini (Lý luận nhanh)", desc: "Mô hình reasoning thế hệ mới hiệu năng cao" },
    { id: "o1", label: "o1 (Lý luận chuyên sâu)", desc: "Mô hình suy luận sâu cho bài toán phức tạp" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Mô hình GPT-4 kinh điển ổn định" },
  ],
  opencode: [
    { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 (anthropic/claude-sonnet-4-5 - Cấu hình OpenCode)", desc: "Mô hình cấu hình chính thức trong opencode.json" },
    { id: "opencode/zen-1", label: "OpenCode Zen-1 (Code & Script - Khuyên dùng)", desc: "Mô hình lý luận và code chính thức của OpenCode" },
    { id: "opencode-interpreter", label: "OpenCode Interpreter (Tự động hóa DSM)", desc: "Tối ưu cho việc thực thi lệnh quản trị và điều khiển NAS" },
    { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet (qua OpenCode)", desc: "Mô hình lập luận Hybrid hàng đầu thế giới" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (qua OpenCode)", desc: "Mô hình chuỗi suy luận sâu giải quyết lỗi phức tạp" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (qua OpenCode)", desc: "Mô hình tổng quát đa nhiệm mạnh mẽ" },
    { id: "openai/gpt-4o", label: "GPT-4o (qua OpenCode)", desc: "Mô hình đa phương thức flagship của OpenAI" },
    { id: "openai/o3-mini", label: "o3-mini (qua OpenCode)", desc: "Mô hình lý luận nhanh thế hệ mới" },
    { id: "atomic/Qwen3.5-9B-Q4_K_M", label: "Qwen 3.5 9B (Local Atomic Chat)", desc: "Mô hình chạy cục bộ cấu hình qua opencode.json" },
    { id: "lmstudio/local-model", label: "LM Studio Active Model", desc: "Mô hình cục bộ qua LM Studio" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (qua OpenCode)", desc: "Mô hình mã nguồn mở thế hệ mới của Meta" },
  ],
  webllm: [
    { id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", label: "Qwen 2.5 (0.5B Micro - 380MB)", desc: "Siêu nhẹ, tải trong 5-10s, chạy mượt trên mọi máy tính" },
    { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", label: "Llama 3.2 (1B Universal - 880MB)", desc: "Mô hình Meta AI thế hệ mới, hỗ trợ WebGPU" },
    { id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", label: "Qwen 2.5 (1.5B Tiếng Việt - 1.1GB)", desc: "Hiểu sâu ngữ cảnh Tiếng Việt và thuật ngữ Synology" },
    { id: "SmolLM2-360M-Instruct-q0f32-MLC", label: "SmolLM2 (360M Gọn nhẹ - 260MB)", desc: "Mô hình tiêu thụ ít RAM nhất" },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider || "gemini";
    const apiKey = body.apiKey?.trim() || "";
    const customBaseUrl = body.customBaseUrl?.trim() || "";

    const fallback = FALLBACK_MODELS[provider] || FALLBACK_MODELS.gemini;

    // If no API key is provided, return curated list
    if (!apiKey && provider !== "webllm" && provider !== "opencode") {
      return NextResponse.json({
        success: true,
        source: "curated",
        models: fallback,
        message: "Danh sách mô hình chuẩn (nhập API Key để lấy danh sách thời gian thực từ tài khoản của bạn).",
      });
    }

    // 1. GOOGLE GEMINI LIVE MODELS
    if (provider === "gemini") {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.models)) {
          const liveModels: ModelItem[] = data.models
            .filter((m: any) => {
              const name = m.name?.replace(/^models\//, "") || "";
              const methods = m.supportedGenerationMethods || [];
              const isGenerative = methods.includes("generateContent");
              const isNotAudioOrEmbed = !name.includes("embedding") && !name.includes("aqa") && !name.includes("imagen") && !name.includes("text-embedding");
              return isGenerative && isNotAudioOrEmbed;
            })
            .map((m: any) => {
              const id = m.name.replace(/^models\//, "");
              const displayName = m.displayName || id;
              return {
                id,
                label: `${displayName} (${id})`,
                desc: m.description ? m.description.slice(0, 100) + "..." : "Google Gemini Model",
              };
            });

          if (liveModels.length > 0) {
            liveModels.sort((a, b) => {
              const rank = (id: string) => {
                if (id.includes("2.5-flash")) return 1;
                if (id.includes("2.5-pro")) return 2;
                if (id.includes("2.0-flash") && !id.includes("lite")) return 3;
                if (id.includes("2.0-flash-lite")) return 4;
                if (id.includes("1.5-flash")) return 5;
                if (id.includes("1.5-pro")) return 6;
                return 10;
              };
              return rank(a.id) - rank(b.id);
            });

            return NextResponse.json({
              success: true,
              source: "live",
              models: liveModels,
              message: `Đã tìm thấy ${liveModels.length} mô hình Google Gemini khả dụng từ tài khoản của bạn!`,
            });
          }
        }
      } catch (err: any) {
        console.warn("[Gemini Live Models Fetch Failed]", err);
      }
    }

    // 2. OPENROUTER LIVE MODELS
    if (provider === "openrouter") {
      try {
        const baseUrl = customBaseUrl || "https://openrouter.ai/api/v1";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          const topIds = [
            "anthropic/claude-3.7-sonnet",
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3.5-haiku",
            "deepseek/deepseek-chat",
            "deepseek/deepseek-r1",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "openai/o3-mini",
            "meta-llama/llama-3.3-70b-instruct",
            "qwen/qwen-2.5-72b-instruct",
            "google/gemini-2.0-flash-001",
          ];

          const foundTop: ModelItem[] = [];
          const others: ModelItem[] = [];

          for (const m of data.data) {
            const id = m.id;
            const item: ModelItem = {
              id,
              label: `${m.name || id} (${id})`,
              desc: m.description ? m.description.slice(0, 100) + "..." : `Context: ${m.context_length || 128000} tokens`,
            };
            if (topIds.includes(id)) {
              foundTop.push(item);
            } else if (id.includes("claude") || id.includes("gpt") || id.includes("deepseek") || id.includes("gemini") || id.includes("qwen") || id.includes("llama")) {
              if (others.length < 25) others.push(item);
            }
          }

          const combined = [...foundTop, ...others];
          if (combined.length > 0) {
            return NextResponse.json({
              success: true,
              source: "live",
              models: combined,
              message: `Đã kết nối thành công tới OpenRouter (${combined.length} mô hình được gợi ý)!`,
            });
          }
        }
      } catch (err: any) {
        console.warn("[OpenRouter Live Models Fetch Failed]", err);
      }
    }

    // 3. DEEPSEEK LIVE MODELS
    if (provider === "deepseek") {
      try {
        const baseUrl = customBaseUrl || "https://api.deepseek.com";
        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
          const liveModels: ModelItem[] = data.data.map((m: any) => ({
            id: m.id,
            label: m.id === "deepseek-chat" ? "DeepSeek-V3 (deepseek-chat)" : m.id === "deepseek-reasoner" ? "DeepSeek-R1 (deepseek-reasoner)" : m.id,
            desc: m.id === "deepseek-reasoner" ? "Mô hình chuỗi suy luận sâu (Reasoning Chain)" : "Mô hình tổng quát đa nhiệm tốc độ cao",
          }));
          return NextResponse.json({
            success: true,
            source: "live",
            models: liveModels,
            message: "Đã tải danh sách mô hình từ DeepSeek Platform!",
          });
        }
      } catch (err: any) {
        console.warn("[DeepSeek Live Models Fetch Failed]", err);
      }
    }

    // 4. ANTHROPIC CLAUDE LIVE MODELS
    if (provider === "claude") {
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
          const liveModels: ModelItem[] = data.data.map((m: any) => ({
            id: m.id,
            label: `${m.display_name || m.id} (${m.id})`,
            desc: `Anthropic Claude Model - Created: ${m.created_at || "Recent"}`,
          }));
          return NextResponse.json({
            success: true,
            source: "live",
            models: liveModels,
            message: `Đã kết nối thành công tới Anthropic Console (${liveModels.length} mô hình)!`,
          });
        }
      } catch (err: any) {
        console.warn("[Anthropic Live Models Fetch Failed]", err);
      }
    }

    // 5. OPENAI LIVE MODELS
    if (provider === "openai") {
      try {
        const baseUrl = customBaseUrl || "https://api.openai.com/v1";
        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          const liveModels: ModelItem[] = data.data
            .filter((m: any) => {
              const id = m.id || "";
              return (
                (id.startsWith("gpt-4") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("chatgpt")) &&
                !id.includes("realtime") &&
                !id.includes("audio") &&
                !id.includes("transcription")
              );
            })
            .map((m: any) => ({
              id: m.id,
              label: m.id,
              desc: `OpenAI Model (Owner: ${m.owned_by || "openai"})`,
            }));

          if (liveModels.length > 0) {
            return NextResponse.json({
              success: true,
              source: "live",
              models: liveModels,
              message: `Đã tải ${liveModels.length} mô hình khả dụng từ OpenAI Platform!`,
            });
          }
        }
      } catch (err: any) {
        console.warn("[OpenAI Live Models Fetch Failed]", err);
      }
    }

    // 6. OPENCODE LOCAL / CLOUD / REGISTRY
    if (provider === "opencode") {
      try {
        const localDiscovered: ModelItem[] = [];
        const seen = new Set<string>();

        // A. Read user opencode.json config if present
        try {
          const fs = await import("fs");
          const path = await import("path");
          const homeDir = process.env.HOME || "/home/khoavo";
          const cfgPath = path.join(homeDir, ".config/opencode/opencode.json");
          if (fs.existsSync(cfgPath)) {
            const raw = fs.readFileSync(cfgPath, "utf-8");
            const cfg = JSON.parse(raw);
            if (cfg.model && !seen.has(cfg.model)) {
              seen.add(cfg.model);
              localDiscovered.push({
                id: cfg.model,
                label: `${cfg.model} (Mô hình mặc định trong opencode.json)`,
                desc: "OpenCode Config Active Default Model",
              });
            }
            if (cfg.provider) {
              for (const [pId, p] of Object.entries<any>(cfg.provider)) {
                if (p?.models) {
                  for (const [mId, mObj] of Object.entries<any>(p.models)) {
                    const fullId = `${pId}/${mId}`;
                    if (!seen.has(fullId)) {
                      seen.add(fullId);
                      localDiscovered.push({
                        id: fullId,
                        label: `${mObj?.name || mId} (${p.name || pId})`,
                        desc: `Local/Configured OpenCode Provider (${pId})`,
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (_) {}

        // B. Run local opencode CLI if installed
        try {
          const { execSync } = await import("child_process");
          const fs = await import("fs");
          const binPath = fs.existsSync("/home/khoavo/.opencode/bin/opencode")
            ? "/home/khoavo/.opencode/bin/opencode"
            : "opencode";
          const output = execSync(`${binPath} models`, { timeout: 3000, encoding: "utf8" });
          const lines = output.split("\n").map((l: string) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (!seen.has(line) && localDiscovered.length < 50) {
              seen.add(line);
              localDiscovered.push({
                id: line,
                label: line,
                desc: "OpenCode CLI Available Model",
              });
            }
          }
        } catch (_) {}

        // C. If custom Base URL is provided or server is at localhost:4096, query it
        const targetUrl = customBaseUrl || "http://localhost:4096";
        try {
          const baseUrl = targetUrl.replace(/\/+$/, "");
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

          const res = await fetch(`${baseUrl}/api/config`, { method: "GET", headers, cache: "no-store" });
          if (res.ok) {
            const cfg = await res.json();
            if (cfg.model && !seen.has(cfg.model)) {
              seen.add(cfg.model);
              localDiscovered.unshift({
                id: cfg.model,
                label: `${cfg.model} (Server Active Model)`,
                desc: "Active Model on Running OpenCode Server",
              });
            }
          }
        } catch (_) {}

        // D. Fetch from OpenCode Live Registry (models.opencode.ai)
        try {
          const res = await fetch("https://models.opencode.ai/api.json", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const priorityKeywords = ["claude-sonnet", "claude-3-7", "claude-3-5", "gpt-4o", "o3-mini", "deepseek-v3", "deepseek-r1", "llama-3.3", "qwen-2.5", "gemini-2.0", "zen"];
            for (const pId of Object.keys(data)) {
              const p = data[pId];
              if (p?.models) {
                for (const [mId, m] of Object.entries<any>(p.models)) {
                  const shortId = mId.toLowerCase();
                  const isMatch = priorityKeywords.some((k) => shortId.includes(k));
                  const fullId = `${pId}/${mId}`;
                  if (isMatch && !seen.has(fullId) && localDiscovered.length < 50) {
                    seen.add(fullId);
                    localDiscovered.push({
                      id: fullId,
                      label: `${m.name || mId} (${p.name || pId})`,
                      desc: m.description ? m.description.slice(0, 100) : `OpenCode Registry Model`,
                    });
                  }
                }
              }
            }
          }
        } catch (_) {}

        if (localDiscovered.length > 0) {
          const finalModels: ModelItem[] = [];
          const finalSeen = new Set<string>();
          for (const m of [...localDiscovered, ...fallback]) {
            if (!finalSeen.has(m.id)) {
              finalSeen.add(m.id);
              finalModels.push(m);
            }
          }
          return NextResponse.json({
            success: true,
            source: "live",
            models: finalModels,
            message: `Đã tìm nạp ${finalModels.length} mô hình từ OpenCode (Hệ thống cục bộ & OpenCode Registry)!`,
          });
        }
      } catch (err: any) {
        console.warn("[OpenCode Live Models Fetch Failed]", err);
      }
    }

    // Default fallback
    return NextResponse.json({
      success: true,
      source: "fallback",
      models: fallback,
      message: "Không thể tải danh sách động từ máy chủ API, đang sử dụng danh sách mô hình chuẩn đã cập nhật mới nhất.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xử lý yêu cầu lấy danh sách mô hình." },
      { status: 500 }
    );
  }
}
