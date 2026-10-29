import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
export let lenis: Lenis | null = null;

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

let ready: Promise<void> | null = null;

/** Resolves once the preloader starts leaving (or immediately when skipped). */
export const introReady = () => (initMotion(), ready!);

export function initMotion() {
  if (ready) return;

  if (!reduced) {
    lenis = new Lenis({ anchors: true, lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  addEventListener('scroll-lock', (e) => ((e as CustomEvent<boolean>).detail ? lenis?.stop() : lenis?.start()));

  ready = document.fonts.ready.then(preloader);
  ready.then(() => {
    intro();
    reveals();
    counters();
  });
  magnetic();
  cursor();
}

function preloader(): Promise<void> {
  const el = document.getElementById('preloader');
  if (!el || reduced || document.documentElement.classList.contains('seen')) {
    el?.remove();
    return Promise.resolve();
  }
  try {
    sessionStorage.setItem('seen', '1');
  } catch {}
  lenis?.stop();
  return new Promise((resolve) => {
    const lat = el.querySelector('[data-lat]')!;
    const lon = el.querySelector('[data-lon]')!;
    const v = { lat: 0, lon: 0 };
    gsap
      .timeline({ defaults: { ease: 'power3.inOut' } })
      .to(v, {
        lat: 1.2921,
        lon: 36.8219,
        duration: 1.1,
        onUpdate: () => {
          lat.textContent = v.lat.toFixed(4);
          lon.textContent = v.lon.toFixed(4);
        },
      })
      .to(el.querySelector('.pl-bar i'), { scaleX: 1, duration: 1.1 }, 0)
      .to(el.querySelector('.pl-inner'), { opacity: 0, y: -20, duration: 0.4 }, '+=0.1')
      .add(() => {
        lenis?.start();
        resolve();
      })
      .to(el, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<')
      .add(() => el.remove());
  });
}

function intro() {
  const name = document.querySelector('[data-intro-name]');
  if (reduced) return gsap.set('[data-intro]', { opacity: 1 });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (name) {
    gsap.set(name, { opacity: 1 });
    const split = SplitText.create(name, { type: 'chars,lines', mask: 'lines' });
    tl.from(split.chars, { yPercent: 115, duration: 1.4, stagger: 0.045 }, 0);
  }
  tl.fromTo(
    '[data-intro]:not([data-intro-name])',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 },
    0.35,
  );
}

function reveals() {
  if (reduced) return;

  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (s) =>
        gsap.from(s.lines, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    });
  });

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 48,
      opacity: 0,
      duration: 1.2,
      delay: Number(el.dataset.delay ?? 0),
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  $$('[data-stagger]').forEach((el) => {
    gsap.from(el.children, {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

function counters() {
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (reduced) return void (el.textContent = String(end));
    const v = { n: 0 };
    gsap.to(v, {
      n: end,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = String(Math.round(v.n))),
    });
  });
}

function magnetic() {
  if (reduced || !fine) return;
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

function cursor() {
  const dot = document.querySelector<HTMLElement>('.cursor-dot');
  const ring = document.querySelector<HTMLElement>('.cursor-ring');
  if (!dot || !ring || reduced || !fine) return;
  document.documentElement.classList.add('has-cursor');
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });
  addEventListener('pointermove', (e) => {
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const hot = (e.target as Element).closest('a, button, [data-cursor]');
    ring.classList.toggle('hot', !!hot);
  });
  document.addEventListener('pointerleave', () => gsap.to([dot, ring], { opacity: 0 }));
  document.addEventListener('pointerenter', () => gsap.to([dot, ring], { opacity: 1 }));
}
