# Portfolio Revamp — "Mission Control for Early Warning"

Date: 2026-10-29 · Owner: Meshack Kibet (bravomesh)

## Goal

Rebuild the portfolio as a professional, smooth, animation-rich site that tells one story:
**"I build the software that warns countries before disasters hit."**
Software engineer by training, now working at the intersection of GIS and AI.

## Decisions (approved)

| Topic | Decision |
|---|---|
| Direction | "Mission Control": cartographic dark UI, D3 globe hero + scroll-pinned globe story |
| Stack | Astro 7 (static output) + Vite, npm deps (no CDN scripts) |
| Hosting | GitHub Pages via GitHub Actions (`withastro/action`), `base: '/mPortfolio'` |
| Git | Commit straight to `master`, push as we go. Author `bravomesh <mshckkibet@gmail.com>`, SSH-signed, no AI trailers |

One-time manual step for the owner: repo **Settings → Pages → Source: GitHub Actions**.

## Visual system

- **Theme:** dark "ink" default (`#0b0f0e` bg, warm off-white text), light "paper map" alternative. Toggle persisted in `localStorage`, defaults to OS preference.
- **Accent:** single "alert amber" (`#ff8a3d`), with a muted teal for map land/secondary data.
- **Texture:** faint SVG contour lines + coordinate grid in backgrounds; monospace coordinate labels as ornaments.
- **Type:** Instrument Serif (display headlines, italic accents), Geist Variable (body/UI), Geist Mono (data, labels). Self-hosted via Fontsource.

## Motion system

- **Lenis** smooth scroll, driven by GSAP's ticker; ScrollTrigger synced to Lenis.
- **GSAP SplitText** line/word reveals on headlines; ScrollTrigger fade/slide reveals (`data-reveal`).
- Count-up stats, infinite partner marquee, magnetic buttons, custom cursor (dot + ring, fine pointers only).
- Preloader: coordinates count to Nairobi `1.2921°S 36.8219°E`, ≤1.2 s, skipped on repeat visits in the session.
- `prefers-reduced-motion: reduce` → no Lenis, no preloader, no pinning; content shown statically.

## Page structure (single page)

1. **Hero** — name (split reveal), "Software Engineer → GIS & AI", one-line pitch, CTAs (View work / Contact), status "Open to work", D3 globe (rotating, served countries lit, pulsing beacons).
2. **Partner marquee** — text wordmarks: ICPAC · IGAD · SADC · Government of Uganda · Federal Government of Somalia · Republic of Djibouti (no official logos).
3. **About & path** — short bio + 3-step path: Software Engineering → Geospatial → AI. Photo `meshack-igad.jpeg`.
4. **Platforms (centrepiece)** — pinned section; the globe flies between 5 stops as you scroll, each with a card (name, region, role, what it does, stack, live link):
   1. East Africa Hazards Watch — ICPAC/IGAD, 11 countries — https://eahazardswatch.icpac.net/mapviewer/
   2. SADC Hazards Watch — 16 member states — https://sadc-int-mhews-413744588203.europe-west1.run.app/mapviewer/
   3. Somalia Hazards Watch — https://somhews-gov-so-cms-web-413744588203.europe-west1.run.app/mapviewer/
   4. Djibouti Multi-Hazard System — https://djibouti-mhews-413744588203.europe-west1.run.app/mapviewer
   5. Uganda Hazards Watch (U-MHIEWS) — https://uganda-mhiews-go-ug-413744588203.europe-west1.run.app/mapviewer
   Followed by impact stats (countries served, platforms, languages supported).
   Mobile: no pinning — stacked cards each with a small static globe/region view.
5. **Toolbox** — bento grid: GIS & Earth Observation · AI / ML · Platform Engineering · Cloud & DevOps (content from current skills lists). Cursor spotlight hover.
6. **Experience** — vertical timeline, scroll-drawn line.
7. **Other work** — Drought Watch, ICPAC site, and personal projects (breast cancer ML, task tracker, restaurant site) with existing screenshots.
8. **Contact** — large closing CTA, copy-email button, mailto form, socials.
9. **Footer** — live Nairobi time, coordinates, back-to-top.

## Architecture

```
astro.config.mjs        site/base for GitHub Pages
src/
  data/site.ts          ALL copy & facts (profile, platforms, skills, experience, projects) — single place to verify/edit
  layouts/Base.astro    head, fonts, theme bootstrap, cursor, preloader
  components/           one .astro per section (Hero, Marquee, About, Platforms, Toolbox, Experience, Work, Contact, Footer, Nav)
  scripts/
    motion.ts           Lenis + GSAP setup, reveals, magnetic, cursor, counters
    globe.ts            D3 orthographic canvas globe: render, highlight, flyTo(lon, lat, scale)
  styles/global.css     tokens (CSS custom properties), base, utilities
public/                 images, favicon
.github/workflows/deploy.yml
```

- Globe: `d3-geo` orthographic projection on `<canvas>`, `world-atlas` 110m TopoJSON (`topojson-client`). Country highlight by ISO numeric ID. `flyTo` interpolates rotation (`d3.geoInterpolate`) + scale; driven by ScrollTrigger progress in the Platforms section. Redraw only when state changes / visible (IntersectionObserver).
- No framework islands; vanilla TS in Astro `<script>` tags (bundled by Vite).
- Old files removed: particles, swiper, AOS, skills constellation, icon-font CDNs (replaced by inline SVG).

## Quality bar

- Lighthouse ≥ 90 performance/accessibility on desktop; no horizontal scroll at 360 px.
- Keyboard navigable, visible focus, semantic landmarks, alt text, contrast AA in both themes.
- `npm run build` passes; deploy workflow builds on push to `master`.

## Content guesses to verify (owner)

All live in `src/data/site.ts`:

- Job titles, employers, and dates in Experience (assumed: ICPAC software/geospatial role).
- Your exact role on each of the 5 platforms.
- Impact numbers (countries ≈ 26 unique across IGAD + SADC + national systems; population figures).
- Education (current site mentions Systems Analysis & Cybersecurity background).
- Whether all 5 `run.app` links should be public.
- Stack tags per platform.
- Email / socials / CV link (carried over from current site).
