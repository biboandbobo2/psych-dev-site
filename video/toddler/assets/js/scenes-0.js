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
})();
