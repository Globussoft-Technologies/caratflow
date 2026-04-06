// ─── Chatbot Intent Detection Service ──────────────────────────
// Rule-based NLP engine for detecting user intent from messages.
// Extracts occasion, budget, metal type, category, and style.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { DetectedIntent, ChatIntentType } from '@caratflow/shared-types';

/** Keyword maps for intent classification */
const OCCASION_KEYWORDS: Record<string, string[]> = {
  wedding: ['wedding', 'shaadi', 'vivah', 'bridal', 'bride', 'dulhan', 'marriage', 'nikah'],
  engagement: ['engagement', 'sagai', 'ring ceremony', 'propose', 'proposal'],
  birthday: ['birthday', 'bday', 'janamdin'],
  anniversary: ['anniversary', 'milestone'],
  daily_wear: ['daily wear', 'everyday', 'casual', 'office wear', 'regular', 'daily use'],
  festive: ['festive', 'festival', 'diwali', 'eid', 'navratri', 'puja', 'holi', 'christmas', 'onam', 'pongal', 'durga puja'],
  party: ['party', 'cocktail', 'evening', 'night out'],
  gift: ['gift', 'gifting', 'present', 'surprise', 'tohfa'],
};

const METAL_KEYWORDS: Record<string, string[]> = {
  GOLD: ['gold', 'sona', 'golden', 'yellow gold', 'rose gold', 'white gold'],
  SILVER: ['silver', 'chandi', 'sterling'],
  PLATINUM: ['platinum'],
  DIAMOND: ['diamond', 'heera', 'solitaire', 'brilliant cut', 'round cut'],
  GEMSTONE: ['gemstone', 'ruby', 'emerald', 'sapphire', 'panna', 'neelam', 'manik'],
  KUNDAN: ['kundan', 'polki', 'jadau', 'meenakari'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ring: ['ring', 'rings', 'anguthi', 'band'],
  necklace: ['necklace', 'necklaces', 'haar', 'chain necklace', 'choker', 'rani haar'],
  earring: ['earring', 'earrings', 'jhumka', 'jhumkas', 'jhumki', 'studs', 'tops', 'chandbali', 'bali'],
  bangle: ['bangle', 'bangles', 'chudi', 'chura', 'kangan', 'kada'],
  bracelet: ['bracelet', 'bracelets'],
  pendant: ['pendant', 'pendants', 'locket'],
  chain: ['chain', 'chains'],
  mangalsutra: ['mangalsutra', 'mangal sutra', 'thali'],
  nose_pin: ['nose pin', 'nose ring', 'nath', 'nathni'],
  anklet: ['anklet', 'anklets', 'payal', 'pajeb'],
  set: ['set', 'jewellery set', 'jewelry set', 'bridal set', 'complete set'],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  modern: ['modern', 'contemporary', 'sleek', 'trendy', 'new age'],
  traditional: ['traditional', 'classic', 'heritage', 'temple', 'south indian'],
  antique: ['antique', 'vintage', 'old world', 'retro'],
  minimalist: ['minimalist', 'simple', 'elegant', 'subtle', 'dainty', 'light weight', 'lightweight', 'delicate'],
};

const GREETING_KEYWORDS = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'namaste', 'namaskar', 'howdy', 'sup', 'hola',
];

const FAREWELL_KEYWORDS = [
  'bye', 'goodbye', 'thanks', 'thank you', 'dhanyawad', 'shukriya',
  'that\'s all', 'nothing else', 'done', 'ok bye',
];

const ESCALATE_KEYWORDS = [
  'human', 'agent', 'real person', 'talk to someone', 'customer service',
  'customer support', 'manager', 'complaint', 'help me', 'speak to',
  'connect me', 'representative',
];

const FAQ_KEYWORDS: Record<string, string[]> = {
  shipping: ['shipping', 'delivery', 'deliver', 'ship', 'courier', 'dispatch', 'when will i get'],
  returns: ['return', 'refund', 'exchange', 'money back', 'replace'],
  payment: ['payment', 'pay', 'upi', 'card', 'emi', 'net banking', 'cod', 'cash on delivery', 'payment method'],
  tracking: ['track', 'tracking', 'where is my order', 'order status', 'shipped'],
  custom_order: ['custom', 'customize', 'personalise', 'personalize', 'engrave', 'bespoke', 'made to order'],
  hallmark: ['hallmark', 'huid', 'purity', 'bis', 'certified', 'genuine', 'real gold'],
  sizing: ['size', 'sizing', 'ring size', 'bangle size', 'measurement', 'fit'],
  emi: ['emi', 'installment', 'no cost emi', 'easy emi'],
  digital_gold: ['digital gold', 'gold online', 'buy gold', 'gold savings'],
  gold_scheme: ['gold scheme', 'savings scheme', 'monthly scheme', 'kitty', 'chit'],
};

