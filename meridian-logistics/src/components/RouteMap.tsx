"use client";

import { useEffect, useRef } from "react";
import { STATUS_LABEL, STATUS_PROGRESS, type Shipment } from "@/lib/api";
import "leaflet/dist/leaflet.css";

const hasCoords = (p?: { lat: number; lng: number }) =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
  !(Math.abs(p.lat) < 0.01 && Math.abs(p.lng) < 0.01);

type Point = { lat: number; lng: number };

const distanceKm = (a: Point, b: Point) => {
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * 111;
  const dLng = (b.lng - a.lng) * 111 * Math.cos(lat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

const escapeHtml = (value?: string) =>
  (value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;',
  }[char] ?? char));

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
  const stageLabel = shipment.status === "delivered"
    ? shipment.destination.city
    : STATUS_LABEL[shipment.status];

  useEffect(() => {
    let dead = false;
    // Leaflet touches `window`, so it loads client-side only
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current) return;

      const geocodeCache = new Map<string, Point | null>();
      const resolve = async (p: Shipment["origin"]) => {
        const city = p?.city?.trim();
        if (!city && hasCoords(p)) return { lat: p.lat, lng: p.lng };
        if (!city) return null;
        const key = city.toLowerCase();
        let located = geocodeCache.get(key);
        if (located === undefined) {
          located = await geocode(city);
          geocodeCache.set(key, located);
        }
        // Existing shipments can retain coordinates from an earlier city edit.
        if (located && (!hasCoords(p) || distanceKm(p, located) > 75)) return located;
        return hasCoords(p) ? { lat: p.lat, lng: p.lng } : located;
      };

      const [o, c, d] = await Promise.all([
        resolve(shipment.origin),
        resolve(shipment.currentLocation),
        resolve(shipment.destination),
      ]);
      if (dead || !box.current) return;

      // Status is the authoritative checkpoint for the visual tracker. This
      // keeps the map and route graphic on the same stop instead of letting a
      // stale currentLocation or a client animation send the vessel to the end.
      const statusProgress = STATUS_PROGRESS[shipment.status] ?? 0;
      const stage = o && d
        ? {
            lat: o.lat + (d.lat - o.lat) * statusProgress,
            lng: o.lng + (d.lng - o.lng) * statusProgress,
          }
        : c;
      const pts = [o, stage, d].filter(Boolean) as Point[];
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

      const vessel = L.divIcon({
        className: "bellmont-vessel-icon",
        iconSize: [58, 58],
        iconAnchor: [29, 29],
        html: `<div style="position:relative;width:58px;height:58px">
          <div style="position:absolute;inset:3px;border-radius:50%;background:#61735a22;box-shadow:0 0 0 1px #61735a33;animation:mPulse 2.4s ease-out infinite"></div>
          <div style="position:absolute;inset:10px;border-radius:50%;background:#fbfbf8;border:1px solid #d9dfd5;box-shadow:0 5px 16px #14170f33;display:grid;place-items:center">
            <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
              <path d="M5 23h30l-4 6H10l-5-6Z" fill="#14170f"/>
              <path d="M9 23h22l-2 4H11l-2-4Z" fill="#61735a"/>
              <rect x="12" y="16" width="5" height="7" rx=".7" fill="#14170f"/>
              <rect x="18" y="14" width="5" height="9" rx=".7" fill="#61735a"/>
              <rect x="24" y="16" width="5" height="7" rx=".7" fill="#14170f"/>
              <path d="M8 30h21" stroke="#61735a" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>`,
      });

      if (o) L.marker([o.lat, o.lng], { icon: dot("#14170f") }).addTo(map).bindPopup(`<b>Origin</b><br>${escapeHtml(shipment.origin.city)}`);
      if (d) L.marker([d.lat, d.lng], { icon: dot("#61735a", true) }).addTo(map).bindPopup(`<b>Destination</b><br>${escapeHtml(shipment.destination.city)}`);
      if (stage) {
        L.marker([stage.lat, stage.lng], { icon: vessel, zIndexOffset: 500 })
          .addTo(map)
          .bindPopup(`<b>Live position</b><br>${escapeHtml(stageLabel)}`);
      }

      // Planned route, then the traveled leg highlighted to the live vessel.
      if (o && d) L.polyline([[o.lat, o.lng], [d.lat, d.lng]], {
        color: "#aeb8c0", weight: 3, dashArray: "5 11", opacity: 0.75,
      }).addTo(map);
      if (o && stage) {
        L.polyline([[o.lat, o.lng], [stage.lat, stage.lng]], {
          color: "#61735a", weight: 5, opacity: 0.95,
        }).addTo(map);
      }

      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [46, 46] });
      window.setTimeout(() => map.invalidateSize(), 80);
      cleanup = () => {
        map.remove();
      };
    })();

    return () => { dead = true; cleanup?.(); };
  }, [shipment]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#eef3ed]">
      <div ref={box} className="h-[420px] w-full overflow-hidden rounded-2xl" aria-label="Live shipment map" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#61735a]">Live position</p>
        <p className="mt-0.5 text-xs font-semibold text-[#14170f]">{stageLabel}</p>
      </div>
      <style>{`@keyframes mPulse{0%{transform:scale(.6);opacity:.4}100%{transform:scale(1.8);opacity:0}}`}</style>
    </div>
  );
}
