"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function BookDemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return <main className="min-h-screen bg-[#eef1fa] px-5 pb-24 pt-36 text-[#1e2950]">
    <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
      <section>
        <span className="section-kicker text-orange">A clearer next step</span>
        <h1 className="mt-6 max-w-xl text-5xl font-bold leading-[.94] md:text-7xl">See what a living shipment record can do.</h1>
        <p className="mt-7 max-w-lg text-base leading-relaxed text-[#66738e] md:text-lg">Tell us where your operation is headed. We’ll walk through rates, carrier connections, cold-chain controls, and the handoffs that matter most to your team.</p>
        <div className="mt-10 space-y-4 text-sm text-[#53617b]"><p><span className="mr-3 text-orange">01</span>Review your current checkout and carrier workflow.</p><p><span className="mr-3 text-orange">02</span>See Bellmont’s live rates, rules, and tracking experience.</p><p><span className="mr-3 text-orange">03</span>Leave with a clear route to your first live shipment.</p></div>
      </section>

      <form onSubmit={submit} className="rounded-[2rem] border border-[#dce4f1] bg-white p-6 shadow-[0_20px_60px_rgba(45,58,94,.1)] md:p-9">
        <div className="flex items-center justify-between border-b border-[#e6ebf3] pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#49629d]">Book a Demo</p><h2 className="mt-2 text-2xl font-bold">Start with your route.</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0d8] text-xl font-bold text-[#fca837]">B</span></div>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[.14em] text-[#6e7b95]">Full Name<input required name="name" className="mt-2 w-full rounded-xl border border-[#dce4f1] bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:border-[#fca837]" placeholder="Your name" /></label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-[#6e7b95]">Email<input required type="email" name="email" className="mt-2 w-full rounded-xl border border-[#dce4f1] bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:border-[#fca837]" placeholder="you@company.com" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-[#6e7b95]">Phone Number<input name="phone" className="mt-2 w-full rounded-xl border border-[#dce4f1] bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:border-[#fca837]" placeholder="(555) 000-0000" /></label><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-[#6e7b95]">Website<input name="website" className="mt-2 w-full rounded-xl border border-[#dce4f1] bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:border-[#fca837]" placeholder="company.com" /></label></div>
        <label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-[#6e7b95]">What should we see first?<select name="focus" defaultValue="rates" className="mt-2 w-full rounded-xl border border-[#dce4f1] bg-[#f8fafc] px-4 py-3 text-sm outline-none focus:border-[#fca837]"><option value="rates">Live rates and delivery promises</option><option value="cold-chain">Cold-chain compliance and claims</option><option value="automation">Rules, zones, and automation</option><option value="tracking">Branded tracking experience</option></select></label>
        <button type="submit" className="mt-7 w-full rounded-xl bg-[#1e2950] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#49629d]">{submitted ? "Request received — we’ll be in touch" : "Next →"}</button>
        {submitted && <p className="mt-4 rounded-xl bg-[#ecfbf1] px-4 py-3 text-sm font-semibold text-[#16864b]">Thanks. Your Bellmont demo request is ready for the next step.</p>}
        <p className="mt-5 text-center text-xs text-[#8995ad]">Prefer to explore first? <Link href="/features" className="font-semibold text-[#49629d] underline">See platform features</Link>.</p>
      </form>
    </div>
  </main>;
}
