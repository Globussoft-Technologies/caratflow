// ─── Chatbot Response Generation Service ───────────────────────
// Generates contextual responses: product suggestions, greetings,
// follow-up questions, and FAQ answers.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type {
  ChatPreferences,
  ProductCardData,
  QuickReplyOption,
  ChatMessageType,
} from '@caratflow/shared-types';

interface GeneratedResponse {
  content: string;
  messageType: ChatMessageType;
  metadata: Record<string, unknown>;
}

/** Map internal category keys to likely database category names */
const CATEGORY_NAME_MAP: Record<string, string[]> = {
  ring: ['Ring', 'Rings'],
  necklace: ['Necklace', 'Necklaces'],
  earring: ['Earring', 'Earrings'],
  bangle: ['Bangle', 'Bangles'],
  bracelet: ['Bracelet', 'Bracelets'],
  pendant: ['Pendant', 'Pendants'],
  chain: ['Chain', 'Chains'],
  mangalsutra: ['Mangalsutra'],
  nose_pin: ['Nose Pin', 'Nose Pins'],
  anklet: ['Anklet', 'Anklets'],
  set: ['Set', 'Jewellery Set', 'Jewelry Set'],
};

@Injectable()
export class ChatbotResponseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate product suggestions based on detected preferences.
   */
  async generateProductSuggestions(
    tenantId: string,
    preferences: ChatPreferences,
    limit: number = 6,
  ): Promise<GeneratedResponse> {
    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
    };

    // Metal type filter
    if (preferences.metalType) {
      where.productType = preferences.metalType;
    }

    // Price filter
    if (preferences.budgetMinPaise || preferences.budgetMaxPaise) {
      const priceFilter: Record<string, unknown> = {};
      if (preferences.budgetMinPaise) priceFilter.gte = preferences.budgetMinPaise;
      if (preferences.budgetMaxPaise) priceFilter.lte = preferences.budgetMaxPaise;
      where.sellingPricePaise = priceFilter;
    }

    // Category filter
    if (preferences.category) {
      const categoryNames = CATEGORY_NAME_MAP[preferences.category] ?? [preferences.category];
      const categories = await this.prisma.category.findMany({
        where: {
          tenantId,
          name: { in: categoryNames },
        },
        select: { id: true },
      });
      if (categories.length > 0) {
        where.categoryId = { in: categories.map((c) => c.id) };
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: [{ sellingPricePaise: 'asc' }],
      select: {
        id: true,
        name: true,
        images: true,
        sellingPricePaise: true,
        currencyCode: true,
        metalWeightMg: true,
        metalPurity: true,
        productType: true,
      },
    });

    if (products.length === 0) {
      return {
        content: this.getNoResultsMessage(preferences),
        messageType: 'QUICK_REPLIES',
        metadata: {
          quickReplies: [
            { label: 'Browse All Jewelry', value: 'show me all jewelry' },
            { label: 'Change Budget', value: 'change my budget' },
            { label: 'Different Category', value: 'show me other categories' },
          ] satisfies QuickReplyOption[],
        },
      };
    }

    const productCards: ProductCardData[] = products.map((p) => ({
      productId: p.id,
      name: p.name,
      image: this.extractPrimaryImage(p.images),
      pricePaise: Number(p.sellingPricePaise ?? 0),
      currencyCode: p.currencyCode,
      weightMg: p.metalWeightMg ? Number(p.metalWeightMg) : null,
      purity: p.metalPurity,
      productType: p.productType,
    }));

    const description = this.buildSuggestionDescription(preferences, products.length);

    return {
      content: description,
      messageType: 'PRODUCT_CARD',
      metadata: {
        products: productCards,
        totalFound: products.length,
      },
    };
  }

  /**
   * Generate a personalized greeting message.
   */
  async generateGreeting(
    tenantId: string,
    customerId?: string,
  ): Promise<GeneratedResponse> {
    let customerName: string | null = null;

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { tenantId, id: customerId },
        select: { firstName: true },
      });
      customerName = customer?.firstName ?? null;
    }

    const greeting = customerName
      ? `Welcome back, ${customerName}! I'm your CaratFlow jewelry assistant. How can I help you find the perfect piece today?`
      : `Namaste! Welcome to CaratFlow. I'm here to help you discover beautiful jewelry. What are you looking for today?`;

    return {
      content: greeting,
      messageType: 'QUICK_REPLIES',
      metadata: {
        quickReplies: [
          { label: 'Browse by Occasion', value: 'show occasions' },
          { label: 'Gold Jewelry', value: 'show gold jewelry' },
          { label: 'Diamond Jewelry', value: 'show diamond jewelry' },
          { label: 'Set My Budget', value: 'set budget' },
          { label: 'New Arrivals', value: 'show new arrivals' },
          { label: 'Track My Order', value: 'track order' },
        ] satisfies QuickReplyOption[],
      },
    };
  }

  /**
   * Generate follow-up questions based on missing preferences.
   */
  generateFollowUp(preferences: ChatPreferences): GeneratedResponse {
    const missing = this.identifyMissingPreferences(preferences);

    if (missing.includes('occasion') && !preferences.occasion) {
      return {
        content: 'What occasion are you shopping for? This will help me suggest the most suitable pieces.',
        messageType: 'OCCASION_PICKER',
        metadata: {
          occasions: [
            { label: 'Wedding', value: 'wedding', icon: 'rings' },
            { label: 'Engagement', value: 'engagement', icon: 'ring' },
            { label: 'Birthday', value: 'birthday', icon: 'cake' },
            { label: 'Daily Wear', value: 'daily_wear', icon: 'sun' },
            { label: 'Festive', value: 'festive', icon: 'sparkles' },
            { label: 'Gift', value: 'gift', icon: 'gift' },
          ],
        },
      };
    }

    if (missing.includes('budget') && !preferences.budgetMinPaise && !preferences.budgetMaxPaise) {
      return {
        content: 'What budget range are you comfortable with? I can find the best options within your range.',
        messageType: 'BUDGET_SLIDER',
        metadata: {
          minPaise: 500000,       // Rs 5,000
          maxPaise: 50000000,     // Rs 5,00,000
          stepPaise: 500000,      // Rs 5,000 steps
          defaultMinPaise: 1000000,  // Rs 10,000
          defaultMaxPaise: 10000000, // Rs 1,00,000
          currencyCode: 'INR',
        },
      };
    }

    if (missing.includes('category') && !preferences.category) {
      return {
        content: 'What type of jewelry are you interested in?',
        messageType: 'QUICK_REPLIES',
        metadata: {
          quickReplies: [
            { label: 'Rings', value: 'ring' },
            { label: 'Necklaces', value: 'necklace' },
            { label: 'Earrings', value: 'earring' },
            { label: 'Bangles', value: 'bangle' },
            { label: 'Bracelets', value: 'bracelet' },
            { label: 'Pendants', value: 'pendant' },
            { label: 'Mangalsutra', value: 'mangalsutra' },
            { label: 'Chains', value: 'chain' },
          ] satisfies QuickReplyOption[],
        },
      };
    }

    if (missing.includes('metal') && !preferences.metalType) {
      return {
        content: 'Which metal do you prefer?',
        messageType: 'QUICK_REPLIES',
        metadata: {
          quickReplies: [
            { label: 'Gold', value: 'gold' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Silver', value: 'silver' },
            { label: 'Platinum', value: 'platinum' },
            { label: 'Kundan', value: 'kundan' },
          ] satisfies QuickReplyOption[],
        },
      };
    }

    // Enough preferences gathered, proceed with suggestions
    return {
      content: 'Let me find the best pieces matching your preferences...',
      messageType: 'TEXT',
      metadata: {},
    };
  }

  /**
   * Format an FAQ answer for display.
   */
  generateFaqResponse(question: string, answer: string): GeneratedResponse {
    return {
      content: answer,
      messageType: 'QUICK_REPLIES',
      metadata: {
        quickReplies: [
          { label: 'Browse Jewelry', value: 'show jewelry' },
          { label: 'More Questions', value: 'I have another question' },
          { label: 'Talk to Agent', value: 'connect me to an agent' },
        ] satisfies QuickReplyOption[],
      },
    };
  }

  /**
   * Generate farewell response.
   */
  generateFarewell(): GeneratedResponse {
    return {
      content: 'Thank you for visiting CaratFlow! We hope to see you again soon. If you need any help, just start a new chat anytime. Happy jewelry shopping!',
      messageType: 'TEXT',
      metadata: {},
    };
  }

  /**
   * Generate an escalation response.
   */
  generateEscalationResponse(): GeneratedResponse {
    return {
      content: 'I understand you\'d like to speak with a human agent. Let me connect you with our customer support team. A representative will be with you shortly.',
      messageType: 'TEXT',
      metadata: { escalated: true },
    };
  }

  /**
   * Generate occasion-based suggestions intro.
   */
  generateOccasionResponse(occasion: string): string {
    const responses: Record<string, string> = {
      wedding: 'Beautiful choice! Weddings deserve the most exquisite jewelry. Let me show you our bridal collection - from stunning necklace sets to elegant maang tikkas.',
      engagement: 'Congratulations on the upcoming engagement! Let me help you find the perfect ring and complementary pieces.',
      birthday: 'A birthday calls for something special! Let me find a memorable jewelry gift.',
      anniversary: 'Happy anniversary! Let me show you pieces that celebrate your special milestone.',
      daily_wear: 'Looking for everyday elegance? I have some beautiful lightweight and comfortable pieces that are perfect for daily wear.',
      festive: 'Festivals are the perfect time to shine! Let me show you our festive collection with traditional and contemporary designs.',
      party: 'Time to make a statement! Let me find you some eye-catching pieces for the occasion.',
      gift: 'Looking for the perfect gift? Jewelry is always a wonderful choice. Let me help you pick something special.',
    };

    return responses[occasion] ?? `Great choice! Let me find the best ${occasion} jewelry for you.`;
  }

  /**
   * Build contextual quick reply options.
   */
  buildQuickReplies(context: {
    hasOccasion: boolean;
    hasBudget: boolean;
    hasMetal: boolean;
    hasCategory: boolean;
  }): QuickReplyOption[] {
    const replies: QuickReplyOption[] = [];

    if (!context.hasOccasion) {
      replies.push({ label: 'Choose Occasion', value: 'show occasions' });
    }
    if (!context.hasBudget) {
      replies.push({ label: 'Set Budget', value: 'set budget' });
    }
    if (!context.hasMetal) {
      replies.push({ label: 'Choose Metal', value: 'choose metal type' });
    }
    if (!context.hasCategory) {
      replies.push({ label: 'Choose Category', value: 'show categories' });
    }
    replies.push({ label: 'Show Results', value: 'show me suggestions' });

    return replies;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private extractPrimaryImage(images: unknown): string | null {
    if (!images || !Array.isArray(images)) return null;
    const primary = images.find((img: Record<string, unknown>) => img.isPrimary);
    const first = primary ?? images[0];
    return (first as Record<string, unknown>)?.url as string ?? null;
  }

  private getNoResultsMessage(preferences: ChatPreferences): string {
    const parts: string[] = [];
    if (preferences.metalType) parts.push(preferences.metalType.toLowerCase());
    if (preferences.category) parts.push(preferences.category);
    if (preferences.occasion) parts.push(`for ${preferences.occasion}`);

    const desc = parts.length > 0 ? parts.join(' ') : 'matching your criteria';

    return `I couldn't find ${desc} jewelry within your budget range right now. Would you like to try adjusting your filters or explore other options?`;
  }

  private buildSuggestionDescription(preferences: ChatPreferences, count: number): string {
    const parts: string[] = [];
    if (preferences.metalType) parts.push(preferences.metalType.toLowerCase());
    if (preferences.category) parts.push(preferences.category);
    if (preferences.occasion) parts.push(`for ${preferences.occasion}`);

    const desc = parts.length > 0 ? parts.join(' ') : '';
    const budgetNote = preferences.budgetMaxPaise
      ? ` within your budget`
      : '';

    return `Here are ${count} beautiful ${desc} pieces${budgetNote} that I think you'll love:`;
  }

  private identifyMissingPreferences(preferences: ChatPreferences): string[] {
    const missing: string[] = [];
    if (!preferences.occasion) missing.push('occasion');
    if (!preferences.budgetMinPaise && !preferences.budgetMaxPaise) missing.push('budget');
    if (!preferences.category) missing.push('category');
    if (!preferences.metalType) missing.push('metal');
    return missing;
  }
}
