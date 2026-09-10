"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
type Feature = { number: string; title: string; copy: string; kind: string };
const FEATURES: Feature[] = [
  { number: "01", title: "Industry-leading shipping rates", copy: "Apply for your own shipping account custom-tailored for freight teams. Transform and scale your operation nationwide with no minimums and no commitments.", kind: "rates" },
  { number: "02", title: "Live rates at checkout", copy: "Display live rates and ETAs linked to your shipping schedule. Give customers a clear delivery date while your team protects conversion and margin.", kind: "checkout" },
  { number: "03", title: "Claim management and coverage", copy: "File claims in seconds without pulling your team into a maze of emails. Keep documents, exceptions, and resolutions in one accountable workflow.", kind: "claims" },
  { number: "04", title: "Live weather tracking and confidence scores", copy: "Know the weather and deliverability risks of each address before you ship. Gain awareness of conditions, service outages, and risks at every handoff.", kind: "weather" },
  { number: "05", title: "Order protection", copy: "Boost customer confidence and resolve issues with a clear next step. Give every shipment a visible owner and every recipient peace of mind.", kind: "protection" },
  { number: "06", title: "Smart rule automations", copy: "Create rules for almost any shipping scenario—weather, risk score, carrier selection, rate adjustments, zone routing, and more—all automated.", kind: "rules" },
  { number: "07", title: "Auto box splitting", copy: "Our algorithm determines the number of shipments required for every order. Add your packaging and product specs, and let the network do the rest.", kind: "split" },
  { number: "08", title: "Late shipment alerts", copy: "Know which shipments are late before your customers do. Proactive monitoring keeps you ahead of every delivery issue while the outcome can still change.", kind: "alerts" },
  { number: "09", title: "Custom tracking page", copy: "Keep customers on your own branded tracking page. Streamline delivery communications directly instead of sending recipients to third-party sites.", kind: "tracking" },
  { number: "10", title: "Cold-chain compliance", copy: "Always ship with compliant labels, records, and handoff instructions—no matter how complex the route or how many carriers are involved.", kind: "compliance" },
];

function Preview({ kind }: { kind: string }) {
  const artwork: Record<string, { src: string; alt: string }> = { rates: { src: "/media/bellmont-feature-01-rates.png", alt: "Bellmont rates artwork" }, checkout: { src: "/media/bellmont-feature-02-checkout.png", alt: "Bellmont checkout artwork" }, claims: { src: "/media/bellmont-feature-03-coverage.png", alt: "Bellmont shipment coverage artwork" }, weather: { src: "/media/bellmont-feature-04-weather.png", alt: "Bellmont weather tracking artwork" }, protection: { src: "/media/bellmont-feature-05-protection.png", alt: "Bellmont shipment protection artwork" }, rules: { src: "/media/bellmont-feature-06-automation.png", alt: "Bellmont automation artwork" }, split: { src: "/media/bellmont-feature-07-packing.png", alt: "Bellmont shipment splitting artwork" }, alerts: { src: "/media/bellmont-feature-08-monitoring.png", alt: "Bellmont shipment monitoring artwork" }, tracking: { src: "/media/bellmont-feature-09-branding.png", alt: "Bellmont branded tracking artwork" }, compliance: { src: "/media/bellmont-feature-10-compliance.png", alt: "Bellmont cold-chain compliance artwork" } };
  const image = artwork[kind];
  return <div className="feature-scene feature-scene--artwork"><img className="feature-scene__artwork" src={image.src} alt={image.alt} /></div>;
}

export default function FeatureRail() {
  const rail = useRef<HTMLElement>(null); const [active, setActive] = useState(0);
  useLayoutEffect(() => { if (!rail.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const ctx = gsap.context(() => { gsap.utils.toArray<HTMLElement>(".welcome-feature").forEach((item, index) => { ScrollTrigger.create({ trigger: item, start: "top 58%", end: "bottom 42%", onEnter: () => setActive(index), onEnterBack: () => setActive(index) }); gsap.fromTo(item, { opacity: 0.34, y: 28 }, { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: item, start: "top 88%", end: "top 48%", scrub: true } }); }); }, rail); return () => ctx.revert(); }, []);
  return <section ref={rail} id="platform" className="welcome-features"><div className="mx-auto max-w-6xl px-5 py-24 md:py-36"><div className="welcome-feature-head"><div><p className="section-kicker text-orange">Platform features</p><h2>Everything you need to <span>ship with confidence.</span></h2></div><p>Bring booking, fulfillment, and post-purchase operations into one purpose-built place for modern freight.</p></div><div className="welcome-feature-layout"><div className="welcome-feature-stage"><span className="welcome-feature-stage__index">{FEATURES[active].number} / 10</span><Preview kind={FEATURES[active].kind} /><strong>{FEATURES[active].title}</strong></div><div className="welcome-feature-list">{FEATURES.map((feature) => <article className="welcome-feature" key={feature.number}><div className="welcome-feature__text"><span className="welcome-feature__number">{feature.number}</span><div><h3>{feature.title}</h3><p>{feature.copy}</p><a href="/services">Explore feature <span aria-hidden="true">→</span></a><div className="welcome-feature__mobile-preview"><Preview kind={feature.kind} /></div></div></div></article>)}</div></div></div></section>;
}
