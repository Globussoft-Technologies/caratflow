import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductDetailPage from "@/app/product/[id]/page";
import { renderWithStore } from "../../components/__tests__/test-utils";
import { mockProducts } from "@/lib/mock-data";

const product = mockProducts[0]!; // Celestial Solitaire Ring

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useParams: () => ({ id: "prod-001" }),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/product/prod-001",
    useSearchParams: () => new URLSearchParams(),
  };
});

vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

describe("ProductDetailPage", () => {
  it("renders product gallery", () => {
    renderWithStore(<ProductDetailPage />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("renders product name as heading", () => {
    renderWithStore(<ProductDetailPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(product.name);
  });

  it("renders price breakdown section", () => {
    renderWithStore(<ProductDetailPage />);
    expect(screen.getByText("Price Breakdown")).toBeInTheDocument();
  });

  it("renders Add to Cart button", () => {
    renderWithStore(<ProductDetailPage />);
    // Product has sizes, so initially shows "Select a Size"
    expect(screen.getByText("Select a Size")).toBeInTheDocument();
  });

  it("renders wishlist button on product detail", () => {
    renderWithStore(<ProductDetailPage />);
    // Multiple wishlist buttons (product card in related products + main)
    const wishlistButtons = screen.getAllByLabelText(/wishlist/i);
    expect(wishlistButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders description/specifications/reviews tabs", () => {
    renderWithStore(<ProductDetailPage />);
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("specifications")).toBeInTheDocument();
    expect(screen.getByText(/reviews/i)).toBeInTheDocument();
  });

  it("shows specifications tab content on click", async () => {
    const user = userEvent.setup();
    renderWithStore(<ProductDetailPage />);
    await user.click(screen.getByText("specifications"));
    expect(screen.getByText("Metal Type")).toBeInTheDocument();
    expect(screen.getByText("Purity")).toBeInTheDocument();
  });

  it("renders related products section", () => {
    renderWithStore(<ProductDetailPage />);
    expect(screen.getByText("You May Also Like")).toBeInTheDocument();
  });
});
