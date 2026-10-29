import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unionCountries, interpolateView } from '../src/scripts/globe-math.ts';
import { platforms } from '../src/data/site.ts';

test('platforms cover 26 unique countries and 11 languages', () => {
  assert.equal(unionCountries(platforms).size, 26);
  assert.equal(new Set(platforms.flatMap((p) => p.languages)).size, 11);
});

test('interpolateView hits endpoints and zooms geometrically', () => {
  const a = { lon: 0, lat: 0, scale: 1 };
  const b = { lon: 90, lat: 0, scale: 4 };
  const f = interpolateView(a, b);
  assert.deepEqual(f(0), a);
  const end = f(1);
  assert.ok(Math.abs(end.lon - 90) < 1e-9 && Math.abs(end.scale - 4) < 1e-9);
  assert.ok(Math.abs(f(0.5).scale - 2) < 1e-9); // geometric mean, not 2.5
  assert.ok(Math.abs(f(0.5).lon - 45) < 1e-6);
});
