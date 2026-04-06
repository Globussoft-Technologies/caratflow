import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TestimonialCard from "../TestimonialCard";

const defaultProps = {
  quote: "CaratFlow replaced three separate systems.",
  name: "Amit Sharma",
  company: "Sharma Jewellers, Mumbai",
  role: "Managing Director",
};

describe("TestimonialCard", () => {
  it("renders the quote", () => {
    render(<TestimonialCard {...defaultProps} />);
    expect(
      screen.getByText("CaratFlow replaced three separate systems.")
    ).toBeInTheDocument();
  });

  it("renders the name", () => {
    render(<TestimonialCard {...defaultProps} />);
    expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
  });

  it("renders the company and role", () => {
    render(<TestimonialCard {...defaultProps} />);
    expect(
      screen.getByText("Managing Director, Sharma Jewellers, Mumbai")
    ).toBeInTheDocument();
  });
});
