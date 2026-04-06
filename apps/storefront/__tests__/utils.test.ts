import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatNumber,
  calculateProductPrice,
  formatRupees,
  truncate,
  placeholderImage,
  cn,
  debounce,
  formatDate,
  timeAgo,
  generateId,
} from "@/lib/utils";
import type { Product } from "@/lib/types";
import { mockProducts } from "@/lib/mock-data";

// ─── formatPrice ────────────────────────────────────────────────

describe("formatPrice", () => {
  it("formats paise to INR with rupee symbol", () => {
    const result = formatPrice(12345600);
    expect(result).toContain("1,23,456");
  });

  it("formats zero paise", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
  });

  it("formats small amounts correctly", () => {
    const result = formatPrice(100);
    expect(result).toContain("1");
  });

  it("uses Indian grouping for large amounts", () => {
    // 1,00,00,000 = 1 crore = 10000000 paise = Rs 100000
    const result = formatPrice(1000000000);
    expect(result).toContain("1,00,00,000");
  });

  it("rounds to whole rupees (no decimal)", () => {
    const result = formatPrice(999);
    // 999 paise = ~10 rupees (9.99 rounded)
    expect(result).not.toContain(".");
  });
});

// ─── formatNumber ───────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats with Indian grouping", () => {
    expect(formatNumber(123456)).toBe("1,23,456");
  });

  it("formats small numbers without grouping", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

// ─── calculateProductPrice ──────────────────────────────────────

describe("calculateProductPrice", () => {
  it("calculates metal value correctly (per_gram making charges)", () => {
    const product = mockProducts.find((p) => p.makingChargesType === "per_gram")!;
    const price = calculateProductPrice(product);
    const expectedMetalValue = Math.round(product.netWeightGrams * product.metalRatePerGram * 100);
    expect(price.metalValue).toBe(expectedMetalValue);
  });

  it("calculates per_gram making charges correctly", () => {
    const product = mockProducts.find((p) => p.makingChargesType === "per_gram")!;
    const price = calculateProductPrice(product);
    const expectedMaking = Math.round(product.netWeightGrams * product.makingChargesValue * 100);
    expect(price.makingCharges).toBe(expectedMaking);
  });

  it("calculates flat making charges correctly", () => {
    // prod-012 uses flat making charges
    const product = mockProducts.find((p) => p.makingChargesType === "flat")!;
    const price = calculateProductPrice(product);
    expect(price.makingCharges).toBe(Math.round(product.makingChargesValue * 100));
  });

  it("calculates stone charges from product", () => {
    const product = mockProducts.find((p) => p.stoneTotalPrice > 0)!;
    const price = calculateProductPrice(product);
    expect(price.stoneCharges).toBe(Math.round(product.stoneTotalPrice * 100));
  });

  it("calculates GST at 3% of subtotal", () => {
    const product = mockProducts[0]!;
    const price = calculateProductPrice(product);
    const expectedGst = Math.round((price.subtotal * 3) / 100);
    expect(price.gst).toBe(expectedGst);
  });

  it("total equals subtotal + gst", () => {
    const product = mockProducts[0]!;
    const price = calculateProductPrice(product);
    expect(price.total).toBe(price.subtotal + price.gst);
  });

  it("subtotal equals metal + making + stone", () => {
    const product = mockProducts[0]!;
    const price = calculateProductPrice(product);
    expect(price.subtotal).toBe(price.metalValue + price.makingCharges + price.stoneCharges);
  });

  it("returns all positive values for a valid product", () => {
    const product = mockProducts[0]!;
    const price = calculateProductPrice(product);
    expect(price.metalValue).toBeGreaterThan(0);
    expect(price.makingCharges).toBeGreaterThanOrEqual(0);
    expect(price.subtotal).toBeGreaterThan(0);
    expect(price.gst).toBeGreaterThan(0);
    expect(price.total).toBeGreaterThan(0);
  });
});

// ─── formatRupees ───────────────────────────────────────────────

describe("formatRupees", () => {
  it("formats with rupee symbol", () => {
    const result = formatRupees(50000);
    expect(result).toContain("\u20B9");
    expect(result).toContain("50,000");
  });

  it("rounds to nearest rupee", () => {
    const result = formatRupees(1234.56);
    expect(result).toContain("1,235");
  });
});

// ─── truncate ───────────────────────────────────────────────────

describe("truncate", () => {
  it("returns full string if under limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world foo", 10)).toBe("hello worl...");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

// ─── placeholderImage ───────────────────────────────────────────

describe("placeholderImage", () => {
  it("returns SVG data URI", () => {
    const url = placeholderImage(400, 300);
    expect(url).toContain("data:image/svg+xml");
    expect(url).toContain("400");
    expect(url).toContain("300");
  });

  it("includes custom text", () => {
    const url = placeholderImage(100, 100, "Test");
    expect(url).toContain("Test");
  });
});

// ─── cn ─────────────────────────────────────────────────────────

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string for no classes", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

// ─── debounce ───────────────────────────────────────────────────

describe("debounce", () => {
  it("delays function execution", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("resets timer on subsequent calls", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

// ─── formatDate ─────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-03-15T10:30:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("2026");
  });
});

// ─── timeAgo ────────────────────────────────────────────────────

describe("timeAgo", () => {
  it("returns minutes ago for recent dates", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

// ─── generateId ─────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("returns non-empty string", () => {
    expect(generateId().length).toBeGreaterThan(0);
  });
});
