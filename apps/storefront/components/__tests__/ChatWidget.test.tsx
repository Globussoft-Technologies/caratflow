import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatWidget from "@/components/ChatWidget";
import { render } from "./test-utils";

// Mock fetch to avoid real API calls
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatWidget", () => {
  it("renders chat button", () => {
    render(<ChatWidget />);
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });

  it("opens chat panel on button click", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await act(async () => {
      await user.click(screen.getByLabelText("Open chat"));
    });
    await waitFor(() => {
      expect(screen.getByText("CaratFlow Assistant")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("shows message input when opened", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await act(async () => {
      await user.click(screen.getByLabelText("Open chat"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("shows send button when opened", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await act(async () => {
      await user.click(screen.getByLabelText("Open chat"));
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Send message")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("has close button in opened state", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await act(async () => {
      await user.click(screen.getByLabelText("Open chat"));
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Close chat")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("shows fallback greeting when API is unavailable", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await act(async () => {
      await user.click(screen.getByLabelText("Open chat"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Welcome to CaratFlow/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
