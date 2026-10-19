"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  CircleX,
  ClipboardList,
  LoaderCircle,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import {
  approveRequest,
  getToken,
  listRequests,
  rejectRequest,
  sendDocument,
  type RequestStatus,
  type ShipmentRequest,
} from "@/lib/adminApi";
import { ADMIN_LIVE_EVENT } from "@/components/admin/AdminNotifier";
import { REQUEST_STATUS, RequestBadge, SERVICE_LABEL, fmtDate, fmtDay, timeAgo } from "@/components/account/ui";

type Filter = RequestStatus | "all";
const FILTERS: Filter[] = ["pending", "approved", "rejected", "cancelled", "all"];

const field =
  "mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-ink";

function Detail({ r, onChanged }: { r: ShipmentRequest; onChanged: (next: ShipmentRequest) => void }) {
  const router = useRouter();
  const [eta, setEta] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [busy, setBusy] = useState<"" | "approve" | "reject" | "send">("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  /* Customer-typed cities the map couldn't place, reported on approval. */
  const [unplaced, setUnplaced] = useState<string[]>([]);

  const run = async (kind: "approve" | "reject" | "send", fn: () => Promise<void>) => {
    setBusy(kind);
    setError("");
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      if (/Sign in/.test(msg)) router.replace("/admin/login");
    } finally {
      setBusy("");
    }
  };

  const approve = () =>
    run("approve", async () => {
      const res = await approveRequest(r.id, { estimatedDelivery: eta || undefined, note: note.trim() || undefined });
      setUnplaced(res.unlocated ?? []);
      onChanged(res.request);
    });

  const reject = () =>
    run("reject", async () => {
      if (!reason.trim()) throw new Error("Give the customer a reason — they will see it.");
      onChanged((await rejectRequest(r.id, reason.trim())).request);
    });

  const sendReceipt = () => {
    if (sent && !window.confirm("A receipt was already sent. Send another copy to the customer?")) return;
    return run("send", async () => {
      if (!r.shipment) return;
      const res = await sendDocument({ shipmentId: r.shipment.id, message: `Your receipt for booking ${r.reference}.` });
      setSent(`Receipt sent to ${res.recipient.email}.`);
    });
  };

  const rows: [string, string][] = [
    ["From", `${r.senderName}${r.senderPhone ? ` · ${r.senderPhone}` : ""}\n${r.senderAddress}\n${r.originCity}`],
    ["To", `${r.receiverName}${r.receiverPhone ? ` · ${r.receiverPhone}` : ""}\n${r.receiverAddress}\n${r.destinationCity}`],
    ["Package", [r.packageType, r.weight ? `${r.weight} lb` : null, r.dimensions].filter(Boolean).join(" · ")],
    ["Declared value", r.declaredValue != null ? `$${r.declaredValue.toLocaleString()}` : "—"],
    ["Contents", r.contents ?? "—"],
    ["Service", SERVICE_LABEL[r.serviceLevel]],
    ["Preferred pickup", r.pickupDate ? fmtDay(r.pickupDate) : "As soon as possible"],
    ["Customer notes", r.notes ?? "—"],
  ];

  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div>
          <p className="notranslate text-xl font-bold tracking-wide">{r.reference}</p>
          <p className="mt-1 text-xs text-ink-mute">Submitted {fmtDate(r.createdAt, true)}</p>
        </div>
        <RequestBadge status={r.status} />
      </div>

      <div className="border-b border-line bg-ocean/50 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Customer</p>
        <p className="mt-1.5 font-semibold">{r.customer.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
          <a href={`mailto:${r.customer.email}`} className="notranslate flex items-center gap-1.5 hover:text-ink">
            <Mail size={14} /> {r.customer.email}
          </a>
          {r.customer.phone && (
            <a href={`tel:${r.customer.phone}`} className="flex items-center gap-1.5 hover:text-ink">
              <Phone size={14} /> {r.customer.phone}
            </a>
          )}
          {r.customer.company && (
            <span className="flex items-center gap-1.5">
              <Building2 size={14} /> {r.customer.company}
            </span>
          )}
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute">{k}</dt>
            <dd className="mt-1 whitespace-pre-line break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line px-6 py-5">
        {r.status === "pending" && mode === "idle" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-mute">
                Estimated delivery
                <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} className={field} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-mute">
                Note to customer <span className="normal-case tracking-normal">(optional)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder="e.g. Pickup booked for Monday morning."
                  className={`${field} normal-case tracking-normal`}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void approve()}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-50"
              >
                {busy === "approve" ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
                Approve &amp; issue tracking number
              </button>
              <button
                type="button"
                onClick={() => setMode("reject")}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink"
              >
                <CircleX size={16} /> Reject
              </button>
            </div>
            <p className="text-xs text-ink-mute">
              Approval creates the live shipment, locates both cities on the map and notifies the customer instantly.
            </p>
          </div>
        )}

        {r.status === "pending" && mode === "reject" && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-mute">
              Reason (the customer sees this)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                autoFocus
                placeholder="e.g. We don't currently serve this destination."
                className={`${field} normal-case tracking-normal`}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void reject()}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busy === "reject" && <LoaderCircle size={16} className="animate-spin" />} Reject booking
              </button>
              <button type="button" onClick={() => setMode("idle")} className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-mute hover:text-ink">
                Back
              </button>
            </div>
          </div>
        )}

        {r.status === "approved" && r.shipment && (
          <div className="space-y-4">
            <p className="text-sm">
              Approved{r.reviewedAt ? ` ${timeAgo(r.reviewedAt)}` : ""} — tracking number{" "}
              <span className="notranslate font-bold tracking-wide">{r.shipment.trackingId}</span>
            </p>
            {r.reviewNote && <p className="rounded-xl bg-ocean px-4 py-3 text-sm text-ink-soft">Note sent: {r.reviewNote}</p>}
            {unplaced.length > 0 && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Check the spelling: we couldn&rsquo;t place these on the map.</p>
                <ul className="mt-1 list-disc pl-5">
                  {unplaced.map((u) => (
                    <li key={u} className="notranslate">{u}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs">
                  The customer&rsquo;s tracking map will be incomplete until it&rsquo;s fixed. Open <b>Manage shipment</b>, edit it and correct the city.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void sendReceipt()}
                disabled={!!busy}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                  sent ? "border border-line hover:border-ink" : "bg-ink text-white hover:bg-brand"
                }`}
              >
                {busy === "send" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                {sent ? "Send again" : "Send receipt to customer"}
              </button>
              <Link href="/admin" className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">
                Manage shipment
              </Link>
            </div>
            {sent && (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CircleCheck size={16} /> {sent}
              </p>
            )}
          </div>
        )}

        {r.status === "rejected" && <p className="text-sm text-ink-soft">Rejected{r.reviewedAt ? ` ${timeAgo(r.reviewedAt)}` : ""}: {r.reviewNote}</p>}
        {r.status === "cancelled" && <p className="text-sm text-ink-soft">The customer cancelled this booking.</p>}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function RequestsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>("pending");
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [counts, setCounts] = useState<Partial<Record<RequestStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(params.get("open"));
  /* The request being worked on stays in the panel even after a live refresh
     drops it from the current filter — otherwise approving would make it
     vanish, taking "Send receipt" with it. */
  const [pinned, setPinned] = useState<ShipmentRequest | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await listRequests(filter);
      setRequests(res.requests);
      setCounts(res.counts);
      setError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load requests.";
      setError(msg);
      if (/Sign in/.test(msg)) router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void load();
  }, [load, router]);

  /* Live: refresh the list as requests arrive or change elsewhere. */
  useEffect(() => {
    const onLive = (e: Event) => {
      const { event } = (e as CustomEvent<{ event: string }>).detail;
      if (event === "request:new" || event === "request:update") void load();
    };
    window.addEventListener(ADMIN_LIVE_EVENT, onLive);
    return () => window.removeEventListener(ADMIN_LIVE_EVENT, onLive);
  }, [load]);

  /* A notification link (?open=…) shows that request whatever its status. */
  useEffect(() => {
    const open = params.get("open");
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from the URL, an external source
      setSelected(open);
      setFilter("all");
    }
  }, [params]);

  const current = useMemo(
    () => requests.find((r) => r.id === selected) ?? (pinned?.id === selected ? pinned : null),
    [requests, selected, pinned],
  );
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pr-14">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
            <ArrowLeft size={14} /> Operations console
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Shipment requests</h1>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f === "all" ? total : counts[f] ?? 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setLoading(true);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f ? "border-ink bg-ink text-white" : "border-line hover:border-ink"
              }`}
            >
              {f === "all" ? "All" : REQUEST_STATUS[f].label}
              <span className={`ml-2 rounded-full px-1.5 text-xs ${filter === f ? "bg-white/20" : "bg-ocean"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white lg:max-h-[75vh] lg:overflow-y-auto">
          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-ink-mute">Loading… the free service may take a minute to wake.</p>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <ClipboardList className="text-ink-mute" />
              <p className="mt-3 font-semibold">Nothing here</p>
              <p className="mt-1 text-sm text-ink-mute">
                {filter === "pending" ? "New bookings appear here the moment customers submit them." : "No requests with this status."}
              </p>
            </div>
          ) : (
            <ul>
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r.id);
                      setPinned(r);
                    }}
                    aria-current={selected === r.id}
                    className={`w-full border-b border-line px-5 py-4 text-left transition-colors last:border-0 ${
                      selected === r.id ? "bg-brand-tint/60" : "hover:bg-ocean"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="notranslate font-semibold tracking-wide">{r.reference}</span>
                      <span className="text-xs text-ink-mute">{timeAgo(r.createdAt)}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink-soft">
                      {r.customer.name} · {r.originCity} → {r.destinationCity}
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <RequestBadge status={r.status} />
                      {r.serviceLevel !== "standard" && (
                        <span className="rounded-full bg-orange-tint px-2 py-0.5 text-[11px] font-semibold text-orange-ink">
                          {SERVICE_LABEL[r.serviceLevel]}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {current ? (
            /* Keyed by id: choosing another request starts the form fresh. */
            <Detail
              key={current.id}
              r={current}
              onChanged={(next) => {
                setPinned(next);
                setRequests((list) => list.map((x) => (x.id === next.id ? next : x)));
              }}
            />
          ) : (
            <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-mute">
              Select a request to review it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={null}>
      <RequestsInner />
    </Suspense>
  );
}
