use leptos::prelude::*;

use crate::i18n::{exp_label, format_speed, nav_label, tr};
use crate::icons::NavIcon;
use crate::models::{Language, NavTab, ThemeMode};
use crate::state::AppState;

const QUICK_TABS: [NavTab; 5] = [
    NavTab::Dashboard,
    NavTab::Files,
    NavTab::Docker,
    NavTab::Storage,
    NavTab::Settings,
];

struct NavSection {
    vi: &'static str,
    en: &'static str,
    tabs: &'static [NavTab],
}

const NAV_SECTIONS: &[NavSection] = &[
    NavSection {
        vi: "Tổng quan",
        en: "Overview",
        tabs: &[NavTab::Dashboard, NavTab::Monitor, NavTab::Reports],
    },
    NavSection {
        vi: "Lưu trữ & Tệp",
        en: "Storage & Files",
        tabs: &[NavTab::Files, NavTab::Storage, NavTab::Permissions],
    },
    NavSection {
        vi: "Ứng dụng & Dịch vụ",
        en: "Apps & Services",
        tabs: &[
            NavTab::Docker,
            NavTab::Download,
            NavTab::Packages,
            NavTab::Services,
        ],
    },
    NavSection {
        vi: "Mạng & Bảo mật",
        en: "Network & Security",
        tabs: &[
            NavTab::Traffic,
            NavTab::Snmp,
            NavTab::ReverseProxy,
            NavTab::Firewall,
        ],
    },
    NavSection {
        vi: "Hệ thống & AI",
        en: "System & AI",
        tabs: &[
            NavTab::Notifications,
            NavTab::Terminal,
            NavTab::Mcp,
            NavTab::Settings,
        ],
    },
];

const fn bottom_nav_label(lang: Language, tab: NavTab) -> &'static str {
    match (lang, tab) {
        (Language::Vi, NavTab::Dashboard) => "Tổng quan",
        (Language::En, NavTab::Dashboard) => "Home",
        (Language::Vi, NavTab::Files) => "Tệp tin",
        (Language::En, NavTab::Files) => "Files",
        (_, NavTab::Docker) => "Docker",
        (Language::Vi, NavTab::Storage) => "Ổ đĩa",
        (Language::En, NavTab::Storage) => "Disks",
        (Language::Vi, NavTab::Settings) => "Cài đặt",
        (Language::En, NavTab::Settings) => "Config",
        _ => nav_label(lang, tab),
    }
}

