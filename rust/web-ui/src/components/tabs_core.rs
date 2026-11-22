use leptos::prelude::*;
use serde_json::Value;

use crate::api;
use crate::i18n::{format_bytes, format_speed, format_uptime, theme_label, tr};
use crate::icons::{RadialGauge, Sparkline};
use crate::mock_data;
use crate::models::{ExperienceMode, FileItem, Language, NavTab, ThemeMode};
use crate::state::AppState;

#[component]
pub fn OverviewTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let volumes = RwSignal::new(mock_data::demo_volumes());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(v) = api::fetch_live_volumes(&sess, &cfg).await
                    && !v.is_empty()
                {
                    volumes.set(v);
                }
            });
        }
    });

    view! {
        <div class="space-y-4">
            // Top 4 KPI Cards — 2x2 on Phone & Foldable, 4-col on Desktop
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {move || {
                    let lang = state.language.get();
                    let util = state.utilization.get().unwrap_or_else(|| mock_data::demo_utilization(0));
                    let info = state.system_info.get().unwrap_or_else(mock_data::demo_system_info);
                    view! {
                        <>
                            <div class="ax-card p-3.5 sm:p-5">
                                <div class="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {tr(lang, "Sử dụng CPU", "CPU Usage")}
                                </div>
                                <div class="mt-1.5 flex items-baseline justify-between gap-1">
                                    <span class="text-xl sm:text-2xl font-bold ax-tabular">
                                        {format!("{:.1}%", util.cpu_total)}
                                    </span>
                                    <span class="text-[11px] sm:text-xs text-sky-600 dark:text-sky-400 font-medium ax-tabular">
                                        {format!("{}c", info.cpu_cores)}
                                    </span>
                                </div>
                                <div class="mt-2.5 h-1.5 sm:h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                                    <div class="h-full bg-sky-600 rounded-full" style=format!("width: {:.0}%", util.cpu_total.clamp(0.0, 100.0)) />
                                </div>
                            </div>

                            <div class="ax-card p-3.5 sm:p-5">
                                <div class="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {tr(lang, "Bộ nhớ RAM", "Memory RAM")}
                                </div>
                                <div class="mt-1.5 flex items-baseline justify-between gap-1">
                                    <span class="text-xl sm:text-2xl font-bold ax-tabular">
                                        {format!("{:.1}%", util.ram_percent)}
                                    </span>
                                    <span class="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium ax-tabular truncate">
                                        {format!("{:.1}/{:.0}G", util.ram_used_mb as f64 / 1024.0, util.ram_total_mb as f64 / 1024.0)}
                                    </span>
                                </div>
                                <div class="mt-2.5 h-1.5 sm:h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                                    <div class="h-full bg-emerald-500 rounded-full" style=format!("width: {:.0}%", util.ram_percent.clamp(0.0, 100.0)) />
                                </div>
                            </div>

                            <div class="ax-card p-3.5 sm:p-5">
                                <div class="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {tr(lang, "Nhiệt độ & Uptime", "Thermal & Uptime")}
                                </div>
                                <div class="mt-1.5 flex items-baseline justify-between gap-1">
                                    <span class="text-xl sm:text-2xl font-bold ax-tabular">
                                        {format!("{}°C", info.temperature_c)}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold">
                                        {tr(lang, "Ổn định", "Healthy")}
                                    </span>
                                </div>
                                <div class="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate ax-tabular">
                                    {format!("Up {}", format_uptime(info.uptime_sec))}
                                </div>
                            </div>

                            <div class="ax-card p-3.5 sm:p-5">
                                <div class="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {tr(lang, "Lưu lượng mạng", "Network Throughput")}
                                </div>
                                <div class="mt-1.5 space-y-1 ax-tabular">
                                    <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
                                        <span class="text-sky-600 dark:text-sky-400">"↓ RX"</span>
                                        <span>{format_speed(util.net_rx_bps)}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
                                        <span class="text-emerald-600 dark:text-emerald-400">"↑ TX"</span>
                                        <span>{format_speed(util.net_tx_bps)}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    }
                }}
            </div>

            // Live Sparklines + System Hardware Info — Dual-pane on Foldable & Tablet, 3-col on Desktop
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div class="sm:col-span-2 lg:col-span-2 ax-card p-4 sm:p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold">
                            {move || tr(state.language.get(), "Xu hướng hiệu năng CPU & Mạng", "Real-Time CPU & Network Trend")}
                        </h3>
                        <button
                            type="button"
                            on:click=move |_| state.set_tab(NavTab::Monitor)
                            class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Chi tiết →", "Details →")}
                        </button>
                    </div>
                    <div class="ax-fold-split">
                        <div class="ax-tile p-3.5">
                            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">"CPU Load (%)"</div>
                            {move || {
                                let pts: Vec<f64> = state.util_history.get().into_iter().map(|s| s.cpu).collect();
                                view! { <Sparkline values=pts stroke_color="#0064E0" max_val=100.0 /> }
                            }}
                        </div>
                        <div class="ax-tile p-3.5">
                            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">"RAM Usage (%)"</div>
                            {move || {
                                let pts: Vec<f64> = state.util_history.get().into_iter().map(|s| s.ram).collect();
                                view! { <Sparkline values=pts stroke_color="#0D8626" max_val=100.0 /> }
                            }}
                        </div>
                    </div>
                </div>

                <div class="ax-card p-4 sm:p-5">
                    <h3 class="text-sm font-bold mb-3">
                        {move || tr(state.language.get(), "Thông tin thiết bị NAS", "System Specifications")}
                    </h3>
                    {move || {
                        let info = state.system_info.get().unwrap_or_else(mock_data::demo_system_info);
                        view! {
                            <dl class="space-y-2 text-xs">
                                <div class="flex justify-between gap-3 py-1 border-b border-slate-200/60 dark:border-slate-800">
                                    <dt class="shrink-0 text-slate-500 dark:text-slate-400">"Model"</dt>
                                    <dd class="font-semibold text-right truncate min-w-0">{info.model}</dd>
                                </div>
                                <div class="flex justify-between gap-3 py-1 border-b border-slate-200/60 dark:border-slate-800">
                                    <dt class="shrink-0 text-slate-500 dark:text-slate-400">"Serial"</dt>
                                    <dd class="font-mono ax-tabular text-right truncate min-w-0">{info.serial}</dd>
                                </div>
                                <div class="flex justify-between gap-3 py-1 border-b border-slate-200/60 dark:border-slate-800">
                                    <dt class="shrink-0 text-slate-500 dark:text-slate-400">"DSM"</dt>
                                    <dd class="font-semibold text-right truncate min-w-0">{info.dsm_version}</dd>
                                </div>
                                <div class="flex justify-between gap-3 py-1 border-b border-slate-200/60 dark:border-slate-800">
                                    <dt class="shrink-0 text-slate-500 dark:text-slate-400">"CPU"</dt>
                                    <dd class="text-right truncate min-w-0">{info.cpu_model}</dd>
                                </div>
                                <div class="flex justify-between gap-3 py-1">
                                    <dt class="shrink-0 text-slate-500 dark:text-slate-400">"RAM"</dt>
                                    <dd class="font-semibold ax-tabular text-right truncate min-w-0">{format!("{} MB", info.ram_mb)}</dd>
                                </div>
                            </dl>
                        }
                    }}
                </div>
            </div>

            // Storage Volumes + Quick Actions — Dual-pane on Foldable/Tablet+
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div class="lg:col-span-2 ax-card p-4 sm:p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold">
                            {move || tr(state.language.get(), "Dung lượng Lưu trữ", "Storage Pools & Volumes")}
                        </h3>
                        <button
                            type="button"
                            on:click=move |_| state.set_tab(NavTab::Storage)
                            class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Quản lý ổ đĩa →", "Storage & SMART →")}
                        </button>
                    </div>
                    {move || {
                        volumes.get().into_iter().map(|v| {
                            let pct = if v.total_gb > 0.0 { (v.used_gb / v.total_gb) * 100.0 } else { 0.0 };
                            let bar_cls = if pct > 85.0 { "h-full bg-rose-500 rounded-full" } else { "h-full bg-sky-600 rounded-full" };
                            view! {
                                <div class="ax-tile p-3.5">
                                    <div class="flex flex-wrap items-center justify-between gap-1 text-xs mb-1.5">
                                        <div class="font-semibold">
                                            {format!("{} • {} ({})", v.name, v.raid_type, v.fs_type)}
                                        </div>
                                        <div class="font-medium text-slate-500 dark:text-slate-400 ax-tabular">
                                            {format!("{:.0} / {:.0} GB ({:.1}%)", v.used_gb, v.total_gb, pct)}
                                        </div>
                                    </div>
                                    <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div class=bar_cls style=format!("width: {:.0}%", pct.clamp(0.0, 100.0)) />
                                    </div>
                                </div>
                            }
                        }).collect_view()
                    }}
                </div>

                <div class="ax-card p-4 sm:p-5">
                    <h3 class="text-sm font-bold mb-3">
                        {move || tr(state.language.get(), "Thao tác nhanh", "Quick Actions")}
                    </h3>
                    <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <button type="button" on:click=move |_| state.set_tab(NavTab::Files) class="p-3 ax-btn-secondary text-left cursor-pointer">
                            {move || tr(state.language.get(), "📁 File Station", "📁 File Station")}
                        </button>
                        <button type="button" on:click=move |_| state.set_tab(NavTab::Docker) class="p-3 ax-btn-secondary text-left cursor-pointer">
                            "🐳 Docker"
                        </button>
                        <button type="button" on:click=move |_| state.set_tab(NavTab::Traffic) class="p-3 ax-btn-secondary text-left cursor-pointer">
                            "🌐 GeoIP Traffic"
                        </button>
                        <button type="button" on:click=move |_| state.set_tab(NavTab::Reports) class="p-3 ax-btn-secondary text-left cursor-pointer">
                            {move || tr(state.language.get(), "📊 Báo cáo", "📊 Reports")}
                        </button>
                        <button type="button" on:click=move |_| state.set_tab(NavTab::Terminal) class="p-3 ax-btn-secondary text-left cursor-pointer">
                            "💻 SSH Terminal"
                        </button>
                        <button type="button" on:click=move |_| state.is_power_modal_open.set(true) class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-left cursor-pointer">
                            {move || tr(state.language.get(), "⏻ Nguồn NAS", "⏻ NAS Power")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    }
}

