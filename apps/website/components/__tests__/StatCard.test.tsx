import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "../StatCard";

describe("StatCard", () => {
  it("renders the number value", () => {
    render(<StatCard value="100+" label="Features" />);
    expect(screen.getByText("100+")).toBeInTheDocument();
  });

  it("renders the label", () => {
    render(<StatCard value="100+" label="Features" />);
    expect(screen.getByText("Features")).toBeInTheDocument();
  });
});
