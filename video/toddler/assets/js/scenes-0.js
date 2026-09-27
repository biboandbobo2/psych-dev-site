/* Пролог и титр с картой курса */
/* global Film */
(function () {
  'use strict';
  var FLOOR = 560; // линия «пола» в прологе

  // 0:00 — Пролог: первые шаги → «Я сам!» (ребёнок сам забирается на кубик)
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      s.actor('baby', { x: 360, y: FLOOR - 46, d: 92, o: 0 }, 0, 0.01);
      s.actor('baby', { o: 1 }, 0.2, 0.7, 'power2.out');
      var t = 0.76; // приземления — на доли 2, 3, 4 первого такта
      [480, 600, 720].forEach(function (x) { s.hop('baby', x, FLOOR - 46, t, 0.4, 44); t += 0.625; });

      var l1 = s.text('statement', 'В год ребёнок делает первые шаги.', { left: 160, top: 668, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.8);

      // кубик падает на «пол», рядом появляется взрослый
      s.actor('obj', { x: 850, y: FLOOR - 38 - 90, d: 76, o: 0 }, 3.2, 0.01);
      s.actor('obj', { o: 1 }, 3.33, 0.2);
      s.actor('obj', { y: FLOOR - 38 }, 3.33, 0.42, 'power2.in'); // падает на долю: 3,75 с
      s.squash('obj', 1.14, 0.84, 3.75, 0.07);
      s.squash('obj', 1, 1, 3.82, 0.4, 'back.out(3)');
      s.actor('adult', { x: 1160, y: FLOOR - 75, d: 150, o: 0 }, 3.2, 0.01);
      s.actor('adult', { x: 1100, o: 1 }, 3.25, 0.9, 'power3.out');

      var l2 = s.text('statement', 'К трём он скажет: ' + s.HL('«Я сам!»'), { left: 160, top: 758, width: 1600, textAlign: 'center' });
      s.lines(l2, 3.6);

      // взрослый тянется помочь — ребёнок забирается сам
      s.actor('adult', { x: 1036 }, 4.35, 0.6, 'power2.out');
      s.face('baby', true, 4.2, 0.3); s.mouth('baby', 'flat', 4.2, 0.01); s.gaze('baby', 6, -3, 4.2, 0.01);
      s.hop('baby', 850, FLOOR - 76 - 46, 4.41, 0.5, 92); // приземление — сильная доля 3-го такта (5,0 с)
      s.mouth('baby', 'smile', 5.1, 0.35); s.gaze('baby', 5, 0, 5.1, 0.35);
      s.hl(l2, 5.0);
      s.actor('adult', { x: 1100 }, 5.5, 0.8, 'power2.inOut');
      s.face('adult', true, 5.5, 0.4); s.mouth('adult', 'smile', 5.5, 0.01); s.gaze('adult', -7, -2, 5.5, 0.01);
    }
  });

  // 0:07,5 — Титр: карта курса → отрезок «1–3» вырастает в шкалу эпизода
  Film.scene({
    id: 'title', bars: 3,
    build: function (s) {
      var M = s.map();
      s.mapIn(M, 0.25);
      var cur = s.CFG.series.current, cx = M.x(cur) + M.segW / 2;
      var cap = s.text('small-caps', 'Карта курса', { left: s.X0, top: s.RY - 58 });
      s.fade(cap, 0.5, { y: 6 });
      s.out(cap, 3.7, { dur: 0.4 });

      s.face('adult', false, 0.0, 0.3);
      s.actor('adult', { o: 0, d: 120 }, 0.0, 0.7, 'power2.in');
      s.face('baby', false, 0.1, 0.3);
      s.actor('obj', { o: 0, d: 50 }, 0.25, 0.6, 'power2.in');
      s.actor('baby', { x: cx, y: s.RY, d: 26 }, 0.05, 1.15, 'power2.inOut');

      var k = s.text('kicker', 'Психология развития', { left: 160, top: 318, width: 1600, textAlign: 'center' });
      s.fade(k, 0.75, { y: 10 });
      var t = s.text('display', 'От года до трёх', { left: 160, top: 362, width: 1600, textAlign: 'center' });
      s.lines(t, 0.85, { dur: 1.2 });
      var sub = s.text('lead soft', 'Раннее детство · 1–3 года', { left: 160, top: 540, width: 1600, textAlign: 'center' });
      s.fade(sub, 1.5);

      s.mapZoom(M, 3.75);
      s.actor('baby', { x: s.X0 }, 3.85, 1.25, 'power3.inOut');
      s.brandIn(4.45);
    }
  });

  // 0:15 — Дисклеймер: возраст в ролике — статистика
  Film.scene({
    id: 'note', bars: 3,
    build: function (s) {
      var k = s.text('kicker', 'Важно', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Сроки — это статистика', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Возрасты в ролике — средние значения. У каждого ребёнка свой темп.', { left: 140, top: 330, width: 760 });
      s.lines(ld, 0.9);

      // схематичная кривая распределения: первые самостоятельные шаги (окно ВОЗ 8–18 мес)
      var g = s.svg();
      var B = 740, HGT = 250, AX0 = 1060, AX1 = 1760, M0 = 7, M1 = 19;
      function X(m) { return AX0 + (m - M0) / (M1 - M0) * (AX1 - AX0); }
      var MU = 12, SL = (MU - 8) / 2.33, SR = (18 - MU) / 2.33;
      var d = '';
      for (var i = 0; i <= 60; i++) {
        var m = M0 + (M1 - M0) * i / 60, sg = m < MU ? SL : SR;
        var y = B - HGT * Math.exp(-((m - MU) * (m - MU)) / (2 * sg * sg));
        d += (i ? ' L' : 'M') + X(m).toFixed(1) + ' ' + y.toFixed(1);
      }
      var area = s.path(g, d + ' L' + X(M1) + ' ' + B + ' L' + X(M0) + ' ' + B + ' Z', { fill: '#EBEDF7', stroke: 'none', opacity: 0 });
      var curve = s.path(g, d, { stroke: '#5C6BC0', 'stroke-width': 4 });
      var base = s.path(g, 'M' + AX0 + ' ' + B + ' H' + AX1, { stroke: '#CDC3B4', 'stroke-width': 2 });
      s.draw(base, 0.8, { dur: 0.7 });
      s.draw(curve, 1.1, { dur: 1.5, ease: 'power1.inOut' });
      s.tween(area, 2.0, { opacity: 0 }, { opacity: 1, duration: 0.7 });
      var med = s.path(g, 'M' + X(MU) + ' ' + B + ' V' + (B - HGT), { stroke: '#5C6BC0', 'stroke-width': 2.5, 'stroke-dasharray': '3 9' });
      s.dash(med, 2.3, { dur: 0.5 });
      [[8, '8'], [12, '12'], [18, '18']].forEach(function (q, j) {
        var tk = s.path(g, 'M' + X(q[0]) + ' ' + (B - 6) + ' V' + (B + 6), { stroke: '#B3A898', 'stroke-width': 2 });
        s.fade(tk, 2.4 + j * 0.15, { y: 0, dur: 0.3 });
        var lb = s.text('label', q[1], { left: X(q[0]) - 40, top: B + 12, width: 80, textAlign: 'center', fontSize: 24, color: j === 1 ? '#4A58A6' : '#5F676B' });
        s.fade(lb, 2.5 + j * 0.15, { y: 6 });
      });
      var un = s.text('note', 'мес', { left: X(19) - 20, top: B + 12, fontSize: 22 });
      s.fade(un, 2.9, { y: 6 });
      var cap = s.text('small-caps', 'Первые самостоятельные шаги (ВОЗ, 2006)', { left: AX0, top: B - HGT - 70, width: AX1 - AX0, textAlign: 'center' });
      s.fade(cap, 1.3, { y: 6 });
      // «каждая точка — ребёнок»
      var zs = [-1.9, -1.2, -0.7, -0.35, 0, 0.3, 0.65, 1.1, 1.8];
      zs.forEach(function (z, j) {
        var m = MU + z * (z < 0 ? SL : SR);
        var c = s.node(g, 'circle', { cx: X(m), cy: B - 13, r: 10, fill: '#E4735A', opacity: 0 });
        s.tween(c, 3.0 + j * 0.12, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      });
      var dl = s.text('note', 'каждая точка — ребёнок; все они в норме', { left: 140, top: 470, width: 760 });
      s.fade(dl, 4.2, { y: 6 });
    }
  });
})();
