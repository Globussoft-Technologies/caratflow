import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterSidebar from "@/components/FilterSidebar";
import type { FilterState } from "@/lib/types";
import { render } from "./test-utils";

const defaultFilters: FilterState = {
  metalType: [],
  purity: [],
  priceRange: [0, 1000000],
  weightRange: [0, 100],
  gemstone: [],
  gender: [],
  occasion: [],
  availability: "all",
  sortBy: "popularity",
};

describe("FilterSidebar", () => {
  it("renders metal type checkboxes", () => {
    render(<FilterSidebar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("Diamond")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
  });

  it("renders purity options", () => {
    render(<FilterSidebar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByText("24K (999)")).toBeInTheDocument();
    expect(screen.getByText("22K (916)")).toBeInTheDocument();
    expect(screen.getByText("18K (750)")).toBeInTheDocument();
  });

  it("renders price range slider", () => {
    render(<FilterSidebar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Price Range")).toBeInTheDocument();
  });

  it("calls onFilterChange when metal type checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<FilterSidebar filters={defaultFilters} onFilterChange={onFilterChange} />);
    await user.click(screen.getByText("Gold"));
    expect(onFilterChange).toHaveBeenCalled();
    const updatedFilters = onFilterChange.mock.calls[0]![0];
    expect(updatedFilters.metalType).toContain("GOLD");
  });

  it("calls onFilterChange when purity checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<FilterSidebar filters={defaultFilters} onFilterChange={onFilterChange} />);
    await user.click(screen.getByText("22K (916)"));
    expect(onFilterChange).toHaveBeenCalled();
    const updatedFilters = onFilterChange.mock.calls[0]![0];
    expect(updatedFilters.purity).toContain(916);
  });

  it("renders Clear All button", () => {
    render(<FilterSidebar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("clears all filters when Clear All is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const filtersWithSelection: FilterState = { ...defaultFilters, metalType: ["GOLD"] };
    render(<FilterSidebar filters={filtersWithSelection} onFilterChange={onFilterChange} />);
    await user.click(screen.getByText("Clear All"));
    expect(onFilterChange).toHaveBeenCalled();
    const cleared = onFilterChange.mock.calls[0]![0];
    expect(cleared.metalType).toHaveLength(0);
    expect(cleared.purity).toHaveLength(0);
  });

  it("renders gender section header and shows options on expand", async () => {
    const user = userEvent.setup();
    render(<FilterSidebar filters={defaultFilters} onFilterChange={vi.fn()} />);
    // Gender section exists but is collapsed by default
    expect(screen.getByText("Gender")).toBeInTheDocument();
    // Click to expand
    await user.click(screen.getByText("Gender"));
    expect(screen.getByText("Women")).toBeInTheDocument();
    expect(screen.getByText("Men")).toBeInTheDocument();
  });
});
