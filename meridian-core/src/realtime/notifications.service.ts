import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification } from '../generated/prisma/client';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string | null;
}

/** Room names on the /notify namespace. */
export const userRoom = (userId: string) => `user:${userId}`;
export const ADMIN_ROOM = 'admins';

const toWire = (n: Notification) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/**
 * Notifications: stored, so they survive a closed tab and show in history,
 * and pushed over the socket, so an open console or dashboard hears about
 * them immediately. A null userId addresses the admin team as a whole.
 */
@Injectable()
export class NotificationsService {
  private server: Server | null = null;

  constructor(private prisma: PrismaService) {}

  /** Called by the gateway once its namespace server exists. */
  attach(server: Server) {
    this.server = server;
  }

  /** Pushes a live event without storing anything. */
  emit(room: string, event: string, payload: unknown) {
    this.server?.to(room).emit(event, payload);
  }

  async notifyUser(userId: string, input: NotificationInput) {
    const n = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? '',
        link: input.link ?? null,
      },
    });
    this.emit(userRoom(userId), 'notification', toWire(n));
    return n;
  }

  async notifyAdmins(input: NotificationInput) {
    const n = await this.prisma.notification.create({
      data: {
        userId: null,
        type: input.type,
        title: input.title,
        body: input.body ?? '',
        link: input.link ?? null,
      },
    });
    this.emit(ADMIN_ROOM, 'notification', toWire(n));
    return n;
  }

  /** `userId` null lists the admin team's feed. */
  async list(userId: string | null, limit = 30) {
    const where = { userId };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { notifications: items.map(toWire), unread };
  }

  async markRead(id: string, userId: string | null) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await this.prisma.notification.count({
        where: { id, userId },
      });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { ok: true };
  }

  async markAllRead(userId: string | null) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