#[component]
pub fn ResourceMonitorTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let procs = RwSignal::new(mock_data::demo_processes());
    let filter = RwSignal::new(String::new());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(list) = api::fetch_live_processes(&sess, &cfg).await
                    && !list.is_empty()
                {
                    procs.set(list);
                }
            });
        }
    });

    view! {
        <div class="space-y-4">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {move || {
                    let u = state.utilization.get().unwrap_or_else(|| mock_data::demo_utilization(0));
                    let lang = state.language.get();
                    view! {
                        <>
                            <div class="ax-card p-4 sm:p-5 flex flex-col items-center">
                                <RadialGauge percent=u.cpu_total label="CPU Total".to_string() stroke_color="#0064E0" />
                                <div class="text-[11px] text-slate-500 mt-2 ax-tabular">
                                    {format!("User {:.1}% • Sys {:.1}%", u.cpu_user, u.cpu_system)}
                                </div>
                            </div>
                            <div class="ax-card p-4 sm:p-5 flex flex-col items-center">
                                <RadialGauge percent=u.ram_percent label="Memory RAM".to_string() stroke_color="#0D8626" />
                                <div class="text-[11px] text-slate-500 mt-2 ax-tabular">
                                    {format!("{} / {} MB", u.ram_used_mb, u.ram_total_mb)}
                                </div>
                            </div>
                            <div class="col-span-2 ax-card p-4 sm:p-5 flex flex-col justify-between">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <span class="text-sm font-bold">
                                        {tr(lang, "Băng thông Mạng & Đĩa", "Network & Disk I/O")}
                                    </span>
                                    <span class="text-xs text-slate-500 ax-tabular">
                                        {format!("Disk R {} / W {}", format_speed(u.disk_read_bps), format_speed(u.disk_write_bps))}
                                    </span>
                                </div>
                                <div class="mt-3 ax-fold-split">
                                    <div>
                                        <div class="text-[11px] text-slate-500 mb-1 ax-tabular">{format!("↓ RX {}", format_speed(u.net_rx_bps))}</div>
                                        {move || {
                                            let pts: Vec<f64> = state.util_history.get().into_iter().map(|s| s.rx_kbps).collect();
                                            let max_v = pts.iter().copied().fold(1000.0_f64, f64::max);
                                            view! { <Sparkline values=pts stroke_color="#0064E0" max_val=max_v /> }
                                        }}
                                    </div>
                                    <div>
                                        <div class="text-[11px] text-slate-500 mb-1 ax-tabular">{format!("↑ TX {}", format_speed(u.net_tx_bps))}</div>
                                        {move || {
                                            let pts: Vec<f64> = state.util_history.get().into_iter().map(|s| s.tx_kbps).collect();
                                            let max_v = pts.iter().copied().fold(500.0_f64, f64::max);
                                            view! { <Sparkline values=pts stroke_color="#0D8626" max_val=max_v /> }
                                        }}
                                    </div>
                                </div>
                            </div>
                        </>
                    }
                }}
            </div>

            <div class="ax-card p-4 sm:p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h3 class="text-sm font-bold">
                        {move || tr(state.language.get(), "Tiến trình hệ thống", "Active Processes")}
                    </h3>
                    <input
                        type="text"
                        prop:value=move || filter.get()
                        on:input=move |ev| filter.set(event_target_value(&ev))
                        placeholder=move || tr(state.language.get(), "Tìm tiến trình...", "Filter processes...")
                        class="px-3 py-1.5 ax-input text-xs w-full sm:w-64"
                    />
                </div>
                <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table class="w-full min-w-[520px] text-left text-xs">
                        <thead class="text-slate-500 border-b border-slate-200/70 dark:border-slate-800">
                            <tr>
                                <th class="py-2 pr-3">"PID"</th>
                                <th class="py-2 pr-3">{move || tr(state.language.get(), "Tiến trình", "Process")}</th>
                                <th class="py-2 pr-3">"User"</th>
                                <th class="py-2 pr-3">"CPU %"</th>
                                <th class="py-2 pr-3">"RAM"</th>
                                <th class="py-2">"Status"</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200/50 dark:divide-slate-800 ax-tabular">
                            {move || {
                                let q = filter.get().to_lowercase();
                                procs.get().into_iter().filter(|p| q.is_empty() || p.name.to_lowercase().contains(&q) || p.user.to_lowercase().contains(&q)).map(|p| {
                                    view! {
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            <td class="py-2.5 pr-3 font-mono text-slate-500 whitespace-nowrap">{p.pid}</td>
                                            <td class="py-2.5 pr-3 font-semibold whitespace-nowrap">{p.name}</td>
                                            <td class="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{p.user}</td>
                                            <td class="py-2.5 pr-3 font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">{format!("{:.1}%", p.cpu_percent)}</td>
                                            <td class="py-2.5 pr-3 whitespace-nowrap">{format!("{} MB", p.ram_mb)}</td>
                                            <td class="py-2.5 whitespace-nowrap"><span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">{p.status}</span></td>
                                        </tr>
                                    }
                                }).collect_view()
                            }}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    }
}

