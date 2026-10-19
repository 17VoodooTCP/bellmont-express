"use client";

/* The detail sections under the tracking map: who and what, the charges,
   and the shipment's history. */

import {
  ArrowRight,
  CircleCheck,
  CirclePause,
  Clock,
  Download,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  Receipt,
  Scale,
  Truck,
  Navigation,
} from "lucide-react";
import { STATUS_LABEL, holdMessage, type Shipment } from "@/lib/api";
import { openInvoice } from "@/lib/invoice";

const card = "rounded-3xl border border-line bg-white/70";
const kicker = "text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/* "1 lb", "12.5 lb": lb is a unit symbol, so it doesn't take an s. */
const weightOf = (w?: number) => (w ? `${Number(w.toFixed(2))} lb` : "—");

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* ── Who and what ─────────────────────────────────────────────────────── */

export function ShipmentParties({ shipment }: { shipment: Shipment }) {
  const latest = [...(shipment.timeline ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];
  const facts = [
    { icon: Package, label: "Package", value: shipment.packageType || "Parcel" },
    { icon: Scale, label: "Weight", value: weightOf(shipment.weight) },
    { icon: Navigation, label: "Current location", value: shipment.currentLocation?.city || "—" },
    {
      icon: Clock,
      label: "Last update",
      value: latest ? `${new Date(latest.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeOf(latest.timestamp)}` : "—",
    },
  ];

  return (
    <section className={card} aria-label="Shipment details">
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:p-8">
        <div className="min-w-0">
          <p className={kicker}>Sender</p>
          <p className="mt-2 truncate text-lg font-semibold text-ink">{shipment.senderName || "—"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-soft">
            <MapPin size={14} className="shrink-0 text-ink-mute" />
            {shipment.origin?.city || "—"}
          </p>
        </div>
        <div className="hidden items-center gap-2 text-ink-mute md:flex" aria-hidden="true">
          <span className="h-px w-10 bg-line" />
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white">
            <ArrowRight size={16} />
          </span>
          <span className="h-px w-10 bg-line" />
        </div>
        <div className="min-w-0 md:text-right">
          <p className={kicker}>Recipient</p>
          <p className="mt-2 truncate text-lg font-semibold text-ink">{shipment.receiverName || "—"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-soft md:justify-end">
            <MapPin size={14} className="shrink-0 text-ink-mute" />
            {shipment.destination?.city || "—"}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
        {facts.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className={`flex min-w-0 items-start gap-3 px-6 py-5 md:px-8 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            {/* Icons only where there's room; on phones the value gets the width. */}
            <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand sm:grid">
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <dt className={kicker}>{label}</dt>
              <dd className="mt-1 break-words font-semibold text-ink sm:truncate">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Charges ──────────────────────────────────────────────────────────── */

const FEE_LABEL: Record<string, string> = {
  shipping_fee: "Shipping fee",
  delay_fee: "Delay fee",
  customs_fee: "Customs fee",
  storage_fee: "Storage fee",
  other: "Service fee",
};

export function ShipmentCharges({ shipment }: { shipment: Shipment }) {
  const items = shipment.invoices ?? [];
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const due = items.filter((i) => !i.paid).reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <section className={card} aria-labelledby="charges-title">
      <div className="flex flex-wrap items-start justify-between gap-5 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-deep text-white">
            <Receipt size={19} />
          </span>
          <div>
            <h2 id="charges-title" className="text-lg font-semibold text-ink">Charges</h2>
            <p className="text-sm text-ink-mute">
              {items.length} item{items.length > 1 ? "s" : ""} on this shipment
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={kicker}>{due > 0 ? "Balance due" : "Status"}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${due > 0 ? "text-orange-ink" : "text-emerald-700"}`}>
            {due > 0 ? money(due) : "Paid in full"}
          </p>
        </div>
      </div>

      <table className="w-full border-t border-line text-sm">
        <thead className="sr-only">
          <tr>
            <th>Charge</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((inv, i) => (
            <tr key={inv._id ?? i}>
              <td className="py-4 pl-6 pr-3 md:pl-8">
                <p className="font-medium text-ink">{inv.description || "Service fee"}</p>
                <p className="mt-0.5 text-xs text-ink-mute">
                  {FEE_LABEL[inv.type ?? ""] ?? "Service fee"}
                  {inv.createdAt ? ` · ${new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums text-ink">{money(inv.amount || 0)}</td>
              <td className="py-4 pl-3 pr-6 text-right md:pr-8">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    inv.paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${inv.paid ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {inv.paid ? "Paid" : "Due"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-ocean/40 px-6 py-5 md:px-8">
        <p className="text-sm text-ink-soft">
          Total <span className="ml-2 text-lg font-bold tabular-nums text-ink">{money(total)}</span>
        </p>
        <button
          type="button"
          onClick={() => openInvoice(shipment)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand"
        >
          <Download size={16} /> Download invoice
        </button>
      </div>
    </section>
  );
}

/* ── History ──────────────────────────────────────────────────────────── */

const EVENT_ICON: Record<string, typeof Truck> = {
  pending: PackagePlus,
  picked_up: PackageCheck,
  in_transit: Truck,
  out_for_delivery: Navigation,
  delivered: CircleCheck,
  on_hold: CirclePause,
};

const EVENT_TONE: Record<string, string> = {
  delivered: "bg-emerald-600 text-white ring-emerald-100",
  on_hold: "bg-red-600 text-white ring-red-100",
};

export function ShipmentHistory({ shipment }: { shipment: Shipment }) {
  const events = [...(shipment.timeline ?? [])]
    .filter((e) => e?.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (!events.length) return null;

  /* Newest first, grouped by calendar day. */
  const days: { day: string; items: typeof events }[] = [];
  for (const e of events) {
    const day = dayOf(e.timestamp);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(e);
    else days.push({ day, items: [e] });
  }

  return (
    <section className={card} aria-labelledby="history-title">
      <div className="flex items-baseline justify-between gap-4 p-6 pb-2 md:p-8 md:pb-3">
        <h2 id="history-title" className="text-lg font-semibold text-ink">Shipment history</h2>
        <p className="text-sm text-ink-mute">
          {events.length} update{events.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="px-6 pb-6 md:px-8 md:pb-8">
        {days.map(({ day, items }, di) => (
          <div key={day} className={di ? "mt-6" : "mt-2"}>
            <p className={`${kicker} mb-3`}>{day}</p>
            <ol>
              {items.map((e, i) => {
                const latest = di === 0 && i === 0;
                const Icon = EVENT_ICON[e.status] ?? Truck;
                const label = STATUS_LABEL[e.status as Shipment["status"]] ?? e.status.replaceAll("_", " ");
                /* "On hold: reason" under an "On hold" heading reads twice;
                   show just the reason. */
                const stripped = (e.description ?? "")
                  .replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:—-]\\s*`, "i"), "")
                  .trim();
                /* Holds keep their reason, minus old console-only wording. */
                const detail = e.status === "on_hold" ? holdMessage(stripped) : stripped;
                const lastInDay = i === items.length - 1;
                const lastOverall = lastInDay && di === days.length - 1;
                return (
                  <li key={`${e.timestamp}-${i}`} className="grid grid-cols-[4.5rem_2.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[5.5rem_2.5rem_minmax(0,1fr)]">
                    <time dateTime={e.timestamp} className={`pt-2 text-right text-sm tabular-nums ${latest ? "font-semibold text-ink" : "text-ink-mute"}`}>
                      {timeOf(e.timestamp)}
                    </time>
                    <div className="relative flex justify-center">
                      {!lastOverall && <span className="absolute top-10 bottom-0 w-px bg-line" aria-hidden="true" />}
                      <span
                        className={`relative z-[1] grid h-9 w-9 place-items-center rounded-full ring-4 ${
                          latest
                            ? EVENT_TONE[e.status] ?? "bg-brand-deep text-white ring-brand-tint"
                            : "bg-white text-ink-mute ring-transparent border border-line"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                    </div>
                    <div className={`min-w-0 ${lastOverall ? "" : "pb-6"}`}>
                      <p className="flex flex-wrap items-center gap-2 pt-1.5">
                        <span className={`font-semibold ${latest ? "text-ink" : "text-ink-soft"}`}>{label}</span>
                        {latest && (
                          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep">
                            Latest
                          </span>
                        )}
                      </p>
                      {detail && detail.toLowerCase() !== label.toLowerCase() && (
                        <p className="mt-0.5 text-sm text-ink-soft">{detail}</p>
                      )}
                      {e.location && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-mute">
                          <MapPin size={12} className="shrink-0" />
                          {e.location}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
