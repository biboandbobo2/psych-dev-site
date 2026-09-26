/* Пролог и титр */
/* global Film */
(function () {
  'use strict';

  // 0:00 — Пролог: один маленький круг, потом рядом появляется взрослый
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      s.actor('baby', { x: 960, y: 430, d: 120, o: 1 }, 0.25, 1.4, 'power3.out');

      var l1 = s.text('statement', 'Новорождённый почти ничего не умеет сам.', { left: 160, top: 600, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.9);

      s.actor('baby', { x: 800 }, 3.2, 1.3);
      s.actor('adult', { x: 1120, y: 430, d: 160, o: 1 }, 3.2, 1.3);
      var g = s.svg();
      var link = s.path(g, 'M872 430 H1032', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 12' });
      s.dash(link, 4.1, { dur: 0.9 });

      var l2 = s.text('statement', 'Но с первых дней он настроен ' + s.HL('на людей') + '.', { left: 160, top: 690, width: 1600, textAlign: 'center' });
      s.lines(l2, 3.7);
      s.hl(l2, 4.9);
    }
  });

  // 0:07,5 — Титр; ребёнок «садится» на начало шкалы года
  Film.scene({
    id: 'title', bars: 2,
    build: function (s) {
      s.actor('adult', { o: 0, d: 120 }, 0.0, 0.7, 'power2.in');
      s.rest(0.25, 1.7, 'power3.inOut');
      s.rulerIn(0.5);
      s.brandIn(1.4);

      var k = s.text('kicker', 'Психология развития', { left: 160, top: 318, width: 1600, textAlign: 'center' });
      s.fade(k, 0.35, { y: 10 });
      var t = s.text('display', 'Первый год жизни', { left: 160, top: 362, width: 1600, textAlign: 'center' });
      s.lines(t, 0.45, { dur: 1.2 });
      var sub = s.text('lead soft', 'Младенчество · 0–1 год', { left: 160, top: 540, width: 1600, textAlign: 'center' });
      s.fade(sub, 1.1);
    }
  });
})();
