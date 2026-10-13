/* Лист стиля 7–10 (пробные кадры до сцен): когда идут в школу, порог школы, отъезд от ребёнка к классу, числовая прямая со стоп-кадром */
/* global Film */
(function () {
  'use strict';
  var S = function () { return Film.school; };

  // Шаги по сетке: ровные шаги в клетку с остановкой — сдержанная анимация возраста
  function gridWalk(s, id, x1, lt, o) {
    o = o || {};
    var x0 = s.A[id].st.x, step = o.step || 96, n = Math.max(1, Math.round(Math.abs(x1 - x0) / step)), d = (x1 - x0) / n, t = lt;
    for (var i = 0; i < n; i++) {
      s.squash(id, 1.04, 0.96, t, 0.08);            // подготовка шага
      s.actor(id, { x: x0 + d * (i + 1) }, t + 0.08, o.dur || 0.26, 'power2.inOut');
      if (o.carry) s.tween(o.carry, t + 0.08, { x: d * i }, { x: d * (i + 1), duration: o.dur || 0.26, ease: 'power2.inOut' });
      s.squash(id, 1, 1, t + 0.08, 0.2);
      t += (o.dur || 0.26) + (o.hold || 0.14);
    }
    return t - lt;
  }

  // 0. Сроки — это статистика: когда дети идут в первый класс в разных системах образования
  var AGES = [['Англия', 4, 5, 'с 4 лет — подготовительный класс, с 5 — обязательно'], ['США', 6, 6, ''], ['Германия', 6, 6, ''],
    ['Россия', 6.5, 8, 'с 6,5 до 8 лет — по закону'], ['Финляндия', 7, 7, '']];
  Film.scene({
    id: 'ages', bars: 4,
    build: function (s) {
      var K = S(), g = s.svg();
      s.set(s.R.svg, 0, { opacity: 1 }, { opacity: 0 }); // шкала возраста — только там, где речь о возрасте
      s.brandIn(0.1);
      var k = s.text('kicker', 'Сроки — это статистика', { left: 140, top: 120 });
      s.fade(k, 0.2, { y: 8 });
      var h = s.text('h3', 'Когда дети идут в первый класс', { left: 140, top: 156 });
      s.lines(h, 0.3);
      var X = function (a) { return 620 + (a - 4) * 270; }, Y0 = 380, DY = 104;
      [4, 5, 6, 7, 8].forEach(function (a, i) {
        var tk = s.path(g, 'M' + X(a) + ' ' + (Y0 - 50) + ' V' + (Y0 + DY * 4 + 40), { stroke: '#D9D0C4', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
        s.fade(tk, 0.5, { y: 0 });
        var lb = s.text('cite', a + (a < 5 ? ' года' : ' лет'), { left: X(a) - 60, top: Y0 + DY * 4 + 56, width: 120, textAlign: 'center' });
        s.fade(lb, 0.6 + i * 0.05, { y: 6 });
      });
      AGES.forEach(function (r, i) {
        var y = Y0 + i * DY, at = 1.0 + i * 0.45;
        var nm = s.text('lead', r[0], { left: 140, top: y - 28, fontSize: 34 });
        s.fade(nm, at, { y: 6 });
        var w = Math.max(28, X(r[2]) - X(r[1]));
        var bar = s.node(g, 'rect', { x: r[1] === r[2] ? X(r[1]) - 14 : X(r[1]), y: y - 14, width: w, height: 28, rx: 14, fill: r[0] === 'Россия' ? K.TEAL : '#9FD6CF' });
        s.grow(bar, at + 0.15, { dur: 0.6 });
        if (r[3]) { var nt = s.text('note', r[3], { left: X(r[1]), top: y + 18, fontSize: 21 }); s.fade(nt, at + 0.5, { y: 4 }); }
      });
      var c = s.text('lead', 'Границы возраста задаёт система образования. «7–10 лет» — условное название возраста начальной школы.', { left: 140, top: 900, width: 1300, fontSize: 30 });
      s.lines(c, 4.0);
      var src = s.text('cite', 'Eurydice, 2024; ФЗ «Об образовании в РФ», ст. 67', { left: 140, top: 1000, fontSize: 20 });
      s.fade(src, 4.6, { y: 4 });
    }
  });

  // 1. Порог: линия поля делит кадр — дом и родитель слева, класс и учитель справа
  Film.scene({
    id: 'threshold', bars: 4,
    build: function (s) {
      var K = S(), g = s.svg(), ov = s.over();
      // клетка — только по ту сторону линии: мир школы расчерчен
      var cells = s.div('cells', { left: 962, top: 0, width: 958, height: 1080 });
      s.set(cells, 0, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 100% 0% 0%)' });
      s.tween(cells, 3.0, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut' });
      var k = s.text('kicker', 'Социальная ситуация развития', { left: 140, top: 120 });
      s.fade(k, 0.2, { y: 8 });
      var h = s.text('h3', 'Две пары отношений', { left: 140, top: 156 });
      s.lines(h, 0.3);
      var c = s.text('cite', 'Д. Б. Эльконин', { left: 140, top: 222 });
      s.fade(c, 0.6, { y: 6 });
      K.ruled(s, g, 960, 300, 960, 1010, { at: 0.5, dur: 0.9, color: K.RED, width: 3 });
      K.house(s, g, 420, 900, 1, { at: 0.8, dur: 1.0 });
      K.board(s, g, 1270, 420, 520, 230, { at: 0.9 });
      var b1 = s.text('cursive', 'Первое сентября', { left: 1330, top: 490, color: '#F3EFE4', fontSize: 54 });
      s.fade(b1, 1.6, { y: 0 });
      // мама и ребёнок у дома; учитель у доски
      s.actor('adult', { x: 610, y: 880, d: 150, o: 0 }, 0.6, 0.01); s.actor('adult', { o: 1 }, 0.8, 0.5);
      s.actor('baby', { x: 720, y: 900, d: 100, o: 0 }, 0.6, 0.01); s.actor('baby', { o: 1 }, 0.9, 0.5);
      s.face('baby', true, 1.0, 0.3); s.mouth('baby', 'smile', 1.0, 0.01); s.gaze('baby', 10, -4, 1.0, 0.01);
      s.actor('adult2', { x: 1650, y: 820, d: 150, o: 0 }, 0.6, 0.01); s.actor('adult2', { o: 1 }, 1.2, 0.5);
      var bye = s.text('cursive', 'Пока, мам!', { left: 650, top: 740 });
      s.fade(bye, 2.0, { y: 6 }); s.out(bye, 3.6, { dur: 0.3 });
      // ребёнок переходит линию по клеткам; мама остаётся и уходит к краю, становится меньше
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, 720 - 50, 894, 1.05, '#26A69A', '#1C7A71'); // ранец из финала 3–7
      s.tween(bp, 0.9, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var w = gridWalk(s, 'baby', 1260, 2.6, { carry: bp });
      s.actor('adult', { x: 330, d: 118 }, 3.2, 2.2, 'power2.inOut');
      // две пары отношений — дуги ручкой
      var a1 = s.path(ov, 'M330 790 Q 800 600 1260 840', { stroke: K.DEEP, 'stroke-width': 3, 'stroke-dasharray': '10 10', opacity: 0.7 });
      var a2 = s.path(ov, 'M1300 840 Q 1480 690 1640 760', { stroke: K.DEEP, 'stroke-width': 4 });
      s.tween(a1, 2.6 + w, { opacity: 0 }, { opacity: 0.7, duration: 0.5 });
      s.draw(a2, 2.9 + w, { dur: 0.7 });
      var l1 = s.text('small-caps', 'ребёнок — родитель', { left: 200, top: 990 });
      var l2 = s.text('small-caps', 'ребёнок — учитель', { left: 1300, top: 990, color: 'var(--accent-deep)' });
      s.fade(l1, 3.0 + w, { y: 6 }); s.fade(l2, 3.3 + w, { y: 6 });
      s.actor('baby', { o: 0 }, 9.4, 0.4); s.actor('adult', { o: 0 }, 9.4, 0.4); s.actor('adult2', { o: 0 }, 9.4, 0.4);
      s.out(bp, 9.4, { dur: 0.4 });
    }
  });

  // 2. Отъезд: крупно ребёнок за партой → один из двадцати
  Film.scene({
    id: 'pullback', bars: 4,
    build: function (s) {
      var K = S(), g = s.svg();
      var HX = 680, HY = 900; // место героя: первый ряд, второй слева
      K.board(s, g, 610, 110, 700, 150, { at: 0 });
      var spots = K.classroom(s, g, { skip: function (r, c) { return r === 0 && c === 1; } });
      var me = spots.filter(function (p) { return p.r === 0 && p.c === 1; })[0];
      HX = me.x; HY = me.y;
      s.actor('baby', { x: HX, y: HY - 64, d: 80, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'soft', 0, 0.01); s.gaze('baby', 0, 8, 0, 0.01);
      K.desk(s, s.over(), HX, HY, 1); // своя парта — над героем, как у остальных
      var nb = s.otext('kidhand', '2 + 3 = 5', { left: HX - 56, top: HY + 14, fontSize: 32, color: '#FFFDF8' });
      s.fade(nb, 0.1, { y: 0, dur: 0.4 });
      // камера: крупно → пауза → плавный отъезд
      s.cam({ cx: HX, cy: HY - 50, z: 3.4 }, 0, 0.01);
      s.mouth('baby', 'smile', 1.4, 0.3); s.gaze('baby', 0, -6, 1.4, 0.3);
      s.cam({ cx: 960, cy: 600, z: 1 }, 2.0, 3.6, 'power2.inOut');
      var t = s.text('h3', 'Один из двадцати', { left: 140, top: 300 });
      var t2 = s.text('note', 'Класс — вторая группа после семьи, и надолго.', { left: 140, top: 364, width: 520 });
      s.fade(t, 6.0, { y: 10 }); s.fade(t2, 6.5, { y: 6 });
      s.actor('baby', { o: 0 }, 9.4, 0.4);
    }
  });

  // 3. Числовая прямая: ровная линия по линейке, вопрос — стоп-кадр, ответ прописью, поправка красной ручкой
  Film.scene({
    id: 'line', bars: 4,
    build: function (s) {
      var K = S(), g = s.svg(), ov = s.over();
      var X0 = 300, X1 = 1620, Y = 640;
      var k = s.text('kicker', 'Числовая прямая', { left: 140, top: 120 });
      s.fade(k, 0.1, { y: 8 });
      var q = s.text('h2', 'Куда поставить 150?', { left: 140, top: 156 });
      s.lines(q, 0.3);
      K.ruled(s, g, X0, Y, X1, Y, { at: 0.4, dur: 1.0, width: 5 });
      [[X0, '0'], [X1, '1000']].forEach(function (p, i) {
        K.ruled(s, g, p[0], Y - 22, p[0], Y + 22, { at: 1.3 + i * 0.1, dur: 0.2, width: 5 });
        var lb = s.text('lead', p[1], { left: p[0] - 60, top: Y + 40, width: 120, textAlign: 'center' });
        s.fade(lb, 1.4 + i * 0.1, { y: 6 });
      });
      s.freeze(2.0, 2.2);
      var gu = s.text('small-caps', 'Угадайте', { left: 140, top: 250 });
      s.fade(gu, 2.1, { y: 0, dur: 0.2 }); s.out(gu, 3.95, { dur: 0.2 });
      // ребёнок прицеливается и ставит отметку
      var MX = X0 + (X1 - X0) * 0.47;
      s.actor('baby', { x: MX - 160, y: Y - 160, d: 90, o: 0 }, 4.2, 0.01); s.actor('baby', { o: 1 }, 4.3, 0.3);
      s.face('baby', true, 4.3, 0.2); s.mouth('baby', 'soft', 4.3, 0.01); s.gaze('baby', 10, 8, 4.3, 0.01);
      s.squash('baby', 1.05, 0.95, 4.8, 0.2); s.squash('baby', 1, 1, 5.0, 0.15); // прицелился
      var m = K.ruled(s, ov, MX, Y - 34, MX, Y + 34, { at: 5.1, dur: 0.18, width: 6 });
      var me = s.text('kidhand', '150 — тут!', { left: MX - 40, top: Y - 110 });
      s.fade(me, 5.3, { y: 6 });
      var t2 = s.text('note', 'Второклассник: маленькие числа растянуты, большие сжаты.', { left: 300, top: 820, width: 900 });
      s.fade(t2, 6.0, { y: 6 });
      var RX = X0 + (X1 - X0) * 0.15;
      K.ruled(s, ov, RX, Y - 34, RX, Y + 34, { at: 7.4, dur: 0.18, width: 6, color: K.RED });
      var rt = s.text('cursive', 'здесь', { left: RX - 40, top: Y + 40, color: K.RED, fontSize: 44 });
      s.fade(rt, 7.6, { y: 6 });
      s.actor('baby', { o: 0 }, 9.4, 0.4);
    }
  });
})();
