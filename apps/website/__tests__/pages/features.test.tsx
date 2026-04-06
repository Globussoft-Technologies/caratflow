import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FeaturesPage from "../../app/features/page";

describe("Features Page", () => {
  it("renders all 14 module sections", () => {
    render(<FeaturesPage />);
    const moduleNames = [
      "Inventory Management",
      "Manufacturing & Production",
      "Retail & Point of Sale",
      "Financial & Accounting",
      "CRM & Customer Management",
      "Wholesale & Distribution",
      "E-Commerce & Omnichannel",
      "Export & International Trade",
      "Compliance & Traceability",
      "India-Specific Features",
      "Reporting & Analytics",
      "Hardware Integration",
      "Mobile Applications",
      "Platform & Infrastructure",
    ];
    for (const name of moduleNames) {
      expect(screen.getByRole("heading", { name, level: 2 })).toBeInTheDocument();
    }
  });

  it("each module has a title and description text", () => {
    render(<FeaturesPage />);
    // Check a sample module has its description
    expect(
      screen.getByText("Track every gram of metal and every stone with precision across all your locations.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("End-to-end production management from BOM creation to finished goods.")
    ).toBeInTheDocument();
  });

  it("each module has bullet point features", () => {
    render(<FeaturesPage />);
    // Check some representative feature bullet points
    expect(
      screen.getByText(/Real-time tracking for metals, stones, and finished goods/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Multi-level Bill of Materials/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Touch-optimized POS interface/)
    ).toBeInTheDocument();
  });
});
