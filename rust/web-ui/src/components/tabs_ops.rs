use leptos::prelude::*;

use crate::api;
use crate::i18n::{format_bytes, format_speed, tr};
use crate::mock_data;
use crate::models::{BlockedIp, DownloadTask, FirewallRule, ReverseProxyRule};
use crate::state::AppState;

#[component]
pub fn DockerTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let containers = RwSignal::new(mock_data::demo_containers());
    let filter = RwSignal::new("all".to_string());
    let new_image = RwSignal::new(String::new());
    let new_name = RwSignal::new(String::new());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(list) = api::fetch_live_containers(&sess, &cfg).await
                    && !list.is_empty()
                {
                    containers.set(list);
                }
            });
        }
    });

    let toggle_container = move |id: String, up_now: bool| {
        containers.update(|list| {
            if let Some(c) = list.iter_mut().find(|x| x.id == id) {
                c.up = !up_now;
                c.status = if !up_now {
                    "Up just now".to_string()
                } else {
                    "Exited (0)".to_string()
                };
            }
        });
        state.show_toast(
            if up_now {
                "Stopped container"
            } else {
                "Started container"
            },
            true,
        );
    };

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="flex flex-wrap gap-2 text-xs">
                    {["all", "running", "stopped"].into_iter().map(|f| {
                        let cls = move || if filter.get() == f {
                            "px-3 py-1.5 ax-btn-primary font-semibold cursor-pointer"
                        } else {
                            "px-3 py-1.5 ax-btn-secondary font-semibold cursor-pointer"
                        };
                        view! {
                            <button type="button" class=cls on:click=move |_| filter.set(f.to_string())>
                                {match f {
                                    "running" => "Running",
                                    "stopped" => "Stopped",
                                    _ => "All Containers",
                                }}
                            </button>
                        }
                    }).collect_view()}
                </div>

                <div class="flex flex-wrap gap-2 text-xs">
                    <input
                        type="text"
                        prop:value=move || new_name.get()
                        on:input=move |ev| new_name.set(event_target_value(&ev))
                        placeholder="Container name"
                        class="px-3 py-1.5 ax-input flex-1 sm:flex-none"
                    />
                    <input
                        type="text"
                        prop:value=move || new_image.get()
                        on:input=move |ev| new_image.set(event_target_value(&ev))
                        placeholder="nginx:alpine"
                        class="px-3 py-1.5 ax-input flex-1 sm:flex-none"
                    />
                    <button
                        type="button"
                        on:click=move |_| {
                            let n = new_name.get_untracked().trim().to_string();
                            let img = new_image.get_untracked().trim().to_string();
                            if n.is_empty() || img.is_empty() {
                                return;
                            }
                            containers.update(|l| l.insert(0, crate::models::DockerContainer {
                                id: format!("c_{}", l.len() + 10),
                                name: n.clone(),
                                image: img,
                                status: "Up 1 second".to_string(),
                                up: true,
                                cpu_percent: 0.4,
                                memory_mb: 32.0,
                                ports: "8080:80/tcp".to_string(),
                                created: "Just now".to_string(),
                            }));
                            new_name.set(String::new());
                            new_image.set(String::new());
                            state.show_toast(format!("Deployed container `{n}`"), true);
                        }
                        class="px-3.5 py-1.5 ax-btn-primary font-semibold cursor-pointer"
                    >
                        "+ Deploy"
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {move || {
                    let f = filter.get();
                    containers.get().into_iter().filter(|c| match f.as_str() {
                        "running" => c.up,
                        "stopped" => !c.up,
                        _ => true,
                    }).map(|c| {
                        let id = c.id.clone();
                        let up_now = c.up;
                        let badge = if c.up {
                            "px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold shrink-0"
                        } else {
                            "px-2 py-0.5 rounded-full ax-tile text-slate-500 text-[11px] font-semibold shrink-0"
                        };
                        view! {
                            <div class="ax-card p-4 space-y-2.5">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <div class="text-sm font-bold truncate">{c.name}</div>
                                        <div class="text-[11px] text-slate-500 font-mono truncate">{c.image}</div>
                                    </div>
                                    <span class=badge>{c.status}</span>
                                </div>
                                <div class="text-xs text-slate-500 dark:text-slate-400 flex justify-between gap-2 ax-tabular">
                                    <span>{format!("CPU {:.1}% • RAM {:.0} MB", c.cpu_percent, c.memory_mb)}</span>
                                    <span class="font-mono text-[11px] truncate">{c.ports}</span>
                                </div>
                                <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        on:click=move |_| toggle_container(id.clone(), up_now)
                                        class="px-3 py-1.5 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                    >
                                        {if up_now { "Stop" } else { "Start" }}
                                    </button>
                                </div>
                            </div>
                        }
                    }).collect_view()
                }}
            </div>
        </div>
    }
}

