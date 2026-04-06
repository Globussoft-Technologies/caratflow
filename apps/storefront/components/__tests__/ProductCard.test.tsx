import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductCard from "@/components/ProductCard";
import { mockProducts } from "@/lib/mock-data";
import { renderWithStore } from "./test-utils";

const product = mockProducts[0]!; // Celestial Solitaire Ring
const newProduct = mockProducts.find((p) => p.isNew && !p.isBestseller)!;
const bestsellerProduct = mockProducts.find((p) => p.isBestseller)!;

describe("ProductCard", () => {
  it("renders product name", () => {
    renderWithStore(<ProductCard product={product} />);
    expect(screen.getByText(product.name)).toBeInTheDocument();
  });

  it("renders product price", () => {
    renderWithStore(<ProductCard product={product} />);
    // Price is formatted as rupees - find element with price
    const priceElements = screen.getAllByText(/₹/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it("renders product image", () => {
    renderWithStore(<ProductCard product={product} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src");
  });

  it("shows 'New' badge for new arrivals", () => {
    renderWithStore(<ProductCard product={newProduct} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("shows 'Bestseller' badge", () => {
    renderWithStore(<ProductCard product={bestsellerProduct} />);
    expect(screen.getByText("Bestseller")).toBeInTheDocument();
  });

  it("does not show 'New' badge for non-new products", () => {
    const nonNew = mockProducts.find((p) => !p.isNew)!;
    renderWithStore(<ProductCard product={nonNew} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("renders wishlist button", () => {
    renderWithStore(<ProductCard product={product} />);
    expect(screen.getByLabelText("Add to wishlist")).toBeInTheDocument();
  });

  it("toggles wishlist on click", async () => {
    const user = userEvent.setup();
    renderWithStore(<ProductCard product={product} />);
    const btn = screen.getByLabelText("Add to wishlist");
    await user.click(btn);
    expect(screen.getByLabelText("Remove from wishlist")).toBeInTheDocument();
  });

  it("links to product detail page", () => {
    renderWithStore(<ProductCard product={product} />);
    const links = screen.getAllByRole("link");
    const productLink = links.find((l) => l.getAttribute("href")?.includes(`/product/${product.id}`));
    expect(productLink).toBeTruthy();
  });

  it("shows metal type and purity label", () => {
    renderWithStore(<ProductCard product={product} />);
    expect(screen.getByText(/GOLD/)).toBeInTheDocument();
  });

  it("shows weight in grams", () => {
    renderWithStore(<ProductCard product={product} />);
    expect(screen.getByText(`${product.netWeightGrams}g`)).toBeInTheDocument();
  });
});
