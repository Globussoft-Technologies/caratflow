import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import AccountDashboard from "@/app/account/page";
import OrdersPage from "@/app/account/orders/page";
import AccountWishlistPage from "@/app/account/wishlist/page";
import LoyaltyPage from "@/app/account/loyalty/page";
import SchemesPage from "@/app/account/schemes/page";
import ProfilePage from "@/app/account/profile/page";
import AddressesPage from "@/app/account/addresses/page";
import { renderWithStore } from "../../components/__tests__/test-utils";
import { render } from "../../components/__tests__/test-utils";

vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

describe("AccountDashboard", () => {
  it("renders My Dashboard heading", () => {
    renderWithStore(<AccountDashboard />);
    expect(screen.getByText("My Dashboard")).toBeInTheDocument();
  });

  it("shows quick stats", () => {
    renderWithStore(<AccountDashboard />);
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("Wishlist Items")).toBeInTheDocument();
    expect(screen.getByText("Loyalty Points")).toBeInTheDocument();
    // "Active Schemes" appears both as a stat card and section heading
    expect(screen.getAllByText("Active Schemes").length).toBeGreaterThanOrEqual(1);
  });

  it("shows loyalty tier banner", () => {
    renderWithStore(<AccountDashboard />);
    expect(screen.getByText("Loyalty Tier")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
  });

  it("shows recent orders section", () => {
    renderWithStore(<AccountDashboard />);
    expect(screen.getByText("Recent Orders")).toBeInTheDocument();
    expect(screen.getByText("CF-2026-0001")).toBeInTheDocument();
  });
});

describe("OrdersPage", () => {
  it("renders My Orders heading", () => {
    render(<OrdersPage />);
    expect(screen.getByText("My Orders")).toBeInTheDocument();
  });

  it("shows order cards", () => {
    render(<OrdersPage />);
    expect(screen.getByText("CF-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("CF-2026-0002")).toBeInTheDocument();
  });

  it("shows order status badges", () => {
    render(<OrdersPage />);
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
  });
});

describe("AccountWishlistPage", () => {
  it("renders My Wishlist heading", () => {
    renderWithStore(<AccountWishlistPage />);
    expect(screen.getByText("My Wishlist")).toBeInTheDocument();
  });

  it("shows wishlist items", () => {
    renderWithStore(<AccountWishlistPage />);
    expect(screen.getByText("Celestial Solitaire Ring")).toBeInTheDocument();
  });

  it("shows Add to Cart buttons", () => {
    renderWithStore(<AccountWishlistPage />);
    const buttons = screen.getAllByText("Add to Cart");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe("LoyaltyPage", () => {
  it("renders Loyalty Program heading", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText("Loyalty Program")).toBeInTheDocument();
  });

  it("shows current tier", () => {
    render(<LoyaltyPage />);
    // Silver tier
    expect(screen.getAllByText("Silver").length).toBeGreaterThan(0);
  });

  it("shows all tier cards", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText("Bronze")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
  });

  it("shows points history", () => {
    render(<LoyaltyPage />);
    expect(screen.getByText("Points History")).toBeInTheDocument();
  });
});

describe("SchemesPage", () => {
  it("renders My Schemes heading", () => {
    render(<SchemesPage />);
    expect(screen.getByText("My Schemes")).toBeInTheDocument();
  });

  it("shows how it works section", () => {
    render(<SchemesPage />);
    expect(screen.getByText("How Gold Savings Scheme Works")).toBeInTheDocument();
  });
});

describe("ProfilePage", () => {
  it("renders My Profile heading", () => {
    render(<ProfilePage />);
    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("shows personal information form", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Priya Sharma")).toBeInTheDocument();
  });

  it("shows change password section", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Change Password")).toBeInTheDocument();
  });
});

describe("AddressesPage", () => {
  it("renders My Addresses heading", () => {
    render(<AddressesPage />);
    expect(screen.getByText("My Addresses")).toBeInTheDocument();
  });

  it("shows existing addresses", () => {
    render(<AddressesPage />);
    expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThan(0);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("shows Add Address button", () => {
    render(<AddressesPage />);
    expect(screen.getByText("Add Address")).toBeInTheDocument();
  });

  it("shows default badge", () => {
    render(<AddressesPage />);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });
});
