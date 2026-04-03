// ─── Export Event Handler ─────────────────────────────────────────
// Subscribes to cross-domain events relevant to export operations.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ExportEventHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Subscribe to hallmark verification events
    // When a product is hallmark verified, update export readiness
    this.eventBus.subscribe('compliance.hallmark.verified', async (event) => {
      if (event.type === 'compliance.hallmark.verified') {
        const { productId, hallmarkNumber, purity } = event.payload;
        console.log(
          `[Export] Hallmark verified: product=${productId}, hallmark=${hallmarkNumber}, purity=${purity}`,
        );

        // Find any export order items referencing this product
        const exportItems = await this.prisma.exportOrderItem.findMany({
          where: {
            tenantId: event.tenantId,
            productId,
          },
          include: {
            exportOrder: { select: { id: true, status: true, orderNumber: true } },
          },
        });

        for (const item of exportItems) {
          const order = item.exportOrder as Record<string, unknown>;
          if (order.status === 'CONFIRMED' || order.status === 'IN_PRODUCTION') {
            console.log(
              `[Export] Product ${productId} hallmark verified for export order ${order.orderNumber}`,
            );
          }
        }
      }
    });

    // Subscribe to financial invoice created events
    // Link to export order if applicable
    this.eventBus.subscribe('financial.invoice.created', async (event) => {
      if (event.type === 'financial.invoice.created') {
        const { invoiceId, invoiceNumber, totalPaise, customerId } = event.payload;
        console.log(
          `[Export] Financial invoice created: id=${invoiceId}, number=${invoiceNumber}, total=${totalPaise}`,
        );

        // Check if there are active export orders for this customer
        if (customerId) {
          const activeOrders = await this.prisma.exportOrder.findMany({
            where: {
              tenantId: event.tenantId,
              buyerId: customerId,
              status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] },
            },
            select: { id: true, orderNumber: true },
          });

          if (activeOrders.length > 0) {
            console.log(
              `[Export] Invoice ${invoiceNumber} may relate to export orders: ${activeOrders.map((o) => o.orderNumber).join(', ')}`,
            );
          }
        }
      }
    });
  }
}
