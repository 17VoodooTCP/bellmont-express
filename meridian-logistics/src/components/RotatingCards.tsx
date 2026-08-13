"use client";

/* Rotating Cards: a 3D circular carousel the user can drag to spin.

   Written in-house instead of pulling the paid registry component. Cards sit on
   a ring in 3D space; dragging spins the ring with momentum, and it drifts on
   its own when idle. Pointer events cover mouse, touch and pen in one path.

   Accessibility: the ring is a listbox-free, keyboard-driven control. Arrow
   keys step between cards, and reduced-motion users get no idle drift and no
   spin transition. */

import { useCallback, useEffect, useRef, useState } from "react";

export type RotatingCard = {
  id: string;
  title: string;
  body: string;
  image?: string;
  caption?: string;
};

export type RotatingCardsProps = {
  cards: RotatingCard[];
  radius?: number;
  cardWidth?: number;
  cardHeight?: number;
  autoSpinSpeed?: number;
  perspective?: number;
  className?: string;
};

export default function RotatingCards({
  cards,
  radius = 300,
  cardWidth = 268,
  cardHeight = 410,
  autoSpinSpeed = 8,
  perspective = 1100,
  className = "",
}: RotatingCardsProps) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  /* Refs, not state: the animation loop reads these every frame and must not
     re-subscribe when they change. */
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const draggingRef = useRef(false);
  const reducedRef = useRef(false);

  const count = Math.max(cards.length, 1);
  const stepAngle = 360 / count;

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      if (!draggingRef.current) {
        if (Math.abs(velocityRef.current) > 12) {
          /* momentum from the throw, decaying exponentially */
          angleRef.current += velocityRef.current * dt;
          velocityRef.current *= Math.pow(0.12, dt);
        } else if (autoSpinSpeed > 0 && !reducedRef.current) {
          velocityRef.current = 0;
          angleRef.current += autoSpinSpeed * dt;
        } else {
          /* Settle onto the nearest card. Without this the ring can rest with
             a gap facing the viewer. With few cards, one sits at the back and
             the rest are edge-on, which reads as a broken layout. */
          velocityRef.current = 0;
          const nearest = Math.round(angleRef.current / stepAngle) * stepAngle;
          const gap = nearest - angleRef.current;
          if (Math.abs(gap) < 0.05) {
            angleRef.current = nearest;
          } else {
            angleRef.current += gap * Math.min(1, dt * 9);
          }
        }
        setAngle(angleRef.current);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoSpinSpeed, stepAngle]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    lastXRef.current = e.clientX;
    velocityRef.current = 0;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    /* 0.3deg per pixel keeps a full spin at roughly a screen-width drag */
    const delta = dx * 0.3;
    angleRef.current += delta;
    velocityRef.current = delta * 60;
    setAngle(angleRef.current);
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    velocityRef.current = 0;
    angleRef.current += stepAngle * dir;
    setAngle(angleRef.current);
  }, [stepAngle]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(-1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(1); }
  };

  return (
    <div className={`relative select-none ${className}`}>
      <div
        ref={stageRef}
        role="group"
        aria-label="Rotating cards. Use the left and right arrow keys to browse."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="mx-auto flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        style={{
          height: cardHeight + 90,
          perspective: `${perspective}px`,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "pan-y",
        }}
      >
        <div
          className="relative"
          style={{
            width: cardWidth,
            height: cardHeight,
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px) rotateY(${angle}deg)`,
          }}
        >
          {cards.map((card, i) => {
            const cardAngle = i * stepAngle;
            /* how square-on this card is right now: 1 = facing us, 0 = edge/back */
            const facing = Math.cos(((cardAngle + angle) * Math.PI) / 180);
            const front = Math.max(0, facing);
            return (
              <article
                key={card.id}
                aria-hidden={front < 0.5}
                className="absolute inset-0 overflow-hidden rounded-2xl border border-line bg-paper-raised"
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
                  opacity: 0.35 + front * 0.65,
                  boxShadow: `0 ${8 + front * 18}px ${20 + front * 30}px -18px rgba(20,23,15,${0.18 + front * 0.22})`,
                  backfaceVisibility: "hidden",
                }}
              >
                {card.image && (
                  <div className="h-[42%] w-full overflow-hidden bg-ocean">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  {card.caption && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sage">
                      {card.caption}
                    </p>
                  )}
                  <h3 className="mt-2 text-lg font-bold leading-tight">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Previous card"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition hover:border-sage hover:text-sage"
        >
          ‹
        </button>
        <p className="text-xs text-ink-mute">Auto-spinning · drag to explore</p>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Next card"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition hover:border-sage hover:text-sage"
        >
          ›
        </button>
      </div>
    </div>
  );
}
