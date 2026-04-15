// ─── CRM Campaign Service ──────────────────────────────────────
// Campaign management: create, preview audience, schedule, execute, track.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';
import { CrmNotificationService } from './crm.notification.service';
import type {
  CampaignInput,
  AudienceFilterCriteria,
} from '@caratflow/shared-types';

@Injectable()
export class CrmCampaignService extends TenantAwareService {
  private readonly logger = new Logger(CrmCampaignService.name);

  constructor(
    prisma: PrismaService,
    private readonly notificationService: CrmNotificationService,
  ) {
    super(prisma);
  }

  async createCampaign(tenantId: string, userId: string, input: CampaignInput) {
    return this.prisma.campaign.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        channel: input.channel,
        templateId: input.templateId,
        audienceFilter: input.audienceFilter
          ? (input.audienceFilter as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        scheduledAt: input.scheduledAt,
        status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateCampaign(tenantId: string, userId: string, campaignId: string, input: Partial<CampaignInput>) {
    await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
    });
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...input,
        audienceFilter: input.audienceFilter
          ? (input.audienceFilter as unknown as Prisma.InputJsonValue)
          : undefined,
        updatedBy: userId,
      },
    });
  }

  async getCampaign(tenantId: string, campaignId: string) {
    return this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, tenantId },
      include: { template: true },
    });
  }

  async listCampaigns(tenantId: string, page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: where as Prisma.CampaignWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { template: { select: { name: true } } },
      }),
      this.prisma.campaign.count({
        where: where as Prisma.CampaignWhereInput,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Preview audience: count + sample customers matching the filter */
  async previewAudience(tenantId: string, filter: AudienceFilterCriteria) {
    const where = this.buildAudienceWhere(tenantId, filter);
    const [count, samples] = await Promise.all([
      this.prisma.customer.count({ where: where as Prisma.CustomerWhereInput }),
      this.prisma.customer.findMany({
        where: where as Prisma.CustomerWhereInput,
        take: 10,
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, city: true },
      }),
    ]);
    return { count, samples };
  }

  /** Execute a campaign: send notifications to all matching customers */
  async executeCampaign(tenantId: string, userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, tenantId, status: { in: ['DRAFT', 'SCHEDULED'] } },
    });

    if (!campaign.templateId) {
      throw new Error('Campaign must have a template assigned');
    }

    // Get audience
    const filter = (campaign.audienceFilter as AudienceFilterCriteria) ?? {};
    const where = this.buildAudienceWhere(tenantId, filter);
    const customers = await this.prisma.customer.findMany({
      where: where as Prisma.CustomerWhereInput,
      select: { id: true, firstName: true, lastName: true },
    });

    // Mark campaign as active
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        totalRecipients: customers.length,
        updatedBy: userId,
      },
    });

    // Send in batches
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      try {
        await this.notificationService.sendNotification(tenantId, userId, {
          customerId: customer.id,
          channel: campaign.channel,
          templateId: campaign.templateId!,
          variables: {
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
        });
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    // Mark campaign as completed
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        sentCount,
        failedCount,
        deliveredCount: sentCount, // Simplified; real tracking via webhooks
        updatedBy: userId,
      },
    });

    return { totalRecipients: customers.length, sentCount, failedCount };
  }

  /** Pause a running campaign */
  async pauseCampaign(tenantId: string, userId: string, campaignId: string) {
    await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, tenantId, status: 'ACTIVE' },
    });
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED', updatedBy: userId },
    });
  }

  /** Cancel a campaign */
  async cancelCampaign(tenantId: string, userId: string, campaignId: string) {
    await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, tenantId, status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] } },
    });
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED', updatedBy: userId },
    });
  }

  private buildAudienceWhere(tenantId: string, filter: AudienceFilterCriteria): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId };

    if (filter.customerType?.length) {
      where.customerType = { in: filter.customerType };
    }
    if (filter.city?.length) {
      where.city = { in: filter.city };
    }
    if (filter.loyaltyTier?.length) {
      where.loyaltyTier = { in: filter.loyaltyTier };
    }

    return where;
  }
}
