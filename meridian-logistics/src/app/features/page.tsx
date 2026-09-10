"use client";

import Link from "next/link";
import { useState } from "react";
import Reveal from "@/components/Reveal";

const FEATURES = [
  ["01", "CRO & Live Rates at Checkout", "Display live carrier rates and ETAs at checkout linked to your shipping schedule. Watch conversion climb 15%+.", "Select shipping"],
  ["02", "Claim Management & Full Perishability Coverage", "File claims in seconds without pulling your hair out. Built-in coverage for frozen, refrigerated, and fresh products.", "Claim #4821"],
  ["03", "Live Weather Tracking & Confidence Score", "Know the weather and deliverability risks of each address before you ship. Prevent spoilage before it happens.", "Confidence score"],
  ["04", "Order Protection", "Give customers peace of mind. Boost AOV, create supplementary revenue, and easily manage shipping issues.", "Order protection"],
  ["05", "Late Shipment Alerts", "Proactive monitoring keeps you ahead of every delivery issue before customers start calling or leaving reviews.", "Potential late shipments"],
  ["06", "Box Splitting Algorithm", "Our algorithm automatically determines the optimal number of shipments. Add packaging specs and let Bellmont handle the rest.", "Split required"],
  ["07", "Rule Automations", "Create rules for carrier selection, rate adjustments, zone routing, and more—all automated so your team can focus on growth.", "Active rules"],
  ["08", "Branded Tracking Page", "Stop sending customers to third-party sites. Your own customized tracking page with your logo, colors, and messaging.", "Your brand"],
  ["09", "Shipping & Local Courier Management", "Industry-leading overnight rates with UPS, FedEx & USPS. Manage all carriers, labels, and shipments in one dashboard.", "Shipment control"],
] as const;

const FEATURE_ICONS = ["▤", "▧", "☀", "♡", "◷", "▦", "✣", "▣", "◫"];

