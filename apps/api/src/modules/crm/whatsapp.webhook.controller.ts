// ─── WhatsApp Webhook Controller ──────────────────────────────
// Receives delivery status callbacks from Meta WhatsApp Cloud API
// and updates NotificationLog rows. Verifies the X-Hub-Signature-256
// header against WHATSAPP_APP_SECRET.
//
// Mounted at /api/v1/webhooks/whatsapp. See Meta docs:
// https://developers.facebook.com/docs/graph-api/webhooks

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';

interface MetaStatusEntry {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

interface MetaWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        statuses?: MetaStatusEntry[];
      };
    }>;
  }>;
}

@Controller('api/v1/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Meta webhook verification challenge (initial setup). */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
    if (mode === 'subscribe' && token && expected && token === expected) {
      return challenge;
    }
    throw new UnauthorizedException('Invalid verify token');
  }

  /** Receives delivery status callbacks. */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: MetaWebhookBody,
  ): Promise<{ success: true }> {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      this.logger.error('WHATSAPP_APP_SECRET not configured; rejecting webhook');
      throw new UnauthorizedException('Webhook not configured');
    }

    // Verify signature. Prefer raw body if available on the request.
    const raw: string =
      req.rawBody && req.rawBody.length > 0
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body ?? {});

    if (!this.verifySignature(raw, signature, appSecret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    if (!body || body.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Unexpected webhook object');
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const statuses = change.value?.statuses ?? [];
        for (const status of statuses) {
          await this.applyStatus(status);
        }
      }
    }

    return { success: true };
  }

  /** Apply a single Meta status update to the matching NotificationLog. */
  private async applyStatus(status: MetaStatusEntry): Promise<void> {
    // Find the log by externalId (stored in metadata.externalId)
    const log = await this.prisma.notificationLog.findFirst({
      where: {
        metadata: {
          path: '$.externalId',
          equals: status.id,
        } as unknown as Prisma.JsonFilter,
      },
    });

    if (!log) {
      this.logger.warn(`No NotificationLog found for externalId=${status.id}`);
      return;
    }

    const update: Prisma.NotificationLogUpdateInput = {};

    switch (status.status) {
      case 'sent':
        update.status = 'SENT';
        update.sentAt = new Date(Number(status.timestamp) * 1000);
        break;
      case 'delivered':
        update.status = 'DELIVERED';
        update.deliveredAt = new Date(Number(status.timestamp) * 1000);
        break;
      case 'read':
        // NotificationStatus enum has no READ; keep DELIVERED and mark in metadata.
        update.status = 'DELIVERED';
        break;
      case 'failed': {
        const err = status.errors?.[0];
        update.status = 'FAILED';
        update.failureReason = (err?.message ?? err?.title ?? 'WhatsApp delivery failed').slice(
          0,
          500,
        );
        break;
      }
    }

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: update,
    });
  }

  /** Verify Meta X-Hub-Signature-256 header using HMAC-SHA256. */
  private verifySignature(
    rawBody: string,
    signatureHeader: string | undefined,
    appSecret: string,
  ): boolean {
    if (!signatureHeader) return false;
    const expected =
      'sha256=' +
      createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