#[component]
pub fn Sidebar() -> impl IntoView {
    let state = expect_context::<AppState>();

    let render_grouped_nav = move |rail_only_desktop: bool| {
        NAV_SECTIONS
            .iter()
            .map(move |sec| {
                view! {
                    <div class="mb-2">
                        {if rail_only_desktop {
                            view! { <div class="my-1 border-t border-slate-200/60 dark:border-slate-800/70" /> }.into_any()
                        } else {
                            view! {
                                <div class="hidden lg:block px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    {move || tr(state.language.get(), sec.vi, sec.en)}
                                </div>
                            }.into_any()
                        }}
                        <div class="space-y-0.5">
                            {sec.tabs
                                .iter()
                                .copied()
                                .map(move |tab| {
                                    let cls = move || {
                                        let align = if rail_only_desktop {
                                            "justify-center px-2"
                                        } else {
                                            "justify-center lg:justify-start px-2 lg:px-3"
                                        };
                                        if state.active_tab.get() == tab {
                                            format!("w-full flex items-center gap-2.5 py-2 text-[13px] cursor-pointer ax-nav-item-active {align}")
                                        } else {
                                            format!("w-full flex items-center gap-2.5 py-2 text-[13px] cursor-pointer ax-nav-item {align}")
                                        }
                                    };
                                    view! {
                                        <button
                                            type="button"
                                            class=cls
                                            aria-current=move || if state.active_tab.get() == tab { Some("page") } else { None }
                                            on:click=move |_| state.set_tab(tab)
                                            title=move || nav_label(state.language.get(), tab)
                                        >
                                            <NavIcon tab=tab />
                                            <Show when=move || !rail_only_desktop>
                                                <span class="hidden lg:inline truncate">
                                                    {move || nav_label(state.language.get(), tab)}
                                                </span>
                                            </Show>
                                        </button>
                                    }
                                })
                                .collect_view()}
                        </div>
                    </div>
                }
            })
            .collect_view()
    };

    let render_drawer_nav = move || {
        NAV_SECTIONS
            .iter()
            .map(move |sec| {
                view! {
                    <div class="mb-3">
                        <div class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {move || tr(state.language.get(), sec.vi, sec.en)}
                        </div>
                        <div class="space-y-0.5">
                            {sec.tabs
                                .iter()
                                .copied()
                                .map(move |tab| {
                                    let cls = move || {
                                        if state.active_tab.get() == tab {
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ax-nav-item-active"
                                        } else {
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ax-nav-item"
                                        }
                                    };
                                    view! {
                                        <button
                                            type="button"
                                            class=cls
                                            aria-current=move || if state.active_tab.get() == tab { Some("page") } else { None }
                                            on:click=move |_| state.set_tab(tab)
                                        >
                                            <NavIcon tab=tab />
                                            <span class="truncate">{move || nav_label(state.language.get(), tab)}</span>
                                        </button>
                                    }
                                })
                                .collect_view()}
                        </div>
                    </div>
                }
            })
            .collect_view()
    };

    view! {
        <>
            // Foldable/Tablet Rail (w-[72px] at sm..lg) -> Full Astryx SideNav (w-64 at lg+, collapsible to w-[72px])
            <aside class=move || {
                let lg_width = if state.is_sidebar_collapsed.get() {
                    "w-[72px]"
                } else {
                    "w-[72px] lg:w-64"
                };
                format!(
                    "hidden sm:flex flex-col shrink-0 h-full ax-surface border-r pl-safe transition-all duration-200 {lg_width}"
                )
            }>
                <div class="h-14 px-3 lg:px-4 flex items-center justify-center lg:justify-start border-b border-slate-200/70 dark:border-slate-800/80">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <img src="/logo.svg" alt="DSM Helper" class="w-8 h-8 rounded-lg shrink-0" />
                        <Show when=move || !state.is_sidebar_collapsed.get()>
                            <div class="hidden lg:block min-w-0">
                                <div class="text-sm font-bold truncate">"DSM Helper"</div>
                                <div class="text-[11px] font-medium text-sky-600 dark:text-sky-400 truncate">"Astryx • Pure Rust"</div>
                            </div>
                        </Show>
                    </div>
                </div>

                <div class="px-2 lg:px-3 py-2 border-b border-slate-200/60 dark:border-slate-800/70">
                    {move || {
                        let sess = state.session.get();
                        let lang = state.language.get();
                        let collapsed = state.is_sidebar_collapsed.get();
                        let dot_cls = if sess.is_connected {
                            "w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"
                        } else {
                            "w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"
                        };
                        let label = if sess.is_demo {
                            format!("Demo • {}", sess.host)
                        } else if sess.is_connected {
                            sess.host.clone()
                        } else {
                            tr(lang, "Chưa kết nối", "Disconnected").to_string()
                        };
                        let title_attr = label.clone();
                        view! {
                            <button
                                type="button"
                                on:click=move |_| state.is_login_modal_open.set(true)
                                class="w-full ax-tile flex items-center justify-center lg:justify-start gap-2 px-2 py-2 text-xs font-medium cursor-pointer"
                                title=title_attr
                            >
                                <span class=dot_cls />
                                <Show when=move || !collapsed>
                                    <span class="hidden lg:inline truncate">{label.clone()}</span>
                                </Show>
                            </button>
                        }
                    }}
                </div>

                <nav
                    aria-label="Primary"
                    class="flex-1 overflow-y-auto px-2 py-2 no-scrollbar"
                >
                    {move || render_grouped_nav(state.is_sidebar_collapsed.get())}
                </nav>

                <div class="p-2 lg:p-3 border-t border-slate-200/70 dark:border-slate-800/80">
                    <button
                        type="button"
                        on:click=move |_| state.toggle_language()
                        class="w-full py-2 px-2 lg:px-3 ax-btn-secondary text-xs font-semibold cursor-pointer truncate"
                    >
                        <span>{move || state.language.get().code().to_uppercase()}</span>
                        <Show when=move || !state.is_sidebar_collapsed.get()>
                            <span class="hidden lg:inline">
                                {move || if state.language.get() == Language::Vi {
                                    " • Tiếng Việt"
                                } else {
                                    " • English"
                                }}
                            </span>
                        </Show>
                    </button>
                </div>
            </aside>

            // Astryx MobileNav Slide-Over Drawer (Phone <640px & Foldable/Tablet Expand <1024px)
            <Show when=move || state.is_mobile_drawer_open.get()>
                <div class="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation">
                    <div
                        class="fixed inset-0 bg-black/55 backdrop-blur-xs"
                        on:click=move |_| state.is_mobile_drawer_open.set(false)
                    />
                    <aside class="relative z-10 w-[300px] max-w-[85vw] h-full ax-surface border-r flex flex-col shadow-2xl pl-safe">
                        <div class="h-14 px-4 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80">
                            <div class="flex items-center gap-2.5">
                                <img src="/logo.svg" alt="DSM Helper" class="w-8 h-8 rounded-lg" />
                                <div>
                                    <div class="text-sm font-bold">"DSM Helper"</div>
                                    <div class="text-[11px] font-medium text-sky-600 dark:text-sky-400">"Pure Rust"</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label="Close navigation"
                                on:click=move |_| state.is_mobile_drawer_open.set(false)
                                class="p-2 ax-btn-secondary text-xs cursor-pointer"
                            >
                                "✕"
                            </button>
                        </div>
                        <nav aria-label="Mobile Navigation" class="flex-1 overflow-y-auto p-3 no-scrollbar">
                            {render_drawer_nav}
                        </nav>
                        <div class="p-3 border-t border-slate-200/70 dark:border-slate-800/80 flex gap-2">
                            <button
                                type="button"
                                on:click=move |_| state.toggle_language()
                                class="flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                            >
                                {move || if state.language.get() == Language::Vi { "Tiếng Việt" } else { "English" }}
                            </button>
                            <button
                                type="button"
                                on:click=move |_| state.cycle_theme()
                                class="flex-1 py-2 ax-btn-secondary text-xs font-semibold cursor-pointer"
                            >
                                {move || match state.theme.get() {
                                    ThemeMode::System => "⚙ Auto",
                                    ThemeMode::Light => "☀ Light",
                                    ThemeMode::Dark => "🌙 Dark",
                                    ThemeMode::Gemini => "✦ Gemini",
                                }}
                            </button>
                        </div>
                    </aside>
                </div>
            </Show>
        </>
    }
}

