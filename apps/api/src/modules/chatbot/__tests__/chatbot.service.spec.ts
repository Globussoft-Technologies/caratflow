import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { ChatbotService } from '../chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  let intentService: any, responseService: any, knowledgeService: any;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['chatSession','chatMessage','chatTemplate','chatFaq'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    intentService = { detectIntent: vi.fn().mockReturnValue({ type: 'GREETING', confidence: 0.9, entities: {} }), matchFaq: vi.fn().mockResolvedValue([]) };
    responseService = { generateGreeting: vi.fn().mockResolvedValue({ content: 'Hello!', messageType: 'QUICK_REPLIES', metadata: {} }), generateFollowUp: vi.fn().mockReturnValue({ content: 'What?', messageType: 'TEXT', metadata: {} }), generateFarewell: vi.fn().mockReturnValue({ content: 'Bye!', messageType: 'TEXT', metadata: {} }), generateEscalationResponse: vi.fn().mockReturnValue({ content: 'Connecting...', messageType: 'TEXT', metadata: { escalated: true } }), buildQuickReplies: vi.fn().mockReturnValue([]), generateProductSuggestions: vi.fn().mockResolvedValue({ content: 'Products', messageType: 'PRODUCT_CARD', metadata: {} }), generateFaqResponse: vi.fn().mockReturnValue({ content: 'FAQ', messageType: 'QUICK_REPLIES', metadata: {} }) };
    knowledgeService = { seedDefaultFaqs: vi.fn().mockResolvedValue(0), seedDefaultTemplates: vi.fn().mockResolvedValue(0) };
    service = new ChatbotService(prisma as never, intentService, responseService, knowledgeService);
  });

  describe('startSession', () => {
    it('should create new session with greeting', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      (prisma as any).chatSession.create.mockResolvedValue({ id: 'cs-1', sessionId: 'sess-1', status: 'ACTIVE', metadata: { preferences: {} } });
      (prisma as any).chatMessage.create.mockResolvedValue({ id: 'cm-1', role: 'ASSISTANT', content: 'Hello!', messageType: 'QUICK_REPLIES', metadata: {}, createdAt: new Date() });
      const r = await service.startSession(tenantId, 'sess-1');
      expect(r.status).toBe('ACTIVE');
      expect(r.messages).toHaveLength(1);
    });
    it('should resume existing session', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue({ sessionId: 'sess-1', status: 'ACTIVE', metadata: { preferences: {} }, messages: [{ id: 'cm-1', role: 'ASSISTANT', content: 'Hi', messageType: 'TEXT', metadata: null, createdAt: new Date() }] });
      const r = await service.startSession(tenantId, 'sess-1');
      expect(r.messages).toHaveLength(1);
    });
    it('should seed FAQs and templates', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      (prisma as any).chatSession.create.mockResolvedValue({ id: 'cs-1', sessionId: 'sess-1', status: 'ACTIVE', metadata: { preferences: {} } });
      (prisma as any).chatMessage.create.mockResolvedValue({ id: 'cm-1', role: 'ASSISTANT', content: 'Hi', messageType: 'TEXT', metadata: {}, createdAt: new Date() });
      await service.startSession(tenantId, 'sess-1');
      expect(knowledgeService.seedDefaultFaqs).toHaveBeenCalled();
      expect(knowledgeService.seedDefaultTemplates).toHaveBeenCalled();
    });
  });

  describe('processMessage', () => {
    it('should save user message and generate response', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue({ id: 'cs-1', sessionId: 'sess-1', status: 'ACTIVE', metadata: { preferences: {} } });
      (prisma as any).chatSession.update.mockResolvedValue({});
      (prisma as any).chatMessage.create.mockResolvedValue({ id: 'cm-1', role: 'USER', content: 'hi', messageType: 'TEXT', metadata: null, createdAt: new Date() });
      (prisma as any).chatTemplate.findMany.mockResolvedValue([]);
      const r = await service.processMessage(tenantId, 'sess-1', 'hi');
      expect(r.messages.length).toBeGreaterThanOrEqual(1);
    });
    it('should throw NotFoundException for missing session', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      await expect(service.processMessage(tenantId, 'bad', 'hi')).rejects.toThrow(NotFoundException);
    });
  });

  describe('closeSession', () => {
    it('should close session and add system message', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue({ id: 'cs-1' });
      (prisma as any).chatSession.update.mockResolvedValue({});
      (prisma as any).chatMessage.create.mockResolvedValue({});
      await service.closeSession(tenantId, 'sess-1');
      expect((prisma as any).chatSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CLOSED' }) }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      await expect(service.closeSession(tenantId, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('escalateToHuman', () => {
    it('should set status to ESCALATED', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue({ id: 'cs-1', status: 'ACTIVE' });
      (prisma as any).chatSession.update.mockResolvedValue({});
      (prisma as any).chatMessage.create.mockResolvedValue({});
      await service.escalateToHuman(tenantId, 'sess-1', 'staff-1');
      expect((prisma as any).chatSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ESCALATED', escalatedTo: 'staff-1' }) }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      await expect(service.escalateToHuman(tenantId, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSession', () => {
    it('should return session with messages', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue({ sessionId: 'sess-1', status: 'ACTIVE', metadata: {}, messages: [] });
      const r = await service.getSession(tenantId, 'sess-1');
      expect(r.sessionId).toBe('sess-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).chatSession.findFirst.mockResolvedValue(null);
      await expect(service.getSession(tenantId, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listActiveSessions', () => {
    it('should return paginated sessions', async () => {
      (prisma as any).chatSession.findMany.mockResolvedValue([{ id: 'cs-1', sessionId: 'sess-1', customerId: null, status: 'ACTIVE', startedAt: new Date(), lastMessageAt: new Date(), _count: { messages: 3 } }]);
      (prisma as any).chatSession.count.mockResolvedValue(1);
      const r = await service.listActiveSessions(tenantId);
      expect(r.total).toBe(1);
      expect(r.items[0].messageCount).toBe(3);
    });
  });
});
