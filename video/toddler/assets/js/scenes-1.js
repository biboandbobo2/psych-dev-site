/* Часть 1. Вещи · 1–1,5 года */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ACC = '#5C6BC0', MUTE = '#8A8F90';

  function check(s, g, x, y, color) { // галочка
    return s.path(g, 'M' + (x - 13) + ' ' + y + ' L' + (x - 4) + ' ' + (y + 10) + ' L' + (x + 14) + ' ' + (y - 11), { stroke: color, 'stroke-width': 5 });
  }
  function cross(s, g, x, y, color) { // крестик
    return s.path(g, 'M' + (x - 10) + ' ' + (y - 10) + ' L' + (x + 10) + ' ' + (y + 10) + ' M' + (x + 10) + ' ' + (y - 10) + ' L' + (x - 10) + ' ' + (y + 10), { stroke: color, 'stroke-width': 5 });
  }
  Film.check = check; Film.cross = cross;

  // 0:15 — заставка части
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      s.chapterCard(1, 'Вещи', '1–1,5 года');
      s.range(12, 18, 0.15, 1.3);
      s.chapter(1, 'Вещи', 0.4, 45);
    }
  });

  // 0:17,5 — Социальная ситуация развития: ребёнок — предмет — взрослый
  Film.scene({
    id: 'ssr', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Социальная ситуация развития', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Ребёнок — предмет — взрослый', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Теперь между ребёнком и взрослым — предмет. Взрослый показывает, что с ним делать.', { left: 140, top: 340, width: 800 });
      s.lines(ld, 3.2, { stagger: 0.12 });
      var bd = s.text('lead', 'Общение — ситуативно-деловое: взрослый и ребёнок заняты общим делом (М. И. Лисина).', { left: 140, top: 580, width: 800, fontSize: 32, color: '#3C4852' });
      s.lines(bd, 7.6, { stagger: 0.1 });

      var Y = 650, BX = 1130, OX = 1400, AX = 1660;
      s.actor('baby', { x: BX, y: Y, d: 110, o: 1 }, 0.3, 1.3);
      s.actor('adult', { x: AX, y: Y - 22, d: 170, o: 0 }, 0.0, 0.01);
      s.actor('adult', { o: 1 }, 0.6, 0.8);
      s.face('baby', true, 1.1, 0.4); s.mouth('baby', 'smile', 1.1, 0.01); s.gaze('baby', 7, 0, 1.1, 0.01);
      s.face('adult', true, 1.1, 0.4); s.mouth('adult', 'smile', 1.1, 0.01); s.gaze('adult', -7, 0, 1.1, 0.01);

      var g = s.svg();
      var dy = s.path(g, 'M' + (BX + 72) + ' ' + Y + ' L' + (AX - 96) + ' ' + (Y - 12), { stroke: MUTE, 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(dy, 1.4, { dur: 0.7 });
      s.out(dy, 2.6, { dur: 0.4 });

      // предмет встаёт между ними
      s.actor('obj', { x: OX, y: Y - 170, d: 80, o: 0 }, 2.7, 0.01);
      s.actor('obj', { o: 1 }, 2.75, 0.2);
      s.actor('obj', { y: Y + 12 }, 2.75, 0.45, 'power2.in');
      s.squash('obj', 1.14, 0.84, 3.2, 0.07); s.squash('obj', 1, 1, 3.27, 0.4, 'back.out(3)');
      s.gaze('baby', 6, 3, 3.2, 0.4); s.gaze('adult', -6, 4, 3.2, 0.4);
      var la = s.path(g, 'M' + (AX - 96) + ' ' + (Y - 2) + ' L' + (OX + 60) + ' ' + (Y + 8), { stroke: '#385771', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      var lb = s.path(g, 'M' + (BX + 72) + ' ' + (Y + 8) + ' L' + (OX - 60) + ' ' + (Y + 10), { stroke: '#E4735A', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(la, 3.7, { dur: 0.6 }); s.dash(lb, 4.0, { dur: 0.6 });
      var names = [['ребёнок', BX, Y + 84], ['предмет', OX, Y + 84], ['взрослый', AX, Y + 94]];
      names.forEach(function (n, i) {
        var e = s.text('label soft', n[0], { left: n[1] - 120, top: n[2], width: 240, textAlign: 'center', fontSize: 24 });
        s.fade(e, 4.3 + i * 0.15, { y: 6 });
      });

      // взрослый показывает действие — ребёнок повторяет
      var arA = s.path(g, 'M' + (OX + 64) + ' ' + (Y - 58) + ' Q' + OX + ' ' + (Y - 118) + ' ' + (OX - 50) + ' ' + (Y - 66), { stroke: '#385771', 'stroke-width': 3.5 });
      var arAh = s.path(g, 'M' + (OX - 62) + ' ' + (Y - 88) + ' L' + (OX - 50) + ' ' + (Y - 66) + ' L' + (OX - 28) + ' ' + (Y - 76), { stroke: '#385771', 'stroke-width': 3.5 });
      s.draw(arA, 5.6, { dur: 0.6 }); s.fade(arAh, 6.1, { y: 0, dur: 0.25 });
      var tA = s.text('note', 'показывает', { left: OX + 30, top: Y - 150, color: '#385771', fontWeight: 650 });
      s.fade(tA, 5.7, { y: 6 });
      s.tween(s.A.obj.el, 5.7, { rotation: 0 }, { rotation: -90, duration: 0.7, ease: 'power2.inOut' });
      s.out([arA, arAh, tA], 7.2, { dur: 0.4 });
      var arB = s.path(g, 'M' + (OX - 64) + ' ' + (Y - 58) + ' Q' + OX + ' ' + (Y - 118) + ' ' + (OX + 50) + ' ' + (Y - 66), { stroke: '#B8533D', 'stroke-width': 3.5 });
      var arBh = s.path(g, 'M' + (OX + 62) + ' ' + (Y - 88) + ' L' + (OX + 50) + ' ' + (Y - 66) + ' L' + (OX + 28) + ' ' + (Y - 76), { stroke: '#B8533D', 'stroke-width': 3.5 });
      s.draw(arB, 7.8, { dur: 0.6 }); s.fade(arBh, 8.3, { y: 0, dur: 0.25 });
      var tB = s.text('note', 'повторяет', { left: OX - 190, top: Y - 150, color: '#B8533D', fontWeight: 650 });
      s.fade(tB, 7.9, { y: 6 });
      s.tween(s.A.obj.el, 7.9, { rotation: -90 }, { rotation: -180, duration: 0.7, ease: 'power2.inOut' });
      s.squash('baby', 1.08, 0.92, 7.8, 0.15); s.squash('baby', 1, 1, 7.95, 0.4, 'back.out(3)');

      s.face('baby', false, 11.1, 0.3); s.face('adult', false, 11.1, 0.3);
      s.actor('obj', { o: 0, d: 40 }, 11.2, 0.7, 'power2.in');
      s.actor('adult', { o: 0, d: 120 }, 11.2, 0.8, 'power2.in');
      s.rest(11.2, 1.2);
    }
  });

  // 0:30 — Ведущая деятельность: предметная (соотносящие и орудийные действия)
  Film.scene({
    id: 'objects', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Ведущая деятельность · Д. Б. Эльконин', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Предметная деятельность', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Ребёнок осваивает не просто вещи, а способы действовать с ними.', { left: 140, top: 292, width: 1640, fontSize: 36 });
      s.lines(ld, 0.9);

      var c1 = s.div('card', { left: 140, top: 378, width: 790, height: 482 });
      s.fade(c1, 1.8, { y: 24 });
      var c2 = s.div('card', { left: 990, top: 378, width: 790, height: 482 });
      s.fade(c2, 6.4, { y: 24 });
      var g = s.svg();

      // ── Соотносящие действия: пирамидка ──
      var k1 = s.text('kicker muted', 'Соотносящие действия', { left: 190, top: 418 });
      s.fade(k1, 2.0, { y: 6 });
      var CX = 535, BASE = 676, RH = 30;
      var base = s.node(g, 'rect', { x: CX - 110, y: BASE, width: 220, height: 16, rx: 8, fill: '#E7E2DA', stroke: INK, 'stroke-width': 3 });
      var stick = s.node(g, 'rect', { x: CX - 8, y: BASE - 4 * (RH + 3) - 26, width: 16, height: 4 * (RH + 3) + 28, rx: 8, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      g.insertBefore(stick, base);
      s.fade([stick, base], 2.2, { y: 10 });
      var RW = [196, 156, 116, 78], RC = ['#E0A930', '#E7B84F', '#EEC871', '#F4D995'];
      var rings = RW.map(function (w, i) {
        return s.node(g, 'rect', { x: CX - w / 2, y: BASE - (i + 1) * (RH + 3), width: w, height: RH, rx: 15, fill: RC[i], stroke: INK, 'stroke-width': 3, opacity: 0 });
      });
      // сначала — наугад: маленькое кольцо легло вниз
      var wrong = s.node(g, 'rect', { x: CX - 39, y: BASE - (RH + 3), width: 78, height: RH, rx: 15, fill: RC[3], stroke: INK, 'stroke-width': 3, opacity: 0 });
      s.tween(wrong, 2.6, { y: -110, opacity: 0 }, { y: -110, opacity: 1, duration: 0.15 });
      s.tween(wrong, 2.7, { y: -110 }, { y: 0, duration: 0.36, ease: 'power2.in' });
      s.tween(wrong, 3.15, { x: 0 }, { x: -9, duration: 0.07 });
      s.tween(wrong, 3.22, { x: -9 }, { x: 9, duration: 0.1 });
      s.tween(wrong, 3.32, { x: 9 }, { x: -6, duration: 0.1 });
      s.tween(wrong, 3.42, { x: -6 }, { x: 0, duration: 0.08 });
      s.tween(wrong, 3.4, { attr: { stroke: INK } }, { attr: { stroke: '#C0392B' }, duration: 0.15 });
      s.tween(wrong, 3.6, { y: 0, x: 0, opacity: 1 }, { y: -36, x: 70, opacity: 0, duration: 0.4, ease: 'power2.out' });
      // потом — по размеру
      rings.forEach(function (r, i) { // кольца ложатся на восьмые: 4,375 · 4,6875 · 5,0 · 5,3125
        var t = 4.035 + i * 0.3125;
        s.tween(r, t, { y: -80, opacity: 0 }, { y: -80, opacity: 1, duration: 0.14 });
        s.tween(r, t + 0.04, { y: -80 }, { y: 0, duration: 0.3, ease: 'power2.in' });
      });
      var ok1 = check(s, g, CX + 150, BASE - 70, ACC);
      s.draw(ok1, 5.625, { dur: 0.35 });
      var t1 = s.text('body', 'Соединить вещи с учётом размера и формы: пирамидка, вкладыши, крышка.', { left: 190, top: 716, width: 690, fontSize: 30 });
      s.lines(t1, 5.0);

      // ── Орудийные действия: ложка ──
      var k2 = s.text('kicker muted', 'Орудийные действия', { left: 1040, top: 418 });
      s.fade(k2, 6.6, { y: 6 });
      var bowl = s.node(g, 'g', {});
      s.path(bowl, 'M1060 590 Q1062 650 1120 650 Q1178 650 1180 590 Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      s.node(bowl, 'ellipse', { cx: 1120, cy: 592, rx: 52, ry: 8, fill: '#F5E7BD', stroke: INK, 'stroke-width': 3 });
      var kid = s.node(g, 'g', {});
      s.node(kid, 'circle', { cx: 1700, cy: 540, r: 44, fill: '#E4735A' });
      s.node(kid, 'circle', { cx: 1688, cy: 528, r: 4.6, fill: '#FFFDF8' });
      s.node(kid, 'circle', { cx: 1712, cy: 528, r: 4.6, fill: '#FFFDF8' });
      s.node(kid, 'ellipse', { cx: 1700, cy: 556, rx: 8, ry: 9, fill: '#FFFDF8' });
      s.fade([bowl, kid], 6.8, { y: 10, stagger: 0.15 });

      var trA = s.path(g, 'M1150 578 Q1380 380 1640 540', { stroke: '#B9B2A8', 'stroke-width': 3, 'stroke-dasharray': '3 10' });
      var trB = s.path(g, 'M1150 578 L1640 552', { stroke: ACC, 'stroke-width': 3.5 });
      function spoon() {
        var o = s.node(g, 'g', {});
        var inn = s.node(o, 'g', { transform: 'rotate(0)' });
        s.path(inn, 'M-18 -2 L-86 -14', { stroke: INK, 'stroke-width': 7 });
        s.node(inn, 'ellipse', { cx: 0, cy: 0, rx: 24, ry: 12, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
        var food = s.node(inn, 'ellipse', { cx: 1, cy: -3, rx: 14, ry: 6, fill: '#E0A930' });
        return { o: o, inn: inn, food: food };
      }
      // как рукой: ложка переворачивается, каша падает
      var A1 = spoon();
      s.set(A1.o, 0, { x: 1150, y: 578, opacity: 0 }, { x: 1150, y: 578, opacity: 0 });
      s.tween(A1.o, 7.3, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      s.dash(trA, 7.5, { dur: 1.4, ease: 'none' });
      s.tween(A1.o, 7.5, { x: 1150 }, { x: 1640, duration: 1.4, ease: 'none' });
      s.tween(A1.o, 7.5, { y: 578 }, { y: 476, duration: 0.7, ease: 'power2.out' });
      s.tween(A1.o, 8.2, { y: 476 }, { y: 540, duration: 0.7, ease: 'power2.in' });
      s.tween(A1.inn, 7.8, { attr: { transform: 'rotate(0)' } }, { attr: { transform: 'rotate(118)' }, duration: 0.6, ease: 'power1.inOut' });
      s.tween(A1.food, 8.05, { opacity: 1 }, { opacity: 0, duration: 0.05 });
      [[1318, 490], [1334, 486], [1350, 490]].forEach(function (p, i) {
        var d = s.node(g, 'circle', { cx: p[0], cy: p[1], r: 6, fill: '#E0A930', opacity: 0 });
        s.tween(d, 8.05 + i * 0.05, { opacity: 1, y: 0 }, { opacity: 0, y: 150, duration: 0.7, ease: 'power2.in' });
      });
      s.out(A1.o, 9.05, { dur: 0.3 });
      var xA = cross(s, g, 1560, 440, '#C0392B');
      s.fade(xA, 9.0, { y: 0, dur: 0.3 });
      var lA = s.text('note', 'как рукой', { left: 1582, top: 420, fontWeight: 650, color: '#B8533D' });
      s.fade(lA, 9.0, { y: 6 });
      // как орудием: ложка ровно, каша доезжает
      var B1 = spoon();
      s.set(B1.o, 0, { x: 1150, y: 578, opacity: 0 }, { x: 1150, y: 578, opacity: 0 });
      s.tween(B1.o, 9.5, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      s.draw(trB, 9.7, { dur: 1.1, ease: 'power1.inOut' });
      s.tween(B1.o, 9.7, { x: 1150, y: 578 }, { x: 1636, y: 553, duration: 1.1, ease: 'power1.inOut' });
      var okB = check(s, g, 1470, 624, ACC);
      s.draw(okB, 10.9, { dur: 0.35 });
      var lB = s.text('note', 'как орудием', { left: 1494, top: 606, fontWeight: 650, color: ACC });
      s.fade(lB, 10.9, { y: 6 });

      var t2 = s.text('body', 'Ложка сначала — продолжение руки. Потом рука подчиняется логике орудия.', { left: 1040, top: 716, width: 690, fontSize: 30 });
      s.lines(t2, 11.3);
      var ci2 = s.text('cite', 'П. Я. Гальперин', { left: 1040, top: 812 });
      s.fade(ci2, 11.9, { y: 6 });
    }
  });

  // 0:45 — Восприятие в центре; ситуационная связанность (К. Левин)
  Film.scene({
    id: 'field', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Л. С. Выготский · К. Левин', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Восприятие — в центре', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Все функции ребёнка развиваются через восприятие (Л. С. Выготский).', { left: 140, top: 330, width: 800 });
      s.lines(ld, 1.0);
      var ex = s.text('body', 'Чтобы сесть на камень, надо от него отвернуться. Но камень «манит» — и ребёнок снова поворачивается к нему.', { left: 140, top: 520, width: 800 });
      s.lines(ex, 3.3, { stagger: 0.1 });
      var ci = s.text('cite', 'Фильм К. Левина: Ханне 1 год 7 месяцев', { left: 140, top: 690 });
      s.fade(ci, 4.4, { y: 6 });
      var cc = s.text('h3', 'Мышление — <span class="acc">наглядно-действенное</span>: задачи решаются руками.', { left: 140, top: 756, width: 1000, fontSize: 40 });
      s.lines(cc, 10.4, { stagger: 0.1 });

      var g = s.svg();
      var GY = 760;
      var ground = s.path(g, 'M1080 ' + GY + ' H1780', { stroke: '#D9D0C4', 'stroke-width': 2.5 });
      s.draw(ground, 1.2, { dur: 0.9 });
      var stone = s.path(g, 'M1390 ' + GY + ' C1382 704 1450 672 1528 674 C1610 676 1664 708 1662 ' + GY + ' Z', { fill: '#D6CDBF', stroke: INK, 'stroke-width': 3 });
      s.fade(stone, 1.4, { y: 10 });
      var sl = s.text('note', 'камень', { left: 1456, top: GY + 12, width: 140, textAlign: 'center' });
      s.fade(sl, 1.8, { y: 6 });

      var BY = GY - 56;
      s.actor('baby', { x: 1130, y: BY, d: 112, o: 1 }, 1.4, 1.2);
      s.face('baby', true, 2.2, 0.4); s.mouth('baby', 'soft', 2.2, 0.01); s.gaze('baby', 7, 0, 2.2, 0.01);
      s.hop('baby', 1284, BY, 2.9, 0.45, 40);

      // «притяжение» камня: вектор от ребёнка к камню
      var vec = s.path(g, 'M1350 ' + (BY - 8) + ' L1420 ' + (BY - 8), { stroke: ACC, 'stroke-width': 4 });
      var vecH = s.path(g, 'M1407 ' + (BY - 19) + ' L1421 ' + (BY - 8) + ' L1407 ' + (BY + 3), { stroke: ACC, 'stroke-width': 4 });
      var vl = s.text('note', 'притягивает', { left: 1290, top: BY - 112, width: 200, textAlign: 'center', color: ACC, fontWeight: 650 });
      // попытка сесть: отвернуться → снова повернуться к камню (дважды)
      [4.2, 6.4].forEach(function (t, i) {
        s.gaze('baby', -8, 0, t, 0.18);
        s.actor('baby', { x: 1310 }, t + 0.2, 0.5, 'power2.inOut');
        s.gaze('baby', 8, -1, t + 0.85, 0.14);
        s.squash('baby', 0.94, 1.08, t + 0.85, 0.1); s.squash('baby', 1, 1, t + 0.95, 0.35, 'back.out(3)');
        s.actor('baby', { x: 1284 }, t + 1.0, 0.4, 'power2.out');
        if (i === 0) {
          s.draw(vec, t + 0.85, { dur: 0.3 }); s.fade(vecH, t + 1.1, { y: 0, dur: 0.2 });
          s.fade(vl, t + 1.0, { y: 6 });
        } else {
          s.tween([vec, vecH], t + 0.85, { opacity: 0.35 }, { opacity: 1, duration: 0.25 });
        }
      });
      s.tween([vec, vecH], 5.9, { opacity: 1 }, { opacity: 0.35, duration: 0.3 });

      s.face('baby', false, 13.3, 0.3);
      s.rest(13.3, 1.2);
    }
  });
})();
