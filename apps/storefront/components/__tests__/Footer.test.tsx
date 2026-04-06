import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import Footer from "@/components/Footer";
import { render } from "./test-utils";

describe("Footer", () => {
  it("renders all section headings", () => {
    render(<Footer />);
    expect(screen.getByText("Shop Jewelry")).toBeInTheDocument();
    expect(screen.getByText("Customer Service")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("renders jewelry category links", () => {
    render(<Footer />);
    expect(screen.getAllByText("Rings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Necklaces").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Earrings").length).toBeGreaterThan(0);
  });

  it("renders trust badges", () => {
    render(<Footer />);
    // Trust badges may appear multiple times (in footer and other sections)
    expect(screen.getAllByText("BIS Hallmark").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("IGI Certified").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Insured Shipping").length).toBeGreaterThanOrEqual(1);
  });

  it("renders payment methods and copyright", () => {
    render(<Footer />);
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
    expect(screen.getByText(/CaratFlow by Globussoft/)).toBeInTheDocument();
  });
});
