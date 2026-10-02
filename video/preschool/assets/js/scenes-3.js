/* Часть 3. Хочу, но надо · воля и правила: горькая конфета, смена правила, чашки, совесть, инициатива */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', OBJ = '#E0A930', STICK = '#8B6A45', MUTE = '#8A8F90';
  var RED = '#C8553D', BLUE = '#4A7FB0';

  // рисованные значки
  function rabbit(s, g, x, y, col, at, seed) {
    s.sk(g, Film.circ(x, y + 8, 20, 14), { at: at, dur: 0.4, color: col, width: 4.5, seed: seed });
    s.sk(g, [[x - 8, y - 8], [x - 14, y - 40], [x - 2, y - 12]], { at: at + 0.2, dur: 0.3, color: col, width: 4.5, seed: seed + 2 });
    s.sk(g, [[x + 4, y - 10], [x + 10, y - 42], [x + 14, y - 8]], { at: at + 0.3, dur: 0.3, color: col, width: 4.5, seed: seed + 4 });
  }
  function boat(s, g, x, y, col, at, seed) {
    s.sk(g, [[x - 30, y + 10], [x + 30, y + 10], [x + 20, y + 26], [x - 20, y + 26], [x - 30, y + 10]], { at: at, dur: 0.4, color: col, width: 4.5, seed: seed });
    s.sk(g, [[x, y + 10], [x, y - 34], [x + 24, y + 4], [x, y + 4]], { at: at + 0.25, dur: 0.4, color: col, width: 4.5, seed: seed + 2 });
  }
  function tear(s, g, x, y, at) {
    s.sk(g, [[x, y], [x - 6, y + 14], [x, y + 20], [x + 6, y + 14], [x, y]], { at: at, dur: 0.4, color: BLUE, width: 3.5, seed: 991 });
  }

  // 2:20 — заставка части
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.actor('kid2', { o: 0 }, 0.0, 0.4); s.actor('adult', { o: 0 }, 0.0, 0.4);
      s.chapterCard(3, 'Хочу, но надо', 'воля и правила · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.age(60, 0.2, 1.3);
      s.chapter(3, 'Хочу, но надо', 0.4, 64.6);
    }
  });

  // 2:22,5 — Горькая конфета (описано А. Н. Леонтьевым, 1975)
  Film.scene({
    id: 'candy', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Описано А. Н. Леонтьевым, 1975', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Горькая конфета', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Задание: достать далёкий предмет, не вставая с места. Взрослый уходит и наблюдает через окошко.', { left: 140, top: 330, width: 780, fontSize: 32 });
      s.lines(p1, 0.9, { stagger: 0.08 });

      var g = s.svg(), ov = s.over();
      var CX = 1100, CY = 640, OX = 1620;
      var chair = s.node(g, 'g', { opacity: 0 });
      s.sk(chair, [[CX - 50, CY + 56], [CX + 50, CY + 56]], { seed: 401, width: 4 });
      s.sk(chair, [[CX - 50, CY + 56], [CX - 50, CY + 110]], { seed: 403, width: 4 });
      s.sk(chair, [[CX + 50, CY + 56], [CX + 50, CY + 110]], { seed: 405, width: 4 });
      s.sk(chair, [[CX - 50, CY + 56], [CX - 54, CY - 50]], { seed: 407, width: 4 });
      s.tween(chair, 0.5, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.actor('baby', { x: CX, y: CY, d: 104, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.6, 0.5);
      s.face('baby', true, 0.7, 0.3); s.mouth('baby', 'soft', 0.7, 0.01); s.gaze('baby', 8, 0, 0.7, 0.01);
      s.actor('obj', { x: OX, y: CY + 30, d: 70, o: 0 }, 0.6, 0.01);
      s.actor('obj', { o: 1 }, 0.8, 0.5);
      // окошко наблюдения
      var win = s.node(g, 'g', { opacity: 0 });
      s.sk(win, [[1560, 300], [1760, 300], [1760, 440], [1560, 440], [1560, 300]], { seed: 411, width: 4 });
      s.sk(win, [[1660, 300], [1660, 440]], { seed: 413, width: 3, opacity: 0.6 });
      s.tween(win, 1.2, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.actor('adult', { x: 880, y: 560, d: 130, o: 0 }, 0.5, 0.01);
      s.actor('adult', { o: 1 }, 0.7, 0.5);
      s.actor('adult', { x: 1700, y: 380, d: 80 }, 1.8, 1.0, 'power2.inOut');
      // попытки дотянуться
      s.squash('baby', 1.22, 0.86, 3.0, 0.3); s.squash('baby', 1, 1, 3.35, 0.4, 'back.out(3)');
      s.squash('baby', 1.26, 0.84, 3.9, 0.3); s.squash('baby', 1, 1, 4.25, 0.4, 'back.out(3)');
      s.mouth('baby', 'flat', 4.4, 0.2);
      // встал, взял, спокойно вернулся
      var land = s.hop('baby', OX - 100, CY, 4.9, 0.5, 40);
      s.actor('obj', { x: OX - 100 + 58, y: CY + 22, d: 44 }, land + 0.1, 0.4);
      s.hop('baby', CX, CY, land + 0.6, 0.5, 40);
      s.actor('obj', { x: CX + 58, y: CY + 22 }, land + 0.69, 0.5, 'sine.inOut');
      s.mouth('baby', 'soft', 6.6, 0.2);
      // взрослый входит, хвалит, протягивает конфету
      s.actor('adult', { x: 1340, y: 560, d: 130 }, 6.8, 0.9, 'power2.inOut');
      var bub = s.div('bubble tail-r soft', { left: 1220, top: 360 }, null, 'Молодец! Держи конфету.');
      s.pop(bub, 7.6, { from: 0.7, dur: 0.5, origin: '90% 100%' }); s.out(bub, 10.0, { dur: 0.3 });
      var candy = s.node(ov, 'g', {});
      s.sk(candy, [[1238, 620], [1270, 620], [1270, 642], [1238, 642], [1238, 620]], { at: 7.8, dur: 0.35, color: ORANGE, width: 4.5, seed: 421 });
      s.sk(candy, [[1238, 631], [1222, 620], [1222, 642], [1238, 631]], { at: 8.1, dur: 0.2, color: ORANGE, width: 4, seed: 423 });
      s.sk(candy, [[1270, 631], [1286, 620], [1286, 642], [1270, 631]], { at: 8.2, dur: 0.2, color: ORANGE, width: 4, seed: 425 });
      // отказывается — тихо плачет
      s.gaze('baby', -9, 3, 8.6, 0.4); s.mouth('baby', 'sad', 8.8, 0.4);
      tear(s, ov, CX - 24, CY - 6, 9.4);
      s.out(p1, 8.6, { dur: 0.4 });
      var p2 = s.text('lead', 'Ребёнок отказывается от конфеты, а когда взрослый настаивает, тихо плачет.', { left: 140, top: 330, width: 780, fontSize: 32 });
      s.lines(p2, 9.0, { stagger: 0.08 });
      var q = s.text('quote', '«Конфета оказалась горькой — горькой по своему личностному смыслу»', { left: 140, top: 470, width: 800, fontSize: 38 });
      s.lines(q, 10.4, { stagger: 0.1 });
      var qc = s.text('cite', 'А. Н. Леонтьев', { left: 140, top: 580 });
      s.fade(qc, 11.1, { y: 6 });
      var term = s.text('h3 acc', 'Соподчинение мотивов', { left: 140, top: 650 });
      s.fade(term, 12.0, { y: 10 });
      var tn = s.text('body', '«Надо» начинает подчинять «хочу». По Леонтьеву — первое рождение личности.', { left: 140, top: 712, width: 800, fontSize: 28 });
      s.lines(tn, 12.4, { stagger: 0.08 });
      // весы мотивов
      var bal = s.node(ov, 'g', {});
      s.sk(bal, [[1380, 330], [1360, 362], [1400, 362], [1380, 330]], { at: 12.0, dur: 0.4, seed: 431 });
      var beam = s.node(bal, 'g', {});
      s.sk(beam, [[1260, 330], [1500, 330]], { at: 12.2, dur: 0.4, seed: 433, width: 4.5 });
      var w1 = s.text('label', 'хочу', { left: 1220, top: 280, width: 80, textAlign: 'center', fontSize: 24 });
      var w2 = s.text('label', 'надо', { left: 1460, top: 280, width: 80, textAlign: 'center', fontSize: 24, color: DEEP });
      s.fade(w1, 12.4, { y: 4 }); s.fade(w2, 12.5, { y: 4 });
      s.tween(beam, 13.0, { rotation: 0 }, { rotation: 9, duration: 0.9, ease: 'back.out(1.6)', svgOrigin: '1380 330' });
      s.tween(w1, 13.0, { y: 0 }, { y: -19, duration: 0.9, ease: 'back.out(1.6)' });
      s.tween(w2, 13.0, { y: 0 }, { y: 19, duration: 0.9, ease: 'back.out(1.6)' });
    }
  });

  // 2:37,5 — Правило сменилось: сортировка карточек (Ф. Зелазо, 2006)
  Film.scene({
    id: 'cards', bars: 5,
    build: function (s) {
      s.actor('obj', { o: 0 }, 0.0, 0.3); s.actor('adult', { o: 0 }, 0.0, 0.3);
      var k = s.text('kicker', 'Ф. Зелазо, 2006', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Правило сменилось', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);

      var g = s.svg(), ov = s.over();
      var BX1 = 1180, BX2 = 1560, BY = 470;
      [[BX1, BLUE, 'r'], [BX2, RED, 'b']].forEach(function (b, i) {
        var tray = s.node(g, 'rect', { x: b[0] - 110, y: BY - 70, width: 220, height: 150, rx: 16, fill: '#FFFDF8', stroke: '#B3A898', 'stroke-width': 3, opacity: 0 });
        s.tween(tray, 0.5 + i * 0.15, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
        if (b[2] === 'r') rabbit(s, ov, b[0], BY, b[1], 0.8, 501); else boat(s, ov, b[0], BY, b[1], 1.0, 511);
      });
      var rule = s.div('chip', { left: 1240, top: 300, height: 50, fontSize: 24 }, null, 'игра в цвета');
      s.fade(rule, 1.3, { y: 6 });
      // ребёнок 3 лет
      s.actor('baby', { x: 1370, y: 760, d: 100 }, 0.0, 0.9, 'power3.inOut');
      s.gaze('baby', 0, -7, 0.4, 0.3); s.mouth('baby', 'soft', 0.4, 0.3);
      // карточка: красный кролик
      function card(t0) {
        var c = s.node(ov, 'g', {});
        var bg = s.node(c, 'rect', { x: -40, y: -46, width: 80, height: 92, rx: 10, fill: '#FFFDF8', stroke: '#B3A898', 'stroke-width': 2.5 });
        rabbit(s, c, 0, 8, RED, t0 + 0.1, 521 + Math.round(t0 * 10));
        s.set(c, 0, { x: 1370, y: 660, opacity: 0 }, { x: 1370, y: 660, opacity: 0 });
        s.tween(c, t0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        return c;
      }
      var c1 = card(1.8);
      s.tween(c1, 2.6, { x: 1370, y: 660 }, { x: BX2, y: BY + 8, duration: 0.6, ease: 'power2.inOut' });
      var ok1 = Film.check(s, ov, BX2 + 84, BY - 54, '#2E7D32');
      s.draw(ok1, 3.2, { dur: 0.3 });
      s.out(ok1, 4.0, { dur: 0.3 }); s.out(c1, 4.0, { dur: 0.3 });
      s.tween(rule, 3.9, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      var rule2 = s.div('chip sw', { left: 1240, top: 300, height: 50, fontSize: 24 }, null, 'игра в формы');
      s.fade(rule2, 4.1, { y: 6 });
      var c2 = card(4.5);
      // «застревает» над старой коробкой и кладёт по старому правилу
      s.tween(c2, 5.1, { x: 1370, y: 660 }, { x: BX1 + 20, y: BY - 30, duration: 0.5, ease: 'power2.inOut' });
      s.tween(c2, 5.7, { x: BX1 + 20, y: BY - 30 }, { x: BX2, y: BY + 8, duration: 0.6, ease: 'power2.inOut' });
      var no = Film.cross(s, ov, BX2 + 84, BY - 54, RED);
      s.draw(no, 6.4, { dur: 0.3 });
      var p1 = s.text('lead', 'Трёхлетний верно называет новое правило — и всё равно раскладывает по старому.', { left: 140, top: 330, width: 800, fontSize: 32 });
      s.lines(p1, 5.6, { stagger: 0.08 });
      // к 5 годам — переключается
      s.out(no, 7.6, { dur: 0.3 }); s.out(c2, 7.6, { dur: 0.3 });
      s.age(60, 7.4, 1.0);
      s.actor('baby', { d: 116 }, 7.4, 0.6);
      var c3 = card(7.8);
      s.tween(c3, 8.4, { x: 1370, y: 660 }, { x: BX1, y: BY + 8, duration: 0.6, ease: 'power2.inOut' });
      var ok3 = Film.check(s, ov, BX1 + 84, BY - 54, '#2E7D32');
      s.draw(ok3, 9.0, { dur: 0.3 });
      s.mouth('baby', 'smile', 9.0, 0.3);
      var p2 = s.text('body', 'Половина детей переключается к 4 годам, большинство — к 5 (С. Добел, Ф. Зелазо, 2015: 69 работ).', { left: 140, top: 456, width: 800, fontSize: 28 });
      s.lines(p2, 8.4, { stagger: 0.08 });
      var term = s.text('h3 acc', '<span class="term">исполнительные функции<span class="en">executive functions</span></span>', { left: 140, top: 580 });
      s.fade(term, 9.6, { y: 10 });
      var tn = s.text('note', 'Три опоры самоконтроля: торможение, рабочая память, гибкость (А. Даймонд, 2013).', { left: 140, top: 690, width: 800 });
      s.fade(tn, 10.4, { y: 6 });
    }
  });

  // 2:50 — Пятнадцать чашек и одна (Ж. Пиаже, 1932) → С. Нельсон; Дж. Сметана
  Film.scene({
    id: 'cups', bars: 6,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Ж. Пиаже, 1932', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Пятнадцать чашек и одна', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var g = s.svg(), ov = s.over();
      // Джон: дверь, поднос, 15 чашек
      var JX = 1120, JY = 560;
      s.sk(ov, [[JX - 140, JY + 140], [JX - 140, JY - 120], [JX - 60, JY - 120], [JX - 60, JY + 140]], { at: 0.6, dur: 0.6, seed: 601 });
      var cups = [];
      for (var i = 0; i < 15; i++) {
        var cx = JX + (i % 5) * 26 - 30, cy = JY + 40 - Math.floor(i / 5) * 22;
        var c = s.node(g, 'circle', { cx: cx, cy: cy, r: 10, fill: ORANGE, opacity: 0 });
        s.tween(c, 0.8 + i * 0.03, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        cups.push(c);
      }
      var tray = s.path(g, 'M' + (JX - 50) + ' ' + (JY + 54) + ' H' + (JX + 120), { stroke: INK, 'stroke-width': 4 });
      s.tween(tray, 0.8, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.actor('kid2', { x: JX - 100, y: JY, d: 88, o: 0 }, 1.2, 0.01);
      s.actor('kid2', { o: 1 }, 1.3, 0.4);
      s.face('kid2', true, 1.3, 0.3); s.mouth('kid2', 'soft', 1.3, 0.01);
      // дверь открылась — чашки разлетелись
      cups.forEach(function (c, i) {
        var dx = ((i * 37) % 11 - 5) * 14, dy = 110 + (i % 4) * 14;
        s.tween(c, 2.0 + (i % 5) * 0.02, { x: 0, y: 0 }, { x: dx, y: dy, duration: 0.45, ease: 'power2.in' });
      });
      s.mouth('kid2', 'sad', 2.3, 0.2);
      var jl = s.text('label', 'Джон: нечаянно — 15 чашек', { left: JX - 150, top: JY + 190, width: 340, textAlign: 'center', fontSize: 24 });
      s.fade(jl, 2.5, { y: 6 });
      // Генри: варенье без мамы — 1 чашка
      var HX = 1590, HY = 560;
      s.sk(ov, [[HX - 20, HY - 150], [HX + 120, HY - 150], [HX + 120, HY - 40], [HX - 20, HY - 40], [HX - 20, HY - 150]], { at: 0.9, dur: 0.6, seed: 611 });
      s.sk(ov, [[HX + 34, HY - 120], [HX + 34, HY - 70], [HX + 70, HY - 70], [HX + 70, HY - 120]], { at: 1.3, dur: 0.4, seed: 613, color: RED });
      var one = s.node(g, 'circle', { cx: HX + 90, cy: HY - 30, r: 10, fill: ORANGE, opacity: 0 });
      s.tween(one, 1.4, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.actor('kid3', { x: HX - 40, y: HY + 10, d: 88, o: 0 }, 1.4, 0.01);
      s.actor('kid3', { o: 1 }, 1.5, 0.4);
      s.face('kid3', true, 1.5, 0.3); s.mouth('kid3', 'smile', 1.5, 0.01); s.gaze('kid3', 6, -8, 1.5, 0.01);
      s.tween(one, 2.3, { y: 0 }, { y: 120, duration: 0.4, ease: 'power2.in' });
      var hl = s.text('label', 'Генри: доставал варенье без мамы — 1 чашка', { left: HX - 190, top: HY + 190, width: 420, textAlign: 'center', fontSize: 24 });
      s.fade(hl, 2.7, { y: 6 });

      var qv = s.text('statement', 'Кто виноват больше?', { left: 140, top: 330, width: 780, fontSize: 56 });
      s.lines(qv, 3.0);
      s.out(qv, 5.2, { dur: 0.4 });
      var p1 = s.text('lead', 'У Пиаже младшие (в среднем 7 лет) винят Джона — ущерб больше. Старшие (около 9) — Генри: важнее намерение.', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p1, 5.5, { stagger: 0.08 });
      var nl = s.text('small-caps', 'Сейчас понимают так', { left: 140, top: 490 });
      s.fade(nl, 7.6, { y: 6 });
      var p2 = s.text('body', 'О намерениях дети судят раньше, если намерение показано ясно (С. Нельсон, 1980; Г. Ноубс и др., 2016).', { left: 140, top: 526, width: 800, fontSize: 28 });
      s.lines(p2, 7.8, { stagger: 0.08 });
      [p1, nl, p2].forEach(function (e) { s.out(e, 10.0, { dur: 0.4 }); });
      var p3 = s.text('lead', 'А уже в 3–4 года «ударить» считают хуже, чем «нарушить порядок», — и неправильным, даже если правила нет.', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p3, 10.4, { stagger: 0.08 });
      var c3 = s.text('cite', 'Дж. Сметана, 1981', { left: 140, top: 470 });
      s.fade(c3, 11.0, { y: 6 });
      var term = s.text('h3 acc', '<span class="term">моральное и условное<span class="en">moral vs. conventional</span></span>', { left: 140, top: 540 });
      s.fade(term, 11.6, { y: 10 });
    }
  });

  // 3:05 — Совесть: З. Фрейд → Г. Кочанска
  Film.scene({
    id: 'conscience', bars: 4,
    build: function (s) {
      s.actor('kid2', { o: 0 }, 0.0, 0.4); s.actor('kid3', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'З. Фрейд · Г. Кочанска', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Совесть', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Фрейд: сверх-Я — «наследник Эдипова комплекса». Ребёнок усваивает запреты, отождествляясь с родителем (1923–1924).', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p1, 0.8, { stagger: 0.08 });

      var g = s.svg(), ov = s.over();
      var CX = 1400, CY = 720;
      s.actor('adult', { x: 1220, y: 470, d: 130, o: 0 }, 0.3, 0.01); s.actor('adult', { o: 1 }, 0.4, 0.5);
      s.actor('adult2', { x: 1580, y: 470, d: 130, o: 0 }, 0.3, 0.01); s.actor('adult2', { o: 1 }, 0.5, 0.5);
      s.actor('baby', { x: CX, y: CY, d: 100, o: 0 }, 0.3, 0.01); s.actor('baby', { o: 1 }, 0.6, 0.5);
      s.face('baby', true, 0.7, 0.3); s.mouth('baby', 'flat', 0.7, 0.01); s.gaze('baby', 0, -6, 0.7, 0.01);
      var tri = s.node(g, 'g', {});
      s.sk(tri, [[1220, 470], [1580, 470], [CX, CY], [1220, 470]], { at: 1.0, dur: 0.9, seed: 701, opacity: 0.5 });
      // внутренний голос: пунктирный «родитель» уходит внутрь ребёнка
      var inner = s.node(ov, 'circle', { cx: 1580, cy: 470, r: 28, fill: 'none', stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '4 8', opacity: 0 });
      s.tween(inner, 2.2, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.tween(inner, 2.6, { attr: { cx: 1580, cy: 470 } }, { attr: { cx: CX, cy: CY - 14 }, duration: 1.3, ease: 'power2.inOut' });
      var il = s.text('note', 'сверх-Я', { left: CX + 66, top: CY - 40, color: DEEP, fontWeight: 650 });
      s.fade(il, 3.8, { y: 4 });

      // сейчас: тёплые, взаимно отзывчивые отношения
      [p1, il].forEach(function (e) { s.out(e, 5.0, { dur: 0.4 }); });
      s.out(tri, 5.0, { dur: 0.4 }); s.out(inner, 5.0, { dur: 0.4 });
      s.actor('adult2', { o: 0 }, 5.0, 0.4);
      s.actor('adult', { x: 1170, y: 640 }, 5.0, 0.9, 'power2.inOut');
      s.mouth('baby', 'smile', 5.6, 0.3); s.gaze('baby', -8, -2, 5.6, 0.3);
      s.face('adult', true, 5.8, 0.3); s.mouth('adult', 'smile', 5.8, 0.01); s.gaze('adult', 7, 2, 5.8, 0.01);
      s.sk(ov, [[1240, 590], [1290, 560], [1340, 590]], { at: 6.0, dur: 0.5, color: ORANGE, width: 4.5, seed: 711 });
      s.sk(ov, [[1340, 740], [1290, 770], [1240, 740]], { at: 6.3, dur: 0.5, color: ORANGE, width: 4.5, seed: 713 });
      var bub = s.div('bubble tail-l', { left: CX - 20, top: CY - 160 }, null, 'Давай!');
      s.pop(bub, 7.0, { from: 0.7, dur: 0.5, origin: '10% 100%' });
      var nl = s.text('small-caps', 'Сейчас понимают так', { left: 140, top: 330 });
      s.fade(nl, 5.4, { y: 6 });
      var p2 = s.text('lead', 'Совесть растёт из тёплых, взаимно отзывчивых отношений и добровольного «да» ребёнка — а не из страха.', { left: 140, top: 366, width: 800, fontSize: 30 });
      s.lines(p2, 5.6, { stagger: 0.08 });
      var c2 = s.text('cite', 'Г. Кочанска, 1997; 2002', { left: 140, top: 500 });
      s.fade(c2, 6.6, { y: 6 });
    }
  });

  // 3:15 — Инициатива против вины (Э. Эриксон, 1950)
  Film.scene({
    id: 'erikson', bars: 4,
    build: function (s) {
      s.actor('adult', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Э. Эриксон, 1950', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Инициатива против вины', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Ребёнок затевает своё: строит, придумывает, командует игрой.', { left: 140, top: 330, width: 780, fontSize: 32 });
      s.lines(p1, 0.8);

      var ov = s.over();
      var CX = 1400, CY = 760;
      s.actor('baby', { x: CX, y: CY, d: 104 }, 0.0, 0.8, 'power3.inOut');
      s.mouth('baby', 'smile', 0.4, 0.3); s.gaze('baby', 0, -7, 0.4, 0.3);
      // замыслы: ракета, дом, мост
      var ideas = s.node(ov, 'g', {});
      var rk = s.node(ideas, 'g', {}), hs = s.node(ideas, 'g', {}), br = s.node(ideas, 'g', {});
      s.sk(rk, [[1180, 560], [1200, 480], [1220, 560], [1180, 560]], { at: 1.0, dur: 0.4, seed: 801, color: ORANGE, width: 4.5 });
      s.sk(rk, [[1190, 560], [1200, 590], [1210, 560]], { at: 1.3, dur: 0.2, seed: 803, color: ORANGE, width: 4 });
      s.sk(hs, [[1360, 560], [1360, 510], [1400, 470], [1440, 510], [1440, 560], [1360, 560]], { at: 1.3, dur: 0.5, seed: 805, width: 4.5 });
      s.sk(br, [[1560, 560], [1600, 520], [1660, 520], [1700, 560]], { at: 1.6, dur: 0.5, seed: 807, width: 4.5 });
      s.tween([rk, hs, br], 2.2, { y: 0 }, { y: -170, duration: 1.4, ease: 'power2.out', stagger: 0.12 });
      var yes = s.text('label', 'Поддержка → <span class="acc">инициатива, целеустремлённость</span>', { left: 140, top: 450, width: 820, fontSize: 30 });
      s.fade(yes, 2.6, { y: 6 });
      // запрет и насмешка — замыслы гаснут
      s.actor('adult', { x: 1720, y: 640, d: 140, o: 0 }, 4.6, 0.01);
      s.actor('adult', { x: 1680, o: 1 }, 4.7, 0.6, 'power2.out');
      var nob = s.div('bubble tail-r soft', { left: 1490, top: 470 }, null, 'Глупости. Нельзя!');
      s.pop(nob, 5.3, { from: 0.7, dur: 0.5, origin: '90% 100%' });
      s.tween([rk, hs, br], 5.9, { y: -170, opacity: 1 }, { y: 40, opacity: 0.18, duration: 1.0, ease: 'power2.in', stagger: 0.08 });
      s.mouth('baby', 'sad', 6.0, 0.3); s.gaze('baby', 0, 6, 6.0, 0.3);
      s.squash('baby', 1.1, 0.86, 6.2, 0.6, 'power2.out');
      var no = s.text('label', 'Насмешка и запреты → <span class="acc">вина</span>', { left: 140, top: 510, width: 820, fontSize: 30 });
      s.fade(no, 6.3, { y: 6 });
      var nt = s.text('note', 'Позже Эриксон назовёт этот этап «возрастом игры», а его итог — целеустремлённостью (1964).', { left: 140, top: 600, width: 800 });
      s.fade(nt, 7.6, { y: 6 });
      s.squash('baby', 1, 1, 9.3, 0.5, 'back.out(2)');
      s.actor('adult', { o: 0 }, 9.2, 0.5);
    }
  });
})();
