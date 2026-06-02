import type { LatLngBoundsExpression } from "leaflet";

export const KANSAI_BOUNDS = {
  minLat: 33.4,
  maxLat: 35.75,
  minLon: 134.0,
  maxLon: 136.5,
};

export const KANSAI_CENTER: [number, number] = [34.7, 135.5];
export const KANSAI_DEFAULT_ZOOM = 9;

/** Leaflet maxBounds: [[swLat, swLon], [neLat, neLon]] */
export const KANSAI_MAX_BOUNDS: LatLngBoundsExpression = [
  [KANSAI_BOUNDS.minLat, KANSAI_BOUNDS.minLon],
  [KANSAI_BOUNDS.maxLat, KANSAI_BOUNDS.maxLon],
];

export function isInKansai(lat: number, lon: number): boolean {
  return (
    lat >= KANSAI_BOUNDS.minLat &&
    lat <= KANSAI_BOUNDS.maxLat &&
    lon >= KANSAI_BOUNDS.minLon &&
    lon <= KANSAI_BOUNDS.maxLon
  );
}

/** Nominatim viewbox string for Kansai */
export const KANSAI_VIEWBOX = `${KANSAI_BOUNDS.minLon},${KANSAI_BOUNDS.maxLat},${KANSAI_BOUNDS.maxLon},${KANSAI_BOUNDS.minLat}`;