#[component]
pub fn Header() -> impl IntoView {
    let state = expect_context::<AppState>();

    view! {
        <header class="h-14 shrink-0 ax-surface border-b px-2.5 sm:px-4 lg:px-5 pt-safe flex items-center justify-between gap-2">
            <a
                href="#main-content"
                class="sr-only focus:not-sr-only focus:px-3 focus:py-1.5 ax-btn-primary text-xs font-semibold"
            >
                "Skip to main content"
            </a>

            <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                // Hamburger / Drawer expand for Phone, Foldable & Tablet Portrait (< 1024px)
                <button
                    type="button"
                    aria-label="Menu"
                    on:click=move |_| state.is_mobile_drawer_open.set(true)
                    class="lg:hidden p-2 ax-btn-secondary cursor-pointer shrink-0"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                // Desktop collapse toggle (>= 1024px)
                <button
                    type="button"
                    aria-label="Toggle sidebar"
                    on:click=move |_| state.is_sidebar_collapsed.update(|c| *c = !*c)
                    class="hidden lg:flex p-2 ax-btn-secondary cursor-pointer shrink-0"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 6h16M4 12h10M4 18h16" />
                    </svg>
                </button>

                <div class="min-w-0">
                    <h1 class="text-[15px] sm:text-base lg:text-lg font-bold leading-tight truncate">
                        {move || nav_label(state.language.get(), state.active_tab.get())}
                    </h1>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                        {move || {
                            let sess = state.session.get();
                            if sess.is_demo {
                                format!("Demo DS920+ • {}", sess.host)
                            } else if sess.is_connected {
                                format!(
                                    "{} • {}@{}",
                                    state.system_info.get().map(|s| s.model).unwrap_or_else(|| "Synology".to_string()),
                                    sess.account,
                                    sess.host
                                )
                            } else {
                                tr(state.language.get(), "Chưa kết nối tới NAS", "Not connected to NAS").to_string()
                            }
                        }}
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
                // Live telemetry pill (xl desktop)
                <Show when=move || state.session.get().is_connected && state.utilization.get().is_some()>
                    {move || {
                        let u = state.utilization.get().unwrap_or_default();
                        view! {
                            <div class="hidden xl:flex items-center gap-2.5 px-3 py-1.5 ax-tile text-xs font-medium ax-tabular">
                                <span>{format!("CPU {:.0}%", u.cpu_total)}</span>
                                <span class="opacity-40">"•"</span>
                                <span>{format!("RAM {:.0}%", u.ram_percent)}</span>
                                <span class="opacity-40">"•"</span>
                                <span class="text-sky-600 dark:text-sky-400">{format!("↓ {}", format_speed(u.net_rx_bps))}</span>
                            </div>
                        }
                    }}
                </Show>

                // Experience Mode pill (hidden on narrow phone, visible Foldable/Tablet/Desktop)
                <button
                    type="button"
                    on:click=move |_| state.toggle_experience()
                    class="hidden sm:inline-flex items-center px-2.5 py-1.5 ax-btn-secondary text-xs font-semibold cursor-pointer"
                >
                    {move || exp_label(state.language.get(), state.experience_mode.get())}
                </button>

                // Theme quick cycle button (compact icon on Phone, full text on sm+)
                <button
                    type="button"
                    on:click=move |_| state.cycle_theme()
                    title="Theme: Auto / Light / Dark / Gemini"
                    class="px-2 sm:px-2.5 py-1.5 ax-btn-secondary text-xs font-semibold cursor-pointer"
                >
                    <span class="sm:hidden">
                        {move || match state.theme.get() {
                            ThemeMode::System => "⚙",
                            ThemeMode::Light => "☀",
                            ThemeMode::Dark => "🌙",
                            ThemeMode::Gemini => "✦",
                        }}
                    </span>
                    <span class="hidden sm:inline">
                        {move || match state.theme.get() {
                            ThemeMode::System => "⚙ Auto",
                            ThemeMode::Light => "☀ Light",
                            ThemeMode::Dark => "🌙 Dark",
                            ThemeMode::Gemini => "✦ Gemini",
                        }}
                    </span>
                </button>

                // VI / EN switch
                <button
                    type="button"
                    on:click=move |_| state.toggle_language()
                    class="px-2 sm:px-2.5 py-1.5 ax-btn-secondary text-xs font-bold cursor-pointer"
                >
                    {move || state.language.get().code().to_uppercase()}
                </button>

                // Notifications bell
                <button
                    type="button"
                    on:click=move |_| state.set_tab(NavTab::Notifications)
                    class="relative p-2 ax-btn-secondary cursor-pointer"
                    aria-label="Notifications"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    <Show when={move || state.unread_notifications() > 0}>
                        <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ax-tabular">
                            {move || state.unread_notifications()}
                        </span>
                    </Show>
                </button>

                // Power button when connected (sm+ so phone topbar stays spacious)
                <Show when=move || state.session.get().is_connected>
                    <button
                        type="button"
                        on:click=move |_| state.is_power_modal_open.set(true)
                        class="hidden sm:flex p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                        title="Power"
                        aria-label="Power"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0" />
                        </svg>
                    </button>
                </Show>

                // Connect / Account button
                <button
                    type="button"
                    on:click=move |_| state.is_login_modal_open.set(true)
                    class="px-2.5 sm:px-3 py-1.5 ax-btn-primary text-xs font-semibold cursor-pointer"
                >
                    {move || {
                        let sess = state.session.get();
                        let lang = state.language.get();
                        if sess.is_demo {
                            "Demo".to_string()
                        } else if sess.is_connected {
                            sess.account
                        } else {
                            tr(lang, "Kết nối", "Connect").to_string()
                        }
                    }}
                </button>
            </div>
        </header>
    }
}

