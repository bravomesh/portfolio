import { geoOrthographic, geoPath, geoGraticule10, geoDistance, geoContains, geoCentroid, geoBounds } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import world110 from 'world-atlas/countries-110m.json';
import type { View } from '../data/site';
import { interpolateView } from './globe-math';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches; // phones/tablets: lighter rendering

type Country = Feature<Geometry, { name: string }>;
type Geo = {
  countries: Country[];
  land: GeoPermissibleObjects;
  borders: GeoPermissibleObjects;
  cent: [number, number][]; // per-country centroid…
  rad: number[]; // …and angular radius, for culling when zoomed in
};

function build(json: unknown): Geo {
  const topo = json as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const countries = (feature(topo, topo.objects.countries) as unknown as { features: Country[] }).features;
  // world-atlas leaves Somaliland without an ISO id; draw it as part of Somalia.
  for (const f of countries) if (!f.id && f.properties.name === 'Somaliland') f.id = '706';
  const cent = countries.map((f) => geoCentroid(f) as [number, number]);
  const rad = countries.map((f, i) => {
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    if (x1 < x0) return Math.PI; // crosses the antimeridian: never cull
    return Math.max(...[[x0, y0], [x1, y1], [x0, y1], [x1, y0]].map((p) => geoDistance(cent[i], p as [number, number])));
  });
  return {
    countries,
    land: { type: 'FeatureCollection', features: countries } as GeoPermissibleObjects,
    borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
    cent,
    rad,
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
const clampLat = (lat: number) => Math.max(-75, Math.min(75, lat));
const IDLE_RETURN_MS = 2600; // after the user lets go, glide back to the resting view

export type Globe = {
  setView(v: View): void;
  flyTo(v: View, ms?: number): Promise<void>;
  setActive(ids: Set<string>): void;
  spin(on: boolean): void;
  destroy(): void;
};

export type GlobeOptions = {
  view: View;
  highlight: Set<string>;
  beacons: [number, number][];
  detail?: boolean; // swap to 1:50m geometry once loaded
  interactive?: boolean; // drag to rotate, hover tooltips, clickable beacons
  describe?: (id: string) => string | null | undefined; // tooltip subtitle
  onBeacon?: (index: number) => void;
};

export function createGlobe(canvas: HTMLCanvasElement, opts: GlobeOptions): Globe {
  const ctx = canvas.getContext('2d')!;
  const layer = document.createElement('canvas'); // cached map, re-rendered only when dirty
  const lctx = layer.getContext('2d')!;
  const projection = geoOrthographic().clipAngle(90).precision(0.6);
  const path = geoPath(projection, lctx);

  let rest = opts.view; // where the globe settles when left alone
  let base = rest; // centre the drift oscillates around
  let view = rest;
  let amp = 0; // drift amplitude, eased in so drift never jumps
  let activeIds = new Set<string>();
  let hoverId: string | null = null;
  let drifting = false;
  let flight: { f: (t: number) => View; t0: number; ms: number; done: () => void } | null = null;
  let drag: { x: number; y: number; moved: number } | null = null;
  const vel = { lon: 0, lat: 0 };
  let inertia = false;
  let userMoved = false;
  let lastInteract = 0;
  let w = 0, h = 0, r = 0;
  let visible = false;
  let dirty = true;
  let raf = 0;
  let lastPaint = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let c: Record<string, string> = {};

  const tip = opts.interactive ? document.createElement('div') : null;
  if (tip) {
    tip.className = 'globe-tip';
    tip.setAttribute('aria-hidden', 'true');
    canvas.parentElement!.appendChild(tip);
    canvas.dataset.cursor = 'Drag';
    canvas.style.touchAction = 'pan-y';
    canvas.classList.add('globe-interactive');
  }

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
    const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5); // crisp enough, far cheaper than 2-3×
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    for (const [cv, cx] of [[canvas, ctx], [layer, lctx]] as const) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    r = (Math.min(w, h) / 2) * 0.9;
    invalidate();
  };

  // Level of detail: the light 1:110m map while moving, the 1:50m one once the globe settles.
  // After motion stops, the crisp full-detail redraw waits for idle time so it never stalls a scroll.
  let settling = false;
  const idle: (cb: () => void) => void =
    'requestIdleCallback' in window ? (cb) => requestIdleCallback(cb, { timeout: 700 }) : (cb) => setTimeout(cb, 150);
  const settle = () => {
    settling = true;
    idle(() => {
      settling = false;
      invalidate();
    });
  };
  const moving = () => !!flight || !!drag || inertia || settling;
  const geo = () => (opts.detail && hi && !moving() ? hi : lo);

  function drawMap() {
    const g = geo();
    const fast = moving(); // mid-motion: coarser curves, no fine borders/grid (invisible at speed)
    const R = r * view.scale;
    const cx = w / 2, cy = h / 2;
    projection
      .translate([cx, cy])
      .scale(R)
      .rotate([-view.lon, -view.lat])
      // Adaptive resampling only pays off on the sparse 1:110m map at rest; the dense 1:50m map and
      // mid-motion frames skip it (it was the single biggest cost per frame).
      .precision(fast || drifting || g === hi ? 0 : 0.6)
      .clipExtent([[-2, -2], [w + 2, h + 2]]); // skip geometry that's off-canvas when zoomed in
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
    const stroke = (o: GeoPermissibleObjects | GeoPermissibleObjects[], color: string, width: number) => {
      x.beginPath();
      (Array.isArray(o) ? o : [o]).forEach((f) => path(f));
      x.strokeStyle = color;
      x.lineWidth = width;
      x.stroke();
    };

    // Zoomed in, only countries near the visible patch of globe get projected at all.
    const halfDiag = Math.hypot(w, h) / 2;
    const reach = R > halfDiag ? Math.asin(halfDiag / R) + 0.06 : Math.PI;
    const centre: [number, number] = [view.lon, view.lat];
    const vis = reach >= Math.PI ? g.countries : g.countries.filter((_, i) => geoDistance(g.cent[i], centre) - g.rad[i] < reach);
    const culled = vis.length < g.countries.length;

    fill(sphere, c.ocean);
    if (!fast) stroke(graticule, c.grat, 1);
    fill(culled ? vis : g.land, c.land);
    fill(vis.filter((f) => opts.highlight.has(String(f.id))), c.hi);
    if (activeIds.size) fill(vis.filter((f) => activeIds.has(String(f.id))), c.accent, 0.9);
    if (!fast) stroke(culled ? vis : g.borders, c.border, 0.6);
    if (hoverId) {
      const hov = g.countries.filter((f) => String(f.id) === hoverId);
      fill(hov, c.fg, 0.1);
      stroke(hov, c.fg, 1.4);
    }

    const shade = x.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    shade.addColorStop(0, c.light ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)');
    shade.addColorStop(1, c.light ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)');
    fill(sphere, shade);
    stroke(sphere, c.rim, 1);
  }

  const beaconPoint = (b: [number, number]) =>
    geoDistance(b, [view.lon, view.lat]) > Math.PI / 2 - 0.08 ? null : projection(b);

  function drawBeacons(t: number) {
    opts.beacons.forEach((b, i) => {
      const p = beaconPoint(b);
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
    // Drift, beacons and fly-tos are time-based, so they can skip frames without changing speed:
    // ~60fps max on desktops (120Hz screens would double the work), ~30fps on touch devices.
    // Dragging stays at full rate so the globe tracks the pointer.
    if (!drag && !inertia && !dirty && t - lastPaint < (coarse ? 32 : 15)) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastPaint = t;
    if (flight) {
      const p = Math.min(1, (t - flight.t0) / flight.ms);
      view = flight.f(ease(p));
      dirty = true;
      amp = 0;
      if (p === 1) {
        base = view;
        flight.done();
        flight = null;
        settle();
      }
    } else if (drag) {
      amp = 0; // view is moved by pointer events
    } else if (inertia) {
      view = { lon: view.lon + vel.lon, lat: clampLat(view.lat + vel.lat), scale: view.scale };
      vel.lon *= 0.93;
      vel.lat *= 0.93;
      if (Math.abs(vel.lon) + Math.abs(vel.lat) < 0.01) {
        inertia = false;
        lastInteract = t;
        settle();
      }
      dirty = true;
    } else if (userMoved && t - lastInteract > IDLE_RETURN_MS) {
      userMoved = false;
      startFlight(rest, 1800);
    } else if (drifting && !reduced && !userMoved) {
      amp += (1 - amp) * 0.015;
      pointer.sx += (pointer.x - pointer.sx) * 0.04;
      pointer.sy += (pointer.y - pointer.sy) * 0.04;
      view = {
        lon: base.lon + amp * (Math.sin(t / 9000) * 24 + pointer.sx * 12),
        lat: base.lat + amp * (Math.cos(t / 11000) * 6 - pointer.sy * 8),
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
    if (!reduced || flight || inertia) raf = requestAnimationFrame(frame);
  }

  function invalidate() {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function startFlight(v: View, ms: number) {
    flight?.done();
    inertia = false;
    if (reduced || ms <= 0) {
      base = view = v;
      flight = null;
      invalidate();
      return Promise.resolve();
    }
    return new Promise<void>((done) => {
      flight = { f: interpolateView(view, v), t0: performance.now(), ms, done };
      invalidate();
    });
  }

  // ---------- interaction ----------
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect(); // includes CSS transforms; map back to layout px
    return [((e.clientX - b.left) * w) / b.width, ((e.clientY - b.top) * h) / b.height] as const;
  };
  const beaconAt = (x: number, y: number) =>
    opts.beacons.findIndex((b) => {
      const p = beaconPoint(b);
      return p && Math.hypot(p[0] - x, p[1] - y) < 16;
    });

  function setTip(name: string | null, sub?: string | null, x = 0, y = 0) {
    if (!tip) return;
    if (!name) return tip.classList.remove('on');
    tip.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = name;
    tip.append(strong);
    if (sub) {
      const span = document.createElement('span');
      span.textContent = sub;
      tip.append(span);
    }
    const flip = x > w * 0.55; // keep the tooltip on the globe's open side
    tip.classList.toggle('flip', flip);
    tip.style.transform = `translate(${flip ? x - tip.offsetWidth - 96 : x}px, ${y}px)`;
    tip.classList.add('on');
  }

  function hoverAt(x: number, y: number) {
    const b = beaconAt(x, y);
    canvas.dataset.cursor = b >= 0 ? 'Open' : 'Drag';
    const p = projection.invert?.([x, y]);
    const onGlobe = p && geoDistance(p, [view.lon, view.lat]) < Math.PI / 2;
    const f = onGlobe ? lo.countries.find((k) => geoContains(k, p)) : undefined;
    const id = f ? String(f.id) : null;
    if (id !== hoverId) {
      hoverId = id;
      invalidate();
    }
    if (f) setTip(f.properties.name, opts.describe?.(String(f.id)), x, y);
    else setTip(null);
  }

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    vel.lon = vel.lat = 0;
    inertia = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('grabbing');
  };
  const onMove = (e: PointerEvent) => {
    lastInteract = performance.now();
    const [x, y] = local(e);
    if (!drag) return hoverAt(x, y);
    if (flight) return;
    const k = 180 / (Math.PI * r * view.scale); // degrees per pixel at the centre
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
    const dlon = Math.max(-8, Math.min(8, -dx * k));
    const dlat = e.pointerType === 'touch' ? 0 : Math.max(-8, Math.min(8, dy * k));
    view = { lon: view.lon + dlon, lat: clampLat(view.lat + dlat), scale: view.scale };
    vel.lon = dlon;
    vel.lat = dlat;
    if (drag.moved > 4) {
      userMoved = true;
      setTip(null);
    }
    invalidate();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag) return;
    const click = drag.moved < 5;
    drag = null;
    canvas.classList.remove('grabbing');
    lastInteract = performance.now();
    settle(); // full detail once things are idle
    if (click) {
      const [x, y] = local(e);
      const b = beaconAt(x, y);
      if (b >= 0) opts.onBeacon?.(b);
    } else if (!reduced) {
      inertia = true;
      invalidate();
    }
  };
  const onLeave = () => {
    if (hoverId) {
      hoverId = null;
      invalidate();
    }
    setTip(null);
  };

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
  const onDocLeave = () => {
    pointer.x = pointer.y = 0; // ease back to centre when the mouse leaves the window
  };

  readColors();
  io.observe(canvas);
  ro.observe(canvas);
  addEventListener('themechange', onTheme);
  if (opts.detail) addEventListener('globe:hires', invalidate);
  if (opts.interactive) {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
  }

  return {
    setView(v) {
      flight = null;
      rest = base = view = v;
      invalidate();
    },
    flyTo(v, ms = 1400) {
      rest = v;
      userMoved = false;
      return startFlight(v, ms);
    },
    setActive(ids) {
      activeIds = ids;
      invalidate();
    },
    spin(on) {
      drifting = on;
      if (on) {
        addEventListener('pointermove', onPointer, { passive: true });
        document.documentElement.addEventListener('pointerleave', onDocLeave);
      } else {
        removeEventListener('pointermove', onPointer);
        document.documentElement.removeEventListener('pointerleave', onDocLeave);
      }
      invalidate();
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      tip?.remove();
      removeEventListener('themechange', onTheme);
      removeEventListener('globe:hires', invalidate);
      removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onDocLeave);
    },
  };
}
