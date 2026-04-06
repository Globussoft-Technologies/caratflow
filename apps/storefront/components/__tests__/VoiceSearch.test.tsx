import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import VoiceSearch from "@/components/VoiceSearch";
import { render } from "./test-utils";

describe("VoiceSearch", () => {
  it("renders mic button when SpeechRecognition is supported", () => {
    // Mock SpeechRecognition as available
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = vi.fn();
    render(<VoiceSearch onResult={vi.fn()} />);
    expect(screen.getByLabelText(/voice search/i)).toBeInTheDocument();
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it("renders disabled mic when SpeechRecognition is not supported", () => {
    // Ensure neither SpeechRecognition nor webkitSpeechRecognition exist
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    render(<VoiceSearch onResult={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /voice search/i });
    // The button may be disabled or have cursor-not-allowed
    expect(btn).toBeDisabled();
  });

  it("shows language selector button", () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = vi.fn();
    render(<VoiceSearch onResult={vi.fn()} />);
    expect(screen.getByLabelText("Change voice language")).toBeInTheDocument();
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it("shows unsupported browser state with title attribute", () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    render(<VoiceSearch onResult={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", expect.stringContaining("not supported"));
  });
});
