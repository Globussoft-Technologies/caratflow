"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { STORE_API } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { Metadata } from "next";

// ─── Types ──────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  messageType: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface QuickReply {
  label: string;
  value: string;
}

interface ProductCard {
  productId: string;
  name: string;
  image: string | null;
  pricePaise: number;
  currencyCode: string;
  weightMg: number | null;
  purity: number | null;
  productType: string;
}

interface OccasionOption {
  label: string;
  value: string;
  icon: string;
}

interface BudgetSliderMeta {
  minPaise: number;
  maxPaise: number;
  stepPaise: number;
  defaultMinPaise: number;
  defaultMaxPaise: number;
}

// ─── Constants ──────────────────────────────────────────────────

const STORAGE_KEY = "caratflow_chat_session";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "default";

const OCCASION_ICONS: Record<string, string> = {
  rings: "\uD83D\uDC8D",
  ring: "\uD83D\uDC8D",
  cake: "\uD83C\uDF82",
  sun: "\u2600\uFE0F",
  sparkles: "\u2728",
  gift: "\uD83C\uDF81",
};

// ─── API Helpers ────────────────────────────────────────────────

function getHeaders(sessionId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-tenant-id": TENANT_ID,
    "x-session-id": sessionId,
  };
}

async function apiStartChat(sessionId: string) {
  const res = await fetch(`${STORE_API}/chat/start`, {
    method: "POST",
    headers: getHeaders(sessionId),
    body: JSON.stringify({ sessionId }),
  });
  return (await res.json()).data;
}

async function apiSendMessage(sessionId: string, content: string) {
  const res = await fetch(`${STORE_API}/chat/message`, {
    method: "POST",
    headers: getHeaders(sessionId),
    body: JSON.stringify({ sessionId, content }),
  });
  return (await res.json()).data;
}

async function apiGetSession(sessionId: string) {
  const res = await fetch(`${STORE_API}/chat/session/${sessionId}`, {
    headers: getHeaders(sessionId),
  });
  return (await res.json()).data;
}

// ─── Full Page Chat ─────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(STORAGE_KEY, newId);
      setSessionId(newId);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const initChat = async () => {
      setIsLoading(true);
      try {
        const session = await apiGetSession(sessionId).catch(() => null);
        if (session?.messages?.length > 0) {
          setMessages(session.messages);
        } else {
          const newSession = await apiStartChat(sessionId);
          if (newSession?.messages) {
            setMessages(newSession.messages);
          }
        }
      } catch {
        setMessages([{
          id: "fallback",
          role: "ASSISTANT",
          content: "Welcome to CaratFlow! How can I help you find the perfect jewelry today?",
          messageType: "TEXT",
          metadata: null,
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    };
    initChat();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !sessionId) return;
    setIsLoading(true);
    setInputValue("");

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content,
      messageType: "TEXT",
      metadata: null,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const response = await apiSendMessage(sessionId, content);
      if (response?.messages) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempMsg.id);
          return [...withoutTemp, ...response.messages];
        });
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "ASSISTANT",
        content: "Sorry, something went wrong. Please try again.",
        messageType: "TEXT",
        metadata: null,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  const handleQuickReply = (value: string) => sendMessage(value);
  const handleBudgetSubmit = (min: number, max: number) => {
    sendMessage(`My budget is between Rs ${Math.round(min / 100).toLocaleString("en-IN")} and Rs ${Math.round(max / 100).toLocaleString("en-IN")}`);
  };
  const handleOccasionPick = (value: string) => sendMessage(`I'm looking for ${value} jewelry`);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-navy/40 hover:text-navy transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-navy">CaratFlow Assistant</h1>
              <p className="text-xs text-navy/50">Your personal jewelry expert</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-xs text-navy/50">Online</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages
            .filter((m) => m.role !== "SYSTEM")
            .map((msg) => (
              <FullPageMessageBubble
                key={msg.id}
                message={msg}
                onQuickReply={handleQuickReply}
                onBudgetSubmit={handleBudgetSubmit}
                onOccasionPick={handleOccasionPick}
              />
            ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gold/10 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2.5 h-2.5 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2.5 h-2.5 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputValue);
              }
            }}
            placeholder="Ask me anything about jewelry..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="w-12 h-12 bg-gold hover:bg-gold-dark disabled:bg-gray-200 rounded-full flex items-center justify-center transition-colors shrink-0"
            aria-label="Send"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Full Page Message Bubble ───────────────────────────────────

