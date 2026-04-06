import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { render } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import StoreProvider from "@/components/StoreProvider";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";
import { renderWithStore } from "../../components/__tests__/test-utils";

vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

function CartPageWithItems() {
  const store = useStore();
  useEffect(() => {
    store.addToCart(mockProducts[0]!, 1);
    store.setCartDrawerOpen(false);
  }, []);
  return createElement(CartPage);
}

function renderCartPage(withItems = false) {
  if (withItems) {
    return render(
      createElement(StoreProvider, null, createElement(CartPageWithItems))
    );
  }
  return renderWithStore(createElement(CartPage));
}

describe("CartPage", () => {
  it("shows empty cart state when no items", () => {
    renderCartPage(false);
    expect(screen.getByText("Your Cart is Empty")).toBeInTheDocument();
  });

  it("shows Start Shopping link when empty", () => {
    renderCartPage(false);
    expect(screen.getByText("Start Shopping")).toBeInTheDocument();
  });

  it("renders cart items when items present", () => {
    renderCartPage(true);
    expect(screen.getByText(/Shopping Cart/)).toBeInTheDocument();
    expect(screen.getByText(mockProducts[0]!.name)).toBeInTheDocument();
  });

  it("shows coupon input", () => {
    renderCartPage(true);
    expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });

  it("shows order summary", () => {
    renderCartPage(true);
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("shows checkout button", () => {
    renderCartPage(true);
    expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument();
  });
});
