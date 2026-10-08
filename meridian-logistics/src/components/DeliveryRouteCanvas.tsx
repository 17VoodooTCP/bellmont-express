"use client";

import { useEffect, useRef } from "react";

type Point = [number, number];

const mapShape: Point[] = [
  [0.04, 0.38], [0.12, 0.27], [0.24, 0.25], [0.34, 0.2], [0.47, 0.22],
  [0.58, 0.18], [0.71, 0.22], [0.82, 0.18], [0.93, 0.28], [0.88, 0.4],
  [0.93, 0.5], [0.84, 0.55], [0.79, 0.66], [0.67, 0.68], [0.59, 0.78],
  [0.48, 0.7], [0.37, 0.73], [0.27, 0.62], [0.18, 0.64], [0.1, 0.54],
];

const routes = [
  { from: [0.08, 0.62] as Point, control: [0.43, 0.34] as Point, to: [0.9, 0.4] as Point, color: "#fca837", phase: 0 },
  { from: [0.16, 0.34] as Point, control: [0.52, 0.72] as Point, to: [0.78, 0.52] as Point, color: "#87a7d4", phase: 0.34 },
  { from: [0.28, 0.72] as Point, control: [0.61, 0.25] as Point, to: [0.86, 0.29] as Point, color: "#a9c9a1", phase: 0.67 },
];

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.beginPath();
  for (let side = 0; side < 6; side++) {
    const angle = Math.PI / 3 * side;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    side === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* The van, cargo plane and parcel are isometric line drawings in the same
   style as the live-chat background (public/hero/*.svg). Each is drawn
   standing on its route point, at this height in CSS pixels. */
const SPRITES = {
  van: { src: "/hero/van.svg", height: 58 },
  plane: { src: "/hero/plane.svg", height: 64 },
  parcel: { src: "/hero/parcel.svg", height: 42 },
} as const;
type SpriteName = keyof typeof SPRITES;

function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, x: number, y: number, height: number) {
  if (!img?.complete || !img.naturalWidth) return;
  const width = height * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, x - width / 2, y - height, width, height);
}

function routePoint(route: (typeof routes)[number], t: number): Point {
  const eased = t * t * (3 - 2 * t);
  const inverse = 1 - eased;
  return [
    inverse * inverse * route.from[0] + 2 * inverse * eased * route.control[0] + eased * eased * route.to[0],
    inverse * inverse * route.from[1] + 2 * inverse * eased * route.control[1] + eased * eased * route.to[1],
  ];
}

export default function DeliveryRouteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let scrollProgress = 0;
    const sprites: Partial<Record<SpriteName, HTMLImageElement>> = {};
    (Object.keys(SPRITES) as SpriteName[]).forEach((name) => {
      const img = new Image();
      img.src = SPRITES[name].src;
      sprites[name] = img;
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const updateScroll = () => {
      const hero = canvas.closest(".welcome-hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      scrollProgress = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height, 1)));
    };

    const draw = (now: number) => {
      frame = now;
      context.clearRect(0, 0, width, height);
      const mapWidth = width * 0.92;
      const mapHeight = height * 0.8;
      const mapLeft = width * 0.04;
      const mapTop = height * 0.08 - scrollProgress * height * 0.12;
      const polygon = mapShape.map(([x, y]) => [mapLeft + x * mapWidth, mapTop + y * mapHeight] as Point);
      const motion = now * 0.001;
      const mapOpacity = 0.55 - scrollProgress * 0.18;

      for (let y = mapTop; y < mapTop + mapHeight; y += 9) {
        for (let x = mapLeft; x < mapLeft + mapWidth; x += 9) {
          if (!pointInPolygon([x, y], polygon)) continue;
          const shimmer = (Math.sin(x * 0.018 + y * 0.012 + motion * 1.6) + 1) / 2;
          drawHex(context, x, y, 2.25 + shimmer * 0.8, `rgba(73, 98, 157, ${mapOpacity * (0.34 + shimmer * 0.4)})`);
        }
      }

      routes.forEach((route) => {
        const from: Point = [mapLeft + route.from[0] * mapWidth, mapTop + route.from[1] * mapHeight];
        const control: Point = [mapLeft + route.control[0] * mapWidth, mapTop + route.control[1] * mapHeight];
        const to: Point = [mapLeft + route.to[0] * mapWidth, mapTop + route.to[1] * mapHeight];
        context.save();
        context.setLineDash([3, 9]);
        context.lineWidth = 1.4;
        context.strokeStyle = route.color;
        context.globalAlpha = 0.54 - scrollProgress * 0.2;
        context.beginPath();
        context.moveTo(from[0], from[1]);
        context.quadraticCurveTo(control[0], control[1], to[0], to[1]);
        context.stroke();
        context.restore();

        const travel = (motion * 0.06 + route.phase) % 1;
        const [markerX, markerY] = routePoint(route, travel);
        const x = mapLeft + markerX * mapWidth;
        const y = mapTop + markerY * mapHeight;
        context.fillStyle = route.color;
        context.globalAlpha = 0.9;
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        // smaller on phones so the drawings never crowd the headline
        const size = width < 640 ? 0.72 : 1;
        if (route.phase === 0) drawSprite(context, sprites.van, x, y - 2, SPRITES.van.height * size);
        // the plane floats a little above its route and bobs gently
        if (route.phase === 0.34) drawSprite(context, sprites.plane, x, y - 6 + Math.sin(motion * 1.8) * 2.5, SPRITES.plane.height * size);
        if (route.phase === 0.67) drawSprite(context, sprites.parcel, x, y - 2, SPRITES.parcel.height * size);
      });

      animationFrame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
