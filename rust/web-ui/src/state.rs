use leptos::prelude::*;
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;

use crate::mock_data;
use crate::models::{
    DsmConfig, DsmSession, ExperienceMode, Language, NasProfile, NavTab, NotificationItem,
    SystemInfo, SystemUtilization, ThemeMode, UtilSample,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedSessionV2 {
    session: DsmSession,
    config: DsmConfig,
    expiry: u64,
}

#[derive(Clone, Copy)]
pub struct AppState {
    pub active_tab: RwSignal<NavTab>,
    pub language: RwSignal<Language>,
    pub theme: RwSignal<ThemeMode>,
    pub experience_mode: RwSignal<ExperienceMode>,
    pub session: RwSignal<DsmSession>,
    pub dsm_config: RwSignal<DsmConfig>,
    pub saved_profiles: RwSignal<Vec<NasProfile>>,
    pub system_info: RwSignal<Option<SystemInfo>>,
    pub utilization: RwSignal<Option<SystemUtilization>>,
    pub util_history: RwSignal<Vec<UtilSample>>,
    pub notifications: RwSignal<Vec<NotificationItem>>,
    pub is_login_modal_open: RwSignal<bool>,
    pub is_power_modal_open: RwSignal<bool>,
    pub is_ai_chat_open: RwSignal<bool>,
    pub show_ai_chat_bubble: RwSignal<bool>,
    pub ai_messages: RwSignal<Vec<crate::models::AiChatMessage>>,
    pub ai_provider: RwSignal<String>,
    pub ai_api_key: RwSignal<String>,
    pub ai_model: RwSignal<String>,
    pub ai_custom_base_url: RwSignal<String>,
    pub is_mobile_drawer_open: RwSignal<bool>,
    pub is_sidebar_collapsed: RwSignal<bool>,
    pub telemetry_error: RwSignal<Option<String>>,
    pub toast: RwSignal<Option<(String, bool)>>,
    pub demo_tick: RwSignal<u64>,
}

fn storage_get(key: &str) -> Option<String> {
    let win = web_sys::window()?;
    let ls = win.local_storage().ok().flatten()?;
    ls.get_item(key).ok().flatten()
}

fn storage_set(key: &str, val: &str) {
    if let Some(win) = web_sys::window()
        && let Ok(Some(ls)) = win.local_storage()
    {
        let _ = ls.set_item(key, val);
    }
}

fn storage_remove(key: &str) {
    if let Some(win) = web_sys::window()
        && let Ok(Some(ls)) = win.local_storage()
    {
        let _ = ls.remove_item(key);
    }
}

fn now_ms() -> u64 {
    js_sys_now_ms()
}

fn js_sys_now_ms() -> u64 {
    web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| (p.time_origin() + p.now()) as u64)
        .unwrap_or(1_760_000_000_000)
}

pub fn apply_theme_to_dom(mode: ThemeMode) {
    let Some(win) = web_sys::window() else {
        return;
    };
    let Some(doc) = win.document() else {
        return;
    };
    let Some(el) = doc.document_element() else {
        return;
    };
    let classes = el.class_list();
    let prefers_dark = win
        .match_media("(prefers-color-scheme: dark)")
        .ok()
        .flatten()
        .is_some_and(|m| m.matches());

    match mode {
        ThemeMode::Light => {
            let _ = classes.remove_2("dark", "gemini");
        }
        ThemeMode::Dark => {
            let _ = classes.add_1("dark");
            let _ = classes.remove_1("gemini");
        }
        ThemeMode::Gemini => {
            let _ = classes.add_2("dark", "gemini");
        }
        ThemeMode::System => {
            if prefers_dark {
                let _ = classes.add_2("dark", "gemini");
            } else {
                let _ = classes.remove_2("dark", "gemini");
            }
        }
    }
}

fn initial_tab_from_url() -> NavTab {
    let Some(win) = web_sys::window() else {
        return NavTab::Dashboard;
    };
    let search = win.location().search().unwrap_or_default();
    for pair in search.trim_start_matches('?').split('&') {
        if let Some((k, v)) = pair.split_once('=')
            && k == "tab"
            && let Some(tab) = NavTab::from_id(v)
        {
            return tab;
        }
    }
    NavTab::Dashboard
}

pub fn copy_to_clipboard(text: &str) {
    if let Some(win) = web_sys::window() {
        let clip = win.navigator().clipboard();
        let _ = clip.write_text(text);
    }
}

