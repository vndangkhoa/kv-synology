use leptos::prelude::*;

use crate::api;
use crate::i18n::{format_speed, format_uptime, tr};
use crate::mock_data;
use crate::models::{AiChatMessage, DsmConfig, NavTab};
use crate::state::AppState;

#[component]
pub fn LoginModal() -> impl IntoView {
    let state = expect_context::<AppState>();
    let cfg = state.dsm_config.get_untracked();

    let host = RwSignal::new(cfg.host);
    let port = RwSignal::new(cfg.port.to_string());
    let https = RwSignal::new(cfg.https);
    let account = RwSignal::new(cfg.account);
    let password = RwSignal::new(String::new());
    let otp = RwSignal::new(String::new());
    let remember_7d = RwSignal::new(true);
    let busy = RwSignal::new(false);
    let err_msg = RwSignal::new(Option::<String>::None);

    let on_submit = move |ev: leptos::ev::SubmitEvent| {
        ev.prevent_default();
        if busy.get_untracked() {
            return;
        }
        let h = host.get_untracked().trim().to_string();
        let p = port.get_untracked().trim().parse::<u16>().unwrap_or(5001);
        let use_https = https.get_untracked();
        let acc = account.get_untracked().trim().to_string();
        let pwd = password.get_untracked();
        let otp_val = otp.get_untracked();
        let rem = remember_7d.get_untracked();

        if h.is_empty() || acc.is_empty() || pwd.is_empty() {
            err_msg.set(Some(
                tr(
                    state.language.get_untracked(),
                    "Vui lòng nhập đầy đủ Host, Tài khoản và Mật khẩu.",
                    "Please enter Host, Account, and Password.",
                )
                .to_string(),
            ));
            return;
        }

        let new_cfg = DsmConfig {
            host: h,
            port: p,
            https: use_https,
            account: acc,
        };
        busy.set(true);
        err_msg.set(None);

        leptos::task::spawn_local(async move {
            let otp_opt = if otp_val.trim().is_empty() {
                None
            } else {
                Some(otp_val.as_str())
            };
            match api::dsm_login(&new_cfg, &pwd, otp_opt).await {
                Ok(sess) => {
                    state.set_live_session(sess.clone(), new_cfg.clone(), rem);
                    if let Ok(info) = api::fetch_live_system_info(&sess, &new_cfg).await {
                        state.system_info.set(Some(info));
                    }
                    if let Ok(util) = api::fetch_live_utilization(&sess, &new_cfg).await {
                        state.utilization.set(Some(util));
                    }
                    state.show_toast(
                        tr(
                            state.language.get_untracked(),
                            "Đăng nhập Synology NAS thành công!",
                            "Connected to Synology NAS!",
                        ),
                        true,
                    );
                }
                Err(e) => {
                    err_msg.set(Some(e));
                }
            }
            busy.set(false);
        });
    };

    view! {
        <Show when=move || state.is_login_modal_open.get()>
            <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
                <div
                    class="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    on:click=move |_| state.is_login_modal_open.set(false)
                />
                <div class="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto ax-card p-5 sm:p-6 shadow-2xl">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <h2 class="text-base sm:text-lg font-bold">
                                {move || tr(state.language.get(), "Kết nối Synology NAS", "Connect to Synology NAS")}
                            </h2>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {move || tr(state.language.get(), "Hỗ trợ IP LAN, DDNS, QuickConnect ID & 2FA OTP", "Supports LAN IP, DDNS, QuickConnect ID & 2FA OTP")}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close"
                            on:click=move |_| state.is_login_modal_open.set(false)
                            class="p-1.5 ax-btn-secondary text-xs cursor-pointer"
                        >
                            "✕"
                        </button>
                    </div>

                    <form class="space-y-3" on:submit=on_submit>
                        <div class="grid grid-cols-3 gap-2.5">
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {move || tr(state.language.get(), "Địa chỉ Host / QuickConnect", "Host / QuickConnect")}
                                </label>
                                <input
                                    type="text"
                                    prop:value=move || host.get()
                                    on:input=move |ev| host.set(event_target_value(&ev))
                                    placeholder="192.168.1.10"
                                    class="w-full px-3 py-2 ax-input text-sm"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {move || tr(state.language.get(), "Cổng", "Port")}
                                </label>
                                <input
                                    type="text"
                                    prop:value=move || port.get()
                                    on:input=move |ev| port.set(event_target_value(&ev))
                                    class="w-full px-3 py-2 ax-input text-sm ax-tabular"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-between gap-2 text-xs">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    prop:checked=move || https.get()
                                    on:change=move |ev| https.set(event_target_checked(&ev))
                                />
                                <span>"HTTPS (SSL)"</span>
                            </label>
                            <div class="flex gap-1.5">
                                <button
                                    type="button"
                                    on:click=move |_| { port.set("5000".to_string()); https.set(false); }
                                    class="px-2 py-1 ax-btn-secondary text-xs cursor-pointer"
                                >
                                    "HTTP 5000"
                                </button>
                                <button
                                    type="button"
                                    on:click=move |_| { port.set("5001".to_string()); https.set(true); }
                                    class="px-2 py-1 ax-btn-secondary text-xs cursor-pointer"
                                >
                                    "HTTPS 5001"
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {move || tr(state.language.get(), "Tài khoản", "Account")}
                                </label>
                                <input
                                    type="text"
                                    prop:value=move || account.get()
                                    on:input=move |ev| account.set(event_target_value(&ev))
                                    class="w-full px-3 py-2 ax-input text-sm"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {move || tr(state.language.get(), "Mật khẩu", "Password")}
                                </label>
                                <input
                                    type="password"
                                    prop:value=move || password.get()
                                    on:input=move |ev| password.set(event_target_value(&ev))
                                    placeholder="••••••••"
                                    class="w-full px-3 py-2 ax-input text-sm"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                            <div>
                                <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    "2FA OTP"
                                </label>
                                <input
                                    type="text"
                                    prop:value=move || otp.get()
                                    on:input=move |ev| otp.set(event_target_value(&ev))
                                    placeholder="Optional"
                                    class="w-full px-3 py-2 ax-input text-sm ax-tabular"
                                />
                            </div>
                            <label class="flex items-center gap-2 py-2 text-xs cursor-pointer">
                                <input
                                    type="checkbox"
                                    prop:checked=move || remember_7d.get()
                                    on:change=move |ev| remember_7d.set(event_target_checked(&ev))
                                />
                                <span>{move || tr(state.language.get(), "Lưu phiên 7 ngày", "Save 7-day session")}</span>
                            </label>
                        </div>

                        <Show when=move || err_msg.get().is_some()>
                            <div class="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                                {move || err_msg.get().unwrap_or_default()}
                            </div>
                        </Show>

                        <button
                            type="submit"
                            disabled=move || busy.get()
                            class="w-full py-2.5 ax-btn-primary text-sm font-semibold cursor-pointer disabled:opacity-50"
                        >
                            {move || if busy.get() {
                                tr(state.language.get(), "Đang đăng nhập...", "Authenticating...")
                            } else {
                                tr(state.language.get(), "Đăng nhập vào NAS", "Sign in to NAS")
                            }}
                        </button>
                    </form>

                    <div class="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800 flex flex-col gap-2">
                        <button
                            type="button"
                            on:click=move |_| state.enter_demo_mode()
                            class="w-full py-2.5 ax-btn-secondary text-xs font-semibold cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Thử nghiệm ngay (Chế độ Demo DS920+)", "Try Now (DS920+ Demo Mode)")}
                        </button>
                        <Show when=move || state.session.get().is_connected>
                            <button
                                type="button"
                                on:click=move |_| {
                                    state.disconnect();
                                    state.is_login_modal_open.set(false);
                                }
                                class="w-full py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            >
                                {move || tr(state.language.get(), "Ngắt kết nối phiên hiện tại", "Disconnect current session")}
                            </button>
                        </Show>
                    </div>
                </div>
            </div>
        </Show>
    }
}

