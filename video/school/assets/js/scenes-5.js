/* Итог: что вырастает (рефлексия), «паспорт возраста», финал — игра на площадке и цитата, «Приходите на курс» */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';

  // 4:45 — Что вырастает: Миша сам проверяет работу меркой; двойник смотрит со стороны (Д. Б. Эльконин, В. В. Давыдов)
  Film.scene({
    id: 'grow', bars: 5,
    build: function (s) {
      var g = s.svg({ top: 40 }), ov = s.over({ top: 40 });
      K().cast(s, 'misha', 760, 640, 130, 0, { mouth: 'soft', gx: 8, gy: 5 });
      K().desk(s, g, 760, 700, 1.3);
      // тетрадь с палочками; одна кривая
      s.node(g, 'rect', { x: 980, y: 470, width: 540, height: 290, rx: 6, fill: '#FFFDF8', stroke: '#D9D0C4', 'stroke-width': 2 });
      for (var y = 500; y < 760; y += 30) s.path(g, 'M980 ' + y + ' H1520', { stroke: '#DCE8EC', 'stroke-width': 1.5 });
      for (var x = 1000; x < 1520; x += 30) s.path(g, 'M' + x + ' 470 V760', { stroke: '#DCE8EC', 'stroke-width': 1.5 });
      var bad;
      for (var i = 0; i < 7; i++) {
        var sx = 1040 + i * 65;
        var st = s.path(g, i === 4 ? 'M' + (sx - 20) + ' 560 L' + (sx + 18) + ' 680' : 'M' + sx + ' 560 V680', { stroke: K().DEEP, 'stroke-width': 7 });
        if (i === 4) bad = st;
      }
      // мерка едет вдоль палочек и останавливается у кривой
      var ruler = s.node(ov, 'rect', { x: 1060, y: 545, width: 24, height: 150, rx: 4, fill: '#C9A27A', stroke: INK, 'stroke-width': 2.5 });
      s.tween(ruler, 0.9, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4 });
      s.tween(ruler, 1.4, { x: 0 }, { x: 266, duration: 1.2, ease: 'power1.inOut' });
      s.gaze('baby', 9, 3, 1.4, 1.2);
      s.tween(bad, 2.8, { opacity: 1 }, { opacity: 0, duration: 0.25 });
      var fix = s.path(g, 'M1300 560 V680', { stroke: K().DEEP, 'stroke-width': 7 });
      s.draw(fix, 3.0, { dur: 0.4 });
      s.mouth('baby', 'smile', 3.3, 0.3);
      s.out(ruler, 4.0, { dur: 0.4 });
      // двойник: контур сбоку смотрит на Мишу
      var dbl = s.node(ov, 'g', {});
      s.node(dbl, 'circle', { cx: 560, cy: 470, r: 72, fill: 'none', stroke: K().DEEP, 'stroke-width': 4, 'stroke-dasharray': '10 9' });
      s.node(dbl, 'circle', { cx: 572, cy: 466, r: 6, fill: K().DEEP });
      s.node(dbl, 'circle', { cx: 600, cy: 466, r: 6, fill: K().DEEP });
      s.tween(dbl, 3.4, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' });
      // вехи трёх дорожек — четыре слова
      [['по правилу', 'misha', 0.4], ['в уме', 'anya', 0.8], ['нарочно', 'dima', 1.2], ['со стороны', null, 3.5]].forEach(function (w, i) {
        var cx = 330 + i * 420;
        var d = s.node(g, 'circle', { cx: cx - 110, cy: 862, r: 11, fill: w[1] ? K().KIDC[w[1]] : K().DEEP });
        s.pop(d, w[2], { from: 0.3, dur: 0.4 });
        var e = s.text('kidhand', w[0], { left: cx - 90, top: 872, fontSize: 48, color: '#13534D' });
        s.fade(e, w[2] + 0.1, { y: 6 });
      });
      var t1 = s.text('h3', 'Главное, что вырастает, — <span class="acc">рефлексия</span>: умение посмотреть на себя со стороны и проверить, как я думаю и учусь.', { left: 140, top: 140, width: 1640, fontSize: 44 });
      s.lines(t1, 4.0);
      var c = s.text('cite', 'ближе всего — metacognition · Д. Б. Эльконин, В. В. Давыдов', { left: 140, top: 1010, fontSize: 20 });
      s.fade(c, 5.0, { y: 4 });
      s.actor('baby', { o: 0 }, 12.1, 0.3);
    }
  });

  // 4:57,5 — Что запомнить: «паспорт возраста» (семь строк); фамилии — одной колонкой справа
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Ученик: дело оценивает общественный взрослый — учитель', 'Д. Б. Эльконин'],
        ['Ведущая деятельность', 'Учебная (игра остаётся)', 'Д. Б. Эльконин, В. В. Давыдов'],
        ['Доминирующая функция', 'Мышление: память и внимание становятся произвольными', 'Л. С. Выготский'],
        ['Новообразования', 'Рефлексия, произвольность, внутренний план действий', ''],
        ['Кризис', 'Нет: стабильный период; впереди — подростковый кризис', 'Д. Б. Эльконин'],
        ['Психосоциальная стадия', 'Трудолюбие против неполноценности', 'Э. Эриксон'],
        ['Стадия мышления', 'Конкретные операции: логика на вещах', 'Ж. Пиаже']
      ];
      var col = s.div('', { left: 140, top: 310, width: 1640, display: 'flex', flexDirection: 'column', gap: '0px' });
      rows.forEach(function (r, i) {
        var row = Film.el('div', 'passport-row', col);
        row.style.padding = '22px 0 22px';
        var kk = Film.el('div', 'passport-k', row, r[0]);
        kk.style.width = '420px';
        var v = Film.el('div', 'passport-v', row, r[1]);
        v.style.fontSize = '31px'; v.style.flex = '1';
        var a = Film.el('div', 'passport-a', row, r[2]);
        a.style.width = '360px';
        s.fade(row, 0.8 + i * 0.8, { y: 10, dur: 0.7 });
      });
    }
  });

  // 5:10 — Финал: площадка, трое играют; палочка из пенала снова становится лошадью; Миша прыгает выше всех — наезд; цитата
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over(), GY = 800;
      s.path(g, 'M0 ' + GY + ' H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      K().tree(s, g, 1840, GY, 1.0);
      // горка
      s.path(g, 'M180 ' + GY + ' V520 H250 V' + GY + ' M250 540 Q330 560 380 700 Q410 780 470 ' + GY, { stroke: INK, 'stroke-width': 5 });
      s.path(g, 'M180 560 H250 M180 620 H250 M180 680 H250 M180 740 H250', { stroke: INK, 'stroke-width': 3 });
      // качели
      s.path(g, 'M1450 ' + GY + ' L1520 500 L1590 ' + GY + ' M1640 ' + GY + ' L1710 500 L1780 ' + GY + ' M1500 500 H1730', { stroke: INK, 'stroke-width': 5 });
      var sw = s.node(g, 'g', {});
      s.path(sw, 'M1580 500 V690 M1650 500 V690', { stroke: INK, 'stroke-width': 2.5 });
      s.node(sw, 'rect', { x: 1570, y: 688, width: 90, height: 12, rx: 4, fill: '#C9A27A', stroke: INK, 'stroke-width': 2.5 });
      K().classmate(sw, 7, 1615, 646, 36, { mouth: 'smile' });
      s.tween(sw, 0, { rotation: -10, svgOrigin: '1615 500' }, { rotation: 10, duration: 1.6, ease: 'sine.inOut', repeat: 1, yoyo: true });
      K().classmate(g, 9, 230, 480, 34, { mouth: 'smile' });
      K().classmate(g, 11, 1300, GY - 38, 38, { mouth: 'smile' });
      K().classmate(g, 13, 1390, GY - 34, 34, { mouth: 'smile' });
      // скамейка с пеналом
      K().bench(s, g, 400, GY, 0.9);
      s.node(g, 'rect', { x: 350, y: 726, width: 90, height: 20, rx: 8, fill: '#26A69A', stroke: INK, 'stroke-width': 2.5 });
      K().cast(s, 'dima', 560, GY - 45, 90, 0.05, { gx: 8 });
      K().cast(s, 'misha', 940, GY - 45, 90, 0.05, { gx: -6 });
      K().cast(s, 'anya', 1150, GY - 45, 90, 0.05, { gx: -8 });
      // палочка из пенала → лошадь
      var stick = s.path(g, 'M395 730 L395 650', { stroke: '#8B6A45', 'stroke-width': 9 });
      s.tween(stick, 0.1, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.tween(stick, 0.3, { x: 0, y: 0 }, { x: 215, y: -20, duration: 0.4, ease: 'power2.inOut' });
      s.set(stick, 0.7, { opacity: 1 }, { opacity: 0 });
      var horse = Film.icons.horse(s, ov, 610, 740, 0.6, { stick: 120, at: 0.7, dur: 0.6, seed: 5 });
      [1.3, 1.95].forEach(function (t) { s.hop('kid3', s.A.kid3.st.x + 70, GY - 45, t, 0.5, 46); Film.ride(s, horse, 70, t, 0.5, 46); });
      s.mouth('kid3', 'smile', 1.3, 0.2);
      // Миша прыгает выше всех
      s.hop('baby', 940, GY - 45, 1.5, 0.7, 190);
      s.hop('kid2', 1150, GY - 45, 1.6, 0.4, 50);
      s.gaze('kid2', -6, -6, 1.6, 0.3); s.gaze('kid3', 6, -4, 2.4, 0.3);
      s.cam({ cx: 960, cy: 640, z: 1.2 }, 0, 0.01);
      s.cam({ cx: 940, cy: 857, z: 1.5 }, 2.4, 1.0, 'power2.inOut');
      var q = s.hud('quote', '«Ребёнок понимает, что мир не вращается вокруг него. Зато он может играть по-крупному и научиться многому — могущество от слова „могу“»', { left: 190, top: 680, width: 1540, textAlign: 'center', fontSize: 42, background: 'rgba(255, 253, 248, 0.94)', padding: '14px 24px 16px', borderRadius: 14 });
      s.tween(q, 3.0, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      var c = s.hud('cite', 'из лекции курса «Психология развития» о младшем школьном возрасте', { left: 360, top: 930, width: 1200, textAlign: 'center' });
      s.tween(c, 3.6, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.out([q, c], 12.0, { dur: 0.4 });
      ['baby', 'kid2', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, 12.1, 0.3); });
    }
  });

  // 5:22,5 — Приходите на курс: QR-коды; карта курса; ребёнок переходит к 10–13
  Film.scene({
    id: 'final', bars: 3, hold: true,
    build: function (s) {
      s.brandOut(0.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 196, top: 92, height: 96 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 0.3, { y: 10, dur: 0.9 });
      var h = s.text('h2', 'Приходите на курс', { left: 0, top: 220, width: 1920, textAlign: 'center' });
      s.lines(h, 0.6);
      var QR = window.FILM_QR || {};
      [['course', 'Курс «Психология развития»', 'academydom.com/vozrast', 530], ['tg', 'Телеграм-канал', 't.me/AlexeiZykov', 1010]].forEach(function (c, i) {
        var card = s.div('card', { left: c[3], top: 350, width: 380, height: 452 });
        var q = QR[c[0]];
        if (q) {
          var sv = Film.svg('svg', { width: 290, height: 290, viewBox: '0 0 ' + q.n + ' ' + q.n, 'shape-rendering': 'crispEdges' }, card);
          sv.style.position = 'absolute'; sv.style.left = '45px'; sv.style.top = '35px';
          Film.svg('path', { d: q.d, fill: INK }, sv);
        }
        var t = Film.el('div', 'label', card, c[1]);
        Film.css(t, { position: 'absolute', left: 0, top: 344, width: 380, textAlign: 'center', fontSize: 25 });
        var u = Film.el('div', 'note', card, c[2]);
        Film.css(u, { position: 'absolute', left: 0, top: 384, width: 380, textAlign: 'center', fontSize: 23, color: '#13534D', fontWeight: 650 });
        s.fade(card, 1.0 + i * 0.3, { y: 16, dur: 0.7 });
      });
      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 0.3);
      var cur = s.CFG.series.current, nx = s.CFG.series.next;
      var cx = M.x(cur) + M.segW / 2, nxX = M.x(nx) + M.segW / 2, Y = s.RY - 24;
      s.face('baby', false, 0, 0.01);
      s.actor('baby', { x: cx, y: Y, d: 40, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.3, 0.4);
      s.mapNext(M, 3.6);
      s.hop('baby', nxX, Y, 3.9, 0.5, 60);
      var ann = s.text('note', 'Далее: ранняя подростковость, 10–13 лет', { left: nxX - 340, top: s.RY - 92, width: 680, textAlign: 'center', color: '#5E35B1', fontWeight: 650 });
      s.fade(ann, 4.3, { y: 6 });
    }
  });
})();
