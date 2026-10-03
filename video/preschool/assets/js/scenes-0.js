/* Вступление: пролог (палочка становится лошадью), титр с картой курса, «сроки — это статистика» */
/* global Film */
(function () {
  'use strict';
  var ORANGE = '#FB8C00', DEEP = '#A65300', STICK = '#8B6A45', MUTE = '#8A8F90';

  // Перенос группы SVG синхронно с прыжком персонажа (та же кривая, что у hop в lib.js)
  function ride(s, g, dx, lt, dur, h) {
    var f = g.__st || (g.__st = { x: 0 });
    s.tween(g, lt + 0.09, { x: f.x }, { x: f.x + dx, duration: dur, ease: 'sine.inOut' });
    s.tween(g, lt + 0.09, { y: 0 }, { y: -h, duration: dur / 2, ease: 'power2.out' });
    s.tween(g, lt + 0.09 + dur / 2, { y: -h }, { y: 0, duration: dur / 2, ease: 'power2.in' });
    f.x += dx;
  }
  Film.ride = ride;

  // 0:00 — Пролог: палочка становится лошадью, а ребёнок — всадником; следом скачет друг
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      var CX = 700, CY = 560;
      s.actor('baby', { x: CX, y: CY, d: 120, o: 0 }, 0, 0.01);
      s.actor('baby', { o: 1 }, 0.15, 0.6, 'power2.out');
      s.face('baby', true, 0.3, 0.4); s.mouth('baby', 'soft', 0.3, 0.01); s.gaze('baby', 7, -2, 0.3, 0.01);

      // палочка — под ребёнком (видимое поле)
      var g0 = s.svg();
      var stick = s.node(g0, 'g', {});
      s.path(stick, 'M' + (CX - 200) + ' ' + (CY + 140) + ' C' + (CX - 100) + ' ' + (CY + 80) + ' ' + (CX + 20) + ' ' + CY + ' ' + (CX + 145) + ' ' + (CY - 82), { stroke: STICK, 'stroke-width': 11 });
      s.tween(stick, 0.25, { opacity: 0 }, { opacity: 1, duration: 0.45 });

      // голова лошади — смысловое поле (рисованный слой над ребёнком)
      var ov = s.over();
      var horse = s.node(ov, 'g', {});
      Film.icons.horse(s, horse, CX + 145, CY - 82, 1.05, { at: 1.05, dur: 1.3, seed: 5 });

      var l1 = s.text('statement', 'Палочка становится лошадью.', { left: 160, top: 760, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.55);
      var l2 = s.text('statement', 'А ребёнок — ' + s.HL('всадником.'), { left: 160, top: 852, width: 1600, textAlign: 'center' });
      s.lines(l2, 3.3);
      s.hl(l2, 4.25);

      // галоп: скачки на сильные доли (2,5 · 3,75 · 5 · 6,25 с)
      s.mouth('baby', 'smile', 2.4, 0.3);
      [2.41, 3.66, 4.91, 6.16].forEach(function (t) {
        s.hop('baby', s.A.baby.st.x + 70, CY, t, 0.5, 46);
        ride(s, stick, 70, t, 0.5, 46);
        ride(s, horse, 70, t, 0.5, 46);
      });
      // линии скорости
      s.sk(horse, [[CX - 120, CY - 10], [CX - 220, CY - 10]], { at: 3.0, dur: 0.3, seed: 41, width: 3, opacity: 0.55 });
      s.sk(horse, [[CX - 100, CY + 40], [CX - 180, CY + 40]], { at: 3.15, dur: 0.3, seed: 43, width: 3, opacity: 0.55 });

      // друг на своей лошадке догоняет — игра уже общая
      var K = 0.82, FX = 250, FY = 590;
      s.actor('kid2', { x: FX, y: FY, d: 100, o: 0 }, 0, 0.01);
      s.actor('kid2', { o: 1 }, 3.0, 0.4, 'power2.out');
      s.face('kid2', true, 3.0, 0.3); s.mouth('kid2', 'smile', 3.0, 0.01); s.gaze('kid2', 7, -2, 3.0, 0.01);
      var stick2 = s.node(g0, 'g', {});
      s.path(stick2, 'M' + (FX - 200 * K) + ' ' + (FY + 140 * K) + ' C' + (FX - 100 * K) + ' ' + (FY + 80 * K) + ' ' + (FX + 20 * K) + ' ' + FY + ' ' + (FX + 145 * K) + ' ' + (FY - 82 * K), { stroke: STICK, 'stroke-width': 9 });
      s.tween(stick2, 3.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var horse2 = s.node(ov, 'g', {});
      Film.icons.horse(s, horse2, FX + 145 * K, FY - 82 * K, 0.86, { at: 3.05, dur: 0.6, seed: 61 });
      [3.66, 4.91, 6.16].forEach(function (t) {
        s.hop('kid2', s.A.kid2.st.x + 100, FY, t, 0.5, 40);
        ride(s, stick2, 100, t, 0.5, 40);
        ride(s, horse2, 100, t, 0.5, 40);
      });
    }
  });

  // 0:07,5 — Титр: карта курса → отрезок «3–7» вырастает в шкалу эпизода
  Film.scene({
    id: 'title', bars: 3,
    build: function (s) {
      var M = s.map();
      s.mapIn(M, 0.25);
      var cur = s.CFG.series.current, cx = M.x(cur) + M.segW / 2;
      var cap = s.text('small-caps', 'Карта курса', { left: s.X0, top: s.RY - 58 });
      s.fade(cap, 0.5, { y: 6 });
      s.out(cap, 3.7, { dur: 0.4 });

      s.face('baby', false, 0.0, 0.3);
      s.actor('baby', { x: cx, y: s.RY, d: 26 }, 0.05, 1.15, 'power2.inOut');
      s.actor('kid2', { o: 0 }, 0.0, 0.4);

      var k = s.text('kicker', 'Психология развития', { left: 160, top: 318, width: 1600, textAlign: 'center' });
      s.fade(k, 0.75, { y: 10 });
      var t = s.text('display', 'От трёх до семи', { left: 160, top: 362, width: 1600, textAlign: 'center' });
      s.lines(t, 0.85, { dur: 1.2 });
      var sub = s.text('lead soft', 'Дошкольный возраст · 3–7 лет', { left: 160, top: 540, width: 1600, textAlign: 'center' });
      s.fade(sub, 1.5);

      s.mapZoom(M, 3.75);
      s.actor('baby', { x: s.X0 }, 3.85, 1.25, 'power3.inOut');
      s.brandIn(4.45);
    }
  });

  // 0:15 — Сроки — это статистика: понимание ложных убеждений по возрасту (Г. Уэллман и др., 2001)
  Film.scene({
    id: 'note', bars: 3,
    build: function (s) {
      var k = s.text('kicker', 'Важно', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Сроки — это статистика', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Возрасты в ролике — средние значения. У каждого ребёнка свой темп.', { left: 140, top: 330, width: 760 });
      s.lines(ld, 0.9);
      var dl = s.text('note', 'Каждая точка — ребёнок, который справился в своём возрасте. Все они в норме.', { left: 140, top: 520, width: 700 });
      s.lines(dl, 4.0, { stagger: 0.08 });

      // схема: доля верных ответов в задаче на ложное убеждение, 50 % — к 44 месяцам
      var g = s.svg();
      var B = 760, HGT = 300, AX0 = 1040, AX1 = 1760, M0 = 30, M1 = 72;
      function X(m) { return AX0 + (m - M0) / (M1 - M0) * (AX1 - AX0); }
      function P(m) { return 1 / (1 + Math.exp(-0.12 * (m - 44))); }
      var d = '';
      for (var i = 0; i <= 60; i++) {
        var m = M0 + (M1 - M0) * i / 60;
        d += (i ? ' L' : 'M') + X(m).toFixed(1) + ' ' + (B - HGT * P(m)).toFixed(1);
      }
      var area = s.path(g, d + ' L' + X(M1) + ' ' + B + ' L' + X(M0) + ' ' + B + ' Z', { fill: '#FEF0DD', stroke: 'none', opacity: 0 });
      var curve = s.path(g, d, { stroke: ORANGE, 'stroke-width': 4.5 });
      var base = s.path(g, 'M' + AX0 + ' ' + B + ' H' + AX1, { stroke: '#CDC3B4', 'stroke-width': 2 });
      var half = s.path(g, 'M' + AX0 + ' ' + (B - HGT / 2) + ' H' + AX1, { stroke: '#CDC3B4', 'stroke-width': 2, 'stroke-dasharray': '3 9' });
      s.draw(base, 0.8, { dur: 0.7 });
      s.dash(half, 1.0, { dur: 0.7 });
      s.draw(curve, 1.1, { dur: 1.5, ease: 'power1.inOut' });
      s.tween(area, 2.0, { opacity: 0 }, { opacity: 1, duration: 0.7 });
      var hl = s.text('note', '50 %', { left: AX0 - 70, top: B - HGT / 2 - 16, width: 60, textAlign: 'right', fontSize: 22 });
      s.fade(hl, 1.2, { y: 0 });
      var med = s.path(g, 'M' + X(44) + ' ' + B + ' V' + (B - HGT / 2), { stroke: DEEP, 'stroke-width': 2.5, 'stroke-dasharray': '3 9' });
      s.dash(med, 2.3, { dur: 0.5 });
      var ml = s.text('label', '3 г. 8 мес', { left: X(44) - 178, top: B - HGT / 2 + 14, width: 160, textAlign: 'right', fontSize: 24, color: DEEP });
      s.fade(ml, 2.5, { y: 6 });
      [[36, '3'], [48, '4'], [60, '5'], [72, '6']].forEach(function (q, j) {
        var tk = s.path(g, 'M' + X(q[0]) + ' ' + (B - 6) + ' V' + (B + 6), { stroke: '#B3A898', 'stroke-width': 2 });
        s.fade(tk, 2.4 + j * 0.12, { y: 0, dur: 0.3 });
        var lb = s.text('label', q[1], { left: X(q[0]) - 40, top: B + 12, width: 80, textAlign: 'center', fontSize: 24, color: '#5F676B' });
        s.fade(lb, 2.5 + j * 0.12, { y: 6 });
      });
      var un = s.text('note', 'лет', { left: AX1 + 14, top: B + 12, fontSize: 22 });
      s.fade(un, 2.9, { y: 6 });
      var cap = s.text('small-caps', 'Понимание, что другой может ошибаться', { left: AX0 - 60, top: B - HGT - 96, width: AX1 - AX0 + 120, textAlign: 'center' });
      s.fade(cap, 1.3, { y: 6 });
      var cap2 = s.text('note', 'задача на ложное убеждение · Г. Уэллман и др., 2001: 178 исследований', { left: AX0 - 60, top: B - HGT - 60, width: AX1 - AX0 + 120, textAlign: 'center', fontSize: 21 });
      s.fade(cap2, 1.5, { y: 6 });
      // «каждая точка — ребёнок»: возраст, в котором справился (плотность — производная кривой)
      [34, 38, 40.5, 42, 43.5, 45, 46.5, 48, 50, 53, 57, 63].forEach(function (m, j) {
        var c = s.node(g, 'circle', { cx: X(m), cy: B - 13, r: 10, fill: '#E4735A', opacity: 0 });
        s.tween(c, 3.0 + j * 0.09, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      });
    }
  });
})();