#[component]
pub fn PackageCenterTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let packages = RwSignal::new(mock_data::demo_packages());
    let search = RwSignal::new(String::new());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(list) = api::fetch_live_packages(&sess, &cfg).await
                    && !list.is_empty()
                {
                    packages.set(list);
                }
            });
        }
    });

    view! {
        <div class="space-y-4">
            <div class="flex justify-between items-center gap-3">
                <input
                    type="text"
                    prop:value=move || search.get()
                    on:input=move |ev| search.set(event_target_value(&ev))
                    placeholder=move || tr(state.language.get(), "Tìm gói ứng dụng DSM...", "Search DSM packages...")
                    class="px-3.5 py-2 ax-input text-xs w-full sm:w-80"
                />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {move || {
                    let q = search.get().to_lowercase();
                    packages.get().into_iter().filter(|p| q.is_empty() || p.name.to_lowercase().contains(&q)).map(|p| {
                        let pid = p.id.clone();
                        let running = p.running;
                        view! {
                            <div class="ax-card p-4 flex flex-col justify-between gap-3">
                                <div>
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <div class="text-sm font-bold truncate">{p.name}</div>
                                            <div class="text-[11px] text-slate-500 ax-tabular">{format!("v{} • {}", p.version, p.publisher)}</div>
                                        </div>
                                        <span class=if running {
                                            "px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold shrink-0"
                                        } else {
                                            "px-2 py-0.5 rounded-full ax-tile text-slate-500 text-[11px] font-semibold shrink-0"
                                        }>
                                            {if running { "Running" } else { "Stopped" }}
                                        </span>
                                    </div>
                                    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                                </div>
                                <div class="flex justify-end">
                                    <button
                                        type="button"
                                        on:click=move |_| {
                                            packages.update(|l| {
                                                if let Some(pkg) = l.iter_mut().find(|x| x.id == pid) {
                                                    pkg.running = !pkg.running;
                                                }
                                            });
                                            state.show_toast("Updated package state", true);
                                        }
                                        class="px-3 py-1.5 ax-btn-secondary text-xs font-semibold cursor-pointer"
                                    >
                                        {if running { "Stop" } else { "Run" }}
                                    </button>
                                </div>
                            </div>
                        }
                    }).collect_view()
                }}
            </div>
        </div>
    }
}