#[component]
pub fn NasTabBar() -> impl IntoView {
    let state = expect_context::<AppState>();

    view! {
        <div class="ax-surface border-b px-2.5 sm:px-4 lg:px-5 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                "NAS:"
            </span>
            {move || {
                let profiles = state.saved_profiles.get();
                let active_host = state.dsm_config.get().host;
                profiles
                    .into_iter()
                    .map(move |prof| {
                        let is_sel = prof.host == active_host && state.session.get().is_connected;
                        let cls = if is_sel {
                            "px-2.5 py-1 ax-btn-primary text-xs font-semibold shrink-0 cursor-pointer"
                        } else {
                            "px-2.5 py-1 ax-btn-secondary text-xs font-medium shrink-0 cursor-pointer"
                        };
                        let label = prof.label.clone();
                        view! {
                            <button
                                type="button"
                                class=cls
                                on:click=move |_| {
                                    state.dsm_config.update(|c| {
                                        c.host = prof.host.clone();
                                        c.port = prof.port;
                                        c.https = prof.https;
                                        c.account = prof.account.clone();
                                    });
                                    state.is_login_modal_open.set(true);
                                }
                            >
                                {label}
                            </button>
                        }
                    })
                    .collect_view()
            }}
            <button
                type="button"
                on:click=move |_| state.is_login_modal_open.set(true)
                class="px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 hover:text-sky-600 shrink-0 cursor-pointer"
            >
                {move || tr(state.language.get(), "+ Thêm NAS", "+ Add NAS")}
            </button>
        </div>
    }
}

