import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { render } from "@testing-library/react";
import CheckoutPage from "@/app/checkout/page";
import StoreProvider from "@/components/StoreProvider";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";
import { renderWithStore } from "../../components/__tests__/test-utils";

vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

function CheckoutWithItems() {
  const store = useStore();
  useEffect(() => {
    store.addToCart(mockProducts[0]!, 1, "7");
    store.setCartDrawerOpen(false);
  }, []);
  return createElement(CheckoutPage);
}

function renderCheckout(withItems = false) {
  if (withItems) {
    return render(
      createElement(StoreProvider, null, createElement(CheckoutWithItems))
    );
  }
  return renderWithStore(createElement(CheckoutPage));
}

describe("CheckoutPage", () => {
  it("shows empty state when no items in cart", () => {
    renderCheckout(false);
    expect(screen.getByText("Nothing to Checkout")).toBeInTheDocument();
  });

  it("shows shipping step first", () => {
    renderCheckout(true);
    expect(screen.getByText("Shipping Address")).toBeInTheDocument();
  });

  it("shows step indicators", () => {
    renderCheckout(true);
    // Use getAllByText since "Shipping" appears in both steps and heading
    expect(screen.getAllByText("Shipping").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
  });

  it("shows existing addresses", () => {
    renderCheckout(true);
    // Multiple addresses show "Priya Sharma"
    expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThanOrEqual(1);
  });

  it("shows order summary sidebar", () => {
    renderCheckout(true);
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
  });

  it("has Continue to Review button", () => {
    renderCheckout(true);
    expect(screen.getByText("Continue to Review")).toBeInTheDocument();
  });
});
