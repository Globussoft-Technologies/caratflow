// ─── Chatbot REST Controller ───────────────────────────────────
// Public-facing storefront chat API at /api/v1/store/chat/*
// Consumed by the ChatWidget component on the storefront.

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ApiResponse } from '@caratflow/shared-types';
import type { ChatSessionResponse, ChatMessageResponse } from '@caratflow/shared-types';
import { ChatbotService } from './chatbot.service';

interface StorefrontChatContext {
  tenantId: string;
  customerId: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractContext(headers: Record<string, string | undefined>): StorefrontChatContext {
  const tenantId = headers['x-tenant-id'];
  if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
  if (!UUID_RE.test(tenantId)) {
    throw new BadRequestException('x-tenant-id must be a valid UUID');
  }
  const customerId = headers['x-customer-id'] ?? null;
  if (customerId && !UUID_RE.test(customerId)) {
    throw new BadRequestException('x-customer-id must be a valid UUID');
  }

  return {
    tenantId,
    customerId,
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store/chat')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Start a new chat session. The sessionId is always generated server-side
   * to prevent client-controlled session takeover (D-040).
   *
   * Note: We deliberately ignore any client-supplied `sessionId` in the body.
   * If the client wants to resume, it must use the sessionId we returned from
   * a prior /start and authenticate (via x-customer-id) as the same customer.
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startChat(
    @Headers() headers: Record<string, string | undefined>,
    @Body() _body: { sessionId?: string; customerId?: string },
  ): Promise<ApiResponse<ChatSessionResponse>> {
    const ctx = extractContext(headers);
    const sessionId = `chat_${randomUUID()}`;

    const data = await this.chatbotService.startSession(
      ctx.tenantId,
      sessionId,
      ctx.customerId ?? undefined,
    );
    return success(data);
  }

  /**
   * Send a message to the chatbot and receive response(s).
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { sessionId: string; content: string; messageType?: string },
  ): Promise<ApiResponse<{ messages: ChatMessageResponse[] }>> {
    const ctx = extractContext(headers);

    if (!body.sessionId) throw new BadRequestException('sessionId is required');
    if (!body.content || body.content.trim().length === 0) {
      throw new BadRequestException('Message content is required');
    }

    const data = await this.chatbotService.processMessage(
      ctx.tenantId,
      body.sessionId,
      body.content.trim(),
      body.messageType,
      ctx.customerId,
    );
    return success(data);
  }

  /**
   * Get chat session history.
   */
  @Get('session/:sessionId')
  async getSession(
    @Headers() headers: Record<string, string | undefined>,
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<ChatSessionResponse>> {
    const ctx = extractContext(headers);
    const data = await this.chatbotService.getSession(ctx.tenantId, sessionId, ctx.customerId);
    return success(data);
  }

  /**
   * Escalate the chat session to a human agent.
   */
  @Post('escalate/:sessionId')
  @HttpCode(HttpStatus.OK)
  async escalateSession(
    @Headers() headers: Record<string, string | undefined>,
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    await this.chatbotService.escalateToHuman(ctx.tenantId, sessionId, undefined, ctx.customerId);
    return success(null);
  }

  /**
   * Close a chat session.
   */
  @Post('close/:sessionId')
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @Headers() headers: Record<string, string | undefined>,
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    await this.chatbotService.closeSession(ctx.tenantId, sessionId, ctx.customerId);
    return success(null);
  }
}
