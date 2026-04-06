import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import PriceBreakdown from "@/components/PriceBreakdown";
import { mockProducts } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees } from "@/lib/utils";
import { render } from "./test-utils";

const product = mockProducts[0]!; // Has stone charges
const price = calculateProductPrice(product);

const productNoStone = mockProducts.find((p) => p.stoneTotalPrice === 0)!;
const priceNoStone = calculateProductPrice(productNoStone);

describe("PriceBreakdown", () => {
  it("shows Metal Value label", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText(/Metal Value/)).toBeInTheDocument();
  });

  it("shows metal value amount", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText(formatRupees(price.metalValue / 100))).toBeInTheDocument();
  });

  it("shows Making Charges label", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText(/Making Charges/)).toBeInTheDocument();
  });

  it("shows GST at 3%", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText("GST (3%)")).toBeInTheDocument();
    expect(screen.getByText(formatRupees(price.gst / 100))).toBeInTheDocument();
  });

  it("shows total price", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText("Total Price")).toBeInTheDocument();
    expect(screen.getByText(formatRupees(price.total / 100))).toBeInTheDocument();
  });

  it("shows stone charges when product has stones", () => {
    render(<PriceBreakdown product={product} />);
    expect(screen.getByText("Stone Charges")).toBeInTheDocument();
  });

  it("does not show stone charges when product has none", () => {
    render(<PriceBreakdown product={productNoStone} />);
    expect(screen.queryByText("Stone Charges")).not.toBeInTheDocument();
  });
});
