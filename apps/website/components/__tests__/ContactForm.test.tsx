import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ContactForm from "../ContactForm";

describe("ContactForm", () => {
  it("renders all form fields", () => {
    render(<ContactForm />);
    expect(screen.getByText("Full Name *")).toBeInTheDocument();
    expect(screen.getByText("Email Address *")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("Company Name")).toBeInTheDocument();
    expect(screen.getByText("Number of Locations")).toBeInTheDocument();
    expect(screen.getByText("Message *")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<ContactForm />);
    expect(screen.getByText("Send Message")).toBeInTheDocument();
  });

  it("validates required fields via HTML validation attributes", () => {
    render(<ContactForm />);
    const nameInput = screen.getByPlaceholderText("Rajesh Kumar");
    const emailInput = screen.getByPlaceholderText("rajesh@example.com");
    const messageTextarea = screen.getByPlaceholderText(/Tell us about your business/);

    expect(nameInput).toBeRequired();
    expect(emailInput).toBeRequired();
    expect(messageTextarea).toBeRequired();
  });

  it("shows success message after form submission", () => {
    render(<ContactForm />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Rajesh Kumar"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("rajesh@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Tell us about your business/), {
      target: { value: "Test message" },
    });

    // Submit
    fireEvent.submit(screen.getByText("Send Message").closest("form")!);

    expect(screen.getByText("Thank You!")).toBeInTheDocument();
    expect(
      screen.getByText(/We've received your message/)
    ).toBeInTheDocument();
  });
});
