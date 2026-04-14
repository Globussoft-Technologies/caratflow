// ─── Biometric Authentication Helper ────────────────────────────
// Thin wrapper around expo-local-authentication for CaratFlow Sales.
// Gates high-value actions (POS sale, loyalty redemption, refund auth)
// behind Face ID / Touch ID / fingerprint / iris, falling back to the
// device passcode when biometrics are unavailable or not enrolled.

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricType =
  | 'FaceID'
  | 'Fingerprint'
  | 'Iris'
  | 'None';

export interface BiometricAvailability {
  available: boolean;
  type: BiometricType;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/** Persisted per-user biometric preferences. */
export interface BiometricSettings {
  /** When true, sales >= thresholdPaise require biometric authentication. */
  enabled: boolean;
  /** Threshold in paise. Default 50,00,000 paise = INR 50,000.00. */
  thresholdPaise: number;
}

export const DEFAULT_BIOMETRIC_SETTINGS: BiometricSettings = {
  enabled: false,
  thresholdPaise: 50_000_00, // INR 50,000
};

/** SecureStore key for biometric settings JSON. */
export const BIOMETRIC_SETTINGS_KEY = 'biometric_settings';

/**
 * Detect whether the device supports biometric auth and has an enrolled
 * identity (face, finger, iris).
 */
export async function isBiometricAvailable(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { available: false, type: 'None' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, type: 'None' };

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const type = pickPreferredType(types);
    return { available: true, type };
  } catch {
    return { available: false, type: 'None' };
  }
}

function pickPreferredType(
  types: LocalAuthentication.AuthenticationType[],
): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
    return 'FaceID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    return 'Fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS))
    return 'Iris';
  return 'None';
}

/**
 * Prompt the user for biometric confirmation. Falls back to the device
 * passcode when biometrics fail or aren't available.
 */
export async function authenticateWithBiometric(
  reason: string,
): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) return { success: true };

    // expo-local-authentication returns an error code on failure.
    const error =
      'error' in result && typeof result.error === 'string'
        ? result.error
        : 'authentication_failed';
    return { success: false, error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return { success: false, error: message };
  }
}

/** Load biometric settings from SecureStore, with defaults when absent. */
export async function loadBiometricSettings(): Promise<BiometricSettings> {
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_BIOMETRIC_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<BiometricSettings>;
    return {
      enabled: Boolean(parsed.enabled ?? false),
      thresholdPaise:
        typeof parsed.thresholdPaise === 'number' && parsed.thresholdPaise >= 0
          ? parsed.thresholdPaise
          : DEFAULT_BIOMETRIC_SETTINGS.thresholdPaise,
    };
  } catch {
    return { ...DEFAULT_BIOMETRIC_SETTINGS };
  }
}

/** Persist biometric settings to SecureStore. */
export async function saveBiometricSettings(
  settings: BiometricSettings,
): Promise<void> {
  await SecureStore.setItemAsync(
    BIOMETRIC_SETTINGS_KEY,
    JSON.stringify(settings),
  );
}
