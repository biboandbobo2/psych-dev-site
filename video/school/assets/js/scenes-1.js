/* Глава 1 (v3.2, «Язык 7–10»). Новое место · Миша: три дорожки (заставка), первое сентября (Эльконин), мерка (Давыдов),
   а игра? (Эльконин; Пиаже; Блэтчфорд), родительский чат. Места — только Film.places. */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', STICK = '#8B6A45', RED = '#D9534F', CASE = '#2B8F84', KID_INK = '#2E3B4E';
  var CH = 90; // длина главы 1, с
  // Класс главы: пол выше обычного (низ кадра — для вывода); 4 + 4 места
  var FLOOR = 900, ROWS = [{ floor: FLOOR, k: 1, xs: [940, 1200, 1460, 1720] }, { floor: FLOOR - 190, k: 0.72, xs: [1030, 1250, 1470, 1690] }];

  // ---------- Локальные помощники ----------
  function vis(s, e, t0, t1, d) {
    s.tween(e, t0, { opacity: 0 }, { opacity: 1, duration: d == null ? 0.3 : d });
    if (t1 != null) s.out(e, t1, { dur: d == null ? 0.3 : d });
  }
  // текст поверх кадра, который камера не двигает (слой #ui): появляется строками и гаснет в out
  function hudLines(s, cls, html, st, at, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, at, { opacity: 0 }, { opacity: 1, duration: 0.01 });
    s.lines(e, at);
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function verdict(s, html, at, hud) {
    var st = { left: 140, top: 912, width: 1640, fontSize: 32, lineHeight: 1.3 }, h = '<b class="acc">Вывод:</b> ' + html;
    if (hud) return hudLines(s, 'lead', h, st, at);
    var e = s.text('lead', h, st); s.lines(e, at); return e;
  }
  function small(s, text, at, top, hud, width) {
    var st = { left: 140, top: top || 1030, width: width || 1640, fontSize: 20 };
    var e = hud ? s.hud('cite', text, st) : s.text('cite', text, st);
    s.tween(e, at, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.6 });
    if (hud) s.tween(e, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function off(s, ids, t) { ids.forEach(function (id) { s.actor(id, { o: 0 }, t, 0.3); s.hands(id, 'off', t + 0.3, 0.01); s.brow(id, 'calm', t + 0.3, 0.01); }); }
  // Врезка «крупно тетрадь» поверх кадра (слой #ui): лист в клетку с ровной красной линией поля. Возвращает svg врезки
  function inset(s, x, y, w, h, at, out, o) {
    o = o || {};
    var e = s.hud('', '', { left: x, top: y, width: w, height: h });
    Film.css(e, { borderRadius: '14px', overflow: 'hidden', boxShadow: '0 22px 45px -24px rgba(17, 24, 39, 0.45)', border: '3px solid ' + INK });
    var sv = Film.svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h }, e);
    P().page(s, sv, -2, -2, w + 4, h + 4, { cell: o.cell || 40, margin: o.margin || 160 });
    s.tween(e, at, { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
    s.tween(e, out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return sv;
  }
  // Красная ручка учителя во врезке: едет к точке (x, y) — кончик внизу слева
  function pen(s, sv, x0, y0) {
    var p = s.node(sv, 'g', {});
    s.node(p, 'rect', { x: 0, y: -7, width: 150, height: 14, rx: 6, fill: RED, stroke: INK, 'stroke-width': 2 });
    s.path(p, 'M0 -7 L-18 0 L0 7', { fill: '#F3D9C4', stroke: INK, 'stroke-width': 2 });
    s.set(p, 0, { x: x0, y: y0, rotation: -35, transformOrigin: '0% 50%', opacity: 0 }, { x: x0, y: y0, rotation: -35, transformOrigin: '0% 50%', opacity: 0 });
    return p;
  }
  // Кривые палочки прописи (почерк первоклассника); возвращает пути
  function sticks(s, g, x, y, n, step, h, sw) {
    var tilt = [-7, 9, -3, 14, 2, -10, 7, -4], out = [];
    for (var i = 0; i < n; i++) {
      var sx = x + i * step, t = tilt[i % tilt.length] * h / 140;
      out.push(s.path(g, 'M' + sx + ' ' + y + ' Q' + (sx + t) + ' ' + (y + h * 0.5) + ' ' + (sx - t * 0.6) + ' ' + (y + h * (0.94 + (i % 3) * 0.05)), { stroke: KID_INK, 'stroke-width': sw || 6 }));
    }
    return out;
  }
  // Пенал на парте: (x, y) — левый нижний угол
  function pencilCase(s, g, x, y, w) {
    var c = s.node(g, 'g', {});
    s.node(c, 'rect', { x: x, y: y - 22, width: w, height: 22, rx: 10, fill: CASE, stroke: INK, 'stroke-width': 2.4 });
    s.path(c, 'M' + (x + 10) + ' ' + (y - 15) + ' H' + (x + w - 10), { stroke: '#F5D27A', 'stroke-width': 2.4, 'stroke-dasharray': '4 4' });
    return c;
  }
  // Облачко с вопросом над одноклассником
  function askCloud(s, g, x, y, at, out) {
    var c = s.node(g, 'g', {});
    s.path(c, 'M' + (x - 34) + ' ' + (y + 16) + ' q-12 -22 10 -28 q4 -20 26 -14 q14 -12 28 4 q20 0 16 22 q6 16 -12 16 Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 2.4 });
    s.node(c, 'circle', { cx: x - 22, cy: y + 30, r: 4, fill: '#FFFDF8', stroke: INK, 'stroke-width': 2 });
    var q = s.node(c, 'text', { x: x + 2, y: y + 10, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--sans); font-weight: 800; font-size: 30px' });
    q.textContent = '?';
    s.tween(c, at, { opacity: 0, scale: 0.5, transformOrigin: '30% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    s.out(c, out, { dur: 0.3 });
    return c;
  }
  // Одноклассники по местам — каждый в своей группе (чтобы потом уйти на перемену)
  function seatKids(s, g, seats, skip, gx) {
    var kids = [], n = 0;
    seats.forEach(function (row, ri) { row.forEach(function (p, pi) {
      if (skip.indexOf(ri + ':' + pi) >= 0) return;
      var kg = s.node(g, 'g', {});
      K().classmate(kg, n++, p.x, p.y, p.r, { gx: gx == null ? -6 : gx });
      kids.push({ g: kg, x: p.x, y: p.y, r: p.r, row: ri });
    }); });
    return kids;
  }
  function seatOf(cr, key) { var q = key.split(':'); return cr.seats[+q[0]][+q[1]]; }

  // ---------- 0:35 — Три дорожки: утро, трое выходят из домов и идут к двери одной школы (заставка главы 1) ----------
  function bez(p, u) {
    var a = (1 - u) * (1 - u) * (1 - u), b = 3 * (1 - u) * (1 - u) * u, c = 3 * (1 - u) * u * u, d = u * u * u;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  }
  Film.scene({
    id: 'ch1', bars: 3,
    build: function (s) {
      var g = s.svg(), M = P().paths(s, g, { ground: 600 }), door = M.door;
      s.chapterCard(1, 'Новое место', 'Миша хочет, чтобы его хвалили, как дома');
      s.chapter(1, 'Новое место', 0.4, CH - 0.6);
      // дорожка Миши прорисовывается за ним — герой главы
      var trail = s.path(g, M.paths.misha.d, { stroke: '#E4735A', 'stroke-width': 7, opacity: 0.55 });
      s.draw(trail, 0.9, { dur: 5.7, ease: 'none' });
      // мама машет Мише у двери дома
      var mh = M.paths.misha.home;
      K().cast(s, 'mom', mh[0] + 44, mh[1] - 50, 100, 0.3, { gx: 8, gy: -2 });
      s.brow('adult', 'calm', 0.3, 0.01);
      [0.9, 1.7, 2.5].forEach(function (t) { s.hands('adult', 'up', t, 0.25); s.hands('adult', 'side', t + 0.4, 0.25); });
      s.hands('adult', 'off', 3.3, 0.3);
      s.actor('adult', { o: 0 }, 6.6, 0.4);
      var who = [['misha', 'baby', 0.6, 6.9, 92], ['anya', 'kid2', 0.8, 6.3, 74], ['dima', 'kid3', 1.0, 5.7, 56]];
      who.forEach(function (w) {
        var q = M.paths[w[0]], P0 = q.start, pts = [P0, [P0[0] + 420, P0[1]], [door[0] - 360, door[1] + 10], [door[0], door[1] + 6]];
        var d0 = w[4], u0 = w[0] === 'misha' ? 0.1 : 0.04, p0 = bez(pts, u0);
        K().cast(s, w[0], p0[0], p0[1] - d0 / 2, d0, w[2], { gx: 8, gy: -2, dur: 0.35 });
        s.brow(w[1], 'calm', w[2], 0.01);
        var N = 14, t = w[2] + 0.35, dt = (w[3] - t) / N;
        for (var i = 1; i <= N; i++) {
          var u = u0 + (1 - u0) * i / N, p = bez(pts, u), d = d0 * (1 - 0.5 * u);
          s.squash(w[1], 1.05, 0.95, t, 0.08);
          s.actor(w[1], { x: p[0], y: p[1] - d / 2, d: d }, t + 0.06, dt - 0.06, 'sine.inOut');
          s.squash(w[1], 1, 1, t + 0.08, 0.15);
          t += dt;
        }
        s.actor(w[1], { o: 0 }, w[3], 0.35); // вошёл в дверь школы
      });
    }
  });

  // ---------- 0:42,5 — Первое сентября (Д. Б. Эльконин): дома любят — в школе оценивают ----------
  Film.scene({
    id: 'firstday', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 3.8, T3 = 6.4;
      // --- кадр 1: вечер накануне, дома: Миша показывает маме пропись, мама обнимает ---
      var f1 = s.node(g, 'g', {}), kc = P().kitchen(s, f1, { tableX: 1300 });
      s.node(f1, 'rect', { x: 1382, y: 232, width: 276, height: 236, fill: '#3B5068', opacity: 0.85 }); // за окном вечер
      s.node(f1, 'circle', { cx: 1600, cy: 290, r: 20, fill: '#F5E6A8' });
      s.path(f1, 'M1520 230 V470 M1380 350 H1660', { stroke: INK, 'stroke-width': 2.4 });
      vis(s, f1, 0, T2, 0.01);
      var MOMY = P().standY(kc.floor, 220, false), MY = kc.floor - 55;
      K().cast(s, 'mom', 560, MOMY, 220, 0.1, { gx: 8, gy: 2 });
      K().cast(s, 'misha', 880, MY, 110, 0.1, { gx: -8, gy: -2 });
      s.brow('adult', 'calm', 0.1, 0.01); s.brow('baby', 'proud', 0.1, 0.01);
      s.hands('baby', 'hold', 0.2, 0.25);
      var pr = s.node(ov, 'g', {});
      P().page(s, pr, 700, 790, 120, 84, { cell: 14, margin: 28 });
      sticks(s, pr, 712, 800, 5, 14, 56, 3);
      vis(s, pr, 0.25, 1.15, 0.25);
      K().say(s, 'Какой молодец!', 400, 560, 0.5, 2.9, 'r');
      s.actor('adult', { x: 680 }, 1.2, 0.5, 'power2.out'); // мама обнимает
      s.hands('adult', 'hold', 1.3, 0.3);
      s.hands('baby', 'side', 1.2, 0.3);
      s.squash('adult', 1.06, 0.95, 1.5, 0.15); s.squash('adult', 1, 1, 1.65, 0.4, 'back.out(3)');
      s.squash('baby', 0.95, 1.06, 1.55, 0.12); s.squash('baby', 1, 1, 1.67, 0.3, 'back.out(3)');
      s.mouth('baby', 'smile', 1.5, 0.2); s.gaze('baby', -6, -4, 1.5, 0.3);
      hudLines(s, 'h3', 'Дома любят за то, что ты есть.', { left: 140, top: 122, width: 1000, fontSize: 42 }, 2.3);
      off(s, ['adult', 'baby'], T2 - 0.3);
      // --- кадр 2: класс сбоку — доска слева перед детьми, Ирина Петровна у доски; Миша садится рядом с Аней, Дима один ---
      var f2 = s.node(g, 'g', {}), cr = P().classroom(s, f2, { floor: FLOOR, rows: ROWS, boardText: '1 сентября' });
      seatKids(s, f2, cr.seats, ['0:0', '0:1', '0:2', '0:3'], -6);
      vis(s, f2, T2, null, 0.4);
      var sm = seatOf(cr, '0:0'), sa = seatOf(cr, '0:1'), sd = seatOf(cr, '0:3');
      var TX = 665, TY = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TY, 150, T2 + 0.1, { gx: 6, gy: 0 });
      s.brow('adult2', 'calm', T2, 0.01); s.hands('adult2', 'side', T2 + 0.1, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, T2 + 0.1, { gx: -6 });
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, T2 + 0.1, { gx: -6, mouth: 'soft' });
      s.hands('kid2', 'desk', T2 + 0.1, 0.01); s.hands('kid3', 'desk', T2 + 0.1, 0.01);
      s.actor('baby', { x: sm.x, y: sm.y - 60, d: sm.r * 2, o: 0 }, T2 + 0.2, 0.01); s.gaze('baby', -6, -2, T2 + 0.2, 0.01);
      s.mouth('baby', 'smile', T2 + 0.2, 0.01); s.brow('baby', 'calm', T2 + 0.2, 0.01);
      s.actor('baby', { o: 1 }, T2 + 0.35, 0.3);
      s.actor('baby', { y: sm.y }, T2 + 0.7, 0.35, 'power2.in'); // садится
      s.squash('baby', 1.1, 0.9, T2 + 1.05, 0.1); s.squash('baby', 1, 1, T2 + 1.15, 0.3, 'back.out(3)');
      s.gaze('baby', 6, 0, T2 + 1.3, 0.25); s.gaze('kid2', -8, 0, T2 + 1.35, 0.25); // переглянулись с Аней
      s.gaze('baby', -6, -2, T2 + 2.0, 0.3); s.gaze('kid2', -6, 0, T2 + 2.0, 0.3);
      s.hands('baby', 'desk', T2 + 1.3, 0.25);
      K().tag(s, 'Ирина Петровна', TX, FLOOR + 14, T2 + 0.5, T3 - 0.3);
      K().tag(s, 'Аня', sa.x, FLOOR + 14, T2 + 0.8, T3 - 0.3); K().tag(s, 'Дима', sd.x, FLOOR + 14, T2 + 0.8, T3 - 0.3);
      // --- кадр 3: наезд на Мишу; крупно тетрадь (врезка): ручка учителя подчёркивает кривую палочку и ставит «3» в поле ---
      // (без наезда: при увеличении в верх кадра попадают доска и окно — под подписи нет места)
      s.gaze('adult2', 8, 4, T3 + 1.2, 0.3);
      s.brow('adult2', 'focus', T3 + 1.4, 0.3);
      var IX = 1300, IY = 160, IW = 560, IH = 400, sv = inset(s, IX, IY, IW, IH, T3 + 0.5, s.dur - 0.5, { cell: 40, margin: 120 });
      var row = sticks(s, sv, 60, 110, 5, 76, 150, 7);
      void row;
      var pn = pen(s, sv, 700, 470);
      s.tween(pn, T3 + 1.5, { opacity: 0, x: 560, y: 470 }, { opacity: 1, x: 260, y: 290, duration: 0.5, ease: 'power2.out' });
      var bad = 60 + 3 * 76, under = s.path(sv, 'M' + (bad - 34) + ' 290 H' + (bad + 40), { stroke: RED, 'stroke-width': 6 });
      s.draw(under, T3 + 2.05, { dur: 0.35 });
      s.tween(pn, T3 + 2.05, { x: 254 }, { x: 330, duration: 0.35, ease: 'power1.inOut' });
      s.tween(pn, T3 + 2.45, { x: 330, y: 290 }, { x: 520, y: 250, duration: 0.35, ease: 'power2.inOut' });
      var three = s.node(sv, 'text', { x: IW - 60, y: 250, 'text-anchor': 'middle', fill: RED, style: 'font-family: var(--hand); font-size: 150px' });
      three.textContent = '3';
      s.tween(three, T3 + 2.85, { opacity: 0, scale: 0.4, transformOrigin: '50% 70%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      s.out(pn, T3 + 3.2, { dur: 0.3 });
      s.brow('baby', 'sad', T3 + 3.0, 0.4); s.mouth('baby', 'flat', T3 + 3.0, 0.4); s.gaze('baby', 2, 6, T3 + 3.0, 0.4);
      hudLines(s, 'h3', 'В школе оценивают, что ты сделал.', { left: 140, top: 178, width: 1100, fontSize: 42 }, T3 + 3.0);
      // облачко над Мишей: мама его обнимает — он вспоминает и успокаивается
      var cx = 836, cy = 556, cg = s.node(ov, 'g', {});
      Film.icons.cloud(s, cg, cx, cy, 100, 64, { at: T3 + 3.9, dur: 0.7, seed: 4, tail: [sm.x + 10, sm.y - sm.r] });
      var hug = s.node(ov, 'g', {});
      Film.head(hug, cx - 18, cy + 2, 37, '#385771', null, { mouth: 'smile', gx: 6 });
      Film.head(hug, cx + 28, cy + 16, 23, '#E4735A', null, { mouth: 'smile', gx: -6 });
      s.node(hug, 'circle', { cx: cx + 20, cy: cy + 33, r: 8, fill: '#304B61' });
      s.tween(hug, T3 + 4.4, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.brow('baby', 'calm', T3 + 5.0, 0.5); s.mouth('baby', 'soft', T3 + 5.0, 0.5); s.gaze('baby', 0, -4, T3 + 5.0, 0.4);
      s.squash('baby', 1.03, 0.97, T3 + 5.2, 0.6); s.squash('baby', 1, 1, T3 + 5.8, 0.6);
      verdict(s, 'появляется новый взрослый — учитель. Его оценка первая, которая не про любовь.', T3 + 5.2, true);
      small(s, 'Д. Б. Эльконин: учитель — первый общественный взрослый в жизни ребёнка', T3 + 6.4, 1030, true);
      off(s, ['baby', 'kid2', 'kid3', 'adult2'], s.dur - 0.45);
    }
  });

  // ---------- 1:00 — Мерка (В. В. Давыдов): ленты не приложить друг к другу — палочка становится меркой ----------
  Film.scene({
    id: 'merka', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var rows = [{ floor: FLOOR, k: 1, xs: [940, 1200, 1460] }, { floor: FLOOR - 190, k: 0.72, xs: [1030, 1250, 1470] }];
      var cr = P().classroom(s, g, { floor: FLOOR, rows: rows });
      seatKids(s, g, cr.seats, ['0:0', '0:1', '1:2'], -6);
      var sm = seatOf(cr, '0:0'), sa = seatOf(cr, '0:1'), sd = seatOf(cr, '1:2');
      // две ленты на разных стенах: под доской и у окна
      var M = 90, RYB = 780, RA = { x: 170, n: 3, c: '#4F7CAC' }, RB = { x: 1530, n: 4, c: '#E0A93B' };
      [RA, RB].forEach(function (r, i) {
        var e = s.node(g, 'rect', { x: r.x, y: RYB - 7, width: r.n * M, height: 14, rx: 3, fill: r.c });
        s.grow(e, 0.3 + i * 0.3, { dur: 0.5 });
        [r.x + 6, r.x + r.n * M - 6].forEach(function (px) { var pin = s.node(g, 'circle', { cx: px, cy: RYB, r: 4, fill: INK }); s.fade(pin, 0.6 + i * 0.3, { y: 0 }); });
      });
      var pc = s.node(g, 'g', {}); pencilCase(s, pc, sm.desk.x1 + 20, sm.desk.y, 86);
      var TX = 665, TY = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TY, 150, 0.1, { gx: 6, gy: 0 }); s.brow('adult2', 'calm', 0.1, 0.01); s.hands('adult2', 'side', 0.1, 0.01);
      K().cast(s, 'misha', sm.x, sm.y, sm.r * 2, 0.1, { gx: -6 }); s.brow('baby', 'calm', 0.1, 0.01); s.hands('baby', 'desk', 0.1, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, 0.1, { gx: -6 }); s.brow('kid2', 'calm', 0.1, 0.01); s.hands('kid2', 'desk', 0.1, 0.01);
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, 0.1, { gx: -6, mouth: 'soft' });
      // кадр 1: загадка Ирины Петровны классу
      K().say(s, 'Как узнать, какая лента длиннее,<br>если их нельзя приложить друг к другу?', 640, 330, 0.5, 6.6);
      s.squash('adult2', 1.03, 0.97, 0.6, 0.2); s.squash('adult2', 1, 1, 0.8, 0.3);
      var kidsQ = [[1060, 520, 1.5], [1280, 520, 1.9], [1500, 520, 2.3]];
      kidsQ.forEach(function (q) { askCloud(s, ov, q[0], q[1], q[2], 5.2); });
      s.brow('kid2', 'focus', 1.7, 0.3); s.gaze('kid2', -4, -6, 1.7, 0.3);
      // у Миши в облачке — схема: палочка, уложенная по ленте, | | |
      s.brow('baby', 'focus', 2.6, 0.3); s.gaze('baby', -6, -6, 2.6, 0.3);
      var mc = s.node(ov, 'g', {}), CX = 830, CY = 600;
      Film.icons.cloud(s, mc, CX, CY, 92, 54, { at: 2.8, dur: 0.7, seed: 6, tail: [sm.x - 20, sm.y - sm.r] });
      var sch = s.node(ov, 'g', {});
      s.path(sch, 'M' + (CX - 66) + ' ' + (CY + 8) + ' H' + (CX + 66), { stroke: RA.c, 'stroke-width': 8 });
      var sst = s.path(sch, 'M' + (CX - 66) + ' ' + (CY - 4) + ' H' + (CX - 22), { stroke: STICK, 'stroke-width': 6 });
      s.tween(sch, 3.4, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.tween(sst, 3.8, { x: 0 }, { x: 44, duration: 0.3, ease: 'power2.inOut' });
      s.tween(sst, 4.2, { x: 44 }, { x: 88, duration: 0.3, ease: 'power2.inOut' });
      [-22, 22, 66].forEach(function (dx, i) { var tk = s.path(sch, 'M' + (CX + dx) + ' ' + (CY - 14) + ' v30', { stroke: INK, 'stroke-width': 3 }); s.draw(tk, 3.7 + i * 0.4, { dur: 0.1 }); });
      s.out([mc, sch], 5.4, { dur: 0.3 });
      // кадр 2: Миша поднимает руку, выходит, достаёт палочку из пенала и меряет обе ленты
      s.hands('baby', 'up', 4.6, 0.35); s.brow('baby', 'proud', 4.6, 0.3);
      s.gaze('adult2', 9, 2, 4.9, 0.3); s.squash('adult2', 1.03, 0.96, 5.1, 0.15); s.squash('adult2', 1, 1, 5.25, 0.3); // кивает
      var STY = RYB - 9, HY = 846 + 22; // палочка на ленте; в руке
      var stick = s.node(ov, 'g', {});
      s.path(stick, 'M0 0 H' + M, { stroke: STICK, 'stroke-width': 9 });
      s.set(stick, 0, { x: sm.desk.x1 + 18, y: sm.desk.y - 32, opacity: 0 }, { x: sm.desk.x1 + 18, y: sm.desk.y - 32, opacity: 0 });
      s.tween(stick, 5.5, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.hands('baby', 'hold', 5.5, 0.25);
      s.brow('baby', 'focus', 5.6, 0.3);
      var x0 = 860, pos = { x: sm.desk.x1 + 18, y: sm.desk.y - 32 };
      s.hop('baby', x0, 846, 5.7, 0.4, 30);
      s.tween(stick, 5.8, { x: pos.x, y: pos.y }, { x: x0 + 20, y: HY, duration: 0.4, ease: 'power2.inOut' }); pos = { x: x0 + 20, y: HY };
      function go(x, lt, dur) { // идёт ровными шагами, палочка в руке
        var n = Math.max(2, Math.round(Math.abs(x - s.A.baby.st.x) / 150)), dx = (x - s.A.baby.st.x) / n, d = dur / n;
        if (x < s.A.baby.st.x) s.gaze('baby', -8, -2, lt, 0.2); else s.gaze('baby', 8, -2, lt, 0.2);
        for (var i = 0; i < n; i++) { s.squash('baby', 1.05, 0.95, lt + i * d, 0.06); s.actor('baby', { x: s.A.baby.st.x + dx }, lt + i * d + 0.04, d - 0.04, 'sine.inOut'); s.squash('baby', 1, 1, lt + i * d + 0.06, 0.12); }
        s.tween(stick, lt, { x: pos.x, y: pos.y }, { x: x + 20, y: HY, duration: dur, ease: 'none' }); pos = { x: x + 20, y: HY };
      }
      function measure(r, lt, step, rowY) { // палочка шаг за шагом по ленте; во врезке-тетради — черта за каждый шаг
        s.hands('baby', 'up', lt - 0.25, 0.25); s.gaze('baby', 6, -8, lt - 0.25, 0.2);
        for (var j = 0; j < r.n; j++) {
          var t = lt + j * step, sx = r.x + j * M;
          s.tween(stick, t, { x: pos.x, y: pos.y }, { x: sx, y: STY, duration: step * 0.6, ease: 'power2.inOut' }); pos = { x: sx, y: STY };
          if (j) s.actor('baby', { x: sx + M / 2 - 76 }, t, step * 0.6, 'power2.inOut');
          var tk = s.path(ov, 'M' + (sx + M) + ' ' + (RYB - 22) + ' v30', { stroke: INK, 'stroke-width': 3 });
          s.draw(tk, t + step * 0.6, { dur: 0.08 });
          var mk = s.path(nb, 'M' + (130 + j * 30) + ' ' + (rowY - 26) + ' v52', { stroke: KID_INK, 'stroke-width': 6 });
          s.draw(mk, t + step * 0.62, { dur: 0.1 });
        }
        s.hands('baby', 'hold', lt + r.n * step, 0.2);
        s.tween(stick, lt + r.n * step, { x: pos.x, y: pos.y }, { x: s.A.baby.st.x + 20, y: HY, duration: 0.2 }); pos = { x: s.A.baby.st.x + 20, y: HY };
      }
      // врезка-тетрадь Миши: строка ленты А и строка ленты Б
      var IX = 1300, IY = 160, IW = 560, IH = 400, nb = inset(s, IX, IY, IW, IH, 6.7, s.dur - 0.5, { cell: 40, margin: 120 });
      [[RA, 140], [RB, 280]].forEach(function (q) { s.node(nb, 'rect', { x: 40, y: q[1] - 6, width: 56, height: 12, rx: 3, fill: q[0].c }); });
      go(RA.x + M / 2 - 76, 6.1, 0.9);
      measure(RA, 7.25, 0.42, 140);
      go(RB.x + M / 2 - 76, 8.6, 1.3);
      measure(RB, 10.15, 0.38, 280);
      K().say(s, 'Вторая!', 1500, 640, 11.7, 13.4, 'r');
      s.mouth('baby', 'smile', 11.7, 0.2); s.gaze('baby', -6, -2, 11.7, 0.2);
      var rule = s.text('h3', 'Длиннее та, по которой мерка уложилась больше раз. Так палочка становится числом.', { left: 140, top: 124, width: 1120, fontSize: 40 });
      s.lines(rule, 11.4);
      // кадр 3: Ирина Петровна хвалит и ставит «5» — линия Миши закрыта
      s.mouth('adult2', 'smile', 12.2, 0.3); s.gaze('adult2', 9, 0, 12.2, 0.3); s.squash('adult2', 1.03, 0.96, 12.5, 0.15); s.squash('adult2', 1, 1, 12.65, 0.3);
      var pn = pen(s, nb, 520, 380);
      s.tween(pn, 12.6, { opacity: 0, x: 520, y: 380 }, { opacity: 1, x: IW - 60, y: 270, duration: 0.4, ease: 'power2.out' });
      var five = s.node(nb, 'text', { x: IW - 60, y: 250, 'text-anchor': 'middle', fill: RED, style: 'font-family: var(--hand); font-size: 130px' });
      five.textContent = '5';
      s.tween(five, 13.1, { opacity: 0, scale: 0.4, transformOrigin: '50% 70%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      s.out(pn, 13.4, { dur: 0.3 });
      s.hands('baby', 'off', 13.2, 0.2); s.out(stick, 13.2, { dur: 0.25 });
      s.brow('baby', 'proud', 13.3, 0.3); s.gaze('baby', -8, -4, 13.3, 0.2);
      s.hop('baby', s.A.baby.st.x, 846, 13.6, 0.4, 40);
      s.hands('adult2', 'side', 14.2, 0.3);
      verdict(s, 'в школе учат не готовому ответу, а способу его найти. Это <b class="acc">учебная деятельность</b> — главное занятие возраста.', 13.2);
      small(s, 'learning activity · В. В. Давыдов, «Виды обобщения в обучении», 1972 · независимых сравнений системы почти нет', 14.5);
      off(s, ['baby', 'kid2', 'kid3', 'adult2'], s.dur - 0.45);
    }
  });

  // ---------- 1:20 — А игра? (Д. Б. Эльконин, 1971; Ж. Пиаже, 1932; П. Блэтчфорд и др., 2003) ----------
  Film.scene({
    id: 'play', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 4.4, TY2 = 7.4, T3 = 10.2;
      // --- кадр 1: урок; из ранца под партой выглядывает лошадка (целиком), Аня прячет улыбку ---
      var f1 = s.node(g, 'g', {}), cr = P().classroom(s, f1, { floor: FLOOR, rows: ROWS });
      // дверь класса справа — на перемену все выходят в неё
      var DX = 1800, dr = s.node(f1, 'g', {});
      s.node(dr, 'rect', { x: DX, y: FLOOR - 230, width: 100, height: 230, rx: 4, fill: '#F3EBDD', stroke: INK, 'stroke-width': 2.6 });
      s.node(dr, 'circle', { cx: DX + 18, cy: FLOOR - 112, r: 5, fill: INK });
      // школьный звонок на стене над дверью
      s.path(f1, 'M' + (DX + 50) + ' ' + (FLOOR - 250) + ' V' + (FLOOR - 270), { stroke: INK, 'stroke-width': 2.6 });
      var bell = s.node(f1, 'g', {});
      s.path(bell, 'M' + (DX + 32) + ' ' + (FLOOR - 270) + ' Q' + (DX + 32) + ' ' + (FLOOR - 312) + ' ' + (DX + 50) + ' ' + (FLOOR - 312) + ' Q' + (DX + 68) + ' ' + (FLOOR - 312) + ' ' + (DX + 68) + ' ' + (FLOOR - 270) + ' Z', { fill: '#F5D27A', stroke: INK, 'stroke-width': 2.4 });
      s.node(bell, 'circle', { cx: DX + 50, cy: FLOOR - 266, r: 5, fill: INK });
      var kids = seatKids(s, f1, cr.seats, ['0:0', '0:1', '0:3'], -6);
      vis(s, f1, 0, null, 0.01); s.out(f1, TY2, { dur: 0.3 });
      var sm = seatOf(cr, '0:0'), sa = seatOf(cr, '0:1'), sd = seatOf(cr, '0:3');
      var TX = 665, TYc = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TYc, 150, 0.05, { gx: 6 }); s.brow('adult2', 'calm', 0.05, 0.01); s.hands('adult2', 'side', 0.05, 0.01);
      K().cast(s, 'misha', sm.x, sm.y, sm.r * 2, 0.05, { gx: -6 }); s.brow('baby', 'calm', 0.05, 0.01); s.hands('baby', 'desk', 0.05, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, 0.05, { gx: -6 }); s.brow('kid2', 'calm', 0.05, 0.01); s.hands('kid2', 'desk', 0.05, 0.01);
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, 0.05, { gx: -6, mouth: 'soft' }); s.hands('kid3', 'desk', 0.05, 0.01);
      // ранец Миши стоит под партой (ранец-примету на спине пока прячем)
      var bpAcc = s.acc('baby', 'backpack');
      s.tween(bpAcc, 0, { opacity: 1 }, { opacity: 0, duration: 0.01 });
      var BX = (sm.desk.x1 + sm.desk.x2) / 2, BY = FLOOR - 32;
      var toy = s.node(g, 'g', {});
      K().toyHorse(s, toy, BX, BY - 32, 0.5);
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, BX, BY, 0.8, '#26A69A', '#1C7A71');
      s.tween(toy, 0, { y: 54 }, { y: 54, duration: 0.01 });
      s.tween(toy, 1.6, { y: 54 }, { y: 0, duration: 0.6, ease: 'back.out(1.6)' }); // выглядывает и встаёт на ранец
      hudLines(s, 'h3', 'Если главным стала учёба, куда делась игра?', { left: 140, top: 130, width: 1500 }, 0.3, TY2 - 0.4);
      s.gaze('baby', -4, 6, 2.0, 0.3);
      s.gaze('kid2', -9, 6, 2.5, 0.3); s.mouth('kid2', 'smile', 2.7, 0.2);
      s.gaze('baby', 6, 0, 3.0, 0.25);
      s.mouth('kid2', 'soft', 3.6, 0.3); s.gaze('kid2', -6, 0, 3.8, 0.3); s.gaze('baby', -6, -2, 3.8, 0.3); // прячет улыбку
      // --- кадр 2: звонок; все выходят из класса в одну сторону — к двери ---
      s.tween(bell, T2, { rotation: 0, transformOrigin: '50% 0%' }, { rotation: 16, duration: 0.08, repeat: 11, yoyo: true });
      [0, 1].forEach(function (i) { // звук звонка — дуги по бокам
        var a = s.path(f1, 'M' + (DX + 50 + (i ? 34 : -34)) + ' ' + (FLOOR - 296) + ' q' + (i ? 10 : -10) + ' 14 0 28', { stroke: INK, 'stroke-width': 2.4 });
        s.tween(a, T2, { opacity: 0 }, { opacity: 1, duration: 0.15, repeat: 5, yoyo: true });
        s.set(a, T2 + 0.9, { opacity: 1 }, { opacity: 0 });
      });
      s.tween(toy, T2 + 0.4, { y: 0 }, { y: 54, duration: 0.3, ease: 'power2.in' }); // лошадку — обратно в ранец
      s.out(bp, T2 + 0.9, { dur: 0.25 }); s.out(toy, T2 + 0.9, { dur: 0.01 });
      s.tween(bpAcc, T2 + 0.9, { opacity: 0 }, { opacity: 1, duration: 0.25 }); // ранец — на спину
      s.hands('baby', 'off', T2 + 0.9, 0.2); s.hands('kid2', 'off', T2 + 0.9, 0.2); s.hands('kid3', 'off', T2 + 0.9, 0.2);
      // одноклассники: встают и выходят в дверь, от ближних к двери — к дальним
      var EXIT = DX + 50;
      kids.slice().sort(function (a, b) { return b.x - a.x; }).forEach(function (k, i) {
        var t = T2 + 0.8 + i * 0.15, dx = EXIT - k.x;
        s.tween(k.g, t, { x: 0 }, { x: dx, duration: 1.0 + dx / 1600, ease: 'power1.in' });
        s.tween(k.g, t, { y: 0 }, { y: -10, duration: 0.14, repeat: Math.round((1.0 + dx / 1600) / 0.14) | 1, yoyo: true, ease: 'sine.inOut' });
        s.tween(k.g, t + 0.75 + dx / 1600, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      });
      [['kid3', sd, 0.2], ['kid2', sa, 0.45], ['baby', sm, 0.7]].forEach(function (q) {
        var id = q[0], t = T2 + 0.8 + q[2];
        s.gaze(id, 8, 0, t, 0.2);
        s.hop(id, q[1].x + 30, FLOOR - q[1].r, t, 0.35, 26);
        s.actor(id, { x: EXIT }, t + 0.5, (EXIT - q[1].x) / 900, 'power1.in');
        s.actor(id, { o: 0 }, t + 0.4 + (EXIT - q[1].x) / 900, 0.3);
      });
      s.gaze('adult2', 8, 0, T2 + 1.0, 0.3);
      s.actor('adult2', { o: 0 }, TY2 - 0.4, 0.3); s.hands('adult2', 'off', TY2 - 0.1, 0.01);
      // --- двор: из двери школы выходят дети; Миша и Аня играют лошадкой — над ней проступает рисованный слой 3–7 ---
      var f3 = s.node(g, 'g', {}), Y = P().yard(s, f3, { ground: 600 });
      vis(s, f3, TY2, null, 0.4);
      var cells = Y.classics.cells, GD = Y.ground, SD = 400;
      // очередь у классиков — те же одноклассники
      var queue = s.node(g, 'g', {});
      [[cells[0].x - 260, 3], [cells[0].x - 360, 6], [cells[0].x - 460, 11]].forEach(function (q, i) { K().classmate(queue, q[1], q[0], cells[0].y - 40 + i * 6, 40, { gx: 6 }); });
      s.tween(queue, TY2 + 0.6, { opacity: 0, x: SD - cells[0].x }, { opacity: 1, x: 0, duration: 1.4, ease: 'power2.out' });
      var PX = 1560, PY = 700; // место игры с лошадкой
      [['baby', PX - 130, 0.2, 9], ['kid2', PX + 170, 0.5, -9]].forEach(function (q) { // из двери школы — вниз, на асфальт, и к месту игры
        s.actor(q[0], { x: SD, y: GD - 40, d: 80, o: 0 }, TY2 + q[2], 0.01); s.gaze(q[0], 8, 0, TY2 + q[2], 0.01);
        s.actor(q[0], { o: 1 }, TY2 + q[2] + 0.05, 0.3);
        s.actor(q[0], { y: GD + 80, d: 92 }, TY2 + q[2] + 0.15, 0.35, 'power2.out');
        s.actor(q[0], { x: q[1], y: PY, d: 100 }, TY2 + q[2] + 0.5, 0.8, 'power2.inOut');
        s.gaze(q[0], q[3], 2, TY2 + q[2] + 1.2, 0.2);
      });
      var yt = s.node(ov, 'g', {});
      K().toyHorse(s, yt, PX, PY + 50, 0.9);
      s.tween(yt, TY2 + 1.2, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
      s.hands('baby', 'hold', TY2 + 1.2, 0.25);
      // над игрушкой проступает рисованная лошадь 3–7 — игрушка бледнеет под ней
      var sk = s.node(ov, 'g', {});
      Film.icons.horse(s, sk, PX - 10, PY + 6, 0.78, { at: TY2 + 1.5, dur: 0.5, seed: 7 });
      s.tween(yt, TY2 + 1.6, { opacity: 1 }, { opacity: 0.3, duration: 0.3 });
      [[TY2 + 2.0, 50], [TY2 + 2.5, -50]].forEach(function (q) {
        Film.ride(s, yt, q[1], q[0], 0.4, 36); Film.ride(s, sk, q[1], q[0], 0.4, 36);
      });
      s.hop('kid2', PX + 170, PY, TY2 + 2.05, 0.4, 30); s.hop('baby', PX - 130, PY, TY2 + 2.55, 0.4, 30);
      s.out(sk, T3 - 0.3, { dur: 0.3 });
      s.tween(yt, T3 - 0.3, { opacity: 0.3 }, { opacity: 1, duration: 0.3 }); // лошадка остаётся на асфальте — целиком
      s.hands('baby', 'off', T3 - 0.2, 0.2);
      // Дима выходит последним и встаёт у стены школы — его не зовут
      s.actor('kid3', { x: SD, y: GD - 40, d: 80, o: 0 }, TY2 + 0.9, 0.01); s.gaze('kid3', 8, 0, TY2 + 0.9, 0.01); s.mouth('kid3', 'soft', TY2 + 0.9, 0.01);
      s.actor('kid3', { o: 1 }, TY2 + 0.95, 0.3);
      s.actor('kid3', { x: 560, y: GD + 50, d: 90 }, TY2 + 1.2, 0.45, 'power2.out');
      s.actor('kid3', { x: 748, y: GD - 48, d: 96 }, TY2 + 1.65, 0.55, 'power2.inOut');
      s.gaze('kid3', 8, 2, TY2 + 2.3, 0.3);
      s.mouth('kid3', 'flat', T3 + 2.4, 0.4);
      // --- кадр 3: классики мелом 1–10: Аня прыгает на одной ноге, Миша наступает на линию ---
      s.actor('kid2', { x: cells[0].x - 70, y: cells[0].y - 50, d: 90 }, T3, 0.5, 'power2.inOut');
      s.actor('baby', { x: cells[0].x - 160, y: cells[0].y - 44, d: 90 }, T3, 0.5, 'power2.inOut');
      s.gaze('baby', 8, 0, T3 + 0.4, 0.2);
      var t = T3 + 0.6;
      [0, 1, 2, 3].forEach(function (ci) { // Аня: 1, 2, 3, 4 — на одной ноге
        var c = cells[ci]; t = s.hop('kid2', c.x, c.y - 50, t, 0.26, 40) + 0.05;
      });
      s.mouth('kid2', 'smile', t, 0.2); s.gaze('kid2', -8, 2, t + 0.1, 0.2);
      // Миша прыгает и попадает на черту между 1 и 2
      var tm = t + 0.1;
      tm = s.hop('baby', cells[0].x, cells[0].y - 44, tm, 0.28, 40) + 0.06;
      var lx = (cells[0].x + cells[1].x) / 2;
      tm = s.hop('baby', lx, cells[1].y - 44, tm, 0.28, 40);
      var hit = s.path(ov, 'M' + lx + ' ' + (cells[1].y - 37) + ' V' + (cells[1].y + 37), { stroke: RED, 'stroke-width': 8 });
      s.tween(hit, tm, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 3, yoyo: true });
      s.brow('baby', 'sad', tm + 0.1, 0.3);
      K().say(s, 'Ты наступил на линию!', cells[3].x - 40, cells[3].y - 50 - 45 - 92, tm + 0.15, s.dur - 0.6, 'l');
      s.squash('kid2', 1.06, 0.94, tm + 0.25, 0.1); s.squash('kid2', 1, 1, tm + 0.35, 0.3, 'back.out(3)');
      s.brow('baby', 'calm', tm + 1.8, 0.4); s.mouth('baby', 'soft', tm + 1.8, 0.3);
      s.actor('baby', { x: cells[0].x - 160, y: cells[0].y - 44 }, tm + 2.0, 0.8, 'power2.inOut'); // встаёт в очередь
      verdict(s, 'игра не исчезла — ушла на перемену и обросла правилами.', T3 + 5.4);
      small(s, 'Д. Б. Эльконин, 1971: новая ведущая деятельность «не отменяет прежде существовавших» · Ж. Пиаже, 1932: игры по общим правилам — с 7–8 лет · П. Блэтчфорд и др., 2003: на перемене семилетки треть времени играют по правилам', T3 + 6.0, 990).style.color = '#3C4852';
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.45);
    }
  });

  // ---------- 1:40 — Родительский чат: мама у плиты с телефоном, Миша делает уроки; три совета — три проверки ----------
  Film.scene({
    id: 'chat', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var kc = P().kitchen(s, g, { stoveX: 240, tableX: 900 });
      var nb = s.node(g, 'rect', { x: 1000, y: kc.table.y - 6, width: 110, height: 6, rx: 2, fill: '#FFFDF8', stroke: INK, 'stroke-width': 1.6 }); void nb;
      var hd = s.text('h3', 'Учёные проверили советы из родительского чата.', { left: 140, top: 130, width: 700 });
      s.lines(hd, 0.1);
      // мама у плиты: одной рукой у кастрюли, в другой — телефон
      var MX = 560, MD = 240, MY = P().standY(kc.floor, MD, false);
      K().cast(s, 'mom', MX, MY, MD, 0.2, { gx: 6, gy: -4 }); s.brow('adult', 'calm', 0.2, 0.01);
      s.hands('adult', 'up', 0.4, 0.3);
      var tp = s.node(ov, 'g', {}), hx = MX + (112 - 50) * MD / 100, hy = MY + (-4 - 50) * MD / 100;
      s.node(tp, 'rect', { x: hx - 16, y: hy - 52, width: 34, height: 58, rx: 7, fill: '#1D2733', stroke: INK, 'stroke-width': 2 });
      s.node(tp, 'rect', { x: hx - 11, y: hy - 45, width: 24, height: 40, rx: 3, fill: '#DCEFEA' });
      s.tween(tp, 0.55, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      // Миша за столом делает уроки
      var seat = kc.seat;
      K().cast(s, 'misha', seat.x, seat.y - 62, 124, 0.3, { gx: -8, gy: 6, mouth: 'soft' }); s.brow('baby', 'focus', 0.3, 0.01);
      s.hands('baby', 'desk', 0.4, 0.3);
      [1.2, 1.5, 3.0, 3.3, 6.0, 6.3, 9.5, 9.8, 14.0, 14.3, 18.5, 18.8].forEach(function (tt) { s.squash('baby', 1.03, 0.97, tt, 0.1); s.squash('baby', 1, 1, tt + 0.1, 0.12); }); // пишет
      // телефон крупно справа: родительский чат
      var ph = K().phone(s, 1320, 120, 540, 860);
      s.tween(ph.el, 0.6, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      var items = [
        ['Учитель верит в ребёнка — и ребёнок умнеет!', 'так бывает, только пока учитель ещё не знает детей.', 3.3, 7.0],
        ['Не хвалите за ум — это вредно!', 'вреда почти не нашли.', 11.8, 15.0],
        ['Ваш ребёнок визуал — учите картинками!', 'учить «под стиль» не помогает.', 17.8, 20.7]
      ];
      items.forEach(function (it, i) {
        var m = ph.add(it[0], it[2]);
        m.style.top = (20 + i * 250) + 'px';
        var st = Film.el('div', 'tstamp', m.parentNode, '<b>Проверили:</b> ' + it[1]);
        Film.css(st, { position: 'absolute', left: '22px', top: (20 + i * 250 + [106, 70, 106][i]) + 'px', fontFamily: 'var(--sans)', fontWeight: 650, fontSize: '25px', lineHeight: 1.25, whiteSpace: 'normal', width: '440px', background: '#FFFDF8', padding: '6px 14px' });
        s.tween(st, it[3], { opacity: 0, scale: 1.5, rotation: -10, transformOrigin: '30% 50%' }, { opacity: 1, scale: 1, rotation: -3, duration: 0.25, ease: 'power3.in' });
        s.gaze('adult', 6, -6, it[2] + 0.2, 0.3); s.brow('adult', 'focus', it[2] + 0.3, 0.3);
        s.brow('adult', 'doubt', it[3] + 0.4, 0.3); s.mouth('adult', 'soft', it[3] + 0.4, 0.3);
        s.tween(tp, it[2] - 0.2, { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 6, duration: 0.06, repeat: 5, yoyo: true }); // звякнул
      });
      // Миша поднимает голову и смеётся, мама улыбается
      s.brow('baby', 'calm', 22.0, 0.3); s.gaze('baby', -9, -2, 22.0, 0.3); s.mouth('baby', 'smile', 22.2, 0.2);
      [22.4, 22.9].forEach(function (t) { s.squash('baby', 1.08, 0.92, t, 0.1); s.squash('baby', 1, 1, t + 0.1, 0.25, 'back.out(3)'); });
      s.gaze('adult', 8, 2, 23.0, 0.3); s.brow('adult', 'calm', 23.0, 0.3); s.mouth('adult', 'smile', 23.2, 0.3);
      small(s, 'эффект Пигмалиона — Р. Раунденбуш, 1984 · установка на рост — Ю. Ли, Т. Бейтс, 2019 · стили обучения — Х. Пашлер и др., 2008', 8.0, 990, false, 1120);
      off(s, ['baby', 'adult'], s.dur - 0.45);
    }
  });
})();
