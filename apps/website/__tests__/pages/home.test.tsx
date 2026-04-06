import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "../../app/page";

describe("Home Page", () => {
  it("renders the hero section", () => {
    render(<HomePage />);
    expect(screen.getByText("The Complete Jewelry")).toBeInTheDocument();
    expect(screen.getByText("ERP Platform")).toBeInTheDocument();
  });

  it("renders the stats section", () => {
    render(<HomePage />);
    expect(screen.getByText("100+")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("Integrated Modules")).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<HomePage />);
    expect(screen.getByText("Inventory Management")).toBeInTheDocument();
    expect(screen.getByText("Manufacturing & Production")).toBeInTheDocument();
    expect(screen.getByText("Retail & Point of Sale")).toBeInTheDocument();
    expect(screen.getByText("Financial & Accounting")).toBeInTheDocument();
    expect(screen.getByText("CRM & Loyalty")).toBeInTheDocument();
    expect(screen.getByText("E-Commerce & Omnichannel")).toBeInTheDocument();
  });

  it("renders testimonials", () => {
    render(<HomePage />);
    expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya Mehta")).toBeInTheDocument();
    expect(screen.getByText("Vikram Choudhary")).toBeInTheDocument();
  });

  it("renders the bottom CTA section", () => {
    render(<HomePage />);
    expect(
      screen.getByText("Ready to Transform Your Jewelry Business?")
    ).toBeInTheDocument();
  });
});
