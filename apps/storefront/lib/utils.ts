// ─── Storefront Utilities ────────────────────────────────────

import { CURRENCY_LOCALE, CURRENCY_SYMBOL, GST_RATE_JEWELRY } from "./constants";
import type { Product } from "./types";

/** Format paise to INR display string */
export function formatPrice(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Format number with Indian grouping (1,23,456) */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE).format(num);
}

/** Calculate product total price in paise */
export function calculateProductPrice(product: Product): {
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  subtotal: number;
  gst: number;
  total: number;
} {
  const metalValue = Math.round(product.netWeightGrams * product.metalRatePerGram * 100);

  let makingCharges: number;
  switch (product.makingChargesType) {
    case "per_gram":
      makingCharges = Math.round(product.netWeightGrams * product.makingChargesValue * 100);
      break;
    case "percentage":
      makingCharges = Math.round((metalValue * product.makingChargesValue) / 100);
      break;
    case "flat":
      makingCharges = Math.round(product.makingChargesValue * 100);
      break;
  }

  const stoneCharges = Math.round(product.stoneTotalPrice * 100);
  const subtotal = metalValue + makingCharges + stoneCharges;
  const gst = Math.round((subtotal * GST_RATE_JEWELRY) / 100);
  const total = subtotal + gst;

  return { metalValue, makingCharges, stoneCharges, subtotal, gst, total };
}

/** Format price from rupees (not paise) for display */
export function formatRupees(amount: number): string {
  return `${CURRENCY_SYMBOL}${new Intl.NumberFormat(CURRENCY_LOCALE).format(Math.round(amount))}`;
}

/** Truncate text with ellipsis */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "...";
}

/** Generate placeholder image URL */
export function placeholderImage(width: number, height: number, text?: string): string {
  const label = text ?? `${width}x${height}`;
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='100%25' height='100%25' fill='%23F0F0EC'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23B8903F'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

/** Join classnames, filtering out falsy values */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Format date for display */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format relative time */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Generate random ID */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
