"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { STORE_API } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

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
  currencyCode: string;
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
  const json = await res.json();
  return json.data;
}

async function apiSendMessage(sessionId: string, content: string) {
  const res = await fetch(`${STORE_API}/chat/message`, {
    method: "POST",
    headers: getHeaders(sessionId),
    body: JSON.stringify({ sessionId, content }),
  });
  const json = await res.json();
  return json.data;
}

async function apiGetSession(sessionId: string) {
  const res = await fetch(`${STORE_API}/chat/session/${sessionId}`, {
    headers: getHeaders(sessionId),
  });
  const json = await res.json();
  return json.data;
}

async function apiEscalate(sessionId: string) {
  await fetch(`${STORE_API}/chat/escalate/${sessionId}`, {
    method: "POST",
    headers: getHeaders(sessionId),
  });
}

// ─── Chat Widget Component ─────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate or restore session ID
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

  // Initialize chat when widget opens
  useEffect(() => {
    if (!isOpen || !sessionId || messages.length > 0) return;

    const initChat = async () => {
      setIsLoading(true);
      try {
        // Try to resume existing session
        const session = await apiGetSession(sessionId).catch(() => null);
        if (session?.messages?.length > 0) {
          setMessages(session.messages);
        } else {
          // Start new session
          const newSession = await apiStartChat(sessionId);
          if (newSession?.messages) {
            setMessages(newSession.messages);
          }
        }
      } catch {
        // Fallback greeting if API is unavailable
        setMessages([{
          id: "fallback-greeting",
          role: "ASSISTANT",
          content: "Welcome to CaratFlow! I'm here to help you find beautiful jewelry. How can I assist you today?",
          messageType: "TEXT",
          metadata: null,
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [isOpen, sessionId, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !sessionId) return;

    setIsLoading(true);
    setInputValue("");

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content,
      messageType: "TEXT",
      metadata: null,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await apiSendMessage(sessionId, content);
      if (response?.messages) {
        // Replace temp message with actual response (includes user msg + assistant responses)
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...withoutTemp, ...response.messages];
        });
        if (!isOpen) {
          setUnreadCount((c) => c + response.messages.filter((m: ChatMessage) => m.role === "ASSISTANT").length);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "ASSISTANT",
          content: "I'm sorry, I couldn't process your message right now. Please try again.",
          messageType: "TEXT",
          metadata: null,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, isOpen]);

  const handleQuickReply = (value: string) => {
    sendMessage(value);
  };

  const handleBudgetSubmit = (minPaise: number, maxPaise: number) => {
    const minRupees = Math.round(minPaise / 100);
    const maxRupees = Math.round(maxPaise / 100);
    sendMessage(`My budget is between Rs ${minRupees.toLocaleString("en-IN")} and Rs ${maxRupees.toLocaleString("en-IN")}`);
  };

  const handleOccasionPick = (value: string) => {
    sendMessage(`I'm looking for ${value} jewelry`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-gold to-gold-dark rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group hover:scale-105"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy to-navy/90 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gold/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">CaratFlow Assistant</h3>
                <p className="text-white/60 text-xs">Jewelry Expert</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Minimize */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Minimize chat"
              >
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                  localStorage.removeItem(STORAGE_KEY);
                  const newId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                  localStorage.setItem(STORAGE_KEY, newId);
                  setSessionId(newId);
                }}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
            {messages
              .filter((m) => m.role !== "SYSTEM")
              .map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onQuickReply={handleQuickReply}
                  onBudgetSubmit={handleBudgetSubmit}
                  onOccasionPick={handleOccasionPick}
                />
              ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-gold/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-100 px-4 py-3 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 bg-gold hover:bg-gold-dark disabled:bg-gray-200 rounded-full flex items-center justify-center transition-colors shrink-0"
                aria-label="Send message"
              >
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-navy/30 text-center mt-1.5">
              Powered by CaratFlow AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Message Bubble Component ───────────────────────────────────

function MessageBubble({
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

  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 bg-gold/10 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "ml-auto" : ""}`}>
        {/* Text Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-gold text-white rounded-tr-sm"
              : "bg-white border border-gray-100 text-navy rounded-tl-sm"
          }`}
        >
          {String(message.content ?? "")}
        </div>

        {/* Product Cards */}
        {message.messageType === "PRODUCT_CARD" && Array.isArray(message.metadata?.products) && (
          <div className="mt-2 overflow-x-auto pb-2">
            <div className="flex gap-2" style={{ minWidth: "max-content" }}>
              {(message.metadata?.products as ProductCard[]).map((product) => (
                <ProductCardMini key={product.productId} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Replies */}
        {message.messageType === "QUICK_REPLIES" && Array.isArray(message.metadata?.quickReplies) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(message.metadata?.quickReplies as QuickReply[]).map((reply) => (
              <button
                key={reply.value}
                type="button"
                onClick={() => onQuickReply(reply.value)}
                className="px-3 py-1.5 bg-white border border-gold/30 text-gold-dark text-xs font-medium rounded-full hover:bg-gold/5 hover:border-gold/50 transition-all"
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {/* Occasion Picker */}
        {message.messageType === "OCCASION_PICKER" && Array.isArray(message.metadata?.occasions) && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(message.metadata?.occasions as OccasionOption[]).map((occ) => (
              <button
                key={occ.value}
                type="button"
                onClick={() => onOccasionPick(occ.value)}
                className="flex flex-col items-center gap-1 p-2.5 bg-white border border-gray-100 rounded-xl hover:border-gold/30 hover:bg-gold/5 transition-all"
              >
                <span className="text-lg">{OCCASION_ICONS[occ.icon] ?? "\u2728"}</span>
                <span className="text-[10px] font-medium text-navy">{occ.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Budget Slider */}
        {message.messageType === "BUDGET_SLIDER" && message.metadata && (
          <BudgetSliderInput
            meta={message.metadata as unknown as BudgetSliderMeta}
            onSubmit={onBudgetSubmit}
          />
        )}

        {/* Timestamp */}
        <p className={`text-[9px] text-navy/30 mt-1 ${isUser ? "text-right" : ""}`}>
          {new Date(message.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Product Card Mini ──────────────────────────────────────────

function ProductCardMini({ product }: { product: ProductCard }) {
  const weightGrams = product.weightMg ? (product.weightMg / 1000).toFixed(1) : null;
  const purityLabel = product.purity ? `${product.purity}` : null;

  return (
    <Link
      href={`/product/${product.productId}`}
      className="block w-36 bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gold/30 hover:shadow-md transition-all shrink-0"
    >
      <div className="aspect-square bg-warm-gray overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-navy/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] text-gold font-medium uppercase tracking-wider">
          {product.productType}
          {purityLabel ? ` \u00B7 ${purityLabel}` : ""}
        </p>
        <p className="text-xs font-semibold text-navy leading-tight line-clamp-1 mt-0.5">
          {product.name}
        </p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-sm font-bold text-navy">
            {formatPrice(product.pricePaise)}
          </span>
          {weightGrams && (
            <span className="text-[9px] text-navy/40">{weightGrams}g</span>
          )}
        </div>
        <div className="mt-1.5">
          <span className="text-[9px] font-medium text-gold bg-gold/5 px-2 py-0.5 rounded-full">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Budget Slider Input ────────────────────────────────────────

function BudgetSliderInput({
  meta,
  onSubmit,
}: {
  meta: BudgetSliderMeta;
  onSubmit: (min: number, max: number) => void;
}) {
  const [range, setRange] = useState<[number, number]>([
    meta.defaultMinPaise,
    meta.defaultMaxPaise,
  ]);

  const formatLabel = (paise: number) => {
    const rupees = paise / 100;
    if (rupees >= 100000) {
      return `${(rupees / 100000).toFixed(1)}L`;
    }
    if (rupees >= 1000) {
      return `${(rupees / 1000).toFixed(0)}K`;
    }
    return rupees.toLocaleString("en-IN");
  };

  return (
    <div className="mt-2 bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex justify-between text-xs text-navy/60 mb-2">
        <span>{formatLabel(range[0])}</span>
        <span>{formatLabel(range[1])}</span>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-navy/40">Minimum</label>
          <input
            type="range"
            min={meta.minPaise}
            max={meta.maxPaise}
            step={meta.stepPaise}
            value={range[0]}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRange([Math.min(val, range[1] - meta.stepPaise), range[1]]);
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none accent-gold"
          />
        </div>
        <div>
          <label className="text-[10px] text-navy/40">Maximum</label>
          <input
            type="range"
            min={meta.minPaise}
            max={meta.maxPaise}
            step={meta.stepPaise}
            value={range[1]}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRange([range[0], Math.max(val, range[0] + meta.stepPaise)]);
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none accent-gold"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSubmit(range[0], range[1])}
        className="w-full mt-2 py-1.5 bg-gold text-white text-xs font-medium rounded-full hover:bg-gold-dark transition-colors"
      >
        Apply Budget Range
      </button>
    </div>
  );
}