#[component]
pub fn PowerModal() -> impl IntoView {
    let state = expect_context::<AppState>();

    let trigger_power = move |action: &'static str| {
        let sess = state.session.get_untracked();
        let cfg = state.dsm_config.get_untracked();
        state.is_power_modal_open.set(false);
        if sess.is_demo {
            state.show_toast(format!("Demo NAS: simulated `{action}` signal sent."), true);
            return;
        }
        leptos::task::spawn_local(async move {
            let method = if action == "reboot" {
                "reboot"
            } else {
                "shutdown"
            };
            match api::dsm_call(
                &sess,
                &cfg,
                "entry.cgi",
                &[
                    ("api", "SYNO.Core.System"),
                    ("version", "1"),
                    ("method", method),
                ],
            )
            .await
            {
                Ok(_) => state.show_toast(format!("Sent {action} command to Synology NAS."), true),
                Err(e) => state.show_toast(e, false),
            }
        });
    };

    view! {
        <Show when=move || state.is_power_modal_open.get()>
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div
                    class="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    on:click=move |_| state.is_power_modal_open.set(false)
                />
                <div class="relative z-10 w-full max-w-sm ax-card p-6 shadow-2xl">
                    <h3 class="text-base font-bold mb-1">
                        {move || tr(state.language.get(), "Điều khiển nguồn NAS", "NAS Power Control")}
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">
                        {move || tr(state.language.get(), "Hành động này sẽ ảnh hưởng đến toàn bộ dịch vụ & Docker trên NAS.", "This affects all active DSM services and Docker containers.")}
                    </p>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <button
                            type="button"
                            on:click=move |_| trigger_power("reboot")
                            class="py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Khởi động lại", "Reboot")}
                        </button>
                        <button
                            type="button"
                            on:click=move |_| trigger_power("shutdown")
                            class="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Tắt nguồn", "Shutdown")}
                        </button>
                    </div>
                    <button
                        type="button"
                        on:click=move |_| state.is_power_modal_open.set(false)
                        class="w-full py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                    >
                        {move || tr(state.language.get(), "Hủy", "Cancel")}
                    </button>
                </div>
            </div>
        </Show>
    }
}

