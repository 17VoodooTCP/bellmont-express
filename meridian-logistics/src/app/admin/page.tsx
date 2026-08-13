"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminShipment,
  clearToken,
  createShipment,
  deleteShipment,
  getToken,
  listShipments,
  setShipmentStatus,
  updateShipment,
} from "@/lib/adminApi";
import type { Invoice, Shipment } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/api";

const STATUSES = Object.keys(STATUS_LABEL) as Shipment["status"][];
const FEE_TYPES = [
  ["shipping_fee", "Shipping fee"],
  ["delay_fee", "Delay fee"],
  ["customs_fee", "Customs fee"],
  ["storage_fee", "Storage fee"],
  ["other", "Other"],
] as const;

/* S10 UPU tracking number: service code + 8 digits + UPU check digit + origin country */
const newTrackingId = () => {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = digits.reduce((s, d, i) => s + d * weights[i], 0);
  let check = 11 - (sum % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 5;
  return `CP${digits.join("")}${check}US`;
};

const emptyForm = (): Partial<Shipment> => ({
  trackingId: newTrackingId(),
  senderName: "",
  receiverName: "",
  receiverAddress: "",
  status: "pending",
  origin: { city: "", lat: 0, lng: 0 },
  destination: { city: "", lat: 0, lng: 0 },
  currentLocation: { city: "", lat: 0, lng: 0 },
  invoices: [],
});

/* fill missing coordinates from the city name on save */
async function geocodeIfNeeded(p?: { city: string; lat: number; lng: number }) {
  if (!p?.city?.trim() || Math.abs(p.lat) > 0.01 || Math.abs(p.lng) > 0.01) return p;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p.city)}&format=json&limit=1`
    );
    const d = await r.json();
    if (d?.[0]) return { ...p, lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch { /* keep as-is */ }
  return p;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Partial<Shipment> & { _id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fee, setFee] = useState({ amount: "", description: "", type: "shipping_fee" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listShipments();
      setShipments(data.shipments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
      if (String(err).includes("Sign in")) router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    void refresh();
  }, [refresh, router]);

  /* Optimistic: the row flips immediately, then reconciles with the server
     response. On a sleeping free-tier instance the request can take seconds,
     and the admin should never be left staring at a stale status. */
  const setStatus = async (s: AdminShipment, status: Shipment["status"]) => {
    const previous = s.status;
    setError("");
    setShipments((list) =>
      list.map((x) => (x._id === s._id ? { ...x, status } : x))
    );
    try {
      const { shipment } = await setShipmentStatus(s._id, { status });
      setShipments((list) =>
        list.map((x) => (x._id === s._id ? { ...x, ...shipment } : x))
      );
    } catch (err) {
      setShipments((list) =>
        list.map((x) => (x._id === s._id ? { ...x, status: previous } : x))
      );
      setError(err instanceof Error ? err.message : "Status update failed.");
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const body = { ...editing };
      body.origin = await geocodeIfNeeded(body.origin);
      body.destination = await geocodeIfNeeded(body.destination);
      body.currentLocation =
        body.currentLocation?.city?.trim()
          ? await geocodeIfNeeded(body.currentLocation)
          : body.origin;
      if (editing._id) await updateShipment(editing._id, body);
      else await createShipment(body);
      setEditing(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const addFee = () => {
    if (!editing || !fee.amount || !fee.description) return;
    const invoice: Invoice = {
      amount: parseFloat(fee.amount),
      description: fee.description,
      type: fee.type,
      paid: false,
      createdAt: new Date().toISOString(),
    };
    setEditing({ ...editing, invoices: [...(editing.invoices ?? []), invoice] });
    setFee({ amount: "", description: "", type: "shipping_fee" });
  };

  const geo = (key: "origin" | "destination" | "currentLocation", city: string) =>
    editing && setEditing({ ...editing, [key]: { city, lat: 0, lng: 0 } });

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="notranslate flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-sage"><span className="inline-block">Bellmont Express</span> Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Operations console</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/letters" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
            Letter builder
          </Link>
          <Link href="/admin/chat" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
            Live chat
          </Link>
          <Link href="/admin/reviews" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
            Reviews
          </Link>
          <button
            onClick={() => { setEditing(emptyForm()); }}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-sage"
          >
            New shipment
          </button>
          <button
            onClick={() => { clearToken(); router.replace("/admin/login"); }}
            className="text-sm font-medium text-ink-mute hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-sage-tint px-4 py-3 text-sm text-sage-deep">{error}</p>}

      {/* shipments table */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-widest text-ink-mute">
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Receiver</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Invoices</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-mute">Loading… the free service may take a minute to wake.</td></tr>
            )}
            {!loading && shipments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-mute">No shipments yet.</td></tr>
            )}
            {shipments.map((s) => (
              <tr key={s._id} className="border-b border-line last:border-0">
                <td className="notranslate px-4 py-3 font-semibold">{s.trackingId}</td>
                <td className="px-4 py-3 text-ink-soft">{s.origin?.city} → {s.destination?.city}</td>
                <td className="px-4 py-3 text-ink-soft">{s.receiverName}</td>
                <td className="px-4 py-3">
                  <select
                    value={s.status}
                    onChange={(e) => void setStatus(s, e.target.value as Shipment["status"])}
                    className="rounded-lg border border-line px-2 py-1.5 text-xs font-medium"
                    aria-label={`Status for ${s.trackingId}`}
                  >
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {(s.invoices?.length ?? 0) > 0
                    ? `$${s.invoices!.reduce((t, i) => t + (i.amount || 0), 0).toFixed(2)}`
                    : <span className="text-ink-mute">None</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing({ ...s })} className="mr-3 text-xs font-semibold text-sage hover:underline">Edit</button>
                  <button
                    onClick={() => { if (confirm(`Delete ${s.trackingId}?`)) deleteShipment(s._id).then(refresh); }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-7 md:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing._id ? `Edit ${editing.trackingId}` : "New shipment"}</h2>
              <button onClick={() => setEditing(null)} aria-label="Close" className="text-2xl leading-none text-ink-mute hover:text-ink">×</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["Tracking ID", "trackingId"],
                ["Sender name", "senderName"],
                ["Receiver name", "receiverName"],
                ["Receiver address", "receiverAddress"],
                ["Package type", "packageType"],
                ["Weight (lbs)", "weight"],
              ] as const).map(([label, key]) => (
                <label key={key} className="block text-[11px] font-semibold uppercase tracking-widest text-ink-mute">
                  {label}
                  <input
                    value={String(editing[key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [key]: key === "weight" ? Number(e.target.value) || undefined : e.target.value })}
                    className="notranslate mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
                  />
                </label>
              ))}
              {([
                ["Origin city", "origin"],
                ["Destination city", "destination"],
                ["Current location", "currentLocation"],
              ] as const).map(([label, key]) => (
                <label key={key} className="block text-[11px] font-semibold uppercase tracking-widest text-ink-mute">
                  {label}
                  <input
                    value={editing[key]?.city ?? ""}
                    onChange={(e) => geo(key, e.target.value)}
                    placeholder="City name (coordinates auto-resolve)"
                    className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
                  />
                </label>
              ))}
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-mute">
                Estimated delivery
                <input
                  type="date"
                  value={editing.estimatedDelivery ? String(editing.estimatedDelivery).slice(0, 10) : ""}
                  onChange={(e) => setEditing({ ...editing, estimatedDelivery: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-normal outline-none focus:border-ink"
                />
              </label>
            </div>

            {/* fees / invoice composer */}
            <div className="mt-6 rounded-2xl border border-line p-5">
              <h3 className="text-sm font-semibold">Fees and invoice items</h3>
              <ul className="mt-3 space-y-2">
                {(editing.invoices ?? []).map((inv, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{inv.description}</span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <span className="font-semibold">${(inv.amount || 0).toFixed(2)}</span>
                      <button
                        onClick={() => setEditing({ ...editing, invoices: editing.invoices!.map((x, xi) => xi === i ? { ...x, paid: !x.paid } : x) })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inv.paid ? "bg-green-100 text-green-700" : "bg-sage-tint text-sage-deep"}`}
                      >
                        {inv.paid ? "PAID" : "DUE"}
                      </button>
                      <button
                        onClick={() => setEditing({ ...editing, invoices: editing.invoices!.filter((_, xi) => xi !== i) })}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-2 sm:grid-cols-[100px_1fr_140px_auto]">
                <input value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} placeholder="Amount" inputMode="decimal" aria-label="Fee amount" className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
                <input value={fee.description} onChange={(e) => setFee({ ...fee, description: e.target.value })} placeholder="Reason for the fee" aria-label="Fee reason" className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
                <select value={fee.type} onChange={(e) => setFee({ ...fee, type: e.target.value })} aria-label="Fee type" className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink">
                  {FEE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={addFee} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sage">Add</button>
              </div>
              <p className="mt-3 text-xs text-ink-mute">
                Saved fees appear instantly on the customer&rsquo;s tracking page as a downloadable branded invoice.
              </p>
            </div>

            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-widest text-ink-mute">
              Hold reason (only when on hold)
              <input
                value={editing.holdReason ?? ""}
                onChange={(e) => setEditing({ ...editing, holdReason: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-full border border-line px-6 py-3 text-sm font-semibold hover:border-ink">Cancel</button>
              <button onClick={() => void save()} disabled={saving} className="rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white hover:bg-sage disabled:opacity-50">
                {saving ? "Saving…" : editing._id ? "Save changes" : "Create shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
