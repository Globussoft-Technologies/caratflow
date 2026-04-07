import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ContactPage from "../../app/contact/page";

describe("Contact Page", () => {
  it("renders the contact form", () => {
    render(<ContactPage />);
    expect(screen.getByText("Send Us a Message")).toBeInTheDocument();
    expect(screen.getByText("Full Name *")).toBeInTheDocument();
    expect(screen.getByText("Email Address *")).toBeInTheDocument();
    expect(screen.getByText("Send Message")).toBeInTheDocument();
  });

  it("renders office information", () => {
    render(<ContactPage />);
    expect(screen.getByText("Head Office -- Mumbai")).toBeInTheDocument();
    expect(screen.getByText(/Andheri East, Mumbai 400069/)).toBeInTheDocument();
    expect(screen.getByText(/Globussoft Technologies/)).toBeTruthy();
  });

  it("renders phone and email contact details", () => {
    render(<ContactPage />);
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText(/\+91 22 4000 1234/)).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText(/sales@globussoft.com/)).toBeInTheDocument();
    expect(screen.getByText(/support@globussoft.com/)).toBeInTheDocument();
  });
});
