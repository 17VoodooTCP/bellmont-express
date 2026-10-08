"use client";

/* Nav arrival animation: the bar breaks into cubes, a greeting surfaces, the
   cubes fall back into place.

   Constraints that shaped this:
   - Once per session (sessionStorage), so returning visitors are not made to
     wait for navigation on every page.
   - ~1.2s total, and ANY interaction skips it immediately. The nav underneath
     is real and clickable the whole time; this is an overlay, never a gate.
   - Skipped outright under prefers-reduced-motion.
   - Pure CSS transforms on a fixed number of tiles, so it stays cheap. */

import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "bellmont_nav_greeted";
const GREETING = "We Are Glad To Have You!";
const COLS = 26;
const ROWS = 2;
const TILES = COLS * ROWS;
const TOTAL_MS = 1250;

export default function NavIntro() {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = true;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode: treat as seen rather than replaying forever */
    }
    if (reduced || seen) {
      setPhase("done");
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch { /* nothing to do */ }

    setPhase("playing");

    const finish = () => {
      setPhase("done");
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    timers.current.push(window.setTimeout(finish, TOTAL_MS));

    /* Any sign of intent cancels it: the greeting must never be in the way. */
    const skip = () => finish();
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("wheel", skip, { once: true, passive: true });

    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
    };
  }, []);

  if (phase === "done" || phase === "idle") return null;

  return (
    <div className="nav-intro" aria-hidden="true">
      <div className="nav-intro__tiles">
        {Array.from({ length: TILES }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          /* Deterministic scatter: stable across renders, no layout thrash. */
          const seed = Math.sin(i * 12.9898) * 43758.5453;
          const rand = seed - Math.floor(seed);
          return (
            <span
              key={i}
              className="nav-intro__tile"
              style={
                {
                  left: `${(col / COLS) * 100}%`,
                  top: `${(row / ROWS) * 100}%`,
                  width: `${100 / COLS}%`,
                  height: `${100 / ROWS}%`,
                  "--dx": `${(rand - 0.5) * 120}px`,
                  "--dy": `${(rand - 0.5) * 90}px`,
                  "--rot": `${(rand - 0.5) * 90}deg`,
                  animationDelay: `${(col / COLS) * 180}ms`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
      <span className="nav-intro__greeting">{GREETING}</span>
    </div>
  );
}
