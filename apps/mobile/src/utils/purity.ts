// ─── Lightweight Purity Utility for Mobile ──────────────────────

const KARAT_FINENESS_MAP: Record<number, number> = {
  24: 999,
  22: 916,
  18: 750,
  14: 585,
};

const FINENESS_KARAT_MAP: Record<number, number> = {};
for (const [k, v] of Object.entries(KARAT_FINENESS_MAP)) {
  FINENESS_KARAT_MAP[Number(v)] = parseInt(k, 10);
}

export function finenessToKaratLabel(fineness: number): string {
  const karat = FINENESS_KARAT_MAP[fineness];
  if (karat !== undefined) {
    return `${karat}K (${fineness})`;
  }
  return `${fineness} fineness`;
}

export function finenessToPercentage(fineness: number): number {
  return fineness / 10;
}