#[component]
pub fn FileStationTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let current_path = RwSignal::new("/".to_string());
    let files = RwSignal::new(mock_data::demo_files("/"));
    let search = RwSignal::new(String::new());
    let new_folder_name = RwSignal::new(String::new());
    let preview_file = RwSignal::new(Option::<FileItem>::None);

    let load_dir = move |path: String| {
        current_path.set(path.clone());
        let sess = state.session.get_untracked();
        let cfg = state.dsm_config.get_untracked();
        if sess.is_demo || !sess.is_connected {
            files.set(mock_data::demo_files(&path));
            return;
        }
        leptos::task::spawn_local(async move {
            match api::fetch_live_files(&sess, &cfg, &path).await {
                Ok(list) => files.set(list),
                Err(e) => state.show_toast(e, false),
            }
        });
    };

    Effect::new(move |_| {
        load_dir("/".to_string());
    });

    let on_create_folder = move |_| {
        let name = new_folder_name.get_untracked().trim().to_string();
        if name.is_empty() {
            return;
        }
        let parent = current_path.get_untracked();
        let folder_path = if parent == "/" {
            format!("/{name}")
        } else {
            format!("{parent}/{name}")
        };
        files.update(|list| {
            list.insert(
                0,
                FileItem {
                    name: name.clone(),
                    path: folder_path,
                    is_dir: true,
                    size: 0,
                    modified: "Just now".to_string(),
                    owner: "admin".to_string(),
                    perm: "rwxr-xr-x".to_string(),
                },
            );
        });
        new_folder_name.set(String::new());
        state.show_toast(format!("Created folder `{name}`"), true);
    };

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="flex items-center gap-2 flex-wrap text-xs">
                    <button
                        type="button"
                        on:click=move |_| load_dir("/".to_string())
                        class="px-3 py-1.5 ax-btn-secondary font-semibold cursor-pointer"
                    >
                        {move || tr(state.language.get(), "🏠 Thư mục gốc", "🏠 Root Shares")}
                    </button>
                    <Show when=move || current_path.get() != "/">
                        <span class="text-slate-400">"/"</span>
                        <span class="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono font-semibold">
                            {move || current_path.get()}
                        </span>
                    </Show>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        prop:value=move || new_folder_name.get()
                        on:input=move |ev| new_folder_name.set(event_target_value(&ev))
                        placeholder=move || tr(state.language.get(), "Tên thư mục mới...", "New folder name...")
                        class="px-3 py-1.5 ax-input text-xs flex-1 sm:flex-none"
                    />
                    <button
                        type="button"
                        on:click=on_create_folder
                        class="px-3 py-1.5 ax-btn-primary text-xs font-semibold cursor-pointer"
                    >
                        {move || tr(state.language.get(), "+ Tạo thư mục", "+ New Folder")}
                    </button>
                    <input
                        type="text"
                        prop:value=move || search.get()
                        on:input=move |ev| search.set(event_target_value(&ev))
                        placeholder=move || tr(state.language.get(), "Lọc tệp...", "Filter files...")
                        class="px-3 py-1.5 ax-input text-xs w-full sm:w-auto"
                    />
                </div>
            </div>

            <div class="ax-card p-4 overflow-x-auto">
                <table class="w-full min-w-[540px] text-left text-xs">
                    <thead class="text-slate-500 border-b border-slate-200/70 dark:border-slate-800">
                        <tr>
                            <th class="py-2 pr-3">{move || tr(state.language.get(), "Tên", "Name")}</th>
                            <th class="py-2 pr-3">{move || tr(state.language.get(), "Kích thước", "Size")}</th>
                            <th class="py-2 pr-3">{move || tr(state.language.get(), "Sửa đổi", "Modified")}</th>
                            <th class="py-2 pr-3">"Owner"</th>
                            <th class="py-2 text-right">{move || tr(state.language.get(), "Thao tác", "Actions")}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200/50 dark:divide-slate-800">
                        {move || {
                            let q = search.get().to_lowercase();
                            files.get().into_iter().filter(|f| q.is_empty() || f.name.to_lowercase().contains(&q)).map(|item| {
                                let p_open = item.path.clone();
                                let p_del = item.path.clone();
                                let item_prev = item.clone();
                                let icon = if item.is_dir { "📁" } else { "📄" };
                                let size_txt = if item.is_dir { "Folder".to_string() } else { format_bytes(item.size) };
                                view! {
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                        <td class="py-2.5 pr-3 whitespace-nowrap">
                                            <button
                                                type="button"
                                                on:click=move |_| {
                                                    if item_prev.is_dir {
                                                        load_dir(p_open.clone());
                                                    } else {
                                                        preview_file.set(Some(item_prev.clone()));
                                                    }
                                                }
                                                class="flex items-center gap-2 font-semibold hover:text-sky-600 cursor-pointer"
                                            >
                                                <span>{icon}</span>
                                                <span>{item.name}</span>
                                            </button>
                                        </td>
                                        <td class="py-2.5 pr-3 text-slate-500 whitespace-nowrap ax-tabular">{size_txt}</td>
                                        <td class="py-2.5 pr-3 text-slate-500 whitespace-nowrap ax-tabular">{item.modified}</td>
                                        <td class="py-2.5 pr-3 font-mono text-slate-500 whitespace-nowrap">{item.owner}</td>
                                        <td class="py-2.5 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                on:click=move |_| {
                                                    files.update(|l| l.retain(|x| x.path != p_del));
                                                    state.show_toast("Removed item from view", true);
                                                }
                                                class="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                            >
                                                "Delete"
                                            </button>
                                        </td>
                                    </tr>
                                }
                            }).collect_view()
                        }}
                    </tbody>
                </table>
            </div>

            <Show when=move || preview_file.get().is_some()>
                {move || {
                    let f = preview_file.get().unwrap_or_else(|| FileItem {
                        name: String::new(), path: String::new(), is_dir: false, size: 0, modified: String::new(), owner: String::new(), perm: String::new(),
                    });
                    view! {
                        <div class="ax-card p-4 flex items-center justify-between text-xs border-sky-500/40">
                            <div>
                                <span class="font-bold">{format!("{} — {}", f.name, format_bytes(f.size))}</span>
                                <div class="text-slate-500 font-mono">{f.path}</div>
                            </div>
                            <button type="button" on:click=move |_| preview_file.set(None) class="px-3 py-1 ax-btn-secondary cursor-pointer">"Close"</button>
                        </div>
                    }
                }}
            </Show>
        </div>
    }
}

