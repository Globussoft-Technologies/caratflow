import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PricingCard from "../PricingCard";

const defaultProps = {
  name: "Professional",
  description: "For growing jewelry businesses",
  priceINR: "\u20B914,999",
  priceUSD: "or $179/month",
  features: ["Up to 15 users", "All 14 modules included", "Multi-currency support"],
};

describe("PricingCard", () => {
  it("renders plan name, price, and features", () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("\u20B914,999")).toBeInTheDocument();
    expect(screen.getByText("Up to 15 users")).toBeInTheDocument();
    expect(screen.getByText("All 14 modules included")).toBeInTheDocument();
    expect(screen.getByText("Multi-currency support")).toBeInTheDocument();
  });

  it("renders 'Most Popular' badge when popular is true", () => {
    render(<PricingCard {...defaultProps} popular={true} />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("does not render 'Most Popular' badge when popular is false", () => {
    render(<PricingCard {...defaultProps} popular={false} />);
    expect(screen.queryByText("Most Popular")).not.toBeInTheDocument();
  });

  it("renders CTA button with correct label", () => {
    render(<PricingCard {...defaultProps} ctaLabel="Contact Sales" ctaHref="/contact" />);
    expect(screen.getByText("Contact Sales")).toBeInTheDocument();
  });
});
