import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { renderWithStore } from "../../components/__tests__/test-utils";

// Mock SearchBar to avoid VoiceSearch complexity (kept for backwards compat)
vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

describe("HomePage", () => {
  it("renders hero banner with primary CTA", () => {
    renderWithStore(<HomePage />);
    expect(
      screen.getByText((t) => t.includes("Crafted for")),
    ).toBeInTheDocument();
    expect(screen.getByText("Shop Collection")).toBeInTheDocument();
    expect(screen.getByText("Book Consultation")).toBeInTheDocument();
  });

  it("renders featured collections strip", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Featured Collections")).toBeInTheDocument();
    expect(screen.getByText("Bridal Heirloom")).toBeInTheDocument();
    expect(screen.getByText("Everyday Luxe")).toBeInTheDocument();
    expect(screen.getByText("Festive Edit")).toBeInTheDocument();
  });

  it("renders category tiles", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Shop by Category")).toBeInTheDocument();
    expect(screen.getAllByText("Rings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Necklaces").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Earrings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bangles").length).toBeGreaterThan(0);
  });

  it("renders featured products section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Featured Pieces")).toBeInTheDocument();
  });

  it("renders live metal rates ticker", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Live Rates")).toBeInTheDocument();
    expect(screen.getByText("22K Gold")).toBeInTheDocument();
    expect(screen.getByText("18K Gold")).toBeInTheDocument();
  });

  it("renders trust signals", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("BIS Hallmarked")).toBeInTheDocument();
    expect(screen.getByText("Certified Diamonds")).toBeInTheDocument();
    expect(screen.getByText("Lifetime Exchange")).toBeInTheDocument();
    expect(screen.getByText("365-Day Returns")).toBeInTheDocument();
  });

  it("renders testimonials section", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("What Our Clients Say")).toBeInTheDocument();
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  });

  it("renders newsletter signup form", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Join the CaratFlow Circle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });
});
