/* Particles, popups and screen shake (world space). */
(function (KO) {
  const FX = { parts: [], pops: [], shake: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  FX.reset = () => { FX.parts.length = 0; FX.pops.length = 0; FX.shake = 0; };
  FX.addShake = (s) => { FX.shake = Math.min(28, Math.max(FX.shake, s)); };
  function add(p) { if (FX.parts.length < 900) FX.parts.push(p); }

  FX.burst = function (x, y, cols, n, power) {
    power = power || 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(150, 520) * power;
      add({ type: Math.random() < 0.8 ? "chunk" : "circle", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 180 * power,
        g: 1300, drag: 0.98, life: rnd(0.5, 1.0), max: 1, size: rnd(6, 15), color: cols[i % cols.length], rot: rnd(0, 6), vr: rnd(-12, 12) });
    }
  };
  FX.sparkle = function (x, y, n) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(60, 260);
      add({ type: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0, drag: 0.93, life: rnd(0.5, 0.9), max: 1, size: rnd(8, 18), color: Math.random() < 0.5 ? "#fff" : "#fff38a", rot: rnd(0, 6), vr: rnd(-6, 6) });
    }
  };
  FX.dust = function (x, y, n) {
    for (let i = 0; i < n; i++) add({ type: "puff", x: x + rnd(-10, 10), y: y + rnd(-6, 6), vx: rnd(-120, 120), vy: rnd(-90, -10), g: -20, drag: 0.92, life: rnd(0.4, 0.8), max: 1, size: rnd(10, 22), color: "#ffffff" });
  };
  FX.ring = function (x, y, color, r) { add({ type: "ring", x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.5, max: 0.5, size: r || 120, color }); };
  FX.confetti = function (x0, x1, y, n) {
    const cols = ["#ff3b5c", "#ffd52e", "#4fd34a", "#3b8cff", "#a855f7", "#ff5fcf", "#22d1c0", "#ff8a1f"];
    for (let i = 0; i < n; i++) add({ type: "conf", x: rnd(x0, x1), y: y - rnd(0, 300), vx: rnd(-60, 60), vy: rnd(100, 300), g: 220, drag: 0.99, life: rnd(2, 3.5), max: 3.5, size: rnd(8, 14), color: cols[i % cols.length], rot: rnd(0, 6), vr: rnd(-8, 8), wob: rnd(0, 6) });
  };
  FX.trailPuff = function (x, y) { add({ type: "puff", x, y, vx: rnd(-20, 20), vy: rnd(-20, 20), g: 0, drag: 0.9, life: 0.35, max: 1, size: rnd(6, 12), color: "#ffe0f4" }); };

  // text popup: big=true for combo words (anchored near top-center)
  FX.text = function (x, y, text, opts) {
    opts = opts || {};
    FX.pops.push({ x, y, text, t: 0, dur: opts.dur || (opts.big ? 1.4 : 0.9), size: opts.size || (opts.big ? 84 : 34), big: !!opts.big, cols: opts.cols || ["#fff7a8", "#ffb21f"] });
  };

  FX.update = function (dt) {
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i];
      p.life -= dt; if (p.life <= 0) { FX.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; const dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr;
      if (p.type === "conf") p.vx += Math.sin((p.wob += dt * 5)) * 8;
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = FX.pops.length - 1; i >= 0; i--) { const p = FX.pops[i]; p.t += dt; if (p.t > p.dur) FX.pops.splice(i, 1); }
    FX.shake *= Math.pow(0.0015, dt);
    if (FX.shake < 0.2) FX.shake = 0;
  };

  function star(g, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath();
  }
  FX.starPath = star;
  const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  FX.draw = function (g) {
    for (const p of FX.parts) {
      const k = Math.min(1, p.life / (p.max * 0.5));
      g.globalAlpha = Math.max(0, Math.min(1, k));
      g.fillStyle = p.color;
      if (p.type === "circle") { g.beginPath(); g.arc(p.x, p.y, p.size * 0.5 * (0.5 + 0.5 * k), 0, 7); g.fill(); }
      else if (p.type === "chunk") { // crystal shard
        const z = p.size; g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath(); g.moveTo(0, -z * 0.8); g.lineTo(z * 0.45, z * 0.5); g.lineTo(-z * 0.4, z * 0.35); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.moveTo(0, -z * 0.8); g.lineTo(-z * 0.4, z * 0.35); g.lineTo(-z * 0.05, z * 0.1); g.closePath(); g.fill(); g.restore(); }
      else if (p.type === "star") { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); star(g, p.size * (0.4 + 0.6 * k)); g.fill(); g.restore(); }
      else if (p.type === "puff") { g.globalAlpha *= 0.7; g.beginPath(); g.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, 7); g.fill(); }
      else if (p.type === "ring") { const q = 1 - p.life / p.max; g.globalAlpha = 1 - q; g.strokeStyle = p.color; g.lineWidth = 14 * (1 - q) + 2; g.beginPath(); g.arc(p.x, p.y, p.size * (0.2 + q), 0, 7); g.stroke(); }
      else if (p.type === "conf") { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.rot * 2)); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore(); }
    }
    g.globalAlpha = 1;
    for (const p of FX.pops) {
      const t = p.t, d = p.dur;
      const sIn = Math.min(1, t / 0.32), sc = t < 0.32 ? easeOutBack(sIn) : 1;
      const out = Math.max(0, (t - d * 0.65) / (d * 0.35));
      g.save(); g.translate(p.x, p.y - (p.big ? out * 40 : t * 70));
      g.rotate(p.big ? Math.sin(t * 6) * 0.04 - 0.05 : 0);
      g.scale(sc * (1 + out * 0.2), sc * (1 + out * 0.2)); g.globalAlpha = 1 - out;
      g.font = `700 ${p.size}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = p.size * 0.28; g.strokeStyle = "#6b1145"; g.strokeText(p.text, 0, p.size * 0.06);
      g.lineWidth = p.size * 0.12; g.strokeStyle = "#fff"; g.strokeText(p.text, 0, 0);
      const gr = g.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
      gr.addColorStop(0, p.cols[0]); gr.addColorStop(1, p.cols[1]);
      g.fillStyle = gr; g.fillText(p.text, 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
  };
  KO.FX = FX;
})(window.KO);
