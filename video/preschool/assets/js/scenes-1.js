/* Часть 1. Как взрослые · игра (3–7 лет): социальная ситуация, два поля, «больница», часовой, проверки */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', STICK = '#8B6A45', ADULT = '#385771', MUTE = '#8A8F90';
  var G = function () { return Film.sketch.GRAPHITE; };

  // точки окружности для рисованных кругов
  function circ(cx, cy, r, n, a0) {
    var p = [], k = n || 14, s0 = a0 || -1.4;
    for (var i = 0; i <= k; i++) { var a = s0 + i * 2 * Math.PI / k; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  // докторская шапочка с крестом
  function cap(s, g, x, y, at, seed) {
    s.sk(g, [[x - 34, y + 6], [x - 30, y - 22], [x + 30, y - 22], [x + 34, y + 6], [x - 34, y + 6]], { at: at, dur: 0.6, seed: seed || 61 });
    s.sk(g, [[x, y - 16], [x, y]], { at: at + 0.4, dur: 0.15, color: ORANGE, width: 5, seed: (seed || 61) + 2 });
    s.sk(g, [[x - 8, y - 8], [x + 8, y - 8]], { at: at + 0.5, dur: 0.15, color: ORANGE, width: 5, seed: (seed || 61) + 4 });
  }
  // стетоскоп на «шее» персонажа (x, y — центр низа круга)
  function steth(s, g, x, y, at) {
    s.sk(g, [[x - 26, y - 14], [x - 18, y + 22], [x, y + 34], [x + 18, y + 22], [x + 26, y - 14]], { at: at, dur: 0.6, seed: 71 });
    s.sk(g, [[x, y + 34], [x + 6, y + 60], [x + 22, y + 70]], { at: at + 0.45, dur: 0.3, seed: 73 });
    s.sk(g, circ(x + 30, y + 74, 9, 10), { at: at + 0.7, dur: 0.3, seed: 75, color: ORANGE });
  }
  function check(s, g, x, y, color) { // галочка
    return s.path(g, 'M' + (x - 13) + ' ' + y + ' L' + (x - 4) + ' ' + (y + 10) + ' L' + (x + 14) + ' ' + (y - 11), { stroke: color, 'stroke-width': 5 });
  }
  function cross(s, g, x, y, color) { // крестик
    return s.path(g, 'M' + (x - 10) + ' ' + (y - 10) + ' L' + (x + 10) + ' ' + (y + 10) + ' M' + (x + 10) + ' ' + (y - 10) + ' L' + (x - 10) + ' ' + (y + 10), { stroke: color, 'stroke-width': 5 });
  }
  Film.circ = circ; Film.cap = cap; Film.steth = steth; Film.check = check; Film.cross = cross;

  // 0:22,5 — заставка части
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      s.chapterCard(1, 'Как взрослые', 'игра · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.chapter(1, 'Как взрослые', 0.4, 74.6);
    }
  });

  // 0:25 — Социальная ситуация развития: хочу как взрослые → игра (Д. Б. Эльконин)
  Film.scene({
    id: 'ssr', bars: 4,
    build: function (s) {
      var k = s.text('kicker', 'Социальная ситуация развития', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Хочу как взрослые', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Ребёнок хочет жить общей жизнью со взрослыми — но в их мир его пока не пускают.', { left: 140, top: 330, width: 780, fontSize: 36 });
      s.lines(p1, 0.9);
      var q = s.text('quote', '«Не быть взрослым, а действовать как взрослые»', { left: 140, top: 520, width: 780, fontSize: 40 });
      s.lines(q, 3.4);
      var qc = s.text('cite', 'Д. Б. Эльконин, 1978', { left: 140, top: 628 });
      s.fade(qc, 4.0, { y: 6 });
      var pre = s.text('small-caps', 'Выход — игра. Она становится', { left: 140, top: 700 });
      s.fade(pre, 6.2, { y: 6 });
      var term = s.text('h3 acc', '<span class="term">ведущей деятельностью<span class="en">leading activity</span></span>', { left: 140, top: 734 });
      s.fade(term, 6.5, { y: 10 });

      // «горизонт ролей»: взрослые с рисованными атрибутами
      var g = s.svg(), ov = s.over();
      var roles = [[1180, 330, 'врач'], [1420, 300, 'водитель'], [1660, 330, 'повар']];
      roles.forEach(function (r, i) {
        var c = s.node(g, 'circle', { cx: r[0], cy: r[1], r: 50, fill: ADULT, opacity: 0 });
        s.tween(c, 0.6 + i * 0.25, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' });
        var lb = s.text('note', r[2], { left: r[0] - 80, top: 482, width: 160, textAlign: 'center', fontSize: 22 });
        s.fade(lb, 1.3 + i * 0.25, { y: 6 });
      });
      steth(s, ov, 1180, 380, 1.1);
      s.sk(ov, circ(1420, 300 + 92, 28, 16), { at: 1.4, dur: 0.6, seed: 81 });            // руль
      s.sk(ov, [[1420, 392], [1420, 364]], { at: 1.9, dur: 0.2, seed: 83 });
      s.sk(ov, [[1660, 284], [1636, 262], [1650, 238], [1676, 242], [1690, 226], [1712, 244], [1704, 270], [1686, 284]], { at: 1.7, dur: 0.6, seed: 85 }); // колпак повара

      // ребёнок тянется — не достаёт
      var CX = 1420, CY = 760;
      s.actor('baby', { x: CX, y: CY, d: 108, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.6, 0.5);
      s.face('baby', true, 0.8, 0.3); s.mouth('baby', 'soft', 0.8, 0.01); s.gaze('baby', 0, -8, 0.8, 0.01);
      s.hop('baby', CX, CY, 2.5, 0.42, 70);
      s.hop('baby', CX, CY, 3.75, 0.42, 80);
      s.mouth('baby', 'flat', 4.5, 0.3);
      // палочка → рисованный руль: ребёнок «ведёт машину»
      var st = s.path(g, 'M' + (CX + 50) + ' ' + (CY + 40) + ' L' + (CX + 112) + ' ' + (CY - 30), { stroke: STICK, 'stroke-width': 10 });
      s.tween(st, 5.0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.sk(ov, circ(CX + 112, CY - 30, 30, 16), { at: 5.6, dur: 0.6, seed: 91, color: ORANGE, width: 5 });
      s.mouth('baby', 'smile', 6.0, 0.3); s.gaze('baby', 6, 0, 6.0, 0.3);
      s.squash('baby', 1.06, 0.95, 6.6, 0.2); s.squash('baby', 1, 1, 6.8, 0.3, 'back.out(3)');
      s.squash('baby', 1.06, 0.95, 7.85, 0.2); s.squash('baby', 1, 1, 8.05, 0.3, 'back.out(3)');
    }
  });

  // 0:35 — Два поля (Л. С. Выготский) → «на голову выше самого себя»
  Film.scene({
    id: 'fields', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Л. С. Выготский', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Два поля', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'В игре видимое и смысловое поле расходятся. Палочка — опора, чтобы оторвать значение «лошадь» от настоящей лошади.', { left: 140, top: 330, width: 760, fontSize: 34 });
      s.lines(p1, 0.9);

      var g = s.svg(), ov = s.over();
      var DX = 1390;
      var div = s.path(g, 'M' + DX + ' 290 V 820', { stroke: '#CDC3B4', 'stroke-width': 2, 'stroke-dasharray': '4 10' });
      s.dash(div, 0.8, { dur: 0.7 });
      var l1 = s.text('small-caps', 'видимое поле', { left: 1010, top: 270, width: 360, textAlign: 'center' });
      var l2 = s.text('small-caps', 'смысловое поле', { left: 1410, top: 270, width: 360, textAlign: 'center', color: DEEP });
      s.fade(l1, 1.0, { y: 6 }); s.fade(l2, 1.3, { y: 6 });
      // слева — просто палка
      var st1 = s.path(g, 'M1070 640 L1330 520', { stroke: STICK, 'stroke-width': 11 });
      s.tween(st1, 1.4, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var cap1 = s.text('note', 'палка', { left: 1110, top: 690, width: 180, textAlign: 'center' });
      s.fade(cap1, 1.7, { y: 6 });
      // справа — та же палка, но в игре: лошадь и всадник
      var rideG = s.node(g, 'g', {}), horseG = s.node(ov, 'g', {});
      s.path(rideG, 'M1470 680 C1530 650 1600 610 1670 562', { stroke: STICK, 'stroke-width': 11 });
      s.tween(rideG, 2.0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var hx = 1670, hy = 562;
      function P(dx, dy) { return [hx + dx * 0.8, hy + dy * 0.8]; }
      s.sk(horseG, [P(0, 0), P(23, -46), P(53, -80), P(99, -92), P(141, -80), P(161, -54), P(143, -34), P(95, -32), P(63, -16), P(39, 16), P(13, 42)], { at: 2.4, dur: 1.0, seed: 5 });
      s.sk(horseG, [P(53, -78), P(45, -116), P(71, -90)], { at: 3.1, dur: 0.3, seed: 9 });
      s.sk(horseG, [P(29, -58), P(13, -46), P(23, -34), P(1, -26), P(13, -10), P(-9, -4), P(1, 12)], { at: 2.9, dur: 0.6, color: ORANGE, width: 5, seed: 21 });
      var eye = s.node(horseG, 'circle', { cx: hx + 76, cy: hy - 53, r: 5, fill: G(), opacity: 0 });
      s.tween(eye, 3.4, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var cap2 = s.text('note', 'лошадь', { left: 1500, top: 720, width: 180, textAlign: 'center', color: DEEP, fontWeight: 650 });
      s.fade(cap2, 3.4, { y: 6 });
      s.actor('baby', { x: 1560, y: 616, d: 96, o: 0 }, 2.6, 0.01);
      s.actor('baby', { o: 1 }, 2.7, 0.5);
      s.face('baby', true, 2.8, 0.3); s.mouth('baby', 'smile', 2.8, 0.01); s.gaze('baby', 6, -2, 2.8, 0.01);
      [3.75, 5.0, 6.25].forEach(function (t) {
        s.hop('baby', 1560, 616, t, 0.42, 30);
        Film.ride(s, rideG, 0, t, 0.42, 30); Film.ride(s, horseG, 0, t, 0.42, 30);
      });

      // смена: «на голову выше самого себя»
      [p1, l1, l2, cap1, cap2].forEach(function (e) { s.out(e, 7.2, { dur: 0.5 }); });
      [div, st1, rideG, horseG].forEach(function (e) { s.out(e, 7.2, { dur: 0.5 }); });
      var q = s.text('quote', '«В игре ребёнок всегда выше своего среднего возраста, выше своего обычного повседневного поведения; он в игре как бы на голову выше самого себя»', { left: 140, top: 330, width: 860, fontSize: 42 });
      s.lines(q, 7.8, { stagger: 0.12 });
      var qc = s.text('cite', 'Л. С. Выготский, лекция 1933 года', { left: 140, top: 640 });
      s.fade(qc, 9.0, { y: 6 });

      var CX = 1380, CY = 712;
      s.actor('baby', { x: CX, y: CY, d: 130 }, 7.4, 1.0, 'power3.inOut');
      s.mouth('baby', 'soft', 7.6, 0.3); s.gaze('baby', 0, -2, 7.6, 0.3);
      var g2 = s.svg(), JX = 1600;
      s.sk(g2, [[JX, 800], [JX, 440]], { at: 8.2, dur: 0.7, seed: 161, width: 3.4, opacity: 0.55 });
      s.sk(g2, [[JX - 34, 647], [JX + 34, 647]], { at: 8.8, dur: 0.35, seed: 163, width: 3.6 });
      var m1 = s.text('note', 'обычно', { left: JX + 48, top: 630, fontSize: 22 });
      s.fade(m1, 9.0, { y: 4 });
      var ghost = s.node(g2, 'circle', { cx: CX, cy: CY - 130, r: 65, fill: 'none', stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '5 10', opacity: 0 });
      s.tween(ghost, 10.4, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' });
      s.sk(g2, [[JX - 34, 517], [JX + 34, 517]], { at: 10.9, dur: 0.35, seed: 165, width: 3.6, color: ORANGE });
      var m2 = s.text('note', 'в игре', { left: JX + 48, top: 500, fontSize: 22, color: DEEP, fontWeight: 650 });
      s.fade(m2, 11.1, { y: 4 });
      s.squash('baby', 0.96, 1.08, 10.6, 0.5, 'power2.out'); s.squash('baby', 1, 1, 11.3, 0.6, 'back.out(2)');
    }
  });

  // 0:50 — Играем в больницу: четыре уровня развития игры (Д. Б. Эльконин, 1978)
  Film.scene({
    id: 'hospital', bars: 8,
    build: function (s) {
      var k = s.text('kicker', 'Д. Б. Эльконин · «Психология игры», 1978', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Играем в больницу', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);

      // ступени 1–4
      var steps = [];
      for (var i = 0; i < 4; i++) {
        var b = s.div('num-badge', { left: 1360 + i * 100, top: 200 }, null, String(i + 1));
        s.pop(b, 0.4 + i * 0.1, { from: 0.7, dur: 0.5 });
        steps.push(b);
      }
      function lit(i, t) {
        s.tween(steps[i], t, { backgroundColor: '#FEF0DD', color: DEEP }, { backgroundColor: ORANGE, color: '#FFFFFF', duration: 0.4 });
        if (i > 0) s.tween(steps[i - 1], t, { backgroundColor: ORANGE, color: '#FFFFFF' }, { backgroundColor: '#FEF0DD', color: DEEP, duration: 0.4 });
      }
      var stepLbl = s.text('small-caps', 'уровни развития игры', { left: 1360, top: 272, width: 360 });
      s.fade(stepLbl, 0.6, { y: 6 });

      // сцена: «доктор» и «больной»
      var DXc = 800, DY = 600, PXc = 1150, PY = 636;
      var g = s.svg(), ov = s.over();
      var bed = s.node(g, 'g', { opacity: 0 });
      s.sk(bed, [[PXc - 120, PY + 62], [PXc + 140, PY + 62]], { seed: 201, width: 4 });
      s.sk(bed, [[PXc - 120, PY + 62], [PXc - 120, PY + 100]], { seed: 203, width: 4 });
      s.sk(bed, [[PXc + 140, PY + 62], [PXc + 140, PY + 100]], { seed: 205, width: 4 });
      s.tween(bed, 0.8, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      s.actor('baby', { x: DXc, y: DY, d: 118, o: 0 }, 0.6, 0.01);
      s.actor('baby', { o: 1 }, 0.7, 0.5);
      s.actor('kid2', { x: PXc, y: PY, d: 108, o: 0 }, 0.7, 0.01);
      s.actor('kid2', { o: 1 }, 0.8, 0.5);
      s.face('baby', true, 0.9, 0.3); s.mouth('baby', 'flat', 0.9, 0.01); s.gaze('baby', 0, 2, 0.9, 0.01);
      s.face('kid2', true, 0.9, 0.3); s.mouth('kid2', 'soft', 0.9, 0.01); s.gaze('kid2', 0, 2, 0.9, 0.01);
      // палочка-«шприц»
      var syr = s.node(g, 'g', {});
      s.path(syr, 'M0 0 L96 0', { stroke: STICK, 'stroke-width': 9 });
      s.set(syr, 0, { x: DXc + 50, y: DY + 10, opacity: 0 }, { x: DXc + 50, y: DY + 10, opacity: 0 });
      s.tween(syr, 1.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      function poke(t) {
        s.tween(syr, t, { x: DXc + 50 }, { x: PXc - 160, duration: 0.25, ease: 'power2.in' });
        s.tween(syr, t + 0.35, { x: PXc - 160 }, { x: DXc + 50, duration: 0.4, ease: 'power2.out' });
        s.squash('kid2', 1.08, 0.9, t + 0.25, 0.08); s.squash('kid2', 1, 1, t + 0.33, 0.3, 'back.out(3)');
      }

      var capY = 792;
      function caption(n, title, line, t0, t1) {
        var c1 = s.text('label', '<span class="acc">' + n + ' · ' + title + '</span>', { left: 140, top: capY, width: 1640, fontSize: 30 });
        var c2 = s.text('body', line, { left: 140, top: capY + 44, width: 1500, fontSize: 28 });
        s.fade(c1, t0, { y: 8 }); s.fade(c2, t0 + 0.15, { y: 8 });
        if (t1) { s.out(c1, t1, { dur: 0.35 }); s.out(c2, t1, { dur: 0.35 }); }
      }

      // 1 · Действия
      lit(0, 1.0); s.age(42, 1.0, 1.2);
      caption(1, 'Действия', '«Укол» снова и снова. Роль не названа, порядок действий не важен.', 1.1, 4.7);
      poke(1.6); poke(2.5); poke(3.4);
      // 2 · Роль названа
      lit(1, 5.0); s.age(54, 5.0, 1.2);
      caption(2, 'Роль названа', '«Я доктор!» Порядок — как в жизни; нарушат — не спорят.', 5.1, 9.7);
      cap(s, ov, DXc, DY - 60, 5.3, 61);
      var bub1 = s.div('bubble tail-l', { left: DXc - 10, top: DY - 190 }, null, 'Я доктор!');
      s.pop(bub1, 5.8, { from: 0.7, dur: 0.5, origin: '10% 100%' }); s.out(bub1, 8.4, { dur: 0.3 });
      s.mouth('baby', 'smile', 5.8, 0.2);
      poke(7.0);
      // 3 · Роль — главное
      lit(2, 10.0); s.age(66, 10.0, 1.2);
      caption(3, 'Роль — главное', 'Нарушение логики роли отвергают: «Так не бывает».', 10.1, 14.7);
      steth(s, ov, DXc, DY + 52, 10.3);
      s.actor('adult', { x: 1520, y: 560, d: 150, o: 0 }, 10.4, 0.01);
      s.actor('adult', { x: 1480, o: 1 }, 10.5, 0.7, 'power3.out');
      var bubA = s.div('bubble tail-r soft', { left: 1180, top: 330 }, null, 'Пусть больной сам себе сделает укол!');
      s.pop(bubA, 11.0, { from: 0.7, dur: 0.5, origin: '90% 100%' }); s.out(bubA, 13.2, { dur: 0.3 });
      var bub2 = s.div('bubble tail-l', { left: DXc - 10, top: DY - 190 }, null, 'Так не бывает!');
      s.pop(bub2, 12.4, { from: 0.7, dur: 0.5, origin: '10% 100%' }); s.out(bub2, 14.6, { dur: 0.3 });
      s.mouth('baby', 'flat', 12.3, 0.2); s.gaze('baby', 8, -2, 12.3, 0.3);
      // 4 · Правила и их смысл (протокол Д. Б. Эльконина: Ваня, 6 лет 6 месяцев)
      lit(3, 15.0); s.age(78, 15.0, 1.2);
      caption(4, 'Правила и их смысл', '«Так не делают. Так нельзя» — Ваня, 6 лет 6 месяцев, когда взрослый предложил сделать укол до того, как протереть спиртом.', 15.1, null);
      s.sk(ov, [[DXc + 70, DY + 30], [DXc + 72, DY - 10], [DXc + 92, DY - 14], [DXc + 94, DY + 30], [DXc + 70, DY + 30]], { at: 15.2, dur: 0.5, seed: 221, color: ORANGE }); // флакон спирта
      var bubB = s.div('bubble tail-r soft', { left: 1140, top: 330 }, null, 'Давай укол — а потом протрём!');
      s.pop(bubB, 15.6, { from: 0.7, dur: 0.5, origin: '90% 100%' }); s.out(bubB, 17.6, { dur: 0.3 });
      var bub3 = s.div('bubble tail-l', { left: DXc - 10, top: DY - 190 }, null, 'Так не делают. Так нельзя.');
      s.pop(bub3, 17.0, { from: 0.7, dur: 0.5, origin: '10% 100%' });
      s.gaze('kid2', -8, -2, 16.9, 0.3); s.mouth('kid2', 'smile', 17.4, 0.3);
      var note = s.text('note', 'Ступени, а не нормы: две фазы — 3–5 и 5–7 лет.', { left: 1360, top: 312, width: 420 });
      s.fade(note, 18.2, { y: 6 });
      s.actor('adult', { o: 0 }, 19.2, 0.4);
      s.actor('kid2', { o: 0 }, 19.3, 0.4);
    }
  });

  // 1:10 — Часовой (З. В. Мануйленко, 1948) и повторение 2004 года
  Film.scene({
    id: 'sentry', bars: 7,
    build: function (s) {
      var k = s.text('kicker', 'З. В. Мануйленко · 1948', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Часовой', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Сколько ребёнок 4–5 лет простоит неподвижно?', { left: 140, top: 330, width: 780, fontSize: 36 });
      s.lines(p1, 0.8);

      // полосы времени (41 с против 4 мин 17 с; ширина 600 px = 257 с)
      var BX = 140, BW = 600, SC = BW / 257;
      var lb1 = s.text('note', 'по просьбе взрослого', { left: BX, top: 470 });
      var b1 = s.div('', { left: BX, top: 506, width: 41 * SC, height: 26, background: '#CFC7BA', borderRadius: '13px' });
      var v1 = s.text('label', '41 с', { left: BX + 41 * SC + 16, top: 504, fontSize: 26 });
      var lb2 = s.text('note', 'в роли часового', { left: BX, top: 556, color: DEEP, fontWeight: 650 });
      var b2 = s.div('', { left: BX, top: 592, width: BW, height: 26, background: ORANGE, borderRadius: '13px' });
      var v2 = s.text('label', '4 мин 17 с', { left: BX + BW + 16, top: 590, fontSize: 26, color: DEEP });
      s.fade(lb1, 1.4, { y: 6 }); s.grow(b1, 1.6, { dur: 0.6 }); s.fade(v1, 2.1, { y: 0 });
      s.fade(lb2, 2.6, { y: 6 }); s.grow(b2, 2.8, { dur: 2.0, ease: 'power2.inOut' }); s.fade(v2, 4.6, { y: 0 });
      var term = s.text('h3 acc', '<span class="term">произвольность<span class="en">self-regulation</span></span>', { left: 140, top: 666 });
      s.fade(term, 5.0, { y: 10 });

      // ребёнок-часовой: пилотка и «ружьё»-палочка
      var CX = 1380, CY = 712;
      s.actor('baby', { x: CX, y: CY, d: 130 }, 0.0, 0.9, 'power3.inOut');
      s.mouth('baby', 'flat', 0.3, 0.3); s.gaze('baby', 0, -1, 0.3, 0.3);
      var g = s.svg(), ov = s.over();
      var rifle = s.path(g, 'M1470 790 C1468 720 1466 650 1462 584', { stroke: STICK, 'stroke-width': 11 });
      s.tween(rifle, 0.8, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.sk(ov, [[1318, 668], [1340, 640], [1380, 626], [1420, 640], [1442, 668], [1380, 676], [1318, 668]], { at: 1.0, dur: 0.7, seed: 51 });
      s.sk(ov, [[1380, 650], [1381, 651]], { at: 1.6, dur: 0.2, color: ORANGE, width: 10, seed: 53 });

      // поворот: повторение 2004 года
      [p1, term].forEach(function (e) { s.out(e, 7.0, { dur: 0.4 }); });
      var p2 = s.text('lead', 'Повторение 2004 года: разница — 20–30 секунд.', { left: 140, top: 330, width: 900, fontSize: 34 });
      s.lines(p2, 7.5);
      var cite = s.text('cite', 'Е. О. Смирнова, О. В. Гударева', { left: 140, top: 392 });
      s.fade(cite, 8.0, { y: 6 });
      // схема без абсолютных значений: полосы почти равны, разница 20–30 с (средние 2004 года в статье — только на графике)
      s.out(v1, 8.2, { dur: 0.3 }); s.out(v2, 8.2, { dur: 0.3 });
      s.tween(b1, 8.3, { width: 41 * SC }, { width: 300, duration: 1.6, ease: 'power3.inOut' });
      s.tween(b2, 8.3, { width: BW }, { width: 300 + 25 * SC, duration: 1.6, ease: 'power3.inOut' });
      var v2b = s.text('label', 'разница 20–30 с', { left: BX + 300 + 25 * SC + 16, top: 590, fontSize: 26, color: DEEP });
      s.fade(v2b, 9.9, { y: 0 });
      var sch = s.text('note', 'схема', { left: BX + 316, top: 504, fontSize: 21 });
      s.fade(sch, 9.9, { y: 0 });
      s.mouth('baby', 'soft', 8.4, 0.3);
      var p3 = s.text('body', 'Авторы объясняют: роль держит поведение, только если игра развита. А развитая ролевая игра в их выборке — лишь у 10–18 % детей.', { left: 140, top: 666, width: 820, fontSize: 30 });
      s.lines(p3, 10.0, { stagger: 0.08 });

      // вывод
      [p2, cite, p3, lb1, lb2, b1, b2, v2b, sch].forEach(function (e) { s.out(e, 12.9, { dur: 0.4 }); });
      var fin = s.text('statement', 'Помогает не роль сама по себе, а ' + s.HL('развитая игра.'), { left: 140, top: 340, width: 860, fontSize: 56 });
      s.lines(fin, 13.4);
      s.hl(fin, 14.5);
      var lil = s.text('note', 'Что игра сама вызывает развитие, доказано слабее, чем считалось (А. Лиллард и др., 2013).', { left: 140, top: 520, width: 760 });
      s.fade(lil, 15.0, { y: 6 });
      s.mouth('baby', 'smile', 14.6, 0.3);
    }
  });

  // 1:27,5 — Проверку выдерживает не всё: знаменитые опыты и что показали повторения
  Film.scene({
    id: 'checks', bars: 4,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Не только «часовой»', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Знаменитые опыты под проверкой', { left: 140, top: 186, width: 1400 });
      s.lines(h, 0.2);
      var cards = [
        ['«Зефирный тест»', 'Кто дольше ждёт сладость, тот успешнее в жизни. У. Мишел и др.', 'слабее, чем думали', 'Т. Уоттс и др., 2018', true],
        ['Ложные убеждения у младенцев', 'Понимают уже в 15 месяцев. К. Ониси, Р. Байярджон, 2005', 'не повторилось', 'Д. Кульке и др., 2018', false],
        ['«Непослушный мишка»', 'Сохранение числа — раньше, чем у Пиаже. Дж. Макгарриг, М. Дональдсон, 1974', 'повторения расходятся', 'Дж. Имс и др., 1990', true],
        ['«Эффект Бэтмена»', 'В образе героя дети упорнее. Р. Уайт и др., 2017', 'нет независимых повторений', 'одна лаборатория', true]
      ];
      cards.forEach(function (c, i) {
        var x = 140 + (i % 2) * 830, y = 330 + Math.floor(i / 2) * 250, t = 0.7 + i * 1.9;
        var card = s.div('check-card', { left: x, top: y, width: 800, height: 222 });
        Film.el('div', 't', card, c[0]);
        Film.el('div', 'c', card, c[1]);
        var st = Film.el('div', 'r', card, '<span class="stamp' + (c[4] ? ' weak' : '') + '">' + c[2] + '</span> &nbsp;' + c[3]);
        s.fade(card, t, { y: 14, dur: 0.6 });
        s.pop(st.querySelector('.stamp'), t + 0.7, { from: 1.4, dur: 0.35, ease: 'back.out(2)' });
      });
    }
  });
})();