#[component]
pub fn StorageManagerTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let sub_tab = RwSignal::new("overview");
    let disks = RwSignal::new(mock_data::demo_disks());
    let smart_host = RwSignal::new(state.dsm_config.get_untracked().host);
    let smart_port = RwSignal::new("22".to_string());
    let smart_user = RwSignal::new("admin".to_string());
    let smart_pass = RwSignal::new(String::new());
    let smart_raw = RwSignal::new(mock_data::demo_smart_raw().to_string());
    let smart_busy = RwSignal::new(false);

    let run_smart = move |_| {
        smart_busy.set(true);
        let h = smart_host.get_untracked();
        let p = smart_port.get_untracked().parse::<u16>().unwrap_or(22);
        let u = smart_user.get_untracked();
        let pw = smart_pass.get_untracked();
        let sess = state.session.get_untracked();
        leptos::task::spawn_local(async move {
            match api::run_smart_info("auto", "", &h, p, &u, &pw, &sess).await {
                Ok(val) => {
                    if let Some(txt) = val["result"].as_str() {
                        smart_raw.set(txt.to_string());
                    } else if let Some(msg) = val["message"].as_str() {
                        smart_raw.set(msg.to_string());
                    }
                }
                Err(e) => smart_raw.set(format!("Error: {e}")),
            }
            smart_busy.set(false);
        });
    };

    view! {
        <div class="space-y-4">
            <div class="flex gap-2">
                <button
                    type="button"
                    on:click=move |_| sub_tab.set("overview")
                    class=move || if sub_tab.get() == "overview" {
                        "px-4 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                    } else {
                        "px-4 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                    }
                >
                    {move || tr(state.language.get(), "Ổ đĩa & Volume", "Drives & Volumes")}
                </button>
                <button
                    type="button"
                    on:click=move |_| sub_tab.set("smart")
                    class=move || if sub_tab.get() == "smart" {
                        "px-4 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                    } else {
                        "px-4 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                    }
                >
                    "SynoSmartInfo (S.M.A.R.T.)"
                </button>
            </div>

            <Show
                when=move || sub_tab.get() == "overview"
                fallback=move || view! {
                    <div class="ax-card p-4 sm:p-5 space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 class="text-sm font-bold">"SynoSmartInfo Scanner (/api/storage/smart-info)"</h3>
                                <p class="text-xs text-slate-500">{tr(state.language.get(), "Quét trực tiếp qua DSM CGI hoặc SSH Pure-Rust russh.", "Direct DSM CGI or SSH russh S.M.A.R.T. diagnostics.")}</p>
                            </div>
                            <button
                                type="button"
                                on:click=run_smart
                                disabled=move || smart_busy.get()
                                class="px-4 py-2 ax-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                                {move || if smart_busy.get() { "Scanning..." } else { "Run S.M.A.R.T. Scan" }}
                            </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            <input type="text" prop:value=move || smart_host.get() on:input=move |ev| smart_host.set(event_target_value(&ev)) placeholder="SSH Host" class="px-3 py-2 ax-input" />
                            <input type="text" prop:value=move || smart_port.get() on:input=move |ev| smart_port.set(event_target_value(&ev)) placeholder="SSH Port" class="px-3 py-2 ax-input ax-tabular" />
                            <input type="text" prop:value=move || smart_user.get() on:input=move |ev| smart_user.set(event_target_value(&ev)) placeholder="SSH User" class="px-3 py-2 ax-input" />
                            <input type="password" prop:value=move || smart_pass.get() on:input=move |ev| smart_pass.set(event_target_value(&ev)) placeholder="SSH Password" class="px-3 py-2 ax-input" />
                        </div>
                        <pre class="p-4 rounded-xl bg-slate-950 text-emerald-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                            {move || smart_raw.get()}
                        </pre>
                    </div>
                }
            >
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    {move || disks.get().into_iter().map(|d| {
                        view! {
                            <div class="ax-card p-4 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-sky-600 dark:text-sky-400">{d.slot}</span>
                                    <span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">{d.smart_status}</span>
                                </div>
                                <div class="text-sm font-bold">{d.model}</div>
                                <div class="text-xs text-slate-500 font-mono">{format!("S/N: {}", d.serial)}</div>
                                <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400 ax-tabular">
                                    <span>{format!("{} • {} GB", d.disk_type, d.size_gb)}</span>
                                    <span class="font-semibold">{format!("{}°C", d.temp_c)}</span>
                                </div>
                            </div>
                        }
                    }).collect_view()}
                </div>
            </Show>
        </div>
    }
}

#[component]
pub fn ServicesTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let services = RwSignal::new(mock_data::demo_services());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(list) = api::fetch_live_services(&sess, &cfg).await
                    && !list.is_empty()
                {
                    services.set(list);
                }
            });
        }
    });

    view! {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {move || services.get().into_iter().map(|svc| {
                let sid = svc.id.clone();
                let btn_cls = if svc.enabled {
                    "px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer shrink-0"
                } else {
                    "px-3 py-1 ax-btn-secondary text-xs font-semibold cursor-pointer shrink-0"
                };
                let label = if svc.enabled { "Enabled" } else { "Disabled" };
                view! {
                    <div class="ax-card p-4 flex flex-col justify-between gap-3">
                        <div>
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <div class="text-sm font-bold truncate">{svc.name}</div>
                                    <div class="text-[11px] text-slate-500 ax-tabular">{format!("{} • {}", svc.category, svc.port)}</div>
                                </div>
                                <button
                                    type="button"
                                    class=btn_cls
                                    on:click=move |_| {
                                        services.update(|list| {
                                            if let Some(item) = list.iter_mut().find(|s| s.id == sid) {
                                                item.enabled = !item.enabled;
                                            }
                                        });
                                        state.show_toast("Updated service state", true);
                                    }
                                >
                                    {label}
                                </button>
                            </div>
                            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{svc.description}</p>
                        </div>
                    </div>
                }
            }).collect_view()}
        </div>
    }
}

