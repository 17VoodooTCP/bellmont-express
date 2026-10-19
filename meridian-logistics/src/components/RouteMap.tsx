"use client";

/* The tracking map and route summary.

   Base imagery is NASA's (EOSDIS GIBS: free, public, no key): Blue Marble for
   a cloud-free satellite view, Black Marble for night lights. NASA tiles stop
   at zoom 8, so a Streets view (OpenStreetMap) is offered for close detail.

   The route is the real great circle: travelled leg solid and lit, remaining
   leg fine and dashed. The live position is a heading beacon placed at the
   shipment's actual current city, pointing on toward the destination. */

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { STATUS_LABEL, STATUS_PROGRESS, type Shipment } from "@/lib/api";
import { bearing, distanceMi, greatCircle, interpolate, locate, type Point } from "@/lib/geo";
import "leaflet/dist/leaflet.css";

type LayerId = "satellite" | "night" | "streets";

const NASA = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const NASA_CREDIT = 'Imagery <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA EOSDIS GIBS</a>';

const LAYERS: Record<LayerId, { label: string; url: string; nativeMax: number; maxZoom: number; attribution: string; dark: boolean }> = {
  satellite: {
    label: "Satellite",
    url: `${NASA}/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
    nativeMax: 8,
    maxZoom: 10,
    attribution: `${NASA_CREDIT} · Blue Marble`,
    dark: true,
  },
  night: {
    label: "Night",
    url: `${NASA}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
    nativeMax: 8,
    maxZoom: 10,
    attribution: `${NASA_CREDIT} · Black Marble`,
    dark: true,
  },
  streets: {
    label: "Streets",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    nativeMax: 19,
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    dark: false,
  },
};

const LAYER_KEY = "bellmont_map_layer";
const readLayer = (): LayerId => {
  try {
    const v = localStorage.getItem(LAYER_KEY);
    return v === "night" || v === "streets" ? v : "satellite";
  } catch {
    return "satellite";
  }
};

type Tone = "neutral" | "moving" | "held" | "done";
const toneOf = (s: Shipment["status"]): Tone =>
  s === "delivered" ? "done" : s === "on_hold" ? "held" : s === "pending" ? "neutral" : "moving";
const TONE_COLOR: Record<Tone, string> = { neutral: "#cbd5e1", moving: "#fca837", held: "#f87171", done: "#4ade80" };

const escapeHtml = (v?: string) =>
  (v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c] ?? c);

type Geometry = {
  origin: Point | null;
  destination: Point | null;
  position: Point | null;
  travelledMi: number | null;
  remainingMi: number | null;
  missing: string[];
};

/**
 * Where the shipment is, by status first and current city second: nothing
 * picked up is still at the origin, a delivery is at the destination, and in
 * between the beacon sits at the real current city. Only without one is it
 * placed along the route by status.
 */
function placeShipment(s: Shipment, o: Point | null, c: Point | null, d: Point | null): Point | null {
  if (s.status === "pending") return o ?? c;
  if (s.status === "delivered") return d ?? c;
  if (c) return c;
  if (o && d) return interpolate(o, d, STATUS_PROGRESS[s.status] ?? 0.5);
  return o ?? d;
}

const miles = (n: number) => `${Math.round(n).toLocaleString("en-US")} mi`;

