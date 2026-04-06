import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { ChatbotResponseService } from '../chatbot.response.service';

describe('ChatbotResponseService', () => {
  let service: ChatbotResponseService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).category = { findMany: vi.fn() };
    prisma.product.findMany = vi.fn() as any;
    prisma.customer.findFirst = vi.fn() as any;
    service = new ChatbotResponseService(prisma as never);
  });

  describe('generateProductSuggestions', () => {
    it('should return products matching preferences', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Ring', images: [], sellingPricePaise: 50000n, currencyCode: 'INR', metalWeightMg: 5000, metalPurity: 916, productType: 'GOLD' }] as any);
      const r = await service.generateProductSuggestions(tenantId, { metalType: 'GOLD', budgetMaxPaise: 100000 } as any);
      expect(r.messageType).toBe('PRODUCT_CARD');
    });
    it('should return no-results message when empty', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      const r = await service.generateProductSuggestions(tenantId, { metalType: 'GOLD' } as any);
      expect(r.messageType).toBe('QUICK_REPLIES');
    });
  });

  describe('generateGreeting', () => {
    it('should personalize with customer name', async () => {
      prisma.customer.findFirst.mockResolvedValue({ firstName: 'Rajesh' } as any);
      const r = await service.generateGreeting(tenantId, 'c1');
      expect(r.content).toContain('Rajesh');
    });
    it('should use generic greeting without customer', async () => {
      const r = await service.generateGreeting(tenantId);
      expect(r.content).toContain('Namaste');
    });
  });

  describe('generateFollowUp', () => {
    it('should ask about occasion when missing', () => {
      const r = service.generateFollowUp({ occasion: null, budgetMinPaise: 1000, budgetMaxPaise: null, metalType: null, category: null, style: null });
      expect(r.messageType).toBe('OCCASION_PICKER');
    });
    it('should ask about budget when missing', () => {
      const r = service.generateFollowUp({ occasion: 'wedding', budgetMinPaise: null, budgetMaxPaise: null, metalType: null, category: null, style: null });
      expect(r.messageType).toBe('BUDGET_SLIDER');
    });
    it('should ask about category when missing', () => {
      const r = service.generateFollowUp({ occasion: 'wedding', budgetMinPaise: 1000, budgetMaxPaise: 50000, metalType: null, category: null, style: null });
      expect(r.messageType).toBe('QUICK_REPLIES');
    });
  });

  describe('generateFaqResponse', () => {
    it('should wrap answer with quick replies', () => {
      const r = service.generateFaqResponse('Q?', 'Answer');
      expect(r.content).toBe('Answer');
      expect(r.messageType).toBe('QUICK_REPLIES');
    });
  });

  describe('generateFarewell', () => {
    it('should return farewell message', () => {
      const r = service.generateFarewell();
      expect(r.content).toContain('Thank you');
    });
  });

  describe('generateEscalationResponse', () => {
    it('should return escalation message', () => {
      const r = service.generateEscalationResponse();
      expect(r.content).toContain('human agent');
      expect(r.metadata.escalated).toBe(true);
    });
  });

  describe('buildQuickReplies', () => {
    it('should include missing preference options', () => {
      const r = service.buildQuickReplies({ hasOccasion: false, hasBudget: true, hasMetal: true, hasCategory: true });
      expect(r.some((q: any) => q.label === 'Choose Occasion')).toBe(true);
    });
    it('should always include Show Results', () => {
      const r = service.buildQuickReplies({ hasOccasion: true, hasBudget: true, hasMetal: true, hasCategory: true });
      expect(r.some((q: any) => q.label === 'Show Results')).toBe(true);
    });
  });

  describe('generateOccasionResponse', () => {
    it('should return wedding-specific message', () => {
      const r = service.generateOccasionResponse('wedding');
      expect(r).toContain('bridal');
    });
    it('should return generic message for unknown occasion', () => {
      const r = service.generateOccasionResponse('custom_event');
      expect(r).toContain('custom_event');
    });
  });
});
