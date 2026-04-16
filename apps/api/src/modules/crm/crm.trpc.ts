// ─── CRM tRPC Router ──────────────────────────────────────────
// All CRM procedures exposed via tRPC.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { CrmService } from './crm.service';
import { CrmLoyaltyService } from './crm.loyalty.service';
import { CrmNotificationService } from './crm.notification.service';
import { CrmCampaignService } from './crm.campaign.service';
import { CrmLeadService } from './crm.lead.service';
import { CrmFeedbackService } from './crm.feedback.service';
import { VideoConsultationService } from './video-consultation.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { z } from 'zod';
import {
  EmailTestInputSchema,
  EmailSendInputSchema,
  SmsTestInputSchema,
  SmsSendInputSchema,
  CustomerSearchInputSchema,
  CustomerListFilterSchema,
  LoyaltyProgramInputSchema,
  LoyaltyTransactionInputSchema,
  CustomerOccasionInputSchema,
  CustomerInteractionInputSchema,
  NotificationTemplateInputSchema,
  SendNotificationInputSchema,
  CampaignInputSchema,
  AudienceFilterCriteriaSchema,
  LeadInputSchema,
  LeadActivityInputSchema,
  LeadStatusUpdateSchema,
  FeedbackInputSchema,
  CustomerSegmentInputSchema,
  SegmentCriteriaSchema,
  VideoConsultationInputSchema,
  VideoConsultationScheduleSchema,
  VideoConsultationFilterSchema,
} from '@caratflow/shared-types';

