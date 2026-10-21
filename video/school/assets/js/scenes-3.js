/* Глава 3. Помнить нарочно · Дима (v3.1): шлем космонавта (Флейвелл, 1966; Эллиотт, 2021), шахматная дуэль (Чи, 1978) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';

  // простые картинки для опыта Флейвелла: мяч, кубик, дом, пирамидка, рыба, стрелка, дерево
  function pic(s, g, i, x, y, k) {
    k = k || 1;
    var c = s.node(g, 'g', {}), a = { fill: 'none', stroke: INK, 'stroke-width': 3.5 };
    var X = function (v) { return x + v * k; }, Y = function (v) { return y + v * k; };
    var P = [
      function () { K().ball(s, c, x, y, 28 * k); },
      function () { s.node(c, 'rect', Object.assign({ x: X(-24), y: Y(-24), width: 48 * k, height: 48 * k }, a)); },
      function () { s.path(c, 'M' + X(-26) + ' ' + Y(24) + ' V' + Y(-4) + ' L' + x + ' ' + Y(-28) + ' L' + X(26) + ' ' + Y(-4) + ' V' + Y(24) + ' Z', { fill: '#F3E6D2', stroke: INK, 'stroke-width': 3.5 }); },
      function () { s.path(c, 'M' + x + ' ' + Y(-28) + ' L' + X(28) + ' ' + Y(22) + ' L' + X(-28) + ' ' + Y(22) + ' Z', a); },
      function () { s.path(c, 'M' + X(-30) + ' ' + y + ' Q' + X(-6) + ' ' + Y(-24) + ' ' + X(16) + ' ' + y + ' Q' + X(-6) + ' ' + Y(24) + ' ' + X(-30) + ' ' + y + ' Z M' + X(16) + ' ' + y + ' L' + X(32) + ' ' + Y(-14) + ' L' + X(32) + ' ' + Y(14) + ' Z', { fill: '#9CC3D5', stroke: INK, 'stroke-width': 3.5 }); },
      function () { s.path(c, 'M' + x + ' ' + Y(-28) + ' V' + Y(28) + ' M' + X(-22) + ' ' + Y(-6) + ' L' + x + ' ' + Y(-28) + ' L' + X(22) + ' ' + Y(-6), a); },
      function () { K().tree(s, c, x, Y(30), 0.26 * k); }
    ];
    P[i]();
    return c;
  }
  function room(s, g, floor) {
    s.node(g, 'rect', { x: 0, y: 0, width: 1920, height: floor, fill: '#F4E9D8', opacity: 0.55 });
    s.path(g, 'M0 ' + floor + ' H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
  }
  function concl(s, text, lt, top) {
    var e = s.text('h3', '<span class="acc">Вывод:</span> ' + text, { left: 140, top: top || 930, width: 1640, fontSize: 42 });
    s.lines(e, lt);
    return e;
  }
  function cite(s, text, lt) { var e = s.text('cite', text, { left: 140, top: 1012, width: 1640, fontSize: 20 }); s.fade(e, lt, { y: 4 }); return e; }
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); }); }
  // шёпот: дуги у рта
  function whisper(s, ov, x, y, t, n) {
    for (var w = 0; w < n; w++) {
      var arc = s.path(ov, 'M' + (x + (w % 3) * 12) + ' ' + y + ' q 10 12 0 24', { stroke: K().TEAL, 'stroke-width': 3.5 });
      s.tween(arc, t + w * 0.32, { opacity: 0 }, { opacity: 1, duration: 0.12 });
      s.tween(arc, t + 0.25 + w * 0.32, { opacity: 1 }, { opacity: 0, duration: 0.2 });
    }
  }

  // 2:55 — заставка главы (19 тактов = 47,5 с)
  Film.scene({
    id: 'ch3', bars: 2,
    build: function (s) {
      s.chapterCard(3, 'Помнить нарочно', 'Дима сильный, но один — хочет, чтобы его позвали играть');
      K().pathsCard(s, 3, 'dima', [{ who: 'anya', x: 760, text: '150' }, { who: 'anya', x: 920, text: 'кит — зверь' }]);
      s.chapter(3, 'Помнить нарочно', 0.4, 46.9);
    }
  });

  // 3:00 — Шлем космонавта (Дж. Флейвелл и др., 1966; Э. Эллиотт и др., 2021)
  Film.scene({
    id: 'helmet', bars: 9,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      room(s, g, 700);
      // окно класса
      s.node(g, 'rect', { x: 1540, y: 300, width: 220, height: 220, rx: 6, fill: '#CFE6EE', stroke: INK, 'stroke-width': 3 });
      s.path(g, 'M1650 300 V520 M1540 410 H1760', { stroke: INK, 'stroke-width': 2.5 });
      // ряд из семи картинок внизу кадра
      var PX = function (i) { return 510 + i * 150; }, PY = 830;
      for (var i = 0; i < 7; i++) {
        var pc = s.node(g, 'g', {});
        s.node(pc, 'rect', { x: PX(i) - 62, y: PY - 62, width: 124, height: 124, rx: 14, fill: '#FFFDF8', stroke: '#B8AC9A', 'stroke-width': 2 });
        pic(s, pc, i, PX(i), PY, 1.35);
        s.tween(pc, 0.4 + i * 0.06, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
      }
      // экспериментатор (взрослый-статист)
      var ex = s.node(g, 'g', {}), exIn = s.node(ex, 'g', {});
      Film.head(exIn, 290, 580, 84, '#556677', 'buzz', { mouth: 'smile' });
      s.tween(ex, 0.3, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      K().tag(s, 'экспериментатор', 290, 676, 0.6, 4.0);
      var CD = 720, CM = 1220, CY = 540, HR = 106;
      K().cast(s, 'dima', CD, CY, 140, 0.5, { gx: 0, gy: 8 });
      K().cast(s, 'misha', CM, CY, 140, 0.6, { gx: 0, gy: 8 });
      K().tag(s, 'Дима', CD, 676, 0.9, 4.0); K().tag(s, 'Миша', CM, 676, 0.9, 4.0);
      // показывает три: мяч, дом, рыба — по порядку
      [0, 2, 4].forEach(function (pi, j) {
        var r = s.node(ov, 'circle', { cx: PX(pi), cy: PY, r: 76, fill: 'none', stroke: K().TEAL, 'stroke-width': 5 });
        s.draw(r, 1.3 + j * 0.45, { dur: 0.3 }); s.out(r, 3.4, { dur: 0.3 });
        var n = s.div('num-badge', { left: PX(pi) - 88, top: PY - 100 }, null, String(j + 1));
        s.pop(n, 1.4 + j * 0.45, { from: 0.5, dur: 0.3 }); s.out(n, 3.4, { dur: 0.3 });
      });
      s.gaze('kid3', 0, 9, 1.3, 0.3); s.gaze('baby', 0, 9, 1.3, 0.3);
      // шлемы, козырьки вниз
      var hd = s.node(ov, 'g', {}), hm = s.node(ov, 'g', {});
      K().helmet(s, hd, CD, CY, HR); K().helmet(s, hm, CM, CY, HR);
      s.tween([hd, hm], 2.8, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' });
      var vis = [CD, CM].map(function (cx) { return s.node(ov, 'rect', { x: cx - 86, y: CY - 112, width: 172, height: 66, rx: 26, fill: '#2F4A43' }); });
      s.tween(vis, 3.6, { opacity: 0, attr: { y: CY - 112 } }, { opacity: 1, attr: { y: CY - 60 }, duration: 0.35, ease: 'power2.in' });
      var tm = s.text('kidhand', '15 с', { left: 920, top: 440, width: 80, textAlign: 'center', fontSize: 52, color: 'var(--accent-deep)' });
      s.fade(tm, 3.9, { y: 0 }); s.out(tm, 8.6, { dur: 0.3 });
      hudText(s, 'lead', 'Козырёк закрывает картинки. Наблюдатель смотрит, шевелятся ли губы: повторяет ли ребёнок про себя?', { left: 140, top: 130, width: 1640, fontSize: 38 }, 3.9, 10.6);
      // наблюдатель подходит, наезд: Дима шепчет, Миша молчит и ёрзает
      s.tween(ex, 4.6, { x: 0 }, { x: 210, duration: 0.9, ease: 'power2.inOut' });
      s.cam({ cx: 900, cy: 540, z: 1.45 }, 5.2, 0.8, 'power2.inOut');
      whisper(s, ov, CD + 62, CY + 6, 6.2, 6);
      s.mouth('kid3', 'soft', 6.2, 0.15);
      K().say(s, 'мяч, дом, рыба…', CD - 140, CY + 140, 6.3, 8.6);
      s.mouth('baby', 'flat', 6.0, 0.2);
      [0, 1, 2, 3].forEach(function (j) { var t = 6.4 + j * 0.45; s.actor('baby', { x: CM + (j % 2 ? -9 : 9) }, t, 0.2, 'sine.inOut'); });
      s.actor('baby', { x: CM }, 8.2, 0.2);
      s.cam({ cx: 960, cy: 540, z: 1 }, 8.7, 0.7, 'power2.inOut');
      s.tween(ex, 8.8, { x: 210 }, { x: 0, duration: 0.8, ease: 'power2.inOut' });
      // козырьки вверх: Дима — по порядку, Миша путается
      s.tween(vis, 9.2, { opacity: 1, attr: { y: CY - 60 } }, { opacity: 0, attr: { y: CY - 112 }, duration: 0.3, ease: 'power2.out' });
      function answer(cx, order, t, ok) {
        var a = s.node(ov, 'g', {});
        s.node(a, 'rect', { x: cx - 150, y: 252, width: 300, height: 76, rx: 14, fill: '#FFFDF8', stroke: ok ? K().TEAL : K().RED, 'stroke-width': 3 });
        order.forEach(function (pi, j) { var q = pic(s, a, pi, cx - 95 + j * 95, 290, 0.6); s.tween(q, t + j * 0.35, { opacity: 0 }, { opacity: 1, duration: 0.2 }); });
        s.tween(a.firstChild, t - 0.1, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        return a;
      }
      answer(CD, [0, 2, 4], 9.6, true);
      var ck = s.path(ov, 'M' + (CD + 170) + ' 292 l14 16 l28 -32', { stroke: K().TEAL, 'stroke-width': 7 });
      s.draw(ck, 10.8, { dur: 0.25 });
      s.mouth('kid3', 'smile', 10.8, 0.2);
      answer(CM, [2, 0, 1], 9.8, false);
      var qm = s.text('kidhand red', '?', { left: CM + 160, top: 250, fontSize: 70 });
      s.fade(qm, 11.0, { y: 0 });
      s.mouth('baby', 'sad', 11.0, 0.2);
      // Миша смотрит на Диму — и сам шепчет
      s.gaze('baby', -9, 0, 11.8, 0.3); s.gaze('kid3', 9, 0, 12.2, 0.3);
      s.mouth('baby', 'soft', 12.8, 0.2);
      whisper(s, ov, CM + 62, CY + 6, 13.0, 6);
      hudText(s, 'lead', 'Кто повторял про себя, помнил больше. В 5 лет так делают немногие, к 10 — почти все.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 10.9);
      concl(s, 'память становится нарочной — ребёнок сам выбирает, как запомнить.', 17.2);
      cite(s, 'rehearsal · Дж. Флейвелл и др., 1966 · Э. Эллиотт и др., 2021 (17 лабораторий): шептали и многие пятилетки — раньше, чем думали', 12.4);
      castOut(s, ['kid3', 'baby']);
    }
  });

  // 3:22,5 — Шахматная дуэль: Дима против папы (М. Чи, 1978; В. Шнайдер и др., 1993)
  Film.scene({
    id: 'chess', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var home = s.node(g, 'g', {}); K().kitchen(s, home, 960, 900, { lamp: false });
      var ev = s.text('kidhand', 'Вечером дома', { left: 140, top: 130, fontSize: 56, color: 'var(--accent-deep)' });
      s.fade(ev, 0.2, { y: 6 }); s.out(ev, 3.2, { dur: 0.3 });
      K().cast(s, 'dad', 540, 690, 190, 0.2, { gx: 9, gy: 2 });
      K().cast(s, 'dima', 1390, 710, 140, 0.3, { gx: -9, gy: 2 });
      K().tag(s, 'папа', 540, 912, 0.6, 3.4); K().tag(s, 'Дима', 1390, 912, 0.6, 3.4);
      // доска с позицией; лошадка Миши встаёт конём
      var B0 = 810, BY = 290, C = 50, board = s.node(ov, 'g', {});
      for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) s.node(board, 'rect', { x: B0 + c * C, y: BY + r * C, width: C, height: C, fill: (r + c) % 2 ? '#B48A62' : '#F3E6D2' });
      s.node(board, 'rect', { x: B0, y: BY, width: 6 * C, height: 6 * C, fill: 'none', stroke: INK, 'stroke-width': 3 });
      var POS = [[0, 1, 'k', 1], [1, 4, 'p', 0], [2, 2, 'p', 1], [2, 5, 'k', 0], [3, 0, 'p', 0], [4, 1, 'p', 1], [4, 4, 'p', 0], [5, 2, 'k', 0]];
      POS.forEach(function (p) { (p[2] === 'k' ? K().knight : K().pawn)(s, board, B0 + p[1] * C + C / 2, BY + p[0] * C + C - 4, 0.8, p[3]); });
      s.tween(board, 0.5, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      var hs = s.node(ov, 'g', {}), hsIn = s.node(hs, 'g', {});
      var HX = B0 + 3 * C + C / 2, HY = BY + 3 * C + C - 3;
      K().toyHorse(s, hsIn, HX, HY, 0.44);
      s.tween(hs, 1.0, { opacity: 0, x: 1300 - HX, y: 740 - HY }, { opacity: 1, x: 1300 - HX, y: 740 - HY, duration: 0.15 });
      s.tween(hs, 1.15, { x: 1300 - HX }, { x: 0, duration: 0.7, ease: 'sine.inOut' });
      s.tween(hs, 1.15, { y: 740 - HY }, { y: 0, duration: 0.7, ease: 'back.out(1.4)' });
      var ht = s.text('tag', 'лошадка Миши', { left: B0 - 262, top: HY - 30, width: 240, textAlign: 'right', color: 'var(--accent-deep)' });
      s.fade(ht, 1.8, { y: 4 }); s.out(ht, 3.3, { dur: 0.3 });
      var tm = s.text('kidhand', '10 с', { left: B0 - 140, top: BY + 110, fontSize: 52, color: 'var(--accent-deep)' });
      s.fade(tm, 1.6, { y: 0 }); s.out(tm, 3.3, { dur: 0.2 });
      var cloth = s.node(ov, 'rect', { x: B0 - 10, y: BY - 10, width: 6 * C + 20, height: 6 * C + 20, rx: 8, fill: '#E8B4A0', stroke: INK, 'stroke-width': 3 });
      s.tween(cloth, 3.4, { opacity: 0, attr: { y: BY - 120 } }, { opacity: 1, attr: { y: BY - 10 }, duration: 0.35, ease: 'power2.in' });
      hudText(s, 'h3', 'Кто запомнит больше — Дима или папа? <span class="acc">Угадайте.</span>', { left: 140, top: 130, width: 1640, fontSize: 46 }, 3.7, 12.9);
      s.freeze(3.9, 2.6);
      // каждый расставляет по памяти
      function rebuild(x0, n, t0) {
        var bg = s.node(ov, 'g', {}), Q = 28;
        for (var rr = 0; rr < 6; rr++) for (var cc = 0; cc < 6; cc++) s.node(bg, 'rect', { x: x0 + cc * Q, y: 590 + rr * Q, width: Q, height: Q, fill: (rr + cc) % 2 ? '#B48A62' : '#F3E6D2' });
        s.tween(bg, t0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        var list = POS.concat([[3, 3, 'k', 1]]);
        for (var i = 0; i < n; i++) {
          var p = list[i], pg = s.node(bg, 'g', {});
          if (i === 8) K().toyHorse(s, pg, x0 + p[1] * Q + Q / 2, 590 + p[0] * Q + Q - 2, 0.26);
          else (p[2] === 'k' ? K().knight : K().pawn)(s, pg, x0 + p[1] * Q + Q / 2, 590 + p[0] * Q + Q - 3, 0.48, p[3]);
          s.tween(pg, t0 + 0.3 + i * 0.16, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.18 });
        }
        return bg;
      }
      var bd = rebuild(660, 6, 6.6), bm = rebuild(1092, 9, 6.6);
      s.gaze('dad', 0, -9, 6.8, 0.3); s.gaze('kid3', 0, -9, 6.8, 0.3);
      // табло матча
      s.out([board, cloth, hs], 6.4, { dur: 0.3 });
      var sb = s.div('card', { left: 740, top: 300, width: 440, height: 290 });
      s.pop(sb, 8.2, { from: 0.8, dur: 0.35 });
      var hd = s.text('small-caps', 'папа&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;Дима', { left: 0, top: 22, width: 440, textAlign: 'center' }, sb);
      void hd;
      function row(label, a, b, top, win, t) {
        var e = s.text('label', '<span class="soft">' + label + '</span>&nbsp;&nbsp;' + (win === 0 ? '<b class="acc">' + a + '</b>' : a) + ' : ' + (win === 1 ? '<b class="acc">' + b + '</b>' : b), { left: 0, top: top, width: 440, textAlign: 'center', fontSize: 34 }, sb);
        s.fade(e, t, { y: 6 });
      }
      row('фигуры', 6, 9, 66, 1, 8.4);
      var sc1 = s.text('display', '0 : 1', { left: 0, top: 160, width: 440, textAlign: 'center', fontSize: 100 }, sb);
      s.fade(sc1, 8.8, { y: 6 }); s.out(sc1, 12.3, { dur: 0.2 });
      s.mouth('kid3', 'smile', 8.6, 0.2); s.squash('kid3', 0.92, 1.1, 8.7, 0.12); s.squash('kid3', 1, 1, 8.82, 0.3, 'back.out(3)');
      s.mouth('dad', 'soft', 8.8, 0.2); s.gaze('dad', 9, -6, 8.8, 0.2); s.squash('dad', 0.96, 1.06, 8.9, 0.15); s.squash('dad', 1, 1, 9.05, 0.3);
      var e1 = s.text('lead', 'Дима знает шахматы и видит на доске знакомые узоры.', { left: 140, top: 206, width: 1640, fontSize: 34 });
      s.lines(e1, 9.0);
      // реванш: ряд цифр
      s.out([bd, bm], 10.2, { dur: 0.3 });
      var dg = s.text('display', '7 3 9 1 5 8 2 6', { left: 0, top: 616, width: 1920, textAlign: 'center', fontSize: 84, color: 'var(--accent-deep)' });
      s.fade(dg, 10.4, { y: 10, dur: 0.4 }); s.out(dg, 11.8, { dur: 0.3 });
      s.gaze('dad', 9, 2, 10.4, 0.3); s.gaze('kid3', -9, 2, 10.4, 0.3);
      row('цифры', 8, 6, 112, 0, 12.1);
      var sc2 = s.text('display', '1 : 1', { left: 0, top: 160, width: 440, textAlign: 'center', fontSize: 100 }, sb);
      s.fade(sc2, 12.4, { y: 6 });
      s.mouth('dad', 'smile', 12.2, 0.2); s.mouth('kid3', 'soft', 12.2, 0.2); s.gaze('dad', 9, 0, 12.2, 0.2);
      var e2 = s.text('lead', 'В цифрах узоров нет — и папа впереди.', { left: 140, top: 254, width: 1640, fontSize: 34 });
      s.lines(e2, 13.2);
      concl(s, 'память растёт вместе со знаниями.', 16.3);
      cite(s, 'М. Чи, 1978: дети ~10 лет и взрослые · В. Шнайдер и др., 1993 — повторилось', 14.4);
      castOut(s, ['dad', 'kid3']);
    }
  });
})();
