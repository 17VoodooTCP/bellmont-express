import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services | Bellmont Express",
  description: "Ocean, air, road and rail freight, warehousing and express delivery. One contract, live visibility.",
};

const SERVICES = [
  { title: "Ocean Freight", detail: "FCL and LCL across 180 ports. Container-level tracking from gate-in to discharge, customs pre-clearance, and reefer monitoring for temperature-sensitive cargo." },
  { title: "Air Freight", detail: "Time-critical capacity on scheduled and charter uplift. Door-to-door in as little as 41 hours, with priority handling for medical, aerospace and perishable freight." },
  { title: "Road Freight", detail: "FTL and LTL networks across 40 countries with live telematics on every trailer: position, temperature, and door events streamed to your dashboard." },
  { title: "Rail Freight", detail: "Low-carbon intermodal corridors linking inland terminals to every major port. Up to 76% emissions reduction versus road on comparable lanes." },
  { title: "Warehousing", detail: "Bonded and ambient facilities in 12 gateway cities, with real-time inventory, cross-docking, and same-day fulfilment integrations." },
  { title: "Express Delivery", detail: "Final-mile fleets in 60 metro areas. Live courier tracking, photo proof of delivery, and two-hour delivery windows your customers can trust." },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sage">Services</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
        Every mode. One platform.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        Mix ocean, air, road and rail on a single booking. Bellmont Express plans the
        optimal route, executes every handoff, and keeps the whole journey
        visible. One contract, one invoice, one support line.
      </p>

      <div className="mt-14 divide-y divide-line border-y border-line">
        {SERVICES.map((s, i) => (
          <div key={s.title} className="grid gap-3 py-8 md:grid-cols-[220px_1fr] md:gap-10">
            <div className="flex items-baseline gap-4">
              <span className="notranslate text-sm font-semibold text-sage">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-semibold">{s.title}</h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-soft md:text-base">{s.detail}</p>
          </div>
        ))}
      </div>

      <Link
        href="/tracking"
        className="mt-12 inline-block rounded-full bg-ink px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-sage"
      >
        Track a shipment
      </Link>
    </div>
  );
}
