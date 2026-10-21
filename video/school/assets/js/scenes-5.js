/* Итог (v3.2): что вырастает (рефлексия — облачко-схема с меркой), «паспорт возраста» с разными авторами,
   финал — игра на площадке и цитата, «Приходите на курс» (Миша перескакивает на «10–13» — и у него появляется чёлка) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', STICK = '#8B6A45';

  // 5:05 — Что вырастает: перед тем как сдать тетрадь, Миша сам проверяет её — в облачке мерка проходит по палочкам
  // и находит кривую; Миша её исправляет (рефлексия; метапознание — Дж. Флейвелл, 1979)
  Film.scene({
    id: 'grow', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over(), FL = 880, D = 150, MX = 1050, MY = 745, LN = { stroke: '#2B3440', 'stroke-width': 2.6 };
      // парта и стул (тонкой линией, как в классе): Миша сидит лицом к парте, тетрадь раскрыта на парте
      s.path(g, 'M390 ' + FL + ' H1390', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.node(g, 'rect', { x: 490, y: 760, width: 450, height: 12, rx: 3, fill: '#E9D9BF', stroke: '#2B3440', 'stroke-width': 2.4 });
      s.path(g, 'M510 772 V' + FL + ' M920 772 V' + FL, LN);
      s.path(g, 'M985 820 H1135 M1135 820 V690 M1000 820 V' + FL + ' M1122 820 V' + FL, LN);
      var pg = s.node(g, 'g', {}); Film.places.page(s, pg, 520, 500, 400, 260, { cell: 26 });
      s.fade(pg, 0.05, { y: 8, dur: 0.4 });
      var SX = function (i) { return 580 + i * 44; }, BAD = 4, bad = null;
      for (var i = 0; i < 7; i++) {
        var st = s.path(pg, i === BAD ? 'M' + (SX(i) - 12) + ' 560 L' + (SX(i) + 12) + ' 680' : 'M' + SX(i) + ' 560 V680', { stroke: K().DEEP, 'stroke-width': 6 });
        if (i === BAD) bad = st;
      }
      K().cast(s, 'misha', MX, MY, D, 0, { dur: 0.3, mouth: 'soft', gx: -8, gy: 3 });
      s.hands('baby', 'desk', 0, 0.01);
      // облачко-схема над Мишей: те же палочки по линейке, мерка идёт по ним
      Film.icons.cloud(s, ov, 1240, 400, 250, 125, { tail: [1080, 668], at: 0.3, dur: 0.6, seed: 4 });
      var sch = s.node(ov, 'g', {}), CX = function (i) { return 1080 + i * 54; }, cBad;
      for (var j = 0; j < 7; j++) {
        var cs = s.path(sch, j === BAD ? 'M' + (CX(j) - 12) + ' 360 L' + (CX(j) + 12) + ' 440' : 'M' + CX(j) + ' 360 V440', { stroke: INK, 'stroke-width': 5 });
        if (j === BAD) cBad = cs;
      }
      s.tween(sch, 0.9, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var merka = s.node(ov, 'rect', { x: CX(0) + 10, y: 354, width: 12, height: 92, rx: 3, fill: '#26A69A', stroke: INK, 'stroke-width': 2 });
      s.tween(merka, 1.2, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.tween(merka, 1.3, { x: 0 }, { x: 54 * BAD, duration: 1.2, ease: 'steps(4)' });
      s.gaze('baby', 6, -7, 1.2, 0.3); s.brow('baby', 'focus', 1.2, 0.3);
      s.tween(cBad, 2.6, { attr: { stroke: INK } }, { attr: { stroke: '#D9534F' }, duration: 0.25 });
      s.brow('baby', 'doubt', 2.6, 0.3); s.mouth('baby', 'flat', 2.6, 0.3);
      // Миша сам исправляет палочку в тетради — и в облачке она выпрямляется
      s.gaze('baby', -8, 3, 3.0, 0.3);
      s.out(bad, 3.2, { dur: 0.25 });
      var fix = s.path(pg, 'M' + SX(BAD) + ' 560 V680', { stroke: K().DEEP, 'stroke-width': 6 }); s.draw(fix, 3.4, { dur: 0.4 });
      s.out(cBad, 3.5, { dur: 0.2 });
      var cFix = s.path(sch, 'M' + CX(BAD) + ' 360 V440', { stroke: INK, 'stroke-width': 5 }); s.draw(cFix, 3.6, { dur: 0.3 });
      s.brow('baby', 'proud', 3.9, 0.3); s.mouth('baby', 'smile', 3.9, 0.3);
      // строчки глав сходятся в четыре слова
      var words = s.text('kidhand', 'по правилу · в уме · нарочно · <span class="acc">со стороны</span>', { left: 0, top: 902, width: 1920, textAlign: 'center', fontSize: 50, color: '#2E3B4E' });
      s.fade(words, 0.3, { y: 6 });
      var t1 = s.text('h3', 'Главное, что вырастает, — <span class="acc">рефлексия</span>: умение посмотреть на себя со стороны и проверить, как я думаю и учусь.', { left: 140, top: 128, width: 1640, fontSize: 44 });
      s.lines(t1, 4.3);
      var c = s.text('cite', 'на Западе это называют метапознанием — metacognition (Дж. Флейвелл, 1979)', { left: 140, top: 1020, fontSize: 20 });
      s.fade(c, 5.0, { y: 4 });
      s.actor('baby', { o: 0 }, s.dur - 0.4, 0.3); s.hands('baby', 'off', s.dur - 0.1, 0.01);
    }
  });

  // 5:17,5 — Что запомнить: «паспорт возраста» (семь строк); у строк разные авторы — одной колонкой справа
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Ученик: дело оценивает общественный взрослый — учитель', 'Д. Б. Эльконин'],
        ['Ведущая деятельность', 'Учебная (игра остаётся)', 'В. В. Давыдов'],
        ['Доминирующая функция', 'Мышление: память и внимание становятся произвольными', 'Л. С. Выготский'],
        ['Новообразования', 'Произвольность, внутренний план действий, рефлексия', 'Дж. Флейвелл (метапознание)'],
        ['Кризис', 'Нет: стабильный период; впереди — подростковый кризис', ''],
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

  // 5:30 — Финал: площадка — трое и одноклассники играют; палочка из пенала снова становится лошадкой (рифма с крючком);
  // Миша прыгает выше всех — наезд; между тремя — линии; цитата, когда движение затихло
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over(), yd = Film.places.yard(s, g, { cx: 760, ck: 1.1 }), cells = yd.classics.cells;
      var net = s.node(g, 'g', {}), kg = s.node(g, 'g', {});
      var M = [900, 800, 100], A = [1290, 745, 84], Dm = [1350, 815, 92];
      // одноклассники: один прыгает в классики, двое перекидываются мячом у школы
      var hp = s.node(kg, 'g', {}), c0 = cells[0], hy = function (c) { return c.y - 38; };
      K().classmate(hp, 6, 0, 0, 34, { gx: 6 }); s.set(hp, 0, { x: c0.x, y: hy(c0) }, { x: c0.x, y: hy(c0) });
      [1, 2, 3, 5].forEach(function (ci, i) {
        var a = cells[[0, 1, 2, 3][i]], b = cells[ci], t = 0.2 + i * 0.5;
        s.tween(hp, t, { x: a.x }, { x: b.x, duration: 0.3, ease: 'sine.inOut' });
        s.tween(hp, t, { y: hy(a) }, { y: hy(a) - 40, duration: 0.15, ease: 'power2.out' });
        s.tween(hp, t + 0.15, { y: hy(a) - 40 }, { y: hy(b), duration: 0.15, ease: 'power2.in' });
      });
      [[1, 190, 812, 40, 6], [11, 610, 790, 38, -6]].forEach(function (c) { K().classmate(kg, c[0], c[1], c[2], c[3], { gx: c[4] }); });
      var bl = s.node(kg, 'g', {}); K().ball(s, bl, 0, 0, 15);
      s.set(bl, 0, { x: 230, y: 806 }, { x: 230, y: 806 });
      [[230, 806, 570, 800, 0.4], [570, 800, 230, 806, 1.4], [230, 806, 570, 800, 2.4]].forEach(function (p) {
        s.tween(bl, p[4], { x: p[0] }, { x: p[2], duration: 0.8, ease: 'none' });
        s.tween(bl, p[4], { y: p[1] }, { y: 690, duration: 0.4, ease: 'power2.out' });
        s.tween(bl, p[4] + 0.4, { y: 690 }, { y: p[3], duration: 0.4, ease: 'power2.in' });
      });
      // герои
      K().cast(s, 'misha', M[0], M[1], M[2], 0, { dur: 0.01, gx: 7 });
      K().cast(s, 'anya', A[0], A[1], A[2], 0, { dur: 0.01, gx: -6 });
      K().cast(s, 'dima', Dm[0], Dm[1], Dm[2], 0, { dur: 0.01, gx: -6 });
      // пенал на скамейке; палочка из него — к Мише и становится рисованной лошадкой
      s.node(g, 'rect', { x: 1352, y: 632, width: 78, height: 18, rx: 8, fill: '#26A69A', stroke: '#2B3440', 'stroke-width': 2.4 });
      s.path(g, 'M1360 641 H1422', { stroke: '#F5D27A', 'stroke-width': 2.4 }); // молния пенала
      var stG = s.node(g, 'g', {}), hoG = s.node(ov, 'g', {}), k = M[2] / 110;
      var tip = [M[0] + 140 * k, M[1] - 90 * k], butt = [M[0] - 170 * k, M[1] + 110 * k];
      var stick = s.node(stG, 'line', { x1: 1360, y1: 641, x2: 1420, y2: 641, stroke: STICK, 'stroke-width': 10, 'stroke-linecap': 'round' });
      s.tween(stick, 0.3, { attr: { x1: 1360, y1: 641, x2: 1420, y2: 641 } }, { attr: { x1: butt[0], y1: butt[1], x2: tip[0], y2: tip[1] }, duration: 0.6, ease: 'power2.inOut' });
      s.hands('baby', 'hold', 0.5, 0.3); s.gaze('baby', 8, -3, 0.3, 0.3);
      Film.icons.horse(s, hoG, tip[0], tip[1], k, { at: 0.75, dur: 0.55, seed: 5 });
      s.mouth('baby', 'smile', 0.9, 0.3); s.brow('baby', 'proud', 0.9, 0.3);
      // Дима — с игрушечной лошадкой в руке
      var toy = s.node(g, 'g', {}); K().toyHorse(s, toy, Dm[0] + 70, Dm[1] + 40, 0.55); s.hands('kid3', 'hold', 0, 0.01);
      // галоп: Миша скачет на палочке, Дима — с лошадкой, Аня подпрыгивает
      [1.3, 1.75].forEach(function (t) {
        s.hop('baby', s.A.baby.st.x + 70, M[1], t, 0.42, 40); Film.ride(s, stG, 70, t, 0.42, 40); Film.ride(s, hoG, 70, t, 0.42, 40);
        s.hop('kid3', s.A.kid3.st.x + 60, Dm[1], t + 0.1, 0.42, 34); Film.ride(s, toy, 60, t + 0.1, 0.42, 34);
      });
      s.hands('kid2', 'up', 1.5, 0.3); s.hop('kid2', A[0], A[1], 1.6, 0.4, 44); s.mouth('kid3', 'smile', 1.5, 0.3);
      // Миша прыгает выше всех — наезд
      var MF = M[0] + 140, DF = Dm[0] + 120;
      s.hop('baby', MF, M[1], 2.2, 0.7, 200); Film.ride(s, stG, 0, 2.2, 0.7, 200); Film.ride(s, hoG, 0, 2.2, 0.7, 200);
      s.gaze('kid2', -6, -6, 2.3, 0.3); s.gaze('kid3', -6, -6, 2.3, 0.3);
      s.cam({ cx: 1190, cy: 662, z: 1.32 }, 2.15, 1.0, 'power2.inOut');
      s.hands('kid2', 'side', 2.7, 0.3);
      s.gaze('baby', 6, 0, 3.1, 0.3); s.gaze('kid2', -5, 2, 3.1, 0.3); s.gaze('kid3', -6, 0, 3.1, 0.3);
      // линии между тремя: все трое теперь вместе
      [[[MF, M[1]], A], [A, [DF, Dm[1]]], [[MF, M[1]], [DF, Dm[1]]]].forEach(function (p, i) {
        var l = s.path(net, 'M' + p[0][0] + ' ' + p[0][1] + ' L' + p[1][0] + ' ' + p[1][1], { stroke: '#2B8F84', 'stroke-width': 3.2 });
        s.draw(l, 2.95 + i * 0.12, { dur: 0.45, ease: 'power1.inOut' });
      });
      var q = s.hud('', '<div class="quote" style="font-size: 42px;">«Ребёнок понимает, что мир не вращается вокруг него. Зато он может играть по-крупному и научиться многому — могущество от слова „могу“»</div>' +
        '<div class="cite" style="margin-top: 12px; font-size: 21px;">из лекции курса «Психология развития» о младшем школьном возрасте</div>',
        { left: 140, top: 140, width: 1640, textAlign: 'center', background: 'rgba(255, 253, 248, 0.94)', padding: '14px 24px 16px', borderRadius: 14 });
      s.tween(q, 3.25, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      s.out(q, s.dur - 0.5, { dur: 0.4 });
      ['baby', 'kid2', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); s.hands(id, 'off', s.dur - 0.1, 0.01); });
    }
  });

  // 5:42,5 — Приходите на курс: QR-коды курса и канала; карта курса; Миша перескакивает на «10–13» — в прыжке у него появляется чёлка
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
      var cx = M.x(cur) + M.segW / 2, nxX = M.x(nx) + M.segW / 2, DM = 56, Y = s.RY - 5 - DM / 2;
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.brow('baby', 'calm', 0, 0.01); s.gaze('baby', 6, 0, 0, 0.01);
      s.hands('baby', 'off', 0, 0.01);
      s.actor('baby', { x: cx, y: Y, d: DM, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.3, 0.4);
      // чёлка (10–13): появляется на Мише в прыжке — следующий возраст рисуется по-новому
      var fr = Film.svg('svg', { viewBox: '0 0 100 100', overflow: 'visible' }, s.A.baby.body);
      fr.style.position = 'absolute'; fr.style.inset = '0'; fr.style.overflow = 'visible';
      Film.svg('path', { d: 'M9 36 Q14 0 50 -2 Q86 0 91 36 Q82 22 70 24 Q61 13 49 21 Q37 12 26 23 Q16 22 9 36 Z', fill: '#5A3B2E' }, fr);
      s.mapNext(M, 3.6);
      s.hop('baby', nxX, Y, 3.9, 0.5, 70);
      s.tween(fr, 4.12, { opacity: 0, scale: 0.6, transformOrigin: '50% 30%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
      s.brow('baby', 'proud', 4.12, 0.25);
      var ann = s.text('note', 'Далее: ранняя подростковость, 10–13 лет', { left: nxX - 340, top: s.RY - 118, width: 680, textAlign: 'center', color: '#5E35B1', fontWeight: 650 });
      s.fade(ann, 4.3, { y: 6 });
    }
  });
})();
