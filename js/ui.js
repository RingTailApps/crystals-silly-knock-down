/* Menus, screens, modals, transitions, save data. */
(function (KO) {
  const $ = (id) => document.getElementById(id);
  const A = () => KO.Audio;

  /* ---------------- save ---------------- */
  const Save = {
    data: { stars: {}, best: {}, sound: true, music: true },
    load() { try { const d = JSON.parse(localStorage.getItem(KO.SAVE_KEY)); if (d) Object.assign(this.data, d); } catch (e) {} return this.data; },
    write() { try { localStorage.setItem(KO.SAVE_KEY, JSON.stringify(this.data)); } catch (e) {} },
    stars(i) { return this.data.stars[i] || 0; },
    unlocked() { let n = 0; while (n < KO.LEVELS.length && this.data.stars[n]) n++; return Math.min(n, KO.LEVELS.length - 1); },
    totalStars() { return Object.values(this.data.stars).reduce((a, b) => a + b, 0); },
    record(i, stars, score) {
      const prevBest = this.data.best[i] || 0;
      this.data.stars[i] = Math.max(this.stars(i), stars);
      const isBest = score > prevBest;
      if (isBest) this.data.best[i] = score;
      this.write();
      return { isBest, best: Math.max(prevBest, score) };
    },
    reset() { this.data.stars = {}; this.data.best = {}; this.write(); }
  };
  KO.Save = Save;

  const UI = { screen: "title", current: 0 };

  /* ---------------- helpers ---------------- */
  function show(el) { el.classList.remove("hidden", "closing"); }
  function hide(el) { el.classList.add("hidden"); }
  function closeModal(el, cb) {
    if (el.classList.contains("hidden")) { cb && cb(); return; }
    el.classList.add("closing");
    setTimeout(() => { el.classList.add("hidden"); el.classList.remove("closing"); cb && cb(); }, 190);
  }
  let transitioning = false;
  UI.transition = function (mid) {
    if (transitioning) return; transitioning = true;
    const t = $("transition");
    t.className = "in";
    setTimeout(() => { mid(); t.className = "out"; setTimeout(() => { t.className = ""; transitioning = false; }, 440); }, 400);
  };
  function press(btn, fn) {
    btn.addEventListener("click", (e) => { e.stopPropagation(); A().unlock(); A().click(); fn(e); });
  }

  /* ---------------- title ---------------- */
  function buildLogo() {
    const grads = [
      "linear-gradient(#fff3a1, #ffd52e 45%, #ff8a1f)", "linear-gradient(#ffc2ec, #ff5fcf 50%, #c21f8d)",
      "linear-gradient(#b6f78c, #4fd34a 50%, #1f8f2a)", "linear-gradient(#9fd2ff, #3b8cff 50%, #1c4fc2)",
      "linear-gradient(#e0b3ff, #a855f7 50%, #6b21a8)", "linear-gradient(#ff8fa3, #ff3b5c 50%, #b3122f)",
      "linear-gradient(#9ff5ea, #22d1c0 50%, #0d8c80)"
    ];
    const logo = $("logo"); logo.innerHTML = "";
    let k = 0;
    (KO.LOGO_LINES || KO.GAME_TITLE.split(" ")).forEach((word) => {
      const line = document.createElement("div"); line.className = "line"; line.style.setProperty("--n", Math.max(word.length, 6));
      [...word].forEach((c) => {
        const s = document.createElement("span"); s.className = "ch"; const cc = c === " " ? "\u00a0" : c; s.textContent = cc; s.dataset.c = cc;
        s.style.setProperty("--grad", grads[k % grads.length]);
        s.style.animationDelay = `${k * 0.07}s, ${0.8 + k * 0.15}s`;
        line.appendChild(s); k++;
      });
      logo.appendChild(line);
    });
    document.title = KO.GAME_TITLE;
    $("studio").textContent = KO.STUDIO;
    $("credits").textContent = `${KO.GAME_TITLE} prototype · a ${KO.STUDIO} game`;
  }

  /* ---------------- level map ---------------- */
  const nodeCols = [["#ff7eb6", "#e8379f", "#a3176b"], ["#ffc75a", "#ff8a1f", "#b8540a"], ["#8ef05a", "#2fbf3a", "#1b7f24"],
    ["#7cc4ff", "#2f7cf0", "#1a4fb0"], ["#d6a8ff", "#9a4ff0", "#5f1fa8"], ["#7ff0e0", "#18bfae", "#0d7f74"]];
  function buildMap() {
    const map = $("map"), n = KO.LEVELS.length, gap = 150, topPad = 170, botPad = 150;
    const H = topPad + (n - 1) * gap + botPad;
    map.style.height = H + "px"; map.innerHTML = "";
    const W = Math.min(window.innerWidth, 520);
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: W / 2 + Math.sin(i * 1.1) * W * 0.27, y: H - botPad - i * gap });
    // path
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < n; i++) { const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2; d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`; }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("class", "path");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.style.width = W + "px"; svg.style.left = "50%"; svg.style.marginLeft = -W / 2 + "px";
    svg.innerHTML = `<path d="${d}" fill="none" stroke="rgba(120,20,80,.25)" stroke-width="34" stroke-linecap="round" transform="translate(0,6)"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#ff7eb6" stroke-width="30" stroke-dasharray="18 18" stroke-linecap="butt"/>
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="8" stroke-linecap="round" transform="translate(-4,-6)"/>`;
    map.appendChild(svg);
    // decorations
    const deco = ["#ff7eb6", "#7ed8ff", "#ffd45e", "#8ef05a", "#c58bff"];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, x = W / 2 - side * W * 0.38, y = H - botPad - i * gap - gap / 2;
      const el = document.createElement("div"); el.className = "map-deco";
      const c = deco[i % deco.length];
      el.style.cssText = `left:calc(50% + ${x - W / 2}px);top:${y}px;width:46px;height:100px;margin-left:-23px`;
      el.innerHTML = `<svg viewBox="0 0 46 100" style="width:46px;height:100px"><rect x="20" y="40" width="6" height="58" rx="3" fill="#fff"/>
        <circle cx="23" cy="24" r="21" fill="${c}"/><path d="M23 24 m-14 0 a14 14 0 1 0 14 -14 a10 10 0 1 0 10 10 a6 6 0 1 0 -6 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="15" cy="14" rx="6" ry="4" fill="rgba(255,255,255,.6)"/></svg>`;
      map.appendChild(el);
    }
    const unlocked = Save.unlocked();
    pts.forEach((p, i) => {
      const b = document.createElement("button"); b.className = "node";
      const c = nodeCols[i % nodeCols.length];
      const locked = i > unlocked;
      b.style.cssText = `left:calc(50% + ${p.x - W / 2}px);top:${p.y}px;animation-delay:${i * 0.03}s` + (locked ? "" : `;--c1:${c[0]};--c2:${c[1]};--c3:${c[2]}`);
      if (locked) { b.classList.add("locked"); b.innerHTML = `<svg><use href="#i-lock"/></svg>`; }
      else {
        b.textContent = i + 1;
        if (i === unlocked && !Save.stars(i)) b.classList.add("current");
        const st = document.createElement("div"); st.className = "node-stars";
        for (let s = 0; s < 3; s++) st.innerHTML += `<svg class="${s < Save.stars(i) ? "on" : ""}"><use href="#i-star"/></svg>`;
        b.appendChild(st);
      }
      const nm = document.createElement("div"); nm.className = "node-name"; nm.textContent = KO.LEVELS[i].name; b.appendChild(nm);
      b.dataset.level = i;
      b.addEventListener("click", () => {
        A().unlock();
        if (locked) { A().thunk(2); b.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 250 }); return; }
        A().click(); UI.startLevel(i);
      });
      map.appendChild(b);
    });
    $("star-total").textContent = `${Save.totalStars()}/${n * 3}`;
    // scroll to current
    const target = pts[unlocked];
    requestAnimationFrame(() => { const sc = $("map-scroll"); sc.scrollTop = Math.max(0, target.y - sc.clientHeight * 0.55); });
  }

  /* ---------------- navigation ---------------- */
  UI.showTitle = function () {
    UI.screen = "title"; KO.mode = "menu";
    show($("screen-title")); hide($("screen-levels")); hide($("hud"));
  };
  UI.showLevels = function () {
    UI.screen = "levels"; KO.mode = "map";
    hide($("screen-title")); hide($("hud")); [$("modal-pause"), $("modal-complete"), $("modal-failed")].forEach(hide);
    show($("screen-levels")); buildMap();
  };
  UI.startLevel = function (i) {
    UI.transition(() => {
      UI.current = i; UI.screen = "game"; KO.mode = "game";
      hide($("screen-title")); hide($("screen-levels")); [$("modal-pause"), $("modal-complete"), $("modal-failed")].forEach(hide);
      hud = $("hud"); show(hud); hud.style.animation = "none"; void hud.offsetWidth; hud.style.animation = "";
      KO.Game.load(i);
    });
  };
  let hud;

  /* ---------------- HUD + game events ---------------- */
  let lastScore = 0;
  function onGame(type, d) {
    if (type === "hud") {
      $("hud-level").textContent = d.level;
      const sc = $("hud-score");
      if (d.score !== lastScore) { sc.classList.remove("bump"); void sc.offsetWidth; sc.classList.add("bump"); }
      lastScore = d.score; sc.textContent = d.score.toLocaleString();
      $("hud-blocks").textContent = d.blocksLeft;
      const shots = $("hud-shots");
      if (shots.children.length !== d.shots) { shots.innerHTML = ""; for (let i = 0; i < d.shots; i++) shots.appendChild(document.createElement("i")); }
      [...shots.children].forEach((el, i) => el.classList.toggle("used", i >= d.shotsLeft));
    } else if (type === "intro") {
      const bn = $("banner"); show(bn);
      $("banner-level").textContent = `Level ${d.level}`; $("banner-name").textContent = d.name;
      $("banner-goal").textContent = `Knock all ${d.blocks} off · ${d.shots} gumballs`;
      const inner = bn.firstElementChild; inner.style.animation = "none"; void inner.offsetWidth; inner.style.animation = "";
      clearTimeout(UI._bt); UI._bt = setTimeout(() => hide(bn), 2150);
    } else if (type === "ready") {
      if (UI.current === 0 && !Save.stars(0)) { show($("hint")); }
    } else if (type === "win") {
      hide($("hint"));
      setTimeout(() => showComplete(d), 200);
    } else if (type === "fail") {
      hide($("hint"));
      showFailed(d);
    }
  }

  function showComplete(d) {
    const m = $("modal-complete"); show(m);
    A().win();
    const rec = Save.record(d.level - 1, d.stars, d.total);
    m.querySelectorAll(".bstar").forEach(s => s.classList.remove("on"));
    const scoreEl = $("complete-score"), bonusEl = $("complete-bonus"), bestEl = $("complete-best");
    scoreEl.textContent = "0"; bonusEl.textContent = ""; bestEl.textContent = ""; bestEl.classList.remove("new");
    $("btn-next").style.visibility = d.level < KO.LEVELS.length ? "visible" : "hidden";
    for (let i = 0; i < d.stars; i++) setTimeout(() => {
      m.querySelector(".s" + (i + 1)).classList.add("on"); A().star(i);
      const r = m.querySelector(".s" + (i + 1)).getBoundingClientRect();
      KO.screenBurst && KO.screenBurst(r.left + r.width / 2, r.top + r.height / 2);
    }, 550 + i * 380);
    // count-up
    const t0 = performance.now() + 450, dur = 1100;
    let lastC = 0;
    function tick(now) {
      const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      scoreEl.textContent = Math.round(d.score * e).toLocaleString();
      if (now - lastC > 50 && k > 0 && k < 1) { lastC = now; A().count(); }
      if (k < 1) requestAnimationFrame(tick);
      else if (d.bonus > 0) {
        bonusEl.textContent = `+${d.bonus.toLocaleString()} for ${d.shotsLeft} unused gumball${d.shotsLeft > 1 ? "s" : ""}`;
        const t1 = performance.now();
        (function tick2(n2) {
          const q = Math.min(1, (n2 - t1) / 600);
          scoreEl.textContent = Math.round(d.score + d.bonus * q).toLocaleString();
          if (q < 1) requestAnimationFrame(tick2); else finish();
        })(t1);
      } else finish();
    }
    function finish() {
      bestEl.textContent = rec.isBest ? "New best score!" : `Best: ${rec.best.toLocaleString()}`;
      if (rec.isBest) bestEl.classList.add("new");
    }
    requestAnimationFrame(tick);
  }
  function showFailed(d) {
    show($("modal-failed"));
    $("fail-text").textContent = d.blocksLeft === 1 ? "Just 1 block left. So close!" : `${d.blocksLeft} blocks still standing.`;
    drawSad();
  }
  function drawSad() {
    const c = $("sad-block"), g = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1; c.width = 160 * dpr; c.height = 160 * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 160, 160);
    const saved = Object.assign({}, KO.Art.view());
    KO.Art.setView(Object.assign({}, saved, { scale: 1, dpr: dpr }));
    KO.Art.drawBlock(g, { x: 80, y: 84, angle: -0.08, w: 104, h: 104, c: "blue", type: "normal", scale: 1, alpha: 1, squash: 0, scared: true, blink: 0 }, { x: 80, y: 200 });
    KO.Art.setView(saved);
    g.fillStyle = "#7fd0ff"; g.beginPath(); g.ellipse(104, 88, 6, 9, 0, 0, 7); g.fill();
  }

  /* ---------------- toggles ---------------- */
  function syncToggles() {
    const s = Save.data;
    document.querySelectorAll('[data-toggle="sound"]').forEach(el => { el.classList.toggle("on", s.sound); el.classList.toggle("off", !s.sound && el.classList.contains("rbtn")); });
    document.querySelectorAll('[data-toggle="music"]').forEach(el => { el.classList.toggle("on", s.music); el.classList.toggle("off", !s.music && el.classList.contains("rbtn")); });
    $("btn-title-sound").classList.toggle("off", !s.sound);
    $("btn-title-music").classList.toggle("off", !s.music);
  }
  function toggle(kind) {
    Save.data[kind] = !Save.data[kind]; Save.write();
    if (kind === "sound") A().setSound(Save.data.sound); else A().setMusic(Save.data.music);
    syncToggles();
  }

  UI.pause = function () {
    if (UI.screen !== "game" || !["aim", "flying", "settle", "intro"].includes(KO.Game.state)) return;
    KO.Game.paused = true; KO.Game.cancelDrag(); show($("modal-pause"));
  };
  UI.resume = function () { closeModal($("modal-pause"), () => { KO.Game.paused = false; }); };

  UI.init = function () {
    Save.load();
    A().soundOn = Save.data.sound; A().musicOn = Save.data.music;
    buildLogo(); syncToggles();
    press($("btn-play"), () => UI.transition(() => UI.showLevels()));
    press($("btn-title-settings"), () => show($("modal-settings")));
    press($("btn-title-sound"), () => toggle("sound"));
    press($("btn-title-music"), () => toggle("music"));
    document.querySelectorAll("[data-toggle]").forEach(el => press(el, () => toggle(el.dataset.toggle)));
    press($("btn-levels-back"), () => UI.transition(() => UI.showTitle()));
    press($("btn-pause"), () => UI.pause());
    press($("btn-resume"), () => UI.resume());
    press($("btn-restart"), () => closeModal($("modal-pause"), () => UI.startLevel(UI.current)));
    press($("btn-pause-levels"), () => closeModal($("modal-pause"), () => UI.transition(() => UI.showLevels())));
    press($("btn-complete-levels"), () => UI.transition(() => UI.showLevels()));
    press($("btn-complete-replay"), () => UI.startLevel(UI.current));
    press($("btn-next"), () => UI.startLevel(Math.min(UI.current + 1, KO.LEVELS.length - 1)));
    press($("btn-retry"), () => UI.startLevel(UI.current));
    press($("btn-failed-levels"), () => UI.transition(() => UI.showLevels()));
    press($("btn-settings-close"), () => closeModal($("modal-settings")));
    let resetArmed = false;
    press($("btn-reset"), (e) => {
      const btn = $("btn-reset");
      if (!resetArmed) { resetArmed = true; btn.firstElementChild.textContent = "Tap again to confirm"; setTimeout(() => { resetArmed = false; btn.firstElementChild.textContent = "Reset Progress"; }, 2500); return; }
      Save.reset(); resetArmed = false; btn.firstElementChild.textContent = "Progress reset!";
      if (UI.screen === "levels") buildMap();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "p") { if (KO.Game.paused) UI.resume(); else UI.pause(); }
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) UI.pause(); });
    window.addEventListener("resize", () => { if (UI.screen === "levels") buildMap(); });
    KO.Game.on(onGame);
    UI.showTitle();
  };
  UI.hideHint = () => hide($("hint"));
  KO.UI = UI;
})(window.KO);
