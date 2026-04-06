// ─── CaratFlow Chatbot Types ───────────────────────────────────
// Types for the AI chatbot / smart assistant module.

import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────

export enum ChatSessionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum ChatMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum ChatMessageType {
  TEXT = 'TEXT',
  PRODUCT_CARD = 'PRODUCT_CARD',
  PRODUCT_LIST = 'PRODUCT_LIST',
  QUICK_REPLIES = 'QUICK_REPLIES',
  OCCASION_PICKER = 'OCCASION_PICKER',
  BUDGET_SLIDER = 'BUDGET_SLIDER',
  IMAGE = 'IMAGE',
}

export enum ChatTemplateCategory {
  GREETING = 'GREETING',
  PRODUCT_QUERY = 'PRODUCT_QUERY',
  PRICE_QUERY = 'PRICE_QUERY',
  OCCASION = 'OCCASION',
  MATERIAL = 'MATERIAL',
  SHIPPING = 'SHIPPING',
  RETURNS = 'RETURNS',
  CUSTOM_ORDER = 'CUSTOM_ORDER',
  SCHEME = 'SCHEME',
  GENERAL = 'GENERAL',
}

// ─── Zod Schemas ───────────────────────────────────────────────

export const ChatSessionStatusEnum = z.enum(['ACTIVE', 'CLOSED', 'ESCALATED']);
export const ChatMessageRoleEnum = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export const ChatMessageTypeEnum = z.enum([
  'TEXT', 'PRODUCT_CARD', 'PRODUCT_LIST', 'QUICK_REPLIES',
  'OCCASION_PICKER', 'BUDGET_SLIDER', 'IMAGE',
]);
export const ChatTemplateCategoryEnum = z.enum([
  'GREETING', 'PRODUCT_QUERY', 'PRICE_QUERY', 'OCCASION',
  'MATERIAL', 'SHIPPING', 'RETURNS', 'CUSTOM_ORDER', 'SCHEME', 'GENERAL',
]);

// ─── Input Schemas ─────────────────────────────────────────────

export const StartChatInputSchema = z.object({
  sessionId: z.string().max(255).optional(),
  customerId: z.string().uuid().optional(),
});
export type StartChatInput = z.infer<typeof StartChatInputSchema>;

export const SendMessageInputSchema = z.object({
  sessionId: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  messageType: ChatMessageTypeEnum.default('TEXT'),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

// ─── Response Schemas ──────────────────────────────────────────

export const QuickReplyOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type QuickReplyOption = z.infer<typeof QuickReplyOptionSchema>;

export const ProductCardDataSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  image: z.string().nullable(),
  pricePaise: z.number().int(),
  currencyCode: z.string(),
  weightMg: z.number().int().nullable(),
  purity: z.number().int().nullable(),
  productType: z.string(),
});
export type ProductCardData = z.infer<typeof ProductCardDataSchema>;

export const ChatPreferencesSchema = z.object({
  occasion: z.string().nullable().optional(),
  budgetMinPaise: z.number().int().nullable().optional(),
  budgetMaxPaise: z.number().int().nullable().optional(),
  metalType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
});
export type ChatPreferences = z.infer<typeof ChatPreferencesSchema>;

export const ChatMessageResponseSchema = z.object({
  id: z.string().uuid(),
  role: ChatMessageRoleEnum,
  content: z.string(),
  messageType: ChatMessageTypeEnum,
  metadata: z.record(z.unknown()).nullable(),
  timestamp: z.coerce.date(),
});
export type ChatMessageResponse = z.infer<typeof ChatMessageResponseSchema>;

export const ChatSessionResponseSchema = z.object({
  sessionId: z.string(),
  status: ChatSessionStatusEnum,
  messages: z.array(ChatMessageResponseSchema),
  detectedPreferences: ChatPreferencesSchema.nullable(),
});
export type ChatSessionResponse = z.infer<typeof ChatSessionResponseSchema>;

// ─── Admin Input Schemas ───────────────────────────────────────

export const ChatFaqInputSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  keywords: z.array(z.string()),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type ChatFaqInput = z.infer<typeof ChatFaqInputSchema>;

export const ChatTemplateInputSchema = z.object({
  triggerKeywords: z.array(z.string()),
  responseTemplate: z.string().min(1).max(5000),
  category: ChatTemplateCategoryEnum,
  isActive: z.boolean().default(true),
});
export type ChatTemplateInput = z.infer<typeof ChatTemplateInputSchema>;

// ─── FAQ Response ──────────────────────────────────────────────

export const ChatFaqResponseSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ChatFaqResponse = z.infer<typeof ChatFaqResponseSchema>;

export const ChatTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  triggerKeywords: z.array(z.string()),
  responseTemplate: z.string(),
  category: ChatTemplateCategoryEnum,
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ChatTemplateResponse = z.infer<typeof ChatTemplateResponseSchema>;

// ─── Intent Detection ──────────────────────────────────────────

export type ChatIntentType =
  | 'GREETING'
  | 'PRODUCT_QUERY'
  | 'OCCASION_QUERY'
  | 'BUDGET_QUERY'
  | 'METAL_QUERY'
  | 'CATEGORY_QUERY'
  | 'STYLE_QUERY'
  | 'FAQ_QUERY'
  | 'ESCALATE'
  | 'FAREWELL'
  | 'UNKNOWN';

export interface DetectedIntent {
  type: ChatIntentType;
  confidence: number;
  entities: {
    occasion?: string;
    budgetMin?: number;
    budgetMax?: number;
    metalType?: string;
    category?: string;
    style?: string;
    faqKeywords?: string[];
  };
}
