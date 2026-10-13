/* Глава 3. Помнить нарочно · память: шлем космонавта (Флейвелл, 1966; повторение 2021), шахматная дуэль (Чи, 1978; Шнайдер, 1993) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', LIGHT = '#9FD6CF';

  // простые картинки для опыта Флейвелла: мяч, дом, рыба и ещё четыре
  function pic(s, g, i, x, y) {
    var c = s.node(g, 'g', {}), a = { fill: 'none', stroke: INK, 'stroke-width': 3.5 };
    s.node(c, 'rect', { x: x - 54, y: y - 54, width: 108, height: 108, rx: 12, fill: '#FFFDF8', stroke: '#D9D0C4', 'stroke-width': 2 });
    var P = [
      function () { K().ball(s, c, x, y, 28); },
      function () { s.node(c, 'rect', Object.assign({ x: x - 24, y: y - 24, width: 48, height: 48 }, a)); },
      function () { s.path(c, 'M' + (x - 26) + ' ' + (y + 24) + ' V' + (y - 4) + ' L' + x + ' ' + (y - 28) + ' L' + (x + 26) + ' ' + (y - 4) + ' V' + (y + 24) + ' Z', { fill: '#F3E6D2', stroke: INK, 'stroke-width': 3.5 }); },
      function () { s.path(c, 'M' + x + ' ' + (y - 28) + ' L' + (x + 28) + ' ' + (y + 22) + ' L' + (x - 28) + ' ' + (y + 22) + ' Z', a); },
      function () { s.path(c, 'M' + (x - 30) + ' ' + y + ' Q' + (x - 6) + ' ' + (y - 24) + ' ' + (x + 16) + ' ' + y + ' Q' + (x - 6) + ' ' + (y + 24) + ' ' + (x - 30) + ' ' + y + ' Z M' + (x + 16) + ' ' + y + ' L' + (x + 32) + ' ' + (y - 14) + ' L' + (x + 32) + ' ' + (y + 14) + ' Z', { fill: '#9CC3D5', stroke: INK, 'stroke-width': 3.5 }); },
      function () { s.path(c, 'M' + x + ' ' + (y - 28) + ' V' + (y + 28) + ' M' + (x - 22) + ' ' + (y - 6) + ' L' + x + ' ' + (y - 28) + ' L' + (x + 22) + ' ' + (y - 6), a); },
      function () { K().tree(s, c, x, y + 30, 0.26); }
    ];
    P[i]();
    return c;
  }

  // 2:45 — заставка главы (19 тактов = 47,5 с)
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.chapterCard(3, 'Помнить нарочно', 'Как меняется память?');
      s.chapter(3, 'Помнить нарочно', 0.4, 46.9);
    }
  });

  // 2:47,5 — Шлем космонавта: повторяет ли ребёнок про себя? (Дж. Флейвелл, Д. Бич, Дж. Чински, 1966; Э. Эллиотт и др., 2021)
  Film.scene({
    id: 'helmet', bars: 11,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var t1 = s.hud('lead', 'Как запомнить, в каком порядке показали картинки?', { left: 140, top: 130, width: 1640, fontSize: 40 });
      s.tween(t1, 0.3, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }); s.tween(t1, 3.2, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      var pics = [], PX = function (i) { return 600 + i * 130; }, PY = 330;
      for (var i = 0; i < 7; i++) { var p = pic(s, g, i, PX(i), PY); s.tween(p, 0.6 + i * 0.06, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }); pics.push(p); }
      // экспериментатор показывает на три: мяч, дом, рыба
      s.actor('stranger', { x: 330, y: 380, d: 140, o: 0 }, 0, 0.01); s.actor('stranger', { o: 1 }, 0.6, 0.4);
      s.face('stranger', true, 0.6, 0.01); s.mouth('stranger', 'smile', 0.6, 0.01); s.gaze('stranger', 9, 0, 0.6, 0.01); s.acc('stranger', 'glasses');
      K().tag(s, 'экспериментатор', 330, 470, 1.0, 4.0);
      [0, 2, 4].forEach(function (pi, j) {
        var r = s.node(ov, 'circle', { cx: PX(pi), cy: PY, r: 66, fill: 'none', stroke: K().TEAL, 'stroke-width': 5 });
        s.draw(r, 1.6 + j * 0.45, { dur: 0.3 }); s.out(r, 4.2, { dur: 0.3 });
        var n = s.text('kidhand', String(j + 1), { left: PX(pi) - 12, top: PY - 124, fontSize: 40, color: 'var(--accent-deep)' });
        s.fade(n, 1.7 + j * 0.45, { y: 0 }); s.out(n, 4.2, { dur: 0.3 });
      });
      // Миша в шлеме
      var CX = 960, CY = 760;
      s.actor('baby', { x: CX, y: CY, d: 120, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.8, 0.4);
      s.face('baby', true, 0.8, 0.01); s.mouth('baby', 'soft', 0.8, 0.01); s.gaze('baby', 0, -8, 0.8, 0.01); s.acc('baby', 'hero');
      var helm = s.node(ov, 'g', {});
      K().helmet(s, helm, CX, CY, 92);
      s.tween(helm, 3.0, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' });
      var t2 = s.hud('lead', 'Чтобы не подглядывал — шлем космонавта. Наблюдатель читает по губам: повторяет ли он про себя?', { left: 140, top: 130, width: 1640, fontSize: 38 });
      s.tween(t2, 3.4, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }); s.tween(t2, 10.6, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      var visor = s.node(ov, 'rect', { x: CX - 74, y: CY - 76, width: 148, height: 62, rx: 22, fill: '#2F4A43', opacity: 0 });
      s.tween(visor, 4.6, { opacity: 0, attr: { y: CY - 100 } }, { opacity: 1, attr: { y: CY - 52 }, duration: 0.35, ease: 'power2.in' });
      var tm = s.text('kidhand', '15 с', { left: CX + 130, top: CY - 40, fontSize: 48, color: 'var(--accent-deep)' });
      s.fade(tm, 4.9, { y: 0 }); s.out(tm, 9.2, { dur: 0.3 });
      s.actor('stranger', { x: CX - 230, y: CY - 30 }, 4.8, 1.0, 'power2.inOut'); // наблюдатель подходит
      s.gaze('stranger', 9, 2, 5.6, 0.3);
      // наезд на губы: шёпот
      s.cam({ cx: CX, cy: CY + 10, z: 2.2 }, 5.6, 0.9, 'power2.inOut');
      for (var w = 0; w < 6; w++) {
        var arc = s.path(ov, 'M' + (CX + 50 + (w % 3) * 12) + ' ' + (CY + 6) + ' q 10 12 0 24', { stroke: K().TEAL, 'stroke-width': 3, opacity: 0 });
        s.tween(arc, 6.6 + w * 0.32, { opacity: 0 }, { opacity: 1, duration: 0.12 });
        s.tween(arc, 6.85 + w * 0.32, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      }
      var wh = s.div('bubble say tail-l', { left: CX + 70, top: CY - 80, fontSize: '17px', padding: '3px 10px 5px' }, s.ov, 'мяч, дом, рыба…');
      s.pop(wh, 6.8, { from: 0.7, dur: 0.3, origin: '10% 100%' }); s.out(wh, 8.6, { dur: 0.3 });
      s.cam({ cx: 960, cy: 540, z: 1 }, 8.8, 0.8, 'power2.inOut');
      s.tween(visor, 9.4, { opacity: 1, attr: { y: CY - 52 } }, { opacity: 0, attr: { y: CY - 100 }, duration: 0.3, ease: 'power2.out' });
      s.mouth('baby', 'smile', 9.6, 0.2); s.gaze('baby', 0, -9, 9.6, 0.2);
      [0, 2, 4].forEach(function (pi, j) {
        var ck = s.path(ov, 'M' + (PX(pi) - 18) + ' ' + (PY + 72) + ' l12 14 l24 -28', { stroke: K().TEAL, 'stroke-width': 5 });
        s.draw(ck, 9.9 + j * 0.35, { dur: 0.2 }); s.out(ck, 11.2, { dur: 0.3 });
      });
      s.out(pics, 11.2, { dur: 0.4 });
      s.actor('stranger', { o: 0 }, 11.0, 0.4);
      s.actor('baby', { x: 300, y: 860, d: 100 }, 11.2, 0.6, 'power2.inOut'); s.tween(helm, 11.2, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      // итог: доля тех, кто шептал
      var BX = 1080, BB = 760, bars = [['5 лет', 0.10, '10 %'], ['7 лет', 0.5, 'около половины'], ['10 лет', 0.95, 'почти все']];
      var cap = s.text('small-caps', 'повторяли про себя', { left: BX, top: 380 });
      s.fade(cap, 11.4, { y: 4 });
      bars.forEach(function (b, j) {
        var x = BX + j * 230, hgt = 300 * b[1];
        var r = s.node(g, 'rect', { x: x, y: BB, width: 90, height: 0, rx: 4, fill: K().TEAL });
        s.tween(r, 11.6 + j * 0.2, { attr: { y: BB, height: 0 } }, { attr: { y: BB - hgt, height: hgt }, duration: 0.6, ease: 'power2.out' });
        var lb = s.text('label', b[0], { left: x - 20, top: BB + 14, width: 130, textAlign: 'center' });
        var v = s.text('note', b[2], { left: x - 65, top: BB - hgt - 40, width: 220, textAlign: 'center', fontSize: 22 });
        s.fade(lb, 11.7 + j * 0.2, { y: 4 }); s.fade(v, 12.0 + j * 0.2, { y: 4 });
      });
      var t3 = s.hud('lead', '1966 год: пятилетки почти не повторяли, десятилетки — почти все. И кто повторял — помнил больше.', { left: 140, top: 130, width: 860, fontSize: 34 });
      s.tween(t3, 12.0, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var rr = s.node(g, 'rect', { x: BX + 100, y: BB, width: 50, height: 0, rx: 4, fill: LIGHT });
      s.tween(rr, 17.0, { attr: { y: BB, height: 0 } }, { attr: { y: BB - 228, height: 228 }, duration: 0.6, ease: 'power2.out' });
      var rl = s.text('note', '2021: 76 %', { left: BX + 50, top: BB - 276, width: 150, textAlign: 'center', fontSize: 22, color: 'var(--accent-deep)' });
      s.fade(rl, 17.3, { y: 4 });
      var t4 = s.hud('lead', 'В 2021 году повторили: шептали и многие пятилетки.', { left: 140, top: 330, width: 860, fontSize: 34 });
      s.tween(t4, 17.2, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var t5 = s.hud('h3', 'Память становится произвольной: запоминают нарочно, с приёмом.', { left: 140, top: 470, width: 860, fontSize: 42 });
      s.tween(t5, 20.6, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var src = s.hud('cite', 'rehearsal · Дж. Флейвелл и др., 1966: по 20 детей · Э. Эллиотт и др., 2021: 17 лабораторий', { left: 140, top: 1010, fontSize: 20 });
      s.tween(src, 22.0, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.tween([t3, t4, t5, src], 27.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.actor('baby', { o: 0 }, 27.0, 0.4);
    }
  });

  // 3:15 — Шахматная дуэль: Миша против папы (М. Чи, 1978; В. Шнайдер и др., 1993)
  Film.scene({
    id: 'chess', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var home = s.node(g, 'g', {}); K().kitchen(s, home, 960, 1000, { lamp: false });
      var t1 = s.text('lead', 'Позиция — 10 секунд. Кто запомнит больше?', { left: 140, top: 130, width: 1640, fontSize: 40 });
      s.lines(t1, 0.3);
      s.actor('dad', { x: 520, y: 760, d: 160, o: 0 }, 0, 0.01); s.actor('dad', { o: 1 }, 0.2, 0.4);
      s.face('dad', true, 0.2, 0.01); s.mouth('dad', 'smile', 0.2, 0.01); s.gaze('dad', 9, 6, 0.2, 0.01); s.acc('dad', 'moustache');
      s.actor('baby', { x: 1400, y: 790, d: 100, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.3, 0.4);
      s.face('baby', true, 0.3, 0.01); s.mouth('baby', 'smile', 0.3, 0.01); s.gaze('baby', -9, 6, 0.3, 0.01); s.acc('baby', 'hero');
      K().tag(s, 'папа', 520, 920, 0.6, 3.6); K().tag(s, 'Миша · шахматный кружок', 1400, 920, 0.6, 3.6);
      // доска с позицией
      var B0 = 820, BY = 520, C = 46, board = s.node(ov, 'g', {});
      for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) s.node(board, 'rect', { x: B0 + c * C, y: BY + r * C, width: C, height: C, fill: (r + c) % 2 ? '#B48A62' : '#F3E6D2' });
      var POS = [[0, 1, 'k', 1], [1, 4, 'p', 0], [2, 2, 'p', 1], [2, 5, 'k', 0], [3, 0, 'p', 0], [3, 3, 'k', 1], [4, 1, 'p', 1], [4, 4, 'p', 0], [5, 2, 'k', 0]];
      POS.forEach(function (p) { (p[2] === 'k' ? K().knight : K().pawn)(s, board, B0 + p[1] * C + C / 2, BY + p[0] * C + C - 4, 0.75, p[3]); });
      s.tween(board, 0.8, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      var tm = s.text('kidhand', '10 с', { left: B0 + 90, top: BY - 70, fontSize: 48, color: 'var(--accent-deep)' });
      s.fade(tm, 1.0, { y: 0 }); s.out(tm, 3.2, { dur: 0.2 });
      var cloth = s.node(ov, 'rect', { x: B0 - 10, y: BY - 10, width: 6 * C + 20, height: 6 * C + 20, rx: 8, fill: '#E8B4A0', stroke: INK, 'stroke-width': 3 });
      s.tween(cloth, 3.2, { opacity: 0, attr: { y: BY - 120 } }, { opacity: 1, attr: { y: BY - 10 }, duration: 0.35, ease: 'power2.in' });
      // каждый расставляет по памяти
      function rebuild(x0, n, t0) {
        var bg = s.node(ov, 'g', {});
        for (var rr = 0; rr < 6; rr++) for (var cc = 0; cc < 6; cc++) s.node(bg, 'rect', { x: x0 + cc * 30, y: 560 + rr * 30, width: 30, height: 30, fill: (rr + cc) % 2 ? '#B48A62' : '#F3E6D2' });
        s.tween(bg, t0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        for (var i = 0; i < n; i++) {
          var p = POS[i], pg = s.node(bg, 'g', {});
          (p[2] === 'k' ? K().knight : K().pawn)(s, pg, x0 + p[1] * 30 + 15, 560 + p[0] * 30 + 27, 0.5, p[3]);
          s.tween(pg, t0 + 0.3 + i * 0.22, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.2 });
        }
        return bg;
      }
      var bd = rebuild(260, 6, 3.8), bm = rebuild(1500, 9, 3.8);
      s.gaze('dad', 0, -9, 4.4, 0.3); // вспоминает
      var s1 = s.text('h3', 'фигуры: <span class="acc">Миша 9</span> · папа 6', { left: 140, top: 230, width: 1200, fontSize: 44 });
      s.fade(s1, 6.2, { y: 8 });
      s.mouth('baby', 'smile', 6.2, 0.2); s.squash('baby', 0.94, 1.08, 6.3, 0.12); s.squash('baby', 1, 1, 6.42, 0.3, 'back.out(3)');
      var t2 = s.text('lead', 'Миша знает шахматы и видит знакомые узоры.', { left: 140, top: 310, width: 1200, fontSize: 34 });
      s.lines(t2, 7.2);
      // ряд цифр
      s.out([board, cloth, bd, bm, t1], 9.6, { dur: 0.4 });
      var dg = s.text('display', '7 3 9 1 5 8 2 6', { left: 0, top: 520, width: 1920, textAlign: 'center', fontSize: 110, color: 'var(--accent-deep)' });
      s.fade(dg, 10.0, { y: 10, dur: 0.4 }); s.out(dg, 11.6, { dur: 0.3 });
      s.gaze('dad', 9, 0, 10.0, 0.3); s.gaze('baby', -9, 0, 10.0, 0.3);
      var s2 = s.text('h3', 'цифры: <span class="acc">папа 8</span> · Миша 6', { left: 140, top: 400, width: 1200, fontSize: 44 });
      s.fade(s2, 12.0, { y: 8 });
      s.mouth('dad', 'smile', 12.0, 0.2); s.mouth('baby', 'flat', 12.0, 0.2);
      var t3 = s.text('h3', 'В цифрах узоров нет. Память растёт вместе со знаниями.', { left: 140, top: 520, width: 1400, fontSize: 44 });
      s.lines(t3, 13.4);
      var src = s.text('cite', 'М. Чи, 1978: 6 детей ~10 лет и 6 взрослых — фигур 9,3 и 5,9, цифр 6,1 и 7,8 · В. Шнайдер и др., 1993 — повторилось', { left: 140, top: 1020, fontSize: 18 });
      s.fade(src, 14.6, { y: 4 });
      ['dad', 'baby'].forEach(function (id) { s.actor(id, { o: 0 }, 17.0, 0.4); });
    }
  });
})();
