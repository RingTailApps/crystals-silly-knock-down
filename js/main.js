/* Boot: canvas sizing, main loop, input, menu diorama. */
(function (KO) {
  const canvas = document.getElementById("game");
  const g = canvas.getContext("2d");
  let view = null;
  KO.mode = "menu";

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const sw = window.innerWidth, sh = window.innerHeight;
    canvas.width = Math.round(sw * dpr); canvas.height = Math.round(sh * dpr);
    // Fit the playfield region of interest (not the whole world) so it fills phones and desktops alike.
    const R = region || KO.VIEW_REGION, rw = R.x1 - R.x0, rh = R.y1 - R.y0;
    const scale = Math.min(sw / rw, sh / rh);
    const offX = (sw - rw * scale) / 2 - R.x0 * scale;
    const offY = (sh - rh * scale) * 0.72 - R.y0 * scale;
    view = { scale, offX, offY, dpr, sw, sh };
    KO.Art.setView(view);
  }
  let region = null;
  KO.setRegion = (r) => { region = r; resize(); };
  window.addEventListener("resize", resize);
  resize();

  const toWorld = (cx, cy) => ({ x: (cx - view.offX) / view.scale, y: (cy - view.offY) / view.scale });
  KO.toWorld = toWorld;
  KO.toScreen = (x, y) => ({ x: x * view.scale + view.offX, y: y * view.scale + view.offY });

  /* ---------- input ---------- */
  let activePointer = null;
  canvas.addEventListener("pointerdown", (e) => {
    KO.Audio.unlock();
    if (KO.mode !== "game") { menuTap(e); return; }
    const p = toWorld(e.clientX, e.clientY);
    dogTap(p);
    if (KO.Game.pointerDown(p.x, p.y)) {
      activePointer = e.pointerId; canvas.setPointerCapture(e.pointerId); KO.UI.hideHint();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    menuPointer = toWorld(e.clientX, e.clientY);
    if (e.pointerId !== activePointer) return;
    const p = toWorld(e.clientX, e.clientY); KO.Game.pointerMove(p.x, p.y);
  });
  const up = (e) => { if (e.pointerId !== activePointer) return; activePointer = null; KO.Game.pointerUp(); };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", (e) => { if (e.pointerId === activePointer) { activePointer = null; KO.Game.cancelDrag(); } });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => { if (!e.target.closest(".map-scroll")) e.preventDefault(); }, { passive: false });

  /* ---------- menu diorama ---------- */
  let menuPointer = { x: 500, y: 700 };
  const menuBlocks = [
    { x: 640, y: 820 - 36, w: 72, h: 72, c: "red" }, { x: 640, y: 820 - 108, w: 72, h: 72, c: "yellow" },
    { x: 640, y: 820 - 180, w: 72, h: 72, c: "blue" }, { x: 560, y: 820 - 32, w: 64, h: 64, c: "green" },
    { x: 720, y: 820 - 32, w: 64, h: 64, c: "purple" }
  ].map(b => Object.assign(b, { type: "normal", angle: 0, squash: 0, sqv: 0, blink: 0, blinkIn: Math.random() * 3, scale: 1, alpha: 1 }));
  const floaters = [];
  for (let i = 0; i < 14; i++) floaters.push({ x: Math.random(), y: Math.random(), s: 18 + Math.random() * 30, c: KO.PALETTE[i % 8], r: Math.random() * 6, vr: (Math.random() - 0.5) * 1.2, vy: 0.02 + Math.random() * 0.04 });
  function dogTap(p) {
    [["chance", "Woof!"], ["kevin", "Arf arf!"]].forEach(([k, txt]) => { const d = KO.Dogs[k];
      if (Math.abs(p.x - d.x) < d.h * 0.5 && p.y > KO.GROUND_Y - d.h && p.y < KO.GROUND_Y + 10) { KO.Dogs.hop(d, 420); KO.Dogs.say(k, txt, 1.4); KO.Audio.pop(3); } });
  }
  function menuTap(e) {
    const p = toWorld(e.clientX, e.clientY);
    dogTap(p);
    const land = view.sw > view.sh * 1.1, shift = land ? Math.max(640, toWorld(view.sw * 0.83, 0).x) - 640 : 0;
    menuBlocks.forEach(b => { if (Math.abs(p.x - b.x - shift) < b.w && Math.abs(p.y - b.y) < b.h) { b.sqv += 0.6; KO.Audio.pop(Math.floor(Math.random() * 6)); KO.FX.sparkle(b.x + shift, b.y, 8); } });
  }
  function renderMap(t, dt) {
    drawFloaters(dt);
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, view.sh);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(120,90,255,0.4)");
    g.fillStyle = gr; g.fillRect(0, 0, view.sw, view.sh);
  }
  function drawFloaters(dt) {
    // floaters in screen space
    floaters.forEach(f => {
      f.y -= f.vy * dt; f.r += f.vr * dt; if (f.y < -0.1) { f.y = 1.1; f.x = Math.random(); }
      g.save(); g.globalAlpha = 0.55; g.translate(f.x * view.sw, f.y * view.sh); g.rotate(f.r);
      const s = KO.Art.blockSprite(40, 40, f.c, "normal"); const k = f.s / 40;
      g.drawImage(s.c, -s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k); g.restore();
    });
  }
  function renderMenu(t, dt) {
    drawFloaters(dt);
    worldTransform();
    KO.Art.drawWorldBack(g, t);
    // in landscape, slide the diorama tower to the right so it clears the logo
    const land = view.sw > view.sh * 1.1;
    const px = land ? Math.max(640, toWorld(view.sw * 0.83, 0).x) : 640, shift = px - 640;
    KO.Art.drawPodium(g, { cx: px, top: 820, w: 260 }, t);
    KO.Dogs.update(dt); KO.Dogs.draw(g, t);
    KO.Art.drawSlingBack(g);
    const sp = KO.Art.slingPts();
    const bob = Math.sin(t * 2) * 6;
    const ball = { x: KO.SLING.x - 40 + bob, y: KO.SLING.y + 30 + bob * 0.5 };
    KO.Art.drawBand(g, sp.back, ball, 0.5);
    menuBlocks.forEach((b, i) => {
      if (!land && i === 2) return; // keep the portrait diorama clear of the Play button
      b.sqv -= b.squash * dt * 260; b.sqv *= Math.pow(0.001, dt); b.squash += b.sqv * dt * 10;
      b.blinkIn -= dt; if (b.blinkIn < 0) { b.blink = 0.12; b.blinkIn = 2 + Math.random() * 3; } b.blink -= dt;
      const hop = Math.max(0, Math.sin(t * 3 + i * 0.9)) * 0;
      KO.Art.drawBlock(g, Object.assign({}, b, { x: b.x + shift, y: b.y - hop }), menuPointer);
    });
    KO.Art.drawPouch(g, ball, Math.atan2(ball.y - KO.SLING.y, ball.x - KO.SLING.x) + Math.PI);
    KO.Art.drawBall(g, ball.x, ball.y, KO.BALL_R, t, 1);
    KO.Art.drawBand(g, sp.front, ball, 0.5);
    KO.Art.drawSlingFront(g);
    KO.FX.update(dt); KO.FX.draw(g); KO.Dogs.drawBubbles(g);
  }

  function worldTransform() {
    const s = KO.FX.shake, sx = s ? (Math.random() - 0.5) * s : 0, sy = s ? (Math.random() - 0.5) * s : 0;
    g.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * (view.offX + sx * view.scale), view.dpr * (view.offY + sy * view.scale));
  }

  /* ---------- DOM star burst (used by level-complete stars) ---------- */
  KO.screenBurst = function (x, y) {
    const cols = ["#ffd52e", "#fff", "#ff5fcf", "#7ed8ff"];
    for (let i = 0; i < 14; i++) {
      const el = document.createElement("div");
      const a = (i / 14) * Math.PI * 2, d = 70 + Math.random() * 60, s = 10 + Math.random() * 12;
      el.style.cssText = `position:fixed;left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;z-index:30;pointer-events:none;background:${cols[i % 4]};clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)`;
      document.body.appendChild(el);
      el.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(.3) rotate(${Math.random() * 360}deg)`, opacity: 0 }],
        { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => el.remove();
    }
  };

  /* ---------- loop ---------- */
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    requestAnimationFrame(frame);
    try {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      KO.Art.drawSky(g, T);
      if (KO.mode === "game") {
        KO.Game.update(dt);
        worldTransform();
        KO.Game.render(g, T);
      } else if (KO.mode === "map") renderMap(T, dt); else renderMenu(T, dt);
    } catch (err) { console.error(err); }
  }

  KO.UI.init();
  requestAnimationFrame(frame);

  // test / debug hooks
  KO.debug = {
    shoot: (a, p) => KO.Game.debugShoot(a, p),
    info: () => KO.Game.info(),
    start: (i) => KO.UI.startLevel(i)
  };
})(window.KO);
