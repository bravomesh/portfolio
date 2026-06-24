(function initSkillsD3() {
  const wrap = document.getElementById('skills-graph');
  const grid = document.getElementById('skills-grid-fallback');
  if (!wrap || typeof d3 === 'undefined') return;
  if (window.innerWidth < 800) return;

  wrap.style.display = 'block';
  if (grid) grid.style.display = 'none';

  /* ── Category palette ── */
  const CAT = {
    'Languages':            { color: '#f59e0b', short: 'Languages'   },
    'GIS & Remote Sensing': { color: '#22d3ee', short: 'GIS'         },
    'Machine Learning':     { color: '#a78bfa', short: 'ML'          },
    'Web & Databases':      { color: '#34d399', short: 'Web / DB'    },
    'Cloud & DevOps':       { color: '#f87171', short: 'Cloud'       },
  };

  /* ── Data ── */
  const rawNodes = [
    { id: 'Languages',            group: 'hub' },
    { id: 'GIS & Remote Sensing', group: 'hub' },
    { id: 'Machine Learning',     group: 'hub' },
    { id: 'Web & Databases',      group: 'hub' },
    { id: 'Cloud & DevOps',       group: 'hub' },

    { id: 'Python',        cat: 'Languages',            size: 3 },
    { id: 'JavaScript',    cat: 'Languages',            size: 3 },
    { id: 'SQL',           cat: 'Languages',            size: 2 },
    { id: 'Rust',          cat: 'Languages',            size: 2 },
    { id: 'Java',          cat: 'Languages',            size: 1 },
    { id: 'R',             cat: 'Languages',            size: 1 },

    { id: 'Earth Engine',  cat: 'GIS & Remote Sensing', size: 3 },
    { id: 'QGIS',          cat: 'GIS & Remote Sensing', size: 2 },
    { id: 'PostGIS',       cat: 'GIS & Remote Sensing', size: 2 },
    { id: 'GDAL',          cat: 'GIS & Remote Sensing', size: 2 },
    { id: 'GeoPandas',     cat: 'GIS & Remote Sensing', size: 2 },
    { id: 'Leaflet',       cat: 'GIS & Remote Sensing', size: 2 },
    { id: 'ArcGIS',        cat: 'GIS & Remote Sensing', size: 1 },

    { id: 'TensorFlow',    cat: 'Machine Learning',     size: 3 },
    { id: 'PyTorch',       cat: 'Machine Learning',     size: 3 },
    { id: 'Scikit-learn',  cat: 'Machine Learning',     size: 2 },
    { id: 'UNet',          cat: 'Machine Learning',     size: 2 },
    { id: 'Random Forest', cat: 'Machine Learning',     size: 1 },
    { id: 'MaxEnt',        cat: 'Machine Learning',     size: 1 },

    { id: 'Django',        cat: 'Web & Databases',      size: 3 },
    { id: 'FastAPI',       cat: 'Web & Databases',      size: 3 },
    { id: 'React',         cat: 'Web & Databases',      size: 3 },
    { id: 'Next.js',       cat: 'Web & Databases',      size: 2 },
    { id: 'Svelte',        cat: 'Web & Databases',      size: 2 },
    { id: 'PostgreSQL',    cat: 'Web & Databases',      size: 3 },
    { id: 'Redis',         cat: 'Web & Databases',      size: 2 },
    { id: 'MongoDB',       cat: 'Web & Databases',      size: 2 },
    { id: 'Wagtail',       cat: 'Web & Databases',      size: 2 },
    { id: 'Prisma',        cat: 'Web & Databases',      size: 1 },

    { id: 'Docker',        cat: 'Cloud & DevOps',       size: 3 },
    { id: 'Kubernetes',    cat: 'Cloud & DevOps',       size: 3 },
    { id: 'AWS',           cat: 'Cloud & DevOps',       size: 3 },
    { id: 'GCP',           cat: 'Cloud & DevOps',       size: 2 },
    { id: 'CI/CD',         cat: 'Cloud & DevOps',       size: 2 },
    { id: 'Prefect',       cat: 'Cloud & DevOps',       size: 2 },
    { id: 'Dask',          cat: 'Cloud & DevOps',       size: 1 },
    { id: 'Linux',         cat: 'Cloud & DevOps',       size: 1 },
  ];

  /* ── Simple Icons slugs (cdn.simpleicons.org/{slug}/{hexColor}) ── */
  /* Technologies with a Simple Icons CDN entry */
  const ICON_SLUG = {
    'Python':       'python',
    'JavaScript':   'javascript',
    'Rust':         'rust',
    'R':            'r',
    'Earth Engine': 'googleearthengine',
    'QGIS':         'qgis',
    'Leaflet':      'leaflet',
    'ArcGIS':       'arcgis',
    'TensorFlow':   'tensorflow',
    'PyTorch':      'pytorch',
    'Scikit-learn': 'scikitlearn',
    'Django':       'django',
    'FastAPI':      'fastapi',
    'React':        'react',
    'Next.js':      'nextdotjs',
    'Svelte':       'svelte',
    'PostgreSQL':   'postgresql',
    'Redis':        'redis',
    'MongoDB':      'mongodb',
    'Wagtail':      'wagtail',
    'Prisma':       'prisma',
    'Docker':       'docker',
    'Kubernetes':   'kubernetes',
    'AWS':          'amazonaws',
    'GCP':          'googlecloud',
    'Linux':        'linux',
    'Prefect':      'prefect',
  };

  /* Short monograms for tools that have no brand icon */
  const MONOGRAM = {
    'SQL':           'SQL',
    'GDAL':          'GD',
    'PostGIS':       'PG',
    'GeoPandas':     'GP',
    'UNet':          'UN',
    'MaxEnt':        'ME',
    'Random Forest': 'RF',
    'Java':          'JV',
    'Dask':          'DA',
    'CI/CD':         'CI',
  };

  const HUB_R  = 36;
  const skillR = d => 9 + (d.size || 1) * 4.5;

  const nodes = rawNodes.map(n => ({
    ...n,
    r: n.group === 'hub' ? HUB_R : skillR(n),
    color: CAT[n.group === 'hub' ? n.id : n.cat]?.color ?? '#f59e0b',
  }));

  const links = nodes
    .filter(n => n.cat)
    .map(n => ({ source: n.id, target: n.cat }));

  /* ── Dimensions ── */
  const W  = wrap.clientWidth;
  const SH = 516;

  /* ── Pentagon pre-positioning ── */
  const cx = W / 2, cy = SH / 2;
  const hubSpread = Math.min(W, SH) * 0.30;
  nodes.filter(n => n.group === 'hub').forEach((n, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    n.x = cx + Math.cos(a) * hubSpread;
    n.y = cy + Math.sin(a) * hubSpread;
  });
  nodes.filter(n => n.cat).forEach(n => {
    const hub = nodes.find(h => h.id === n.cat);
    if (hub) {
      n.x = hub.x + (Math.random() - 0.5) * 65;
      n.y = hub.y + (Math.random() - 0.5) * 65;
    }
  });

  /* ── Injected styles ── */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .sk-hub-ring { animation: skHubPulse 3s ease-in-out infinite; }
    @keyframes skHubPulse {
      0%, 100% { opacity: 0.22; }
      50%       { opacity: 0.05; }
    }
    .sk-tooltip {
      position: fixed; display: none; pointer-events: none; z-index: 9999;
      background: rgba(14,14,16,0.93); backdrop-filter: blur(18px) saturate(150%);
      -webkit-backdrop-filter: blur(18px) saturate(150%);
      border: 1px solid rgba(255,255,255,0.13); border-radius: 9px;
      padding: 7px 14px 9px; font-family: 'JetBrains Mono', monospace;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5); white-space: nowrap;
    }
    .sk-tooltip-name { display: block; font-size: 12px; font-weight: 600; color: #f4f3f0; letter-spacing: 0.02em; }
    .sk-tooltip-cat  { display: block; font-size: 10px; margin-top: 3px; letter-spacing: 0.04em; opacity: 0.88; }
    .sk-legend {
      display: flex; justify-content: center; align-items: center;
      gap: 5px; padding: 10px 16px 6px; flex-wrap: wrap;
    }
    .sk-legend-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: 1px solid transparent; cursor: pointer;
      font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.03em;
      color: var(--muted, #b5b0aa); padding: 4px 11px 4px 8px; border-radius: 20px;
      transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }
    .sk-legend-btn:hover { color: var(--text, #f4f3f0); border-color: var(--border, rgba(255,255,255,0.12)); }
    .sk-legend-btn.active {
      color: var(--text, #f4f3f0);
      background: var(--amber-10, rgba(245,158,11,.08));
      border-color: var(--border-a, rgba(245,158,11,.25));
    }
    .sk-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .sk-hint { pointer-events: none; user-select: none; fill: rgba(255,255,255,0.38); }
    [data-theme="light"] .sk-hint { fill: rgba(0,0,0,0.38); }
    .sk-dot-fill { fill: rgba(128,128,128,0.10); }
    [data-theme="light"] .sk-dot-fill { fill: rgba(0,0,0,0.08); }
  `;
  document.head.appendChild(styleEl);

  /* ── Tooltip ── */
  const tooltip = document.createElement('div');
  tooltip.className = 'sk-tooltip';
  tooltip.innerHTML = '<span class="sk-tooltip-name"></span><span class="sk-tooltip-cat"></span>';
  document.body.appendChild(tooltip);

  /* ── SVG ── */
  const svg = d3.select(wrap)
    .append('svg')
    .attr('width', W).attr('height', SH)
    .attr('viewBox', `0 0 ${W} ${SH}`)
    .style('overflow', 'visible')
    .style('display', 'block');

  /* ── Defs ── */
  const defs = svg.append('defs');

  /* Dot-grid pattern */
  const dotPat = defs.append('pattern')
    .attr('id', 'sk-dots').attr('x', 0).attr('y', 0)
    .attr('width', 28).attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse');
  dotPat.append('circle').attr('cx', 1).attr('cy', 1).attr('r', 0.9)
    .attr('class', 'sk-dot-fill');

  /* Radial vignette */
  const vigGrad = defs.append('radialGradient')
    .attr('id', 'sk-vig').attr('cx', '50%').attr('cy', '50%').attr('r', '62%');
  vigGrad.append('stop').attr('offset', '0%')  .attr('stop-color', 'rgba(255,255,255,0.022)');
  vigGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0)');

  /* Per-category glow filters + hub radial fills */
  const catEntries   = Object.entries(CAT);
  const colorFilter  = {};
  const hubGradFill  = {};

  catEntries.forEach(([name, { color }], i) => {
    const f = defs.append('filter')
      .attr('id', `skglow${i}`)
      .attr('x', '-70%').attr('y', '-70%')
      .attr('width', '240%').attr('height', '240%');
    f.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    const m = f.append('feMerge');
    m.append('feMergeNode').attr('in', 'blur');
    m.append('feMergeNode').attr('in', 'SourceGraphic');
    colorFilter[color] = `url(#skglow${i})`;

    const rg = defs.append('radialGradient')
      .attr('id', `skrg${i}`).attr('cx', '40%').attr('cy', '35%').attr('r', '65%');
    rg.append('stop').attr('offset', '0%')  .attr('stop-color', color).attr('stop-opacity', 0.32);
    rg.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.04);
    hubGradFill[name] = `url(#skrg${i})`;
  });

  /* Circular clip paths for icon nodes (one per skill size) */
  [1, 2, 3].forEach(sz => {
    defs.append('clipPath').attr('id', `sk-clip${sz}`)
      .append('circle').attr('r', skillR({ size: sz }) - 1.5);
  });

  /* ── Per-category ambient blob radials ── */
  const blobPositions = [
    [0.14, 0.28], [0.82, 0.18], [0.55, 0.80], [0.30, 0.68], [0.75, 0.60],
  ];
  catEntries.forEach(([, { color }], i) => {
    const [bx, by] = blobPositions[i];
    const rid = `sk-amb${i}`;
    const rg = defs.append('radialGradient').attr('id', rid)
      .attr('cx', `${bx * 100}%`).attr('cy', `${by * 100}%`)
      .attr('r', '28%').attr('gradientUnits', 'objectBoundingBox');
    rg.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.11);
    rg.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
    svg.append('rect').attr('width', W).attr('height', SH).attr('rx', 14)
      .attr('fill', `url(#${rid})`).attr('pointer-events', 'none');
  });

  /* ── Backgrounds ── */
  svg.append('rect').attr('width', W).attr('height', SH).attr('rx', 14).attr('fill', 'url(#sk-dots)');
  svg.append('rect').attr('width', W).attr('height', SH).attr('rx', 14).attr('fill', 'url(#sk-vig)');

  /* ── Hint ── */
  svg.append('text')
    .attr('class', 'sk-hint')
    .attr('x', W - 14).attr('y', SH - 12)
    .attr('text-anchor', 'end')
    .attr('font-size', '10px')
    .attr('font-family', 'JetBrains Mono, monospace')
    .text('drag  ·  click hub to focus');

  /* ── Simulation ── */
  const sim = d3.forceSimulation(nodes)
    .force('link',    d3.forceLink(links).id(d => d.id).distance(115).strength(0.50))
    .force('charge',  d3.forceManyBody().strength(d => d.group === 'hub' ? -440 : -85))
    .force('center',  d3.forceCenter(cx, cy).strength(0.04))
    .force('collide', d3.forceCollide().radius(d => d.r + 11).strength(0.82))
    .alphaDecay(0.011)
    .velocityDecay(0.44);

  /* Drift force */
  let driftT = 0;
  sim.force('drift', () => {
    driftT += 0.005;
    nodes.forEach(n => {
      if (n.fx != null) return;
      n.vx += Math.sin(driftT + n.index * 1.3) * 0.016;
      n.vy += Math.cos(driftT + n.index * 0.9) * 0.016;
    });
  });

  /* Soft elastic walls — push nodes away from the container edges */
  sim.force('walls', () => {
    const margin = 60;
    nodes.forEach(n => {
      if (n.x < margin)       n.vx += (margin - n.x)       * 0.014;
      if (n.x > W  - margin)  n.vx -= (n.x - (W  - margin)) * 0.014;
      if (n.y < margin)       n.vy += (margin - n.y)       * 0.014;
      if (n.y > SH - margin)  n.vy -= (n.y - (SH - margin)) * 0.014;
    });
  });

  /* Mouse gravity (attraction toward cursor) */
  const svgMouse = { x: null, y: null };
  sim.force('mouseGravity', () => {
    if (svgMouse.x === null) return;
    nodes.forEach(n => {
      if (n.fx != null) return;
      const dx   = svgMouse.x - n.x;
      const dy   = svgMouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 190) {
        const str = 0.011 * (1 - dist / 190);
        n.vx += (dx / dist) * str;
        n.vy += (dy / dist) * str;
      }
    });
  });

  svg.on('mousemove.gravity', function (event) {
    [svgMouse.x, svgMouse.y] = d3.pointer(event);
  });
  svg.on('mouseleave.gravity', () => { svgMouse.x = svgMouse.y = null; });

  /* ── State ── */
  let focusedCat = null;
  let hoveredId  = null;
  let wasDragged = false;

  function getConnected(nodeId) {
    const set = new Set([nodeId]);
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === nodeId) set.add(t);
      if (t === nodeId) set.add(s);
    });
    return set;
  }

  function refreshVisuals(dur) {
    const conn = hoveredId ? getConnected(hoveredId) : null;

    nodeSel.transition().duration(dur)
      .style('opacity', d => {
        if (focusedCat && d.id !== focusedCat && d.cat !== focusedCat) return 0.07;
        if (conn && !conn.has(d.id)) return 0.13;
        return 1;
      });

    nodeSel.selectAll('.sk-circ').transition().duration(dur)
      .attr('r', d => {
        if (d.id === hoveredId) return d.r * 1.38;
        if (conn && conn.has(d.id) && d.group !== 'hub') return d.r * 1.14;
        return d.r;
      })
      .attr('stroke-opacity', d => {
        if (conn && conn.has(d.id)) return d.group === 'hub' ? 1 : 0.95;
        if (conn) return 0.18;
        return d.group === 'hub' ? 0.82 : 0.50;
      });

    linkSel.transition().duration(dur)
      .attr('stroke-opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (focusedCat && s !== focusedCat && t !== focusedCat) return 0.02;
        if (conn && (s === hoveredId || t === hoveredId)) return 0.85;
        if (conn) return 0.04;
        if (focusedCat && (s === focusedCat || t === focusedCat)) return 0.72;
        return 0.18;
      })
      .attr('stroke-width', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (conn && (s === hoveredId || t === hoveredId)) return 2.5;
        if (focusedCat && (s === focusedCat || t === focusedCat)) return 1.8;
        return 1;
      });
  }

  function focusCategory(cat) {
    const same = focusedCat === cat;
    focusedCat = same ? null : cat;
    hoveredId  = null;
    tooltip.style.display = 'none';

    sim.force('link').distance(d => {
      if (!focusedCat) return 115;
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return (s === focusedCat || t === focusedCat) ? 178 : 72;
    });
    sim.alpha(0.32).restart();
    setTimeout(() => sim.alphaTarget(0.005), 1700);

    refreshVisuals(420);
    updateLegend();
  }

  /* ── Links ── */
  const linkSel = svg.append('g').selectAll('line')
    .data(links).enter().append('line')
    .attr('stroke', d => {
      const src = nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source));
      return src?.color ?? '#f59e0b';
    })
    .attr('stroke-opacity', 0.18)
    .attr('stroke-width', 1);

  /* ── Node groups ── */
  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).enter().append('g')
    .style('cursor', 'pointer')
    .call(
      d3.drag()
        .on('start', (ev, d) => {
          wasDragged = false;
          if (!ev.active) sim.alphaTarget(0.25).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag',  (ev, d) => { wasDragged = true; d.fx = ev.x; d.fy = ev.y; })
        .on('end',   (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.005);
          d.fx = null; d.fy = null;
        })
    );

  /* Pulsing outer ring — hubs */
  nodeSel.filter(d => d.group === 'hub').each(function (d, i) {
    d3.select(this).append('circle')
      .attr('class', 'sk-hub-ring')
      .attr('r', d.r + 20)
      .attr('fill', 'none')
      .attr('stroke', d.color)
      .attr('stroke-width', 1.4)
      .style('animation-delay', `${i * 0.58}s`);
  });

  /* Soft halo — hubs */
  nodeSel.filter(d => d.group === 'hub')
    .append('circle')
    .attr('r', d => d.r + 8)
    .attr('fill', 'none')
    .attr('stroke', d => d.color)
    .attr('stroke-opacity', 0.10)
    .attr('stroke-width', 6);

  /* Main circle */
  nodeSel.append('circle')
    .attr('class', 'sk-circ')
    .attr('r', d => d.r)
    .attr('fill', d => {
      if (d.group === 'hub') return hubGradFill[d.id];
      return ICON_SLUG[d.id] ? d.color + '12' : d.color + '1e';
    })
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => d.group === 'hub' ? 1.6 : 1.0)
    .attr('stroke-opacity', d => d.group === 'hub' ? 0.82 : 0.50)
    .attr('filter', d => d.group === 'hub' ? colorFilter[d.color] : null);

  /* Tech icons — all skill nodes with a known Simple Icons slug */
  nodeSel.filter(d => d.group !== 'hub' && ICON_SLUG[d.id])
    .append('image')
    .attr('class', 'sk-icon')
    .attr('href', d => `https://cdn.simpleicons.org/${ICON_SLUG[d.id]}/${d.color.slice(1)}`)
    .attr('width',  d => d.r * 1.55)
    .attr('height', d => d.r * 1.55)
    .attr('x', d => -d.r * 0.775)
    .attr('y', d => -d.r * 0.775)
    .attr('clip-path', d => `url(#sk-clip${d.size})`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('pointer-events', 'none');

  /* Monogram — nodes with no brand icon (centered abbreviation) */
  nodeSel.filter(d => d.group !== 'hub' && !ICON_SLUG[d.id])
    .append('text')
    .text(d => MONOGRAM[d.id] || d.id.slice(0, 2).toUpperCase())
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.80)
    .attr('font-size', d => `${Math.max(Math.floor(d.r * 0.60), 7)}px`)
    .attr('font-family', 'JetBrains Mono, monospace')
    .attr('font-weight', '700')
    .attr('letter-spacing', '0.04em')
    .attr('pointer-events', 'none')
    .style('user-select', 'none');

  /* Hub label — always visible */
  nodeSel.filter(d => d.group === 'hub')
    .append('text')
    .text(d => CAT[d.id]?.short ?? d.id)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', d => d.color)
    .attr('font-size', '11px')
    .attr('font-family', 'Syne, sans-serif')
    .attr('font-weight', '700')
    .attr('letter-spacing', '0.04em')
    .attr('pointer-events', 'none')
    .style('user-select', 'none');

  /* Skill labels — size 3 fully visible, size 2 at softer opacity */
  const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';
  nodeSel.filter(d => d.group !== 'hub' && d.size >= 2)
    .append('text')
    .attr('class', 'sk-skill-label')
    .text(d => d.id)
    .attr('y', d => d.r + 13)
    .attr('text-anchor', 'middle')
    .attr('fill', isDark() ? '#f4f3f0' : '#1a1a1e')
    .attr('fill-opacity', d => d.size === 3 ? 0.82 : 0.52)
    .attr('font-size', d => d.size === 3 ? '9.5px' : '8.5px')
    .attr('font-family', 'Inter, sans-serif')
    .attr('font-weight', '500')
    .attr('pointer-events', 'none')
    .style('user-select', 'none');

  /* ── Interactions ── */
  nodeSel
    .on('mouseenter', function (event, d) {
      if (focusedCat && d.id !== focusedCat && d.cat !== focusedCat) return;
      hoveredId = d.id;
      refreshVisuals(160);
      if (d.group !== 'hub') {
        tooltip.querySelector('.sk-tooltip-name').textContent = d.id;
        const catEl = tooltip.querySelector('.sk-tooltip-cat');
        catEl.textContent = d.cat;
        catEl.style.color = d.color;
        tooltip.style.display = 'block';
      }
    })
    .on('mousemove', function (event) {
      if (tooltip.style.display === 'block') {
        tooltip.style.left = (event.clientX + 16) + 'px';
        tooltip.style.top  = (event.clientY - 42) + 'px';
      }
    })
    .on('mouseleave', function () {
      hoveredId = null;
      tooltip.style.display = 'none';
      refreshVisuals(300);
    })
    .on('click', function (event, d) {
      event.stopPropagation();
      if (wasDragged) return;
      if (d.group === 'hub') focusCategory(d.id);
    });

  svg.on('click', () => { if (focusedCat) focusCategory(null); });

  /* ── Tick ── */
  sim.on('tick', () => {
    nodes.forEach(n => {
      const pad = n.r + 28;
      n.x = Math.max(pad, Math.min(W  - pad, n.x));
      n.y = Math.max(pad, Math.min(SH - pad, n.y));
    });
    linkSel
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  /* ── Legend (sibling below the wrap) ── */
  const legendDiv = document.createElement('div');
  legendDiv.className = 'sk-legend';
  wrap.insertAdjacentElement('afterend', legendDiv);

  const legendBtns = {};
  catEntries.forEach(([name, { color }]) => {
    const btn = document.createElement('button');
    btn.className = 'sk-legend-btn';
    btn.innerHTML = `<span class="sk-legend-dot" style="background:${color}"></span>${name}`;
    btn.addEventListener('click', () => focusCategory(name));
    legendDiv.appendChild(btn);
    legendBtns[name] = btn;
  });

  function updateLegend() {
    catEntries.forEach(([name]) => {
      legendBtns[name].classList.toggle('active', name === focusedCat);
    });
  }

  /* ── Theme sync ── */
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
      const dark = isDark();
      nodeSel.selectAll('.sk-skill-label').attr('fill', dark ? '#f4f3f0' : '#1a1a1e');
    }, 50);
  });

  /* ── Resize ── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth < 800) {
        wrap.style.display = 'none';
        legendDiv.style.display = 'none';
        if (grid) grid.style.display = 'grid';
      }
    }, 300);
  });
})();
