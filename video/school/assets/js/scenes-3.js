/* Глава 3. Помнить нарочно · память и произвольность: шлем космонавта (Флейвелл, 1966; повторение 2021), шахматисты (Чи, 1978) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', LIGHT = '#9FD6CF', CHILD = '#E4735A', ADULT = '#385771';

  // простые картинки для опыта Флейвелла
  function pic(s, g, i, x, y) {
    var c = s.node(g, 'g', {}), a = { fill: 'none', stroke: INK, 'stroke-width': 3.5 };
    s.node(c, 'rect', { x: x - 52, y: y - 52, width: 104, height: 104, rx: 10, fill: '#FFFDF8', stroke: '#D9D0C4', 'stroke-width': 2 });
    var P = [
      function () { s.node(c, 'circle', Object.assign({ cx: x, cy: y, r: 26 }, a)); },
      function () { s.node(c, 'rect', Object.assign({ x: x - 24, y: y - 24, width: 48, height: 48 }, a)); },
      function () { s.path(c, 'M' + x + ' ' + (y - 28) + ' L' + (x + 28) + ' ' + (y + 22) + ' L' + (x - 28) + ' ' + (y + 22) + ' Z', a); },
      function () { s.path(c, 'M' + (x - 28) + ' ' + (y + 6) + ' Q' + x + ' ' + (y - 34) + ' ' + (x + 28) + ' ' + (y + 6) + ' M' + (x - 28) + ' ' + (y + 6) + ' L' + (x + 28) + ' ' + (y + 6), a); },
      function () { s.path(c, 'M' + (x - 26) + ' ' + (y + 24) + ' V' + (y - 4) + ' L' + x + ' ' + (y - 26) + ' L' + (x + 26) + ' ' + (y - 4) + ' V' + (y + 24) + ' Z', a); },
      function () { s.path(c, 'M' + (x - 28) + ' ' + y + ' Q' + (x - 6) + ' ' + (y - 22) + ' ' + (x + 16) + ' ' + y + ' Q' + (x - 6) + ' ' + (y + 22) + ' ' + (x - 28) + ' ' + y + ' M' + (x + 16) + ' ' + y + ' L' + (x + 30) + ' ' + (y - 12) + ' L' + (x + 30) + ' ' + (y + 12) + ' Z', a); },
      function () { s.path(c, 'M' + x + ' ' + (y - 28) + ' V' + (y + 28) + ' M' + (x - 22) + ' ' + (y - 6) + ' L' + x + ' ' + (y - 28) + ' L' + (x + 22) + ' ' + (y - 6), a); }
    ];
    P[i]();
    return c;
  }

  // 2:15 — заставка главы (11 тактов = 27,5 с)
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.chapterCard(3, 'Помнить нарочно', 'память и произвольность');
      s.chapter(3, 'Помнить нарочно', 0.4, 26.9);
    }
  });

  // 2:17,5 — Шлем космонавта: повторение про себя (Дж. Флейвелл, Д. Бич, Дж. Чински, 1966; Э. Эллиотт и др., 2021)
  Film.scene({
    id: 'helmet', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'Дж. Флейвелл и др., 1966', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var pics = [], PX = function (i) { return 820 + i * 140; }, PY = 330;
      for (var i = 0; i < 7; i++) { var p = pic(s, g, i, PX(i), PY); s.tween(p, 0.3 + i * 0.06, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }); pics.push(p); }
      var steps = [['1. 3 из 7 картинок', 0.8], ['2. 15 секунд не видно', 2.8], ['3. Шепчет ли?', 4.0], ['4. По порядку', 7.0]];
      steps.forEach(function (st, j) { var e = s.text('kidhand', st[0], { left: 140, top: 250 + j * 70, fontSize: 40 }); s.fade(e, st[1], { y: 6 }); });
      // экспериментатор показывает три картинки
      s.actor('adult2', { x: 600, y: 360, d: 120, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 0.5, 0.4);
      [1, 4, 6].forEach(function (pi, j) {
        var r = s.node(ov, 'circle', { cx: PX(pi), cy: PY, r: 66, fill: 'none', stroke: K().TEAL, 'stroke-width': 5 });
        s.draw(r, 1.2 + j * 0.4, { dur: 0.3 });
        s.out(r, 2.8, { dur: 0.3 });
        var n = s.text('kidhand', String(j + 1), { left: PX(pi) - 12, top: PY - 120, fontSize: 40, color: 'var(--accent-deep)' });
        s.fade(n, 1.3 + j * 0.4, { y: 0 }); s.out(n, 2.8, { dur: 0.3 });
      });
      // ребёнок в «шлеме космонавта»
      var CX = 1240, CY = 700;
      s.actor('baby', { x: CX, y: CY, d: 120, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.6, 0.4);
      s.face('baby', true, 0.7, 0.3); s.mouth('baby', 'soft', 0.7, 0.01); s.gaze('baby', -6, -8, 0.7, 0.01);
      var helm = s.node(ov, 'circle', { cx: CX, cy: CY, r: 88, fill: 'none', stroke: INK, 'stroke-width': 5 });
      s.tween(helm, 0.7, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var visor = s.node(ov, 'rect', { x: CX - 70, y: CY - 74, width: 140, height: 60, rx: 22, fill: '#2F4A43', opacity: 0 });
      s.tween(visor, 3.0, { opacity: 0, attr: { y: CY - 96 } }, { opacity: 1, attr: { y: CY - 50 }, duration: 0.35, ease: 'power2.in' });
      var tm = s.text('kidhand', '15 с', { left: CX + 110, top: CY - 150, fontSize: 44, color: 'var(--accent-deep)' });
      s.fade(tm, 3.3, { y: 0 }); s.out(tm, 7.0, { dur: 0.3 });
      // шёпот — волны у губ
      for (var w = 0; w < 6; w++) {
        var arc = s.path(ov, 'M' + (CX + 60 + (w % 3) * 14) + ' ' + (CY + 2) + ' q 12 14 0 28', { stroke: K().TEAL, 'stroke-width': 3.5, opacity: 0 });
        s.tween(arc, 4.3 + w * 0.42, { opacity: 0 }, { opacity: 1, duration: 0.15 });
        s.tween(arc, 4.6 + w * 0.42, { opacity: 1 }, { opacity: 0, duration: 0.25 });
      }
      s.squash('baby', 1.02, 0.98, 4.4, 0.2); s.squash('baby', 1, 1, 4.6, 0.2);
      s.tween(visor, 7.2, { opacity: 1, attr: { y: CY - 50 } }, { opacity: 0, attr: { y: CY - 96 }, duration: 0.3, ease: 'power2.out' });
      s.mouth('baby', 'smile', 7.4, 0.2);
      [1, 4, 6].forEach(function (pi, j) {
        var ck = s.path(ov, 'M' + (PX(pi) - 18) + ' ' + (PY + 70) + ' l12 14 l24 -28', { stroke: K().TEAL, 'stroke-width': 5 });
        s.draw(ck, 7.7 + j * 0.35, { dur: 0.2 });
        s.out(ck, 9.0, { dur: 0.3 });
      });
      s.out(pics, 9.0, { dur: 0.4 });
      s.actor('adult2', { o: 0 }, 9.0, 0.4);
      // итог: доля тех, кто шептал
      var BX = 780, BB = 520, bars = [['5 лет', 0.10, '10 %'], ['7 лет', 0.5, 'около половины'], ['10 лет', 0.95, 'почти все']];
      bars.forEach(function (b, j) {
        var x = BX + j * 230, hgt = 300 * b[1];
        var r = s.node(g, 'rect', { x: x, y: BB, width: 90, height: 0, rx: 4, fill: K().TEAL });
        s.tween(r, 9.4 + j * 0.2, { attr: { y: BB, height: 0 } }, { attr: { y: BB - hgt, height: hgt }, duration: 0.6, ease: 'power2.out' });
        var lb = s.text('label', b[0], { left: x - 20, top: BB + 14, width: 130, textAlign: 'center' });
        var v = s.text('note', b[2], { left: x - 65, top: BB - hgt - 40, width: 220, textAlign: 'center', fontSize: 22 });
        s.fade(lb, 9.5 + j * 0.2, { y: 4 }); s.fade(v, 9.9 + j * 0.2, { y: 4 });
      });
      var cap = s.text('small-caps', 'шептали', { left: BX, top: 160 });
      s.fade(cap, 9.4, { y: 4 });
      var t1 = s.text('h3', 'Кто шепчет — помнит больше · <span class="en-line">rehearsal</span>', { left: 140, top: 580, width: 600, fontSize: 40 });
      s.fade(t1, 11.0, { y: 10 });
      var rr = s.node(g, 'rect', { x: BX + 100, y: BB, width: 50, height: 0, rx: 4, fill: LIGHT });
      s.tween(rr, 13.0, { attr: { y: BB, height: 0 } }, { attr: { y: BB - 228, height: 228 }, duration: 0.6, ease: 'power2.out' });
      var rl = s.text('note', '2021: 76 %', { left: BX + 50, top: BB - 270 - 4, width: 150, textAlign: 'center', fontSize: 22, color: 'var(--accent-deep)' });
      s.fade(rl, 13.3, { y: 4 });
      var t2 = s.text('lead', 'Повторение 2021: шептали уже три из четырёх пятилеток.', { left: 140, top: 880, width: 1500, fontSize: 34 });
      s.lines(t2, 13.6);
      var src = s.text('cite', 'По 20 детей в группе (1966); 17 лабораторий (Э. Эллиотт и др., 2021)', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 14.2, { y: 4 });
      s.actor('baby', { o: 0 }, 9.0, 0.4); s.out(helm, 9.0, { dur: 0.4 });
    }
  });

  // 2:35 — Шахматисты: знания важнее возраста (М. Чи, 1978; В. Шнайдер и др., 1993)
  Film.scene({
    id: 'chess', bars: 3,
    build: function (s) {
      var g = s.svg();
      var k = s.text('kicker', 'М. Чи, 1978 · В. Шнайдер и др., 1993', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var t = s.text('lead', 'Позиция — 10 секунд. Расставь по памяти.', { left: 140, top: 200, width: 1200, fontSize: 38 });
      s.lines(t, 0.3);
      var B0 = 160, BY = 330, C = 46, board = s.node(g, 'g', {});
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) s.node(board, 'rect', { x: B0 + c * C, y: BY + r * C, width: C, height: C, fill: (r + c) % 2 ? '#B48A62' : '#F3E6D2' });
      [[1, 2, 0], [2, 5, 1], [3, 3, 0], [4, 6, 1], [5, 1, 0], [6, 4, 1], [2, 2, 1], [5, 6, 0], [0, 4, 1]].forEach(function (p) {
        s.node(board, 'circle', { cx: B0 + p[1] * C + C / 2, cy: BY + p[0] * C + C / 2, r: 15, fill: p[2] ? INK : '#FFFDF8', stroke: INK, 'stroke-width': 2.5 });
      });
      s.tween(board, 0.5, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      function grp(x, title, vc, va, max, at) {
        var tt = s.text('label', title, { left: x, top: 760, width: 260, textAlign: 'center' });
        s.fade(tt, at, { y: 4 });
        [[vc, CHILD, 'дети'], [va, ADULT, 'взрослые']].forEach(function (b, i) {
          var hgt = 340 * b[0] / max, bx = x + 30 + i * 110;
          var rr = s.node(g, 'rect', { x: bx, y: 740, width: 90, height: 0, rx: 4, fill: b[1] });
          s.tween(rr, at + 0.1 + i * 0.15, { attr: { y: 740, height: 0 } }, { attr: { y: 740 - hgt, height: hgt }, duration: 0.5, ease: 'power2.out' });
          var v = s.text('note', String(b[0]).replace('.', ','), { left: bx, top: 740 - hgt - 36, width: 90, textAlign: 'center', fontSize: 24, color: '#1D2733' });
          s.fade(v, at + 0.4 + i * 0.15, { y: 4 });
        });
      }
      grp(820, 'фигуры', 9.3, 5.9, 10, 2.2);
      grp(1200, 'цифры', 6.1, 7.8, 10, 2.8);
      var lg = s.text('note', '<span style="color:#E4735A">●</span> дети-шахматисты, около 10 лет &nbsp; <span style="color:#385771">●</span> взрослые-новички', { left: 820, top: 820, width: 900, fontSize: 22 });
      s.fade(lg, 3.0, { y: 4 });
      var c2 = s.text('h3', 'Память растёт вместе со знаниями.', { left: 140, top: 880, width: 1500, fontSize: 44 });
      s.lines(c2, 4.4);
    }
  });
})();
