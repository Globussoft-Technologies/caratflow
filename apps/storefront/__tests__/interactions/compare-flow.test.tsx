/**
 * Compare flow interaction tests.
 * Covers side-by-side comparison, spec rows, add to cart, and remove.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparePage from "@/app/compare/page";
import { StoreContext, type StoreState } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/compare",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

function renderCompare(compareIds: string[], overrides?: Partial<StoreState>) {
  const removeFn = overrides?.removeFromCompare ?? vi.fn();
  const addToCartFn = overrides?.addToCart ?? vi.fn();
  const store: StoreState = {
    cartItems: [],
    cartCount: 0,
    addToCart: addToCartFn,
    removeFromCart: vi.fn(),
    updateCartQuantity: vi.fn(),
    clearCart: vi.fn(),
    couponCode: "",
    setCouponCode: vi.fn(),
    couponDiscount: 0,
    setCouponDiscount: vi.fn(),
    wishlistIds: new Set(),
    wishlistCount: 0,
    toggleWishlist: vi.fn(),
    isInWishlist: () => false,
    compareIds,
    addToCompare: vi.fn(),
    removeFromCompare: removeFn,
    isInCompare: (id) => compareIds.includes(id),
    isCartDrawerOpen: false,
    setCartDrawerOpen: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    ...overrides,
  };
  return render(
    <StoreContext.Provider value={store}>
      <ComparePage />
    </StoreContext.Provider>,
  );
}

describe("Compare Flow", () => {
  it("shows minimum products message when fewer than 2 products selected", () => {
    renderCompare([mockProducts[0]!.id]);
    expect(screen.getByText(/add at least 2 products to compare/i)).toBeInTheDocument();
    expect(screen.getByText(/you have 1 selected/i)).toBeInTheDocument();
  });

  it("renders products side by side when 2+ products are selected", () => {
    const ids = [mockProducts[0]!.id, mockProducts[1]!.id];
    renderCompare(ids);
    expect(screen.getByText("Compare Products (2)")).toBeInTheDocument();
    expect(screen.getByText(mockProducts[0]!.name)).toBeInTheDocument();
    expect(screen.getByText(mockProducts[1]!.name)).toBeInTheDocument();
  });

  it("shows specification rows aligned for both products", () => {
    const ids = [mockProducts[0]!.id, mockProducts[1]!.id];
    renderCompare(ids);
    expect(screen.getByText("Metal Type")).toBeInTheDocument();
    expect(screen.getByText("Purity")).toBeInTheDocument();
    expect(screen.getByText("Gross Weight")).toBeInTheDocument();
    expect(screen.getByText("Net Weight")).toBeInTheDocument();
  });

  it("each product has an Add to Cart button", async () => {
    const addToCartFn = vi.fn();
    const ids = [mockProducts[0]!.id, mockProducts[1]!.id];
    const user = userEvent.setup();
    renderCompare(ids, { addToCart: addToCartFn });
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    expect(addButtons.length).toBe(2);
    await user.click(addButtons[0]!);
    expect(addToCartFn).toHaveBeenCalledWith(mockProducts[0]);
  });

  it("remove button calls removeFromCompare", async () => {
    const removeFn = vi.fn();
    const ids = [mockProducts[0]!.id, mockProducts[1]!.id];
    const user = userEvent.setup();
    renderCompare(ids, { removeFromCompare: removeFn });
    // Find the close/remove buttons (X icons in the header)
    const removeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg path[d*='M6 18L18 6']") !== null,
    );
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);
    await user.click(removeButtons[0]!);
    expect(removeFn).toHaveBeenCalled();
  });
});