#[component]
pub fn AiChatBubble() -> impl IntoView {
    let state = expect_context::<AppState>();
    let input = RwSignal::new(String::new());
    let busy = RwSignal::new(false);

    let run_local_diag = move || {
        let lang = state.language.get_untracked();
        let info = state
            .system_info
            .get_untracked()
            .unwrap_or_else(mock_data::demo_system_info);
        let util = state
            .utilization
            .get_untracked()
            .unwrap_or_else(|| mock_data::demo_utilization(0));
        let summary = if lang == crate::models::Language::Vi {
            format!(
                "📊 Chẩn đoán tức thì ({}):\n• DSM: {} | Uptime: {} | Nhiệt độ: {}°C\n• CPU: {:.1}% | RAM: {:.1}% ({} / {} MB)\n• Mạng: ↓ {} | ↑ {}\n• Kết luận: Mọi phân hệ chính đang vận hành ổn định.",
                info.model,
                info.dsm_version,
                format_uptime(info.uptime_sec),
                info.temperature_c,
                util.cpu_total,
                util.ram_percent,
                util.ram_used_mb,
                util.ram_total_mb,
                format_speed(util.net_rx_bps),
                format_speed(util.net_tx_bps),
            )
        } else {
            format!(
                "📊 Instant Diagnostics ({}):\n• DSM: {} | Uptime: {} | Temp: {}°C\n• CPU: {:.1}% | RAM: {:.1}% ({} / {} MB)\n• Network: ↓ {} | ↑ {}\n• Status: Core storage, containers, and network services are healthy.",
                info.model,
                info.dsm_version,
                format_uptime(info.uptime_sec),
                info.temperature_c,
                util.cpu_total,
                util.ram_percent,
                util.ram_used_mb,
                util.ram_total_mb,
                format_speed(util.net_rx_bps),
                format_speed(util.net_tx_bps),
            )
        };
        state.ai_messages.update(|m| {
            m.push(AiChatMessage {
                role: "assistant".to_string(),
                content: summary,
            });
        });
    };

    let on_send = move |ev: leptos::ev::SubmitEvent| {
        ev.prevent_default();
        let prompt = input.get_untracked().trim().to_string();
        if prompt.is_empty() || busy.get_untracked() {
            return;
        }
        input.set(String::new());
        state.ai_messages.update(|m| {
            m.push(AiChatMessage {
                role: "user".to_string(),
                content: prompt.clone(),
            })
        });

        let provider = state.ai_provider.get_untracked();
        let api_key = state.ai_api_key.get_untracked();
        let model = state.ai_model.get_untracked();
        let base_url = state.ai_custom_base_url.get_untracked();

        if api_key.trim().is_empty() && provider != "opencode" {
            run_local_diag();
            return;
        }

        let ctx_text = match (
            state.system_info.get_untracked(),
            state.utilization.get_untracked(),
        ) {
            (Some(i), Some(u)) => format!(
                "NAS Model: {}, DSM: {}, CPU: {:.1}%, RAM: {:.1}%, Temp: {}C",
                i.model, i.dsm_version, u.cpu_total, u.ram_percent, i.temperature_c
            ),
            _ => "Synology NAS Copilot Context".to_string(),
        };
        let hist = state.ai_messages.get_untracked();
        busy.set(true);
        leptos::task::spawn_local(async move {
            match api::send_ai_chat(&provider, &api_key, &model, &base_url, &hist, &ctx_text).await
            {
                Ok(val) => {
                    let reply = val["reply"]
                        .as_str()
                        .or_else(|| val["error"].as_str())
                        .unwrap_or("No reply.")
                        .to_string();
                    state.ai_messages.update(|m| {
                        m.push(AiChatMessage {
                            role: "assistant".to_string(),
                            content: reply,
                        })
                    });
                }
                Err(e) => {
                    state.ai_messages.update(|m| {
                        m.push(AiChatMessage {
                            role: "assistant".to_string(),
                            content: format!("Error: {e}"),
                        })
                    });
                }
            }
            busy.set(false);
        });
    };

    view! {
        <Show when=move || state.show_ai_chat_bubble.get()>
            <div class="fixed bottom-[72px] sm:bottom-5 right-3 sm:right-5 z-40">
                <Show when=move || state.is_ai_chat_open.get()>
                    <div class="fixed sm:static inset-x-3 bottom-[132px] sm:inset-auto sm:mb-3 sm:w-[390px] h-[min(460px,68vh)] ax-popover flex flex-col overflow-hidden">
                        <div class="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div>
                                <div class="text-sm font-bold flex items-center gap-1.5">
                                    <span class="text-sky-400">"✦"</span>
                                    <span>"DSM AI Copilot"</span>
                                </div>
                                <div class="text-[11px] text-slate-400">
                                    {move || format!("{} • {}", state.ai_provider.get(), state.ai_model.get())}
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    on:click=move |_| {
                                        state.is_ai_chat_open.set(false);
                                        state.set_tab(NavTab::Settings);
                                    }
                                    class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
                                >
                                    {move || tr(state.language.get(), "Cấu hình", "Config")}
                                </button>
                                <button
                                    type="button"
                                    aria-label="Close"
                                    on:click=move |_| state.is_ai_chat_open.set(false)
                                    class="p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                                >
                                    "✕"
                                </button>
                            </div>
                        </div>

                        <div class="px-3 py-2 border-b border-slate-200/70 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                            <button
                                type="button"
                                on:click=move |_| run_local_diag()
                                class="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[11px] font-semibold shrink-0 cursor-pointer"
                            >
                                {move || tr(state.language.get(), "⚡ Chẩn đoán nhanh", "⚡ Quick Diagnostics")}
                            </button>
                            <button
                                type="button"
                                on:click=move |_| {
                                    state.set_tab(NavTab::Mcp);
                                    state.is_ai_chat_open.set(false);
                                }
                                class="px-2.5 py-1 ax-btn-secondary text-[11px] font-medium shrink-0 cursor-pointer"
                            >
                                "43 MCP Tools"
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                            <div class="flex justify-start">
                                <div class="max-w-[90%] px-3 py-2 ax-tile whitespace-pre-wrap">
                                    {move || tr(
                                        state.language.get(),
                                        "Xin chào! Tôi là DSM AI Copilot (Pure Rust). Nhấn chẩn đoán nhanh hoặc nhập câu hỏi về Synology NAS của bạn.",
                                        "Hello! I am DSM AI Copilot (Pure Rust). Click Quick Diagnostics or ask a question about your Synology NAS.",
                                    )}
                                </div>
                            </div>
                            {move || state.ai_messages.get().into_iter().map(|m| {
                                let is_user = m.role == "user";
                                let wrap_cls = if is_user {
                                    "flex justify-end"
                                } else {
                                    "flex justify-start"
                                };
                                let bubble_cls = if is_user {
                                    "max-w-[85%] px-3 py-2 rounded-xl bg-sky-600 text-white whitespace-pre-wrap"
                                } else {
                                    "max-w-[90%] px-3 py-2 ax-tile whitespace-pre-wrap"
                                };
                                view! {
                                    <div class=wrap_cls>
                                        <div class=bubble_cls>{m.content}</div>
                                    </div>
                                }
                            }).collect_view()}
                        </div>

                        <form on:submit=on_send class="p-2.5 border-t border-slate-200/70 dark:border-slate-800 flex gap-2 shrink-0">
                            <input
                                type="text"
                                prop:value=move || input.get()
                                on:input=move |ev| input.set(event_target_value(&ev))
                                placeholder=move || tr(state.language.get(), "Hỏi về NAS hoặc lệnh quản trị...", "Ask about NAS or troubleshooting...")
                                class="flex-1 px-3 py-2 ax-input text-xs"
                            />
                            <button
                                type="submit"
                                disabled=move || busy.get()
                                class="px-3 py-2 ax-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                                {move || if busy.get() {
                                    "..."
                                } else {
                                    tr(state.language.get(), "Gửi", "Send")
                                }}
                            </button>
                        </form>
                    </div>
                </Show>

                <button
                    type="button"
                    aria-label="Open AI Copilot"
                    on:click=move |_| state.is_ai_chat_open.update(|o| *o = !*o)
                    class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-center text-lg font-bold gemini-ambient-glow hover:scale-105 transition-transform cursor-pointer"
                >
                    "✦"
                </button>
            </div>
        </Show>
    }
}
