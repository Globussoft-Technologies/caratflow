import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { render } from "./test-utils";
import VoiceSearchButton from "@/components/VoiceSearchButton";

// Minimal shape of a fake SpeechRecognition result.
interface MockResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}

// Factory that produces a fake SpeechRecognition class along with handles
// to assert calls and simulate events from the test body.
function installMockSpeechRecognition() {
  const instances: MockRecognition[] = [];

  class MockRecognition {
    continuous = false;
    interimResults = false;
    lang = "";
    onresult: ((e: { results: MockResult[]; resultIndex: number }) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    start = vi.fn(() => {
      this.onstart?.();
    });
    stop = vi.fn(() => {
      this.onend?.();
    });
    abort = vi.fn(() => {
      this.onend?.();
    });
    constructor() {
      instances.push(this);
    }
    // Helper used by tests to emit a final transcript.
    emitFinal(text: string) {
      const results: MockResult[] = [
        { isFinal: true, 0: { transcript: text, confidence: 1 } } as unknown as MockResult,
      ];
      (results as unknown as { length: number }).length = 1;
      this.onresult?.({ results, resultIndex: 0 });
    }
  }

  (window as unknown as Record<string, unknown>).SpeechRecognition = MockRecognition;
  return {
    instances,
    MockRecognition,
    cleanup() {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
      delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    },
  };
}

describe("VoiceSearchButton", () => {
  beforeEach(() => {
    // Ensure a clean slate.
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    window.localStorage.clear();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it("renders the mic button when SpeechRecognition is supported", () => {
    const mock = installMockSpeechRecognition();
    render(<VoiceSearchButton onTranscript={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Voice search" })).toBeInTheDocument();
    mock.cleanup();
  });

  it("starts recognition on click and sets aria-pressed while listening", () => {
    const mock = installMockSpeechRecognition();
    render(<VoiceSearchButton onTranscript={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Voice search" });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    act(() => {
      fireEvent.click(btn);
    });

    expect(mock.instances).toHaveLength(1);
    expect(mock.instances[0].start).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    mock.cleanup();
  });

  it("calls onTranscript with the final recognized text", () => {
    const mock = installMockSpeechRecognition();
    const onTranscript = vi.fn();
    render(<VoiceSearchButton onTranscript={onTranscript} />);
    const btn = screen.getByRole("button", { name: "Voice search" });

    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      mock.instances[0].emitFinal("gold necklace under 50000");
    });

    expect(onTranscript).toHaveBeenCalledWith("gold necklace under 50000");
    mock.cleanup();
  });

  it("renders a disabled button when SpeechRecognition is unavailable", () => {
    render(<VoiceSearchButton onTranscript={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Voice search" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Voice not supported");
  });

  it("applies the locale prop to recognition.lang", () => {
    const mock = installMockSpeechRecognition();
    render(<VoiceSearchButton onTranscript={vi.fn()} locale="hi-IN" />);
    const btn = screen.getByRole("button", { name: "Voice search" });
    act(() => {
      fireEvent.click(btn);
    });
    expect(mock.instances[0].lang).toBe("hi-IN");
    mock.cleanup();
  });

  it("persists locale choice to localStorage when changed via the picker", () => {
    const mock = installMockSpeechRecognition();
    render(<VoiceSearchButton onTranscript={vi.fn()} />);
    const picker = screen.getByRole("button", { name: /voice search language/i });
    act(() => {
      fireEvent.click(picker);
    });
    const taOption = screen.getByRole("option", { name: /tamil/i });
    act(() => {
      fireEvent.click(taOption);
    });
    expect(window.localStorage.getItem("voice_search_locale")).toBe("ta-IN");
    mock.cleanup();
  });
});
