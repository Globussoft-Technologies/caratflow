// ─── Chatbot Core Service ──────────────────────────────────────
// Orchestrates the chat flow: session management, intent detection,
// preference accumulation, and response generation.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { ChatbotIntentService } from './chatbot.intent.service';
import { ChatbotResponseService } from './chatbot.response.service';
import { ChatbotKnowledgeService } from './chatbot.knowledge.service';
import { Prisma } from '@caratflow/db';
import type {
  ChatPreferences,
  ChatMessageResponse,
  ChatSessionResponse,
  DetectedIntent,
} from '@caratflow/shared-types';

interface ProcessedResponse {
  messages: ChatMessageResponse[];
}

@Injectable()
export class ChatbotService extends TenantAwareService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    prisma: PrismaService,
    private readonly intentService: ChatbotIntentService,
    private readonly responseService: ChatbotResponseService,
    private readonly knowledgeService: ChatbotKnowledgeService,
  ) {
    super(prisma);
  }

  /**
   * Start a new chat session or resume an existing one.
   * Sends a welcome greeting with quick reply options.
   */
  async startSession(
    tenantId: string,
    sessionId: string,
    customerId?: string,
  ): Promise<ChatSessionResponse> {
    // Ensure FAQs are seeded for this tenant
    await this.knowledgeService.seedDefaultFaqs(tenantId);
    await this.knowledgeService.seedDefaultTemplates(tenantId);

    // Check for existing active session
    const existing = await this.prisma.chatSession.findFirst({
      where: this.tenantWhere(tenantId, { sessionId, status: 'ACTIVE' }),
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (existing) {
      return this.mapSessionResponse(existing);
    }

    // Create new session
    const session = await this.prisma.chatSession.create({
      data: {
        tenantId,
        sessionId,
        customerId: customerId ?? null,
        status: 'ACTIVE',
        metadata: { preferences: {} },
      },
    });

    // Generate greeting
    const greeting = await this.responseService.generateGreeting(tenantId, customerId);

    // Save greeting message
    const greetingMessage = await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'ASSISTANT',
        content: greeting.content,
        messageType: greeting.messageType,
        metadata: greeting.metadata as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      sessionId: session.sessionId,
      status: 'ACTIVE',
      messages: [this.mapMessageResponse(greetingMessage)],
      detectedPreferences: null,
    };
  }

  /**
   * Process an incoming user message.
   * 1. Detect intent
   * 2. Update session preferences
   * 3. Generate response(s)
   */
  async processMessage(
    tenantId: string,
    sessionId: string,
    content: string,
    messageType: string = 'TEXT',
  ): Promise<ProcessedResponse> {
    // Find active session
    const session = await this.prisma.chatSession.findFirst({
      where: this.tenantWhere(tenantId, { sessionId, status: 'ACTIVE' }),
    });

    if (!session) {
      throw new NotFoundException('Chat session not found or already closed');
    }

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'USER',
        content,
        messageType: messageType as 'TEXT',
        metadata: Prisma.JsonNull,
      },
    });

    // Detect intent
    const intent = this.intentService.detectIntent(content);
    this.logger.debug(`Detected intent: ${intent.type} (${intent.confidence}) for session ${sessionId}`);

    // Get current preferences from session metadata
    const metadata = (session.metadata as Record<string, unknown>) ?? {};
    const currentPreferences = (metadata.preferences as ChatPreferences) ?? {};

    // Merge new entities into preferences
    const updatedPreferences = this.mergePreferences(currentPreferences, intent);

    // Update session metadata
    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
        metadata: {
          ...metadata,
          preferences: updatedPreferences,
          lastIntent: intent.type,
        },
      },
    });

    // Generate response(s) based on intent
    const responses = await this.generateResponses(tenantId, session.id, intent, updatedPreferences);

    return { messages: [this.mapMessageResponse(userMessage), ...responses] };
  }

  /**
   * Get full session history.
   */
  async getSession(tenantId: string, sessionId: string): Promise<ChatSessionResponse> {
    const session = await this.prisma.chatSession.findFirst({
      where: this.tenantWhere(tenantId, { sessionId }),
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.mapSessionResponse(session);
  }

  /**
   * Close a chat session.
   */
  async closeSession(tenantId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.chatSession.findFirst({
      where: this.tenantWhere(tenantId, { sessionId }),
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    // Add system close message
    await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'SYSTEM',
        content: 'Chat session ended. Thank you for chatting with CaratFlow!',
        messageType: 'TEXT',
      },
    });
  }

  /**
   * Escalate a session to a human agent.
   */
  async escalateToHuman(
    tenantId: string,
    sessionId: string,
    staffUserId?: string,
  ): Promise<void> {
    const session = await this.prisma.chatSession.findFirst({
      where: this.tenantWhere(tenantId, { sessionId, status: 'ACTIVE' }),
    });

    if (!session) {
      throw new NotFoundException('Active chat session not found');
    }

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        status: 'ESCALATED',
        escalatedTo: staffUserId ?? null,
      },
    });

    // Add escalation notice
    await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'SYSTEM',
        content: 'This conversation has been escalated to a human agent. Someone will be with you shortly.',
        messageType: 'TEXT',
        metadata: { escalatedTo: staffUserId ?? null },
      },
    });
  }

  /**
   * List active sessions for admin view.
   */
  async listActiveSessions(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: Array<{
      id: string;
      sessionId: string;
      customerId: string | null;
      status: string;
      startedAt: Date;
      lastMessageAt: Date;
      messageCount: number;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const where = this.tenantWhere(tenantId);

    const [sessions, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: sessions.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        customerId: s.customerId,
        status: s.status,
        startedAt: s.startedAt,
        lastMessageAt: s.lastMessageAt,
        messageCount: s._count.messages,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get escalated sessions for admin.
   */
  async listEscalatedSessions(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.listSessionsByStatus(tenantId, 'ESCALATED', page, limit);
  }

  // ─── Private: Response Generation ────────────────────────────

  private async generateResponses(
    tenantId: string,
    sessionPk: string,
    intent: DetectedIntent,
    preferences: ChatPreferences,
  ): Promise<ChatMessageResponse[]> {
    const responses: ChatMessageResponse[] = [];

    switch (intent.type) {
      case 'GREETING': {
        const greeting = await this.responseService.generateGreeting(tenantId);
        responses.push(await this.saveAssistantMessage(sessionPk, greeting));
        break;
      }

      case 'FAREWELL': {
        const farewell = this.responseService.generateFarewell();
        responses.push(await this.saveAssistantMessage(sessionPk, farewell));
        break;
      }

      case 'ESCALATE': {
        const escalation = this.responseService.generateEscalationResponse();
        responses.push(await this.saveAssistantMessage(sessionPk, escalation));
        break;
      }

      case 'FAQ_QUERY': {
        const faqMatches = await this.intentService.matchFaq(
          tenantId,
          intent.entities.faqKeywords?.join(' ') ?? '',
        );

        if (faqMatches.length > 0 && faqMatches[0]) {
          const topFaq = faqMatches[0];
          const faqResponse = this.responseService.generateFaqResponse(topFaq.question, topFaq.answer);
          responses.push(await this.saveAssistantMessage(sessionPk, faqResponse));
        } else {
          const fallback = {
            content: 'I\'m not sure about that. Let me connect you with someone who can help, or you can try asking in a different way.',
            messageType: 'QUICK_REPLIES' as const,
            metadata: {
              quickReplies: [
                { label: 'Talk to Agent', value: 'connect me to an agent' },
                { label: 'Browse Jewelry', value: 'show jewelry' },
              ],
            },
          };
          responses.push(await this.saveAssistantMessage(sessionPk, fallback));
        }
        break;
      }

      case 'OCCASION_QUERY': {
        // Send occasion acknowledgment
        const occasionMsg = this.responseService.generateOccasionResponse(
          intent.entities.occasion ?? '',
        );
        responses.push(await this.saveAssistantMessage(sessionPk, {
          content: occasionMsg,
          messageType: 'TEXT',
          metadata: {},
        }));

        // Check if we have enough preferences to show products
        if (this.hasEnoughPreferences(preferences)) {
          const products = await this.responseService.generateProductSuggestions(tenantId, preferences);
          responses.push(await this.saveAssistantMessage(sessionPk, products));
        } else {
          const followUp = this.responseService.generateFollowUp(preferences);
          responses.push(await this.saveAssistantMessage(sessionPk, followUp));
        }
        break;
      }

      case 'BUDGET_QUERY':
      case 'METAL_QUERY':
      case 'CATEGORY_QUERY':
      case 'STYLE_QUERY': {
        // Acknowledge the preference
        const ack = this.buildAcknowledgment(intent);
        responses.push(await this.saveAssistantMessage(sessionPk, {
          content: ack,
          messageType: 'TEXT',
          metadata: {},
        }));

        // Check if we have enough preferences to show products
        if (this.hasEnoughPreferences(preferences)) {
          const products = await this.responseService.generateProductSuggestions(tenantId, preferences);
          responses.push(await this.saveAssistantMessage(sessionPk, products));
        } else {
          const followUp = this.responseService.generateFollowUp(preferences);
          responses.push(await this.saveAssistantMessage(sessionPk, followUp));
        }
        break;
      }

      case 'PRODUCT_QUERY': {
        const products = await this.responseService.generateProductSuggestions(tenantId, preferences);
        responses.push(await this.saveAssistantMessage(sessionPk, products));
        break;
      }

      default: {
        // Try to match against templates
        const templateMatch = await this.findMatchingTemplate(tenantId, intent);
        if (templateMatch) {
          responses.push(await this.saveAssistantMessage(sessionPk, {
            content: templateMatch,
            messageType: 'TEXT',
            metadata: {},
          }));
        } else {
          // Unknown intent -- ask clarifying question
          const clarify = {
            content: 'I\'d love to help! Could you tell me more about what you\'re looking for? You can mention the type of jewelry, occasion, budget, or metal you prefer.',
            messageType: 'QUICK_REPLIES' as const,
            metadata: {
              quickReplies: this.responseService.buildQuickReplies({
                hasOccasion: !!preferences.occasion,
                hasBudget: !!preferences.budgetMinPaise || !!preferences.budgetMaxPaise,
                hasMetal: !!preferences.metalType,
                hasCategory: !!preferences.category,
              }),
            },
          };
          responses.push(await this.saveAssistantMessage(sessionPk, clarify));
        }
        break;
      }
    }

    return responses;
  }

  // ─── Private: Helpers ────────────────────────────────────────

  private async saveAssistantMessage(
    sessionPk: string,
    response: { content: string; messageType: string; metadata: Record<string, unknown> },
  ): Promise<ChatMessageResponse> {
    const msg = await this.prisma.chatMessage.create({
      data: {
        chatSessionId: sessionPk,
        role: 'ASSISTANT',
        content: response.content,
        messageType: response.messageType as 'TEXT',
        metadata: response.metadata as unknown as Prisma.InputJsonValue,
      },
    });
    return this.mapMessageResponse(msg);
  }

  private mergePreferences(
    current: ChatPreferences,
    intent: DetectedIntent,
  ): ChatPreferences {
    return {
      occasion: intent.entities.occasion ?? current.occasion ?? null,
      budgetMinPaise: intent.entities.budgetMin ?? current.budgetMinPaise ?? null,
      budgetMaxPaise: intent.entities.budgetMax ?? current.budgetMaxPaise ?? null,
      metalType: intent.entities.metalType ?? current.metalType ?? null,
      category: intent.entities.category ?? current.category ?? null,
      style: intent.entities.style ?? current.style ?? null,
    };
  }

  private hasEnoughPreferences(preferences: ChatPreferences): boolean {
    let count = 0;
    if (preferences.occasion) count++;
    if (preferences.budgetMinPaise || preferences.budgetMaxPaise) count++;
    if (preferences.metalType) count++;
    if (preferences.category) count++;
    // Need at least 2 preferences to show product suggestions
    return count >= 2;
  }

  private buildAcknowledgment(intent: DetectedIntent): string {
    switch (intent.type) {
      case 'BUDGET_QUERY': {
        const min = intent.entities.budgetMin;
        const max = intent.entities.budgetMax;
        if (min && max) {
          return `Got it! I'll look for jewelry between ${this.formatPaise(min)} and ${this.formatPaise(max)}.`;
        }
        if (max) {
          return `Got it! I'll look for jewelry under ${this.formatPaise(max)}.`;
        }
        if (min) {
          return `Got it! I'll look for jewelry starting from ${this.formatPaise(min)}.`;
        }
        return 'I noted your budget preference.';
      }
      case 'METAL_QUERY':
        return `Great choice! ${intent.entities.metalType} jewelry is always a wonderful option.`;
      case 'CATEGORY_QUERY':
        return `Looking for ${intent.entities.category}s? Excellent taste!`;
      case 'STYLE_QUERY':
        return `Love the ${intent.entities.style} style! Let me find pieces that match.`;
      default:
        return 'Got it! Let me find the best options for you.';
    }
  }

  private formatPaise(paise: number): string {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rupees);
  }

  private async findMatchingTemplate(
    tenantId: string,
    intent: DetectedIntent,
  ): Promise<string | null> {
    const templates = await this.prisma.chatTemplate.findMany({
      where: { tenantId, isActive: true },
    });

    // Simple keyword matching against trigger keywords
    const allEntityValues = Object.values(intent.entities)
      .flat()
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.toLowerCase());

    for (const template of templates) {
      const triggers = (template.triggerKeywords as string[]) ?? [];
      const hasMatch = triggers.some((trigger) =>
        allEntityValues.some((val) => val.includes(trigger.toLowerCase())),
      );
      if (hasMatch) {
        return template.responseTemplate;
      }
    }

    return null;
  }

  private mapSessionResponse(session: Record<string, unknown> & {
    messages?: Array<Record<string, unknown>>;
  }): ChatSessionResponse {
    const metadata = (session.metadata as Record<string, unknown>) ?? {};
    const preferences = (metadata.preferences as ChatPreferences) ?? null;

    return {
      sessionId: session.sessionId as string,
      status: session.status as 'ACTIVE' | 'CLOSED' | 'ESCALATED',
      messages: (session.messages ?? []).map((m) => this.mapMessageResponse(m)),
      detectedPreferences: preferences,
    };
  }

  private mapMessageResponse(msg: Record<string, unknown>): ChatMessageResponse {
    return {
      id: msg.id as string,
      role: msg.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
      content: msg.content as string,
      messageType: msg.messageType as 'TEXT',
      metadata: (msg.metadata as Record<string, unknown>) ?? null,
      timestamp: msg.createdAt as Date,
    };
  }

  private async listSessionsByStatus(
    tenantId: string,
    status: string,
    page: number,
    limit: number,
  ) {
    const where = this.tenantWhere(tenantId, { status });

    const [sessions, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: sessions.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        customerId: s.customerId,
        status: s.status,
        startedAt: s.startedAt,
        lastMessageAt: s.lastMessageAt,
        escalatedTo: s.escalatedTo,
        messageCount: s._count.messages,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}
