/* Глава 2. Думать по правилам · Аня (v3.2, «Язык 7–10»): самая младшая (Лейтон), куда поставить 150 (Сиглер, Опфер), кит — рыба? (Выготский) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', CHALK = '#F4F1E6', BOARD = '#3B5E54', FRAME = '#C9A27A', WOOD = '#E9D9BF', FLOOR = '#C9BBA2',
    PAPER = '#FFFDF8', GLASS = '#E8F1EE', RED = '#D9534F', TEAL = '#26A69A', WATER = '#BFDCE5';
  var LEN = 67.5; // длина главы — для подписи в углу

  // ---------- общее для главы ----------
  function L(w, fill) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function ln(s, g, d, w, c) { return s.path(g, d, { stroke: c || INK, 'stroke-width': w || 3 }); }
  // мел на доске (svg-текст рукописью)
  function chalk(s, g, x, y, text, size, o) {
    o = o || {};
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', fill: o.color || CHALK, style: 'font-family: var(--hand); font-size: ' + (size || 40) + 'px' });
    t.textContent = text; return t;
  }
  // детский почерк в облачке (svg-текст)
  function kid(s, g, x, y, text, size, color) {
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': 'middle', fill: color || INK, style: 'font-family: var(--kid); font-weight: 700; font-size: ' + (size || 40) + 'px' });
    t.textContent = text; return t;
  }
  // герой в кадр: актёр + спокойные брови, руки спрятаны
  function on(s, who, x, y, d, lt, o) {
    var id = K().cast(s, who, x, y, d, lt, o);
    s.brow(id, (o && o.brow) || 'calm', 0, 0.01); s.hands(id, 'off', 0, 0.01);
    return id;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); s.hands(id, 'off', s.dur - 0.4, 0.3); }); }
  function show(s, e, lt) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 }); }
  function hide(s, e, lt) { [].concat(e).forEach(function (x) { s.set(x, lt, { opacity: 1 }, { opacity: 0 }); }); }
  function fadeIn(s, e, lt, dur) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: dur || 0.3 }); }
  function concl(s, text, lt) {
    var e = s.text('h3', '<span class="acc">Вывод:</span> ' + text, { left: 140, top: 930, width: 1640, fontSize: 42 });
    s.lines(e, lt);
    return e;
  }
  function cite(s, text, lt) {
    var h = s.hud('cite', text, { left: 140, top: 1012, width: 1640, fontSize: 20 });
    s.tween(h, lt, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    s.tween(h, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.4 });
    return h;
  }
  // текст в слое #ui: переживает перелистывание; гаснет в out (или к концу сцены)
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  // стена класса тонкой линией (как в places.classroom): пол, окно
  function wall(s, g, floor) {
    ln(s, g, 'M60 ' + floor + ' H1860', 2.4, FLOOR);
    s.node(g, 'rect', Object.assign({ x: 1700, y: 290, width: 160, height: 190, rx: 6 }, L(3, GLASS)));
    ln(s, g, 'M1780 290 V480 M1700 385 H1860', 2.4);
  }
  // большая доска на стене: рама, доска, полочка для мела
  function bigBoard(s, g, x, y, w, h) {
    s.node(g, 'rect', Object.assign({ x: x - 10, y: y - 10, width: w + 20, height: h + 20, rx: 6 }, L(3, FRAME)));
    s.node(g, 'rect', Object.assign({ x: x, y: y, width: w, height: h, rx: 4 }, L(3, BOARD)));
    ln(s, g, 'M' + (x + 30) + ' ' + (y + h + 10) + ' h' + (w - 60), 4, FRAME);
  }
  // место за партой (как в places.classroom): стул под ребёнком, парта слева; возвращает центр круга
  function seat(s, g, x, floor, k) {
    var r = 54 * k, sy = floor - 78 * k, dx2 = x - r * 0.95, dx1 = dx2 - 150 * k, dy = sy - r * 0.9;
    s.node(g, 'rect', Object.assign({ x: dx1, y: dy, width: dx2 - dx1, height: 10 * k, rx: 3 }, L(2.4, WOOD)));
    ln(s, g, 'M' + (dx1 + 12 * k) + ' ' + (dy + 10 * k) + ' V' + floor + ' M' + (dx2 - 12 * k) + ' ' + (dy + 10 * k) + ' V' + floor, 2.4);
    ln(s, g, 'M' + (x - r * 0.8) + ' ' + sy + ' H' + (x + r * 0.9) + ' M' + (x + r * 0.9) + ' ' + sy + ' V' + (sy - r * 1.25) + ' M' + (x - r * 0.65) + ' ' + sy + ' V' + floor + ' M' + (x + r * 0.8) + ' ' + sy + ' V' + floor, 2.6);
    return { x: x, y: sy - r, r: r, desk: { x1: dx1, x2: dx2, y: dy } };
  }
  // одноклассник в обёртке-группе (чтобы двигать)
  function mate(s, g, i, x, y, r, gx) { var w = s.node(g, 'g', {}); K().classmate(w, i, x, y, r, { gx: gx }); return w; }

  // Заставка главы: карта трёх дорожек (places.paths), трое идут дальше к школе; дорожка героя главы — в его цвете, герой крупнее
  function trio(s, n, title, sub, who, t0, t1) {
    s.chapterCard(n, title, sub);
    var g0 = s.svg(), G = 600;
    s.node(g0, 'rect', { x: 0, y: G, width: 100, height: 1080 - G, fill: '#ECE3CF' }); s.path(g0, 'M0 ' + G + ' H100', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
    var g = s.node(g0, 'g', { transform: 'translate(70 0)' }), p = P().paths(s, g, { ground: G }); // карта сдвинута вправо: школа не задевает название главы
    var hot = s.path(g, p.paths[who].d, { stroke: K().KIDC[who], 'stroke-width': 6 });
    s.draw(hot, 0.2, { dur: 1.8 });
    var ids = [];
    ['misha', 'anya', 'dima'].forEach(function (w) {
      var q = p.paths[w], el = s.path(g, q.d, { stroke: 'none' }), len = el.getTotalLength(), base = w === who ? 124 : 88;
      var at = function (t) { t -= w === who ? 0 : 0.07; var pt = el.getPointAtLength(len * t), k = q.k + (0.8 - q.k) * t, d = base * k; return { x: pt.x, y: pt.y - d / 2, d: d }; };
      var a = at(t0), id = on(s, w, a.x + 70, a.y, a.d, 0.1, { gx: 6, dur: 0.3, mouth: w === who ? 'smile' : 'soft' });
      for (var i = 1; i <= 4; i++) {
        var b = at(t0 + (t1 - t0) * i / 4), t = 0.5 + (i - 1) * 0.95;
        b.x += 70; s.squash(id, 1.05, 0.95, t, 0.1); s.actor(id, b, t + 0.1, 0.6, 'power1.inOut'); s.squash(id, 1, 1, t + 0.1, 0.25);
      }
      ids.push(id);
    });
    s.hands(K().CAST[who][0], 'side', 0.6, 0.3);
    castOut(s, ids);
    s.chapter(n, title, 0.4, LEN - 0.6);
  }

  // 2:05 — заставка главы (27 тактов = 67,5 с)
  Film.scene({
    id: 'ch2', bars: 2,
    build: function (s) { trio(s, 2, 'Думать по правилам', 'Аня — младше всех и боится отстать', 'anya', 0.45, 0.62); }
  });

  // 2:10 — Самая младшая (Т. Лейтон и др., 2018)
  Film.scene({
    id: 'smallest', bars: 6,
    build: function (s) {
      var g = s.svg();
      // кадр 1: Ирина Петровна строит класс по дням рождения — шеренга от неё слева направо, сентябрь → август
      var A = s.node(g, 'g', {}), FL = 980;
      P().classroom(s, A, { rows: [{ floor: 800, k: 0.72, xs: [1000, 1210, 1420, 1630] }] }); // парты пустые: все встали в шеренгу
      var t1 = s.text('h3', 'В одном классе разница — почти год.', { left: 140, top: 130, width: 1040 });
      s.lines(t1, 0.3);
      on(s, 'teacher', 300, P().standY(FL, 160, true), 160, 0.1, { gx: 8 });
      s.hands('adult2', 'side', 0.5, 0.3);
      var N = 10, X = function (i) { return 500 + i * 142; }, D = function (i) { return 128 - i * 3.4; };
      var who = { 1: 'dima', 5: 'misha', 9: 'anya' }, m = 0;
      for (var i = 0; i < N; i++) {
        var t = 0.6 + i * 0.17;
        if (who[i]) { on(s, who[i], X(i), FL - D(i) / 2, D(i), t, { gx: -4, dur: 0.25 }); continue; }
        var h = mate(s, A, m++, X(i), FL - D(i) / 2, D(i) / 2, -4);
        s.tween(h, t, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)' });
      }
      s.gaze('adult2', 9, 2, 0.6, 1.6);
      var m1 = s.text('label', 'сентябрь', { left: X(0) - 100, top: FL - D(0) - 48, width: 200, textAlign: 'center' });
      var m2 = s.text('label', 'август', { left: X(N - 1) - 100, top: FL - D(N - 1) - 48, width: 200, textAlign: 'center', color: 'var(--accent-deep)' });
      s.fade(m1, 0.9, { y: 4 }); s.fade(m2, 2.3, { y: 4 });
      s.brow('kid2', 'doubt', 2.5, 0.3); s.mouth('kid2', 'soft', 2.5, 0.3);

      // кадр 2: урок; Аня вертится, роняет пенал — над ней тенью «СДВГ?»; листок календаря — тень бледнеет
      var sw = K().flip(s, 3.6);
      hide(s, [A, t1, m1, m2], sw);
      var B = s.node(g, 'g', {});
      show(s, B, sw);
      var cr = P().classroom(s, B, { floor: 900 });
      P().fill(s, B, cr.seats, ['0:0', '0:1', '0:2', '0:3'], 0, -6);
      var pm = cr.seats[0][0], pa = cr.seats[0][1], pd = cr.seats[0][3];
      s.actor('baby', { x: pm.x, y: pm.y, d: 2 * pm.r }, sw, 0.01); s.gaze('baby', -6, 0, sw, 0.01);
      s.actor('kid2', { x: pa.x, y: pa.y, d: 2 * pa.r }, sw, 0.01); s.gaze('kid2', -6, 0, sw, 0.01); s.brow('kid2', 'calm', sw, 0.01);
      s.actor('kid3', { x: pd.x, y: pd.y, d: 2 * pd.r }, sw, 0.01); s.gaze('kid3', -6, 0, sw, 0.01);
      s.actor('adult2', { x: cr.teacher.x, y: P().standY(900, 150, true), d: 150 }, sw, 0.01); s.gaze('adult2', 8, 0, sw, 0.01);
      ['baby', 'kid3'].forEach(function (id) { s.hands(id, 'desk', sw, 0.01); });
      // пенал на парте Ани
      var dk = pa.desk, pen = s.node(B, 'rect', Object.assign({ x: dk.x1 + 70, y: dk.y - 18, width: 58, height: 18, rx: 6 }, L(2.4, '#F5D27A')));
      // Аня вертится
      s.hands('kid2', 'side', sw + 0.4, 0.2);
      [0, 1, 2, 3].forEach(function (j) {
        var tt = sw + 0.5 + j * 0.3;
        s.actor('kid2', { x: pa.x + (j % 2 ? -9 : 9) }, tt, 0.15, 'sine.inOut');
        s.squash('kid2', 1.05, 0.95, tt, 0.08); s.squash('kid2', 1, 1, tt + 0.08, 0.14);
      });
      s.actor('kid2', { x: pa.x }, sw + 1.7, 0.2);
      s.gaze('kid2', 8, -4, sw + 0.5, 0.2); s.gaze('kid2', -8, 4, sw + 1.1, 0.2);
      s.tween(pen, sw + 1.7, { x: 0, y: 0, rotation: 0, svgOrigin: (dk.x1 + 99) + ' ' + (dk.y - 9) }, { x: 30, y: 900 - dk.y, rotation: 180, duration: 0.5, ease: 'power2.in' });
      s.mouth('kid2', 'flat', sw + 2.1, 0.2); s.gaze('kid2', -4, 8, sw + 2.1, 0.2); s.brow('kid2', 'sad', sw + 2.1, 0.2); s.hands('kid2', 'off', sw + 2.1, 0.2);
      s.brow('adult2', 'doubt', sw + 2.3, 0.3); s.mouth('adult2', 'flat', sw + 2.3, 0.3); s.gaze('adult2', 9, 2, sw + 2.3, 0.3);
      var shadow = s.text('display', 'СДВГ?', { left: pa.x - 220, top: 430, width: 440, textAlign: 'center', fontSize: 96, color: INK });
      s.tween(shadow, sw + 2.6, { opacity: 0, y: 10 }, { opacity: 0.4, y: 0, duration: 0.8 });
      var t2 = s.text('lead', 'Самым младшим в классе на треть чаще ставят СДВГ — синдром дефицита внимания и гиперактивности.', { left: 140, top: 130, width: 1040, fontSize: 36 });
      s.lines(t2, sw + 0.3);
      // листок календаря на стене рядом с Аней
      var cal = s.node(B, 'g', {}), CX = 1530;
      s.node(cal, 'rect', Object.assign({ x: CX - 72, y: 350, width: 144, height: 170, rx: 6 }, L(2.6, PAPER)));
      s.node(cal, 'rect', Object.assign({ x: CX - 72, y: 350, width: 144, height: 44, rx: 6 }, L(2.6, RED)));
      s.node(cal, 'circle', { cx: CX, cy: 342, r: 7, fill: INK });
      var cm = s.node(cal, 'text', { x: CX, y: 381, 'text-anchor': 'middle', fill: '#FFFDF8', style: 'font-family: var(--sans); font-weight: 700; font-size: 24px' }); cm.textContent = 'август';
      var cn = s.node(cal, 'text', { x: CX, y: 492, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--serif); font-weight: 600; font-size: 92px' }); cn.textContent = '31';
      s.tween(cal, 10.2, { opacity: 0, scale: 0.6, svgOrigin: CX + ' 435' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
      s.gaze('adult2', 9, -4, 10.4, 0.3); s.gaze('kid2', 7, -6, 10.5, 0.3);
      s.tween(shadow, 10.6, { opacity: 0.4 }, { opacity: 0.06, duration: 1.2, ease: 'power1.inOut' });
      s.brow('adult2', 'calm', 11.0, 0.3); s.mouth('adult2', 'soft', 11.0, 0.3);
      s.brow('kid2', 'calm', 11.3, 0.3); s.mouth('kid2', 'smile', 11.3, 0.3);
      var t3 = s.text('lead', 'Часто за диагнозом — <b class="acc">просто возраст</b>: ребёнок младше соседей.', { left: 140, top: 926, width: 1640, fontSize: 36 });
      s.lines(t3, 10.9);
      cite(s, 'Т. Лейтон и др., 2018: 408 тыс. детей, США; где граница набора в другой день — разницы нет', 11.6);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });

  // 2:25 — Куда поставить 150? (Р. Сиглер, Дж. Опфер, 2003; 2007)
  Film.scene({
    id: 'line150', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // кадр 1: Аня решает 3 + 5; в облачке над ней — схема счёта палочками
      var A = s.node(g, 'g', {});
      var cr = P().classroom(s, A, {});
      P().fill(s, A, cr.seats, ['0:0', '0:1', '0:2', '0:3', '1:1'], 0, -6);
      var pm = cr.seats[0][0], pa = cr.seats[0][1], pd = cr.seats[0][3];
      on(s, 'misha', pm.x, pm.y, 2 * pm.r, 0.05, { gx: -6, dur: 0.01 });
      on(s, 'anya', pa.x, pa.y, 2 * pa.r, 0.05, { gx: -6, dur: 0.01, brow: 'focus' });
      on(s, 'dima', pd.x, pd.y, 2 * pd.r, 0.05, { gx: -6, dur: 0.01 });
      on(s, 'teacher', cr.teacher.x, P().standY(980, 150, true), 150, 0.05, { gx: 8, dur: 0.01 });
      s.hands('kid2', 'desk', 0.05, 0.01); s.hands('baby', 'desk', 0.05, 0.01); s.hands('kid3', 'desk', 0.05, 0.01);
      var bx = cr.board.x + cr.board.w / 2, by = cr.board.y + cr.board.h / 2 + 22;
      var ex1 = chalk(s, A, bx - 30, by, '3 + 5 =', 76); fadeIn(s, ex1, 0.2);
      var ta = s.text('h3', 'Аня решает 3 + 5 — то пальцами, то в уме.', { left: 140, top: 130, width: 1040, fontSize: 44 });
      s.lines(ta, 0.3);
      var CX = 1270, CY = 500, cl = Film.icons.cloud(s, ov, CX, CY, 230, 100, { tail: [pa.x, pa.y - pa.r - 4], at: 0.6, dur: 0.5 });
      // палочки: | | | + | | | | |
      function sticks(a, b, t0) {
        var G = s.node(ov, 'g', {}), xs = [], n = a + b, w = 30, x0 = CX - ((n - 1) * w + 30) / 2;
        for (var k = 0; k < n; k++) xs.push(x0 + k * w + (k >= a ? 30 : 0));
        var st = xs.map(function (x) { return s.path(G, 'M' + x + ' ' + (CY - 34) + ' V' + (CY + 14), { stroke: INK, 'stroke-width': 5 }); });
        var pl = kid(s, G, x0 + (a - 1) * w + 30, CY - 0, '+', 40);
        s.tween(st.concat([pl]), t0, { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.04 });
        return { g: G, st: st, xs: xs };
      }
      var S1 = sticks(3, 5, 1.0);
      S1.st.forEach(function (p, k) {
        var tt = 1.5 + k * 0.15;
        s.tween(p, tt, { stroke: INK }, { stroke: TEAL, duration: 0.08 });
        var nm = kid(s, S1.g, S1.xs[k], CY + 52, String(k + 1), 26, TEAL);
        s.tween(nm, tt, { opacity: 0 }, { opacity: 1, duration: 0.1 });
      });
      s.gaze('kid2', 0, -8, 1.0, 0.3);
      s.tween(S1.g, 2.8, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — «5 → 6, 7, 8»
      var c5 = [kid(s, ov, CX - 100, CY + 12, '5 →', 48), kid(s, ov, CX - 12, CY + 12, '6,', 48), kid(s, ov, CX + 48, CY + 12, '7,', 48), kid(s, ov, CX + 102, CY + 12, '8', 48)];
      c5.forEach(function (e, k) { s.tween(e, 3.0 + k * 0.25, { opacity: 0 }, { opacity: 1, duration: 0.15 }); });
      s.tween(c5, 3.95, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — сразу «8»
      var c8 = kid(s, ov, CX, CY + 30, '8', 92, TEAL);
      s.tween(c8, 4.1, { opacity: 0, scale: 0.5, svgOrigin: CX + ' ' + CY }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      var ans = chalk(s, A, bx + 150, by, '8', 76); fadeIn(s, ans, 4.2);
      s.brow('kid2', 'proud', 4.1, 0.2); s.mouth('kid2', 'smile', 4.1, 0.2); s.squash('kid2', 0.94, 1.08, 4.1, 0.1); s.squash('kid2', 1, 1, 4.2, 0.3, 'back.out(3)');
      // следующий пример — и в облачке снова палочки
      s.tween([ex1, ans, c8], 4.5, { opacity: 1 }, { opacity: 0, duration: 0.15 });
      var ex2 = chalk(s, A, bx - 30, by, '4 + 3 =', 76); fadeIn(s, ex2, 4.6, 0.2);
      s.brow('kid2', 'focus', 4.6, 0.2); s.mouth('kid2', 'soft', 4.6, 0.2);
      var S2 = sticks(4, 3, 4.7);
      // кадр 2: «2 класс». Числовая прямая 0…1000 на доске. Куда поставить 150? Стоп-кадр.
      var sw = K().flip(s, 4.95);
      hide(s, [A, ta, cl, S2.g], sw);
      var B = s.node(g, 'g', {}), F2 = 900;
      show(s, B, sw);
      wall(s, B, F2);
      bigBoard(s, B, 300, 330, 760, 470);
      var back = [[1400, 5], [1620, 6], [1840, 7]].map(function (q) { var p = seat(s, B, q[0], 710, 0.72); return mate(s, B, q[1], p.x, p.y, p.r, -6); });
      var pA = seat(s, B, 1300, F2, 1);
      var front = [[1560, 3], [1820, 4]].map(function (q) { var p = seat(s, B, q[0], F2, 1); return mate(s, B, q[1], p.x, p.y, p.r, -6); });
      var mates = back.concat(front);
      ['baby', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, sw, 0.01); s.hands(id, 'off', sw, 0.01); });
      s.actor('kid2', { x: pA.x, y: pA.y, d: 2 * pA.r }, sw, 0.01); s.gaze('kid2', -8, -2, sw, 0.01); s.hands('kid2', 'off', sw, 0.01);
      s.brow('kid2', 'calm', sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01);
      var TY = P().standY(F2, 140, true);
      s.actor('adult2', { x: 190, y: TY, d: 140 }, sw, 0.01); s.gaze('adult2', 8, 0, sw, 0.01);
      var L0 = 400, L1 = 1000, LY = 720, X = function (v) { return L0 + (L1 - L0) * v / 1000; };
      var c2 = chalk(s, B, 330, 392, '2 класс', 42, { anchor: 'start' });
      var nl = s.path(B, 'M' + L0 + ' ' + LY + ' H' + L1 + ' M' + L0 + ' ' + (LY - 18) + ' V' + (LY + 18) + ' M' + L1 + ' ' + (LY - 18) + ' V' + (LY + 18), { stroke: CHALK, 'stroke-width': 5 });
      s.draw(nl, sw + 0.3, { dur: 0.8 });
      var n0 = chalk(s, B, L0, LY + 58, '0', 38), n1 = chalk(s, B, L1, LY + 58, '1000', 38);
      fadeIn(s, [n0, n1], sw + 1.0);
      hudText(s, 'h3', 'Числовая прямая: от 0 до 1000. Куда поставить 150?', { left: 140, top: 130, width: 1640, fontSize: 46 }, sw + 0.4, 10.9);
      s.freeze(7.7, 2.8);
      hudText(s, 'h3 acc', 'Угадайте.', { left: 140, top: 196, fontSize: 46 }, 7.8, 10.9);
      // кадр 3: Аня уверенно ставит флажок почти на середину; класс улыбается; учитель — красный флажок у самого начала
      // флажок-магнит: вылетает из руки (hx, hy) и встаёт на прямую
      function flag(color, x, t, hx, hy) {
        var f = s.node(B, 'g', {});
        ln(s, f, 'M' + x + ' ' + LY + ' V' + (LY - 110), 5, '#8B6A45');
        s.path(f, 'M' + x + ' ' + (LY - 110) + ' l52 18 l-52 18 Z', Object.assign(L(2.4, color)));
        s.tween(f, t, { opacity: 0, x: hx - x, y: hy - LY + 40, scale: 0.6, svgOrigin: x + ' ' + LY }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
        return f;
      }
      var AX = X(470);
      s.actor('kid2', { y: F2 - 55, d: 110 }, 10.4, 0.3);
      s.actor('kid2', { x: AX - 60 }, 10.7, 0.9, 'power1.inOut');
      [10.7, 11.0, 11.3].forEach(function (tt) { s.squash('kid2', 1.04, 0.96, tt, 0.1); s.squash('kid2', 1, 1, tt + 0.1, 0.15); });
      s.brow('kid2', 'proud', 11.6, 0.2); s.hands('kid2', 'up', 11.6, 0.3);
      var fa = flag(TEAL, AX, 11.8, AX + 8, F2 - 115);
      s.hands('kid2', 'side', 12.3, 0.3); s.gaze('kid2', -6, -6, 11.6, 0.2);
      mates.forEach(function (h, j) { s.tween(h, 12.3 + j * 0.06, { y: 0 }, { y: -10, duration: 0.14, repeat: 3, yoyo: true, ease: 'sine.inOut' }); });
      s.actor('adult2', { x: 300 }, 12.4, 0.6, 'power2.inOut'); s.hands('adult2', 'side', 12.4, 0.3);
      var fr = flag(RED, X(150), 13.1, 380, TY + 40);
      var lr = chalk(s, B, X(150) + 26, LY - 128, '150', 34, { color: '#F2A39E' }); fadeIn(s, lr, 13.3);
      s.brow('kid2', 'sad', 13.4, 0.3); s.mouth('kid2', 'flat', 13.4, 0.3); s.gaze('kid2', -9, -4, 13.4, 0.3); s.hands('kid2', 'off', 13.4, 0.3);
      hudText(s, 'lead', 'Так ошибаются почти все второклассники: 100 для них — уже огромное число, и маленькие числа в голове «растянуты».', { left: 140, top: 130, width: 1640, fontSize: 36 }, 12.4);
      cite(s, 'Р. Сиглер, Дж. Опфер, 2003: «растянуто» расставляют числа 91 % второклассников и 3 % взрослых · Дж. Опфер, Р. Сиглер, 2007 · счёт разными способами вперемешку — Р. Сиглер, 1987; 1996', 13.6);
      // кадр 4: «4 класс» — та же прямая; бледный старый флажок; Аня ставит почти точно; лошадка Миши скачет от старого к новому
      var sw2 = K().flip(s, 16.6);
      hide(s, [fr, lr, c2], sw2);
      s.set(fa, sw2, { opacity: 1 }, { opacity: 0.35 });
      var c4 = chalk(s, B, 330, 392, '4 класс', 42, { anchor: 'start' }); show(s, c4, sw2);
      s.actor('adult2', { x: 190 }, sw2, 0.01); s.hands('adult2', 'off', sw2, 0.01); s.brow('adult2', 'calm', sw2, 0.01); s.mouth('adult2', 'smile', sw2, 0.01);
      s.actor('kid2', { x: 1000 }, sw2, 0.01); s.brow('kid2', 'focus', sw2, 0.01); s.mouth('kid2', 'soft', sw2, 0.01); s.gaze('kid2', -8, -4, sw2, 0.01);
      var NX = X(160);
      s.actor('kid2', { x: NX - 60 }, 17.4, 0.9, 'power1.inOut');
      [17.4, 17.7, 18.0].forEach(function (tt) { s.squash('kid2', 1.04, 0.96, tt, 0.1); s.squash('kid2', 1, 1, tt + 0.1, 0.15); });
      s.hands('kid2', 'up', 18.3, 0.3);
      flag(TEAL, NX, 18.5, NX + 8, F2 - 115);
      s.hands('kid2', 'side', 19.0, 0.3); s.brow('kid2', 'proud', 18.9, 0.2); s.mouth('kid2', 'smile', 18.9, 0.2);
      s.squash('kid2', 0.94, 1.08, 19.0, 0.1); s.squash('kid2', 1, 1, 19.1, 0.3, 'back.out(3)');
      var horse = s.node(B, 'g', {});
      K().toyHorse(s, horse, AX + 46, LY, 0.5);
      s.tween(horse, 19.1, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var dx = (NX + 46 - AX - 46) / 3;
      [19.4, 19.85, 20.3].forEach(function (tt) { Film.ride(s, horse, dx, tt, 0.36, 40); });
      concl(s, 'к 4 классу числа в голове выстраиваются ровно.', 20.2);
      castOut(s, ['adult2', 'kid2']);
    }
  });

  // ---------- картинки для «Кита»: карточки — плоская заливка, на доске — мелом ----------
  function fishD(s, g, x, y, k, st) {
    var d = 'M' + (x + 32 * k) + ' ' + y + ' Q' + (x + 2 * k) + ' ' + (y - 24 * k) + ' ' + (x - 26 * k) + ' ' + y + ' Q' + (x + 2 * k) + ' ' + (y + 24 * k) + ' ' + (x + 32 * k) + ' ' + y + ' Z' +
      ' M' + (x - 24 * k) + ' ' + y + ' L' + (x - 46 * k) + ' ' + (y - 17 * k) + ' L' + (x - 46 * k) + ' ' + (y + 17 * k) + ' Z';
    var b = s.path(g, d, st);
    var e = s.node(g, 'circle', { cx: x + 18 * k, cy: y - 5 * k, r: 3 * k, fill: st.stroke });
    return [b, e];
  }
  // кит: крупное тело, хвост поднят, лопасти хвоста врозь (не рыбий хвост); o.spout — фонтанчик
  function whaleD(s, g, x, y, k, st, spout) {
    var P2 = function (a, b) { return (x + a * k).toFixed(1) + ' ' + (y + b * k).toFixed(1); };
    var d = 'M' + P2(-46, 4) + ' Q' + P2(-44, -30) + ' ' + P2(0, -32) + ' Q' + P2(50, -32) + ' ' + P2(58, 0) + ' Q' + P2(58, 22) + ' ' + P2(24, 22) + ' L' + P2(-24, 22) + ' Q' + P2(-44, 20) + ' ' + P2(-46, 4) + ' Z' +
      ' M' + P2(-45, 8) + ' Q' + P2(-64, 6) + ' ' + P2(-70, -16) +
      ' M' + P2(-70, -16) + ' Q' + P2(-84, -14) + ' ' + P2(-94, -26) + ' Q' + P2(-80, -30) + ' ' + P2(-70, -16) + ' Z' +
      ' M' + P2(-70, -16) + ' Q' + P2(-70, -32) + ' ' + P2(-60, -42) + ' Q' + P2(-58, -26) + ' ' + P2(-70, -16) + ' Z';
    var b = s.path(g, d, st);
    var e = s.node(g, 'circle', { cx: x + 34 * k, cy: y - 8 * k, r: 3.5 * k, fill: st.stroke });
    if (spout) s.path(g, 'M' + P2(20, -34) + ' V' + P2(20, -52) + ' M' + P2(20, -40) + ' Q' + P2(12, -50) + ' ' + P2(6, -52) + ' M' + P2(20, -40) + ' Q' + P2(28, -50) + ' ' + P2(34, -52), { stroke: '#5E8FB0', 'stroke-width': 2.4 });
    return [b, e];
  }
  function catD(s, g, x, y, k) {
    s.path(g, 'M' + (x - 22 * k) + ' ' + (y - 8 * k) + ' L' + (x - 20 * k) + ' ' + (y - 34 * k) + ' L' + (x - 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 20 * k) + ' ' + (y - 34 * k) + ' L' + (x + 22 * k) + ' ' + (y - 8 * k) + ' Q' + (x + 24 * k) + ' ' + (y + 20 * k) + ' ' + x + ' ' + (y + 20 * k) + ' Q' + (x - 24 * k) + ' ' + (y + 20 * k) + ' ' + (x - 22 * k) + ' ' + (y - 8 * k) + ' Z', L(2.4, '#F5D27A'));
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 2 * k, r: 2.6 * k, fill: INK }); });
  }
  // карточка 120 × 84 с картинкой (магнит на доске)
  function card(s, parent, x, y, draw) {
    var c = s.node(parent, 'g', {});
    s.node(c, 'rect', Object.assign({ x: x - 60, y: y - 42, width: 120, height: 84, rx: 8 }, L(2.2, PAPER)));
    draw(c, x, y);
    return c;
  }

  // 2:50 — Кит — рыба? (Л. С. Выготский, 1934)
  Film.scene({
    id: 'whale', bars: 9,
    build: function (s) {
      var g = s.svg(), F = 900;
      wall(s, g, F);
      bigBoard(s, g, 330, 300, 1290, 500);
      // таблица мелом «рыбы | звери» в левой части доски
      var COL = { f: 470, b: 690 }, ROW = [440, 535, 630];
      var tb = s.node(g, 'g', {});
      ln(s, tb, 'M580 340 V690 M370 390 H790', 3, CHALK);
      chalk(s, tb, COL.f, 375, 'рыбы', 36); chalk(s, tb, COL.b, 375, 'звери', 36);
      fadeIn(s, tb, 0.3, 0.4);
      var ax = 220, ay = F - 55;
      on(s, 'anya', ax, ay, 110, 0.2, { gx: 6, gy: -4, brow: 'focus' });
      on(s, 'teacher', 1750, P().standY(F, 140, true), 140, 0.2, { gx: -8 });
      // Аня раскладывает карточки
      function put(c, to, t) {
        var fx = ax + 40 - to[0], fy = ay - 70 - to[1];
        s.tween(c, t, { opacity: 0, x: fx, y: fy, scale: 0.5, svgOrigin: to[0] + ' ' + to[1] }, { opacity: 1, x: fx, y: fy, scale: 0.5, duration: 0.12 });
        s.tween(c, t + 0.12, { x: fx, y: fy, scale: 0.5 }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.inOut' });
      }
      var ov = s.over();
      s.hands('kid2', 'up', 0.6, 0.25);
      put(card(s, ov, COL.f, ROW[0], function (c, x, y) { fishD(s, c, x + 8, y, 1.1, L(2.4, '#F5B97A')); }), [COL.f, ROW[0]], 0.7);
      put(card(s, ov, COL.b, ROW[0], function (c, x, y) { catD(s, c, x, y + 4, 1.1); }), [COL.b, ROW[0]], 1.3);
      put(card(s, ov, COL.b, ROW[1], function (c, x, y) { K().toyHorse(s, c, x - 2, y + 36, 0.62); }), [COL.b, ROW[1]], 1.9);
      var wc = card(s, ov, COL.f, ROW[1], function (c, x, y) { whaleD(s, c, x + 14, y + 10, 0.62, L(2.4, '#BFD4E8')); });
      put(wc, [COL.f, ROW[1]], 2.5);
      s.hands('kid2', 'side', 3.1, 0.3); s.brow('kid2', 'proud', 3.0, 0.2); s.mouth('kid2', 'smile', 3.0, 0.2);
      s.squash('kid2', 0.94, 1.08, 3.0, 0.1); s.squash('kid2', 1, 1, 3.1, 0.3, 'back.out(3)');
      K().say(s, 'Он же плавает!', 196, 700, 3.1, 6.0);
      hudText(s, 'lead', 'Рыбы дышат в воде жабрами. Кит дышит воздухом и кормит детёнышей молоком — значит, он зверь.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 3.6, 10.8);
      // Ирина Петровна рисует на доске: рыба с жабрами под водой, кит у поверхности с фонтаном, китёнок с мамой
      var CH = { fill: 'none', stroke: CHALK, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      s.hands('adult2', 'side', 4.0, 0.3); s.gaze('adult2', -9, -4, 4.0, 0.3); s.gaze('kid2', 9, -6, 4.0, 0.3); s.brow('kid2', 'calm', 4.0, 0.3);
      var wv = s.path(g, 'M850 520 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0', { stroke: WATER, 'stroke-width': 4 });
      s.draw(wv, 4.2, { dur: 0.6 });
      var f1 = fishD(s, g, 975, 620, 1.7, CH);
      s.draw(f1[0], 4.6, { dur: 0.8 }); fadeIn(s, f1[1], 5.2);
      var gills = s.path(g, 'M983 606 q-7 14 0 28 M993 604 q-7 16 0 32', { stroke: '#F2A39E', 'stroke-width': 3.5 });
      s.draw(gills, 5.3, { dur: 0.4 });
      var l1 = chalk(s, g, 960, 735, 'дышит в воде', 32); fadeIn(s, l1, 5.6);
      var w1 = whaleD(s, g, 1240, 524, 1.25, CH);
      s.draw(w1[0], 6.2, { dur: 0.8 }); fadeIn(s, w1[1], 6.8);
      var fn = s.path(g, 'M1265 482 Q1257 434 1231 414 M1265 482 Q1273 434 1299 414 M1265 482 V402', { stroke: WATER, 'stroke-width': 4 });
      s.draw(fn, 7.0, { dur: 0.4 });
      var l2 = chalk(s, g, 1225, 735, 'дышит воздухом', 32); fadeIn(s, l2, 7.4);
      var w2 = whaleD(s, g, 1470, 600, 1.0, CH), w3 = whaleD(s, g, 1500, 664, 0.45, CH);
      s.draw(w2[0], 8.0, { dur: 0.6 }); s.draw(w3[0], 8.5, { dur: 0.4 }); fadeIn(s, [w2[1], w3[1]], 8.6);
      var l3 = chalk(s, g, 1490, 735, 'кормит молоком', 32); fadeIn(s, l3, 8.8);
      s.hands('adult2', 'off', 9.4, 0.3); s.gaze('adult2', -9, 2, 9.4, 0.3);
      // Аня сама переносит кита к зверям
      s.gaze('kid2', 7, -8, 9.4, 0.2); s.hands('kid2', 'up', 9.6, 0.25); s.brow('kid2', 'focus', 9.5, 0.2); s.mouth('kid2', 'soft', 9.5, 0.2);
      s.tween(wc, 9.8, { x: 0, y: 0 }, { x: COL.b - COL.f, y: ROW[2] - ROW[1], duration: 0.7, ease: 'power2.inOut' });
      s.hands('kid2', 'side', 10.5, 0.3); s.brow('kid2', 'proud', 10.5, 0.2); s.mouth('kid2', 'smile', 10.5, 0.2);
      s.squash('kid2', 0.94, 1.08, 10.6, 0.1); s.squash('kid2', 1, 1, 10.7, 0.3, 'back.out(3)');
      s.mouth('adult2', 'smile', 10.6, 0.2);
      s.gaze('kid2', 6, -6, 13.5, 0.4); s.gaze('adult2', -9, -4, 14.5, 0.4); s.gaze('kid2', 9, -4, 16.0, 0.4);
      hudText(s, 'lead', 'Житейское понятие ребёнок собирает из опыта — по виду. Научное получает готовым определением — в школе.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 11.0);
      concl(s, 'в школе учатся судить по признакам, а не по тому, как вещь выглядит.', 18.0);
      cite(s, 'Л. С. Выготский, «Мышление и речь», 1934, гл. 6 · scientific concepts · даже из 10–15-летних лишь треть знает, что дельфин дышит лёгкими (М. Кубятко, П. Прокоп, 2009)', 12.0);
      castOut(s, ['adult2', 'kid2']);
    }
  });
})();
