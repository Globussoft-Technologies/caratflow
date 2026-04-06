"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────

interface VoiceSearchProps {
  onResult: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  className?: string;
}

type VoiceState = "idle" | "listening" | "processing" | "error";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
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
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

// ─── Language Options ─────────────────────────────────────────────

const LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi" },
] as const;

// ─── Component ────────────────────────────────────────────────────

export default function VoiceSearch({ onResult, onInterimResult, className }: VoiceSearchProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Close language menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Create recognition instance
    const recognition = new (SpeechRecognition as new () => SpeechRecognitionInstance)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onstart = () => {
      setState("listening");
      setErrorMessage(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results in real-time
      if (interimTranscript && onInterimResult) {
        onInterimResult(interimTranscript);
      }

      // On final result, trigger search
      if (finalTranscript) {
        setState("processing");
        onResult(finalTranscript.trim());
        setTimeout(() => setState("idle"), 500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let message = "Could not understand. Please try again.";
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          message = "Microphone access denied. Please allow microphone access in your browser settings.";
          break;
        case "no-speech":
          message = "No speech detected. Please try again.";
          break;
        case "network":
          message = "Network error. Please check your connection.";
          break;
        case "aborted":
          message = "";
          break;
      }
      setErrorMessage(message);
      setState("error");
      if (message) {
        setTimeout(() => {
          setState("idle");
          setErrorMessage(null);
        }, 3000);
      } else {
        setState("idle");
      }
    };

    recognition.onend = () => {
      if (state === "listening") {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setErrorMessage("Could not start voice recognition.");
      setState("error");
    }
  }, [selectedLang, onResult, onInterimResult, state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState("idle");
  }, []);

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Unsupported browser fallback
  if (!isSupported) {
    return (
      <button
        type="button"
        className={cn(
          "p-2 text-navy/30 cursor-not-allowed",
          className,
        )}
        title="Voice search is not supported in this browser. Try Chrome, Edge, or Safari."
        disabled
      >
        <MicOffIcon />
      </button>
    );
  }

  return (
    <div className={cn("relative flex items-center", className)} ref={langMenuRef}>
      {/* Microphone button */}
      <button
        type="button"
        onClick={handleMicClick}
        className={cn(
          "relative p-2 rounded-full transition-all duration-200",
          state === "idle" && "text-navy/50 hover:text-gold hover:bg-gold/10",
          state === "listening" && "text-red-500 bg-red-50",
          state === "processing" && "text-gold bg-gold/10",
          state === "error" && "text-red-400",
        )}
        title={state === "listening" ? "Stop listening" : "Voice search"}
        aria-label={state === "listening" ? "Stop voice search" : "Start voice search"}
      >
        {state === "listening" ? (
          <div className="relative">
            <MicIcon />
            {/* Pulsing animation rings */}
            <span className="absolute inset-0 rounded-full animate-ping bg-red-400/30" />
            <span className="absolute -inset-1 rounded-full animate-pulse bg-red-400/15" />
          </div>
        ) : state === "processing" ? (
          <div className="animate-pulse">
            <MicIcon />
          </div>
        ) : (
          <MicIcon />
        )}
      </button>

      {/* Language selector (long press or right click could open, but we use a small button) */}
      <button
        type="button"
        onClick={() => setShowLangMenu(!showLangMenu)}
        className="ml-0.5 p-0.5 text-[10px] text-navy/30 hover:text-navy/60 transition-colors"
        title="Change voice language"
        aria-label="Change voice language"
      >
        {LANGUAGES.find((l) => l.code === selectedLang)?.code.split("-")[0].toUpperCase() ?? "EN"}
      </button>

      {/* Language dropdown */}
      {showLangMenu && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[160px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setSelectedLang(lang.code);
                setShowLangMenu(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                selectedLang === lang.code
                  ? "bg-gold/10 text-gold font-medium"
                  : "text-navy/70 hover:bg-warm-gray",
              )}
            >
              <span>{lang.label}</span>
              {selectedLang === lang.code && (
                <svg className="w-3 h-3 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Listening indicator */}
      {state === "listening" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 px-3 py-2 whitespace-nowrap z-50">
          <div className="flex items-center gap-2">
            {/* Waveform animation */}
            <div className="flex items-center gap-0.5 h-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-red-400 rounded-full animate-waveform"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: "100%",
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-navy/60">Listening...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {state === "error" && errorMessage && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-nowrap z-50 max-w-[250px]">
          <p className="text-xs text-red-600 text-center">{errorMessage}</p>
        </div>
      )}

      {/* Waveform keyframes injected via style tag */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes waveform {
              0%, 100% { transform: scaleY(0.3); }
              50% { transform: scaleY(1); }
            }
            .animate-waveform {
              animation: waveform 0.6s ease-in-out infinite;
            }
          `,
        }}
      />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18"
      />
    </svg>
  );
}
