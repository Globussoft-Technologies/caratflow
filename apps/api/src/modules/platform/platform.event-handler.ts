import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PlatformAuditService } from './platform.audit.service';
import { PlatformNotificationService } from './platform.notification.service';
import type { DomainEvent, DomainEventType } from '@caratflow/shared-types';

/**
 * Subscribes to ALL domain events for centralized audit logging and notifications.
 * This handler captures every event that flows through the system and logs it
 * to the AuditLog/ActivityLog for the tenant.
 */
@Injectable()
export class PlatformEventHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly auditService: PlatformAuditService,
    private readonly notificationService: PlatformNotificationService,
  ) {}

  onModuleInit() {
    // Subscribe to all known event types for audit logging
    const eventTypes: DomainEventType[] = [
      // Inventory
      'inventory.stock.adjusted',
      'inventory.item.created',
      'inventory.item.updated',
      'inventory.transfer.completed',
      // Manufacturing
      'manufacturing.job.created',
      'manufacturing.job.completed',
      'manufacturing.job.costed',
      'manufacturing.material.requisitioned',
      // Retail
      'retail.sale.completed',
      'retail.return.processed',
      'retail.custom_order.created',
      'retail.repair.created',
      // Financial
      'financial.payment.received',
      'financial.invoice.created',
      'financial.gst.computed',
      // CRM
      'crm.customer.created',
      'crm.customer.updated',
      'crm.loyalty.points_earned',
      'crm.notification.sent',
      // Wholesale
      'wholesale.purchase.completed',
      'wholesale.consignment.created',
      'wholesale.consignment.returned',
      // Compliance
      'compliance.huid.registered',
      'compliance.hallmark.verified',
      // E-Commerce
      'ecommerce.order.received',
      'ecommerce.order.synced',
      // Platform
      'platform.user.created',
      'platform.branch.created',
      'platform.settings.updated',
    ];

    for (const eventType of eventTypes) {
      this.eventBus.subscribe(eventType, (event) => this.handleEvent(event));
    }
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      // Log to audit trail
      const { entityType, entityId, action } = this.extractEntityInfo(event);

      await this.auditService.logDataChange(
        event.tenantId,
        {
          action,
          entityType,
          entityId,
          newValues: event.payload as Record<string, unknown>,
        },
        { userId: event.userId },
      );

      // Log as activity
      await this.auditService.logActivity(
        event.tenantId,
        {
          action: event.type,
          description: this.describeEvent(event),
          metadata: { correlationId: event.correlationId, payload: event.payload },
        },
        { userId: event.userId },
      );

      // Generate notifications for important events
      await this.maybeNotify(event);
    } catch (err) {
      console.error(`[PlatformEventHandler] Failed to handle event ${event.type}:`, err);
    }
  }

  /** Extract entity information from an event for audit logging. */
  private extractEntityInfo(event: DomainEvent): { entityType: string; entityId: string; action: string } {
    const parts = event.type.split('.');
    const action = parts.slice(-1)[0];
    const entityType = parts.slice(0, -1).join('.');
    const payload = event.payload as Record<string, unknown>;

    // Try to extract entityId from common payload patterns
    const entityId =
      (payload.productId as string) ??
      (payload.jobOrderId as string) ??
      (payload.saleId as string) ??
      (payload.invoiceId as string) ??
      (payload.paymentId as string) ??
      (payload.customerId as string) ??
      (payload.userId as string) ??
      (payload.locationId as string) ??
      (payload.orderId as string) ??
      (payload.transferId as string) ??
      (payload.consignmentId as string) ??
      (payload.returnId as string) ??
      (payload.repairId as string) ??
      (payload.purchaseOrderId as string) ??
      (payload.settingKey as string) ??
      'unknown';

    return { entityType, entityId, action };
  }

  /** Generate a human-readable description for an event. */
  private describeEvent(event: DomainEvent): string {
    const descriptions: Record<string, (payload: Record<string, unknown>) => string> = {
      'inventory.stock.adjusted': (p) => `Stock adjusted for product ${p.productId} at location ${p.locationId}: ${p.quantityChange} (${p.reason})`,
      'inventory.item.created': (p) => `New inventory item created: product ${p.productId}`,
      'inventory.transfer.completed': (p) => `Stock transfer completed from ${p.fromLocationId} to ${p.toLocationId}`,
      'manufacturing.job.created': (p) => `New manufacturing job created: ${p.jobOrderId}`,
      'manufacturing.job.completed': (p) => `Manufacturing job completed: ${p.jobOrderId}`,
      'retail.sale.completed': (p) => `Sale completed: ${p.saleId} for customer ${p.customerId}`,
      'financial.invoice.created': (p) => `Invoice created: ${p.invoiceNumber}`,
      'financial.payment.received': (p) => `Payment received: ${p.paymentId}`,
      'crm.customer.created': (p) => `New customer: ${p.firstName} ${p.lastName}`,
      'wholesale.purchase.completed': (p) => `Purchase completed from supplier`,
      'platform.user.created': (p) => `New user created: ${p.email}`,
      'platform.branch.created': (p) => `New branch created: ${p.name}`,
      'platform.settings.updated': (p) => `Setting updated: ${p.settingKey}`,
    };

    const describer = descriptions[event.type];
    if (describer) {
      return describer(event.payload as Record<string, unknown>);
    }
    return `Event: ${event.type}`;
  }

  /** Send notifications for high-priority events. */
  private async maybeNotify(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'manufacturing.job.completed':
        // Notify the user who created the job
        await this.notificationService.createNotification(event.tenantId, {
          userId: event.userId,
          title: 'Job Order Completed',
          message: `Manufacturing job ${payload.jobOrderId} has been completed.`,
          type: 'SUCCESS',
          link: `/manufacturing/jobs/${payload.jobOrderId}`,
        });
        break;

      case 'inventory.stock.adjusted':
        // Notify about stock adjustments (potential loss/shrinkage)
        const qty = payload.quantityChange as number;
        if (qty < 0) {
          await this.notificationService.createNotification(event.tenantId, {
            userId: event.userId,
            title: 'Stock Reduction',
            message: `Stock adjusted by ${qty} for product ${payload.productId}. Reason: ${payload.reason}`,
            type: 'WARNING',
            link: `/inventory/stock`,
          });
        }
        break;

      case 'ecommerce.order.received':
        // Notify about new online orders
        await this.notificationService.broadcastNotification(event.tenantId, {
          title: 'New Online Order',
          message: `New order received from ${payload.channel}: ${payload.orderId}`,
          type: 'INFO',
          link: `/ecommerce/orders/${payload.orderId}`,
        });
        break;

      // No notification for most events -- audit log is sufficient
      default:
        break;
    }
  }
}
