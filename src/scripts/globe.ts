import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import world from 'world-atlas/countries-110m.json';
import type { View } from '../data/site';
import { interpolateView } from './globe-math';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topo, topo.objects.countries) as unknown as { features: Feature<Geometry, { name: string }>[] }).features;
// world-atlas leaves Somaliland without an ISO id; draw it as part of Somalia.
for (const f of countries) if (!f.id && f.properties.name === 'Somaliland') f.id = '706';
const land = { type: 'FeatureCollection', features: countries } as GeoPermissibleObjects;
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
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
  opts: { view: View; highlight: Set<string>; beacons: [number, number][] },
): Globe {
  const ctx = canvas.getContext('2d')!;
  const projection = geoOrthographic().clipAngle(90).precision(0.6);
  const path = geoPath(projection, ctx);
  const highlighted = countries.filter((f) => opts.highlight.has(String(f.id)));

  let base = opts.view; // resting view (drift oscillates around it)
  let view = base;
  let active: typeof countries = [];
  let drifting = false;
  let flight: { f: (t: number) => View; t0: number; ms: number; done: () => void } | null = null;
  let w = 0, h = 0, r = 0;
  let visible = false;
  let raf = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let c: Record<string, string> = {};

  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    c = {
      ocean: v('--ocean'), land: v('--land'), hi: v('--land-hi'), accent: v('--accent'),
      border: v('--border-map'), grat: v('--grat'), rim: v('--line-2'),
      light: document.documentElement.dataset.theme === 'light' ? '1' : '',
    };
  };

  const resize = () => {
    const b = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = b.width;
    h = b.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    r = (Math.min(w, h) / 2) * 0.9;
    kick();
  };

  function draw(t: number) {
    const R = r * view.scale;
    const cx = w / 2, cy = h / 2;
    projection.translate([cx, cy]).scale(R).rotate([-view.lon, -view.lat]);
    ctx.clearRect(0, 0, w, h);

    // Atmosphere halo
    if (R < Math.max(w, h)) {
      const g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.14);
      g.addColorStop(0, c.accent + '33');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    path(sphere);
    ctx.fillStyle = c.ocean;
    ctx.fill();

    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = c.grat;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    path(land);
    ctx.fillStyle = c.land;
    ctx.fill();

    ctx.beginPath();
    highlighted.forEach((f) => path(f));
    ctx.fillStyle = c.hi;
    ctx.fill();

    if (active.length) {
      ctx.beginPath();
      active.forEach((f) => path(f));
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    path(borders);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Terminator-style shading for depth
    const shade = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    shade.addColorStop(0, c.light ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)');
    shade.addColorStop(1, c.light ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)');
    ctx.beginPath();
    path(sphere);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Beacons (front hemisphere only)
    opts.beacons.forEach((b, i) => {
      if (geoDistance(b, [view.lon, view.lat]) > Math.PI / 2 - 0.08) return;
      const p = projection(b);
      if (!p) return;
      const phase = reduced ? 0.5 : (t / 1800 + i * 0.23) % 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3 + phase * 22, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = 1 - phase;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2);
      ctx.fillStyle = c.accent;
      ctx.fill();
    });
  }

  function frame(t: number) {
    raf = 0;
    if (!visible || !w) return;
    if (flight) {
      const p = Math.min(1, (t - flight.t0) / flight.ms);
      view = flight.f(ease(p));
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
    }
    draw(t);
    if (!reduced || flight) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  });
  const ro = new ResizeObserver(resize);
  const onTheme = () => {
    readColors();
    kick();
  };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  };

  readColors();
  io.observe(canvas);
  ro.observe(canvas);
  addEventListener('themechange', onTheme);

  return {
    setView(v) {
      flight = null;
      base = view = v;
      kick();
    },
    flyTo(v, ms = 1400) {
      flight?.done();
      if (reduced || ms <= 0) {
        base = view = v;
        flight = null;
        kick();
        return Promise.resolve();
      }
      return new Promise((done) => {
        flight = { f: interpolateView(view, v), t0: performance.now(), ms, done };
        kick();
      });
    },
    setActive(ids) {
      active = countries.filter((f) => ids.has(String(f.id)));
      kick();
    },
    spin(on) {
      drifting = on;
      if (on) addEventListener('pointermove', onPointer, { passive: true });
      else removeEventListener('pointermove', onPointer);
      kick();
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener('themechange', onTheme);
      removeEventListener('pointermove', onPointer);
    },
  };
}
