import { describe, it, expect } from 'vitest';
import {
  SendMessageInputSchema,
  StartChatInputSchema,
  ChatFaqInputSchema,
  ChatTemplateInputSchema,
} from '../chatbot';

describe('StartChatInputSchema', () => {
  it('should parse empty input (all optional)', () => {
    const result = StartChatInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept optional customerId', () => {
    const result = StartChatInputSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('SendMessageInputSchema', () => {
  it('should parse valid message', () => {
    const result = SendMessageInputSchema.safeParse({
      sessionId: 'session-abc-123',
      content: 'I am looking for a gold necklace',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messageType).toBe('TEXT');
    }
  });

  it('should reject empty content', () => {
    const result = SendMessageInputSchema.safeParse({
      sessionId: 'session-abc',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty sessionId', () => {
    const result = SendMessageInputSchema.safeParse({
      sessionId: '',
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('should accept explicit messageType', () => {
    const result = SendMessageInputSchema.safeParse({
      sessionId: 'sess-1',
      content: 'Show me products',
      messageType: 'PRODUCT_LIST',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid messageType', () => {
    const result = SendMessageInputSchema.safeParse({
      sessionId: 'sess-1',
      content: 'Hello',
      messageType: 'AUDIO',
    });
    expect(result.success).toBe(false);
  });
});

describe('ChatFaqInputSchema', () => {
  it('should parse valid FAQ input', () => {
    const result = ChatFaqInputSchema.safeParse({
      question: 'What is the return policy?',
      answer: 'You can return items within 7 days.',
      category: 'RETURNS',
      keywords: ['return', 'refund', 'exchange'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.priority).toBe(0);
    }
  });

  it('should reject empty question', () => {
    const result = ChatFaqInputSchema.safeParse({
      question: '',
      answer: 'Answer',
      category: 'GENERAL',
      keywords: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ChatTemplateInputSchema', () => {
  it('should parse valid template', () => {
    const result = ChatTemplateInputSchema.safeParse({
      triggerKeywords: ['hello', 'hi'],
      responseTemplate: 'Welcome to our store! How can I help you?',
      category: 'GREETING',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid category', () => {
    const result = ChatTemplateInputSchema.safeParse({
      triggerKeywords: ['test'],
      responseTemplate: 'Test response',
      category: 'INVALID_CATEGORY',
    });
    expect(result.success).toBe(false);
  });
});
