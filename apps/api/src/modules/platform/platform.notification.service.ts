import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

type NotificationKind = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationKind;
  link?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PlatformNotificationService extends TenantAwareService {
  // WebSocket gateway reference -- in production, inject NestJS Gateway for real-time push
  private wsClients = new Map<string, Set<{ send: (data: string) => void }>>();

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /** Create a notification for a user. Optionally push via WebSocket. */
  async createNotification(tenantId: string, input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        id: uuid(),
        tenantId,
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
        metadata: input.metadata ?? null,
        isRead: false,
      },
    });

    // Push real-time notification via WebSocket if client connected
    this.pushToUser(input.userId, notification);

    return notification;
  }

  /** Create a notification for all users in a tenant. */
  async broadcastNotification(
    tenantId: string,
    input: Omit<CreateNotificationInput, 'userId'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    const notifications = [];
    for (const user of users) {
      const n = await this.createNotification(tenantId, { ...input, userId: user.id });
      notifications.push(n);
    }

    return { count: notifications.length };
  }

  /** Get notifications for a user, ordered by newest first. */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { tenantId, userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
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

  /** Get unread notification count for a user. */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  /** Mark a single notification as read. */
  async markAsRead(tenantId: string, notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Mark all notifications as read for a user. */
  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { markedCount: result.count };
  }

  /** Delete a notification. */
  async deleteNotification(tenantId: string, notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  // ─── WebSocket Integration ───────────────────────────────────

  /** Register a WebSocket client for a user (called from Gateway). */
  registerClient(userId: string, client: { send: (data: string) => void }) {
    if (!this.wsClients.has(userId)) {
      this.wsClients.set(userId, new Set());
    }
    this.wsClients.get(userId)!.add(client);
  }

  /** Remove a WebSocket client (called when connection closes). */
  removeClient(userId: string, client: { send: (data: string) => void }) {
    const clients = this.wsClients.get(userId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.wsClients.delete(userId);
      }
    }
  }

  /** Push a notification to a user's connected WebSocket clients. */
  private pushToUser(userId: string, notification: Record<string, unknown>) {
    const clients = this.wsClients.get(userId);
    if (!clients || clients.size === 0) return;

    const payload = JSON.stringify({
      type: 'notification',
      data: notification,
    });

    for (const client of clients) {
      try {
        client.send(payload);
      } catch {
        // Client disconnected -- will be cleaned up
      }
    }
  }
}
