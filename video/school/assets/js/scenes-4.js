/* Глава 4. «Я умею» · образ себя и сверстники: один из двадцати (Рубл, Хартер, Орт), перемена (Коуи), велосипед (Эриксон) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';

  // 2:42,5 — заставка главы (16 тактов = 40 с)
  Film.scene({
    id: 'ch4', bars: 1,
    build: function (s) {
      s.chapterCard(4, '«Я умею»', 'образ себя и сверстники');
      s.chapter(4, '«Я умею»', 0.4, 39.4);
    }
  });

  // 2:45 — Один из двадцати → смотреть на себя по соседу (Д. Рубл и др., 1980; С. Хартер; У. Орт и др., 2018)
  Film.scene({
    id: 'twenty', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var cls = s.node(g, 'g', {});
      var spots = K().classroom(s, cls, { skip: function (r, c) { return r === 0 && c === 1; } });
      var me = spots.filter(function (p) { return p.r === 0 && p.c === 1; })[0], nb = spots.filter(function (p) { return p.r === 0 && p.c === 2; })[0];
      s.actor('baby', { x: me.x, y: me.y - 64, d: 80, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'soft', 0, 0.01); s.gaze('baby', 0, 8, 0, 0.01);
      var myDesk = s.node(ov, 'g', {});
      K().desk(s, myDesk, me.x, me.y, 1);
      // камера: крупно → отъезд с места учителя
      s.cam({ cx: me.x, cy: me.y - 50, z: 3.4 }, 0, 0.01);
      s.mouth('baby', 'smile', 1.2, 0.3); s.gaze('baby', 0, -6, 1.2, 0.3);
      s.cam({ cx: 960, cy: 600, z: 1 }, 1.8, 3.6, 'power2.inOut');
      s.actor('adult2', { x: 1560, y: 1150, d: 340, o: 0 }, 0, 0.01);
      s.actor('adult2', { o: 1 }, 4.4, 0.8);
      // наезд на две парты: своя «4» и соседская «5»
      s.actor('adult2', { o: 0 }, 5.8, 0.4);
      s.cam({ cx: (me.x + nb.x) / 2, cy: me.y - 20, z: 2.3 }, 6.0, 1.2, 'power2.inOut');
      var m4 = s.otext('cursive red', '4', { left: me.x - 12, top: me.y + 6, fontSize: 38 });
      var m5 = s.otext('cursive red', '5', { left: nb.x - 12, top: nb.y + 6, fontSize: 38 });
      s.pop(m4, 7.2, { from: 0.5, dur: 0.3 }); s.pop(m5, 7.4, { from: 0.5, dur: 0.3 });
      s.gaze('baby', 9, 2, 7.8, 0.3);
      var b = s.div('bubble say tail-l', { left: me.x - 30, top: me.y - 190, fontSize: '19px', padding: '4px 12px 6px' }, s.ov, 'У него пять!');
      s.pop(b, 8.1, { from: 0.7, dur: 0.35, origin: '10% 100%' }); s.out(b, 9.6, { dur: 0.3 });
      s.mouth('baby', 'flat', 8.6, 0.2);
      // назад к классу, класс приглушён — поверх текст
      s.cam({ cx: 960, cy: 600, z: 1 }, 9.8, 1.0, 'power2.inOut');
      s.tween([cls, myDesk, m4, m5], 10.4, { opacity: 1 }, { opacity: 0.16, duration: 0.6 });
      s.actor('baby', { o: 0.16 }, 10.4, 0.6);
      var t1 = s.text('h3', 'Себя оценивают по соседу · <span class="en-line">social comparison</span>', { left: 140, top: 170, width: 1600, fontSize: 46 });
      s.fade(t1, 10.9, { y: 10 });
      var sp = s.text('lead', 'учёба · спорт · друзья · внешность · поведение', { left: 140, top: 270, width: 1600, fontSize: 32, color: 'var(--accent-deep)' });
      s.fade(sp, 12.0, { y: 6 });
      var t2 = s.text('h3', 'Самооценка становится точнее, но в среднем не падает.', { left: 140, top: 520, width: 1400, fontSize: 46 });
      s.lines(t2, 13.4);
      var src = s.text('cite', 'Д. Рубл и др., 1980: опора на сверстников — с 7–8 лет · С. Хартер: самооценка по сферам · У. Орт и др., 2018: 331 выборка', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 14.2, { y: 4 });
      s.actor('baby', { o: 0 }, 17.0, 0.4);
    }
  });

  // 3:02,5 — Перемена: классики, скачки времени — один ребёнок всё время у стены (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'recess', bars: 4,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'Перемена', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      // классики мелом — та же клетка во дворе
      var H = s.node(g, 'g', {}), HX = 1100, HY = 900, C = 96;
      [[0, 0, '1'], [0, 1, '2'], [0, 2, '3'], [-0.5, 3, '4'], [0.5, 3, '5'], [0, 4, '6']].forEach(function (c, i) {
        var x = HX + c[0] * C, y = HY - (c[1] + 1) * C;
        var r = s.node(H, 'rect', { x: x - C / 2, y: y, width: C, height: C, fill: 'none', stroke: '#8A8F90', 'stroke-width': 3.5 });
        s.tween(r, 0.2 + i * 0.08, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        var n = s.text('kidhand', c[2], { left: x - 12, top: y + 22, fontSize: 40, color: '#8A8F90' });
        s.fade(n, 0.3 + i * 0.08, { y: 0 });
      });
      var wall = s.path(g, 'M260 380 V940', { stroke: '#B48A62', 'stroke-width': 14 });
      s.fade(wall, 0.3, { y: 0 });
      s.actor('baby', { x: HX, y: HY - 60, d: 70, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.4, 0.3);
      s.face('baby', true, 0.4, 0.2); s.mouth('baby', 'smile', 0.4, 0.01);
      s.hop('baby', HX, HY - 156, 0.9, 0.36, 40);
      s.hop('baby', HX, HY - 252, 1.4, 0.36, 40);
      s.actor('kid2', { x: 1420, y: 700, d: 90, o: 0 }, 0, 0.01); s.actor('kid2', { o: 1 }, 0.5, 0.3);
      s.face('kid2', true, 0.5, 0.2); s.mouth('kid2', 'flat', 0.5, 0.01); s.gaze('kid2', -9, 0, 0.5, 0.01);
      K().say(s, 'Ты наступил на линию!', 1340, 520, 2.0, 3.6);
      s.actor('baby', { o: 0 }, 3.5, 0.2); s.actor('kid2', { o: 0 }, 3.5, 0.2);
      // скачки времени: тот же двор, недели подряд; роли меняются, один — у стены
      var kids = [], pos = [[[900, 620], [1180, 560], [1420, 640], [1000, 760], [1320, 790]], [[1240, 600], [960, 700], [1100, 820], [1440, 560], [880, 520]], [[1000, 560], [1400, 720], [880, 760], [1200, 640], [1500, 860]]];
      var ATTR = ['cap', 'pigtails', 'bow', 'freckles', 'fringe'];
      for (var i = 0; i < 5; i++) {
        var kg = s.node(g, 'g', { opacity: 0 });
        K().kid(s, kg, 0, 0, 34, i, ATTR[i]);
        kids.push(kg);
      }
      var lone = s.node(g, 'g', { opacity: 0 });
      K().kid(s, lone, 330, 820, 34, 3, 'glasses');
      [3.8, 4.9, 6.0].forEach(function (t, w) {
        kids.forEach(function (kg, i) { s.set(kg, t, { opacity: w ? 1 : 0, x: w ? pos[w - 1][i][0] : 0, y: w ? pos[w - 1][i][1] : 0 }, { opacity: 1, x: pos[w][i][0], y: pos[w][i][1] }); });
        var lb = s.text('kidhand', ['понедельник', 'через неделю', 'через месяц'][w], { left: 1400, top: 300, fontSize: 40 });
        s.tween(lb, t, { opacity: 0 }, { opacity: 1, duration: 0.01 });
        s.set(lb, t + 1.1, { opacity: 1 }, { opacity: 0 });
      });
      s.set(lone, 3.8, { opacity: 0 }, { opacity: 1 });
      var t = s.text('h3', 'Дольше всего держится статус отвергаемого.', { left: 140, top: 190, width: 1500, fontSize: 46 });
      s.lines(t, 6.6);
      var src = s.text('cite', 'Дж. Коуи, К. Додж, Х. Коппотелли, 1982: популярные · отвергаемые · пренебрегаемые · противоречивые · средние', { left: 140, top: 990, fontSize: 20 });
      s.fade(src, 7.4, { y: 4 });
    }
  });

  // 3:12,5 — Отпустить велосипед: трудолюбие против неполноценности (Э. Эриксон, 1950; 1959)
  Film.scene({
    id: 'bike', bars: 4,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var t = s.text('h3', '<span class="term acc">Трудолюбие против неполноценности<span class="en">industry vs. inferiority</span></span>', { left: 140, top: 150 });
      s.fade(t, 0.2, { y: 10 });
      // проводка: кадр едет вместе с ребёнком — мимо проплывают столбики
      var posts = s.node(g, 'g', {});
      for (var i = 0; i < 14; i++) s.node(posts, 'rect', { x: 200 + i * 240, y: 640, width: 14, height: 200, rx: 4, fill: '#C9BFB2' });
      s.path(g, 'M0 905 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      s.tween(posts, 0, { x: 0 }, { x: -1440, duration: 4.6, ease: 'none' });
      var BX = 960, BY = 860, bike = s.node(g, 'g', {});
      [-70, 70].forEach(function (dx) { s.node(bike, 'circle', { cx: BX + dx, cy: BY, r: 44, fill: 'none', stroke: INK, 'stroke-width': 5 }); });
      s.path(bike, 'M' + (BX - 70) + ' ' + BY + ' L' + (BX - 10) + ' ' + (BY - 60) + ' L' + (BX + 70) + ' ' + BY + ' M' + (BX - 10) + ' ' + (BY - 60) + ' L' + (BX + 40) + ' ' + (BY - 64) + ' M' + (BX + 50) + ' ' + (BY - 90) + ' L' + (BX + 70) + ' ' + BY, { stroke: INK, 'stroke-width': 5 });
      s.actor('baby', { x: BX - 20, y: BY - 110, d: 90, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'soft', 0, 0.01); s.gaze('baby', 9, 0, 0, 0.01);
      s.actor('adult', { x: BX - 170, y: BY - 120, d: 150, o: 1 }, 0, 0.01);
      var hold = s.path(ov, 'M' + (BX - 110) + ' ' + (BY - 100) + ' L' + (BX - 30) + ' ' + (BY - 66), { stroke: '#385771', 'stroke-width': 8 });
      // мама отпускает седло и остаётся позади
      s.set(hold, 2.0, { opacity: 1 }, { opacity: 0 });
      s.actor('adult', { x: -100 }, 2.0, 2.6, 'power1.in');
      s.mouth('baby', 'smile', 2.6, 0.3);
      // другой ребёнок: упал и слышит упрёк
      var sw = K().flip(s, 4.6);
      [posts, bike].forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      s.actor('baby', { o: 0 }, sw, 0.01);
      var fallen = s.node(g, 'g', { opacity: 0, transform: 'rotate(-72 1200 900)' });
      [-70, 70].forEach(function (dx) { s.node(fallen, 'circle', { cx: 1200 + dx, cy: 860, r: 44, fill: 'none', stroke: INK, 'stroke-width': 5 }); });
      s.path(fallen, 'M1130 860 L1190 800 L1270 860 M1190 800 L1240 796 M1250 770 L1270 860', { stroke: INK, 'stroke-width': 5 });
      s.set(fallen, sw, { opacity: 0 }, { opacity: 1 });
      s.actor('kid2', { x: 1000, y: 870, d: 90, o: 0 }, 0, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.face('kid2', true, sw, 0.01); s.mouth('kid2', 'sad', sw, 0.01);
      s.actor('adult2', { x: 700, y: 820, d: 150, o: 0 }, 0, 0.01); s.actor('adult2', { o: 1 }, sw, 0.01);
      K().say(s, 'У тебя никогда не получится!', 480, 600, 5.2, 7.2);
      var q = s.text('quote', '«Я — это то, чему я учусь»', { left: 140, top: 340, width: 1400 });
      s.lines(q, 6.8);
      var c = s.text('cite', 'Э. Эриксон, 1959', { left: 140, top: 430 });
      s.fade(c, 7.4, { y: 4 });
      ['kid2', 'adult2', 'adult'].forEach(function (id) { s.actor(id, { o: 0 }, 9.4, 0.4); });
    }
  });
})();
