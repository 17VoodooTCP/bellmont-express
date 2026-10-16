import { io, type Socket } from "socket.io-client";
import type { Shipment } from "./api";

/* Customer accounts. Same API and token format as the admin console, kept
   under a separate storage key so a customer session and an admin session in
   the same browser never overwrite each other. */

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TOKEN_KEY = "bellmont_user_token";
const ADMIN_TOKEN_KEY = "bellmont_admin_token";

export const getUserToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
const setUserToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearUserToken = () => localStorage.removeItem(TOKEN_KEY);

/** Fired on this window whenever the customer session changes, so the header
 *  and the account pages stay in step without a reload. */
export const SESSION_EVENT = "bellmont:session";
const announce = () => window.dispatchEvent(new Event(SESSION_EVENT));

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const token = getUserToken();
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "We couldn't reach Bellmont Express. The service may be waking up — try again in a few seconds.",
      0,
    );
  }
  if (res.status === 401 && auth) {
    clearUserToken();
    announce();
    throw new ApiError("Your session has ended. Please sign in again.", 401);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(typeof msg === "string" ? msg : `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

/* ── Session ─────────────────────────────────────────────────────────── */

export type Account = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone: string | null;
  company: string | null;
  createdAt: string;
};

type AuthResult = { user: Account; token: string };

/** Signs in. An admin signing in here is handed to the console instead. */
export async function signIn(email: string, password: string) {
  const r = await call<AuthResult>("/auth/login", json("POST", { email, password }), false);
  if (r.user.role === "admin") {
    localStorage.setItem(ADMIN_TOKEN_KEY, r.token);
    return { user: r.user, admin: true };
  }
  setUserToken(r.token);
  announce();
  return { user: r.user, admin: false };
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
}) {
  const r = await call<AuthResult>("/auth/register", json("POST", data), false);
  setUserToken(r.token);
  announce();
  return r.user;
}

export function signOut() {
  clearUserToken();
  announce();
}

export const getMe = () => call<{ user: Account }>("/auth/me").then((r) => r.user);
export const updateProfile = (data: Partial<Pick<Account, "name" | "phone" | "company">>) =>
  call<{ user: Account }>("/auth/me", json("PUT", data)).then((r) => r.user);
export const changePassword = (currentPassword: string, newPassword: string) =>
  call<{ ok: true }>("/auth/password", json("POST", { currentPassword, newPassword }));

/* ── Shipment requests ───────────────────────────────────────────────── */

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ServiceLevel = "standard" | "express" | "priority";

export type ShipmentRequest = {
  id: string;
  reference: string;
  status: RequestStatus;
  serviceLevel: ServiceLevel;
  senderName: string;
  senderPhone: string | null;
  senderAddress: string;
  originCity: string;
  receiverName: string;
  receiverPhone: string | null;
  receiverAddress: string;
  destinationCity: string;
  packageType: string;
  weight: number | null;
  dimensions: string | null;
  declaredValue: number | null;
  contents: string | null;
  pickupDate: string | null;
  notes: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; email: string; phone: string | null; company: string | null };
  shipment: { id: string; trackingId: string; status: Shipment["status"] } | null;
};

export type NewRequest = {
  serviceLevel: ServiceLevel;
  senderName: string;
  senderPhone?: string;
  senderAddress: string;
  originCity: string;
  receiverName: string;
  receiverPhone?: string;
  receiverAddress: string;
  destinationCity: string;
  packageType: string;
  weight?: number | null;
  dimensions?: string;
  declaredValue?: number | null;
  contents?: string;
  pickupDate?: string;
  notes?: string;
};

export const PACKAGE_TYPES = ["Envelope", "Parcel", "Box", "Pallet", "Crate", "Container", "Other"] as const;

export const createRequest = (data: NewRequest) =>
  call<{ request: ShipmentRequest }>("/requests", json("POST", data)).then((r) => r.request);
export const myRequests = () =>
  call<{ requests: ShipmentRequest[] }>("/requests/mine").then((r) => r.requests);
export const cancelRequest = (id: string) =>
  call<{ request: ShipmentRequest }>(`/requests/${id}/cancel`, json("POST")).then((r) => r.request);

/* ── Shipments ───────────────────────────────────────────────────────── */

export type MyShipment = Shipment & {
  _id: string;
  createdAt: string;
  updatedAt: string;
  request: { id: string; reference: string; serviceLevel: ServiceLevel } | null;
};

export const myShipments = () =>
  call<{ shipments: MyShipment[] }>("/shipments/mine").then((r) => r.shipments);

/* ── Documents ───────────────────────────────────────────────────────── */

export type DocumentSummary = {
  id: string;
  kind: "receipt";
  title: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  shipmentId: string | null;
  shipment: { trackingId: string; status: Shipment["status"] } | null;
};

export type DocumentFull = DocumentSummary & {
  payload: { shipment: Shipment & { _id: string } };
  sentBy: string | null;
};

export const myDocuments = () =>
  call<{ documents: DocumentSummary[]; unread: number }>("/documents/mine");
export const getDocument = (id: string) =>
  call<{ document: DocumentFull }>(`/documents/${id}`).then((r) => r.document);

/* ── Notifications ───────────────────────────────────────────────────── */

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export const myNotifications = () =>
  call<{ notifications: AppNotification[]; unread: number }>("/notifications");
export const readNotification = (id: string) => call(`/notifications/${id}/read`, json("POST"));
export const readAllNotifications = () => call("/notifications/read-all", json("POST"));

/**
 * The live channel: an authenticated socket on /notify. Pass the token of
 * whoever is signed in; the server places it in that person's private room.
 */
export function connectNotifications(token: string): Socket {
  return io(`${API}/notify`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  });
}
