/* Итог: что вырастает (рефлексия), «паспорт возраста», финал — отъезд под цитату, «Приходите на курс» */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';

  // 3:22,5 — Что вырастает: линии глав сходятся; двойник-наблюдатель сбоку (Д. Б. Эльконин, В. В. Давыдов)
  Film.scene({
    id: 'grow', bars: 4,
    build: function (s) {
      var g = s.svg(), ov = s.over(), CX = 1310, CY = 640;
      s.actor('baby', { x: CX, y: CY, d: 110, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.2, 0.4);
      s.face('baby', true, 0.3, 0.2); s.mouth('baby', 'soft', 0.3, 0.01); s.gaze('baby', 0, 6, 0.3, 0.01);
      K().desk(s, ov, CX, CY + 64, 1.1);
      [['по правилу', 860, 330], ['в уме', 1760, 330], ['нарочно', 860, 940], ['со стороны', 1760, 940]].forEach(function (l, i) {
        var e = s.text('kidhand', l[0], { left: l[1] - 90, top: l[2] - 30, width: 180, textAlign: 'center', fontSize: 40 });
        s.fade(e, 0.4 + i * 0.25, { y: 6 });
        var p = s.path(g, 'M' + l[1] + ' ' + (l[2] + (l[2] < 600 ? 30 : -40)) + ' L' + (CX + (l[1] < CX ? -70 : 70)) + ' ' + (CY + (l[2] < 600 ? -60 : 60)), { stroke: K().TEAL, 'stroke-width': 3, 'stroke-dasharray': '6 8' });
        s.dash(p, 0.6 + i * 0.25, { dur: 0.6 });
      });
      // двойник: контур сбоку смотрит на ребёнка (в 3–7 контур был «на голову выше»)
      var dbl = s.node(ov, 'g', {});
      s.node(dbl, 'circle', { cx: CX + 200, cy: CY - 40, r: 55, fill: 'none', stroke: K().DEEP, 'stroke-width': 4, 'stroke-dasharray': '10 9' });
      s.node(dbl, 'circle', { cx: CX + 176, cy: CY - 48, r: 5, fill: K().DEEP });
      s.node(dbl, 'circle', { cx: CX + 196, cy: CY - 48, r: 5, fill: K().DEEP });
      s.tween(dbl, 2.4, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' });
      var t1 = s.text('h3', 'Главное новообразование — <span class="term acc">рефлексия<span class="en">ближе всего metacognition</span></span>', { left: 140, top: 150, width: 1640 });
      s.fade(t1, 3.4, { y: 10 });
      var t2 = s.text('lead', 'Видеть, как я думаю и учусь.', { left: 140, top: 300, width: 560 });
      s.lines(t2, 5.6);
      var c = s.text('cite', 'Д. Б. Эльконин, В. В. Давыдов', { left: 140, top: 990, fontSize: 20 });
      s.fade(c, 6.0, { y: 4 });
      s.actor('baby', { o: 0 }, 9.4, 0.4);
    }
  });

  // 3:32,5 — Что запомнить: «паспорт возраста» (семь строк); фамилии — одной колонкой справа
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Ученик: дело оценивает общественный взрослый — учитель', 'Д. Б. Эльконин'],
        ['Ведущая деятельность', 'Учебная', 'Д. Б. Эльконин, В. В. Давыдов'],
        ['Доминирующая функция', 'Мышление: память и внимание становятся произвольными', 'Л. С. Выготский'],
        ['Новообразования', 'Рефлексия, произвольность, внутренний план действий', ''],
        ['Кризис', 'Нет: стабильный период; впереди — подростковый кризис', 'Д. Б. Эльконин'],
        ['Психосоциальная стадия', 'Трудолюбие против неполноценности', 'Э. Эриксон'],
        ['Стадия мышления', 'Конкретные операции: логика на вещах', 'Ж. Пиаже']
      ];
      var col = s.div('', { left: 140, top: 310, width: 1640, display: 'flex', flexDirection: 'column', gap: '0px' });
      rows.forEach(function (r, i) {
        var row = Film.el('div', 'passport-row', col);
        row.style.padding = '14px 0 14px';
        var kk = Film.el('div', 'passport-k', row, r[0]);
        kk.style.width = '420px';
        var v = Film.el('div', 'passport-v', row, r[1]);
        v.style.fontSize = '29px'; v.style.flex = '1';
        var a = Film.el('div', 'passport-a', row, r[2]);
        a.style.width = '360px';
        s.fade(row, 0.8 + i * 0.8, { y: 10, dur: 0.7 });
      });
    }
  });

  // 3:45 — Финал: вещи эпизода кружат вокруг ребёнка → отъезд; цитата из лекции (мир не вращается вокруг него)
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      var CX = 960, CY = 470, ov = s.over();
      s.actor('baby', { x: CX, y: CY, d: 100, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.2, 0.5);
      s.face('baby', true, 0.3, 0.3); s.mouth('baby', 'smile', 0.3, 0.01); s.gaze('baby', 0, -2, 0.3, 0.01);
      // значки эпизода по кругу: палочка, стакан, числовая прямая, медведь, шахматная фигура, велосипед
      var orb = s.node(ov, 'g', {}), R = 210, a = { fill: 'none', stroke: K().DEEP, 'stroke-width': 4 };
      var ICON = [
        function (x, y) { s.path(orb, 'M' + x + ' ' + (y - 34) + ' V' + (y + 34), { stroke: '#8B6A45', 'stroke-width': 8 }); },
        function (x, y) { s.node(orb, 'rect', { x: x - 18, y: y + 4, width: 36, height: 26, fill: '#9CC3D5' }); s.path(orb, 'M' + (x - 22) + ' ' + (y - 30) + ' V' + (y + 30) + ' H' + (x + 22) + ' V' + (y - 30), a); },
        function (x, y) { s.path(orb, 'M' + (x - 44) + ' ' + y + ' H' + (x + 44) + ' M' + (x - 44) + ' ' + (y - 10) + ' V' + (y + 10) + ' M' + (x + 44) + ' ' + (y - 10) + ' V' + (y + 10) + ' M' + (x - 14) + ' ' + (y - 14) + ' V' + (y + 14), a); },
        function (x, y) { s.node(orb, 'ellipse', Object.assign({ cx: x - 6, cy: y, rx: 34, ry: 20 }, a)); s.node(orb, 'circle', Object.assign({ cx: x + 32, cy: y - 10, r: 13 }, a)); },
        function (x, y) { s.path(orb, 'M' + (x - 22) + ' ' + (y + 30) + ' H' + (x + 22) + ' M' + (x - 14) + ' ' + (y + 30) + ' Q' + (x - 8) + ' ' + y + ' ' + (x - 16) + ' ' + (y - 10) + ' Q' + (x - 4) + ' ' + (y - 34) + ' ' + (x + 18) + ' ' + (y - 22) + ' L' + (x + 14) + ' ' + (y + 30), a); },
        function (x, y) { s.node(orb, 'circle', Object.assign({ cx: x - 24, cy: y + 12, r: 16 }, a)); s.node(orb, 'circle', Object.assign({ cx: x + 24, cy: y + 12, r: 16 }, a)); s.path(orb, 'M' + (x - 24) + ' ' + (y + 12) + ' L' + (x - 4) + ' ' + (y - 14) + ' L' + (x + 24) + ' ' + (y + 12), a); }
      ];
      ICON.forEach(function (f, i) { var an = -Math.PI / 2 + i * Math.PI / 3; f(CX + R * Math.cos(an), CY + R * Math.sin(an)); });
      s.tween(orb, 0.4, { opacity: 0, scale: 0.6, svgOrigin: CX + ' ' + CY }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
      s.tween(orb, 0.4, { rotation: 0, svgOrigin: CX + ' ' + CY }, { rotation: 120, duration: 4.0, ease: 'sine.inOut' });
      // отъезд: класс, школа — ребёнок становится точкой
      var g = s.svg(), city = s.node(g, 'g', { opacity: 0 });
      K().classroom(s, city, { vx: CX, vy: CY - 600, front: CY + 900, back: CY + 420, rows: 3, cols: 7 });
      Film.icons.school(s, city, CX - 900, CY - 300, 3.2, { at: 2.6, dur: 1.0, seed: 77 });
      s.tween(city, 2.6, { opacity: 0 }, { opacity: 0.55, duration: 1.0 });
      s.tween([city, orb], 3.6, { opacity: 0.55 }, { opacity: 0.14, duration: 0.8 }); // под цитату — приглушить
      s.cam({ cx: CX, cy: CY, z: 1 }, 0, 0.01);
      s.cam({ cx: CX, cy: CY + 80, z: 0.42 }, 2.4, 3.0, 'power2.inOut');
      var q = s.hud('quote', '«Ребёнок понимает, что мир не вращается вокруг него. Зато он может играть по-крупному и научиться многому — могущество от слова „могу“»', { left: 210, top: 690, width: 1500, textAlign: 'center', fontSize: 42 });
      s.tween(q, 3.4, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' });
      s.tween(q, 12.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      var c = s.hud('cite', 'из лекции курса «Психология развития» о младшем школьном возрасте', { left: 360, top: 900, width: 1200, textAlign: 'center' });
      s.tween(c, 4.6, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      s.tween(c, 12.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.actor('baby', { o: 0 }, 12.0, 0.4);
    }
  });

  // 3:57,5 — Приходите на курс: QR-коды; карта курса; ребёнок переходит к 10–13
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
