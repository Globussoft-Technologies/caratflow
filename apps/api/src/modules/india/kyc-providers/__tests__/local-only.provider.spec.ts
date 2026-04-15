import { describe, it, expect } from 'vitest';
import { LocalOnlyKycProvider } from '../local-only.provider';

describe('LocalOnlyKycProvider', () => {
  const provider = new LocalOnlyKycProvider();

  it('never claims Aadhaar is verified', async () => {
    const result = await provider.verifyAadhaar('123456789012', 'Ravi');
    expect(result.verified).toBe(false);
    expect(result.source).toBe('local');
    expect(result.errorCode).toBe('NO_PROVIDER');
  });

  it('never claims PAN is verified', async () => {
    const result = await provider.verifyPan('ABCDE1234F');
    expect(result.verified).toBe(false);
    expect(result.source).toBe('local');
    expect(result.errorCode).toBe('NO_PROVIDER');
  });

  it('generateAadhaarOtp returns a synthetic local refId', async () => {
    const handle = await provider.generateAadhaarOtp('123456789012');
    expect(handle.refId).toMatch(/^LOCAL-/);
  });

  it('confirmAadhaarOtp never claims verification', async () => {
    const result = await provider.confirmAadhaarOtp('LOCAL-1', '0000');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('NO_PROVIDER');
  });
});