function ProductCard({ index, label }: { index: number; label: string }) {
  if (index === 0) return <div className="feature-product-card"><div className="mb-3 flex items-center justify-between"><small>SELECT SHIPPING</small><b className="text-[10px] text-green-600">In Stock</b></div>{[["FedEx Priority Overnight", "Arrives Friday, March 7", "$22.50"], ["UPS Next Day Air", "Arrives Friday, March 7", "$24.99"], ["USPS Priority Mail", "Arrives Monday, March 10", "$9.95"]].map(([service, eta, price], i) => <div key={service} className={`flex items-center gap-3 border-b border-line py-3 text-xs ${i === 0 ? "bg-[#fffaf2]" : ""}`}><span className={`h-3 w-3 rounded-full border-2 ${i === 0 ? "border-orange bg-orange" : "border-[#aebbd0]"}`} /><div className="flex-1"><b className="block text-[#425c99]">{service}</b><small>{eta}</small></div><strong className="text-[#425c99]">{price}</strong></div>)}</div>;
  if (index === 1) return <div className="feature-product-card"><div className="flex justify-between text-[10px] font-bold"><span>Claim #4821</span><span className="text-ink-mute">Under Review</span></div><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span>Order</span><b>#18407</b></div><div className="flex justify-between"><span>Issue</span><b className="text-red-500">Spoilage Caused by Delay</b></div><div className="flex justify-between"><span>Value</span><b>$127.50</b></div><div className="flex justify-between"><span>Claim Status</span><b className="text-green-600">Submitted For Payment</b></div></div><div className="mt-4 flex justify-between text-[10px] font-bold"><span>Step 3 of 4</span><span>75%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6ebf3]"><span className="block h-full w-3/4 rounded-full bg-orange" /></div></div>;
  if (index === 2) return <div className="feature-product-card"><small>DELIVERY ADDRESS</small><div className="flex items-end justify-between"><div><strong className="mt-2 block text-xl text-[#425c99]">Chicago, IL 60622</strong><small>Residential</small></div><div className="text-right"><span className="text-2xl text-orange">☀</span><b className="ml-2 text-3xl text-[#425c99]">49°</b><small className="block">Partly Cloudy</small></div></div><div className="mt-4 rounded-xl border border-orange/60 bg-[#fffaf2] p-3"><div className="flex justify-between text-xs text-ink-mute"><span>Confidence score</span><b className="text-green-600">90.9%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ece3]"><span className="block h-full w-[91%] rounded-full bg-sage" /></div></div><div className="mt-3 rounded-lg bg-[#e5f8eb] p-2 text-[10px] font-bold text-green-700">✓ Low weather risk — safe to ship</div></div>;
  if (index === 3) return <div className="feature-product-card"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5870aa] text-xl text-white">♡</span><div><strong className="block text-[#425c99]">Order Protection</strong><small>Full Perishability Coverage</small></div><span className="ml-auto rounded-full bg-orange px-2 py-1 text-[10px] font-bold text-white">ON</span></div><div className="mt-4 flex justify-between border-y border-line py-3 text-xs"><span>Customer Pays 3% of order value</span><b>$4.50</b></div><div className="mt-3 grid grid-cols-2 gap-2 text-center text-[10px]"><div className="rounded-lg bg-[#eef5ff] p-3"><b className="block text-lg text-[#425c99]">2,847</b>Orders Protected</div><div className="rounded-lg bg-[#fff5e8] p-3"><b className="block text-lg text-orange">+$4,210</b>Extra Revenue</div></div></div>;
  if (index === 4) return <div className="feature-product-card"><div className="rounded-xl bg-[#fff3aa] p-3 text-xs font-bold text-[#806d18]">⚠ 19 Potential Late Shipments</div>{["BX-8702", "BX-8039", "BX-7968", "BX-7785"].map((name, i) => <div key={name} className="flex justify-between border-b border-line py-3 text-xs"><b className="text-[#52617a]">{name}</b><span className={i === 1 ? "text-orange" : "text-green-600"}>{i === 1 ? "At risk" : "On time"}</span></div>)}</div>;
  if (index === 5) return <div className="feature-product-card"><div className="mb-4 flex justify-between text-[10px] font-bold"><span>Order #18392 — Split Required</span><span className="text-orange">Optimized</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="rounded-xl bg-[#edf4fc] p-4 text-center font-bold text-[#425c99]">▦<strong className="mt-2 block">Box 1</strong><small>Fresh items<br />Cold Pack</small></div><span className="text-xl text-orange">→</span><div className="rounded-xl bg-[#fff5e8] p-4 text-center font-bold text-[#425c99]">▦<strong className="mt-2 block">Box 2</strong><small>Dry goods<br />Standard</small></div></div><div className="mt-4 flex justify-between rounded-lg bg-[#e5f8eb] p-2 text-[10px] font-bold text-green-700"><span>Cost Optimized</span><span>Saved $8.40</span></div></div>;
  if (index === 6) return <div className="feature-product-card"><div className="flex justify-between text-[10px] font-bold uppercase tracking-[.14em] text-ink-mute"><span>Active rules</span><span className="text-orange">7 Active</span></div>{["Zone 8 → FedEx Priority", "Friday cutoff → Hold until Monday", "Weather risk > 70% → Upgrade", "Temp > 85°F → Hold shipment"].map((rule, i) => <div key={rule} className="flex items-center justify-between border-b border-line py-3 text-xs text-[#52617a]"><span><i className={`mr-2 inline-block h-2 w-2 rounded-full ${i === 2 ? "bg-orange" : "bg-green-500"}`} />{rule}</span><b className={i === 2 ? "text-orange" : "text-green-600"}>Active</b></div>)}</div>;
  if (index === 7) return <div className="feature-product-card overflow-hidden"><div className="-mx-5 -mt-5 mb-4 flex justify-between bg-[#425c99] px-5 py-3 text-[10px] font-bold text-white"><span>BELLMONT EXPRESS</span><span className="text-[#dff5e5]">Your brand</span></div><div className="flex justify-around border-b border-line pb-3 text-center text-[10px] font-bold"><span>ORDERED<br /><b className="text-green-600">Mar 18</b></span><span>IN TRANSIT<br /><b className="text-green-600">Mar 20</b></span><span>DELIVERED<br /><b className="text-ink-mute">Mar 25</b></span></div><strong className="mt-4 block text-2xl text-[#19233a]">BX-8042-PL</strong><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e6ebf3]"><span className="block h-full w-[68%] rounded-full bg-orange" /></div><small>Premium Meal Kit · Long Beach, CA</small></div>;
  if (index === 8) return <div className="feature-product-card"><div className="mb-3 flex items-center justify-between"><strong className="text-[#425c99]">Shipment control</strong><span className="rounded-full bg-[#dff5e5] px-2 py-1 text-[10px] font-bold text-green-700">LIVE</span></div>{["UPS · 184 labels", "FedEx · 96 labels", "USPS · 62 labels"].map((carrier) => <div key={carrier} className="flex items-center justify-between border-b border-line py-3 text-xs text-[#52617a]"><span>{carrier}</span><b className="text-green-600">Active</b></div>)}</div>;
  return <div className="feature-product-card"><strong className="text-[#425c99]">{label}</strong></div>;
}

