"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  LoaderCircle,
  Package,
  PackagePlus,
  Printer,
} from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import {
  Card,
  EmptyState,
  PageHeader,
  ProgressRail,
  RequestBadge,
  SERVICE_LABEL,
  ShipmentBadge,
  Skeleton,
  fmtDate,
  fmtDay,
  primaryBtn,
  secondaryBtn,
  timeAgo,
} from "@/components/account/ui";
import {
  cancelRequest,
  myRequests,
  myShipments,
  type MyShipment,
  type ShipmentRequest,
} from "@/lib/accountApi";
import { STATUS_LABEL } from "@/lib/api";
import { openTrackingReceipt } from "@/lib/trackingReceipt";

type Tab = "shipments" | "requests";

function ShipmentRow({ s, open, onToggle }: { s: MyShipment; open: boolean; onToggle: () => void }) {
  const events = [...(s.timeline ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return (
    <li id={`s-${s._id}`} className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ocean/60"
      >
        <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand sm:grid">
          <Package size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="notranslate font-semibold tracking-wide text-ink">{s.trackingId}</span>
            <ShipmentBadge status={s.status} />
          </span>
          <span className="mt-1 block truncate text-sm text-ink-soft">
            {s.origin?.city || "Origin"} → {s.destination?.city || "Destination"} · to {s.receiverName}
          </span>
        </span>
        <span className="hidden text-right text-xs text-ink-mute md:block">
          ETA
          <span className="block text-sm font-semibold text-ink">{fmtDay(s.estimatedDelivery)}</span>
        </span>
        <ChevronRight size={18} className={`shrink-0 text-ink-mute transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-line bg-ocean/40 px-5 pb-6 pt-5">
          <ProgressRail status={s.status} />
          {s.status === "on_hold" && s.holdReason && (
            <p className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <CircleAlert size={17} className="mt-px shrink-0" /> On hold — {s.holdReason}
            </p>
          )}

          <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Sender", s.senderName],
              ["Receiver", s.receiverName],
              ["Current location", s.currentLocation?.city || s.origin?.city || "—"],
              ["Estimated delivery", fmtDay(s.estimatedDelivery)],
              ["Package", s.packageType || "Parcel"],
              ["Weight", s.weight ? `${s.weight} lb` : "—"],
              ["Booking", s.request?.reference ?? "Added by our team"],
              ["Service", s.request ? SERVICE_LABEL[s.request.serviceLevel] : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute">{k}</dt>
                <dd className="mt-1 break-words font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute">Movement history</p>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No scans yet.</p>
            ) : (
              <ol className="relative mt-3 space-y-4 border-l-2 border-line pl-5">
                {events.map((e, i) => (
                  <li key={`${e.timestamp}-${i}`} className="relative">
                    <span
                      className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${i === 0 ? "bg-brand" : "bg-brand-soft"}`}
                    />
                    <p className="text-sm font-semibold text-ink">
                      {STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}
                      {e.location && <span className="font-normal text-ink-soft"> · {e.location}</span>}
                    </p>
                    {e.description && <p className="text-sm text-ink-soft">{e.description}</p>}
                    <p className="mt-0.5 text-xs text-ink-mute">{fmtDate(e.timestamp, true)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void openTrackingReceipt(s)} className={secondaryBtn}>
              <Printer size={16} /> Print receipt
            </button>
            <Link href={`/tracking?id=${encodeURIComponent(s.trackingId)}`} className={secondaryBtn}>
              <ExternalLink size={16} /> Public tracking page
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

function RequestRow({ r, open, onToggle, onCancelled }: { r: ShipmentRequest; open: boolean; onToggle: () => void; onCancelled: (r: ShipmentRequest) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = async () => {
    if (!window.confirm(`Cancel booking ${r.reference}? This can't be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      onCancelled(await cancelRequest(r.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <li id={`r-${r.id}`} className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ocean/60"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="notranslate font-semibold tracking-wide text-ink">{r.reference}</span>
            <RequestBadge status={r.status} />
          </span>
          <span className="mt-1 block truncate text-sm text-ink-soft">
            {r.originCity} → {r.destinationCity} · {r.packageType} · {SERVICE_LABEL[r.serviceLevel]} · {timeAgo(r.createdAt)}
          </span>
        </span>
        <ChevronRight size={18} className={`shrink-0 text-ink-mute transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-line bg-ocean/40 px-5 pb-6 pt-5">
          {r.status === "rejected" && r.reviewNote && (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="font-semibold">Not approved:</span> {r.reviewNote}
            </p>
          )}
          {r.status === "approved" && r.shipment && (
            <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Approved — tracking number{" "}
              <Link href={`/account/shipments?open=${r.shipment.id}`} className="notranslate font-semibold underline">
                {r.shipment.trackingId}
              </Link>
              {r.reviewNote && <span className="mt-1 block">{r.reviewNote}</span>}
            </p>
          )}
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {[
              ["From", `${r.senderName}${r.senderPhone ? ` · ${r.senderPhone}` : ""}\n${r.senderAddress}, ${r.originCity}`],
              ["To", `${r.receiverName}${r.receiverPhone ? ` · ${r.receiverPhone}` : ""}\n${r.receiverAddress}, ${r.destinationCity}`],
              ["Package", [r.packageType, r.weight ? `${r.weight} lb` : null, r.dimensions].filter(Boolean).join(" · ")],
              ["Declared value", r.declaredValue != null ? `$${r.declaredValue.toLocaleString()}` : "—"],
              ["Contents", r.contents ?? "—"],
              ["Preferred pickup", r.pickupDate ? fmtDay(r.pickupDate) : "As soon as possible"],
              ["Notes", r.notes ?? "—"],
              ["Submitted", fmtDate(r.createdAt, true)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute">{k}</dt>
                <dd className="mt-1 whitespace-pre-line break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {r.status === "pending" && (
            <div className="mt-6">
              <button type="button" onClick={() => void cancel()} disabled={busy} className={secondaryBtn}>
                {busy && <LoaderCircle size={16} className="animate-spin" />} Cancel booking
              </button>
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ShipmentsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, on } = useAccount();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "requests" || params.get("request") ? "requests" : "shipments");
  const [shipments, setShipments] = useState<MyShipment[]>([]);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(params.get("open") ?? params.get("request"));

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([myShipments(), myRequests()]);
      setShipments(s);
      setRequests(r);
    } catch {
      /* session errors are handled by the shell */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void load();
    const offs = ["request:update", "shipment:update"].map((ev) => on(ev, () => void load()));
    return () => offs.forEach((off) => off());
  }, [user, load, on]);

  /* A notification link opens the item it is about. */
  useEffect(() => {
    const open = params.get("open");
    const req = params.get("request");
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from the URL, an external source
      setTab("shipments");
      setOpenId(open);
    } else if (req) {
      setTab("requests");
      setOpenId(req);
    }
  }, [params]);

  useEffect(() => {
    if (!openId || loading) return;
    document.getElementById(`s-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    document.getElementById(`r-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, loading]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const select = (t: Tab) => {
    setTab(t);
    router.replace(t === "requests" ? "/account/shipments?tab=requests" : "/account/shipments", { scroll: false });
  };

  return (
    <div>
      <PageHeader eyebrow="Shipments" title="Your shipments">
        <Link href="/account/ship" className={primaryBtn}>
          <PackagePlus size={16} /> New shipment
        </Link>
      </PageHeader>

      <div role="tablist" className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {(
          [
            ["shipments", `Shipments${shipments.length ? ` (${shipments.length})` : ""}`],
            ["requests", `Requests${pendingCount ? ` · ${pendingCount} pending` : ""}`],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => select(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-brand-deep text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : tab === "shipments" ? (
          shipments.length === 0 ? (
            <EmptyState
              icon={<Package size={24} />}
              title="No shipments yet"
              body="When our team approves a booking, its shipment appears here with live progress and a printable receipt."
              action={
                <Link href="/account/ship" className={primaryBtn}>
                  Book your first shipment
                </Link>
              }
            />
          ) : (
            <ul>
              {shipments.map((s) => (
                <ShipmentRow key={s._id} s={s} open={openId === s._id} onToggle={() => setOpenId(openId === s._id ? null : s._id)} />
              ))}
            </ul>
          )
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="No booking requests"
            body="Bookings you submit are listed here while our team reviews them."
            action={
              <Link href="/account/ship" className={primaryBtn}>
                Start a booking
              </Link>
            }
          />
        ) : (
          <ul>
            {requests.map((r) => (
              <RequestRow
                key={r.id}
                r={r}
                open={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                onCancelled={(next) => setRequests((list) => list.map((x) => (x.id === next.id ? next : x)))}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ShipmentsInner />
    </Suspense>
  );
}
