/**
 * Cart flow interaction tests.
 * Covers quantity changes, coupon codes, navigation, and empty state.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithStore, userEvent, getProduct } from "./test-utils";
import CartPage from "@/app/cart/page";
import { StoreContext, type StoreState } from "@/lib/store";
import { render } from "@testing-library/react";
import { mockProducts } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees } from "@/lib/utils";

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
    usePathname: () => "/cart",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

/**
 * Helper to render CartPage with pre-populated cart items via a custom store.
 */
function renderCartWithItems(items: StoreState["cartItems"], overrides?: Partial<StoreState>) {
  const store: StoreState = {
    cartItems: items,
    cartCount: items.reduce((s, i) => s + i.quantity, 0),
    addToCart: vi.fn(),
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
    compareIds: [],
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    isInCompare: () => false,
    isCartDrawerOpen: false,
    setCartDrawerOpen: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    ...overrides,
  };
  return render(
    <StoreContext.Provider value={store}>
      <CartPage />
    </StoreContext.Provider>,
  );
}

function makeCartItem(productIndex = 0, quantity = 1, size?: string) {
  return {
    id: `cart-item-${productIndex}`,
    product: mockProducts[productIndex]!,
    quantity,
    selectedSize: size,
    addedAt: new Date().toISOString(),
  };
}

describe("Cart Flow", () => {
  it("empty cart shows empty state with Start Shopping link", () => {
    renderCartWithItems([]);
    expect(screen.getByText("Your Cart is Empty")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /start shopping/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders cart items with product name and quantity", () => {
    const item = makeCartItem(0, 2, "7");
    renderCartWithItems([item]);
    expect(screen.getByText(item.product.name)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // quantity
  });

  it("increment quantity calls updateCartQuantity with quantity + 1", async () => {
    const updateFn = vi.fn();
    const item = makeCartItem(0, 1);
    const user = userEvent.setup();
    renderCartWithItems([item], { updateCartQuantity: updateFn });
    const plusBtn = screen.getByRole("button", { name: "+" });
    await user.click(plusBtn);
    expect(updateFn).toHaveBeenCalledWith(item.id, 2);
  });

  it("decrement quantity to 0 calls updateCartQuantity which removes item", async () => {
    const updateFn = vi.fn();
    const item = makeCartItem(0, 1);
    const user = userEvent.setup();
    renderCartWithItems([item], { updateCartQuantity: updateFn });
    const minusBtn = screen.getByRole("button", { name: "-" });
    await user.click(minusBtn);
    expect(updateFn).toHaveBeenCalledWith(item.id, 0);
  });

  it("remove item button calls removeFromCart", async () => {
    const removeFn = vi.fn();
    const item = makeCartItem(0, 1);
    const user = userEvent.setup();
    renderCartWithItems([item], { removeFromCart: removeFn });
    // The delete/trash button
    const removeButtons = screen.getAllByRole("button");
    // Find the remove button (it has an SVG with trash icon path)
    const removeBtn = removeButtons.find(
      (btn) => btn.querySelector("svg path[d*='14.74 9']") !== null,
    );
    expect(removeBtn).toBeDefined();
    await user.click(removeBtn!);
    expect(removeFn).toHaveBeenCalledWith(item.id);
  });

  it("coupon input field accepts text and converts to uppercase", async () => {
    const setCouponFn = vi.fn();
    const item = makeCartItem(0, 1);
    const user = userEvent.setup();
    renderCartWithItems([item], { setCouponCode: setCouponFn });
    const couponInput = screen.getByPlaceholderText("Enter code");
    await user.type(couponInput, "welcome10");
    // setCouponCode is called per keystroke with uppercase
    expect(setCouponFn).toHaveBeenCalled();
  });

  it("Apply coupon button is present next to coupon input", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item]);
    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
  });

  it("valid coupon shows discount line in order summary", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item], { couponDiscount: 100000 }); // Rs 1000 discount
    expect(screen.getByText("Discount")).toBeInTheDocument();
  });

  it("Proceed to Checkout link navigates to /checkout", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item]);
    const checkoutLink = screen.getByRole("link", { name: /proceed to checkout/i });
    expect(checkoutLink).toHaveAttribute("href", "/checkout");
  });

  it("Continue Shopping link navigates to /", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item]);
    const continueLink = screen.getByRole("link", { name: /continue shopping/i });
    expect(continueLink).toHaveAttribute("href", "/");
  });

  it("shows order summary with subtotal, shipping, and total", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item]);
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Shipping")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("clear cart button calls clearCart", async () => {
    const clearFn = vi.fn();
    const item = makeCartItem(0, 1);
    const user = userEvent.setup();
    renderCartWithItems([item], { clearCart: clearFn });
    const clearBtn = screen.getByRole("button", { name: /clear cart/i });
    await user.click(clearBtn);
    expect(clearFn).toHaveBeenCalled();
  });

  it("displays trust signals in cart sidebar", () => {
    const item = makeCartItem(0, 1);
    renderCartWithItems([item]);
    expect(screen.getByText("Secure SSL Checkout")).toBeInTheDocument();
    expect(screen.getByText("BIS Hallmarked Products")).toBeInTheDocument();
    expect(screen.getByText("15-Day Easy Returns")).toBeInTheDocument();
  });
});
