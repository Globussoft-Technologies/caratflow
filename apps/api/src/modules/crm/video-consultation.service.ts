// ─── CRM Video Consultation Service (Live Shopping MVP) ─────────
// 1-on-1 scheduled video consultations between customers and store staff.
// Uses a schedule-and-link model (Jitsi meet.jit.si) — no WebRTC signaling.

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { Prisma } from '@caratflow/db';
import type {
  VideoConsultationInput,
  VideoConsultationFilter,
} from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoConsultationService extends TenantAwareService {
  private readonly logger = new Logger(VideoConsultationService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /** Build the Jitsi meeting URL for a consultation. */
  private buildMeetingUrl(consultationId: string): string {
    return `https://meet.jit.si/caratflow-${consultationId}`;
  }

  // ─── Create / Request ──────────────────────────────────────────

  async request(tenantId: string, customerId: string, input: VideoConsultationInput) {
    const consultation = await this.prisma.videoConsultation.create({
      data: {
        tenantId,
        customerId,
        requestedAt: new Date(),
        status: 'REQUESTED',
        productsOfInterest: input.productsOfInterest
          ? (input.productsOfInterest as unknown as Prisma.InputJsonValue)
          : undefined,
        customerPhone: input.customerPhone,
        preferredLang: input.preferredLang ?? 'en',
        notes: input.notes,
      },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'crm.consultation.requested',
      payload: { consultationId: consultation.id, customerId },
    });

    this.logger.log(`Video consultation requested: ${consultation.id} for tenant ${tenantId}`);
    return consultation;
  }

  // ─── Read ──────────────────────────────────────────────────────

  async get(tenantId: string, id: string) {
    const consultation = await this.prisma.videoConsultation.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      },
    });
    if (!consultation) {
      throw new NotFoundException(`Video consultation ${id} not found`);
    }
    return consultation;
  }

  async list(
    tenantId: string,
    filters: Pick<VideoConsultationFilter, 'status' | 'consultantId' | 'customerId'>,
    pagination: { page?: number; limit?: number } = {},
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.consultantId) where.consultantId = filters.consultantId;
    if (filters.customerId) where.customerId = filters.customerId;

    const typedWhere = where as unknown as NonNullable<
      Parameters<typeof this.prisma.videoConsultation.findMany>[0]
    >['where'];

    const [items, total] = await Promise.all([
      this.prisma.videoConsultation.findMany({
        where: typedWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.videoConsultation.count({ where: typedWhere }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  // ─── State Transitions ─────────────────────────────────────────

  async schedule(tenantId: string, id: string, consultantId: string, scheduledAt: Date) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'REQUESTED') {
      throw new BadRequestException(`Cannot schedule consultation in status ${existing.status}`);
    }

    const meetingUrl = this.buildMeetingUrl(id);
    const updated = await this.prisma.videoConsultation.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        consultantId,
        scheduledAt,
        meetingUrl,
      },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: consultantId,
      timestamp: new Date().toISOString(),
      type: 'crm.consultation.scheduled',
      payload: {
        consultationId: id,
        customerId: updated.customerId,
        consultantId,
        scheduledAt: scheduledAt.toISOString(),
        meetingUrl,
      },
    });

    return updated;
  }

  async start(tenantId: string, id: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot start consultation in status ${existing.status}`);
    }
    return this.prisma.videoConsultation.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  async complete(tenantId: string, id: string, notes?: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'IN_PROGRESS' && existing.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot complete consultation in status ${existing.status}`);
    }
    return this.prisma.videoConsultation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        notes: notes ?? existing.notes,
      },
    });
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel consultation in status ${existing.status}`);
    }
    const mergedNotes = reason
      ? `${existing.notes ? existing.notes + '\n' : ''}Cancelled: ${reason}`
      : existing.notes;
    return this.prisma.videoConsultation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: mergedNotes,
      },
    });
  }

  async markNoShow(tenantId: string, id: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'SCHEDULED' && existing.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot mark no-show for status ${existing.status}`);
    }
    return this.prisma.videoConsultation.update({
      where: { id },
      data: { status: 'NO_SHOW' },
    });
  }
}
