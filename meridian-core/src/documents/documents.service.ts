import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsService,
  userRoom,
} from '../realtime/notifications.service';
import { oneOf, str } from '../common/validate';

export const DOCUMENT_KINDS = ['receipt'] as const;

const listSelect = {
  id: true,
  kind: true,
  title: true,
  message: true,
  readAt: true,
  createdAt: true,
  shipmentId: true,
  shipment: { select: { trackingId: true, status: true } },
} satisfies Prisma.DocumentSelect;

/**
 * The document forwarder. A document is a snapshot of the data it is drawn
 * from — for a receipt, the shipment as it stood when sent — so the customer
 * sees exactly what was sent even after the shipment moves on. The page
 * renders it with the same escaping generator the admin console uses.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async send(admin: { id: string }, body: Record<string, unknown>) {
    const shipmentId = str(body, 'shipmentId', 'Shipment', {
      required: true,
      max: 64,
    })!;
    const kind = oneOf(
      body,
      'kind',
      'Document type',
      DOCUMENT_KINDS,
      'receipt',
    );
    const message = str(body, 'message', 'Message', { max: 1000 });

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const recipientId =
      str(body, 'userId', 'Customer', { max: 64 }) ?? shipment.ownerId;
    if (!recipientId) {
      throw new BadRequestException(
        'This shipment is not linked to a customer account. Link a customer first.',
      );
    }
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) throw new NotFoundException('Customer not found');

    const sender = await this.prisma.user.findUnique({
      where: { id: admin.id },
      select: { email: true },
    });
    const title =
      str(body, 'title', 'Title', { max: 160 }) ??
      `Shipment receipt — ${shipment.trackingId}`;

    const doc = await this.prisma.document.create({
      data: {
        userId: recipient.id,
        shipmentId: shipment.id,
        kind,
        title,
        message,
        payload: { shipment: { _id: shipment.id, ...shipment } },
        sentBy: sender?.email ?? admin.id,
      },
      select: listSelect,
    });

    await this.notifications.notifyUser(recipient.id, {
      type: 'document.received',
      title: `New document: ${title}`,
      body: message ?? 'Bellmont Express sent you a document.',
      link: `/account/documents?open=${doc.id}`,
    });
    this.notifications.emit(userRoom(recipient.id), 'document:new', doc);
    return {
      document: doc,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
      },
    };
  }

  async listMine(userId: string) {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: listSelect,
      take: 200,
    });
    return { documents, unread: documents.filter((d) => !d.readAt).length };
  }

  /** Full document, payload included. Opening it as its owner marks it read. */
  async get(id: string, viewer: { id: string; role: string }) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!doc || (viewer.role !== 'admin' && doc.userId !== viewer.id)) {
      throw new NotFoundException('Document not found');
    }
    if (doc.userId === viewer.id && !doc.readAt) {
      doc.readAt = new Date();
      await this.prisma.document.update({
        where: { id },
        data: { readAt: doc.readAt },
      });
    }
    return { document: doc };
  }

  /** Admin: what has been sent, newest first, optionally for one shipment. */
  async list(shipmentId?: string) {
    const documents = await this.prisma.document.findMany({
      where: shipmentId ? { shipmentId } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        ...listSelect,
        sentBy: true,
        user: { select: { id: true, name: true, email: true } },
      },
      take: 200,
    });
    return { documents };
  }

  /** Admin: withdraw a document sent in error. */
  async remove(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.document.delete({ where: { id } });
    this.notifications.emit(userRoom(doc.userId), 'document:removed', { id });
    return { deleted: true };
  }
}
