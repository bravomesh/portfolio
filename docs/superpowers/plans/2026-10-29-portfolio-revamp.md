# Portfolio Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static HTML portfolio with an Astro site themed "Mission Control for Early Warning", centred on a D3 globe that shows the five early-warning platforms Meshack builds.

**Architecture:** Single-page Astro 7 static site. Every fact/copy string lives in `src/data/site.ts`; each section is one `.astro` component; two vanilla-TS modules (`motion.ts`, `globe.ts`) own all animation. A pure `globe-math.ts` holds the testable logic. GitHub Actions builds and deploys to Pages.

**Tech Stack:** Astro 7.4, TypeScript, GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, d3-geo 3.1, topojson-client 3.1, world-atlas 2.0, Fontsource (Geist, Geist Mono, Instrument Serif), sharp (image optimisation).

**Spec:** `docs/superpowers/specs/2026-10-29-portfolio-revamp-design.md`

## Global Constraints

- Hosting: GitHub Pages via Actions; `site: 'https://bravomesh.github.io'`, `base: '/mPortfolio'`. All internal URLs must respect `import.meta.env.BASE_URL`.
- Commits: straight to `master`, pushed after each task. Author `bravomesh <mshckkibet@gmail.com>`, SSH-signed (already configured repo-local). **No AI/Claude trailers.**
- No CDN scripts or icon fonts; inline SVG icons only.
- Accent `#ff8a3d`; dark default bg `#0b0f0e`; fonts Instrument Serif / Geist Variable / Geist Mono.
- `prefers-reduced-motion: reduce` → no Lenis, no preloader, no SplitText, globe flies instantly.
- No horizontal scroll at 360 px; AA contrast in both themes; visible focus rings.
- Verification per task: `npm run build` passes, then visual check of `npm run preview` in the browser.

## File Map

| File | Responsibility |
|---|---|
| `package.json`, `astro.config.mjs`, `tsconfig.json` | Build config |
| `.github/workflows/deploy.yml` | Pages deploy |
| `src/data/site.ts` | All content + platform geo data |
| `src/scripts/globe-math.ts` | Pure: `unionCountries`, `interpolateView` |
| `test/globe-math.test.ts` | `node --test` check for the above + data sanity |
| `src/scripts/globe.ts` | Canvas globe renderer (`createGlobe`) |
| `src/scripts/motion.ts` | Lenis, reveals, split text, counters, magnetic, cursor, preloader |
| `src/styles/global.css` | Tokens, base, shared utilities |
| `src/layouts/Base.astro` | `<head>`, fonts, theme bootstrap, cursor/preloader markup, motion init |
| `src/components/*.astro` | Nav, Hero, Marquee, About, Platforms, Toolbox, Experience, Work, Contact, Footer, Icon |
| `src/pages/index.astro` | Composes sections |
| `src/assets/` | Images (moved from `src/img`) |

Deleted: `index.html`, `src/css/*`, `src/js/*`, `.nojekyll`, unused images.

---

