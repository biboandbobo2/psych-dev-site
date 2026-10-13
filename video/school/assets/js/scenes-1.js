/* Глава 1. Новое место · что меняет школа: первое сентября (Эльконин), мерка (Давыдов), самый младший в классе (Лейтон; Бизанц), родительский чат (проверки) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', STICK = '#8B6A45', TEAL_D = '#1C7A71';

  // Миша — герой эпизода: вихор и ранец из финала 3–7
  function misha(s, x, y, d, lt, bpParent) {
    s.actor('baby', { x: x, y: y, d: d || 100, o: 0 }, 0, 0.01);
    s.actor('baby', { o: 1 }, lt, 0.4);
    s.face('baby', true, lt, 0.01); s.mouth('baby', 'smile', lt, 0.01); s.gaze('baby', 8, -2, lt, 0.01);
    s.acc('baby', 'hero');
    if (!bpParent) return null;
    var bp = s.node(bpParent, 'g', {});
    Film.toys.backpack(s, bp, x - (d || 100) * 0.5, y - 6, (d || 100) / 95, '#26A69A', TEAL_D);
    s.tween(bp, lt, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    return bp;
  }
  Film.misha = misha;

  // 0:25 — заставка главы (32 такта = 80 с)
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      s.chapterCard(1, 'Новое место', 'Что меняет школа?');
      s.chapter(1, 'Новое место', 0.4, 79.4);
    }
  });

  // 0:27,5 — Первое сентября: дома любят, в школе оценивают (Д. Б. Эльконин)
  Film.scene({
    id: 'firstday', bars: 5,
    build: function (s) {
      var cells = s.div('cells', { left: 962, top: 0, width: 958, height: 1080 });
      s.set(cells, 0, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 100% 0% 0%)' });
      s.tween(cells, 2.6, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut' });
      var g = s.svg(), ov = s.over();
      var sch = s.node(g, 'g', {});
      K().schoolHouse(s, sch, 1440, 900, 0.78);
      s.tween(sch, 0.2, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
      K().ruled(s, g, 960, 300, 960, 1010, { at: 0.4, dur: 0.8, color: K().RED, width: 3 });
      s.path(g, 'M0 905 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      // мама ведёт Мишу
      s.actor('adult', { x: 220, y: 830, d: 150, o: 0 }, 0, 0.01); s.actor('adult', { o: 1 }, 0.2, 0.4);
      s.face('adult', true, 0.2, 0.01); s.mouth('adult', 'smile', 0.2, 0.01); s.gaze('adult', 8, 0, 0.2, 0.01); s.acc('adult', 'bun');
      var bp = misha(s, 330, 855, 96, 0.2, g);
      K().walk(s, 'baby', 690, 0.5, { carry: bp, step: 120, dur: 0.24, hold: 0.06 });
      s.actor('adult', { x: 560 }, 0.5, 1.2, 'power1.inOut');
      K().tag(s, 'мама', 560, 920, 1.6, 4.6); K().tag(s, 'Миша', 690, 920, 1.6, 2.5);
      K().say(s, 'Пока, мам!', 620, 700, 1.9, 3.1);
      s.squash('adult', 1.05, 0.95, 2.0, 0.15); s.squash('adult', 1, 1, 2.15, 0.3, 'back.out(3)'); // мама машет
      // переходит красную линию — в школу
      K().walk(s, 'baby', 1300, 2.7, { carry: bp, cx: 360, step: 122, dur: 0.24, hold: 0.06 });
      s.actor('adult', { x: 420, d: 128 }, 3.0, 2.0, 'power2.inOut');
      // учитель встречает и ставит «5» в Мишину тетрадь
      s.actor('adult2', { x: 1640, y: 830, d: 150, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 3.6, 0.4);
      s.face('adult2', true, 3.6, 0.01); s.mouth('adult2', 'smile', 3.6, 0.01); s.gaze('adult2', -8, 0, 3.6, 0.01); s.acc('adult2', 'glasses');
      K().tag(s, 'учитель', 1640, 920, 4.0);
      // крупно: Мишина тетрадь, учитель ставит «5»
      var nb = s.div('paper cells', { left: 660, top: 300, width: 520, height: 320 }, s.ov);
      s.fade(nb, 4.4, { y: 12, dur: 0.4 });
      var nl = s.otext('tag', 'Мишина тетрадь', { left: 660, top: 262, width: 520 }); s.fade(nl, 4.5, { y: 4 });
      var w1 = s.otext('kidhand', 'мама', { left: 720, top: 360, fontSize: 90 });
      s.fade(w1, 4.7, { y: 0, dur: 0.3 });
      var five = s.otext('cursive red', '5', { left: 1010, top: 380, fontSize: 190 });
      s.pop(five, 5.4, { from: 0.4, dur: 0.3 });
      s.out([nb, nl, w1, five], 6.9, { dur: 0.4 });
      s.mouth('baby', 'smile', 5.7, 0.2); s.squash('baby', 0.94, 1.08, 5.8, 0.12); s.squash('baby', 1, 1, 5.92, 0.3, 'back.out(3)');
      // две пары отношений — подписанные дуги
      var a1 = s.path(ov, 'M1300 800 Q 860 640 420 790', { stroke: K().DEEP, 'stroke-width': 3, 'stroke-dasharray': '10 10' });
      var a2 = s.path(ov, 'M1320 790 Q 1480 690 1630 760', { stroke: K().DEEP, 'stroke-width': 4 });
      s.dash(a1, 6.4, { dur: 0.7 }); s.draw(a2, 6.6, { dur: 0.6 });
      var l1 = s.text('label', 'мама — любит', { left: 640, top: 620, fontSize: 26, color: 'var(--accent-deep)' });
      var l2 = s.text('label', 'учитель — оценивает', { left: 1380, top: 520, fontSize: 26, color: 'var(--accent-deep)' });
      s.fade(l1, 6.8, { y: 4 }); s.fade(l2, 7.0, { y: 4 });
      var t = s.text('h3', 'Дома любят за то, что ты есть. В школе оценивают, что ты сделал.', { left: 140, top: 130, width: 1640, fontSize: 46 });
      s.lines(t, 7.4);
      var src = s.text('cite', 'Д. Б. Эльконин: в школе появляется новый взрослый — учитель', { left: 140, top: 1000, fontSize: 20 });
      s.fade(src, 8.4, { y: 4 });
      ['baby', 'adult', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 12.0, 0.4); });
      s.out(bp, 12.0, { dur: 0.4 });
    }
  });

  // 0:40 — Мерка: ленты не приложить — палочка становится меркой, число — сколько раз уложилась (В. В. Давыдов)
  Film.scene({
    id: 'merka', bars: 9,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var t1 = s.text('lead', 'Первоклассники ещё не знают чисел. Ленты не приложить друг к другу.', { left: 140, top: 130, width: 1640, fontSize: 38 });
      s.lines(t1, 0.3);
      // две парты далеко друг от друга, на каждой лента
      var DY = 640;
      [[200, 520], [1180, 640]].forEach(function (d) {
        s.node(g, 'rect', { x: d[0], y: DY, width: d[1], height: 36, rx: 6, fill: '#C9A27A', stroke: INK, 'stroke-width': 3 });
        s.node(g, 'rect', { x: d[0] + 30, y: DY + 36, width: 18, height: 160, fill: '#9C7550', stroke: INK, 'stroke-width': 2.5 });
        s.node(g, 'rect', { x: d[0] + d[1] - 48, y: DY + 36, width: 18, height: 160, fill: '#9C7550', stroke: INK, 'stroke-width': 2.5 });
      });
      var A0 = 260, LA = 360, B0 = 1240, LB = 480, M = 120;
      var rA = s.node(g, 'rect', { x: A0, y: DY - 18, width: LA, height: 16, rx: 3, fill: '#E4735A' });
      var rB = s.node(g, 'rect', { x: B0, y: DY - 18, width: LB, height: 16, rx: 3, fill: '#E4735A' });
      s.grow(rA, 0.6, { dur: 0.5 }); s.grow(rB, 0.8, { dur: 0.5 });
      var la = s.text('label', 'лента А', { left: A0, top: DY + 50, fontSize: 24 }), lb = s.text('label', 'лента Б', { left: B0, top: DY + 50, fontSize: 24 });
      s.fade(la, 0.8, { y: 4 }); s.fade(lb, 1.0, { y: 4 });
      // учитель у доски спрашивает
      var bd = s.node(g, 'g', {}); K().board(s, bd, 700, 240, 520, 220, { at: 0.3 }); s.out(bd, 11.4, { dur: 0.4 });
      s.actor('adult2', { x: 960, y: 420, d: 140, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 0.6, 0.4);
      s.face('adult2', true, 0.6, 0.01); s.mouth('adult2', 'smile', 0.6, 0.01); s.acc('adult2', 'glasses');
      K().say(s, 'Какая длиннее?', 1000, 280, 1.8, 4.2);
      // Миша и палочка-мерка
      misha(s, 760, 520, 90, 2.6);
      var stick = s.node(ov, 'g', {});
      s.path(stick, 'M0 0 H' + M, { stroke: STICK, 'stroke-width': 10 });
      s.set(stick, 0, { x: 790, y: 520, opacity: 0 }, { x: 790, y: 520, opacity: 0 });
      s.tween(stick, 3.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      // тетрадь Миши — палочки за каждый шаг
      var page = s.div('paper cells', { left: 640, top: 840, width: 640, height: 150 });
      s.fade(page, 3.2, { y: 8 });
      var ta = s.text('kidhand', 'А:', { left: 670, top: 860, fontSize: 44 }), tb = s.text('kidhand', 'Б:', { left: 670, top: 920, fontSize: 44 });
      s.fade(ta, 3.4, { y: 0 }); s.fade(tb, 3.4, { y: 0 });
      var marks = { 860: [], 920: [] }, pos = { x: 790, y: 520 };
      function measure(x0, n, t0, row) {
        s.actor('baby', { x: x0 + 40, y: DY - 90 }, t0, 0.5, 'power2.inOut');
        s.tween(stick, t0, { x: pos.x, y: pos.y }, { x: x0, y: DY - 30, duration: 0.5, ease: 'power2.inOut' });
        for (var i = 0; i < n; i++) {
          var t = t0 + 0.7 + i * 0.6;
          if (i) s.tween(stick, t, { x: x0 + (i - 1) * M }, { x: x0 + i * M, duration: 0.3, ease: 'power2.inOut' });
          if (i) s.actor('baby', { x: x0 + 40 + i * M }, t, 0.3, 'power2.inOut');
          var tk = s.path(ov, 'M' + (x0 + (i + 1) * M) + ' ' + (DY - 36) + ' v20', { stroke: INK, 'stroke-width': 3 });
          s.draw(tk, t + 0.3, { dur: 0.1 });
          var mk = s.path(ov, 'M' + (740 + i * 24) + ' ' + (row + 8) + ' v40', { stroke: K().DEEP, 'stroke-width': 5 });
          s.draw(mk, t + 0.35, { dur: 0.12 });
          marks[row].push(mk);
        }
        pos = { x: x0 + (n - 1) * M, y: DY - 30 };
      }
      measure(A0, 3, 3.6, 860);
      measure(B0, 4, 6.4, 920);
      K().say(s, 'Б длиннее!', 1240, 400, 9.4, 11.6);
      s.mouth('baby', 'smile', 9.4, 0.2);
      // палочки → числа
      s.out(marks[860].concat(marks[920]), 10.6, { dur: 0.3 });
      var n3 = s.text('kidhand', '3', { left: 740, top: 852, fontSize: 52, color: 'var(--accent-deep)' }), n4 = s.text('kidhand', '4', { left: 740, top: 912, fontSize: 52, color: 'var(--accent-deep)' });
      s.pop(n3, 10.9, { from: 0.5, dur: 0.3 }); s.pop(n4, 11.1, { from: 0.5, dur: 0.3 });
      s.out(t1, 11.4, { dur: 0.3 });
      s.actor('adult2', { o: 0 }, 11.4, 0.4);
      var t2 = s.text('h3', 'Палочка стала меркой. Сколько раз она уложилась — это и есть число.', { left: 140, top: 130, width: 1640, fontSize: 44 });
      s.lines(t2, 11.8);
      var t3 = s.text('lead', 'Детей учат не готовому ответу, а способу его найти. Это <b class="acc">учебная деятельность</b> — главное занятие возраста.', { left: 140, top: 250, width: 1200, fontSize: 34 });
      s.lines(t3, 16.0);
      var src = s.text('cite', 'learning activity · В. В. Давыдов, «Виды обобщения в обучении», 1972. Независимых сравнений системы почти нет.', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 18.0, { y: 4 });
      s.actor('baby', { o: 0 }, 22.0, 0.4); s.actor('adult2', { o: 0 }, 22.0, 0.4);
      s.out(stick, 22.0, { dur: 0.4 });
    }
  });

  // 1:02,5 — Самый младший в классе (Т. Лейтон и др., 2018) → через год: школа или возраст (Дж. Бизанц и др., 1995)
  var MONTHS = ['сен', 'окт', 'ноя', 'дек', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг'];
  Film.scene({
    id: 'youngest', bars: 9,
    build: function (s) {
      var g = s.svg(), A = s.node(g, 'g', {});
      var t1 = s.text('h3', 'В одном классе — разница почти в год.', { left: 140, top: 130, width: 1640, fontSize: 46 });
      s.lines(t1, 0.3);
      var line = s.path(A, 'M240 470 V780', { stroke: K().RED, 'stroke-width': 3, 'stroke-dasharray': '8 8' });
      s.dash(line, 0.5, { dur: 0.5 });
      var lb = s.text('small-caps', '1 сентября', { left: 150, top: 800, color: 'var(--margin)' });
      s.fade(lb, 0.7, { y: 4 });
      var mls = [];
      var KIDA = ['bow', 'cap', 'glasses', 'pigtails', 'freckles', 'fringe', 'bow', 'cap', 'pigtails', 'freckles', 'fringe'];
      MONTHS.forEach(function (m, i) {
        var x = 330 + i * 120, r = 50 - i * 1.8;
        if (i < 11) {
          var kg = s.node(A, 'g', {});
          K().kid(s, kg, x, 720 - r, r, i, KIDA[i]);
          s.tween(kg, 0.8 + i * 0.1, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
        }
        var ml = s.text('cite', m, { left: x - 40, top: 740, width: 80, textAlign: 'center', fontSize: 22 });
        s.fade(ml, 0.9 + i * 0.1, { y: 4 }); mls.push(ml);
      });
      var ka = s.text('tag', 'самая старшая', { left: 330 - 120, top: 560, width: 240 }); s.fade(ka, 2.0, { y: 4 }); mls.push(ka);
      // Миша — последний, самый маленький
      s.actor('baby', { x: 330 + 11 * 120, y: 680, d: 66, o: 0 }, 0, 0.01);
      s.actor('baby', { o: 1 }, 2.0, 0.3); s.face('baby', true, 2.0, 0.01); s.mouth('baby', 'soft', 2.0, 0.01); s.gaze('baby', -8, -4, 2.0, 0.01); s.acc('baby', 'hero');
      s.hop('baby', 330 + 11 * 120, 690, 2.2, 0.4, 40);
      var mi = s.text('tag', 'Миша — самый младший', { left: 330 + 11 * 120 - 260, top: 590, width: 380, color: 'var(--accent-deep)' }); s.fade(mi, 2.4, { y: 4 }); mls.push(mi);
      var t2 = s.text('lead', 'Самым младшим диагноз СДВГ — синдром дефицита внимания — ставят на треть чаще. Но это возраст, а не болезнь.', { left: 140, top: 230, width: 1500, fontSize: 34 });
      s.lines(t2, 3.4);
      var src = s.text('cite', 'Т. Лейтон и др., 2018: 400 тыс. детей, США; где граница в другой день — разницы нет', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 6.0, { y: 4 });
      // через год: Миша в школе, Аня — в саду
      var sw = K().flip(s, 9.6);
      [A, t1, t2, src, lb].concat(mls).forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      s.actor('baby', { x: 560, y: 760, d: 96 }, sw, 0.01); s.mouth('baby', 'smile', sw, 0.01); s.gaze('baby', 8, -2, sw, 0.01);
      var B = s.node(g, 'g', { opacity: 0 });
      s.set(B, sw, { opacity: 0 }, { opacity: 1 });
      K().schoolHouse(s, B, 560, 600, 0.42);
      Film.toys.backpack(s, B, 512, 754, 1.0, '#26A69A', TEAL_D);
      // детский сад: домик с окном, дверью и горкой
      s.path(B, 'M1000 600 V460 L1100 390 L1200 460 V600 Z', { fill: '#F6D5CB', stroke: INK, 'stroke-width': 3 });
      s.path(B, 'M1200 600 L1290 490 H1310 L1310 600', { fill: 'none', stroke: INK, 'stroke-width': 3 });
      s.node(B, 'rect', { x: 1070, y: 520, width: 60, height: 80, rx: 6, fill: '#B48A62', stroke: INK, 'stroke-width': 2.5 });
      s.node(B, 'rect', { x: 1030, y: 460, width: 50, height: 44, rx: 4, fill: '#CFE6EE', stroke: INK, 'stroke-width': 2.5 });
      s.node(B, 'circle', { cx: 1160, cy: 480, r: 16, fill: '#F2C14E', stroke: INK, 'stroke-width': 2.5 });
      s.path(B, 'M800 470 V820', { stroke: K().RED, 'stroke-width': 3, 'stroke-dasharray': '8 8' });
      s.actor('kid2', { x: 1100, y: 760, d: 92, o: 0 }, 0, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.face('kid2', true, sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01); s.gaze('kid2', -8, -2, sw, 0.01); s.acc('kid2', 'bow');
      var nb = s.text('kidhand', 'Через год', { left: 140, top: 130, fontSize: 56 });
      s.tween(nb, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      var c1 = s.text('tag', 'Миша · школа', { left: 440, top: 830, width: 240 }), c2 = s.text('tag', 'Аня · сад', { left: 980, top: 830, width: 240 });
      [c1, c2].forEach(function (e) { s.tween(e, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 }); });
      var t3 = s.text('lead', 'Аня родилась 2 сентября — на неделю позже Миши. И пошла в школу на год позже.', { left: 140, top: 220, width: 1640, fontSize: 34 });
      s.lines(t3, 10.4);
      // график: считать в уме — Миша выше; понимать, что воды не стало меньше, — поровну
      var X = 1420, tt = s.text('label', 'считать в уме', { left: X - 40, top: 420, width: 360, textAlign: 'center', fontSize: 24 });
      s.fade(tt, 13.2, { y: 6 });
      var base = s.path(g, 'M' + X + ' 760 H' + (X + 280), { stroke: '#CDC3B4', 'stroke-width': 2 });
      s.fade(base, 13.2, { y: 0 });
      [[240, '#E4735A', X + 40, 'Миша'], [110, '#EC8A6F', X + 160, 'Аня']].forEach(function (b, i) {
        var r = s.node(g, 'rect', { x: b[2], y: 760, width: 80, height: 0, rx: 4, fill: b[1] });
        s.tween(r, 13.5 + i * 0.15, { attr: { y: 760, height: 0 } }, { attr: { y: 760 - b[0], height: b[0] }, duration: 0.6, ease: 'power2.out' });
        var nm = s.text('cite', b[3], { left: b[2] - 10, top: 770, width: 100, textAlign: 'center', fontSize: 20 });
        s.fade(nm, 13.6, { y: 4 });
      });
      var eq = s.text('label', 'понимать, что воды не стало меньше: <span class="acc">Миша = Аня</span>', { left: 1260, top: 820, width: 620, textAlign: 'center', fontSize: 22 });
      s.fade(eq, 15.0, { y: 4 });
      var t4 = s.text('lead', 'Считать в уме Мишу научила школа. А понимать, что воды не стало меньше, — возраст: тут они равны.', { left: 140, top: 900, width: 1640, fontSize: 34 });
      s.lines(t4, 16.0);
      var src2 = s.text('cite', 'Дж. Бизанц, Ф. Моррисон, М. Данн, 1995', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src2, 18.0, { y: 4 });
      ['baby', 'kid2'].forEach(function (id) { s.actor(id, { o: 0 }, 22.0, 0.4); });
    }
  });

  // 1:25 — Родительский чат: три совета — три проверки
  Film.scene({
    id: 'chat', bars: 8,
    build: function (s) {
      var g = s.svg();
      K().kitchen(s, g, 560, 1000);
      var t = s.text('h3', 'Проверку выдерживает не всё', { left: 140, top: 130, width: 900, fontSize: 50 });
      s.lines(t, 0.4);
      s.actor('adult', { x: 380, y: 760, d: 150, o: 0 }, 0, 0.01); s.actor('adult', { o: 1 }, 0.2, 0.4);
      s.face('adult', true, 0.2, 0.01); s.mouth('adult', 'smile', 0.2, 0.01); s.gaze('adult', 8, 4, 0.2, 0.01); s.acc('adult', 'bun');
      misha(s, 700, 780, 96, 0.3);
      s.gaze('baby', 0, 8, 0.3, 0.01); s.mouth('baby', 'soft', 0.3, 0.01);
      K().tag(s, 'мама', 380, 650, 0.6, 5.0); K().tag(s, 'Миша', 700, 690, 0.6, 5.0);
      var hw = s.div('paper cells', { left: 640, top: 840, width: 150, height: 40 }); s.fade(hw, 0.4, { y: 0 });
      [1.2, 1.5, 1.8, 3.0, 3.3, 5.0, 5.3].forEach(function (tt) { s.squash('baby', 1.03, 0.97, tt, 0.1); s.squash('baby', 1, 1, tt + 0.1, 0.12); }); // пишет
      var ph = K().phone(s, 1150, 110, 620, 880);
      s.tween(ph.el, 0.5, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      s.tween(ph.el, 1.0, { rotation: 0 }, { rotation: 2, duration: 0.06, repeat: 5, yoyo: true }); // звенит
      var items = [
        ['Учитель верит в ребёнка — и ребёнок умнеет!', 'Проверили: работает, только пока учитель не знает класс.', 1.4],
        ['Не хвалите за ум — это вредно!', 'Проверили: вреда не нашли.', 8.0],
        ['Ваш ребёнок визуал — учите картинками!', 'Проверили: не помогает.', 13.0]
      ];
      items.forEach(function (it, i) {
        var m = ph.add(it[0], it[2]);
        m.style.top = (24 + i * 250) + 'px';
        var st = Film.el('div', 'tstamp', m.parentNode, it[1]);
        Film.css(st, { position: 'absolute', left: '22px', top: (24 + i * 250 + 120) + 'px', fontFamily: 'var(--sans)', fontWeight: 750, fontSize: '25px', lineHeight: 1.25, whiteSpace: 'normal', width: '520px', background: '#FFFDF8', padding: '6px 14px' });
        s.tween(st, it[2] + 3.0, { opacity: 0, scale: 1.5, rotation: -10, transformOrigin: '30% 50%' }, { opacity: 1, scale: 1, rotation: -3, duration: 0.25, ease: 'power3.in' });
        s.gaze('adult', 9, -2, it[2] + 0.2, 0.3);
        s.mouth('adult', i ? 'flat' : 'soft', it[2] + 3.2, 0.2);
      });
      var src = s.text('cite', 'эффект Пигмалиона — Р. Розенталь, Л. Якобсон, 1968 → С. Раунденбуш, 1984 · К. Мюллер, К. Двек, 1998 → Ю. Ли, Т. Бейтс, 2019 · Х. Пашлер и др., 2008', { left: 140, top: 1020, width: 980, fontSize: 18 });
      s.fade(src, 16.5, { y: 4 });
      ['baby', 'adult'].forEach(function (id) { s.actor(id, { o: 0 }, 19.5, 0.4); });
    }
  });
})();