export default function RouteMap({ shipment }: { shipment: Shipment }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const baseRef = useRef<Leaflet.TileLayer | null>(null);
  const restyle = useRef<((dark: boolean) => void) | null>(null);
  const [layer, setLayer] = useState<LayerId>("satellite");
  const [geo, setGeo] = useState<Geometry | null>(null);

  const tone = toneOf(shipment.status);
  const here =
    shipment.status === "delivered"
      ? shipment.destination?.city
      : shipment.status === "pending"
        ? shipment.origin?.city
        : shipment.currentLocation?.city || shipment.origin?.city;

  /* Remember the visitor's view; read after mount (storage isn't available
     during server rendering). */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from localStorage, an external store
    setLayer(readLayer());
  }, []);

  /* Build the map once per shipment. */
  useEffect(() => {
    let dead = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      const [o, c, d] = await Promise.all([
        locate(shipment.origin),
        locate(shipment.currentLocation),
        locate(shipment.destination),
      ]);
      if (dead || !box.current) return;

      const pos = placeShipment(shipment, o, c, d);
      const missing = [
        !o && shipment.origin?.city ? `origin “${shipment.origin.city}”` : "",
        !d && shipment.destination?.city ? `destination “${shipment.destination.city}”` : "",
      ].filter(Boolean);
      setGeo({
        origin: o,
        destination: d,
        position: pos,
        travelledMi: o && pos ? distanceMi(o, pos) : null,
        remainingMi: pos && d ? distanceMi(pos, d) : null,
        missing,
      });

      const pts = [o, pos, d].filter(Boolean) as Point[];
      if (!pts.length) return;

      const initial = LAYERS[readLayer()];
      const map = L.map(box.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
        worldCopyJump: true,
        maxZoom: initial.maxZoom,
      });
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.attributionControl.setPrefix(false);
      baseRef.current = L.tileLayer(initial.url, {
        maxNativeZoom: initial.nativeMax,
        maxZoom: initial.maxZoom,
        attribution: initial.attribution,
        crossOrigin: true,
      }).addTo(map);

      /* Route: great circles through the live position. */
      const travelledPath = o && pos ? greatCircle(o, pos) : [];
      const remainingPath = pos && d ? greatCircle(pos, d) : [];
      /* Keep the second leg's longitudes continuous with the first. */
      if (travelledPath.length && remainingPath.length) {
        const shift = travelledPath[travelledPath.length - 1]!.lng - remainingPath[0]!.lng;
        remainingPath.forEach((p) => (p.lng += shift));
      }
      const ll = (ps: Point[]) => ps.map((p) => [p.lat, p.lng] as [number, number]);

      const remaining = L.polyline(ll(remainingPath), { weight: 2, dashArray: "2 8", lineCap: "round", interactive: false }).addTo(map);
      const glow = L.polyline([], { weight: 10, opacity: 0.22, lineCap: "round", interactive: false }).addTo(map);
      const travelled = L.polyline([], { weight: 3.5, opacity: 1, lineCap: "round", interactive: false }).addTo(map);

      const label = (text: string, kind: string) =>
        `<span class="bx-label bx-label--${kind}"><b>${kind === "origin" ? "Origin" : "Destination"}</b>${escapeHtml(text)}</span>`;

      if (o) {
        L.marker([o.lat, o.lng], {
          interactive: false,
          icon: L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7], html: '<span class="bx-node bx-node--origin"></span>' }),
        })
          .bindTooltip(label(shipment.origin.city, "origin"), { permanent: true, direction: "left", offset: [-10, 0], className: "bx-tip" })
          .addTo(map);
      }
      const destLast = remainingPath[remainingPath.length - 1];
      if (d) {
        const at = destLast ?? d;
        L.marker([at.lat, at.lng], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            html: `<span class="bx-node bx-node--dest${tone === "done" ? " is-done" : ""}"></span>`,
          }),
        })
          .bindTooltip(label(shipment.destination.city, "dest"), { permanent: true, direction: "right", offset: [12, 0], className: "bx-tip" })
          .addTo(map);
      }

      /* The beacon: a heading arrow toward the destination (a check once
         delivered, a pause mark when held) with a slow radar pulse. */
      const glyph =
        tone === "done"
          ? '<path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#0b1020" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
          : tone === "held"
            ? '<path d="M9.5 7.5v9M14.5 7.5v9" stroke="#0b1020" stroke-width="2.6" stroke-linecap="round"/>'
            : '<path d="M12 5.5l5.5 12-5.5-3.2-5.5 3.2z" fill="#0b1020"/>';
      const heading = pos && d && tone !== "done" ? bearing(pos, d) : 0;
      const beacon =
        pos &&
        L.marker([o?.lat ?? pos.lat, o?.lng ?? pos.lng], {
          zIndexOffset: 1000,
          keyboard: false,
          title: `Current position: ${here ?? STATUS_LABEL[shipment.status]}`,
          icon: L.divIcon({
            className: "",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            html: `<div class="bx-beacon" style="--tone:${TONE_COLOR[tone]}">
                     <span class="bx-beacon__pulse"></span>
                     <span class="bx-beacon__core"><svg viewBox="0 0 24 24" width="22" height="22" style="transform:rotate(${tone === "moving" || tone === "neutral" ? heading : 0}deg)" aria-hidden="true">${glyph}</svg></span>
                   </div>`,
          }),
        }).addTo(map);

      /* Colours that read on dark imagery and on the light street map. */
      restyle.current = (dark: boolean) => {
        remaining.setStyle({ color: dark ? "#ffffff" : "#1e2950", opacity: dark ? 0.7 : 0.55 });
        glow.setStyle({ color: dark ? "#fca837" : "#49629d" });
        travelled.setStyle({ color: dark ? "#fcbf5b" : "#1e2950" });
        box.current?.classList.toggle("bx-dark", dark);
      };
      restyle.current(initial.dark);

      const settle = () => {
        glow.setLatLngs(ll(travelledPath));
        travelled.setLatLngs(ll(travelledPath));
        if (beacon && pos) {
          const end = travelledPath[travelledPath.length - 1] ?? pos;
          beacon.setLatLng([end.lat, end.lng]);
        }
      };
      if (!travelledPath.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settle();
        if (beacon && pos && !travelledPath.length) beacon.setLatLng([pos.lat, pos.lng]);
      } else {
        /* Draw the journey so far, the beacon riding its tip. */
        const DURATION = 1600;
        const start = performance.now();
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (now: number) => {
          if (dead) return;
          const t = Math.min(1, (now - start) / DURATION);
          const n = Math.max(1, Math.round(ease(t) * (travelledPath.length - 1)));
          const part = ll(travelledPath.slice(0, n + 1));
          glow.setLatLngs(part);
          travelled.setLatLngs(part);
          beacon?.setLatLng(part[part.length - 1]!);
          if (t < 1) frame = requestAnimationFrame(step);
          else settle();
        };
        frame = requestAnimationFrame(step);
      }

      const all = [...travelledPath, ...remainingPath];
      const bounds = L.latLngBounds((all.length ? all : pts).map((p) => [p.lat, p.lng] as [number, number]));
      const fit = () => {
        const narrow = (box.current?.clientWidth ?? 800) < 560;
        map.fitBounds(bounds, { padding: narrow ? [36, 36] : [70, 70], maxZoom: 9 });
      };
      fit();

      /* City labels need room. When the origin and destination sit close
         on screen (a short route, a phone, zoomed out) they would pile onto
         each other and the beacon, so they hide; the summary below names
         both cities anyway. Re-checked as the visitor zooms. */
      const crowd = () => {
        const marks = [o, destLast ?? d].filter(Boolean) as Point[];
        const px = marks.map((p) => map.latLngToContainerPoint([p.lat, p.lng]));
        const close = px.length === 2 && px[0]!.distanceTo(px[1]!) < 260;
        box.current?.classList.toggle("bx-crowded", close);
      };
      crowd();
      map.on("zoomend resize", crowd);
      /* The box can still be settling into its final size on the first
         frame; measure again once it has, so zoom and labels use real sizes. */
      const settleSize = window.setTimeout(() => {
        map.invalidateSize();
        fit();
        crowd();
      }, 120);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settleSize);
        map.remove();
        mapRef.current = null;
        baseRef.current = null;
        restyle.current = null;
      };
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [shipment, tone, here]);

  /* Switch imagery without rebuilding the route. */
  const choose = (id: LayerId) => {
    setLayer(id);
    try {
      localStorage.setItem(LAYER_KEY, id);
    } catch {
      /* remembered for this page only */
    }
    const map = mapRef.current;
    const base = baseRef.current;
    if (!map || !base) return;
    const spec = LAYERS[id];
    map.setMaxZoom(spec.maxZoom);
    if (map.getZoom() > spec.maxZoom) map.setZoom(spec.maxZoom);
    map.attributionControl.removeAttribution(base.getAttribution?.() ?? "");
    base.options.maxNativeZoom = spec.nativeMax;
    base.options.maxZoom = spec.maxZoom;
    base.options.attribution = spec.attribution;
    map.attributionControl.addAttribution(spec.attribution);
    base.setUrl(spec.url);
    restyle.current?.(spec.dark);
  };

  const eta = useMemo(
    () =>
      shipment.estimatedDelivery
        ? new Date(shipment.estimatedDelivery).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC", // stored as UTC midnight
          })
        : null,
    [shipment.estimatedDelivery],
  );

  const total = geo?.travelledMi != null && geo.remainingMi != null ? geo.travelledMi + geo.remainingMi : null;
  const pct =
    shipment.status === "delivered"
      ? 100
      : shipment.status === "pending"
        ? 0
        : total
          ? Math.round(((geo!.travelledMi ?? 0) / total) * 100)
          : Math.round((STATUS_PROGRESS[shipment.status] ?? 0) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1b2440] bg-[#0b1020] text-white">
      {/* Map */}
      <div className="relative">
        <div ref={box} className="bx-map h-[360px] w-full bg-[#0b1020] sm:h-[460px]" aria-label="Shipment route map" />

        {/* Live status */}
        {/* Hidden on phones, where it would collide with the view switch;
            the status is right above the map there. */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] hidden max-w-[55%] items-center sm:flex gap-2.5 rounded-full border border-white/15 bg-[#0b1020]/75 py-1.5 pl-2.5 pr-4 text-[13px] shadow-lg backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {tone === "moving" && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: TONE_COLOR[tone] }} />}
            <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
          </span>
          <span className="truncate">
            <b className="font-semibold">{STATUS_LABEL[shipment.status]}</b>
            {here && <span className="text-white/70"> · {here}</span>}
          </span>
        </div>

        {/* View switch */}
        <div className="absolute right-3 top-3 z-[500] flex rounded-full border border-white/15 bg-[#0b1020]/75 p-1 text-xs shadow-lg backdrop-blur-md" role="radiogroup" aria-label="Map view">
          {(Object.keys(LAYERS) as LayerId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={layer === id}
              onClick={() => choose(id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${layer === id ? "bg-white text-[#0b1020]" : "text-white/75 hover:text-white"}`}
            >
              {LAYERS[id].label}
            </button>
          ))}
        </div>

        {geo && geo.missing.length > 0 && (
          <p className="absolute bottom-3 left-3 right-14 z-[500] rounded-xl border border-amber-300/30 bg-[#0b1020]/85 px-3.5 py-2.5 text-xs text-amber-100 backdrop-blur-md sm:right-auto sm:max-w-md">
            We couldn&rsquo;t place the {geo.missing.join(" or the ")} on the map. The route is shown as far as we can locate it.
          </p>
        )}
      </div>

      {/* Route summary */}
      <div className="grid gap-5 border-t border-white/10 px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">From</span>
              <span className="font-semibold">{shipment.origin?.city || "—"}</span>
            </span>
            <span className="min-w-0 truncate text-right">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">To</span>
              <span className="font-semibold">{shipment.destination?.city || "—"}</span>
            </span>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Journey progress">
            <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: TONE_COLOR[tone] }} />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b1020] shadow"
              style={{ left: `${pct}%`, background: TONE_COLOR[tone] }}
            />
          </div>
          <p className="mt-2 text-xs text-white/55">{pct}% of the journey complete</p>
        </div>

        <dl className="grid grid-cols-3 gap-5 text-sm md:flex md:gap-8">
          {[
            ["Distance", total != null ? miles(total) : "—"],
            ["Remaining", geo?.remainingMi != null ? (shipment.status === "delivered" ? "0 mi" : miles(geo.remainingMi)) : "—"],
            [shipment.status === "delivered" ? "Delivered" : "ETA", eta ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{k}</dt>
              <dd className="mt-0.5 truncate font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <style>{`
        /* Leaflet's light-grey background shows through the hairline gaps
           browsers leave between scaled tiles; match it to the imagery and
           overlap tiles by half a pixel. */
        .bx-map.leaflet-container{background:#0b1020}
        .bx-map:not(.bx-dark).leaflet-container{background:#e9edf3}
        .bx-map .leaflet-tile-container img.leaflet-tile{width:256.5px!important;height:256.5px!important}
        .bx-map .leaflet-control-attribution{background:rgba(11,16,32,.6);color:rgba(255,255,255,.7);font-size:10px;backdrop-filter:blur(6px)}
        .bx-map .leaflet-control-attribution a{color:#fff}
        .bx-map:not(.bx-dark) .leaflet-control-attribution{background:rgba(255,255,255,.8);color:#334155}
        .bx-map:not(.bx-dark) .leaflet-control-attribution a{color:#1e2950}
        .bx-map .leaflet-bar a{background:rgba(11,16,32,.75);color:#fff;border-color:rgba(255,255,255,.12);backdrop-filter:blur(6px)}
        .bx-map .leaflet-bar a:hover{background:#0b1020}
        .bx-map:not(.bx-dark) .leaflet-tile-pane{filter:saturate(.75) contrast(1.02)}
        .bx-node{display:block;border-radius:50%}
        .bx-node--origin{width:14px;height:14px;background:#fff;border:3px solid #1e2950;box-shadow:0 0 0 3px rgba(255,255,255,.35),0 2px 8px rgba(0,0,0,.5)}
        .bx-node--dest{width:18px;height:18px;border:2px solid #fff;background:rgba(11,16,32,.55);box-shadow:0 0 0 4px rgba(255,255,255,.18),0 2px 8px rgba(0,0,0,.5);position:relative}
        .bx-node--dest::after{content:"";position:absolute;inset:4px;border-radius:50%;background:#fff;opacity:.85}
        .bx-node--dest.is-done{border-color:#4ade80}.bx-node--dest.is-done::after{background:#4ade80}
        .bx-tip{background:transparent;border:0;box-shadow:none;padding:0;transition:opacity .2s}
        /* !important: Leaflet writes the tooltip's opacity inline. */
        .bx-map.bx-crowded .bx-tip{opacity:0!important;visibility:hidden}
        .bx-tip::before{display:none}
        .bx-label{display:flex;flex-direction:column;gap:1px;padding:5px 10px;border-radius:10px;background:rgba(11,16,32,.78);color:#fff;font:600 12px/1.25 Inter,system-ui,sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(0,0,0,.35)}
        .bx-label b{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
        .bx-beacon{position:relative;width:44px;height:44px}
        .bx-beacon__pulse{position:absolute;inset:0;border-radius:50%;background:var(--tone);opacity:.35;animation:bxPulse 2.2s cubic-bezier(.2,.6,.4,1) infinite}
        .bx-beacon__core{position:absolute;inset:9px;display:grid;place-items:center;border-radius:50%;background:var(--tone);box-shadow:0 0 0 3px rgba(255,255,255,.9),0 0 18px var(--tone),0 4px 12px rgba(0,0,0,.45)}
        @keyframes bxPulse{0%{transform:scale(.45);opacity:.55}100%{transform:scale(1.35);opacity:0}}
        @media (prefers-reduced-motion: reduce){.bx-beacon__pulse{animation:none;opacity:.2}}
      `}</style>
    </div>
  );
}