/** Budget parsing patterns (INR-centric) */
const BUDGET_PATTERNS: Array<{ regex: RegExp; extract: (m: RegExpMatchArray) => { min?: number; max?: number } }> = [
  // "under 50000" or "below 50k"
  {
    regex: /(?:under|below|less than|upto|up to|within|max|maximum)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?/i,
    extract: (m) => ({ max: parseCurrencyValue(m[1], m[2]) }),
  },
  // "above 50000" or "more than 50k"
  {
    regex: /(?:above|over|more than|min|minimum|at least|starting)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?/i,
    extract: (m) => ({ min: parseCurrencyValue(m[1], m[2]) }),
  },
  // "between 20000 and 50000" or "20k-50k" or "Rs 20000 to 50000"
  {
    regex: /(?:between|from)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?\s*(?:to|-|and)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?/i,
    extract: (m) => ({
      min: parseCurrencyValue(m[1], m[2]),
      max: parseCurrencyValue(m[3], m[4]),
    }),
  },
  // "around 50000" or "approximately 50k"
  {
    regex: /(?:around|approximately|approx|about|roughly|near)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?/i,
    extract: (m) => {
      const val = parseCurrencyValue(m[1], m[2]);
      return { min: Math.round(val * 0.8), max: Math.round(val * 1.2) };
    },
  },
  // Standalone "Rs 50000" or "50k budget" or "₹50000"
  {
    regex: /(?:rs\.?|inr|₹)\s*([\d,]+)\s*(k|lakh|lac|l|crore|cr)?(?:\s*(?:budget|range))?/i,
    extract: (m) => {
      const val = parseCurrencyValue(m[1], m[2]);
      return { min: Math.round(val * 0.7), max: Math.round(val * 1.3) };
    },
  },
  // "50k budget" or "2 lakh"
  {
    regex: /([\d,]+)\s*(k|lakh|lac|l|crore|cr)\s*(?:budget|range)?/i,
    extract: (m) => {
      const val = parseCurrencyValue(m[1], m[2]);
      return { min: Math.round(val * 0.7), max: Math.round(val * 1.3) };
    },
  },
];

function parseCurrencyValue(numStr: string, suffix?: string): number {
  const num = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(num)) return 0;

  const multiplier = suffix?.toLowerCase();
  if (!multiplier) return num * 100; // Convert to paise

  switch (multiplier) {
    case 'k':
      return num * 1000 * 100;
    case 'lakh':
    case 'lac':
    case 'l':
      return num * 100000 * 100;
    case 'crore':
    case 'cr':
      return num * 10000000 * 100;
    default:
      return num * 100;
  }
}

