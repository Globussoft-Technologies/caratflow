// ─── Lightweight Weight Utility for Mobile ──────────────────────
// Mirrors @caratflow/utils WeightUtil for offline/mobile use.

export type WeightUnit = 'mg' | 'g' | 'kg' | 'ct' | 'tola' | 'troy_oz' | 'grain';

const MG_PER_UNIT: Record<WeightUnit, number> = {
  mg: 1,
  g: 1000,
  kg: 1_000_000,
  ct: 200,
  tola: 11_664,
  troy_oz: 31_103.4768,
  grain: 64.79891,
};

const UNIT_LABELS: Record<WeightUnit, string> = {
  mg: 'mg',
  g: 'g',
  kg: 'kg',
  ct: 'ct',
  tola: 'tola',
  troy_oz: 'troy oz',
  grain: 'gr',
};

export function formatWeight(
  milligrams: number,
  displayUnit: WeightUnit = 'g',
  decimalPlaces: number = 3,
): string {
  const value = milligrams / MG_PER_UNIT[displayUnit];
  return `${value.toFixed(decimalPlaces)} ${UNIT_LABELS[displayUnit]}`;
}

export function convertWeight(
  value: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit,
): number {
  const mg = value * MG_PER_UNIT[fromUnit];
  return mg / MG_PER_UNIT[toUnit];
}

export function mgToUnit(milligrams: number, unit: WeightUnit): number {
  return milligrams / MG_PER_UNIT[unit];
}