#[component]
pub fn DownloadStationTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let sub_tab = RwSignal::new("tasks");
    let tasks = RwSignal::new(mock_data::demo_downloads());
    let new_url = RwSignal::new(String::new());
    let resolve_note = RwSignal::new(Option::<String>::None);

    let bt_query = RwSignal::new("ubuntu".to_string());
    let bt_results = RwSignal::new(Vec::<crate::models::BtSearchResult>::new());
    let bt_busy = RwSignal::new(false);

    let rss_url = RwSignal::new("https://ubuntu.com/download/desktop/rss.xml".to_string());
    let rss_items = RwSignal::new(Vec::<crate::models::RssItem>::new());

    Effect::new(move |_| {
        let sess = state.session.get();
        let cfg = state.dsm_config.get();
        if sess.is_connected && !sess.is_demo {
            leptos::task::spawn_local(async move {
                if let Ok(list) = api::fetch_live_downloads(&sess, &cfg).await
                    && !list.is_empty()
                {
                    tasks.set(list);
                }
            });
        }
    });

    let add_task_url = move |uri: String, title: String| {
        if uri.trim().is_empty() {
            return;
        }
        tasks.update(|l| {
            l.insert(
                0,
                DownloadTask {
                    id: format!("task_{}", l.len() + 200),
                    title,
                    uri,
                    status: "downloading".to_string(),
                    size_bytes: 1_048_576_000,
                    downloaded_bytes: 0,
                    speed_down: 0,
                    speed_up: 0,
                    eta: "Queued".to_string(),
                    task_type: "http".to_string(),
                },
            );
        });
        state.show_toast("Added download task", true);
    };

    view! {
        <div class="space-y-4">
            <div class="flex flex-wrap gap-2">
                {["tasks", "bt-search", "rss"].into_iter().map(|t| {
                    let cls = move || if sub_tab.get() == t {
                        "px-4 py-2 ax-btn-primary text-xs font-semibold cursor-pointer"
                    } else {
                        "px-4 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                    };
                    view! {
                        <button type="button" class=cls on:click=move |_| sub_tab.set(t)>
                            {match t {
                                "bt-search" => "BT Torrent Search",
                                "rss" => "RSS Feeds",
                                _ => "Active Tasks",
                            }}
                        </button>
                    }
                }).collect_view()}
            </div>

            <Show when=move || sub_tab.get() == "tasks">
                <div class="ax-card p-4 space-y-3">
                    <div class="flex flex-col sm:flex-row gap-2 text-xs">
                        <input
                            type="text"
                            prop:value=move || new_url.get()
                            on:input=move |ev| new_url.set(event_target_value(&ev))
                            placeholder="https://... / magnet:?xt=urn:btih:... / drive.google.com/..."
                            class="flex-1 px-3 py-2 ax-input"
                        />
                        <div class="flex gap-2">
                            <button
                                type="button"
                                on:click=move |_| {
                                    let raw = new_url.get_untracked();
                                    leptos::task::spawn_local(async move {
                                        match api::resolve_download_link(&raw).await {
                                            Ok(val) => {
                                                let resolved = val["directUrl"]
                                                    .as_str()
                                                    .or_else(|| val["resolvedUrl"].as_str())
                                                    .unwrap_or(&raw)
                                                    .to_string();
                                                new_url.set(resolved.clone());
                                                resolve_note.set(Some(format!("Resolved: {resolved}")));
                                            }
                                            Err(e) => resolve_note.set(Some(format!("Resolve error: {e}"))),
                                        }
                                    });
                                }
                                class="flex-1 sm:flex-none px-3 py-2 ax-btn-secondary font-semibold cursor-pointer"
                            >
                                "Resolve Link"
                            </button>
                            <button
                                type="button"
                                on:click=move |_| {
                                    let u = new_url.get_untracked();
                                    add_task_url(u.clone(), u);
                                    new_url.set(String::new());
                                }
                                class="flex-1 sm:flex-none px-4 py-2 ax-btn-primary font-semibold cursor-pointer"
                            >
                                "+ Add Task"
                            </button>
                        </div>
                    </div>
                    <Show when=move || resolve_note.get().is_some()>
                        <div class="text-[11px] font-mono text-sky-600 dark:text-sky-400 break-all">{move || resolve_note.get().unwrap_or_default()}</div>
                    </Show>

                    <div class="space-y-2.5 pt-2">
                        {move || tasks.get().into_iter().map(|t| {
                            let tid = t.id.clone();
                            let tid_del = t.id.clone();
                            let pct = if t.size_bytes > 0 {
                                (t.downloaded_bytes as f64 / t.size_bytes as f64) * 100.0
                            } else {
                                0.0
                            };
                            view! {
                                <div class="ax-tile p-3.5 space-y-2">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <span class="font-bold truncate">{t.title}</span>
                                        <div class="flex items-center gap-2 shrink-0">
                                            <span class="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">{t.status.clone()}</span>
                                            <button
                                                type="button"
                                                on:click=move |_| {
                                                    tasks.update(|l| {
                                                        if let Some(x) = l.iter_mut().find(|d| d.id == tid) {
                                                            x.status = if x.status == "paused" { "downloading".to_string() } else { "paused".to_string() };
                                                        }
                                                    });
                                                }
                                                class="px-2.5 py-1 ax-btn-secondary cursor-pointer"
                                            >
                                                {if t.status == "paused" { "Resume" } else { "Pause" }}
                                            </button>
                                            <button
                                                type="button"
                                                on:click=move |_| tasks.update(|l| l.retain(|d| d.id != tid_del))
                                                class="px-2 py-1 rounded-lg text-rose-600 cursor-pointer"
                                            >
                                                "Delete"
                                            </button>
                                        </div>
                                    </div>
                                    <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div class="h-full bg-sky-600 rounded-full" style=format!("width: {:.0}%", pct.clamp(0.0, 100.0)) />
                                    </div>
                                    <div class="flex justify-between text-[11px] text-slate-500 ax-tabular">
                                        <span>{format!("{} / {} ({:.1}%)", format_bytes(t.downloaded_bytes), format_bytes(t.size_bytes), pct)}</span>
                                        <span>{format!("↓ {} • ETA {}", format_speed(t.speed_down), t.eta)}</span>
                                    </div>
                                </div>
                            }
                        }).collect_view()}
                    </div>
                </div>
            </Show>

            <Show when=move || sub_tab.get() == "bt-search">
                <div class="ax-card p-4 space-y-3 text-xs">
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            prop:value=move || bt_query.get()
                            on:input=move |ev| bt_query.set(event_target_value(&ev))
                            placeholder="ubuntu, debian, iso..."
                            class="flex-1 px-3 py-2 ax-input"
                        />
                        <button
                            type="button"
                            on:click=move |_| {
                                let q = bt_query.get_untracked();
                                bt_busy.set(true);
                                leptos::task::spawn_local(async move {
                                    if let Ok(items) = api::bt_search(&q).await {
                                        bt_results.set(items);
                                    }
                                    bt_busy.set(false);
                                });
                            }
                            class="px-4 py-2 ax-btn-primary font-semibold cursor-pointer"
                        >
                            {move || if bt_busy.get() { "Searching..." } else { "Search BT (/api/download/bt-search)" }}
                        </button>
                    </div>
                    <div class="space-y-2">
                        {move || bt_results.get().into_iter().map(|r| {
                            let dl = r.download.clone();
                            let t = r.title.clone();
                            view! {
                                <div class="ax-tile p-3 flex items-center justify-between gap-2">
                                    <div class="min-w-0">
                                        <div class="font-bold truncate">{r.title}</div>
                                        <div class="text-[11px] text-slate-500 ax-tabular">{format!("{} • Seeds {} / Leech {} • {}", format_bytes(r.size), r.seednum, r.leech, r.datetime)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        on:click=move |_| {
                                            add_task_url(dl.clone(), t.clone());
                                            sub_tab.set("tasks");
                                        }
                                        class="px-3 py-1.5 ax-btn-primary font-semibold shrink-0 cursor-pointer"
                                    >
                                        "+ Queue"
                                    </button>
                                </div>
                            }
                        }).collect_view()}
                    </div>
                </div>
            </Show>

            <Show when=move || sub_tab.get() == "rss">
                <div class="ax-card p-4 space-y-3 text-xs">
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            prop:value=move || rss_url.get()
                            on:input=move |ev| rss_url.set(event_target_value(&ev))
                            class="flex-1 px-3 py-2 ax-input"
                        />
                        <button
                            type="button"
                            on:click=move |_| {
                                let u = rss_url.get_untracked();
                                leptos::task::spawn_local(async move {
                                    match api::fetch_rss_feed(&u).await {
                                        Ok(items) => rss_items.set(items),
                                        Err(e) => state.show_toast(e, false),
                                    }
                                });
                            }
                            class="px-4 py-2 ax-btn-primary font-semibold cursor-pointer"
                        >
                            "Fetch RSS"
                        </button>
                    </div>
                    <div class="space-y-2">
                        {move || rss_items.get().into_iter().map(|it| view! {
                            <div class="ax-tile p-3">
                                <div class="font-bold">{it.title}</div>
                                <div class="text-[11px] text-slate-500">{it.pub_date}</div>
                            </div>
                        }).collect_view()}
                    </div>
                </div>
            </Show>
        </div>
    }
}

#[component]
pub fn ReverseProxyTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let rules = RwSignal::new(mock_data::demo_reverse_proxies());
    let desc = RwSignal::new(String::new());
    let src_host = RwSignal::new(String::new());
    let dst_port = RwSignal::new("8080".to_string());

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-wrap gap-2 text-xs">
                <input type="text" prop:value=move || desc.get() on:input=move |ev| desc.set(event_target_value(&ev)) placeholder="Service Name" class="px-3 py-2 ax-input flex-1 sm:flex-none" />
                <input type="text" prop:value=move || src_host.get() on:input=move |ev| src_host.set(event_target_value(&ev)) placeholder="app.vndns.net" class="px-3 py-2 ax-input flex-1 min-w-[160px]" />
                <input type="text" prop:value=move || dst_port.get() on:input=move |ev| dst_port.set(event_target_value(&ev)) placeholder="8088" class="px-3 py-2 ax-input w-24 ax-tabular" />
                <button
                    type="button"
                    on:click=move |_| {
                        let d = desc.get_untracked().trim().to_string();
                        let h = src_host.get_untracked().trim().to_string();
                        let p = dst_port.get_untracked().trim().parse::<u16>().unwrap_or(8080);
                        if d.is_empty() || h.is_empty() { return; }
                        rules.update(|l| l.push(ReverseProxyRule {
                            id: format!("rp_{}", l.len() + 10),
                            description: d,
                            src_protocol: "HTTPS".to_string(),
                            src_host: h,
                            src_port: 443,
                            dst_protocol: "HTTP".to_string(),
                            dst_host: "localhost".to_string(),
                            dst_port: p,
                            hsts: true,
                            websocket: true,
                        }));
                        desc.set(String::new());
                        src_host.set(String::new());
                        state.show_toast("Added Reverse Proxy rule", true);
                    }
                    class="px-4 py-2 ax-btn-primary font-semibold cursor-pointer"
                >
                    "+ Add Proxy Rule"
                </button>
            </div>

            <div class="ax-card p-4 overflow-x-auto">
                <table class="w-full min-w-[560px] text-left text-xs">
                    <thead class="text-slate-500 border-b border-slate-200/70 dark:border-slate-800">
                        <tr>
                            <th class="py-2 pr-3">"Description"</th>
                            <th class="py-2 pr-3">"Source"</th>
                            <th class="py-2 pr-3">"Destination"</th>
                            <th class="py-2 pr-3">"Features"</th>
                            <th class="py-2 text-right">"Action"</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200/50 dark:divide-slate-800">
                        {move || rules.get().into_iter().map(|r| {
                            let id = r.id.clone();
                            view! {
                                <tr>
                                    <td class="py-2.5 pr-3 font-bold whitespace-nowrap">{r.description}</td>
                                    <td class="py-2.5 pr-3 font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">{format!("{}://{}:{}", r.src_protocol.to_lowercase(), r.src_host, r.src_port)}</td>
                                    <td class="py-2.5 pr-3 font-mono whitespace-nowrap">{format!("{}://{}:{}", r.dst_protocol.to_lowercase(), r.dst_host, r.dst_port)}</td>
                                    <td class="py-2.5 pr-3 whitespace-nowrap">{format!("{}{}", if r.hsts { "HSTS " } else { "" }, if r.websocket { "WS" } else { "" })}</td>
                                    <td class="py-2.5 text-right whitespace-nowrap">
                                        <button type="button" on:click=move |_| rules.update(|l| l.retain(|x| x.id != id)) class="text-rose-600 cursor-pointer">"Delete"</button>
                                    </td>
                                </tr>
                            }
                        }).collect_view()}
                    </tbody>
                </table>
            </div>
        </div>
    }
}

