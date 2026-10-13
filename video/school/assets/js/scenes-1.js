/* Глава 1. Новое место · школа и учебная деятельность: порог, учиться способу (Давыдов), граница 1 сентября, проверки */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var OBJ = '#E0A930', OBJ_D = '#A77A12';

  // 0:25 — заставка главы (глава — 21 такт = 52,5 с)
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      s.chapterCard(1, 'Новое место', 'школа и учебная деятельность');
      s.chapter(1, 'Новое место', 0.4, 51.9);
    }
  });

  // 0:27,5 — Порог: красная линия поля делит кадр; две пары отношений (Д. Б. Эльконин)
  Film.scene({
    id: 'threshold', bars: 4,
    build: function (s) {
      var cells = s.div('cells', { left: 962, top: 0, width: 958, height: 1080 }); // под рисунком
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'Социальная ситуация развития · Д. Б. Эльконин', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      s.set(cells, 0, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 100% 0% 0%)' });
      s.tween(cells, 3.2, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut' });
      K().ruled(s, g, 960, 300, 960, 1010, { at: 0.3, dur: 0.9, color: K().RED, width: 3 });
      K().house(s, g, 420, 900, 1, { at: 0.5, dur: 1.0 });
      K().board(s, g, 1270, 400, 520, 220, { at: 0.6 });
      var b1 = s.text('cursive', 'Первое сентября', { left: 1330, top: 470, color: '#F3EFE4', fontSize: 54 });
      s.fade(b1, 1.2, { y: 0 });
      s.actor('adult', { x: 610, y: 880, d: 150, o: 0 }, 0, 0.01); s.actor('adult', { o: 1 }, 0.4, 0.5);
      s.actor('baby', { x: 720, y: 900, d: 100, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.5, 0.5);
      s.face('baby', true, 0.6, 0.3); s.mouth('baby', 'smile', 0.6, 0.01); s.gaze('baby', 10, -4, 0.6, 0.01);
      s.actor('adult2', { x: 1650, y: 800, d: 150, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, 0.9, 0.5);
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, 720 - 50, 894, 1.05, '#26A69A', '#1C7A71'); // ранец из финала 3–7
      s.tween(bp, 0.5, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      K().say(s, 'Пока, мам!', 640, 720, 1.5, 2.9);
      var w = K().walk(s, 'baby', 1260, 2.4, { carry: bp });
      s.actor('adult', { x: 330, d: 118 }, 3.0, 2.2, 'power2.inOut');
      var a1 = s.path(ov, 'M330 790 Q 800 600 1260 840', { stroke: K().DEEP, 'stroke-width': 3, 'stroke-dasharray': '10 10', opacity: 0 });
      var a2 = s.path(ov, 'M1300 840 Q 1480 680 1630 750', { stroke: K().DEEP, 'stroke-width': 4 });
      s.tween(a1, 2.6 + w, { opacity: 0 }, { opacity: 0.7, duration: 0.5 });
      s.draw(a2, 2.8 + w, { dur: 0.7 });
      var l1 = s.text('small-caps', 'ребёнок — родитель', { left: 200, top: 990 });
      var l2 = s.text('small-caps', 'ребёнок — учитель', { left: 1300, top: 990, color: 'var(--accent-deep)' });
      s.fade(l1, 2.9 + w, { y: 6 }); s.fade(l2, 3.1 + w, { y: 6 });
      // учитель ставит отметку красной ручкой
      var nb = s.div('paper cells', { left: 1440, top: 650, width: 120, height: 96 });
      s.fade(nb, 6.0, { y: 6, dur: 0.4 });
      var five = s.text('cursive red', '5', { left: 1478, top: 640, fontSize: 80 });
      s.pop(five, 6.6, { from: 0.4, dur: 0.35 });
      var st = s.text('h3', 'Впервые рядом взрослый, который оценивает дело.', { left: 140, top: 190, width: 760, fontSize: 42 });
      s.lines(st, 6.8);
      ['baby', 'adult', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 9.4, 0.4); });
      s.out(bp, 9.4, { dur: 0.4 });
    }
  });

  // 0:37,5 — Учиться способу, а не ответу (В. В. Давыдов, 1972: школа № 91, первый класс — величины до чисел)
  Film.scene({
    id: 'davydov', bars: 6,
    build: function (s) {
      var page = s.div('paper cells', { left: 760, top: 300, width: 1020, height: 560 }); // страница — под полосками
      s.fade(page, 0.8, { y: 10 });
      var g = s.svg();
      var h = s.text('h3', 'Ведущей становится <span class="term acc">учебная деятельность<span class="en">learning activity</span></span>', { left: 140, top: 140, width: 1640, fontSize: 46 });
      s.fade(h, 0.2, { y: 10 });
      var X0 = 840, A = s.node(g, 'rect', { x: X0, y: 400, width: 520, height: 44, rx: 4, fill: K().TEAL, stroke: K().DEEP, 'stroke-width': 2.5 });
      var B = s.node(g, 'rect', { x: X0 + 40, y: 520, width: 400, height: 44, rx: 4, fill: OBJ, stroke: OBJ_D, 'stroke-width': 2.5 });
      s.grow(A, 1.2, { dur: 0.5 }); s.grow(B, 1.4, { dur: 0.5 });
      var la = s.text('kidhand', 'А', { left: X0 - 50, top: 392, fontSize: 44 }), lb = s.text('kidhand', 'Б', { left: X0 - 50, top: 512, fontSize: 44 });
      s.fade(la, 1.3, { y: 0 }); s.fade(lb, 1.5, { y: 0 });
      var s1 = s.text('kidhand', '1. Сравни без чисел', { left: 140, top: 340 });
      s.fade(s1, 1.7, { y: 6 });
      // приложить одну полоску к другой
      s.tween(B, 2.6, { x: 0, y: 0 }, { x: -40, y: -64, duration: 0.7, ease: 'power2.inOut' });
      s.tween(B, 4.2, { x: -40, y: -64 }, { x: 0, y: 0, duration: 0.6, ease: 'power2.inOut' });
      var s2 = s.text('kidhand', '2. А > Б', { left: 140, top: 430 });
      s.fade(s2, 4.4, { y: 6 });
      var f1 = s.text('kidhand', 'А > Б', { left: 1420, top: 392, fontSize: 56 });
      s.fade(f1, 4.9, { y: 0 });
      var s3 = s.text('kidhand', '3. Как сделать поровну?', { left: 140, top: 520 });
      s.fade(s3, 6.2, { y: 6 });
      var extra = s.node(g, 'rect', { x: X0 + 400, y: 398, width: 120, height: 48, rx: 4, fill: 'none', stroke: K().RED, 'stroke-width': 4, 'stroke-dasharray': '8 6', opacity: 0 });
      s.tween(extra, 6.9, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var lv = s.text('kidhand red', 'В', { left: X0 + 446, top: 330, fontSize: 44 });
      s.fade(lv, 7.0, { y: 0 });
      var f2 = s.text('kidhand', 'А − В = Б', { left: 1420, top: 470, fontSize: 56 });
      s.fade(f2, 7.6, { y: 0 });
      // мерка укладывается в полоску
      var mk = s.node(g, 'rect', { x: X0, y: 660, width: 130, height: 16, rx: 3, fill: K().INK, opacity: 0 });
      s.tween(mk, 8.8, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var ml = s.text('kidhand', 'мерка', { left: X0, top: 690, fontSize: 34 });
      s.fade(ml, 8.9, { y: 0 });
      for (var i = 0; i < 4; i++) {
        s.tween(mk, 9.4 + i * 0.5, { y: 0, x: i * 130 }, { y: -246, x: i * 130, duration: 0.2, ease: 'power2.out' });
        var tk = s.path(g, 'M' + (X0 + 130 * (i + 1)) + ' 392 V452', { stroke: K().INK, 'stroke-width': 3 });
        s.draw(tk, 9.6 + i * 0.5, { dur: 0.1 });
        if (i < 3) s.tween(mk, 9.65 + i * 0.5, { y: -246, x: i * 130 }, { y: -246, x: (i + 1) * 130, duration: 0.2, ease: 'power2.inOut' });
      }
      var f3 = s.text('kidhand', 'А = 4 мерки', { left: 1420, top: 548, fontSize: 56 });
      s.fade(f3, 11.4, { y: 0 });
      var c = s.text('lead', 'Учатся не ответу, а ' + s.HL('способу.'), { left: 140, top: 900, width: 1300 });
      s.lines(c, 11.8);
      s.hl(c, 12.5);
      var src = s.text('cite', 'В. В. Давыдов, 1972. Независимых сравнений системы почти нет.', { left: 140, top: 980, fontSize: 20 });
      s.fade(src, 12.4, { y: 4 });
    }
  });

  // 0:52,5 — Граница 1 сентября: разница почти в год (Т. Лейтон и др., 2018) → что делает школа, а что — возраст (Дж. Бизанц и др., 1995)
  var MONTHS = ['сен', 'окт', 'ноя', 'дек', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг'];
  Film.scene({
    id: 'border', bars: 5,
    build: function (s) {
      var g = s.svg(), ov = s.over(), A = s.node(g, 'g', {});
      var k = s.text('kicker', 'Граница 1 сентября', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var t1 = s.text('h3', 'В одном классе — разница почти в год.', { left: 140, top: 190, width: 1500 });
      s.lines(t1, 0.4);
      var line = s.path(A, 'M250 420 V820', { stroke: K().RED, 'stroke-width': 3, 'stroke-dasharray': '8 8' });
      s.dash(line, 0.6, { dur: 0.5 });
      var lb = s.text('small-caps', '1 сентября', { left: 160, top: 840, color: 'var(--margin)' });
      s.fade(lb, 0.8, { y: 4 });
      var mls = [];
      MONTHS.forEach(function (m, i) {
        var x = 340 + i * 112, r = 46 - i * 1.6;
        var c = s.node(A, 'circle', { cx: x, cy: 720 - r, r: r, fill: ['#E4735A', '#EC8A6F', '#D9654B', '#F09A7E', '#C95A44'][i % 5], opacity: 0 });
        s.tween(c, 1.0 + i * 0.07, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
        var ml = s.text('cite', m, { left: x - 40, top: 740, width: 80, textAlign: 'center', fontSize: 22 });
        s.fade(ml, 1.1 + i * 0.07, { y: 4 });
        mls.push(ml);
      });
      var yl = s.text('note', 'самый младший', { left: 1500, top: 600, fontSize: 24, color: 'var(--accent-deep)' });
      s.fade(yl, 2.2, { y: 4 });
      var arr = s.path(A, 'M1570 640 L1572 662', { stroke: K().DEEP, 'stroke-width': 3 });
      s.draw(arr, 2.3, { dur: 0.2 });
      var t2 = s.text('lead', 'Самым младшим СДВГ ставят на треть чаще.', { left: 140, top: 300, width: 1500, fontSize: 36 });
      s.lines(t2, 3.0);
      var src = s.text('cite', 'Т. Лейтон и др., 2018: 400 тыс. детей, США; где граница в другой день — эффекта нет', { left: 140, top: 980, fontSize: 20 });
      s.fade(src, 3.6, { y: 4 });
      // через год: перелистывание — двое почти ровесников
      var sw = K().flip(s, 6.0);
      [A, t1, t2, src, lb, yl].concat(mls).forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      var B = s.node(g, 'g', { opacity: 0 });
      s.set(B, sw, { opacity: 0 }, { opacity: 1 });
      var nb = s.text('kidhand', 'через год', { left: 140, top: 190, fontSize: 52 });
      s.tween(nb, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.path(B, 'M720 360 V820', { stroke: K().RED, 'stroke-width': 3, 'stroke-dasharray': '8 8' });
      K().kid(s, B, 600, 700, 44, 1, 'pigtails');
      Film.toys.backpack(s, B, 548, 706, 0.9, '#26A69A', '#1C7A71');
      K().kid(s, B, 840, 700, 44, 3, 'cap');
      var c1 = s.text('small-caps', 'август · первый класс', { left: 440, top: 770, width: 280, textAlign: 'center' });
      var c2 = s.text('small-caps', 'сентябрь · ещё в саду', { left: 730, top: 770, width: 280, textAlign: 'center' });
      [c1, c2].forEach(function (e) { s.tween(e, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 }); });
      // два мини-графика
      function chart(x, title, hA, hB, at) {
        var tt = s.text('label', title, { left: x, top: 410, width: 300, textAlign: 'center' });
        s.fade(tt, at, { y: 6 });
        var base = s.path(g, 'M' + x + ' 700 H' + (x + 300), { stroke: '#CDC3B4', 'stroke-width': 2 });
        s.fade(base, at, { y: 0 });
        [[hA, K().TEAL, x + 50], [hB, '#9FD6CF', x + 170]].forEach(function (b, i) {
          var r = s.node(g, 'rect', { x: b[2], y: 700, width: 80, height: 0, rx: 4, fill: b[1] });
          s.tween(r, at + 0.3 + i * 0.15, { attr: { y: 700, height: 0 } }, { attr: { y: 700 - b[0], height: b[0] }, duration: 0.6, ease: 'power2.out' });
        });
      }
      chart(1120, 'счёт', 230, 110, 7.2);
      chart(1480, 'сохранение', 170, 165, 7.8);
      var lg = s.text('note', 'бирюзовый — первоклассница, светлый — её ровесник из сада', { left: 1120, top: 720, width: 700, fontSize: 21 });
      s.fade(lg, 8.4, { y: 4 });
      var t3 = s.text('lead', 'Счёт растёт от ' + s.HL('школы') + ', сохранение — от возраста.', { left: 140, top: 880, width: 1600, fontSize: 36 });
      s.lines(t3, 9.2);
      s.hl(t3, 10.0);
      var src2 = s.text('cite', 'Дж. Бизанц, Ф. Моррисон, М. Данн, 1995', { left: 140, top: 980, fontSize: 20 });
      s.fade(src2, 9.8, { y: 4 });
    }
  });

  // 1:05 — Проверку выдерживает не всё: четыре карточки, на каждой — штамп учителя
  Film.scene({
    id: 'checks', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Знаменитые идеи о школе', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Проверку выдерживает не всё', { left: 140, top: 186, width: 1600 });
      s.lines(h, 0.2);
      var cards = [['Эффект Пигмалиона', 'слабее, чем думали', 'Р. Розенталь, Л. Якобсон, 1968 → С. Раунденбуш, 1984'],
        ['Хвалить за ум вредно', 'не повторилось', 'К. Мюллер, К. Двек, 1998 → Ю. Ли, Т. Бейтс, 2019'],
        ['Установка на рост', 'эффект маленький', 'Б. Макнамара, А. Бургойн, 2023'],
        ['Визуалы и аудиалы', 'не подтвердилось', 'Х. Пашлер и др., 2008']];
      cards.forEach(function (c, i) {
        var x = 140 + (i % 2) * 830, y = 360 + Math.floor(i / 2) * 290, at = 1.0 + i * 2.6;
        var card = s.div('card', { left: x, top: y, width: 790, height: 250 });
        s.fade(card, at, { y: 14, dur: 0.6 });
        var t = s.text('h3', c[0], { left: x + 40, top: y + 40, fontSize: 44 });
        s.fade(t, at + 0.1, { y: 8 });
        var a = s.text('cite', c[2], { left: x + 40, top: y + 205, fontSize: 20 });
        s.fade(a, at + 0.2, { y: 4 });
        var st = s.text('tstamp', c[1], { left: x + 40, top: y + 104 });
        s.tween(st, at + 1.0, { opacity: 0, scale: 1.6, rotation: -14, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: -5, duration: 0.25, ease: 'power3.in' });
      });
    }
  });
})();
