"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  Clock,
  FileText,
  Navigation,
  Package,
  PackagePlus,
  Sparkles,
  Truck,
} from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import {
  Card,
  EmptyState,
  ProgressRail,
  RequestBadge,
  ShipmentBadge,
  Skeleton,
  fmtDay,
  primaryBtn,
  secondaryBtn,
  timeAgo,
} from "@/components/account/ui";
import {
  myDocuments,
  myRequests,
  myShipments,
  type MyShipment,
  type ShipmentRequest,
} from "@/lib/accountApi";

function Welcome() {
  const params = useSearchParams();
  if (params.get("welcome") !== "1") return null;
  const steps = [
    { icon: PackagePlus, title: "Book a shipment", body: "Tell us the route and the package." },
    { icon: CircleCheck, title: "We review it", body: "You get a tracking number once approved." },
    { icon: Truck, title: "Follow it live", body: "Every milestone lands here instantly." },
  ];
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="bg-brand-deep px-6 py-6 text-white sm:px-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
          <Sparkles size={14} /> Account created
        </p>
        <p className="mt-2 text-xl font-bold">Welcome to Bellmont Express. Here&rsquo;s how it works.</p>
      </div>
      <ol className="grid gap-px bg-line sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex gap-3 bg-white px-6 py-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand">
              <Icon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {i + 1}. {title}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Stat({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">{label}</p>
        <span className="text-brand">{icon}</span>
      </div>
      {loading ? <Skeleton className="mt-3 h-9 w-14" /> : <p className="mt-2 text-[34px] font-bold leading-none text-ink">{value}</p>}
    </Card>
  );
}

export default function AccountOverview() {
  const router = useRouter();
  const { user, on } = useAccount();
  const [shipments, setShipments] = useState<MyShipment[]>([]);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [unreadDocs, setUnreadDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, r, d] = await Promise.all([myShipments(), myRequests(), myDocuments()]);
      setShipments(s);
      setRequests(r);
      setUnreadDocs(d.unread);
    } catch {
      /* the shell shows session errors; an empty dashboard is fine meanwhile */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the request resolves
    void load();
    const offs = ["request:update", "shipment:update", "document:new", "document:removed"].map((ev) => on(ev, () => void load()));
    return () => offs.forEach((off) => off());
  }, [user, load, on]);

  const active = shipments.filter((s) => s.status !== "delivered");
  const pending = requests.filter((r) => r.status === "pending");
  const delivered = shipments.filter((s) => s.status === "delivered");
  const firstName = user?.name.split(/\s+/)[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-7">
        <p className="text-sm text-ink-soft">{greeting}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-[28px]">Your shipping at a glance</h1>
      </div>

      <Suspense fallback={null}>
        <Welcome />
      </Suspense>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Active" value={active.length} icon={<Truck size={18} />} loading={loading} />
        <Stat label="Awaiting review" value={pending.length} icon={<Clock size={18} />} loading={loading} />
        <Stat label="Delivered" value={delivered.length} icon={<CircleCheck size={18} />} loading={loading} />
        <Stat label="Unread documents" value={unreadDocs} icon={<FileText size={18} />} loading={loading} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden p-6">
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand-tint" />
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-deep text-white">
              <PackagePlus size={20} />
            </span>
            <p className="mt-4 text-lg font-bold text-ink">Book a shipment</p>
            <p className="mt-1 text-sm text-ink-soft">Ocean, air, road or rail. We confirm and issue a tracking number.</p>
            <Link href="/account/ship" className={`${primaryBtn} mt-5`}>
              Start a booking <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
        <Card className="p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-tint text-brand">
            <Navigation size={20} />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">Track any parcel</p>
          <p className="mt-1 text-sm text-ink-soft">Have a tracking number from someone else? Look it up here.</p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const id = trackId.trim().toUpperCase();
              if (id) router.push(`/tracking?id=${encodeURIComponent(id)}`);
            }}
          >
            <input
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              placeholder="CP123456785US"
              aria-label="Tracking number"
              autoCapitalize="characters"
              spellCheck={false}
              className="notranslate min-w-0 flex-1 rounded-xl border border-line px-4 py-3 text-base uppercase outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 sm:text-sm"
            />
            <button type="submit" className={`${secondaryBtn} shrink-0`}>
              Track
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="font-semibold text-ink">Recent shipments</p>
            <Link href="/account/shipments" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : shipments.length === 0 ? (
            <EmptyState
              icon={<Package size={24} />}
              title="No shipments yet"
              body="Once a booking is approved its shipment appears here, with live progress."
            />
          ) : (
            <ul>
              {shipments.slice(0, 4).map((s) => (
                <li key={s._id} className="border-b border-line px-5 py-4 last:border-0">
                  <Link href={`/account/shipments?open=${s._id}`} className="group block">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="notranslate font-semibold tracking-wide text-ink group-hover:text-brand">{s.trackingId}</span>
                      <ShipmentBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {s.origin?.city || "Origin"} → {s.destination?.city || "Destination"} · ETA {fmtDay(s.estimatedDelivery)}
                    </p>
                    <div className="mt-3">
                      <ProgressRail status={s.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="font-semibold text-ink">Awaiting review</p>
            <Link href="/account/shipments?tab=requests" className="text-sm font-semibold text-brand hover:underline">
              All requests
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12" />
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={<Clock size={24} />}
              title="Nothing pending"
              body="Requests you submit wait here until our team reviews them — usually within one business day."
            />
          ) : (
            <ul>
              {pending.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0">
                  <div className="min-w-0">
                    <p className="notranslate text-sm font-semibold text-ink">{r.reference}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {r.originCity} → {r.destinationCity} · {timeAgo(r.createdAt)}
                    </p>
                  </div>
                  <RequestBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
