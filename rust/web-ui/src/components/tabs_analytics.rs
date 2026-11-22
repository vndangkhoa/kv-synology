use leptos::prelude::*;
use serde_json::Value;

use crate::api;
use crate::i18n::{format_bytes, format_speed, tr};
use crate::icons::{DataFlowGraph, RadialGauge};
use crate::mock_data::{self, MCP_TOOLS_CATALOG};
use crate::models::{GeoIpDetail, SnmpDevice, SnmpInterfaceItem};
use crate::state::{AppState, copy_to_clipboard, trigger_html_download};

#[component]
pub fn NetworkTrafficTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let (def_sum, def_conns) = mock_data::demo_traffic_fallback();
    let summary = RwSignal::new(def_sum);
    let connections = RwSignal::new(def_conns);
    let search = RwSignal::new(String::new());
    let selected_geo = RwSignal::new(Option::<GeoIpDetail>::None);
    let busy = RwSignal::new(false);

    let refresh_traffic = move || {
        let sess = state.session.get_untracked();
        let cfg = state.dsm_config.get_untracked();
        busy.set(true);
        leptos::task::spawn_local(async move {
            if let Ok((sum, conns)) = api::fetch_traffic(Some(&sess), Some(&cfg)).await {
                summary.set(sum);
                if !conns.is_empty() {
                    connections.set(conns);
                }
            }
            busy.set(false);
        });
    };

    Effect::new(move |_| {
        refresh_traffic();
    });

    view! {
        <div class="space-y-4">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {move || {
                    let s = summary.get();
                    view! {
                        <>
                            <div class="ax-card p-3.5 sm:p-4">
                                <div class="text-[11px] sm:text-xs text-slate-500">"Active Sockets"</div>
                                <div class="text-xl sm:text-2xl font-bold mt-1 ax-tabular">{s.total_connections}</div>
                            </div>
                            <div class="ax-card p-3.5 sm:p-4">
                                <div class="text-[11px] sm:text-xs text-slate-500">"Outbound Speed"</div>
                                <div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 ax-tabular">{format_speed(s.current_outbound_speed)}</div>
                            </div>
                            <div class="ax-card p-3.5 sm:p-4">
                                <div class="text-[11px] sm:text-xs text-slate-500">"Inbound Speed"</div>
                                <div class="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1 ax-tabular">{format_speed(s.current_inbound_speed)}</div>
                            </div>
                            <div class="ax-card p-3.5 sm:p-4">
                                <div class="text-[11px] sm:text-xs text-slate-500">"Suspicious Alerts"</div>
                                <div class="text-xl sm:text-2xl font-bold text-rose-600 mt-1 ax-tabular">{s.suspicious_count}</div>
                            </div>
                        </>
                    }
                }}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="lg:col-span-2">
                    {move || view! { <DataFlowGraph connections=connections.get() /> }}
                </div>
                <div class="ax-card p-4 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold">"Top Countries (GeoIP)"</h3>
                        <button
                            type="button"
                            on:click=move |_| refresh_traffic()
                            class="px-2.5 py-1 ax-btn-secondary text-xs font-semibold cursor-pointer"
                        >
                            {move || if busy.get() { "..." } else { "Refresh" }}
                        </button>
                    </div>
                    {move || summary.get().top_countries.into_iter().take(6).map(|c| {
                        view! {
                            <div class="space-y-1 text-xs">
                                <div class="flex justify-between">
                                    <span class="font-semibold">{format!("{} {}", c.flag_emoji, c.country_name)}</span>
                                    <span class="text-slate-500 ax-tabular">{format!("{}% • {}", c.percent_outbound, format_bytes(c.outbound_bytes))}</span>
                                </div>
                                <div class="h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                                    <div class="h-full bg-sky-600 rounded-full" style=format!("width: {}%", c.percent_outbound.min(100)) />
                                </div>
                            </div>
                        }
                    }).collect_view()}
                </div>
            </div>

            <div class="ax-card p-4 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 class="text-sm font-bold">"Live Connections (/api/traffic/connections)"</h3>
                    <input
                        type="text"
                        prop:value=move || search.get()
                        on:input=move |ev| search.set(event_target_value(&ev))
                        placeholder="Filter IP, process, country..."
                        class="px-3 py-1.5 ax-input text-xs w-full sm:w-64"
                    />
                </div>
                <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table class="w-full min-w-[580px] text-left text-xs">
                        <thead class="text-slate-500 border-b border-slate-200/70 dark:border-slate-800">
                            <tr>
                                <th class="py-2 pr-3">"Remote IP"</th>
                                <th class="py-2 pr-3">"Country / ISP"</th>
                                <th class="py-2 pr-3">"Process"</th>
                                <th class="py-2 pr-3">"State"</th>
                                <th class="py-2">"GeoIP"</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200/50 dark:divide-slate-800">
                            {move || {
                                let q = search.get().to_lowercase();
                                connections.get().into_iter().filter(|c| {
                                    q.is_empty()
                                        || c.remote_ip.to_lowercase().contains(&q)
                                        || c.process_name.to_lowercase().contains(&q)
                                        || c.country_name.to_lowercase().contains(&q)
                                }).take(40).map(|c| {
                                    let ip = c.remote_ip.clone();
                                    view! {
                                        <tr>
                                            <td class="py-2 pr-3 font-mono font-semibold whitespace-nowrap ax-tabular">{format!("{}:{}", c.remote_ip, c.remote_port)}</td>
                                            <td class="py-2 pr-3 whitespace-nowrap">{format!("{} {} ({})", c.flag_emoji, c.country_name, c.isp)}</td>
                                            <td class="py-2 pr-3 font-medium whitespace-nowrap">{c.process_name}</td>
                                            <td class="py-2 pr-3 whitespace-nowrap">{c.state}</td>
                                            <td class="py-2 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    on:click=move |_| {
                                                        let target = ip.clone();
                                                        leptos::task::spawn_local(async move {
                                                            match api::fetch_geoip(&target).await {
                                                                Ok(d) => selected_geo.set(Some(d)),
                                                                Err(e) => state.show_toast(e, false),
                                                            }
                                                        });
                                                    }
                                                    class="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold cursor-pointer"
                                                >
                                                    "Inspect IP"
                                                </button>
                                            </td>
                                        </tr>
                                    }
                                }).collect_view()
                            }}
                        </tbody>
                    </table>
                </div>
            </div>

            <Show when=move || selected_geo.get().is_some()>
                {move || {
                    let g = selected_geo.get().unwrap_or_default();
                    view! {
                        <div class="ax-card p-4 border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div>
                                <div class="font-bold">
                                    {format!("{} {} — {}", g.flag_emoji.unwrap_or_default(), g.ip, g.country_name.unwrap_or_default())}
                                </div>
                                <div class="text-slate-500 dark:text-slate-400">
                                    {format!("ISP: {} • Reverse DNS: {}", g.isp.unwrap_or_default(), g.reverse_dns.unwrap_or_default())}
                                </div>
                            </div>
                            <button type="button" on:click=move |_| selected_geo.set(None) class="px-3 py-1.5 ax-btn-secondary cursor-pointer">"Close"</button>
                        </div>
                    }
                }}
            </Show>
        </div>
    }
}

