import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { renderWithStore } from "../../components/__tests__/test-utils";

// Mock SearchBar to avoid VoiceSearch complexity
vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

describe("HomePage", () => {
  it("renders hero banner section", () => {
    renderWithStore(<HomePage />);
    // First banner title
    expect(screen.getByText("Bridal Collection 2026")).toBeInTheDocument();
  });

  it("renders category grid with Shop by Category heading", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Shop by Category")).toBeInTheDocument();
  });

  it("renders category items", () => {
    renderWithStore(<HomePage />);
    // Categories from mockCategories
    expect(screen.getAllByText("Rings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Necklaces").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Earrings").length).toBeGreaterThan(0);
  });

  it("renders featured/bestseller products section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Bestsellers")).toBeInTheDocument();
  });

  it("renders new arrivals section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("New Arrivals")).toBeInTheDocument();
  });

  it("renders live rate strip", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Live Rates")).toBeInTheDocument();
  });

  it("renders shop by occasion section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Shop by Occasion")).toBeInTheDocument();
    expect(screen.getByText("Wedding")).toBeInTheDocument();
    expect(screen.getByText("Engagement")).toBeInTheDocument();
  });

  it("renders trust strip section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("100% Certified")).toBeInTheDocument();
    expect(screen.getByText("Free Shipping")).toBeInTheDocument();
    expect(screen.getByText("15-Day Returns")).toBeInTheDocument();
    expect(screen.getByText("Secure Payments")).toBeInTheDocument();
  });
});
