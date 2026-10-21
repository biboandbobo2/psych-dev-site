/* Глава 4. «Я умею» · все трое: один из двадцати (Рубл, Хартер, Орт), кого не зовут (Коуи и др.), «Я умею» (Эриксон) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', TEAL = '#26A69A', DIM = '#C9C2B6';

  // Текст поверх кадра, который двигает камера: слой #ui на светлой подложке; гасить вручную (s.out)
  function pane(s, cls, html, st) {
    st.background = 'rgba(255, 253, 248, 0.94)'; st.padding = '12px 22px 14px'; st.borderRadius = 14;
    return s.hud(cls, html, st);
  }
  function show(s, e, at) { s.tween(e, at, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }); }
  // Реплика в слое #ui — когда камера увеличивает кадр (иначе облачко раздувается вместе с ним)
  function sayH(s, text, x, y, at, out, tail) {
    var b = s.hud('bubble say tail-' + (tail || 'l'), text, { left: x, top: y });
    s.pop(b, at, { from: 0.7, dur: 0.4, origin: (tail === 'r' ? '90%' : '10%') + ' 100%' });
    s.out(b, out, { dur: 0.3 });
    return b;
  }
  function concl(s, html, at) { // вывод — внизу, держится до конца сцены
    var e = s.text('lead', html, { left: 140, top: 940, width: 1640, fontSize: 36, fontWeight: 650, color: 'var(--accent-deep)' });
    s.lines(e, at);
    return e;
  }
  function cite(s, html, at) { var e = s.text('cite', html, { left: 140, top: 1020, fontSize: 20 }); s.fade(e, at, { y: 4 }); return e; }
  // Мяч, который двигается целиком (x, y — положение центра)
  function ballG(s, g, x, y, r) {
    var b = s.node(g, 'g', {}); K().ball(s, b, 0, 0, r || 18);
    s.set(b, 0, { x: x, y: y }, { x: x, y: y });
    b.__p = { x: x, y: y };
    return b;
  }
  function toss(s, b, x, y, at, dur, h) { // мяч летит дугой
    var f = b.__p, top = Math.min(f.y, y) - (h == null ? 120 : h);
    s.tween(b, at, { x: f.x }, { x: x, duration: dur, ease: 'none' });
    s.tween(b, at, { y: f.y }, { y: top, duration: dur / 2, ease: 'power2.out' });
    s.tween(b, at + dur / 2, { y: top }, { y: y, duration: dur / 2, ease: 'power2.in' });
    b.__p = { x: x, y: y };
  }
  function jump(s, b, x, y, at) { s.set(b, at, { x: b.__p.x, y: b.__p.y }, { x: x, y: y }); b.__p = { x: x, y: y }; }

  // 3:42,5 — заставка главы: три дорожки сближаются, Димина ещё отдельно (25 тактов главы = 62,5 с)
  Film.scene({
    id: 'ch4', bars: 2,
    build: function (s) {
      s.chapterCard(4, '«Я умею»', 'Миша, Аня и Дима среди других');
      K().pathsCard(s, 4, null, [{ who: 'dima', x: 1150, text: 'шёпот' }, { who: 'dima', x: 1290, text: 'знания — память' }]);
      s.chapter(4, '«Я умею»', 0.4, 61.9);
    }
  });

  // Наш класс: 4 ровных ряда по 5 парт, перспектива мягкая (задний ряд ×0,73) — класс один, а не «дальний ряд отдельно».
  // На местах героев — только парта (герои — актёры); остальные — постоянные одноклассники 0…16
  var ROWS = [[990, 1], [860, 0.9], [740, 0.81], [630, 0.73]];
  function klass(s, g, heroes) {
    var spots = {}, n = 0;
    for (var r = 3; r >= 0; r--) {
      var y = ROWS[r][0], k = ROWS[r][1], span = 1500 * k;
      for (var c = 0; c < 5; c++) {
        var x = 960 - span / 2 + span * (c + 0.5) / 5, id = r + ',' + c;
        spots[id] = { x: x, y: y, k: k, hy: y - 64 * k, d: 80 * k };
        if (!heroes[id]) K().classmate(g, n++, x, y - 64 * k, 40 * k);
        K().desk(s, g, x, y, k);
      }
    }
    return spots;
  }
  function room(s, g) { // стены класса: окна и доска
    [[150, 170], [1540, 170]].forEach(function (p) {
      s.node(g, 'rect', { x: p[0], y: p[1], width: 230, height: 260, rx: 6, fill: '#CFE6EE', stroke: INK, 'stroke-width': 3 });
      s.path(g, 'M' + (p[0] + 115) + ' ' + p[1] + ' v260 M' + p[0] + ' ' + (p[1] + 130) + ' h230', { stroke: INK, 'stroke-width': 2.5 });
    });
    s.node(g, 'rect', { x: 690, y: 190, width: 540, height: 300, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 8 });
    var ch = s.node(g, 'text', { x: 730, y: 260, fill: '#E8EEE6', style: 'font-family: DOMKid; font-size: 40px;' }); ch.textContent = '21 сентября';
    var ch2 = s.node(g, 'text', { x: 730, y: 330, fill: '#E8EEE6', style: 'font-family: DOMKid; font-size: 40px;' }); ch2.textContent = '8 + 7 = 15';
    s.path(g, 'M0 560 H1920', { stroke: '#E3DACB', 'stroke-width': 3 });
  }

  // 3:47,5 — Один из двадцати: сравнивает себя с соседом; самооценка по областям (Д. Рубл и др., 1980; С. Хартер; У. Орт и др., 2018)
  Film.scene({
    id: 'twenty', bars: 7,
    build: function (s) {
      var g = s.svg(), cls = s.node(g, 'g', {});
      room(s, cls);
      var P = klass(s, cls, { '0,2': 1, '0,3': 1, '1,0': 1 });
      var M = P['0,3'], An = P['0,2'], D = P['1,0'];
      K().cast(s, 'misha', M.x, M.hy, M.d, 0, { dur: 0.01, mouth: 'soft', gy: 6 });
      K().cast(s, 'anya', An.x, An.hy, An.d, 0, { dur: 0.01, mouth: 'soft', gy: 6 });
      K().cast(s, 'dima', D.x, D.hy, D.d, 0, { dur: 0.01, mouth: 'soft', gy: 4 });
      K().cast(s, 'teacher', 580, 430, 150, 0, { dur: 0.01, gx: 8, gy: 2 });
      // тетради на партах и отметки
      var marks = [];
      [[M, '4'], [An, '5']].forEach(function (p) {
        var x = p[0].x, y = p[0].y;
        s.path(cls, 'M' + (x - 70) + ' ' + (y - 2) + ' L' + (x + 70) + ' ' + (y - 2) + ' L' + (x + 58) + ' ' + (y - 24) + ' L' + (x - 58) + ' ' + (y - 24) + ' Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 2 });
        var m = s.node(cls, 'text', { x: x, y: y + 2, 'text-anchor': 'middle', fill: '#D9534F', style: 'font-family: DOMHand; font-size: 64px;' });
        m.textContent = p[1]; marks.push(m);
      });
      // кадр 1: крупно Миша → отъезд: класс из двадцати
      s.cam({ cx: M.x, cy: M.hy + 20, z: 2.6 }, 0, 0.01);
      s.gaze('baby', 0, -4, 0.5, 0.3);
      s.cam({ cx: 960, cy: 540, z: 1 }, 0.3, 2.1, 'power2.inOut');
      // кадр 2: наезд на две парты — «4» и «5»
      s.cam({ cx: (M.x + An.x) / 2, cy: 860, z: 1.7 }, 2.9, 0.9, 'power2.inOut');
      s.tween(marks[0], 3.9, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      s.tween(marks[1], 4.1, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      s.mouth('kid2', 'smile', 4.2, 0.2);
      s.gaze('baby', -8, 4, 4.3, 0.3);
      sayH(s, 'У неё пять!', 1180, 470, 4.4, 6.4);
      s.mouth('baby', 'flat', 5.2, 0.3);
      var t1 = pane(s, 'h3', 'С 7–8 лет ребёнок оценивает себя, сравнивая с другими детьми.', { left: 120, top: 130, width: 880, fontSize: 44 });
      show(s, t1, 4.8);
      // пять плиток «Я» над Мишей; средняя линия
      var card = s.hud('card', '', { left: 1110, top: 130, width: 680, height: 410 });
      var sv = Film.svg('svg', { width: 680, height: 410, viewBox: '0 0 680 410' }, card);
      sv.style.position = 'absolute'; sv.style.left = '0'; sv.style.top = '0';
      var ya = Film.svg('text', { x: 30, y: 62, style: 'font-family: DOMKid; font-size: 46px; fill: #13534D;' }, sv); ya.textContent = 'Я';
      var H0 = [140, 110, 150, 120, 130], BASE = 330, bars = [];
      ['учёба', 'спорт', 'друзья', 'внешность', 'поведение'].forEach(function (l, i) {
        var x = 52 + i * 126;
        var r = Film.svg('rect', { x: x, y: BASE, width: 82, height: 0, rx: 8, fill: i % 2 ? '#9FD6CF' : TEAL, stroke: INK, 'stroke-width': 2.5 }, sv);
        s.tween(r, 6.6 + i * 0.12, { attr: { y: BASE, height: 0 } }, { attr: { y: BASE - H0[i], height: H0[i] }, duration: 0.45, ease: 'back.out(1.6)' });
        var tx = Film.svg('text', { x: x + 41, y: BASE + 34, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 650; font-size: 21px; fill: #3A4654;' }, sv); tx.textContent = l;
        bars.push(r);
      });
      var mid = Film.svg('path', { d: 'M36 ' + (BASE - 130) + ' H668', stroke: '#D9534F', 'stroke-width': 3, 'stroke-dasharray': '10 8', fill: 'none', opacity: 0 }, sv);
      s.tween(mid, 7.4, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var ml = Film.svg('text', { x: 668, y: BASE - 142, 'text-anchor': 'end', opacity: 0, style: 'font-family: DOMSans; font-weight: 650; font-size: 20px; fill: #B8433F;' }, sv); ml.textContent = 'в среднем';
      s.tween(ml, 7.4, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.tween(card, 6.5, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      // «учёба» опускается
      s.tween(bars[0], 8.0, { attr: { y: BASE - 140, height: 140 } }, { attr: { y: BASE - 60, height: 60 }, duration: 0.6, ease: 'power2.inOut' });
      s.mouth('baby', 'sad', 8.0, 0.3); s.gaze('baby', 0, 6, 8.0, 0.3);
      // кадр 3: перемена — Миша бегает быстрее всех, «спорт» поднимается
      var sw = K().flip(s, 8.5);
      s.cam({ cx: 960, cy: 540, z: 1 }, sw, 0.01);
      s.set(cls, sw, { opacity: 1 }, { opacity: 0 });
      s.actor('kid3', { o: 0 }, sw, 0.01);
      var yard = s.node(g, 'g', { opacity: 0 });
      s.set(yard, sw, { opacity: 0 }, { opacity: 1 });
      K().schoolHouse(s, yard, 300, 880, 1.0);
      K().tree(s, yard, 1880, 880, 0.9);
      s.path(yard, 'M0 880 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      s.path(yard, 'M1380 780 V900', { stroke: '#B9B2A6', 'stroke-width': 5, 'stroke-dasharray': '14 10' });
      [[0, 680, 838, 1180, 42], [4, 630, 812, 1090, 38], [9, 590, 826, 1010, 40]].forEach(function (c) {
        var h = s.node(yard, 'g', {}); K().classmate(h, c[0], 0, 0, c[4], { mouth: 'smile' });
        s.set(h, sw, { x: c[1], y: c[2] }, { x: c[1], y: c[2] });
        s.tween(h, 9.0, { x: c[1] }, { x: c[3], duration: 1.9, ease: 'power1.inOut' });
      });
      s.actor('baby', { x: 720, y: 840, d: 96 }, sw, 0.01); s.mouth('baby', 'smile', sw, 0.01); s.gaze('baby', 8, 0, sw, 0.01);
      s.actor('kid2', { x: 1580, y: 840, d: 90 }, sw, 0.01); s.gaze('kid2', -8, 0, sw, 0.01);
      s.actor('adult2', { x: 1700, y: 800, d: 160 }, sw, 0.01); s.gaze('adult2', -8, 0, sw, 0.01);
      for (var i = 0; i < 5; i++) s.hop('baby', 720 + (i + 1) * 140, 840, 9.0 + i * 0.38, 0.28, 34);
      s.hop('kid2', 1580, 840, 10.7, 0.3, 40);
      s.tween(bars[1], 11.0, { attr: { y: BASE - 110, height: 110 } }, { attr: { y: BASE - 190, height: 190 }, duration: 0.6, ease: 'back.out(1.4)' });
      concl(s, 'Вывод: самооценка делится на области и становится точнее — но в среднем не падает.', 11.2);
      cite(s, 'social comparison · Д. Рубл и др., 1980 · С. Хартер · У. Орт и др., 2018: 331 выборка', 11.8);
      s.out([t1, card], 16.6, { dur: 0.4 });
      ['baby', 'kid2', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 17.1, 0.3); });
    }
  });

  // 4:05 — Кого не зовут: вышибалы, скачки времени — Дима всё время у стены; учитель отдаёт мяч Мише, Миша и Аня зовут Диму
  // (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'outcast', bars: 10,
    build: function (s) {
      var g = s.svg();
      // двор: забор, стена, поле мелом, скамейка, дерево
      s.path(g, 'M0 700 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      for (var fx = 360; fx < 1920; fx += 70) s.path(g, 'M' + fx + ' 700 V610', { stroke: '#D9CFBF', 'stroke-width': 6 });
      s.path(g, 'M330 632 H1920', { stroke: '#D9CFBF', 'stroke-width': 5 });
      K().schoolHouse(s, g, 1400, 700, 0.75);
      K().tree(s, g, 1830, 720, 1.0);
      K().bench(s, g, 1180, 705, 0.9);
      s.path(g, 'M600 915 L1760 915 L1700 740 L660 740 Z', { stroke: '#BDB5A8', 'stroke-width': 4, 'stroke-dasharray': '16 10' });
      var spot = s.node(g, 'ellipse', { cx: 210, cy: 680, rx: 190, ry: 280, fill: '#FFF1A6', opacity: 0 });
      s.node(g, 'rect', { x: 100, y: 360, width: 220, height: 550, fill: '#E8DCCB', stroke: INK, 'stroke-width': 3, opacity: 0.85 });
      [420, 480, 540, 600, 660, 720, 780, 840].forEach(function (y, i) {
        s.path(g, 'M100 ' + y + ' H320', { stroke: '#C9BFB2', 'stroke-width': 2 });
        s.path(g, 'M' + (i % 2 ? 170 : 240) + ' ' + y + ' v60', { stroke: '#C9BFB2', 'stroke-width': 2 });
      });
      s.tween(spot, 2.6, { opacity: 0 }, { opacity: 0.75, duration: 0.6 });
      K().cast(s, 'dima', 230, 849, 92, 0, { dur: 0.01, mouth: 'flat', gx: 8, gy: 0 });
      // игроки: Миша, Аня и пятеро одноклассников; [x, низ] — по «неделям»
      var W = [
        { m: [1180, 800], a: [1300, 880], c: [[680, 860], [1690, 840], [1060, 895], [1420, 790], [1128, 651]], b: [730, 820] },
        { m: [680, 870], a: [1420, 820], c: [[1150, 800], [1128, 651], [1232, 651], [1690, 885], [1280, 895]], b: [730, 850] },
        { m: [1250, 895], a: [1400, 895], c: [[1128, 651], [1340, 780], [1730, 830], [1232, 651], [680, 880]], b: null }];
      var R = 46, kids = [0, 1, 2, 3, 4].map(function (i) {
        var h = s.node(g, 'g', {}); K().classmate(h, i + 3, 0, 0, R, { mouth: 'smile' });
        s.set(h, 0, { x: W[0].c[i][0], y: W[0].c[i][1] - R }, { x: W[0].c[i][0], y: W[0].c[i][1] - R });
        return h;
      });
      K().cast(s, 'misha', W[0].m[0], W[0].m[1] - R, 2 * R, 0, { dur: 0.01, gx: -6 });
      K().cast(s, 'anya', W[0].a[0], W[0].a[1] - R, 2 * R, 0, { dur: 0.01, gx: -6 });
      var gb = ballG(s, g, 730, 820, 20);
      toss(s, gb, 1640, 800, 0.8, 0.8); toss(s, gb, 730, 820, 1.9, 0.8);
      s.gaze('kid3', 8, -2, 0.8, 0.3);
      // кадр 1: Дима у стены подсвечен, остальные приглушены
      var crowd = kids.concat([gb]);
      s.tween(crowd, 2.8, { opacity: 1 }, { opacity: 0.35, duration: 0.6 });
      s.actor('baby', { o: 0.35 }, 2.8, 0.6); s.actor('kid2', { o: 0.35 }, 2.8, 0.6);
      s.gaze('kid3', 0, 4, 3.0, 0.4);
      var q = s.text('h3', 'Кто в классе остаётся у стены?', { left: 140, top: 130, width: 1640 });
      s.lines(q, 0.4);
      var t2 = s.text('lead', 'Класс — вторая группа после семьи. Дольше всего держится роль того, кого не зовут играть.', { left: 140, top: 210, width: 1400, fontSize: 34 });
      s.lines(t2, 4.2);
      // кадр 2: скачки времени — роли меняются, Дима у стены
      [[4.9, 'через неделю', 1], [7.4, 'через месяц', 2]].forEach(function (j) {
        var w = W[j[2]], at = j[0];
        kids.forEach(function (h, i) { s.set(h, at, { x: W[j[2] - 1].c[i][0], y: W[j[2] - 1].c[i][1] - R }, { x: w.c[i][0], y: w.c[i][1] - R }); });
        s.actor('baby', { x: w.m[0], y: w.m[1] - R }, at, 0.01); s.actor('kid2', { x: w.a[0], y: w.a[1] - R }, at, 0.01);
        if (w.b) jump(s, gb, w.b[0], w.b[1], at); else s.set(gb, at, { opacity: 0.35 }, { opacity: 0 });
        var lb = s.text('kidhand', j[1], { left: 420, top: 420, fontSize: 50, color: '#13534D' });
        s.tween(lb, at, { opacity: 0 }, { opacity: 1, duration: 0.01 });
        s.set(lb, at + 2.3, { opacity: 1 }, { opacity: 0 });
      });
      var lb0 = s.text('kidhand', 'понедельник', { left: 420, top: 420, fontSize: 50, color: '#13534D' });
      s.fade(lb0, 3.0, { y: 0, dur: 0.3 }); s.set(lb0, 4.9, { opacity: 1 }, { opacity: 0 });
      toss(s, gb, 1640, 840, 5.6, 0.8); toss(s, gb, 730, 850, 6.6, 0.7);
      s.gaze('kid3', 6, 0, 5.6, 0.3); s.gaze('kid3', 0, 4, 7.0, 0.3);
      // кадр 3: учитель приносит мяч и отдаёт Мише
      s.tween(crowd.slice(0, 5), 9.9, { opacity: 0.35 }, { opacity: 1, duration: 0.5 });
      s.actor('baby', { o: 1 }, 9.9, 0.5); s.actor('kid2', { o: 1 }, 9.9, 0.5);
      K().cast(s, 'teacher', 2050, 785, 150, 9.9, { dur: 0.01, gx: -8 });
      var tb = ballG(s, g, 1985, 805, 20); s.set(tb, 0, { opacity: 0 }, { opacity: 0 }); s.set(tb, 9.9, { opacity: 0 }, { opacity: 1 });
      K().walk(s, 'adult2', 1580, 10.0, { carry: tb, cx: 1985, step: 118, dur: 0.26, hold: 0.06 });
      tb.__p = { x: 1985 - 470, y: 805 };
      s.gaze('baby', 8, -2, 10.4, 0.3); s.gaze('kid2', 8, -2, 10.4, 0.3);
      K().say(s, 'Собирай команду', 1090, 620, 11.6, 13.6, 'r');
      toss(s, tb, 1305, 865, 12.6, 0.5, 60);
      s.mouth('baby', 'smile', 12.8, 0.2); s.squash('baby', 1.06, 0.94, 13.1, 0.1); s.squash('baby', 1, 1, 13.2, 0.2);
      s.gaze('baby', -9, 0, 13.6, 0.3); s.gaze('kid2', -9, 0, 13.6, 0.3);
      // Миша и Аня идут к Диме: «Пойдём с нами!»
      K().walk(s, 'baby', 420, 13.9, { carry: tb, cx: 1305, step: 145, dur: 0.26, hold: 0.06 });
      K().walk(s, 'kid2', 560, 13.9, { step: 140, dur: 0.26, hold: 0.06 });
      K().say(s, 'Пойдём с нами!', 390, 700, 16.0, 18.4);
      s.gaze('kid3', 8, 0, 16.2, 0.3);
      s.mouth('kid3', 'smile', 17.0, 0.4);
      s.tween(spot, 17.8, { opacity: 0.75 }, { opacity: 0, duration: 0.6 });
      // Дима выходит от стены — три дорожки сходятся
      var MX = 900, MY = 912;
      [['dima', 'M230 905 C420 915, 640 918, ' + MX + ' ' + MY], ['misha', 'M1250 905 C1100 912, 1000 914, ' + MX + ' ' + MY], ['anya', 'M1400 905 C1250 925, 1050 920, ' + MX + ' ' + MY]].forEach(function (p, i) {
        var l = s.path(g, p[1], { stroke: K().KIDC[p[0]], 'stroke-width': 7, opacity: 0.85 });
        s.draw(l, 18.2 + i * 0.15, { dur: 0.9, ease: 'power1.inOut' });
      });
      K().walk(s, 'kid3', 760, 18.5, { step: 130, dur: 0.26, hold: 0.06 });
      K().walk(s, 'baby', 900, 18.5, { carry: tb, cx: 475, step: 120, dur: 0.26, hold: 0.06 });
      K().walk(s, 'kid2', 1040, 18.5, { step: 120, dur: 0.26, hold: 0.06 });
      s.gaze('kid3', 8, -2, 20.2, 0.3); s.gaze('baby', -8, -2, 20.2, 0.3);
      concl(s, 'Вывод: из этой роли помогают выйти взрослые — и друзья.', 18.6);
      cite(s, 'Дж. Коуи, К. Додж, Х. Коппотелли, 1982: популярные · отвергаемые · пренебрегаемые · противоречивые · средние', 19.4);
      [['kid3', 760], ['baby', 900], ['kid2', 1040]].forEach(function (h, i) { s.hop(h[0], h[1], 849, 21.2 + i * 0.08, 0.36, 46); });
      ['kid3', 'baby', 'kid2', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 24.6, 0.3); });
    }
  });

  // 4:30 — «Я умею»: три быстрых плана; Аню высмеяли — друзья рядом, вторая попытка (Э. Эриксон, 1950; 1959)
  Film.scene({
    id: 'ican', bars: 6,
    build: function (s) {
      var g = s.svg();
      var q = s.text('h3', 'Главный вопрос возраста — «Могу ли я?»', { left: 140, top: 130, width: 1640 });
      s.lines(q, 0.2);
      // кадр 1: три плана рядом
      var tri = s.node(g, 'g', {});
      [140, 700, 1260].forEach(function (x) { s.node(tri, 'rect', { x: x, y: 330, width: 520, height: 540, rx: 18, fill: '#FFFDF8', stroke: '#E3DACB', 'stroke-width': 2.5 }); });
      // а) велосипед: мама отпускает седло
      s.path(tri, 'M160 830 H640', { stroke: '#CDC3B4', 'stroke-width': 3 });
      var bike = s.node(tri, 'g', {}), BX = 330, BY = 788, k = 1.3;
      [-52, 52].forEach(function (dx) { s.node(bike, 'circle', { cx: BX + dx * k, cy: BY, r: 30 * k, fill: 'none', stroke: INK, 'stroke-width': 5 }); });
      s.path(bike, 'M' + (BX - 52 * k) + ' ' + BY + ' L' + (BX - 8 * k) + ' ' + (BY - 44 * k) + ' L' + (BX + 52 * k) + ' ' + BY + ' M' + (BX - 8 * k) + ' ' + (BY - 44 * k) + ' L' + (BX + 30 * k) + ' ' + (BY - 48 * k) + ' M' + (BX + 38 * k) + ' ' + (BY - 66 * k) + ' L' + (BX + 52 * k) + ' ' + BY, { stroke: INK, 'stroke-width': 5 });
      s.node(bike, 'rect', { x: BX - 30 * k, y: BY - 56 * k, width: 40 * k, height: 12, rx: 6, fill: INK });
      K().cast(s, 'mom', 220, 620, 140, 0, { gx: 8, gy: 4 });
      K().cast(s, 'misha', BX - 8, BY - 56 * k - 46, 92, 0, { mouth: 'soft', gx: 8 });
      var hold = s.path(tri, 'M262 676 L' + (BX - 30) + ' ' + (BY - 64), { stroke: '#7B6A8F', 'stroke-width': 8 });
      s.set(hold, 1.0, { opacity: 1 }, { opacity: 0 });
      s.tween(bike, 1.0, { x: 0 }, { x: 160, duration: 1.4, ease: 'power1.inOut' });
      s.actor('baby', { x: BX - 8 + 160 }, 1.0, 1.4, 'power1.inOut');
      s.mouth('baby', 'smile', 1.6, 0.3);
      // б) Аня решает пример у доски; учитель рядом
      s.node(tri, 'rect', { x: 740, y: 430, width: 440, height: 190, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 7 });
      var ex = s.text('kidhand', '7 × 8 = 56', { left: 790, top: 480, fontSize: 64, color: '#E8EEE6' });
      s.fade(ex, 1.9, { y: 0, dur: 0.6 });
      K().cast(s, 'anya', 830, 720, 104, 0, { mouth: 'soft', gx: 2, gy: -6 });
      K().cast(s, 'teacher', 1080, 700, 140, 0, { gx: -8, gy: 0 });
      s.mouth('kid2', 'smile', 2.6, 0.3);
      // в) Дима ставит мат лошадкой-конём; папа удивлён
      var bd = s.node(tri, 'g', {});
      s.node(bd, 'rect', { x: 1290, y: 800, width: 440, height: 26, rx: 4, fill: '#C9A27A', stroke: INK, 'stroke-width': 3 });
      for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) s.node(bd, 'rect', { x: 1330 + c * 60, y: 680 + r * 60, width: 60, height: 60, fill: (r + c) % 2 ? '#8A6A4A' : '#F3E6D2', stroke: INK, 'stroke-width': 1.5 });
      K().pawn(s, bd, 1600, 730, 1.1, false);
      var kn = s.node(tri, 'g', {}); K().toyHorse(s, kn, 1420, 794, 0.55);
      s.tween(kn, 3.4, { x: 0, y: 0 }, { x: 120, y: -60, duration: 0.5, ease: 'power2.inOut' });
      K().cast(s, 'dima', 1360, 590, 104, 0, { mouth: 'soft', gx: 8, gy: 5 });
      K().cast(s, 'dad', 1660, 570, 140, 0, { mouth: 'soft', gx: -8, gy: 5 });
      s.mouth('kid3', 'smile', 3.9, 0.3); s.mouth('dad', 'flat', 3.9, 0.3);
      // «Я умею!» над каждым
      var labs = [ex];
      [[400, 1.6], [960, 2.6], [1520, 3.9]].forEach(function (p) {
        var e = s.text('kidhand', 'Я умею!', { left: p[0] - 150, top: 345, width: 300, textAlign: 'center', fontSize: 54, color: '#13534D' });
        s.pop(e, p[1], { from: 0.6, dur: 0.4 }); labs.push(e);
      });
      // кадр 2: Аня у доски ошибается — смеются; Миша и Дима рядом — со второй попытки
      var sw = K().flip(s, 6.2);
      s.set(tri, sw, { opacity: 1 }, { opacity: 0 });
      s.set(labs, sw, { opacity: 1 }, { opacity: 0 });
      ['baby', 'adult', 'kid3', 'dad'].forEach(function (id) { s.actor(id, { o: 0 }, sw, 0.01); });
      var cl = s.node(g, 'g', { opacity: 0 }); s.set(cl, sw, { opacity: 0 }, { opacity: 1 });
      s.node(cl, 'rect', { x: 520, y: 280, width: 860, height: 320, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 8 });
      s.path(cl, 'M0 640 H1920', { stroke: '#E3DACB', 'stroke-width': 3 });
      [[1250, 4], [1480, 6], [1710, 12]].forEach(function (p) { K().classmate(cl, p[1], p[0], 796, 40, { mouth: p[1] === 6 ? 'smile' : 'soft' }); K().desk(s, cl, p[0], 860, 1); });
      s.actor('kid2', { x: 620, y: 720, d: 110 }, sw, 0.01); s.mouth('kid2', 'soft', sw, 0.01); s.gaze('kid2', 6, -6, sw, 0.01);
      s.actor('adult2', { x: 320, y: 640, d: 180 }, sw, 0.01); s.gaze('adult2', 8, 0, sw, 0.01); s.mouth('adult2', 'soft', sw, 0.01);
      var w1 = s.text('kidhand', '9 × 6 = 52', { left: 600, top: 380, fontSize: 64, color: '#E8EEE6' });
      s.tween(w1, 7.0, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      // плитка «учёба» у Ани
      var tile = s.node(cl, 'rect', { x: 694, y: 650, width: 54, height: 80, rx: 6, fill: TEAL, stroke: INK, 'stroke-width': 2.5 });
      var tlab = s.text('note', 'учёба', { left: 671, top: 734, width: 100, textAlign: 'center', fontSize: 21, color: '#3A4654' });
      s.tween(tlab, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      K().say(s, 'Ты никогда не научишься!', 1010, 640, 7.6, 10.0, 'r');
      s.tween(tile, 8.4, { attr: { fill: TEAL } }, { attr: { fill: DIM }, duration: 0.5 });
      s.mouth('kid2', 'sad', 8.2, 0.3); s.gaze('kid2', 6, 6, 8.2, 0.3);
      // друзья встают рядом
      K().cast(s, 'misha', 1000, 720, 104, 9.6, { mouth: 'smile', gx: -8 });
      K().cast(s, 'dima', 1130, 720, 104, 9.6, { mouth: 'smile', gx: -8 });
      s.actor('baby', { x: 830 }, 9.7, 0.7, 'power2.out'); s.actor('kid3', { x: 960 }, 9.8, 0.7, 'power2.out');
      s.gaze('kid2', 8, 0, 10.2, 0.3); s.mouth('kid2', 'soft', 10.2, 0.3);
      s.set(w1, 10.8, { opacity: 1 }, { opacity: 0 });
      var w2 = s.text('kidhand', '9 × 6 = 54', { left: 600, top: 380, fontSize: 64, color: '#E8EEE6' });
      s.tween(w2, 11.0, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.gaze('kid2', 6, -6, 10.8, 0.3);
      s.tween(tile, 11.6, { attr: { fill: DIM } }, { attr: { fill: TEAL }, duration: 0.5 });
      s.mouth('kid2', 'smile', 11.6, 0.3); s.hop('kid2', 620, 720, 11.7, 0.32, 36);
      concl(s, 'Вывод: получается — «я умею». Высмеивают — «я хуже других».', 10.2);
      cite(s, 'Э. Эриксон, 1950 · «Я — это то, чему я учусь», 1959 · трудолюбие против неполноценности · industry vs. inferiority', 10.8);
      ['baby', 'kid2', 'kid3', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 14.6, 0.3); });
    }
  });
})();
