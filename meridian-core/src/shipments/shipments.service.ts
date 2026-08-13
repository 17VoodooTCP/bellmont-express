import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Shipment, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/* Wire shape stays identical to the legacy API so the frontend needs no changes */
const toWire = (s: Shipment) => ({ _id: s.id, ...s });

const STATUS_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  pending: 'Shipment created and pending pickup',
  picked_up: 'Package picked up by courier',
  in_transit: 'Shipment in transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  on_hold: 'Shipment placed on hold',
};

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async track(trackingId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingId: trackingId.toUpperCase().trim() },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return { shipment: toWire(shipment) };
  }

  async list(status?: string, page = 1, limit = 20) {
    const where = status ? { status: status as ShipmentStatus } : {};
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return {
      shipments: shipments.map(toWire),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  private appendTimeline(shipment: { timeline: Prisma.JsonValue }, entry: object) {
    const timeline = Array.isArray(shipment.timeline) ? shipment.timeline : [];
    return [...timeline, entry] as Prisma.InputJsonValue;
  }

  async create(data: Record<string, unknown>) {
    const status = (data.status as ShipmentStatus) ?? 'pending';
    const origin = (data.origin as { city?: string }) ?? { city: '', lat: 0, lng: 0 };
    const shipment = await this.prisma.shipment.create({
      data: {
        trackingId: String(data.trackingId ?? '').toUpperCase(),
        senderName: String(data.senderName ?? ''),
        senderAddress: (data.senderAddress as string) ?? null,
        receiverName: String(data.receiverName ?? ''),
        receiverAddress: (data.receiverAddress as string) ?? null,
        weight: data.weight != null ? Number(data.weight) : null,
        packageType: (data.packageType as string) ?? null,
        status,
        origin: origin as Prisma.InputJsonValue,
        destination: (data.destination ?? { city: '', lat: 0, lng: 0 }) as Prisma.InputJsonValue,
        currentLocation: (data.currentLocation ?? origin) as Prisma.InputJsonValue,
        timeline: ((data.timeline as unknown[]) ?? [
          {
            status,
            location: origin.city || 'Origin facility',
            description: STATUS_DESCRIPTIONS[status],
            timestamp: new Date().toISOString(),
          },
        ]) as Prisma.InputJsonValue,
        invoices: ((data.invoices as unknown[]) ?? []) as Prisma.InputJsonValue,
        estimatedDelivery: data.estimatedDelivery
          ? new Date(String(data.estimatedDelivery))
          : null,
        holdReason: (data.holdReason as string) ?? null,
        delayReason: (data.delayReason as string) ?? null,
        delayDescription: (data.delayDescription as string) ?? null,
        customsIntercepted: Boolean(data.customsIntercepted),
        borderClearanceEligible: Boolean(data.borderClearanceEligible),
        customsNotes: (data.customsNotes as string) ?? null,
      },
    });
    return { shipment: toWire(shipment) };
  }

  async setStatus(
    id: string,
    data: { status: string; location?: string; description?: string },
  ) {
    const status = data.status as ShipmentStatus;
    if (!Object.values(ShipmentStatus).includes(status)) {
      throw new BadRequestException('Invalid shipment status');
    }

    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shipment not found');

    const location =
      data.location ||
      (existing.currentLocation as { city?: string })?.city ||
      'Unknown';
    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        status,
        timeline: this.appendTimeline(existing, {
          status,
          location,
          description: data.description || STATUS_DESCRIPTIONS[status],
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return { shipment: toWire(shipment) };
  }

  async hold(id: string, holdReason?: string) {
    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shipment not found');

    const reason = holdReason || 'Placed on hold by admin';
    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: 'on_hold',
        holdReason: reason,
        timeline: this.appendTimeline(existing, {
          status: 'on_hold',
          location: (existing.currentLocation as { city?: string })?.city || 'Unknown',
          description: `On hold: ${reason}`,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return { shipment: toWire(shipment) };
  }

  async resume(id: string) {
    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shipment not found');

    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: 'in_transit',
        holdReason: null,
        timeline: this.appendTimeline(existing, {
          status: 'in_transit',
          location: (existing.currentLocation as { city?: string })?.city || 'Unknown',
          description: 'Shipment resumed from hold',
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return { shipment: toWire(shipment) };
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shipment not found');

    const patch: Prisma.ShipmentUpdateInput = {};
    for (const key of [
      'senderName', 'senderAddress', 'receiverName', 'receiverAddress',
      'packageType', 'holdReason', 'delayReason', 'delayDescription', 'customsNotes',
    ] as const) {
      if (key in data) patch[key] = data[key] as string;
    }
    if ('weight' in data) patch.weight = data.weight != null ? Number(data.weight) : null;
    for (const key of ['origin', 'destination', 'currentLocation', 'timeline', 'invoices'] as const) {
      if (key in data) patch[key] = data[key] as Prisma.InputJsonValue;
    }
    if ('customsIntercepted' in data) patch.customsIntercepted = Boolean(data.customsIntercepted);
    if ('borderClearanceEligible' in data) patch.borderClearanceEligible = Boolean(data.borderClearanceEligible);
    if ('estimatedDelivery' in data) {
      patch.estimatedDelivery = data.estimatedDelivery
        ? new Date(String(data.estimatedDelivery))
        : null;
    }
    if ('status' in data && data.status !== existing.status) {
      const status = data.status as ShipmentStatus;
      patch.status = status;
      patch.timeline = this.appendTimeline(existing, {
        status,
        location:
          (existing.currentLocation as { city?: string })?.city || 'In network',
        description: STATUS_DESCRIPTIONS[status],
        timestamp: new Date().toISOString(),
      });
    }

    const shipment = await this.prisma.shipment.update({ where: { id }, data: patch });
    return { shipment: toWire(shipment) };
  }

  async remove(id: string) {
    await this.prisma.shipment.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Shipment not found');
    });
    return { deleted: true };
  }
}
