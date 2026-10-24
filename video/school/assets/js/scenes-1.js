/* Глава 1 (v3.4, «Язык 7–10»). Новое место · Миша: три дорожки (заставка), первое сентября (Эльконин), мерка (Давыдов),
   а игра? (Эльконин; Пиаже; Блэтчфорд), родительский чат. Места — только Film.places. */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', STICK = '#8B6A45', RED = '#D9534F', CASE = '#2B8F84', KID_INK = '#2E3B4E';
  var CH = 95; // длина главы 1, с (3 + 7 + 10 + 8 + 10 тактов)
  var FLOOR = 900; // пол класса — как в Film.places.classroom по умолчанию (под ним место для вывода)
  var GX = -12; // дети в классе смотрят на доску (слева)

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
  function o_top(s) { return s.__vtop || 912; }
  function verdict(s, html, at, hud) {
    var st = { left: 140, top: o_top(s), width: 1640, fontSize: 28, lineHeight: 1.25 }, h = '<b class="acc">Вывод:</b> ' + html;
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
  function off(s, ids, t) { ids.forEach(function (id) { s.actor(id, { o: 0 }, t, 0.3); if (id !== 'adult2') s.hands(id, 'off', t + 0.3, 0.01); s.brow(id, 'calm', t + 0.3, 0.01); }); }
  // Прыжок без сильного сплющивания (не ниже 0,96 по вертикали): дуга двумя движениями
  function hop2(s, id, x, y, lt, dur, h) {
    var a = s.A[id].st, py = Math.min(a.y, y) - h;
    s.actor(id, { x: (a.x + x) / 2, y: py }, lt, dur / 2, 'power2.out');
    s.actor(id, { x: x, y: y }, lt + dur / 2, dur / 2, 'power2.in');
    s.squash(id, 1.04, 0.96, lt + dur, 0.06); s.squash(id, 1, 1, lt + dur + 0.06, 0.15);
    return lt + dur;
  }
  // Ранец Миши в классе стоит на полу под его партой (сам ранец-примета снят)
  function floorBag(s, g, sm, c) {
    var b = s.node(g, 'g', {});
    Film.toys.backpack(s, b, (sm.desk.x1 + sm.desk.x2) / 2, FLOOR - 32, 0.8, c ? c[0] : '#26A69A', c ? c[1] : '#1C7A71');
    return b;
  }
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
      var kg = s.node(g, 'g', {}), fl = s.node(kg, 'g', {}), fr = s.node(kg, 'g', { opacity: 0 }); // лицо к доске и лицо по ходу (вправо)
      K().classmate(fl, n, p.x, p.y, p.r, { gx: gx == null ? GX : gx });
      K().classmate(fr, n++, p.x, p.y, p.r, { gx: 12 });
      kids.push({ g: kg, fl: fl, fr: fr, x: p.x, y: p.y, r: p.r, row: ri, seat: pi });
    }); });
    return kids;
  }
  function seatOf(cr, key) { var q = key.split(':'); return cr.seats[+q[0]][+q[1]]; }
  function heroSeat(cr, who) { return seatOf(cr, P().SEATS[who]); }
  function heroKeys() { var S = P().SEATS; return [S.misha, S.anya, S.dima]; }
  // Выноска: тонкая пунктирная линия от врезки к предмету в кадре
  function leader(s, g, x1, y1, x2, y2, at, out) {
    var l = s.path(g, 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, { stroke: INK, 'stroke-width': 2, 'stroke-dasharray': '6 6', opacity: 0.7 });
    s.tween(l, at, { opacity: 0 }, { opacity: 0.7, duration: 0.3 });
    if (out != null) s.out(l, out, { dur: 0.3, from: 0.7 });
    return l;
  }
  // Тетрадь лежит на парте: тонкий лист в перспективе с палочками
  function deskBook(s, g, x, y, w) {
    var b = s.node(g, 'g', {});
    s.path(b, 'M' + x + ' ' + y + ' L' + (x + w) + ' ' + y + ' L' + (x + w - 10) + ' ' + (y - 9) + ' L' + (x + 10) + ' ' + (y - 9) + ' Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 1.8 });
    return b;
  }

  // ---------- 0:35 — Три дорожки: утро, трое выходят из своих домов и идут по своим дорожкам к двери школы (заставка главы 1) ----------
  Film.scene({
    id: 'ch1', bars: 3,
    build: function (s) {
      var g = s.svg(), M = P().paths(s, g, { ground: 600 });
      // от двери каждого дома — короткий отрезок дорожки до общей дорожки
      ['misha', 'anya', 'dima'].forEach(function (w) {
        var h = M.paths[w].home, st = M.paths[w].start;
        s.path(g, 'M' + (h[0] + 34 * h[2]) + ' ' + h[1] + ' H' + st[0], { stroke: '#2F4A8A', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 14', opacity: 0.8 });
      });
      s.chapterCard(1, 'Новое место', '');
      var sub = s.text('lead', 'Миша хочет, чтобы его хвалили, как дома', { left: 336, top: 430, width: 900, fontSize: 34 });
      s.fade(sub, 0.35, { y: 8 });
      s.chapter(1, 'Новое место', 0.4, CH - 0.6);
      // дорожка Миши прорисовывается за ним — герой главы
      var trail = s.path(g, M.paths.misha.d, { stroke: '#E4735A', 'stroke-width': 7, opacity: 0.55 });
      s.draw(trail, 1.2, { dur: 5.2, ease: 'none' });
      // мама стоит в двери дома (окно не закрывает) и машет Мише рукой-точкой сбоку
      var mh = M.paths.misha.home, MOM = 84, MX0 = mh[0] + 34 * mh[2], MY0 = mh[1] - MOM / 2;
      K().cast(s, 'mom', MX0, MY0, MOM, 0, { gx: 8, gy: -2, dur: 0.01 });
      s.brow('adult', 'calm', 0, 0.01); s.hands('adult', 'off', 0, 0.01);
      var wave = s.node(s.over(), 'circle', { cx: MX0 + 50, cy: MY0 - 6, r: 11, fill: '#304B61' });
      s.tween(wave, 0.9, { y: 0 }, { y: -16, duration: 0.25, repeat: 9, yoyo: true, ease: 'sine.inOut' });
      s.out(wave, s.dur - 0.45, { dur: 0.3 });
      s.actor('adult', { o: 0 }, s.dur - 0.45, 0.3);
      // трое одного роста стоят у своих домов (рядом, не в дверях) и идут по своим дорожкам лицом вперёд; останавливаются перед школой порознь
      var who = [['misha', 'baby', 0.5, 0.5], ['anya', 'kid2', 0.7, 0.62], ['dima', 'kid3', 0.9, 0.74]], D = 74, T0 = 0.05;
      who.forEach(function (w) {
        var p0 = P().pathPoint(M, w[0], T0);
        K().cast(s, w[0], p0.x, p0.y - D / 2, D, 0, { gx: 10, gy: -2, dur: 0.01 });
        s.brow(w[1], 'calm', 0, 0.01);
        var N = 12, t = w[2], dt = (6.4 - t) / N;
        for (var i = 1; i <= N; i++) {
          var p = P().pathPoint(M, w[0], T0 + (w[3] - T0) * i / N);
          s.squash(w[1], 1.04, 0.96, t, 0.08);
          s.actor(w[1], { x: p.x, y: p.y - D / 2 }, t + 0.06, dt - 0.06, 'sine.inOut'); // низ круга — на линии дорожки
          s.squash(w[1], 1, 1, t + 0.08, 0.15);
          t += dt;
        }
        s.actor(w[1], { o: 0 }, s.dur - 0.45, 0.3);
      });
    }
  });

  // ---------- 0:42,5 — Первое сентября (Д. Б. Эльконин): дома любят — в школе оценивают ----------
  var KIT = { stoveX: 240, tableX: 900 }; // одна и та же кухня: «дома» и «родительский чат»
  Film.scene({
    id: 'firstday', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 3.8, T3 = 6.4;
      s.__vtop = 926;
      // --- кадр 1: вечер накануне, дома: Миша сидит за столом, перед ним пропись; мама рядом обнимает его, не глядя в пропись ---
      var f1 = s.node(g, 'g', {}), kc = P().kitchen(s, f1, KIT);
      s.node(f1, 'rect', { x: 1382, y: 232, width: 276, height: 236, fill: '#3B5068', opacity: 0.85 }); // за окном вечер
      s.node(f1, 'circle', { cx: 1600, cy: 290, r: 20, fill: '#F5E6A8' });
      s.path(f1, 'M1520 230 V470 M1380 350 H1660', { stroke: INK, 'stroke-width': 2.4 });
      deskBook(s, f1, 1000, kc.table.y, 110); // пропись лежит на столе перед Мишей
      vis(s, f1, 0, T2, 0.01);
      s.gear('baby', 'backpack', false, 0, 0.01); // дома ранец снят
      var MX = kc.seat.x - 14, MY = kc.seat.y - 60;
      K().cast(s, 'misha', MX, MY, 120, 0, { gx: 8, gy: -2, dur: 0.01 }); // низ круга — на сиденье стула
      s.brow('baby', 'proud', 0.1, 0.01); s.hands('baby', 'desk', 0.2, 0.25);
      var MOMX = 1408, MOMY = P().standY(kc.floor, 220, false); // мама справа от стула, спинка стула её не пересекает
      K().cast(s, 'mom', MOMX, MOMY, 220, 0, { gx: -8, gy: 4, dur: 0.01 });
      s.brow('adult', 'calm', 0.1, 0.01);
      K().say(s, 'Иди сюда, моё солнышко!', MOMX + 20 - 500, 590, 0.5, 3.2, 'r');
      s.hands('adult', 'side', 1.0, 0.3); s.hands('baby', 'side', 1.0, 0.3); // левая рука мамы — на Мише
      s.squash('adult', 1.04, 0.97, 1.3, 0.15); s.squash('adult', 1, 1, 1.45, 0.4, 'back.out(2)');
      s.mouth('baby', 'smile', 1.4, 0.2); s.brow('baby', 'calm', 1.4, 0.3); s.gaze('baby', 9, -4, 1.4, 0.3);
      var eve = s.text('kicker', 'Вечер накануне 1 сентября', { left: 140, top: 122 }); s.fade(eve, 0.2, { y: 6 }); s.out(eve, T2 - 0.35, { dur: 0.3 });
      hudLines(s, 'h3', 'Дома любят за то, что ты есть.', { left: 140, top: 158, width: 1000, fontSize: 42 }, 2.0, T2 - 0.35);
      ['adult', 'baby'].forEach(function (id) { s.actor(id, { o: 0 }, T2, 0.01); s.hands(id, 'off', T2 + 0.02, 0.01); }); // смена кадра — сразу, без полупрозрачных героев
      // --- кадр 2: класс сбоку — доска слева перед детьми, Ирина Петровна у доски; герои на своих местах ---
      var f2 = s.node(g, 'g', {}), cr = P().classroom(s, f2, { boardText: '1 сентября' });
      seatKids(s, f2, cr.seats, heroKeys());
      var sm = heroSeat(cr, 'misha'), sa = heroSeat(cr, 'anya'), sd = heroSeat(cr, 'dima');
      floorBag(s, f2, sm); // ранец Миши стоит на полу под его партой
      P().bags(s, f2, cr.seats, cr.floor, [0, 3]); // у первого ряда — ранцы у стульев (у Димы — под партой, не у края кадра)
      floorBag(s, f2, heroSeat(cr, 'dima'), ['#8CBF6E', '#5E9443']);
      deskBook(s, f2, sm.desk.x1 + 30, sm.desk.y, 80);
      vis(s, f2, T2, null, 0.4);
      var TX = cr.teacher.x, TY = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TY, 150, T2, { gx: 10, gy: 0, dur: 0.01 });
      s.brow('adult2', 'calm', T2, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, T2, { gx: GX, dur: 0.01 });
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, T2, { gx: GX, mouth: 'soft', dur: 0.01 });
      s.hands('kid2', 'desk', T2 + 0.1, 0.01); s.hands('kid3', 'desk', T2 + 0.1, 0.01);
      s.actor('baby', { x: sm.x, y: sm.y, d: sm.r * 2, o: 0 }, T2 + 0.03, 0.01); s.gaze('baby', GX, -2, T2 + 0.03, 0.01);
      s.mouth('baby', 'smile', T2 + 0.03, 0.01); s.brow('baby', 'calm', T2 + 0.03, 0.01);
      s.actor('baby', { o: 1 }, T2 + 0.05, 0.01); // сидит на своём месте с начала кадра
      s.squash('baby', 1.04, 0.96, T2 + 1.05, 0.1); s.squash('baby', 1, 1, T2 + 1.15, 0.3);
      s.gaze('baby', 8, 0, T2 + 1.3, 0.25); s.gaze('kid2', -8, 0, T2 + 1.35, 0.25); // переглянулись с Аней
      s.gaze('baby', GX, -2, T2 + 2.0, 0.3); s.gaze('kid2', GX, 0, T2 + 2.0, 0.3);
      s.hands('baby', 'desk', T2 + 1.3, 0.25);
      K().tag(s, 'Ирина Петровна', TX, FLOOR + 8, T2 + 0.5, T3 - 0.3);
      K().tag(s, 'Миша', sm.x, FLOOR + 8, T2 + 0.7, T3 - 0.3);
      K().tag(s, 'Аня', sa.x, FLOOR + 8, T2 + 0.8, T3 - 0.3); K().tag(s, 'одноклассник', seatOf(cr, '0:2').x, FLOOR + 8, T2 + 0.8, T3 - 0.3); K().tag(s, 'Дима', sd.x - 20, FLOOR + 8, T2 + 0.8, T3 - 0.3);
      // --- кадр 3: Ирина Петровна шагами подходит к парте Миши, подчёркивает палочку и ставит «3» в поле (тетрадь крупно — лист с выноской) ---
      K().walk(s, 'adult2', 655, T3, { step: 75, dur: 0.16, hold: 0.04 }); // к парте Миши, но не вплотную
      s.gaze('adult2', 10, 6, T3 + 0.9, 0.3); s.brow('adult2', 'focus', T3 + 0.9, 0.3); s.hands('adult2', 'hold', T3 + 1.2, 0.3);
      var IX = 660, IY = 240, IW = 500, IH = 290, sv = inset(s, IX, IY, IW, IH, T3 + 0.6, s.dur - 0.5, { cell: 36, margin: 108 });
      leader(s, f2, 1000, IY + IH, sm.desk.x1 + 70, sm.desk.y - 10, T3 + 0.7, T3 + 3.9);
      sticks(s, sv, 50, 90, 5, 68, 130, 7);
      var pn = pen(s, sv, 460, 300);
      s.tween(pn, T3 + 1.5, { opacity: 0, x: 460, y: 300 }, { opacity: 1, x: 220, y: 240, duration: 0.5, ease: 'power2.out' });
      var bad = 50 + 3 * 68, under = s.path(sv, 'M' + (bad - 30) + ' 240 H' + (bad + 34), { stroke: RED, 'stroke-width': 6 });
      s.draw(under, T3 + 2.05, { dur: 0.35 });
      s.tween(pn, T3 + 2.05, { x: 220 }, { x: 288, duration: 0.35, ease: 'power1.inOut' });
      s.tween(pn, T3 + 2.45, { x: 288, y: 240 }, { x: 440, y: 200, duration: 0.35, ease: 'power2.inOut' });
      var three = s.node(sv, 'text', { x: IW - 54, y: 200, 'text-anchor': 'middle', fill: RED, style: 'font-family: var(--hand); font-size: 120px' });
      three.textContent = '3';
      s.tween(three, T3 + 2.85, { opacity: 0, scale: 0.4, transformOrigin: '50% 70%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      s.out(pn, T3 + 3.2, { dur: 0.3 });
      s.hands('adult2', 'side', T3 + 3.2, 0.3); s.gaze('adult2', -10, 0, T3 + 3.2, 0.2);
      K().walk(s, 'adult2', TX, T3 + 3.3, { step: 75, dur: 0.16, hold: 0.04 }); s.gaze('adult2', 10, 0, T3 + 4.3, 0.3);
      s.brow('baby', 'sad', T3 + 3.0, 0.4); s.mouth('baby', 'flat', T3 + 3.0, 0.4); s.gaze('baby', -4, 6, T3 + 3.0, 0.4);
      hudLines(s, 'h3', 'В школе оценивают, что ты сделал.', { left: 140, top: 122, width: 1100, fontSize: 42 }, T3 + 3.0);
      // облачко над Мишей (пузырьки — от него): мама дома обнимает его — он вспоминает и успокаивается
      var cx = 790, cy = 600, cg = s.node(ov, 'g', {});
      Film.icons.cloud(s, cg, cx, cy, 86, 52, { at: T3 + 4.4, dur: 0.7, seed: 4, tail: [sm.x - 16, sm.y - sm.r] });
      var hug = s.node(ov, 'g', {});
      s.path(hug, 'M' + (cx - 60) + ' ' + (cy - 8) + ' L' + cx + ' ' + (cy - 46) + ' L' + (cx + 60) + ' ' + (cy - 8), { stroke: INK, 'stroke-width': 2.6 }); // крыша — дом
      Film.head(hug, cx - 16, cy + 14, 28, '#385771', null, { mouth: 'smile', gx: 6 });
      Film.head(hug, cx + 22, cy + 24, 18, '#E4735A', null, { mouth: 'smile', gx: -6 });
      s.node(hug, 'circle', { cx: cx + 16, cy: cy + 35, r: 6, fill: '#304B61' });
      s.tween(hug, T3 + 4.9, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.brow('baby', 'calm', T3 + 5.4, 0.5); s.mouth('baby', 'soft', T3 + 5.4, 0.5); s.gaze('baby', -6, -4, T3 + 5.4, 0.4);
      s.squash('baby', 1.03, 0.97, T3 + 5.6, 0.6); s.squash('baby', 1, 1, T3 + 6.2, 0.6);
      verdict(s, 'появляется новый взрослый — учитель. Его оценка первая, которая не про любовь.', T3 + 5.2, true);
      small(s, 'Д. Б. Эльконин: учитель — первый общественный взрослый в жизни ребёнка', T3 + 6.4, 1000, true);
      off(s, ['baby', 'kid2', 'kid3', 'adult2'], s.dur - 0.45);
    }
  });

  // ---------- 1:00 — Мерка (В. В. Давыдов): ленты не приложить друг к другу — палочка становится меркой ----------
  Film.scene({
    id: 'merka', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      s.__vtop = 926;
      var cr = P().classroom(s, g, {});
      seatKids(s, g, cr.seats, heroKeys());
      var sm = heroSeat(cr, 'misha'), sa = heroSeat(cr, 'anya'), sd = heroSeat(cr, 'dima');
      floorBag(s, g, sm);
      P().bags(s, g, cr.seats, cr.floor, [0, 3]); floorBag(s, g, sd, ['#8CBF6E', '#5E9443']);
      // две ленты на стене класса под доской — по разные стороны от учительского места, приколоты кнопками
      var M = 55, RYB = FLOOR - 142, RA = { x: 355, n: 3, c: '#4F7CAC' }, RB = { x: 570, n: 4, c: '#E0A93B' }; // выше головы Миши; обе — правее учительницы
      [RA, RB].forEach(function (r, i) {
        var e = s.node(g, 'rect', { x: r.x, y: RYB - 7, width: r.n * M, height: 14, rx: 3, fill: r.c, stroke: INK, 'stroke-width': 1.6 });
        s.grow(e, 0.3 + i * 0.3, { dur: 0.5 });
        [r.x + 6, r.x + r.n * M - 6].forEach(function (px) { var pin = s.node(g, 'circle', { cx: px, cy: RYB, r: 4.5, fill: RED, stroke: INK, 'stroke-width': 1.4 }); s.fade(pin, 0.7 + i * 0.3, { y: 0 }); });
      });
      var pc = s.node(g, 'g', {}); pencilCase(s, pc, sm.desk.x1 + 14, sm.desk.y, 70);
      var TX = 145, TY = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TY, 150, 0, { gx: 10, gy: 0, dur: 0.01 }); s.brow('adult2', 'calm', 0, 0.01);
      s.gear('baby', 'backpack', false, 0, 0.01);
      K().cast(s, 'misha', sm.x, sm.y, sm.r * 2, 0, { gx: GX, dur: 0.01 }); s.brow('baby', 'calm', 0.1, 0.01); s.hands('baby', 'desk', 0.1, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, 0, { gx: GX, dur: 0.01 }); s.brow('kid2', 'calm', 0.1, 0.01); s.hands('kid2', 'desk', 0.1, 0.01);
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, 0, { gx: GX, mouth: 'soft', dur: 0.01 }); s.hands('kid3', 'desk', 0.1, 0.01);
      // кадр 1: Ирина Петровна шагами выходит к классу и загадывает загадку
      // Ирина Петровна у левого края доски, в стороне от лент; облачко — справа от доски, длинный хвост к ней
      var qb = K().say(s, 'Как узнать, какая лента длиннее,<br>если их нельзя приложить друг к другу?', 650, 300, 0.6, 7.0);
      var qt = s.node(ov, 'path', { d: 'M686 418 L' + (TX + 50) + ' ' + (TY - 62) + ' L712 418 Z', fill: '#FFFDF8', stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
      s.tween(qt, 0.6, { opacity: 0 }, { opacity: 1, duration: 0.3 }); s.out(qt, 7.0, { dur: 0.3 });
      s.hands('adult2', 'hold', 0.8, 0.3); s.hands('adult2', 'side', 6.0, 0.3);
      askCloud(s, ov, 1330, 500, 1.4, 4.6); askCloud(s, ov, 1540, 500, 1.7, 4.6); askCloud(s, ov, 1750, 500, 2.0, 4.6); // над головами заднего ряда
      s.brow('kid2', 'focus', 1.7, 0.3); s.gaze('kid2', -8, -6, 1.7, 0.3);
      // у Миши в облачке — схема: палочка, уложенная по ленте, | | |
      s.brow('baby', 'focus', 2.0, 0.3); s.gaze('baby', -8, -8, 2.0, 0.3);
      var mc = s.node(ov, 'g', {}), CX = 868, CY = 632;
      Film.icons.cloud(s, mc, CX, CY, 82, 48, { at: 2.2, dur: 0.7, seed: 6, tail: [sm.x - 20, sm.y - sm.r] });
      var sch = s.node(ov, 'g', {});
      s.path(sch, 'M' + (CX - 56) + ' ' + (CY + 8) + ' H' + (CX + 56), { stroke: RA.c, 'stroke-width': 8 });
      var sst = s.path(sch, 'M' + (CX - 56) + ' ' + (CY - 4) + ' H' + (CX - 19), { stroke: STICK, 'stroke-width': 6 });
      s.tween(sch, 2.8, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.tween(sst, 3.2, { x: 0 }, { x: 37, duration: 0.3, ease: 'power2.inOut' });
      s.tween(sst, 3.6, { x: 37 }, { x: 74, duration: 0.3, ease: 'power2.inOut' });
      [-19, 18, 55].forEach(function (dx, i) { var tk = s.path(sch, 'M' + (CX + dx) + ' ' + (CY - 14) + ' v30', { stroke: INK, 'stroke-width': 3 }); s.draw(tk, 3.1 + i * 0.4, { dur: 0.1 }); });
      s.out([mc, sch], 4.6, { dur: 0.3 });
      // кадр 2: Миша поднимает руку (сидя), Ирина Петровна кивает и отходит к доске; Миша встаёт, берёт палочку из пенала и шагами идёт к ленте
      s.hands('baby', 'up', 4.0, 0.35); s.brow('baby', 'proud', 4.0, 0.3);
      s.gaze('adult2', 10, 2, 4.2, 0.3); s.squash('adult2', 1.02, 0.97, 4.4, 0.15); s.squash('adult2', 1, 1, 4.55, 0.3); // кивает
      
      var SY = FLOOR - sm.r - 8, STY = RYB - 5, HY = SY + 0.2 * sm.r * 2; // стоит на полу; палочка на ленте; в руке
      var stick = s.node(ov, 'g', {});
      s.path(stick, 'M0 0 H' + M, { stroke: STICK, 'stroke-width': 8 });
      var pos = { x: sm.desk.x1 + 22, y: sm.desk.y - 12 };
      s.set(stick, 0, { x: pos.x, y: pos.y, opacity: 0 }, { x: pos.x, y: pos.y, opacity: 0 });
      s.tween(stick, 5.0, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.hands('baby', 'hold', 4.95, 0.25); s.brow('baby', 'focus', 5.0, 0.3);
      hop2(s, 'baby', sm.x - 40, SY, 5.1, 0.4, 24); // встаёт со стула на пол
      s.tween(stick, 5.1, { x: pos.x, y: pos.y }, { x: sm.x - 20, y: HY, duration: 0.4, ease: 'power2.inOut' }); pos = { x: sm.x - 20, y: HY };
      function go(x, lt, dur) { // идёт плавно, палочка в руке
        var n = Math.max(3, Math.round(Math.abs(x - s.A.baby.st.x) / 110)), dx = (x - s.A.baby.st.x) / n, d = dur / n;
        s.gaze('baby', x < s.A.baby.st.x ? -9 : 9, -2, lt, 0.2);
        s.tween(stick, lt, { x: pos.x, y: pos.y }, { x: x + 20, y: HY, duration: dur, ease: 'sine.inOut' }); pos = { x: x + 20, y: HY };
        Film.glide(s, 'baby', x, lt, { step: Math.abs(dx), dur: d, hold: 0 }); // плавно, та же длительность
      }
      var HO = 58; // рука вверх — правее центра на 58
      function measure(r, lt, step) { // палочка шаг за шагом по ленте; черта на ленте после каждого шага
        s.hands('baby', 'up', lt - 0.25, 0.25); s.gaze('baby', 6, -9, lt - 0.25, 0.2);
        for (var j = 0; j < r.n; j++) {
          var t = lt + j * step, sx = r.x + j * M;
          s.tween(stick, t, { x: pos.x, y: pos.y }, { x: sx, y: STY, duration: step * 0.6, ease: 'power2.inOut' }); pos = { x: sx, y: STY };
          if (j) s.actor('baby', { x: sx + M / 2 - HO }, t, step * 0.6, 'power2.inOut');
          var tk = s.path(ov, 'M' + (sx + M) + ' ' + (RYB - 12) + ' v24', { stroke: INK, 'stroke-width': 3 });
          s.draw(tk, t + step * 0.6, { dur: 0.08 });
        }
        s.hands('baby', 'hold', lt + r.n * step, 0.2);
        s.tween(stick, lt + r.n * step, { x: pos.x, y: pos.y }, { x: s.A.baby.st.x + 20, y: HY, duration: 0.2 }); pos = { x: s.A.baby.st.x + 20, y: HY };
      }
      function tally(r, txt, at) { // счёт — под своей лентой на стене (появляется, когда Миша отошёл)
        var tt = s.text('kidhand', txt, { left: r.x, top: RYB + 18, width: r.n * M, textAlign: 'center', fontSize: 44 });
        s.fade(tt, at, { y: -6, dur: 0.4 });
      }
      go(RA.x + M / 2 - HO, 5.6, 1.0);
      measure(RA, 6.85, 0.32);
      go(RB.x + M / 2 - HO, 7.95, 0.9); tally(RA, 'III', 8.15);
      measure(RB, 9.1, 0.3);
      s.mouth('baby', 'smile', 10.35, 0.2); s.gaze('baby', -6, -6, 10.35, 0.2);
      K().say(s, 'Вторая!', s.A.baby.st.x + 34 - 230, 640, 10.35, 11.35, 'r'); // гаснет, когда Миша уходит от ленты
      // кадр 3: Миша шагами возвращается за парту; Ирина Петровна подходит, ставит «5» своей рукой и хвалит
      s.out(stick, 11.0, { dur: 0.25 }); s.hands('baby', 'off', 11.0, 0.2);
      go(TX + 175, 11.35, 0.5); tally(RB, 'IIII', 11.4); // подходит к Ирине Петровне (зазор, не в ней)
      s.gaze('baby', -9, -4, 11.75, 0.2);
      s.squash('adult2', 1.02, 0.98, 11.6, 0.15); s.squash('adult2', 1, 1, 11.75, 0.2); s.gaze('adult2', 10, 6, 11.7, 0.3);
      s.hands('adult2', 'hold', 12.5, 0.3); // её рука-точка с ручкой
      var IX = 1310, IY = 160, IW = 560, IH = 310, nb = inset(s, IX, IY, IW, IH, 12.4, s.dur - 0.5, { cell: 35, margin: 110 });
      [[RA, 95], [RB, 185]].forEach(function (q) { // тетрадь Миши: ленты и черты
        s.node(nb, 'rect', { x: 30, y: q[1] - 6, width: 50, height: 12, rx: 3, fill: q[0].c });
        for (var j = 0; j < q[0].n; j++) s.path(nb, 'M' + (110 + j * 26) + ' ' + (q[1] - 24) + ' v48', { stroke: KID_INK, 'stroke-width': 5 });
      });
      var pn = pen(s, nb, 360, 270);
      s.tween(pn, 12.65, { opacity: 0, x: 360, y: 270 }, { opacity: 1, x: IW - 50, y: 190, duration: 0.4, ease: 'power2.out' });
      var five = s.node(nb, 'text', { x: IW - 52, y: 175, 'text-anchor': 'middle', fill: RED, style: 'font-family: var(--hand); font-size: 120px' });
      five.textContent = '5';
      s.tween(five, 13.05, { opacity: 0, scale: 0.4, transformOrigin: '50% 70%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      s.out(pn, 13.4, { dur: 0.3 }); s.hands('adult2', 'side', 13.4, 0.3);
      s.mouth('adult2', 'smile', 13.1, 0.3);
      K().say(s, 'Молодец, нашёл способ!', TX + 15, 516, 13.15, 15.6); // над Ириной Петровной, короткий хвост вниз к ней; задний ряд не закрыт
      s.brow('baby', 'proud', 13.3, 0.3); s.mouth('baby', 'smile', 13.3, 0.2); s.gaze('baby', -8, -6, 13.3, 0.2);
      s.squash('baby', 1.04, 0.96, 13.6, 0.1); s.squash('baby', 1, 1, 13.7, 0.3);
      go(sm.x - 40, 15.7, 0.8); hop2(s, 'baby', sm.x, sm.y, 16.55, 0.35, 20); s.gaze('baby', GX, -2, 16.95, 0.2); s.hands('baby', 'desk', 16.95, 0.2); // возвращается за парту
      var rule = s.text('h3', 'Длиннее та, по которой мерка уложилась больше раз. Так палочка становится числом.', { left: 140, top: 124, width: 1060, fontSize: 40 });
      s.lines(rule, 10.6); // правило — сразу после результата «Вторая!», дочитывается до вывода
      s.out(rule, 16.4, { dur: 0.3 }); // гаснет, когда появляется вывод (не три блока сразу)
      verdict(s, 'в школе учат не готовому ответу, а способу его найти. Это <b class="acc">учебная деятельность</b> — главное занятие возраста.', 16.6);
      small(s, 'learning activity · В. В. Давыдов, «Виды обобщения в обучении», 1972 · независимых сравнений системы почти нет', 17.2, 1000);
      off(s, ['baby', 'kid2', 'kid3', 'adult2'], s.dur - 0.45);
    }
  });

  // ---------- 1:25 — А игра? (Д. Б. Эльконин, 1971; Ж. Пиаже, 1932; П. Блэтчфорд и др., 2003) ----------
  Film.scene({
    id: 'play', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 4.4, TY2 = 7.4, T3 = 10.2;
      // --- кадр 1: урок; из ранца у стула Миши выглядывает лошадка (целиком), Аня замечает и улыбается ---
      var f1 = s.node(g, 'g', {}), cr = P().classroom(s, f1, {});
      // дверь класса справа (за последней партой) — на перемену все выходят в неё; над дверью звонок на стене
      // дверь — в задней стене справа, за последней партой заднего ряда (с отступом от края кадра); над ней звонок
      var DB = FLOOR - 190, DX = 1772, dr = s.node(f1, 'g', {});
      s.node(dr, 'rect', { x: DX, y: DB - 220, width: 86, height: 220, rx: 4, fill: '#F3EBDD', stroke: INK, 'stroke-width': 2.6 });
      s.node(dr, 'circle', { cx: DX + 14, cy: DB - 108, r: 5, fill: INK });
      s.path(f1, 'M' + (DX + 43) + ' ' + (DB - 232) + ' V' + (DB - 250), { stroke: INK, 'stroke-width': 2.6 });
      var bell = s.node(f1, 'g', {});
      s.path(bell, 'M' + (DX + 25) + ' ' + (DB - 250) + ' Q' + (DX + 25) + ' ' + (DB - 292) + ' ' + (DX + 43) + ' ' + (DB - 292) + ' Q' + (DX + 61) + ' ' + (DB - 292) + ' ' + (DX + 61) + ' ' + (DB - 250) + ' Z', { fill: '#F5D27A', stroke: INK, 'stroke-width': 2.4 });
      s.node(bell, 'circle', { cx: DX + 43, cy: DB - 246, r: 5, fill: INK });
      var kids = seatKids(s, f1, cr.seats, heroKeys());
      var bagsF = P().bags(s, f1, cr.seats, cr.floor, [0, 3]); // ранцы первого ряда у стульев; ранцы Миши и Димы — под их партами
      vis(s, f1, 0, null, 0.01); s.out(f1, TY2, { dur: 0.3 });
      var sm = heroSeat(cr, 'misha'), sa = heroSeat(cr, 'anya'), sd = heroSeat(cr, 'dima');
      var dBag = floorBag(s, f1, sd, ['#8CBF6E', '#5E9443']);
      var TX = cr.teacher.x, TYc = P().standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TYc, 150, 0, { gx: 10, dur: 0.01 }); s.brow('adult2', 'calm', 0, 0.01);
      K().cast(s, 'misha', sm.x, sm.y, sm.r * 2, 0, { gx: GX, dur: 0.01 }); s.brow('baby', 'calm', 0.05, 0.01); s.hands('baby', 'desk', 0.05, 0.01);
      K().cast(s, 'anya', sa.x, sa.y, sa.r * 2, 0, { gx: GX, dur: 0.01 }); s.brow('kid2', 'calm', 0.05, 0.01); s.hands('kid2', 'desk', 0.05, 0.01);
      K().cast(s, 'dima', sd.x, sd.y, sd.r * 2, 0, { gx: GX, mouth: 'soft', dur: 0.01 }); s.hands('kid3', 'desk', 0.05, 0.01);
      // ранец Миши стоит на полу у его стула (ранец-примету на спине прячем)
      s.gear('baby', 'backpack', false, 0, 0.01);
      var BX = (sm.desk.x1 + sm.desk.x2) / 2, BY = FLOOR - 32;
      var toy = s.node(g, 'g', {});
      K().toyHorse(s, toy, BX, BY - 32, 0.45);
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, BX, BY, 0.8, '#26A69A', '#1C7A71');
      s.tween(toy, 0, { y: 50 }, { y: 50, duration: 0.01 });
      s.tween(toy, 1.6, { y: 50 }, { y: 0, duration: 0.6, ease: 'back.out(1.6)' }); // выглядывает из ранца и встаёт на него
      hudLines(s, 'h3', 'Если главным стала учёба, куда делась игра?', { left: 140, top: 130, width: 1500 }, 0.3, TY2 - 0.4);
      s.gaze('baby', -10, 8, 2.0, 0.3);
      s.gaze('kid2', -12, 8, 2.5, 0.3); s.mouth('kid2', 'smile', 2.7, 0.2);
      s.gaze('baby', 8, 0, 3.0, 0.25);
      // Аня в ответ достаёт из своего ранца своего зайку
      var ab = bagsF[1], bun = s.node(g, 'g', {});
      Film.toys.bunny(s, bun, ab.x, ab.y - 34, 0.3);
      s.tween(bun, 0, { y: 46 }, { y: 46, duration: 0.01 });
      var bagTop = s.node(g, 'g', {}); Film.toys.backpack(s, bagTop, ab.x, ab.y, 0.9, '#7E9CD6', '#4E6FA8'); // ранец Ани поверх зайки
      s.gaze('kid2', 10, 8, 3.0, 0.3);
      s.tween(bun, 3.2, { y: 46 }, { y: 0, duration: 0.5, ease: 'back.out(1.6)' });
      s.gaze('baby', 10, 4, 3.6, 0.25); s.mouth('baby', 'smile', 3.7, 0.2);
      s.mouth('kid2', 'soft', 4.0, 0.3); s.gaze('kid2', GX, 0, 4.1, 0.3); s.gaze('baby', GX, -2, 4.1, 0.3); // прячут улыбку
      // --- кадр 2: звонок; все встают со стульев, выходят вперёд в проход и идут в одну сторону — к двери ---
      s.tween(bell, T2, { rotation: 0, transformOrigin: '50% 0%' }, { rotation: 16, duration: 0.08, repeat: 11, yoyo: true });
      [0, 1].forEach(function (i) {
        var a = s.path(f1, 'M' + (DX + 43 + (i ? 30 : -30)) + ' ' + (DB - 276) + ' q' + (i ? 10 : -10) + ' 14 0 28', { stroke: INK, 'stroke-width': 2.4 });
        s.tween(a, T2, { opacity: 0 }, { opacity: 1, duration: 0.15, repeat: 5, yoyo: true });
        s.set(a, T2 + 0.9, { opacity: 1 }, { opacity: 0 });
      });
      s.tween(toy, T2 + 0.4, { y: 0 }, { y: 50, duration: 0.3, ease: 'power2.in' }); // лошадку — обратно в ранец
      s.out(bp, T2 + 0.9, { dur: 0.25 }); s.out(toy, T2 + 0.9, { dur: 0.01 });
      s.gear('baby', 'backpack', true, T2 + 0.9, 0.25); // ранец — на спину
      s.hands('baby', 'off', T2 + 0.9, 0.2); s.hands('kid2', 'off', T2 + 0.9, 0.2); s.hands('kid3', 'off', T2 + 0.9, 0.2);
      // все встают на пол, поворачиваются к двери, идут вправо; передний ряд у конца прохода поднимается к двери в задней стене;
      // в двери исчезают сразу (без полупрозрачных детей)
      var DXC = DX + 43, AISLE = 1690;
      kids.slice().sort(function (a, b) { return b.x - a.x; }).forEach(function (k, i) {
        var t = T2 + 0.8 + i * 0.12, rowFloor = k.row ? DB : FLOOR, sy = rowFloor - k.r - k.y, dy = DB - k.r * (k.row ? 1 : 0.72) - k.y;
        var wx = (k.row ? DXC : AISLE) - k.x, wd = 0.5 + Math.abs(wx) / 1400;
        s.tween(k.g, t, { y: 0 }, { y: sy, duration: 0.3, ease: 'power2.inOut' }); // встал на пол
        s.set(k.fl, t + 0.3, { opacity: 1 }, { opacity: 0 }); s.set(k.fr, t + 0.3, { opacity: 0 }, { opacity: 1 }); // повернулся лицом к двери
        if (!k.row && bagsF[k.seat]) s.set(bagsF[k.seat].g, t + 0.3, { opacity: 1 }, { opacity: 0 }); // ранец забрал с собой
        s.tween(k.g, t + 0.35, { x: 0 }, { x: wx, duration: wd, ease: 'power1.inOut' });
        var tEnd = t + 0.35 + wd;
        if (!k.row) { s.tween(k.g, tEnd, { x: wx, y: sy }, { x: DXC - k.x, y: dy, duration: 0.4, ease: 'power1.inOut' }); tEnd += 0.4; }
        s.set(k.g, tEnd, { opacity: 1 }, { opacity: 0 }); // вошёл в дверь
      });
      [['kid3', sd, 0.1], ['kid2', sa, 0.25], ['baby', sm, 0.4]].forEach(function (q) {
        var id = q[0], t = T2 + 0.8 + q[2], wd = 0.4 + Math.max(0, AISLE - q[1].x) / 1800;
        s.gaze(id, 12, 0, t, 0.2);
        if (id === 'kid3') s.set(dBag, t + 0.3, { opacity: 1 }, { opacity: 0 });
        if (id === 'kid2') [bagTop, bun, ab.g].forEach(function (e) { s.set(e, t + 0.3, { opacity: 1 }, { opacity: 0 }); });
        hop2(s, id, q[1].x + 20, FLOOR - q[1].r, t, 0.35, 16); // встаёт со стула на пол
        if (q[1].x < AISLE) { var nw = Math.max(1, Math.round((AISLE - q[1].x - 20) / 140)); Film.glide(s, id, AISLE, t + 0.45, { step: (AISLE - q[1].x - 20) / nw, dur: wd / nw, hold: 0 }); }
        var tu = t + 0.45 + (q[1].x < AISLE ? wd : 0);
        s.actor(id, { x: DXC, y: DB - q[1].r * 0.72, d: q[1].r * 2 * 0.8 }, tu, 0.35, 'power1.inOut'); // к двери в задней стене
        s.actor(id, { o: 0 }, tu + 0.35, 0.01);
      });
      s.gaze('adult2', 9, 0, T2 + 1.0, 0.3);
      s.actor('adult2', { o: 0 }, TY2, 0.01);
      // --- двор: дети выходят из двери школы и идут вправо; Миша и Аня играют лошадкой — над ней проступает рисованный слой 3–7 ---
      var f3 = s.node(g, 'g', {}), Y = P().yard(s, f3, { ground: 600 });
      vis(s, f3, TY2, null, 0.4);
      var cells = Y.classics.cells, GD = Y.ground, SD = 400;
      // очередь стоит у классиков, у первой клетки
      var queue = s.node(g, 'g', {}), QX = cells[0].x - 290;
      [[QX, 3], [QX - 90, 6], [QX - 180, 11]].forEach(function (q) { K().classmate(queue, q[1], q[0], cells[0].y - 40, 40, { gx: 6 }); });
      s.tween(queue, 0, { opacity: 0 }, { opacity: 0, duration: 0.01 }); s.set(queue, TY2, { opacity: 0, x: -480 }, { opacity: 1, x: -480 });
      s.tween(queue, TY2 + 0.3, { x: -480 }, { x: 0, duration: 1.3, ease: 'power1.out' }); // входят шагом из-за левого края
      var PX = 1520, PY = 700; // место игры с лошадкой
      [['baby', PX - 130, 0.3, 9, 0.7], ['kid2', PX + 210, 0.0, -9, 0.95]].forEach(function (q) { // из двери школы — вниз и вправо к месту игры; Аня выходит первой — ей дальше
        s.actor(q[0], { x: SD, y: GD - 40, d: 80, o: 0 }, TY2 + q[2], 0.01); s.gaze(q[0], 8, 0, TY2 + q[2], 0.01);
        s.actor(q[0], { o: 1 }, TY2 + q[2] + 0.05, 0.01); // выходят из двери школы
        s.actor(q[0], { y: GD + 80, d: 92 }, TY2 + q[2] + 0.15, 0.35, 'power2.out');
        s.actor(q[0], { x: q[1], y: PY, d: 100 }, TY2 + q[2] + 0.5, q[4], 'sine.inOut');
        s.gaze(q[0], q[3], 2, TY2 + q[2] + 0.5 + q[4] - 0.1, 0.2);
      });
      // игрушки и ранцы лежат на земле у классиков (справа от последней клетки) до конца сцены; дети проходят перед ними
      var mb = s.node(g, 'g', {}); Film.toys.backpack(s, mb, PX - 185, PY + 50 - 23, 0.6, '#26A69A', '#1C7A71'); // ранец Миши — снял и поставил за собой
      s.tween(mb, 0, { opacity: 0 }, { opacity: 0, duration: 0.01 }); s.set(mb, TY2 + 1.5, { opacity: 0, y: -14 }, { opacity: 1, y: -14 });
      s.tween(mb, TY2 + 1.5, { y: -14 }, { y: 0, duration: 0.2, ease: 'power2.in' });
      s.gear('baby', 'backpack', false, TY2 + 1.5, 0.01);
      var yt = s.node(g, 'g', {});
      K().toyHorse(s, yt, PX, PY + 50 - 8, 0.9); // колёса на земле
      s.tween(yt, TY2 + 1.5, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }); // Миша достал лошадку из ранца
      s.hands('baby', 'hold', TY2 + 1.5, 0.25);
      // Аня несёт свой ранец в руке (сзади по ходу), ставит на землю и вынимает из него зайку
      var BKX = PX + 120, BKY = PY + 50 - 23, yb = s.node(g, 'g', {}); Film.toys.bunny(s, yb, BKX, PY + 50, 0.42);
      var ayb = s.node(g, 'g', {}); Film.toys.backpack(s, ayb, 0, 0, 0.6, '#7E9CD6', '#4E6FA8'); // поверх зайки — зайка в ранце
      s.tween(ayb, 0, { opacity: 0 }, { opacity: 0, duration: 0.01 });
      s.set(ayb, TY2 + 0.05, { opacity: 0, x: SD - 52, y: GD - 20 }, { opacity: 1, x: SD - 52, y: GD - 20 });
      s.tween(ayb, TY2 + 0.15, { y: GD - 20 }, { y: GD + 100, duration: 0.35, ease: 'power2.out' });
      s.tween(ayb, TY2 + 0.5, { x: SD - 52, y: GD + 100 }, { x: PX + 210 - 56, y: PY + 20, duration: 0.95, ease: 'sine.inOut' });
      s.tween(ayb, TY2 + 1.5, { x: PX + 210 - 56, y: PY + 20 }, { x: BKX, y: BKY, duration: 0.15, ease: 'power2.in' }); // поставила на землю
      s.hands('kid2', 'hold', TY2 + 1.5, 0.25);
      s.tween(yb, 0, { opacity: 0 }, { opacity: 0, duration: 0.01 }); s.set(yb, TY2 + 1.7, { opacity: 0, y: 34 }, { opacity: 1, y: 34 });
      s.tween(yb, TY2 + 1.7, { y: 34 }, { y: -12, duration: 0.3, ease: 'power2.out' }); // вынимает из ранца
      s.tween(yb, TY2 + 2.0, { y: -12 }, { y: 0, duration: 0.2, ease: 'power2.in' }); // ставит перед ранцем
      [[TY2 + 2.25, 8], [TY2 + 2.75, -8]].forEach(function (q) { Film.ride(s, yb, q[1], q[0], 0.4, 30); });
      var sk = s.node(ov, 'g', {});
      Film.icons.horse(s, sk, PX - 10, PY - 2, 0.72, { at: TY2 + 1.65, dur: 0.5, seed: 7 });
      s.tween(yt, TY2 + 1.8, { opacity: 1 }, { opacity: 0.35, duration: 0.3 });
      [[TY2 + 2.0, 40], [TY2 + 2.5, -40]].forEach(function (q) {
        Film.ride(s, yt, q[1], q[0], 0.4, 36); Film.ride(s, sk, q[1], q[0], 0.4, 36);
      });
      Film.glide(s, 'kid2', PX + 210, TY2 + 2.05, { dur: 0.3, hold: 0.1, skip: true }); Film.glide(s, 'baby', PX - 130, TY2 + 2.55, { dur: 0.3, hold: 0.1, skip: true }); // подпрыгивают на месте
      s.out(sk, T3 - 0.6, { dur: 0.3 });
      s.tween(yt, T3 - 0.6, { opacity: 0.35 }, { opacity: 1, duration: 0.2 });
      // игрушки остаются на земле у классиков — дети отпускают их и идут к очереди
      s.hands('baby', 'off', T3 - 0.1, 0.2); s.hands('kid2', 'off', T3 - 0.1, 0.2);
      // Дима выходит последним и встаёт у стены школы (на асфальте, ниже окон, не у двери) — его не зовут
      s.actor('kid3', { x: SD, y: GD - 40, d: 80, o: 0 }, TY2 + 0.9, 0.01); s.gaze('kid3', 8, 0, TY2 + 0.9, 0.01); s.mouth('kid3', 'soft', TY2 + 0.9, 0.01);
      s.actor('kid3', { o: 1 }, TY2 + 0.95, 0.01);
      s.actor('kid3', { y: GD + 64, d: 96 }, TY2 + 1.2, 0.35, 'power2.out'); // стоит на земле перед стеной, не «из цоколя»
      s.gaze('kid3', -10, 0, TY2 + 1.55, 0.15); s.actor('kid3', { x: 220 }, TY2 + 1.6, 0.6, 'power2.inOut');
      s.gaze('kid3', 8, 2, TY2 + 2.3, 0.3);
      s.mouth('kid3', 'flat', T3 + 2.4, 0.4);
      // --- кадр 3: классики мелом 1–10: Аня прыгает на одной ноге, Миша наступает на линию ---
      s.gaze('kid2', -12, 0, T3, 0.15); s.gaze('baby', -12, 0, T3, 0.15);
      s.actor('kid2', { y: cells[0].y - 50, d: 90 }, T3, 0.3, 'power2.inOut');
      K().walk(s, 'kid2', cells[0].x - 70, T3 + 0.35, { step: 130, dur: 0.12, hold: 0.03 });
      s.actor('baby', { y: cells[0].y - 44, d: 90 }, T3, 0.3, 'power2.inOut');
      K().walk(s, 'baby', cells[0].x - 160, T3 + 0.35, { step: 130, dur: 0.12, hold: 0.03 });
      s.gaze('baby', 8, 0, T3 + 1.6, 0.2); s.gaze('kid2', 12, 0, T3 + 1.55, 0.15);
      var t = T3 + 1.7;
      var da = cells[2].x - (cells[0].x - 70); // Аня: 1, 2, 3 — вприпрыжку на одной ноге, потом прыжок на 4
      t += Film.glide(s, 'kid2', cells[2].x, t, { step: da / 3, dur: 0.32, hold: 0.06, skip: true });
      t = hop2(s, 'kid2', cells[3].x, cells[3].y - 50, t, 0.32, 36) + 0.06;
      t = hop2(s, 'kid2', cells[5].x, cells[3].y - 104, t, 0.3, 24) + 0.05; // спрыгивает с классиков на асфальт — цифры видны, дерево не у банта
      s.mouth('kid2', 'smile', t, 0.2); s.gaze('kid2', -8, 4, t + 0.1, 0.2);
      // Миша прыгает и попадает на черту между 1 и 2
      var tm = t + 0.1;
      var lx = (cells[0].x + cells[1].x) / 2;
      tm += Film.glide(s, 'baby', lx, tm, { step: (lx - (cells[0].x - 160)) / 2, dur: 0.32, hold: 0.03, skip: true }); // два прыжка: в 1 и на черту
      var hit = s.path(ov, 'M' + lx + ' ' + (cells[1].y - 37) + ' V' + (cells[1].y + 37), { stroke: RED, 'stroke-width': 8 });
      s.tween(hit, tm, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 3, yoyo: true });
      s.brow('baby', 'sad', tm + 0.1, 0.3);
      K().say(s, 'Ты наступил на линию!', cells[5].x - 40, 438, tm + 0.15, tm + 3.0, 'l'); // выше скамейки, не касается ствола
      s.squash('kid2', 1.04, 0.96, tm + 0.25, 0.1); s.squash('kid2', 1, 1, tm + 0.35, 0.3);
      s.brow('baby', 'calm', tm + 1.8, 0.4); s.mouth('baby', 'soft', tm + 1.8, 0.3);
      s.gaze('baby', -12, 0, tm + 1.95, 0.15); Film.glide(s, 'baby', cells[0].x - 160, tm + 2.0, { step: 400, dur: 0.3, hold: 0.1, skip: true }); // назад к очереди
      s.gaze('baby', 9, 0, tm + 2.5, 0.2);
      verdict(s, 'игра не исчезла — ушла на перемену и обросла правилами.', T3 + 6.0);
      small(s, 'Д. Б. Эльконин, 1971: новая ведущая деятельность «не отменяет прежде существовавших» · Ж. Пиаже, 1932: игры по общим правилам — с 7–8 лет · П. Блэтчфорд и др., 2003: на перемене семилетки треть времени играют по правилам', T3 + 6.5, 990).style.color = '#3C4852';
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.45);
    }
  });

  // ---------- 1:45 — Родительский чат: мама у плиты мешает ложкой в кастрюле и читает телефон, Миша делает уроки ----------
  Film.scene({
    id: 'chat', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var kc = P().kitchen(s, g, KIT);
      s.node(g, 'rect', { x: 1382, y: 232, width: 276, height: 236, fill: '#3B5068', opacity: 0.85 }); // вечер (окно — за телефоном)
      deskBook(s, g, 1030, kc.table.y, 88); // тетрадь перед Мишей
      var hd = s.text('h3', 'Учёные проверили советы из родительского чата.', { left: 140, top: 130, width: 700 });
      s.lines(hd, 0.1);
      s.gear('baby', 'backpack', false, 0, 0.01); // дома ранец снят
      // мама у плиты: левая рука-точка с ложкой в кастрюле, правая — с телефоном
      var MX = 500, MD = 240, MY = P().standY(kc.floor, MD, false), HC = '#304B61';
      K().cast(s, 'mom', MX, MY, MD, 0, { gx: 8, gy: 4, dur: 0.01 }); s.brow('adult', 'calm', 0, 0.01); s.hands('adult', 'off', 0, 0.01);
      var lh = s.node(ov, 'g', {}), sp = s.node(lh, 'g', {}), LX = MX - 72, LY = MY - 112; // рука-точка у самого тела, над плитой, ложка — в кастрюлю
      s.path(sp, 'M' + LX + ' ' + LY + ' L' + (kc.stove.x + 52) + ' ' + (kc.stove.top - 92), { stroke: '#B9874F', 'stroke-width': 8 }); // ложка: ручка уходит в кастрюлю
      s.node(lh, 'circle', { cx: LX, cy: LY, r: 24, fill: HC });
      s.tween(lh, 0, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.tween(sp, 0.8, { rotation: -6, svgOrigin: LX + ' ' + LY }, { rotation: 6, svgOrigin: LX + ' ' + LY, duration: 0.6, repeat: 37, yoyo: true, ease: 'sine.inOut' }); // мешает
      var hx = MX + 128, hy = MY + 34, tp = s.node(ov, 'g', {}); // телефон в руке на уровне груди, не у уха
      s.node(tp, 'rect', { x: hx - 18, y: hy - 70, width: 36, height: 60, rx: 7, fill: '#1D2733', stroke: INK, 'stroke-width': 2 });
      s.node(tp, 'rect', { x: hx - 12, y: hy - 63, width: 24, height: 42, rx: 3, fill: '#DCEFEA' });
      s.node(tp, 'circle', { cx: hx, cy: hy, r: 24, fill: HC });
      s.tween(tp, 0, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      // Миша за столом перед прописью делает уроки
      var seat = kc.seat;
      K().cast(s, 'misha', seat.x - 14, seat.y - 62, 124, 0, { gx: -8, gy: 6, mouth: 'soft', dur: 0.01 }); s.brow('baby', 'focus', 0, 0.01);
      // рука-точка с карандашом пишет в тетради на столе
      var wh = s.node(ov, 'g', {}), WX = 1132, WY = kc.table.y - 12; // кисть у тела
      s.path(wh, 'M' + (WX - 30) + ' ' + (WY + 6) + ' L' + (WX + 2) + ' ' + (WY - 26), { stroke: '#E0A93B', 'stroke-width': 6 });
      s.path(wh, 'M' + (WX - 30) + ' ' + (WY + 6) + ' l6 -10', { stroke: INK, 'stroke-width': 4 });
      s.node(wh, 'circle', { cx: WX + 6, cy: WY - 10, r: 15, fill: '#C9634C' });
      s.tween(wh, 0, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.tween(wh, 0.8, { x: -22 }, { x: 0, duration: 0.5, repeat: 45, yoyo: true, ease: 'sine.inOut' }); // пишет — рука ходит по строке
      [1.2, 1.5, 3.0, 3.3, 6.0, 6.3, 9.5, 9.8, 14.0, 14.3, 18.5, 18.8].forEach(function (tt) { s.squash('baby', 1.03, 0.97, tt, 0.1); s.squash('baby', 1, 1, tt + 0.1, 0.12); }); // пишет
      // экран телефона крупно справа — выноска от телефона в руке мамы (над столом и под лампой)
      var ph = K().phone(s, 1320, 120, 540, 860);
      s.tween(ph.el, 0, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      var hi = ph.add('Добрый вечер всем!', 0.4); hi.style.top = '20px'; // экран не пустой с начала
      var ld = s.path(ov, 'M' + (hx + 20) + ' ' + (hy - 70) + ' L1320 140 M' + (hx + 20) + ' ' + (hy - 66) + ' L1320 420', { stroke: INK, 'stroke-width': 2, 'stroke-dasharray': '6 8', opacity: 0 });
      s.tween(ld, 0.3, { opacity: 0 }, { opacity: 0.35, duration: 0.4 });
      var items = [
        ['Учитель верит в ребёнка — и ребёнок умнеет!', 'так бывает, только пока учитель ещё не знает детей.', 3.3, 7.0],
        ['Не хвалите за ум — это вредно!', 'вреда почти не нашли.', 11.8, 15.0],
        ['Ваш ребёнок визуал — учите картинками!', 'учить «под стиль» не помогает.', 17.8, 20.7]
      ];
      var y = 20 + hi.offsetHeight + 24;
      items.forEach(function (it, i) {
        var m = ph.add(it[0], it[2]);
        m.style.top = y + 'px';
        var st = Film.el('div', 'tstamp', m.parentNode, '<b>Проверили:</b> ' + it[1]);
        Film.css(st, { position: 'absolute', left: '24px', top: (y + m.offsetHeight + 14) + 'px', fontFamily: 'var(--sans)', fontWeight: 650, fontSize: '25px', lineHeight: 1.25, whiteSpace: 'normal', width: '400px', background: '#FFFDF8', padding: '6px 14px' });
        y += m.offsetHeight + 14 + st.offsetHeight + 34; // равные зазоры между блоками
        s.tween(st, it[3], { opacity: 0, scale: 1.5, rotation: -10, transformOrigin: '30% 50%' }, { opacity: 1, scale: 1, rotation: -2, duration: 0.25, ease: 'power3.in' });
        s.gaze('adult', 9, 6, it[2] + 0.3, 0.3); s.mouth('adult', 'soft', it[3] + 0.4, 0.3);
        s.gaze('baby', -9, -4, it[3] + 0.3, 0.3); s.mouth('baby', 'smile', it[3] + 0.4, 0.2); // поднял голову от тетради, смотрит на маму
        s.gaze('baby', -8, 6, it[3] + 1.8, 0.3); s.mouth('baby', 'soft', it[3] + 1.9, 0.2);
        s.tween(tp, it[2] - 0.2, { rotation: 0, transformOrigin: '50% 100%' }, { rotation: 6, duration: 0.06, repeat: 5, yoyo: true }); // звякнул
      });
      // Миша поднимает голову и смеётся, мама улыбается ему
      s.gaze('baby', -9, -2, 22.0, 0.3); s.mouth('baby', 'smile', 22.2, 0.2);
      [22.4, 22.9].forEach(function (t) { s.squash('baby', 1.05, 0.95, t, 0.1); s.squash('baby', 1, 1, t + 0.1, 0.25); });
      s.gaze('adult', 8, 0, 23.0, 0.3); s.mouth('adult', 'smile', 23.2, 0.3);
      // сноска раскрывается по мере проверок
      var fn = s.text('cite', '<span>эффект Пигмалиона — Р. Раунденбуш, 1984</span><span> · установка на рост — Ю. Ли, Т. Бейтс, 2019</span><span> · стили обучения — Х. Пашлер и др., 2008</span>', { left: 140, top: 990, width: 1120, fontSize: 20 });
      Array.prototype.forEach.call(fn.children, function (sp2, i) { s.tween(sp2, items[i][3] + 0.6, { opacity: 0 }, { opacity: 1, duration: 0.5 }); });
      s.out([lh, tp, wh], s.dur - 0.45, { dur: 0.3 }); s.out(ld, s.dur - 0.45, { dur: 0.3, from: 0.35 });
      off(s, ['baby', 'adult'], s.dur - 0.45);
    }
  });
})();
