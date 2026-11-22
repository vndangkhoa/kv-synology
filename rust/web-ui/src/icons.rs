use leptos::prelude::*;

use crate::models::{NavTab, TrafficConnection};

#[component]
pub fn NavIcon(tab: NavTab) -> impl IntoView {
    let d = match tab {
        NavTab::Dashboard => "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
        NavTab::Monitor => "M3 12h3l2-5 4 10 3-7 2 2h4",
        NavTab::Snmp => "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 5a5 5 0 1 1-5 5",
        NavTab::Traffic => {
            "M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        }
        NavTab::Files => {
            "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"
        }
        NavTab::Permissions => "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-9l2 2 4-4",
        NavTab::Docker => {
            "M4 13h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4zm3-4h3v3H7V9zm4 0h3v3h-3V9zm4-4h3v3h-3V5z"
        }
        NavTab::Download => "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
        NavTab::Storage => {
            "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"
        }
        NavTab::Packages => "M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2zm0 20V12m0 0l8-4.5M12 12L4 7.5",
        NavTab::Services => {
            "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3l2-1-1-3-2 1a7 7 0 0 0-1.7-1.7L17 5l-3-1-1 2a7 7 0 0 0-2 0L10 4 7 5l.7 2.3A7 7 0 0 0 6 9L4 8l-1 3 2 1a7 7 0 0 0 0 2l-2 1 1 3 2-1"
        }
        NavTab::ReverseProxy => "M7 7h10v4H7V7zm0 6h6v4H7v-4zm10 2l3 2-3 2",
        NavTab::Firewall => "M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z",
        NavTab::Notifications => {
            "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zm-4.5 13a1.5 1.5 0 0 1-3 0"
        }
        NavTab::Reports => {
            "M9 17v-6m4 6V7m4 10v-3M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        }
        NavTab::Terminal => "M4 17l6-5-6-5m8 11h8",
        NavTab::Mcp => {
            "M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3zM5 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
        }
        NavTab::Settings => "M4 7h16M4 12h16M4 17h16",
    };

    view! {
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d=d />
        </svg>
    }
}

#[component]
pub fn Sparkline(
    values: Vec<f64>,
    #[prop(default = "#0ea5e9")] stroke_color: &'static str,
    #[prop(default = 100.0)] max_val: f64,
) -> impl IntoView {
    let safe_max = if max_val <= 1.0 { 1.0 } else { max_val };
    let pts: Vec<f64> = if values.len() < 2 {
        vec![0.0, 0.0]
    } else {
        values
    };
    let n = (pts.len() - 1) as f64;
    let w = 260.0_f64;
    let h = 64.0_f64;

    let mut line_pts = Vec::with_capacity(pts.len());
    for (i, v) in pts.iter().enumerate() {
        let x = ((i as f64) / n) * w;
        let ratio = (v / safe_max).clamp(0.0, 1.0);
        let y = h - ratio * (h - 8.0) - 4.0;
        line_pts.push(format!("{x:.1},{y:.1}"));
    }
    let poly_str = line_pts.join(" ");
    let area_str = format!("0,{h:.1} {poly_str} {w:.1},{h:.1}");

    view! {
        <svg class="w-full h-16 overflow-visible" viewBox="0 0 260 64" preserveAspectRatio="none">
            <polygon points=area_str fill=stroke_color fill-opacity="0.14" />
            <polyline
                points=poly_str
                fill="none"
                stroke=stroke_color
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    }
}

#[component]
pub fn RadialGauge(
    percent: f64,
    label: String,
    #[prop(default = "#0ea5e9")] stroke_color: &'static str,
) -> impl IntoView {
    let clamped = percent.clamp(0.0, 100.0);
    let r = 36.0_f64;
    let c = 2.0 * std::f64::consts::PI * r;
    let offset = c * (1.0 - clamped / 100.0);
    let pct_text = format!("{:.0}%", clamped);

    view! {
        <div class="flex flex-col items-center justify-center">
            <div class="relative w-24 h-24">
                <svg class="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                    <circle
                        cx="44"
                        cy="44"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        class="text-slate-200 dark:text-slate-700"
                        stroke-width="8"
                    />
                    <circle
                        cx="44"
                        cy="44"
                        r="36"
                        fill="none"
                        stroke=stroke_color
                        stroke-width="8"
                        stroke-linecap="round"
                        stroke-dasharray=format!("{c:.1}")
                        stroke-dashoffset=format!("{offset:.1}")
                    />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900 dark:text-white">
                    {pct_text}
                </div>
            </div>
            <span class="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 text-center">
                {label}
            </span>
        </div>
    }
}

#[component]
pub fn DataFlowGraph(connections: Vec<TrafficConnection>) -> impl IntoView {
    let top: Vec<TrafficConnection> = connections.into_iter().take(6).collect();
    let count = top.len().max(1);

    view! {
        <div class="w-full rounded-2xl bg-slate-900/95 border border-slate-800 p-4 overflow-hidden">
            <svg class="w-full h-56" viewBox="0 0 600 220">
                <defs>
                    <radialGradient id="nasGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45" />
                        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
                    </radialGradient>
                </defs>
                <circle cx="110" cy="110" r="68" fill="url(#nasGlow)" />
                {top
                    .into_iter()
                    .enumerate()
                    .map(|(i, conn)| {
                        let y = if count == 1 {
                            110.0
                        } else {
                            28.0 + (i as f64) * (164.0 / ((count - 1) as f64))
                        };
                        let stroke = if conn.is_suspicious {
                            "#f43f5e"
                        } else if conn.direction == "inbound" {
                            "#38bdf8"
                        } else {
                            "#34d399"
                        };
                        let path_d = format!("M 142 110 C 260 110, 320 {y:.0}, 430 {y:.0}");
                        let title = format!("{} {}:{}", conn.flag_emoji, conn.remote_ip, conn.remote_port);
                        let sub = format!("{} • {}", conn.process_name, conn.direction);
                        view! {
                            <g>
                                <path
                                    d=path_d
                                    fill="none"
                                    stroke=stroke
                                    stroke-width="2"
                                    stroke-dasharray="5 4"
                                    stroke-opacity="0.85"
                                />
                                <circle cx="434" cy=format!("{y:.0}") r="5" fill=stroke />
                                <text
                                    x="446"
                                    y=format!("{:.0}", y - 2.0)
                                    fill="#f1f5f9"
                                    font-size="11"
                                    font-weight="600"
                                >
                                    {title}
                                </text>
                                <text
                                    x="446"
                                    y=format!("{:.0}", y + 11.0)
                                    fill="#94a3b8"
                                    font-size="9.5"
                                >
                                    {sub}
                                </text>
                            </g>
                        }
                    })
                    .collect_view()}
                <circle cx="110" cy="110" r="34" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
                <text x="110" y="106" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">
                    "Synology"
                </text>
                <text x="110" y="122" text-anchor="middle" fill="#38bdf8" font-size="10">
                    "NAS Core"
                </text>
            </svg>
        </div>
    }
}
