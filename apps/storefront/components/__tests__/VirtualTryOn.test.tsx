import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import VirtualTryOn from "@/components/VirtualTryOn";
import { render } from "./test-utils";

// Mock getUserMedia
beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockRejectedValue(new Error("Not allowed")),
    },
    writable: true,
    configurable: true,
  });
});

const config = {
  productId: "prod-001",
  productName: "Celestial Solitaire Ring",
  productImage: "https://example.com/ring.jpg",
  category: "RING" as const,
  overlayUrl: null,
  overlayPositioning: {
    scale: 0.15,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  },
};

describe("VirtualTryOn", () => {
  it("renders with product name", () => {
    render(<VirtualTryOn config={config} onClose={vi.fn()} />);
    expect(screen.getByText("Virtual Try-On")).toBeInTheDocument();
    expect(screen.getByText(config.productName)).toBeInTheDocument();
  });

  it("has close button", () => {
    render(<VirtualTryOn config={config} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("has capture screenshot button", () => {
    render(<VirtualTryOn config={config} onClose={vi.fn()} />);
    expect(screen.getByText("Capture")).toBeInTheDocument();
  });

  it("has add to cart button", () => {
    render(<VirtualTryOn config={config} onClose={vi.fn()} />);
    expect(screen.getByText("Add to Cart")).toBeInTheDocument();
  });
});
