// ─── Chatbot Module ────────────────────────────────────────────
// AI chatbot / smart assistant for the storefront.
// Helps customers find jewelry based on preferences, occasion, budget.

import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotIntentService } from './chatbot.intent.service';
import { ChatbotResponseService } from './chatbot.response.service';
import { ChatbotKnowledgeService } from './chatbot.knowledge.service';
import { ChatbotTrpcRouter } from './chatbot.trpc';

@Module({
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    ChatbotIntentService,
    ChatbotResponseService,
    ChatbotKnowledgeService,
    ChatbotTrpcRouter,
  ],
  exports: [
    ChatbotService,
    ChatbotKnowledgeService,
    ChatbotTrpcRouter,
  ],
})
export class ChatbotModule {}
