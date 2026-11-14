/* Chance (blue merle, nickname Bubba) and Kevin (red tri): cartoon mascots by the slingshot. */
(function (KO) {
  const load = (src) => { const i = new Image(); i.src = src; return i; };
  const D = {
    chance: { img: load("assets/chance.png"), x: 96, h: 124, y: 0, vy: 0, mood: 0, name: "Chance" },
    kevin:  { img: load("assets/kevin.png"),  x: 312,  h: 84,  y: 0, vy: 0, mood: 0, name: "Kevin" },
    bubbles: []
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  D.reset = function () { [D.chance, D.kevin].forEach(d => { d.y = 0; d.vy = 0; d.mood = 0; }); D.bubbles.length = 0; };
  D.hop = function (d, power) { if (d.y >= -0.5) d.vy = -(power || 420); };
  D.say = function (who, text, dur) {
    D.bubbles = D.bubbles.filter(b => b.who !== who);
    D.bubbles.push({ who, text: `${D[who].name}: ${text}`, t: 0, dur: dur || 2 });
  };
  let lastCheer = 0;
  D.react = function (kind, n) {
    const now = performance.now() / 1000;
    if (kind === "clear") {
      D.hop(D.kevin, 300 + Math.min(n, 6) * 40); if (n >= 2) D.hop(D.chance, 320);
      if (n >= 4 && now - lastCheer > 1.5) { lastCheer = now; D.say("kevin", pick(["Woof! Great!", "Again! Again!", "Arf arf!"]), 1.6); }
    } else if (kind === "win") {
      D.hop(D.chance, 560); D.hop(D.kevin, 480); D.chance.mood = D.kevin.mood = 0;
      D.say("chance", pick(["Nice shot!", "Crystal clear!", "Good human!"]), 2.4);
    } else if (kind === "fail") {
      D.chance.mood = D.kevin.mood = 1; D.say("kevin", "Ruff luck...", 2.4);
    } else if (kind === "start") {
      D.say("kevin", "Pull back & let go!", 2.6);
    }
  };
  D.update = function (dt) {
    [D.chance, D.kevin].forEach(d => {
      d.vy += 1600 * dt; d.y += d.vy * dt;
      if (d.y > 0) { d.y = 0; d.vy = d.vy > 120 ? -d.vy * 0.25 : 0; }
    });
    D.bubbles.forEach(b => (b.t += dt)); D.bubbles = D.bubbles.filter(b => b.t < b.dur);
  };
  function drawDog(g, d, t, phase) {
    if (!d.img.complete || !d.img.naturalWidth) return;
    const GY = KO.GROUND_Y + 6, h = d.h, w = h * d.img.naturalWidth / d.img.naturalHeight;
    const air = Math.min(1, -d.y / 60);
    const breathe = Math.sin(t * 2.4 + phase) * 0.02;
    const sy = (1 + breathe - air * -0.06) * (d.mood ? 0.93 : 1), sx = (1 - breathe * 0.6 - air * 0.04);
    // shadow
    g.fillStyle = `rgba(30,20,40,${0.25 - air * 0.12})`; g.beginPath(); g.ellipse(d.x, GY - 2, w * 0.42 * (1 - air * 0.3), 8, 0, 0, 7); g.fill();
    g.save(); g.translate(d.x, GY + d.y); g.rotate(d.mood ? -0.06 : Math.sin(t * 1.3 + phase) * 0.015);
    g.scale(sx, sy);
    if (d.mood) g.filter = "saturate(0.7) brightness(0.92)";
    g.drawImage(d.img, -w / 2, -h, w, h);
    g.filter = "none";
    g.restore();
  }
  function bubble(g, x, y, text, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    g.font = '600 22px Fredoka, "Arial Rounded MT Bold", sans-serif';
    const w = g.measureText(text).width + 28, h = 40;
    g.fillStyle = "rgba(20,8,70,0.25)"; KO.Art.rr(g, -w / 2 + 2, -h + 4, w, h, 16); g.fill();
    g.fillStyle = "#fff"; KO.Art.rr(g, -w / 2, -h, w, h, 16); g.fill();
    g.beginPath(); g.moveTo(-10, -2); g.lineTo(0, 14); g.lineTo(10, -2); g.fill();
    g.fillStyle = "#2a1068"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, -h / 2 + 1);
    g.restore();
  }
  D.draw = function (g, t) {
    drawDog(g, D.kevin, t, 1.7);
    drawDog(g, D.chance, t, 0);
  };
  D.drawBubbles = function (g) {
    D.bubbles.forEach(b => {
      const d = D[b.who], k = Math.min(1, b.t / 0.18) * (b.t > b.dur - 0.2 ? (b.dur - b.t) / 0.2 : 1);
      const over = 1 + Math.max(0, 0.15 - Math.abs(b.t - 0.15)) ;
      // keep bubbles on screen
      const v = KO.Art.view(), minX = -v.offX / v.scale + 130;
      bubble(g, Math.max(minX, d.x + (b.who === "kevin" ? 70 : 10)), KO.GROUND_Y + d.y - d.h - 14, b.text, Math.max(0.01, k * over));
    });
  };
  KO.Dogs = D;
})(window.KO);
