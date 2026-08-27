import { DSMSession, DSMConnectionConfig } from "./dsm/types";

const SESSION_KEY = "dsm_session_v2";
const CREDENTIALS_KEY = "dsm_credentials_v1";
const PROFILES_KEY = "dsm_nas_profiles_v2";
const ACTIVE_PROFILE_KEY = "dsm_active_profile_id";
const SESSION_EXPIRY_DAYS = 7;

export interface NasProfile {
  id: string; // e.g. "nas_192.168.31.71_5001_admin"
  name: string; // User-friendly name e.g. "DS920+ (Chính)"
  host: string;
  port: number;
  https: boolean;
  account: string;
  password?: string; // base64 obfuscated
  ignoreCert?: boolean;
  stay7Days: boolean;
  remember: boolean;
  model?: string;
  versionString?: string;
  lastConnectedAt?: number;
  session?: DSMSession;
  isCurrent?: boolean;
}

export interface PersistedSession {
  session: DSMSession;
  config: DSMConnectionConfig & { host: string; port: number; https: boolean; account: string };
  expiry: number; // ms timestamp
  stayDays: number;
  savedAt: number;
  remember: boolean;
}

export interface PersistedCredentials {
  host: string;
  port: number;
  https: boolean;
  account: string;
  password?: string; // base64 obfuscated
  ignoreCert?: boolean;
  stay7Days: boolean;
  remember: boolean;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function persistSession(
  session: DSMSession,
  config: DSMConnectionConfig,
  opts: { stay7Days: boolean; remember: boolean }
) {
  if (!isBrowser()) return;

  const now = Date.now();

  // Save credentials if remember
  if (opts.remember) {
    const creds: PersistedCredentials = {
      host: config.host,
      port: config.port,
      https: config.https,
      account: config.account,
      password: config.password ? btoa(config.password) : undefined,
      ignoreCert: config.ignoreCert,
      stay7Days: opts.stay7Days,
      remember: true,
    };
    try {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
    } catch {}
  } else {
    try {
      localStorage.removeItem(CREDENTIALS_KEY);
    } catch {}
  }

  // Also sync with Multi-NAS profile registry
  try {
    const profileId = `nas_${config.host.replace(/\./g, "_")}_${config.port}_${config.account}`;
    const profile: NasProfile = {
      id: profileId,
      name: session.hostname ? `${session.hostname} (${session.model || config.host})` : `Synology NAS (${config.host})`,
      host: config.host,
      port: config.port,
      https: config.https,
      account: config.account,
      password: opts.remember && config.password ? btoa(config.password) : undefined,
      ignoreCert: config.ignoreCert,
      stay7Days: opts.stay7Days,
      remember: opts.remember,
      model: session.model || "DS920+",
      versionString: session.versionString || "DSM 7.2.1",
      lastConnectedAt: now,
      session: opts.stay7Days ? { ...session } : undefined,
    };
    saveNasProfile(profile);
  } catch {}

  // Save session if stay7Days
  if (opts.stay7Days) {
    const expiry = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const persisted: PersistedSession = {
      session: { ...session },
      config: {
        host: config.host,
        port: config.port,
        https: config.https,
        account: config.account,
        password: opts.remember && config.password ? config.password : undefined,
        ignoreCert: config.ignoreCert,
      },
      expiry,
      stayDays: SESSION_EXPIRY_DAYS,
      savedAt: now,
      remember: opts.remember,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(persisted));
      // also store expiry separately for quick check
    } catch (e) {
      console.warn("[session] persist failed", e);
    }
  } else {
    // if not stay, ensure no stale session remains
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }
}

export function loadPersistedSession(): PersistedSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: PersistedSession = JSON.parse(raw);
    if (!data.expiry || !data.session) return null;
    if (Date.now() > data.expiry) {
      // expired – cleanup
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (!data.session.isConnected) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function loadPersistedCredentials(): PersistedCredentials | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const data: PersistedCredentials = JSON.parse(raw);
    if (data.password) {
      try {
        data.password = atob(data.password);
      } catch {}
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPersistedSession() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  // do not clear credentials on logout unless user explicitly wants – keep them
}

export function clearPersistedCredentials() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch {}
}

export function getSessionRemainingDays(expiry: number): number {
  const diff = expiry - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function saveCurrentSessionExplicit(session?: DSMSession, config?: DSMConnectionConfig): boolean {
  if (!isBrowser()) return false;
  const now = Date.now();
  const expiry = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  if (session && config) {
    const persisted: PersistedSession = {
      session: { ...session },
      config: {
        host: config.host,
        port: config.port,
        https: config.https,
        account: config.account,
        password: config.password,
        ignoreCert: config.ignoreCert,
      },
      expiry,
      stayDays: SESSION_EXPIRY_DAYS,
      savedAt: now,
      remember: true,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(persisted));
      return true;
    } catch {
      return false;
    }
  }

  const existing = loadPersistedSession();
  if (existing) {
    existing.expiry = expiry;
    existing.savedAt = now;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ----------------------------------------------------
// Multi-NAS Profile Hub Management
// ----------------------------------------------------

export function getNasProfiles(): NasProfile[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      // Migrate legacy single credential if exists
      const legacyCreds = loadPersistedCredentials();
      if (legacyCreds) {
        const defaultProf: NasProfile = {
          id: `nas_${legacyCreds.host.replace(/\./g, "_")}_${legacyCreds.port}_${legacyCreds.account}`,
          name: `Synology NAS (${legacyCreds.host})`,
          host: legacyCreds.host,
          port: legacyCreds.port,
          https: legacyCreds.https,
          account: legacyCreds.account,
          password: legacyCreds.password ? btoa(legacyCreds.password) : undefined,
          ignoreCert: legacyCreds.ignoreCert,
          stay7Days: legacyCreds.stay7Days,
          remember: legacyCreds.remember,
          model: "DS920+",
          versionString: "DSM 7.2.1",
          lastConnectedAt: Date.now(),
        };
        saveNasProfile(defaultProf);
        return [defaultProf];
      }
      return [];
    }
    const profiles: NasProfile[] = JSON.parse(raw);
    const activeId = getActiveProfileId();
    return profiles.map((p) => ({
      ...p,
      isCurrent: p.id === activeId,
    }));
  } catch {
    return [];
  }
}

export function saveNasProfile(profile: NasProfile): void {
  if (!isBrowser()) return;
  try {
    const existing = getNasProfiles();
    const idx = existing.findIndex((p) => p.id === profile.id || (p.host === profile.host && p.port === profile.port && p.account === profile.account));
    let updated: NasProfile[];
    if (idx >= 0) {
      updated = existing.map((p, i) => (i === idx ? { ...p, ...profile } : p));
    } else {
      updated = [...existing, profile];
    }
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
    setActiveProfileId(profile.id);
  } catch (e) {
    console.warn("[session] Failed to save NAS profile", e);
  }
}

export function removeNasProfile(id: string): void {
  if (!isBrowser()) return;
  try {
    const existing = getNasProfiles().filter((p) => p.id !== id);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(existing));
    if (getActiveProfileId() === id) {
      const next = existing[0];
      if (next) {
        setActiveProfileId(next.id);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    }
  } catch {}
}

export function getActiveProfileId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

