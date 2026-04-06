// ─── Storefront Types ────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  metalType: MetalType;
  purity: number;
  purityLabel: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  images: ProductImage[];
  metalRatePerGram: number;
  makingChargesPerGram: number;
  makingChargesType: "per_gram" | "percentage" | "flat";
  makingChargesValue: number;
  stoneDetails: StoneDetail[];
  stoneTotalPrice: number;
  huidNumber?: string;
  gender: "men" | "women" | "unisex" | "kids";
  occasion: string[];
  tags: string[];
  isAvailable: boolean;
  isBestseller: boolean;
  isNew: boolean;
  isTrending: boolean;
  sizes?: ProductSize[];
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  currencyCode: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StoneDetail {
  type: string;
  shape: string;
  weightCarat: number;
  count: number;
  clarity?: string;
  color?: string;
  cut?: string;
  certification?: string;
  price: number;
}

export interface ProductSize {
  id: string;
  label: string;
  value: string;
  isAvailable: boolean;
}

export type MetalType = "GOLD" | "SILVER" | "PLATINUM" | "DIAMOND" | "GEMSTONE" | "KUNDAN";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId?: string;
  children?: Category[];
  productCount: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  addedAt: string;
}

export interface Cart {
  items: CartItem[];
  couponCode?: string;
  couponDiscount: number;
}

export interface WishlistItem {
  id: string;
  product: Product;
  addedAt: string;
  priceAlertEnabled: boolean;
  priceAlertThreshold?: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: Address;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  shippingPaise: number;
  totalPaise: number;
  couponCode?: string;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  trackingNumber?: string;
  trackingUrl?: string;
  timeline: OrderTimelineEntry[];
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  invoiceUrl?: string;
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  pricePaise: number;
  metalRateAtPurchase: number;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  description: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  helpfulCount: number;
}

export interface LoyaltyInfo {
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  tierProgress: number;
  nextTier: string;
  pointsToNextTier: number;
  history: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: "earned" | "redeemed" | "expired";
  points: number;
  description: string;
  date: string;
  orderId?: string;
}

export interface Scheme {
  id: string;
  name: string;
  type: "kitty" | "gold_savings";
  monthlyAmountPaise: number;
  totalMonths: number;
  paidMonths: number;
  totalPaidPaise: number;
  maturityAmountPaise: number;
  bonusMonths: number;
  startDate: string;
  maturityDate: string;
  status: "active" | "matured" | "cancelled";
  installments: SchemeInstallment[];
}

export interface SchemeInstallment {
  month: number;
  dueDate: string;
  amountPaise: number;
  status: "paid" | "due" | "overdue" | "upcoming";
  paidDate?: string;
  transactionId?: string;
}

export interface GoldRate {
  metalType: "GOLD" | "SILVER" | "PLATINUM";
  purity: number;
  ratePerGram: number;
  change24h: number;
  changePercent24h: number;
  updatedAt: string;
  currencyCode: string;
}

export interface DeliveryEstimate {
  pincode: string;
  available: boolean;
  estimatedDays: number;
  estimatedDate: string;
  shippingCostPaise: number;
  codAvailable: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}

export interface FilterState {
  metalType: MetalType[];
  purity: number[];
  priceRange: [number, number];
  weightRange: [number, number];
  gemstone: string[];
  gender: string[];
  occasion: string[];
  availability: "all" | "in_stock";
  sortBy: "price_asc" | "price_desc" | "newest" | "popularity" | "weight_asc" | "weight_desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  bgColor: string;
}
