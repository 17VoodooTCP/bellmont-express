"use client";

import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    name: "Start",
    price: "$0",
    label: "For teams getting their first live shipping workflow in place.",
    perLabel: "$0.99 per label",
    features: ["Local courier connection", "1 store / 1 carrier", "1 user", "Product & service mapping", "Full cold-chain coverage", "Claim management", "Packing slip customization", "Branded notifications"],
  },
  {
    name: "Grow",
    price: "$79",
    label: "For growing operations that need weather and delivery safeguards.",
    perLabel: "$0.40 per label",
    features: ["Everything in Start", "2 stores / 2 carriers", "2 users", "Live weather tracking", "Zone mapping", "3 rule automations", "Confidence scores", "Late shipment alerts", "Box splitting algorithm", "Branded tracking page"],
  },
  {
    name: "Scale",
    price: "$199",
    label: "For brands ready to optimize checkout and every post-purchase handoff.",
    perLabel: "$0.20 per label",
    featured: true,
    features: ["Everything in Grow", "3 stores / 3 carriers", "Unlimited users", "Unlimited rule automations", "Live rates at checkout", "Rate rounding & markup", "Live shipping schedule", "Order protection", "Branded claim flow", "Delivery date picker", "Delivery promise"],
  },
  {
    name: "Enterprise",
    price: "$399",
    label: "For large networks that need priority support and custom control.",
    perLabel: "$0.10 per label",
    features: ["Everything in Scale", "Unlimited stores & carriers", "Priority support", "API access", "Custom-built integrations", "Dedicated operating review"],
  },
];

const FAQS = [
  ["Is there a free trial?", "Yes. Start with the full Scale experience for 28 days, then choose the plan that matches your shipping volume and operational complexity."],
  ["Can I cancel at any time?", "Yes. Bellmont plans are month to month, so you can change or cancel as your operation changes."],
  ["What does cold-chain coverage include?", "Coverage, compliance records, and claim workflows are built into the platform so your team can manage exceptions from the same operating record."],
  ["Does Bellmont work with my store and carriers?", "Bellmont connects Shopify, WooCommerce, BigCommerce, Wix, and other commerce systems alongside UPS, FedEx, USPS, and local courier workflows."],
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  return <main className="min-h-screen bg-[#eef1fa] pb-24 text-[#1e2950]">
    <section className="px-5 pb-16 pt-36 text-center md:pb-24">
      <span className="section-kicker text-orange">Simple, transparent pricing</span>
      <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[.92] md:text-8xl">Start shipping smarter.<br /><span className="text-orange">Scale as you grow.</span></h1>
      <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-[#5b6782] md:text-lg">Built for teams that need clearer rates, safer cold-chain handoffs, and one calm place to run every shipment.</p>
      <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#49629d]"><span className="rounded-full border border-[#cfd8eb] bg-white px-4 py-2">28-day Scale trial</span><span className="rounded-full border border-[#cfd8eb] bg-white px-4 py-2">Cancel anytime</span><span className="rounded-full border border-[#cfd8eb] bg-white px-4 py-2">Cold-chain coverage included</span></div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-4 px-5 lg:grid-cols-4">
      {PLANS.map((plan) => <article key={plan.name} className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-[0_18px_50px_rgba(45,58,94,.08)] ${plan.featured ? "border-[#fca837] bg-[#fffaf1]" : "border-[#dce4f1] bg-white"}`}>
        {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-[#fca837] px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-white">Best for growing teams</span>}
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#49629d]">{plan.name}</p>
        <h2 className="mt-7 text-4xl font-bold">{plan.price}<small className="text-base font-medium text-[#7e8aa5]"> / month</small></h2>
        <p className="mt-2 text-xs font-semibold text-[#fca837]">+ {plan.perLabel}</p>
        <p className="mt-5 min-h-16 text-sm leading-relaxed text-[#66738e]">{plan.label}</p>
        <Link href="/book-demo" className={`mt-6 rounded-xl px-4 py-3 text-center text-sm font-bold transition hover:-translate-y-0.5 ${plan.featured ? "bg-[#fca837] text-white" : "border border-[#49629d] text-[#49629d]"}`}>{plan.name === "Enterprise" ? "Talk to an expert" : "Choose " + plan.name}</Link>
        <ul className="mt-7 space-y-3 border-t border-[#e6ebf3] pt-6 text-sm text-[#53617b]">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="font-bold text-[#3da768]">✓</span><span>{feature}</span></li>)}</ul>
      </article>)}
    </section>

    <section className="mx-auto mt-24 max-w-4xl px-5">
      <div className="text-center"><span className="section-kicker text-orange">Questions, answered</span><h2 className="mt-5 text-4xl font-bold md:text-6xl">A clearer way to choose.</h2></div>
      <div className="mt-10 overflow-hidden rounded-3xl border border-[#dce4f1] bg-white">{FAQS.map(([question, answer], index) => <div key={question} className="border-b border-[#e6ebf3] last:border-0"><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left font-bold"><span>{question}</span><span className="text-2xl font-normal text-[#fca837]">{openFaq === index ? "−" : "+"}</span></button>{openFaq === index && <p className="max-w-3xl px-6 pb-6 text-sm leading-relaxed text-[#66738e]">{answer}</p>}</div>)}</div>
    </section>

    <section className="mx-auto mt-24 max-w-5xl rounded-[2rem] bg-[#1e2950] px-6 py-16 text-center text-white md:px-16"><span className="section-kicker text-[#fca837]">Start with a clearer network</span><h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-[.95] md:text-6xl">Ready to make every handoff count?</h2><p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70">Bring your ocean, air, road, and rail movements into one calm, visible system.</p><Link href="/tracking" className="mt-8 inline-flex rounded-xl bg-[#fca837] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">Enter live tracking <span className="ml-2">→</span></Link></section>
  </main>;
}
