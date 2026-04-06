/**
 * Search flow interaction tests.
 * Covers search results, no-results state, sort, and filter sidebar.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore, userEvent } from "./test-utils";
import SearchPage from "@/app/search/page";
import { mockProducts } from "@/lib/mock-data";

let searchParamsValue = new URLSearchParams();

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
    usePathname: () => "/search",
    useParams: () => ({}),
    useSearchParams: () => searchParamsValue,
  };
});

describe("Search Flow", () => {
  it("shows search page heading with no query", () => {
    searchParamsValue = new URLSearchParams();
    renderWithStore(<SearchPage />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("0 products found")).toBeInTheDocument();
  });

  it("displays results count when query matches products", () => {
    searchParamsValue = new URLSearchParams("q=gold");
    renderWithStore(<SearchPage />);
    const goldProducts = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes("gold") ||
        p.metalType.toLowerCase().includes("gold") ||
        p.tags.some((t) => t.toLowerCase().includes("gold")),
    );
    expect(screen.getByText(`Results for "gold"`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${goldProducts.length} product`))).toBeInTheDocument();
  });

  it("shows no results state for non-matching query", () => {
    searchParamsValue = new URLSearchParams("q=xyznonexistent");
    renderWithStore(<SearchPage />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("no results state shows suggestion links", () => {
    searchParamsValue = new URLSearchParams("q=xyznonexistent");
    renderWithStore(<SearchPage />);
    expect(screen.getByRole("link", { name: "Rings" })).toHaveAttribute("href", "/search?q=Rings");
    expect(screen.getByRole("link", { name: "Necklaces" })).toHaveAttribute("href", "/search?q=Necklaces");
    expect(screen.getByRole("link", { name: "Diamonds" })).toHaveAttribute("href", "/search?q=Diamonds");
  });

  it("search results page has a sort dropdown", () => {
    searchParamsValue = new URLSearchParams("q=ring");
    renderWithStore(<SearchPage />);
    // Only visible when there are results
    const ringProducts = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes("ring") ||
        p.categoryName.toLowerCase().includes("ring") ||
        p.metalType.toLowerCase().includes("ring") ||
        p.tags.some((t) => t.toLowerCase().includes("ring")),
    );
    if (ringProducts.length > 0) {
      const sortSelect = screen.getByRole("combobox");
      expect(sortSelect).toBeInTheDocument();
    }
  });

  it("changing sort option updates the select value", async () => {
    searchParamsValue = new URLSearchParams("q=ring");
    const user = userEvent.setup();
    renderWithStore(<SearchPage />);
    const ringProducts = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes("ring") ||
        p.categoryName.toLowerCase().includes("ring") ||
        p.metalType.toLowerCase().includes("ring") ||
        p.tags.some((t) => t.toLowerCase().includes("ring")),
    );
    if (ringProducts.length > 0) {
      const sortSelect = screen.getByRole("combobox");
      await user.selectOptions(sortSelect, "price_desc");
      expect(sortSelect).toHaveValue("price_desc");
    }
  });

  it("breadcrumbs show Home > Search Results", () => {
    searchParamsValue = new URLSearchParams("q=gold");
    renderWithStore(<SearchPage />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Search Results")).toBeInTheDocument();
  });

  it("search results display product cards for matching items", () => {
    searchParamsValue = new URLSearchParams("q=necklace");
    renderWithStore(<SearchPage />);
    const necklaceProducts = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes("necklace") ||
        p.categoryName.toLowerCase().includes("necklace") ||
        p.metalType.toLowerCase().includes("necklace") ||
        p.tags.some((t) => t.toLowerCase().includes("necklace")),
    );
    if (necklaceProducts.length > 0) {
      expect(screen.getByText(necklaceProducts[0]!.name)).toBeInTheDocument();
    }
  });
});
