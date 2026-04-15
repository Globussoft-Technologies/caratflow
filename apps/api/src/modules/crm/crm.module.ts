// ─── CRM Module ────────────────────────────────────────────────
// Customer interactions, loyalty, campaigns, notifications, leads, feedback.

import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmLoyaltyService } from './crm.loyalty.service';
import { CrmNotificationService } from './crm.notification.service';
import { CrmCampaignService } from './crm.campaign.service';
import { CrmLeadService } from './crm.lead.service';
import { CrmFeedbackService } from './crm.feedback.service';
import { VideoConsultationService } from './video-consultation.service';
import { CrmTrpcRouter } from './crm.trpc';
import { CrmEventHandler } from './crm.event-handler';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

@Module({
  controllers: [WhatsAppWebhookController],
  providers: [
    CrmService,
    CrmLoyaltyService,
    CrmNotificationService,
    CrmCampaignService,
    CrmLeadService,
    CrmFeedbackService,
    VideoConsultationService,
    CrmTrpcRouter,
    CrmEventHandler,
    EmailService,
    SmsService,
    WhatsAppService,
  ],
  exports: [
    CrmService,
    CrmLoyaltyService,
    CrmNotificationService,
    CrmCampaignService,
    CrmLeadService,
    CrmFeedbackService,
    VideoConsultationService,
    CrmTrpcRouter,
    EmailService,
    SmsService,
    WhatsAppService,
  ],
})
export class CrmModule {}
