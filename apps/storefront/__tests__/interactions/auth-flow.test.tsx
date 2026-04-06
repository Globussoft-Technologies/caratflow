/**
 * Auth flow interaction tests.
 * Covers login form, registration form, social login, and OTP.
 */
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/auth/login/page";
import RegisterPage from "@/app/auth/register/page";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/auth/login",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

describe("Auth Flow - Login", () => {
  it("renders email and password fields in email login mode", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("renders social login buttons for Google, Facebook, and Apple", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with facebook/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeInTheDocument();
  });

  it("has a Forgot Password link", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /forgot/i })).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("has a Create Account link to registration page", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /create account/i });
    expect(link).toHaveAttribute("href", "/auth/register");
  });

  it("submits email login form when fields are filled", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("switching to phone tab shows phone input instead of email/password", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const phoneTab = screen.getByRole("button", { name: /phone/i });
    await user.click(phoneTab);
    expect(screen.getByPlaceholderText("98765 43210")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();
  });

  it("phone input only accepts digits and limits to 10 chars", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: /phone/i }));
    const phoneInput = screen.getByPlaceholderText("98765 43210");
    await user.type(phoneInput, "abc1234567890");
    // Should only contain digits, max 10
    expect(phoneInput).toHaveValue("1234567890");
  });

  it("displays the Welcome Back heading", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });
});

describe("Auth Flow - Register", () => {
  it("renders name, email, phone, password, and confirm password fields", () => {
    render(<RegisterPage />);
    expect(screen.getByPlaceholderText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("98765 43210")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min 8 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm your password")).toBeInTheDocument();
  });

  it("has terms of service and privacy policy links", () => {
    render(<RegisterPage />);
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
  });

  it("has a Sign In link for existing users", () => {
    render(<RegisterPage />);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/auth/login");
  });

  it("submits registration form successfully", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText("Priya Sharma"), "Test User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("98765 43210"), "9876543210");
    await user.type(screen.getByPlaceholderText("Min 8 characters"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm your password"), "password123");
    // Check the terms checkbox
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(alertSpy).toHaveBeenCalledWith("Registration integration pending. This is a UI placeholder.");
    alertSpy.mockRestore();
  });
});
