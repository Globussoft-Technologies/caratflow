"use client";

// ─── Client-side Store (Zustand-like with React state) ──────
// Lightweight cart/wishlist/compare store using React context
// Will migrate to Zustand when the package is added

import { createContext, useContext } from "react";
import type { CartItem, Product } from "./types";

export interface StoreState {
  // Cart
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (product: Product, quantity?: number, size?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  couponDiscount: number;
  setCouponDiscount: (paise: number) => void;

  // Wishlist
  wishlistIds: Set<string>;
  wishlistCount: number;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Compare
  compareIds: string[];
  addToCompare: (productId: string) => void;
  removeFromCompare: (productId: string) => void;
  isInCompare: (productId: string) => boolean;

  // UI State
  isCartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const StoreContext = createContext<StoreState | null>(null);

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
