import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PriceDisplay from "@/components/PriceDisplay";
import { mockProducts } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees } from "@/lib/utils";
import { renderWithStore } from "./test-utils";

const product = mockProducts[0]!;
const price = calculateProductPrice(product);

describe("PriceDisplay", () => {
  it("shows formatted price in INR", () => {
    renderWithStore(<PriceDisplay product={product} />);
    expect(screen.getByText(formatRupees(price.total / 100))).toBeInTheDocument();
  });

  it("renders at different sizes", () => {
    const { unmount } = renderWithStore(<PriceDisplay product={product} size="lg" />);
    expect(screen.getByText(formatRupees(price.total / 100))).toBeInTheDocument();
    unmount();
    renderWithStore(<PriceDisplay product={product} size="sm" />);
    expect(screen.getByText(formatRupees(price.total / 100))).toBeInTheDocument();
  });

  it("shows breakdown button when showBreakdown is true", () => {
    renderWithStore(<PriceDisplay product={product} showBreakdown />);
    expect(screen.getByLabelText("View price breakdown")).toBeInTheDocument();
  });

  it("does not show breakdown button when showBreakdown is false", () => {
    renderWithStore(<PriceDisplay product={product} showBreakdown={false} />);
    expect(screen.queryByLabelText("View price breakdown")).not.toBeInTheDocument();
  });

  it("shows price breakdown tooltip on hover", async () => {
    const user = userEvent.setup();
    renderWithStore(<PriceDisplay product={product} showBreakdown />);
    const btn = screen.getByLabelText("View price breakdown");
    await user.hover(btn);
    expect(screen.getByText("Price Breakdown")).toBeInTheDocument();
  });

  it("shows metal value in breakdown", async () => {
    const user = userEvent.setup();
    renderWithStore(<PriceDisplay product={product} showBreakdown />);
    const btn = screen.getByLabelText("View price breakdown");
    await user.hover(btn);
    expect(screen.getByText(formatRupees(price.metalValue / 100))).toBeInTheDocument();
  });

  it("shows GST in breakdown", async () => {
    const user = userEvent.setup();
    renderWithStore(<PriceDisplay product={product} showBreakdown />);
    const btn = screen.getByLabelText("View price breakdown");
    await user.hover(btn);
    expect(screen.getByText("GST (3%)")).toBeInTheDocument();
  });

  it("shows breakdown content when tooltip is triggered via hover then stays on click", async () => {
    const user = userEvent.setup();
    renderWithStore(<PriceDisplay product={product} showBreakdown />);
    const btn = screen.getByLabelText("View price breakdown");
    // Hover opens tooltip via onMouseEnter
    await user.hover(btn);
    expect(screen.getByText("Price Breakdown")).toBeInTheDocument();
    // Click toggles state: true -> false (closes)
    await user.click(btn);
    expect(screen.queryByText("Price Breakdown")).not.toBeInTheDocument();
  });
});
