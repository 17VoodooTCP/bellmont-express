"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STEPS = [
  { id: "track", label: "Track", title: "See the whole journey", copy: "Type a reference, then watch every handoff resolve into one clear route.", icon: "⌁" },
  { id: "route", label: "Route", title: "Follow it in real time", copy: "Origin, current position and destination stay together on one live record.", icon: "↗" },
  { id: "support", label: "Support", title: "Ask a human when it matters", copy: "Start with quick answers, then move to a specialist without starting over.", icon: "◌" },
  { id: "proof", label: "Proof", title: "Know when it arrives", copy: "A clear delivery milestone closes the loop for everyone on the journey.", icon: "✓" },
] as const;

function MiniMap() {
  return (
    <div className="phone-map" aria-hidden="true">
      <div className="phone-map__grid" />
      <span className="phone-map__city phone-map__city--origin">ROTTERDAM</span>
      <span className="phone-map__city phone-map__city--destination">LONG BEACH</span>
      <span className="phone-map__pin phone-map__pin--origin" />
      <span className="phone-map__pin phone-map__pin--current" />
      <span className="phone-map__pin phone-map__pin--destination" />
      <svg className="phone-map__route" viewBox="0 0 280 150" fill="none">
        <path d="M39 116C82 87 103 109 133 79C168 44 180 76 215 48C229 37 242 32 254 27" stroke="#61735a" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 7" />
      </svg>
    </div>
  );
}

function PhoneScreen({ step }: { step: (typeof STEPS)[number] }) {
  if (step.id === "track") {
    return (
      <div className="phone-screen__content">
        <div className="phone-greeting"><span>Good morning</span><strong>Amara</strong><span className="phone-avatar">AC</span></div>
        <p className="phone-label">ACTIVE SHIPMENT</p>
        <div className="phone-shipment-card">
          <div className="flex items-center justify-between"><span className="phone-status-dot" /> <span className="phone-status">In transit</span><span className="phone-more">•••</span></div>
          <strong>CP123456785US</strong>
          <div className="phone-shipment-route"><span>Rotterdam</span><span className="phone-line" /><span>Long Beach</span></div>
          <div className="phone-progress"><span /></div>
          <small>Arriving Thursday · 14:20 local time</small>
        </div>
        <div className="phone-section-row"><span>Recent activity</span><span>View all</span></div>
        <div className="phone-activity"><span className="phone-activity__mark">✓</span><span><strong>Loaded on vessel</strong><small>Today, 08:42 · Rotterdam</small></span></div>
        <div className="phone-activity"><span className="phone-activity__mark phone-activity__mark--soft">↗</span><span><strong>Customs cleared</strong><small>Yesterday, 16:10 · Port gate</small></span></div>
      </div>
    );
  }

  if (step.id === "route") {
    return (
      <div className="phone-screen__content">
        <div className="phone-topline"><span className="phone-back">‹</span><strong>Live route</strong><span className="phone-share">↗</span></div>
        <MiniMap />
        <div className="phone-route-card"><div><span className="phone-status-dot" /><strong>Moving as planned</strong></div><p>Last scan 4 min ago</p><div className="phone-route-stats"><span><small>Distance</small><strong>4,982 mi</strong></span><span><small>Mode</small><strong>Ocean</strong></span></div></div>
      </div>
    );
  }

  if (step.id === "support") {
    return (
      <div className="phone-screen__content">
        <div className="phone-topline"><span className="phone-back">‹</span><strong>Support</strong><span className="phone-help">?</span></div>
        <div className="phone-support-intro"><span className="phone-support-icon">✦</span><strong>How can we help?</strong><small>Answers first. A human whenever you need one.</small></div>
        <div className="phone-quick-actions"><button>Where is my shipment?</button><button>Change delivery details</button><button>Talk to a specialist</button></div>
        <div className="phone-chat-preview"><span className="phone-chat-avatar">B</span><span><strong>Bellmont support</strong><small>Usually replies in under a minute</small></span><span className="phone-chevron">›</span></div>
      </div>
    );
  }

  return (
    <div className="phone-screen__content">
      <div className="phone-topline"><span className="phone-back">‹</span><strong>Delivery</strong><span className="phone-share">↗</span></div>
      <div className="phone-proof-art"><span className="phone-proof-check">✓</span><span>DELIVERED</span></div>
      <div className="phone-proof-copy"><strong>Your shipment arrived.</strong><small>Long Beach · Thursday, 14:20</small></div>
      <div className="phone-proof-card"><span className="phone-proof-avatar">ML</span><span><strong>Marco Lewis</strong><small>Delivery specialist</small></span><span className="phone-proof-badge">Verified</span></div>
      <button className="phone-primary-action">View journey</button>
    </div>
  );
}

export default function PlatformShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % STEPS.length), 4800);
    return () => window.clearInterval(timer);
  }, []);

  const step = STEPS[active];

  return (
    <section className="platform-showcase" aria-labelledby="platform-title">
      <div className="platform-showcase__rings" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="platform-showcase__copy">
          <p className="section-kicker text-sage-soft">The Bellmont interface</p>
          <h2 id="platform-title" className="mt-5 max-w-xl text-4xl font-bold leading-[0.96] text-paper md:text-6xl">
            Freight, with a point of view.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-paper/60 md:text-lg">
            A calmer way to move through the network. Built for the person who
            needs the answer, the route and the next step without the noise.
          </p>
          <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Platform walkthrough">
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active === index}
                onClick={() => setActive(index)}
                className={`platform-tab ${active === index ? "platform-tab--active" : ""}`}
              >
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
          <div className="mt-10 max-w-md border-t border-white/15 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-soft">{step.label} / 0{active + 1}</p>
            <h3 className="mt-3 text-2xl font-semibold text-paper">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">{step.copy}</p>
          </div>
          <Link href="/tracking" className="platform-cta mt-9 inline-flex items-center gap-3">
            Enter live tracking <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="phone-stage" aria-label="Preview of the Bellmont Express mobile experience">
          <div className="iphone-shell">
            <div className="iphone-button iphone-button--silent" />
            <div className="iphone-button iphone-button--volume" />
            <div className="iphone-button iphone-button--power" />
            <div className="iphone-screen">
              <div className="iphone-statusbar"><span>9:41</span><span className="iphone-island" /><span>◔ ᯤ ▰</span></div>
              <PhoneScreen step={step} />
              <div className="iphone-homebar" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