export default function FeaturesPage() {
  const [open, setOpen] = useState<Set<number>>(() => new Set(FEATURES.map((_, index) => index)));
  const toggleFeature = (index: number) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  return (
    <main className="home-v2">
      <section className="feature-hero hv2-frozen-zone relative overflow-hidden px-5 pb-24 pt-36 text-center md:pb-32 md:pt-48">
        <div className="feature-hero__glow feature-hero__glow--sage" />
        <div className="feature-hero__glow feature-hero__glow--orange" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <Reveal><span className="hv2-eyebrow rounded-lg border border-[#425c99]/20 bg-white px-4 py-2 shadow-sm"><span className="hv2-eyebrow-dot" />Built for visible freight</span></Reveal>
          <Reveal delay={0.06}><h1 className="hv2-h2 mt-8 text-4xl md:text-7xl">Everything you need to<br /><span className="hv2-grad-orange">move freight right.</span></h1></Reveal>
          <Reveal delay={0.12}><p className="hv2-sec-sub mx-auto mt-6 max-w-2xl">Bellmont turns shipping into a clear operating layer with live tracking, weather-aware decisions, simple rules, and accountable handoffs.</p></Reveal>
          <Reveal delay={0.18}><div className="hv2-hero-ctas"><Link href="/support" className="hv2-btn hv2-btn-ghost">Book a conversation</Link><Link href="/tracking" className="hv2-btn hv2-btn-primary">Track a shipment <span>→</span></Link></div></Reveal>
        </div>
      </section>
      <section className="hv2-features-zone bg-[#f6f1e7] px-5 py-16 md:py-24">
        <div className="hv2-container mx-auto max-w-6xl border-b border-[#425c99]/15">
          {FEATURES.map(([number, title, copy, label], index) => {
            const isOpen = open.has(index);
            return (
              <article key={number} className="border-t border-[#425c99]/15 py-6 md:py-8">
                <button type="button" aria-expanded={isOpen} onClick={() => toggleFeature(index)} className="group flex w-full items-baseline gap-4 text-left md:gap-8">
                  <span className="hv2-feat-index text-sm font-extrabold tabular-nums text-orange md:text-base">{number}</span>
                  <span className={`hv2-feat-title flex-1 text-2xl font-black leading-tight tracking-tight transition-colors md:text-[2.55rem] ${isOpen ? "text-[#425c99]" : "text-ink-soft group-hover:text-[#425c99]"}`}>{title}</span>
                  <span className={`text-2xl text-orange transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">＋</span>
                </button>
                {isOpen && <div className="grid gap-8 pb-4 pt-7 md:grid-cols-[.9fr_1.1fr] md:gap-16 md:pb-8">
                  <div>
                    <div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-bold text-[#425c99] shadow-sm">{FEATURE_ICONS[index]}</div>
                    <p className="hv2-feat-body max-w-md text-base leading-relaxed text-ink-soft md:text-lg">{copy}</p>
                    <Link href="/support" className="mt-6 inline-flex text-xs font-bold uppercase tracking-[.16em] text-orange hover:text-sage">Explore feature <span className="ml-2">↗</span></Link>
                  </div>
                  <div className="feature-product"><ProductCard index={index} label={label} /></div>
                </div>}
              </article>
            );
          })}
        </div>
      </section>
      <section className="bg-paper px-5 py-24 text-center md:py-36"><span className="inline-flex rounded-lg border border-sage/20 bg-sage-tint px-4 py-2 text-xs font-bold text-sage">Start with a clearer network</span><h2 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-[.98] md:text-6xl">Ready to make <span className="text-orange">every handoff count?</span></h2><p className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg">Bring your ocean, air, road, and rail movements into one calm, visible system.</p><Link href="/tracking" className="mt-8 inline-flex rounded-xl bg-ink px-7 py-4 text-sm font-bold text-white transition hover:bg-sage">Enter live tracking <span className="ml-2">→</span></Link></section>
    </main>
  );
}
