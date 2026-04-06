import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "../Button";

describe("Button", () => {
  it("renders primary variant with gold background class", () => {
    render(<Button variant="primary">Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button.className).toContain("bg-gold");
  });

  it("renders secondary variant with outline/border class", () => {
    render(<Button variant="secondary">Outline</Button>);
    const button = screen.getByRole("button", { name: "Outline" });
    expect(button.className).toContain("border-2");
    expect(button.className).toContain("border-gold");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button.className).toContain("text-navy");
    expect(button.className).not.toContain("bg-gold");
    expect(button.className).not.toContain("border-2");
  });

  it("renders as a link when href is provided", () => {
    render(
      <Button href="/contact" variant="primary">
        Go
      </Button>
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/contact");
  });
});
