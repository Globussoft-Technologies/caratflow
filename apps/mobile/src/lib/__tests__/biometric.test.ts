import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  isBiometricAvailable,
  authenticateWithBiometric,
  loadBiometricSettings,
  saveBiometricSettings,
  DEFAULT_BIOMETRIC_SETTINGS,
  BIOMETRIC_SETTINGS_KEY,
} from '../biometric';

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

describe('isBiometricAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns available + FaceID when hardware is enrolled with facial recognition', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(true);
    vi.mocked(
      LocalAuthentication.supportedAuthenticationTypesAsync,
    ).mockResolvedValueOnce([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    const result = await isBiometricAvailable();
    expect(result).toEqual({ available: true, type: 'FaceID' });
  });

  it('returns Fingerprint when only fingerprint is supported', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(true);
    vi.mocked(
      LocalAuthentication.supportedAuthenticationTypesAsync,
    ).mockResolvedValueOnce([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);

    const result = await isBiometricAvailable();
    expect(result).toEqual({ available: true, type: 'Fingerprint' });
  });

  it('returns not-available when no hardware', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(
      false,
    );
    const result = await isBiometricAvailable();
    expect(result).toEqual({ available: false, type: 'None' });
  });

  it('returns not-available when not enrolled', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(false);
    const result = await isBiometricAvailable();
    expect(result).toEqual({ available: false, type: 'None' });
  });

  it('returns not-available on thrown error', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockRejectedValueOnce(
      new Error('boom'),
    );
    const result = await isBiometricAvailable();
    expect(result).toEqual({ available: false, type: 'None' });
  });
});

describe('authenticateWithBiometric', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the reason to authenticateAsync and returns success', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({
      success: true,
    } as never);

    const result = await authenticateWithBiometric('Confirm sale of INR 1,000');

    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: 'Confirm sale of INR 1,000',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('returns { success: false, error } when authentication fails', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    } as never);

    const result = await authenticateWithBiometric('reason');
    expect(result).toEqual({ success: false, error: 'user_cancel' });
  });

  it('returns { success: false } when authenticateAsync throws', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockRejectedValueOnce(
      new Error('native_crash'),
    );
    const result = await authenticateWithBiometric('reason');
    expect(result.success).toBe(false);
    expect(result.error).toBe('native_crash');
  });

  it('returns a generic error when the failure shape has no error field', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({
      success: false,
    } as never);
    const result = await authenticateWithBiometric('reason');
    expect(result).toEqual({
      success: false,
      error: 'authentication_failed',
    });
  });
});

describe('biometric settings persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when nothing is stored', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null);
    const result = await loadBiometricSettings();
    expect(result).toEqual(DEFAULT_BIOMETRIC_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const next = { enabled: true, thresholdPaise: 7500000 };
    await saveBiometricSettings(next);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      BIOMETRIC_SETTINGS_KEY,
      JSON.stringify(next),
    );

    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(
      JSON.stringify(next),
    );
    const loaded = await loadBiometricSettings();
    expect(loaded).toEqual(next);
  });

  it('falls back to defaults on parse errors', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('not-json');
    const result = await loadBiometricSettings();
    expect(result).toEqual(DEFAULT_BIOMETRIC_SETTINGS);
  });
});