#[component]
pub fn BottomNav() -> impl IntoView {
    let state = expect_context::<AppState>();

    view! {
        <nav
            aria-label="Mobile Bottom Navigation"
            class="sm:hidden fixed bottom-0 inset-x-0 z-40 ax-surface border-t pb-safe px-1 py-1 grid grid-cols-5 gap-0.5 shadow-lg"
        >
            {QUICK_TABS
                .iter()
                .copied()
                .map(|tab| {
                    let cls = move || {
                        if state.active_tab.get() == tab {
                            "flex flex-col items-center justify-center py-1.5 rounded-lg ax-nav-item-active"
                        } else {
                            "flex flex-col items-center justify-center py-1.5 rounded-lg ax-nav-item"
                        }
                    };
                    view! {
                        <button
                            type="button"
                            class=cls
                            aria-current=move || if state.active_tab.get() == tab { Some("page") } else { None }
                            on:click=move |_| state.set_tab(tab)
                        >
                            <NavIcon tab=tab />
                            <span class="text-[10px] font-medium mt-0.5 leading-tight text-center truncate max-w-full px-0.5">
                                {move || bottom_nav_label(state.language.get(), tab)}
                            </span>
                        </button>
                    }
                })
                .collect_view()}
        </nav>
    }
}

#[component]
pub fn AuthRequiredGate(tab: NavTab) -> impl IntoView {
    let state = expect_context::<AppState>();

    view! {
        <div class="min-h-[60vh] flex items-center justify-center p-3 sm:p-6">
            <div class="max-w-md w-full ax-card p-6 sm:p-8 text-center">
                <div class="w-14 h-14 mx-auto mb-4 rounded-xl ax-tile flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <NavIcon tab=tab />
                </div>
                <h2 class="text-lg sm:text-xl font-bold mb-2">
                    {move || nav_label(state.language.get(), tab)}
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {move || tr(
                        state.language.get(),
                        "Vui lòng kết nối Synology NAS thật hoặc bật Chế độ Demo DS920+ để xem và thao tác dữ liệu trực tiếp.",
                        "Connect to a real Synology NAS or activate DS920+ Demo Mode to explore telemetry and controls.",
                    )}
                </p>
                <div class="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                        type="button"
                        on:click=move |_| state.is_login_modal_open.set(true)
                        class="px-5 py-2.5 ax-btn-primary text-sm font-semibold cursor-pointer"
                    >
                        {move || tr(state.language.get(), "Đăng nhập Synology NAS", "Sign in to Synology NAS")}
                    </button>
                    <button
                        type="button"
                        on:click=move |_| state.enter_demo_mode()
                        class="px-5 py-2.5 ax-btn-secondary text-sm font-semibold cursor-pointer"
                    >
                        {move || tr(state.language.get(), "Thử nghiệm Demo (DS920+)", "Try Demo NAS (DS920+)")}
                    </button>
                </div>
            </div>
        </div>
    }
}

#[component]
pub fn ToastBanner() -> impl IntoView {
    let state = expect_context::<AppState>();

    view! {
        <Show when=move || state.toast.get().is_some()>
            {move || {
                let (msg, ok) = state.toast.get().unwrap_or_default();
                let cls = if ok {
                    "fixed top-16 right-3 sm:right-5 z-[60] max-w-sm px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-xl"
                } else {
                    "fixed top-16 right-3 sm:right-5 z-[60] max-w-sm px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-semibold shadow-xl"
                };
                view! {
                    <div class=cls role="status" aria-live="polite">
                        {msg}
                    </div>
                }
            }}
        </Show>
    }
}
