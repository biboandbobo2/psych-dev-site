/* Глава 4. «Я умею» · образ себя: один из двадцати (Рубл, Хартер, Орт), перемена (Коуи), отпустить велосипед (Эриксон) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';

  // 3:32,5 — заставка главы (22 такта = 55 с)
  Film.scene({
    id: 'ch4', bars: 1,
    build: function (s) {
      s.chapterCard(4, '«Я умею»', 'Как меняется образ себя?');
      s.chapter(4, '«Я умею»', 0.4, 54.4);
    }
  });

  // 3:35 — Один из двадцати → смотреть на себя по соседу; самооценка по областям (Д. Рубл и др., 1980; С. Хартер; У. Орт и др., 2018)
  Film.scene({
    id: 'twenty', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var cls = s.node(g, 'g', {});
      var spots = K().classroom(s, cls, { skip: function (r, c) { return r === 0 && c === 1; } });
      var me = spots.filter(function (p) { return p.r === 0 && p.c === 1; })[0], nb = spots.filter(function (p) { return p.r === 0 && p.c === 2; })[0];
      s.actor('baby', { x: me.x, y: me.y - 64, d: 80, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'soft', 0, 0.01); s.gaze('baby', 0, 8, 0, 0.01); s.acc('baby', 'cowlick');
      var myDesk = s.node(ov, 'g', {});
      K().desk(s, myDesk, me.x, me.y, 1);
      // крупно → отъезд с места учителя
      s.cam({ cx: me.x, cy: me.y - 50, z: 3.4 }, 0, 0.01);
      s.mouth('baby', 'smile', 1.2, 0.3); s.gaze('baby', 0, -6, 1.2, 0.3);
      s.cam({ cx: 960, cy: 540, z: 1 }, 1.8, 3.4, 'power2.inOut');
      var one = s.hud('h3', 'Один из двадцати', { left: 140, top: 130, fontSize: 50 });
      s.tween(one, 4.6, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }); s.tween(one, 5.8, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      s.actor('adult2', { x: 1560, y: 1150, d: 340, o: 0 }, 0, 0.01);
      s.actor('adult2', { o: 1 }, 4.2, 0.8); s.actor('adult2', { o: 0 }, 5.8, 0.4);
      // наезд на две парты: своя «4», соседская «5»
      s.cam({ cx: (me.x + nb.x) / 2, cy: me.y - 20, z: 2.3 }, 6.0, 1.2, 'power2.inOut');
      var m4 = s.otext('cursive red', '4', { left: me.x - 12, top: me.y + 6, fontSize: 38 });
      var m5 = s.otext('cursive red', '5', { left: nb.x - 12, top: nb.y + 6, fontSize: 38 });
      s.pop(m4, 7.2, { from: 0.5, dur: 0.3 }); s.pop(m5, 7.4, { from: 0.5, dur: 0.3 });
      s.gaze('baby', 9, 2, 7.8, 0.3);
      var b = s.div('bubble say tail-l', { left: me.x - 30, top: me.y - 190, fontSize: '19px', padding: '4px 12px 6px' }, s.ov, 'У него пять!');
      s.pop(b, 8.1, { from: 0.7, dur: 0.35, origin: '10% 100%' }); s.out(b, 9.8, { dur: 0.3 });
      s.mouth('baby', 'flat', 8.6, 0.2);
      // назад к классу, класс приглушён; поверх — объяснение и «плитки» самооценки
      s.cam({ cx: 960, cy: 540, z: 1 }, 10.0, 1.0, 'power2.inOut');
      s.tween([cls, myDesk, m4, m5], 10.6, { opacity: 1 }, { opacity: 0.12, duration: 0.6 });
      s.actor('baby', { x: 1500, y: 880, d: 110 }, 10.6, 0.8, 'power2.inOut'); s.mouth('baby', 'soft', 11.2, 0.2); s.gaze('baby', -9, -4, 11.2, 0.2);
      var t1 = s.hud('h3', 'С 7–8 лет ребёнок оценивает себя, сравнивая с другими детьми.', { left: 140, top: 130, width: 1640, fontSize: 44 });
      s.tween(t1, 11.0, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var t2 = s.hud('lead', 'Самооценка — как я сам себя оцениваю — делится на области:', { left: 140, top: 260, width: 1640, fontSize: 34 });
      s.tween(t2, 13.4, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var TILES = [['учёба', 150], ['спорт', 230], ['друзья', 260], ['внешность', 170], ['поведение', 210]];
      TILES.forEach(function (tt, i) {
        var x = 200 + i * 220, r = s.node(ov, 'rect', { x: x, y: 820, width: 150, height: 0, rx: 8, fill: i % 2 ? '#9FD6CF' : '#26A69A', stroke: INK, 'stroke-width': 2.5 });
        s.tween(r, 14.6 + i * 0.25, { attr: { y: 820, height: 0 } }, { attr: { y: 820 - tt[1], height: tt[1] }, duration: 0.5, ease: 'back.out(1.6)' });
        var l = s.hud('label', tt[0], { left: x - 30, top: 836, width: 210, textAlign: 'center', fontSize: 26 });
        s.tween(l, 14.7 + i * 0.25, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 });
        s.tween(l, 19.4, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      });
      var t3 = s.hud('lead', 'Она становится точнее, но в среднем не падает.', { left: 140, top: 330, width: 1640, fontSize: 34, color: 'var(--accent-deep)' });
      s.tween(t3, 16.8, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var src = s.hud('cite', 'social comparison · Д. Рубл и др., 1980 · С. Хартер · У. Орт и др., 2018: 331 выборка', { left: 140, top: 1010, fontSize: 20 });
      s.tween(src, 17.6, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.tween([t1, t2, t3, src], 19.4, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.actor('baby', { o: 0 }, 19.4, 0.4);
    }
  });

  // 3:55 — Перемена: классики, скачки времени — один мальчик всё время у стены; Миша зовёт его (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'recess', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'Перемена', { left: 140, top: 130 });
      s.fade(k, 0.1, { y: 8 });
      s.path(g, 'M0 960 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      K().tree(s, g, 1720, 960, 1.1); K().bench(s, g, 1500, 960, 1); K().ball(s, g, 1620, 935, 24);
      var wall = s.node(g, 'rect', { x: 140, y: 420, width: 60, height: 540, fill: '#E8DCCB', stroke: INK, 'stroke-width': 3 });
      [470, 560, 650, 740, 830, 920].forEach(function (y, i) { s.path(g, 'M140 ' + y + ' H200', { stroke: '#C9BFB2', 'stroke-width': 2 }); });
      // классики мелом
      var HX = 1000, HY = 950, C = 92;
      [[0, 0, '1'], [0, 1, '2'], [0, 2, '3'], [-0.5, 3, '4'], [0.5, 3, '5'], [0, 4, '6']].forEach(function (c, i) {
        var x = HX + c[0] * C, y = HY - (c[1] + 1) * C;
        var r = s.node(g, 'rect', { x: x - C / 2, y: y, width: C, height: C, fill: 'none', stroke: '#8A8F90', 'stroke-width': 3.5 });
        s.tween(r, 0.2 + i * 0.08, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        var n = s.text('kidhand', c[2], { left: x - 12, top: y + 22, fontSize: 40, color: '#8A8F90' });
        s.fade(n, 0.3 + i * 0.08, { y: 0 });
      });
      s.actor('baby', { x: HX, y: HY - 60, d: 70, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0.3, 0.3);
      s.face('baby', true, 0.3, 0.01); s.mouth('baby', 'smile', 0.3, 0.01); s.acc('baby', 'cowlick');
      s.hop('baby', HX, HY - 150, 0.8, 0.36, 40); s.hop('baby', HX, HY - 242, 1.3, 0.36, 40);
      s.actor('kid4', { x: 1300, y: 760, d: 90, o: 0 }, 0, 0.01); s.actor('kid4', { o: 1 }, 0.4, 0.3);
      s.face('kid4', true, 0.4, 0.01); s.mouth('kid4', 'flat', 0.4, 0.01); s.gaze('kid4', -9, 0, 0.4, 0.01); s.acc('kid4', 'cap');
      K().say(s, 'Ты наступил на линию!', 1220, 580, 1.9, 3.6);
      s.mouth('baby', 'flat', 2.2, 0.2);
      s.actor('baby', { o: 0 }, 3.5, 0.2); s.actor('kid4', { o: 0 }, 3.5, 0.2);
      // скачки времени: тот же двор, неделю за неделей — роли меняются, мальчик в очках у стены
      var kids = [], pos = [[[880, 700], [1180, 640], [1340, 760], [960, 820], [1260, 860]], [[1220, 660], [940, 760], [1100, 860], [1380, 640], [860, 600]], [[1000, 640], [1360, 780], [880, 800], [1180, 700], [1420, 880]]];
      var ATTR = ['cap', 'pigtails', 'bow', 'freckles', 'fringe'];
      for (var i = 0; i < 5; i++) { var kg = s.node(g, 'g', { opacity: 0 }); K().kid(s, kg, 0, 0, 36, i, ATTR[i]); kids.push(kg); }
      var lone = s.node(g, 'g', { opacity: 0 });
      K().kid(s, lone, 0, 0, 36, 3, 'glasses');
      s.set(lone, 3.8, { opacity: 0, x: 270, y: 900 }, { opacity: 1, x: 270, y: 900 });
      [3.8, 5.0, 6.2].forEach(function (t, w) {
        kids.forEach(function (kg, i) { s.set(kg, t, { opacity: w ? 1 : 0, x: w ? pos[w - 1][i][0] : 0, y: w ? pos[w - 1][i][1] : 0 }, { opacity: 1, x: pos[w][i][0], y: pos[w][i][1] }); });
        var lb = s.text('kidhand', ['понедельник', 'через неделю', 'через месяц'][w], { left: 1300, top: 330, fontSize: 44 });
        s.tween(lb, t, { opacity: 0 }, { opacity: 1, duration: 0.01 });
        s.set(lb, t + 1.15, { opacity: 1 }, { opacity: 0 });
      });
      var t = s.text('h3', 'Класс — вторая группа после семьи. Дольше всего держится роль того, кого не зовут играть.', { left: 140, top: 180, width: 1500, fontSize: 44 });
      s.lines(t, 3.9);
      // Миша зовёт его в игру
      s.actor('baby', { x: 640, y: 900, d: 84, o: 0 }, 7.4, 0.01); s.actor('baby', { o: 1 }, 7.4, 0.3);
      s.mouth('baby', 'smile', 7.4, 0.01); s.gaze('baby', -9, 0, 7.4, 0.01);
      K().walk(s, 'baby', 400, 7.6, { step: 80, dur: 0.22, hold: 0.06 });
      K().say(s, 'Пойдём с нами!', 360, 760, 8.6, 11.0);
      s.tween(lone, 10.2, { x: 270 }, { x: 760, duration: 1.4, ease: 'power2.inOut' });
      s.actor('baby', { x: 900 }, 10.2, 1.4, 'power2.inOut');
      var t2 = s.text('lead', 'Помогают взрослые — и друзья.', { left: 140, top: 340, width: 1200, fontSize: 36, color: 'var(--accent-deep)' });
      s.lines(t2, 11.6);
      var src = s.text('cite', 'Дж. Коуи, К. Додж, Х. Коппотелли, 1982: популярные · отвергаемые · пренебрегаемые · противоречивые · средние', { left: 140, top: 1020, fontSize: 18 });
      s.fade(src, 12.6, { y: 4 });
      s.actor('baby', { o: 0 }, 17.0, 0.4);
    }
  });

  // 4:12,5 — Отпустить велосипед: «Могу ли я?» (Э. Эриксон, 1950; «Я — это то, чему я учусь», 1959)
  Film.scene({
    id: 'bike', bars: 6,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var t1 = s.text('h3', 'Главный вопрос возраста — «Могу ли я?»', { left: 140, top: 130, width: 1640, fontSize: 48 });
      s.lines(t1, 0.3);
      // проводка с параллаксом: дальние деревья медленно, ближние кусты быстро
      var far = s.node(g, 'g', {}), near = s.node(ov, 'g', {});
      for (var i = 0; i < 9; i++) K().tree(s, far, 160 + i * 300, 800, 0.8, '#A9CBA4');
      s.path(g, 'M0 905 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      for (var j = 0; j < 12; j++) K().bush(s, near, 120 + j * 360, 1010, 1.0);
      s.tween(far, 0, { x: 0 }, { x: -700, duration: 5.6, ease: 'none' });
      s.tween(near, 0, { x: 0 }, { x: -2100, duration: 5.6, ease: 'none' });
      var BX = 960, BY = 860, bike = s.node(g, 'g', {});
      [-70, 70].forEach(function (dx) { s.node(bike, 'circle', { cx: BX + dx, cy: BY, r: 44, fill: 'none', stroke: INK, 'stroke-width': 5 }); });
      s.path(bike, 'M' + (BX - 70) + ' ' + BY + ' L' + (BX - 10) + ' ' + (BY - 60) + ' L' + (BX + 70) + ' ' + BY + ' M' + (BX - 10) + ' ' + (BY - 60) + ' L' + (BX + 40) + ' ' + (BY - 64) + ' M' + (BX + 50) + ' ' + (BY - 90) + ' L' + (BX + 70) + ' ' + BY, { stroke: INK, 'stroke-width': 5 });
      s.node(bike, 'rect', { x: BX - 34, y: BY - 72, width: 44, height: 12, rx: 6, fill: INK });
      s.actor('baby', { x: BX - 20, y: BY - 110, d: 90, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'soft', 0, 0.01); s.gaze('baby', 9, 0, 0, 0.01); s.acc('baby', 'cowlick');
      s.actor('adult', { x: BX - 170, y: BY - 120, d: 150, o: 1 }, 0, 0.01);
      s.face('adult', true, 0, 0.01); s.mouth('adult', 'smile', 0, 0.01); s.gaze('adult', 9, 4, 0, 0.01); s.acc('adult', 'bun');
      [0.2, 0.6, 1.0, 1.4, 1.8].forEach(function (t) { s.squash('adult', 1.04, 0.96, t, 0.1); s.squash('adult', 1, 1, t + 0.1, 0.2); }); // бежит рядом
      var hold = s.path(ov, 'M' + (BX - 110) + ' ' + (BY - 100) + ' L' + (BX - 30) + ' ' + (BY - 70), { stroke: '#385771', 'stroke-width': 8 });
      s.set(hold, 2.2, { opacity: 1 }, { opacity: 0 });
      s.actor('adult', { x: -120 }, 2.2, 2.6, 'power1.in');
      s.mouth('baby', 'smile', 2.8, 0.3);
      var t2 = s.text('lead', 'Получилось — «я умею».', { left: 140, top: 240, width: 1200, fontSize: 40, color: 'var(--accent-deep)' });
      s.lines(t2, 3.0);
      // а у Ани не вышло
      var sw = K().flip(s, 5.6);
      [far, near, bike, t1, t2].forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      s.actor('baby', { o: 0 }, sw, 0.01); s.actor('adult', { o: 0 }, sw, 0.01);
      var an = s.text('kidhand', 'А у Ани не вышло', { left: 140, top: 130, fontSize: 56, color: 'var(--accent-deep)' });
      s.tween(an, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      var fallen = s.node(g, 'g', { opacity: 0, transform: 'rotate(-18 1200 900)' });
      [-70, 70].forEach(function (dx) { s.node(fallen, 'circle', { cx: 1200 + dx, cy: 860, r: 44, fill: 'none', stroke: INK, 'stroke-width': 5 }); });
      s.path(fallen, 'M1130 860 L1190 800 L1270 860 M1190 800 L1240 796 M1250 770 L1270 860', { stroke: INK, 'stroke-width': 5 });
      s.set(fallen, sw, { opacity: 0 }, { opacity: 1 });
      s.actor('kid2', { x: 1000, y: 870, d: 90, o: 0 }, 0, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.face('kid2', true, sw, 0.01); s.mouth('kid2', 'sad', sw, 0.01); s.acc('kid2', 'bow');
      s.actor('adult3', { x: 700, y: 800, d: 160, o: 0 }, 0, 0.01); s.actor('adult3', { o: 1 }, sw, 0.01);
      s.face('adult3', true, sw, 0.01); s.mouth('adult3', 'smile', sw, 0.01); s.gaze('adult3', 9, 2, sw, 0.01); s.acc('adult3', 'beard');
      K().tag(s, 'папа Ани', 700, 900, sw + 0.2, sw + 3);
      [6.4, 6.7, 7.0].forEach(function (t) { s.squash('adult3', 1.05, 0.95, t, 0.12); s.squash('adult3', 1, 1, t + 0.12, 0.15); }); // смеётся
      K().say(s, 'У тебя никогда не получится!', 480, 600, 6.4, 8.8);
      s.gaze('kid2', -6, 6, 7.0, 0.3);
      var t3 = s.text('h3', 'Высмеяли — «я хуже других». Эриксон: трудолюбие против неполноценности.', { left: 140, top: 230, width: 1640, fontSize: 44 });
      s.lines(t3, 9.0);
      var src = s.text('cite', 'industry vs. inferiority · Э. Эриксон, 1950 · «Я — это то, чему я учусь», 1959', { left: 140, top: 1020, fontSize: 18 });
      s.fade(src, 10.4, { y: 4 });
      ['kid2', 'adult3'].forEach(function (id) { s.actor(id, { o: 0 }, 14.4, 0.4); });
    }
  });
})();
