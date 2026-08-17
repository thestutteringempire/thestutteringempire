(function(){
  const canvas = document.getElementById('splash-canvas');
  if (!canvas) return;

  function init(){
    const ctx = canvas.getContext('2d');
    const enterBtn = document.getElementById('enter-btn');
    const splashContent = document.getElementById('splash-content');

    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize(){
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', () => { resize(); layoutProvinces(); draw(); });

  // ---- Colors: matches the site's grey/white palette exactly ----
  // The player's nation (Germany) is near-black, like the reference
  // brick/void tones used elsewhere on the site. Rival nations are drawn
  // in varying light-to-mid greys so the map still reads as politically
  // divided, and the page background itself is the same #333 grey used
  // site-wide.
  const COLORS = {
    background: '#333333',
    germanyFill: '#141414',
    germanyFillCore: '#0a0a0a',
    borderColor: '#000000',
    text: '#ffffff',
  };

  // A handful of distinct grey tones for the rival/neighboring nations,
  // so the map reads as genuinely multi-national rather than "claimed vs empty".
  const RIVAL_PALETTE = [
    '#4a4a4a', '#5c5c5c', '#6e6e6e', '#454045',
    '#565050', '#3f4448', '#525252', '#494e52',
  ];

  // ---- Province grid: irregular polygon cells via jittered grid + relaxation-ish scatter ----
  let provinces = [];
  let adjacency = []; // adjacency[i] = array of neighbor indices

  function seededRandom(seed){
    let s = seed;
    return function(){
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function buildProvinceGrid(cols, rows, jitter, rand){
    const cellW = width / cols;
    const cellH = height / rows;
    const pts = [];
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const jx = (rand() - 0.5) * jitter * cellW;
        const jy = (rand() - 0.5) * jitter * cellH;
        pts.push({
          x: c * cellW + cellW / 2 + jx,
          y: r * cellH + cellH / 2 + jy,
          col: c, row: r
        });
      }
    }
    return { pts, cols, rows };
  }

  // Build a simple Voronoi-ish polygon per point by sampling a coarse pixel
  // grid and assigning each sample to its nearest point (cheap poor-man's
  // Voronoi, fine at this resolution and avoids external libraries).
  function buildVoronoiCells(pts, resolution){
    const cellW = Math.ceil(width / resolution);
    const cellH = Math.ceil(height / resolution);
    const ownerGrid = new Int16Array(cellW * cellH);

    for (let gy = 0; gy < cellH; gy++){
      for (let gx = 0; gx < cellW; gx++){
        const px = gx * resolution + resolution / 2;
        const py = gy * resolution + resolution / 2;
        let best = -1, bestDist = Infinity;
        for (let i = 0; i < pts.length; i++){
          const dx = pts[i].x - px;
          const dy = pts[i].y - py;
          const d = dx * dx + dy * dy;
          if (d < bestDist){ bestDist = d; best = i; }
        }
        ownerGrid[gy * cellW + gx] = best;
      }
    }

    return { ownerGrid, cellW, cellH, resolution };
  }

  function buildAdjacency(voronoi, count){
    const { ownerGrid, cellW, cellH } = voronoi;
    const adj = Array.from({ length: count }, () => new Set());
    for (let gy = 0; gy < cellH; gy++){
      for (let gx = 0; gx < cellW; gx++){
        const owner = ownerGrid[gy * cellW + gx];
        if (owner < 0) continue;
        const right = gx + 1 < cellW ? ownerGrid[gy * cellW + gx + 1] : -1;
        const down = gy + 1 < cellH ? ownerGrid[(gy + 1) * cellW + gx] : -1;
        if (right >= 0 && right !== owner){ adj[owner].add(right); adj[right].add(owner); }
        if (down >= 0 && down !== owner){ adj[owner].add(down); adj[down].add(owner); }
      }
    }
    return adj.map(s => Array.from(s));
  }

  let voronoi = null;
  let gridInfo = null;
  let rand = seededRandom(Date.now() % 100000);

  function layoutProvinces(){
    const cols = Math.max(10, Math.round(width / 42));
    const rows = Math.max(8, Math.round(height / 42));
    gridInfo = buildProvinceGrid(cols, rows, 0.75, rand);
    voronoi = buildVoronoiCells(gridInfo.pts, 6);
    adjacency = buildAdjacency(voronoi, gridInfo.pts.length);
    provinces = gridInfo.pts.map((p, i) => ({
      ...p,
      id: i,
      nation: -1,       // -1 = unclaimed, 0 = Germany, 1+ = rival nation index
      isCore: false,
    }));
    seedRivalNations();
    pickGermanCore();
  }

  // ---- Seed several rival nations across the whole map first ----
  // Each rival grows from its own randomized seed point using the same
  // BFS-flood approach, so every unclaimed province ends up belonging to
  // some neighboring country - giving the map real political division
  // instead of a flat "claimed vs empty" look.
  const RIVAL_NAMES = ['Stuttering', 'Anxiety', 'Negative Emotions', 'OCD', 'Trauma', 'Depression', 'ADHD'];
  const RIVAL_COUNT = RIVAL_NAMES.length;
  let rivalColors = [];
  let rivalLabelPositions = []; // one {x,y} centroid per rival, recomputed each layout

  function seedRivalNations(){
    rivalColors = [];
    const seeds = [];
    const usedIds = new Set();

    for (let i = 0; i < RIVAL_COUNT; i++){
      let idx;
      let attempts = 0;
      do {
        idx = Math.floor(rand() * provinces.length);
        attempts++;
      } while (usedIds.has(idx) && attempts < 50);
      usedIds.add(idx);
      seeds.push(idx);
      rivalColors.push(RIVAL_PALETTE[i % RIVAL_PALETTE.length]);
    }

    // Multi-source BFS: grow every rival nation simultaneously, one ring
    // at a time, so territory sizes stay roughly balanced and borders
    // meet each other naturally in the middle rather than one nation
    // swallowing the whole map.
    const frontiers = seeds.map(s => [s]);
    for (let i = 0; i < seeds.length; i++){
      provinces[seeds[i]].nation = i + 1; // +1 since 0 is reserved for Germany
    }

    let anyGrowth = true;
    while (anyGrowth){
      anyGrowth = false;
      for (let i = 0; i < frontiers.length; i++){
        const nextFrontier = [];
        for (const id of frontiers[i]){
          for (const n of (adjacency[id] || [])){
            if (provinces[n].nation === -1){
              provinces[n].nation = i + 1;
              nextFrontier.push(n);
              anyGrowth = true;
            }
          }
        }
        frontiers[i] = nextFrontier;
      }
    }

    // Compute each rival's territory centroid so its name label can sit
    // roughly in the middle of its own land, like a country name on a map.
    rivalLabelPositions = [];
    for (let i = 0; i < RIVAL_COUNT; i++){
      const nationId = i + 1;
      let sumX = 0, sumY = 0, count = 0;
      for (const p of provinces){
        if (p.nation === nationId){
          sumX += p.x; sumY += p.y; count++;
        }
      }
      rivalLabelPositions.push(count > 0 ? { x: sumX / count, y: sumY / count } : null);
    }
  }

  // ---- Carve the fixed German starting core out of whichever rival ----
  // currently sits near the map's center. This always represents the
  // historical starting point: the North German Confederation under
  // Bismarck, immediately before unification into the German Empire.
  let coreIds = [];
  let expansionQueue = [];
  let ownedSet = new Set();

  function pickGermanCore(){
    const cx = width * 0.5;
    const cy = height * 0.42;
    let seedIdx = 0, bestDist = Infinity;
    for (let i = 0; i < provinces.length; i++){
      const dx = provinces[i].x - cx;
      const dy = provinces[i].y - cy;
      const d = dx * dx + dy * dy;
      if (d < bestDist){ bestDist = d; seedIdx = i; }
    }

    const coreSize = 9 + Math.floor(provinces.length * 0.012);
    const visited = new Set([seedIdx]);
    const queue = [seedIdx];
    const core = [seedIdx];

    while (queue.length && core.length < coreSize){
      const current = queue.shift();
      for (const n of (adjacency[current] || [])){
        if (!visited.has(n)){
          visited.add(n);
          queue.push(n);
          core.push(n);
          if (core.length >= coreSize) break;
        }
      }
    }

    coreIds = core;
    ownedSet = new Set(core);
    for (const id of core){
      provinces[id].nation = 0; // 0 = Germany
      provinces[id].isCore = true;
    }

    const frontier = new Set();
    for (const id of core){
      for (const n of (adjacency[id] || [])){
        if (!ownedSet.has(n)) frontier.add(n);
      }
    }
    expansionQueue = Array.from(frontier);
  }

  // ---- Randomized conquest beyond the fixed core, re-rolled every load ----
  // Each step "annexes" one bordering province away from whichever rival
  // nation currently holds it.
  const TOTAL_EXPANSION_STEPS = 46;
  let expansionStepsTaken = 0;
  let lastExpansionTime = 0;
  const EXPANSION_INTERVAL = 0.05; // seconds between each new province claim

  function expandOneStep(){
    if (expansionQueue.length === 0 || expansionStepsTaken >= TOTAL_EXPANSION_STEPS) return;

    const pickIdx = Math.floor(rand() * expansionQueue.length);
    const next = expansionQueue.splice(pickIdx, 1)[0];

    if (ownedSet.has(next)){
      return;
    }

    ownedSet.add(next);
    provinces[next].nation = 0;
    expansionStepsTaken++;

    for (const n of (adjacency[next] || [])){
      if (!ownedSet.has(n) && !expansionQueue.includes(n)){
        expansionQueue.push(n);
      }
    }
  }

  // ---- Draw a province as a filled cell using its Voronoi pixel membership ----
  // For performance we rasterize once into an offscreen buffer keyed by
  // ownership state, redrawing only when ownership changes meaningfully.
  let needsRedraw = true;

  function draw(){
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    if (!voronoi) return;

    const { ownerGrid, cellW, cellH, resolution } = voronoi;

    for (let gy = 0; gy < cellH; gy++){
      for (let gx = 0; gx < cellW; gx++){
        const owner = ownerGrid[gy * cellW + gx];
        if (owner < 0) continue;
        const p = provinces[owner];
        const px = gx * resolution;
        const py = gy * resolution;

        if (p.nation === 0){
          ctx.fillStyle = p.isCore ? COLORS.germanyFillCore : COLORS.germanyFill;
        } else if (p.nation > 0){
          ctx.fillStyle = rivalColors[p.nation - 1] || COLORS.background;
        } else {
          ctx.fillStyle = COLORS.background;
        }
        ctx.fillRect(px, py, resolution + 1, resolution + 1);
      }
    }

    // Province borders: draw a thin dark line wherever adjacent pixels
    // belong to different owners, giving that classic province-outline look.
    ctx.fillStyle = COLORS.borderColor;
    for (let gy = 0; gy < cellH; gy++){
      for (let gx = 0; gx < cellW; gx++){
        const owner = ownerGrid[gy * cellW + gx];
        const rightOwner = gx + 1 < cellW ? ownerGrid[gy * cellW + gx + 1] : owner;
        const downOwner = gy + 1 < cellH ? ownerGrid[(gy + 1) * cellW + gx] : owner;
        const px = gx * resolution;
        const py = gy * resolution;
        if (rightOwner !== owner){
          ctx.fillRect(px + resolution - 1, py, 1, resolution + 1);
        }
        if (downOwner !== owner){
          ctx.fillRect(px, py + resolution - 1, resolution + 1, 1);
        }
      }
    }

    // Territory name labels, drawn faint and small so they read like
    // subtle map labels rather than competing with the page's main title.
    if (rivalLabelPositions.length){
      ctx.save();
      ctx.font = '11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      try { ctx.letterSpacing = '1px'; } catch (e) { /* not supported in this browser, safe to ignore */ }
      for (let i = 0; i < RIVAL_NAMES.length; i++){
        const pos = rivalLabelPositions[i];
        if (!pos) continue;
        ctx.fillText(RIVAL_NAMES[i].toUpperCase(), pos.x, pos.y);
      }
      ctx.restore();
    }
  }

  // ---- Animation loop ----
  let startTime = null;

  function tick(now){
    if (startTime === null) startTime = now;
    const t = (now - startTime) / 1000;

    if (t - lastExpansionTime > EXPANSION_INTERVAL){
      lastExpansionTime = t;
      expandOneStep();
    }

    draw();
    requestAnimationFrame(tick);
  }

  resize();
  layoutProvinces();
  draw();
  requestAnimationFrame(tick);

  if (enterBtn){
    enterBtn.addEventListener('click', function(){
      sessionStorage.setItem('sdn-audio-enabled', '1');
      if (splashContent) splashContent.classList.add('splash-fading-ui');

      const overlay = document.getElementById('splash-fade-overlay');
      if (overlay){
        overlay.classList.add('active');
        setTimeout(function(){
          window.location.href = 'news.html';
        }, 1000);
      } else {
        window.location.href = 'news.html';
      }
    });
  }
  } // end init()

  let initialized = false;
  function safeInit(){
    if (initialized) return;
    initialized = true;
    init();
  }

  if (document.readyState === 'complete'){
    safeInit();
  } else {
    window.addEventListener('load', safeInit);
    // Fallback: don't leave the visitor staring at a blank canvas if the
    // 'load' event is ever delayed (e.g. a slow external font fetch).
    setTimeout(safeInit, 1200);
  }
})();
