// ─── App Store (Zustand) ────────────────────────────────────────

import { create } from 'zustand';
import type { WeightUnit } from '@/utils/weight';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'en' | 'hi' | 'gu' | 'mr' | 'ta';

interface AppState {
  theme: ThemeMode;
  language: Language;
  offlineMode: boolean;
  pendingOfflineCount: number;
  weightUnit: WeightUnit;
  currencyCode: string;

  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  setOfflineMode: (offline: boolean) => void;
  setPendingOfflineCount: (count: number) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setCurrencyCode: (code: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  language: 'en',
  offlineMode: false,
  pendingOfflineCount: 0,
  weightUnit: 'g',
  currencyCode: 'INR',

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setOfflineMode: (offlineMode) => set({ offlineMode }),
  setPendingOfflineCount: (pendingOfflineCount) => set({ pendingOfflineCount }),
  setWeightUnit: (weightUnit) => set({ weightUnit }),
  setCurrencyCode: (currencyCode) => set({ currencyCode }),
}));
