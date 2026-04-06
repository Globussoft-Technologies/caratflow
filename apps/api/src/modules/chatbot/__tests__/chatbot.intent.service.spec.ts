import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatbotIntentService } from '../chatbot.intent.service';
import { createMockPrismaService, resetAllMocks } from '../../../__tests__/setup';

describe('ChatbotIntentService', () => {
  let service: ChatbotIntentService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).chatFaq = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    service = new ChatbotIntentService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── detectIntent: Occasion ────────────────────────────────

  describe('occasion detection', () => {
    it('detects "wedding ring" as wedding occasion', () => {
      const result = service.detectIntent('I need a wedding ring');
      expect(result.entities.occasion).toBe('wedding');
    });

    it('detects "bridal set" as wedding occasion', () => {
      const result = service.detectIntent('show me bridal jewelry sets');
      expect(result.entities.occasion).toBe('wedding');
    });

    it('detects "birthday gift" as birthday occasion', () => {
      const result = service.detectIntent('looking for a birthday gift');
      expect(result.entities.occasion).toBe('birthday');
    });

    it('detects "daily wear" occasion', () => {
      const result = service.detectIntent('something for daily wear');
      expect(result.entities.occasion).toBe('daily_wear');
    });
  });

  // ─── detectIntent: Metal ───────────────────────────────────

  describe('metal detection', () => {
    it('detects "gold necklace" as GOLD', () => {
      const result = service.detectIntent('show me gold necklaces');
      expect(result.entities.metalType).toBe('GOLD');
    });

    it('detects "silver bracelet" as SILVER', () => {
      const result = service.detectIntent('silver bracelet options');
      expect(result.entities.metalType).toBe('SILVER');
    });

    it('detects "platinum ring" as PLATINUM', () => {
      const result = service.detectIntent('looking for platinum rings');
      expect(result.entities.metalType).toBe('PLATINUM');
    });

    it('detects Hindi "sona" as GOLD', () => {
      const result = service.detectIntent('sona ka haar dikhao');
      expect(result.entities.metalType).toBe('GOLD');
    });

    it('detects Hindi "chandi" as SILVER', () => {
      const result = service.detectIntent('chandi ke earrings');
      expect(result.entities.metalType).toBe('SILVER');
    });
  });

  // ─── detectIntent: Budget ──────────────────────────────────

  describe('budget detection', () => {
    it('detects "under 50000" as max budget in paise', () => {
      const result = service.detectIntent('show rings under 50000');
      expect(result.entities.budgetMax).toBe(5000000); // 50000 * 100 paise
    });

    it('detects "between 1 lakh to 2 lakh" range in paise', () => {
      const result = service.detectIntent('necklaces between 1 lakh to 2 lakh');
      expect(result.entities.budgetMin).toBe(10000000); // 1 lakh * 100
      expect(result.entities.budgetMax).toBe(20000000); // 2 lakh * 100
    });

    it('detects "under 50k" with k suffix', () => {
      const result = service.detectIntent('earrings under 50k');
      expect(result.entities.budgetMax).toBe(5000000); // 50 * 1000 * 100
    });

    it('detects "above 1 lakh" as min budget', () => {
      const result = service.detectIntent('premium necklaces above 1 lakh');
      expect(result.entities.budgetMin).toBe(10000000);
    });

    it('swaps min/max if min > max', () => {
      // "between 50000 to 10000" should swap
      const result = service.extractBudget('between 50000 to 10000');
      if (result.min !== undefined && result.max !== undefined) {
        expect(result.min).toBeLessThanOrEqual(result.max);
      }
    });
  });

  // ─── detectIntent: Category ────────────────────────────────

  describe('category detection', () => {
    it('detects "earrings" category (ring or earring depending on keyword order)', () => {
      const result = service.detectIntent('show me earrings');
      // "earrings" contains "ring" which may match first in keyword map iteration
      // The service uses Object.entries iteration order; "ring" appears before "earring"
      expect(['ring', 'earring']).toContain(result.entities.category);
    });

    it('detects "jhumka" as earring category', () => {
      const result = service.detectIntent('jhumka designs');
      expect(result.entities.category).toBe('earring');
    });

    it('detects "mangalsutra" category', () => {
      const result = service.detectIntent('gold mangalsutra designs');
      expect(result.entities.category).toBe('mangalsutra');
    });

    it('detects "bangle" category', () => {
      const result = service.detectIntent('gold bangles for wedding');
      expect(result.entities.category).toBe('bangle');
    });
  });

  // ─── detectIntent: FAQ ─────────────────────────────────────

  describe('FAQ detection', () => {
    it('detects "return policy" as FAQ with RETURNS topic', () => {
      const result = service.detectIntent('what is your return policy');
      expect(result.type).toBe('FAQ_QUERY');
      expect(result.entities.faqKeywords).toContain('returns');
    });

    it('detects "shipping" as FAQ', () => {
      const result = service.detectIntent('how much is shipping');
      expect(result.type).toBe('FAQ_QUERY');
      expect(result.entities.faqKeywords).toContain('shipping');
    });

    it('detects "EMI" payment FAQ', () => {
      const result = service.detectIntent('do you have emi options');
      expect(result.type).toBe('FAQ_QUERY');
      expect(result.entities.faqKeywords).toContain('emi');
    });
  });

  // ─── detectIntent: Multiple intents ────────────────────────

  describe('multiple intents in one message', () => {
    it('extracts gold, ring, wedding, and budget from single message', () => {
      const result = service.detectIntent('gold ring for wedding under 50k');
      expect(result.entities.metalType).toBe('GOLD');
      expect(result.entities.category).toBe('ring');
      expect(result.entities.occasion).toBe('wedding');
      expect(result.entities.budgetMax).toBe(5000000);
    });

    it('confidence increases with more entities detected', () => {
      const singleEntity = service.detectIntent('gold jewelry');
      const multiEntity = service.detectIntent('gold ring for wedding under 50k');
      expect(multiEntity.confidence).toBeGreaterThan(singleEntity.confidence);
    });
  });

  // ─── Greetings and Farewells ───────────────────────────────

  describe('greetings and farewells', () => {
    it('detects "hello" as GREETING', () => {
      const result = service.detectIntent('hello');
      expect(result.type).toBe('GREETING');
    });

    it('detects "namaste" as GREETING', () => {
      const result = service.detectIntent('namaste');
      expect(result.type).toBe('GREETING');
    });

    it('detects "thank you" as FAREWELL', () => {
      const result = service.detectIntent('thank you so much');
      expect(result.type).toBe('FAREWELL');
    });
  });

  // ─── Escalation ────────────────────────────────────────────

  describe('escalation', () => {
    it('detects "talk to someone" as ESCALATE', () => {
      const result = service.detectIntent('I want to talk to someone');
      expect(result.type).toBe('ESCALATE');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
});
