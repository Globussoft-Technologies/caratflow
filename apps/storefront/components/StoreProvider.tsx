"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { StoreContext, type StoreState } from "@/lib/store";
import type { CartItem, Product } from "@/lib/types";
import { generateId } from "@/lib/utils";

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount] = useState(0);

  const addToCart = useCallback((product: Product, quantity = 1, size?: string) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedSize === size
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: generateId(),
          product,
          quantity,
          selectedSize: size,
          addedAt: new Date().toISOString(),
        },
      ];
    });
    setCartDrawerOpen(true);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.has(productId),
    [wishlistIds]
  );

  const addToCompare = useCallback((productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) return prev;
      if (prev.length >= 4) return prev;
      return [...prev, productId];
    });
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const isInCompare = useCallback(
    (productId: string) => compareIds.includes(productId),
    [compareIds]
  );

  const store: StoreState = useMemo(
    () => ({
      cartItems,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      couponCode,
      setCouponCode,
      couponDiscount,
      wishlistIds,
      wishlistCount: wishlistIds.size,
      toggleWishlist,
      isInWishlist,
      compareIds,
      addToCompare,
      removeFromCompare,
      isInCompare,
      isCartDrawerOpen,
      setCartDrawerOpen,
      searchQuery,
      setSearchQuery,
    }),
    [
      cartItems,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      couponCode,
      couponDiscount,
      wishlistIds,
      toggleWishlist,
      isInWishlist,
      compareIds,
      addToCompare,
      removeFromCompare,
      isInCompare,
      isCartDrawerOpen,
      searchQuery,
    ]
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
