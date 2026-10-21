/* Вступление (v3.1): крючок (палочка-лошадка становится знаком, лошадка — в ранец), титр с картой курса, «когда дети идут в первый класс» */
/* global Film */
(function () {
  'use strict';
  var STICK = '#8B6A45', INK = '#1D2733';
  var K = function () { return Film.school; };

  // 0:00 — Крючок: палочка была лошадью — теперь палочка знак; палочку — в пенал, игрушечную лошадку — в ранец
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      var CX = 640, CY = 470;
      K().cast(s, 'misha', CX, CY, 110, 0.1, { gx: 7 });
      var g = s.svg(), ov = s.over();
      // двор: земля, дерево, куст — место галопа; уходит, когда появляется тетрадный лист
      var yard = s.node(g, 'g', {});
      s.path(yard, 'M0 640 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      K().tree(s, yard, 260, 640, 1.2); K().bush(s, yard, 1380, 640, 1.1); K().tree(s, yard, 1700, 640, 0.9, '#9CC8A0');
      s.tween(yard, 0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.out(yard, 2.6, { dur: 0.4 });
      // кадр 1: галоп на палочке-лошадке (из 3–7)
      var stick = s.node(g, 'g', {}), inner = s.node(stick, 'g', {}); // внешняя группа скачет, внутренняя — поворачивается
      s.path(inner, 'M' + (CX - 170) + ' ' + (CY + 110) + ' L' + (CX + 140) + ' ' + (CY - 90), { stroke: STICK, 'stroke-width': 11 });
      s.tween(stick, 0.15, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      var horse = s.node(ov, 'g', {});
      Film.icons.horse(s, horse, CX + 140, CY - 90, 1.0, { at: 0.3, dur: 0.8, seed: 5 });
      [0.9, 1.65].forEach(function (t) {
        s.hop('baby', s.A.baby.st.x + 70, CY, t, 0.5, 46);
        Film.ride(s, stick, 70, t, 0.5, 46);
        Film.ride(s, horse, 70, t, 0.5, 46);
      });
      var l1 = s.text('statement', 'Палочка была лошадью.', { left: 160, top: 760, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.5);
      // кадр 2: лошадь гаснет, палочка падает на лист и встаёт первой в ряд палочек прописи: IIII → 4
      s.out(horse, 2.55, { dur: 0.4 });
      s.hop('baby', 1500, CY + 40, 2.6, 0.5, 40);
      s.actor('baby', { o: 0 }, 3.0, 0.3);
      var page = s.div('cells', { left: 610, top: 300, width: 700, height: 300, opacity: 0 });
      s.tween(page, 2.9, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      // центр палочки (CX − 15, CY + 10); после скачков внешняя группа сдвинута на +140
      var c = (CX - 15) + ' ' + (CY + 10), TF = function (x, y, r, k) { return 'translate(' + x + ' ' + y + ') rotate(' + r + ' ' + c + ') translate(' + c + ') scale(' + k + ') translate(' + (15 - CX) + ' ' + (-CY - 10) + ')'; };
      var P = function (sx, sy) { return [sx - 140 - (CX - 15), sy - (CY + 10)]; }; // экранный центр → сдвиг
      var p0 = P(860, 450), pA = P(1290, 506), pB = P(1530, 506);
      s.tween(inner, 2.8, { attr: { transform: TF(0, 0, 0, 1) } }, { attr: { transform: TF(p0[0], p0[1], -57, 0.42) }, duration: 0.9, ease: 'power3.inOut' });
      var ink = [];
      for (var i = 1; i < 4; i++) { // первая палочка — сама палочка-лошадка
        var x = 860 + i * 66;
        var p = s.path(g, 'M' + x + ' 385 L' + x + ' 515', { stroke: K().DEEP, 'stroke-width': 7 });
        s.draw(p, 3.7 + i * 0.22, { dur: 0.18 });
        ink.push(p);
      }
      s.out(ink, 4.85, { dur: 0.3 });
      var four = s.text('kidhand', '4', { left: 900, top: 330, fontSize: 200, lineHeight: 1, color: K().DEEP });
      s.pop(four, 5.0, { from: 0.6, dur: 0.5 });
      s.out(l1, 4.5, { dur: 0.3 });
      var l2 = s.text('statement', 'Теперь палочка — ' + s.HL('знак.'), { left: 160, top: 760, width: 1600, textAlign: 'center' });
      s.lines(l2, 4.8);
      s.hl(l2, 5.5);
      // кадр 3: Миша прячет палочку в пенал, а игрушечную лошадку — в ранец
      s.tween(inner, 4.9, { attr: { transform: TF(p0[0], p0[1], -57, 0.42) } }, { attr: { transform: TF(pA[0], pA[1], 33, 0.6) }, duration: 0.5, ease: 'power2.inOut' });
      s.tween(inner, 5.5, { attr: { transform: TF(pA[0], pA[1], 33, 0.6) } }, { attr: { transform: TF(pB[0], pB[1], 33, 0.6) }, duration: 0.45, ease: 'power2.in' });
      var pc = s.node(g, 'g', {}); // пенал рисуется поверх палочки — она «въезжает» внутрь
      s.node(pc, 'rect', { x: 1400, y: 474, width: 270, height: 64, rx: 26, fill: '#2B8F84', stroke: INK, 'stroke-width': 3 });
      s.path(pc, 'M1418 492 H1652', { stroke: '#F5D27A', 'stroke-width': 4, 'stroke-dasharray': '6 6' });
      s.node(pc, 'circle', { cx: 1652, cy: 492, r: 6, fill: '#F5D27A', stroke: INK, 'stroke-width': 2 });
      s.tween(pc, 4.5, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      s.actor('baby', { x: 400, y: 520, d: 110 }, 4.6, 0.01);
      s.gaze('baby', 9, 0, 4.6, 0.01);
      s.actor('baby', { o: 1 }, 4.65, 0.35);
      var toy = s.node(g, 'g', {});
      K().toyHorse(s, toy, 510, 566, 0.7);
      var bp = s.node(g, 'g', {}); // ранец — поверх лошадки
      Film.toys.backpack(s, bp, 250, 560, 1.4, '#26A69A', '#1C7A71');
      s.tween(bp, 4.7, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      s.tween(toy, 4.9, { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
      s.gaze('baby', -8, 2, 5.9, 0.3);
      s.tween(toy, 6.1, { x: 0 }, { x: -260, duration: 0.6, ease: 'sine.inOut' });
      s.tween(toy, 6.1, { y: 0 }, { y: -70, duration: 0.3, ease: 'power2.out' });
      s.tween(toy, 6.4, { y: -70 }, { y: 44, duration: 0.3, ease: 'power2.in' });
      s.squash('baby', 1.06, 0.94, 6.7, 0.1); s.squash('baby', 1, 1, 6.8, 0.3, 'back.out(3)');
      s.actor('baby', { o: 0 }, 7.05, 0.35);
    }
  });

  // 0:07,5 — Титр: карта курса → отрезок «7–10» вырастает в шкалу эпизода
  Film.scene({
    id: 'title', bars: 3,
    build: function (s) {
      var M = s.map();
      s.mapIn(M, 0.25);
      var cur = s.CFG.series.current, cx = M.x(cur) + M.segW / 2;
      var cap = s.text('small-caps', 'Карта курса', { left: s.X0, top: s.RY - 58 });
      s.fade(cap, 0.5, { y: 6 });
      s.out(cap, 3.7, { dur: 0.4 });
      s.face('baby', false, 0.0, 0.01);
      s.actor('baby', { x: cx, y: s.RY, d: 26, o: 0 }, 0.0, 0.01);
      s.actor('baby', { o: 1 }, 0.3, 0.4);
      var k = s.text('kicker', 'Психология развития', { left: 160, top: 318, width: 1600, textAlign: 'center' });
      s.fade(k, 0.75, { y: 10 });
      var t = s.text('display', 'От семи до десяти', { left: 160, top: 362, width: 1600, textAlign: 'center' });
      s.lines(t, 0.85, { dur: 1.2 });
      var sub = s.text('lead soft', 'Младший школьный возраст · 7–10 лет', { left: 160, top: 540, width: 1600, textAlign: 'center' });
      s.fade(sub, 1.5);
      s.mapZoom(M, 3.75);
      s.actor('baby', { x: s.X0 }, 3.85, 1.25, 'power3.inOut');
      s.brandIn(4.45);
      // шкала возраста — только здесь и там, где речь о возрасте (правка автора)
      s.actor('baby', { o: 0 }, 6.6, 0.4);
      s.rulerOut(6.4);
    }
  });

  // 0:15 — Когда дети идут в первый класс: Миша с ранцем идёт по оси возраста к полосе «Россия»
  var AGES = [['Англия', 5, 5, '5'], ['США', 6, 6, '6'], ['Германия', 6, 6, '6'], ['Россия', 6.5, 8, '6,5–8'], ['Финляндия', 7, 7, '7']];
  Film.scene({
    id: 'ages', bars: 3,
    build: function (s) {
      var g = s.svg();
      var h = s.text('h3', 'В разных странах в первый класс идут в разном возрасте — от 5 до 7 лет.', { left: 140, top: 120, width: 1640 });
      s.lines(h, 0.2);
      var X = function (a) { return 620 + (a - 4) * 270; }, Y0 = 330, DY = 112, AX = Y0 + DY * 4 + 70; // AX — ось возраста, по ней идёт Миша
      [4, 5, 6, 7, 8].forEach(function (a, i) {
        var tk = s.path(g, 'M' + X(a) + ' ' + (Y0 - 50) + ' V' + AX, { stroke: '#D9D0C4', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
        s.fade(tk, 0.4, { y: 0 });
        var lb = s.text('cite', a + (a < 5 ? ' года' : ' лет'), { left: X(a) - 60, top: AX + 16, width: 120, textAlign: 'center' });
        s.fade(lb, 0.5 + i * 0.05, { y: 6 });
      });
      AGES.forEach(function (r, i) {
        var y = Y0 + i * DY, at = 0.6 + i * 0.3, one = r[1] === r[2];
        var nm = s.text('lead', r[0], { left: 140, top: y - 28, fontSize: 34 });
        s.fade(nm, at, { y: 6 });
        var bar = s.node(g, 'rect', { x: one ? X(r[1]) - 14 : X(r[1]), y: y - 14, width: Math.max(28, X(r[2]) - X(r[1])), height: 28, rx: 14, fill: r[0] === 'Россия' ? K().TEAL : '#9FD6CF' });
        s.grow(bar, at + 0.15, { dur: 0.6 });
        var al = s.text('label', r[3], { left: one ? X(r[1]) - 60 : X(r[1]), top: y - 52, width: one ? 120 : 200, textAlign: one ? 'center' : 'left', fontSize: 24, color: 'var(--accent-deep)' });
        s.fade(al, at + 0.3, { y: 4 });
      });
      var axis = s.path(g, 'M' + (X(4) - 200) + ' ' + AX + ' H' + (X(8) + 40), { stroke: '#B3A898', 'stroke-width': 3 });
      s.draw(axis, 0.3, { dur: 0.8 });
      // Миша с ранцем идёт по оси и встаёт у своей полосы — «Россия»
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, X(4) - 120 - 40, AX - 34, 0.8, '#26A69A', '#1C7A71');
      s.tween(bp, 2.2, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      K().cast(s, 'misha', X(4) - 120, AX - 36, 70, 2.2, { gx: 9, gy: 0, dur: 0.3 });
      K().walk(s, 'baby', X(6.5) - 60, 2.5, { carry: bp, cx: 0, step: 90, dur: 0.2, hold: 0.06 });
      s.actor('baby', { y: Y0 + 3 * DY - 50 }, 4.7, 0.4, 'back.out(2)');
      s.tween(bp, 4.7, { y: 0 }, { y: Y0 + 3 * DY - 50 - (AX - 36), duration: 0.4, ease: 'back.out(2)' });
      s.gaze('baby', 0, -6, 4.9, 0.3);
      s.actor('baby', { o: 0 }, 7.0, 0.35); s.out(bp, 7.0, { dur: 0.35 });
      var src = s.text('cite', 'Eurydice; gov.uk; NCES; ФЗ «Об образовании в РФ», ст. 67', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 3.0, { y: 4 });
    }
  });
})();