#[component]
pub fn SnmpTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let devices = RwSignal::new(mock_data::demo_snmp_devices());
    let interfaces = RwSignal::new(Vec::<SnmpInterfaceItem>::new());
    let last_query_json = RwSignal::new(Option::<String>::None);
    let new_name = RwSignal::new(String::new());
    let new_host = RwSignal::new(String::new());
    let new_comm = RwSignal::new("public".to_string());

    let poll_device = move |id: String, host: String, port: u16, comm: String| {
        leptos::task::spawn_local(async move {
            match api::snmp_query_basic(&host, port, &comm).await {
                Ok(val) => {
                    let cpu = val.pointer("/results/cpu/value").and_then(Value::as_f64);
                    let ram = val.pointer("/results/ram/value").and_then(Value::as_f64);
                    let ping = val.pointer("/results/ping/value").and_then(Value::as_u64);
                    devices.update(|l| {
                        if let Some(d) = l.iter_mut().find(|x| x.id == id) {
                            d.status = "up".to_string();
                            d.cpu_pct = cpu.or(d.cpu_pct);
                            d.ram_pct = ram.or(d.ram_pct);
                            d.ping_ms = ping;
                        }
                    });
                    last_query_json.set(serde_json::to_string_pretty(&val).ok());
                    state.show_toast(format!("Polled SNMP device {host}"), true);
                }
                Err(e) => state.show_toast(e, false),
            }
        });
    };

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-wrap gap-2 text-xs">
                <input type="text" prop:value=move || new_name.get() on:input=move |ev| new_name.set(event_target_value(&ev)) placeholder="Device Label" class="px-3 py-2 ax-input flex-1 sm:flex-none" />
                <input type="text" prop:value=move || new_host.get() on:input=move |ev| new_host.set(event_target_value(&ev)) placeholder="IP / Hostname" class="px-3 py-2 ax-input flex-1 sm:flex-none" />
                <input type="text" prop:value=move || new_comm.get() on:input=move |ev| new_comm.set(event_target_value(&ev)) placeholder="public" class="px-3 py-2 ax-input w-28" />
                <button
                    type="button"
                    on:click=move |_| {
                        let n = new_name.get_untracked().trim().to_string();
                        let h = new_host.get_untracked().trim().to_string();
                        let c = new_comm.get_untracked().trim().to_string();
                        if n.is_empty() || h.is_empty() { return; }
                        devices.update(|l| l.push(SnmpDevice {
                            id: format!("dev_{}", l.len() + 10),
                            name: n,
                            host: h,
                            port: 161,
                            version: "v2c".to_string(),
                            community: c,
                            status: "unknown".to_string(),
                            cpu_pct: None,
                            ram_pct: None,
                            uptime_text: "Ready".to_string(),
                            ping_ms: None,
                        }));
                        new_name.set(String::new());
                        new_host.set(String::new());
                    }
                    class="px-4 py-2 ax-btn-primary font-semibold cursor-pointer"
                >
                    "+ Add SNMP Target"
                </button>
            </div>

            <div class="ax-fold-split">
                {move || devices.get().into_iter().map(|d| {
                    let id = d.id.clone();
                    let h1 = d.host.clone();
                    let h2 = d.host.clone();
                    let c1 = d.community.clone();
                    let c2 = d.community.clone();
                    let port = d.port;
                    view! {
                        <div class="ax-card p-4 space-y-2.5 text-xs">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <div class="text-sm font-bold truncate">{d.name}</div>
                                    <div class="text-slate-500 font-mono">{format!("{}:{} • {} ({})", d.host, d.port, d.version, d.community)}</div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-bold shrink-0">{d.status}</span>
                            </div>
                            <div class="text-slate-500 dark:text-slate-400 ax-tabular">
                                {format!(
                                    "CPU: {} • RAM: {} • Ping: {}",
                                    d.cpu_pct.map(|x| format!("{x:.0}%")).unwrap_or_else(|| "—".to_string()),
                                    d.ram_pct.map(|x| format!("{x:.0}%")).unwrap_or_else(|| "—".to_string()),
                                    d.ping_ms.map(|p| format!("{p}ms")).unwrap_or_else(|| "—".to_string()),
                                )}
                            </div>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    on:click=move |_| poll_device(id.clone(), h1.clone(), port, c1.clone())
                                    class="px-3 py-1.5 ax-btn-primary font-semibold cursor-pointer"
                                >
                                    "Poll Sensors"
                                </button>
                                <button
                                    type="button"
                                    on:click=move |_| {
                                        let host = h2.clone();
                                        let comm = c2.clone();
                                        leptos::task::spawn_local(async move {
                                            match api::snmp_discover(&host, port, &comm).await {
                                                Ok(ifaces) => interfaces.set(ifaces),
                                                Err(e) => state.show_toast(e, false),
                                            }
                                        });
                                    }
                                    class="px-3 py-1.5 ax-btn-secondary font-semibold cursor-pointer"
                                >
                                    "Discover IFs"
                                </button>
                            </div>
                        </div>
                    }
                }).collect_view()}
            </div>

            <Show when=move || !interfaces.get().is_empty()>
                <div class="ax-card p-4 text-xs space-y-2">
                    <h4 class="font-bold">"Discovered Interfaces"</h4>
                    {move || interfaces.get().into_iter().map(|i| view! {
                        <div class="font-mono text-slate-500 dark:text-slate-400">{format!("#{} {} — {}", i.if_index, i.name, i.descr)}</div>
                    }).collect_view()}
                </div>
            </Show>

            <Show when=move || last_query_json.get().is_some()>
                <pre class="p-4 rounded-xl bg-slate-950 text-sky-300 text-xs font-mono overflow-x-auto">
                    {move || last_query_json.get().unwrap_or_default()}
                </pre>
            </Show>
        </div>
    }
}

