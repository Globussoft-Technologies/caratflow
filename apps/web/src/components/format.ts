/**
 * Shared formatting helpers used across admin list/detail pages.
 * Money fields come back as BigInt-serialized-strings or numbers.
 */

export function formatPaise(value: unknown, currency = 'INR'): string {
  if (value === null || value === undefined || value === '') return '-';
  let n: number;
  if (typeof value === 'bigint') n = Number(value);
  else if (typeof value === 'string') n = Number(value);
  else if (typeof value === 'number') n = value;
  else return '-';
  if (Number.isNaN(n)) return '-';
  return (n / 100).toLocaleString('en-IN', { style: 'currency', currency });
}

export function formatMg(value: unknown, unit: 'g' | 'mg' = 'g'): string {
  if (value === null || value === undefined || value === '') return '-';
  let n: number;
  if (typeof value === 'bigint') n = Number(value);
  else if (typeof value === 'string') n = Number(value);
  else if (typeof value === 'number') n = value;
  else return '-';
  if (Number.isNaN(n)) return '-';
  if (unit === 'mg') return `${n.toLocaleString('en-IN')} mg`;
  return `${(n / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })} g`;
}

export function formatDate(value: unknown): string {
  if (!value) return '-';
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

export function formatDateTime(value: unknown): string {
  if (!value) return '-';
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}
