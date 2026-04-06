import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutPage from "../../app/about/page";

describe("About Page", () => {
  it("renders the mission / story section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Our Story")).toBeInTheDocument();
    expect(
      screen.getByText(/The jewelry industry is one of the oldest in the world/)
    ).toBeInTheDocument();
  });

  it("renders the values section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Our Values")).toBeInTheDocument();
    expect(screen.getByText("Built for Jewelry")).toBeInTheDocument();
    expect(screen.getByText("Data Security")).toBeInTheDocument();
    expect(screen.getByText("Simplicity")).toBeInTheDocument();
    expect(screen.getByText("India-First, Global-Ready")).toBeInTheDocument();
  });

  it("renders the team section", () => {
    render(<AboutPage />);
    expect(screen.getByText("The Team Behind CaratFlow")).toBeInTheDocument();
    expect(screen.getByText("Globussoft Technologies")).toBeInTheDocument();
    expect(screen.getByText("Product Team")).toBeInTheDocument();
    expect(screen.getByText("Support Team")).toBeInTheDocument();
  });
});
