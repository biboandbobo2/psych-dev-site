/* Часть 3. «Хочу» против «надо» · самоконтроль и мораль: горькая конфета, смена правила, чашки, совесть, инициатива */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', OBJ = '#E0A930', STICK = '#8B6A45', MUTE = '#8A8F90';
  var RED = '#C8553D', BLUE = '#4A7FB0';

  // 2:25 — заставка части
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.actor('kid2', { o: 0 }, 0.0, 0.4); s.actor('adult', { o: 0 }, 0.0, 0.4); s.actor('baby', { o: 0 }, 0.0, 0.4);
      s.chapterCard(3, '«Хочу» против «надо»', 'самоконтроль и мораль · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.age(60, 0.2, 1.3);
      s.chapter(3, '«Хочу» против «надо»', 0.4, 67.1);
      // весы: «надо» перевешивает
      var ov = s.over(), SX = 1600, SY = 300, A = 12 * Math.PI / 180, DY = Math.round(150 * Math.sin(A));
      s.sk(ov, [[SX, SY], [SX, SY + 160]], { at: 0.3, dur: 0.3, seed: 31, width: 5 });
      s.sk(ov, [[SX - 64, SY + 160], [SX + 64, SY + 160]], { at: 0.45, dur: 0.2, seed: 33, width: 5 });
      var beam = s.node(ov, 'g', {});
      s.sk(beam, [[SX - 150, SY], [SX + 150, SY]], { at: 0.5, dur: 0.3, seed: 35, width: 5 });
      [[-1, 'хочу', '#3C4852'], [1, 'надо', DEEP]].forEach(function (pn, i) {
        var x = SX + pn[0] * 150, pan = s.node(ov, 'g', {});
        s.sk(pan, [[x, SY], [x - 34, SY + 72]], { at: 0.6, dur: 0.2, seed: 37 + i * 4, width: 3 });
        s.sk(pan, [[x, SY], [x + 34, SY + 72]], { at: 0.6, dur: 0.2, seed: 38 + i * 4, width: 3 });
        s.sk(pan, [[x - 44, SY + 72], [x - 26, SY + 94], [x + 26, SY + 94], [x + 44, SY + 72], [x - 44, SY + 72]], { at: 0.7, dur: 0.3, seed: 39 + i * 4, width: 4, fill: i ? '#FEF0DD' : '#FFFDF8' });
        var lb = s.otext('label', pn[1], { left: x - 60, top: SY + 104, width: 120, textAlign: 'center', fontSize: 26, color: pn[2] });
        s.fade(lb, 0.8, { y: 4 });
        s.tween([pan, lb], 1.2, { y: 0 }, { y: pn[0] * DY, duration: 0.8, ease: 'back.out(1.6)' });
      });
      s.tween(beam, 1.2, { rotation: 0 }, { rotation: 12, duration: 0.8, ease: 'back.out(1.6)', svgOrigin: SX + ' ' + SY });
    }
  });

  // 2:27,5 — Горькая конфета (описано А. Н. Леонтьевым, 1975): история по шагам, затем — смысл
  Film.scene({
    id: 'candy', bars: 7,
    build: function (s) {
      var k = s.text('kicker', 'Описано А. Н. Леонтьевым, 1975', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Горькая конфета', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var steps = [
        [0.9, 'Задание: достать далёкий предмет, не вставая со стула.'],
        [2.5, 'Взрослый выходит и наблюдает через окошко.'],
        [6.0, 'Дотянуться не получается. Ребёнок встаёт, берёт предмет и садится обратно.'],
        [8.75, 'Взрослый хвалит и даёт конфету. Ребёнок отказывается и тихо плачет.']
      ];
      var texts = [], all = [];
      steps.forEach(function (st, i) {
        var y = 326 + i * 88;
        var b = s.div('num-badge', { left: 140, top: y, width: 44, height: 44, fontSize: 24 }, null, String(i + 1));
        var t = s.text('body', st[1], { left: 204, top: y + 2, width: 740, fontSize: 28 });
        s.pop(b, st[0], { from: 0.7, dur: 0.4 }); s.lines(t, st[0] + 0.05, { stagger: 0.07 });
        if (i > 0) s.tween(texts[i - 1], st[0], { color: '#3C4852' }, { color: MUTE, duration: 0.4 }); // прошлый шаг гаснет
        texts.push(t); all.push(t, b);
      });

      var g = s.svg(), ov = s.over(), TOY = Film.toys, IC = Film.icons;
      var CX = 1100, CY = 640, TX = 1650;
      var chair = s.node(g, 'g', { opacity: 0 });
      s.sk(chair, [[CX - 50, CY + 56], [CX + 50, CY + 56]], { seed: 401, width: 4 });
      s.sk(chair, [[CX - 50, CY + 56], [CX - 50, CY + 110]], { seed: 403, width: 4 });
      s.sk(chair, [[CX + 50, CY + 56], [CX + 50, CY + 110]], { seed: 405, width: 4 });
      s.sk(chair, [[CX - 50, CY + 56], [CX - 54, CY - 50]], { seed: 407, width: 4 });
      s.tween(chair, 0.5, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.actor('baby', { x: CX, y: CY, d: 104, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.6, 0.5);
      s.face('baby', true, 0.7, 0.3); s.mouth('baby', 'soft', 0.7, 0.01); s.gaze('baby', 8, 0, 0.7, 0.01);
      // далёкий предмет — мяч на столике
      var tab = s.node(g, 'g', { opacity: 0 });
      s.sk(tab, [[TX - 70, CY + 60], [TX + 70, CY + 60]], { seed: 409, width: 4 });
      s.sk(tab, [[TX - 56, CY + 60], [TX - 56, CY + 110]], { seed: 411, width: 4 });
      s.sk(tab, [[TX + 56, CY + 60], [TX + 56, CY + 110]], { seed: 413, width: 4 });
      s.tween(tab, 0.7, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var ball = s.node(g, 'g', {});
      TOY.ball(s, ball, TX, CY + 26, 32, '#4A7FB0', '#2F5E8A');
      s.tween(ball, 0.8, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' });
      var far = s.path(ov, 'M' + (CX + 70) + ' ' + (CY + 20) + ' H' + (TX - 50), { stroke: MUTE, 'stroke-width': 3, 'stroke-dasharray': '4 10' });
      s.dash(far, 1.2, { dur: 0.6 });
      var farL = s.otext('note', 'не вставая со стула', { left: CX + 90, top: CY - 26, width: 400, textAlign: 'center', fontSize: 22 });
      s.fade(farL, 1.4, { y: 4 });
      s.out(far, 5.9, { dur: 0.3 }); s.out(farL, 5.9, { dur: 0.3 });
      // взрослый уходит к окошку
      s.actor('adult', { x: 1340, y: 500, d: 130, o: 0 }, 0.5, 0.01);
      s.actor('adult', { o: 1 }, 0.7, 0.5);
      var win = s.node(g, 'g', { opacity: 0 });
      s.sk(win, Film.sharp([[1580, 300], [1780, 300], [1780, 440], [1580, 440], [1580, 300]]), { seed: 415, width: 4, fill: '#EEF3F6', amp: 1 });
      s.sk(win, [[1680, 300], [1680, 440]], { seed: 417, width: 3, opacity: 0.6 });
      s.tween(win, 2.2, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.actor('adult', { x: 1720, y: 380, d: 80 }, 2.5, 1.0, 'power2.inOut');
      s.face('adult', true, 3.4, 0.3); s.mouth('adult', 'soft', 3.4, 0.01); s.gaze('adult', -10, 6, 3.4, 0.01);
      // тянется — не достать
      s.squash('baby', 1.22, 0.86, 4.4, 0.3); s.squash('baby', 1, 1, 4.75, 0.4, 'back.out(3)');
      s.squash('baby', 1.26, 0.84, 5.0, 0.3); s.squash('baby', 1, 1, 5.35, 0.4, 'back.out(3)');
      s.mouth('baby', 'flat', 5.3, 0.2);
      // встал, взял, вернулся на стул
      s.hop('baby', TX - 110, CY, 6.16, 0.5, 40);
      s.tween(ball, 6.8, { x: 0, y: 0 }, { x: -52, y: 6, duration: 0.3, ease: 'power2.out' });
      s.hop('baby', CX, CY, 7.16, 0.5, 40); Film.ride(s, ball, CX - (TX - 110), 7.16, 0.5, 40);
      s.mouth('baby', 'soft', 7.9, 0.2); s.gaze('baby', 6, 0, 7.9, 0.3);
      // взрослый возвращается, хвалит, даёт конфету
      s.actor('adult', { x: 1340, y: 560, d: 130 }, 8.75, 0.8, 'power2.inOut');
      s.gaze('adult', -8, 2, 8.9, 0.3); s.mouth('adult', 'smile', 8.9, 0.3);
      var bub = s.div('bubble tail-l soft', { left: 1300, top: 380 }, null, 'Молодец! Держи конфету.');
      s.pop(bub, 9.0, { from: 0.7, dur: 0.5, origin: '10% 100%' }); s.out(bub, 10.4, { dur: 0.3 });
      var candy = s.node(ov, 'g', {});
      IC.candy(s, candy, 1240, 610, 0.85, { at: 9.4, dur: 0.6, seed: 421 });
      // отказывается; взрослый настаивает — ребёнок плачет
      s.gaze('baby', -9, 3, 10.6, 0.4); s.mouth('baby', 'sad', 10.6, 0.4);
      s.tween(candy, 10.6, { x: 0 }, { x: 40, duration: 0.4, ease: 'power2.out' });
      var ins = s.div('bubble tail-l soft', { left: 1300, top: 380 }, null, 'Ну возьми же!');
      s.pop(ins, 10.8, { from: 0.7, dur: 0.4, origin: '10% 100%' }); s.out(ins, 11.9, { dur: 0.3 });
      // слёзы — аккуратные капли (взгляд ребёнка сдвинут влево-вниз, глаза — у CX−22 и CX+3)
      function drop(x, y, t) {
        var d = s.path(ov, 'M' + x + ' ' + y + ' C' + (x + 1.5) + ' ' + (y + 3) + ' ' + (x + 4.5) + ' ' + (y + 6) + ' ' + (x + 4.5) + ' ' + (y + 9) +
          ' A4.5 4.5 0 1 1 ' + (x - 4.5) + ' ' + (y + 9) + ' C' + (x - 4.5) + ' ' + (y + 6) + ' ' + (x - 1.5) + ' ' + (y + 3) + ' ' + x + ' ' + y + ' Z',
          { fill: '#9CC9EA', stroke: '#4A7FB0', 'stroke-width': 1.6 });
        s.tween(d, t, { opacity: 0, y: -2 }, { opacity: 1, y: 4, duration: 0.3, ease: 'power2.out' });
        s.tween(d, t + 0.35, { opacity: 1, y: 4 }, { opacity: 0, y: 24, duration: 0.9, ease: 'power1.in' });
      }
      drop(CX - 30, CY + 2, 11.2); drop(CX + 11, CY + 2, 11.5); drop(CX - 30, CY + 2, 12.2); // у внешних уголков глаз, мимо рта

      // смысл
      all.forEach(function (e) { s.out(e, 12.0, { dur: 0.35 }); });
      var why = s.text('lead', 'Почему? Предмет достался нечестно — и награда не радует.', { left: 140, top: 330, width: 800, fontSize: 32 });
      s.lines(why, 12.3, { stagger: 0.08 });
      var q = s.text('quote', '«Конфета оказалась горькой — горькой по своему личностному смыслу»', { left: 140, top: 430, width: 800, fontSize: 36 });
      s.lines(q, 13.0, { stagger: 0.1 });
      var qc = s.text('cite', 'А. Н. Леонтьев', { left: 140, top: 532 });
      s.fade(qc, 13.6, { y: 6 });
      var term = s.text('h3 acc', 'Соподчинение мотивов', { left: 140, top: 596 });
      s.fade(term, 14.2, { y: 10 });
      var tn = s.text('body', '«Надо» начинает подчинять «хочу». По Леонтьеву — первое рождение личности.', { left: 140, top: 658, width: 800, fontSize: 28 });
      s.lines(tn, 14.6, { stagger: 0.08 });
    }
  });

  // 2:45 — Удержать новое правило: сортировка карточек (Ф. Зелазо, 2006) — самоконтроль
  Film.scene({
    id: 'cards', bars: 5,
    build: function (s) {
      s.actor('adult', { o: 0 }, 0.0, 0.3);
      var k = s.text('kicker', 'Самоконтроль · Ф. Зелазо, 2006', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Удержать новое правило', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var g = s.svg(), ov = s.over();
      var BX1 = 1180, BX2 = 1560, BY = 470;
      [[BX1, BLUE, 'r'], [BX2, RED, 'b']].forEach(function (b, i) {
        var tray = s.node(g, 'rect', { x: b[0] - 110, y: BY - 70, width: 220, height: 150, rx: 16, fill: '#FFFDF8', stroke: '#B3A898', 'stroke-width': 3, opacity: 0 });
        s.tween(tray, 0.5 + i * 0.15, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
        var pic = s.node(g, 'g', {});
        if (b[2] === 'r') Film.toys.rabbit(s, pic, b[0], BY + 4, 1.15, b[1], '#2F5E8A'); else Film.toys.boat(s, pic, b[0], BY - 4, 1.2, b[1], '#8E3A28');
        s.tween(pic, 0.8 + i * 0.15, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
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
        Film.toys.rabbit(s, c, 0, 6, 0.78, RED, '#8E3A28');
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
      var p1 = s.text('lead', 'Трёхлетний верно называет новое правило — и всё равно раскладывает по старому: знать правило ещё не значит суметь ему следовать.', { left: 140, top: 330, width: 800, fontSize: 32 });
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
      var p2 = s.text('body', 'Половина детей переключается к 4 годам, большинство — к 5 (С. Добел, Ф. Зелазо, 2015: 69 работ).', { left: 140, top: 488, width: 800, fontSize: 28 });
      s.lines(p2, 8.4, { stagger: 0.08 });
      var term = s.text('h3 acc', '<span class="term">исполнительные функции<span class="en">executive functions</span></span>', { left: 140, top: 596 });
      s.fade(term, 9.6, { y: 10 });
      var tn = s.text('note', 'Три опоры самоконтроля: торможение, рабочая память, гибкость (А. Даймонд, 2013).', { left: 140, top: 704, width: 800 });
      s.fade(tn, 10.4, { y: 6 });
    }
  });

  // 2:57,5 — Пятнадцать чашек и одна (Ж. Пиаже, 1932) → С. Нельсон; Дж. Сметана
  Film.scene({
    id: 'cups', bars: 6,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Ж. Пиаже, 1932', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Пятнадцать чашек и одна', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var g = s.svg(), ov = s.over(), TOY = Film.toys, FL = 712;
      s.sk(g, [[990, FL], [1790, FL]], { at: 0.5, dur: 0.8, seed: 600, width: 3, opacity: 0.35 }); // пол
      // Джон: за дверью — стул, на нём поднос с 15 чашками; дверь открывается и сбивает поднос
      var JX = 1120;
      s.node(g, 'rect', { x: 1000, y: FL - 260, width: 110, height: 260, fill: '#E9DFD0', stroke: '#9C7A4C', 'stroke-width': 3 });
      var door = s.node(g, 'g', {});
      s.node(door, 'rect', { x: 1000, y: FL - 260, width: 110, height: 260, fill: '#D9B98C', stroke: '#9C7A4C', 'stroke-width': 3 });
      s.node(door, 'rect', { x: 1016, y: FL - 240, width: 78, height: 96, rx: 4, fill: 'none', stroke: '#B8946A', 'stroke-width': 2.5 });
      s.node(door, 'circle', { cx: 1094, cy: FL - 128, r: 6, fill: '#9C7A4C' });
      s.tween(door, 0.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var chair = s.node(g, 'g', {});
      s.sk(chair, [[1140, FL - 96], [1270, FL - 96]], { seed: 603, width: 4 });
      s.sk(chair, [[1148, FL - 96], [1148, FL]], { seed: 605, width: 4 });
      s.sk(chair, [[1262, FL - 96], [1262, FL]], { seed: 607, width: 4 });
      s.sk(chair, [[1262, FL - 96], [1266, FL - 190]], { seed: 609, width: 4 });
      s.tween(chair, 0.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var tray = s.path(g, 'M1138 ' + (FL - 100) + ' H1262', { stroke: INK, 'stroke-width': 4 });
      s.tween(tray, 0.8, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var cups = [];
      for (var i = 0; i < 15; i++) {
        var row = Math.floor(i / 5), cx = 1152 + (i % 5) * 24 + (row % 2) * 10, cy = FL - 102 - row * 21;
        var c = s.node(g, 'g', {});
        TOY.cup(s, c, cx, cy, 0.62, ORANGE, '#A65300');
        s.tween(c, 0.8 + i * 0.03, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.2 });
        cups.push([c, cx, cy]);
      }
      // дверь распахивается (поворот на петлях — сжатие к левому краю), в проёме — Джон
      s.tween(door, 1.9, { scaleX: 1 }, { scaleX: 0.16, duration: 0.25, ease: 'power2.in', svgOrigin: '1000 ' + FL });
      s.actor('kid2', { x: 1060, y: FL - 48, d: 92, o: 0 }, 1.9, 0.01);
      s.actor('kid2', { o: 1 }, 1.95, 0.25);
      s.face('kid2', true, 1.95, 0.2); s.mouth('kid2', 'soft', 1.95, 0.01); s.gaze('kid2', 8, 0, 1.95, 0.01);
      s.tween(tray, 2.0, { rotation: 0 }, { rotation: 18, duration: 0.3, ease: 'power2.in', svgOrigin: '1262 ' + (FL - 100) });
      cups.forEach(function (cp, i) {
        var dx = ((i * 37) % 11 - 3) * 16, rot = ((i * 53) % 7 - 3) * 35;
        s.tween(cp[0], 2.0 + (i % 5) * 0.02, { x: 0, y: 0, rotation: 0 }, { x: dx, y: FL - cp[2], rotation: rot, duration: 0.45, ease: 'power2.in', svgOrigin: cp[1] + ' ' + (cp[2] - 12) });
      });
      s.mouth('kid2', 'sad', 2.3, 0.2); s.gaze('kid2', 4, 8, 2.3, 0.2);
      var jl = s.text('label', 'Джон: нечаянно — 15 чашек', { left: JX - 150, top: FL + 38, width: 340, textAlign: 'center', fontSize: 24 });
      s.fade(jl, 2.5, { y: 6 });
      // Генри: без мамы тянется за вареньем на высокую полку — падает одна чашка
      var HX = 1630;
      s.sk(ov, [[1520, 440], [1780, 440]], { at: 0.9, dur: 0.4, seed: 611, width: 5 });
      s.sk(ov, [[1540, 440], [1556, 462]], { at: 1.1, dur: 0.15, seed: 613, width: 3.4 });
      s.sk(ov, [[1760, 440], [1744, 462]], { at: 1.15, dur: 0.15, seed: 615, width: 3.4 });
      var jar = s.node(ov, 'g', {});
      TOY.jar(s, jar, 1700, 438, 1.0);
      s.tween(jar, 1.2, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
      var one = s.node(ov, 'g', {});
      TOY.cup(s, one, 1600, 438, 0.9, ORANGE, '#A65300');
      s.tween(one, 1.4, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25 });
      s.actor('kid3', { x: HX, y: FL - 46, d: 88, o: 0 }, 1.4, 0.01);
      s.actor('kid3', { o: 1 }, 1.5, 0.4);
      s.face('kid3', true, 1.5, 0.3); s.mouth('kid3', 'smile', 1.5, 0.01); s.gaze('kid3', 8, -9, 1.5, 0.01);
      s.squash('kid3', 0.9, 1.16, 1.8, 0.3, 'power2.out');
      s.tween(one, 2.3, { x: 0, y: 0, rotation: 0 }, { x: 110, y: FL - 438, rotation: 110, duration: 0.42, ease: 'power2.in', svgOrigin: '1600 425' }); // падает мимо Генри
      s.squash('kid3', 1, 1, 2.5, 0.3, 'back.out(2)'); s.mouth('kid3', 'flat', 2.6, 0.2); s.gaze('kid3', 4, 8, 2.6, 0.2);
      var hl = s.text('label', 'Генри: доставал варенье без мамы — 1 чашка', { left: HX - 210, top: FL + 38, width: 420, textAlign: 'center', fontSize: 24 });
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
      var p3 = s.text('lead', 'Уже в 3–4 года дети различают два вида запретов. Ударить — плохо, даже если никто этого не запрещал. А нарушить порядок группы — плохо, только пока такое правило есть.', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p3, 10.4, { stagger: 0.08 });
      var c3 = s.text('cite', 'Дж. Сметана, 1981', { left: 140, top: 512 });
      s.fade(c3, 11.0, { y: 6 });
      var term = s.text('h3 acc', '<span class="term">моральное и условное<span class="en">moral vs. conventional</span></span>', { left: 140, top: 580 });
      s.fade(term, 11.6, { y: 10 });
    }
  });

  // 3:12,5 — Совесть: один с запретными игрушками (Г. Кочанска, Н. Аксан, Э. Кёниг, 1995; Г. Кочанска, 1997)
  Film.scene({
    id: 'conscience', bars: 4,
    build: function (s) {
      s.actor('kid2', { o: 0 }, 0.0, 0.4); s.actor('kid3', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Г. Кочанска и др., 1995; 1997', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Совесть', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Мама просит не трогать игрушки на полке и выходит. Ребёнок остаётся один.', { left: 140, top: 330, width: 780, fontSize: 32 });
      s.lines(p1, 0.8, { stagger: 0.08 });

      var g = s.svg(), TOY = Film.toys;
      // полка с заманчивыми игрушками
      var shelf = s.node(g, 'g', {});
      s.sk(shelf, Film.sharp([[1560, 760], [1560, 430], [1780, 430], [1780, 760]]), { seed: 731, width: 4.4, amp: 0.8 });
      s.sk(shelf, [[1560, 545], [1780, 545]], { seed: 733, width: 4 });
      s.sk(shelf, [[1560, 655], [1780, 655]], { seed: 735, width: 4 });
      TOY.ball(s, shelf, 1612, 519, 24, '#E4735A', '#B8533D');
      TOY.bunny(s, shelf, 1716, 543, 0.42);
      TOY.block(s, shelf, 1606, 653, 46, '#4A7FB0', '#2F5E8A', 'А');
      TOY.block(s, shelf, 1658, 653, 46, '#E0A930', '#A77A12', 'Б');
      TOY.block(s, shelf, 1632, 607, 46, '#5E9E5E', '#3F7A3F', 'В');
      s.tween(shelf, 0.3, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
      // свои кубики на полу
      var own = s.node(g, 'g', {});
      TOY.block(s, own, 1036, 812, 52, '#E4735A', '#B8533D', 'Г');
      TOY.block(s, own, 1092, 812, 52, '#4A7FB0', '#2F5E8A', 'Д');
      s.tween(own, 0.5, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });

      var CX = 1200, CY = 760;
      s.actor('baby', { x: CX, y: CY, d: 100, o: 0 }, 0.0, 0.01);
      s.actor('baby', { o: 1 }, 0.2, 0.5);
      s.face('baby', true, 0.3, 0.3); s.mouth('baby', 'soft', 0.3, 0.3); s.gaze('baby', 8, -4, 0.3, 0.3);
      s.actor('adult', { x: 1500, y: 520, d: 130, o: 0 }, 0.4, 0.01);
      s.actor('adult', { x: 1420, o: 1 }, 0.5, 0.5, 'power3.out');
      s.face('adult', true, 0.6, 0.3); s.mouth('adult', 'smile', 0.6, 0.01); s.gaze('adult', -8, 4, 0.6, 0.01);
      var ask = s.div('bubble tail-r soft', { left: 1000, top: 360 }, null, 'Эти игрушки не трогай!');
      s.pop(ask, 1.0, { from: 0.7, dur: 0.45, origin: '90% 100%' }); s.out(ask, 2.3, { dur: 0.3 });
      s.actor('adult', { x: 1820, o: 0 }, 2.5, 0.6, 'power2.in');
      // один: тянется — останавливается — возвращается к своим кубикам
      s.gaze('baby', 9, -6, 3.0, 0.3);
      s.hop('baby', 1400, CY, 3.51, 0.4, 30);
      s.squash('baby', 1.14, 0.9, 3.95, 0.2);
      s.squash('baby', 1, 1, 4.2, 0.3, 'power2.out'); s.mouth('baby', 'flat', 4.2, 0.2); s.gaze('baby', 0, 6, 4.2, 0.3);
      s.hop('baby', CX, CY, 4.51, 0.4, 30);
      s.gaze('baby', -8, 4, 4.9, 0.3); s.mouth('baby', 'smile', 5.0, 0.3);
      s.squash('baby', 1.06, 0.95, 5.2, 0.12); s.squash('baby', 1, 1, 5.32, 0.3, 'back.out(3)');
      s.tween(own, 5.2, { y: 0 }, { y: -10, duration: 0.15, ease: 'power2.out' });
      s.tween(own, 5.35, { y: -10 }, { y: 0, duration: 0.3, ease: 'bounce.out' });

      var p2 = s.text('body', 'Чаще удерживаются те, кто слушается маму охотно, а не из-под палки, и у кого с ней много общей радости.', { left: 140, top: 450, width: 800, fontSize: 28 });
      s.lines(p2, 5.0, { stagger: 0.08 });
      var fin = s.text('statement', 'Совесть растёт из ' + s.HL('тёплых отношений,') + ' а не из страха.', { left: 140, top: 590, width: 820, fontSize: 44 });
      s.lines(fin, 6.5);
      s.hl(fin, 7.4);
    }
  });

  // 3:22,5 — Инициатива против вины (Э. Эриксон, 1950): башня из кубиков и ракета-замысел
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

      var g = s.svg(), ov = s.over(), TOY = Film.toys;
      var CX = 1190, CY = 770, TX = 1420, TB = 832, SZ = 72;
      s.actor('baby', { x: CX, y: CY, d: 104 }, 0.0, 0.8, 'power3.inOut');
      s.mouth('baby', 'smile', 0.4, 0.3); s.gaze('baby', 8, -4, 0.4, 0.3);
      // башня: кубики ставятся один на другой
      var cols = [['#E4735A', '#B8533D', 'А'], ['#4A7FB0', '#2F5E8A', 'Б'], ['#E0A930', '#A77A12', 'В'], ['#5E9E5E', '#3F7A3F', 'Г']];
      var blocks = cols.map(function (c, i) {
        var b = TOY.block(s, g, TX, TB - i * SZ, SZ, c[0], c[1], c[2]);
        var t = 1.0 + i * 0.3;
        s.tween(b, t, { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.in' });
        s.squash('baby', 1.06, 0.95, t + 0.2, 0.1); s.squash('baby', 1, 1, t + 0.3, 0.25, 'back.out(3)');
        return b;
      });
      // замысел: на вершине — ракета; поддержка — и она взлетает
      var rk = s.node(ov, 'g', {});
      Film.icons.rocket(s, rk, TX, 476, 0.9, { at: 2.2, dur: 0.6, seed: 801 });
      s.actor('adult2', { x: 1780, y: 600, d: 130, o: 0 }, 2.4, 0.01);
      s.actor('adult2', { x: 1680, o: 1 }, 2.45, 0.5, 'power3.out');
      s.face('adult2', true, 2.6, 0.3); s.mouth('adult2', 'smile', 2.6, 0.01); s.gaze('adult2', -8, 2, 2.6, 0.01);
      var yesB = s.div('bubble tail-r soft', { left: 1480, top: 420 }, null, 'Здорово!');
      s.pop(yesB, 2.7, { from: 0.7, dur: 0.4, origin: '90% 100%' }); s.out(yesB, 4.2, { dur: 0.3 });
      var trail = s.node(ov, 'g', {});
      s.sk(trail, [[TX, 520], [TX - 6, 440], [TX + 4, 360], [TX - 2, 290]], { at: 3.1, dur: 0.6, seed: 805, color: ORANGE, width: 3.5, opacity: 0.6 });
      s.tween(rk, 3.0, { y: 0 }, { y: -230, duration: 1.0, ease: 'power2.in' });
      s.tween(rk, 4.0, { y: -230 }, { y: -250, duration: 0.8, ease: 'sine.out' });
      s.mouth('baby', 'smile', 3.0, 0.2); s.squash('baby', 0.92, 1.1, 3.1, 0.2); s.squash('baby', 1, 1, 3.3, 0.4, 'back.out(3)');
      var yes = s.text('label', 'Поддержка → <span class="acc">инициатива, целеустремлённость</span>', { left: 140, top: 450, width: 820, fontSize: 30 });
      s.fade(yes, 2.6, { y: 6 });
      // насмешка и запрет — башня рушится, замысел падает
      s.actor('adult2', { x: 1780, o: 0 }, 4.5, 0.4, 'power2.in');
      s.actor('adult', { x: 1780, y: 600, d: 140, o: 0 }, 4.6, 0.01);
      s.actor('adult', { x: 1680, o: 1 }, 4.7, 0.5, 'power2.out');
      var nob = s.div('bubble tail-r soft', { left: 1440, top: 420 }, null, 'Глупости. Нельзя!');
      s.pop(nob, 5.3, { from: 0.7, dur: 0.5, origin: '90% 100%' });
      s.out(trail, 5.6, { dur: 0.3 });
      var fall = [[-120, -28], [96, 40], [-40, -84], [170, 96]];
      blocks.forEach(function (b, i) {
        s.tween(b, 5.9 + i * 0.05, { x: 0, y: 0, rotation: 0 }, { x: fall[i][0], y: i * SZ, rotation: fall[i][1], duration: 0.5, ease: 'power2.in', transformOrigin: '50% 50%' });
      });
      s.tween(rk, 5.9, { y: -250, rotation: 0, opacity: 1 }, { y: 300, rotation: 70, opacity: 0.2, duration: 0.8, ease: 'power2.in', transformOrigin: '50% 50%' });
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
