// ─── Scan Bridge Store ───────────────────────────────────────────
// Carries the result of a barcode scan from the modal scanner screen
// back to the screen that requested it (POS / Stock check).

import { create } from 'zustand';

export type ScanIntent = 'pos' | 'stock' | null;

interface ScanState {
  intent: ScanIntent;
  result: { data: string; type: string } | null;
  request: (intent: ScanIntent) => void;
  setResult: (data: string, type: string) => void;
  consume: () => { data: string; type: string } | null;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  intent: null,
  result: null,
  request: (intent) => set({ intent, result: null }),
  setResult: (data, type) => set({ result: { data, type } }),
  consume: () => {
    const r = get().result;
    set({ result: null });
    return r;
  },
  reset: () => set({ intent: null, result: null }),
}));
