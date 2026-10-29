import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import world110 from 'world-atlas/countries-110m.json';
import type { View } from '../data/site';
import { interpolateView } from './globe-math';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Geo = { countries: Feature<Geometry, { name: string }>[]; land: GeoPermissibleObjects; borders: GeoPermissibleObjects };

function build(json: unknown): Geo {
  const topo = json as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const countries = (feature(topo, topo.objects.countries) as unknown as { features: Geo['countries'] }).features;
  // world-atlas leaves Somaliland without an ISO id; draw it as part of Somalia.
  for (const f of countries) if (!f.id && f.properties.name === 'Somaliland') f.id = '706';
  return {
    countries,
    land: { type: 'FeatureCollection', features: countries } as GeoPermissibleObjects,
    borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
  };
}

const lo = build(world110);
let hi: Geo | null = null;
let hiLoading: Promise<void> | null = null;

/** Lazy-load the 1:50m map for close-up views. */
export function loadHiRes() {
  hiLoading ??= import('world-atlas/countries-50m.json').then((m) => {
    hi = build(m.default);
    dispatchEvent(new Event('globe:hires'));
  });
  return hiLoading;
}

const graticule = geoGraticule10();
const sphere = { type: 'Sphere' } as GeoPermissibleObjects;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out

export type Globe = {
  setView(v: View): void;
  flyTo(v: View, ms?: number): Promise<void>;
  setActive(ids: Set<string>): void;
  spin(on: boolean): void;
  destroy(): void;
};

export function createGlobe(
  canvas: HTMLCanvasElement,
  opts: { view: View; highlight: Set<string>; beacons: [number, number][]; detail?: boolean },
): Globe {
  const ctx = canvas.getContext('2d')!;
  const layer = document.createElement('canvas'); // cached map, re-rendered only when dirty
  const lctx = layer.getContext('2d')!;
  const projection = geoOrthographic().clipAngle(90).precision(0.6);
  const path = geoPath(projection, lctx);

  let base = opts.view; // resting view (drift oscillates around it)
  let view = base;
  let activeIds = new Set<string>();
  let drifting = false;
  let flight: { f: (t: number) => View; t0: number; ms: number; done: () => void } | null = null;
  let w = 0, h = 0, r = 0;
  let visible = false;
  let dirty = true;
  let raf = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let c: Record<string, string> = {};

  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    c = {
      ocean: v('--ocean'), land: v('--land'), hi: v('--land-hi'), accent: v('--accent'), fg: v('--fg'),
      bg: v('--bg'), border: v('--border-map'), grat: v('--grat'), rim: v('--line-2'),
      light: document.documentElement.dataset.theme === 'light' ? '1' : '',
    };
  };

  const resize = () => {
    const b = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = b.width;
    h = b.height;
    for (const [cv, cx] of [[canvas, ctx], [layer, lctx]] as const) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    r = (Math.min(w, h) / 2) * 0.9;
    invalidate();
  };

  function drawMap() {
    const g = opts.detail && hi ? hi : lo;
    const R = r * view.scale;
    const cx = w / 2, cy = h / 2;
    projection.translate([cx, cy]).scale(R).rotate([-view.lon, -view.lat]);
    const x = lctx;
    x.clearRect(0, 0, w, h);

    if (R < Math.max(w, h)) {
      const halo = x.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.14);
      halo.addColorStop(0, c.accent + '33');
      halo.addColorStop(1, 'transparent');
      x.fillStyle = halo;
      x.beginPath();
      x.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
      x.fill();
    }

    const fill = (o: GeoPermissibleObjects | GeoPermissibleObjects[], color: string | CanvasGradient, alpha = 1) => {
      x.beginPath();
      (Array.isArray(o) ? o : [o]).forEach((f) => path(f));
      x.globalAlpha = alpha;
      x.fillStyle = color;
      x.fill();
      x.globalAlpha = 1;
    };
    const stroke = (o: GeoPermissibleObjects, color: string, width: number) => {
      x.beginPath();
      path(o);
      x.strokeStyle = color;
      x.lineWidth = width;
      x.stroke();
    };

    fill(sphere, c.ocean);
    stroke(graticule, c.grat, 1);
    fill(g.land, c.land);
    fill(g.countries.filter((f) => opts.highlight.has(String(f.id))), c.hi);
    if (activeIds.size) fill(g.countries.filter((f) => activeIds.has(String(f.id))), c.accent, 0.9);
    stroke(g.borders, c.border, 0.6);

    const shade = x.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    shade.addColorStop(0, c.light ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)');
    shade.addColorStop(1, c.light ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)');
    fill(sphere, shade);
    stroke(sphere, c.rim, 1);
  }

  function drawBeacons(t: number) {
    opts.beacons.forEach((b, i) => {
      if (geoDistance(b, [view.lon, view.lat]) > Math.PI / 2 - 0.08) return;
      const p = projection(b);
      if (!p) return;
      const phase = reduced ? 0.5 : (t / 1800 + i * 0.23) % 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4 + phase * 22, 0, Math.PI * 2);
      ctx.strokeStyle = c.fg;
      ctx.globalAlpha = (1 - phase) * 0.8;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.6, 0, Math.PI * 2);
      ctx.fillStyle = c.accent;
      ctx.strokeStyle = c.bg;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  }

  function frame(t: number) {
    raf = 0;
    if (!visible || !w) return;
    if (flight) {
      const p = Math.min(1, (t - flight.t0) / flight.ms);
      view = flight.f(ease(p));
      dirty = true;
      if (p === 1) {
        base = view;
        flight.done();
        flight = null;
      }
    } else if (drifting && !reduced) {
      pointer.sx += (pointer.x - pointer.sx) * 0.04;
      pointer.sy += (pointer.y - pointer.sy) * 0.04;
      view = {
        lon: base.lon + Math.sin(t / 9000) * 24 + pointer.sx * 12,
        lat: base.lat + Math.cos(t / 11000) * 6 - pointer.sy * 8,
        scale: base.scale,
      };
      dirty = true;
    }
    if (dirty) {
      drawMap();
      dirty = false;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(layer, 0, 0, w, h);
    drawBeacons(t);
    if (!reduced || flight) raf = requestAnimationFrame(frame);
  }

  function invalidate() {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    invalidate();
  });
  const ro = new ResizeObserver(resize);
  const onTheme = () => {
    readColors();
    invalidate();
  };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  };

  readColors();
  io.observe(canvas);
  ro.observe(canvas);
  addEventListener('themechange', onTheme);
  if (opts.detail) addEventListener('globe:hires', invalidate);

  return {
    setView(v) {
      flight = null;
      base = view = v;
      invalidate();
    },
    flyTo(v, ms = 1400) {
      flight?.done();
      if (reduced || ms <= 0) {
        base = view = v;
        flight = null;
        invalidate();
        return Promise.resolve();
      }
      return new Promise((done) => {
        flight = { f: interpolateView(view, v), t0: performance.now(), ms, done };
        invalidate();
      });
    },
    setActive(ids) {
      activeIds = ids;
      invalidate();
    },
    spin(on) {
      drifting = on;
      if (on) addEventListener('pointermove', onPointer, { passive: true });
      else removeEventListener('pointermove', onPointer);
      invalidate();
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener('themechange', onTheme);
      removeEventListener('globe:hires', invalidate);
      removeEventListener('pointermove', onPointer);
    },
  };
}
