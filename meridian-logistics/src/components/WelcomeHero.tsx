"use client";
import Link from "next/link";
import Dither from "./Dither";
import DeliveryRouteCanvas from "./DeliveryRouteCanvas";

export default function WelcomeHero() {
  return <section className="welcome-hero relative overflow-hidden pt-32 md:pt-40">
    <div className="welcome-hero__glow" aria-hidden="true" />
    <div className="welcome-hero__dither" aria-hidden="true">
      <Dither
        waveColor={[0.28, 0.39, 0.64]}
        backgroundColor={[0.9, 0.94, 0.98]}
        waveSpeed={0.16}
        waveFrequency={2.6}
        waveAmplitude={0.32}
        colorNum={6}
        pixelSize={2}
        mouseRadius={0.45}
      />
    </div>
    <div className="welcome-route-canvas" aria-hidden="true"><DeliveryRouteCanvas /></div>
    <div className="welcome-map" aria-hidden="true"><span className="welcome-map__route welcome-map__route--one" /><span className="welcome-map__route welcome-map__route--two" /><span className="welcome-map__hub welcome-map__hub--west" /><span className="welcome-map__hub welcome-map__hub--east" /></div>
    <div className="relative z-10 mx-auto max-w-4xl px-5 text-center"><p className="welcome-kicker">Trusted logistics / one living record</p><h1 className="welcome-title">The shipment manager <span>for every handoff.</span></h1><p className="welcome-copy mx-auto">Move freight with the clarity of a single operating system—from booking and routing to the final delivery confirmation.</p><div className="welcome-actions"><Link className="hv2-btn hv2-btn-primary" href="/tracking">Track a shipment <span aria-hidden="true">→</span></Link><Link className="hv2-btn hv2-btn-ghost" href="/book-demo">Book a Demo</Link></div></div>
    <div className="welcome-hero__bottom mx-auto flex max-w-6xl justify-between px-5 pb-12 pt-24 text-left"><span>Built for the route ahead</span><span>Sea / air / road / rail</span></div>
  </section>;
}
