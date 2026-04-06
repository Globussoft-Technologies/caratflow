import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HeroSection from "../HeroSection";

describe("HeroSection", () => {
  it("renders the headline", () => {
    render(<HeroSection />);
    expect(screen.getByText("The Complete Jewelry")).toBeInTheDocument();
    expect(screen.getByText("ERP Platform")).toBeInTheDocument();
  });

  it("renders the subheadline", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/From raw metal procurement and manufacturing/)
    ).toBeInTheDocument();
  });

  it("renders CTA buttons", () => {
    render(<HeroSection />);
    expect(screen.getByText("Start Free Trial")).toBeInTheDocument();
    expect(screen.getByText("Book a Demo")).toBeInTheDocument();
  });
});
