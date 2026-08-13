import type { Shipment, Invoice } from "./api";

/* Falls back to the local API, never to a previous deployment: a missing
   NEXT_PUBLIC_API_URL should fail visibly rather than quietly talk to old data. */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TOKEN_KEY = "bellmont_admin_token";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function call<T>(
  path: string,
  init: RequestInit = {},
  auth = true
): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    if (!auth) throw new Error("Invalid email or password.");
    clearToken();
    throw new Error("Session expired. Sign in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message?.toString?.() ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/* ── auth ── */
export type AdminUser = { _id: string; name: string; email: string; role: string };

export async function login(email: string, password: string) {
  const data = await call<{ user: AdminUser; token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false
  );
  if (data.user.role !== "admin") throw new Error("This account is not an administrator.");
  setToken(data.token);
  return data.user;
}

/* ── shipments ── */
export type AdminShipment = Shipment & { _id: string };

export const listShipments = () =>
  call<{ shipments: AdminShipment[]; total: number }>("/shipments?limit=100");

export const createShipment = (body: Partial<Shipment>) =>
  call<{ shipment: AdminShipment }>("/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateShipment = (id: string, body: Partial<Shipment>) =>
  call<{ shipment: AdminShipment }>(`/shipments/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteShipment = (id: string) =>
  call<{ deleted: boolean }>(`/shipments/${id}`, { method: "DELETE" });

/* Status changes go through the dedicated endpoint: it appends the timeline
   entry and broadcasts `shipmentUpdate` over the socket. A plain PUT /:id
   writes the field but leaves the journey log empty and nothing live-updates. */
export const setShipmentStatus = (
  id: string,
  body: { status: Shipment["status"]; location?: string; description?: string }
) =>
  call<{ shipment: AdminShipment }>(`/shipments/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const holdShipment = (id: string, body: { holdReason?: string } = {}) =>
  call<{ shipment: AdminShipment }>(`/shipments/${id}/hold`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const resumeShipment = (id: string) =>
  call<{ shipment: AdminShipment }>(`/shipments/${id}/resume`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

/* ── reviews ── */
export type DbReview = {
  id: string;
  name: string;
  role: string;
  stars: number;
  avatar: string;
  quote: string;
  published: boolean;
  sortOrder: number;
};

const unwrapReviews = (d: unknown): DbReview[] =>
  Array.isArray(d) ? (d as DbReview[]) : ((d as { reviews?: DbReview[] })?.reviews ?? []);

export const listAllReviews = () =>
  call<unknown>("/reviews/all").then(unwrapReviews);

export const createReview = (body: Partial<DbReview>) =>
  call<unknown>("/reviews", { method: "POST", body: JSON.stringify(body) });

export const updateReview = (id: string, body: Partial<DbReview>) =>
  call<unknown>(`/reviews/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteReview = (id: string) =>
  call<unknown>(`/reviews/${id}`, { method: "DELETE" });

export type { Invoice };

/* ── live chat ── */
export type ChatSessionSummary = {
  sessionId: string;
  userName: string;
  status: "bot" | "human" | "closed";
  updatedAt: string;
};

export type ChatMsg = {
  sender: "user" | "bot" | "admin" | "system";
  message: string;
  timestamp: string;
};

const unwrap = <T,>(key: string) => (d: unknown): T =>
  ((d as Record<string, T>)?.[key] ?? d) as T;

export const listChatSessions = () =>
  call<unknown>("/chat/sessions").then(unwrap<ChatSessionSummary[]>("sessions"));

export const getChatMessages = (sessionId: string) =>
  call<unknown>(`/chat/sessions/${encodeURIComponent(sessionId)}`).then(
    unwrap<{ messages?: ChatMsg[] } | ChatMsg[]>("messages")
  ).then((m) => (Array.isArray(m) ? m : (m?.messages ?? [])));
