import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FeatureCard from "../FeatureCard";

const defaultProps = {
  icon: <span data-testid="icon">ICON</span>,
  title: "Inventory Management",
  description: "Track every gram of metal.",
};

describe("FeatureCard", () => {
  it("renders the icon", () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText("Inventory Management")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText("Track every gram of metal.")).toBeInTheDocument();
  });
});
