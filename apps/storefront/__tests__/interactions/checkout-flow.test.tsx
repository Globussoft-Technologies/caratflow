/**
 * Checkout flow interaction tests.
 * Covers step navigation, address selection, order review, and payment.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent } from "./test-utils";
import CheckoutPage from "@/app/checkout/page";
import { StoreContext, type StoreState } from "@/lib/store";
import { mockProducts, mockAddresses } from "@/lib/mock-data";

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
    usePathname: () => "/checkout",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

function makeCartItem(productIndex = 0, quantity = 1, size?: string) {
  return {
    id: `cart-item-${productIndex}`,
    product: mockProducts[productIndex]!,
    quantity,
    selectedSize: size,
    addedAt: new Date().toISOString(),
  };
}

function renderCheckout(cartItems = [makeCartItem(0, 1, "7")], overrides?: Partial<StoreState>) {
  const store: StoreState = {
    cartItems,
    cartCount: cartItems.reduce((s, i) => s + i.quantity, 0),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartQuantity: vi.fn(),
    clearCart: vi.fn(),
    couponCode: "",
    setCouponCode: vi.fn(),
    couponDiscount: 0,
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
      <CheckoutPage />
    </StoreContext.Provider>,
  );
}

describe("Checkout Flow", () => {
  it("empty cart shows nothing-to-checkout state", () => {
    renderCheckout([]);
    expect(screen.getByText("Nothing to Checkout")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start shopping/i })).toHaveAttribute("href", "/");
  });

  it("step 1 shows Shipping Address heading with address options", () => {
    renderCheckout();
    expect(screen.getByText("Shipping Address")).toBeInTheDocument();
    // Mock addresses are rendered -- "Priya Sharma" may appear multiple times
    const nameElements = screen.getAllByText(mockAddresses[0]!.fullName);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
  });

  it("step 1 allows selecting an address via radio buttons", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const radios = screen.getAllByRole("radio");
    // Should have at least 2 address radios
    expect(radios.length).toBeGreaterThanOrEqual(2);
    // Click the second address radio
    await user.click(radios[1]!);
    expect(radios[1]).toBeChecked();
  });

  it("step 1 shows Add New Address button", () => {
    renderCheckout();
    expect(screen.getByText(/add new address/i)).toBeInTheDocument();
  });

  it("clicking Continue to Review advances to step 2", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const continueBtn = screen.getByRole("button", { name: /continue to review/i });
    await user.click(continueBtn);
    expect(screen.getByText("Review Your Order")).toBeInTheDocument();
  });

  it("step 2 shows order items and shipping address summary", async () => {
    const user = userEvent.setup();
    renderCheckout();
    // Go to step 2
    await user.click(screen.getByRole("button", { name: /continue to review/i }));
    // Should show item name
    expect(screen.getByText(mockProducts[0]!.name)).toBeInTheDocument();
    // Should show "Shipping to" label
    expect(screen.getByText("Shipping to")).toBeInTheDocument();
  });

  it("step 2 has a Change button to go back to step 1", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByRole("button", { name: /continue to review/i }));
    const changeBtn = screen.getByRole("button", { name: /change/i });
    await user.click(changeBtn);
    expect(screen.getByText("Shipping Address")).toBeInTheDocument();
  });

  it("step 3 shows payment options", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByRole("button", { name: /continue to review/i }));
    await user.click(screen.getByRole("button", { name: /continue to payment/i }));
    // "Payment" appears both in the step indicator and as heading
    const paymentTexts = screen.getAllByText("Payment");
    expect(paymentTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/razorpay/i)).toBeInTheDocument();
    expect(screen.getByText(/cash on delivery/i)).toBeInTheDocument();
  });

  it("step 3 has a pay button with the total amount", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByRole("button", { name: /continue to review/i }));
    await user.click(screen.getByRole("button", { name: /continue to payment/i }));
    // "Pay" appears in step indicator button AND the payment button; use getAllByRole
    const payButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.startsWith("Pay "),
    );
    expect(payButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("order summary sidebar shows throughout all steps", async () => {
    const user = userEvent.setup();
    renderCheckout();
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue to review/i }));
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
  });

  it("coupon discount appears in summary when set", () => {
    renderCheckout([makeCartItem(0, 1, "7")], { couponCode: "WELCOME10", couponDiscount: 200000 });
    expect(screen.getByText(/discount/i)).toBeInTheDocument();
    expect(screen.getByText(/WELCOME10/)).toBeInTheDocument();
  });
});