#[component]
pub fn PermissionInspectorTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let folders = RwSignal::new(mock_data::demo_acl_folders());
    let audits = RwSignal::new(mock_data::demo_acl_audit());
    let selected_user = RwSignal::new("khoa".to_string());
    let selected_folder = RwSignal::new("/Backups".to_string());

    let effective_result = move || {
        let user = selected_user.get();
        let path = selected_folder.get();
        let folder = folders.get().into_iter().find(|f| f.path == path);
        let mut level = "Default (NA)".to_string();
        if let Some(f) = folder
            && let Some(e) = f
                .entries
                .into_iter()
                .find(|e| e.principal == user || e.principal == "Everyone")
        {
            level = e.level;
        }
        level
    };

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 space-y-2.5">
                <h3 class="text-sm font-bold">
                    {move || tr(state.language.get(), "Kiểm toán & Cảnh báo Phân quyền ACL", "ACL Security Audit Findings")}
                </h3>
                {move || audits.get().into_iter().map(|a| {
                    let cls = if a.severity == "high" {
                        "p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200"
                    } else {
                        "p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200"
                    };
                    let msg = if state.language.get() == crate::models::Language::Vi { a.message_vi } else { a.message_en };
                    view! {
                        <div class=cls>
                            <span class="font-bold font-mono">{format!("[{} • {}] ", a.folder, a.principal)}</span>
                            <span>{msg}</span>
                        </div>
                    }
                }).collect_view()}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="ax-card p-4 space-y-3 text-xs">
                    <h3 class="text-sm font-bold">"Effective Permission Tester"</h3>
                    <select prop:value=move || selected_user.get() on:change=move |ev| selected_user.set(event_target_value(&ev)) class="w-full px-3 py-2 ax-input">
                        <option value="administrators">"administrators (Group)"</option>
                        <option value="khoa">"khoa (User)"</option>
                        <option value="backup_svc">"backup_svc (User)"</option>
                        <option value="guest">"guest (User)"</option>
                    </select>
                    <select prop:value=move || selected_folder.get() on:change=move |ev| selected_folder.set(event_target_value(&ev)) class="w-full px-3 py-2 ax-input">
                        <option value="/docker">"/docker"</option>
                        <option value="/Backups">"/Backups"</option>
                        <option value="/Media">"/Media"</option>
                    </select>
                    <div class="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold">
                        {move || format!("Effective Access: {}", effective_result())}
                    </div>
                </div>

                <div class="lg:col-span-2 ax-card p-4 space-y-3">
                    <h3 class="text-sm font-bold">"Shared Folder ACL Matrix"</h3>
                    {move || folders.get().into_iter().map(|f| {
                        view! {
                            <div class="ax-tile p-3 space-y-2 text-xs">
                                <div class="font-bold font-mono">{format!("{} (Owner: {})", f.path, f.owner)}</div>
                                <div class="flex flex-wrap gap-1.5">
                                    {f.entries.into_iter().map(|e| view! {
                                        <span class="px-2.5 py-1 ax-btn-secondary font-medium">
                                            {format!("{}: {}", e.principal, e.level)}
                                        </span>
                                    }).collect_view()}
                                </div>
                            </div>
                        }
                    }).collect_view()}
                </div>
            </div>
        </div>
    }
}

