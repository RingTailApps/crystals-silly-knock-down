/* Procedural WebAudio SFX + looping music. No audio files. */
(function (KO) {
  const A = {};
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  A.soundOn = true; A.musicOn = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.soundOn ? 1 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = A.musicOn ? 0.32 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  A.unlock = function () {
    const c = ensure(); if (!c) return;
    if (c.state === "suspended") c.resume();
    if (A.musicOn && !musicTimer) A.startMusic();
  };
  A.setSound = function (on) { A.soundOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02); };
  A.setMusic = function (on) {
    A.musicOn = on;
    if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.1);
    if (on && ctx) A.startMusic();
  };
  const ok = () => ctx && A.soundOn && ctx.state === "running";

  function env(g, t, a, peak, dcy) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }
  function tone(type, f0, f1, dur, vol, when, dest) {
    const t = (when || ctx.currentTime);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(dur, vol, filterType, f0, f1, q, when, dest) {
    const t = when || ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.01, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  A.click = () => { if (!ok()) return; tone("triangle", 900, 500, 0.06, 0.25); tone("sine", 1800, 1200, 0.04, 0.08); };
  A.tick = (p) => { if (!ok()) return; tone("triangle", 300 + p * 500, 260 + p * 500, 0.04, 0.07); };
  A.twang = () => {
    if (!ok()) return;
    const o = tone("triangle", 260, 120, 0.35, 0.3);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 28; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(); lfo.stop(ctx.currentTime + 0.4);
  };
  A.whoosh = () => { if (!ok()) return; noise(0.45, 0.35, "bandpass", 400, 2400, 1.5); };
  let lastThunk = 0;
  A.thunk = (s) => {
    if (!ok()) return; const now = ctx.currentTime;
    if (now - lastThunk < 0.035) return; lastThunk = now;
    const v = Math.min(0.55, 0.06 + s * 0.05);
    tone("sine", 150 + Math.random() * 40, 50, 0.18, v);
    noise(0.08, v * 0.7, "lowpass", 1400, 300, 0.8);
  };
  A.pop = (i) => {
    if (!ok()) return; i = i || 0;
    const base = 520 * Math.pow(1.122, Math.min(i, 14));
    tone("sine", base, base * 2.2, 0.12, 0.35);
    tone("triangle", base * 2, base * 3, 0.08, 0.1);
    noise(0.05, 0.12, "highpass", 3000, 6000, 0.7);
  };
  A.boom = () => {
    if (!ok()) return;
    noise(0.9, 0.8, "lowpass", 1800, 80, 0.7);
    tone("sine", 110, 30, 0.7, 0.7);
  };
  A.star = (i) => {
    if (!ok()) return; const f = [880, 1108, 1318][i] || 1318;
    tone("sine", f, f, 0.9, 0.35); tone("sine", f * 2, f * 2, 0.5, 0.1); tone("triangle", f * 3, f * 3, 0.25, 0.05);
  };
  A.win = () => {
    if (!ok()) return; const t = ctx.currentTime;
    [523, 659, 784, 1046, 1318].forEach((f, i) => { tone("triangle", f, f, 0.35, 0.28, t + i * 0.09); tone("sine", f * 2, f * 2, 0.3, 0.07, t + i * 0.09); });
    [1046, 1318, 1568].forEach(f => tone("sine", f, f, 1.2, 0.15, t + 0.5));
  };
  A.fail = () => {
    if (!ok()) return; const t = ctx.currentTime;
    [392, 370, 349, 294].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.setValueAtTime(400, t + i * 0.28);
      lp.frequency.linearRampToValueAtTime(1600, t + i * 0.28 + 0.12); lp.frequency.linearRampToValueAtTime(300, t + i * 0.28 + 0.3);
      env(g, t + i * 0.28, 0.02, 0.18, i === 3 ? 0.7 : 0.26);
      o.connect(lp); lp.connect(g); g.connect(sfxBus); o.start(t + i * 0.28); o.stop(t + i * 0.28 + 1);
    });
  };
  A.sparkle = () => { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 6; i++) { const f = 1500 + Math.random() * 2000; tone("sine", f, f, 0.15, 0.06, t + i * 0.04); } };
  A.count = () => { if (!ok()) return; tone("square", 1400, 1400, 0.025, 0.03); };

  /* ---------------- Music: cheerful 8-bar loop, lookahead scheduler ---------------- */
  let musicTimer = null, nextTime = 0, step = 0;
  const BPM = 116, STEP = 60 / BPM / 2; // eighth notes
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // chords (midi roots) per bar: C G Am F | C G F G
  const bars = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [53, 57, 60], [55, 59, 62]];
  const mel = [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 79, 0, 74, 72, 74, 0, 72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 69, 0, 72, 0, 0, 0,
               76, 0, 79, 0, 84, 0, 81, 79, 79, 0, 76, 0, 74, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 74, 0, 0, 0];
  function schedule(t, s) {
    const bar = Math.floor(s / 8) % 8, within = s % 8, ch = bars[bar];
    // bass
    if (within === 0 || within === 4) pluck("triangle", N(ch[0] - 24), 0.35, 0.5, t);
    if (within === 6) pluck("triangle", N(ch[0] - 12), 0.15, 0.25, t);
    // arp
    const arp = [0, 1, 2, 1, 2, 1, 0, 1][within];
    pluck("sine", N(ch[arp] + 12), 0.12, 0.18, t);
    // melody
    const m = mel[s % 64]; if (m) { pluck("triangle", N(m), 0.2, 0.32, t); pluck("sine", N(m + 12), 0.05, 0.2, t); }
    // perc
    if (within % 2 === 1) hat(t);
    if (within === 0 || within === 4) kick(t);
  }
  function pluck(type, f, vol, dur, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; env(g, t, 0.008, vol, dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function hat(t) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
    const g = ctx.createGain(); env(g, t, 0.002, 0.06, 0.04);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.08);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.003, 0.35, 0.16); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.25);
  }
  A.startMusic = function () {
    if (!ctx || musicTimer) return;
    nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (ctx.state !== "running") return;
      while (nextTime < ctx.currentTime + 0.15) {
        if (A.musicOn) schedule(nextTime, step);
        nextTime += STEP; step++;
      }
    }, 30);
  };

  KO.Audio = A;
})(window.KO);
