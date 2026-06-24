/* ===== CURSOR GLOW ===== */
(function () {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let cx2 = cx, cy2 = cy;
  let raf;

  document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; }, { passive: true });

  function step() {
    cx2 += (cx - cx2) * 0.12;
    cy2 += (cy - cy2) * 0.12;
    glow.style.transform = `translate(${cx2}px,${cy2}px) translate(-50%,-50%)`;
    raf = requestAnimationFrame(step);
  }
  step();
})();


/* ===== SCROLL PROGRESS ===== */
const progressBar = document.querySelector('.scroll-progress');
const navbar      = document.getElementById('navbar');
const scrollUpBtn = document.getElementById('scroll-up');

function onScroll() {
  const y   = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.transform = `scaleX(${y / max})`;
  navbar.classList.toggle('scrolled', y > 50);
  scrollUpBtn.classList.toggle('visible', y >= 600);
}
window.addEventListener('scroll', onScroll, { passive: true });


/* ===== THEME TOGGLE ===== */
const themeToggle = document.getElementById('theme-toggle');
const themeIcon   = document.getElementById('theme-icon');
const root        = document.documentElement;

function applyTheme(theme) {
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    themeIcon.className = 'fa-solid fa-moon';
  } else {
    root.removeAttribute('data-theme');
    themeIcon.className = 'fa-solid fa-sun';
  }
}

const savedTheme = localStorage.getItem('mk-theme');
if (savedTheme) applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('mk-theme', next);
});


/* ===== MOBILE NAV ===== */
const navMenu    = document.getElementById('nav-menu');
const navToggle  = document.getElementById('nav-toggle');
const navOverlay = document.getElementById('nav-overlay');

function openMenu() {
  navMenu.classList.add('open');
  navOverlay.classList.add('visible');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.querySelector('i').className = 'fa fa-xmark';
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  navMenu.classList.remove('open');
  navOverlay.classList.remove('visible');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.querySelector('i').className = 'fa fa-bars';
  document.body.style.overflow = '';
}

navToggle.addEventListener('click', () =>
  navMenu.classList.contains('open') ? closeMenu() : openMenu()
);
navOverlay.addEventListener('click', closeMenu);
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navMenu.classList.contains('open')) closeMenu();
});


/* ===== SKILL TAGS STAGGER ===== */
const skillObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.skill-tags span').forEach((tag, i) => {
      tag.style.opacity   = '0';
      tag.style.transform = 'translateY(6px)';
      setTimeout(() => {
        tag.style.transition = 'opacity .28s ease, transform .28s ease';
        tag.style.opacity    = '1';
        tag.style.transform  = 'none';
      }, i * 32);
    });
    skillObserver.unobserve(entry.target);
  });
}, { threshold: 0.25 });
document.querySelectorAll('.skill-card').forEach(c => skillObserver.observe(c));


