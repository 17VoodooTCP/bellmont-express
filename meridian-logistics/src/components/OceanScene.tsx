"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BlinkingSquares from "./BlinkingSquares";

gsap.registerPlugin(ScrollTrigger);

/* Real container-ship photograph, pre-compressed to WebP at 2000px. Served as
   a static file so the hero remains crisp without metered image transforms. */
const SHIP_IMG = "/media/ship-real.webp";
const PORT_IMG = "/media/port-real.webp";
const TRUCK_IMG =
  "https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?w=900&q=70&auto=format&fit=crop";

export default function OceanScene() {
  const wrap = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Scroll-scrubbed motion is user-driven, so it runs even under macOS
    // "Reduce Motion". Only the self-playing ambient loop is disabled.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wrap.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: "+=95%",
          scrub: 0.25,
          pin: ".scene-pin",
        },
      });

      // Act 1 → the vessel sails on, recedes and dissolves
      tl.to(".hero-copy", { yPercent: -40, autoAlpha: 0, ease: "none" }, 0)
        .to(".ship-media", { xPercent: 10, scale: 0.82, autoAlpha: 0, ease: "power1.in" }, 0)
        .to(".ship-photo", { xPercent: 8, scale: 1.15, ease: "none" }, 0)
        // Act 2: the terminal flips into view
        .fromTo(
          ".port-stage",
          { autoAlpha: 0, rotationX: -40, yPercent: 14, transformPerspective: 1000 },
          { autoAlpha: 1, rotationX: 0, yPercent: 0, ease: "power2.out" },
          0.28
        )
        .fromTo(
          ".port-copy",
          { autoAlpha: 0, y: 60 },
          { autoAlpha: 1, y: 0, ease: "power2.out" },
          0.38
        )
        .fromTo(
          ".truck-card",
          { autoAlpha: 0, y: 80, rotation: -2 },
          { autoAlpha: 1, y: 0, rotation: 0, ease: "power2.out" },
          0.48
        )
        .to(".port-photo", { scale: 1.08, ease: "none" }, 0.28);

      // ambient: slow ocean drift on the vessel while act 1 is on screen
      if (!reduced) {
        gsap.to(".ship-photo", {
          scale: 1.08,
          duration: 14,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrap} className="relative">
      <section className="scene-pin relative flex h-svh flex-col overflow-hidden bg-paper">
        {/* Quietly twinkling field behind the copy, densest at the top edge so
            it thins out before it reaches the vessel. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[62svh]">
          <BlinkingSquares
            direction="top"
            gridSize={120}
            squareSize={0.4}
            fadeStart={0.05}
            fadeEnd={0.9}
            falloff={2.2}
            minBrightness={0.35}
            twinkleSpeed={0.35}
            twinkleStrength={0.9}
            opacity={0.28}
            squareColor="#61735a"
          />
        </div>

        {/* Act 1: the vessel */}
        <div className="hero-copy relative z-10 mx-auto w-full max-w-5xl shrink-0 px-5 pt-24 text-center md:pt-28">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-sage">
            Ocean · Air · Road · Rail
          </p>
          <h1 className="text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[1.02]">
            Every handoff,
            <br className="hidden sm:block" /> on the record.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-soft md:text-base">
            Bellmont Express carries freight across four networks and logs each
            transfer the moment it happens, so nobody has to phone anyone
            to find out where a container is.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/tracking"
              className="rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sage"
            >
              Track a shipment
            </a>
            <a
              href="#services"
              className="rounded-full border border-line px-7 py-3.5 text-sm font-semibold transition-colors hover:border-ink"
            >
              Explore services
            </a>
          </div>
        </div>

        {/* Real vessel, in motion: fills the space below the copy */}
        <div className="ship-media pointer-events-none relative mt-6 min-h-0 flex-1 will-change-transform md:mt-8">
          <div className="relative mx-auto h-full w-[min(1160px,94vw)] overflow-hidden rounded-t-3xl">
            <Image
              src={SHIP_IMG}
              alt="Bellmont Express container vessel under way at sea"
              fill
              priority
              unoptimized
              sizes="94vw"
              className="ship-photo object-cover object-[center_58%] will-change-transform"
            />
            <span className="absolute bottom-4 left-5 flex items-center gap-2 rounded-full bg-white/85 px-4 py-1.5 text-xs font-semibold backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
              MV Bellmont Aurora · Pacific crossing
            </span>
          </div>
        </div>

        {/* Act 2: the terminal, hidden until scroll */}
        <div className="port-stage invisible absolute inset-0 bg-white">
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={PORT_IMG}
              alt="Container terminal with gantry cranes and stacked containers"
              fill
              sizes="100vw"
              className="port-photo object-cover will-change-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
            <div className="port-copy absolute inset-x-0 bottom-0 px-6 pb-14 text-center md:pb-20">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-sage">
                From port to porch
              </p>
              <h2 className="text-4xl font-bold text-white md:text-6xl">
                Every handoff,
                <br />
                orchestrated.
              </h2>
            </div>
            {/* final-mile truck slides in */}
            <figure className="truck-card absolute bottom-10 right-6 hidden w-64 overflow-hidden rounded-2xl bg-white p-2 shadow-2xl md:block lg:right-14">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                <Image
                  src={TRUCK_IMG}
                  alt="New long-haul truck at sunrise, ready for dispatch"
                  fill
                  sizes="256px"
                  className="object-cover"
                />
              </div>
              <figcaption className="flex items-center gap-2 px-2 py-2.5 text-xs font-medium text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                Final mile, dispatched
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>
  );
}