#[component]
pub fn ReportsTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let period = RwSignal::new("weekly".to_string());
    let report = RwSignal::new(Option::<Value>::None);
    let busy = RwSignal::new(false);

    let run_report = move || {
        busy.set(true);
        let p = period.get_untracked();
        let info = state
            .system_info
            .get_untracked()
            .unwrap_or_else(mock_data::demo_system_info);
        leptos::task::spawn_local(async move {
            match api::generate_report_summary(&p, &info.hostname, &info.model, &info.dsm_version)
                .await
            {
                Ok(val) => {
                    if !val["data"].is_null() {
                        report.set(Some(val["data"].clone()));
                    } else {
                        state.show_toast(val["error"].as_str().unwrap_or("Report error"), false);
                    }
                }
                Err(e) => state.show_toast(e, false),
            }
            busy.set(false);
        });
    };

    Effect::new(move |_| {
        run_report();
    });

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-wrap items-center justify-between gap-2.5">
                <div class="flex gap-2 text-xs">
                    {["weekly", "monthly"].into_iter().map(|p| {
                        let cls = move || if period.get() == p {
                            "px-3.5 py-2 ax-btn-primary font-semibold cursor-pointer"
                        } else {
                            "px-3.5 py-2 ax-btn-secondary font-semibold cursor-pointer"
                        };
                        view! {
                            <button type="button" class=cls on:click=move |_| { period.set(p.to_string()); run_report(); }>
                                {if p == "weekly" { "Weekly Report" } else { "Monthly Report" }}
                            </button>
                        }
                    }).collect_view()}
                </div>
                <div class="flex gap-2 text-xs">
                    <button
                        type="button"
                        on:click=move |_| run_report()
                        class="px-3.5 py-2 ax-btn-secondary font-semibold cursor-pointer"
                    >
                        {move || if busy.get() { "Generating..." } else { "Regenerate" }}
                    </button>
                    <button
                        type="button"
                        on:click=move |_| {
                            if let Some(rep) = report.get_untracked() {
                                leptos::task::spawn_local(async move {
                                    match api::export_report_html(&rep).await {
                                        Ok(html) => {
                                            trigger_html_download("kv-synology-report.html", &html);
                                            state.show_toast("Exported HTML operational report", true);
                                        }
                                        Err(e) => state.show_toast(e, false),
                                    }
                                });
                            }
                        }
                        class="px-3.5 py-2 ax-btn-primary font-semibold cursor-pointer"
                    >
                        "Export HTML"
                    </button>
                </div>
            </div>

            <Show when=move || report.get().is_some()>
                {move || {
                    let r = report.get().unwrap_or(Value::Null);
                    let score = r.pointer("/healthScore/score").and_then(Value::as_f64).unwrap_or(92.0);
                    let grade = r.pointer("/healthScore/grade").and_then(Value::as_str).unwrap_or("A");
                    let status_text = r.pointer("/healthScore/statusText").and_then(Value::as_str).unwrap_or("Healthy");
                    let range_txt = format!("{} → {}", r["startDate"].as_str().unwrap_or("—"), r["endDate"].as_str().unwrap_or("—"));
                    let highlights: Vec<String> = r.pointer("/healthScore/summaryHighlights")
                        .and_then(Value::as_array)
                        .map(|arr| arr.iter().filter_map(|x| x.as_str().map(ToString::to_string)).collect())
                        .unwrap_or_default();

                    view! {
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div class="ax-card p-6 flex flex-col items-center justify-center">
                                <RadialGauge percent=score label=format!("Grade {grade} • {status_text}") stroke_color="#0D8626" />
                                <div class="mt-2 text-xs text-slate-500 ax-tabular">{range_txt}</div>
                            </div>
                            <div class="lg:col-span-2 ax-card p-5 space-y-2">
                                <h3 class="text-sm font-bold">"Executive Highlights (/api/reports/summary)"</h3>
                                <ul class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-5">
                                    {highlights.into_iter().map(|h| view! { <li>{h}</li> }).collect_view()}
                                </ul>
                            </div>
                        </div>
                    }
                }}
            </Show>
        </div>
    }
}

