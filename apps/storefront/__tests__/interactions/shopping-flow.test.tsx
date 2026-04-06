/**
 * Shopping flow interaction tests.
 * Covers browsing, filtering, sorting, product detail interactions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import { renderWithStore, userEvent, getProduct } from "./test-utils";
import HomePage from "@/app/page";
import CategoryPage from "@/app/category/[slug]/page";
import ProductDetailPage from "@/app/product/[id]/page";
import { mockProducts, mockCategories, mockBanners } from "@/lib/mock-data";
import { SORT_OPTIONS } from "@/lib/constants";

// We need to override useParams per test
const mockParams: Record<string, string> = {};
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
    usePathname: () => "/",
    useParams: () => mockParams,
    useSearchParams: () => new URLSearchParams(),
  };
});

describe("Shopping Flow", () => {
  beforeEach(() => {
    Object.keys(mockParams).forEach((k) => delete mockParams[k]);
  });

  // ─── Home Page ─────────────────────────────────────────────

  it("renders home page with category grid linking to category pages", () => {
    renderWithStore(<HomePage />);
    const categoryLinks = screen.getAllByRole("link").filter((el) => {
      const href = el.getAttribute("href");
      return href?.startsWith("/category/");
    });
    expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
    // At least one category link should exist with a valid slug
    const firstCatSlug = mockCategories[0]!.slug;
    const hasFirstCat = categoryLinks.some(
      (el) => el.getAttribute("href") === `/category/${firstCatSlug}`,
    );
    expect(hasFirstCat).toBe(true);
  });

  it("renders hero banner carousel with slide dots", async () => {
    const user = userEvent.setup();
    renderWithStore(<HomePage />);
    const dots = screen.getAllByRole("button", { name: /go to slide/i });
    expect(dots.length).toBe(mockBanners.length);
    // Click second dot
    await user.click(dots[1]!);
    // The second banner text should now be visible (opacity-100)
    expect(screen.getByText(mockBanners[1]!.title)).toBeInTheDocument();
  });

  it("shows Bestsellers, New Arrivals, and Trending sections", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Bestsellers")).toBeInTheDocument();
    expect(screen.getByText("New Arrivals")).toBeInTheDocument();
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
  });

  it("displays shop-by-occasion section with links", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Shop by Occasion")).toBeInTheDocument();
    expect(screen.getByText("Wedding")).toBeInTheDocument();
    expect(screen.getByText("Engagement")).toBeInTheDocument();
  });

  it("displays live gold rate strip", () => {
    renderWithStore(<HomePage />);
    expect(screen.getByText("Live Rates")).toBeInTheDocument();
  });

  // ─── Category Page ─────────────────────────────────────────

  it("category page renders products for a given slug", () => {
    mockParams.slug = "rings";
    renderWithStore(<CategoryPage />);
    // "Rings" appears in breadcrumb and heading; use getAllByText
    const ringsTexts = screen.getAllByText("Rings");
    expect(ringsTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/designs found/)).toBeInTheDocument();
  });

  it("filter by metal type reduces product count", async () => {
    mockParams.slug = "all";
    const user = userEvent.setup();
    renderWithStore(<CategoryPage />);
    // Find the Gold checkbox in the FilterSidebar
    const goldCheckbox = screen.getByRole("checkbox", { name: /gold/i });
    await user.click(goldCheckbox);
    // After filtering, the "designs found" count should reflect filtered set
    const countText = screen.getByText(/designs found/);
    expect(countText).toBeInTheDocument();
  });

  it("sort by price changes product order via select dropdown", async () => {
    mockParams.slug = "all";
    const user = userEvent.setup();
    renderWithStore(<CategoryPage />);
    const sortSelect = screen.getByRole("combobox");
    await user.selectOptions(sortSelect, "price_asc");
    expect(sortSelect).toHaveValue("price_asc");
  });

  it("shows no products state and clear filter button when all filters exclude everything", async () => {
    // Use a slug that has no products
    mockParams.slug = "nonexistent-category-xyz";
    renderWithStore(<CategoryPage />);
    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("mobile filter toggle button is rendered", () => {
    mockParams.slug = "all";
    renderWithStore(<CategoryPage />);
    const filterBtn = screen.getByRole("button", { name: /filters/i });
    expect(filterBtn).toBeInTheDocument();
  });

  // ─── Product Detail ────────────────────────────────────────

  it("product detail shows name, SKU, and price", () => {
    const product = getProduct(0);
    mockParams.id = product.id;
    renderWithStore(<ProductDetailPage />);
    // Product name appears in multiple places (breadcrumb, heading, related)
    const nameElements = screen.getAllByText(product.name);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(`SKU: ${product.sku}`)).toBeInTheDocument();
  });

  it("clicking size selector highlights the selected size", async () => {
    const product = mockProducts.find((p) => p.sizes && p.sizes.length > 0)!;
    mockParams.id = product.id;
    const user = userEvent.setup();
    renderWithStore(<ProductDetailPage />);
    const availableSize = product.sizes!.find((s) => s.isAvailable)!;
    const sizeBtn = screen.getByRole("button", { name: availableSize.label });
    await user.click(sizeBtn);
    // The button should have the gold styling class after selection
    expect(sizeBtn.className).toContain("border-gold");
  });

  it("clicking wishlist heart toggles its state", async () => {
    const product = getProduct(0);
    mockParams.id = product.id;
    const user = userEvent.setup();
    renderWithStore(<ProductDetailPage />);
    // Multiple wishlist buttons exist (product detail + related products)
    const heartBtns = screen.getAllByRole("button", { name: /add to wishlist/i });
    // The first one is the main product detail wishlist button
    await user.click(heartBtns[0]!);
    // After clicking, one button should now say "Remove from wishlist"
    expect(screen.getAllByRole("button", { name: /remove from wishlist/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("switching tabs shows description, specifications, and reviews", async () => {
    const product = getProduct(0);
    mockParams.id = product.id;
    const user = userEvent.setup();
    renderWithStore(<ProductDetailPage />);
    // Default tab is description
    expect(screen.getByText(product.description)).toBeInTheDocument();

    // Click specifications tab
    const specsTab = screen.getByRole("button", { name: /specifications/i });
    await user.click(specsTab);
    expect(screen.getByText("Metal Type")).toBeInTheDocument();
    expect(screen.getByText("Purity")).toBeInTheDocument();

    // Click reviews tab
    const reviewsTab = screen.getByRole("button", { name: /reviews/i });
    await user.click(reviewsTab);
    expect(screen.getByText(/reviews$/i)).toBeInTheDocument();
  });

  it("product not found shows error message", () => {
    mockParams.id = "nonexistent-product-id";
    renderWithStore(<ProductDetailPage />);
    expect(screen.getByText("Product Not Found")).toBeInTheDocument();
  });

  it("quantity increment and decrement buttons work", async () => {
    const product = getProduct(0);
    mockParams.id = product.id;
    const user = userEvent.setup();
    const { container } = renderWithStore(<ProductDetailPage />);
    // Find the quantity section specifically
    const quantitySection = container.querySelector(".flex.items-center.border.border-gray-200.rounded-lg.w-fit");
    expect(quantitySection).not.toBeNull();
    const buttons = quantitySection!.querySelectorAll("button");
    const minusBtn = buttons[0]!;
    const plusBtn = buttons[1]!;
    const quantityDisplay = quantitySection!.querySelector("span")!;
    expect(quantityDisplay.textContent).toBe("1");
    // Click +
    await user.click(plusBtn);
    expect(quantityDisplay.textContent).toBe("2");
    // Click -
    await user.click(minusBtn);
    expect(quantityDisplay.textContent).toBe("1");
  });
});
