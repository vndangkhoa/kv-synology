import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'none';
  hasEnrolled: boolean;
}

export async function checkBiometrics(): Promise<BiometricStatus> {
  if (!Capacitor.isNativePlatform()) {
    return {
      isAvailable: false,
      biometryType: 'none',
      hasEnrolled: false,
    };
  }

  try {
    const info = await BiometricAuth.checkBiometry();
    let typeName: BiometricStatus['biometryType'] = 'none';

    if (info.biometryType === BiometryType.faceId || info.biometryType === BiometryType.faceAuthentication) {
      typeName = 'faceId';
    } else if (info.biometryType === BiometryType.touchId || info.biometryType === BiometryType.fingerprintAuthentication) {
      typeName = 'touchId';
    }

    return {
      isAvailable: info.isAvailable,
      biometryType: typeName,
      hasEnrolled: info.isAvailable,
    };
  } catch (err) {
    console.warn('[Biometrics] Check failed:', err);
    return {
      isAvailable: false,
      biometryType: 'none',
      hasEnrolled: false,
    };
  }
}

export async function authenticateWithBiometrics(reason: string = 'Xác thực bảo mật Synology'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true; // Bypass on standard browser
  }

  try {
    const status = await checkBiometrics();
    if (!status.isAvailable) {
      return true; // No hardware biometrics enrolled
    }

    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Hủy',
    });
    return true;
  } catch (err) {
    console.warn('[Biometrics] Auth failed:', err);
    return false;
  }
}
