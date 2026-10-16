import { Logger } from '@nestjs/common';

const logger = new Logger('Geocode');

export interface GeoPoint {
  city: string;
  lat: number;
  lng: number;
}

/**
 * City name to coordinates, via OpenStreetMap's Nominatim — the same source
 * the admin console already uses. Best effort: on any failure the point keeps
 * 0,0 and the admin can correct it, rather than an approval failing because
 * a free geocoder was slow. Nominatim asks for an identifying User-Agent and
 * light use; approvals are a handful a day.
 */
export async function geocodeCity(city: string): Promise<GeoPoint> {
  const point: GeoPoint = { city, lat: 0, lng: 0 };
  if (!city.trim()) return point;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BellmontExpress/1.0 (support@bellmontexpress.com)',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return point;
    const hits = (await res.json()) as { lat: string; lon: string }[];
    if (hits[0])
      return { city, lat: Number(hits[0].lat), lng: Number(hits[0].lon) };
  } catch (err) {
    logger.warn(`Could not geocode "${city}": ${(err as Error).message}`);
  }
  return point;
}
