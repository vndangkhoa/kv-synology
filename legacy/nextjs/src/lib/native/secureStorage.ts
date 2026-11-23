import { Capacitor } from '@capacitor/core';
import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlocked);
      return;
    } catch (err) {
      console.warn('[SecureStorage] Native set failed, falling back to localStorage:', err);
    }
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`sec_${key}`, btoa(encodeURIComponent(value)));
    } catch (err) {
      console.error('[SecureStorage] localStorage set failed:', err);
    }
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await SecureStorage.get(key);
      if (typeof res === 'string') return res;
      if (res !== null && res !== undefined) return String(res);
      return null;
    } catch {
      // Key may not exist in native store
    }
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sec_${key}`);
      if (!raw) return null;
      return decodeURIComponent(atob(raw));
    } catch {
      return null;
    }
  }

  return null;
}

export async function removeSecureItem(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStorage.remove(key);
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`sec_${key}`);
    } catch {
      // Ignore
    }
  }
}
