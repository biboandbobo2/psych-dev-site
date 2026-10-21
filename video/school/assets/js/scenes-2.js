/* Глава 2. Думать по правилам · Аня (v3.3, «Язык 7–10»): самая младшая (Лейтон), куда поставить 150 (Сиглер, Опфер), кит — рыба? (Выготский) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', CHALK = '#F4F1E6', BOARD = '#3B5E54', FRAME = '#C9A27A', WOOD = '#E9D9BF', FLOOR = '#C9BBA2',
    PAPER = '#FFFDF8', GLASS = '#E8F1EE', RED = '#D9534F', TEAL = '#26A69A', WATER = '#BFDCE5';
  var LEN = 67.5; // длина главы — для подписи в углу
  var GX = -12; // дети в классе смотрят на доску (она слева)

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
    if (who === 'misha') s.gear(id, 'backpack', !(o && o.noPack), 0, 0.01); // в школе и по дороге ранец на нём
    return id;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); s.hands(id, 'off', s.dur - 0.4, 0.3); }); }
  function show(s, e, lt) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 }); }
  function hide(s, e, lt) { [].concat(e).forEach(function (x) { s.set(x, lt, { opacity: 1 }, { opacity: 0 }); }); }
  function fadeIn(s, e, lt, dur) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: dur || 0.3 }); }
  // нижний текст и вывод — как в главе 1: 32 px, строками, «Вывод:» акцентом
  function bottom(s, html, lt) {
    var e = s.hud('lead', html, { left: 140, top: 912, width: 1640, fontSize: 32, lineHeight: 1.3 });
    s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 });
    s.lines(e, lt);
    s.tween(e, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function concl(s, text, lt) { return bottom(s, '<b class="acc">Вывод:</b> ' + text, lt); }
  function cite(s, text, lt) {
    var h = s.hud('cite', text, { left: 140, top: text.length > 140 ? 1004 : 1030, width: 1640, fontSize: 20 }); // длинный источник — в две строки, не обрезается краем
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
  // быстрое перелистывание: лист проезжает за 0,5 с, смена кадра — в середине
  function flip(s, at) {
    var e = s.div('pageflip', { left: 0, top: 0, width: 1920, height: 1080, transform: 'translateX(1960px)' }, s.ov);
    s.tween(e, at, { x: 1960 }, { x: -2000, duration: 0.5, ease: 'power1.inOut' });
    return at + 0.25;
  }
  // стоп-кадр с подписью у значка паузы
  function freeze(s, at, dur) {
    s.freeze(at, dur);
    var e = s.hud('cite', 'пауза — угадайте', { left: 1000, top: 994, fontSize: 22, color: 'var(--accent-deep)' });
    s.tween(e, at + 0.1, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    s.tween(e, at + dur - 0.25, { opacity: 1 }, { opacity: 0, duration: 0.2 });
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
  function mate(s, g, i, x, y, r, gx) { var w = s.node(g, 'g', {}); K().classmate(w, i, x, y, r, { gx: gx == null ? GX : gx }); return w; }
  // класс: передний ряд как в places, задний ряд выше и мельче (между рядами — место для облачка и подписей над героями)
  function rows(F, backXs) { return [{ floor: F, k: 1, xs: [1000, 1270, 1540, 1810] }, { floor: F - 260, k: 0.6, xs: backXs || [1110, 1400, 1690] }]; }
  function seatOf(cr, who) { var q = cr.heroes[who].split(':'); return cr.seats[+q[0]][+q[1]]; }

  // Заставка главы: карта трёх дорожек (places.paths), трое одного роста идут к школе; дорожка героя главы — в его цвете, герой машет
  function trio(s, n, title, sub, who, t0, t1) {
    s.chapterCard(n, title, sub);
    var g0 = s.svg(), G = 600, DX = 70, D = 84;
    s.node(g0, 'rect', { x: 0, y: G, width: 100, height: 1080 - G, fill: '#ECE3CF' }); s.path(g0, 'M0 ' + G + ' H100', { stroke: FLOOR, 'stroke-width': 2.4 });
    var g = s.node(g0, 'g', { transform: 'translate(' + DX + ' 0)' }), p = P().paths(s, g, { ground: G }); // карта сдвинута вправо: школа не задевает название главы
    var hot = s.path(g, p.paths[who].d, { stroke: K().KIDC[who], 'stroke-width': 6 });
    s.draw(hot, 0.2, { dur: 1.8 });
    var ids = [];
    ['misha', 'anya', 'dima'].forEach(function (w) {
      var at = function (t) { var q = P().pathPoint(p, w, t); return { x: q.x + DX, y: q.y - D / 2 }; };
      var a = at(t0), id = on(s, w, a.x, a.y, D, 0.1, { gx: 6, dur: 0.3, mouth: w === who ? 'smile' : 'soft' });
      for (var i = 1; i <= 4; i++) {
        var b = at(t0 + (t1 - t0) * i / 4), t = 0.5 + (i - 1) * 0.95;
        s.squash(id, 1.05, 0.95, t, 0.1); s.actor(id, b, t + 0.1, 0.6, 'power1.inOut'); s.squash(id, 1, 1, t + 0.1, 0.25);
      }
      ids.push(id);
    });
    var hid = K().CAST[who][0];
    s.hands(hid, 'up', 1.0, 0.3); s.hands(hid, 'side', 2.2, 0.3);
    castOut(s, ids);
    s.chapter(n, title, 0.4, LEN - 0.6);
  }

  // 2:07,5 — заставка главы (27 тактов = 67,5 с)
  Film.scene({
    id: 'ch2', bars: 2,
    build: function (s) { trio(s, 2, 'Думать по правилам', 'Аня — младше всех и боится отстать', 'anya', 0.28, 0.4); }
  });

  // 2:12,5 — Самая младшая (Т. Лейтон и др., 2018)
  Film.scene({
    id: 'smallest', bars: 6,
    build: function (s) {
      var g = s.svg();
      // кадр 1: Ирина Петровна строит класс по дням рождения — шеренга от неё слева направо, сентябрь → август
      var A = s.node(g, 'g', {}), FL = 980;
      P().classroom(s, A, { rows: [{ floor: 800, k: 0.72, xs: [1000, 1210, 1420, 1630] }] }); // парты пустые: все встали в шеренгу
      var t1 = s.text('h3', 'В одном классе разница — почти год.', { left: 140, top: 130, width: 1040 });
      s.lines(t1, 0.3);
      on(s, 'teacher', 300, P().standY(FL, 160, true), 160, 0.1, { gx: 10 });
      s.hands('adult2', 'side', 0.5, 0.3);
      var N = 10, X = function (i) { return 520 + i * 140; }, D = function (i) { return 112 - i * 2.6; };
      var who = { 1: 'dima', 5: 'misha', 9: 'anya' }, m = 0;
      for (var i = 0; i < N; i++) {
        var t = 0.6 + i * 0.17;
        if (who[i]) { on(s, who[i], X(i), FL - D(i) / 2, D(i), t, { gx: -6, dur: 0.25 }); continue; }
        var h = mate(s, A, m++, X(i), FL - D(i) / 2, D(i) / 2, -6);
        s.tween(h, t, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)' });
      }
      var m1 = s.text('label', 'сентябрь', { left: X(0) - 100, top: FL - D(0) - 48, width: 200, textAlign: 'center' });
      var m2 = s.text('label', 'август', { left: X(N - 1) - 100, top: FL - D(N - 1) - 50, width: 200, textAlign: 'center', color: 'var(--accent-deep)' });
      s.fade(m1, 0.9, { y: 4 }); s.fade(m2, 2.3, { y: 4 });
      s.brow('kid2', 'doubt', 2.5, 0.3); s.mouth('kid2', 'soft', 2.5, 0.3);

      // кадр 2: урок; Аня вертится, роняет пенал — прямо над ней тенью «СДВГ?»; листок календаря — тень бледнеет
      var sw = flip(s, 3.6), F = 900;
      hide(s, [A, t1, m1, m2], sw);
      var B = s.node(g, 'g', {});
      show(s, B, sw);
      var cr = P().classroom(s, B, { floor: F, rows: rows(F) });
      P().fill(s, B, cr.seats, ['0:0', '0:1', '0:3'], 0, GX);
      var pm = seatOf(cr, 'misha'), pa = seatOf(cr, 'anya'), pd = seatOf(cr, 'dima');
      s.actor('baby', { x: pm.x, y: pm.y, d: 2 * pm.r }, sw, 0.01); s.gaze('baby', GX, 0, sw, 0.01);
      s.actor('kid2', { x: pa.x, y: pa.y, d: 2 * pa.r }, sw, 0.01); s.gaze('kid2', GX, 0, sw, 0.01); s.brow('kid2', 'calm', sw, 0.01);
      s.actor('kid3', { x: pd.x, y: pd.y, d: 2 * pd.r }, sw, 0.01); s.gaze('kid3', GX, 0, sw, 0.01);
      s.actor('adult2', { x: cr.teacher.x, y: P().standY(F, 150, true), d: 150 }, sw, 0.01); s.gaze('adult2', 10, 0, sw, 0.01);
      ['baby', 'kid3'].forEach(function (id) { s.hands(id, 'desk', sw, 0.01); });
      // пенал на парте Ани
      var dk = pa.desk, pen = s.node(B, 'rect', Object.assign({ x: dk.x1 + 70, y: dk.y - 18, width: 58, height: 18, rx: 6 }, L(2.4, '#F5D27A')));
      // Аня вертится
      s.hands('kid2', 'side', sw + 0.4, 0.2); s.brow('kid2', 'doubt', sw + 0.4, 0.2);
      [0, 1, 2, 3].forEach(function (j) {
        var tt = sw + 0.5 + j * 0.3;
        s.actor('kid2', { x: pa.x + (j % 2 ? -10 : 10) }, tt, 0.15, 'sine.inOut');
        s.squash('kid2', 1.05, 0.95, tt, 0.08); s.squash('kid2', 1, 1, tt + 0.08, 0.14);
      });
      s.actor('kid2', { x: pa.x }, sw + 1.7, 0.2);
      s.gaze('kid2', 10, -4, sw + 0.5, 0.2); s.gaze('kid2', -8, 4, sw + 1.1, 0.2);
      s.tween(pen, sw + 1.7, { x: 0, y: 0, rotation: 0, svgOrigin: (dk.x1 + 99) + ' ' + (dk.y - 9) }, { x: 30, y: F - dk.y, rotation: 180, duration: 0.5, ease: 'power2.in' });
      s.mouth('kid2', 'flat', sw + 2.1, 0.2); s.gaze('kid2', -4, 8, sw + 2.1, 0.2); s.brow('kid2', 'sad', sw + 2.1, 0.2); s.hands('kid2', 'off', sw + 2.1, 0.2);
      s.brow('adult2', 'doubt', sw + 2.3, 0.3); s.mouth('adult2', 'flat', sw + 2.3, 0.3); s.gaze('adult2', 10, 2, sw + 2.3, 0.3);
      var shadow = s.text('display', 'СДВГ?', { left: pa.x - 150, top: pa.y - pa.r - 72, width: 300, textAlign: 'center', fontSize: 56, color: INK });
      s.tween(shadow, sw + 2.6, { opacity: 0, y: 10 }, { opacity: 0.45, y: 0, duration: 0.8 });
      var t2 = s.text('lead', 'Самым младшим в классе на треть чаще ставят СДВГ — синдром дефицита внимания и гиперактивности.', { left: 140, top: 130, width: 1040, fontSize: 36 });
      s.lines(t2, sw + 0.3);
      // листок календаря на стене рядом с Аней
      var cal = s.node(B, 'g', {}), CX = 1345, CY = 300;
      s.node(cal, 'rect', Object.assign({ x: CX - 60, y: CY, width: 120, height: 140, rx: 6 }, L(2.6, PAPER)));
      s.node(cal, 'rect', Object.assign({ x: CX - 60, y: CY, width: 120, height: 38, rx: 6 }, L(2.6, RED)));
      s.node(cal, 'circle', { cx: CX, cy: CY - 8, r: 6, fill: INK });
      var cm = s.node(cal, 'text', { x: CX, y: CY + 27, 'text-anchor': 'middle', fill: '#FFFDF8', style: 'font-family: var(--sans); font-weight: 700; font-size: 22px' }); cm.textContent = 'август';
      var cn = s.node(cal, 'text', { x: CX, y: CY + 120, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--serif); font-weight: 600; font-size: 74px' }); cn.textContent = '31';
      var cc = s.node(cal, 'text', { x: CX, y: CY + 172, 'text-anchor': 'middle', fill: '#13534D', style: 'font-family: var(--sans); font-weight: 700; font-size: 22px' }); cc.textContent = 'день рождения Ани';
      s.tween(cal, 10.2, { opacity: 0, scale: 0.6, svgOrigin: CX + ' ' + (CY + 70) }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
      s.gaze('adult2', 10, -4, 10.4, 0.3); s.gaze('kid2', 6, -8, 10.5, 0.3);
      s.tween(shadow, 10.6, { opacity: 0.45 }, { opacity: 0.06, duration: 1.2, ease: 'power1.inOut' });
      s.brow('adult2', 'calm', 11.0, 0.3); s.mouth('adult2', 'soft', 11.0, 0.3);
      s.brow('kid2', 'calm', 11.3, 0.3); s.mouth('kid2', 'smile', 11.3, 0.3);
      bottom(s, 'Часто за диагнозом — <b class="acc">просто возраст</b>: ребёнок младше соседей.', 10.9);
      cite(s, 'Т. Лейтон и др., 2018: 408 тыс. детей, США; где граница набора в другой день — разницы нет', 11.6);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });

  // 2:27,5 — Куда поставить 150? (Р. Сиглер, Дж. Опфер, 2003; 2007)
  Film.scene({
    id: 'line150', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // кадр 1: Аня решает 3 + 5; в облачке над ней — схема счёта палочками; соседи уже подняли руки
      var A = s.node(g, 'g', {}), F1 = 980;
      var cr = P().classroom(s, A, { rows: rows(F1) });
      P().fill(s, A, cr.seats, ['0:0', '0:1', '0:3'], 0, GX);
      var pm = seatOf(cr, 'misha'), pa = seatOf(cr, 'anya'), pd = seatOf(cr, 'dima');
      on(s, 'misha', pm.x, pm.y, 2 * pm.r, 0.05, { gx: GX, dur: 0.01 });
      on(s, 'anya', pa.x, pa.y, 2 * pa.r, 0.05, { gx: GX, dur: 0.01, brow: 'focus' });
      on(s, 'dima', pd.x, pd.y, 2 * pd.r, 0.05, { gx: GX, dur: 0.01 });
      on(s, 'teacher', cr.teacher.x, P().standY(F1, 150, true), 150, 0.05, { gx: 10, dur: 0.01 });
      s.hands('kid2', 'desk', 0.05, 0.01); s.hands('baby', 'desk', 0.05, 0.01); s.hands('kid3', 'desk', 0.05, 0.01);
      var bx = cr.board.x + cr.board.w / 2, by = cr.board.y + cr.board.h / 2 + 22;
      var ex1 = chalk(s, A, bx - 30, by, '3 + 5 =', 76); fadeIn(s, ex1, 0.2);
      var ta = s.text('h3', 'Аня решает 3 + 5 — то пальцами, то в уме.', { left: 140, top: 130, width: 1040, fontSize: 44 });
      s.lines(ta, 0.3);
      var CX = 1270, CY = 445, cl = Film.icons.cloud(s, ov, CX, CY, 220, 85, { tail: [pa.x, pa.y - pa.r - 4], at: 0.6, dur: 0.5 });
      // палочки: | | | + | | | | |
      function sticks(a, b, t0) {
        var G = s.node(ov, 'g', {}), xs = [], n = a + b, w = 30, x0 = CX - ((n - 1) * w + 30) / 2;
        for (var k = 0; k < n; k++) xs.push(x0 + k * w + (k >= a ? 30 : 0));
        var st = xs.map(function (x) { return s.path(G, 'M' + x + ' ' + (CY - 34) + ' V' + (CY + 10), { stroke: INK, 'stroke-width': 5 }); });
        var pl = kid(s, G, x0 + (a - 1) * w + 30, CY - 2, '+', 40);
        s.tween(st.concat([pl]), t0, { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.04 });
        return { g: G, st: st, xs: xs };
      }
      var S1 = sticks(3, 5, 1.0);
      S1.st.forEach(function (p, k) {
        var tt = 1.4 + k * 0.15;
        s.tween(p, tt, { stroke: INK }, { stroke: TEAL, duration: 0.08 });
        var nm = kid(s, S1.g, S1.xs[k], CY + 44, String(k + 1), 26, TEAL);
        s.tween(nm, tt, { opacity: 0 }, { opacity: 1, duration: 0.1 });
      });
      s.gaze('kid2', 0, -8, 1.0, 0.3);
      // соседи уже подняли руки — Аня сомневается
      s.hands('baby', 'up', 1.9, 0.3); s.hands('kid3', 'up', 2.0, 0.3);
      s.gaze('kid2', 8, 0, 2.2, 0.2); s.brow('kid2', 'doubt', 2.2, 0.25); s.mouth('kid2', 'flat', 2.2, 0.25);
      K().say(s, 'Я не успеваю…', 1335, 690, 2.3, 4.5);
      s.tween(S1.g, 2.8, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — «5 → 6, 7, 8»
      var c5 = [kid(s, ov, CX - 100, CY + 10, '5 →', 48), kid(s, ov, CX - 12, CY + 10, '6,', 48), kid(s, ov, CX + 48, CY + 10, '7,', 48), kid(s, ov, CX + 102, CY + 10, '8', 48)];
      c5.forEach(function (e, k) { s.tween(e, 2.95 + k * 0.22, { opacity: 0 }, { opacity: 1, duration: 0.15 }); });
      s.tween(c5, 3.8, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — сразу «8»
      var c8 = kid(s, ov, CX, CY + 28, '8', 88, TEAL);
      s.tween(c8, 3.95, { opacity: 0, scale: 0.5, svgOrigin: CX + ' ' + CY }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      var ans = chalk(s, A, bx + 150, by, '8', 76); fadeIn(s, ans, 4.05);
      s.gaze('kid2', GX, -4, 3.9, 0.2); s.brow('kid2', 'calm', 4.0, 0.2); s.mouth('kid2', 'soft', 4.0, 0.2);
      s.hands('baby', 'desk', 4.2, 0.3); s.hands('kid3', 'desk', 4.2, 0.3);
      // следующий пример — и в облачке снова палочки
      s.tween([ex1, ans, c8], 4.4, { opacity: 1 }, { opacity: 0, duration: 0.15 });
      var ex2 = chalk(s, A, bx - 30, by, '4 + 3 =', 76); fadeIn(s, ex2, 4.5, 0.2);
      s.brow('kid2', 'focus', 4.5, 0.2);
      var S2 = sticks(4, 3, 4.6);

      // кадр 2: «2 класс». Числовая прямая 0…1000 на доске. Куда поставить 150? Стоп-кадр.
      var sw = flip(s, 5.3);
      hide(s, [A, ta, cl, S2.g], sw);
      var B = s.node(g, 'g', {}), F2 = 900;
      show(s, B, sw);
      wall(s, B, F2);
      bigBoard(s, B, 300, 330, 760, 470);
      var back = [[1400, 5], [1620, 6], [1840, 7]].map(function (q) { var p = seat(s, B, q[0], F2 - 260, 0.6); return mate(s, B, q[1], p.x, p.y, p.r); });
      var sM = seat(s, B, 1300, F2, 1), sA = seat(s, B, 1560, F2, 1), sD = seat(s, B, 1820, F2, 1); // Миша, Аня, Дима — в том же порядке, что в классе
      var mates = back;
      s.actor('baby', { x: sM.x, y: sM.y, d: 2 * sM.r }, sw, 0.01); s.gaze('baby', GX, -2, sw, 0.01); s.hands('baby', 'desk', sw, 0.01);
      s.actor('kid3', { x: sD.x, y: sD.y, d: 2 * sD.r }, sw, 0.01); s.gaze('kid3', GX, -2, sw, 0.01); s.hands('kid3', 'desk', sw, 0.01);
      s.actor('kid2', { x: sA.x, y: sA.y, d: 2 * sA.r }, sw, 0.01); s.gaze('kid2', GX, -2, sw, 0.01); s.hands('kid2', 'off', sw, 0.01);
      s.brow('kid2', 'calm', sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01);
      var TY = P().standY(F2, 140, true);
      s.actor('adult2', { x: 190, y: TY, d: 140 }, sw, 0.01); s.gaze('adult2', 10, 0, sw, 0.01);
      var L0 = 400, L1 = 1000, LY = 720, X = function (v) { return L0 + (L1 - L0) * v / 1000; };
      var c2 = chalk(s, B, 330, 392, '2 класс', 42, { anchor: 'start' });
      var nl = s.path(B, 'M' + L0 + ' ' + LY + ' H' + L1 + ' M' + L0 + ' ' + (LY - 18) + ' V' + (LY + 18) + ' M' + L1 + ' ' + (LY - 18) + ' V' + (LY + 18), { stroke: CHALK, 'stroke-width': 5 });
      s.draw(nl, sw + 0.2, { dur: 0.7 });
      var n0 = chalk(s, B, L0, LY + 58, '0', 38), n1 = chalk(s, B, L1, LY + 58, '1000', 38);
      fadeIn(s, [n0, n1], sw + 0.8);
      hudText(s, 'h3', 'Числовая прямая: от 0 до 1000. Куда поставить 150?', { left: 140, top: 130, width: 1640, fontSize: 46 }, sw + 0.3, 11.0);
      freeze(s, 8.3, 2.6);
      hudText(s, 'h3 acc', 'Угадайте.', { left: 140, top: 196, fontSize: 46 }, 8.4, 11.0);
      // кадр 3: Аня уверенно ставит флажок почти на середину; потом — красный флажок учителя у 150; класс улыбается; потом объяснение
      // флажок-магнит: вылетает из руки (hx, hy) и встаёт на прямую; left — полотнище влево
      function flag(color, x, t, hx, hy, left) {
        var f = s.node(B, 'g', {});
        ln(s, f, 'M' + x + ' ' + LY + ' V' + (LY - 110), 5, '#8B6A45');
        s.path(f, 'M' + x + ' ' + (LY - 110) + ' l' + (left ? -52 : 52) + ' 18 l' + (left ? 52 : -52) + ' 18 Z', L(2.4, color));
        s.tween(f, t, { opacity: 0, x: hx - x, y: hy - LY + 40, scale: 0.6, svgOrigin: x + ' ' + LY }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
        return f;
      }
      var AX = X(470);
      s.actor('kid2', { y: F2 - 55, d: 110 }, 11.0, 0.3);
      s.actor('kid2', { x: AX - 60 }, 11.3, 0.9, 'power1.inOut');
      [11.3, 11.6, 11.9].forEach(function (tt) { s.squash('kid2', 1.04, 0.96, tt, 0.1); s.squash('kid2', 1, 1, tt + 0.1, 0.15); });
      s.brow('kid2', 'proud', 12.2, 0.2); s.hands('kid2', 'up', 12.2, 0.3); s.gaze('kid2', 6, -8, 12.2, 0.2);
      var fa = flag(TEAL, AX, 12.4, AX + 8, F2 - 115);
      s.hands('kid2', 'side', 12.9, 0.3);
      s.actor('adult2', { x: 300 }, 12.7, 0.5, 'power2.inOut'); s.hands('adult2', 'side', 12.7, 0.3);
      flag(RED, X(150), 13.3, 380, TY + 40);
      var lr = chalk(s, B, X(150) + 26, LY - 128, '150', 34, { color: '#F2A39E' }); fadeIn(s, lr, 13.5);
      s.brow('kid2', 'sad', 13.7, 0.3); s.mouth('kid2', 'flat', 13.7, 0.3); s.gaze('kid2', -10, -6, 13.7, 0.3); s.hands('kid2', 'off', 13.7, 0.3);
      mates.forEach(function (h, j) { s.tween(h, 13.9 + j * 0.06, { y: 0 }, { y: -8, duration: 0.14, repeat: 3, yoyo: true, ease: 'sine.inOut' }); });
      s.mouth('baby', 'smile', 13.9, 0.2); s.mouth('kid3', 'smile', 13.9, 0.2);
      hudText(s, 'lead', 'Так ошибаются почти все второклассники: 100 для них — уже огромное число, и маленькие числа в голове «растянуты».', { left: 140, top: 130, width: 1640, fontSize: 36 }, 14.4);
      cite(s, 'Р. Сиглер, Дж. Опфер, 2003: «растянуто» расставляют числа 91 % второклассников и 3 % взрослых · Дж. Опфер, Р. Сиглер, 2007 · счёт разными способами вперемешку — Р. Сиглер, 1987; 1996', 15.0);
      // кадр 4: «4 класс» — та же прямая; бледный старый флажок, красный 150 на месте; Аня ставит почти точно
      var sw2 = flip(s, 18.0);
      hide(s, c2, sw2);
      s.set(fa, sw2, { opacity: 1 }, { opacity: 0.35 });
      var c4 = chalk(s, B, 330, 392, '4 класс', 42, { anchor: 'start' }); show(s, c4, sw2);
      s.actor('adult2', { x: 190 }, sw2, 0.01); s.hands('adult2', 'off', sw2, 0.01); s.brow('adult2', 'calm', sw2, 0.01); s.mouth('adult2', 'smile', sw2, 0.01);
      s.actor('kid2', { x: 1000 }, sw2, 0.01); s.brow('kid2', 'focus', sw2, 0.01); s.mouth('kid2', 'soft', sw2, 0.01); s.gaze('kid2', GX, -4, sw2, 0.01);
      var NX = X(160);
      s.actor('kid2', { x: NX + 70 }, 18.5, 0.9, 'power1.inOut');
      [18.5, 18.8, 19.1].forEach(function (tt) { s.squash('kid2', 1.04, 0.96, tt, 0.1); s.squash('kid2', 1, 1, tt + 0.1, 0.15); });
      s.hands('kid2', 'up', 19.4, 0.3);
      flag(TEAL, NX, 19.6, NX + 70, F2 - 115, true);
      s.hands('kid2', 'side', 20.1, 0.3); s.brow('kid2', 'proud', 20.0, 0.2); s.mouth('kid2', 'smile', 20.0, 0.2);
      s.squash('kid2', 0.94, 1.08, 20.1, 0.1); s.squash('kid2', 1, 1, 20.2, 0.3, 'back.out(3)');
      s.mouth('adult2', 'smile', 20.2, 0.2);
      concl(s, 'к 4 классу числа в голове выстраиваются ровно.', 20.6);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
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
  // кит: крупное тело, хвост поднят, лопасти хвоста врозь; фонтан над головой
  function whaleD(s, g, x, y, k, st) {
    var P2 = function (a, b) { return (x + a * k).toFixed(1) + ' ' + (y + b * k).toFixed(1); };
    var d = 'M' + P2(-46, 4) + ' Q' + P2(-44, -30) + ' ' + P2(0, -32) + ' Q' + P2(50, -32) + ' ' + P2(58, 0) + ' Q' + P2(58, 22) + ' ' + P2(24, 22) + ' L' + P2(-24, 22) + ' Q' + P2(-44, 20) + ' ' + P2(-46, 4) + ' Z' +
      ' M' + P2(-45, 2) + ' Q' + P2(-62, 0) + ' ' + P2(-66, -18) + ' L' + P2(-60, -18) + ' Q' + P2(-56, -4) + ' ' + P2(-45, -6) +
      ' M' + P2(-63, -18) + ' Q' + P2(-78, -18) + ' ' + P2(-88, -30) + ' Q' + P2(-72, -34) + ' ' + P2(-63, -18) + ' Z' +
      ' M' + P2(-63, -18) + ' Q' + P2(-62, -34) + ' ' + P2(-50, -42) + ' Q' + P2(-48, -26) + ' ' + P2(-63, -18) + ' Z';
    var b = s.path(g, d, st);
    var e = s.node(g, 'circle', { cx: x + 34 * k, cy: y - 8 * k, r: 3.5 * k, fill: st.stroke });
    return [b, e];
  }
  // фонтан: струя вверх и брызги, загнутые вниз (как у фонтана), над точкой (x, y)
  function spout(s, g, x, y, k, color, w) {
    var P2 = function (a, b) { return (x + a * k).toFixed(1) + ' ' + (y + b * k).toFixed(1); };
    return s.path(g, 'M' + P2(0, 0) + ' L' + P2(0, -34) + ' M' + P2(0, -30) + ' Q' + P2(-10, -44) + ' ' + P2(-24, -32) + ' M' + P2(0, -30) + ' Q' + P2(10, -44) + ' ' + P2(24, -32), { stroke: color, 'stroke-width': w || 3 });
  }
  function catD(s, g, x, y, k) {
    s.path(g, 'M' + (x - 22 * k) + ' ' + (y - 8 * k) + ' L' + (x - 20 * k) + ' ' + (y - 34 * k) + ' L' + (x - 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 20 * k) + ' ' + (y - 34 * k) + ' L' + (x + 22 * k) + ' ' + (y - 8 * k) + ' Q' + (x + 24 * k) + ' ' + (y + 20 * k) + ' ' + x + ' ' + (y + 20 * k) + ' Q' + (x - 24 * k) + ' ' + (y + 20 * k) + ' ' + (x - 22 * k) + ' ' + (y - 8 * k) + ' Z', L(2.4, '#F5D27A'));
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 2 * k, r: 2.6 * k, fill: INK }); });
  }
  // собака: голова с висячими ушами и носом
  function dogD(s, g, x, y, k) {
    s.path(g, 'M' + (x - 18 * k) + ' ' + (y - 22 * k) + ' Q' + (x - 34 * k) + ' ' + (y - 18 * k) + ' ' + (x - 30 * k) + ' ' + (y + 8 * k) + ' Q' + (x - 22 * k) + ' ' + (y + 6 * k) + ' ' + (x - 18 * k) + ' ' + (y - 6 * k) + ' Z' +
      ' M' + (x + 18 * k) + ' ' + (y - 22 * k) + ' Q' + (x + 34 * k) + ' ' + (y - 18 * k) + ' ' + (x + 30 * k) + ' ' + (y + 8 * k) + ' Q' + (x + 22 * k) + ' ' + (y + 6 * k) + ' ' + (x + 18 * k) + ' ' + (y - 6 * k) + ' Z', L(2.4, '#B98A5E'));
    s.node(g, 'ellipse', Object.assign({ cx: x, cy: y - 2 * k, rx: 20 * k, ry: 22 * k }, L(2.4, '#E8C79A')));
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 8 * k, r: 2.6 * k, fill: INK }); });
    s.node(g, 'ellipse', { cx: x, cy: y + 8 * k, rx: 5 * k, ry: 3.6 * k, fill: INK });
  }
  // карточка 100 × 74 с картинкой (магнит на доске)
  function card(s, parent, x, y, draw) {
    var c = s.node(parent, 'g', {});
    s.node(c, 'rect', Object.assign({ x: x - 50, y: y - 37, width: 100, height: 74, rx: 8 }, L(2.2, PAPER)));
    draw(c, x, y);
    return c;
  }

  // 2:52,5 — Кит — рыба? (Л. С. Выготский, 1934)
  Film.scene({
    id: 'whale', bars: 9,
    build: function (s) {
      var g = s.svg(), F = 900;
      wall(s, g, F);
      bigBoard(s, g, 260, 300, 1040, 500);
      // класс справа: одноклассники за партами смотрят на доску
      [[1460, 8], [1640, 9], [1820, 10]].forEach(function (q) { var p = seat(s, g, q[0], F - 260, 0.6); mate(s, g, q[1], p.x, p.y, p.r); });
      var sM = seat(s, g, 1540, F, 1), sD = seat(s, g, 1800, F, 1);
      on(s, 'misha', sM.x, sM.y, 2 * sM.r, 0.1, { gx: GX, dur: 0.3 }); s.hands('baby', 'desk', 0.1, 0.01);
      on(s, 'dima', sD.x, sD.y, 2 * sD.r, 0.1, { gx: GX, dur: 0.3 }); s.hands('kid3', 'desk', 0.1, 0.01);
      // таблица мелом «рыбы | звери» в левой части доски
      var COL = { f: 380, b: 560 }, ROW = [410, 495, 580];
      var tb = s.node(g, 'g', {});
      ln(s, tb, 'M470 320 V650 M290 362 H650', 3, CHALK);
      chalk(s, tb, COL.f, 350, 'рыбы', 34); chalk(s, tb, COL.b, 350, 'звери', 34);
      fadeIn(s, tb, 0.3, 0.4);
      var ax = 330, ay = F - 55;
      on(s, 'anya', ax, ay, 110, 0.2, { gx: 6, gy: -6, brow: 'focus' });
      var TD = 130, TY = P().standY(F, TD, true);
      on(s, 'teacher', 150, TY, TD, 0.2, { gx: 8 });
      // Аня раскладывает карточки
      function put(c, to, t) {
        var fx = ax + 60 - to[0], fy = ay - 70 - to[1];
        s.tween(c, t, { opacity: 0, x: fx, y: fy, scale: 0.5, svgOrigin: to[0] + ' ' + to[1] }, { opacity: 1, x: fx, y: fy, scale: 0.5, duration: 0.12 });
        s.tween(c, t + 0.12, { x: fx, y: fy, scale: 0.5 }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.inOut' });
      }
      var ov = s.over();
      s.hands('kid2', 'up', 0.6, 0.25);
      put(card(s, ov, COL.f, ROW[0], function (c, x, y) { fishD(s, c, x + 8, y, 0.95, L(2.4, '#F5B97A')); }), [COL.f, ROW[0]], 0.7);
      put(card(s, ov, COL.b, ROW[0], function (c, x, y) { catD(s, c, x, y + 4, 0.95); }), [COL.b, ROW[0]], 1.3);
      put(card(s, ov, COL.b, ROW[1], function (c, x, y) { dogD(s, c, x, y + 4, 0.95); }), [COL.b, ROW[1]], 1.9);
      var wc = card(s, ov, COL.f, ROW[1], function (c, x, y) { whaleD(s, c, x + 12, y + 12, 0.55, L(2.2, '#BFD4E8')); spout(s, c, x + 23, y - 6, 0.55, '#5E8FB0', 2.4); });
      put(wc, [COL.f, ROW[1]], 2.5);
      s.hands('kid2', 'side', 3.1, 0.3); s.brow('kid2', 'proud', 3.0, 0.2); s.mouth('kid2', 'smile', 3.0, 0.2);
      s.squash('kid2', 0.94, 1.08, 3.0, 0.1); s.squash('kid2', 1, 1, 3.1, 0.3, 'back.out(3)');
      K().say(s, 'Он же плавает!', 306, 700, 3.1, 5.8);
      // Ирина Петровна подходит к доске и рисует мелом: рыба с жабрами под водой, кит у поверхности с фонтаном, китёнок с мамой
      var CH = { fill: 'none', stroke: CHALK, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      var TX = 1010;
      s.actor('adult2', { x: TX }, 3.6, 0.8, 'power2.inOut');
      s.gaze('adult2', -6, -8, 4.3, 0.3); s.hands('adult2', 'up', 4.4, 0.3);
      var chalkStub = s.node(ov, 'rect', { x: TX + 0.62 * TD - 4, y: TY - 0.54 * TD - 16, width: 8, height: 18, rx: 2, fill: '#FFFDF8', stroke: INK, 'stroke-width': 1.5 });
      s.tween(chalkStub, 4.6, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      s.tween(chalkStub, 9.2, { opacity: 1 }, { opacity: 0, duration: 0.15 });
      s.gaze('kid2', 10, -6, 4.2, 0.3); s.brow('kid2', 'calm', 4.2, 0.3);
      var wv = s.path(g, 'M690 452 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0', { stroke: WATER, 'stroke-width': 4 });
      s.draw(wv, 4.6, { dur: 0.5 });
      var f1 = fishD(s, g, 770, 540, 1.3, CH);
      s.draw(f1[0], 5.0, { dur: 0.7 }); fadeIn(s, f1[1], 5.5);
      var gills = s.path(g, 'M776 529 q-6 11 0 22 M784 527 q-6 13 0 26', { stroke: '#F2A39E', 'stroke-width': 3.5 });
      s.draw(gills, 5.7, { dur: 0.3 });
      var l1 = chalk(s, g, 750, 625, 'дышит в воде', 26); fadeIn(s, l1, 6.0);
      var w1 = whaleD(s, g, 975, 456, 1.0, CH);
      s.draw(w1[0], 6.4, { dur: 0.8 }); fadeIn(s, w1[1], 7.0);
      var fn = spout(s, g, 995, 424, 1.3, WATER, 4);
      s.draw(fn, 7.1, { dur: 0.4 });
      var l2 = chalk(s, g, 968, 625, 'дышит воздухом', 26); fadeIn(s, l2, 7.5);
      var w2 = whaleD(s, g, 1170, 525, 0.75, CH), w3 = whaleD(s, g, 1200, 566, 0.38, CH);
      s.draw(w2[0], 8.0, { dur: 0.6 }); s.draw(w3[0], 8.5, { dur: 0.4 }); fadeIn(s, [w2[1], w3[1]], 8.6);
      var l3 = chalk(s, g, 1192, 625, 'кормит молоком', 26); fadeIn(s, l3, 8.8);
      s.hands('adult2', 'side', 9.2, 0.3);
      s.actor('adult2', { x: 150 }, 9.4, 0.8, 'power2.inOut'); s.gaze('adult2', 8, -2, 9.4, 0.3);
      hudText(s, 'lead', 'Рыбы дышат в воде жабрами. Кит дышит воздухом и кормит детёнышей молоком — значит, он зверь.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 4.4, 11.6);
      // Аня сама переносит кита к зверям
      s.gaze('kid2', 6, -8, 10.0, 0.2); s.hands('kid2', 'up', 10.1, 0.25); s.brow('kid2', 'focus', 10.0, 0.2); s.mouth('kid2', 'soft', 10.0, 0.2);
      s.tween(wc, 10.3, { x: 0, y: 0 }, { x: COL.b - COL.f, y: ROW[2] - ROW[1], duration: 0.9, ease: 'power2.inOut' });
      s.hands('kid2', 'side', 11.2, 0.3); s.brow('kid2', 'proud', 11.2, 0.2); s.mouth('kid2', 'smile', 11.2, 0.2);
      s.squash('kid2', 0.94, 1.08, 11.3, 0.1); s.squash('kid2', 1, 1, 11.4, 0.3, 'back.out(3)');
      s.mouth('adult2', 'smile', 11.3, 0.2);
      hudText(s, 'lead', 'Житейское понятие ребёнок собирает из опыта — по виду. Научное получает готовым определением — в школе.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 11.8);
      s.gaze('kid2', -4, -6, 14.0, 0.4); s.gaze('baby', GX, -6, 15.0, 0.4);
      concl(s, 'в школе учатся судить по признакам, а не по тому, как вещь выглядит.', 18.2);
      cite(s, 'Л. С. Выготский, «Мышление и речь», 1934, гл. 6 · scientific concepts · даже из 10–15-летних лишь треть знает, что дельфин дышит лёгкими (М. Кубятко, П. Прокоп, 2009)', 18.8);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });
})();
