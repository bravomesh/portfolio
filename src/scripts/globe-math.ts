import { geoInterpolate } from 'd3-geo';
import type { View } from '../data/site.ts';

export const unionCountries = (ps: { countries: string[] }[]) => new Set(ps.flatMap((p) => p.countries));

// Great-circle path for the centre, geometric (constant-feel) zoom for the scale.
export function interpolateView(a: View, b: View) {
  const centre = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  return (t: number): View => {
    if (t <= 0) return a;
    const [lon, lat] = centre(t);
    return { lon, lat, scale: a.scale * Math.pow(b.scale / a.scale, t) };
  };
}