pub fn trigger_html_download(filename: &str, content: &str) {
    let Some(win) = web_sys::window() else {
        return;
    };
    let Some(doc) = win.document() else {
        return;
    };
    let Ok(el) = doc.create_element("a") else {
        return;
    };
    let Ok(anchor) = el.dyn_into::<web_sys::HtmlAnchorElement>() else {
        return;
    };
    let encoded = crate::api::encode_uri_component(content);
    anchor.set_href(&format!("data:text/html;charset=utf-8,{encoded}"));
    anchor.set_download(filename);
    if let Some(body) = doc.body() {
        let _ = body.append_child(&anchor);
        anchor.click();
        let _ = body.remove_child(&anchor);
    }
}

impl AppState {
    pub fn init() -> Self {
        let theme = storage_get("dsm_theme")
            .map(|s| ThemeMode::from_id(&s))
            .unwrap_or(ThemeMode::System);
        apply_theme_to_dom(theme);

        let language = storage_get("dsm_lang")
            .map(|s| Language::from_code(&s))
            .unwrap_or(Language::Vi);
        let experience_mode = storage_get("dsm_experience_mode")
            .map(|s| ExperienceMode::from_id(&s))
            .unwrap_or(ExperienceMode::Beginner);
        let show_ai_bubble = storage_get("dsm_show_ai_bubble")
            .map(|s| s == "true")
            .unwrap_or(true);
        let ai_provider = storage_get("dsm_ai_provider").unwrap_or_else(|| "gemini".to_string());

        let profiles: Vec<NasProfile> = storage_get("dsm_nas_profiles")
            .and_then(|s| serde_json::from_str(&s).ok())
            .filter(|v: &Vec<NasProfile>| !v.is_empty())
            .unwrap_or_else(mock_data::demo_profiles);

        let mut init_session = DsmSession::default();
        let mut init_config = DsmConfig::default();
        if let Some(raw) = storage_get("dsm_session_v2")
            && let Ok(persisted) = serde_json::from_str::<PersistedSessionV2>(&raw)
        {
            if persisted.expiry > now_ms() && persisted.session.is_connected {
                init_session = persisted.session;
                init_config = persisted.config;
            } else {
                storage_remove("dsm_session_v2");
            }
        }

        let ai_api_key = storage_get(&format!("dsm_ai_key_{ai_provider}")).unwrap_or_default();
        let ai_model = storage_get(&format!("dsm_ai_model_{ai_provider}"))
            .unwrap_or_else(|| "gemini-2.0-flash".to_string());
        let ai_custom_base_url =
            storage_get(&format!("dsm_ai_base_{ai_provider}")).unwrap_or_default();

        Self {
            active_tab: RwSignal::new(initial_tab_from_url()),
            language: RwSignal::new(language),
            theme: RwSignal::new(theme),
            experience_mode: RwSignal::new(experience_mode),
            session: RwSignal::new(init_session),
            dsm_config: RwSignal::new(init_config),
            saved_profiles: RwSignal::new(profiles),
            system_info: RwSignal::new(None),
            utilization: RwSignal::new(None),
            util_history: RwSignal::new(Vec::new()),
            notifications: RwSignal::new(Vec::new()),
            is_login_modal_open: RwSignal::new(false),
            is_power_modal_open: RwSignal::new(false),
            is_ai_chat_open: RwSignal::new(false),
            show_ai_chat_bubble: RwSignal::new(show_ai_bubble),
            ai_messages: RwSignal::new(Vec::new()),
            ai_provider: RwSignal::new(ai_provider),
            ai_api_key: RwSignal::new(ai_api_key),
            ai_model: RwSignal::new(ai_model),
            ai_custom_base_url: RwSignal::new(ai_custom_base_url),
            is_mobile_drawer_open: RwSignal::new(false),
            is_sidebar_collapsed: RwSignal::new(false),
            telemetry_error: RwSignal::new(None),
            toast: RwSignal::new(None),
            demo_tick: RwSignal::new(0),
        }
    }

    pub fn set_tab(&self, tab: NavTab) {
        self.active_tab.set(tab);
        self.is_mobile_drawer_open.set(false);
        if let Some(win) = web_sys::window() {
            win.scroll_to_with_x_and_y(0.0, 0.0);
        }
    }

    pub fn set_theme(&self, mode: ThemeMode) {
        self.theme.set(mode);
        storage_set("dsm_theme", mode.id());
        apply_theme_to_dom(mode);
    }

    pub fn cycle_theme(&self) {
        let next = match self.theme.get_untracked() {
            ThemeMode::Light => ThemeMode::Dark,
            ThemeMode::Dark => ThemeMode::Gemini,
            ThemeMode::Gemini | ThemeMode::System => ThemeMode::Light,
        };
        self.set_theme(next);
    }

