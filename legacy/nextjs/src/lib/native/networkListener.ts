import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Network, ConnectionStatus } from '@capacitor/network';

export type NetworkChangeCallback = (status: {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}) => void;

let listenerHandle: PluginListenerHandle | null = null;

export async function initNetworkListener(callback: NetworkChangeCallback): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Get initial status
      const initial = await Network.getStatus();
      callback({
        connected: initial.connected,
        connectionType: initial.connectionType as any,
      });

      // Listen for network changes
      listenerHandle = await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        console.log('[Network] Changed:', status);
        callback({
          connected: status.connected,
          connectionType: status.connectionType as any,
        });
      });

      return () => {
        if (listenerHandle) {
          listenerHandle.remove();
          listenerHandle = null;
        }
      };
    } catch (err) {
      console.warn('[Network] Native listener error:', err);
    }
  }

  // Web fallback using window online/offline
  if (typeof window !== 'undefined') {
    const handleOnline = () => callback({ connected: true, connectionType: 'unknown' });
    const handleOffline = () => callback({ connected: false, connectionType: 'none' });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    callback({ connected: navigator.onLine, connectionType: 'unknown' });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
}
