import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createElement, useEffect } from "react";
import StoreProvider from "@/components/StoreProvider";
import { useStore, type StoreState } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";

// Helper to access store state from inside provider
function createStoreTest(callback: (store: StoreState) => void) {
  function TestComponent() {
    const store = useStore();
    useEffect(() => {
      callback(store);
    });
    return null;
  }
  render(
    createElement(StoreProvider, null, createElement(TestComponent))
  );
}

let capturedStore: StoreState;

function StoreCapture() {
  capturedStore = useStore();
  return null;
}

function renderWithStore() {
  return render(
    createElement(StoreProvider, null, createElement(StoreCapture))
  );
}

describe("Store - Cart", () => {
  beforeEach(() => {
    renderWithStore();
  });

  it("starts with empty cart", () => {
    expect(capturedStore.cartItems).toHaveLength(0);
    expect(capturedStore.cartCount).toBe(0);
  });

  it("adds item to cart", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    expect(capturedStore.cartItems).toHaveLength(1);
    expect(capturedStore.cartItems[0]!.product.id).toBe(mockProducts[0]!.id);
  });

  it("increments quantity when adding same product", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 2);
    });
    expect(capturedStore.cartItems).toHaveLength(1);
    expect(capturedStore.cartItems[0]!.quantity).toBe(3);
  });

  it("treats different sizes as separate items", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1, "7");
    });
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1, "8");
    });
    expect(capturedStore.cartItems).toHaveLength(2);
  });

  it("removes item from cart", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    const itemId = capturedStore.cartItems[0]!.id;
    act(() => {
      capturedStore.removeFromCart(itemId);
    });
    expect(capturedStore.cartItems).toHaveLength(0);
  });

  it("updates cart quantity", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    const itemId = capturedStore.cartItems[0]!.id;
    act(() => {
      capturedStore.updateCartQuantity(itemId, 5);
    });
    expect(capturedStore.cartItems[0]!.quantity).toBe(5);
  });

  it("removes item when quantity set to 0", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    const itemId = capturedStore.cartItems[0]!.id;
    act(() => {
      capturedStore.updateCartQuantity(itemId, 0);
    });
    expect(capturedStore.cartItems).toHaveLength(0);
  });

  it("clears entire cart", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
      capturedStore.addToCart(mockProducts[1]!, 2);
    });
    act(() => {
      capturedStore.clearCart();
    });
    expect(capturedStore.cartItems).toHaveLength(0);
    expect(capturedStore.cartCount).toBe(0);
  });

  it("computes cartCount as sum of quantities", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 2);
    });
    act(() => {
      capturedStore.addToCart(mockProducts[1]!, 3);
    });
    expect(capturedStore.cartCount).toBe(5);
  });

  it("opens cart drawer when adding item", () => {
    act(() => {
      capturedStore.addToCart(mockProducts[0]!, 1);
    });
    expect(capturedStore.isCartDrawerOpen).toBe(true);
  });
});

describe("Store - Wishlist", () => {
  beforeEach(() => {
    renderWithStore();
  });

  it("starts with empty wishlist", () => {
    expect(capturedStore.wishlistIds.size).toBe(0);
    expect(capturedStore.wishlistCount).toBe(0);
  });

  it("adds product to wishlist via toggle", () => {
    act(() => {
      capturedStore.toggleWishlist("prod-001");
    });
    expect(capturedStore.isInWishlist("prod-001")).toBe(true);
    expect(capturedStore.wishlistCount).toBe(1);
  });

  it("removes product from wishlist via toggle", () => {
    act(() => {
      capturedStore.toggleWishlist("prod-001");
    });
    act(() => {
      capturedStore.toggleWishlist("prod-001");
    });
    expect(capturedStore.isInWishlist("prod-001")).toBe(false);
    expect(capturedStore.wishlistCount).toBe(0);
  });

  it("isInWishlist returns false for non-wishlisted product", () => {
    expect(capturedStore.isInWishlist("nonexistent")).toBe(false);
  });
});

describe("Store - Compare", () => {
  beforeEach(() => {
    renderWithStore();
  });

  it("starts with empty compare list", () => {
    expect(capturedStore.compareIds).toHaveLength(0);
  });

  it("adds product to compare", () => {
    act(() => {
      capturedStore.addToCompare("prod-001");
    });
    expect(capturedStore.isInCompare("prod-001")).toBe(true);
    expect(capturedStore.compareIds).toHaveLength(1);
  });

  it("removes product from compare", () => {
    act(() => {
      capturedStore.addToCompare("prod-001");
    });
    act(() => {
      capturedStore.removeFromCompare("prod-001");
    });
    expect(capturedStore.isInCompare("prod-001")).toBe(false);
  });

  it("enforces max 4 compare limit", () => {
    act(() => {
      capturedStore.addToCompare("prod-001");
      capturedStore.addToCompare("prod-002");
      capturedStore.addToCompare("prod-003");
      capturedStore.addToCompare("prod-004");
    });
    act(() => {
      capturedStore.addToCompare("prod-005");
    });
    expect(capturedStore.compareIds).toHaveLength(4);
    expect(capturedStore.isInCompare("prod-005")).toBe(false);
  });

  it("does not add duplicate to compare", () => {
    act(() => {
      capturedStore.addToCompare("prod-001");
    });
    act(() => {
      capturedStore.addToCompare("prod-001");
    });
    expect(capturedStore.compareIds).toHaveLength(1);
  });
});
