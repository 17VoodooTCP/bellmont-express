import type { ReactNode } from "react";
import type { Shipment } from "@/lib/api";
import type { RequestStatus, ServiceLevel } from "@/lib/accountApi";

/* Shared pieces for the customer portal, so every page speaks the same
   visual language. */

type Tone = { bg: string; fg: string; dot: string };

const TONES = {
  neutral: { bg: "bg-slate-100", fg: "text-slate-700", dot: "bg-slate-400" },
  blue: { bg: "bg-brand-tint", fg: "text-brand-deep", dot: "bg-brand" },
  amber: { bg: "bg-amber-50", fg: "text-amber-800", dot: "bg-amber-500" },
  green: { bg: "bg-emerald-50", fg: "text-emerald-800", dot: "bg-emerald-500" },
  red: { bg: "bg-red-50", fg: "text-red-800", dot: "bg-red-500" },
} satisfies Record<string, Tone>;

export const SHIPMENT_STATUS: Record<Shipment["status"], { label: string; tone: Tone; step: number }> = {
  pending: { label: "Awaiting pickup", tone: TONES.neutral, step: 0 },
  picked_up: { label: "Picked up", tone: TONES.blue, step: 1 },
  in_transit: { label: "In transit", tone: TONES.blue, step: 2 },
  out_for_delivery: { label: "Out for delivery", tone: TONES.amber, step: 3 },
  delivered: { label: "Delivered", tone: TONES.green, step: 4 },
  on_hold: { label: "On hold", tone: TONES.red, step: 2 },
};

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting review", tone: TONES.amber },
  approved: { label: "Approved", tone: TONES.green },
  rejected: { label: "Not approved", tone: TONES.red },
  cancelled: { label: "Cancelled", tone: TONES.neutral },
};

export const SERVICE_LABEL: Record<ServiceLevel, string> = {
  standard: "Standard",
  express: "Express",
  priority: "Priority",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.fg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {children}
    </span>
  );
}

export const ShipmentBadge = ({ status }: { status: Shipment["status"] }) => (
  <Badge tone={SHIPMENT_STATUS[status]?.tone ?? TONES.neutral}>{SHIPMENT_STATUS[status]?.label ?? status}</Badge>
);

export const RequestBadge = ({ status }: { status: RequestStatus }) => (
  <Badge tone={REQUEST_STATUS[status].tone}>{REQUEST_STATUS[status].label}</Badge>
);

const STEPS = ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"];

/** Five-step progress rail. Holds show on the step they happened at, in red. */
export function ProgressRail({ status }: { status: Shipment["status"] }) {
  const current = SHIPMENT_STATUS[status]?.step ?? 0;
  const held = status === "on_hold";
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label={`Progress: ${SHIPMENT_STATUS[status]?.label ?? status}`}>
      {STEPS.map((s, i) => {
        const done = i < current || (i === current && !held && status !== "pending") || status === "delivered";
        const here = i === current;
        return (
          <li key={s} className="min-w-0">
            <span
              className={`block h-1.5 rounded-full ${
                held && here ? "bg-red-500" : done ? "bg-brand" : here ? "bg-brand/40" : "bg-line"
              }`}
            />
            <span
              className={`mt-1.5 block truncate text-[11px] ${here ? (held ? "font-semibold text-red-700" : "font-semibold text-ink") : "text-ink-mute"}`}
            >
              {held && here ? "On hold" : s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function fmtDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** Delivery dates are stored as UTC midnight; formatting in UTC stops them
 *  shifting back a day for anyone west of Greenwich. */
export function fmtDay(value?: string | null) {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "To be confirmed";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function timeAgo(value: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(value);
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{eyebrow}</p>}
        <h1 className="mt-1.5 text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(25,35,58,.04)] ${className}`}>{children}</div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-tint text-brand">{icon}</span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-ocean ${className}`} />;
}

export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-deep px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,41,80,.18)] transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-mute disabled:opacity-60";
export const inputCls =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-brand focus:ring-4 focus:ring-brand/10 sm:text-sm";
export const labelCls = "block text-[13px] font-semibold text-ink";
