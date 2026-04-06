import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BlogPage from "../../app/blog/page";

describe("Blog Page", () => {
  it("renders all 3 article cards", () => {
    render(<BlogPage />);
    expect(screen.getByText("Why Generic ERPs Fail Jewelers")).toBeInTheDocument();
    expect(screen.getByText("HUID Compliance Guide for Indian Jewelers")).toBeInTheDocument();
    expect(screen.getByText("How to Choose the Right Jewelry ERP")).toBeInTheDocument();
  });

  it("renders the newsletter section", () => {
    render(<BlogPage />);
    expect(screen.getByText("Stay in the Loop")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByText("Subscribe")).toBeInTheDocument();
  });

  it("displays article categories and metadata", () => {
    render(<BlogPage />);
    expect(screen.getByText("Industry Insights")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("Buying Guide")).toBeInTheDocument();
  });
});
