import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus, type Shipment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_ROOM,
  NotificationsService,
  userRoom,
} from '../realtime/notifications.service';
import { RateLimiter } from '../common/rate-limit';
import { date, num, oneOf, shortCode, str, ymd } from '../common/validate';
import { geocodeCity } from '../common/geocode';

export const SERVICE_LEVELS = ['standard', 'express', 'priority'] as const;
export const PACKAGE_TYPES = [
  'Envelope',
  'Parcel',
  'Box',
  'Pallet',
  'Crate',
  'Container',
  'Other',
] as const;

/** Most open requests one customer may hold at once — keeps a single account
 *  from flooding the review queue. */
const MAX_OPEN_REQUESTS = 15;

const includeForWire = {
  user: {
    select: { id: true, name: true, email: true, phone: true, company: true },
  },
  shipment: { select: { id: true, trackingId: true, status: true } },
} satisfies Prisma.ShipmentRequestInclude;

type RequestWithRelations = Prisma.ShipmentRequestGetPayload<{
  include: typeof includeForWire;
}>;

const toWire = (r: RequestWithRelations) => ({
  id: r.id,
  reference: r.reference,
  status: r.status,
  serviceLevel: r.serviceLevel,
  senderName: r.senderName,
  senderPhone: r.senderPhone,
  senderAddress: r.senderAddress,
  originCity: r.originCity,
  receiverName: r.receiverName,
  receiverPhone: r.receiverPhone,
  receiverAddress: r.receiverAddress,
  destinationCity: r.destinationCity,
  packageType: r.packageType,
  weight: r.weight,
  dimensions: r.dimensions,
  declaredValue: r.declaredValue,
  contents: r.contents,
  pickupDate: r.pickupDate,
  notes: r.notes,
  reviewNote: r.reviewNote,
  reviewedAt: r.reviewedAt,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  customer: r.user,
  shipment: r.shipment,
});

/** UPU S10-style tracking number with its check digit — the same scheme the
 *  admin console generates — e.g. CP123456785US. */
function newTrackingId(): string {
  const digits = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 10),
  );
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = digits.reduce((s, d, i) => s + d * weights[i], 0);
  let check = 11 - (sum % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 5;
  return `CP${digits.join('')}${check}US`;
}

@Injectable()
export class RequestsService {
  private createLimiter = new RateLimiter(10, 60 * 60 * 1000);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /* ── Customer ───────────────────────────────────────────────────────── */

