import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../app-store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      theme: 'system',
      language: 'en',
      offlineMode: false,
      pendingOfflineCount: 0,
      weightUnit: 'g',
      currencyCode: 'INR',
    });
  });

  it('has correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('system');
    expect(state.language).toBe('en');
    expect(state.offlineMode).toBe(false);
    expect(state.weightUnit).toBe('g');
    expect(state.currencyCode).toBe('INR');
  });

  it('setTheme toggles theme', () => {
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('setLanguage changes language', () => {
    useAppStore.getState().setLanguage('hi');
    expect(useAppStore.getState().language).toBe('hi');

    useAppStore.getState().setLanguage('gu');
    expect(useAppStore.getState().language).toBe('gu');
  });

  it('setOfflineMode toggles offline mode', () => {
    useAppStore.getState().setOfflineMode(true);
    expect(useAppStore.getState().offlineMode).toBe(true);

    useAppStore.getState().setOfflineMode(false);
    expect(useAppStore.getState().offlineMode).toBe(false);
  });

  it('setWeightUnit changes weight unit', () => {
    useAppStore.getState().setWeightUnit('tola');
    expect(useAppStore.getState().weightUnit).toBe('tola');

    useAppStore.getState().setWeightUnit('ct');
    expect(useAppStore.getState().weightUnit).toBe('ct');
  });

  it('setCurrencyCode changes currency', () => {
    useAppStore.getState().setCurrencyCode('USD');
    expect(useAppStore.getState().currencyCode).toBe('USD');

    useAppStore.getState().setCurrencyCode('AED');
    expect(useAppStore.getState().currencyCode).toBe('AED');
  });

  it('setPendingOfflineCount updates count', () => {
    useAppStore.getState().setPendingOfflineCount(5);
    expect(useAppStore.getState().pendingOfflineCount).toBe(5);

    useAppStore.getState().setPendingOfflineCount(0);
    expect(useAppStore.getState().pendingOfflineCount).toBe(0);
  });
});
