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
import type { ApiResponse } from '@caratflow/shared-types';
import type { ChatSessionResponse, ChatMessageResponse } from '@caratflow/shared-types';
import { ChatbotService } from './chatbot.service';

interface StorefrontChatContext {
  tenantId: string;
  customerId: string | null;
  sessionId: string;
}

function extractContext(headers: Record<string, string | undefined>): StorefrontChatContext {
  const tenantId = headers['x-tenant-id'];
  if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

  return {
    tenantId,
    customerId: headers['x-customer-id'] ?? null,
    sessionId: headers['x-session-id'] ?? `chat-${Date.now()}`,
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store/chat')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Start a new chat session or resume an existing one.
   * Returns a greeting message with quick reply options.
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startChat(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { sessionId?: string; customerId?: string },
  ): Promise<ApiResponse<ChatSessionResponse>> {
    const ctx = extractContext(headers);
    const sessionId = body.sessionId ?? ctx.sessionId;
    const customerId = body.customerId ?? ctx.customerId ?? undefined;

    const data = await this.chatbotService.startSession(
      ctx.tenantId,
      sessionId,
      customerId,
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
    const data = await this.chatbotService.getSession(ctx.tenantId, sessionId);
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
    await this.chatbotService.escalateToHuman(ctx.tenantId, sessionId);
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
    await this.chatbotService.closeSession(ctx.tenantId, sessionId);
    return success(null);
  }
}
