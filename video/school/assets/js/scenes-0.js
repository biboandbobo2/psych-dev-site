/* Вступление: пролог (палочка-лошадка становится знаком), титр с картой курса, «когда дети идут в первый класс» */
/* global Film */
(function () {
  'use strict';
  var STICK = '#8B6A45';
  var K = function () { return Film.school; };

  // 0:00 — Пролог: палочка была лошадью — теперь палочка знак
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      var CX = 640, CY = 470;
      s.actor('baby', { x: CX, y: CY, d: 110, o: 0 }, 0, 0.01);
      s.actor('baby', { o: 1 }, 0.1, 0.5, 'power2.out');
      s.face('baby', true, 0.2, 0.3); s.mouth('baby', 'smile', 0.2, 0.01); s.gaze('baby', 7, -2, 0.2, 0.01);
      s.acc('baby', 'cowlick'); // Миша — герой эпизода, его примета
      var g = s.svg(), ov = s.over();
      // палочка — прямая, чтобы потом встать в пропись
      var stick = s.node(g, 'g', {}), inner = s.node(stick, 'g', {}); // внешняя группа скачет, внутренняя — поворачивается
      s.path(inner, 'M' + (CX - 170) + ' ' + (CY + 110) + ' L' + (CX + 140) + ' ' + (CY - 90), { stroke: STICK, 'stroke-width': 11 });
      s.tween(stick, 0.15, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      var horse = s.node(ov, 'g', {});
      Film.icons.horse(s, horse, CX + 140, CY - 90, 1.0, { at: 0.3, dur: 0.8, seed: 5 });
      // два скачка галопа из 3–7
      [0.9, 1.65].forEach(function (t) {
        s.hop('baby', s.A.baby.st.x + 70, CY, t, 0.5, 46);
        Film.ride(s, stick, 70, t, 0.5, 46);
        Film.ride(s, horse, 70, t, 0.5, 46);
      });
      var l1 = s.text('statement', 'Палочка была лошадью.', { left: 160, top: 760, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.5);
      // ребёнок спрыгивает и уходит; лошадь гаснет; палочка встаёт вертикально и уменьшается — первая палочка прописи
      s.out(horse, 2.55, { dur: 0.4 });
      s.hop('baby', 1500, CY + 40, 2.6, 0.5, 40);
      s.actor('baby', { o: 0 }, 3.1, 0.4);
      var page = s.div('cells', { left: 610, top: 300, width: 700, height: 300, opacity: 0 });
      s.tween(page, 2.9, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      // палочка встаёт вертикально и уменьшается: центр (CX − 15, CY + 10) после скачков (+140) уходит в (860, 450)
      var c = (CX - 15) + ' ' + (CY + 10), TF = function (x, y, r, k) { return 'translate(' + x + ' ' + y + ') rotate(' + r + ' ' + c + ') translate(' + c + ') scale(' + k + ') translate(' + (15 - CX) + ' ' + (-CY - 10) + ')'; };
      s.tween(inner, 2.8, { attr: { transform: TF(0, 0, 0, 1) } }, { attr: { transform: TF(860 - (CX - 15) - 140, 450 - (CY + 10), -57, 0.42) }, duration: 0.9, ease: 'power3.inOut' });
      var ink = [];
      for (var i = 0; i < 4; i++) {
        var x = 860 + i * 66;
        var p = s.path(g, 'M' + x + ' 385 L' + x + ' 515', { stroke: K().DEEP, 'stroke-width': 7 });
        s.draw(p, 3.7 + i * 0.22, { dur: 0.18 });
        ink.push(p);
      }
      s.out(stick, 3.75, { dur: 0.2 });
      s.out(ink, 4.95, { dur: 0.3 });
      var four = s.text('kidhand', '4', { left: 900, top: 330, fontSize: 200, lineHeight: 1, color: K().DEEP });
      s.pop(four, 5.1, { from: 0.6, dur: 0.5 });
      s.out(l1, 4.6, { dur: 0.3 });
      var l2 = s.text('statement', 'Теперь палочка — ' + s.HL('знак.'), { left: 160, top: 760, width: 1600, textAlign: 'center' });
      s.lines(l2, 4.9);
      s.hl(l2, 5.6);
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

  // 0:15 — Сроки — это статистика: когда дети идут в первый класс
  var AGES = [['Англия', 4, 5, 'с 4 лет — подготовительный класс, с 5 — обязательно', '4–5'], ['США', 6, 6, '', '6'], ['Германия', 6, 6, '', '6'],
    ['Россия', 6.5, 8, 'с 6,5 до 8 лет — по закону', '6,5–8'], ['Финляндия', 7, 7, 'с 6 — обязательная подготовка', '7']];
  Film.scene({
    id: 'ages', bars: 4,
    build: function (s) {
      var g = s.svg();
      var k = s.text('kicker', 'Сроки — это статистика', { left: 140, top: 120 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h3', 'Когда дети идут в первый класс', { left: 140, top: 156 });
      s.lines(h, 0.2);
      var X = function (a) { return 620 + (a - 4) * 270; }, Y0 = 360, DY = 104;
      [4, 5, 6, 7, 8].forEach(function (a, i) {
        var tk = s.path(g, 'M' + X(a) + ' ' + (Y0 - 50) + ' V' + (Y0 + DY * 4 + 50), { stroke: '#D9D0C4', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
        s.fade(tk, 0.4, { y: 0 });
        var lb = s.text('cite', a + (a < 5 ? ' года' : ' лет'), { left: X(a) - 60, top: Y0 + DY * 4 + 62, width: 120, textAlign: 'center' });
        s.fade(lb, 0.5 + i * 0.05, { y: 6 });
      });
      AGES.forEach(function (r, i) {
        var y = Y0 + i * DY, at = 0.8 + i * 0.4;
        var nm = s.text('lead', r[0], { left: 140, top: y - 28, fontSize: 34 });
        s.fade(nm, at, { y: 6 });
        var bar = s.node(g, 'rect', { x: r[1] === r[2] ? X(r[1]) - 14 : X(r[1]), y: y - 14, width: Math.max(28, X(r[2]) - X(r[1])), height: 28, rx: 14, fill: r[0] === 'Россия' ? K().TEAL : '#9FD6CF' });
        s.grow(bar, at + 0.15, { dur: 0.6 });
        if (r[3]) { var nt = s.text('note', r[3], r[1] === r[2] ? { left: X(r[1]) + 30, top: y - 15, fontSize: 21 } : { left: X(r[1]), top: y + 18, fontSize: 21 }); s.fade(nt, at + 0.4, { y: 4 }); }
        var al = s.text('label', r[4], { left: (r[1] === r[2] ? X(r[1]) - 60 : X(r[1])) , top: y - 52, width: r[1] === r[2] ? 120 : 200, textAlign: r[1] === r[2] ? 'center' : 'left', fontSize: 24, color: 'var(--accent-deep)' });
        s.fade(al, at + 0.3, { y: 4 });
      });
      // Миша с ранцем идёт по оси и встаёт у своей полосы — «Россия»
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, X(4) - 120 - 40, Y0 + DY * 4 + 6, 0.8, '#26A69A', '#1C7A71');
      s.tween(bp, 2.8, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.actor('baby', { x: X(4) - 120, y: Y0 + DY * 4 + 10, d: 70, o: 0 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.gaze('baby', 9, 0, 0, 0.01); s.acc('baby', 'cowlick');
      s.actor('baby', { o: 1 }, 2.8, 0.3);
      K().walk(s, 'baby', X(6.5) - 60, 3.0, { carry: bp, cx: 0, step: 90, dur: 0.22, hold: 0.08 });
      s.actor('baby', { y: Y0 + 3 * DY + 30 }, 5.8, 0.4, 'back.out(2)');
      s.tween(bp, 5.8, { y: 0 }, { y: -DY + 20, duration: 0.4, ease: 'back.out(2)' });
      s.gaze('baby', 0, -6, 6.0, 0.3);
      s.actor('baby', { o: 0 }, 9.4, 0.4); s.out(bp, 9.4, { dur: 0.4 });
      var c = s.text('lead', 'В разных странах в школу идут в разном возрасте — так решает каждая страна.', { left: 140, top: 916, width: 1500, fontSize: 32 });
      s.lines(c, 5.0);
      var src = s.text('cite', 'Eurydice; gov.uk; NCES; ФЗ «Об образовании в РФ», ст. 67', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 6.0, { y: 4 });
    }
  });
})();
