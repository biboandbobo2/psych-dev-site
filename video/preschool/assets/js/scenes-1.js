/* Часть 1. Как взрослые · игра (3–7 лет): социальная ситуация, два поля, «больница», часовой, проверки */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', STICK = '#8B6A45', ADULT = '#385771', MUTE = '#8A8F90';
  var I = function () { return Film.icons; }, TOY = function () { return Film.toys; };

  // точки окружности для рисованных кругов
  function circ(cx, cy, r, n, a0) {
    var p = [], k = n || 14, s0 = a0 || -1.4;
    for (var i = 0; i <= k; i++) { var a = s0 + i * 2 * Math.PI / k; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
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
  Film.circ = circ; Film.steth = steth; Film.check = check; Film.cross = cross;

  // 0:22,5 — заставка части
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      s.chapterCard(1, 'Как взрослые', 'игра · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.chapter(1, 'Как взрослые', 0.4, 79.6);
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
      I().docCap(s, ov, 1180, 284, 0.72, { at: 1.1, dur: 0.6, seed: 31 });
      I().wheel(s, ov, 1420, 398, 0.78, { at: 1.4, dur: 0.6, seed: 33 });
      I().chefHat(s, ov, 1660, 292, 0.95, { at: 1.7, dur: 0.6, seed: 85 });

      // ребёнок тянется — не достаёт
      var CX = 1420, CY = 760;
      s.actor('baby', { x: CX, y: CY, d: 108, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.6, 0.5);
      s.face('baby', true, 0.8, 0.3); s.mouth('baby', 'soft', 0.8, 0.01); s.gaze('baby', 0, -8, 0.8, 0.01);
      s.hop('baby', CX, CY, 2.41, 0.42, 70);
      s.hop('baby', CX, CY, 3.66, 0.42, 80);
      s.mouth('baby', 'flat', 4.5, 0.3);
      // палочка → руль → рисованная машина; друг запрыгивает — «поехали!»
      var st = s.path(g, 'M' + (CX + 40) + ' ' + (CY + 46) + ' L' + (CX + 92) + ' ' + (CY - 18), { stroke: STICK, 'stroke-width': 10 });
      s.tween(st, 5.0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.tween(st, 6.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.mouth('baby', 'smile', 5.6, 0.3); s.gaze('baby', 8, 0, 5.6, 0.3);
      var car = s.node(ov, 'g', {});
      var CARX = CX - 30, CARY = CY + 42;
      I().wheel(s, car, CX + 64, CY - 8, 0.62, { at: 5.6, dur: 0.5, seed: 91 });
      I().car(s, car, CARX, CARY, 0.86, { at: 6.0, dur: 0.8, seed: 93 });
      s.sk(car, [[CX + 66, CY - 4], [CX + 74, CY + 22]], { at: 6.5, dur: 0.2, seed: 94, width: 5 }); // рулевая колонка
      var FX = CX - 150;
      s.actor('kid2', { x: FX - 170, y: CY, d: 100, o: 0 }, 5.7, 0.01);
      s.actor('kid2', { o: 1 }, 5.8, 0.3);
      s.face('kid2', true, 5.8, 0.3); s.mouth('kid2', 'smile', 5.8, 0.01); s.gaze('kid2', 8, -2, 5.8, 0.01);
      s.hop('kid2', FX, CY, 6.16, 0.42, 60);
      var go = s.div('bubble tail-l', { left: CX - 30, top: CY - 200 }, null, 'Поехали!');
      s.pop(go, 6.6, { from: 0.7, dur: 0.45, origin: '10% 100%' }); s.out(go, 8.4, { dur: 0.3 });
      // едем: вперёд-назад, на кочках подбрасывает
      [[7.0, 70], [8.25, -70]].forEach(function (d) {
        s.actor('baby', { x: s.A.baby.st.x + d[1] }, d[0], 1.2, 'sine.inOut');
        s.actor('kid2', { x: s.A.kid2.st.x + d[1] }, d[0], 1.2, 'sine.inOut');
      });
      s.tween(car, 7.0, { x: 0 }, { x: 70, duration: 1.2, ease: 'sine.inOut' });
      s.tween(car, 8.25, { x: 70 }, { x: 0, duration: 1.2, ease: 'sine.inOut' });
      [7.5, 8.75].forEach(function (t) {
        s.tween(car, t, { y: 0 }, { y: -9, duration: 0.1, ease: 'power2.out' });
        s.tween(car, t + 0.1, { y: -9 }, { y: 0, duration: 0.22, ease: 'power2.in' });
        ['baby', 'kid2'].forEach(function (id) { s.squash(id, 0.94, 1.08, t, 0.1); s.squash(id, 1, 1, t + 0.1, 0.3, 'back.out(3)'); });
      });
      var spd = s.node(ov, 'g', {});
      s.sk(spd, [[CARX - 200, CARY - 30], [CARX - 290, CARY - 30]], { at: 7.2, dur: 0.25, seed: 95, width: 3, opacity: 0.55 });
      s.sk(spd, [[CARX - 190, CARY + 6], [CARX - 260, CARY + 6]], { at: 7.3, dur: 0.25, seed: 97, width: 3, opacity: 0.55 });
      s.tween(spd, 7.0, { x: 0 }, { x: 70, duration: 1.2, ease: 'sine.inOut' });
      s.out(spd, 8.2, { dur: 0.3 });
      s.actor('kid2', { o: 0 }, 9.6, 0.35);
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
      I().horse(s, horseG, 1670, 562, 0.82, { at: 2.4, dur: 1.1, seed: 5 });
      var cap2 = s.text('note', 'лошадь', { left: 1500, top: 720, width: 180, textAlign: 'center', color: DEEP, fontWeight: 650 });
      s.fade(cap2, 3.4, { y: 6 });
      s.actor('baby', { x: 1560, y: 616, d: 96, o: 0 }, 2.6, 0.01);
      s.actor('baby', { o: 1 }, 2.7, 0.5);
      s.face('baby', true, 2.8, 0.3); s.mouth('baby', 'smile', 2.8, 0.01); s.gaze('baby', 6, -2, 2.8, 0.01);
      [3.66, 4.91, 6.16].forEach(function (t) {
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

  // 0:50 — Уровни развития игры на примере «больницы» (Д. Б. Эльконин, 1978).
  // Слева — лесенка уровней (видна вся сразу, текущий подсвечен) и пояснение; справа — сценка.
  // Пациенты: 1 — мишка, 2 — зайка, 3 — другой ребёнок (роли распределяют), 4 — снова мишка.
  Film.scene({
    id: 'hospital', bars: 10,
    build: function (s) {
      var k = s.text('kicker', 'Д. Б. Эльконин, 1978 · на примере игры в больницу', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Уровни развития игры', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);

      var names = ['Действия с предметами', 'Роль названа', 'Роль ведёт игру', 'Правила и отношения'];
      var badges = [], labels = [];
      names.forEach(function (n, i) {
        var y = 318 + i * 80;
        var b = s.div('num-badge', { left: 140, top: y }, null, String(i + 1));
        var l = s.text('label', n, { left: 214, top: y + 11, fontSize: 30, color: MUTE });
        s.fade(b, 0.6 + i * 0.12, { y: 6, dur: 0.5 }); s.fade(l, 0.66 + i * 0.12, { y: 6, dur: 0.5 });
        badges.push(b); labels.push(l);
      });
      function lit(i, t) {
        s.tween(badges[i], t, { backgroundColor: '#FEF0DD', color: DEEP }, { backgroundColor: ORANGE, color: '#FFFFFF', duration: 0.4 });
        s.tween(labels[i], t, { color: MUTE }, { color: INK, duration: 0.4 });
        if (i > 0) s.tween(badges[i - 1], t, { backgroundColor: ORANGE, color: '#FFFFFF' }, { backgroundColor: '#FEF0DD', color: DEEP, duration: 0.4 });
      }
      function explain(html, t0, t1) {
        var e = s.text('body', html, { left: 140, top: 660, width: 800, fontSize: 28 });
        s.lines(e, t0, { stagger: 0.07 });
        if (t1) s.out(e, t1, { dur: 0.35 });
        return e;
      }
      function say(html, x, y, t0, t1, right) {
        var b = s.div('bubble ' + (right ? 'tail-r' : 'tail-l'), { left: x, top: y }, null, html);
        s.pop(b, t0, { from: 0.7, dur: 0.45, origin: right ? '90% 100%' : '10% 100%' });
        if (t1) s.out(b, t1, { dur: 0.3 });
        return b;
      }
      function toyIn(e, t) { s.tween(e, t, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }); }
      function toyOut(e, t) { s.tween(e, t, { x: 0, opacity: 1 }, { x: 140, opacity: 0, duration: 0.45, ease: 'power2.in' }); }

      // сцена: «доктор», кровать, «пациент»
      var DX = 1180, DY = 620, PX = 1530, PY = 650, BED = 702;
      var g = s.svg(), ov = s.over();
      var bed = s.node(g, 'g', { opacity: 0 });
      s.sk(bed, [[PX - 130, BED], [PX + 160, BED]], { seed: 201, width: 4 });
      s.sk(bed, [[PX - 130, BED], [PX - 130, BED + 46]], { seed: 203, width: 4 });
      s.sk(bed, [[PX + 160, BED], [PX + 160, BED + 46]], { seed: 205, width: 4 });
      s.sk(bed, [[PX + 160, BED], [PX + 160, BED - 60]], { seed: 207, width: 4 });
      s.sk(bed, [[PX + 100, BED - 4], [PX + 104, BED - 28], [PX + 150, BED - 30], [PX + 152, BED - 4]], { seed: 209, width: 3.4, fill: '#FFFDF8' });
      s.tween(bed, 0.6, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      var bear = s.node(g, 'g', {}), bear2 = s.node(g, 'g', {}), bunny = s.node(g, 'g', {});
      TOY().bear(s, bear, PX - 10, BED - 2, 0.74);
      TOY().bear(s, bear2, PX - 10, BED - 2, 0.74);
      TOY().bunny(s, bunny, PX - 10, BED - 2, 0.7);
      toyIn(bear, 0.9);
      s.actor('baby', { x: DX, y: DY, d: 118 }, 0.0, 0.9, 'power3.inOut');
      s.face('baby', true, 0.3, 0.3); s.mouth('baby', 'flat', 0.3, 0.3); s.gaze('baby', 8, 2, 0.3, 0.3);
      // палочка-«шприц»
      var syr = s.node(g, 'g', {});
      s.path(syr, 'M0 0 L96 0', { stroke: STICK, 'stroke-width': 9 });
      s.set(syr, 0, { x: DX + 50, y: DY + 26, opacity: 0 }, { x: DX + 50, y: DY + 26, opacity: 0 });
      s.tween(syr, 1.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      function bump(e, t) {
        s.tween(e, t, { scaleY: 1 }, { scaleY: 0.9, duration: 0.08, transformOrigin: '50% 100%' });
        s.tween(e, t + 0.08, { scaleY: 0.9 }, { scaleY: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 100%' });
      }
      function poke(t, toy) { // t — касание
        s.tween(syr, t - 0.25, { x: DX + 50 }, { x: PX - 150, duration: 0.25, ease: 'power2.in' });
        s.tween(syr, t + 0.1, { x: PX - 150 }, { x: DX + 50, duration: 0.4, ease: 'power2.out' });
        bump(toy, t);
      }

      // 1 · Действия с предметами: «укол» мишке снова и снова
      lit(0, 2.5); s.age(42, 2.5, 1.2);
      explain('Главное — действие с предметом: «укол» снова и снова. Роли нет, порядок действий не важен.', 2.7, 7.2);
      poke(3.75, bear); poke(5.0, bear); poke(6.25, bear);
      s.mouth('baby', 'soft', 3.8, 0.2);

      // 2 · Роль названа: «Я доктор!»; сначала послушать, потом укол (пациент — другая игрушка)
      lit(1, 7.5); s.age(54, 7.5, 1.2);
      explain('Ребёнок называет роль: «Я доктор!» Действует как в жизни: сначала послушать, потом укол.', 7.7, 12.2);
      toyOut(bear, 7.4); toyIn(bunny, 7.7);
      var dc = s.node(ov, 'g', {});
      I().docCap(s, dc, DX, DY - 54, 0.86, { at: 7.9, dur: 0.6, seed: 211 });
      say('Я доктор!', DX - 70, DY - 210, 8.1, 9.3);
      s.mouth('baby', 'smile', 8.1, 0.2);
      s.hop('baby', PX - 150, DY, 9.41, 0.42, 30); Film.ride(s, dc, PX - 150 - DX, 9.41, 0.42, 30);
      s.tween(syr, 9.4, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      var lis = s.node(ov, 'g', {});
      s.sk(lis, [[PX - 150 + 40, DY - 26], [PX - 80, DY - 40], [PX - 60, PY]], { at: 9.95, dur: 0.35, seed: 213, width: 3.6 });
      s.sk(lis, circ(PX - 54, PY + 4, 9, 10), { at: 10.25, dur: 0.2, seed: 215, color: ORANGE });
      s.out(lis, 10.8, { dur: 0.25 });
      s.hop('baby', DX, DY, 10.91, 0.42, 30); Film.ride(s, dc, DX - (PX - 150), 10.91, 0.42, 30);
      s.tween(syr, 11.4, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      poke(11.85, bunny);

      // 3 · Роль ведёт игру: роли — заранее, ролевая речь, «так не бывает» (пациент — другой ребёнок)
      lit(2, 12.5); s.age(66, 12.5, 1.2);
      explain('Роли распределяют заранее и говорят «как врач». Нелогичное отвергают: «Так не бывает!»', 12.7, 17.2);
      toyOut(bunny, 12.4);
      s.actor('kid2', { x: PX + 220, y: PY, d: 100, o: 0 }, 12.5, 0.01);
      s.actor('kid2', { o: 1 }, 12.55, 0.25);
      s.face('kid2', true, 12.55, 0.3); s.mouth('kid2', 'soft', 12.55, 0.01); s.gaze('kid2', -8, 0, 12.55, 0.01);
      s.hop('kid2', PX, PY, 12.61, 0.42, 50);
      steth(s, ov, DX, DY + 52, 12.6);
      say('Чур, я врач, а ты больной!', DX - 70, DY - 210, 12.9, 14.0);
      say('Дышите! Не дышите!', DX - 70, DY - 210, 14.1, 15.0);
      s.squash('kid2', 1.06, 0.94, 14.3, 0.2); s.squash('kid2', 1, 1, 14.5, 0.3, 'back.out(3)');
      say('А я сам себе укол сделаю!', 1110, 470, 15.2, 16.2, true);
      s.mouth('kid2', 'smile', 15.2, 0.2);
      say('Так не бывает!', DX - 70, DY - 210, 16.3, 17.4);
      s.mouth('baby', 'flat', 16.2, 0.2); s.gaze('baby', 8, -4, 16.2, 0.3);

      // 4 · Правила и отношения: снова мишка, медсестра и младший; смысл правила (протокол Д. Б. Эльконина)
      lit(3, 17.5); s.age(78, 17.5, 1.2);
      explain('Роли связаны, у игры — правила, и ребёнок понимает их смысл: «Так не делают. Так нельзя» — Ваня, 6 лет 6 месяцев.', 17.7, 22.3);
      s.hop('kid2', PX + 230, PY, 17.41, 0.42, 40);
      s.actor('kid2', { o: 0 }, 17.8, 0.3);
      toyIn(bear2, 17.7);
      var NX = 1350, NY = 772;
      s.actor('kid3', { x: NX + 140, y: NY, d: 90, o: 0 }, 17.6, 0.01);
      s.actor('kid3', { o: 1 }, 17.7, 0.3);
      s.face('kid3', true, 17.7, 0.3); s.mouth('kid3', 'smile', 17.7, 0.01); s.gaze('kid3', 8, -4, 17.7, 0.01);
      s.hop('kid3', NX, NY, 17.75, 0.4, 40);
      var nc = s.node(ov, 'g', {});
      I().docCap(s, nc, NX, NY - 42, 0.66, { at: 17.9, dur: 0.5, seed: 221 });
      var alc = s.node(ov, 'g', {});
      s.sk(alc, [[NX + 46, NY - 4], [NX + 47, NY - 40], [NX + 66, NY - 42], [NX + 67, NY - 4], [NX + 46, NY - 4]], { at: 18.1, dur: 0.4, seed: 223, color: ORANGE, fill: '#FFFDF8' });
      s.sk(alc, [[NX + 52, NY - 42], [NX + 54, NY - 54], [NX + 60, NY - 54], [NX + 61, NY - 42]], { at: 18.4, dur: 0.2, seed: 225, color: ORANGE });
      // младший — пришёл с мишкой
      var YX = 1752, YY = 664;
      s.color('stranger', '#F2A48C', 17.5, 0.01);
      s.actor('stranger', { x: YX + 120, y: YY, d: 72, o: 0 }, 17.9, 0.01);
      s.actor('stranger', { o: 1 }, 17.95, 0.25);
      s.face('stranger', true, 17.95, 0.3); s.mouth('stranger', 'smile', 17.95, 0.01); s.gaze('stranger', -8, 2, 17.95, 0.01);
      s.hop('stranger', YX, YY, 18.0, 0.36, 36);
      var yl = s.otext('note', 'младший', { left: YX - 70, top: YY + 42, width: 140, textAlign: 'center', fontSize: 21 });
      s.fade(yl, 18.4, { y: 4 });
      s.hop('kid3', PX - 90, NY - 10, 18.51, 0.36, 30); Film.ride(s, nc, PX - 90 - NX, 18.51, 0.36, 30); Film.ride(s, alc, PX - 90 - NX, 18.51, 0.36, 30);
      bump(bear2, 18.95);
      s.hop('kid3', NX, NY, 19.21, 0.36, 30); Film.ride(s, nc, NX - (PX - 90), 19.21, 0.36, 30); Film.ride(s, alc, NX - (PX - 90), 19.21, 0.36, 30);
      say('Давай укол, а потом протрём!', 1300, 470, 19.6, 20.8, true);
      say('Так не делают. Так нельзя.', DX - 70, DY - 210, 21.0, null);
      s.gaze('stranger', -9, -2, 20.9, 0.3); s.mouth('kid3', 'smile', 21.4, 0.3);
      var note = s.text('note', 'Уровни 1–2 — у младших дошкольников (3–5 лет), 3–4 — у старших (5–7 лет). Ступени, а не нормы.', { left: 140, top: 660, width: 800 });
      s.fade(note, 22.6, { y: 6 });
      s.actor('kid3', { o: 0 }, 24.0, 0.4); s.actor('stranger', { o: 0 }, 24.0, 0.4);
    }
  });

  // 1:15 — Часовой (З. В. Мануйленко, 1948): одному — по просьбе; в игре — на посту; повторение 2004 года
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
      s.fade(lb1, 1.4, { y: 6 }); s.grow(b1, 1.6, { dur: 0.6 }); s.fade(v1, 2.2, { y: 0 });
      s.fade(lb2, 4.6, { y: 6 }); s.grow(b2, 6.0, { dur: 2.0, ease: 'power2.inOut' }); s.fade(v2, 8.0, { y: 0 });
      var term = s.text('h3 acc', '<span class="term">произвольность<span class="en">self-regulation</span></span>', { left: 140, top: 666 });
      s.fade(term, 8.4, { y: 10 });

      var g = s.svg(), ov = s.over();
      var CX = 1300, CY = 720;
      s.actor('baby', { x: CX, y: CY, d: 120 }, 0.0, 0.9, 'power3.inOut');
      s.mouth('baby', 'flat', 0.3, 0.3); s.gaze('baby', 6, -2, 0.3, 0.3);
      // 1) одному, по просьбе взрослого: быстро начинает вертеться и уходит
      s.actor('adult', { x: 1760, y: 560, d: 130, o: 0 }, 0.6, 0.01);
      s.actor('adult', { x: 1680, o: 1 }, 0.7, 0.6, 'power3.out');
      var ask = s.div('bubble tail-r soft', { left: 1250, top: 380 }, null, 'Постой и не шевелись!');
      s.pop(ask, 1.0, { from: 0.7, dur: 0.45, origin: '90% 100%' }); s.out(ask, 2.5, { dur: 0.3 });
      s.gaze('baby', -9, 0, 2.3, 0.25); s.gaze('baby', 9, -3, 2.7, 0.25);
      s.squash('baby', 1.08, 0.92, 2.95, 0.12); s.squash('baby', 0.94, 1.06, 3.07, 0.12); s.squash('baby', 1, 1, 3.19, 0.3, 'back.out(3)');
      s.hop('baby', CX - 70, CY, 3.41, 0.36, 22);
      s.gaze('baby', -10, -4, 3.7, 0.2);
      s.hop('baby', CX - 140, CY, 3.91, 0.36, 22);
      s.actor('adult', { x: 1760, o: 0 }, 4.2, 0.5, 'power2.in');
      s.actor('baby', { x: CX }, 4.4, 0.6, 'power2.inOut');
      s.gaze('baby', 6, -2, 4.5, 0.3);

      // 2) в игре: «рабочие» собирают мозаику, часовой заступает на пост
      var W = [[1560, 690], [1720, 690]];
      s.actor('kid2', { x: W[0][0], y: W[0][1], d: 92, o: 0 }, 4.5, 0.01); s.actor('kid2', { o: 1 }, 4.6, 0.4);
      s.actor('kid3', { x: W[1][0], y: W[1][1], d: 92, o: 0 }, 4.5, 0.01); s.actor('kid3', { o: 1 }, 4.7, 0.4);
      s.face('kid2', true, 4.6, 0.3); s.mouth('kid2', 'smile', 4.6, 0.01); s.gaze('kid2', 0, 8, 4.6, 0.01);
      s.face('kid3', true, 4.7, 0.3); s.mouth('kid3', 'smile', 4.7, 0.01); s.gaze('kid3', 0, 8, 4.7, 0.01);
      var board = s.node(ov, 'g', {});
      s.node(board, 'rect', { x: 1490, y: 728, width: 300, height: 74, rx: 10, fill: '#E9D9C2', stroke: '#A77A12', 'stroke-width': 3 });
      s.tween(board, 4.6, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
      var cols = [ORANGE, '#4A7FB0', '#E4735A', '#E0A930', '#5E9E5E'];
      for (var i = 0; i < 26; i++) {
        var tx = 1504 + (i % 13) * 21.5, ty = 740 + Math.floor(i / 13) * 24;
        var tile = s.node(board, 'rect', { x: tx, y: ty, width: 16, height: 18, rx: 3, fill: cols[(i * 3) % 5], opacity: 0 });
        var tt = 5.1 + i * 0.27;
        s.tween(tile, tt, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
        if (i % 3 === 0) { var id = (i % 2) ? 'kid3' : 'kid2'; s.squash(id, 1.05, 0.95, tt, 0.1); s.squash(id, 1, 1, tt + 0.1, 0.25, 'back.out(3)'); }
      }
      var wl = s.otext('note', '«рабочие»', { left: 1560, top: 812, width: 160, textAlign: 'center', fontSize: 22 });
      s.fade(wl, 5.0, { y: 4 });
      // пилотка и «ружьё»-палочка; шаг на каждую долю, потом — стоит
      var pil = s.node(ov, 'g', {}), rif = s.node(g, 'g', {});
      I().pilotka(s, pil, CX, CY - 56, 0.86, { at: 4.7, dur: 0.5, seed: 51 });
      s.path(rif, 'M' + (CX + 74) + ' ' + (CY + 70) + ' L' + (CX + 68) + ' ' + (CY - 110), { stroke: STICK, 'stroke-width': 10 });
      s.tween(rif, 4.9, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var sl = s.otext('note', 'часовой', { left: CX - 80, top: CY + 84, width: 160, textAlign: 'center', fontSize: 22, color: DEEP, fontWeight: 650 });
      s.fade(sl, 5.0, { y: 4 });
      var pos = 0;
      function step(dx, t) { // шаг: подъём и опускание на четверть доли
        var a = s.A.baby.st.x;
        s.actor('baby', { x: a + dx / 2, y: CY - 14 }, t, 0.15, 'power2.out');
        s.actor('baby', { x: a + dx, y: CY }, t + 0.15, 0.15, 'power2.in');
        [pil, rif, sl].forEach(function (e) {
          s.tween(e, t, { x: pos, y: 0 }, { x: pos + dx / 2, y: -14, duration: 0.15, ease: 'power2.out' });
          s.tween(e, t + 0.15, { x: pos + dx / 2, y: -14 }, { x: pos + dx, y: 0, duration: 0.15, ease: 'power2.in' });
        });
        pos += dx;
      }
      s.gaze('baby', -8, 0, 4.95, 0.2);
      step(-60, 5.0); step(-60, 5.625); s.gaze('baby', 8, 0, 6.15, 0.2); step(60, 6.25); step(60, 6.875);
      s.gaze('baby', 0, -2, 7.4, 0.3); s.mouth('baby', 'flat', 7.4, 0.2);
      // звонок — конец смены
      var bell = s.node(ov, 'g', {});
      I().bell(s, bell, 1640, 560, 0.72, { at: 8.8, dur: 0.4, seed: 57 });
      [9.3, 9.5, 9.7].forEach(function (t, j) { s.tween(bell, t, { rotation: j % 2 ? 12 : -12 }, { rotation: j % 2 ? -12 : 12, duration: 0.2, svgOrigin: '1640 530' }); });
      s.tween(bell, 9.9, { rotation: -12 }, { rotation: 0, duration: 0.2, svgOrigin: '1640 530' });
      ['kid2', 'kid3'].forEach(function (id) { s.squash(id, 0.92, 1.1, 9.2, 0.15); s.squash(id, 1, 1, 9.35, 0.4, 'back.out(3)'); });

      // поворот: повторение 2004 года — и в роли не стоят
      [p1, term].forEach(function (e) { s.out(e, 9.8, { dur: 0.4 }); });
      var p2 = s.text('lead', 'Повторение 2004 года: разница — 20–30 секунд.', { left: 140, top: 330, width: 900, fontSize: 34 });
      s.lines(p2, 10.0);
      var cite = s.text('cite', 'Е. О. Смирнова, О. В. Гударева', { left: 140, top: 392 });
      s.fade(cite, 10.5, { y: 6 });
      // схема без абсолютных значений: полосы почти равны (средние 2004 года в статье — только на графике)
      s.out(v1, 10.5, { dur: 0.3 }); s.out(v2, 10.5, { dur: 0.3 });
      s.tween(b1, 10.6, { width: 41 * SC }, { width: 300, duration: 1.6, ease: 'power3.inOut' });
      s.tween(b2, 10.6, { width: BW }, { width: 300 + 25 * SC, duration: 1.6, ease: 'power3.inOut' });
      var v2b = s.text('label', 'разница 20–30 с', { left: BX + 300 + 25 * SC + 16, top: 590, fontSize: 26, color: DEEP });
      s.fade(v2b, 12.2, { y: 0 });
      var sch = s.text('note', 'схема', { left: BX + 316, top: 504, fontSize: 21 });
      s.fade(sch, 12.2, { y: 0 });
      s.gaze('baby', -9, -2, 11.0, 0.25); s.gaze('baby', 9, -5, 11.45, 0.25); s.mouth('baby', 'soft', 11.0, 0.2);
      s.squash('baby', 1.07, 0.93, 11.9, 0.12); s.squash('baby', 1, 1, 12.02, 0.3, 'back.out(3)');
      var p3 = s.text('body', 'Авторы объясняют: роль держит поведение, только если игра развита. А развитая ролевая игра в их выборке — лишь у 10–18 % детей.', { left: 140, top: 666, width: 820, fontSize: 30 });
      s.lines(p3, 12.0, { stagger: 0.08 });

      // вывод
      [p2, cite, p3, lb1, lb2, b1, b2, v2b, sch].forEach(function (e) { s.out(e, 13.3, { dur: 0.4 }); });
      var fin = s.text('statement', 'Помогает не роль сама по себе, а ' + s.HL('развитая игра.'), { left: 140, top: 340, width: 860, fontSize: 56 });
      s.lines(fin, 13.75);
      s.hl(fin, 14.9);
      var lil = s.text('note', 'Что игра сама вызывает развитие, доказано слабее, чем считалось (А. Лиллард и др., 2013).', { left: 140, top: 520, width: 760 });
      s.fade(lil, 15.4, { y: 6 });
      s.gaze('baby', 0, -2, 14.6, 0.3); s.mouth('baby', 'smile', 14.6, 0.3);
      s.actor('kid2', { o: 0 }, 16.8, 0.4); s.actor('kid3', { o: 0 }, 16.8, 0.4);
    }
  });

  // 1:32,5 — Проверку выдерживает не всё: знаменитые опыты и что показали повторения
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
