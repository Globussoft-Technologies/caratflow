import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import CategoryPage from "@/app/category/[slug]/page";
import { renderWithStore } from "../../components/__tests__/test-utils";

// Mock useParams to return a category slug
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useParams: () => ({ slug: "rings" }),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/category/rings",
    useSearchParams: () => new URLSearchParams(),
  };
});

// Mock VoiceSearch
vi.mock("@/components/VoiceSearch", () => ({
  default: () => null,
}));

describe("CategoryPage", () => {
  it("renders breadcrumbs with Home link", () => {
    renderWithStore(<CategoryPage />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders category title as heading", () => {
    renderWithStore(<CategoryPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Rings");
  });

  it("renders product grid with products", () => {
    renderWithStore(<CategoryPage />);
    expect(screen.getByText(/designs found/)).toBeInTheDocument();
  });

  it("renders filter sidebar heading", () => {
    renderWithStore(<CategoryPage />);
    // "Filters" appears both in sidebar heading and mobile toggle button
    expect(screen.getAllByText("Filters").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sort dropdown", () => {
    renderWithStore(<CategoryPage />);
    expect(screen.getByText("Popularity")).toBeInTheDocument();
  });

  it("renders product cards for matching category", () => {
    renderWithStore(<CategoryPage />);
    expect(screen.getByText("Celestial Solitaire Ring")).toBeInTheDocument();
  });
});
