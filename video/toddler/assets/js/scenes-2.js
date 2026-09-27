/* Часть 2. Слова и люди · 1,5–2 года */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ACC = '#5C6BC0', MUTE = '#8A8F90';

  // шаги ребёнка по шкале: from → to (мес), по одному «шажку» на отметку
  function walk(s, from, to, lt, step) {
    step = step || 3;
    var t = lt;
    for (var m = from + step; m <= to + 0.01; m += step) { s.hop('baby', s.mx(m), s.RY, t, 0.34, 20); t += 0.46; }
  }
  Film.walk = walk;

  // 1:00 — заставка части
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      s.chapterCard(2, 'Слова и люди', '1,5–2 года');
      s.range(18, 24, 0.15, 1.3);
      s.age(18, 0.2, 1.3, 2);
      walk(s, 12, 18, 0.2);
      s.chapter(2, 'Слова и люди', 0.4, 37.5);
    }
  });

  // 1:02,5 — Словарный взрыв
  Film.scene({
    id: 'words', bars: 8,
    build: function (s) {
      var TX = 1020; // текст справа: слева — график, выровненный по шкале возраста
      var k = s.text('kicker', '~1,5–2 года', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Словарный взрыв', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var ld = s.text('lead', 'К полутора годам — около 50 слов, к двум — около 300.', { left: TX, top: 330, width: 760 });
      s.lines(ld, 3.0);
      var ci = s.text('cite', 'Нормы опросника CDI (Л. Фенсон и др., 1994)', { left: TX, top: 452 });
      s.fade(ci, 3.8, { y: 6 });

      // график: слов в активном словаре — по возрасту (медиана, схематично)
      var g = s.svg();
      var Y0 = 890, K = 1.62; // 300 слов ≈ 486 px
      function P(m, w) { return [s.mx(m), Y0 - K * w]; }
      [18, 24].forEach(function (m, i) {
        var gl = s.path(g, 'M' + s.mx(m) + ' ' + (Y0 + 4) + ' V' + (Y0 - K * 320), { stroke: '#E2DBD0', 'stroke-width': 2, 'stroke-dasharray': '2 12' });
        s.fade(gl, 0.8 + i * 0.1, { y: 0, dur: 0.6 });
      });
      var axis = s.path(g, 'M' + s.mx(12) + ' ' + Y0 + ' H' + s.mx(25.2), { stroke: '#CDC3B4', 'stroke-width': 2 });
      s.draw(axis, 0.7, { dur: 0.8 });
      var pts = [[12, 4], [13.5, 10], [15, 20], [16.5, 32], [18, 50], [19.5, 90], [21, 150], [22.5, 222], [24, 300]];
      var d = '', i;
      for (i = 0; i < pts.length; i++) {
        var p = P(pts[i][0], pts[i][1]);
        d += (i ? ' L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      // сглаживание: Catmull-Rom → Безье
      function smooth(ps) {
        var q = ps.map(function (a) { return P(a[0], a[1]); }), out = 'M' + q[0][0].toFixed(1) + ' ' + q[0][1].toFixed(1);
        for (var j = 0; j < q.length - 1; j++) {
          var p0 = q[Math.max(0, j - 1)], p1 = q[j], p2 = q[j + 1], p3 = q[Math.min(q.length - 1, j + 2)];
          var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
          out += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
        }
        return out;
      }
      d = smooth(pts);
      var area = s.path(g, d + ' L' + s.mx(24) + ' ' + Y0 + ' L' + s.mx(12) + ' ' + Y0 + ' Z', { fill: '#EBEDF7', stroke: 'none', opacity: 0 });
      var curve = s.path(g, d, { stroke: ACC, 'stroke-width': 5 });
      s.draw(curve, 1.2, { dur: 2.0, ease: 'power1.in' });
      s.tween(area, 2.6, { opacity: 0 }, { opacity: 1, duration: 0.8 });
      var arrow = s.path(g, 'M' + (s.mx(24) - 10) + ' ' + (Y0 - K * 300 - 26) + ' L' + s.mx(24) + ' ' + (Y0 - K * 300 - 44) + ' L' + (s.mx(24) + 10) + ' ' + (Y0 - K * 300 - 26), { stroke: ACC, 'stroke-width': 4 });
      var dots = [[18, 50, '~50 слов', 'above'], [24, 300, '~300 слов', 'left']];
      dots.forEach(function (q, j) {
        var p = P(q[0], q[1]);
        var c = s.node(g, 'circle', { cx: p[0], cy: p[1], r: 9, fill: '#FFFDF8', stroke: ACC, 'stroke-width': 4, opacity: 0 });
        s.tween(c, 2.0 + j * 1.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        var lb = s.text('label acc', q[2], q[3] === 'above' ? { left: p[0] - 200, top: p[1] - 62, width: 180, textAlign: 'right' } : { left: p[0] - 196, top: p[1] - 18, width: 170, textAlign: 'right' });
        s.fade(lb, 2.1 + j * 1.0, { y: 6 });
      });
      s.fade(arrow, 3.2, { y: 8, dur: 0.4 });
      var yl = s.text('small-caps', 'слов в активном словаре', { left: s.mx(12), top: Y0 - K * 300 - 20 });
      s.fade(yl, 1.0, { y: 6 });

      // первые фразы
      var fk = s.text('small-caps', 'Первые фразы из двух слов', { left: TX, top: 540 });
      s.fade(fk, 5.2, { y: 6 });
      var ph = ['«Мама, дай!»', '«Киса ушла»', '«Ещё сок»'];
      var bx = [TX, TX + 262, TX + 512];
      ph.forEach(function (tx, j) {
        var b = s.div('bubble', { left: bx[j], top: 590, fontSize: 30 }, null, tx);
        s.pop(b, 5.5 + j * 0.35, { from: 0.8, dur: 0.5, origin: '20% 100%' });
      });

      var nt = s.text('note', 'Разброс между детьми огромен. Ориентир «позднего старта»: к двум годам меньше 50 слов или нет фраз из двух слов (Л. Рескорла, 1989).', { left: TX, top: 716, width: 760 });
      s.lines(nt, 9.2, { stagger: 0.08 });
    }
  });

  // 1:22,5 — Помочь другому (Ф. Варнекен, М. Томаселло, 2006)
  Film.scene({
    id: 'help', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Ф. Варнекен, М. Томаселло, 2006', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Помочь другому', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Полуторагодовалые дети сами помогают незнакомому взрослому: поднимают то, что он уронил.', { left: 140, top: 330, width: 800 });
      s.lines(ld, 1.0, { stagger: 0.1 });
      var ctl = s.text('lead', 'А если взрослый бросил вещь нарочно — не помогают.', { left: 140, top: 560, width: 800, fontSize: 34, color: '#3C4852' });
      s.lines(ctl, 8.2);
      var cc = s.text('h3', 'Ребёнок видит <span class="acc">цель</span> другого человека.', { left: 140, top: 732, width: 900 });
      s.lines(cc, 11.0);

      var g = s.svg();
      var GY = 770;
      var ground = s.path(g, 'M1060 ' + GY + ' H1780', { stroke: '#D9D0C4', 'stroke-width': 2.5 });
      s.draw(ground, 0.8, { dur: 0.9 });
      // незнакомый взрослый
      s.actor('stranger', { x: 1640, y: GY - 150, d: 180, o: 0 }, 0, 0.01);
      s.actor('stranger', { o: 1 }, 1.0, 0.8);
      s.face('stranger', true, 1.5, 0.4); s.mouth('stranger', 'soft', 1.5, 0.01); s.gaze('stranger', -5, 4, 1.5, 0.01);
      // ребёнок сходит со шкалы
      s.actor('baby', { x: 1150, y: GY - 50, d: 100, o: 1 }, 1.2, 1.3);
      s.face('baby', true, 2.0, 0.4); s.mouth('baby', 'soft', 2.0, 0.01); s.gaze('baby', 7, -1, 2.0, 0.01);

      // прищепка (маленький предмет) — «уронил»
      s.actor('obj', { x: 1540, y: GY - 190, d: 30, o: 0 }, 2.2, 0.01);
      s.actor('obj', { o: 1 }, 2.3, 0.3);
      s.actor('obj', { x: 1440, y: GY - 15 }, 3.1, 0.55, 'power2.in');
      s.squash('obj', 1.25, 0.75, 3.65, 0.06); s.squash('obj', 1, 1, 3.71, 0.35, 'back.out(3)');
      s.mouth('stranger', 'flat', 3.7, 0.3);
      s.actor('stranger', { x: 1612, y: GY - 136 }, 3.8, 0.6, 'power2.out'); // тянется — не достать
      var reach = s.path(g, 'M1548 ' + (GY - 120) + ' Q1500 ' + (GY - 90) + ' 1476 ' + (GY - 44), { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 10' });
      s.dash(reach, 4.0, { dur: 0.5 });
      s.gaze('baby', 7, 4, 3.7, 0.3);
      // ребёнок помогает
      s.out(reach, 4.9, { dur: 0.3 });
      var land = s.hop('baby', 1360, GY - 50, 4.8, 0.44, 50);
      s.actor('obj', { x: 1428, y: GY - 62 }, land + 0.1, 0.3, 'power2.out');   // взял
      s.hop('baby', 1450, GY - 50, land + 0.45, 0.4, 36);
      s.actor('obj', { x: 1518, y: GY - 62 }, land + 0.54, 0.4, 'sine.inOut');  // несёт
      s.actor('obj', { x: 1536, y: GY - 150 }, land + 1.0, 0.45, 'power2.inOut'); // отдал
      s.actor('stranger', { x: 1640, y: GY - 150 }, land + 1.05, 0.6, 'power2.inOut');
      s.mouth('stranger', 'smile', land + 1.1, 0.3); s.mouth('baby', 'smile', land + 1.1, 0.3);
      var ok = Film.check(s, g, 1110, GY + 44, ACC);
      s.draw(ok, land + 1.4, { dur: 0.35 });
      var okl = s.text('note', 'уронил — помогает', { left: 1136, top: GY + 24, color: ACC, fontWeight: 650 });
      s.fade(okl, land + 1.4, { y: 6 });

      // контроль: бросил нарочно
      s.out([ok, okl], 8.0, { dur: 0.3 });
      s.actor('obj', { x: 1700, y: GY - 15 }, 8.5, 0.7, 'power1.in');
      s.tween(s.A.obj.el, 8.5, { rotation: 0 }, { rotation: 200, duration: 0.7, ease: 'none' });
      s.squash('obj', 1.25, 0.75, 9.2, 0.06); s.squash('obj', 1, 1, 9.26, 0.35, 'back.out(3)');
      s.mouth('stranger', 'soft', 8.4, 0.3); s.gaze('stranger', 5, 3, 8.4, 0.3);
      s.gaze('baby', 7, 2, 8.6, 0.4); s.mouth('baby', 'flat', 9.2, 0.3);
      var no = Film.cross(s, g, 1110, GY + 44, '#9A948C');
      s.fade(no, 9.6, { y: 0, dur: 0.3 });
      var nol = s.text('note', 'бросил нарочно — не помогает', { left: 1136, top: GY + 24, fontWeight: 650 });
      s.fade(nol, 9.6, { y: 6 });

      s.face('baby', false, 13.3, 0.3); s.face('stranger', false, 13.3, 0.3);
      s.actor('stranger', { o: 0, d: 130 }, 13.4, 0.8, 'power2.in');
      s.actor('obj', { o: 0, d: 10 }, 13.4, 0.6, 'power2.in');
      s.rest(13.3, 1.2);
    }
  });
})();