/* ===== PROJECT CARD 3D TILT ===== */
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform      = `translateY(-7px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    card.style.transformStyle = 'preserve-3d';
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});


/* ===== STAT COUNT-UP ===== */
const statObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el     = entry.target;
    const raw    = el.textContent.replace(/[^0-9]/g, '');
    const end    = parseInt(raw, 10);
    if (isNaN(end)) return;
    const suffix = el.textContent.replace(/[0-9]/g, '');
    let start    = 0;
    const step   = Math.ceil(end / 40);
    const tick   = setInterval(() => {
      start = Math.min(start + step, end);
      el.textContent = start + suffix;
      if (start >= end) clearInterval(tick);
    }, 28);
    statObserver.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-number').forEach(n => statObserver.observe(n));


/* ===== PARTICLE NETWORK (Projects section) ===== */
(function initParticles() {
  const canvas  = document.getElementById('projects-canvas');
  const section = document.getElementById('projects');
  if (!canvas || !section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx   = canvas.getContext('2d');

  /* ---- config ---- matching original pJS energy ---- */
  const C = {
    count:        75,       // base particle count
    speed:        0.9,      // px/frame base
    maxDist:      150,      // edge draw distance
    grabDist:     220,      // cursor-to-particle line distance
    repulseDist:  200,      // repulse activation radius
    repulseForce: 80,       // repulse strength (matches pJS velocity=100 at repulse)
    nodeMin:      1.8,      // min radius px
    nodeMax:      4.5,      // max radius px
    nodeAlpha:    0.88,
    lineWidth:    1.0,
    lineAlpha:    0.50,     // alpha at closest
    grabAlpha:    0.80,
    clickPush:    5,
  };

  let W, H, particles, raf, running = false;
  const mouse = { x: null, y: null };

  /* ---- helpers ---- */
  function isDark() {
    return root.getAttribute('data-theme') !== 'light';
  }

  function themeRGB() {
    return isDark() ? [220, 130, 15] : [26, 104, 128];
  }

  function mkParticle(px, py) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = C.speed * (0.5 + Math.random() * 0.9);
    return {
      x:   px !== undefined ? px : Math.random() * W,
      y:   py !== undefined ? py : Math.random() * H,
      vx:  Math.cos(angle) * spd,
      vy:  Math.sin(angle) * spd,
      vx0: Math.cos(angle) * spd,
      vy0: Math.sin(angle) * spd,
      r:   C.nodeMin + Math.random() * (C.nodeMax - C.nodeMin),
    };
  }

  function resize() {
    W = canvas.width  = section.offsetWidth;
    H = canvas.height = section.offsetHeight;
  }

  function init() {
    resize();
    const density = (W * H) / 10000; // scale count to area
    const count   = Math.min(Math.max(Math.floor(density), 40), 120);
    particles     = Array.from({ length: count }, () => mkParticle());
  }

  /* ---- draw loop ---- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const [r, g, b] = themeRGB();

    /* update */
    particles.forEach(p => {
      /* --- repulse from cursor (direct position push, like pJS) --- */
      if (mouse.x !== null) {
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < C.repulseDist) {
          /* pJS-style: parabolic force = (1-(dist/R)²) * velocity, clamped */
          const ratio   = 1 - (dist / C.repulseDist);
          const force   = ratio * ratio * C.repulseForce;
          const clipped = Math.min(force, 50);
          p.x += (dx / dist) * clipped;
          p.y += (dy / dist) * clipped;
        }
      }

      /* natural movement + gentle return to original velocity */
      p.vx += (p.vx0 - p.vx) * 0.004;
      p.vy += (p.vy0 - p.vy) * 0.004;
      p.x  += p.vx;
      p.y  += p.vy;

      /* wrap */
      if (p.x < -p.r)     p.x = W + p.r;
      else if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r)     p.y = H + p.r;
      else if (p.y > H + p.r) p.y = -p.r;
    });

    /* particle-to-particle edges */
    ctx.lineWidth = C.lineWidth;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < C.maxDist) {
          const a = C.lineAlpha * (1 - dist / C.maxDist);
          ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    /* grab lines: cursor → nearby particles */
    if (mouse.x !== null) {
      ctx.lineWidth = 0.9;
      particles.forEach(p => {
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < C.grabDist) {
          const a = C.grabAlpha * (1 - dist / C.grabDist);
          ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    /* nodes */
    particles.forEach(p => {
      ctx.fillStyle = `rgba(${r},${g},${b},${C.nodeAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  /* visibility — stop when off-screen to save CPU */
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !running) {
        running = true; draw();
      } else if (!e.isIntersecting && running) {
        running = false; cancelAnimationFrame(raf);
      }
    });
  }, { threshold: 0.02 });

  /* mouse position tracked on section so it works even over cards */
  section.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  section.addEventListener('mouseleave', () => { mouse.x = mouse.y = null; });

  /* click → push particles at cursor (like pJS onclick push) */
  section.addEventListener('click', e => {
    if (!mouse.x) return;
    for (let i = 0; i < C.clickPush; i++) {
      particles.push(mkParticle(mouse.x, mouse.y));
    }
    if (particles.length > 150) particles.splice(0, C.clickPush);
  });

  window.addEventListener('resize', () => { init(); }, { passive: true });

  init();
  sectionObs.observe(section);
})();
