import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "@/components/SearchBar";
import { renderWithStore } from "./test-utils";

// Mock VoiceSearch to avoid SpeechRecognition issues
vi.mock("@/components/VoiceSearch", () => ({
  default: ({ onResult }: { onResult: (s: string) => void }) => {
    const React = require("react");
    return React.createElement("button", {
      type: "button",
      "aria-label": "Start voice search",
      onClick: () => onResult("gold ring"),
    });
  },
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input", () => {
    renderWithStore(<SearchBar />);
    expect(screen.getByPlaceholderText(/Search for jewelry/)).toBeInTheDocument();
  });

  it("renders input with combobox role", () => {
    renderWithStore(<SearchBar />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows recent searches on focus when empty", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithStore(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search for jewelry/);
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Recent Searches")).toBeInTheDocument();
    });
  });

  it("accepts typed text and updates input value", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithStore(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search for jewelry/) as HTMLInputElement;
    await user.type(input, "gold ring");
    expect(input.value).toBe("gold ring");
  });

  it("shows clear button when input has text", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithStore(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search for jewelry/);
    await user.type(input, "gold");
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("clears input on clear button click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithStore(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search for jewelry/) as HTMLInputElement;
    await user.type(input, "gold");
    await user.click(screen.getByLabelText("Clear search"));
    expect(input.value).toBe("");
  });

  it("renders voice search button", () => {
    renderWithStore(<SearchBar />);
    expect(screen.getByLabelText("Voice search")).toBeInTheDocument();
  });

  it("closes dropdown on escape", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithStore(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search for jewelry/);
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Recent Searches")).toBeInTheDocument();
    });
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Recent Searches")).not.toBeInTheDocument();
  });
});
