/* Handcrafted levels. Coordinates are world units; y grows downward.
   podium: {x, top, w, float?, move?:{ax, period}}  (float = hovering platform)
   block:  {x, y, w, h, c, type?: 'normal'|'heavy'|'jelly'|'bomb', pod?: index (for moving podiums)} */
(function (KO) {
  let ci = 0;
  const nextColor = () => KO.PALETTE[(ci++) % KO.PALETTE.length];
  const G = 0.5; // tiny vertical gap so stacks settle cleanly

  function b(x, y, w, h, c, type) { return { x, y, w, h, c: c || nextColor(), type: type || "normal" }; }
  function tower(cx, top, n, w, h, opts) {
    opts = opts || {}; const out = [];
    for (let i = 0; i < n; i++) out.push(b(cx, top - h / 2 - i * (h + G), w, h, opts.colors ? opts.colors[i % opts.colors.length] : null, opts.type));
    return out;
  }
  function pyramid(cx, top, rows, s, opts) {
    opts = opts || {}; const out = [];
    for (let r = 0; r < rows; r++) {
      const n = rows - r;
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * (s + 2);
        out.push(b(x, top - s / 2 - r * (s + G), s, s, null, opts.type));
      }
    }
    return out;
  }
  function wall(cx, top, cols, rows, w, h, opts) {
    opts = opts || {}; const out = [];
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < cols; i++)
        out.push(b(cx + (i - (cols - 1) / 2) * (w + 2), top - h / 2 - r * (h + G), w, h, null, opts.type));
    return out;
  }
  const bomb = (x, y) => ({ x, y, w: 56, h: 56, c: "red", type: "bomb" });
  const pod = (x, top, w, extra) => Object.assign({ x, top, w }, extra || {});

  function L(name, shots, stars, podiums, blocks, extra) {
    ci = 0;
    return Object.assign({ name, shots, stars, podiums, blocks }, extra || {});
  }

  const levels = [];
  // stars: [max shots used for 3 stars, max shots used for 2 stars]
  levels.push(L("First Bite", 3, [1, 2], [pod(640, 820, 190)], tower(640, 820, 3, 72, 72)));
  levels.push(L("Double Stack", 4, [2, 3], [pod(640, 820, 270)],
    [...tower(595, 820, 3, 64, 64), ...tower(690, 820, 3, 64, 64)]));
  levels.push(L("Pyramid Pop", 3, [1, 2], [pod(640, 830, 290)], pyramid(640, 830, 3, 66)));
  levels.push(L("Tall Order", 3, [1, 2], [pod(650, 900, 170)], tower(650, 900, 7, 60, 62)));
  levels.push(L("Wide Load", 4, [2, 3], [pod(630, 840, 300)], wall(630, 840, 4, 2, 58, 58)));
  levels.push(L("Twin Peaks", 4, [2, 3], [pod(500, 930, 160), pod(760, 760, 170)],
    [...tower(500, 930, 3, 64, 64), ...pyramid(760, 760, 2, 62)]));
  levels.push(L("Choco Heavy", 4, [2, 3], [pod(650, 860, 200)],
    [...wall(650, 860, 2, 1, 72, 60, { type: "heavy" }).map(o => (o.c = "choco", o)),
     ...tower(650, 860 - 60 - G, 3, 64, 64)]));
  levels.push(L("Plank Palace", 4, [2, 3], [pod(640, 870, 300)], (() => {
    const top = 870, ph = 110, pw = 34;
    const out = [b(560, top - ph / 2, pw, ph), b(720, top - ph / 2, pw, ph),
      b(640, top - ph - 13 - G, 230, 26)];
    const t2 = top - ph - 26 - 2 * G;
    out.push(...pyramid(640, t2, 2, 60));
    return out;
  })()));
  levels.push(L("Jelly Jiggle", 4, [2, 3], [pod(640, 850, 300)],
    [...wall(640, 850, 4, 1, 62, 62, { type: "jelly" }).map(o => (o.c = "jelly", o)),
     ...tower(595, 850 - 62 - G, 2, 62, 62), ...tower(685, 850 - 62 - G, 2, 62, 62)]));
  levels.push(L("Candy Bomb", 3, [1, 2], [pod(640, 860, 340)], (() => {
    const top = 860, out = [...tower(530, top, 3, 60, 60), ...tower(750, top, 3, 60, 60), bomb(640, top - 28)];
    const pt = top - 3 * 60 - 3 * G;
    out.push(b(640, pt - 12, 290, 24));
    out.push(...tower(640, pt - 24 - G, 2, 58, 58));
    return out;
  })()));
  levels.push(L("On The Move", 4, [2, 3],
    [pod(640, 760, 210, { float: true, move: { ax: 80, period: 7 } })],
    tower(640, 760, 4, 64, 64).map(o => (o.pod = 0, o))));
  levels.push(L("Castle Crunch", 5, [2, 4], [pod(650, 870, 290)], (() => {
    const top = 870, out = [];
    out.push(b(560, top - 50, 40, 100), b(650, top - 50, 40, 100), b(740, top - 50, 40, 100));
    out.push(b(605, top - 100 - 12 - G, 86, 24), b(695, top - 100 - 12 - G, 86, 24));
    const t2 = top - 124 - 2 * G;
    out.push(b(605, t2 - 28, 56, 56, "choco", "heavy"), b(695, t2 - 28, 56, 56, "choco", "heavy"));
    out.push(b(650, t2 - 56 - 12 - G, 200, 24));
    out.push(...tower(650, t2 - 80 - 2 * G, 2, 56, 56));
    return out;
  })()));
  levels.push(L("Sugar Summit", 5, [3, 4],
    [pod(470, 960, 150), pod(640, 780, 140), pod(800, 620, 130, { float: true, move: { ax: 40, period: 4.5 } })],
    (() => {
      const out = [];
      out.push(...tower(470, 960, 3, 60, 60));
      out.push(...tower(612, 780, 2, 56, 56), bomb(674, 780 - 28));
      out.push(...tower(800, 620, 3, 58, 58).map(o => (o.pod = 2, o)));
      return out;
    })()));

  KO.LEVELS = levels;
})(window.KO);