#[component]
pub fn FirewallManagerTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let enabled = RwSignal::new(true);
    let rules = RwSignal::new(mock_data::demo_firewall_rules());
    let blocked = RwSignal::new(mock_data::demo_blocked_ips());
    let block_ip_input = RwSignal::new(String::new());

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div class="text-sm font-bold">
                        {move || tr(state.language.get(), "Tường lửa DSM & Chống dò mật khẩu", "DSM Firewall & Auto-Block")}
                    </div>
                    <div class="text-xs text-slate-500">"Packet filtering + SSH/DSM failed-login IP blocklist"</div>
                </div>
                <button
                    type="button"
                    on:click=move |_| enabled.update(|b| *b = !*b)
                    class=move || if enabled.get() {
                        "px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                    } else {
                        "px-4 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                    }
                >
                    {move || if enabled.get() { "Firewall ON" } else { "Firewall OFF" }}
                </button>
            </div>

            <div class="ax-fold-split">
                <div class="ax-card p-4 space-y-2.5">
                    <h3 class="text-sm font-bold">"Firewall Rules"</h3>
                    {move || rules.get().into_iter().map(|r: FirewallRule| {
                        let badge = if r.action == "Allow" {
                            "px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-[11px] font-bold shrink-0"
                        } else {
                            "px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 text-[11px] font-bold shrink-0"
                        };
                        view! {
                            <div class="ax-tile p-3 flex items-center justify-between gap-2 text-xs">
                                <div class="min-w-0">
                                    <div class="font-bold truncate">{r.name}</div>
                                    <div class="text-[11px] text-slate-500 ax-tabular">{format!("Ports: {} ({}) • Source: {}", r.ports, r.protocol, r.source_ip)}</div>
                                </div>
                                <span class=badge>{r.action}</span>
                            </div>
                        }
                    }).collect_view()}
                </div>

                <div class="ax-card p-4 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h3 class="text-sm font-bold">"Blocked IPs"</h3>
                        <div class="flex gap-1.5 text-xs">
                            <input
                                type="text"
                                prop:value=move || block_ip_input.get()
                                on:input=move |ev| block_ip_input.set(event_target_value(&ev))
                                placeholder="IP address"
                                class="px-2.5 py-1 ax-input w-32"
                            />
                            <button
                                type="button"
                                on:click=move |_| {
                                    let ip = block_ip_input.get_untracked().trim().to_string();
                                    if ip.is_empty() { return; }
                                    blocked.update(|l| l.insert(0, BlockedIp {
                                        ip,
                                        reason: "Manual admin block".to_string(),
                                        blocked_at: "Just now".to_string(),
                                        permanent: true,
                                    }));
                                    block_ip_input.set(String::new());
                                }
                                class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                            >
                                "Block"
                            </button>
                        </div>
                    </div>

                    {move || blocked.get().into_iter().map(|b| {
                        let ip = b.ip.clone();
                        view! {
                            <div class="ax-tile p-3 flex items-center justify-between gap-2 text-xs">
                                <div class="min-w-0">
                                    <div class="font-mono font-bold text-rose-600 dark:text-rose-400">{b.ip}</div>
                                    <div class="text-[11px] text-slate-500 truncate">{format!("{} • {}", b.reason, b.blocked_at)}</div>
                                </div>
                                <button
                                    type="button"
                                    on:click=move |_| {
                                        blocked.update(|l| l.retain(|x| x.ip != ip));
                                        state.show_toast("Unblocked IP", true);
                                    }
                                    class="px-2.5 py-1 ax-btn-secondary font-semibold shrink-0 cursor-pointer"
                                >
                                    "Unblock"
                                </button>
                            </div>
                        }
                    }).collect_view()}
                </div>
            </div>
        </div>
    }
}