function FullPageMessageBubble({
  message,
  onQuickReply,
  onBudgetSubmit,
  onOccasionPick,
}: {
  message: ChatMessage;
  onQuickReply: (value: string) => void;
  onBudgetSubmit: (min: number, max: number) => void;
  onOccasionPick: (value: string) => void;
}) {
  const isUser = message.role === "USER";
  const metadata: Record<string, unknown> = message.metadata ?? {};
  const rawQuickReplies = metadata.quickReplies;
  const quickReplies: QuickReply[] = Array.isArray(rawQuickReplies)
    ? (rawQuickReplies as QuickReply[])
    : [];
  const hasQuickReplies: boolean = quickReplies.length > 0;

  const renderQuickReplies = (): ReactNode => {
    if (message.messageType !== "QUICK_REPLIES" || !hasQuickReplies) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {quickReplies.map((reply: QuickReply) => {
          const label: string = String(reply.label);
          const value: string = String(reply.value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onQuickReply(value)}
              className="px-4 py-2 bg-white border border-gold/30 text-gold-dark text-sm font-medium rounded-full hover:bg-gold/5 hover:border-gold/50 transition-all"
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-9 h-9 bg-gold/10 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}
      {isUser && (
        <div className="w-9 h-9 bg-navy/10 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-navy/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "ml-auto" : ""}`}>
        <div
          className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gold text-white rounded-tr-sm"
              : "bg-white border border-gray-100 text-navy rounded-tl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Product Cards */}
        {(message.messageType === "PRODUCT_CARD" && metadata.products != null) ? (
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {(metadata.products as ProductCard[]).map((product) => (
                <Link
                  key={product.productId}
                  href={`/product/${product.productId}`}
                  className="block w-44 bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gold/30 hover:shadow-md transition-all shrink-0"
                >
                  <div className="aspect-square bg-warm-gray overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-navy/20">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[10px] text-gold font-medium uppercase tracking-wider">
                      {product.productType}{product.purity ? ` \u00B7 ${product.purity}` : ""}
                    </p>
                    <p className="text-xs font-semibold text-navy leading-tight line-clamp-2 mt-0.5">{product.name}</p>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className="text-sm font-bold text-navy">{formatPrice(product.pricePaise)}</span>
                      {product.weightMg != null && <span className="text-[9px] text-navy/40">{(product.weightMg / 1000).toFixed(1)}g</span>}
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] font-medium text-gold bg-gold/5 px-2.5 py-1 rounded-full">View Details</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {renderQuickReplies()}

        {/* Occasion Picker */}
        {message.messageType === "OCCASION_PICKER" && Array.isArray(metadata.occasions) ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(metadata.occasions as OccasionOption[]).map((occ) => {
              const icon: string = String(occ.icon ?? "");
              const label: string = String(occ.label ?? "");
              const value: string = String(occ.value ?? "");
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onOccasionPick(value)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-100 rounded-xl hover:border-gold/30 hover:bg-gold/5 transition-all"
                >
                  <span className="text-xl">{OCCASION_ICONS[icon] ?? "\u2728"}</span>
                  <span className="text-xs font-medium text-navy">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Budget Slider */}
        {message.messageType === "BUDGET_SLIDER" && message.metadata && (
          <BudgetSlider
            meta={message.metadata as unknown as BudgetSliderMeta}
            onSubmit={onBudgetSubmit}
          />
        )}

        <p className={`text-[10px] text-navy/30 mt-1.5 ${isUser ? "text-right" : ""}`}>
          {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Budget Slider ──────────────────────────────────────────────

function BudgetSlider({
  meta,
  onSubmit,
}: {
  meta: BudgetSliderMeta;
  onSubmit: (min: number, max: number) => void;
}) {
  const [range, setRange] = useState<[number, number]>([meta.defaultMinPaise, meta.defaultMaxPaise]);

  const fmt = (paise: number) => {
    const r = paise / 100;
    if (r >= 100000) return `${(r / 100000).toFixed(1)}L`;
    if (r >= 1000) return `${(r / 1000).toFixed(0)}K`;
    return r.toLocaleString("en-IN");
  };

  return (
    <div className="mt-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between text-sm font-medium text-navy mb-3">
        <span>{fmt(range[0])}</span>
        <span className="text-navy/40">to</span>
        <span>{fmt(range[1])}</span>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-navy/40 uppercase tracking-wider">Min Budget</label>
          <input
            type="range"
            min={meta.minPaise}
            max={meta.maxPaise}
            step={meta.stepPaise}
            value={range[0]}
            onChange={(e) => setRange([Math.min(Number(e.target.value), range[1] - meta.stepPaise), range[1]])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-gold"
          />
        </div>
        <div>
          <label className="text-[10px] text-navy/40 uppercase tracking-wider">Max Budget</label>
          <input
            type="range"
            min={meta.minPaise}
            max={meta.maxPaise}
            step={meta.stepPaise}
            value={range[1]}
            onChange={(e) => setRange([range[0], Math.max(Number(e.target.value), range[0] + meta.stepPaise)])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-gold"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSubmit(range[0], range[1])}
        className="w-full mt-3 py-2.5 bg-gold text-white text-sm font-medium rounded-full hover:bg-gold-dark transition-colors"
      >
        Apply Budget Range
      </button>
    </div>
  );
}
