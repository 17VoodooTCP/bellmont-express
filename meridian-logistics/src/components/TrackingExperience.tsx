"use client";

import { useMemo, useState } from "react";
import {
  trackShipment,
  Shipment,
  STATUS_PROGRESS,
  STATUS_LABEL,
} from "@/lib/api";
import RouteMap from "./RouteMap";
import { openInvoice } from "@/lib/invoice";

/* ── Animated route: origin → destination arc with a vessel in motion ── */
function RouteVisual({ shipment }: { shipment: Shipment }) {
  const progress = STATUS_PROGRESS[shipment.status] ?? 0.5;

  // The admin/API status is the source of truth. Each status owns one fixed
  // checkpoint, so the vessel cannot appear ahead of the status being shown.
  const visualProgress = shipment.status === "delivered" ? 1 : progress;

  // Quadratic arc across the panel; vehicle sits at `progress` along it
  const P0 = { x: 70, y: 250 };
  const P1 = { x: 400, y: 60 };
  const P2 = { x: 730, y: 250 };
  const at = (t: number) => ({
    x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x,
    y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y,
  });
  const pos = at(visualProgress);
  const ahead = at(Math.min(visualProgress + 0.02, 1));
  const angle = (Math.atan2(ahead.y - pos.y, ahead.x - pos.x) * 180) / Math.PI;
  const arc = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

  return (
    <svg viewBox="0 0 800 320" className="w-full" role="img" aria-label={`Route from ${shipment.origin.city} to ${shipment.destination.city}, currently ${STATUS_LABEL[shipment.status]}`}>
      {/* graticule backdrop */}
      {[60, 130, 200, 270].map((y) => (
        <path key={y} d={`M 30 ${y} Q 400 ${y - 34} 770 ${y}`} fill="none" stroke="#f0f2f5" strokeWidth="1.5" />
      ))}
      {[140, 280, 420, 560, 700].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="290" stroke="#f0f2f5" strokeWidth="1.5" />
      ))}

      {/* full route (dashed, idle) */}
      <path d={arc} fill="none" stroke="#e2e6ea" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />

      {/* traveled route (animated draw) */}
      <path
        d={arc}
        fill="none"
        stroke="var(--sage)"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${visualProgress} 1`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />

      {/* origin */}
      <circle cx={P0.x} cy={P0.y} r="8" fill="#0a0a0a" />
      <text x={P0.x} y={P0.y + 30} textAnchor="middle" fontSize="13" fontWeight="600" fill="#3d3d3d">
        {shipment.origin.city}
      </text>

      {/* destination */}
      <circle cx={P2.x} cy={P2.y} r="8" fill="none" stroke="var(--sage)" strokeWidth="3" />
      {shipment.status === "delivered" && <circle cx={P2.x} cy={P2.y} r="4" fill="var(--sage)" />}
      <text x={P2.x} y={P2.y + 30} textAnchor="middle" fontSize="13" fontWeight="600" fill="#3d3d3d">
        {shipment.destination.city}
      </text>

      {/* moving cargo vessel */}
      <g transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}>
        <circle r="22" fill="var(--sage)" opacity="0.11">
          <animate attributeName="r" values="17;27;17" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <g transform="translate(-24 -14)">
          <path d="M3 19h42l-7 8H10l-7-8Z" fill="#14170f" />
          <path d="M7 19h34l-4 5H11l-4-5Z" fill="var(--sage)" />
          <rect x="12" y="10" width="7" height="9" rx="1" fill="#14170f" />
          <rect x="20" y="8" width="7" height="11" rx="1" fill="var(--sage)" />
          <rect x="28" y="10" width="7" height="9" rx="1" fill="#14170f" />
          <path d="M36 5h6v14h-6z" fill="#14170f" />
          <path d="M39 2v4M36.5 4h5" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 30h27" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" opacity=".75" />
        </g>
      </g>

      {/* current-location caption under the vessel */}
      <rect x={pos.x - 66} y={pos.y - 48} width="132" height="22" rx="11" fill="#fbfbf8" stroke="#e3e8df" />
      <text x={pos.x} y={pos.y - 33} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--sage)">
        {shipment.currentLocation?.city || STATUS_LABEL[shipment.status]}
      </text>
    </svg>
  );
}

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
                  done ? "border-sage bg-sage" : "border-line bg-white"
                } ${active ? "ring-4 ring-sage/20" : ""}`}
              />
              <span className={`w-14 text-center text-[10px] font-medium leading-tight sm:w-auto sm:whitespace-nowrap sm:text-[11px] ${done ? "text-ink" : "text-ink-mute"}`}>
                {m.label}
              </span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`mx-1 mb-7 h-0.5 flex-1 rounded sm:mx-2 sm:mb-5 ${STATUS_PROGRESS[MILESTONES[i + 1].key] <= reached ? "bg-sage" : "bg-line"}`} />
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    setShipment(null);
    try {
      setShipment(await trackShipment(id.trim().toUpperCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">Live tracking</p>
      <h1 className="mt-4 text-4xl font-bold md:text-6xl">Where is my cargo?</h1>

      <form onSubmit={submit} className="mt-10 flex max-w-xl overflow-hidden rounded-full border border-line focus-within:border-ink">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Tracking number, e.g. CP123456785US"
          aria-label="Tracking number"
          className="notranslate flex-1 bg-transparent px-6 py-4 text-sm outline-none placeholder:text-ink-mute"
        />
        <button
          type="submit"
          disabled={loading}
          className="m-1.5 rounded-full bg-ink px-7 text-sm font-semibold text-white transition-colors hover:bg-sage disabled:opacity-50"
        >
          {loading ? "Locating…" : "Track"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 max-w-xl rounded-xl bg-sage-tint px-5 py-4 text-sm text-sage-deep">
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
                <p className="max-w-xs rounded-xl bg-sage-tint px-4 py-3 text-xs leading-relaxed text-sage-deep">
                  On hold: {shipment.holdReason}
                </p>
              )}
            </div>
            <div className="mt-9">
              <MilestoneRail status={shipment.status} />
            </div>
          </div>

          {/* live map: authentic geography */}
          <div className="rounded-3xl border border-line p-3 md:p-4">
            <RouteMap shipment={shipment} />
          </div>

          {/* animated route summary */}
          <div className="rounded-3xl border border-line p-4 md:p-6">
            <RouteVisual shipment={shipment} />
          </div>

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
                  className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sage"
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
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${inv.paid ? "bg-green-100 text-green-700" : "bg-sage-tint text-sage-deep"}`}>
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
                    <span className={`relative mt-1.5 h-4 w-4 shrink-0 rounded-full ${i === 0 ? "bg-sage" : "border-2 border-line bg-white"}`} />
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
