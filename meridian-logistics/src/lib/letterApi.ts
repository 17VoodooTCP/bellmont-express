const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TOKEN_KEY = "bellmont_admin_token";

export type LetterForm = {
  recipientName: string;
  recipientAddress: string;
  subject: string;
  body: string;
  signerName: string;
  signerTitle: string;
  department: string;
  classification: string;
};

export type LetterDraft = LetterForm & {
  id: string;
  title: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
};

export type Executive = { id: string; name: string; title: string; department: string };

async function call<T>(path: string, init: RequestInit = {}) {
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message?.toString?.() || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const listLetterDrafts = () => call<{ drafts: LetterDraft[] }>("/letters/drafts");
export const saveLetterDraft = (body: LetterForm & { id?: string; reference: string }) =>
  call<{ draft: LetterDraft }>("/letters/drafts", { method: "POST", body: JSON.stringify(body) });
export const deleteLetterDraft = (id: string) =>
  call<{ deleted: boolean }>(`/letters/drafts/${id}`, { method: "DELETE" });
export const listExecutives = () => call<{ executives: Executive[] }>("/letters/executives");
export const addExecutive = (body: Pick<Executive, "name" | "title" | "department">) =>
  call<{ executive: Executive }>("/letters/executives", { method: "POST", body: JSON.stringify(body) });
export const issueLetter = (body: Record<string, string>) =>
  call<{ letter: unknown }>("/letters/issue", { method: "POST", body: JSON.stringify(body) });

function hash32(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function digest(input: string, length = 16) {
  const alphabet = "0123456789ABCDEF";
  let out = "";
  let h = hash32(input);
  for (let i = 0; i < length; i += 1) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    out += alphabet[h % alphabet.length];
  }
  return out;
}

export async function fingerprint(input: Record<string, string>) {
  const payload = Object.entries(input)
    .map(([key, value]) => `${key}=${String(value ?? "").replace(/\s+/g, " ").trim()}`)
    .join("|");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const buffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return digest(payload, 64);
}

export const formatFingerprint = (hex: string) =>
  hex.slice(0, 32).toUpperCase().replace(/(.{4})/g, "$1 ").trim();

export const newLetterReference = () => {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `BEX-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

export const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
