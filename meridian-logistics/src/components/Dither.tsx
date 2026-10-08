"use client";

/* Dithered wave backdrop — 2D canvas.

   This replaces a WebGL version built on three.js + @react-three/fiber +
   postprocessing, which cost ~1.1 MB of JavaScript (304 KB over the wire) to
   draw a texture that ends up at 30% opacity, multiply-blended, masked top and
   bottom, and partly covered by another canvas. The maths here is a port of
   that shader: fbm Perlin field -> mix(background, wave) -> 8x8 Bayer ordered
   dither -> posterise to `colorNum` levels.

   It renders into a small offscreen buffer (one buffer pixel per dither cell)
   and scales up with smoothing off, which is what `pixelSize` did in the
   shader — so the output is blocky by construction and costs very little.

   Props match the previous component, so this is a drop-in. */

import { useEffect, useRef } from "react";
import "./Dither.css";

export type DitherProps = {
  waveColor?: [number, number, number];
  backgroundColor?: [number, number, number];
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  /* Accepted for API compatibility. The WebGL version only applied these when
     enableMouseInteraction was set, which this hero never did. */
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
};

/* The same 8x8 Bayer matrix the shader used, as 0..1 thresholds. */
const BAYER = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
].map((v) => v / 64);

/* Classic 2D Perlin over a fixed permutation, so the field is identical on
   every load rather than reshuffling per mount. */
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/* The (+-1, +-1) gradients are length sqrt(2); the shader's cnoise normalises
   its gradients, so scale the dot product to unit length or the field runs
   roughly 40% hot and saturates the colour mix. */
const INV_SQRT2 = 1 / Math.SQRT2;

function grad(hash: number, x: number, y: number) {
  switch (hash & 3) {
    case 0: return (x + y) * INV_SQRT2;
    case 1: return (-x + y) * INV_SQRT2;
    case 2: return (x - y) * INV_SQRT2;
    default: return (-x - y) * INV_SQRT2;
  }
}

function perlin(x: number, y: number) {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const xi = fx & 255;
  const yi = fy & 255;
  const xf = x - fx;
  const yf = y - fy;
  const u = fade(xf);
  const v = fade(yf);
  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];
  const g1 = grad(aa, xf, yf);
  const g2 = grad(ba, xf - 1, yf);
  const g3 = grad(ab, xf, yf - 1);
  const g4 = grad(bb, xf - 1, yf - 1);
  const x1 = g1 + u * (g2 - g1);
  const x2 = g3 + u * (g4 - g3);
  return x1 + v * (x2 - x1);
}

/* Calibration. This is a classic table-based Perlin; the shader used
   Gustavson's cnoise, whose gradient set yields a flatter distribution. Left
   at 1.0 the field reads as visible cloud rather than the near-invisible haze
   the original produced at 30% opacity, so the mix factor is scaled to match.
   Tuned by comparing against the WebGL build at the same viewport. */
const FIELD_STRENGTH = 0.42;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default function Dither({
  waveColor = [0.28, 0.39, 0.64],
  backgroundColor = [0.9, 0.94, 0.98],
  waveSpeed = 0.16,
  waveFrequency = 2.6,
  waveAmplitude = 0.32,
  colorNum = 6,
  pixelSize = 2,
  disableAnimation = false,
}: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const levels = Math.max(2, colorNum);
    const stepSize = 1 / (levels - 1);
    const [wr, wg, wb] = waveColor;
    const [br, bg, bb] = backgroundColor;

    /* A soft, slow backdrop, so it draws at a low internal resolution and
       scales up. Capping the buffer keeps the per-frame cost flat on a 4K
       display instead of growing with the viewport. */
    const MAX_BUFFER_W = 720;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = reduced || disableAnimation;

    let bw = 0, bh = 0, aspect = 1;
    let image: ImageData | null = null;
    let buffer: Uint8ClampedArray | null = null;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));
      aspect = cssW / cssH;
      bw = Math.max(1, Math.min(MAX_BUFFER_W, Math.round(cssW / Math.max(1, pixelSize))));
      bh = Math.max(1, Math.round(bw / aspect));
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.imageSmoothingEnabled = false;
      image = ctx.createImageData(bw, bh);
      buffer = image.data;
    };

    /* fbm and pattern, ported from the shader. */
    const fbm = (x: number, y: number) => {
      let value = 0;
      let amplitude = 1;
      let px = x;
      let py = y;
      for (let i = 0; i < 4; i++) {
        value += amplitude * Math.abs(2.3 * perlin(px, py));
        px *= waveFrequency;
        py *= waveFrequency;
        amplitude *= waveAmplitude;
      }
      return value;
    };

    const render = (time: number) => {
      if (!buffer || !image) return;
      const shift = time * waveSpeed;
      const maxLevel = levels - 1;
      let i = 0;
      for (let y = 0; y < bh; y++) {
        /* GL sampled bottom-up; flipping keeps the drift going the same way. */
        const vy = (bh - 1 - y) / bh - 0.5;
        const row = (y & 7) * 8;
        for (let x = 0; x < bw; x++) {
          const ux = (x / bw - 0.5) * aspect;
          const warp = fbm(ux - shift, vy - shift);
          const value = clamp01(fbm(ux + warp, vy + warp) * FIELD_STRENGTH);

          let r = br + (wr - br) * value;
          let g = bg + (wg - bg) * value;
          let b = bb + (wb - bb) * value;

          const threshold = (BAYER[row + (x & 7)] - 0.25) * stepSize;
          r += threshold;
          g += threshold;
          b += threshold;

          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const bias = 0.2 * (1 - smoothstep(0.45, 0.8, lum));
          r = clamp01(r - bias);
          g = clamp01(g - bias);
          b = clamp01(b - bias);

          buffer[i++] = (Math.floor(r * maxLevel + 0.5) / maxLevel) * 255;
          buffer[i++] = (Math.floor(g * maxLevel + 0.5) / maxLevel) * 255;
          buffer[i++] = (Math.floor(b * maxLevel + 0.5) / maxLevel) * 255;
          buffer[i++] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    let frame = 0;
    let last = 0;
    let onScreen = true;
    /* A full redraw costs ~19ms at this buffer size, so it runs at 15fps and
       only while the hero is actually in view. The field drifts slowly enough
       that neither is visible. */
    const FRAME_MS = 1000 / 15;

    const loop = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        render(now / 1000);
      }
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (frame || still) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    measure();
    render(0);

    const resizeObserver = new ResizeObserver(() => {
      measure();
      render(still ? 0 : performance.now() / 1000);
    });
    resizeObserver.observe(parent);

    /* Stop burning frames once the hero scrolls away. */
    const visibility = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        if (onScreen && !document.hidden) start();
        else stop();
      },
      { threshold: 0 }
    );
    visibility.observe(parent);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    /* The colour props are array literals at the call site, so a new reference
       arrives on every parent render. Keying on the values keeps the canvas
       from being torn down and rebuilt each time. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    waveColor.join(), backgroundColor.join(), waveSpeed, waveFrequency,
    waveAmplitude, colorNum, pixelSize, disableAnimation,
  ]);

  return (
    <div className="dither-container">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }}
      />
    </div>
  );
}