  async create(userId: string, body: Record<string, unknown>) {
    this.createLimiter.check(userId);

    const open = await this.prisma.shipmentRequest.count({
      where: { userId, status: 'pending' },
    });
    if (open >= MAX_OPEN_REQUESTS) {
      throw new BadRequestException(
        `You have ${open} requests awaiting review. Please wait for those to be processed before adding more.`,
      );
    }

    const pickupDate = date(body, 'pickupDate', 'Pickup date');
    if (pickupDate) {
      /* A day of slack: the customer picks a date on their own calendar,
         which can be a day behind UTC (the Americas in the evening). */
      const earliest = new Date();
      earliest.setUTCHours(0, 0, 0, 0);
      earliest.setUTCDate(earliest.getUTCDate() - 1);
      if (pickupDate < earliest)
        throw new BadRequestException('Pickup date cannot be in the past.');
    }

    const data = {
      userId,
      serviceLevel: oneOf(
        body,
        'serviceLevel',
        'Service level',
        SERVICE_LEVELS,
        'standard',
      ),
      senderName: str(body, 'senderName', 'Sender name', {
        required: true,
        max: 120,
      })!,
      senderPhone: str(body, 'senderPhone', 'Sender phone', { max: 40 }),
      senderAddress: str(body, 'senderAddress', 'Sender address', {
        required: true,
        max: 300,
      })!,
      originCity: str(body, 'originCity', 'Origin city', {
        required: true,
        max: 120,
      })!,
      receiverName: str(body, 'receiverName', 'Receiver name', {
        required: true,
        max: 120,
      })!,
      receiverPhone: str(body, 'receiverPhone', 'Receiver phone', { max: 40 }),
      receiverAddress: str(body, 'receiverAddress', 'Receiver address', {
        required: true,
        max: 300,
      })!,
      destinationCity: str(body, 'destinationCity', 'Destination city', {
        required: true,
        max: 120,
      })!,
      packageType: oneOf(
        body,
        'packageType',
        'Package type',
        PACKAGE_TYPES,
        'Parcel',
      ),
      weight: num(body, 'weight', 'Weight', { min: 0.01, max: 100000 }),
      dimensions: str(body, 'dimensions', 'Dimensions', { max: 80 }),
      declaredValue: num(body, 'declaredValue', 'Declared value', {
        min: 0,
        max: 100000000,
      }),
      contents: str(body, 'contents', 'Contents', { max: 300 }),
      pickupDate,
      notes: str(body, 'notes', 'Notes', { max: 1000 }),
    };

    /* References are random; retry on the rare collision. */
    let request: RequestWithRelations | null = null;
    for (let attempt = 0; attempt < 5 && !request; attempt++) {
      try {
        request = await this.prisma.shipmentRequest.create({
          data: { ...data, reference: `BR-${ymd()}-${shortCode(4)}` },
          include: includeForWire,
        });
      } catch (err) {
        if (!(
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ))
          throw err;
      }
    }
    if (!request)
      throw new BadRequestException(
        'Could not create the request. Please try again.',
      );

    const wire = toWire(request);
    await this.notifications.notifyAdmins({
      type: 'request.created',
      title: `New shipment request ${request.reference}`,
      body: `${request.user.name} · ${request.originCity} → ${request.destinationCity} · ${request.packageType}${request.serviceLevel !== 'standard' ? ` · ${request.serviceLevel}` : ''}`,
      link: `/admin/requests?open=${request.id}`,
    });
    this.notifications.emit(ADMIN_ROOM, 'request:new', wire);
    return { request: wire };
  }

