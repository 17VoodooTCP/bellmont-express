/* Phase 1 keeps business continuity by consuming the existing shipment API.
   Phase 2 replaces this with the new NestJS + Prisma backend on Render. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type GeoPoint = { city: string; lat: number; lng: number };

export type Invoice = {
  _id?: string;
  amount: number;
  description: string;
  type?: string;
  paid?: boolean;
  createdAt?: string;
};

export type TimelineEvent = {
  status: string;
  location: string;
  description: string;
  timestamp: string;
};

export type Shipment = {
  trackingId: string;
  status:
    | "pending"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "on_hold";
  senderName: string;
  senderAddress?: string;
  receiverName: string;
  receiverAddress?: string;
  weight?: number;
  packageType?: string;
  origin: GeoPoint;
  destination: GeoPoint;
  currentLocation: GeoPoint;
  estimatedDelivery?: string;
  holdReason?: string;
  delayReason?: string;
  delayDescription?: string;
  timeline?: TimelineEvent[];
  invoices?: Invoice[];
};

export async function trackShipment(trackingId: string): Promise<Shipment> {
  const res = await fetch(
    `${API_URL}/api/shipments/track/${encodeURIComponent(trackingId)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "No shipment found for that tracking number."
        : "The tracking service is waking up. Try again in a few seconds."
    );
  }
  const data = await res.json();
  return (data.shipment ?? data) as Shipment;
}

export const STATUS_PROGRESS: Record<Shipment["status"], number> = {
  pending: 0.06,
  picked_up: 0.28,
  in_transit: 0.55,
  out_for_delivery: 0.82,
  delivered: 1,
  on_hold: 0.55,
};

export const STATUS_LABEL: Record<Shipment["status"], string> = {
  pending: "Pending pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  on_hold: "On hold",
};
