import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import LiveRateTicker from "@/components/LiveRateTicker";
import { render } from "./test-utils";

describe("LiveRateTicker", () => {
  it("shows gold rate", () => {
    render(<LiveRateTicker />);
    const goldLabels = screen.getAllByText(/Gold 999/);
    expect(goldLabels.length).toBeGreaterThan(0);
  });

  it("shows silver rate", () => {
    render(<LiveRateTicker />);
    const silverLabels = screen.getAllByText(/Silver 999/);
    expect(silverLabels.length).toBeGreaterThan(0);
  });

  it("shows rate per gram", () => {
    render(<LiveRateTicker />);
    const rateTexts = screen.getAllByText(/\/g/);
    expect(rateTexts.length).toBeGreaterThan(0);
  });

  it("shows percentage change", () => {
    render(<LiveRateTicker />);
    const pctTexts = screen.getAllByText(/%/);
    expect(pctTexts.length).toBeGreaterThan(0);
  });
});