#[component]
pub fn NotificationsTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let channel = RwSignal::new("telegram".to_string());
    let bot_token = RwSignal::new(String::new());
    let chat_id = RwSignal::new(String::new());
    let webhook_url = RwSignal::new(String::new());
    let message = RwSignal::new("Test alert from KV Synology Pure Rust Edition".to_string());
    let busy = RwSignal::new(false);

    let on_dispatch = move |_| {
        busy.set(true);
        let ch = channel.get_untracked();
        let bt = bot_token.get_untracked();
        let ci = chat_id.get_untracked();
        let wh = webhook_url.get_untracked();
        let msg = message.get_untracked();
        leptos::task::spawn_local(async move {
            match api::dispatch_notification(&ch, &bt, &ci, &wh, &msg).await {
                Ok(val) => {
                    let ok = val["success"].as_bool() == Some(true);
                    let txt = val["message"]
                        .as_str()
                        .or_else(|| val["error"].as_str())
                        .unwrap_or("Done");
                    state.show_toast(txt, ok);
                }
                Err(e) => state.show_toast(e, false),
            }
            busy.set(false);
        });
    };

    view! {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 ax-card p-4 sm:p-5 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h3 class="text-sm font-bold">
                        {move || tr(state.language.get(), "Thông báo hệ thống DSM", "DSM System Notifications")}
                    </h3>
                    <div class="flex gap-2 text-xs">
                        <button
                            type="button"
                            on:click=move |_| state.notifications.update(|l| l.iter_mut().for_each(|n| n.read = true))
                            class="px-3 py-1.5 ax-btn-secondary cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Đánh dấu đã đọc", "Mark All Read")}
                        </button>
                        <button
                            type="button"
                            on:click=move |_| state.notifications.set(Vec::new())
                            class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 cursor-pointer"
                        >
                            {move || tr(state.language.get(), "Xóa tất cả", "Clear All")}
                        </button>
                    </div>
                </div>

                <div class="space-y-2.5">
                    {move || {
                        let list = state.notifications.get();
                        if list.is_empty() {
                            return view! {
                                <div class="py-10 text-center text-xs text-slate-500">
                                    {tr(state.language.get(), "Không có thông báo mới", "No notifications")}
                                </div>
                            }.into_any();
                        }
                        list.into_iter().map(|n| {
                            let badge = if n.level == "warning" {
                                "px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold"
                            } else {
                                "px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold"
                            };
                            view! {
                                <div class="ax-tile p-3.5">
                                    <div class="flex items-center justify-between gap-2 mb-1">
                                        <span class="text-xs font-bold">{n.title}</span>
                                        <span class=badge>{n.category}</span>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                                    <div class="text-[10px] text-slate-400 mt-1 ax-tabular">{n.timestamp}</div>
                                </div>
                            }
                        }).collect_view().into_any()
                    }}
                </div>
            </div>

            <div class="ax-card p-4 sm:p-5 space-y-3">
                <h3 class="text-sm font-bold">
                    {move || tr(state.language.get(), "Gửi cảnh báo Telegram / Webhook", "Telegram / Webhook Dispatch")}
                </h3>
                <select
                    prop:value=move || channel.get()
                    on:change=move |ev| channel.set(event_target_value(&ev))
                    class="w-full px-3 py-2 ax-input text-xs"
                >
                    <option value="telegram">"Telegram Bot API"</option>
                    <option value="webhook">"Discord / Slack / Generic Webhook"</option>
                </select>
                <Show
                    when=move || channel.get() == "telegram"
                    fallback=move || view! {
                        <input
                            type="text"
                            prop:value=move || webhook_url.get()
                            on:input=move |ev| webhook_url.set(event_target_value(&ev))
                            placeholder="https://discord.com/api/webhooks/..."
                            class="w-full px-3 py-2 ax-input text-xs"
                        />
                    }
                >
                    <div class="space-y-2">
                        <input
                            type="text"
                            prop:value=move || bot_token.get()
                            on:input=move |ev| bot_token.set(event_target_value(&ev))
                            placeholder="Telegram Bot Token"
                            class="w-full px-3 py-2 ax-input text-xs"
                        />
                        <input
                            type="text"
                            prop:value=move || chat_id.get()
                            on:input=move |ev| chat_id.set(event_target_value(&ev))
                            placeholder="Telegram Chat ID"
                            class="w-full px-3 py-2 ax-input text-xs"
                        />
                    </div>
                </Show>
                <textarea
                    rows="3"
                    prop:value=move || message.get()
                    on:input=move |ev| message.set(event_target_value(&ev))
                    class="w-full px-3 py-2 ax-input text-xs"
                />
                <button
                    type="button"
                    on:click=on_dispatch
                    disabled=move || busy.get()
                    class="w-full py-2 ax-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                    {move || if busy.get() { "Sending..." } else { "Send Test Dispatch" }}
                </button>
            </div>
        </div>
    }
}