#[component]
pub fn TerminalTab() -> impl IntoView {
    let state = expect_context::<AppState>();
    let cfg = state.dsm_config.get_untracked();

    let host = RwSignal::new(cfg.host);
    let port = RwSignal::new("22".to_string());
    let username = RwSignal::new(cfg.account);
    let password = RwSignal::new(String::new());
    let command = RwSignal::new("uname -a && uptime".to_string());
    let transcript = RwSignal::new("$ KV Synology Pure-Rust SSH Terminal (backed by russh /api/ssh/exec)\n$ Enter NAS credentials above or click a quick command.\n".to_string());
    let busy = RwSignal::new(false);

    let run_cmd = move |cmd: String| {
        if cmd.trim().is_empty() || busy.get_untracked() {
            return;
        }
        let h = host.get_untracked();
        let p = port.get_untracked().parse::<u16>().unwrap_or(22);
        let u = username.get_untracked();
        let pw = password.get_untracked();
        transcript.update(|t| t.push_str(&format!("\n{u}@{h}:{p}$ {cmd}\n")));

        if state.session.get_untracked().is_demo && pw.trim().is_empty() {
            let simulated = match cmd.trim() {
                "uname -a" => {
                    "Linux kv-syno-ds920 4.4.302+ #72806 SMP Thu Sep 5 13:45:23 CST 2024 x86_64 GNU/Linux synology_geminilake_920+\n"
                }
                "df -h" => {
                    "Filesystem      Size  Used Avail Use% Mounted on\n/dev/md0        2.3G  1.4G  812M  63% /\n/dev/vg1/vol1    11T  6.7T  4.3T  61% /volume1\n/dev/vg2/vol2   931G  312G  619G  34% /volume2\n"
                }
                "free -m" => {
                    "              total        used        free      shared  buff/cache   available\nMem:          16048        6980        2140         312        6928        8520\nSwap:          2047          24        2023\n"
                }
                "docker ps" => {
                    "CONTAINER ID   IMAGE                                      STATUS\na1f92c81       ghcr.io/immich-app/immich-server:release   Up 14 days\nb4c80d12       linuxserver/jellyfin:latest                Up 14 days\nc9e17f33       adguard/adguardhome:latest                 Up 18 days\n"
                }
                "uptime" => {
                    " 13:05:00 up 18 days,  6:47,  1 user,  load average: 0.42, 0.38, 0.31\n"
                }
                "cat /proc/loadavg" => "0.42 0.38 0.31 2/418 29104\n",
                _ => {
                    "[demo] Simulated DS920+ shell output (enter SSH password or connect Live NAS to run on host via russh)\n"
                }
            };
            transcript.update(|t| t.push_str(simulated));
            return;
        }

        busy.set(true);
        leptos::task::spawn_local(async move {
            match api::exec_ssh(&h, p, &u, &pw, "", &cmd).await {
                Ok(val) => {
                    if let Some(out) = val["stdout"].as_str()
                        && !out.is_empty()
                    {
                        transcript.update(|t| t.push_str(out));
                    }
                    if let Some(err) = val["stderr"].as_str()
                        && !err.is_empty()
                    {
                        transcript.update(|t| t.push_str(&format!("[stderr] {err}\n")));
                    }
                    if val["success"].as_bool() != Some(true)
                        && let Some(err) = val["error"].as_str()
                    {
                        transcript.update(|t| t.push_str(&format!("[error] {err}\n")));
                    }
                }
                Err(e) => transcript.update(|t| t.push_str(&format!("[http error] {e}\n"))),
            }
            busy.set(false);
        });
    };

    view! {
        <div class="space-y-4">
            <div class="ax-card p-4 space-y-3 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input type="text" prop:value=move || host.get() on:input=move |ev| host.set(event_target_value(&ev)) placeholder="Host (LAN/DDNS)" class="px-3 py-2 ax-input" />
                    <input type="text" prop:value=move || port.get() on:input=move |ev| port.set(event_target_value(&ev)) placeholder="Port (22/2212)" class="px-3 py-2 ax-input ax-tabular" />
                    <input type="text" prop:value=move || username.get() on:input=move |ev| username.set(event_target_value(&ev)) placeholder="Username" class="px-3 py-2 ax-input" />
                    <input type="password" prop:value=move || password.get() on:input=move |ev| password.set(event_target_value(&ev)) placeholder="SSH Password" class="px-3 py-2 ax-input" />
                </div>
                <div class="flex flex-wrap gap-1.5">
                    {["uname -a", "df -h", "free -m", "docker ps", "uptime", "cat /proc/loadavg"]
                        .into_iter()
                        .map(|q| {
                            view! {
                                <button
                                    type="button"
                                    on:click=move |_| {
                                        command.set(q.to_string());
                                        run_cmd(q.to_string());
                                    }
                                    class="px-2.5 py-1 ax-btn-secondary font-mono cursor-pointer"
                                >
                                    {q}
                                </button>
                            }
                        })
                        .collect_view()}
                </div>
                <div class="flex gap-2">
                    <input
                        type="text"
                        prop:value=move || command.get()
                        on:input=move |ev| command.set(event_target_value(&ev))
                        class="flex-1 px-3 py-2 ax-input font-mono"
                    />
                    <button
                        type="button"
                        on:click=move |_| run_cmd(command.get_untracked())
                        disabled=move || busy.get()
                        class="px-4 py-2 ax-btn-primary font-semibold cursor-pointer disabled:opacity-50"
                    >
                        {move || if busy.get() { "Running..." } else { "Execute SSH" }}
                    </button>
                </div>
            </div>

            <pre class="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs min-h-[320px] max-h-[500px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                {move || transcript.get()}
            </pre>
        </div>
    }
}