@Injectable()
export class CrmTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly crmService: CrmService,
    private readonly loyaltyService: CrmLoyaltyService,
    private readonly notificationService: CrmNotificationService,
    private readonly campaignService: CrmCampaignService,
    private readonly leadService: CrmLeadService,
    private readonly feedbackService: CrmFeedbackService,
    private readonly videoConsultationService: VideoConsultationService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Dashboard ──────────────────────────────────────────
      dashboard: authed.query(async ({ ctx }) => {
        return this.crmService.getDashboard(ctx.tenantId);
      }),

      // ─── Customer ───────────────────────────────────────────
      customer360: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.crmService.getCustomer360(ctx.tenantId, input.customerId);
        }),

      customerSearch: authed
        .input(CustomerSearchInputSchema)
        .query(async ({ ctx, input }) => {
          return this.crmService.searchCustomers(ctx.tenantId, input);
        }),

      customerList: authed
        .input(CustomerListFilterSchema)
        .query(async ({ ctx, input }) => {
          return this.crmService.listCustomers(ctx.tenantId, input);
        }),

      customerImport: authed
        .input(z.object({
          rows: z.array(z.object({
            firstName: z.string(),
            lastName: z.string(),
            phone: z.string().optional(),
            email: z.string().optional(),
            city: z.string().optional(),
            customerType: z.string().optional(),
          })),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.crmService.importCustomers(ctx.tenantId, ctx.userId, input.rows);
        }),

      // ─── Occasions ──────────────────────────────────────────
      occasionCreate: authed
        .input(CustomerOccasionInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.prismaCreateOccasion(ctx.tenantId, ctx.userId, input);
        }),

      occasionList: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.prismaListOccasions(ctx.tenantId, input.customerId);
        }),

      occasionDelete: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.prismaDeleteOccasion(ctx.tenantId, input.id);
        }),

      // ─── Interactions ───────────────────────────────────────
      interactionCreate: authed
        .input(CustomerInteractionInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.prismaCreateInteraction(ctx.tenantId, ctx.userId, input);
        }),

      interactionList: authed
        .input(z.object({ customerId: z.string().uuid(), page: z.number().default(1), limit: z.number().default(20) }))
        .query(async ({ ctx, input }) => {
          return this.prismaListInteractions(ctx.tenantId, input.customerId, input.page, input.limit);
        }),

      // Nested router for filter-based listing (agent mobile app).
      // type 'AGENT_VISIT' maps to interactionType=VISIT + userId=agentId.
      interactions: this.trpc.router({
        list: authed
          .input(z.object({
            type: z.enum(['AGENT_VISIT', 'CALL', 'EMAIL', 'SMS', 'WHATSAPP', 'VISIT', 'NOTE']).optional(),
            agentId: z.string().uuid().optional(),
            customerId: z.string().uuid().optional(),
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(100).default(20),
          }))
          .query(async ({ ctx, input }) => {
            return this.prismaFilterInteractions(
              ctx.tenantId,
              {
                type: input.type,
                agentId: input.agentId,
                customerId: input.customerId,
              },
              input.page,
              input.limit,
            );
          }),
      }),

      // ─── Loyalty ────────────────────────────────────────────
      loyaltyProgramCreate: authed
        .input(LoyaltyProgramInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.loyaltyService.createProgram(ctx.tenantId, ctx.userId, input);
        }),

      loyaltyProgramUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(LoyaltyProgramInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.loyaltyService.updateProgram(ctx.tenantId, ctx.userId, id, data);
        }),

      loyaltyProgramList: authed.query(async ({ ctx }) => {
        return this.loyaltyService.listPrograms(ctx.tenantId);
      }),

      loyaltyProgramActive: authed.query(async ({ ctx }) => {
        return this.loyaltyService.getActiveProgram(ctx.tenantId);
      }),

      loyaltyEarnPoints: authed
        .input(z.object({
          customerId: z.string().uuid(),
          points: z.number().int().positive(),
          referenceType: z.string(),
          referenceId: z.string().uuid(),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.loyaltyService.earnPoints(
            ctx.tenantId, ctx.userId, input.customerId,
            input.points, input.referenceType, input.referenceId, input.description,
          );
        }),

      loyaltyRedeemPoints: authed
        .input(z.object({
          customerId: z.string().uuid(),
          points: z.number().int().positive(),
          referenceType: z.string(),
          referenceId: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.loyaltyService.redeemPoints(
            ctx.tenantId, ctx.userId, input.customerId,
            input.points, input.referenceType, input.referenceId,
          );
        }),

      loyaltyAdjustPoints: authed
        .input(LoyaltyTransactionInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.loyaltyService.adjustPoints(ctx.tenantId, ctx.userId, input);
        }),

      loyaltyBalance: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.loyaltyService.getBalance(ctx.tenantId, input.customerId);
        }),

      loyaltyTransactions: authed
        .input(z.object({ customerId: z.string().uuid(), page: z.number().default(1), limit: z.number().default(20) }))
        .query(async ({ ctx, input }) => {
          return this.loyaltyService.getTransactionHistory(ctx.tenantId, input.customerId, input.page, input.limit);
        }),

      // ─── Notifications ──────────────────────────────────────
      notificationTemplateCreate: authed
        .input(NotificationTemplateInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.notificationService.createTemplate(ctx.tenantId, ctx.userId, input);
        }),

      notificationTemplateUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(NotificationTemplateInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.notificationService.updateTemplate(ctx.tenantId, ctx.userId, id, data);
        }),

      notificationTemplateList: authed
        .input(z.object({ channel: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
          return this.notificationService.listTemplates(ctx.tenantId, input?.channel);
        }),

      notificationTemplateGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.notificationService.getTemplate(ctx.tenantId, input.id);
        }),

      notificationTemplateDelete: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.notificationService.deleteTemplate(ctx.tenantId, input.id);
        }),

      notificationSend: authed
        .input(SendNotificationInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.notificationService.sendNotification(ctx.tenantId, ctx.userId, input);
        }),

      notificationLogs: authed
        .input(z.object({ page: z.number().default(1), limit: z.number().default(20), status: z.string().optional() }))
        .query(async ({ ctx, input }) => {
          return this.notificationService.listNotificationLogs(ctx.tenantId, input.page, input.limit, input.status);
        }),

      // ─── Campaigns ──────────────────────────────────────────
      campaignCreate: authed
        .input(CampaignInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.campaignService.createCampaign(ctx.tenantId, ctx.userId, input);
        }),

      campaignUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(CampaignInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.campaignService.updateCampaign(ctx.tenantId, ctx.userId, id, data);
        }),

      campaignGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.campaignService.getCampaign(ctx.tenantId, input.id);
        }),

      campaignList: authed
        .input(z.object({ page: z.number().default(1), limit: z.number().default(20), status: z.string().optional() }))
        .query(async ({ ctx, input }) => {
          return this.campaignService.listCampaigns(ctx.tenantId, input.page, input.limit, input.status);
        }),

      campaignPreviewAudience: authed
        .input(AudienceFilterCriteriaSchema)
        .query(async ({ ctx, input }) => {
          return this.campaignService.previewAudience(ctx.tenantId, input);
        }),

      campaignExecute: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.campaignService.executeCampaign(ctx.tenantId, ctx.userId, input.id);
        }),

      campaignPause: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.campaignService.pauseCampaign(ctx.tenantId, ctx.userId, input.id);
        }),

      campaignCancel: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.campaignService.cancelCampaign(ctx.tenantId, ctx.userId, input.id);
        }),

      // ─── Leads ──────────────────────────────────────────────
      leadCreate: authed
        .input(LeadInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.leadService.createLead(ctx.tenantId, ctx.userId, input);
        }),

      leadUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(LeadInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.leadService.updateLead(ctx.tenantId, ctx.userId, id, data);
        }),

      leadGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.leadService.getLead(ctx.tenantId, input.id);
        }),

      leadList: authed
        .input(z.object({
          page: z.number().default(1),
          limit: z.number().default(20),
          status: z.string().optional(),
          assignedTo: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.leadService.listLeads(ctx.tenantId, input.page, input.limit, input.status, input.assignedTo);
        }),

      leadPipeline: authed.query(async ({ ctx }) => {
        return this.leadService.getLeadPipeline(ctx.tenantId);
      }),

      leadUpdateStatus: authed
        .input(LeadStatusUpdateSchema)
        .mutation(async ({ ctx, input }) => {
          return this.leadService.updateLeadStatus(ctx.tenantId, ctx.userId, input);
        }),

      leadAssign: authed
        .input(z.object({ leadId: z.string().uuid(), assignToUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.leadService.assignLead(ctx.tenantId, ctx.userId, input.leadId, input.assignToUserId);
        }),

      leadConvert: authed
        .input(z.object({ leadId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.leadService.convertToCustomer(ctx.tenantId, ctx.userId, input.leadId);
        }),

      leadActivityCreate: authed
        .input(LeadActivityInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.leadService.addActivity(ctx.tenantId, ctx.userId, input);
        }),

      leadActivities: authed
        .input(z.object({ leadId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.leadService.listActivities(ctx.tenantId, input.leadId);
        }),

      leadOverdueFollowUps: authed.query(async ({ ctx }) => {
        return this.leadService.getOverdueFollowUps(ctx.tenantId);
      }),

      // ─── Feedback ───────────────────────────────────────────
      feedbackCreate: authed
        .input(FeedbackInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.feedbackService.createFeedback(ctx.tenantId, ctx.userId, input);
        }),

      feedbackGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.feedbackService.getFeedback(ctx.tenantId, input.id);
        }),

      feedbackList: authed
        .input(z.object({
          page: z.number().default(1),
          limit: z.number().default(20),
          status: z.string().optional(),
          feedbackType: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.feedbackService.listFeedback(ctx.tenantId, input.page, input.limit, input.status, input.feedbackType);
        }),

      feedbackReview: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.feedbackService.reviewFeedback(ctx.tenantId, ctx.userId, input.id);
        }),

      feedbackAction: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.feedbackService.actionFeedback(ctx.tenantId, ctx.userId, input.id);
        }),

      feedbackAverageRating: authed
        .input(z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }))
        .query(async ({ ctx, input }) => {
          return this.feedbackService.getAverageRating(ctx.tenantId, input.from, input.to);
        }),

      feedbackRatingDistribution: authed.query(async ({ ctx }) => {
        return this.feedbackService.getRatingDistribution(ctx.tenantId);
      }),

      // ─── Segments ───────────────────────────────────────────
      segmentCreate: authed
        .input(CustomerSegmentInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.crmService.createSegment(ctx.tenantId, ctx.userId, input);
        }),

      segmentList: authed.query(async ({ ctx }) => {
        return this.crmService.listSegments(ctx.tenantId);
      }),

      segmentEvaluate: authed
        .input(SegmentCriteriaSchema)
        .query(async ({ ctx, input }) => {
          return this.crmService.evaluateSegment(ctx.tenantId, input);
        }),

      segmentRefresh: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.crmService.refreshSegment(ctx.tenantId, input.id);
        }),

      // ─── Email gateway ──────────────────────────────────────
      email: this.trpc.router({
        test: authed
          .input(EmailTestInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.emailService.sendEmail(ctx.tenantId, {
              to: input.to,
              subject: 'CaratFlow email gateway test',
              html: '<p>This is a test email from CaratFlow.</p>',
              text: 'This is a test email from CaratFlow.',
            });
          }),
        send: authed
          .input(EmailSendInputSchema)
          .mutation(async ({ ctx, input }) => {
            const prisma = (this.crmService as unknown as {
              prisma: { customer: { findFirst: (args: unknown) => Promise<{ email: string | null } | null> } };
            }).prisma;
            const customer = await prisma.customer.findFirst({
              where: { id: input.customerId, tenantId: ctx.tenantId },
              select: { email: true },
            });
            if (!customer?.email) {
              throw new Error(`Customer ${input.customerId} has no email`);
            }
            return this.emailService.sendEmail(ctx.tenantId, {
              to: customer.email,
              subject: input.subject,
              html: input.html,
              text: input.text,
              cc: input.cc,
              bcc: input.bcc,
              replyTo: input.replyTo,
            });
          }),
      }),

      // ─── SMS gateway ────────────────────────────────────────
      sms: this.trpc.router({
        test: authed
          .input(SmsTestInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.smsService.sendSms(ctx.tenantId, {
              to: input.to,
              body: 'CaratFlow SMS gateway test',
            });
          }),
        send: authed
          .input(SmsSendInputSchema)
          .mutation(async ({ ctx, input }) => {
            const prisma = (this.crmService as unknown as {
              prisma: { customer: { findFirst: (args: unknown) => Promise<{ phone: string | null } | null> } };
            }).prisma;
            const customer = await prisma.customer.findFirst({
              where: { id: input.customerId, tenantId: ctx.tenantId },
              select: { phone: true },
            } as unknown);
            if (!customer?.phone) {
              throw new Error(`Customer ${input.customerId} has no phone`);
            }
            return this.smsService.sendSms(ctx.tenantId, {
              to: customer.phone,
              body: input.body,
            });
          }),
      }),

      // ─── Video Consultation (Live Shopping) ─────────────────
      videoConsultation: this.trpc.router({
        request: authed
          .input(VideoConsultationInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.request(ctx.tenantId, input.customerId, input);
          }),

        list: authed
          .input(VideoConsultationFilterSchema)
          .query(async ({ ctx, input }) => {
            return this.videoConsultationService.list(
              ctx.tenantId,
              { status: input.status, consultantId: input.consultantId, customerId: input.customerId },
              { page: input.page, limit: input.limit },
            );
          }),

        get: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(async ({ ctx, input }) => {
            return this.videoConsultationService.get(ctx.tenantId, input.id);
          }),

        schedule: authed
          .input(VideoConsultationScheduleSchema)
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.schedule(
              ctx.tenantId,
              input.id,
              input.consultantId,
              input.scheduledAt,
            );
          }),

        start: authed
          .input(z.object({ id: z.string().uuid() }))
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.start(ctx.tenantId, input.id);
          }),

        complete: authed
          .input(z.object({ id: z.string().uuid(), notes: z.string().max(2000).optional() }))
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.complete(ctx.tenantId, input.id, input.notes);
          }),

        cancel: authed
          .input(z.object({ id: z.string().uuid(), reason: z.string().max(500).optional() }))
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.cancel(ctx.tenantId, input.id, input.reason);
          }),

        markNoShow: authed
          .input(z.object({ id: z.string().uuid() }))
          .mutation(async ({ ctx, input }) => {
            return this.videoConsultationService.markNoShow(ctx.tenantId, input.id);
          }),
      }),

      // ─── WhatsApp Business Cloud API ───────────────────────
      whatsapp: this.trpc.router({
        testConnection: authed
          .input(
            z.object({
              to: z
                .string()
                .regex(/^\+?[1-9]\d{7,14}$/, 'Must be a valid E.164 phone number'),
            }),
          )
          .mutation(async ({ ctx, input }) => {
            const result = await this.whatsappService.sendTextMessage(
              ctx.tenantId,
              input.to,
              'CaratFlow test message - WhatsApp integration is working.',
            );
            return { success: true, messageId: result.messageId, waId: result.waId };
          }),

        sendTemplate: authed
          .input(
            z.object({
              customerId: z.string().uuid(),
              templateName: z.string().min(1).max(512),
              languageCode: z.string().min(2).max(10),
              params: z.array(z.string()).default([]),
            }),
          )
          .mutation(async ({ ctx, input }) => {
            const prisma = (
              this.crmService as unknown as {
                prisma: { customer: { findFirst: (args: unknown) => Promise<{ phone: string | null } | null> } };
              }
            ).prisma;
            const customer = await prisma.customer.findFirst({
              where: { id: input.customerId, tenantId: ctx.tenantId },
              select: { phone: true },
            });

            if (!customer?.phone) {
              throw new Error('Customer has no phone number');
            }
            const components =
              input.params.length > 0
                ? [
                    {
                      type: 'body' as const,
                      parameters: input.params.map((p) => ({
                        type: 'text' as const,
                        text: p,
                      })),
                    },
                  ]
                : [];
            const result = await this.whatsappService.sendTemplateMessage(
              ctx.tenantId,
              customer.phone,
              input.templateName,
              input.languageCode,
              components,
            );
            return { success: true, messageId: result.messageId };
          }),

        getMessageStatus: authed
          .input(z.object({ externalId: z.string().min(1) }))
          .query(async ({ ctx, input }) => {
            return this.whatsappService.getMessageStatus(ctx.tenantId, input.externalId);
          }),
      }),
    });
  }

  // ─── Inline Prisma helpers for occasions/interactions ─────────
  // These are simple enough to not need separate services.

  private async prismaCreateOccasion(tenantId: string, userId: string, input: z.infer<typeof CustomerOccasionInputSchema>) {
    const { PrismaService } = await import('../../common/prisma.service');
    // Access prisma via the CRM service which has it injected
    return (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma.customerOccasion.create({
      data: {
        tenantId,
        customerId: input.customerId,
        occasionType: input.occasionType,
        date: input.date,
        description: input.description,
        reminderDaysBefore: input.reminderDaysBefore,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  private async prismaListOccasions(tenantId: string, customerId: string) {
    const { PrismaService } = await import('../../common/prisma.service');
    return (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma.customerOccasion.findMany({
      where: { tenantId, customerId },
      orderBy: { date: 'asc' },
    });
  }

  private async prismaDeleteOccasion(tenantId: string, id: string) {
    const { PrismaService } = await import('../../common/prisma.service');
    const prisma = (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma;
    await prisma.customerOccasion.findFirstOrThrow({ where: { id, tenantId } });
    return prisma.customerOccasion.delete({ where: { id } });
  }

  private async prismaCreateInteraction(tenantId: string, userId: string, input: z.infer<typeof CustomerInteractionInputSchema>) {
    const { PrismaService } = await import('../../common/prisma.service');
    return (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma.customerInteraction.create({
      data: {
        tenantId,
        customerId: input.customerId,
        interactionType: input.interactionType,
        direction: input.direction,
        subject: input.subject,
        content: input.content,
        userId: input.userId ?? userId,
        attachments: input.attachments ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  private async prismaListInteractions(tenantId: string, customerId: string, page: number, limit: number) {
    const { PrismaService } = await import('../../common/prisma.service');
    const prisma = (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma;
    const [items, total] = await Promise.all([
      prisma.customerInteraction.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customerInteraction.count({ where: { tenantId, customerId } }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  private async prismaFilterInteractions(
    tenantId: string,
    filters: { type?: string; agentId?: string; customerId?: string },
    page: number,
    limit: number,
  ) {
    const { PrismaService } = await import('../../common/prisma.service');
    const prisma = (this.crmService as unknown as { prisma: InstanceType<typeof PrismaService> }).prisma;

    // Map AGENT_VISIT to: interactionType=VISIT + userId=agentId (set when
    // the visit was recorded via wholesale.recordAgentVisit).
    const where: Record<string, unknown> = { tenantId };
    if (filters.customerId) where.customerId = filters.customerId;

    if (filters.type === 'AGENT_VISIT') {
      where.interactionType = 'VISIT';
      if (filters.agentId) where.userId = filters.agentId;
    } else if (filters.type) {
      where.interactionType = filters.type;
      if (filters.agentId) where.userId = filters.agentId;
    } else if (filters.agentId) {
      where.userId = filters.agentId;
    }

    const [items, total] = await Promise.all([
      prisma.customerInteraction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customerInteraction.count({ where }),
    ]);

    const customerIds = Array.from(new Set(items.map((i) => i.customerId)));
    const customers = customerIds.length
      ? await prisma.customer.findMany({
          where: { tenantId, id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true, phone: true },
        })
      : [];
    const cmap = new Map(customers.map((c) => [c.id, c]));

    const enriched = items.map((i) => {
      const c = cmap.get(i.customerId);
      const att = (i.attachments as Record<string, unknown> | null) ?? null;
      return {
        id: i.id,
        customerId: i.customerId,
        customerName: c ? `${c.firstName} ${c.lastName}` : 'Unknown',
        customerPhone: c?.phone ?? null,
        interactionType: i.interactionType,
        direction: i.direction,
        subject: i.subject,
        content: i.content,
        userId: i.userId,
        agentId: (att && typeof att.agentId === 'string' ? att.agentId : null) as string | null,
        outcome: (att && typeof att.outcome === 'string' ? att.outcome : null) as string | null,
        visitDate: (att && typeof att.visitDate === 'string' ? att.visitDate : null) as string | null,
        createdAt: i.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);
    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}