### Task 1: Scaffold Astro, deploy workflow, remove old site

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.github/workflows/deploy.yml`, `src/pages/index.astro` (temporary "hello")
- Move: `src/img/*` → `src/assets/` (keep `meshack-igad.jpeg`, `kibet.jpg`, `img-projects/*`; favicon `icon-nav.png` → `public/favicon.png`)
- Delete: `index.html`, `src/css`, `src/js`, `.nojekyll`

**Interfaces:** Produces build scripts `dev`, `build`, `preview`, `test`.

- [ ] **Step 1: Write config**

`package.json`
```json
{
  "name": "mportfolio",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test test/"
  }
}
```
Then: `npm i astro@7.4.4 gsap@3.15.0 lenis@1.3.27 d3-geo@3.1.1 topojson-client@3.1.0 world-atlas@2.0.2 @fontsource-variable/geist @fontsource-variable/geist-mono @fontsource/instrument-serif sharp`
and `npm i -D @types/d3-geo @types/topojson-client`

`astro.config.mjs`
```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://bravomesh.github.io',
  base: '/mPortfolio',
});
```

`tsconfig.json`
```json
{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }
```

`.gitignore`: `node_modules/`, `dist/`, `.astro/`, `.DS_Store`

`.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Build** — `npm run build` → Expected: `dist/index.html` exists.
- [ ] **Step 3: Commit + push** — `git add -A && git commit -m "chore: migrate to Astro with GitHub Pages deploy workflow" && git push`

---

### Task 2: Content data + globe math (with test)

**Files:**
- Create: `src/data/site.ts`, `src/scripts/globe-math.ts`, `test/globe-math.test.ts`

**Interfaces — Produces:**
```ts
// site.ts
export type View = { lon: number; lat: number; scale: number };      // scale: 1 = whole globe fits
export type Platform = {
  id: string; name: string; org: string; region: string;
  countries: string[];       // ISO 3166-1 numeric, zero-padded ("404") = world-atlas ids
  view: View; beacon: [number, number]; // [lon, lat]
  url: string; role: string; summary: string; stack: string[]; languages: string[];
};
export const profile, partners, platforms: Platform[], path, toolbox, experience, work, stats;

// globe-math.ts
export function unionCountries(ps: { countries: string[] }[]): Set<string>;
export function interpolateView(a: View, b: View): (t: number) => View; // great-circle centre, geometric zoom
```

Country ids — IGAD/ICPAC (11): 108 Burundi, 262 Djibouti, 232 Eritrea, 231 Ethiopia, 404 Kenya, 646 Rwanda, 706 Somalia, 728 South Sudan, 729 Sudan, 834 Tanzania, 800 Uganda.
SADC (16): 024 Angola, 072 Botswana, 174 Comoros, 180 DRC, 748 Eswatini, 426 Lesotho, 450 Madagascar, 454 Malawi, 480 Mauritius, 508 Mozambique, 516 Namibia, 690 Seychelles, 710 South Africa, 834 Tanzania, 894 Zambia, 716 Zimbabwe.
Union = 26.

Languages (from the live sites): EAHW 8 (EN, SW, AM, AR, FR, RW, ZH, SO); SADC 4 (EN, PT, FR, SW); Somalia 5 (SO, AR, EN, OM, SW); Djibouti 5 (FR, AR, SO, EN, AM); Uganda 3 (EN, LG, SW). Union = 11.

- [ ] **Step 1: Write the failing test** `test/globe-math.test.ts`
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unionCountries, interpolateView } from '../src/scripts/globe-math.ts';
import { platforms } from '../src/data/site.ts';

test('platforms cover 26 unique countries and 11 languages', () => {
  assert.equal(unionCountries(platforms).size, 26);
  assert.equal(new Set(platforms.flatMap(p => p.languages)).size, 11);
});

test('interpolateView hits endpoints and zooms geometrically', () => {
  const a = { lon: 0, lat: 0, scale: 1 }, b = { lon: 90, lat: 0, scale: 4 };
  const f = interpolateView(a, b);
  assert.deepEqual(f(0), a);
  const end = f(1);
  assert.ok(Math.abs(end.lon - 90) < 1e-9 && Math.abs(end.scale - 4) < 1e-9);
  assert.ok(Math.abs(f(0.5).scale - 2) < 1e-9);   // geometric mean, not 2.5
  assert.ok(Math.abs(f(0.5).lon - 45) < 1e-6);
});
```
- [ ] **Step 2: Run** `npm test` → FAIL (modules missing).
- [ ] **Step 3: Implement** `globe-math.ts`
```ts
import { geoInterpolate } from 'd3-geo';
import type { View } from '../data/site.ts';

export const unionCountries = (ps: { countries: string[] }[]) => new Set(ps.flatMap(p => p.countries));

export function interpolateView(a: View, b: View) {
  const centre = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  return (t: number): View => {
    if (t <= 0) return a;
    const [lon, lat] = centre(t);
    return { lon, lat, scale: a.scale * Math.pow(b.scale / a.scale, t) };
  };
}
```
Then write `site.ts` with all content (profile from current site; platforms with the ids/languages above; guesses marked `// VERIFY`).
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit + push** — `feat: add site content data and globe math`

---

### Task 3: Design tokens, base layout, nav, theme

**Files:** Create `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Icon.astro`; modify `src/pages/index.astro`.

**Interfaces — Produces:** CSS vars `--bg --bg-2 --fg --muted --line --accent --land --land-hi --ocean`, fonts `--f-display --f-body --f-mono`; `html[data-theme="light"|"dark"]`; utility classes `.container .eyebrow .section .btn .btn--ghost`; `<Icon name="github|linkedin|instagram|arrow|external|mail|copy|sun|moon|download" />`.

- Theme bootstrap (inline, in `<head>`, before paint):
```html
<script is:inline>
  const t = localStorage.getItem('theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = t;
</script>
```
- Nav: fixed, blurred bar; logo `MK.`; links About / Platforms / Toolbox / Experience / Contact; theme toggle (dispatches `themechange` event on `window`); mobile drawer < 760 px; hides on scroll down, shows on scroll up.
- Background texture: fixed SVG contour pattern + 64 px grid at 4% opacity.

- [ ] Build, preview, check both themes + mobile drawer. Commit + push — `feat: add design tokens, base layout and navigation`

---

### Task 4: Motion system + Hero + preloader

**Files:** Create `src/scripts/motion.ts`, `src/components/Hero.astro`; modify `Base.astro`.

**Interfaces — Produces:**
```ts
export const reduced: boolean;
export function initMotion(): void; // idempotent; wires everything below
// attributes consumed: [data-split] (line reveal), [data-reveal] (fade-up, optional data-delay),
// [data-count="26"] (count-up), [data-magnetic], .cursor elements, #preloader
export function onPreloaderDone(cb: () => void): void;
```
- Lenis: `new Lenis({ anchors: true, lerp: 0.1 })`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`.
- SplitText: `SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: s => gsap.from(s.lines, { yPercent: 110, stagger: 0.08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }) })`.
- Preloader: mono coordinates count 0 → `1.2921°S 36.8219°E` over 0.9 s, panel wipes up; `sessionStorage.seen` skips it.
- Hero: eyebrow `Software Engineer → GIS & AI`, serif name (two lines, split reveal), pitch, CTAs (magnetic), status pill, meta row (Location, Focus, Experience), canvas `#hero-globe` (wired in Task 5), scroll cue.

- [ ] Build, preview: preloader plays once, name reveals, smooth scroll works, reduced-motion (DevTools emulation) shows static page. Commit + push — `feat: add motion system, preloader and hero`

---

### Task 5: Globe renderer + hero globe

**Files:** Create `src/scripts/globe.ts`; modify `Hero.astro`.

**Interfaces:**
- Consumes: `interpolateView`, `unionCountries`, `platforms`, `View`.
- Produces:
```ts
export type Globe = {
  setView(v: View): void;
  flyTo(v: View, ms?: number): Promise<void>;
  setActive(ids: Set<string>): void;     // strongly highlighted countries
  spin(on: boolean): void;               // slow auto-rotation (hero)
  destroy(): void;
};
export function createGlobe(canvas: HTMLCanvasElement, opts: { view: View; highlight: Set<string>; beacons: [number, number][] }): Globe;
```
- Rendering: `geoOrthographic().rotate([-lon, -lat]).scale(r * scale).clipAngle(90)` on a DPR-scaled canvas; layers: ocean disc + rim glow → graticule (10°) → land (`--land`) → highlighted (`--land-hi`) → active (`--accent`) → borders → beacons (pulsing rings, visible hemisphere only via `geoDistance < π/2`).
- Colours read from CSS vars; re-read on `themechange`.
- rAF loop runs only while canvas is on screen (IntersectionObserver) and only redraws when dirty or animating.
- Topology: `import land from 'world-atlas/countries-110m.json'` → `feature(land, land.objects.countries)`.
- Hero globe: spins slowly, tilted to Africa, beacons at the five platforms; scroll-linked fade/scale out with ScrollTrigger.

- [ ] Build, preview: globe draws in both themes, beacons pulse, crisp on retina, no CPU use when scrolled away. Commit + push — `feat: add D3 canvas globe to hero`

---

### Task 6: Platforms story section

**Files:** Create `src/components/Platforms.astro`.

- Layout: two columns ≥ 900 px — left `position: sticky; top: 12vh; height: 76vh` globe canvas `#platform-globe` + HUD (mono lat/lon readout, platform index `01/05`, region name); right a column of 5 cards (min-height 80vh each). Below 900 px: sticky globe at top (42vh), cards scroll underneath.
- Each card: index, org, name (serif), region + country count, summary, role, stack chips, language chips, "Open live map viewer ↗" link.
- Active card: ScrollTrigger per card (`start: 'top 60%'`, `end: 'bottom 60%'`, `onToggle`) → `globe.flyTo(p.view, 1400)` + `globe.setActive(new Set(p.countries))` + HUD update; inactive cards dim to 35%.
- After cards: stats band — `[data-count]` for 5 platforms, 26 countries, 11 languages, 750M+ people (VERIFY).

- [ ] Build, preview: scrolling through cards flies the globe smoothly between EA → SADC → Somalia → Djibouti → Uganda; HUD updates; mobile works. Commit + push — `feat: add platforms story with scroll-driven globe`

---

### Task 7: Marquee, About, Toolbox, Experience, Work

**Files:** Create `Marquee.astro`, `About.astro`, `Toolbox.astro`, `Experience.astro`, `Work.astro`.

- Marquee: partners list duplicated, CSS `@keyframes` translate −50%, 40 s linear, pause on hover, fade masks at edges; reduced motion → static wrap.
- About: photo (Astro `<Image>`, clip-path reveal on scroll), bio, 3-step path (Software Engineering → Geospatial → AI) with connecting line.
- Toolbox: 4-card bento; cursor spotlight via `--mx/--my` set on `pointermove`; chips list.
- Experience: vertical timeline; line `scaleY` scrubbed 0→1 across the section; "Current" badge.
- Work: 5 cards (Drought Watch, ICPAC.net, Breast-cancer ML, Task Tracker, Restaurant site) with images where available; hover lift + image zoom.

- [ ] Build, preview each section in both themes + mobile. Commit + push — `feat: add about, toolbox, experience and work sections`

---

### Task 8: Contact + footer

**Files:** Create `Contact.astro`, `Footer.astro`.

- Contact: huge serif line "Let's build systems that warn early." (split reveal), copy-email button (`navigator.clipboard.writeText`, label → "Copied ✓" 2 s), form (name, email, message) that builds a `mailto:` URL on submit, socials, CV link.
- Footer: live Nairobi time `Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })` updated every 30 s, coordinates, back-to-top (Lenis scrollTo).

- [ ] Build, preview, test copy button + form. Commit + push — `feat: add contact and footer`

---

### Task 9: Polish pass + verification list

- Custom cursor (dot + ring, `gsap.quickTo`, grows on `a, button`), fine pointers only.
- Meta: title, description, Open Graph tags, favicon, `theme-color`.
- Check: 360 px no overflow; keyboard tab order + focus rings; reduced motion; Lighthouse in Chrome; `npm test` + `npm run build` green.
- Report to owner: content-to-verify list (all `// VERIFY` lines in `site.ts`) + "enable Pages → GitHub Actions".
- [ ] Commit + push — `chore: polish, meta tags and accessibility pass`

---

## Self-review

- Spec coverage: hero ✔ T4/T5 · marquee ✔ T7 · about/path ✔ T7 · platforms + stats ✔ T6 · toolbox ✔ T7 · experience ✔ T7 · other work ✔ T7 · contact/footer ✔ T8 · themes ✔ T3 · motion/reduced-motion ✔ T4 · deploy ✔ T1 · verification list ✔ T9.
- Spec deviation (deliberate, simpler): the platforms story uses a **sticky** globe with per-card triggers instead of a ScrollTrigger pin — same effect, works identically on mobile, no pin-spacer layout bugs.
- Names consistent: `View`, `Platform`, `createGlobe`, `flyTo`, `setActive`, `interpolateView`, `unionCountries`, `initMotion`.
