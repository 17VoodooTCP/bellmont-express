"use client";

import { useEffect, useRef } from "react";
import type { Shipment } from "@/lib/api";
import "leaflet/dist/leaflet.css";

const hasCoords = (p?: { lat: number; lng: number }) =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
  !(Math.abs(p.lat) < 0.01 && Math.abs(p.lng) < 0.01);

/* Free geocoding fallback for legacy records saved without coordinates */
async function geocode(city?: string) {
  if (!city?.trim()) return null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city.trim())}&format=json&limit=1`,
      { headers: { Accept: "application/json" } }
    );
    const d = await r.json();
    if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch { /* keep null */ }
  return null;
}

export default function RouteMap({ shipment }: { shipment: Shipment }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    // Leaflet touches `window`, so it loads client-side only
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current) return;

      const resolve = async (p: Shipment["origin"]) =>
        hasCoords(p) ? { lat: p.lat, lng: p.lng } : (await geocode(p?.city)) ?? null;

      const [o, c, d] = await Promise.all([
        resolve(shipment.origin),
        resolve(shipment.currentLocation),
        resolve(shipment.destination),
      ]);
      if (dead || !box.current) return;

      const pts = [o, c, d].filter(Boolean) as { lat: number; lng: number }[];
      if (pts.length < 2) return;

      const map = L.map(box.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const dot = (bg: string, ring = false, pulse = false) =>
        L.divIcon({
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<div style="position:relative;width:22px;height:22px">
            ${pulse ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${bg};opacity:.25;animation:mPulse 2s ease-out infinite"></div>` : ""}
            <div style="position:absolute;inset:2px;border-radius:50%;${ring ? `background:white;border:4px solid ${bg}` : `background:${bg};border:3px solid white`};box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>
          </div>`,
        });

      if (o) L.marker([o.lat, o.lng], { icon: dot("#0a0a0a") }).addTo(map).bindPopup(`<b>Origin</b><br>${shipment.origin.city}`);
      if (d) L.marker([d.lat, d.lng], { icon: dot("#61735a", true) }).addTo(map).bindPopup(`<b>Destination</b><br>${shipment.destination.city}`);
      if (c) L.marker([c.lat, c.lng], { icon: dot("#61735a", false, true), zIndexOffset: 500 }).addTo(map).bindPopup(`<b>Current</b><br>${shipment.currentLocation.city}`);

      // full route, then the traveled leg highlighted
      L.polyline(pts.map((p) => [p.lat, p.lng]), {
        color: "#9aa4b0", weight: 2.5, dashArray: "6 10", opacity: 0.8,
      }).addTo(map);
      if (o && c) {
        L.polyline([[o.lat, o.lng], [c.lat, c.lng]], {
          color: "#61735a", weight: 4, opacity: 0.95,
        }).addTo(map);
      }

      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [46, 46] });
      cleanup = () => map.remove();
    })();

    return () => { dead = true; cleanup?.(); };
  }, [shipment]);

  return (
    <div className="relative">
      <div ref={box} className="h-[420px] w-full overflow-hidden rounded-2xl" aria-label="Live shipment map" />
      <style>{`@keyframes mPulse{0%{transform:scale(.6);opacity:.4}100%{transform:scale(1.8);opacity:0}}`}</style>
    </div>
  );
}
