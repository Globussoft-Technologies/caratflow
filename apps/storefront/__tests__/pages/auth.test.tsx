import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import LoginPage from "@/app/auth/login/page";
import RegisterPage from "@/app/auth/register/page";
import ForgotPasswordPage from "@/app/auth/forgot-password/page";
import VerifyOtpPage from "@/app/auth/verify-otp/page";
import { render } from "../../components/__tests__/test-utils";

describe("LoginPage", () => {
  it("renders welcome heading", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("renders social login buttons", () => {
    render(<LoginPage />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with Facebook")).toBeInTheDocument();
    expect(screen.getByText("Continue with Apple")).toBeInTheDocument();
  });

  it("has register link", () => {
    render(<LoginPage />);
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });
});

describe("RegisterPage", () => {
  it("renders Create Account heading", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Create Account", { selector: "h1" })).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Full Name *")).toBeInTheDocument();
    expect(screen.getByText("Email *")).toBeInTheDocument();
    expect(screen.getByText("Phone Number *")).toBeInTheDocument();
    expect(screen.getByText("Password *")).toBeInTheDocument();
    expect(screen.getByText("Confirm Password *")).toBeInTheDocument();
  });

  it("has sign in link", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});

describe("ForgotPasswordPage", () => {
  it("renders Reset Password heading", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });
});

describe("VerifyOtpPage", () => {
  it("renders Verify OTP heading", () => {
    render(<VerifyOtpPage />);
    expect(screen.getByText("Verify OTP")).toBeInTheDocument();
  });

  it("renders 6 OTP input fields", () => {
    render(<VerifyOtpPage />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });
});
