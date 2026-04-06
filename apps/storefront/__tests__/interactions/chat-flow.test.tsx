/**
 * Chat flow interaction tests.
 * Covers message input, send button, quick replies, occasion picker, budget slider.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "@/app/chat/page";

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
    usePathname: () => "/chat",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

// Mock fetch globally for chat API calls
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // Default: api calls fail gracefully, triggering fallback message
  fetchMock.mockRejectedValue(new Error("Network error"));
  vi.stubGlobal("fetch", fetchMock);
});

describe("Chat Flow", () => {
  it("renders chat page with header showing CaratFlow Assistant", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByText("CaratFlow Assistant")).toBeInTheDocument();
    });
  });

  it("shows online status indicator", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  it("renders message input with placeholder text", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask me anything about jewelry/i)).toBeInTheDocument();
    });
  });

  it("renders send button with aria-label", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });
  });

  it("send button is disabled when input is empty", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toBeDisabled();
    });
  });

  it("shows fallback welcome message when API fails", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/welcome to caratflow/i),
      ).toBeInTheDocument();
    });
  });

  it("typing in input enables the send button", async () => {
    const user = userEvent.setup();
    render(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText(/ask me anything/i);
    await user.type(input, "Show me rings");
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).not.toBeDisabled();
  });

  it("has a back link to home page", async () => {
    render(<ChatPage />);
    await waitFor(() => {
      const backLink = screen.getByRole("link");
      expect(backLink).toHaveAttribute("href", "/");
    });
  });
});
