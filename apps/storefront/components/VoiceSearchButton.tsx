"use client";

// VoiceSearchButton
// ─────────────────
// Self-contained mic button that uses the Web Speech API to produce a
// single final transcript, and reports it to the parent via `onTranscript`.
// No network round-trip — speech-to-text runs entirely in the browser.
//
// Gracefully degrades when SpeechRecognition is unavailable (disabled button
// with an explanatory tooltip). Supports en-IN / hi-IN / ta-IN, with the
// locale persisted in localStorage under "voice_search_locale".

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────

export type VoiceLocale = "en-IN" | "hi-IN" | "ta-IN";

export interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  /** Initial locale; if omitted the stored/default locale ('en-IN') is used. */
  locale?: VoiceLocale;
  /** Hide the inline locale picker (useful when the parent owns locale state). */
  hideLocalePicker?: boolean;
  className?: string;
}

// Web Speech API — typings aren't guaranteed in lib.dom across all targets,
// so we declare the minimum surface we actually use.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

// ─── Constants ────────────────────────────────────────────────────

const STORAGE_KEY = "voice_search_locale";
const LISTEN_TIMEOUT_MS = 10_000;

const LOCALES: ReadonlyArray<{ code: VoiceLocale; short: string; label: string }> = [
  { code: "en-IN", short: "EN", label: "English (India)" },
  { code: "hi-IN", short: "HI", label: "हिन्दी / Hindi" },
  { code: "ta-IN", short: "TA", label: "தமிழ் / Tamil" },
];

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function readStoredLocale(): VoiceLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "en-IN" || value === "hi-IN" || value === "ta-IN") return value;
  } catch {
    // Storage may throw in private mode — treat as no preference.
  }
  return null;
}

function writeStoredLocale(locale: VoiceLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore quota/availability errors.
  }
}

// ─── Component ────────────────────────────────────────────────────

export default function VoiceSearchButton({
  onTranscript,
  locale,
  hideLocalePicker = false,
  className,
}: VoiceSearchButtonProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [activeLocale, setActiveLocale] = useState<VoiceLocale>(locale ?? "en-IN");
  const [showLocaleMenu, setShowLocaleMenu] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Detect support + restore stored locale on mount.
  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
    if (!locale) {
      const stored = readStoredLocale();
      if (stored) setActiveLocale(stored);
    }
  }, [locale]);

  // Keep activeLocale in sync when parent changes the prop explicitly.
  useEffect(() => {
    if (locale) setActiveLocale(locale);
  }, [locale]);

  // Close locale menu on outside click.
  useEffect(() => {
    if (!showLocaleMenu) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowLocaleMenu(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showLocaleMenu]);

  // Cleanup on unmount — abort any in-flight recognition.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* noop */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = activeLocale;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      const trimmed = finalText.trim();
      if (trimmed) onTranscript(trimmed);
    };

    recognition.onerror = () => {
      // Any error ends the listening state; specific handling could be added later.
      setListening(false);
    };

    recognition.onend = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      // Auto-stop after the timeout in case the browser doesn't end on silence.
      timeoutRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
      }, LISTEN_TIMEOUT_MS);
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  }, [activeLocale, onTranscript]);

  const handleMicClick = useCallback(() => {
    if (!supported) return;
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [supported, listening, startListening, stopListening]);

  const handleLocaleChange = useCallback((next: VoiceLocale) => {
    setActiveLocale(next);
    writeStoredLocale(next);
    setShowLocaleMenu(false);
  }, []);

  const currentShort = LOCALES.find((l) => l.code === activeLocale)?.short ?? "EN";

  // Unsupported browser — disabled mic with tooltip.
  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label="Voice search"
        title="Voice not supported"
        className={cn(
          "p-2 text-navy/30 cursor-not-allowed rounded-full",
          className,
        )}
      >
        <MicOffIcon />
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("relative flex items-center", className)}>
      <button
        type="button"
        onClick={handleMicClick}
        aria-label="Voice search"
        aria-pressed={listening}
        title={listening ? "Stop listening" : "Voice search"}
        className={cn(
          "relative p-2 rounded-full transition-colors duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1",
          listening
            ? "text-red-500 bg-red-50"
            : "text-navy/50 hover:text-gold hover:bg-gold/10",
        )}
      >
        <MicIcon />
        {listening && (
          <>
            <span
              className="absolute inset-0 rounded-full animate-ping bg-red-400/30"
              aria-hidden="true"
            />
            <span
              className="absolute -inset-1 rounded-full animate-pulse bg-red-400/15"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {!hideLocalePicker && (
        <button
          type="button"
          onClick={() => setShowLocaleMenu((v) => !v)}
          aria-label="Voice search language"
          aria-haspopup="listbox"
          aria-expanded={showLocaleMenu}
          className={cn(
            "ml-0.5 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            "text-navy/40 hover:text-navy/70 transition-colors rounded",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          )}
        >
          {currentShort}
        </button>
      )}

      {showLocaleMenu && !hideLocalePicker && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[160px]"
        >
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              type="button"
              role="option"
              aria-selected={activeLocale === loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              className={cn(
                "w-full px-3 py-2 text-xs text-left transition-colors",
                activeLocale === loc.code
                  ? "bg-gold/10 text-gold font-medium"
                  : "text-navy/70 hover:bg-warm-gray",
              )}
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* Screen-reader-only live region announcing listening state. */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {listening ? "Listening" : ""}
      </span>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg
      className="w-5 h-5 relative"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18"
      />
    </svg>
  );
}
