"use client";

import { useEffect, useMemo, useState } from "react";
import {
  trackShipment,
  Shipment,
  STATUS_PROGRESS,
  STATUS_LABEL,
  holdMessage,
} from "@/lib/api";
import { useApiWarmth, warmOnIntent } from "@/components/ApiWarmth";
import { warmApi } from "@/lib/wake";
import RouteMap from "./RouteMap";
import { ShipmentCharges, ShipmentHistory, ShipmentParties } from "./ShipmentDetails";

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
              {shipment.status === "on_hold" && (
                <p className="max-w-xs rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
                  {holdMessage(shipment.holdReason)}
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

          <ShipmentParties shipment={shipment} />
          <ShipmentCharges shipment={shipment} />
          <ShipmentHistory shipment={shipment} />
        </div>
      )}
    </div>
  );
}
