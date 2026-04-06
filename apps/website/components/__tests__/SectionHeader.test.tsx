import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SectionHeader from "../SectionHeader";

describe("SectionHeader", () => {
  it("renders the title", () => {
    render(<SectionHeader title="Our Features" />);
    expect(screen.getByText("Our Features")).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(
      <SectionHeader
        title="Our Features"
        subtitle="Everything your jewelry business needs."
      />
    );
    expect(
      screen.getByText("Everything your jewelry business needs.")
    ).toBeInTheDocument();
  });
});