@Injectable()
export class ChatbotIntentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detect the primary intent and extract entities from a user message.
   */
  detectIntent(message: string): DetectedIntent {
    const normalized = message.toLowerCase().trim();
    const entities: DetectedIntent['entities'] = {};

    // Check greeting
    if (this.matchesKeywords(normalized, GREETING_KEYWORDS)) {
      return { type: 'GREETING', confidence: 0.9, entities };
    }

    // Check farewell
    if (this.matchesKeywords(normalized, FAREWELL_KEYWORDS)) {
      return { type: 'FAREWELL', confidence: 0.9, entities };
    }

    // Check escalation
    if (this.matchesKeywords(normalized, ESCALATE_KEYWORDS)) {
      return { type: 'ESCALATE', confidence: 0.95, entities };
    }

    // Extract entities
    const occasion = this.extractOccasion(normalized);
    if (occasion) entities.occasion = occasion;

    const budget = this.extractBudget(normalized);
    if (budget.min !== undefined) entities.budgetMin = budget.min;
    if (budget.max !== undefined) entities.budgetMax = budget.max;

    const metal = this.extractMetal(normalized);
    if (metal) entities.metalType = metal;

    const category = this.extractCategory(normalized);
    if (category) entities.category = category;

    const style = this.extractStyle(normalized);
    if (style) entities.style = style;

    // Check FAQ
    const faqKeywords = this.extractFaqKeywords(normalized);
    if (faqKeywords.length > 0) {
      entities.faqKeywords = faqKeywords;
      return { type: 'FAQ_QUERY', confidence: 0.8, entities };
    }

    // Determine primary intent from extracted entities
    const intentType = this.classifyIntent(entities);

    return {
      type: intentType,
      confidence: this.calculateConfidence(entities),
      entities,
    };
  }

  /**
   * Extract occasion from natural language.
   */
  extractOccasion(message: string): string | undefined {
    const normalized = message.toLowerCase();
    for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        return occasion;
      }
    }
    return undefined;
  }

  /**
   * Extract budget range from natural language.
   * Returns values in paise.
   */
  extractBudget(message: string): { min?: number; max?: number } {
    const normalized = message.toLowerCase();
    for (const pattern of BUDGET_PATTERNS) {
      const match = normalized.match(pattern.regex);
      if (match) {
        const result = pattern.extract(match);
        // Sanity check: swap if min > max
        if (result.min !== undefined && result.max !== undefined && result.min > result.max) {
          const temp = result.min;
          result.min = result.max;
          result.max = temp;
        }
        return result;
      }
    }
    return {};
  }

  /**
   * Extract metal type preference from message.
   */
  extractMetal(message: string): string | undefined {
    const normalized = message.toLowerCase();
    for (const [metal, keywords] of Object.entries(METAL_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        return metal;
      }
    }
    return undefined;
  }

  /**
   * Extract product category from message.
   */
  extractCategory(message: string): string | undefined {
    const normalized = message.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * Extract style preference from message.
   */
  extractStyle(message: string): string | undefined {
    const normalized = message.toLowerCase();
    for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        return style;
      }
    }
    return undefined;
  }

  /**
   * Fuzzy match user message against the FAQ knowledge base.
   * Returns matching FAQ entries sorted by relevance.
   */
  async matchFaq(
    tenantId: string,
    message: string,
  ): Promise<Array<{ id: string; question: string; answer: string; score: number }>> {
    const normalized = message.toLowerCase();
    const words = normalized.split(/\s+/).filter((w) => w.length > 2);

    const faqs = await this.prisma.chatFaq.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    const scored = faqs
      .map((faq) => {
        const faqKeywords = (faq.keywords as string[]) ?? [];
        const questionWords = faq.question.toLowerCase().split(/\s+/);
        let score = 0;

        // Keyword matching
        for (const word of words) {
          if (faqKeywords.some((kw) => kw.toLowerCase().includes(word) || word.includes(kw.toLowerCase()))) {
            score += 3;
          }
          if (questionWords.some((qw) => qw.includes(word) || word.includes(qw))) {
            score += 1;
          }
        }

        // Priority bonus
        score += faq.priority * 0.5;

        return { id: faq.id, question: faq.question, answer: faq.answer, score };
      })
      .filter((item) => item.score > 1)
      .sort((a, b) => b.score - a.score);

    return scored;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => {
      // For short keywords, match as whole word
      if (kw.length <= 3) {
        const regex = new RegExp(`\\b${this.escapeRegex(kw)}\\b`, 'i');
        return regex.test(text);
      }
      return text.includes(kw);
    });
  }

  private extractFaqKeywords(message: string): string[] {
    const matched: string[] = [];
    for (const [topic, keywords] of Object.entries(FAQ_KEYWORDS)) {
      if (keywords.some((kw) => message.includes(kw))) {
        matched.push(topic);
      }
    }
    return matched;
  }

  private classifyIntent(entities: DetectedIntent['entities']): ChatIntentType {
    if (entities.occasion) return 'OCCASION_QUERY';
    if (entities.budgetMin !== undefined || entities.budgetMax !== undefined) return 'BUDGET_QUERY';
    if (entities.metalType) return 'METAL_QUERY';
    if (entities.category) return 'CATEGORY_QUERY';
    if (entities.style) return 'STYLE_QUERY';
    return 'UNKNOWN';
  }

  private calculateConfidence(entities: DetectedIntent['entities']): number {
    let score = 0;
    if (entities.occasion) score += 0.25;
    if (entities.budgetMin !== undefined || entities.budgetMax !== undefined) score += 0.25;
    if (entities.metalType) score += 0.2;
    if (entities.category) score += 0.2;
    if (entities.style) score += 0.1;
    return Math.min(score + 0.3, 1.0);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
