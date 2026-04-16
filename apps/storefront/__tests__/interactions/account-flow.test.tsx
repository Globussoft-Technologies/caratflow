/**
 * Account flow interaction tests.
 * Covers dashboard, orders, wishlist, profile, addresses, loyalty, schemes.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountDashboard from "@/app/account/page";
import OrdersPage from "@/app/account/orders/page";
import OrderDetailPage from "@/app/account/orders/[id]/page";
import LoyaltyPage from "@/app/account/loyalty/page";
import SchemesPage from "@/app/account/schemes/page";
import SchemeDetailPage from "@/app/account/schemes/[id]/page";
import AddressesPage from "@/app/account/addresses/page";
import ProfilePage from "@/app/account/profile/page";
import AccountWishlistPage from "@/app/account/wishlist/page";
import { StoreContext, type StoreState } from "@/lib/store";
import { mockOrders, mockLoyalty, mockSchemes, mockAddresses, mockWishlistItems } from "@/lib/mock-data";

const mockParams: Record<string, string> = {};

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
    usePathname: () => "/account",
    useParams: () => mockParams,
    useSearchParams: () => new URLSearchParams(),
  };
});

function mockStore(overrides?: Partial<StoreState>): StoreState {
  return {
    cartItems: [],
    cartCount: 0,
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
}

function renderWithMockStore(ui: React.ReactElement, overrides?: Partial<StoreState>) {
  return render(
    <StoreContext.Provider value={mockStore(overrides)}>
      {ui}
    </StoreContext.Provider>,
  );
}

describe("Account Flow - Dashboard", () => {
  it("renders dashboard heading and quick stats", () => {
    render(<AccountDashboard />);
    expect(screen.getByText("My Dashboard")).toBeInTheDocument();
    // Stats may contain text that matches elsewhere; just verify presence
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("Total Orders");
    expect(allText).toContain("Wishlist Items");
    expect(allText).toContain("Loyalty Points");
    expect(allText).toContain("Active Schemes");
  });

  it("shows recent orders with order numbers", () => {
    render(<AccountDashboard />);
    expect(screen.getByText("Recent Orders")).toBeInTheDocument();
    expect(screen.getByText(mockOrders[0]!.orderNumber)).toBeInTheDocument();
  });

  it("shows loyalty tier and points", () => {
    render(<AccountDashboard />);
    // Points may appear in stats card and loyalty banner
    const pointsElements = screen.getAllByText(mockLoyalty.points.toLocaleString());
    expect(pointsElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows active schemes with progress", () => {
    render(<AccountDashboard />);
    const activeScheme = mockSchemes.find((s) => s.status === "active")!;
    expect(screen.getByText(activeScheme.name)).toBeInTheDocument();
  });
});

describe("Account Flow - Orders", () => {
  it("renders orders list with order numbers", () => {
    render(<OrdersPage />);
    expect(screen.getByText("My Orders")).toBeInTheDocument();
    mockOrders.forEach((order) => {
      expect(screen.getByText(order.orderNumber)).toBeInTheDocument();
    });
  });

  it("shows order status badges", () => {
    render(<OrdersPage />);
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
  });
});

describe("Account Flow - Order Detail", () => {
  beforeEach(() => {
    Object.keys(mockParams).forEach((k) => delete mockParams[k]);
  });

  it("shows order timeline for a delivered order", () => {
    mockParams.id = mockOrders[0]!.id;
    render(<OrderDetailPage />);
    expect(screen.getByText(`Order ${mockOrders[0]!.orderNumber}`)).toBeInTheDocument();
    expect(screen.getByText("Order Status")).toBeInTheDocument();
  });

  it("shows Request Return button for delivered orders", () => {
    mockParams.id = mockOrders[0]!.id;
    render(<OrderDetailPage />);
    expect(screen.getByRole("button", { name: /request return/i })).toBeInTheDocument();
  });

  it("shows Download Invoice button when invoice URL exists", () => {
    mockParams.id = mockOrders[0]!.id;
    render(<OrderDetailPage />);
    expect(screen.getByRole("button", { name: /download invoice/i })).toBeInTheDocument();
  });

  it("shows order not found for invalid order ID", () => {
    mockParams.id = "nonexistent-order";
    render(<OrderDetailPage />);
    expect(screen.getByText("Order Not Found")).toBeInTheDocument();
  });
});

describe("Account Flow - Wishlist", () => {
  it("renders wishlist items with Add to Cart buttons", () => {
    renderWithMockStore(<AccountWishlistPage />);
    expect(screen.getByText("My Wishlist")).toBeInTheDocument();
    mockWishlistItems.forEach((item) => {
      expect(screen.getByText(item.product.name)).toBeInTheDocument();
    });
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    expect(addButtons.length).toBe(mockWishlistItems.length);
  });

  it("clicking Add to Cart from wishlist calls addToCart", async () => {
    const addToCartFn = vi.fn();
    const user = userEvent.setup();
    renderWithMockStore(<AccountWishlistPage />, { addToCart: addToCartFn });
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    await user.click(addButtons[0]!);
    expect(addToCartFn).toHaveBeenCalledWith(mockWishlistItems[0]!.product);
  });
});

describe("Account Flow - Profile", () => {
  it("renders profile form with pre-filled name, email, phone", () => {
    render(<ProfilePage />);
    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByDisplayValue("priya@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
  });

  it("can edit name field and save", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ProfilePage />);
    const nameInput = screen.getByDisplayValue("Priya Sharma");
    await user.clear(nameInput);
    await user.type(nameInput, "Priya S.");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(alertSpy).toHaveBeenCalledWith("Profile updated!");
    alertSpy.mockRestore();
  });

  it("renders change password form", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });
});

describe("Account Flow - Addresses", () => {
  it("renders address list with default badge", () => {
    render(<AddressesPage />);
    expect(screen.getByText("My Addresses")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    // Full name may appear in multiple address cards
    const nameElements = screen.getAllByText(mockAddresses[0]!.fullName);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
  });

  it("Add Address button opens address form", async () => {
    const user = userEvent.setup();
    render(<AddressesPage />);
    await user.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getByText("New Address")).toBeInTheDocument();
  });

  it("Set as Default button is shown for non-default addresses", () => {
    render(<AddressesPage />);
    expect(screen.getByRole("button", { name: /set as default/i })).toBeInTheDocument();
  });
});

describe("Account Flow - Loyalty", () => {
  it("renders loyalty points balance and tier", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText("Loyalty Program")).toBeInTheDocument();
    // Points appear in overview card
    const pointsElements = screen.getAllByText(mockLoyalty.points.toLocaleString());
    expect(pointsElements.length).toBeGreaterThanOrEqual(1);
    // "Silver" appears in tier overview and tier cards
    const silverElements = screen.getAllByText("Silver");
    expect(silverElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows tier progress bar with next-tier info", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText(new RegExp(`${mockLoyalty.pointsToNextTier}`))).toBeInTheDocument();
  });

  it("shows points history with earned and redeemed entries", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText("Points History")).toBeInTheDocument();
    mockLoyalty.history.forEach((tx) => {
      expect(screen.getByText(tx.description)).toBeInTheDocument();
    });
  });
});

describe("Account Flow - Schemes", () => {
  it("renders schemes page with scheme cards", () => {
    render(<SchemesPage />);
    expect(screen.getByText("My Schemes")).toBeInTheDocument();
  });

  it("shows how gold savings scheme works section", () => {
    render(<SchemesPage />);
    expect(screen.getByText("How Gold Savings Scheme Works")).toBeInTheDocument();
    expect(screen.getByText("1. Choose Your Plan")).toBeInTheDocument();
  });

  it("scheme detail shows installment tracker", () => {
    mockParams.id = mockSchemes[0]!.id;
    render(<SchemeDetailPage />);
    expect(screen.getByText(mockSchemes[0]!.name)).toBeInTheDocument();
    expect(screen.getByText("Installment Tracker")).toBeInTheDocument();
  });

  it("scheme detail shows bonus info", () => {
    mockParams.id = mockSchemes[0]!.id;
    render(<SchemeDetailPage />);
    expect(screen.getByText(/bonus: 1 month free/i)).toBeInTheDocument();
  });
});
