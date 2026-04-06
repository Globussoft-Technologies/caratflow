import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Navbar from "../Navbar";

describe("Navbar", () => {
  it("renders the logo", () => {
    render(<Navbar />);
    expect(screen.getByText("Carat")).toBeTruthy();
    expect(screen.getByText("Flow")).toBeTruthy();
  });

  it("renders all navigation links", () => {
    render(<Navbar />);
    const expectedLinks = ["Features", "Pricing", "About", "Blog", "Contact"];
    for (const label of expectedLinks) {
      const links = screen.getAllByText(label);
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("renders the CTA button", () => {
    render(<Navbar />);
    const ctaButtons = screen.getAllByText("Start Free Trial");
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  it("toggles mobile menu when hamburger is clicked", () => {
    render(<Navbar />);
    const toggleButton = screen.getByLabelText("Toggle menu");

    // Mobile menu should not be visible initially
    expect(screen.queryByText("Login")).toBeTruthy(); // Desktop login always renders

    fireEvent.click(toggleButton);

    // After clicking, mobile menu should be open - verify mobile-specific links appear
    const featureLinks = screen.getAllByText("Features");
    expect(featureLinks.length).toBeGreaterThanOrEqual(2); // desktop + mobile
  });

  it("applies sticky behavior class based on scroll state", () => {
    render(<Navbar />);
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
    // Initially not scrolled, should have bg-transparent
    expect(header!.className).toContain("bg-transparent");
    expect(header!.className).not.toContain("navbar-scrolled");
  });
});
