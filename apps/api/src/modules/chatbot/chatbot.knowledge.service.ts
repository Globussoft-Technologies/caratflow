// ─── Chatbot Knowledge Base Service ────────────────────────────
// CRUD for FAQ entries and response templates.
// Seeds default jewelry-specific knowledge base entries.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  ChatFaqInput,
  ChatFaqResponse,
  ChatTemplateInput,
  ChatTemplateResponse,
} from '@caratflow/shared-types';

@Injectable()
export class ChatbotKnowledgeService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── FAQ CRUD ────────────────────────────────────────────────

  async createFaq(tenantId: string, input: ChatFaqInput): Promise<ChatFaqResponse> {
    const faq = await this.prisma.chatFaq.create({
      data: {
        tenantId,
        question: input.question,
        answer: input.answer,
        category: input.category,
        keywords: input.keywords,
        priority: input.priority,
        isActive: input.isActive,
      },
    });
    return this.mapFaqResponse(faq);
  }

  async updateFaq(tenantId: string, id: string, input: Partial<ChatFaqInput>): Promise<ChatFaqResponse> {
    await this.prisma.chatFaq.findFirstOrThrow({
      where: this.tenantWhere(tenantId, { id }),
    });

    const faq = await this.prisma.chatFaq.update({
      where: { id },
      data: {
        ...(input.question !== undefined && { question: input.question }),
        ...(input.answer !== undefined && { answer: input.answer }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.keywords !== undefined && { keywords: input.keywords }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return this.mapFaqResponse(faq);
  }

  async getFaq(tenantId: string, id: string): Promise<ChatFaqResponse> {
    const faq = await this.prisma.chatFaq.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.mapFaqResponse(faq);
  }

  async listFaqs(
    tenantId: string,
    category?: string,
    activeOnly: boolean = false,
  ): Promise<ChatFaqResponse[]> {
    const where: Record<string, unknown> = { tenantId };
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const faqs = await this.prisma.chatFaq.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return faqs.map((f) => this.mapFaqResponse(f));
  }

  async deleteFaq(tenantId: string, id: string): Promise<void> {
    await this.prisma.chatFaq.findFirstOrThrow({
      where: this.tenantWhere(tenantId, { id }),
    });
    await this.prisma.chatFaq.delete({ where: { id } });
  }

  // ─── Template CRUD ───────────────────────────────────────────

  async createTemplate(tenantId: string, input: ChatTemplateInput): Promise<ChatTemplateResponse> {
    const template = await this.prisma.chatTemplate.create({
      data: {
        tenantId,
        triggerKeywords: input.triggerKeywords,
        responseTemplate: input.responseTemplate,
        category: input.category,
        isActive: input.isActive,
      },
    });
    return this.mapTemplateResponse(template);
  }

  async updateTemplate(
    tenantId: string,
    id: string,
    input: Partial<ChatTemplateInput>,
  ): Promise<ChatTemplateResponse> {
    await this.prisma.chatTemplate.findFirstOrThrow({
      where: this.tenantWhere(tenantId, { id }),
    });

    const template = await this.prisma.chatTemplate.update({
      where: { id },
      data: {
        ...(input.triggerKeywords !== undefined && { triggerKeywords: input.triggerKeywords }),
        ...(input.responseTemplate !== undefined && { responseTemplate: input.responseTemplate }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return this.mapTemplateResponse(template);
  }

  async getTemplate(tenantId: string, id: string): Promise<ChatTemplateResponse> {
    const template = await this.prisma.chatTemplate.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!template) throw new NotFoundException('Template not found');
    return this.mapTemplateResponse(template);
  }

  async listTemplates(
    tenantId: string,
    category?: string,
    activeOnly: boolean = false,
  ): Promise<ChatTemplateResponse[]> {
    const where: Record<string, unknown> = { tenantId };
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const templates = await this.prisma.chatTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return templates.map((t) => this.mapTemplateResponse(t));
  }

  async deleteTemplate(tenantId: string, id: string): Promise<void> {
    await this.prisma.chatTemplate.findFirstOrThrow({
      where: this.tenantWhere(tenantId, { id }),
    });
    await this.prisma.chatTemplate.delete({ where: { id } });
  }

  // ─── Seed Default Data ───────────────────────────────────────

  async seedDefaultFaqs(tenantId: string): Promise<number> {
    const existing = await this.prisma.chatFaq.count({ where: { tenantId } });
    if (existing > 0) return 0;

    const defaultFaqs: Array<{
      question: string;
      answer: string;
      category: string;
      keywords: string[];
      priority: number;
    }> = [
      {
        question: 'What are your shipping options?',
        answer: 'We offer free shipping on orders above Rs. 5,000. Standard delivery takes 3-5 business days. Express delivery (1-2 business days) is available at Rs. 200 for all orders. All shipments are fully insured and require a signature on delivery for your security.',
        category: 'shipping',
        keywords: ['shipping', 'delivery', 'ship', 'courier', 'dispatch', 'free shipping', 'express'],
        priority: 10,
      },
      {
        question: 'What is your return policy?',
        answer: 'We accept returns within 15 days of delivery for a full refund. The jewelry must be in its original condition with all tags and packaging intact. Customized and engraved pieces are non-returnable. Exchange is available within 30 days. Return shipping is free for all orders.',
        category: 'returns',
        keywords: ['return', 'refund', 'exchange', 'money back', 'replace', 'return policy'],
        priority: 10,
      },
      {
        question: 'How do I track my order?',
        answer: 'You can track your order from the "My Orders" section in your account. Once shipped, you\'ll receive an email and SMS with a tracking link. You can also click the tracking number to see real-time updates from our delivery partner.',
        category: 'tracking',
        keywords: ['track', 'tracking', 'order status', 'where is my order', 'shipped'],
        priority: 9,
      },
      {
        question: 'Do you offer EMI?',
        answer: 'Yes, we offer no-cost EMI on orders above Rs. 10,000 on select bank credit cards. EMI options from 3 to 12 months are available. We also support Bajaj Finserv, ZestMoney, and other BNPL options. Check the payment page at checkout for available EMI plans.',
        category: 'payment',
        keywords: ['emi', 'installment', 'no cost emi', 'monthly payment', 'easy emi', 'bajaj'],
        priority: 8,
      },
      {
        question: 'How is gold purity verified?',
        answer: 'All our gold jewelry is BIS Hallmarked with a unique HUID (Hallmark Unique Identification) number. You can verify the authenticity of your jewelry on the BIS Care app or website using the 6-digit HUID number engraved on each piece. We guarantee 100% purity as stamped.',
        category: 'hallmark',
        keywords: ['hallmark', 'huid', 'purity', 'bis', 'certified', 'genuine', 'real gold', 'authentic'],
        priority: 9,
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major payment methods: Credit/Debit Cards (Visa, Mastercard, RuPay, Amex), UPI (GPay, PhonePe, Paytm), Net Banking (all major banks), Wallets (Paytm, PhonePe), and Buy Now Pay Later (Simpl, LazyPay, ZestMoney). EMI options are available on select cards.',
        category: 'payment',
        keywords: ['payment', 'pay', 'upi', 'card', 'net banking', 'wallet', 'payment method', 'cod'],
        priority: 8,
      },
      {
        question: 'Can I customize jewelry?',
        answer: 'Yes! We offer custom jewelry design services. You can upload your own design, share a reference image, or describe your vision to our expert designers. Custom orders typically take 2-4 weeks. We also offer engraving and personalization on select pieces. Contact our design team through the chat for a free consultation!',
        category: 'custom_order',
        keywords: ['custom', 'customize', 'personalise', 'personalize', 'engrave', 'bespoke', 'made to order', 'design'],
        priority: 7,
      },
      {
        question: 'What is digital gold?',
        answer: 'Digital Gold lets you buy, sell, and accumulate 24K gold online starting from just Rs. 1. The physical gold is stored in secure vaults by our partner. You can convert your digital gold to physical jewelry or coins anytime. It\'s a great way to invest in gold without worrying about storage and safety.',
        category: 'digital_gold',
        keywords: ['digital gold', 'gold online', 'buy gold', 'invest gold', 'gold investment'],
        priority: 6,
      },
      {
        question: 'How do gold savings schemes work?',
        answer: 'Our Gold Savings Scheme lets you save a fixed amount monthly (starting Rs. 1,000). At the end of 11 months, we gift you the value of one month\'s installment as bonus gold! You can then use the total accumulated amount to purchase any jewelry from our collection. It\'s a disciplined way to save for that special purchase.',
        category: 'gold_scheme',
        keywords: ['gold scheme', 'savings scheme', 'monthly scheme', 'kitty', 'chit', 'gold saving'],
        priority: 6,
      },
      {
        question: 'How do I check my ring size?',
        answer: 'There are several ways to find your ring size: 1) Use our online Ring Size Guide with a printable ring sizer. 2) Visit any of our stores for a free professional sizing. 3) Measure the inner diameter of a ring that fits you well and compare with our size chart. 4) Order our free ring sizer kit delivered to your doorstep. Most Indian ring sizes range from 5 to 22.',
        category: 'sizing',
        keywords: ['size', 'sizing', 'ring size', 'bangle size', 'measurement', 'fit', 'ring sizer'],
        priority: 7,
      },
    ];

    await this.prisma.chatFaq.createMany({
      data: defaultFaqs.map((faq) => ({
        tenantId,
        ...faq,
      })),
    });

    return defaultFaqs.length;
  }

  async seedDefaultTemplates(tenantId: string): Promise<number> {
    const existing = await this.prisma.chatTemplate.count({ where: { tenantId } });
    if (existing > 0) return 0;

    const defaultTemplates: Array<{
      triggerKeywords: string[];
      responseTemplate: string;
      category: string;
    }> = [
      {
        triggerKeywords: ['hi', 'hello', 'hey', 'namaste'],
        responseTemplate: 'Namaste! Welcome to CaratFlow. I can help you find the perfect jewelry piece. What are you looking for today?',
        category: 'GREETING',
      },
      {
        triggerKeywords: ['show', 'browse', 'looking for', 'want to buy', 'search'],
        responseTemplate: 'I\'d love to help you find something special! Could you tell me what type of jewelry you\'re interested in, or what occasion you\'re shopping for?',
        category: 'PRODUCT_QUERY',
      },
      {
        triggerKeywords: ['price', 'cost', 'how much', 'rate', 'expensive', 'cheap', 'affordable'],
        responseTemplate: 'I can help you find jewelry within your budget. What price range are you comfortable with? You can tell me in rupees, like "under 50,000" or "between 20,000 and 1 lakh".',
        category: 'PRICE_QUERY',
      },
      {
        triggerKeywords: ['wedding', 'engagement', 'birthday', 'anniversary', 'gift', 'festive'],
        responseTemplate: 'Shopping for a special occasion? We have curated collections for every celebration. Let me know the occasion, and I\'ll show you our best picks!',
        category: 'OCCASION',
      },
      {
        triggerKeywords: ['gold', 'silver', 'diamond', 'platinum', 'kundan'],
        responseTemplate: 'Great choice! We have a beautiful collection in that metal. Would you like to see a specific category like rings, necklaces, or earrings?',
        category: 'MATERIAL',
      },
    ];

    await this.prisma.chatTemplate.createMany({
      data: defaultTemplates.map((t) => ({
        tenantId,
        triggerKeywords: t.triggerKeywords,
        responseTemplate: t.responseTemplate,
        category: t.category as 'GREETING' | 'PRODUCT_QUERY' | 'PRICE_QUERY' | 'OCCASION' | 'MATERIAL',
        isActive: true,
      })),
    });

    return defaultTemplates.length;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private mapFaqResponse(faq: Record<string, unknown>): ChatFaqResponse {
    return {
      id: faq.id as string,
      question: faq.question as string,
      answer: faq.answer as string,
      category: faq.category as string,
      keywords: (faq.keywords as string[]) ?? [],
      priority: faq.priority as number,
      isActive: faq.isActive as boolean,
      createdAt: faq.createdAt as Date,
      updatedAt: faq.updatedAt as Date,
    };
  }

  private mapTemplateResponse(template: Record<string, unknown>): ChatTemplateResponse {
    return {
      id: template.id as string,
      triggerKeywords: (template.triggerKeywords as string[]) ?? [],
      responseTemplate: template.responseTemplate as string,
      category: template.category as ChatTemplateResponse['category'],
      isActive: template.isActive as boolean,
      createdAt: template.createdAt as Date,
      updatedAt: template.updatedAt as Date,
    };
  }
}
