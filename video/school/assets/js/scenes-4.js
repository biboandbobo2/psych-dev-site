/* Глава 4. «Я могу» · все трое (v3.3): один из двадцати (Рубл, Хартер, Орт), кого не зовут (Коуи и др.), «Я могу» (Эриксон).
   Язык главы — линии отношений: тонкая линия — кто с кем играет; к тому, кого не зовут, линий нет. */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', TEAL = '#26A69A', PAPER = '#FFFDF8', RED = '#D9534F', LINK = '#2B8F84', CHALK = '#F4F1E6';
  var CH = 62.5; // длина главы: 25 тактов

  // Реплика в слое #ui — когда камера увеличивает кадр (иначе облачко раздувается вместе с ним). o.w — ширина (перенос строк)
  function sayH(s, text, x, y, at, out, tail, o) {
    var st = { left: x, top: y };
    if (o && o.w) { st.width = o.w; st.whiteSpace = 'normal'; st.lineHeight = 1.1; st.fontSize = o.fs || 36; }
    var b = s.hud('bubble say tail-' + (tail || 'l'), text, st);
    s.pop(b, at, { from: 0.7, dur: 0.4, origin: (tail === 'r' ? '90%' : '10%') + ' 100%' });
    s.out(b, out, { dur: 0.3 });
    return b;
  }
  // «Вывод:» — тот же стиль, что в главе 1; источник — мелко под ним
  function concl(s, html, at) {
    var e = s.text('lead', '<b class="acc">Вывод:</b> ' + html, { left: 140, top: 912, width: 1640, fontSize: 32, lineHeight: 1.3 });
    s.lines(e, at);
    return e;
  }
  function cite(s, html, at) { var e = s.text('cite', html, { left: 140, top: 1030, width: 1640, fontSize: 20 }); s.fade(e, at, { y: 4 }); return e; }
  function off(s, ids, lt) { ids.forEach(function (id) { s.actor(id, { o: 0 }, lt, 0.3); s.hands(id, 'off', lt + 0.3, 0.01); s.brow(id, 'calm', lt + 0.3, 0.01); }); }
  function hide(s, ids, lt) { ids.forEach(function (id) { s.actor(id, { o: 0 }, lt, 0.01); s.hands(id, 'off', lt, 0.01); }); } // под перелистыванием
  // Подвижная группа: (x, y) — положение; перемещение — move / arc
  function grpAt(s, g, x, y) { var b = s.node(g, 'g', {}); s.set(b, 0, { x: x, y: y }, { x: x, y: y }); b.__p = { x: x, y: y }; return b; }
  function move(s, b, x, y, at, dur, ease) { var f = b.__p; s.tween(b, at, { x: f.x, y: f.y }, { x: x, y: y, duration: dur, ease: ease || 'power2.inOut' }); b.__p = { x: x, y: y }; }
  function jump(s, b, x, y, at) { s.set(b, at, { x: b.__p.x, y: b.__p.y }, { x: x, y: y }); b.__p = { x: x, y: y }; }
  function arc(s, b, x, y, at, dur, h) { // дугой (мяч, передача тетради)
    var f = b.__p, top = Math.min(f.y, y) - (h == null ? 110 : h);
    s.tween(b, at, { x: f.x }, { x: x, duration: dur, ease: 'none' });
    s.tween(b, at, { y: f.y }, { y: top, duration: dur / 2, ease: 'power2.out' });
    s.tween(b, at + dur / 2, { y: top }, { y: y, duration: dur / 2, ease: 'power2.in' });
    b.__p = { x: x, y: y };
  }
  // Шаги к точке (x, y): ровный шаг с остановкой, как K().walk, но и по глубине. Возвращает время окончания
  function walk2(s, id, x, y, lt, step) {
    var f = s.A[id].st, n = Math.max(1, Math.round(Math.hypot(x - f.x, y - f.y) / (step || 110))), x0 = f.x, y0 = f.y, t = lt;
    for (var i = 1; i <= n; i++) {
      s.squash(id, 1.04, 0.96, t, 0.08);
      s.actor(id, { x: x0 + (x - x0) * i / n, y: y0 + (y - y0) * i / n }, t + 0.08, 0.2, 'power2.inOut');
      s.squash(id, 1, 1, t + 0.08, 0.18);
      t += 0.26;
    }
    return t;
  }
  // Линия отношений между двумя детьми (центры кругов): прорисовывается за dur
  function link(s, g, a, b, at, dur) {
    var l = s.path(g, 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1], { stroke: LINK, 'stroke-width': 3.2 });
    s.draw(l, at, { dur: dur || 0.5, ease: 'power1.inOut' });
    return l;
  }
  // Раскрытая тетрадь, лежит на парте (вид сбоку-сверху); (0, 0) — середина нижнего края; mark — отметка красным
  function notebook(s, g, mark) {
    var n = s.node(g, 'g', {});
    s.path(n, 'M-64 0 L64 0 L52 -26 L-76 -26 Z', { fill: PAPER, stroke: INK, 'stroke-width': 2.2 });
    s.path(n, 'M0 0 L-12 -26', { stroke: INK, 'stroke-width': 1.8 });
    [-8, -16].forEach(function (y) { s.path(n, 'M' + (-56 - y * 0.4) + ' ' + y + ' H' + (-14 - y * 0.4), { stroke: '#9DB8C4', 'stroke-width': 1.6 }); });
    var m = s.node(n, 'text', { x: 0, y: 0, 'text-anchor': 'middle', fill: RED, transform: 'translate(24 -5) scale(1 0.6)', style: 'font-family: var(--hand); font-size: 50px;' });
    m.textContent = mark;
    return n;
  }
  // Мяч (центр в 0, 0)
  function ball(s, g, x, y) { var b = grpAt(s, g, x, y); K().ball(s, b, 0, 0, 17); return b; }
  function seat(cr, who) { var q = cr.heroes[who].split(':'); return cr.seats[+q[0]][+q[1]]; }
  function heroSkip(cr) { return [cr.heroes.misha, cr.heroes.anya, cr.heroes.dima]; }

  // 4:05 — Заставка: карта трёх дорожек; Миша и Аня идут рядом (между ними — линия «дружат»), Дима — ещё отдельно
  Film.scene({
    id: 'ch4', bars: 2,
    build: function (s) {
      s.chapterCard(4, '«Я могу»', 'Миша, Аня и Дима среди других');
      var g = s.svg(), m = P().paths(s, g, { ground: 640 });
      var at = { misha: [0.5, 0.68], anya: [0.58, 0.76], dima: [0.2, 0.34] }, ids = {}, ends = {};
      ['misha', 'anya', 'dima'].forEach(function (w) {
        var p0 = P().pathPoint(m, w, at[w][0]), d = 92 * p0.k;
        ids[w] = K().cast(s, w, p0.x, p0.y - d / 2, d, 0.1, { gx: 6, dur: 0.3 });
        for (var i = 1; i <= 5; i++) { // шагают по своей дорожке
          var q = P().pathPoint(m, w, at[w][0] + (at[w][1] - at[w][0]) * i / 5), t = 0.5 + (i - 1) * 0.3;
          s.squash(ids[w], 1.04, 0.96, t, 0.08);
          s.actor(ids[w], { x: q.x, y: q.y - d / 2 }, t + 0.08, 0.22, 'power2.inOut');
          s.squash(ids[w], 1, 1, t + 0.08, 0.2);
        }
        var e = P().pathPoint(m, w, at[w][1]); ends[w] = [e.x, e.y - d / 2];
      });
      s.gaze('baby', 8, -2, 2.1, 0.3); s.gaze('kid2', -8, -2, 2.1, 0.3); // Миша и Аня переглядываются
      link(s, g, ends.misha, ends.anya, 2.2, 0.5);
      var mx = (ends.misha[0] + ends.anya[0]) / 2, my = (ends.misha[1] + ends.anya[1]) / 2;
      var lb = s.node(g, 'text', { x: mx + 70, y: my + 92, 'text-anchor': 'start', style: 'font-family: DOMSans; font-weight: 650; font-size: 21px; fill: #13534D;' });
      lb.textContent = 'дружат';
      var lbl = s.path(g, 'M' + (mx + 66) + ' ' + (my + 74) + ' L' + (mx + 4) + ' ' + (my + 6), { stroke: '#13534D', 'stroke-width': 2 });
      s.tween([lb, lbl], 2.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.gaze('kid3', 6, 2, 2.4, 0.4);
      s.chapter(4, '«Я могу»', 0.4, CH - 0.6);
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.4);
    }
  });

  // 4:10 — Один из двадцати: тетради с отметками, «У неё пять!», столбчатая «Миша о себе»; перемена — бег
  // (Д. Рубл и др., 1980; С. Хартер; У. Орт и др., 2018)
  Film.scene({
    id: 'twenty', bars: 7,
    build: function (s) {
      var g = s.svg(), cls = s.node(g, 'g', {}), cr = P().classroom(s, cls, { boardText: 'Диктант' });
      P().fill(s, cls, cr.seats, heroSkip(cr), 0, -12);
      var M = seat(cr, 'misha'), A = seat(cr, 'anya'), D = seat(cr, 'dima');
      K().cast(s, 'misha', M.x, M.y, M.r * 2, 0, { dur: 0.01, gx: -12 }); s.gear('baby', 'backpack', true, 0, 0.01);
      K().cast(s, 'anya', A.x, A.y, A.r * 2, 0, { dur: 0.01, gx: -12 });
      K().cast(s, 'dima', D.x, D.y, D.r * 2, 0, { dur: 0.01, gx: -12 });
      var TY = P().standY(cr.floor, 150, true), TX = cr.teacher.x;
      K().cast(s, 'teacher', TX, TY, 150, 0, { dur: 0.01, gx: 10 });
      s.hands('adult2', 'hold', 0, 0.01); s.hands('baby', 'desk', 0, 0.01); s.hands('kid2', 'desk', 0, 0.01); s.hands('kid3', 'desk', 0, 0.01);
      // Ирина Петровна подходит со стопкой тетрадей и кладёт тетради на парту Миши; Аня получает свою через Мишу
      var TN = 700, stack = grpAt(s, cls, TX + 92, TY + 100);
      [0, 1, 2].forEach(function (i) { s.node(stack, 'rect', { x: -34, y: -10 - i * 9, width: 68, height: 9, rx: 2, fill: i === 1 ? '#CFE3EA' : PAPER, stroke: INK, 'stroke-width': 2 }); });
      var w1 = K().walk(s, 'adult2', TN, 0.1, { step: 100, dur: 0.22, hold: 0.04 });
      move(s, stack, TN + 92, TY + 100, 0.18, w1 - 0.1, 'none');
      var mDesk = [M.desk.x2 - 66, M.desk.y], aDesk = [A.desk.x2 - 66, A.desk.y], T1 = 0.2 + w1;
      var nbA = grpAt(s, cls, TN + 92, TY + 70), nbM = grpAt(s, cls, TN + 92, TY + 70);
      notebook(s, nbA, '5'); notebook(s, nbM, '4');
      s.set([nbM, nbA], 0, { opacity: 0 }, { opacity: 0 });
      s.set(nbM, T1, { opacity: 0 }, { opacity: 1 }); move(s, nbM, mDesk[0], mDesk[1], T1, 0.4);
      s.set(nbA, T1 + 0.3, { opacity: 0 }, { opacity: 1 }); move(s, nbA, mDesk[0] - 30, mDesk[1] - 2, T1 + 0.3, 0.4);
      s.gaze('baby', -8, 6, T1 + 0.3, 0.3); s.brow('baby', 'focus', T1 + 0.3, 0.3);
      // учитель возвращается к доске; Миша передаёт Ане её тетрадь назад
      K().walk(s, 'adult2', TX, T1 + 0.9, { step: 100, dur: 0.22, hold: 0.04 });
      move(s, stack, TX + 92, TY + 100, T1 + 0.95, 0.8, 'none');
      s.gaze('baby', 8, 2, T1 + 0.9, 0.25); s.hands('baby', 'hold', T1 + 0.9, 0.25);
      arc(s, nbA, aDesk[0], aDesk[1], T1 + 1.0, 0.6, 140);
      s.hands('baby', 'desk', T1 + 1.7, 0.3);
      s.cam({ cx: 1140, cy: 800, z: 1.9 }, T1 + 0.9, 1.0, 'power2.inOut');
      var T2 = T1 + 1.5;
      s.mouth('kid2', 'smile', T2, 0.3); s.brow('kid2', 'proud', T2, 0.3); s.gaze('kid2', -8, 6, T2, 0.3);
      s.gaze('baby', 10, 3, T2, 0.3);
      sayH(s, 'У неё пять!', 668, 424, T2 + 0.2, T2 + 2.4);
      s.brow('baby', 'doubt', T2 + 0.5, 0.3); s.mouth('baby', 'flat', T2 + 0.5, 0.3);
      // объяснение сверху (слой #ui: камера его не двигает)
      var T3 = T2 + 2.3, t1 = s.hud('h3', 'С 7–8 лет ребёнок оценивает себя, сравнивая с другими детьми.', { left: 140, top: 128, width: 880, fontSize: 44 });
      s.tween(t1, T3, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      s.cam({ cx: 960, cy: 540, z: 1 }, T3 - 0.2, 1.0, 'power2.inOut');
      s.gaze('baby', -12, 0, T3 + 0.4, 0.3); s.gaze('kid2', -12, 0, T3 + 0.4, 0.3);
      // столбчатая «Миша о себе» рядом с Мишей; пунктир «в среднем» не двигается
      var TC = T3 + 0.6, CW = 900, card = s.hud('card', '', { left: 690, top: 268, width: CW, height: 352 });
      var sv = Film.svg('svg', { width: CW, height: 352, viewBox: '0 0 ' + CW + ' 352' }, card);
      sv.style.position = 'absolute'; sv.style.left = '0'; sv.style.top = '0';
      var ti = Film.svg('text', { x: CW / 2, y: 48, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 750; font-size: 28px; fill: #13534D;' }, sv);
      ti.textContent = 'Миша о себе';
      var H0 = [150, 100, 140, 120, 140], BASE = 290, bars = []; // среднее — 130
      ['учёба', 'спорт', 'друзья', 'внешность', 'поведение'].forEach(function (l, i) {
        var x = 50 + i * 145;
        var r = Film.svg('rect', { x: x, y: BASE, width: 80, height: 0, rx: 6, fill: TEAL, stroke: INK, 'stroke-width': 2.4 }, sv);
        s.tween(r, TC + 0.2 + i * 0.1, { attr: { y: BASE, height: 0 } }, { attr: { y: BASE - H0[i], height: H0[i] }, duration: 0.45, ease: 'back.out(1.6)' });
        var tx = Film.svg('text', { x: x + 40, y: BASE + 34, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 650; font-size: 22px; fill: #3A4654;' }, sv);
        tx.textContent = l; bars.push(r);
      });
      Film.svg('path', { d: 'M30 ' + BASE + ' H' + (CW - 170), stroke: INK, 'stroke-width': 2, fill: 'none' }, sv);
      var mid = Film.svg('path', { d: 'M30 ' + (BASE - 130) + ' H' + (CW - 170), stroke: RED, 'stroke-width': 3, 'stroke-dasharray': '10 8', fill: 'none' }, sv);
      var ml = Film.svg('text', { x: CW - 160, y: BASE - 123, 'text-anchor': 'start', style: 'font-family: DOMSans; font-weight: 700; font-size: 21px; fill: #B8433F;' }, sv); ml.textContent = 'в среднем';
      s.tween([mid, ml], TC + 1.0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.tween(card, TC, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      var dots = [s.hud('', '', { left: 950, top: 636, width: 24, height: 24, borderRadius: 12, background: PAPER, border: '2.5px solid #A79C8E' }),
        s.hud('', '', { left: 978, top: 690, width: 16, height: 16, borderRadius: 8, background: PAPER, border: '2.5px solid #A79C8E' })];
      s.tween(dots, TC, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      // «учёба» чуть опускается
      s.tween(bars[0], TC + 1.5, { attr: { y: BASE - 150, height: 150 } }, { attr: { y: BASE - 115, height: 115 }, duration: 0.6, ease: 'power2.inOut' });
      s.mouth('baby', 'soft', TC + 1.5, 0.3);
      // перемена: Ирина Петровна объявляет — и двор
      sayH(s, 'Перемена!', TX - 26, 590, TC + 2.0, TC + 3.0);
      var sw = K().flip(s, TC + 2.8);
      s.set(cls, sw, { opacity: 1 }, { opacity: 0 });
      s.set(dots, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['kid3', 'adult2'], sw); s.hands('baby', 'off', sw, 0.01); s.hands('kid2', 'off', sw, 0.01);
      s.gear('baby', 'backpack', false, sw, 0.01); // на бегу — без ранца
      var yd = s.node(g, 'g', { opacity: 0 }), GR = 700;
      s.set(yd, sw, { opacity: 0 }, { opacity: 1 });
      s.node(yd, 'rect', { x: 0, y: GR, width: 1920, height: 1080 - GR, fill: '#CFC4AE' });
      s.path(yd, 'M0 ' + GR + ' H1920', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      P().school(s, yd, 330, GR, 0.9); P().tree(s, yd, 1840, GR, 0.75); P().bench(s, yd, 1690, GR, 1);
      var START = 380, FIN = 1460, LN = [[752, 34], [800, 40], [852, 46]], R0 = sw + 0.4; // дорожки забега: центр, радиус
      [[START, 'старт'], [FIN, 'финиш']].forEach(function (q) {
        s.path(yd, 'M' + q[0] + ' 734 V900', { stroke: '#FFFFFF', 'stroke-width': 6 });
        var t = s.node(yd, 'text', { x: q[0], y: 728, 'text-anchor': 'middle', fill: '#FFFFFF', style: 'font-family: var(--kid); font-size: 34px;' }); t.textContent = q[1];
      });
      [[3, 0, START - 40, FIN - 210], [8, 1, START - 40, FIN - 120]].forEach(function (c) {
        var b = grpAt(s, yd, c[2], LN[c[1]][0]); K().classmate(b, c[0], 0, 0, LN[c[1]][1], { gx: 8 });
        move(s, b, c[3], LN[c[1]][0], R0, 1.7, 'power1.inOut');
        for (var i = 0; i < 5; i++) { s.tween(b, R0 + i * 0.37, { y: LN[c[1]][0] }, { y: LN[c[1]][0] - 16, duration: 0.18, ease: 'power2.out' }); s.tween(b, R0 + 0.18 + i * 0.37, { y: LN[c[1]][0] - 16 }, { y: LN[c[1]][0], duration: 0.18, ease: 'power2.in' }); }
      });
      s.actor('baby', { x: START - 40, y: LN[2][0], d: 92 }, sw, 0.01); s.gaze('baby', 10, 0, sw, 0.01); s.brow('baby', 'focus', sw, 0.01); s.mouth('baby', 'flat', sw, 0.01);
      s.actor('kid2', { x: FIN + 170, y: 760, d: 84 }, sw, 0.01); s.gaze('kid2', -10, 0, sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01); s.brow('kid2', 'calm', sw, 0.01);
      for (var i = 0; i < 6; i++) s.hop('baby', START - 40 + (FIN + 60 - START + 40) * (i + 1) / 6, LN[2][0], R0 + i * 0.27, 0.22, 30);
      var RF = R0 + 1.75;
      s.hands('kid2', 'up', RF - 0.3, 0.3);
      s.brow('baby', 'proud', RF, 0.3); s.mouth('baby', 'smile', RF, 0.3); s.hands('baby', 'up', RF, 0.3);
      // «спорт» поднимается — пунктир «в среднем» на месте
      s.tween(bars[1], RF + 0.1, { attr: { y: BASE - 100, height: 100 } }, { attr: { y: BASE - 135, height: 135 }, duration: 0.6, ease: 'back.out(1.4)' });
      concl(s, 'самооценка делится на области и становится точнее — но в среднем не падает.', RF + 0.1);
      cite(s, 'social comparison · Д. Рубл и др., 1980 · С. Хартер · У. Орт и др., 2018: 331 выборка', RF + 0.8);
      s.out([t1, card], s.dur - 0.5, { dur: 0.4 });
      off(s, ['baby', 'kid2'], s.dur - 0.4);
    }
  });

  // 4:27,5 — Кого не зовут: передачи мяча рисуют линии между детьми; к Диме у стены — ни одной.
  // Скачки времени — линии меняются; Ирина Петровна отдаёт мяч Мише, Миша и Аня идут к Диме — Миша отдаёт ему лошадку.
  // (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'outcast', bars: 9,
    build: function (s) {
      var g = s.svg(), yd = P().yard(s, g, { ground: 760, schoolX: 360, schoolK: 0.75, classics: false });
      void yd;
      // табличка-календарь на столбике: «понедельник» → «через неделю» → «через месяц»
      var cal = s.node(g, 'g', {});
      s.path(cal, 'M1210 760 V690', { stroke: INK, 'stroke-width': 3 });
      s.node(cal, 'rect', { x: 1110, y: 606, width: 200, height: 86, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 2.6 });
      s.node(cal, 'rect', { x: 1110, y: 606, width: 200, height: 18, rx: 6, fill: RED });
      var calT = ['понедельник', 'через неделю', 'через месяц'].map(function (t) {
        var e = s.node(cal, 'text', { x: 1210, y: 670, 'text-anchor': 'middle', style: 'font-family: var(--kid); font-size: 32px; fill: #13534D;' });
        e.textContent = t; return e;
      });
      var nets = [s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {})], kg = s.node(g, 'g', {});
      // ранец Миши — у стены (играть удобнее без него), рядом игрушечная лошадка
      var bag = s.node(g, 'g', {});
      s.node(bag, 'rect', { x: 498, y: 742, width: 44, height: 54, rx: 11, fill: TEAL, stroke: '#1C7A71', 'stroke-width': 3 });
      s.node(bag, 'rect', { x: 506, y: 764, width: 18, height: 11, rx: 3, fill: '#F5D27A', stroke: '#1C7A71', 'stroke-width': 2 });
      var horse = grpAt(s, g, 572, 798); K().toyHorse(s, horse, 0, 0, 0.5);
      var DM = [420, 774];
      K().cast(s, 'dima', DM[0], DM[1], 92, 0, { dur: 0.01, mouth: 'soft', gx: 8 });
      // кольцо игры: шесть мест; по «неделям» дети меняются местами
      var R = 42, S = { A: [1740, 840], B: [1480, 884], C: [1200, 884], D: [860, 840], E: [1080, 806], F: [1620, 806] };
      var W = [{ m: 'C', a: 'E', c: ['D', 'F', 'A', 'B'] }, { m: 'F', a: 'D', c: ['A', 'E', 'C', 'B'] }, { m: 'D', a: 'E', c: ['F', 'C', 'A', 'B'] }]
        .map(function (w) { return { m: S[w.m], a: S[w.a], c: w.c.map(function (k) { return S[k]; }) }; });
      var cl = [0, 1, 2, 3].map(function (i) { var b = grpAt(s, kg, W[0].c[i][0], W[0].c[i][1]); K().classmate(b, [2, 5, 9, 12][i], 0, 0, R, { gx: -6 }); return b; });
      K().cast(s, 'misha', W[0].m[0], W[0].m[1], 2 * R, 0, { dur: 0.01, gx: -6 }); s.gear('baby', 'backpack', false, 0, 0.01);
      K().cast(s, 'anya', W[0].a[0], W[0].a[1], 2 * R, 0, { dur: 0.01, gx: 6 });
      var ob = s.over(), HB = function (p) { return [p[0] + 50, p[1] + 16]; }; // мяч — поверх детей, у руки
      var bl = ball(s, ob, HB(W[0].c[0])[0], HB(W[0].c[0])[1]), links = [];
      // передача: мяч летит от одного к другому — и между ними остаётся линия
      function pos(w, k) { return k === 'm' ? W[w].m : k === 'a' ? W[w].a : W[w].c[k]; }
      function passes(w, seq, t0, step) {
        jump(s, bl, HB(pos(w, seq[0]))[0], HB(pos(w, seq[0]))[1], t0 - 0.4);
        for (var i = 1; i < seq.length; i++) {
          var a = pos(w, seq[i - 1]), b = pos(w, seq[i]), t = t0 + (i - 1) * step;
          arc(s, bl, HB(b)[0], HB(b)[1], t, step * 0.8, 90);
          links.push({ w: w, k: [seq[i - 1], seq[i]], el: link(s, nets[w], a, b, t, step * 0.8), a: a, b: b });
        }
      }
      passes(0, [0, 'a', 1, 2, 3, 'm'], 0.5, 0.55);
      // подпись у первой линии
      var l0 = links[0], lx = (l0.a[0] + l0.b[0]) / 2, ly = Math.max(l0.a[1], l0.b[1]) + 74;
      var lab = s.node(g, 'text', { x: lx, y: ly, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 700; font-size: 22px; fill: #13534D;' });
      lab.textContent = 'линия — кто с кем играет';
      var labL = s.path(g, 'M' + lx + ' ' + (ly - 24) + ' L' + lx + ' ' + ((l0.a[1] + l0.b[1]) / 2 + 6), { stroke: '#13534D', 'stroke-width': 2 });
      s.tween([lab, labL], 0.9, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.set([lab, labL], 3.9, { opacity: 1 }, { opacity: 0 });
      s.gaze('kid3', 8, -2, 0.6, 0.3);
      var q = s.text('h3', 'Кто в классе остаётся у стены?', { left: 140, top: 128, width: 900 });
      s.lines(q, 0.3);
      s.gaze('kid3', 4, 6, 3.0, 0.4); s.mouth('kid3', 'flat', 3.0, 0.3);
      var t2 = s.text('lead', 'Класс — вторая группа после семьи. Дольше всего держится роль того, кого не зовут играть.', { left: 140, top: 206, width: 900, fontSize: 32 });
      s.lines(t2, 3.6);
      // скачки времени: перелистнули — табличка «через неделю», дети на новых местах, линии другие; у Димы — ни одной
      [[4.0, 1, [1, 'm', 0, 3, 2, 'a'], 0.45], [7.2, 2, [2, 3, 1, 'm', 'a'], 0.45]].forEach(function (j) {
        var sw = K().flip(s, j[0]), w = j[1];
        s.set(nets[w - 1], sw, { opacity: 1 }, { opacity: 0 });
        s.set(calT[w - 1], sw, { opacity: 1 }, { opacity: 0 }); s.set(calT[w], sw, { opacity: 0 }, { opacity: 1 });
        cl.forEach(function (b, i) { jump(s, b, W[w].c[i][0], W[w].c[i][1], sw); });
        s.actor('baby', { x: W[w].m[0], y: W[w].m[1] }, sw, 0.01); s.actor('kid2', { x: W[w].a[0], y: W[w].a[1] }, sw, 0.01);
        passes(w, j[2], sw + 0.4, j[3]);
        s.gaze('kid3', 8, -2, sw + 0.4, 0.3); s.gaze('kid3', 4, 6, sw + 2.0, 0.4);
      });
      s.set(calT.slice(1), 0, { opacity: 0 }, { opacity: 0 });
      // Ирина Петровна выходит из школы, подходит и отдаёт мяч Мише в руки
      var T = 9.4, w2 = W[2], TB = 860, TY = P().standY(TB, 140, true);
      K().cast(s, 'teacher', 360, P().standY(760, 140, true), 140, T, { dur: 0.3, gx: 8 }); s.hands('adult2', 'hold', T, 0.01);
      var tw = walk2(s, 'adult2', 720, TY, T + 0.3, 100);
      s.set(bl, T + 0.3, { opacity: 1 }, { opacity: 0 });
      var tb = ball(s, ob, 360 + 84, P().standY(760, 140, true) + 98); s.set(tb, 0, { opacity: 0 }, { opacity: 0 }); s.set(tb, T + 0.3, { opacity: 0 }, { opacity: 1 });
      move(s, tb, 720 + 84, TY + 98, T + 0.3, tw - T - 0.3, 'none');
      s.gaze('baby', -8, -3, T + 0.8, 0.3); s.gaze('kid2', -8, -3, T + 0.8, 0.3);
      sayH(s, 'Собирай команду!', 694, 490, tw + 0.1, tw + 1.9);
      s.hands('baby', 'hold', tw + 0.3, 0.2);
      move(s, tb, w2.m[0] - 52, w2.m[1] + 16, tw + 0.4, 0.35);
      s.brow('baby', 'proud', tw + 0.6, 0.3);
      // учитель отходит; линии Миши и Ани гаснут, линии других остаются
      links.filter(function (l) { return l.w === 2 && (l.k.indexOf('m') >= 0 || l.k.indexOf('a') >= 0); }).forEach(function (l) { s.out(l.el, tw + 1.0, { dur: 0.4 }); });
      // Миша и Аня идут к Диме
      var MN = [640, 790], AN = [830, 850], DN = [430, 840], TW = tw + 1.1;
      s.hands('baby', 'off', TW, 0.2);
      arc(s, tb, HB(w2.a)[0], HB(w2.a)[1], TW - 0.3, 0.45, 70); // мяч — Ане: у Миши руки нужны для лошадки
      var mw = walk2(s, 'baby', MN[0], MN[1], TW + 0.2, 110);
      var aw = walk2(s, 'kid2', AN[0], AN[1], TW + 0.2, 110);
      move(s, tb, HB(AN)[0], HB(AN)[1], TW + 0.2, aw - TW - 0.2, 'none');
      s.gaze('baby', -10, 0, TW, 0.3); s.gaze('kid2', -10, 0, TW, 0.3);
      s.gaze('kid3', 8, -1, TW + 0.4, 0.3);
      walk2(s, 'adult2', 2060, TY, TW + 0.9, 130); s.gaze('adult2', 8, 0, TW + 0.9, 0.3); // учитель уходит из кадра — никого не закрывает
      // Миша берёт лошадку у ранца и протягивает Диме
      s.hands('baby', 'hold', mw, 0.2);
      move(s, horse, MN[0] - 52, MN[1] + 46, mw + 0.1, 0.35);
      var TS = mw + 0.3;
      sayH(s, 'Пойдём с нами! Будешь считать очки — ты же всё запоминаешь.', 614, 612, TS, TS + 4.6, 'l', { w: 470, fs: 34 });
      move(s, horse, DM[0] + 54, DM[1] + 46, TS + 1.0, 0.6);
      s.hands('kid3', 'hold', TS + 1.3, 0.3); s.hands('baby', 'off', TS + 1.4, 0.2);
      s.mouth('kid3', 'smile', TS + 1.6, 0.4);
      // Дима отходит от стены с лошадкой; мяч — Диме, Ане, Мише: линии сходятся к нему
      s.actor('kid3', { x: DN[0], y: DN[1] }, TS + 2.2, 0.5, 'power2.out');
      move(s, horse, DN[0] + 54, DN[1] + 46, TS + 2.2, 0.5, 'power2.out');
      var TP = TS + 2.8;
      arc(s, tb, DN[0] - 40, DN[1] - 50, TP, 0.5, 70); link(s, nets[3], AN, DN, TP, 0.5);
      arc(s, tb, HB(MN)[0], HB(MN)[1], TP + 0.6, 0.5, 70); link(s, nets[3], DN, MN, TP + 0.6, 0.5);
      arc(s, tb, HB(AN)[0], HB(AN)[1], TP + 1.2, 0.5, 70); link(s, nets[3], MN, AN, TP + 1.2, 0.5);
      s.gaze('kid3', 8, -1, TP, 0.2); s.gaze('kid2', -8, 0, TP + 0.6, 0.2);
      concl(s, 'из этой роли помогают выйти взрослые — и друзья.', TS + 4.6);
      cite(s, 'Дж. Коуи, К. Додж, Х. Коппотелли, 1982: популярные · отвергаемые · пренебрегаемые · противоречивые · средние', TS + 5.2);
      off(s, ['kid3', 'baby', 'kid2', 'adult2'], s.dur - 0.4);
    }
  });

  // 4:50 — «Я могу»: три быстрых плана; Аню высмеяли — Миша и Дима встают рядом: «Давай ещё раз!» (Э. Эриксон, 1950; 1959)
  Film.scene({
    id: 'ican', bars: 7,
    build: function (s) {
      var g = s.svg();
      var q = s.text('h3', 'Главный вопрос возраста — «Могу ли я?»', { left: 140, top: 128, width: 1640 });
      s.lines(q, 0.1);
      // кадр 1: три плана рядом; над каждым — «Я могу!»
      var tri = s.node(g, 'g', {}), PY = 360, PB = 850, GA = 810;
      [140, 700, 1260].forEach(function (x) { s.node(tri, 'rect', { x: x, y: PY, width: 520, height: PB - PY, rx: 18, fill: PAPER, stroke: '#E3DACB', 'stroke-width': 2.5 }); });
      var labs = [];
      [[400, 1.3], [960, 2.0], [1520, 2.7]].forEach(function (p) {
        var e = s.text('kidhand', 'Я могу!', { left: p[0] - 200, top: 270, width: 400, textAlign: 'center', fontSize: 56, color: '#13534D' });
        s.pop(e, p[1], { from: 0.6, dur: 0.4 }); labs.push(e);
      });
      // а) мама держит седло рукой — и отпускает: Миша едет сам (ранец снят)
      s.path(tri, 'M160 ' + GA + ' H640', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.node(tri, 'circle', { cx: 560, cy: 440, r: 36, fill: '#F5D27A', stroke: INK, 'stroke-width': 2.6 });
      s.path(tri, 'M250 470 q14 -30 46 -18 q20 -26 52 -4 q30 0 26 22 Z', { fill: PAPER, stroke: INK, 'stroke-width': 2.4 });
      var bike = s.node(tri, 'g', {}), BX = 390, BY = GA - 36;
      [-60, 60].forEach(function (dx) { s.node(bike, 'circle', { cx: BX + dx, cy: BY, r: 36, fill: 'none', stroke: INK, 'stroke-width': 4 }); });
      s.path(bike, 'M' + (BX - 60) + ' ' + BY + ' L' + (BX - 20) + ' ' + (BY - 60) + ' L' + (BX + 60) + ' ' + BY + ' M' + (BX - 20) + ' ' + (BY - 60) + ' L' + (BX + 44) + ' ' + (BY - 66) + ' L' + (BX + 60) + ' ' + BY + ' M' + (BX + 44) + ' ' + (BY - 66) + ' L' + (BX + 50) + ' ' + (BY - 84) + ' h14', { stroke: INK, 'stroke-width': 4 });
      s.node(bike, 'rect', { x: BX - 28, y: BY - 68, width: 46, height: 10, rx: 5, fill: INK });
      K().cast(s, 'mom', 230, GA - 72, 144, 0, { gx: 8, gy: 3 }); s.hands('adult', 'off', 0, 0.01);
      K().cast(s, 'misha', BX - 4, BY - 68 - 42, 84, 0, { mouth: 'soft', gx: 8 }); s.gear('baby', 'backpack', false, 0, 0.01);
      s.hands('baby', 'hold', 0, 0.01); s.brow('baby', 'focus', 0, 0.01);
      // рука мамы — точка на седле; вторая — у бока
      var MH = '#304B61', mh = s.node(tri, 'circle', { cx: 0, cy: 0, r: 16, fill: MH }), mh2 = s.node(tri, 'circle', { cx: 230 - 75, cy: GA - 70, r: 16, fill: MH });
      s.set(mh, 0, { x: BX - 30, y: BY - 66 }, { x: BX - 30, y: BY - 66 }); void mh2;
      s.tween(mh, 0.8, { x: BX - 30, y: BY - 66 }, { x: 310, y: GA - 66, duration: 0.4, ease: 'power2.out' });
      s.tween(bike, 0.8, { x: 0 }, { x: 150, duration: 1.3, ease: 'power1.inOut' });
      s.actor('baby', { x: BX - 4 + 150 }, 0.8, 1.3, 'power1.inOut');
      s.mouth('baby', 'smile', 1.3, 0.3); s.brow('baby', 'proud', 1.3, 0.3); s.mouth('adult', 'smile', 1.1, 0.3);
      // б) Аня решает пример у доски — мел в руке
      var bd = s.node(tri, 'g', {});
      s.node(bd, 'rect', { x: 730, y: 430, width: 460, height: 210, rx: 4, fill: '#3B5E54', stroke: '#C9A27A', 'stroke-width': 8 });
      s.path(tri, 'M720 ' + GA + ' H1200', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      var ex = s.node(bd, 'text', { x: 900, y: 560, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); ex.textContent = '7 × 8 = 56';
      s.tween(ex, 0.8, { opacity: 0 }, { opacity: 1, duration: 0.8 });
      K().cast(s, 'anya', 1060, GA - 64, 128, 0, { mouth: 'soft', gx: -8, gy: -6 }); s.brow('kid2', 'focus', 0, 0.01);
      s.hands('kid2', 'up', 0, 0.01);
      var ck1 = s.node(tri, 'rect', { x: 1060 + 79 + 8, y: GA - 64 - 69 - 30, width: 8, height: 20, rx: 2, fill: CHALK, stroke: INK, 'stroke-width': 1.5 });
      void ck1;
      s.mouth('kid2', 'smile', 1.7, 0.3); s.brow('kid2', 'proud', 1.7, 0.3);
      // в) Дима ставит мат конём; напротив — папа
      var ch = s.node(tri, 'g', {});
      s.path(tri, 'M1280 ' + GA + ' H1760', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.node(ch, 'rect', { x: 1400, y: 420, width: 150, height: 130, rx: 4, fill: '#3E4E6B', stroke: INK, 'stroke-width': 2.6 });
      s.path(ch, 'M1475 420 V550 M1400 485 H1550', { stroke: INK, 'stroke-width': 2.2 });
      s.node(ch, 'circle', { cx: 1515, cy: 450, r: 12, fill: '#F5E7BD' });
      s.node(ch, 'rect', { x: 1390, y: 690, width: 250, height: 12, rx: 3, fill: '#E9D9BF', stroke: INK, 'stroke-width': 2.4 });
      s.path(ch, 'M1406 702 V' + GA + ' M1624 702 V' + GA, { stroke: INK, 'stroke-width': 2.4 });
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) { // доска в лёгкой перспективе
        var y0 = 690 - (r + 1) * 14, y1 = 690 - r * 14, sh = (r + 1) * 6, sh0 = r * 6, w0 = (220 - 2 * sh0) / 6, w1 = (220 - 2 * sh) / 6;
        var xa = 1405 + sh0 + c * w0, xb = 1405 + sh0 + (c + 1) * w0, xc = 1405 + sh + (c + 1) * w1, xd = 1405 + sh + c * w1;
        s.path(ch, 'M' + xa + ' ' + y1 + ' L' + xb + ' ' + y1 + ' L' + xc + ' ' + y0 + ' L' + xd + ' ' + y0 + ' Z', { fill: (r + c) % 2 ? '#8A6A4A' : '#F3E6D2', stroke: INK, 'stroke-width': 1.2 });
      }
      var king = s.node(ch, 'g', {}); K().pawn(s, king, 1590, 670, 1.0, false);
      s.path(king, 'M1590 618 v-18 M1582 608 h16', { stroke: INK, 'stroke-width': 3.5 });
      var kn = s.node(ch, 'g', {}); K().knight(s, kn, 1450, 684, 1.0, true);
      s.tween(kn, 1.9, { x: 0, y: 0 }, { x: 90, y: -14, duration: 0.5, ease: 'power2.inOut' });
      K().cast(s, 'dima', 1334, GA - 46, 92, 0, { mouth: 'soft', gx: 8, gy: 5 }); s.hands('kid3', 'side', 1.8, 0.3);
      K().cast(s, 'dad', 1700, GA - 58, 116, 0, { mouth: 'soft', gx: -8, gy: 5 });
      var papa = K().tag(s, 'папа', 1700, 816, 0.2);
      s.mouth('kid3', 'smile', 2.5, 0.3); s.mouth('dad', 'flat', 2.5, 0.3); s.brow('dad', 'doubt', 2.5, 0.3);
      var mat = s.text('kidhand', 'мат!', { left: 1560, top: 556, fontSize: 40, color: RED });
      s.pop(mat, 2.5, { from: 0.6, dur: 0.3 });
      // кадр 2: класс; Аня у доски пишет «9 × 6 = 52» — мальчик за партой смеётся
      var sw = K().flip(s, 3.6);
      s.set([tri, mh, mat, papa], sw, { opacity: 1 }, { opacity: 0 }); s.set(labs, sw, { opacity: 1 }, { opacity: 0 });
      s.set(mh2, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['baby', 'adult', 'kid2', 'kid3', 'dad'], sw);
      // класс крупнее (×1,25): доска слева, Аня у доски, первый ряд парт; Z(x, y) — из координат класса в кадр
      var KZ = 1.25, ZX = -10, ZY = 5, Z = function (x, y) { return [ZX + KZ * x, ZY + KZ * y]; };
      var cr = s.node(g, 'g', { opacity: 0, transform: 'translate(' + ZX + ' ' + ZY + ') scale(' + KZ + ')' }); s.set(cr, sw, { opacity: 0 }, { opacity: 1 });
      var room = P().classroom(s, cr, { floor: 700, rows: [{ floor: 700, k: 1, xs: [880, 1100, 1320] }, { floor: 560, k: 0.72, xs: [1000, 1230, 1460] }] });
      P().fill(s, cr, room.seats, ['0:0', '0:1', '0:2'], 4, -12);
      var B0 = room.seats[0][0], MS = Z(room.seats[0][1].x, room.seats[0][1].y), DS = Z(room.seats[0][2].x, room.seats[0][2].y), SD = room.seats[0][1].r * 2 * KZ;
      // тот, кто смеётся: одноклассник за партой, прищур (одна бровь вверх), подпрыгивает от смеха
      var boy = grpAt(s, cr, B0.x, B0.y); Film.head(boy, 0, 0, B0.r, '#C95A44', null, { mouth: 'smile', brow: 'doubt', gx: -10 });
      for (var k2 = 0; k2 < 5; k2++) { s.tween(boy, 4.9 + k2 * 0.24, { y: B0.y }, { y: B0.y - 7, duration: 0.12, ease: 'power2.out' }); s.tween(boy, 5.02 + k2 * 0.24, { y: B0.y - 7 }, { y: B0.y, duration: 0.12, ease: 'power2.in' }); }
      s.actor('baby', { x: MS[0], y: MS[1], d: SD }, sw, 0.01); s.actor('baby', { o: 1 }, sw, 0.01); s.gaze('baby', -12, 0, sw, 0.01); s.brow('baby', 'calm', sw, 0.01); s.mouth('baby', 'smile', sw, 0.01);
      s.gear('baby', 'backpack', true, sw, 0.01);
      s.actor('kid3', { x: DS[0], y: DS[1], d: SD }, sw, 0.01); s.actor('kid3', { o: 1 }, sw, 0.01); s.gaze('kid3', -12, 0, sw, 0.01); s.mouth('kid3', 'smile', sw, 0.01);
      s.hands('baby', 'desk', sw, 0.01); s.hands('kid3', 'desk', sw, 0.01);
      var FLZ = Z(0, 700)[1], AD = 150, AX = Z(420, 0)[0], AY = FLZ - AD / 2;
      s.actor('kid2', { x: AX, y: AY, d: AD }, sw, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.gaze('kid2', -4, -6, sw, 0.01); s.mouth('kid2', 'soft', sw, 0.01); s.brow('kid2', 'focus', sw, 0.01);
      s.hands('kid2', 'up', sw, 0.01);
      // мел в руке Ани: у поднятой руки — у доски; опускается вместе с рукой
      var UP = [AX + 0.62 * AD + 12, AY - 0.54 * AD - 8], DN0 = [AX + 0.56 * AD + 18, AY + 0.16 * AD - 6];
      var ck = s.node(g, 'rect', { x: -4, y: -20, width: 8, height: 20, rx: 2, fill: CHALK, stroke: INK, 'stroke-width': 1.5, opacity: 0 });
      s.set(ck, sw, { x: UP[0], y: UP[1], opacity: 0 }, { x: UP[0], y: UP[1], opacity: 1 });
      var bw = s.node(cr, 'text', { x: 360, y: 430, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); bw.textContent = '9 × 6 = 52';
      s.tween(bw, sw + 0.15, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      sayH(s, 'Ты никогда не научишься!', Z(B0.x, 0)[0] - 40, 440, 4.9, 7.1);
      s.brow('kid2', 'sad', 5.2, 0.3); s.mouth('kid2', 'sad', 5.2, 0.3); s.gaze('kid2', 3, 6, 5.2, 0.3);
      s.hands('kid2', 'side', 5.6, 0.4); s.tween(ck, 5.6, { x: UP[0], y: UP[1] }, { x: DN0[0], y: DN0[1], duration: 0.4, ease: 'power2.out' }); // опускает мел
      // кадр 3: Миша и Дима встают и подходят к Ане — «Давай ещё раз!»
      var MN = [300, FLZ - SD / 2], DN = [150, FLZ - SD / 2];
      s.hands('baby', 'off', 6.0, 0.2); s.hands('kid3', 'off', 6.0, 0.2);
      s.hop('baby', MS[0] - 80, MN[1], 6.1, 0.3, 30); s.hop('kid3', DS[0] - 80, DN[1], 6.2, 0.3, 30);
      K().walk(s, 'baby', MN[0], 6.5, { step: 240, dur: 0.2, hold: 0.03 });
      K().walk(s, 'kid3', DN[0], 6.55, { step: 280, dur: 0.2, hold: 0.03 });
      s.gaze('baby', -10, 0, 6.5, 0.2); s.gaze('kid3', -10, 0, 6.5, 0.2);
      s.gaze('baby', 10, -2, 7.6, 0.3); s.gaze('kid3', 10, -2, 7.6, 0.3);
      s.mouth('baby', 'soft', 7.6, 0.3); s.brow('baby', 'focus', 7.6, 0.3);
      s.hands('baby', 'side', 7.6, 0.3); s.hands('kid3', 'side', 7.6, 0.3);
      sayH(s, 'Давай ещё раз!', MN[0] - 26, MN[1] - SD / 2 - 104, 7.6, 9.6);
      s.gaze('kid2', -8, -2, 7.9, 0.3); s.brow('kid2', 'calm', 8.2, 0.3); s.mouth('kid2', 'soft', 8.2, 0.3);
      // вторая попытка: Аня сама стирает «52» и пишет «54»
      s.gaze('kid2', -4, -6, 8.7, 0.3); s.hands('kid2', 'up', 8.7, 0.3); s.brow('kid2', 'focus', 8.7, 0.3);
      s.tween(ck, 8.7, { x: DN0[0], y: DN0[1] }, { x: UP[0], y: UP[1], duration: 0.3, ease: 'power2.out' });
      s.out(bw, 8.9, { dur: 0.4 });
      var bw2 = s.node(cr, 'text', { x: 360, y: 430, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); bw2.textContent = '9 × 6 = 54';
      s.tween(bw2, 9.3, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.hands('kid2', 'side', 9.8, 0.3); s.tween(ck, 9.8, { x: UP[0], y: UP[1] }, { x: DN0[0], y: DN0[1], duration: 0.3 });
      s.brow('kid2', 'proud', 9.8, 0.3); s.mouth('kid2', 'smile', 9.8, 0.3); s.gaze('kid2', 6, -3, 9.8, 0.3);
      sayH(s, 'Я могу!', AX - 26, AY - AD / 2 - 104, 9.9, 12.2);
      s.hop('kid2', AX, AY, 10.0, 0.32, 30); s.tween(ck, 10.09, { y: DN0[1] }, { y: DN0[1] - 30, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1 });
      s.mouth('baby', 'smile', 10.0, 0.3); s.brow('baby', 'proud', 10.0, 0.3); s.mouth('kid3', 'smile', 10.0, 0.3);
      concl(s, 'когда получается — «я могу». Когда высмеивают — «я хуже других». Поддержка помогает попробовать снова.', 10.3);
      cite(s, 'Э. Эриксон, 1950 · «Я — это то, чему я учусь», 1959 · трудолюбие против неполноценности · industry vs. inferiority', 11.0);
      s.out(ck, s.dur - 0.4, { dur: 0.3 });
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.4);
    }
  });
})();
