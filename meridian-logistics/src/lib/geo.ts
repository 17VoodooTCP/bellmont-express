/* Geography for the tracking map: great-circle routes, distances, bearings
   and where a shipment should be drawn. Pure functions, no map library. */

export type Point = { lat: number; lng: number };

const RAD = Math.PI / 180;
const EARTH_MI = 3958.8;

/** A stored point is usable unless missing or the 0,0 "unknown" placeholder. */
export const hasCoords = (p?: Partial<Point> | null): p is Point =>
  !!p &&
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  !(Math.abs(p.lat!) < 0.01 && Math.abs(p.lng!) < 0.01);

/** Great-circle distance in miles. */
export function distanceMi(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

const toVec = (p: Point) => {
  const la = p.lat * RAD;
  const lo = p.lng * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)] as const;
};

/** Point a fraction `t` of the way along the great circle from a to b. */
export function interpolate(a: Point, b: Point, t: number): Point {
  const va = toVec(a);
  const vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-9) return { ...a };
  const s = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / s;
  const k2 = Math.sin(t * omega) / s;
  const x = k1 * va[0] + k2 * vb[0];
  const y = k1 * va[1] + k2 * vb[1];
  const z = k1 * va[2] + k2 * vb[2];
  return { lat: Math.atan2(z, Math.hypot(x, y)) / RAD, lng: Math.atan2(y, x) / RAD };
}

/**
 * The great circle from a to b as a polyline. Longitudes are unwrapped so a
 * route across the date line draws as one continuous line instead of a
 * stroke across the whole world.
 */
export function greatCircle(a: Point, b: Point, steps = 96): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = interpolate(a, b, i / steps);
    if (out.length) {
      const prev = out[out.length - 1]!.lng;
      while (p.lng - prev > 180) p.lng -= 360;
      while (p.lng - prev < -180) p.lng += 360;
    }
    out.push(p);
  }
  return out;
}

/** Initial compass bearing from a to b, degrees clockwise from north. */
export function bearing(a: Point, b: Point): number {
  const la1 = a.lat * RAD;
  const la2 = b.lat * RAD;
  const dLo = (b.lng - a.lng) * RAD;
  const y = Math.sin(dLo) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLo);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/* ── City lookups ─────────────────────────────────────────────────────── */

/** A place as the geocoder understood it: where, and its full name. */
export type Place = Point & { label: string };

const cache = new Map<string, Promise<Place | null>>();

/**
 * Look a place name up (OpenStreetMap Nominatim), cached per page. `label`
 * is the full name it matched, e.g. "Stafford, Fort Bend County, Texas,
 * United States", so a person can see it picked the right place.
 * Resolves null when nothing matches; rejects only if the service itself
 * couldn't be reached, so callers can tell "no such place" from "offline".
 */
export function lookupPlace(place?: string): Promise<Place | null> {
  const q = place?.trim();
  if (!q) return Promise.resolve(null);
  const key = q.toLowerCase();
  let hit = cache.get(key);
  if (!hit) {
    hit = fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { Accept: "application/json" } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`lookup failed (${r.status})`);
        return r.json() as Promise<{ lat: string; lon: string; display_name?: string }[]>;
      })
      .then((d) =>
        d?.[0] ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), label: d[0].display_name ?? q } : null,
      );
    /* A failed lookup isn't an answer; let the next call try again. */
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

/** Coordinates for a place name, or null if unknown or unreachable. */
export function geocode(place?: string): Promise<Point | null> {
  return lookupPlace(place).catch(() => null);
}

/**
 * Where a stored place really is. Stored coordinates win, unless the city
 * was edited later and the old coordinates are now far (>75 mi) from it.
 */
export async function locate(place?: Partial<Point> & { city?: string }): Promise<Point | null> {
  const stored = hasCoords(place) ? { lat: place.lat, lng: place.lng } : null;
  if (!place?.city?.trim()) return stored;
  const found = await geocode(place.city);
  if (stored && (!found || distanceMi(stored, found) <= 75)) return stored;
  return found ?? stored;
}
