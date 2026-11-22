import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function setOledStatusBar(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('[StatusBar] Failed to set OLED style:', err);
    }
  }
}
