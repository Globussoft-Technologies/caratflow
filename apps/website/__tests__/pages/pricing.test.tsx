import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PricingPage from "../../app/pricing/page";

describe("Pricing Page", () => {
  it("renders all 3 pricing tiers", () => {
    render(<PricingPage />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("renders the FAQ section", () => {
    render(<PricingPage />);
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(screen.getByText("Is there a free trial?")).toBeInTheDocument();
    expect(screen.getByText("Can I switch plans later?")).toBeInTheDocument();
  });

  it("shows 'Most Popular' badge on Professional plan", () => {
    render(<PricingPage />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("displays correct prices for each tier", () => {
    render(<PricingPage />);
    expect(screen.getByText("\u20B94,999")).toBeInTheDocument();
    expect(screen.getByText("\u20B914,999")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