#[component]
pub fn SettingsTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let models = RwSignal::new(Vec::<crate::models::AiModelItem>::new());
    let loading_models = RwSignal::new(false);

    let on_fetch_models = move |_| {
        loading_models.set(true);
        state.save_ai_settings();
        let prov = state.ai_provider.get_untracked();
        let key = state.ai_api_key.get_untracked();
        let base = state.ai_custom_base_url.get_untracked();
        leptos::task::spawn_local(async move {
            match api::fetch_ai_models(&prov, &key, &base).await {
                Ok(list) => {
                    if let Some(first) = list.first() {
                        state.ai_model.set(first.id.clone());
                        state.save_ai_settings();
                    }
                    models.set(list);
                    state.show_toast("Loaded AI model catalog", true);
                }
                Err(e) => state.show_toast(e, false),
            }
            loading_models.set(false);
        });
    };

    view! {
        <div class="ax-fold-split">
            <div class="ax-card p-4 sm:p-5 space-y-5">
                <div>
                    <h3 class="text-sm font-bold mb-2">
                        {move || tr(state.language.get(), "Giao diện & Chủ đề (Theme)", "Appearance & Theme")}
                    </h3>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[ThemeMode::System, ThemeMode::Light, ThemeMode::Dark, ThemeMode::Gemini]
                            .into_iter()
                            .map(|m| {
                                let cls = move || {
                                    if state.theme.get() == m {
                                        "py-2.5 px-3 ax-btn-primary text-xs font-semibold cursor-pointer"
                                    } else {
                                        "py-2.5 px-3 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                    }
                                };
                                view! {
                                    <button type="button" class=cls on:click=move |_| state.set_theme(m)>
                                        {move || theme_label(state.language.get(), m)}
                                    </button>
                                }
                            })
                            .collect_view()}
                    </div>
                </div>

                <div class="ax-fold-split">
                    <div>
                        <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                            {move || tr(state.language.get(), "Ngôn ngữ", "Language")}
                        </h4>
                        <div class="flex gap-2">
                            <button
                                type="button"
                                on:click=move |_| state.set_language(Language::Vi)
                                class=move || if state.language.get() == Language::Vi {
                                    "flex-1 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                                } else {
                                    "flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                }
                            >
                                "Tiếng Việt"
                            </button>
                            <button
                                type="button"
                                on:click=move |_| state.set_language(Language::En)
                                class=move || if state.language.get() == Language::En {
                                    "flex-1 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                                } else {
                                    "flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                }
                            >
                                "English"
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                            {move || tr(state.language.get(), "Chế độ trải nghiệm", "Experience Mode")}
                        </h4>
                        <div class="flex gap-2">
                            <button
                                type="button"
                                on:click=move |_| state.set_experience(ExperienceMode::Beginner)
                                class=move || if state.experience_mode.get() == ExperienceMode::Beginner {
                                    "flex-1 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                                } else {
                                    "flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                }
                            >
                                "Beginner"
                            </button>
                            <button
                                type="button"
                                on:click=move |_| state.set_experience(ExperienceMode::Advance)
                                class=move || if state.experience_mode.get() == ExperienceMode::Advance {
                                    "flex-1 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                                } else {
                                    "flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                }
                            >
                                "Advance (Pro)"
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                        <div class="font-bold">"KV Synology — Astryx Pure Rust Edition"</div>
                        <div class="text-slate-500">"Axum 0.8 + Leptos 0.8 CSR + Trunk + russh + snmp2 + rmcp"</div>
                    </div>
                    <button
                        type="button"
                        on:click=move |_| state.enter_demo_mode()
                        class="px-3 py-2 ax-btn-secondary font-semibold cursor-pointer"
                    >
                        "Activate Demo"
                    </button>
                </div>
            </div>

            <div class="ax-card p-4 sm:p-5 space-y-3.5">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold">
                        {move || tr(state.language.get(), "Cấu hình AI Copilot (Cloud API)", "AI Copilot Configuration (Cloud API)")}
                    </h3>
                    <label class="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            prop:checked=move || state.show_ai_chat_bubble.get()
                            on:change=move |ev| {
                                state.show_ai_chat_bubble.set(event_target_checked(&ev));
                                state.save_ai_settings();
                            }
                        />
                        <span>"Show Bubble"</span>
                    </label>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                        <label class="block text-slate-500 mb-1">"Provider"</label>
                        <select
                            prop:value=move || state.ai_provider.get()
                            on:change=move |ev| {
                                state.ai_provider.set(event_target_value(&ev));
                                state.save_ai_settings();
                            }
                            class="w-full px-3 py-2 ax-input"
                        >
                            <option value="gemini">"Google Gemini"</option>
                            <option value="openai">"OpenAI"</option>
                            <option value="claude">"Anthropic Claude"</option>
                            <option value="deepseek">"DeepSeek"</option>
                            <option value="openrouter">"OpenRouter"</option>
                            <option value="opencode">"OpenCode / Custom"</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-500 mb-1">"Model ID"</label>
                        <input
                            type="text"
                            prop:value=move || state.ai_model.get()
                            on:input=move |ev| {
                                state.ai_model.set(event_target_value(&ev));
                                state.save_ai_settings();
                            }
                            class="w-full px-3 py-2 ax-input"
                        />
                    </div>
                </div>

                <input
                    type="password"
                    prop:value=move || state.ai_api_key.get()
                    on:input=move |ev| {
                        state.ai_api_key.set(event_target_value(&ev));
                        state.save_ai_settings();
                    }
                    placeholder="API Key (stored locally in browser)"
                    class="w-full px-3 py-2 ax-input text-xs"
                />
                <input
                    type="text"
                    prop:value=move || state.ai_custom_base_url.get()
                    on:input=move |ev| {
                        state.ai_custom_base_url.set(event_target_value(&ev));
                        state.save_ai_settings();
                    }
                    placeholder="Custom Base URL (optional)"
                    class="w-full px-3 py-2 ax-input text-xs"
                />

                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        on:click=on_fetch_models
                        disabled=move || loading_models.get()
                        class="px-4 py-2 ax-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                        {move || if loading_models.get() { "Loading..." } else { "Fetch Models (/api/ai/models)" }}
                    </button>
                </div>

                <Show when=move || !models.get().is_empty()>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                        {move || models.get().into_iter().take(12).map(|m| {
                            let id = m.id.clone();
                            view! {
                                <button
                                    type="button"
                                    on:click=move |_| {
                                        state.ai_model.set(id.clone());
                                        state.save_ai_settings();
                                    }
                                    class="px-2.5 py-1 ax-btn-secondary text-[11px] font-mono cursor-pointer"
                                >
                                    {if m.name.is_empty() { m.id } else { m.name }}
                                </button>
                            }
                        }).collect_view()}
                    </div>
                </Show>
            </div>
        </div>
    }
}

#[allow(dead_code)]
fn _unused_value_check(_: &Value) {}
