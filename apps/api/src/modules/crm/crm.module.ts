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

@Module({
  controllers: [],
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
  ],
})
export class CrmModule {}
