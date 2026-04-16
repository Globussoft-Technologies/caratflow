// ─── Storefront Constants ────────────────────────────────────

export const STORE_NAME = "CaratFlow";
export const STORE_TAGLINE = "Crafting Elegance, Delivering Trust";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const STORE_API = `${API_BASE_URL}/api/v1/store`;
export const AUTH_API = `${API_BASE_URL}/api/v1/b2c/auth`;
export const CRM_API = `${API_BASE_URL}/api/v1/crm`;

// Default tenant for the public storefront. Real B2C signups create
// customers under this tenant. Staff tenants use a different path.
export const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "sharma-jewellers";
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "731c8b36-6045-401b-857a-f03b2cfc1a99";

export const CURRENCY_CODE = "INR";
export const CURRENCY_SYMBOL = "\u20B9";
export const CURRENCY_LOCALE = "en-IN";

export const GST_RATE_JEWELRY = 3;
export const GST_RATE_MAKING = 5;

export const PURITY_OPTIONS = [
  { value: 999, label: "24K (999)", karat: 24 },
  { value: 916, label: "22K (916)", karat: 22 },
  { value: 750, label: "18K (750)", karat: 18 },
  { value: 585, label: "14K (585)", karat: 14 },
] as const;

export const METAL_TYPES = [
  { value: "GOLD", label: "Gold", icon: "sparkles" },
  { value: "SILVER", label: "Silver", icon: "sparkles" },
  { value: "DIAMOND", label: "Diamond", icon: "gem" },
  { value: "PLATINUM", label: "Platinum", icon: "sparkles" },
  { value: "GEMSTONE", label: "Gemstone", icon: "gem" },
  { value: "KUNDAN", label: "Kundan", icon: "sparkles" },
] as const;

export const CATEGORIES = [
  { name: "Rings", slug: "rings", image: "/categories/rings.jpg" },
  { name: "Necklaces", slug: "necklaces", image: "/categories/necklaces.jpg" },
  { name: "Earrings", slug: "earrings", image: "/categories/earrings.jpg" },
  { name: "Bangles", slug: "bangles", image: "/categories/bangles.jpg" },
  { name: "Bracelets", slug: "bracelets", image: "/categories/bracelets.jpg" },
  { name: "Pendants", slug: "pendants", image: "/categories/pendants.jpg" },
  { name: "Chains", slug: "chains", image: "/categories/chains.jpg" },
  { name: "Mangalsutra", slug: "mangalsutra", image: "/categories/mangalsutra.jpg" },
  { name: "Nose Pins", slug: "nose-pins", image: "/categories/nose-pins.jpg" },
  { name: "Anklets", slug: "anklets", image: "/categories/anklets.jpg" },
] as const;

export const OCCASIONS = [
  { name: "Wedding", slug: "wedding", image: "/occasions/wedding.jpg" },
  { name: "Engagement", slug: "engagement", image: "/occasions/engagement.jpg" },
  { name: "Daily Wear", slug: "daily-wear", image: "/occasions/daily-wear.jpg" },
  { name: "Festive", slug: "festive", image: "/occasions/festive.jpg" },
  { name: "Office Wear", slug: "office-wear", image: "/occasions/office-wear.jpg" },
  { name: "Party", slug: "party", image: "/occasions/party.jpg" },
] as const;

export const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "weight_asc", label: "Weight: Light to Heavy" },
  { value: "weight_desc", label: "Weight: Heavy to Light" },
] as const;

export const GENDER_OPTIONS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Kids" },
] as const;

export const PAYMENT_METHODS = [
  { id: "razorpay", name: "Razorpay", icon: "/payments/razorpay.svg" },
  { id: "upi", name: "UPI", icon: "/payments/upi.svg" },
  { id: "card", name: "Credit/Debit Card", icon: "/payments/card.svg" },
  { id: "netbanking", name: "Net Banking", icon: "/payments/netbanking.svg" },
  { id: "emi", name: "EMI", icon: "/payments/emi.svg" },
] as const;

export const LOYALTY_TIERS = {
  bronze: { name: "Bronze", minPoints: 0, color: "#CD7F32", discount: 0 },
  silver: { name: "Silver", minPoints: 5000, color: "#C0C0C0", discount: 2 },
  gold: { name: "Gold", minPoints: 15000, color: "#D4A853", discount: 5 },
  platinum: { name: "Platinum", minPoints: 50000, color: "#E5E4E2", discount: 8 },
} as const;
