/* Глава 2. Думать по правилам · мышление: тот же стакан (Пиаже), числовая прямая (Сиглер), Архимед и брат (Выготский), медведи (Лурия) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', WATER = '#9CC3D5', WATER_D = '#5E93AC';

  // 1:17,5 — заставка главы (23 такта = 57,5 с)
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      s.chapterCard(2, 'Думать по правилам', 'мышление');
      K().ruled(s, s.svg(), 336, 476, 1100, 476, { at: 0.5, dur: 0.9, width: 4 });
      s.chapter(2, 'Думать по правилам', 0.4, 56.9);
    }
  });

  // 1:20 — Тот же стакан: в 3–7 ответ был «в высоком», теперь вопрос кажется глупым — три довода (Ж. Пиаже)
  Film.scene({
    id: 'glass', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Ж. Пиаже · тот же опыт, что в 3–7', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var g = s.svg(), BASE = 820;
      var A = K().glass(s, g, 420, BASE, 110, 170, 110), C = K().glass(s, g, 780, BASE, 56, 330, 0);
      // стакан B: система координат с началом в крае слива, вращение вокруг него (как в 3–7)
      function TR(p, a) { return 'translate(' + p[0] + ' ' + p[1] + ') rotate(' + a + ')'; }
      var LIP0 = [655, 650], LIP1 = [767, 335], WTOP = BASE - 110;
      var defs = s.node(g, 'defs', {}), clip = s.node(defs, 'clipPath', { id: 'pour-7', clipPathUnits: 'userSpaceOnUse' });
      var cr = s.node(clip, 'rect', { x: -108, y: 0, width: 106, height: 168, transform: TR(LIP0, 0) });
      var wB = s.node(g, 'rect', { x: 300, y: WTOP, width: 900, height: 700, fill: WATER, 'clip-path': 'url(#pour-7)' });
      var gB = s.node(g, 'g', { transform: TR(LIP0, 0) });
      s.path(gB, 'M-110 0 V170 H0 V0', { stroke: INK, 'stroke-width': 3.5 });
      function moveB(t, p0, a0, p1, a1, dur, ease) {
        [cr, gB].forEach(function (e) { s.tween(e, t, { attr: { transform: TR(p0, a0) } }, { attr: { transform: TR(p1, a1) }, duration: dur, ease: ease }); });
      }
      s.tween([A.g, C.g], 0.4, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.2 });
      s.tween([gB, wB], 0.5, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      var dy = LIP1[1] - LIP0[1];
      moveB(1.2, LIP0, 0, LIP1, 0, 0.6, 'power2.inOut');
      s.tween(wB, 1.2, { attr: { y: WTOP } }, { attr: { y: WTOP + dy }, duration: 0.6, ease: 'power2.inOut' });
      moveB(1.8, LIP1, 0, LIP1, 48, 0.7, 'power1.in');
      s.tween(wB, 1.8, { attr: { y: WTOP + dy } }, { attr: { y: LIP1[1] }, duration: 0.7, ease: 'power1.in' });
      moveB(2.5, LIP1, 48, LIP1, 95, 1.0, 'sine.inOut');
      s.set(wB, 3.5, { attr: { y: LIP1[1] } }, { attr: { y: 2000 } });
      K().setLevel(s, C, 2.5, 0, 234, 0.9, 'sine.inOut');
      var stream = s.node(g, 'rect', { x: LIP1[0] - 3, y: LIP1[1] + 2, width: 7, height: 0, rx: 3.5, fill: WATER_D, opacity: 0 });
      s.tween(stream, 2.5, { opacity: 0 }, { opacity: 0.9, duration: 0.08 });
      s.tween(stream, 2.5, { attr: { height: 0 } }, { attr: { height: BASE - LIP1[1] - 2 }, duration: 0.12, ease: 'power2.in' });
      s.tween(stream, 2.62, { attr: { height: BASE - LIP1[1] - 2 } }, { attr: { height: BASE - 234 - LIP1[1] - 2 }, duration: 0.78, ease: 'sine.inOut' });
      s.tween(stream, 3.35, { opacity: 0.9 }, { opacity: 0, duration: 0.15 });
      moveB(3.6, LIP1, 95, LIP1, 0, 0.4, 'power2.inOut');
      moveB(4.0, LIP1, 0, LIP0, 0, 0.5, 'power2.inOut');
      var q = s.text('statement', 'А теперь?', { left: 140, top: 230 });
      s.lines(q, 3.9);
      // трое одноклассников отвечают — устало, вопрос кажется им глупым
      var KIDS = [['baby', 1240], ['kid2', 1460], ['kid3', 1680]];
      KIDS.forEach(function (kd, i) {
        s.actor(kd[0], { x: kd[1], y: 820, d: 104, o: 0 }, 0, 0.01);
        s.actor(kd[0], { o: 1 }, 0.5 + i * 0.15, 0.4);
        s.face(kd[0], true, 0.6, 0.3); s.mouth(kd[0], 'soft', 0.6, 0.01); s.gaze(kd[0], -9, 0, 0.6, 0.01);
        s.mouth(kd[0], 'flat', 4.6 + i * 1.25, 0.2); s.gaze(kd[0], 0, -9, 4.6 + i * 1.25, 0.3); // закатили глаза
      });
      K().say(s, 'Та же вода!', 1200, 650, 5.0);
      K().say(s, 'Можно перелить обратно!', 1420, 540, 6.25);
      K().say(s, 'Он выше, зато уже.', 1400, 430, 7.5, null, 'r');
      var t = s.text('h3', '<span class="term acc">Конкретные операции<span class="en">concrete operations</span></span>', { left: 140, top: 330 });
      s.fade(t, 9.2, { y: 10 });
      var src = s.text('cite', 'Три довода — тождество, обратимость, компенсация (Ж. Пиаже, Б. Инельдер, 1966). Реплики — постановка.', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 9.8, { y: 4 });
      ['baby', 'kid2', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, 12.0, 0.4); });
    }
  });

  // 1:32,5 — Куда поставить 150? (Дж. Опфер, Р. Сиглер, 2007; Р. Сиглер, Дж. Опфер, 2003)
  Film.scene({
    id: 'line', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over(), X0 = 300, X1 = 1620, Y = 600;
      var k = s.text('kicker', 'Числовая прямая · Дж. Опфер, Р. Сиглер, 2007', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var q = s.text('h2', 'Куда поставить 150?', { left: 140, top: 186 });
      s.lines(q, 0.3);
      K().ruled(s, g, X0, Y, X1, Y, { at: 0.5, dur: 1.0, width: 5 });
      [[X0, '0'], [X1, '1000']].forEach(function (p, i) {
        K().ruled(s, g, p[0], Y - 22, p[0], Y + 22, { at: 1.4 + i * 0.1, dur: 0.2, width: 5 });
        var lb = s.text('lead', p[1], { left: p[0] - 60, top: Y + 40, width: 120, textAlign: 'center' });
        s.fade(lb, 1.5 + i * 0.1, { y: 6 });
      });
      s.freeze(2.1, 2.2);
      var gu = s.text('small-caps', 'Угадайте', { left: 140, top: 290 });
      s.fade(gu, 2.2, { y: 0, dur: 0.2 }); s.out(gu, 4.05, { dur: 0.2 });
      var MX = X0 + (X1 - X0) * 0.47;
      s.actor('baby', { x: MX - 170, y: Y - 160, d: 90, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 4.3, 0.3);
      s.face('baby', true, 4.3, 0.2); s.mouth('baby', 'smile', 4.3, 0.01); s.gaze('baby', 10, 8, 4.3, 0.01);
      s.squash('baby', 1.05, 0.95, 4.8, 0.2); s.squash('baby', 1, 1, 5.0, 0.15); // прицелился
      K().ruled(s, ov, MX, Y - 34, MX, Y + 34, { at: 5.1, dur: 0.18, width: 6 });
      var me = s.text('kidhand', '150 — тут!', { left: MX - 40, top: Y - 110 });
      s.fade(me, 5.3, { y: 6 });
      var RX = X0 + (X1 - X0) * 0.15;
      K().ruled(s, ov, RX, Y - 34, RX, Y + 34, { at: 6.6, dur: 0.18, width: 6, color: K().RED });
      var rt = s.text('cursive red', 'здесь', { left: RX - 44, top: Y + 40, fontSize: 46 });
      s.fade(rt, 6.8, { y: 6 });
      var t2 = s.text('lead', 'Во втором классе маленькие числа растянуты, большие сжаты.', { left: 140, top: 800, width: 1500, fontSize: 36 });
      s.lines(t2, 7.6);
      var src = s.text('cite', 'Логарифмически ставят 91 % второклассников и 3 % взрослых (2003). Явление повторяется, объясняют его по-разному (Х. Барт, А. Паладино, 2011).', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 8.6, { y: 4 });
      s.actor('baby', { o: 0 }, 12.0, 0.4);
    }
  });

  // 1:45 — Закон Архимеда и брат (Л. С. Выготский, 1934, с. 200 т. 2 СС)
  Film.scene({
    id: 'archimedes', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var school = s.node(g, 'g', {});
      K().board(s, school, 980, 300, 760, 360, { at: 0.2 });
      var boat = s.path(school, 'M1180 520 L1520 520 L1470 580 L1230 580 Z M1230 520 L1360 430 L1360 520', { stroke: '#F3EFE4', 'stroke-width': 4 });
      s.draw(boat, 0.7, { dur: 0.8 });
      var arr = s.path(school, 'M1350 640 V560 M1330 582 L1350 560 L1370 582', { stroke: '#F3EFE4', 'stroke-width': 4 });
      s.draw(arr, 1.4, { dur: 0.4 });
      s.actor('baby', { x: 860, y: 800, d: 104, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.3, 0.4);
      s.face('baby', true, 0.4, 0.2); s.mouth('baby', 'smile', 0.4, 0.01); s.gaze('baby', 8, -6, 0.4, 0.01);
      s.actor('adult2', { x: 1820, y: 760, d: 150, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 0.5, 0.4);
      K().say(s, 'Закон Архимеда!', 740, 600, 1.4, 3.6);
      s.squash('adult2', 1, 0.92, 2.4, 0.15); s.squash('adult2', 1, 1, 2.55, 0.25); // учитель кивает
      // дома — житейское понятие
      var sw = K().flip(s, 3.6);
      s.set(school, sw, { opacity: 1 }, { opacity: 0 });
      s.actor('adult2', { o: 0 }, sw, 0.01);
      var home = s.node(g, 'g', { opacity: 0 });
      s.set(home, sw, { opacity: 0 }, { opacity: 1 });
      // стол с тарелками
      s.node(home, 'rect', { x: 560, y: 830, width: 800, height: 26, rx: 4, fill: '#B48A62', stroke: INK, 'stroke-width': 2.5 });
      [600, 1300].forEach(function (x) { s.node(home, 'rect', { x: x, y: 856, width: 20, height: 140, fill: '#9C7550', stroke: INK, 'stroke-width': 2.5 }); });
      [760, 1010, 1250].forEach(function (x) { s.node(home, 'ellipse', { cx: x, cy: 826, rx: 46, ry: 9, fill: '#FFFDF8', stroke: INK, 'stroke-width': 2.5 }); });
      s.actor('baby', { x: 760, y: 760 }, sw, 0.01);
      s.actor('adult', { x: 1250, y: 730, d: 150, o: 0 }, 0, 0.01); s.actor('adult', { o: 1 }, sw, 0.01);
      s.actor('kid3', { x: 1010, y: 780, d: 64, o: 0 }, 0, 0.01); s.actor('kid3', { o: 1 }, sw, 0.01);
      s.face('kid3', true, sw, 0.01); s.mouth('kid3', 'smile', sw, 0.01);
      K().say(s, 'А что такое брат?', 990, 560, 4.4, null, 'r');
      s.mouth('baby', 'flat', 5.0, 0.2); s.gaze('baby', 0, -9, 5.0, 0.3); // думает
      s.gaze('baby', 9, 3, 6.0, 0.25); s.mouth('baby', 'smile', 6.0, 0.2);
      K().say(s, 'Брат — это Петя!', 560, 560, 6.3);
      s.hop('kid3', 1010, 780, 7.0, 0.36, 26); // младший машет ложкой
      var spoon = s.path(ov, 'M1040 740 L1072 704', { stroke: '#8A8F90', 'stroke-width': 6 });
      s.tween(spoon, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      var qt = s.text('quote', '«Ребёнок лучше формулирует, что такое закон Архимеда, чем что такое брат»', { left: 140, top: 150, width: 1640, fontSize: 46 });
      s.lines(qt, 7.9, { stagger: 0.12 });
      var src = s.text('cite', 'Л. С. Выготский, «Мышление и речь», 1934 · научные понятия · scientific concepts · реплика «Брат — это Петя!» — постановка', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 9.0, { y: 4 });
      ['baby', 'adult', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, 12.0, 0.4); });
      s.out(spoon, 12.0, { dur: 0.4 });
    }
  });

  // 1:57,5 — Какого цвета медведи? (А. Р. Лурия, 1931–32; С. Скрибнер, М. Коул, 1981)
  Film.scene({
    id: 'bears', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'А. Р. Лурия · Узбекистан, 1931–32', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var task = s.text('lead', 'Где снег — медведи белые. На Новой Земле снег. Какие там медведи?', { left: 140, top: 200, width: 1500, fontSize: 40 });
      s.lines(task, 0.5);
      // задача рисуется ручкой: снежинки, медведь-контур
      [[1180, 420], [1260, 470], [1540, 430], [1620, 480]].forEach(function (p, i) {
        var f = s.path(ov, 'M' + (p[0] - 12) + ' ' + p[1] + ' H' + (p[0] + 12) + ' M' + p[0] + ' ' + (p[1] - 12) + ' V' + (p[1] + 12) + ' M' + (p[0] - 9) + ' ' + (p[1] - 9) + ' L' + (p[0] + 9) + ' ' + (p[1] + 9) + ' M' + (p[0] + 9) + ' ' + (p[1] - 9) + ' L' + (p[0] - 9) + ' ' + (p[1] + 9), { stroke: K().DEEP, 'stroke-width': 3 });
        s.draw(f, 1.6 + i * 0.12, { dur: 0.3 });
      });
      var bear = s.node(ov, 'g', {}), BX = 1400, BY = 600, parts = [];
      parts.push(s.node(bear, 'ellipse', { cx: BX, cy: BY, rx: 120, ry: 66 }));
      parts.push(s.node(bear, 'circle', { cx: BX + 128, cy: BY - 30, r: 44 }));
      parts.push(s.node(bear, 'circle', { cx: BX + 112, cy: BY - 70, r: 14 }));
      [-80, -30, 40, 90].forEach(function (dx) { parts.push(s.node(bear, 'rect', { x: BX + dx - 16, y: BY + 40, width: 32, height: 62, rx: 12 })); });
      parts.forEach(function (p) { p.setAttribute('fill', '#FFFDF8'); p.setAttribute('stroke', INK); p.setAttribute('stroke-width', 3); });
      s.tween(bear, 2.0, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      var nz = s.text('small-caps', 'Новая Земля', { left: BX - 90, top: BY + 124 });
      s.fade(nz, 2.4, { y: 4 });
      // двое: старший без школы и молодой — год учёбы
      s.actor('adult', { x: 380, y: 800, d: 160, o: 0 }, 0, 0.01); s.actor('adult', { o: 1 }, 0.6, 0.4);
      s.actor('adult2', { x: 720, y: 810, d: 130, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 0.8, 0.4);
      var w1 = s.text('small-caps', 'без школы', { left: 300, top: 900, width: 160, textAlign: 'center' });
      var w2 = s.text('small-caps', 'год учёбы', { left: 640, top: 900, width: 160, textAlign: 'center' });
      s.fade(w1, 1.0, { y: 4 }); s.fade(w2, 1.2, { y: 4 });
      s.out([w1, w2], 12.0, { dur: 0.3 });
      s.freeze(3.8, 2.2);
      var gu = s.text('small-caps', 'Угадайте, что ответит человек без школы', { left: 140, top: 320 });
      s.fade(gu, 3.9, { y: 0, dur: 0.2 }); s.out(gu, 5.75, { dur: 0.2 });
      var b1 = K().say(s, 'Я видел чёрного. Говорю только о том, что видел.', 260, 560, 6.2, 9.7);
      b1.style.whiteSpace = 'normal'; b1.style.width = '560px';
      s.tween(parts, 7.2, { attr: { fill: '#FFFDF8' } }, { attr: { fill: '#2B2B2B' }, duration: 0.6 });
      K().say(s, 'По-вашему выходит — белые.', 600, 620, 10.0);
      s.tween(parts, 10.6, { attr: { fill: '#2B2B2B' } }, { attr: { fill: '#FFFDF8' }, duration: 0.6 });
      var c = s.text('h3', 'Рассуждать от условия, а не от опыта, учит школа.', { left: 140, top: 880, width: 1600, fontSize: 44 });
      s.lines(c, 12.4);
      var src = s.text('cite', 'А. Р. Лурия, 1974 (реплики — по изданию 1979) · С. Скрибнер, М. Коул, 1981: это даёт школа, а не грамотность сама по себе', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 13.4, { y: 4 });
      ['adult', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 17.0, 0.4); });
    }
  });
})();
