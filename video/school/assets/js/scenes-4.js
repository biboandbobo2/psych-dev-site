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
    if (Math.abs(x - x0) > 20) s.gaze(id, x > x0 ? 12 : -12, 0, lt, 0.15); // лицо — по ходу движения
    for (var i = 1; i <= n; i++) {
      s.squash(id, 1.04, 0.96, t, 0.08);
      s.actor(id, { x: x0 + (x - x0) * i / n, y: y0 + (y - y0) * i / n }, t + 0.08, 0.2, 'power2.inOut');
      s.squash(id, 1, 1, t + 0.08, 0.18);
      t += 0.26;
    }
    return t;
  }
  // Линия отношений между двумя детьми (центры кругов): прорисовывается за dur
  function link(s, g, a, b, at, dur, r) { // от края круга до края круга (r — радиус)
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, e = (r || 0) / L;
    var l = s.path(g, 'M' + (a[0] + dx * e) + ' ' + (a[1] + dy * e) + ' L' + (b[0] - dx * e) + ' ' + (b[1] - dy * e), { stroke: LINK, 'stroke-width': 3.2 });
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
  // реплика с длинным хвостом к говорящему (tx, ty) — когда между облачком и говорящим есть другие дети
  function sayTo(s, text, x, y, to, at, out, bx) {
    var H = 72; bx = bx || to[0];
    var tail = s.hud('', '<svg width="1920" height="1080" style="position:absolute;left:0;top:0;overflow:visible"><path d="M' + (bx - 14) + ' ' + (y + H - 4) + ' L' + to[0] + ' ' + to[1] + ' L' + (bx + 14) + ' ' + (y + H - 4) + ' Z" fill="#FFFDF8" stroke="#1D2733" stroke-width="2.5" stroke-linejoin="round"/></svg>', { left: 0, top: 0 });
    var b = s.hud('bubble say', text, { left: x, top: y });
    s.tween([tail, b], at, { opacity: 0 }, { opacity: 1, duration: 0.15 });
    s.out([tail, b], out, { dur: 0.3 });
    return b;
  }
  // быстрое перелистывание (0,5 с): лист проезжает, не застревая у края; смена кадра — там же, где у K().flip (at + 0,45)
  function flipF(s, at) {
    var e = s.div('pageflip', { left: 0, top: 0, width: 1920, height: 1080, transform: 'translateX(2000px)' }, s.ov);
    s.tween(e, at + 0.2, { x: 2000 }, { x: -2040, duration: 0.5, ease: 'power1.inOut' });
    return at + 0.45;
  }
  // мел — тонкая белая палочка в руке-точке; (x, y) — центр руки
  function chalk(s, g, x, y) {
    var c = s.node(g, 'g', {});
    s.path(c, 'M' + x + ' ' + (y - 4) + ' L' + (x - 6) + ' ' + (y - 30), { stroke: INK, 'stroke-width': 8 });
    s.path(c, 'M' + x + ' ' + (y - 4) + ' L' + (x - 6) + ' ' + (y - 30), { stroke: CHALK, 'stroke-width': 5 });
    return c;
  }
  // Мяч (центр в 0, 0)
  function ball(s, g, x, y) { var b = grpAt(s, g, x, y); K().ball(s, b, 0, 0, 17); return b; }
  var FLOOR = 900; // пол класса в places.classroom (один во всём ролике; сами ряды — по умолчанию)
  // ранец Миши на полу у его стула (справа от спинки)
  // ранец Миши на полу у его стула — там же и того же размера, что ранцы первого ряда (places.bags); у остальных — свои ранцы
  function floorBag(s, g, M, cr) { if (cr) P().bags(s, g, cr.seats, cr.floor, [0]); return Film.toys.backpack(s, g, M.x + M.r * 1.25, FLOOR - 40, 0.9, TEAL, '#1C7A71'); }
  function seat(cr, who) { var q = cr.heroes[who].split(':'); return cr.seats[+q[0]][+q[1]]; }
  function heroSkip(cr) { return [cr.heroes.misha, cr.heroes.anya, cr.heroes.dima]; }

  // 4:05 — Заставка: карта трёх дорожек; Миша и Аня идут рядом (между ними — линия «дружат»), Дима — ещё отдельно
  Film.scene({
    id: 'ch4', bars: 2,
    build: function (s) {
      s.chapterCard(4, '«Я могу»', '');
      var sub = s.text('lead', 'Миша, Аня и Дима среди других', { left: 336, top: 430, width: 900, fontSize: 34 });
      s.fade(sub, 0.35, { y: 8 });
      var g = s.svg(), G = 600, DX = 130; // горизонт и сдвиг карты — как на заставках глав 2–3: «4» не задевает дом
      s.node(g, 'rect', { x: 0, y: G, width: 160, height: 1080 - G, fill: '#ECE3CF' }); s.path(g, 'M0 ' + G + ' H160', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      var m = P().paths(s, s.node(g, 'g', { transform: 'translate(' + DX + ' 0)' }), { ground: G });
      var pp = function (w, t) { var q = P().pathPoint(m, w, t); return { x: q.x + DX, y: q.y }; };
      var at = { misha: [0.5, 0.68], anya: [0.58, 0.76], dima: [0.2, 0.34] }, ids = {}, ends = {};
      ['misha', 'anya', 'dima'].forEach(function (w) {
        var p0 = pp(w, at[w][0]), d = 74; // трое одного роста, как на заставке главы 1
        ids[w] = K().cast(s, w, p0.x, p0.y - d / 2, d, 0, { gx: 6, dur: 0.01 }); // стоят с начала сцены
        for (var i = 1; i <= 5; i++) { // шагают по своей дорожке
          var q = pp(w, at[w][0] + (at[w][1] - at[w][0]) * i / 5), t = 0.5 + (i - 1) * 0.3;
          s.squash(ids[w], 1.04, 0.96, t, 0.08);
          s.actor(ids[w], { x: q.x, y: q.y - d / 2 }, t + 0.08, 0.22, 'power2.inOut');
          s.squash(ids[w], 1, 1, t + 0.08, 0.2);
        }
        var e = pp(w, at[w][1]); ends[w] = [e.x, e.y - d / 2];
      });
      s.gaze('baby', 8, -2, 2.1, 0.3); s.gaze('kid2', -8, -2, 2.1, 0.3); // Миша и Аня переглядываются
      link(s, g, ends.misha, ends.anya, 2.2, 0.5);
      var mx = (ends.misha[0] + ends.anya[0]) / 2, my = (ends.misha[1] + ends.anya[1]) / 2;
      var lb = s.node(g, 'text', { x: mx + 70, y: my + 92, 'text-anchor': 'start', style: 'font-family: DOMSans; font-weight: 650; font-size: 22px; fill: #13534D;' });
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
      K().cast(s, 'misha', M.x, M.y, M.r * 2, 0, { dur: 0.01, gx: -12 }); s.gear('baby', 'backpack', false, 0, 0.01);
      floorBag(s, cls, M, cr); // ранцы первого ряда у стульев; ранец Миши — бирюзовый
      K().cast(s, 'anya', A.x, A.y, A.r * 2, 0, { dur: 0.01, gx: -12 });
      K().cast(s, 'dima', D.x, D.y, D.r * 2, 0, { dur: 0.01, gx: -12 });
      var TY = P().standY(cr.floor, 150, true), TX = cr.teacher.x;
      K().cast(s, 'teacher', TX, TY, 150, 0, { dur: 0.01, gx: 10 });
      s.hands('adult2', 'hold', 0, 0.01); s.hands('baby', 'desk', 0, 0.01); s.hands('kid2', 'desk', 0, 0.01); s.hands('kid3', 'desk', 0, 0.01);
      // Ирина Петровна подходит к партам со стопкой и раздаёт: тетради летят из её рук на парты Миши и Ани
      var TN = 590, HX = 92, HY = 105, stack = grpAt(s, cls, TX + HX, TY + HY);
      [0, 1, 2].forEach(function (i) { s.node(stack, 'rect', { x: -34, y: -10 - i * 9, width: 68, height: 9, rx: 2, fill: i === 1 ? '#CFE3EA' : PAPER, stroke: INK, 'stroke-width': 2 }); });
      s.gaze('adult2', 12, 0, 0.05, 0.15); var w1 = K().walk(s, 'adult2', TN, 0.1, { step: 95, dur: 0.22, hold: 0.04 });
      move(s, stack, TN + HX, TY + HY, 0.18, w1 - 0.1, 'none');
      var mDesk = [M.desk.x2 - 64, M.desk.y], aDesk = [A.desk.x2 - 64, A.desk.y], T1 = 0.2 + w1;
      var nbM = grpAt(s, cls, TN + HX, TY + HY - 30), nbA = grpAt(s, cls, TN + HX, TY + HY - 30);
      notebook(s, nbM, '4'); notebook(s, nbA, '5');
      s.set([nbM, nbA], 0, { opacity: 0 }, { opacity: 0 });
      s.set(nbM, T1, { opacity: 0 }, { opacity: 1 }); arc(s, nbM, mDesk[0], mDesk[1], T1, 0.5, 60);
      s.set(nbA, T1 + 0.4, { opacity: 0 }, { opacity: 1 }); arc(s, nbA, aDesk[0], aDesk[1], T1 + 0.4, 0.7, 150);
      s.gaze('adult2', 10, 2, T1, 0.2);
      s.gaze('baby', -10, 6, T1 + 0.5, 0.3); s.brow('baby', 'focus', T1 + 0.5, 0.3);
      // учитель возвращается к доске; наезд на две парты
      s.gaze('adult2', -12, 0, T1 + 1.1, 0.15); var w2b = K().walk(s, 'adult2', TX, T1 + 1.2, { step: 95, dur: 0.22, hold: 0.04 }); s.gaze('adult2', 10, 0, T1 + 1.2 + w2b, 0.2);
      move(s, stack, TX + HX, TY + HY, T1 + 1.28, 0.6, 'none');
      var ZC = [1240, 790, 1.6]; s.cam({ cx: ZC[0], cy: ZC[1], z: ZC[2] }, T1 + 1.0, 1.0, 'power2.inOut'); // рама доски за кадром
      var T2 = T1 + 1.6;
      s.mouth('kid2', 'smile', T2, 0.3); s.brow('kid2', 'proud', T2, 0.3); s.gaze('kid2', -8, 6, T2, 0.3);
      s.gaze('baby', 10, 3, T2, 0.3); s.mouth('baby', 'flat', T2, 0.2); s.brow('baby', 'doubt', T2, 0.2);
      var sx = 960 + (M.x - ZC[0]) * ZC[2], sy = 540 + (M.y - ZC[1]) * ZC[2], sr = M.r * ZC[2];
      var bub = s.hud('bubble say tail-l', 'У неё пять!', { left: sx - 26, top: sy - sr - 104 });
      s.tween(bub, T2 + 0.2, { opacity: 0 }, { opacity: 1, duration: 0.12 }); s.out(bub, T2 + 2.4, { dur: 0.25 });
      // объяснение сверху (слой #ui: камера его не двигает)
      var T3 = T2 + 2.3, t1 = s.hud('h3', 'С 7–8 лет ребёнок оценивает себя, сравнивая с другими детьми.', { left: 140, top: 128, width: 880, fontSize: 44 });
      s.tween(t1, T3, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      s.cam({ cx: 960, cy: 540, z: 1 }, T3 - 0.2, 1.0, 'power2.inOut');
      s.gaze('baby', -12, 0, T3 + 0.4, 0.3); s.gaze('kid2', -12, 0, T3 + 0.4, 0.3);
      // столбчатая «Миша о себе»: общая шкала слева, пунктир «в среднем»; облачко-мысль ведёт к Мише
      var TC = T3 + 0.6, CW = 900, card = s.hud('card', '', { left: 690, top: 262, width: CW, height: 312 });
      var sv = Film.svg('svg', { width: CW, height: 312, viewBox: '0 0 ' + CW + ' 312' }, card);
      sv.style.position = 'absolute'; sv.style.left = '0'; sv.style.top = '0';
      var ti = Film.svg('text', { x: CW / 2, y: 42, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 750; font-size: 28px; fill: #13534D;' }, sv);
      ti.textContent = 'Миша о себе';
      var H0 = [150, 100, 140, 120, 140], BASE = 260, bars = []; // среднее — 130
      Film.svg('path', { d: 'M62 ' + BASE + ' V' + (BASE - 190), stroke: INK, 'stroke-width': 2, fill: 'none' }, sv);
      [[0, 'мало'], [180, 'много']].forEach(function (q) {
        Film.svg('path', { d: 'M56 ' + (BASE - q[0]) + ' H68', stroke: INK, 'stroke-width': 2, fill: 'none' }, sv);
        var t = Film.svg('text', { x: 50, y: BASE - q[0] + 7, 'text-anchor': 'end', style: 'font-family: DOMSans; font-weight: 600; font-size: 22px; fill: #3A4654;' }, sv); t.textContent = q[1];
      });
      ['учёба', 'спорт', 'друзья', 'внешность', 'поведение'].forEach(function (l, i) {
        var x = 96 + i * 134;
        var r = Film.svg('rect', { x: x, y: BASE, width: 76, height: 0, rx: 6, fill: TEAL, stroke: INK, 'stroke-width': 2.4 }, sv);
        s.tween(r, TC + 0.2 + i * 0.1, { attr: { y: BASE, height: 0 } }, { attr: { y: BASE - H0[i], height: H0[i] }, duration: 0.45, ease: 'back.out(1.6)' });
        var tx = Film.svg('text', { x: x + 38, y: BASE + 34, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 650; font-size: 22px; fill: #3A4654;' }, sv);
        tx.textContent = l; bars.push(r);
      });
      Film.svg('path', { d: 'M62 ' + BASE + ' H' + (CW - 170), stroke: INK, 'stroke-width': 2, fill: 'none' }, sv);
      var mid = Film.svg('path', { d: 'M62 ' + (BASE - 130) + ' H' + (CW - 170), stroke: RED, 'stroke-width': 3, 'stroke-dasharray': '10 8', fill: 'none' }, sv);
      var ml = Film.svg('text', { x: CW - 160, y: BASE - 123, 'text-anchor': 'start', style: 'font-family: DOMSans; font-weight: 700; font-size: 22px; fill: #A3322E;' }, sv); ml.textContent = 'в среднем'; // виден сразу вместе с карточкой
      s.tween(card, TC, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      var top = M.y - M.r, dots = [[M.x - 44, 600, 22], [M.x - 30, 652, 15], [M.x - 16, top - 16, 10]].map(function (d) {
        return s.hud('', '', { left: d[0] - d[2] / 2, top: d[1] - d[2] / 2, width: d[2], height: d[2], borderRadius: d[2] / 2, background: PAPER, border: '2.5px solid #A79C8E' });
      });
      s.tween(dots, TC, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.tween(bars[0], TC + 1.5, { attr: { y: BASE - 150, height: 150 } }, { attr: { y: BASE - 115, height: 115 }, duration: 0.6, ease: 'power2.inOut' });
      s.mouth('baby', 'soft', TC + 1.5, 0.3);
      // перемена: Ирина Петровна объявляет — и двор
      sayH(s, 'Перемена!', TX - 26, TY - 75 - 104, TC + 2.0, TC + 3.0);
      var sw = flipF(s, TC + 2.8);
      s.set(cls, sw, { opacity: 1 }, { opacity: 0 });
      s.set(dots, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['kid3', 'kid2'], sw); s.actor('adult2', { o: 0 }, sw, 0.01); s.hands('baby', 'off', sw, 0.01);
      var yd = s.node(g, 'g', { opacity: 0 }), GR = 700;
      s.set(yd, sw, { opacity: 0 }, { opacity: 1 });
      s.node(yd, 'rect', { x: 0, y: GR, width: 1920, height: 1080 - GR, fill: '#CFC4AE' });
      s.path(yd, 'M0 ' + GR + ' H1920', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      P().school(s, yd, 330, GR, 0.9); P().tree(s, yd, 1840, GR, 0.75); P().bench(s, yd, 1690, GR, 1);
      // дорожки забега: [центр, радиус]; старт и финиш — тёмные линии с табличками
      var START = 790, FIN = 1460, LN = [[752, 34], [806, 40], [860, 44]], R0 = sw + 0.4; // на старте трое стоят рядом по земле, лесенкой
      [[START, 'старт'], [FIN, 'финиш']].forEach(function (q) {
        s.path(yd, 'M' + q[0] + ' 716 V912', { stroke: INK, 'stroke-width': 5 });
        s.node(yd, 'rect', { x: q[0] - 58, y: 660, width: 116, height: 40, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 2.4 });
        s.path(yd, 'M' + q[0] + ' 700 V716', { stroke: INK, 'stroke-width': 3 });
        var t = s.node(yd, 'text', { x: q[0], y: 688, 'text-anchor': 'middle', fill: INK, style: 'font-family: DOMSans; font-weight: 650; font-size: 24px;' }); t.textContent = q[1];
      });
      [[3, 0, FIN - 260, 560], [8, 1, FIN - 150, 650]].forEach(function (c) {
        var y0 = LN[c[1]][0], b = grpAt(s, yd, c[3], y0); K().classmate(b, c[0], 0, 0, LN[c[1]][1], { gx: 12 });
        move(s, b, c[2], y0, R0, 1.7, 'power1.inOut');
        for (var i = 0; i < 5; i++) { s.tween(b, R0 + i * 0.34, { y: y0 }, { y: y0 - 14, duration: 0.17, ease: 'power2.out' }); s.tween(b, R0 + 0.17 + i * 0.34, { y: y0 - 14 }, { y: y0, duration: 0.17, ease: 'power2.in' }); }
      });
      s.actor('baby', { x: 735, y: LN[2][0], d: 88 }, sw, 0.01); s.gaze('baby', 12, 0, sw, 0.01); s.brow('baby', 'focus', sw, 0.01); s.mouth('baby', 'flat', sw, 0.01);
      for (var i = 0; i < 6; i++) { // бег: шаг-подскок без сплющивания
        var xa = 735 + (FIN + 100 - 735) * (i + 0.5) / 6, xb = 735 + (FIN + 100 - 735) * (i + 1) / 6, ti = R0 + i * 0.28;
        s.actor('baby', { x: xa, y: LN[2][0] - 18 }, ti, 0.14, 'power2.out'); s.actor('baby', { x: xb, y: LN[2][0] }, ti + 0.14, 0.14, 'power2.in');
      }
      var RF = R0 + 1.75;
      s.brow('baby', 'proud', RF, 0.3); s.mouth('baby', 'smile', RF, 0.3); s.hands('baby', 'up', RF, 0.3);
      // растёт только «спорт» — пунктир «в среднем» на месте
      s.tween(bars[1], RF + 0.1, { attr: { y: BASE - 100, height: 100 } }, { attr: { y: BASE - 135, height: 135 }, duration: 0.6, ease: 'back.out(1.4)' });
      concl(s, 'самооценка делится на области и становится точнее — но в среднем не падает.', RF + 0.1);
      cite(s, 'social comparison · Д. Рубл и др., 1980 · С. Хартер · У. Орт и др., 2018: 331 выборка', RF + 0.8);
      s.out([t1, card], s.dur - 0.5, { dur: 0.4 });
      off(s, ['baby'], s.dur - 0.4);
    }
  });

  // 4:27,5 — Кого не зовут: передачи мяча рисуют линии между детьми; к Диме у стены — ни одной.
  // Скачки времени — линии меняются; Ирина Петровна отдаёт мяч Мише, Миша и Аня идут к Диме — Миша отдаёт ему лошадку.
  // (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'outcast', bars: 9,
    build: function (s) {
      // двор: школа слева, деревья и скамейка справа (середина двора свободна для игры и облачка)
      var g = s.svg(), GR = 760;
      s.node(g, 'circle', { cx: 1660, cy: 170, r: 56, fill: '#F5D27A', stroke: '#2B3440', 'stroke-width': 3 });
      s.node(g, 'rect', { x: 0, y: GR, width: 1920, height: 1080 - GR, fill: '#CFC4AE' });
      s.path(g, 'M0 ' + GR + ' H1920', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      P().school(s, g, 380, GR, 0.75); P().tree(s, g, 1350, GR, 0.95); P().tree(s, g, 1830, GR, 1.05); P().bench(s, g, 1590, GR, 1);
      // табличка-календарь на столбе у стены школы: «понедельник» → «через неделю» → «через месяц»
      var cal = s.node(g, 'g', {});
      s.path(cal, 'M80 ' + GR + ' V690', { stroke: INK, 'stroke-width': 3 });
      s.node(cal, 'rect', { x: 0, y: 606, width: 160, height: 86, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 2.6 });
      s.node(cal, 'rect', { x: 0, y: 606, width: 160, height: 18, rx: 6, fill: RED });
      s.set(cal, 0, { x: 12 }, { x: 12 });
      var calT = ['понедельник', 'через неделю', 'через месяц'].map(function (t) {
        var e = s.node(cal, 'text', { x: 80, y: 668, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 650; font-size: 22px; fill: #13534D;' });
        e.textContent = t; return e;
      });
      var nets = [s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {})], kg = s.node(g, 'g', {});
      // лошадка — у Миши в ранце: появится в его руке, когда он позовёт Диму
      var horse = grpAt(s, g, 0, 0); K().toyHorse(s, horse, 0, 0, 0.5); s.set(horse, 0, { opacity: 0 }, { opacity: 0 });
      var DM = [470, 774];
      K().cast(s, 'dima', DM[0], DM[1], 92, 0, { dur: 0.01, mouth: 'soft', gx: 8 });
      // кольцо игры: шесть мест; по «неделям» дети меняются местами
      var R = 42, S = { A: [1740, 840], B: [1450, 884], C: [1200, 884], D: [860, 840], E: [1080, 806], F: [1650, 800] };
      var W = [{ m: 'C', a: 'E', c: ['D', 'F', 'A', 'B'] }, { m: 'F', a: 'D', c: ['A', 'E', 'C', 'B'] }, { m: 'D', a: 'E', c: ['F', 'C', 'A', 'B'] }]
        .map(function (w) { return { m: S[w.m], a: S[w.a], c: w.c.map(function (k) { return S[k]; }) }; });
      var cl = [0, 1, 2, 3].map(function (i) { var b = grpAt(s, kg, W[0].c[i][0], W[0].c[i][1]); K().classmate(b, [2, 5, 9, 12][i], 0, 0, R, { gx: -6 }); return b; });
      K().cast(s, 'misha', W[0].m[0], W[0].m[1], 2 * R, 0, { dur: 0.01, gx: -6 }); s.gear('baby', 'backpack', true, 0, 0.01); // на перемене ранец на Мише
      K().cast(s, 'anya', W[0].a[0], W[0].a[1], 2 * R, 0, { dur: 0.01, gx: 6 });
      var ob = s.over(), HB = function (p) { return [p[0] + 62, p[1] + 16]; }; // мяч — поверх детей, у руки
      var bl = ball(s, ob, HB(W[0].c[0])[0], HB(W[0].c[0])[1]), links = [];
      // передача: мяч летит от одного к другому — и между ними остаётся линия
      function pos(w, k) { return k === 'm' ? W[w].m : k === 'a' ? W[w].a : W[w].c[k]; }
      function passes(w, seq, t0, step) {
        jump(s, bl, HB(pos(w, seq[0]))[0], HB(pos(w, seq[0]))[1], t0 - 0.4);
        for (var i = 1; i < seq.length; i++) {
          var a = pos(w, seq[i - 1]), b = pos(w, seq[i]), t = t0 + (i - 1) * step;
          arc(s, bl, HB(b)[0], HB(b)[1], t, step * 0.8, 60);
          links.push({ w: w, k: [seq[i - 1], seq[i]], el: link(s, nets[w], a, b, t, step * 0.8), a: a, b: b });
        }
      }
      // Миша и Аня дружат: их линия есть каждую неделю
      function friends(w, t) { links.push({ w: w, k: ['m', 'a'], el: link(s, nets[w], W[w].m, W[w].a, t, 0.4, 44), a: W[w].m, b: W[w].a }); }
      passes(0, [0, 'a', 1, 2, 3, 'm'], 0.5, 0.55); friends(0, 0.3);
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
      [[4.0, 1, [1, 'm', 0, 3, 2, 'a'], 0.45], [7.0, 2, [2, 3, 1, 'm', 'a'], 0.4]].forEach(function (j) {
        var sw = flipF(s, j[0]), w = j[1];
        s.set(nets[w - 1], sw, { opacity: 1 }, { opacity: 0 });
        s.set(calT[w - 1], sw, { opacity: 1 }, { opacity: 0 }); s.set(calT[w], sw, { opacity: 0 }, { opacity: 1 });
        cl.forEach(function (b, i) { jump(s, b, W[w].c[i][0], W[w].c[i][1], sw); });
        s.actor('baby', { x: W[w].m[0], y: W[w].m[1] }, sw, 0.01); s.actor('kid2', { x: W[w].a[0], y: W[w].a[1] }, sw, 0.01);
        passes(w, j[2], sw + 0.4, j[3]); friends(w, sw + 0.15);
        s.gaze('kid3', 8, -2, sw + 0.4, 0.3); s.gaze('kid3', 4, 6, sw + 2.0, 0.4);
      });
      s.set(calT.slice(1), 0, { opacity: 0 }, { opacity: 0 });
      // Ирина Петровна входит шагом из-за края кадра вдоль стены школы (позади Димы) и бросает мяч Мише в руки
      var T = 8.28, w2 = W[2], TX = 600, TY = P().standY(GR, 140, true);
      K().cast(s, 'teacher', -110, TY, 140, T, { dur: 0.01, gx: 12 }); s.hands('adult2', 'hold', T, 0.01);
      var tw = walk2(s, 'adult2', TX, TY, T + 0.3, 140);
      s.gaze('adult2', 10, 4, tw, 0.2);
      s.set(bl, T + 0.3, { opacity: 1 }, { opacity: 0 });
      var tb = ball(s, ob, -110 + 84, TY + 98); s.set(tb, 0, { opacity: 0 }, { opacity: 0 }); s.set(tb, T, { opacity: 0 }, { opacity: 1 });
      move(s, tb, TX + 84, TY + 98, T + 0.3, tw - T - 0.3, 'none');
      s.gaze('baby', -8, -3, T + 0.8, 0.3); s.gaze('kid2', -8, -3, T + 0.8, 0.3);
      sayH(s, 'Собирай команду!', TX - 26, TY - 70 - 104, tw + 0.1, tw + 1.9);
      s.hands('baby', 'hold', tw + 0.3, 0.2);
      arc(s, tb, w2.m[0] - 50, w2.m[1] + 18, tw + 0.4, 0.5, 60);
      s.brow('baby', 'proud', tw + 0.6, 0.3);
      // учитель отходит; линии Миши и Ани гаснут, линии других остаются
      links.filter(function (l) { return l.w === 2 && (l.k.indexOf('m') >= 0 || l.k.indexOf('a') >= 0); }).forEach(function (l) { s.out(l.el, tw + 1.0, { dur: 0.4 }); });
      // Миша и Аня идут к Диме
      var MN = [730, 800], AN = [910, 850], DN = [480, 840], TW = tw + 1.5; // учитель остаётся у стены и смотрит на детей
      s.hands('baby', 'off', TW, 0.2);
      arc(s, tb, HB(w2.a)[0], HB(w2.a)[1], TW - 0.3, 0.45, 70); // мяч — Ане: у Миши руки нужны для лошадки
      var mw = walk2(s, 'baby', MN[0], MN[1], TW + 0.2, 70); // два шага — время реплики не сдвигается
      var aw = walk2(s, 'kid2', AN[0], AN[1], TW + 0.2, 110);
      move(s, tb, HB(AN)[0], HB(AN)[1], TW + 0.2, aw - TW - 0.2, 'none');
      s.gaze('baby', -10, 0, TW, 0.3); s.gaze('kid2', -10, 0, TW, 0.3);
      s.gaze('kid3', 8, -1, TW + 0.4, 0.3);
      // Миша достаёт лошадку из ранца — она у него в руке — и протягивает Диме
      s.hands('baby', 'hold', mw, 0.2);
      jump(s, horse, MN[0] - 40, MN[1] + 30, mw); s.tween(horse, mw + 0.05, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      move(s, horse, MN[0] - 56, MN[1] + 46, mw + 0.05, 0.3);
      var TS = mw + 0.3;
      sayH(s, 'Пойдём с нами! Будешь считать очки — ты же всё запоминаешь.', MN[0] - 26, 600, TS, TS + 4.6, 'l', { w: 470, fs: 34 });
      arc(s, horse, DM[0] - 58, DM[1] + 46, TS + 0.9, 1.0, 50); // видно, как лошадка переходит из рук Миши к Диме
      s.hands('kid3', 'hold', TS + 1.7, 0.3); s.hands('baby', 'off', TS + 1.9, 0.2);
      s.mouth('kid3', 'smile', TS + 1.6, 0.4);
      // Дима отходит от стены с лошадкой; мяч — Диме, Ане, Мише: линии сходятся к нему
      s.actor('kid3', { x: DN[0], y: DN[1] }, TS + 2.2, 0.5, 'power2.out');
      move(s, horse, DN[0] - 60, DN[1] + 46, TS + 2.2, 0.5, 'power2.out'); // лошадка слева от Димы — линии её не пересекают
      var TP = TS + 2.8;
      arc(s, tb, HB(DN)[0], HB(DN)[1], TP, 0.5, 70); link(s, nets[3], AN, DN, TP, 0.5, 44);
      arc(s, tb, HB(MN)[0], HB(MN)[1], TP + 0.6, 0.5, 70); link(s, nets[3], DN, MN, TP + 0.6, 0.5, 44);
      arc(s, tb, HB(AN)[0], HB(AN)[1], TP + 1.2, 0.5, 70); link(s, nets[3], MN, AN, TP + 1.2, 0.5, 44);
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
      [[400, 1.1], [960, 1.5], [1520, 1.9]].forEach(function (p) {
        var e = s.text('cursive', 'Я могу!', { left: p[0] - 200, top: 262, width: 400, textAlign: 'center', fontSize: 56, color: '#13534D' }); // пропись — как «Я могу!» Ани
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
      K().cast(s, 'mom', 230, GA - 72, 144, 0, { gx: 8, gy: 3, dur: 0.01 }); s.hands('adult', 'off', 0, 0.01);
      K().cast(s, 'misha', BX - 4, BY - 68 - 42, 84, 0, { mouth: 'soft', gx: 8, dur: 0.01 }); s.gear('baby', 'backpack', false, 0, 0.01);
      s.hands('baby', 'hold', 0, 0.01); s.brow('baby', 'focus', 0, 0.01);
      // рука мамы — точка на седле; вторая — у бока
      var MH = '#304B61', mh = s.node(tri, 'circle', { cx: 0, cy: 0, r: 16, fill: MH }), mh2 = s.node(tri, 'circle', { cx: 230 - 75, cy: GA - 70, r: 16, fill: MH });
      s.set(mh, 0, { x: BX - 30, y: BY - 66 }, { x: BX - 30, y: BY - 66 }); void mh2;
      s.tween(mh, 0.9, { x: BX - 30, y: BY - 66 }, { x: 310, y: GA - 66, duration: 0.4, ease: 'power2.out' });
      s.tween(bike, 0.8, { x: 0 }, { x: 150, duration: 1.3, ease: 'power1.inOut' });
      s.actor('baby', { x: BX - 4 + 150 }, 0.8, 1.3, 'power1.inOut');
      s.mouth('baby', 'smile', 1.3, 0.3); s.brow('baby', 'proud', 1.3, 0.3); s.mouth('adult', 'smile', 1.1, 0.3);
      // б) Аня решает пример у доски — мел в руке
      var bd = s.node(tri, 'g', {});
      s.node(bd, 'rect', { x: 730, y: 430, width: 460, height: 222, rx: 4, fill: '#3B5E54', stroke: '#C9A27A', 'stroke-width': 8 });
      s.path(tri, 'M720 ' + GA + ' H1200', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      var ex = s.node(bd, 'text', { x: 1000, y: 612, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); ex.textContent = '7 × 8 = 56';
      s.tween(ex, 0.4, { opacity: 0 }, { opacity: 1, duration: 0.8 });
      K().cast(s, 'anya', 1060, GA - 64, 128, 0, { mouth: 'soft', gx: -8, gy: -6, dur: 0.01 }); s.brow('kid2', 'focus', 0, 0.01);
      s.hands('kid2', 'up', 0, 0.01);
      chalk(s, tri, 1060 + 0.6 * 128, GA - 64 - 0.58 * 128); // мел в поднятой руке — у примера
      s.mouth('kid2', 'smile', 1.3, 0.3); s.brow('kid2', 'proud', 1.3, 0.3);
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
      s.tween(kn, 1.3, { x: 0, y: 0 }, { x: 90, y: -14, duration: 0.5, ease: 'power2.inOut' });
      K().cast(s, 'dima', 1334, GA - 46, 92, 0, { mouth: 'soft', gx: 8, gy: 0, dur: 0.01 }); s.hands('kid3', 'side', 1.2, 0.3);
      K().cast(s, 'dad', 1688, GA - 58, 116, 0, { mouth: 'soft', gx: -8, gy: 5, dur: 0.01 });
      var papa = K().tag(s, 'папа', 1688, 648, 0.2);
      s.mouth('kid3', 'smile', 1.8, 0.3); s.mouth('dad', 'flat', 1.8, 0.3); s.brow('dad', 'doubt', 1.8, 0.3);
      var mat = s.text('kidhand', 'мат!', { left: 1560, top: 556, fontSize: 40, color: RED });
      s.pop(mat, 1.8, { from: 0.6, dur: 0.3 });
      // кадр 2: класс (тот же, что в главе 1); Аня у доски на подставке пишет «9 × 6 = 52» — мальчик за партой смеётся
      var sw = flipF(s, 3.6);
      s.set([tri, mh, mat, papa], sw, { opacity: 1 }, { opacity: 0 }); s.set(labs, sw, { opacity: 1 }, { opacity: 0 });
      s.set(mh2, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['baby', 'adult', 'kid2', 'kid3', 'dad'], sw);
      var cr = s.node(g, 'g', { opacity: 0 }); s.set(cr, sw, { opacity: 0 }, { opacity: 1 });
      var room = P().classroom(s, cr, { boardText: 'Таблица умножения' });
      var MS = seat(room, 'misha'), DS = seat(room, 'dima'), B0 = room.seats[0][2], SD = MS.r * 2;
      // одноклассники не смеются (только один); место Ани пустое — она у доски
      var n = 0;
      room.seats.forEach(function (row, ri) { row.forEach(function (p, pi) {
        var id = ri + ':' + pi; if (id === room.heroes.misha || id === room.heroes.anya || id === room.heroes.dima || id === '0:2') return;
        K().classmate(cr, n++, p.x, p.y, p.r, { gx: -12, mouth: n % 2 ? 'flat' : 'soft' });
      }); });
      floorBag(s, cr, MS, room);
      // тот, кто смеётся: одноклассник за партой (рот — смех, брови — гордые), подпрыгивает от смеха
      var boy = grpAt(s, cr, B0.x, B0.y); Film.head(boy, 0, 0, B0.r, '#C95A44', null, { mouth: 'smile', brow: 'proud', gx: -10 });
      for (var k2 = 0; k2 < 5; k2++) { s.tween(boy, 4.9 + k2 * 0.24, { y: B0.y }, { y: B0.y - 7, duration: 0.12, ease: 'power2.out' }); s.tween(boy, 5.02 + k2 * 0.24, { y: B0.y - 7 }, { y: B0.y, duration: 0.12, ease: 'power2.in' }); }
      s.actor('baby', { x: MS.x, y: MS.y, d: SD }, sw, 0.01); s.actor('baby', { o: 1 }, sw, 0.01); s.gaze('baby', -12, 0, sw, 0.01); s.brow('baby', 'calm', sw, 0.01); s.mouth('baby', 'soft', sw, 0.01);
      s.gear('baby', 'backpack', false, sw, 0.01);
      s.actor('kid3', { x: DS.x, y: DS.y, d: SD }, sw, 0.01); s.actor('kid3', { o: 1 }, sw, 0.01); s.gaze('kid3', -12, 0, sw, 0.01); s.mouth('kid3', 'soft', sw, 0.01);
      s.hands('baby', 'desk', sw, 0.01); s.hands('kid3', 'desk', sw, 0.01);
      // подставка у доски: Аня стоит на ней и дотягивается до примера
      // переносная доска на ножках — стоит на полу, на высоте ребёнка: Аня пишет на ней, подняв руку
      var EX = 285, EW = 230, ET = 636, EB = 800;
      s.path(cr, 'M' + (EX + 20) + ' ' + EB + ' L' + (EX + 4) + ' ' + FLOOR + ' M' + (EX + EW - 20) + ' ' + EB + ' L' + (EX + EW - 4) + ' ' + FLOOR, { stroke: INK, 'stroke-width': 4 });
      s.node(cr, 'rect', { x: EX - 8, y: ET - 8, width: EW + 16, height: EB - ET + 16, rx: 5, fill: '#C9A27A', stroke: INK, 'stroke-width': 2.6 });
      s.node(cr, 'rect', { x: EX, y: ET, width: EW, height: EB - ET, rx: 3, fill: '#3B5E54', stroke: INK, 'stroke-width': 2 });
      var AD = 140, AX = 200, AY = FLOOR - AD / 2;
      s.actor('kid2', { x: AX, y: AY, d: AD }, sw, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.gaze('kid2', 8, -6, sw, 0.01); s.mouth('kid2', 'soft', sw, 0.01); s.brow('kid2', 'focus', sw, 0.01);
      s.hands('kid2', 'up', sw, 0.01);
      // мел — в руке-точке: у поднятой руки — у доски, опускается вместе с рукой
      var UP = [AX + 0.6 * AD, AY - 0.58 * AD], DN0 = [AX + 0.56 * AD, AY + 0.16 * AD];
      var ck = chalk(s, g, 0, 0); s.set(ck, 0, { opacity: 0 }, { opacity: 0 });
      s.set(ck, sw, { x: UP[0], y: UP[1], opacity: 0 }, { x: UP[0], y: UP[1], opacity: 1 });
      var bq = s.node(cr, 'text', { x: EX + 140, y: 734, 'text-anchor': 'end', fill: CHALK, style: 'font-family: var(--hand); font-size: 44px;' }); bq.textContent = '9 × 6 =';
      var ba = s.node(cr, 'text', { x: EX + 152, y: 734, 'text-anchor': 'start', fill: CHALK, style: 'font-family: var(--hand); font-size: 44px;' }); ba.textContent = '52';
      s.tween([bq, ba], sw + 0.15, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      // облачко у смеющегося — хвост ведёт к нему между головами дальнего ряда
      sayTo(s, 'Ты никогда не научишься!', 1400, 466, [B0.x, B0.y - B0.r - 4], 4.9, 7.1, 1640);
      s.brow('kid2', 'sad', 5.2, 0.3); s.mouth('kid2', 'sad', 5.2, 0.3); s.gaze('kid2', 3, 6, 5.2, 0.3);
      s.hands('kid2', 'side', 5.6, 0.4); s.tween(ck, 5.6, { x: UP[0], y: UP[1] }, { x: DN0[0], y: DN0[1], duration: 0.4, ease: 'power2.out' }); // опускает мел
      // кадр 3: Миша и Дима встают, выходят в проход и подходят — встают правее Ани, между доской и классом
      var MN = [586, FLOOR - SD / 2], DN = [730, FLOOR - SD / 2], AISLE = FLOOR - SD / 2; // идут по полу перед партами, не ниже линии пола; зазор между ними 36 px
      s.hands('baby', 'off', 6.0, 0.2); s.hands('kid3', 'off', 6.0, 0.2);
      s.actor('baby', { x: MS.x + 10, y: AISLE }, 6.05, 0.4, 'power2.inOut'); s.actor('kid3', { x: DS.x + 10, y: AISLE }, 6.1, 0.4, 'power2.inOut');
      var mw = walk2(s, 'baby', MN[0], AISLE, 6.5, 170); walk2(s, 'baby', MN[0], MN[1], mw, 70);
      var dw = walk2(s, 'kid3', DN[0], AISLE, 6.55, 220); walk2(s, 'kid3', DN[0], DN[1], dw, 70);
      s.gaze('baby', -10, 0, 6.5, 0.2); s.gaze('kid3', -10, 0, 6.5, 0.2);
      var TD = Math.max(mw, dw) + 0.3;
      s.gaze('baby', -10, -6, TD, 0.3); s.gaze('kid3', -10, -6, TD, 0.3);
      s.mouth('baby', 'soft', TD, 0.3); s.brow('baby', 'focus', TD, 0.3);
      s.hands('baby', 'off', TD, 0.01); s.hands('kid3', 'off', TD, 0.01); // руки не слипаются между ними
      sayH(s, 'Давай ещё раз!', MN[0] - 26, MN[1] - SD / 2 - 104, TD, TD + 2.0);
      s.gaze('kid2', 8, 2, TD + 0.3, 0.3); s.brow('kid2', 'calm', TD + 0.6, 0.3); s.mouth('kid2', 'soft', TD + 0.6, 0.3);
      // вторая попытка: Аня сама стирает «52» тряпкой и пишет «54»
      var TE = TD + 1.0;
      s.gaze('kid2', 8, -6, TE, 0.3); s.hands('kid2', 'up', TE, 0.3); s.brow('kid2', 'focus', TE, 0.3);
      s.tween(ck, TE, { x: DN0[0], y: DN0[1] }, { x: UP[0], y: UP[1], duration: 0.3, ease: 'power2.out' });
      s.set(ck, TE + 0.3, { opacity: 1 }, { opacity: 0 });
      var rag = s.node(cr, 'rect', { x: 0, y: 0, width: 46, height: 24, rx: 6, fill: '#8C7A62', stroke: INK, 'stroke-width': 2 });
      s.set(rag, 0, { x: EX + 168, y: 706, opacity: 0 }, { x: EX + 168, y: 706, opacity: 0 });
      s.set(rag, TE + 0.3, { opacity: 0 }, { opacity: 1 });
      [0, 1].forEach(function (i) { s.tween(rag, TE + 0.35 + i * 0.4, { x: EX + 168 }, { x: EX + 140, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 1 }); });
      s.tween(ba, TE + 0.4, { opacity: 1 }, { opacity: 0, duration: 0.7 });
      s.set(rag, TE + 1.15, { opacity: 1 }, { opacity: 0 }); s.set(ck, TE + 1.15, { opacity: 0 }, { opacity: 1 });
      var b2 = s.node(cr, 'text', { x: EX + 152, y: 734, 'text-anchor': 'start', fill: CHALK, style: 'font-family: var(--hand); font-size: 44px;' }); b2.textContent = '54';
      s.tween(b2, TE + 1.25, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var TOK = TE + 1.9;
      s.hands('kid2', 'side', TOK, 0.3); s.tween(ck, TOK, { x: UP[0], y: UP[1] }, { x: DN0[0], y: DN0[1], duration: 0.3 });
      s.brow('kid2', 'proud', TOK, 0.3); s.mouth('kid2', 'smile', TOK, 0.3); s.gaze('kid2', 6, -3, TOK, 0.3);
      sayH(s, 'Я могу!', AX + 42 - 200, AY - AD / 2 - 104, TOK + 0.1, TOK + 2.3, 'r');
      s.actor('kid2', { y: AY - 16 }, TOK + 0.2, 0.18, 'power2.out'); s.actor('kid2', { y: AY }, TOK + 0.38, 0.2, 'power2.in');
      s.tween(ck, TOK + 0.2, { y: DN0[1] }, { y: DN0[1] - 16, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 });
      s.mouth('baby', 'smile', TOK, 0.3); s.brow('baby', 'proud', TOK, 0.3); s.mouth('kid3', 'smile', TOK, 0.3);
      concl(s, 'когда получается — «я могу». Когда высмеивают — «я хуже других». Поддержка помогает попробовать снова.', TOK + 0.3);
      cite(s, 'Э. Эриксон, 1950 · «Я — это то, чему я учусь», 1959 · трудолюбие против неполноценности · industry vs. inferiority', TOK + 1.0);
      s.out(ck, s.dur - 0.4, { dur: 0.3 });
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.4);
    }
  });
})();
