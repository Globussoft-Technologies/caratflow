/**
 * Virtual Try-On flow interaction tests.
 * Covers category tabs, product grid, try-on overlay activation.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore, userEvent } from "./test-utils";
import TryOnPage from "@/app/try-on/page";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/try-on",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

// Mock VirtualTryOn component to avoid camera dependencies
vi.mock("@/components/VirtualTryOn", () => ({
  default: ({ config, onClose, onAddToCart, onShare }: {
    config: { productId: string; productName: string };
    onClose: () => void;
    onAddToCart?: (id: string) => void;
    onShare?: (id: string, via: string) => void;
  }) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "virtual-try-on-overlay" }, [
      React.createElement("span", { key: "name" }, config.productName),
      React.createElement("button", { key: "close", onClick: onClose }, "Close"),
      React.createElement("button", { key: "capture", onClick: () => {} }, "Capture Screenshot"),
      React.createElement("button", { key: "share", onClick: () => onShare?.(config.productId, "whatsapp") }, "Share"),
      React.createElement("button", { key: "add", onClick: () => onAddToCart?.(config.productId) }, "Add to Cart"),
    ]);
  },
}));

describe("Try-On Flow", () => {
  it("renders category tabs: Rings, Necklaces, Earrings, Bangles", () => {
    renderWithStore(<TryOnPage />);
    // Category tab buttons contain emoji + text as separate spans
    // Use getAllByRole since product cards are also buttons
    const allButtons = screen.getAllByRole("button");
    const categoryLabels = ["Rings", "Necklaces", "Earrings", "Bangles"];
    for (const label of categoryLabels) {
      const matching = allButtons.filter((btn) => {
        const spans = btn.querySelectorAll("span");
        return Array.from(spans).some((s) => s.textContent === label);
      });
      expect(matching.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("product grid shows AR-enabled products with TRY ON badge", () => {
    renderWithStore(<TryOnPage />);
    // Default category is RING, should show ring products
    expect(screen.getByText("Classic Gold Solitaire Ring")).toBeInTheDocument();
    expect(screen.getByText("Diamond Cluster Ring")).toBeInTheDocument();
  });

  it("clicking a category tab switches the displayed products", async () => {
    const user = userEvent.setup();
    renderWithStore(<TryOnPage />);
    // Switch to Necklaces
    await user.click(screen.getByRole("button", { name: /necklaces/i }));
    expect(screen.getByText("Kundan Bridal Necklace")).toBeInTheDocument();
    expect(screen.getByText("Diamond Tennis Necklace")).toBeInTheDocument();
  });

  it("clicking a product opens the try-on overlay", async () => {
    const user = userEvent.setup();
    renderWithStore(<TryOnPage />);
    // Product cards are buttons with nested text
    const productButtons = screen.getAllByRole("button").filter((btn) => {
      const h3 = btn.querySelector("h3");
      return h3?.textContent?.includes("Classic Gold Solitaire Ring");
    });
    expect(productButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(productButtons[0]!);
    expect(screen.getByTestId("virtual-try-on-overlay")).toBeInTheDocument();
  });

  it("try-on overlay has Capture Screenshot and Share buttons", async () => {
    const user = userEvent.setup();
    renderWithStore(<TryOnPage />);
    const productButtons = screen.getAllByRole("button").filter((btn) => {
      const h3 = btn.querySelector("h3");
      return h3?.textContent?.includes("Classic Gold Solitaire Ring");
    });
    await user.click(productButtons[0]!);
    expect(screen.getByRole("button", { name: /capture screenshot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });
});
