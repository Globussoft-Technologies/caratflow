import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { ChatbotKnowledgeService } from '../chatbot.knowledge.service';

describe('ChatbotKnowledgeService', () => {
  let service: ChatbotKnowledgeService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['chatFaq','chatTemplate'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    service = new ChatbotKnowledgeService(prisma as never);
  });

  describe('createFaq', () => {
    it('should create FAQ', async () => {
      (prisma as any).chatFaq.create.mockResolvedValue({ id: 'faq-1', question: 'Q?', answer: 'A', category: 'general', keywords: ['test'], priority: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createFaq(tenantId, { question: 'Q?', answer: 'A', category: 'general', keywords: ['test'], priority: 5, isActive: true } as any);
      expect(r.question).toBe('Q?');
    });
  });

  describe('updateFaq', () => {
    it('should update FAQ', async () => {
      (prisma as any).chatFaq.findFirstOrThrow.mockResolvedValue({ id: 'faq-1' });
      (prisma as any).chatFaq.update.mockResolvedValue({ id: 'faq-1', question: 'Updated?', answer: 'A', category: 'general', keywords: [], priority: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.updateFaq(tenantId, 'faq-1', { question: 'Updated?' });
      expect(r.question).toBe('Updated?');
    });
  });

  describe('getFaq', () => {
    it('should return FAQ', async () => {
      (prisma as any).chatFaq.findFirst.mockResolvedValue({ id: 'faq-1', question: 'Q', answer: 'A', category: 'c', keywords: [], priority: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.getFaq(tenantId, 'faq-1');
      expect(r.id).toBe('faq-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).chatFaq.findFirst.mockResolvedValue(null);
      await expect(service.getFaq(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedDefaultFaqs', () => {
    it('should seed when empty', async () => {
      (prisma as any).chatFaq.count.mockResolvedValue(0);
      (prisma as any).chatFaq.createMany.mockResolvedValue({ count: 10 });
      const r = await service.seedDefaultFaqs(tenantId);
      expect(r).toBe(10);
    });
    it('should skip if already seeded', async () => {
      (prisma as any).chatFaq.count.mockResolvedValue(5);
      const r = await service.seedDefaultFaqs(tenantId);
      expect(r).toBe(0);
    });
  });

  describe('seedDefaultTemplates', () => {
    it('should seed when empty', async () => {
      (prisma as any).chatTemplate.count.mockResolvedValue(0);
      (prisma as any).chatTemplate.createMany.mockResolvedValue({ count: 5 });
      const r = await service.seedDefaultTemplates(tenantId);
      expect(r).toBe(5);
    });
    it('should skip if already seeded', async () => {
      (prisma as any).chatTemplate.count.mockResolvedValue(3);
      const r = await service.seedDefaultTemplates(tenantId);
      expect(r).toBe(0);
    });
  });

  describe('createTemplate', () => {
    it('should create template', async () => {
      (prisma as any).chatTemplate.create.mockResolvedValue({ id: 't-1', triggerKeywords: ['hi'], responseTemplate: 'Hello', category: 'GREETING', isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createTemplate(tenantId, { triggerKeywords: ['hi'], responseTemplate: 'Hello', category: 'GREETING', isActive: true } as any);
      expect(r.triggerKeywords).toEqual(['hi']);
    });
  });
});