  async listMine(userId: string) {
    const requests = await this.prisma.shipmentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: includeForWire,
      take: 200,
    });
    return { requests: requests.map(toWire) };
  }

  async cancel(userId: string, id: string) {
    const existing = await this.prisma.shipmentRequest.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== userId)
      throw new NotFoundException('Request not found');
    if (existing.status !== 'pending') {
      throw new BadRequestException(
        'Only requests awaiting review can be cancelled.',
      );
    }
    const request = await this.prisma.shipmentRequest.update({
      where: { id },
      data: { status: 'cancelled' },
      include: includeForWire,
    });
    const wire = toWire(request);
    await this.notifications.notifyAdmins({
      type: 'request.cancelled',
      title: `Request ${request.reference} cancelled`,
      body: `${request.user.name} withdrew this request.`,
      link: `/admin/requests?open=${request.id}`,
    });
    this.notifications.emit(ADMIN_ROOM, 'request:update', wire);
    return { request: wire };
  }

  /* ── Shared ─────────────────────────────────────────────────────────── */

  async get(id: string, viewer: { id: string; role: string }) {
    const request = await this.prisma.shipmentRequest.findUnique({
      where: { id },
      include: includeForWire,
    });
    if (!request) throw new NotFoundException('Request not found');
    if (viewer.role !== 'admin' && request.userId !== viewer.id) {
      // Same answer as a missing request: never confirm someone else's exists.
      throw new NotFoundException('Request not found');
    }
    return { request: toWire(request) };
  }

  /* ── Admin ──────────────────────────────────────────────────────────── */

  async list(status?: string) {
    const where: Prisma.ShipmentRequestWhereInput = {};
    if (status && status !== 'all') {
      if (!Object.values(RequestStatus).includes(status as RequestStatus)) {
        throw new BadRequestException('Unknown status filter');
      }
      where.status = status as RequestStatus;
    }
    const [requests, counts] = await Promise.all([
      this.prisma.shipmentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: includeForWire,
        take: 200,
      }),
      this.prisma.shipmentRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);
    return {
      requests: requests.map(toWire),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    };
  }

  async approve(
    id: string,
    admin: { id: string },
    body: Record<string, unknown>,
  ) {
    const existing = await this.prisma.shipmentRequest.findUnique({
      where: { id },
      include: includeForWire,
    });
    if (!existing) throw new NotFoundException('Request not found');
    if (existing.status !== 'pending') {
      throw new BadRequestException(
        `This request is already ${existing.status}.`,
      );
    }
    const estimatedDelivery = date(
      body,
      'estimatedDelivery',
      'Estimated delivery',
    );
    const note = str(body, 'note', 'Note to customer', { max: 1000 });

    const [origin, destination] = await Promise.all([
      geocodeCity(existing.originCity),
      geocodeCity(existing.destinationCity),
    ]);
    const reviewer = await this.prisma.user.findUnique({
      where: { id: admin.id },
      select: { email: true },
    });

    /* Shipment creation and the request update succeed or fail together, so a
       request can never end up approved without its shipment. */
    const shipment = await this.prisma.$transaction(async (tx) => {
      let created: Shipment | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          created = await tx.shipment.create({
            data: {
              trackingId: newTrackingId(),
              senderName: existing.senderName,
              senderAddress: existing.senderAddress,
              receiverName: existing.receiverName,
              receiverAddress: existing.receiverAddress,
              weight: existing.weight,
              packageType: existing.packageType,
              status: 'pending',
              origin: origin as unknown as Prisma.InputJsonValue,
              destination: destination as unknown as Prisma.InputJsonValue,
              currentLocation: origin as unknown as Prisma.InputJsonValue,
              timeline: [
                {
                  status: 'pending',
                  location: existing.originCity,
                  description: `Booking ${existing.reference} approved — awaiting pickup`,
                  timestamp: new Date().toISOString(),
                },
              ] as Prisma.InputJsonValue,
              estimatedDelivery,
              ownerId: existing.userId,
            },
          });
        } catch (err) {
          if (!(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ))
            throw err;
        }
      }
      if (!created)
        throw new BadRequestException(
          'Could not allocate a tracking number. Please retry.',
        );
      await tx.shipmentRequest.update({
        where: { id },
        data: {
          status: 'approved',
          shipmentId: created.id,
          reviewNote: note,
          reviewedAt: new Date(),
          reviewedBy: reviewer?.email ?? admin.id,
        },
      });
      return created;
    });

    const request = await this.prisma.shipmentRequest.findUniqueOrThrow({
      where: { id },
      include: includeForWire,
    });
    const wire = toWire(request);
    await this.notifications.notifyUser(existing.userId, {
      type: 'request.approved',
      title: `Shipment approved — ${shipment.trackingId}`,
      body: `Your booking ${existing.reference} (${existing.originCity} → ${existing.destinationCity}) is confirmed.${note ? ` ${note}` : ''}`,
      link: `/account/shipments?open=${shipment.id}`,
    });
    this.notifications.emit(userRoom(existing.userId), 'request:update', wire);
    this.notifications.emit(ADMIN_ROOM, 'request:update', wire);
    return { request: wire, shipment: { _id: shipment.id, ...shipment } };
  }

  async reject(
    id: string,
    admin: { id: string },
    body: Record<string, unknown>,
  ) {
    const existing = await this.prisma.shipmentRequest.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Request not found');
    if (existing.status !== 'pending') {
      throw new BadRequestException(
        `This request is already ${existing.status}.`,
      );
    }
    const reason = str(body, 'reason', 'Reason', {
      required: true,
      max: 1000,
    })!;
    const reviewer = await this.prisma.user.findUnique({
      where: { id: admin.id },
      select: { email: true },
    });
    const request = await this.prisma.shipmentRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewNote: reason,
        reviewedAt: new Date(),
        reviewedBy: reviewer?.email ?? admin.id,
      },
      include: includeForWire,
    });
    const wire = toWire(request);
    await this.notifications.notifyUser(existing.userId, {
      type: 'request.rejected',
      title: `Request ${existing.reference} was not approved`,
      body: reason,
      link: `/account/shipments?request=${existing.id}`,
    });
    this.notifications.emit(userRoom(existing.userId), 'request:update', wire);
    this.notifications.emit(ADMIN_ROOM, 'request:update', wire);
    return { request: wire };
  }
}
