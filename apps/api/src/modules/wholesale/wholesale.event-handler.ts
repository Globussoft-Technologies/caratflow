// ─── Wholesale Event Handler ──────────────────────────────────
// Subscribes to cross-domain events relevant to wholesale operations.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WholesaleEventHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Subscribe to inventory stock adjusted events
    // When stock is adjusted, check if any PO reorder thresholds are triggered
    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      if (event.type === 'inventory.stock.adjusted') {
        const { productId, locationId, quantityChange, reason } = event.payload;
        console.log(
          `[Wholesale] Stock adjusted: product=${productId}, location=${locationId}, change=${quantityChange}, reason=${reason}`,
        );

        // Check if stock dropped below reorder level
        if (quantityChange < 0) {
          const stockItem = await this.prisma.stockItem.findFirst({
            where: { tenantId: event.tenantId, productId, locationId },
          });

          if (stockItem && stockItem.quantityOnHand <= stockItem.reorderLevel) {
            console.log(
              `[Wholesale] Reorder alert: product=${productId} at location=${locationId} is below reorder level (${stockItem.quantityOnHand} <= ${stockItem.reorderLevel})`,
            );
          }
        }
      }
    });

    // Subscribe to financial payment received events
    // Update outstanding balance records when payments are received
    this.eventBus.subscribe('financial.payment.received', async (event) => {
      if (event.type === 'financial.payment.received') {
        const { paymentId, amountPaise, referenceId } = event.payload;
        console.log(
          `[Wholesale] Payment received: id=${paymentId}, amount=${amountPaise}, ref=${referenceId}`,
        );

        // Look for matching outstanding balance by invoiceId
        if (referenceId) {
          const outstanding = await this.prisma.outstandingBalance.findFirst({
            where: {
              tenantId: event.tenantId,
              invoiceId: referenceId,
              status: { not: 'PAID' },
            },
          });

          if (outstanding) {
            const newPaid = Number(outstanding.paidPaise) + amountPaise;
            const newBalance = Math.max(0, Number(outstanding.originalPaise) - newPaid);
            const newStatus = newBalance === 0 ? 'PAID' : outstanding.status;

            await this.prisma.outstandingBalance.update({
              where: { id: outstanding.id },
              data: {
                paidPaise: BigInt(newPaid),
                balancePaise: BigInt(newBalance),
                status: newStatus as 'CURRENT' | 'OVERDUE' | 'PAID',
              },
            });

            // Update credit limit used amount
            const totalOutstanding = await this.prisma.outstandingBalance.aggregate({
              where: {
                tenantId: event.tenantId,
                entityType: outstanding.entityType,
                entityId: outstanding.entityId,
                status: { not: 'PAID' },
              },
              _sum: { balancePaise: true },
            });

            const totalUsed = totalOutstanding._sum.balancePaise ?? 0n;

            const creditLimit = await this.prisma.creditLimit.findFirst({
              where: {
                tenantId: event.tenantId,
                entityType: outstanding.entityType,
                entityId: outstanding.entityId,
              },
            });

            if (creditLimit) {
              const available = creditLimit.creditLimitPaise - totalUsed;
              await this.prisma.creditLimit.update({
                where: { id: creditLimit.id },
                data: {
                  usedPaise: totalUsed,
                  availablePaise: available > 0n ? available : 0n,
                },
              });
            }

            console.log(
              `[Wholesale] Updated outstanding for invoice ${outstanding.invoiceNumber}: balance=${newBalance}`,
            );
          }
        }
      }
    });
  }
}
