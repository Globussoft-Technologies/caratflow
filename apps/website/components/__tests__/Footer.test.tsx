import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Footer from "../Footer";

describe("Footer", () => {
  it("renders all footer sections (Product, Solutions, Resources, Company)", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Solutions")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("renders copyright text", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`\u00A9 ${year} CaratFlow by Globussoft Technologies. All rights reserved.`)
    ).toBeInTheDocument();
  });

  it("renders social links", () => {
    render(<Footer />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Li")).toBeInTheDocument();
    expect(screen.getByText("Fb")).toBeInTheDocument();
    expect(screen.getByText("Yt")).toBeInTheDocument();
  });
});