#[component]
pub fn McpDocsTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let search = RwSignal::new(String::new());
    let mcp_cfg = r#"{
  "mcpServers": {
    "kv-synology": {
      "command": "/app/kv-synology-mcp",
      "env": {
        "DSM_HOST": "192.168.1.10",
        "DSM_PORT": "5001",
        "DSM_HTTPS": "true",
        "DSM_ACCOUNT": "admin",
        "DSM_PASSWORD": "your-password"
      }
    }
  }
}"#;

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 sm:p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 class="text-sm font-bold">"Pure-Rust MCP Server (kv-synology-mcp • 43 Tools)"</h3>
                        <p class="text-xs text-slate-500">"Built with rmcp 3.11 + russh over stdio JSON-RPC for Claude Desktop, Cursor & Antigravity"</p>
                    </div>
                    <button
                        type="button"
                        on:click=move |_| {
                            copy_to_clipboard(mcp_cfg);
                            state.show_toast("Copied MCP JSON configuration", true);
                        }
                        class="px-3.5 py-2 ax-btn-primary text-xs font-semibold cursor-pointer self-start sm:self-auto"
                    >
                        "Copy MCP JSON"
                    </button>
                </div>
                <pre class="p-3.5 rounded-xl bg-slate-950 text-sky-300 text-xs font-mono overflow-x-auto">{mcp_cfg}</pre>
            </div>

            <div class="ax-card p-4 sm:p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 class="text-sm font-bold">"43 Exposed DSM & SSH Tools"</h3>
                    <input
                        type="text"
                        prop:value=move || search.get()
                        on:input=move |ev| search.set(event_target_value(&ev))
                        placeholder="Search MCP tools..."
                        class="px-3 py-1.5 ax-input text-xs w-full sm:w-64"
                    />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 text-xs">
                    {move || {
                        let q = search.get().to_lowercase();
                        let lang = state.language.get();
                        MCP_TOOLS_CATALOG.iter().filter(|t| {
                            q.is_empty() || t.name.to_lowercase().contains(&q) || t.category.to_lowercase().contains(&q)
                        }).map(|t| {
                            let desc = if lang == crate::models::Language::Vi { t.summary_vi } else { t.summary_en };
                            view! {
                                <div class="ax-tile p-3">
                                    <div class="flex items-center justify-between gap-1 mb-1">
                                        <span class="font-mono font-bold text-sky-600 dark:text-sky-400 truncate">{t.name}</span>
                                        <span class="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-[10px] shrink-0">{t.category}</span>
                                    </div>
                                    <div class="text-slate-500 dark:text-slate-400">{desc}</div>
                                </div>
                            }
                        }).collect_view()
                    }}
                </div>
            </div>
        </div>
    }
}
