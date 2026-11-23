import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const impactMap: Record<string, ImpactStyle> = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: impactMap[style] ?? ImpactStyle.Medium });
      return;
    } catch {
      // Fall through to web
    }
  }

  // Web vibration API fallback
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const duration = style === 'light' ? 10 : style === 'medium' ? 25 : 45;
    navigator.vibrate(duration);
  }
}

export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const typeMap: Record<string, NotificationType> = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] ?? NotificationType.Success });
      return;
    } catch {
      // Fall through
    }
  }

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    if (type === 'success') navigator.vibrate([15, 50, 15]);
    if (type === 'warning') navigator.vibrate([30, 80, 30]);
    if (type === 'error') navigator.vibrate([50, 100, 50, 100, 50]);
  }
}

export async function hapticSelection(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
      return;
    } catch {
      // Fall through
    }
  }

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(8);
  }
}
