"use client";

import { useEffect, useMemo, useState } from "react";
import {
  trackShipment,
  Shipment,
  STATUS_PROGRESS,
  STATUS_LABEL,
} from "@/lib/api";
import { useApiWarmth, warmOnIntent } from "@/components/ApiWarmth";
import { warmApi } from "@/lib/wake";
import RouteMap from "./RouteMap";
import { openInvoice } from "@/lib/invoice";

/* ── Milestone rail ── */
const MILESTONES: { key: Shipment["status"]; label: string }[] = [
  { key: "pending", label: "Created" },
  { key: "picked_up", label: "Picked up" },
  { key: "in_transit", label: "In transit" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function MilestoneRail({ status }: { status: Shipment["status"] }) {
  const reached = STATUS_PROGRESS[status];
  return (
    <ol className="flex items-center" aria-label="Shipment milestones">
      {MILESTONES.map((m, i) => {
        const done = STATUS_PROGRESS[m.key] <= reached;
        const active = m.key === status;
        return (
          <li key={m.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                  done ? "border-brand bg-brand" : "border-line bg-white"
                } ${active ? "ring-4 ring-brand/20" : ""}`}
              />
              <span className={`w-14 text-center text-[10px] font-medium leading-tight sm:w-auto sm:whitespace-nowrap sm:text-[11px] ${done ? "text-ink" : "text-ink-mute"}`}>
                {m.label}
              </span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`mx-1 mb-7 h-0.5 flex-1 rounded sm:mx-2 sm:mb-5 ${STATUS_PROGRESS[MILESTONES[i + 1].key] <= reached ? "bg-brand" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Page experience ── */
export default function TrackingExperience() {
  const [id, setId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const warmth = useApiWarmth();

  const lookup = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    setShipment(null);
    try {
      setShipment(await trackShipment(value.trim().toUpperCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookup(id);
  };

  /* /tracking?id=CP123456785US (the chat assistant links here) opens with the
     shipment already looked up. Read from location rather than
     useSearchParams so the page can stay statically prerendered. */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("id");
    if (fromUrl) {
      /* One-time sync from the URL, an external source only readable after
         mount — reading it during render would break static prerendering. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setId(fromUrl.toUpperCase());
      void lookup(fromUrl);
    }
  }, []);

  const eta = useMemo(() => {
    if (!shipment?.estimatedDelivery) return null;
    // stored as UTC midnight; format in UTC so the day never shifts back
    return new Date(shipment.estimatedDelivery).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [shipment]);

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Shipment tracking</p>
      <h1 className="mt-4 text-4xl font-bold md:text-6xl">Where is my cargo?</h1>

      {/* min-w-0 lets the input shrink below its intrinsic ~20-character
          width; without it the input pushed the Track button past the pill's
          edge on phones, where overflow-hidden clipped it or hid it outright.
          The example lives below the field, where it is never truncated. */}
      <form onSubmit={submit} className="mt-10 flex max-w-xl overflow-hidden rounded-full border border-line focus-within:border-ink">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          onFocus={() => void warmApi()}
          placeholder="Enter tracking number"
          aria-label="Tracking number"
          aria-describedby="tracking-example"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="notranslate min-w-0 flex-1 bg-transparent py-4 pl-5 pr-2 text-base outline-none placeholder:text-ink-mute sm:pl-6 sm:text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          {...warmOnIntent}
          className="m-1.5 shrink-0 rounded-full bg-iris px-5 text-sm font-semibold text-white transition-colors hover:bg-iris-deep disabled:opacity-50 sm:px-7"
        >
          {loading ? "Locating…" : "Track"}
        </button>
      </form>
      <p id="tracking-example" className="mt-3 max-w-xl pl-5 text-xs text-ink-mute sm:pl-6">
        Example: <span className="notranslate font-semibold tracking-wide text-ink-soft">CP123456785US</span>
      </p>

      {/* The free instance sleeps after 15 minutes idle. If it is still booting
          when someone searches, say so with a running count rather than leaving
          a spinner that looks broken. */}
      {loading && warmth.status === "waking" && (
        <p className="mt-6 max-w-xl rounded-xl bg-brand-tint px-5 py-4 text-sm text-brand-deep" role="status">
          Waking the tracking service — it sleeps when idle on our current plan.
          {warmth.elapsed > 2 && ` ${warmth.elapsed}s so far;`} usually ready
          within a minute.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 max-w-xl rounded-xl bg-brand-tint px-5 py-4 text-sm text-brand-deep">
          {error}
        </p>
      )}

      {shipment && (
        <div className="mt-14 space-y-6">
          {/* status hero */}
          <div className="rounded-3xl border border-line p-7 md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="notranslate text-xs font-semibold uppercase tracking-widest text-ink-mute">
                  {shipment.trackingId}
                </p>
                <p className="mt-1.5 text-3xl font-bold">{STATUS_LABEL[shipment.status]}</p>
                {eta && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Estimated delivery <span className="font-semibold text-ink">{eta}</span>
                  </p>
                )}
              </div>
              {shipment.status === "on_hold" && shipment.holdReason && (
                <p className="max-w-xs rounded-xl bg-brand-tint px-4 py-3 text-xs leading-relaxed text-brand-deep">
                  On hold: {shipment.holdReason}
                </p>
              )}
            </div>
            <div className="mt-9">
              <MilestoneRail status={shipment.status} />
            </div>
          </div>

          {/* Live route: NASA imagery, great-circle route, position beacon
              and the journey summary underneath. */}
          <RouteMap shipment={shipment} />

          {/* facts */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "From", value: shipment.senderName, sub: shipment.origin.city },
              { label: "To", value: shipment.receiverName, sub: shipment.destination.city },
              { label: "Weight", value: shipment.weight ? `${shipment.weight} lbs` : "N/A", sub: shipment.packageType || "" },
              { label: "Current location", value: shipment.currentLocation?.city || "N/A", sub: "" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-line p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-mute">{f.label}</p>
                <p className="mt-2 truncate font-semibold">{f.value}</p>
                {f.sub && <p className="mt-0.5 truncate text-sm text-ink-mute">{f.sub}</p>}
              </div>
            ))}
          </div>

          {/* invoices */}
          {shipment.invoices && shipment.invoices.length > 0 && (
            <div className="rounded-3xl border border-line p-7 md:p-9">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Invoices</h2>
                  <p className="mt-1 text-sm text-ink-mute">
                    {shipment.invoices.length} item{shipment.invoices.length > 1 ? "s" : ""} · Total $
                    {shipment.invoices.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => openInvoice(shipment)}
                  className="rounded-full bg-iris px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-iris-deep"
                >
                  View and download invoice
                </button>
              </div>
              <ul className="mt-6 divide-y divide-line">
                {shipment.invoices.map((inv, i) => (
                  <li key={inv._id ?? i} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                    <span className="min-w-0 truncate">{inv.description || "Service fee"}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold">${(inv.amount || 0).toFixed(2)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${inv.paid ? "bg-green-100 text-green-700" : "bg-brand-tint text-brand-deep"}`}>
                        {inv.paid ? "PAID" : "DUE"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* journey log */}
          {shipment.timeline && shipment.timeline.length > 0 && (
            <div className="rounded-3xl border border-line p-7 md:p-9">
              <h2 className="text-lg font-semibold">Journey log</h2>
              <ol className="mt-6 space-y-0">
                {[...shipment.timeline].reverse().map((ev, i, all) => (
                  <li key={i} className="relative flex gap-5 pb-7 last:pb-0">
                    {i < all.length - 1 && (
                      <span className="absolute left-[7px] top-5 h-full w-0.5 bg-line" aria-hidden="true" />
                    )}
                    <span className={`relative mt-1.5 h-4 w-4 shrink-0 rounded-full ${i === 0 ? "bg-brand" : "border-2 border-line bg-white"}`} />
                    <div className="min-w-0">
                      <p className="font-medium">{ev.description}</p>
                      <p className="mt-0.5 text-sm text-ink-mute">
                        {ev.location} · {new Date(ev.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
