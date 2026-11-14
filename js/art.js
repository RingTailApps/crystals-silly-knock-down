/* Procedural art: sky, clouds, hills, ground, podiums, slingshot, blocks, ball. */
(function (KO) {
  const Art = {};
  let V = { scale: 1, offX: 0, offY: 0, dpr: 1, sw: 1, sh: 1 };
  const spriteCache = new Map();
  let cloudSprites = [];

  Art.setView = function (v) {
    const q = v.scale * v.dpr, oldQ = V.scale * V.dpr;
    V = v;
    if (Math.abs(q - oldQ) > 0.001) spriteCache.clear();
    buildClouds();
  };
  Art.view = () => V;

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  Art.rr = rr;

  /* ---------- clouds ---------- */
  function buildClouds() {
    cloudSprites = [];
    const d = V.dpr;
    for (let k = 0; k < 4; k++) {
      const cw = 260, ch = 120;
      const c = document.createElement("canvas");
      c.width = cw * d; c.height = ch * d;
      const g = c.getContext("2d"); g.scale(d, d);
      const puffs = [];
      const n = 5 + k;
      for (let i = 0; i < n; i++) puffs.push([40 + (i / (n - 1)) * 180, 72 - Math.sin((i / (n - 1)) * Math.PI) * 26 + (Math.random() * 10 - 5), 26 + Math.sin((i / (n - 1)) * Math.PI) * 22 + Math.random() * 8]);
      g.fillStyle = "rgba(120,170,230,0.35)";
      puffs.forEach(p => { g.beginPath(); g.arc(p[0], p[1] + 8, p[2], 0, 7); g.fill(); });
      const grad = g.createLinearGradient(0, 20, 0, 110);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#e6f2ff");
      g.fillStyle = grad;
      puffs.forEach(p => { g.beginPath(); g.arc(p[0], p[1], p[2], 0, 7); g.fill(); });
      g.fillRect(40, 72, 180, 24);
      cloudSprites.push({ c, w: cw, h: ch });
    }
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) clouds.push({ x: Math.random(), y: 0.04 + Math.random() * 0.45, layer: i % 3, s: 0.5 + Math.random() * 0.7, k: i % 4 });

  /* ---------- sky (screen space) ---------- */
  Art.drawSky = function (g, t) {
    const { sw, sh } = V;
    const grad = g.createLinearGradient(0, 0, 0, sh);
    grad.addColorStop(0, "#2f86ff"); grad.addColorStop(0.45, "#74ccff"); grad.addColorStop(0.8, "#c9f1ff"); grad.addColorStop(1, "#fff1c9");
    g.fillStyle = grad; g.fillRect(0, 0, sw, sh);
    // sun + rays
    const sx = sw * 0.82, sy = sh * 0.12, R = Math.max(sw, sh);
    g.save(); g.translate(sx, sy); g.rotate(t * 0.04);
    g.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(R, -R * 0.09); g.lineTo(R, R * 0.09); g.fill(); }
    g.restore();
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, Math.min(sw, sh) * 0.35);
    sg.addColorStop(0, "rgba(255,250,200,0.95)"); sg.addColorStop(0.18, "rgba(255,236,150,0.8)"); sg.addColorStop(1, "rgba(255,236,150,0)");
    g.fillStyle = sg; g.fillRect(0, 0, sw, sh);
    // clouds, 3 parallax layers
    if (!cloudSprites.length) buildClouds();
    const unit = Math.min(sw, sh * 0.75) / 900;
    clouds.forEach(cl => {
      const sp = cloudSprites[cl.k]; const sc = cl.s * (0.6 + cl.layer * 0.35) * unit * 1.6;
      const w = sp.w * sc, span = sw + w * 2;
      const x = ((cl.x * span + t * (8 + cl.layer * 10) * unit * 2) % span) - w;
      g.globalAlpha = 0.65 + cl.layer * 0.15;
      g.drawImage(sp.c, x, cl.y * sh, w, sp.h * sc);
    });
    g.globalAlpha = 1;
  };

  /* ---------- world background (world space) ---------- */
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  Art.hash = hash;
  const hill = (x, a, b, c) => Math.sin(x * a) * 40 + Math.sin(x * b + 1.3) * 25 + Math.sin(x * c + 2.1) * 12;
  const GEMS = ["#ff3b7a", "#22d1ee", "#a855f7", "#ffd52e", "#3bdc6a", "#ff8a1f", "#3b8cff"];

  function crystalCluster(g, x, y, s, col, t, seed) {
    // 3-5 hexagonal prisms fanning out of the ground, with a soft glow
    const glow = g.createRadialGradient(x, y - s * 0.6, 2, x, y - s * 0.6, s * 1.4);
    glow.addColorStop(0, col + "88"); glow.addColorStop(1, col + "00");
    g.fillStyle = glow; g.fillRect(x - s * 1.5, y - s * 2, s * 3, s * 2.2);
    const n = 3 + Math.floor(hash(seed) * 3);
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.38 + (hash(seed + i) - 0.5) * 0.2;
      const h = s * (0.8 + hash(seed + i * 3.1) * 0.9) * (i === Math.floor(n / 2) ? 1.3 : 1), w = s * 0.32;
      g.save(); g.translate(x + (i - (n - 1) / 2) * w * 0.6, y); g.rotate(a);
      g.fillStyle = col; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h); g.lineTo(0, -h - w * 0.7); g.lineTo(w / 2, -h); g.lineTo(w / 2, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h); g.lineTo(0, -h - w * 0.7); g.lineTo(0, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,40,0.18)"; g.fillRect(w * 0.15, -h, w * 0.35, h);
      g.restore();
    }
    // twinkle
    const tw = Math.max(0, Math.sin(t * 2.2 + seed * 3));
    if (tw > 0.6) { g.save(); g.translate(x + s * 0.1, y - s * 1.3); g.globalAlpha = (tw - 0.6) * 2.5; glint(g, s * 0.35); g.restore(); }
  }
  function glint(g, r) {
    g.fillStyle = "#fff"; g.beginPath();
    g.moveTo(0, -r); g.quadraticCurveTo(0, 0, r, 0); g.quadraticCurveTo(0, 0, 0, r); g.quadraticCurveTo(0, 0, -r, 0); g.quadraticCurveTo(0, 0, 0, -r); g.fill();
  }
  Art.glint = glint;
  function tree(g, x, y, s, kind, t, seed) {
    const sway = Math.sin(t * 1.3 + seed) * 0.03;
    g.save(); g.translate(x, y); g.rotate(sway);
    g.fillStyle = "#7a4a2a"; rr(g, -s * 0.08, -s * 0.6, s * 0.16, s * 0.62, s * 0.05); g.fill();
    if (kind === 0) {
      const cols = [["#2fd16b", "#7dff9e"], ["#18b8a0", "#6ff5d8"], ["#5ad43a", "#b4ff7a"]][seed % 3];
      [[0, -s * 0.95, s * 0.42], [-s * 0.28, -s * 0.72, s * 0.3], [s * 0.3, -s * 0.74, s * 0.32]].forEach(c => {
        g.fillStyle = cols[0]; g.beginPath(); g.arc(c[0], c[1], c[2], 0, 7); g.fill();
        g.fillStyle = cols[1]; g.beginPath(); g.arc(c[0] - c[2] * 0.3, c[1] - c[2] * 0.3, c[2] * 0.45, 0, 7); g.fill();
      });
    } else {
      const c = ["#159e6a", "#0f8c8c"][seed % 2];
      for (let i = 0; i < 3; i++) {
        const yy = -s * 0.45 - i * s * 0.32, ww = s * (0.5 - i * 0.12);
        g.fillStyle = c; g.beginPath(); g.moveTo(-ww, yy); g.lineTo(0, yy - s * 0.5); g.lineTo(ww, yy); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(-ww, yy); g.lineTo(0, yy - s * 0.5); g.lineTo(-ww * 0.2, yy); g.closePath(); g.fill();
      }
    }
    g.restore();
  }

  Art.drawWorldBack = function (g, t) {
    const x0 = -V.offX / V.scale - 20, x1 = (V.sw - V.offX) / V.scale + 20;
    const y1 = (V.sh - V.offY) / V.scale + 20;
    const GY = KO.GROUND_Y;
    // far mountains with snow caps
    const mStart = Math.floor(x0 / 260) - 1;
    for (let k = mStart; k * 260 < x1 + 260; k++) {
      const cx = k * 260 + hash(k) * 120, h = 260 + hash(k + 9) * 220, w = 230 + hash(k + 4) * 140, base = GY - 120;
      const mg = g.createLinearGradient(0, base - h, 0, base);
      mg.addColorStop(0, "#8f7dff"); mg.addColorStop(1, "#b9b0ff");
      g.fillStyle = mg; g.beginPath(); g.moveTo(cx - w, base); g.lineTo(cx, base - h); g.lineTo(cx + w, base); g.closePath(); g.fill();
      g.fillStyle = "rgba(60,40,160,0.18)"; g.beginPath(); g.moveTo(cx, base - h); g.lineTo(cx + w, base); g.lineTo(cx + w * 0.15, base); g.closePath(); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - w * 0.22, base - h * 0.78); g.lineTo(cx, base - h); g.lineTo(cx + w * 0.22, base - h * 0.78);
      g.lineTo(cx + w * 0.1, base - h * 0.72); g.lineTo(cx, base - h * 0.8); g.lineTo(cx - w * 0.1, base - h * 0.7); g.closePath(); g.fill();
    }
    // rolling hills
    const layers = [
      { base: GY - 170, col: ["#5fd6a4", "#a8f5cf"], f: [0.004, 0.009, 0.02] },
      { base: GY - 90, col: ["#3fcf6a", "#8ef0a0"], f: [0.006, 0.013, 0.031] }
    ];
    layers.forEach((L, li) => {
      const gr = g.createLinearGradient(0, L.base - 80, 0, GY);
      gr.addColorStop(0, L.col[1]); gr.addColorStop(1, L.col[0]);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, GY + 10);
      for (let x = x0; x <= x1; x += 16) g.lineTo(x, L.base - hill(x + li * 300, ...L.f));
      g.lineTo(x1, GY + 10); g.closePath(); g.fill();
      // scenery on each hill layer
      const step = li ? 150 : 210;
      for (let k = Math.floor(x0 / step) - 1; k * step < x1 + step; k++) {
        const sx = k * step + hash(k * 7 + li) * step * 0.7, sy = L.base - hill(sx + li * 300, ...L.f) + 18;
        const r = hash(k * 13 + li * 5);
        const sc = li ? 1 : 0.7;
        if (r < 0.32) crystalCluster(g, sx, sy, 34 * sc, GEMS[Math.floor(hash(k + li * 50) * GEMS.length)], t, k + li * 100);
        else if (r < 0.82) tree(g, sx, sy, (80 + hash(k * 3) * 40) * sc, r < 0.6 ? 0 : 1, t, Math.abs(k));
      }
    });
    // earth
    const gg = g.createLinearGradient(0, GY, 0, GY + 260);
    gg.addColorStop(0, "#a5673a"); gg.addColorStop(1, "#6e3f22");
    g.fillStyle = gg; g.fillRect(x0, GY + 10, x1 - x0, y1 - GY);
    g.fillStyle = "rgba(0,0,0,0.07)";
    for (let y = GY + 80; y < y1; y += 80) g.fillRect(x0, y, x1 - x0, 14);
    // embedded rocks + tiny gems
    for (let cx = Math.floor(x0 / 170); cx * 170 < x1; cx++) {
      for (let j = 0; j < 5; j++) {
        const id = cx * 31 + j * 7.3;
        const sx = cx * 170 + hash(id) * 170, sy = GY + 46 + hash(id + 1.7) * 300;
        if (sy > y1) continue;
        if (j === 4) { g.save(); g.translate(sx, sy); g.rotate(0.785); g.fillStyle = GEMS[Math.floor(hash(id + 2) * GEMS.length)]; g.fillRect(-5, -5, 10, 10); g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(-5, -5, 5, 5); g.restore(); continue; }
        const r = 8 + hash(id + 3.1) * 14;
        g.fillStyle = "#8a7f7a"; g.beginPath();
        for (let a = 0; a < 6; a++) { const rr2 = r * (0.75 + hash(id + a) * 0.35); g.lineTo(sx + Math.cos(a * 1.047) * rr2 * 1.3, sy + Math.sin(a * 1.047) * rr2); }
        g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.45, r * 0.25, 0, 0, 7); g.fill();
      }
    }
    // grass top with blade tufts
    const fg = g.createLinearGradient(0, GY - 14, 0, GY + 22);
    fg.addColorStop(0, "#8dff6a"); fg.addColorStop(1, "#2fb84a");
    g.fillStyle = fg; g.fillRect(x0, GY - 8, x1 - x0, 26);
    g.fillStyle = "#2fb84a";
    for (let x = Math.floor(x0 / 22) * 22; x < x1; x += 22) {
      const h = 8 + hash(x) * 10;
      g.beginPath(); g.moveTo(x, GY + 18); g.lineTo(x + 6, GY + 18 + h * 0.6); g.lineTo(x + 12, GY + 18); g.fill();
      g.fillStyle = "#8dff6a"; g.beginPath(); g.moveTo(x + 4, GY - 7); g.lineTo(x + 8, GY - 7 - h * 0.7); g.lineTo(x + 12, GY - 7); g.fill();
      g.fillStyle = "#2fb84a";
    }
    g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(x0, GY - 7, x1 - x0, 3);
  };

  /* ---------- podium: carved stone pedestal / floating rock isle ---------- */
  Art.drawPodium = function (g, p, t) {
    const x = p.cx, top = p.top, w = p.w;
    if (p.rock) {
      const GY = KO.GROUND_Y;
      g.save();
      g.fillStyle = "rgba(30,20,40,0.28)"; g.beginPath(); g.ellipse(x, GY + 4, 60, 10, 0, 0, 7); g.fill();
      // stone post with a plinth
      const pg = g.createLinearGradient(x - 22, 0, x + 22, 0);
      pg.addColorStop(0, "#b8b0c8"); pg.addColorStop(0.35, "#f6f3fb"); pg.addColorStop(1, "#968ca9");
      g.fillStyle = "#5d5470"; g.fillRect(x - 25, top + 30, 50, GY - top - 30);
      g.fillStyle = pg; g.fillRect(x - 22, top + 30, 44, GY - top - 30);
      g.fillStyle = "#5d5470"; rr(g, x - 48, GY - 30, 96, 32, 8); g.fill();
      g.fillStyle = pg; rr(g, x - 45, GY - 27, 90, 27, 6); g.fill();
      // tilting slab
      g.translate(x, top + 17); g.rotate(p.angle || 0);
      g.fillStyle = "#4c4459"; rr(g, -w / 2 - 4, -19, w + 8, 38, 10); g.fill();
      const sg = g.createLinearGradient(0, -17, 0, 17);
      sg.addColorStop(0, "#efeaf7"); sg.addColorStop(1, "#a59cb8");
      g.fillStyle = sg; rr(g, -w / 2, -17, w, 34, 8); g.fill();
      g.fillStyle = "rgba(255,255,255,0.7)"; rr(g, -w / 2 + 8, -13, w - 16, 5, 3); g.fill();
      // chevrons hint at the rocking motion
      g.strokeStyle = "rgba(93,84,112,0.45)"; g.lineWidth = 4; g.lineCap = "round";
      [-1, 1].forEach(sx => { const cx = sx * w * 0.3; g.beginPath(); g.moveTo(cx - sx * 6, -2); g.lineTo(cx + sx * 4, 5); g.lineTo(cx - sx * 6, 12); g.stroke(); });
      // glowing pivot hub
      g.fillStyle = "#5d5470"; g.beginPath(); g.arc(0, 6, 15, 0, 7); g.fill();
      g.fillStyle = "#e9e4f2"; g.beginPath(); g.arc(0, 6, 12, 0, 7); g.fill();
      g.translate(0, 6); crystalShape(g, 7, 9, "#ff3b7a");
      g.restore();
      return;
    }
    if (p.float) {
      const th = 34;
      g.save();
      // levitation glow + crystal underneath
      const pulse = 0.8 + Math.sin(t * 3) * 0.2;
      const glow = g.createRadialGradient(x, top + th + 26, 4, x, top + th + 26, w * 0.7);
      glow.addColorStop(0, `rgba(120,240,255,${0.6 * pulse})`); glow.addColorStop(1, "rgba(120,240,255,0)");
      g.fillStyle = glow; g.fillRect(x - w, top - 10, w * 2, 160);
      // jagged rock underside
      g.fillStyle = "#6b6178"; g.beginPath(); g.moveTo(x - w / 2, top + th - 6);
      const n = 7;
      for (let i = 0; i <= n; i++) { const xx = x - w / 2 + (i / n) * w, d = Math.sin((i / n) * Math.PI) * (40 + hash(i + w) * 22); g.lineTo(xx, top + th - 6 + d); }
      g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(x - w / 2, top + th - 6); g.lineTo(x, top + th + 50); g.lineTo(x - w * 0.15, top + th - 6); g.fill();
      g.save(); g.translate(x, top + th + 52 + Math.sin(t * 3) * 3); crystalShape(g, 13, 26, "#5ff0ff"); g.restore();
      // stone slab with grass lip
      g.fillStyle = "#4c4459"; rr(g, x - w / 2 - 4, top - 2, w + 8, th + 4, 10); g.fill();
      const pg = g.createLinearGradient(0, top, 0, top + th);
      pg.addColorStop(0, "#d9d3e6"); pg.addColorStop(1, "#9b92ad");
      g.fillStyle = pg; rr(g, x - w / 2, top, w, th - 2, 8); g.fill();
      g.fillStyle = "#4fd34a"; rr(g, x - w / 2 - 2, top - 4, w + 4, 9, 4); g.fill();
      g.fillStyle = "#9dff7a"; rr(g, x - w / 2 + 6, top - 3, w - 12, 3, 2); g.fill();
      g.restore();
      return;
    }
    const GY = KO.GROUND_Y, capH = 28, colW = w - 30;
    g.save();
    g.fillStyle = "rgba(30,20,40,0.28)"; g.beginPath(); g.ellipse(x, GY + 4, w * 0.62, 12, 0, 0, 7); g.fill();
    // plinth (two steps)
    const stone = (x0, y0, ww, hh, r) => {
      const sg = g.createLinearGradient(x0, 0, x0 + ww, 0);
      sg.addColorStop(0, "#c9c2d6"); sg.addColorStop(0.35, "#f4f1fa"); sg.addColorStop(1, "#a59cb8");
      g.fillStyle = "#5d5470"; rr(g, x0 - 3, y0 - 3, ww + 6, hh + 6, r + 2); g.fill();
      g.fillStyle = sg; rr(g, x0, y0, ww, hh, r); g.fill();
      g.fillStyle = "rgba(255,255,255,0.6)"; rr(g, x0 + 6, y0 + 3, ww - 12, 4, 2); g.fill();
    };
    stone(x - w / 2 - 8, GY - 26, w + 16, 26, 6);
    stone(x - w / 2 + 2, GY - 48, w - 4, 22, 6);
    // fluted column
    const ct = top + capH, cb = GY - 48;
    const cg = g.createLinearGradient(x - colW / 2, 0, x + colW / 2, 0);
    cg.addColorStop(0, "#b8b0c8"); cg.addColorStop(0.3, "#f6f3fb"); cg.addColorStop(0.7, "#ddd6e8"); cg.addColorStop(1, "#968ca9");
    g.fillStyle = "#5d5470"; g.fillRect(x - colW / 2 - 3, ct, colW + 6, cb - ct);
    g.fillStyle = cg; g.fillRect(x - colW / 2, ct, colW, cb - ct);
    const flutes = Math.max(3, Math.round(colW / 26));
    g.strokeStyle = "rgba(80,60,110,0.22)"; g.lineWidth = 5; g.lineCap = "round";
    for (let i = 1; i < flutes; i++) { const fx = x - colW / 2 + (i * colW) / flutes; g.beginPath(); g.moveTo(fx, ct + 14); g.lineTo(fx, cb - 10); g.stroke(); }
    g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2;
    for (let i = 1; i < flutes; i++) { const fx = x - colW / 2 + (i * colW) / flutes - 3; g.beginPath(); g.moveTo(fx, ct + 14); g.lineTo(fx, cb - 10); g.stroke(); }
    // inset gem on the column
    if (cb - ct > 140) {
      g.save(); g.translate(x, ct + (cb - ct) * 0.45);
      g.fillStyle = "#5d5470"; g.beginPath(); g.arc(0, 0, 19, 0, 7); g.fill();
      g.fillStyle = "#e9e4f2"; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill();
      crystalShape(g, 10, 13, ["#22d1ee", "#ff3b7a", "#a855f7"][Math.round(x) % 3], true);
      g.restore();
    }
    // capital with bevel
    stone(x - w / 2, top, w, capH - 8, 6);
    stone(x - w / 2 + 10, top + capH - 8, w - 20, 10, 3);
    g.restore();
  };
  function crystalShape(g, hw, hh, col, small) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, -hh); g.lineTo(hw, -hh * 0.25); g.lineTo(hw * 0.6, hh); g.lineTo(-hw * 0.6, hh); g.lineTo(-hw, -hh * 0.25); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.moveTo(0, -hh); g.lineTo(-hw, -hh * 0.25); g.lineTo(0, -hh * 0.05); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,60,0.2)"; g.beginPath(); g.moveTo(0, -hh * 0.05); g.lineTo(hw, -hh * 0.25); g.lineTo(hw * 0.6, hh); g.lineTo(0, hh); g.closePath(); g.fill();
  }
  Art.crystalShape = crystalShape;

  /* ---------- slingshot ---------- */
  const S = () => KO.SLING;
  Art.slingPts = function () {
    const s = S();
    return { back: { x: s.x + 22, y: s.y - 14 }, front: { x: s.x - 20, y: s.y - 8 }, fork: { x: s.x, y: s.y + 62 }, base: { x: s.x, y: KO.GROUND_Y } };
  };
  function woodLine(g, a, b, w) {
    g.lineCap = "round";
    g.strokeStyle = "#4a2410"; g.lineWidth = w + 6; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = "#b8743c"; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = "rgba(255,220,170,0.6)"; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(a.x - w * 0.2, a.y); g.lineTo(b.x - w * 0.2, b.y); g.stroke();
  }
  Art.drawSlingBack = function (g) {
    const p = Art.slingPts();
    g.fillStyle = "rgba(30,20,40,0.25)"; g.beginPath(); g.ellipse(p.base.x, p.base.y + 4, 40, 9, 0, 0, 7); g.fill();
    // rock base
    g.fillStyle = "#7d7388"; g.beginPath(); g.ellipse(p.base.x, p.base.y - 4, 30, 14, 0, Math.PI, 0); g.fill();
    woodLine(g, p.base, p.fork, 22);
    woodLine(g, p.fork, p.back, 16);
    // leather wrap
    for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? "#5a2e12" : "#7b3f1a"; rr(g, p.fork.x - 14, p.fork.y + 26 + i * 11, 28, 10, 4); g.fill(); }
  };
  Art.drawSlingFront = function (g) {
    const p = Art.slingPts();
    woodLine(g, p.fork, p.front, 16);
    g.save(); g.translate(p.fork.x, p.fork.y + 2); crystalShape(g, 9, 13, "#22d1ee"); g.restore();
  };
  Art.drawBand = function (g, from, ball, stretch) {
    const w = Math.max(4, 11 - stretch * 6);
    g.lineCap = "round";
    g.strokeStyle = "#3a1a08"; g.lineWidth = w + 3; g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(ball.x, ball.y); g.stroke();
    g.strokeStyle = stretch > 0.05 ? `rgb(${140 + stretch * 90},${70 - stretch * 30},${40})` : "#8b4a22";
    g.lineWidth = w; g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(ball.x, ball.y); g.stroke();
  };
  Art.drawPouch = function (g, ball, ang) {
    g.save(); g.translate(ball.x, ball.y); g.rotate(ang);
    g.fillStyle = "#4a2410"; rr(g, -KO.BALL_R - 10, -14, 18, 28, 7); g.fill();
    g.restore();
  };

  /* ---------- glow stone (projectile) ---------- */
  const stonePts = []; for (let i = 0; i < 9; i++) stonePts.push(0.86 + hash(i + 40) * 0.16);
  Art.drawBall = function (g, x, y, r, ang, alpha) {
    if (!(r > 0.5)) return;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.translate(x, y);
    const gl = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.7);
    gl.addColorStop(0, "rgba(90,240,255,0.45)"); gl.addColorStop(1, "rgba(90,240,255,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.7, 0, 7); g.fill();
    g.rotate(ang);
    const path = () => { g.beginPath(); stonePts.forEach((k, i) => { const a = (i / 9) * Math.PI * 2; g.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); }); g.closePath(); };
    g.fillStyle = "#2c2638"; path(); g.fill();
    const sg = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    sg.addColorStop(0, "#c9c3d9"); sg.addColorStop(0.55, "#7c7391"); sg.addColorStop(1, "#4a4260");
    g.fillStyle = sg; g.save(); g.scale(0.9, 0.9); path(); g.fill(); g.restore();
    // glowing rune cracks
    g.strokeStyle = "#7ff6ff"; g.lineWidth = r * 0.11; g.lineCap = "round"; g.lineJoin = "round";
    g.shadowColor = "#5ff0ff"; g.shadowBlur = r * 0.5;
    g.beginPath(); g.moveTo(-r * 0.45, -r * 0.1); g.lineTo(-r * 0.1, r * 0.1); g.lineTo(r * 0.15, -r * 0.25); g.lineTo(r * 0.45, r * 0.05);
    g.moveTo(-r * 0.1, r * 0.1); g.lineTo(-r * 0.05, r * 0.45); g.stroke();
    g.shadowBlur = 0;
    g.rotate(-ang);
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.42, r * 0.22, r * 0.12, -0.6, 0, 7); g.fill();
    g.restore();
  };

  /* ---------- gem blocks ---------- */
  function blockSprite(w, h, ck, type) {
    const q = V.scale * V.dpr;
    const key = w + "x" + h + "|" + ck + "|" + type;
    let s = spriteCache.get(key);
    if (s) return s;
    const pad = 8, cw = Math.ceil((w + pad * 2) * q), ch = Math.ceil((h + pad * 2) * q);
    const c = document.createElement("canvas"); c.width = Math.max(1, cw); c.height = Math.max(1, ch);
    const g = c.getContext("2d"); g.scale(q, q); g.translate(pad + w / 2, pad + h / 2);
    const col = KO.COLORS[ck] || KO.COLORS.red;
    if (type === "bomb") {
      // volatile crystal orb: dark shell, hot faceted core
      const r = w / 2;
      g.fillStyle = "#3a0a14"; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      const gr = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r - 2);
      gr.addColorStop(0, "#fff3b0"); gr.addColorStop(0.35, "#ff9a2e"); gr.addColorStop(0.75, "#e0203c"); gr.addColorStop(1, "#7a0a1c");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r - 3, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); g.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4)); g.stroke(); }
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + 0.3; g.lineTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); } g.closePath(); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); g.fill();
    } else {
      const m = Math.min(w, h);
      const cut = type === "bouncy" ? 0 : m * 0.2, inset = m * 0.24;
      const outline = () => {
        g.beginPath();
        if (cut) { g.moveTo(-w / 2 + cut, -h / 2); g.lineTo(w / 2 - cut, -h / 2); g.lineTo(w / 2, -h / 2 + cut); g.lineTo(w / 2, h / 2 - cut); g.lineTo(w / 2 - cut, h / 2); g.lineTo(-w / 2 + cut, h / 2); g.lineTo(-w / 2, h / 2 - cut); g.lineTo(-w / 2, -h / 2 + cut); g.closePath(); }
        else rr(g, -w / 2, -h / 2, w, h, m * 0.3);
      };
      // glow halo
      g.shadowColor = col[1]; g.shadowBlur = type === "heavy" ? 0 : 7;
      g.fillStyle = col[2]; outline(); g.fill(); g.shadowBlur = 0;
      const ix = w / 2 - inset, iy = h / 2 - inset, ow = w / 2 - 3, oh = h / 2 - 3, oc = Math.max(0, cut - 2);
      // facets: top, right, bottom, left (trapezoids between outer ring and table)
      const O = cut ? [[-ow + oc, -oh], [ow - oc, -oh], [ow, -oh + oc], [ow, oh - oc], [ow - oc, oh], [-ow + oc, oh], [-ow, oh - oc], [-ow, -oh + oc]] : null;
      const facet = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); };
      if (cut) {
        facet([O[7], O[0], O[1], O[2], [ix, -iy], [-ix, -iy]], col[0]);
        facet([O[2], O[3], [ix, iy], [ix, -iy]], col[1]);
        facet([O[3], O[4], O[5], O[6], [-ix, iy], [ix, iy]], col[2]);
        facet([O[6], O[7], [-ix, -iy], [-ix, iy]], mix(col[0], col[1]));
      } else {
        const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
        gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
        g.fillStyle = gr; rr(g, -ow, -oh, ow * 2, oh * 2, m * 0.26); g.fill();
      }
      // table with inner glow
      const tg = g.createRadialGradient(-ix * 0.3, -iy * 0.3, 1, 0, 0, Math.max(ix, iy) * 1.4);
      tg.addColorStop(0, "rgba(255,255,255,0.85)"); tg.addColorStop(0.35, col[0]); tg.addColorStop(1, col[1]);
      g.fillStyle = tg;
      if (cut) { g.beginPath(); g.rect(-ix, -iy, ix * 2, iy * 2); g.fill(); }
      else { rr(g, -ix - 4, -iy - 4, ix * 2 + 8, iy * 2 + 8, m * 0.18); g.fill(); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 2; rr(g, -ow + 5, -oh + 5, ow * 2 - 10, oh * 2 - 10, m * 0.22); g.stroke(); }
      if (type === "heavy") {
        // obsidian: glassy streaks and cracks
        g.strokeStyle = "rgba(190,170,255,0.35)"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-ix, -iy * 0.2); g.lineTo(-ix * 0.2, iy * 0.3); g.lineTo(ix * 0.5, -iy * 0.1); g.stroke();
      }
      // facet edge highlights
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.2;
      if (cut) { [[O[0], [-ix, -iy]], [O[1], [ix, -iy]], [O[4], [ix, iy]], [O[5], [-ix, iy]]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); g.strokeRect(-ix, -iy, ix * 2, iy * 2); }
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2; outline(); g.save(); g.clip(); g.beginPath(); g.moveTo(-w / 2, -h / 2 + 2); g.lineTo(w / 2, -h / 2 + 2); g.stroke(); g.restore();
    }
    s = { c, w: w + pad * 2, h: h + pad * 2 };
    spriteCache.set(key, s);
    return s;
  }
  function mix(a, b) {
    const p = (h) => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const A2 = p(a), B2 = p(b);
    return "#" + A2.map((v, i) => Math.round((v + B2[i]) / 2).toString(16).padStart(2, "0")).join("");
  }
  Art.blockSprite = blockSprite;

  // blk: {x,y,angle,w,h,c,type,squash,scared,blink,alpha,scale}
  Art.drawBlock = function (g, b, look) {
    const s = blockSprite(b.w, b.h, b.c, b.type);
    const tt = performance.now() / 1000;
    g.save(); g.translate(b.x, b.y); g.rotate(b.angle);
    const sq = b.squash || 0, sc = b.scale == null ? 1 : b.scale;
    g.scale(sc * (1 + sq), sc * (1 - sq));
    g.globalAlpha = (b.alpha == null ? 1 : b.alpha) * (b.type === "bouncy" ? 0.94 : 1);
    if (b.type === "bomb") {
      const pulse = 0.5 + 0.5 * Math.sin(tt * 7 + b.x * 0.01);
      const r = b.w / 2;
      const gl = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.9);
      gl.addColorStop(0, `rgba(255,140,40,${0.35 + pulse * 0.35})`); gl.addColorStop(1, "rgba(255,80,40,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.9, 0, 7); g.fill();
    }
    g.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    if (b.type === "bomb") {
      // crackling sparks
      const r = b.w / 2;
      g.strokeStyle = "#fff6a0"; g.lineWidth = 2; g.lineCap = "round";
      for (let i = 0; i < 2; i++) {
        const a = tt * 3 + i * 3.1 + Math.sin(tt * 13 + i) * 0.4;
        g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + 0.12) * (r + 7), Math.sin(a + 0.12) * (r + 7)); g.lineTo(Math.cos(a - 0.05) * (r + 12), Math.sin(a - 0.05) * (r + 12)); g.stroke();
      }
      drawFace(g, b, look, 0.9);
    } else {
      if (b.w >= 34 && b.h >= 34) drawFace(g, b, look, 1);
      // occasional sparkle glint on the top-left facet
      const ph = (tt * 0.45 + ((b.w * 7 + b.h * 13 + b.c.length * 17) % 10) / 10) % 1;
      if (ph < 0.12 && b.type !== "heavy") {
        const k = Math.sin((ph / 0.12) * Math.PI);
        g.save(); g.translate(-b.w / 2 + Math.min(b.w, b.h) * 0.24, -b.h / 2 + Math.min(b.w, b.h) * 0.2); g.rotate(tt); g.globalAlpha *= k; glint(g, Math.min(b.w, b.h) * 0.22); g.restore();
      }
    }
    g.restore();
  };
  function drawFace(g, b, look, k) {
    const m = Math.min(b.w, b.h) * k, ex = m * 0.2, ey = -m * 0.04, er = m * 0.11;
    let lx = 0, ly = 0;
    if (look) {
      const dx = look.x - b.x, dy = look.y - b.y, d = Math.hypot(dx, dy) || 1;
      const ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
      lx = ((dx * ca - dy * sa) / d) * er * 0.45; ly = ((dx * sa + dy * ca) / d) * er * 0.45;
    }
    const ink = b.type === "heavy" ? "#0d0a18" : "#22103a";
    const blink = b.blink > 0;
    for (const sx of [-1, 1]) {
      if (blink) {
        g.strokeStyle = ink; g.lineWidth = m * 0.04; g.lineCap = "round";
        g.beginPath(); g.moveTo(sx * ex - er * 0.8, ey); g.lineTo(sx * ex + er * 0.8, ey); g.stroke();
      } else {
        g.fillStyle = "#fff"; g.beginPath(); g.ellipse(sx * ex, ey, er, er * (b.scared ? 1.25 : 1.1), 0, 0, 7); g.fill();
        g.fillStyle = ink; g.beginPath(); g.arc(sx * ex + lx, ey + ly, er * (b.scared ? 0.42 : 0.55), 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(sx * ex + lx - er * 0.18, ey + ly - er * 0.2, er * 0.18, 0, 7); g.fill();
      }
      if (b.type === "heavy") {
        g.strokeStyle = "#e8e0ff"; g.lineWidth = m * 0.05; g.lineCap = "round";
        g.beginPath(); g.moveTo(sx * ex - er * sx * 1.1, ey - er * 1.6); g.lineTo(sx * ex + er * sx * 0.9, ey - er * 1.1); g.stroke();
      }
    }
    g.fillStyle = "rgba(255,90,160,0.35)";
    g.beginPath(); g.arc(-ex * 1.55, ey + er * 1.4, er * 0.5, 0, 7); g.arc(ex * 1.55, ey + er * 1.4, er * 0.5, 0, 7); g.fill();
    g.strokeStyle = b.type === "heavy" ? "#e8e0ff" : ink; g.lineWidth = m * 0.045; g.lineCap = "round";
    if (b.scared) {
      g.fillStyle = ink; g.beginPath(); g.ellipse(0, ey + er * 1.9, er * 0.45, er * 0.6, 0, 0, 7); g.fill();
    } else if (b.type === "heavy") {
      g.beginPath(); g.moveTo(-er * 0.7, ey + er * 2); g.lineTo(er * 0.7, ey + er * 2); g.stroke();
    } else {
      // silly grin with a tongue
      g.beginPath(); g.arc(0, ey + er * 1.2, er * 0.8, 0.25, Math.PI - 0.25); g.stroke();
      g.fillStyle = "#ff6b9a"; g.beginPath(); g.ellipse(er * 0.25, ey + er * 2.05, er * 0.28, er * 0.22, 0, 0, 7); g.fill();
    }
  }

  KO.Art = Art;
})(window.KO);
