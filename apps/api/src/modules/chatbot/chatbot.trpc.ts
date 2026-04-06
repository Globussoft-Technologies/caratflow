// ─── Chatbot Admin tRPC Router ─────────────────────────────────
// Admin procedures for managing FAQs, templates, and viewing
// active/escalated chat sessions.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { ChatbotService } from './chatbot.service';
import { ChatbotKnowledgeService } from './chatbot.knowledge.service';
import { z } from 'zod';
import {
  ChatFaqInputSchema,
  ChatTemplateInputSchema,
  ChatTemplateCategoryEnum,
} from '@caratflow/shared-types';

@Injectable()
export class ChatbotTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly chatbotService: ChatbotService,
    private readonly knowledgeService: ChatbotKnowledgeService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── FAQ Management ──────────────────────────────────

      faqCreate: authed
        .input(ChatFaqInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.knowledgeService.createFaq(ctx.tenantId, input);
        }),

      faqUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(ChatFaqInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.knowledgeService.updateFaq(ctx.tenantId, id, data);
        }),

      faqGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.knowledgeService.getFaq(ctx.tenantId, input.id);
        }),

      faqList: authed
        .input(z.object({
          category: z.string().optional(),
          activeOnly: z.boolean().default(false),
        }).optional())
        .query(async ({ ctx, input }) => {
          return this.knowledgeService.listFaqs(
            ctx.tenantId,
            input?.category,
            input?.activeOnly,
          );
        }),

      faqDelete: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.knowledgeService.deleteFaq(ctx.tenantId, input.id);
        }),

      faqSeedDefaults: authed
        .mutation(async ({ ctx }) => {
          const count = await this.knowledgeService.seedDefaultFaqs(ctx.tenantId);
          return { seeded: count };
        }),

      // ─── Template Management ─────────────────────────────

      templateCreate: authed
        .input(ChatTemplateInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.knowledgeService.createTemplate(ctx.tenantId, input);
        }),

      templateUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(ChatTemplateInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.knowledgeService.updateTemplate(ctx.tenantId, id, data);
        }),

      templateGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.knowledgeService.getTemplate(ctx.tenantId, input.id);
        }),

      templateList: authed
        .input(z.object({
          category: ChatTemplateCategoryEnum.optional(),
          activeOnly: z.boolean().default(false),
        }).optional())
        .query(async ({ ctx, input }) => {
          return this.knowledgeService.listTemplates(
            ctx.tenantId,
            input?.category,
            input?.activeOnly,
          );
        }),

      templateDelete: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.knowledgeService.deleteTemplate(ctx.tenantId, input.id);
        }),

      templateSeedDefaults: authed
        .mutation(async ({ ctx }) => {
          const count = await this.knowledgeService.seedDefaultTemplates(ctx.tenantId);
          return { seeded: count };
        }),

      // ─── Session Management (Admin) ──────────────────────

      activeSessions: authed
        .input(z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
          return this.chatbotService.listActiveSessions(
            ctx.tenantId,
            input?.page,
            input?.limit,
          );
        }),

      escalatedSessions: authed
        .input(z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        }).optional())
        .query(async ({ ctx, input }) => {
          return this.chatbotService.listEscalatedSessions(
            ctx.tenantId,
            input?.page,
            input?.limit,
          );
        }),

      sessionHistory: authed
        .input(z.object({ sessionId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          return this.chatbotService.getSession(ctx.tenantId, input.sessionId);
        }),
    });
  }
}
