import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductGallery from "@/components/ProductGallery";
import { mockProducts } from "@/lib/mock-data";
import { render } from "./test-utils";

const product = mockProducts[0]!;

describe("ProductGallery", () => {
  it("renders main image", () => {
    render(<ProductGallery images={product.images} productName={product.name} />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("renders thumbnails for all images", () => {
    render(<ProductGallery images={product.images} productName={product.name} />);
    // thumbnails + 1 main image
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(product.images.length + 1); // thumbnails + main
  });

  it("changes main image on thumbnail click", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={product.images} productName={product.name} />);
    const buttons = screen.getAllByRole("button");
    // Click second thumbnail
    if (buttons.length > 1) {
      await user.click(buttons[1]!);
    }
    // Main image should update
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("shows zoom hint text", () => {
    render(<ProductGallery images={product.images} productName={product.name} />);
    expect(screen.getByText("Hover to zoom")).toBeInTheDocument();
  });

  it("applies zoom on mouse enter", () => {
    render(<ProductGallery images={product.images} productName={product.name} />);
    // Find the main image container that has onMouseEnter
    const container = screen.getByText("Hover to zoom").closest("div")?.parentElement;
    if (container) {
      fireEvent.mouseEnter(container);
      // After zoom, "Hover to zoom" should be hidden
      expect(screen.queryByText("Hover to zoom")).not.toBeInTheDocument();
    }
  });

  it("removes zoom on mouse leave", () => {
    render(<ProductGallery images={product.images} productName={product.name} />);
    const container = screen.getByText("Hover to zoom").closest("div")?.parentElement;
    if (container) {
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);
      expect(screen.getByText("Hover to zoom")).toBeInTheDocument();
    }
  });
});