    pub fn toggle_language(&self) {
        let next = match self.language.get_untracked() {
            Language::Vi => Language::En,
            Language::En => Language::Vi,
        };
        self.language.set(next);
        storage_set("dsm_lang", next.code());
    }

    pub fn set_language(&self, lang: Language) {
        self.language.set(lang);
        storage_set("dsm_lang", lang.code());
    }

    pub fn toggle_experience(&self) {
        let next = match self.experience_mode.get_untracked() {
            ExperienceMode::Beginner => ExperienceMode::Advance,
            ExperienceMode::Advance => ExperienceMode::Beginner,
        };
        self.set_experience(next);
    }

    pub fn set_experience(&self, mode: ExperienceMode) {
        self.experience_mode.set(mode);
        storage_set("dsm_experience_mode", mode.id());
    }

    pub fn show_toast(&self, msg: impl Into<String>, ok: bool) {
        self.toast.set(Some((msg.into(), ok)));
        let toast_sig = self.toast;
        leptos::task::spawn_local(async move {
            gloo_timers::future::TimeoutFuture::new(3500).await;
            toast_sig.set(None);
        });
    }

    pub fn save_ai_settings(&self) {
        let prov = self.ai_provider.get_untracked();
        storage_set("dsm_ai_provider", &prov);
        storage_set(
            &format!("dsm_ai_key_{prov}"),
            &self.ai_api_key.get_untracked(),
        );
        storage_set(
            &format!("dsm_ai_model_{prov}"),
            &self.ai_model.get_untracked(),
        );
        storage_set(
            &format!("dsm_ai_base_{prov}"),
            &self.ai_custom_base_url.get_untracked(),
        );
        storage_set(
            "dsm_show_ai_bubble",
            if self.show_ai_chat_bubble.get_untracked() {
                "true"
            } else {
                "false"
            },
        );
    }

    pub fn enter_demo_mode(&self) {
        let cfg = DsmConfig {
            host: "192.168.1.10".to_string(),
            port: 5001,
            https: true,
            account: "admin".to_string(),
        };
        let sess = DsmSession {
            is_connected: true,
            is_demo: true,
            sid: "demo_sid_pure_rust".to_string(),
            synotoken: "demo_token".to_string(),
            cookie: String::new(),
            account: cfg.account.clone(),
            host: cfg.host.clone(),
            port: cfg.port,
            https: cfg.https,
            saved_until: Some(now_ms() + 7 * 86_400_000),
        };
        self.dsm_config.set(cfg);
        self.session.set(sess);
        self.system_info.set(Some(mock_data::demo_system_info()));
        self.utilization.set(Some(mock_data::demo_utilization(0)));
        self.util_history.set(mock_data::demo_history());
        self.notifications.set(mock_data::demo_notifications());
        self.telemetry_error.set(None);
        self.is_login_modal_open.set(false);

        let lang = self.language.get_untracked();
        let msg = if lang == Language::Vi {
            "Đã kích hoạt Chế độ Demo (DS920+ Pure Rust)"
        } else {
            "Demo Mode Activated (DS920+ Pure Rust)"
        };
        self.show_toast(msg, true);
    }

    pub fn set_live_session(&self, sess: DsmSession, cfg: DsmConfig, remember_7d: bool) {
        if remember_7d {
            let persisted = PersistedSessionV2 {
                session: sess.clone(),
                config: cfg.clone(),
                expiry: now_ms() + 7 * 86_400_000,
            };
            if let Ok(json_str) = serde_json::to_string(&persisted) {
                storage_set("dsm_session_v2", &json_str);
            }
        }
        let mut profiles = self.saved_profiles.get_untracked();
        let pid = format!("nas_{}_{}_{}", cfg.host, cfg.port, cfg.account);
        if !profiles.iter().any(|p| p.id == pid) {
            profiles.push(NasProfile {
                id: pid,
                label: format!("{} ({})", cfg.account, cfg.host),
                host: cfg.host.clone(),
                port: cfg.port,
                https: cfg.https,
                account: cfg.account.clone(),
            });
            if let Ok(p_json) = serde_json::to_string(&profiles) {
                storage_set("dsm_nas_profiles", &p_json);
            }
            self.saved_profiles.set(profiles);
        }
        self.dsm_config.set(cfg);
        self.session.set(sess);
        self.telemetry_error.set(None);
        self.is_login_modal_open.set(false);
    }

    pub fn disconnect(&self) {
        self.session.set(DsmSession::default());
        self.system_info.set(None);
        self.utilization.set(None);
        self.util_history.set(Vec::new());
        storage_remove("dsm_session_v2");
    }

    pub fn unread_notifications(&self) -> usize {
        self.notifications
            .with(|list| list.iter().filter(|n| !n.read).count())
    }
}
