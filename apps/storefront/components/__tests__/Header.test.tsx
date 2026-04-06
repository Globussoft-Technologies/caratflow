import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";
import { renderWithStore } from "./test-utils";

describe("Header", () => {
  it("renders the logo text", () => {
    renderWithStore(<Header />);
    expect(screen.getByText("Carat")).toBeInTheDocument();
    expect(screen.getByText("Flow")).toBeInTheDocument();
  });

  it("renders search bar (desktop)", () => {
    renderWithStore(<Header />);
    expect(screen.getByPlaceholderText(/Search for jewelry/)).toBeInTheDocument();
  });

  it("renders cart button", () => {
    renderWithStore(<Header />);
    expect(screen.getByLabelText("Cart")).toBeInTheDocument();
  });

  it("renders wishlist link", () => {
    renderWithStore(<Header />);
    expect(screen.getByLabelText("Wishlist")).toBeInTheDocument();
  });

  it("renders mobile hamburger menu button", () => {
    renderWithStore(<Header />);
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("opens mobile menu on hamburger click", async () => {
    const user = userEvent.setup();
    renderWithStore(<Header />);
    const burger = screen.getByLabelText("Toggle menu");
    await user.click(burger);
    expect(screen.getByText("My Account")).toBeInTheDocument();
    expect(screen.getByText("Login / Register")).toBeInTheDocument();
  });

  it("shows category links in mobile menu", async () => {
    const user = userEvent.setup();
    renderWithStore(<Header />);
    await user.click(screen.getByLabelText("Toggle menu"));
    expect(screen.getByText("Rings")).toBeInTheDocument();
    expect(screen.getByText("Necklaces")).toBeInTheDocument();
    expect(screen.getByText("Earrings")).toBeInTheDocument();
  });

  it("renders account link", () => {
    renderWithStore(<Header />);
    const accountLink = screen.getByText("Account");
    expect(accountLink).toBeInTheDocument();
  });
});
