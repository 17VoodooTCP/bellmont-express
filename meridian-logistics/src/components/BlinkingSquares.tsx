"use client";

/* Blinking Squares: a grid of squares that quietly twinkle, densest along one
   edge and fading out across the field.

   Written in-house rather than pulled from a paid registry. The prop surface
   mirrors the documented one so it stays a drop-in if we ever license the
   original: direction, gridSize, squareSize, fadeStart, fadeEnd, falloff,
   minBrightness, twinkleSpeed, twinkleStrength, intensity, opacity,
   squareColor, backgroundColor, dpr.

   Renders to a single canvas: one fill per cell per frame, no DOM churn. */

import { useEffect, useRef } from "react";

export type BlinkingSquaresProps = {
  direction?: "right" | "left" | "top" | "bottom";
  gridSize?: number;
  squareSize?: number;
  fadeStart?: number;
  fadeEnd?: number;
  falloff?: number;
  minBrightness?: number;
  twinkleSpeed?: number;
  twinkleStrength?: number;
  intensity?: number;
  opacity?: number;
  squareColor?: string;
  backgroundColor?: string;
  dpr?: number;
  className?: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* #rgb / #rrggbb -> [r,g,b]; falls back to the sage accent on bad input. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [97, 115, 90];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function BlinkingSquares({
  direction = "right",
  gridSize = 52,
  squareSize = 0.57,
  fadeStart = 0.65,
  fadeEnd = 1,
  falloff = 1.25,
  minBrightness = 0.55,
  twinkleSpeed = 1.4,
  twinkleStrength = 0.94,
  intensity = 1,
  opacity = 1,
  squareColor = "#61735a",
  backgroundColor = "transparent",
  dpr = 1.5,
  className,
}: BlinkingSquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const cells = Math.round(clamp(gridSize, 8, 200));
    const fill = clamp(squareSize, 0.05, 0.98);
    const curve = clamp(falloff, 0.3, 6);
    const floor = clamp(minBrightness, 0, 1);
    const speed = clamp(twinkleSpeed, 0, 4);
    const strength = clamp(twinkleStrength, 0, 1);
    const gain = clamp(intensity, 0, 2);
    const alpha = clamp(opacity, 0, 1);
    const [r, g, b] = parseHex(squareColor);

    /* A stable pseudo-random phase per cell keeps the twinkle from pulsing in
       unison, without allocating an array that must resize with the canvas. */
    const phase = (col: number, row: number) => {
      const s = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
      return (s - Math.floor(s)) * Math.PI * 2;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ratio = clamp(dpr, 1, 3);

    let width = 0;
    let height = 0;
    let step = 0;
    let cols = 0;
    let rows = 0;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const scale = Math.min(ratio, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      /* gridSize counts cells along the long axis, so squares stay square */
      step = Math.max(width, height) / cells;
      cols = Math.ceil(width / step) + 1;
      rows = Math.ceil(height / step) + 1;
    };

    /* 0 at the empty edge, 1 at the dense edge */
    const gradientAt = (col: number, row: number) => {
      const u = cols > 1 ? col / (cols - 1) : 1;
      const v = rows > 1 ? row / (rows - 1) : 1;
      switch (direction) {
        case "left": return 1 - u;
        case "top": return 1 - v;
        case "bottom": return v;
        default: return u;
      }
    };

    const draw = (timeMs: number) => {
      const t = timeMs / 1000;
      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      const side = step * fill;
      const inset = (step - side) / 2;
      const lo = Math.min(fadeStart, fadeEnd);
      const hi = Math.max(fadeStart, fadeEnd);
      const span = hi - lo;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const d = gradientAt(col, row);
          /* density ramps from fadeStart to fadeEnd, shaped by falloff */
          const raw = span <= 0 ? (d >= hi ? 1 : 0) : (d - lo) / span;
          const density = Math.pow(clamp(raw, 0, 1), curve);
          if (density <= 0.001) continue;

          const wave = reduced
            ? 1
            : (Math.sin(t * speed * Math.PI * 2 + phase(col, row)) + 1) / 2;
          const twinkle = 1 - strength + strength * wave;
          const a = clamp(density * (floor + (1 - floor) * twinkle) * gain, 0, 1) * alpha;
          if (a <= 0.004) continue;

          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
          ctx.fillRect(col * step + inset, row * step + inset, side, side);
        }
      }
    };

    let frame = 0;
    const loop = (ts: number) => {
      draw(ts);
      frame = requestAnimationFrame(loop);
    };

    measure();
    if (reduced) {
      draw(0); // paint one static field, then stop
    } else {
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      measure();
      if (reduced) draw(0);
    });
    observer.observe(parent);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    direction, gridSize, squareSize, fadeStart, fadeEnd, falloff,
    minBrightness, twinkleSpeed, twinkleStrength, intensity, opacity,
    squareColor, backgroundColor, dpr,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", pointerEvents: "none" }}
    />
  );
}
