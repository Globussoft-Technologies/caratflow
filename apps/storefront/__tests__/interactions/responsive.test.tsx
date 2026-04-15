/**
 * Responsive layout interaction tests.
 * Tests mobile vs desktop viewport behaviors for category and cart pages.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore, userEvent } from "./test-utils";
import CategoryPage from "@/app/category/[slug]/page";
import WishlistPage from "@/app/wishlist/page";
import HomePage from "@/app/page";

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
    usePathname: () => "/",
    useParams: () => mockParams,
    useSearchParams: () => new URLSearchParams(),
  };
});

describe("Responsive Layout", () => {
  beforeEach(() => {
    Object.keys(mockParams).forEach((k) => delete mockParams[k]);
  });

  it("category page has mobile filter toggle button with Filters text", () => {
    mockParams.slug = "all";
    renderWithStore(<CategoryPage />);
    // The button is always rendered but hidden on lg via CSS classes
    const filterBtn = screen.getByRole("button", { name: /filters/i });
    expect(filterBtn).toBeInTheDocument();
    // It should have the lg:hidden class
    expect(filterBtn.className).toContain("lg:hidden");
  });

  it("clicking mobile filter toggle shows the filter sidebar", async () => {
    mockParams.slug = "all";
    const user = userEvent.setup();
    renderWithStore(<CategoryPage />);
    const filterBtn = screen.getByRole("button", { name: /filters/i });
    await user.click(filterBtn);
    // When mobile filters are shown, a close button appears
    const closeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg path[d*='M6 18L18 6']") !== null,
    );
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("desktop filter sidebar container has lg:block class", () => {
    mockParams.slug = "all";
    const { container } = renderWithStore(<CategoryPage />);
    // The sidebar wrapper should have "hidden" and "lg:block" classes
    const sidebar = container.querySelector(".lg\\:block.w-64");
    expect(sidebar).not.toBeNull();
  });

  it("home page renders trust strip with 4 items", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("BIS Hallmarked")).toBeInTheDocument();
    expect(screen.getByText("Certified Diamonds")).toBeInTheDocument();
    expect(screen.getByText("Lifetime Exchange")).toBeInTheDocument();
    expect(screen.getByText("365-Day Returns")).toBeInTheDocument();
  });

  it("wishlist page shows empty state with explore link when no items", () => {
    renderWithStore(<WishlistPage />);
    expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument();
    const exploreLink = screen.getByRole("link", { name: /explore jewelry/i });
    expect(exploreLink).toHaveAttribute("href", "/");
  });
});
