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
    grad.addColorStop(0, "#3fb6ff"); grad.addColorStop(0.45, "#8fd8ff"); grad.addColorStop(0.8, "#ffd9ef"); grad.addColorStop(1, "#ffeccf");
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
  const hill = (x, a, b, c) => Math.sin(x * a) * 40 + Math.sin(x * b + 1.3) * 25 + Math.sin(x * c + 2.1) * 12;
  const lollis = [-260, -120, 40, 330, 470, 880, 1040, 1180, 1320];
  Art.drawWorldBack = function (g, t) {
    const x0 = -V.offX / V.scale - 20, x1 = (V.sw - V.offX) / V.scale + 20;
    const y1 = (V.sh - V.offY) / V.scale + 20;
    const GY = KO.GROUND_Y;
    // far hills
    const layers = [
      { base: GY - 230, col: ["#c9b8ff", "#e9dcff"], f: [0.004, 0.009, 0.02] },
      { base: GY - 140, col: ["#8fe3c8", "#c8f7e4"], f: [0.006, 0.013, 0.031] }
    ];
    layers.forEach((L, li) => {
      const gr = g.createLinearGradient(0, L.base - 80, 0, GY);
      gr.addColorStop(0, L.col[1]); gr.addColorStop(1, L.col[0]);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, GY + 10);
      for (let x = x0; x <= x1; x += 16) g.lineTo(x, L.base - hill(x + li * 300, ...L.f));
      g.lineTo(x1, GY + 10); g.closePath(); g.fill();
      if (li === 1) {
        // lollipop trees
        lollis.forEach((lx, i) => {
          if (lx < x0 - 60 || lx > x1 + 60) return;
          const by = L.base - hill(lx + 300, ...L.f) + 30, h = 70 + (i % 3) * 22, r = 22 + (i % 2) * 8;
          g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round";
          g.beginPath(); g.moveTo(lx, by); g.lineTo(lx, by - h); g.stroke();
          const cols = [["#ff7eb6", "#fff"], ["#7ed8ff", "#fff"], ["#ffd45e", "#fff"]][i % 3];
          g.save(); g.translate(lx, by - h - r * 0.8); g.rotate(t * 0.3 * (i % 2 ? 1 : -1));
          g.fillStyle = cols[0]; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
          g.strokeStyle = cols[1]; g.lineWidth = 4; g.beginPath();
          for (let a = 0; a < 14; a += 0.2) { const rr2 = (a / 14) * r * 0.9; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
          g.stroke(); g.restore();
        });
      }
    });
    // ground
    const gg = g.createLinearGradient(0, GY, 0, GY + 220);
    gg.addColorStop(0, "#8a5a3a"); gg.addColorStop(1, "#5b3520");
    g.fillStyle = gg; g.fillRect(x0, GY + 12, x1 - x0, y1 - GY);
    // choco layer stripes + sprinkles
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = GY + 70; y < y1; y += 70) g.fillRect(x0, y, x1 - x0, 10);
    const sc = ["#ff5f8f", "#ffd52e", "#5fd3ff", "#8cf06a", "#fff", "#c58bff"];
    const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let cx = Math.floor(x0 / 160); cx * 160 < x1; cx++) {
      for (let j = 0; j < 9; j++) {
        const id = cx * 31 + j * 7.3;
        const sx = cx * 160 + hash(id) * 160, sy = GY + 34 + hash(id + 1.7) * 300;
        if (sy > y1) continue;
        g.save(); g.translate(sx, sy); g.rotate(hash(id + 3.1) * 6.28);
        g.fillStyle = sc[Math.floor(hash(id + 5.3) * sc.length)]; rr(g, -7, -2.5, 14, 5, 2.5); g.fill(); g.restore();
      }
    }
    // grass/frosting top with scallops
    const fg = g.createLinearGradient(0, GY - 14, 0, GY + 26);
    fg.addColorStop(0, "#9bff7a"); fg.addColorStop(1, "#38c24a");
    g.fillStyle = fg; g.beginPath(); g.moveTo(x0, GY - 6);
    g.lineTo(x1, GY - 6); g.lineTo(x1, GY + 14);
    for (let x = Math.ceil(x1 / 36) * 36; x >= x0 - 36; x -= 36) g.arc(x, GY + 14, 18, 0, Math.PI, false);
    g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x0, GY - 4, x1 - x0, 4);
  };

  /* ---------- podium ---------- */
  Art.drawPodium = function (g, p, t) {
    const x = p.cx, top = p.top, w = p.w;
    if (p.float) {
      // hover platform
      const th = 34;
      g.save();
      const glow = g.createRadialGradient(x, top + th + 10, 4, x, top + th + 10, w * 0.6);
      glow.addColorStop(0, "rgba(255,240,140,0.55)"); glow.addColorStop(1, "rgba(255,240,140,0)");
      g.fillStyle = glow; g.fillRect(x - w, top, w * 2, 120);
      // little propeller balloons
      [-w * 0.32, w * 0.32].forEach((dx, i) => {
        const by = top + th + 16 + Math.sin(t * 6 + i) * 3;
        g.fillStyle = i ? "#ff7eb6" : "#7ed8ff"; g.beginPath(); g.arc(x + dx, by, 10, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.save(); g.translate(x + dx, by + 14); g.scale(Math.cos(t * 30 + i), 1);
        rr(g, -16, -3, 32, 6, 3); g.fill(); g.restore();
      });
      const pg = g.createLinearGradient(0, top, 0, top + th);
      pg.addColorStop(0, "#fff6fb"); pg.addColorStop(1, "#ffb3d9");
      g.fillStyle = "#d4559b"; rr(g, x - w / 2 - 4, top - 2, w + 8, th + 6, 16); g.fill();
      g.fillStyle = pg; rr(g, x - w / 2, top, w, th - 2, 14); g.fill();
      g.fillStyle = "rgba(255,255,255,0.7)"; rr(g, x - w / 2 + 10, top + 4, w - 20, 7, 4); g.fill();
      g.restore();
      return;
    }
    const GY = KO.GROUND_Y, capH = 26, colW = w - 34;
    g.save();
    // shadow
    g.fillStyle = "rgba(60,20,40,0.25)"; g.beginPath(); g.ellipse(x, GY + 4, w * 0.62, 12, 0, 0, 7); g.fill();
    // base
    const bg2 = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg2.addColorStop(0, "#e3c3ff"); bg2.addColorStop(0.5, "#fff"); bg2.addColorStop(1, "#c79cf5");
    g.fillStyle = "#9b6ad1"; rr(g, x - w / 2 - 6, GY - 34, w + 12, 40, 10); g.fill();
    g.fillStyle = bg2; rr(g, x - w / 2 - 2, GY - 32, w + 4, 32, 9); g.fill();
    // column with candy stripes
    const ct = top + capH - 4, cb = GY - 30;
    g.save(); rr(g, x - colW / 2, ct, colW, cb - ct, 6); g.clip();
    g.fillStyle = "#fff"; g.fillRect(x - colW / 2, ct, colW, cb - ct);
    g.fillStyle = "#ff7eb6";
    for (let yy = ct - colW; yy < cb + colW; yy += 46) {
      g.beginPath(); g.moveTo(x - colW / 2, yy); g.lineTo(x + colW / 2, yy - colW * 0.5);
      g.lineTo(x + colW / 2, yy - colW * 0.5 + 20); g.lineTo(x - colW / 2, yy + 20); g.fill();
    }
    const shade = g.createLinearGradient(x - colW / 2, 0, x + colW / 2, 0);
    shade.addColorStop(0, "rgba(120,30,90,0.28)"); shade.addColorStop(0.35, "rgba(255,255,255,0.25)"); shade.addColorStop(1, "rgba(120,30,90,0.35)");
    g.fillStyle = shade; g.fillRect(x - colW / 2, ct, colW, cb - ct);
    g.restore();
    // cap with frosting drips
    g.fillStyle = "#c2407f"; rr(g, x - w / 2 - 3, top - 3, w + 6, capH + 6, 12); g.fill();
    const cg = g.createLinearGradient(0, top, 0, top + capH);
    cg.addColorStop(0, "#fff4fa"); cg.addColorStop(1, "#ff9fcf");
    g.fillStyle = cg; rr(g, x - w / 2, top, w, capH, 10); g.fill();
    g.fillStyle = "#ff9fcf";
    const drips = Math.max(3, Math.floor(colW / 30));
    for (let i = 0; i < drips; i++) {
      const dx = x - colW / 2 + 14 + i * ((colW - 28) / (drips - 1 || 1)), dl = 10 + ((i * 37) % 22);
      g.beginPath(); g.moveTo(dx - 8, top + capH - 2); g.lineTo(dx - 8, top + capH + dl); g.arc(dx, top + capH + dl, 8, Math.PI, 0, true); g.lineTo(dx + 8, top + capH - 2); g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.8)"; rr(g, x - w / 2 + 10, top + 4, w - 20, 6, 3); g.fill();
    g.restore();
  };

  /* ---------- slingshot ---------- */
  const S = () => KO.SLING;
  Art.slingPts = function () {
    const s = S();
    return { back: { x: s.x + 22, y: s.y - 14 }, front: { x: s.x - 20, y: s.y - 8 }, fork: { x: s.x, y: s.y + 62 }, base: { x: s.x, y: KO.GROUND_Y } };
  };
  function woodLine(g, a, b, w) {
    g.lineCap = "round";
    g.strokeStyle = "#5a2e12"; g.lineWidth = w + 6; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = "#b8743c"; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = "rgba(255,220,170,0.6)"; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(a.x - w * 0.2, a.y); g.lineTo(b.x - w * 0.2, b.y); g.stroke();
  }
  Art.drawSlingBack = function (g) {
    const p = Art.slingPts();
    g.fillStyle = "rgba(60,20,40,0.25)"; g.beginPath(); g.ellipse(p.base.x, p.base.y + 4, 40, 9, 0, 0, 7); g.fill();
    woodLine(g, p.base, p.fork, 22);
    woodLine(g, p.fork, p.back, 16);
    // candy wrap
    g.fillStyle = "#ff5f8f"; rr(g, p.fork.x - 15, p.fork.y + 30, 30, 12, 5); g.fill();
    g.fillStyle = "#fff"; rr(g, p.fork.x - 15, p.fork.y + 44, 30, 8, 4); g.fill();
    g.fillStyle = "#ff5f8f"; rr(g, p.fork.x - 15, p.fork.y + 54, 30, 12, 5); g.fill();
  };
  Art.drawSlingFront = function (g) {
    const p = Art.slingPts();
    woodLine(g, p.fork, p.front, 16);
    g.fillStyle = "#ffd52e"; g.beginPath(); g.arc(p.fork.x, p.fork.y, 11, 0, 7); g.fill();
    g.fillStyle = "#fff8"; g.beginPath(); g.arc(p.fork.x - 3, p.fork.y - 3, 4, 0, 7); g.fill();
  };
  Art.drawBand = function (g, from, ball, stretch) {
    const w = Math.max(4, 11 - stretch * 6);
    g.lineCap = "round";
    g.strokeStyle = "#7a1438"; g.lineWidth = w + 3; g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(ball.x, ball.y); g.stroke();
    g.strokeStyle = "#e8306a"; g.lineWidth = w; g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(ball.x, ball.y); g.stroke();
  };
  Art.drawPouch = function (g, ball, ang) {
    g.save(); g.translate(ball.x, ball.y); g.rotate(ang);
    g.fillStyle = "#5a2e12"; rr(g, -KO.BALL_R - 10, -14, 18, 28, 7); g.fill();
    g.restore();
  };

  /* ---------- gumball ---------- */
  Art.drawBall = function (g, x, y, r, ang, alpha) {
    if (!(r > 0.5)) return;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.translate(x, y);
    g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.arc(2, 4, r, 0, 7); g.fill();
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, "#ffb0f0"); gr.addColorStop(0.5, "#ff3fb4"); gr.addColorStop(1, "#a1006a");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.rotate(ang);
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = r * 0.16; g.lineCap = "round";
    g.beginPath(); g.arc(0, 0, r * 0.62, -0.6, 1.2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.62, 2.5, 4.2); g.stroke();
    g.rotate(-ang);
    g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.28, r * 0.17, -0.6, 0, 7); g.fill();
    g.restore();
  };

  /* ---------- blocks ---------- */
  function blockSprite(w, h, ck, type) {
    const q = V.scale * V.dpr;
    const key = w + "x" + h + "|" + ck + "|" + type;
    let s = spriteCache.get(key);
    if (s) return s;
    const pad = 6, cw = Math.ceil((w + pad * 2) * q), ch = Math.ceil((h + pad * 2) * q);
    const c = document.createElement("canvas"); c.width = Math.max(1, cw); c.height = Math.max(1, ch);
    const g = c.getContext("2d"); g.scale(q, q); g.translate(pad + w / 2, pad + h / 2);
    const col = KO.COLORS[ck] || KO.COLORS.red;
    if (type === "bomb") {
      const r = w / 2;
      g.fillStyle = "#3a0a14"; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r - 2);
      gr.addColorStop(0, "#ff8a9e"); gr.addColorStop(0.55, "#e01e3c"); gr.addColorStop(1, "#7a0a1c");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r - 3, 0, 7); g.fill();
      g.save(); g.beginPath(); g.arc(0, 0, r - 3, 0, 7); g.clip();
      g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r + i * 18, r); g.lineTo(r + i * 18, -r); g.stroke(); }
      g.restore();
      g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.14, -0.6, 0, 7); g.fill();
      g.fillStyle = "#2b2b38"; rr(g, -8, -r - 6, 16, 10, 3); g.fill();
    } else {
      const r = Math.min(w, h) * 0.24;
      g.globalAlpha = type === "jelly" ? 0.9 : 1;
      g.fillStyle = col[2]; rr(g, -w / 2, -h / 2, w, h, r); g.fill();
      const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
      gr.addColorStop(0, col[0]); gr.addColorStop(0.45, col[1]); gr.addColorStop(1, col[1]);
      g.fillStyle = gr; rr(g, -w / 2 + 3, -h / 2 + 3, w - 6, h - 7, r * 0.8); g.fill();
      if (type === "heavy") {
        g.strokeStyle = "rgba(30,10,0,0.45)"; g.lineWidth = 3;
        const nx = Math.max(1, Math.round(w / 34)), ny = Math.max(1, Math.round(h / 34));
        for (let i = 1; i < nx; i++) { const xx = -w / 2 + (i * w) / nx; g.beginPath(); g.moveTo(xx, -h / 2 + 6); g.lineTo(xx, h / 2 - 6); g.stroke(); }
        for (let i = 1; i < ny; i++) { const yy = -h / 2 + (i * h) / ny; g.beginPath(); g.moveTo(-w / 2 + 6, yy); g.lineTo(w / 2 - 6, yy); g.stroke(); }
      }
      if (type === "jelly") {
        g.fillStyle = "rgba(255,255,255,0.35)";
        [[0.2, 0.25, 0.08], [-0.25, 0.1, 0.05], [0.05, -0.05, 0.04]].forEach(bb => { g.beginPath(); g.arc(bb[0] * w, bb[1] * h, bb[2] * Math.min(w, h) * 1.6, 0, 7); g.fill(); });
      }
      // gloss
      const hg = g.createLinearGradient(0, -h / 2, 0, -h / 2 + h * 0.5);
      hg.addColorStop(0, "rgba(255,255,255,0.75)"); hg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = hg; rr(g, -w / 2 + 6, -h / 2 + 5, w - 12, Math.min(h * 0.42, h - 14), r * 0.6); g.fill();
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.beginPath(); g.ellipse(-w / 2 + Math.min(w, h) * 0.24, -h / 2 + Math.min(w, h) * 0.2, Math.min(w, h) * 0.08, Math.min(w, h) * 0.05, -0.6, 0, 7); g.fill();
      g.fillStyle = "rgba(0,0,0,0.12)"; rr(g, -w / 2 + 5, h / 2 - 9, w - 10, 4, 2); g.fill();
    }
    s = { c, w: w + pad * 2, h: h + pad * 2 };
    spriteCache.set(key, s);
    return s;
  }
  Art.blockSprite = blockSprite;

  // blk: {x,y,angle,w,h,c,type,squash,scared,blink,alpha,scale}
  Art.drawBlock = function (g, b, look) {
    const s = blockSprite(b.w, b.h, b.c, b.type);
    g.save(); g.translate(b.x, b.y); g.rotate(b.angle);
    const sq = b.squash || 0, sc = b.scale == null ? 1 : b.scale;
    g.scale(sc * (1 + sq), sc * (1 - sq));
    g.globalAlpha = b.alpha == null ? 1 : b.alpha;
    g.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    if (b.type === "bomb") {
      // fuse + spark
      const r = b.w / 2, tt = performance.now() / 1000;
      g.strokeStyle = "#6b4a2a"; g.lineWidth = 4; g.lineCap = "round";
      g.beginPath(); g.moveTo(0, -r - 4); g.quadraticCurveTo(10, -r - 18, 6, -r - 24); g.stroke();
      const fl = 6 + Math.sin(tt * 40) * 2;
      g.fillStyle = "#fff38a"; g.beginPath(); g.arc(6, -r - 26, fl, 0, 7); g.fill();
      g.fillStyle = "#ff8a1f"; g.beginPath(); g.arc(6, -r - 26, fl * 0.5, 0, 7); g.fill();
      drawFace(g, b, look, 0.9);
    } else if (b.w >= 34 && b.h >= 34) drawFace(g, b, look, 1);
    g.restore();
  };
  function drawFace(g, b, look, k) {
    const m = Math.min(b.w, b.h) * k, ex = m * 0.2, ey = -m * 0.06, er = m * 0.11;
    // look direction in local frame
    let lx = 0, ly = 0;
    if (look) {
      const dx = look.x - b.x, dy = look.y - b.y, d = Math.hypot(dx, dy) || 1;
      const ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
      lx = ((dx * ca - dy * sa) / d) * er * 0.45; ly = ((dx * sa + dy * ca) / d) * er * 0.45;
    }
    const blink = b.blink > 0;
    for (const sx of [-1, 1]) {
      if (blink) {
        g.strokeStyle = "#2a1030"; g.lineWidth = m * 0.04; g.lineCap = "round";
        g.beginPath(); g.moveTo(sx * ex - er * 0.8, ey); g.lineTo(sx * ex + er * 0.8, ey); g.stroke();
      } else {
        g.fillStyle = "#fff"; g.beginPath(); g.ellipse(sx * ex, ey, er, er * (b.scared ? 1.25 : 1.1), 0, 0, 7); g.fill();
        g.fillStyle = "#2a1030"; g.beginPath(); g.arc(sx * ex + lx, ey + ly, er * (b.scared ? 0.42 : 0.55), 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(sx * ex + lx - er * 0.18, ey + ly - er * 0.2, er * 0.18, 0, 7); g.fill();
      }
      if (b.type === "heavy") {
        g.strokeStyle = "#2a1030"; g.lineWidth = m * 0.05; g.lineCap = "round";
        g.beginPath(); g.moveTo(sx * ex - er * sx * 1.1, ey - er * 1.6); g.lineTo(sx * ex + er * sx * 0.9, ey - er * 1.1); g.stroke();
      }
    }
    // cheeks
    g.fillStyle = "rgba(255,90,140,0.35)";
    g.beginPath(); g.arc(-ex * 1.55, ey + er * 1.4, er * 0.55, 0, 7); g.arc(ex * 1.55, ey + er * 1.4, er * 0.55, 0, 7); g.fill();
    g.strokeStyle = "#2a1030"; g.lineWidth = m * 0.045; g.lineCap = "round";
    if (b.scared) {
      g.fillStyle = "#2a1030"; g.beginPath(); g.ellipse(0, ey + er * 1.9, er * 0.45, er * 0.6, 0, 0, 7); g.fill();
    } else if (b.type === "heavy") {
      g.beginPath(); g.moveTo(-er * 0.7, ey + er * 2); g.lineTo(er * 0.7, ey + er * 2); g.stroke();
    } else {
      g.beginPath(); g.arc(0, ey + er * 1.2, er * 0.8, 0.25, Math.PI - 0.25); g.stroke();
    }
  }

  KO.Art = Art;
})(window.KO);
