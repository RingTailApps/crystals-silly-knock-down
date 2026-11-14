/* Gameplay: physics world, slingshot, clearing, scoring, win/fail. */
(function (KO) {
  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const A = () => KO.Audio, FX = () => KO.FX;
  const Game = { state: "none", paused: false };
  let engine, level, levelIndex = 0, blocks = [], podiums = [], ball = null, fading = [];
  let shotsLeft = 0, shotsUsed = 0, score = 0, stateT = 0, simT = 0, introDur = 0;
  let comboCount = 0, trail = [], prevTrail = [], drag = null, lastTick = 0, restFrames = 0;
  let snapT = 9, reloadT = 9, endTimer = 0, pendingBombs = [], clearLine = 0, stepCount = 0;
  let listener = () => {};
  const SL = () => KO.SLING;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutBack = (t) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  Game.on = (fn) => { listener = fn; };
  const emit = (type, data) => listener(type, data || {});
  const blocksLeft = () => blocks.filter(b => !b.cleared).length;
  function hud() { emit("hud", { score, shotsLeft, shots: level.shots, blocksLeft: blocksLeft(), total: blocks.length, level: levelIndex + 1, name: level.name }); }

  Game.load = function (i) {
    levelIndex = i; level = KO.LEVELS[i];
    engine = Engine.create({ positionIterations: 12, velocityIterations: 10 });
    engine.gravity.y = 1;
    blocks = []; podiums = []; ball = null; fading = []; pendingBombs = [];
    trail = []; prevTrail = []; drag = null; comboCount = 0; score = 0; shotsUsed = 0; shotsLeft = level.shots;
    stateT = 0; simT = 0; snapT = 9; reloadT = 0; endTimer = 0; stepCount = 0;
    FX().reset();
    const GY = KO.GROUND_Y;
    const ground = Bodies.rectangle(KO.W / 2, GY + 200, 8000, 400, { isStatic: true, label: "ground", friction: 0.9 });
    Composite.add(engine.world, ground);
    level.podiums.forEach((p) => {
      if (p.rock) {
        // tilting rocker: a static stone post plus a slab that rocks around its center
        const post = Bodies.rectangle(p.x, (p.top + 34 + GY) / 2, 44, GY - p.top - 34, { isStatic: true, label: "podium", friction: 1 });
        const slab = Bodies.rectangle(p.x, p.top + 17, p.w, 34, { isStatic: true, label: "podium", friction: 1, chamfer: { radius: 8 } });
        Composite.add(engine.world, [post, slab]);
        podiums.push({ body: slab, cx: p.x, baseX: p.x, top: p.top, w: p.w, rock: p.rock, angle: 0 });
        return;
      }
      const body = p.float
        ? Bodies.rectangle(p.x, p.top + 17, p.w, 34, { isStatic: true, label: "podium", friction: 1, chamfer: { radius: 8 } })
        : Bodies.rectangle(p.x, (p.top + GY) / 2, p.w, GY - p.top, { isStatic: true, label: "podium", friction: 1 });
      Composite.add(engine.world, body);
      podiums.push({ body, cx: p.x, baseX: p.x, top: p.top, w: p.w, float: !!p.float, move: p.move });
    });
    clearLine = Math.max(...level.podiums.map(p => p.top)) + 34;
    level.blocks.forEach((b, idx) => {
      const opts = { label: "block", friction: 0.8, frictionStatic: 1.2, restitution: 0.06, density: 0.001, frictionAir: 0.004 };
      if (b.type === "heavy") opts.density = 0.0028;
      if (b.pod != null) { opts.friction = 1; opts.frictionStatic = 2; }
      if (b.type === "bouncy") { opts.restitution = 0.72; opts.friction = 0.5; opts.density = 0.0008; }
      let body;
      if (b.type === "bomb") body = Bodies.circle(b.x, b.y, b.w / 2, Object.assign(opts, { density: 0.0012, restitution: 0.2, frictionAir: 0.01 }));
      else body = Bodies.rectangle(b.x, b.y, b.w, b.h, Object.assign(opts, { chamfer: { radius: Math.min(b.w, b.h) * 0.12 } }));
      Composite.add(engine.world, body);
      const blk = { body, w: b.w, h: b.h, c: b.c, type: b.type, cleared: false, alpha: 1, scale: 0, squash: 0, sqv: 0,
        blink: 0, blinkIn: 1 + Math.random() * 4, attached: b.pod != null, delay: idx * 0.06, clearT: 0, pod: b.pod, scared: false };
      body.plugin.blk = blk;
      blocks.push(blk);
    });
    introDur = blocks.length * 0.06 + 0.55;
    // frame the camera on this level's content so blocks stay big on phones
    let rx1 = 0, ry0 = KO.GROUND_Y;
    level.podiums.forEach(p => { rx1 = Math.max(rx1, p.x + p.w / 2 + (p.move ? p.move.ax : 0) + 30); });
    level.blocks.forEach(b2 => { ry0 = Math.min(ry0, b2.y - b2.h / 2); });
    KO.Dogs && KO.Dogs.reset();
    if (KO.Dogs && i === 0) setTimeout(() => { if (levelIndex === 0 && shotsUsed === 0) KO.Dogs.react("start"); }, 1600);
    KO.setRegion && KO.setRegion({ x0: KO.SLING.x - 140, x1: Math.max(rx1, 760), y0: Math.min(ry0 - 150, 640), y1: KO.GROUND_Y + 55 });
    Events.on(engine, "collisionStart", onCollide);
    Game.state = "intro"; Game.paused = false;
    hud();
    emit("intro", { level: i + 1, name: level.name, blocks: blocks.length, shots: level.shots });
  };

  function onCollide(ev) {
    for (const pair of ev.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (rel < 2.2) continue;
      const ba = a.plugin.blk, bb = b.plugin.blk;
      // a hit from the ball or a loose block detaches blocks riding a moving platform
      if (ba && ba.attached && (b.label === "ball" || (bb && !bb.attached))) detachChain(ba);
      if (bb && bb.attached && (a.label === "ball" || (ba && !ba.attached))) detachChain(bb);
      [ba, bb].forEach(k => { if (k && !k.cleared) k.sqv += Math.min(0.5, rel * 0.03) * (k.type === "bouncy" ? 2 : 1); });
      if (stateT > 0.2 || Game.state === "flying") A().thunk(rel);
      const isBall = a.label === "ball" || b.label === "ball";
      const sup = pair.collision.supports && pair.collision.supports[0];
      if (rel > 6 && sup) FX().dust(sup.x, sup.y, isBall ? 6 : 3);
      if (isBall && rel > 9) FX().addShake(Math.min(14, rel * 0.6));
      [ba, bb].forEach(k => { if (k && k.type === "bomb" && !k.cleared && rel > 4.5 && Game.state !== "intro") pendingBombs.push(k); });
    }
  }

  function detachChain(k) { const pod = k.pod; blocks.forEach(o => { if (o.pod === pod) o.attached = false; }); }

  function explode(k) {
    if (k.cleared) return;
    const p = { x: k.body.position.x, y: k.body.position.y };
    markCleared(k, true);
    Composite.remove(engine.world, k.body);
    k.alpha = 0;
    A().boom(); FX().addShake(26);
    FX().burst(p.x, p.y, ["#ff3b5c", "#ffd52e", "#fff", "#ff8a1f"], 46, 1.6);
    FX().ring(p.x, p.y, "#fff38a", 260); FX().ring(p.x, p.y, "#ff8a1f", 180); FX().sparkle(p.x, p.y, 16);
    FX().text(p.x, p.y - 40, "BOOM!", { size: 64, cols: ["#fff38a", "#ff5f1f"] });
    const R = 250;
    const affect = blocks.filter(o => !o.cleared).map(o => o.body);
    if (ball) affect.push(ball);
    affect.forEach(body => {
      const dx = body.position.x - p.x, dy = body.position.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > R) return;
      const f = 1 - d / R, s = 19 * f;
      Body.setVelocity(body, { x: body.velocity.x + (dx / d) * s, y: body.velocity.y + (dy / d) * s - 5 * f });
      Body.setAngularVelocity(body, body.angularVelocity + (dx > 0 ? 0.15 : -0.15) * f);
      const ob = body.plugin.blk; if (ob && ob.attached && f > 0) detachChain(ob);
      if (ob && ob.type === "bomb" && d < 150) pendingBombs.push(ob);
    });
  }

  function bigTextPos() {
    const v = KO.Art.view();
    return [(v.sw / 2 - v.offX) / v.scale, Math.max(420, (Math.max(150, v.sh * 0.3) - v.offY) / v.scale)];
  }
  function markCleared(k, isBomb) {
    k.cleared = true; k.clearT = 0;
    comboCount++;
    const pts = (isBomb ? 250 : 100) * comboCount;
    score += pts;
    const p = k.body.position, col = KO.COLORS[k.c] || KO.COLORS.red;
    if (!isBomb) {
      A().pop(comboCount - 1);
      FX().burst(p.x, Math.min(p.y, KO.GROUND_Y - 10), [col[0], col[1], col[2], "#fff"], 18, 0.9);
      FX().sparkle(p.x, Math.min(p.y, KO.GROUND_Y - 10), 6);
    }
    FX().text(clamp(p.x, 60, KO.W - 60), clamp(p.y, 120, KO.GROUND_Y - 40) - 30, "+" + pts, { cols: [col[0], col[1]] });
    const word = KO.COMBO_WORDS.filter(w => w[0] === comboCount)[0];
    const left = blocksLeft();
    if (left === 0) {
      FX().text(...bigTextPos(), KO.CLEAR_WORD, { big: true, size: 76, dur: 1.9, cols: ["#fffbd0", "#ff9d1f"] });
    } else if (word) {
      FX().text(...bigTextPos(), word[1], { big: true, cols: [["#ffe0f7", "#ff4fb8"], ["#fff7a8", "#ffb21f"], ["#d8ffd0", "#3fcf5a"], ["#d6ecff", "#3b8cff"], ["#f0dcff", "#a855f7"]][KO.COMBO_WORDS.indexOf(word) % 5] });
      A().sparkle();
    }
    KO.Dogs && left > 0 && KO.Dogs.react("clear", comboCount);
    hud();
    if (left === 0 && Game.state !== "won" && !(Game.state === "failed" && Game._sentEnd)) {
      Game.state = "won"; endTimer = 0; KO.Dogs && KO.Dogs.react("win");
      FX().confetti(0, KO.W, 0, 120);
    }
  }

  /* ---------------- input ---------------- */
  Game.canAim = () => Game.state === "aim" && !Game.paused;
  Game.pointerDown = function (x, y) {
    if (!Game.canAim()) return false;
    if (Math.hypot(x - SL().x, y - SL().y) > KO.GRAB_RADIUS) return false;
    drag = { x: SL().x, y: SL().y, pull: 0 };
    Game.pointerMove(x, y);
    A().tick(0);
    return true;
  };
  Game.pointerMove = function (x, y) {
    if (!drag) return;
    let dx = x - SL().x, dy = y - SL().y;
    const len = Math.hypot(dx, dy);
    if (len > KO.MAX_PULL) { dx *= KO.MAX_PULL / len; dy *= KO.MAX_PULL / len; }
    // keep the ball above the ground
    const maxDy = KO.GROUND_Y - KO.BALL_R - 6 - SL().y;
    if (dy > maxDy) dy = maxDy;
    drag.x = SL().x + dx; drag.y = SL().y + dy;
    drag.pull = Math.min(1, Math.hypot(dx, dy) / KO.MAX_PULL);
    if (Math.abs(drag.pull - lastTick) > 0.12) { lastTick = drag.pull; A().tick(drag.pull); }
  };
  Game.pointerUp = function () {
    if (!drag) return;
    const d = drag; drag = null; lastTick = 0;
    if (Math.hypot(d.x - SL().x, d.y - SL().y) < KO.MIN_PULL || Game.state !== "aim") { snapT = 0; return; }
    launch(d);
  };
  Game.cancelDrag = () => { drag = null; };
  function launchVel(d) {
    const k = KO.LAUNCH_SPEED / KO.MAX_PULL;
    return { x: -(d.x - SL().x) * k, y: -(d.y - SL().y) * k };
  }
  function launch(d) {
    const v = launchVel(d);
    if (ball) { fading.push({ body: ball, t: 0 }); }
    ball = Bodies.circle(d.x, d.y, KO.BALL_R, { label: "ball", density: 0.008, restitution: 0.35, friction: 0.5, frictionAir: 0 });
    Composite.add(engine.world, ball);
    Body.setVelocity(ball, v);
    Body.setAngularVelocity(ball, v.x * 0.01);
    shotsLeft--; shotsUsed++;
    comboCount = 0; restFrames = 0;
    prevTrail = trail; trail = [];
    Game.state = "flying"; stateT = 0; snapT = 0;
    A().twang(); A().whoosh();
    FX().addShake(5 + Math.hypot(v.x, v.y) * 0.25);
    FX().dust(d.x, d.y, 6); FX().sparkle(d.x, d.y, 5);
    hud();
  }
  Game.debugShoot = function (angleDeg, power) {
    if (Game.state !== "aim") return false;
    const a = (angleDeg * Math.PI) / 180, p = clamp(power, 0, 1) * KO.MAX_PULL;
    launch({ x: SL().x - Math.cos(a) * p, y: SL().y + Math.sin(a) * p });
    return true;
  };

  /* ---------------- simulation ---------------- */
  function step() {
    stepCount++;
    simT += KO.STEP_MS / 1000;
    podiums.forEach(p => {
      if (p.rock) {
        const a = p.rock.amp * Math.sin((simT * Math.PI * 2) / p.rock.period);
        const da = a - p.angle, pivot = { x: p.body.position.x, y: p.body.position.y };
        Body.setAngle(p.body, a); p.angle = a;
        const pi = podiums.indexOf(p);
        blocks.forEach(k => { if (k.attached && k.pod === pi && !k.cleared) Body.rotate(k.body, da, pivot); });
        return;
      }
      if (!p.move) return;
      const nx = p.baseX + p.move.ax * Math.sin((simT * Math.PI * 2) / p.move.period);
      const dx = nx - p.body.position.x;
      const pi = podiums.indexOf(p);
      const carrying = blocks.some(k => k.attached && k.pod === pi && !k.cleared);
      Body.setPosition(p.body, { x: nx, y: p.body.position.y });
      Body.setVelocity(p.body, { x: carrying ? 0 : dx, y: 0 });
      p.cx = nx;
      // carry undisturbed blocks rigidly with their moving platform
      blocks.forEach(k => { if (k.attached && k.pod === pi && !k.cleared) Body.translate(k.body, { x: dx, y: 0 }); });
    });
    Engine.update(engine, KO.STEP_MS);
    // bombs
    if (pendingBombs.length) { const list = pendingBombs; pendingBombs = []; list.forEach(explode); }
    // clearing
    for (const k of blocks) {
      if (k.cleared) continue;
      const p = k.body.position;
      if (p.y > clearLine || p.x < -260 || p.x > KO.W + 260) {
        if (k.type === "bomb") explode(k); else markCleared(k, false);
      }
    }
    if (ball && Game.state === "flying" && stepCount % 2 === 0) {
      trail.push({ x: ball.position.x, y: ball.position.y, r: 3 + (trail.length % 3 === 0 ? 3 : 0) });
      if (trail.length > 160) trail.shift();
    }
  }

  Game.update = function (dt) {
    if (!engine || Game.paused) return;
    stateT += dt;
    snapT += dt; reloadT += dt;
    if (Game.state === "intro") {
      blocks.forEach(k => { k.scale = easeOutBack(clamp((stateT - k.delay) / 0.38, 0, 1)); });
      if (stateT >= introDur) { blocks.forEach(k => (k.scale = 1)); Game.state = "aim"; stateT = 0; reloadT = 0; emit("ready"); }
    } else {
      // fixed-step physics
      Game._acc = (Game._acc || 0) + dt * 1000;
      let n = 0;
      while (Game._acc >= KO.STEP_MS && n < 6) { step(); Game._acc -= KO.STEP_MS; n++; }
      if (n === 6) Game._acc = 0;
    }
    // per-block cosmetic
    const look = ball && Game.state === "flying" ? ball.position : drag || SL();
    for (const k of blocks) {
      k.sqv -= k.squash * dt * 260; k.sqv *= Math.pow(0.0008, dt); k.squash += k.sqv * dt * 10;
      k.squash = clamp(k.squash, -0.25, 0.25);
      k.blinkIn -= dt; if (k.blinkIn < 0) { k.blink = 0.12; k.blinkIn = 2 + Math.random() * 4; }
      if (k.blink > 0) k.blink -= dt;
      const dd = Math.hypot(k.body.position.x - look.x, k.body.position.y - look.y);
      k.scared = (Game.state === "flying" && dd < 260) || (drag && drag.pull > 0.55) || k.body.speed > 4;
      if (k.cleared) { k.clearT += dt; k.alpha = Math.max(0, 1 - k.clearT / 0.6) * (k.alpha > 0 ? 1 : 0); k.scale = 1 + k.clearT * 0.3;
        if (k.clearT > 0.6 && !k.removed) { k.removed = true; Composite.remove(engine.world, k.body); } }
    }
    for (let i = fading.length - 1; i >= 0; i--) { const f = fading[i]; f.t += dt; if (f.t > 0.4) { Composite.remove(engine.world, f.body); fading.splice(i, 1); } }
    if (ball && Game.state === "flying" && Math.random() < 0.5 && ball.speed > 6) FX().trailPuff(ball.position.x, ball.position.y);
    FX().update(dt); KO.Dogs && KO.Dogs.update(dt);
    if (Game.state === "flying") {
      const p = ball.position;
      const out = p.x < -200 || p.x > KO.W + 200 || p.y > KO.H + 200;
      restFrames = ball.speed < 0.35 ? restFrames + 1 : 0;
      if (out || restFrames > 40 || stateT > 8) { Game.state = "settle"; stateT = 0; }
    } else if (Game.state === "settle") {
      const moving = blocks.some(k => !k.cleared && k.body.speed > 0.25);
      if ((stateT > 0.6 && !moving) || stateT > 3.5) {
        if (shotsLeft > 0) {
          if (ball) { fading.push({ body: ball, t: 0 }); ball = null; }
          Game.state = "aim"; stateT = 0; reloadT = 0; A().pop(0);
        } else { Game.state = "failed"; endTimer = 0; A().fail(); KO.Dogs && KO.Dogs.react("fail"); }
      }
    } else if (Game.state === "won") {
      endTimer += dt;
      if (endTimer > 1.5 && !Game._sentEnd) {
        Game._sentEnd = true;
        const [s3, s2] = level.stars;
        const stars = shotsUsed <= s3 ? 3 : shotsUsed <= s2 ? 2 : 1;
        const bonus = shotsLeft * 1000;
        emit("win", { level: levelIndex + 1, stars, score, bonus, total: score + bonus, shotsUsed, shotsLeft });
      }
    } else if (Game.state === "failed") {
      endTimer += dt;
      if (endTimer > 0.9 && !Game._sentEnd) { Game._sentEnd = true; emit("fail", { level: levelIndex + 1, blocksLeft: blocksLeft(), score }); }
    }
  };
  const _load = Game.load;
  Game.load = function (i) { Game._sentEnd = false; Game._acc = 0; _load(i); };

  /* ---------------- render ---------------- */
  Game.render = function (g, t) {
    const Art = KO.Art;
    Art.drawWorldBack(g, t);
    podiums.forEach(p => Art.drawPodium(g, p, t));
    // trails
    g.fillStyle = "rgba(255,255,255,0.45)";
    prevTrail.forEach(p => { g.beginPath(); g.arc(p.x, p.y, p.r * 0.8, 0, 7); g.fill(); });
    g.fillStyle = "rgba(255,255,255,0.9)";
    trail.forEach(p => { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
    const sp = Art.slingPts();
    KO.Dogs && KO.Dogs.draw(g, t);
    Art.drawSlingBack(g);
    // loaded ball position
    const loaded = Game.state === "aim" || Game.state === "intro";
    let bp = null, bscale = 1;
    if (loaded) {
      bp = drag ? { x: drag.x, y: drag.y } : { x: SL().x, y: SL().y };
      if (!drag && snapT < 0.5) { const w = Math.sin(snapT * 40) * (1 - snapT / 0.5) * 10; bp.x += w; }
      bscale = Game.state === "aim" ? easeOutBack(clamp(reloadT / 0.35, 0, 1)) : 1;
    }
    const restMid = { x: (sp.back.x + sp.front.x) / 2, y: (sp.back.y + sp.front.y) / 2 + 6 };
    let bandPt = bp;
    if (!bandPt) { const w = snapT < 0.6 ? Math.sin(snapT * 45) * (1 - snapT / 0.6) * 22 : 0; bandPt = { x: restMid.x + w, y: restMid.y + w * 0.3 }; }
    const stretch = drag ? drag.pull : 0;
    Art.drawBand(g, sp.back, bandPt, stretch);
    // blocks
    const look = ball && Game.state === "flying" ? ball.position : (drag || SL());
    for (const k of blocks) {
      if (k.alpha <= 0 || k.scale <= 0.001) continue;
      Art.drawBlock(g, { x: k.body.position.x, y: k.body.position.y, angle: k.body.angle, w: k.w, h: k.h, c: k.c, type: k.type,
        squash: k.squash, scared: k.scared, blink: k.blink, alpha: k.alpha, scale: k.scale }, look);
    }
    // flying / fading balls
    fading.forEach(f => Art.drawBall(g, f.body.position.x, f.body.position.y, KO.BALL_R * (1 - f.t / 0.4 * 0.5), f.body.angle, 1 - f.t / 0.4));
    if (ball && !fading.some(f => f.body === ball)) Art.drawBall(g, ball.position.x, ball.position.y, KO.BALL_R, ball.angle, 1);
    if (bp) {
      const ang = Math.atan2(bp.y - SL().y, bp.x - SL().x);
      if (drag) Art.drawPouch(g, bp, ang + Math.PI);
      Art.drawBall(g, bp.x, bp.y, KO.BALL_R * bscale, 0, 1);
    }
    Art.drawBand(g, sp.front, bandPt, stretch);
    Art.drawSlingFront(g);
    // aim preview
    if (drag && Math.hypot(drag.x - SL().x, drag.y - SL().y) >= KO.MIN_PULL) {
      const v = launchVel(drag); let x = drag.x, y = drag.y, vx = v.x, vy = v.y;
      const n = 60, spacing = 4, phase = Math.floor((t * 30) % spacing);
      for (let i = 1; i <= n; i++) {
        vy += KO.GRAVITY_PER_STEP; x += vx; y += vy;
        if (i > 5 && (i + spacing - phase) % spacing === 0) {
          const q = 1 - i / n;
          g.globalAlpha = Math.min(1, 0.15 + q * 1.1);
          g.fillStyle = "rgba(40,20,90,0.35)"; g.beginPath(); g.arc(x + 1.5, y + 2, 3 + q * 5, 0, 7); g.fill();
          g.fillStyle = i % (spacing * 3) === 0 ? "#7ff6ff" : "#fff"; g.beginPath(); g.arc(x, y, 3 + q * 5, 0, 7); g.fill();
        }
        if (y > KO.GROUND_Y) break;
      }
      // power meter arc around the slingshot
      g.globalAlpha = 1; g.lineCap = "round";
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 8; g.beginPath(); g.arc(SL().x, SL().y, 62, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
      g.strokeStyle = drag.pull > 0.85 ? "#ffd52e" : "#7ff6ff"; g.beginPath(); g.arc(SL().x, SL().y, 62, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * drag.pull)); g.stroke();
      g.globalAlpha = 1;
    }
    // first-level coach: a ghost hand drags the stone back
    if (levelIndex === 0 && shotsUsed === 0 && !drag && Game.state === "aim" && reloadT > 0.6) {
      const c = ((reloadT - 0.6) % 2.2) / 2.2, k = Math.min(1, c / 0.6), e = 1 - Math.pow(1 - k, 3);
      const hx = SL().x - 110 * e, hy = SL().y + 60 * e;
      g.globalAlpha = c > 0.85 ? (1 - c) / 0.15 : Math.min(1, c * 5);
      g.setLineDash([10, 10]); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(SL().x, SL().y); g.lineTo(hx, hy); g.stroke(); g.setLineDash([]);
      // fingertip
      g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(hx, hy, 34 - 8 * e, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(hx, hy, 16, 0, 7); g.fill();
      g.strokeStyle = "#3b2a7a"; g.lineWidth = 3; g.stroke();
      g.globalAlpha = 1;
    }
    FX().draw(g);
    KO.Dogs && KO.Dogs.drawBubbles(g);
    // off-screen indicator when the stone flies above the top of the screen
    if (ball && Game.state === "flying") {
      const v = KO.Art.view(), yTop = -v.offY / v.scale;
      if (ball.position.y < yTop - KO.BALL_R) {
        const mx = ball.position.x, my = yTop + 120 / v.scale * 0.5 + 40;
        g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
        g.beginPath(); g.moveTo(mx - 12, my - 28); g.lineTo(mx, my - 44); g.lineTo(mx + 12, my - 28); g.fill();
        KO.Art.drawBall(g, mx, my, 18, ball.angle, 1);
      }
    }
  };

  Game.skipIntro = function () { if (Game.state === "intro") { blocks.forEach(k => (k.scale = 1)); Game.state = "aim"; stateT = 0; } };
  Game.info = () => ({ state: Game.state, shotsLeft, shotsUsed, score, blocksLeft: blocks.length ? blocksLeft() : 0, total: blocks.length, level: levelIndex + 1 });
  Game.levelIndex = () => levelIndex;
  Game._eng = () => engine;
  KO.Game = Game;
})(window.KO);
