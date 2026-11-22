#![forbid(unsafe_code)]

mod api;
mod components;
mod i18n;
mod icons;
mod mock_data;
mod models;
mod state;

use leptos::prelude::*;

use crate::components::modals::{AiChatBubble, LoginModal, PowerModal};
use crate::components::shell::{
    AuthRequiredGate, BottomNav, Header, NasTabBar, Sidebar, ToastBanner,
};
use crate::components::tabs_analytics::{
    McpDocsTab, NetworkTrafficTab, PermissionInspectorTab, ReportsTab, SnmpTab,
};
use crate::components::tabs_core::{
    FileStationTab, NotificationsTab, OverviewTab, ResourceMonitorTab, ServicesTab, SettingsTab,
    StorageManagerTab,
};
use crate::components::tabs_ops::{
    DockerTab, DownloadStationTab, FirewallManagerTab, PackageCenterTab, ReverseProxyTab,
    TerminalTab,
};
use crate::models::NavTab;
use crate::state::AppState;

#[component]
fn App() -> impl IntoView {
    let state = AppState::init();
    provide_context(state);

    // Background telemetry refresher (every 2.5s when connected)
    leptos::task::spawn_local(async move {
        loop {
            gloo_timers::future::TimeoutFuture::new(2500).await;
            let sess = state.session.get_untracked();
            if !sess.is_connected {
                continue;
            }
            let util = if sess.is_demo {
                let tick = state.demo_tick.get_untracked().wrapping_add(1);
                state.demo_tick.set(tick);
                Some(mock_data::demo_utilization(tick))
            } else {
                let cfg = state.dsm_config.get_untracked();
                api::fetch_live_utilization(&sess, &cfg).await.ok()
            };
            if let Some(u) = util {
                let sample = crate::models::UtilSample {
                    cpu: u.cpu_total,
                    ram: u.ram_percent,
                    rx_kbps: (u.net_rx_bps as f64) / 1024.0,
                    tx_kbps: (u.net_tx_bps as f64) / 1024.0,
                };
                state.utilization.set(Some(u));
                state.util_history.update(|h| {
                    h.push(sample);
                    if h.len() > 36 {
                        h.remove(0);
                    }
                });
            }
        }
    });

    // If restored live session exists on boot, populate initial info once
    {
        let sess = state.session.get_untracked();
        if sess.is_connected && !sess.is_demo {
            let cfg = state.dsm_config.get_untracked();
            leptos::task::spawn_local(async move {
                if let Ok(info) = api::fetch_live_system_info(&sess, &cfg).await {
                    state.system_info.set(Some(info));
                }
            });
        }
    }

    let render_tab = move || {
        let tab = state.active_tab.get();
        let connected = state.session.get().is_connected;

        if tab.requires_auth() && !connected {
            return view! { <AuthRequiredGate tab=tab /> }.into_any();
        }

        match tab {
            NavTab::Dashboard => view! { <OverviewTab /> }.into_any(),
            NavTab::Monitor => view! { <ResourceMonitorTab /> }.into_any(),
            NavTab::Snmp => view! { <SnmpTab /> }.into_any(),
            NavTab::Traffic => view! { <NetworkTrafficTab /> }.into_any(),
            NavTab::Files => view! { <FileStationTab /> }.into_any(),
            NavTab::Permissions => view! { <PermissionInspectorTab /> }.into_any(),
            NavTab::Docker => view! { <DockerTab /> }.into_any(),
            NavTab::Download => view! { <DownloadStationTab /> }.into_any(),
            NavTab::Storage => view! { <StorageManagerTab /> }.into_any(),
            NavTab::Packages => view! { <PackageCenterTab /> }.into_any(),
            NavTab::Services => view! { <ServicesTab /> }.into_any(),
            NavTab::ReverseProxy => view! { <ReverseProxyTab /> }.into_any(),
            NavTab::Firewall => view! { <FirewallManagerTab /> }.into_any(),
            NavTab::Notifications => view! { <NotificationsTab /> }.into_any(),
            NavTab::Reports => view! { <ReportsTab /> }.into_any(),
            NavTab::Terminal => view! { <TerminalTab /> }.into_any(),
            NavTab::Mcp => view! { <McpDocsTab /> }.into_any(),
            NavTab::Settings => view! { <SettingsTab /> }.into_any(),
        }
    };

    view! {
        <div class="flex h-screen w-full max-w-full overflow-hidden ax-body transition-colors">
            <Sidebar />
            <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden pr-safe">
                <Header />
                <NasTabBar />
                <main
                    id="main-content"
                    tabindex="-1"
                    class="flex-1 min-h-0 p-2.5 sm:p-4 lg:p-5 w-full max-w-full overflow-y-auto overflow-x-hidden pb-[76px] sm:pb-6"
                >
                    <div class="w-full max-w-[1720px] mx-auto min-w-0">
                        {render_tab}
                    </div>
                </main>
            </div>
            <BottomNav />
            <LoginModal />
            <PowerModal />
            <AiChatBubble />
            <ToastBanner />
        </div>
    }
}

fn main() {
    console_error_panic_hook::set_once();
    leptos::mount::mount_to_body(App);
}
