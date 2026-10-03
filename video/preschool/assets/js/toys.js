/* Игрушки и рисованные значки эпизода 3–7.
   Игрушки — предметы видимого поля: плоская заливка и тёмный контур, как стаканы и шкафы.
   Значки — рисованный слой («смысловое поле»): карандашная линия из sketch.js, где нужно — с заливкой.
   Один и тот же значок появляется в сцене и в финале, поэтому все они собраны здесь.
   У каждого: (x, y) — опорная точка, k — масштаб; o.at — когда начать рисовать
   (без at значок виден сразу), o.dur — длительность прорисовки, o.seed — дрожание линии. */
/* global Film */
(function () {
  'use strict';
  var ORANGE = '#FB8C00', STICK = '#8B6A45', RED = '#C8553D', PAPER = '#FFFDF8';
  var BEAR = '#C98E5A', BEAR_D = '#8E5C34', MUZ = '#F0D6B4', DARK = '#4A3426', CHOC = '#7A4A2A', CHOC_L = '#A8714A';

  function tr(x, y, k, pts) { return pts.map(function (p) { return [x + p[0] * k, y + p[1] * k]; }); }
  function ell(cx, cy, rx, ry, n, a0) {
    var p = [], N = n || 18, s0 = a0 == null ? -1.4 : a0;
    for (var i = 0; i <= N; i++) { var a = s0 + i * 2 * Math.PI / N; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return p;
  }
  // «перо» значка: штрихи в локальных координатах; frac/len — доля общей длительности прорисовки
  function pen(s, g, x, y, k, o) {
    var n = 0, seed = o.seed || 1, dur = o.dur || 1, wk = Math.max(0.75, Math.min(1.15, k));
    return function (pts, frac, len, st) {
      st = st || {};
      var opt = { seed: seed + (n += 7), amp: st.amp == null ? (o.amp == null ? 1.2 : o.amp) : st.amp, width: (st.width || 4.2) * wk, color: st.color, opacity: st.opacity };
      if (st.fill) { opt.fill = st.fill; opt.fillOpacity = st.fillOpacity; }
      if (o.at != null) { opt.at = o.at + frac * dur; opt.dur = Math.max(0.12, len * dur); }
      return Film.sketch.stroke(s, g, tr(x, y, k, pts), opt);
    };
  }
  // точка-заливка (глаз, нос), появляется к моменту frac
  function dot(s, g, x, y, r, color, o, frac) {
    var c = s.node(g, 'circle', { cx: x, cy: y, r: r, fill: color, opacity: o.at != null ? 0 : 1 });
    if (o.at != null) s.tween(c, o.at + frac * (o.dur || 1), { opacity: 0 }, { opacity: 1, duration: 0.25 });
    return c;
  }
  function grp(s, parent) { return s.node(parent, 'g', {}); }
  // острые углы: каждая вершина дублируется — сглаживание оставляет стороны прямыми
  function sharp(pts) { var o = []; pts.forEach(function (q) { o.push(q, q); }); return o; }

  // ---------- Рисованные значки ----------
  var I = {};

  // Голова лошади в профиль (смотрит вправо). (x, y) — основание шеи, где её держит палочка.
  // o.stick — длина палочки (рисуется геометрией вниз-влево).
  I.horse = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    if (o.stick) {
      var sp = s.path(g, 'M' + (x - 2 * k) + ' ' + (y + 2 * k) + ' L' + (x - o.stick * 0.72) + ' ' + (y + o.stick * 0.7), { stroke: STICK, 'stroke-width': Math.max(6, 10 * k), opacity: o.at != null ? 0 : 1 });
      if (o.at != null) s.tween(sp, o.at, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
    p([[-20, 0], [-24, -30], [-18, -58], [-6, -82], [10, -96], [32, -94], [54, -84], [74, -68], [92, -52], [106, -40], [112, -27], [107, -15], [96, -9], [80, -9], [64, -15], [50, -24], [40, -32], [30, -24], [22, -12], [18, 0]], 0, 0.55, { fill: PAPER });
    p([[4, -92], [6, -124], [22, -96]], 0.42, 0.14);
    p([[-6, -88], [-8, -110], [4, -92]], 0.5, 0.12, { opacity: 0.7 });
    p([[2, -90], [-16, -84], [-8, -74], [-28, -66], [-16, -56], [-32, -46], [-22, -36], [-36, -24], [-26, -14], [-36, -2]], 0.3, 0.45, { color: ORANGE, width: 5.2 });
    p([[80, -60], [86, -36], [86, -12]], 0.72, 0.14, { color: ORANGE, width: 3.6 });
    p([[18, -92], [50, -64], [82, -56]], 0.78, 0.16, { color: ORANGE, width: 3.6 });
    p([[95, -37], [100, -31], [96, -26]], 0.8, 0.1, { width: 3.2 });
    dot(s, g, x + 46 * k, y - 66 * k, 5.5 * k, Film.sketch.GRAPHITE, o, 0.85);
    return g;
  };

  // Облако мысли с «пузырьками» к думающему (o.tail = [x, y] — макушка думающего)
  I.cloud = function (s, parent, cx, cy, rx, ry, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, 0, 0, 1, o);
    var pts = [], N = 84, nb = o.bumps || 9;
    for (var i = 0; i <= N; i++) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / N, r = 1 + 0.12 * Math.abs(Math.sin(nb * a / 2));
      pts.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]);
    }
    p(pts, 0, 0.75, { fill: PAPER, amp: 0.8 });
    if (o.tail) {
      var tx = o.tail[0], ty = o.tail[1], dx = tx - cx, dy = ty - cy, d = Math.sqrt(dx * dx + dy * dy);
      var ex = cx + dx / d * rx, ey = cy + dy / d * ry; // край облака в сторону думающего
      [[0.35, 11], [0.72, 7]].forEach(function (b, j) {
        var bx = ex + (tx - ex) * b[0], by = ey + (ty - ey) * b[0];
        p(ell(bx, by, b[1], b[1], 10), 0.7 + j * 0.12, 0.14, { fill: PAPER, width: 3.6, amp: 0.5 });
      });
    }
    return g;
  };

  // Плитка шоколада (рисованная — для мысли). (x, y) — центр
  I.choc = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p(sharp([[-32, -18], [32, -18], [32, 18], [-32, 18], [-32, -18]]), 0, 0.6, { color: DARK, fill: CHOC, width: 3.6, amp: 0.6 });
    p([[-11, -16], [-11, 16]], 0.6, 0.15, { color: CHOC_L, width: 3, amp: 0.4 });
    p([[11, -16], [11, 16]], 0.68, 0.15, { color: CHOC_L, width: 3, amp: 0.4 });
    p([[-30, 0], [30, 0]], 0.76, 0.2, { color: CHOC_L, width: 3, amp: 0.4 });
    return g;
  };

  // Конфета в фантике. (x, y) — центр
  I.candy = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-24, 0], [-46, -16], [-40, 0], [-46, 16], [-24, 0]], 0.45, 0.2, { color: ORANGE, fill: '#FFE2BC', width: 3.8, amp: 0.6 });
    p([[24, 0], [46, -16], [40, 0], [46, 16], [24, 0]], 0.55, 0.2, { color: ORANGE, fill: '#FFE2BC', width: 3.8, amp: 0.6 });
    p(ell(0, 0, 26, 17, 16), 0, 0.5, { color: ORANGE, fill: '#FFD29A', width: 4.4, amp: 0.6 });
    p([[-9, -15], [-15, 14]], 0.7, 0.12, { color: '#E07A00', width: 3.2, amp: 0.3 });
    p([[7, -16], [1, 15]], 0.78, 0.12, { color: '#E07A00', width: 3.2, amp: 0.3 });
    return g;
  };

  // Ракета-замысел. (x, y) — центр корпуса
  I.rocket = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-9, 26], [0, 50], [9, 26]], 0.75, 0.2, { color: ORANGE, fill: '#FFC46B', width: 3.8, amp: 0.6 });
    p([[-17, 4], [-34, 28], [-17, 24]], 0.5, 0.15, { color: RED, fill: '#F2B3A3', width: 3.8, amp: 0.5 });
    p([[17, 4], [34, 28], [17, 24]], 0.58, 0.15, { color: RED, fill: '#F2B3A3', width: 3.8, amp: 0.5 });
    p([[0, -54], [12, -38], [17, -12], [17, 26], [-17, 26], [-17, -12], [-12, -38], [0, -54]], 0, 0.5, { fill: PAPER, amp: 0.7 });
    p(ell(0, -12, 8, 8, 12), 0.62, 0.15, { color: '#4A7FB0', fill: '#CFE3F1', width: 3.4, amp: 0.4 });
    return g;
  };

  // Докторский чемоданчик с крестом. (x, y) — центр
  I.bag = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-18, -20], [-16, -36], [16, -36], [18, -20]], 0.5, 0.15, { width: 4.4 });
    p(sharp([[-44, -20], [44, -20], [50, -12], [50, 30], [44, 36], [-44, 36], [-50, 30], [-50, -12], [-44, -20]]), 0, 0.5, { fill: PAPER, amp: 0.8 });
    p([[0, -6], [0, 24]], 0.62, 0.12, { color: RED, width: 7, amp: 0.3 });
    p([[-15, 9], [15, 9]], 0.72, 0.12, { color: RED, width: 7, amp: 0.3 });
    return g;
  };

  // Плюшевый мишка (рисованный — для финала). (x, y) — центр туловища
  I.bear = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o), st = { color: BEAR_D, fill: BEAR, width: 3.8, amp: 0.6 };
    p(ell(0, 22, 26, 26, 16), 0, 0.3, st);
    p(ell(-20, -48, 10, 10, 12), 0.25, 0.12, st);
    p(ell(20, -48, 10, 10, 12), 0.3, 0.12, st);
    p(ell(0, -26, 26, 23, 16), 0.32, 0.3, st);
    p(ell(0, -17, 11, 8, 12), 0.6, 0.15, { color: BEAR_D, fill: MUZ, width: 3, amp: 0.4 });
    dot(s, g, x - 9 * k, y - 32 * k, 3.6 * k, DARK, o, 0.75);
    dot(s, g, x + 9 * k, y - 32 * k, 3.6 * k, DARK, o, 0.78);
    dot(s, g, x, y - 20 * k, 4 * k, DARK, o, 0.8);
    p(ell(0, 26, 13, 13, 12), 0.82, 0.15, { color: BEAR_D, fill: MUZ, width: 3, amp: 0.4 });
    return g;
  };

  // Руль. (x, y) — центр
  I.wheel = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p(ell(0, 0, 30, 30, 16), 0, 0.6, { color: ORANGE, width: 5 });
    p([[-28, 2], [-7, 2]], 0.6, 0.12, { color: ORANGE, width: 4.2 });
    p([[28, 2], [7, 2]], 0.66, 0.12, { color: ORANGE, width: 4.2 });
    p([[0, 7], [0, 28]], 0.72, 0.12, { color: ORANGE, width: 4.2 });
    p(ell(0, 2, 7, 7, 10), 0.8, 0.15, { color: ORANGE, width: 4 });
    return g;
  };

  // Машина-кабриолет вокруг играющих: корпус залит бумагой и закрывает низ сидящих в ней
  I.car = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-196, 36], [-200, 6], [-188, -16], [-150, -24], [60, -24], [96, -22], [170, -14], [196, 2], [198, 36], [-196, 36]], 0, 0.55, { fill: PAPER, color: ORANGE, width: 5, amp: 0.8 });
    p([[66, -24], [96, -66]], 0.45, 0.12, { width: 4.4, amp: 0.4 });
    p(ell(-120, 40, 30, 30, 14), 0.5, 0.2, { fill: PAPER, width: 4.6, amp: 0.6 });
    p(ell(120, 40, 30, 30, 14), 0.56, 0.2, { fill: PAPER, width: 4.6, amp: 0.6 });
    p(ell(-120, 40, 8, 8, 8), 0.72, 0.1, { width: 3.4, amp: 0.3 });
    p(ell(120, 40, 8, 8, 8), 0.76, 0.1, { width: 3.4, amp: 0.3 });
    p(ell(186, 8, 6, 6, 8), 0.82, 0.1, { color: ORANGE, fill: '#FFD29A', width: 3, amp: 0.2 });
    return g;
  };

  // Докторская шапочка с красным крестом. (x, y) — макушка
  I.docCap = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-38, 6], [-36, -30], [-20, -38], [20, -38], [36, -30], [38, 6], [0, 10], [-38, 6]], 0, 0.6, { fill: PAPER, width: 4, amp: 0.6 });
    p([[0, -26], [0, -6]], 0.62, 0.14, { color: RED, width: 6, amp: 0.2 });
    p([[-10, -16], [10, -16]], 0.72, 0.14, { color: RED, width: 6, amp: 0.2 });
    return g;
  };

  // Пилотка часового со звёздочкой. (x, y) — макушка
  I.pilotka = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-50, 8], [-44, -12], [-26, -26], [26, -26], [44, -12], [50, 8], [-50, 8]], 0, 0.6, { fill: '#8C9A63', fillOpacity: 0.95, color: '#4E5A35', width: 4, amp: 0.6 });
    p([[-40, -8], [40, -8]], 0.55, 0.15, { color: '#4E5A35', width: 3, amp: 0.4 });
    var st = []; for (var i = 0; i <= 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; st.push([24 + r * Math.cos(a), -2 + r * Math.sin(a)]); }
    p(st, 0.7, 0.2, { color: RED, fill: RED, width: 2.6, amp: 0.2 });
    return g;
  };

  // Колокольчик (звонок в конце смены, школьный звонок). (x, y) — центр
  I.bell = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p([[-28, 20], [-22, -2], [-16, -20], [0, -28], [16, -20], [22, -2], [28, 20], [-28, 20]], 0, 0.6, { fill: '#F5D27A', color: '#A77A12', width: 4, amp: 0.6 });
    p(ell(0, 27, 6, 6, 10), 0.6, 0.15, { fill: '#A77A12', color: '#A77A12', width: 3, amp: 0.3 });
    p([[0, -28], [0, -40]], 0.7, 0.12, { color: '#A77A12', width: 4, amp: 0.3 });
    return g;
  };

  // Школа: фасад с фронтоном, часами, окнами и дверью. (x, y) — середина низа
  I.school = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    p(sharp([[-110, 0], [-110, -120], [110, -120], [110, 0], [-110, 0]]), 0, 0.35, { fill: PAPER, amp: 0.8 });
    p(sharp([[-124, -118], [0, -184], [124, -118], [-124, -118]]), 0.3, 0.25, { fill: '#FEF0DD', color: ORANGE, width: 4.6, amp: 0.8 });
    p(ell(0, -146, 14, 14, 12), 0.55, 0.12, { width: 3.4, amp: 0.4 });
    p([[0, -146], [0, -156], [0, -146], [8, -142]], 0.62, 0.1, { width: 3, amp: 0.2 });
    p(sharp([[-20, 0], [-20, -60], [20, -60], [20, 0]]), 0.6, 0.15, { fill: '#E9D9C2', amp: 0.6 });
    [[-84, -96], [44, -96]].forEach(function (w, i) {
      p(sharp([[w[0], w[1]], [w[0] + 40, w[1]], [w[0] + 40, w[1] + 36], [w[0], w[1] + 36], [w[0], w[1]]]), 0.68 + i * 0.08, 0.12, { fill: '#CFE3F1', width: 3.4, amp: 0.4 });
    });
    return g;
  };

  // Мозг в профиль (лоб справа); o.lobe — момент, когда «загорается» лобная кора (заливка)
  I.brain = function (s, parent, x, y, k, o) {
    o = o || {}; var g = grp(s, parent), p = pen(s, g, x, y, k, o);
    var front = [[8, -78], [36, -72], [62, -56], [80, -30], [84, 0], [74, 24], [52, 34], [36, 30], [26, 0], [18, -40], [8, -78]];
    var lobe = s.node(g, 'path', { d: Film.sketch.rough(tr(x, y, k, front), 5, 0.6) + ' Z', fill: ORANGE, opacity: 0 });
    if (o.lobe != null) s.tween(lobe, o.lobe, { opacity: 0 }, { opacity: 0.38, duration: 0.8 });
    p([[-78, 12], [-84, -22], [-66, -54], [-34, -74], [8, -80], [40, -74], [66, -56], [82, -30], [86, 0], [74, 26], [50, 36], [26, 32], [10, 42], [-14, 38], [-38, 40], [-62, 30], [-78, 12]], 0, 0.5, { amp: 1 });
    p([[-62, 30], [-66, 48], [-42, 54], [-26, 42]], 0.45, 0.15, { width: 3.6 });
    p([[-10, 40], [-6, 66]], 0.5, 0.1, { width: 3.6 });
    p([[8, -78], [18, -40], [26, 0], [36, 30]], 0.55, 0.2, { width: 3.4, opacity: 0.8 });
    p([[-60, -30], [-40, -40], [-30, -20], [-10, -28]], 0.65, 0.15, { width: 2.8, opacity: 0.55 });
    p([[-56, 6], [-36, 0], [-20, 14], [0, 8]], 0.7, 0.15, { width: 2.8, opacity: 0.55 });
    p([[44, -50], [56, -30], [46, -10], [60, 8]], 0.75, 0.15, { width: 2.8, opacity: 0.55 });
    return g;
  };

  // ---------- Игрушки (видимое поле) ----------
  var T = {};

  // Плюшевый мишка сидит; (x, y) — середина низа
  T.bear = function (s, parent, x, y, k) {
    var g = s.node(parent, 'g', {});
    function e(cx, cy, rx, ry, f, st, rot) {
      var a = { cx: x + cx * k, cy: y + cy * k, rx: rx * k, ry: ry * k, fill: f };
      if (st) { a.stroke = BEAR_D; a['stroke-width'] = 3; }
      if (rot) a.transform = 'rotate(' + rot + ' ' + (x + cx * k) + ' ' + (y + cy * k) + ')';
      return s.node(g, 'ellipse', a);
    }
    e(-26, -12, 19, 13, BEAR, 1); e(26, -12, 19, 13, BEAR, 1);
    e(-26, -12, 9, 7, MUZ); e(26, -12, 9, 7, MUZ);
    e(0, -52, 40, 44, BEAR, 1);
    e(0, -46, 24, 27, MUZ);
    e(-40, -60, 12, 22, BEAR, 1, 24); e(40, -60, 12, 22, BEAR, 1, -24);
    e(-28, -140, 14, 14, BEAR, 1); e(28, -140, 14, 14, BEAR, 1);
    e(-28, -140, 7, 7, MUZ); e(28, -140, 7, 7, MUZ);
    e(0, -112, 37, 34, BEAR, 1);
    e(0, -100, 16, 12, MUZ);
    e(0, -105, 6.5, 4.8, DARK); e(-14, -120, 3.8, 3.8, DARK); e(14, -120, 3.8, 3.8, DARK);
    s.path(g, 'M' + (x - 6 * k) + ' ' + (y - 95 * k) + ' Q' + x + ' ' + (y - 90 * k) + ' ' + (x + 6 * k) + ' ' + (y - 95 * k), { stroke: DARK, 'stroke-width': 2.4 });
    return g;
  };

  // Кубик с буквой; (x, y) — середина низа
  T.block = function (s, parent, x, y, size, color, edge, letter) {
    var g = s.node(parent, 'g', {});
    s.node(g, 'rect', { x: x - size / 2, y: y - size, width: size, height: size, rx: size * 0.14, fill: color, stroke: edge, 'stroke-width': 3 });
    if (letter) {
      var t = s.node(g, 'text', { x: x, y: y - size * 0.27, 'text-anchor': 'middle', fill: '#FFFDF8' });
      t.setAttribute('style', 'font-family: DOMSerif; font-weight: 700; font-size: ' + Math.round(size * 0.62) + 'px;');
      t.textContent = letter;
    }
    return g;
  };

  // Мяч; (x, y) — центр
  T.ball = function (s, parent, x, y, r, color, edge) {
    var g = s.node(parent, 'g', {});
    s.node(g, 'circle', { cx: x, cy: y, r: r, fill: color, stroke: edge, 'stroke-width': 3 });
    s.path(g, 'M' + (x - r * 0.95) + ' ' + (y - r * 0.2) + ' Q' + x + ' ' + (y + r * 0.35) + ' ' + (x + r * 0.95) + ' ' + (y - r * 0.2), { stroke: '#FFFDF8', 'stroke-width': r * 0.22 });
    return g;
  };

  // Ранец (вид сбоку, за спиной у ребёнка); (x, y) — центр
  T.backpack = function (s, parent, x, y, k, color, edge) {
    var g = s.node(parent, 'g', {});
    s.path(g, 'M' + (x - 12 * k) + ' ' + (y - 38 * k) + ' Q' + x + ' ' + (y - 54 * k) + ' ' + (x + 12 * k) + ' ' + (y - 38 * k), { stroke: edge, 'stroke-width': 4 });
    s.node(g, 'rect', { x: x - 30 * k, y: y - 40 * k, width: 60 * k, height: 78 * k, rx: 16 * k, fill: color, stroke: edge, 'stroke-width': 3 });
    s.path(g, 'M' + (x - 30 * k) + ' ' + (y - 10 * k) + ' Q' + x + ' ' + (y + 4 * k) + ' ' + (x + 30 * k) + ' ' + (y - 10 * k), { stroke: edge, 'stroke-width': 3, fill: 'none' });
    s.node(g, 'rect', { x: x - 6 * k, y: y - 4 * k, width: 12 * k, height: 10 * k, rx: 3 * k, fill: '#F5D27A', stroke: edge, 'stroke-width': 2 });
    return g;
  };

  // Плитка шоколада (предмет). (x, y) — центр
  T.choc = function (s, parent, x, y, k) {
    var g = s.node(parent, 'g', {});
    s.node(g, 'rect', { x: x - 30 * k, y: y - 17 * k, width: 60 * k, height: 34 * k, rx: 5 * k, fill: CHOC, stroke: DARK, 'stroke-width': 2.5 });
    [-10, 10].forEach(function (dx) { s.path(g, 'M' + (x + dx * k) + ' ' + (y - 15 * k) + ' V' + (y + 15 * k), { stroke: CHOC_L, 'stroke-width': 2.4 }); });
    s.path(g, 'M' + (x - 28 * k) + ' ' + y + ' H' + (x + 28 * k), { stroke: CHOC_L, 'stroke-width': 2.4 });
    return g;
  };

  // Шкаф с двумя дверцами на ножках; (x, y) — середина низа; o.color/edge
  T.cupboard = function (s, parent, x, y, w, h, fill, edge) {
    var g = s.node(parent, 'g', {});
    s.path(g, 'M' + (x - w / 2 + 14) + ' ' + y + ' v14 M' + (x + w / 2 - 14) + ' ' + y + ' v14', { stroke: edge, 'stroke-width': 5 });
    s.node(g, 'rect', { x: x - w / 2, y: y - h, width: w, height: h, rx: 10, fill: fill, stroke: edge, 'stroke-width': 3 });
    s.node(g, 'rect', { x: x - w / 2 - 6, y: y - h - 10, width: w + 12, height: 12, rx: 5, fill: fill, stroke: edge, 'stroke-width': 3 });
    s.path(g, 'M' + x + ' ' + (y - h + 10) + ' V' + (y - 10), { stroke: edge, 'stroke-width': 2.5 });
    s.node(g, 'circle', { cx: x - 10, cy: y - h / 2, r: 4.5, fill: edge });
    s.node(g, 'circle', { cx: x + 10, cy: y - h / 2, r: 4.5, fill: edge });
    return g;
  };

  Film.icons = I;
  Film.sharp = sharp;
  Film.toys = T;
  Film.ell = ell;
})();
