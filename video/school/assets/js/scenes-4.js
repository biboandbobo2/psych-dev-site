/* Глава 4. «Я могу» · все трое (v3.2): один из двадцати (Рубл, Хартер, Орт), кого не зовут (Коуи и др.), «Я могу» (Эриксон).
   Язык главы — линии отношений: тонкая линия — кто с кем играет; к тому, кого не зовут, линий нет. */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', TEAL = '#26A69A', PAPER = '#FFFDF8', RED = '#D9534F', LINK = '#2B8F84', CHALK = '#F4F1E6';
  var CH = 62.5; // длина главы: 25 тактов

  // Реплика в слое #ui — когда камера увеличивает кадр (иначе облачко раздувается вместе с ним)
  function sayH(s, text, x, y, at, out, tail) {
    var b = s.hud('bubble say tail-' + (tail || 'l'), text, { left: x, top: y });
    s.pop(b, at, { from: 0.7, dur: 0.4, origin: (tail === 'r' ? '90%' : '10%') + ' 100%' });
    s.out(b, out, { dur: 0.3 });
    return b;
  }
  function concl(s, html, at, top) { // вывод — внизу, держится до конца сцены
    var e = s.text('lead', html, { left: 140, top: top || 940, width: 1640, fontSize: 36, fontWeight: 650, color: 'var(--accent-deep)' });
    s.lines(e, at);
    return e;
  }
  function cite(s, html, at) { var e = s.text('cite', html, { left: 140, top: 1020, fontSize: 20 }); s.fade(e, at, { y: 4 }); return e; }
  function off(s, ids, lt) { ids.forEach(function (id) { s.actor(id, { o: 0 }, lt, 0.3); s.hands(id, 'off', lt + 0.3, 0.01); }); }
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
  // Линия отношений между двумя детьми (центры кругов): прорисовывается за dur
  function link(s, g, a, b, at, dur) {
    var l = s.path(g, 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1], { stroke: LINK, 'stroke-width': 3.2 });
    s.draw(l, at, { dur: dur || 0.5, ease: 'power1.inOut' });
    return l;
  }
  // Раскрытая тетрадь «стоя» (видна зрителю); (0, 0) — середина низа; mark — отметка красным
  function notebook(s, g, mark) {
    var n = s.node(g, 'g', {});
    s.node(n, 'rect', { x: -56, y: -78, width: 112, height: 78, rx: 4, fill: PAPER, stroke: INK, 'stroke-width': 2.4 });
    s.path(n, 'M0 -78 V0', { stroke: INK, 'stroke-width': 2 });
    [-60, -44, -28].forEach(function (y) { s.path(n, 'M-46 ' + y + ' H-10', { stroke: '#9DB8C4', 'stroke-width': 2 }); });
    var m = s.node(n, 'text', { x: 28, y: -20, 'text-anchor': 'middle', fill: RED, style: 'font-family: var(--hand); font-size: 58px;' });
    m.textContent = mark;
    return n;
  }
  // Мяч (центр в 0, 0)
  function ball(s, g, x, y) { var b = grpAt(s, g, x, y); K().ball(s, b, 0, 0, 17); return b; }

  // 4:02,5 — Заставка: карта трёх дорожек; Миша и Аня идут рядом (между ними — линия), Дима — ещё отдельно
  Film.scene({
    id: 'ch4', bars: 2,
    build: function (s) {
      s.chapterCard(4, '«Я могу»', 'Миша, Аня и Дима среди других');
      var g = s.svg(), m = P().paths(s, g, { ground: 640 });
      var probe = function (who, f) { var p = s.path(g, m.paths[who].d, { stroke: 'none' }), L = p.getTotalLength(), q = p.getPointAtLength(L * f); return [q.x, q.y]; };
      var at = { misha: [0.46, 0.66], anya: [0.55, 0.75], dima: [0.22, 0.36] }, ids = {}, ends = {};
      ['misha', 'anya', 'dima'].forEach(function (w) {
        var k = m.paths[w].k, d = 92 * k, f = at[w], p0 = probe(w, f[0]);
        ids[w] = K().cast(s, w, p0[0], p0[1] - d / 2, d, 0.1, { gx: 6, dur: 0.3 });
        for (var i = 1; i <= 5; i++) { // шагают по своей дорожке
          var q = probe(w, f[0] + (f[1] - f[0]) * i / 5), t = 0.5 + (i - 1) * 0.3;
          s.squash(ids[w], 1.04, 0.96, t, 0.08);
          s.actor(ids[w], { x: q[0], y: q[1] - d / 2 }, t + 0.08, 0.22, 'power2.inOut');
          s.squash(ids[w], 1, 1, t + 0.08, 0.2);
        }
        ends[w] = probe(w, f[1]); ends[w][1] -= d / 2;
      });
      s.gaze('baby', 8, -2, 2.1, 0.3); s.gaze('kid2', -8, -2, 2.1, 0.3); // Миша и Аня переглядываются
      link(s, g, ends.misha, ends.anya, 2.2, 0.5);
      s.gaze('kid3', 6, 2, 2.4, 0.4);
      s.chapter(4, '«Я могу»', 0.4, CH - 0.6);
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.4);
    }
  });

  // 4:07,5 — Один из двадцати: тетради с отметками, «У неё пять!», столбчатая «Как я себя оцениваю»; перемена — бег
  // (Д. Рубл и др., 1980; С. Хартер; У. Орт и др., 2018)
  Film.scene({
    id: 'twenty', bars: 7,
    build: function (s) {
      var g = s.svg(), cls = s.node(g, 'g', {}), cr = P().classroom(s, cls, { boardText: 'Диктант' });
      P().fill(s, cls, cr.seats, ['0:0', '0:1', '0:3'], 0, -6);
      var M = cr.seats[0][0], A = cr.seats[0][1], D = cr.seats[0][3];
      K().cast(s, 'misha', M.x, M.y, M.r * 2, 0, { dur: 0.01, gx: -6 });
      K().cast(s, 'anya', A.x, A.y, A.r * 2, 0, { dur: 0.01, gx: -6 });
      K().cast(s, 'dima', D.x, D.y, D.r * 2, 0, { dur: 0.01, gx: -6 });
      var TY = P().standY(cr.floor, 150, true);
      K().cast(s, 'teacher', cr.teacher.x, TY, 150, 0, { dur: 0.01, gx: 6 });
      s.hands('adult2', 'hold', 0, 0.01); s.hands('baby', 'desk', 0, 0.01); s.hands('kid2', 'desk', 0, 0.01); s.hands('kid3', 'desk', 0, 0.01);
      // стопка тетрадей у учителя в руке; две тетради ложатся на парты Миши и Ани
      var HX = cr.teacher.x + 92, HY = TY + 100, stack = s.node(cls, 'g', {});
      [0, 1, 2].forEach(function (i) { s.node(stack, 'rect', { x: HX - 34, y: HY - 10 - i * 9, width: 68, height: 9, rx: 2, fill: i === 1 ? '#CFE3EA' : PAPER, stroke: INK, 'stroke-width': 2 }); });
      var nbA = grpAt(s, cls, HX, HY - 30), nbM = grpAt(s, cls, HX, HY - 30); // тетрадь Миши — спереди
      notebook(s, nbM, '4'); notebook(s, nbA, '5');
      s.set([nbM, nbA], 0, { opacity: 0 }, { opacity: 0 });
      var mDesk = [M.desk.x2 - 70, M.desk.y], aDesk = [A.desk.x2 - 70, A.desk.y];
      s.set(nbM, 0.3, { opacity: 0 }, { opacity: 1 }); move(s, nbM, mDesk[0], mDesk[1], 0.3, 0.5);
      s.set(nbA, 0.6, { opacity: 0 }, { opacity: 1 }); move(s, nbA, mDesk[0] + 14, mDesk[1] - 4, 0.6, 0.5);
      s.brow('baby', 'focus', 0.8, 0.3); s.gaze('baby', -8, 5, 0.8, 0.3);
      // Миша передаёт тетрадь Ане назад и заглядывает в неё
      s.gaze('baby', 8, 0, 1.25, 0.25); s.hands('baby', 'hold', 1.25, 0.25);
      arc(s, nbA, aDesk[0], aDesk[1], 1.35, 0.6, 140);
      s.hands('baby', 'desk', 2.0, 0.3);
      s.cam({ cx: 1140, cy: 790, z: 1.9 }, 0.9, 1.1, 'power2.inOut');
      s.mouth('kid2', 'smile', 2.0, 0.3); s.brow('kid2', 'proud', 2.0, 0.3); s.gaze('kid2', -6, 5, 2.0, 0.3);
      s.gaze('baby', 9, 3, 2.1, 0.3);
      sayH(s, 'У неё пять!', 640, 440, 2.3, 4.5);
      s.brow('baby', 'doubt', 2.7, 0.3); s.mouth('baby', 'flat', 2.7, 0.3);
      // вопрос-объяснение сверху (слой #ui: камера его не двигает)
      var t1 = s.hud('h3', 'С 7–8 лет ребёнок оценивает себя, сравнивая с другими детьми.', { left: 140, top: 128, width: 880, fontSize: 44 });
      s.tween(t1, 4.6, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      s.cam({ cx: 960, cy: 540, z: 1 }, 4.4, 1.0, 'power2.inOut');
      s.gaze('baby', -6, 0, 5.0, 0.3);
      // столбчатая «Как я себя оцениваю» рядом с Мишей; пунктир «в среднем» не двигается
      var CW = 900, card = s.hud('card', '', { left: 690, top: 268, width: CW, height: 352 });
      var sv = Film.svg('svg', { width: CW, height: 352, viewBox: '0 0 ' + CW + ' 352' }, card);
      sv.style.position = 'absolute'; sv.style.left = '0'; sv.style.top = '0';
      var ti = Film.svg('text', { x: CW / 2, y: 48, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 750; font-size: 28px; fill: #13534D;' }, sv);
      ti.textContent = 'Как я себя оцениваю';
      var H0 = [150, 100, 140, 120, 140], BASE = 290, bars = []; // среднее — 130
      ['учёба', 'спорт', 'друзья', 'внешность', 'поведение'].forEach(function (l, i) {
        var x = 50 + i * 145;
        var r = Film.svg('rect', { x: x, y: BASE, width: 80, height: 0, rx: 6, fill: TEAL, stroke: INK, 'stroke-width': 2.4 }, sv);
        s.tween(r, 5.8 + i * 0.1, { attr: { y: BASE, height: 0 } }, { attr: { y: BASE - H0[i], height: H0[i] }, duration: 0.45, ease: 'back.out(1.6)' });
        var tx = Film.svg('text', { x: x + 40, y: BASE + 34, 'text-anchor': 'middle', style: 'font-family: DOMSans; font-weight: 650; font-size: 22px; fill: #3A4654;' }, sv);
        tx.textContent = l; bars.push(r);
      });
      Film.svg('path', { d: 'M30 ' + BASE + ' H' + (CW - 170), stroke: INK, 'stroke-width': 2, fill: 'none' }, sv);
      var mid = Film.svg('path', { d: 'M30 ' + (BASE - 130) + ' H' + (CW - 170), stroke: RED, 'stroke-width': 3, 'stroke-dasharray': '10 8', fill: 'none' }, sv);
      var ml = Film.svg('text', { x: CW - 160, y: BASE - 123, 'text-anchor': 'start', style: 'font-family: DOMSans; font-weight: 700; font-size: 21px; fill: #B8433F;' }, sv); ml.textContent = 'в среднем';
      s.tween([mid, ml], 6.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.tween(card, 5.6, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      var dots = [s.hud('', '', { left: 950, top: 636, width: 24, height: 24, borderRadius: 12, background: PAPER, border: '2.5px solid #A79C8E' }),
        s.hud('', '', { left: 978, top: 690, width: 16, height: 16, borderRadius: 8, background: PAPER, border: '2.5px solid #A79C8E' })];
      s.tween(dots, 5.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      // «учёба» чуть опускается
      s.tween(bars[0], 7.4, { attr: { y: BASE - 150, height: 150 } }, { attr: { y: BASE - 115, height: 115 }, duration: 0.6, ease: 'power2.inOut' });
      s.mouth('baby', 'soft', 7.4, 0.3);
      // перемена: двор, бег наперегонки — Миша быстрее всех
      var sw = K().flip(s, 7.8);
      s.set(cls, sw, { opacity: 1 }, { opacity: 0 });
      s.set(dots, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['kid3', 'adult2'], sw); s.hands('baby', 'off', sw, 0.01); s.hands('kid2', 'off', sw, 0.01);
      var yd = s.node(g, 'g', { opacity: 0 }), GR = 700;
      s.set(yd, sw, { opacity: 0 }, { opacity: 1 });
      s.node(yd, 'rect', { x: 0, y: GR, width: 1920, height: 1080 - GR, fill: '#CFC4AE' });
      s.path(yd, 'M0 ' + GR + ' H1920', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      P().school(s, yd, 330, GR, 0.9); P().tree(s, yd, 1810, GR, 1.0); P().bench(s, yd, 1610, GR, 1);
      var START = 380, FIN = 1460, LN = [[772, 36], [822, 40], [874, 46]]; // дорожки забега: центр, радиус
      [[START, 'старт'], [FIN, 'финиш']].forEach(function (q) {
        s.path(yd, 'M' + q[0] + ' 734 V916', { stroke: '#FFFFFF', 'stroke-width': 6 });
        var t = s.node(yd, 'text', { x: q[0], y: 726, 'text-anchor': 'middle', fill: '#FFFFFF', style: 'font-family: var(--kid); font-size: 34px;' }); t.textContent = q[1];
      });
      var runners = [[3, 0, START - 40, FIN - 210], [8, 1, START - 40, FIN - 120]].map(function (c) {
        var b = grpAt(s, yd, c[2], LN[c[1]][0]); K().classmate(b, c[0], 0, 0, LN[c[1]][1], { gx: 6 });
        move(s, b, c[3], LN[c[1]][0], 8.5, 2.2, 'power1.inOut');
        for (var i = 0; i < 6; i++) { s.tween(b, 8.5 + i * 0.37, { y: LN[c[1]][0] }, { y: LN[c[1]][0] - 16, duration: 0.18, ease: 'power2.out' }); s.tween(b, 8.68 + i * 0.37, { y: LN[c[1]][0] - 16 }, { y: LN[c[1]][0], duration: 0.18, ease: 'power2.in' }); }
        return b;
      });
      void runners;
      s.actor('baby', { x: START - 40, y: LN[2][0], d: 92 }, sw, 0.01); s.gaze('baby', 8, 0, sw, 0.01); s.brow('baby', 'focus', sw, 0.01); s.mouth('baby', 'flat', sw, 0.01);
      s.actor('kid2', { x: FIN + 170, y: 760, d: 84 }, sw, 0.01); s.gaze('kid2', -8, 0, sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01); s.brow('kid2', 'calm', sw, 0.01);
      for (var i = 0; i < 8; i++) s.hop('baby', START - 40 + (FIN + 60 - START + 40) * (i + 1) / 8, LN[2][0], 8.5 + i * 0.27, 0.22, 26);
      s.hands('kid2', 'up', 10.4, 0.3);
      s.brow('baby', 'proud', 10.8, 0.3); s.mouth('baby', 'smile', 10.8, 0.3); s.hands('baby', 'up', 10.8, 0.3);
      // «спорт» поднимается, «учёба» чуть ниже — пунктир «в среднем» на месте
      s.tween(bars[1], 10.9, { attr: { y: BASE - 100, height: 100 } }, { attr: { y: BASE - 135, height: 135 }, duration: 0.6, ease: 'back.out(1.4)' });
      concl(s, 'Вывод: самооценка делится на области и становится точнее — но в среднем не падает.', 10.9);
      cite(s, 'social comparison · Д. Рубл и др., 1980 · С. Хартер · У. Орт и др., 2018: 331 выборка', 11.7);
      s.out([t1, card], s.dur - 0.5, { dur: 0.4 });
      off(s, ['baby', 'kid2'], s.dur - 0.4);
    }
  });

  // 4:25 — Кого не зовут: передачи мяча рисуют линии между детьми; к Диме у стены — ни одной.
  // Скачки времени — линии меняются; учитель отдаёт мяч Мише, Миша и Аня зовут Диму — линии тянутся к нему.
  // (Дж. Коуи, К. Додж, Х. Коппотелли, 1982)
  Film.scene({
    id: 'outcast', bars: 9,
    build: function (s) {
      var g = s.svg(), yd = P().yard(s, g, { ground: 760, schoolX: 360, schoolK: 0.75, classics: false });
      void yd;
      var nets = [s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {}), s.node(g, 'g', {})], kg = s.node(g, 'g', {});
      var DM = [500, 766];
      K().cast(s, 'dima', DM[0], DM[1], 92, 0, { dur: 0.01, mouth: 'soft', gx: 7 });
      // играющие: Миша, Аня и четверо одноклассников; позиции — центры кругов, по «неделям»
      // кольцо игры (вид сбоку-сверху): шесть мест; по «неделям» дети меняются местами
      var R = 42, S = { A: [1740, 840], B: [1450, 884], C: [1150, 884], D: [860, 840], E: [1000, 796], F: [1600, 796] };
      var W = [{ m: 'C', a: 'E', c: ['D', 'F', 'A', 'B'] }, { m: 'F', a: 'D', c: ['A', 'E', 'C', 'B'] }, { m: 'D', a: 'E', c: ['F', 'C', 'A', 'B'] }]
        .map(function (w) { return { m: S[w.m], a: S[w.a], c: w.c.map(function (k) { return S[k]; }) }; });
      var cl = [0, 1, 2, 3].map(function (i) { var b = grpAt(s, kg, W[0].c[i][0], W[0].c[i][1]); K().classmate(b, [2, 5, 9, 12][i], 0, 0, R, { gx: -5 }); return b; });
      K().cast(s, 'misha', W[0].m[0], W[0].m[1], 2 * R, 0, { dur: 0.01, gx: -5 });
      K().cast(s, 'anya', W[0].a[0], W[0].a[1], 2 * R, 0, { dur: 0.01, gx: 5 });
      var ob = s.over(), bl = ball(s, ob, W[0].c[0][0] + 30, W[0].c[0][1] + 14); // мяч — поверх детей
      // передача: мяч летит от одного к другому — и между ними остаётся линия
      function pos(w, k) { return k === 'm' ? W[w].m : k === 'a' ? W[w].a : W[w].c[k]; }
      function passes(w, seq, t0, step, net) {
        jump(s, bl, pos(w, seq[0])[0] + 30, pos(w, seq[0])[1] + 14, t0 - 0.4);
        for (var i = 1; i < seq.length; i++) {
          var a = pos(w, seq[i - 1]), b = pos(w, seq[i]), t = t0 + (i - 1) * step;
          arc(s, bl, b[0] + 30, b[1] + 14, t, step * 0.8, 90);
          link(s, net, a, b, t, step * 0.8);
        }
      }
      passes(0, [0, 'a', 1, 2, 3, 'm'], 0.5, 0.7, nets[0]);
      s.gaze('kid3', 8, -2, 0.6, 0.3);
      var q = s.text('h3', 'Кто в классе остаётся у стены?', { left: 140, top: 128, width: 900 });
      s.lines(q, 0.3);
      s.gaze('kid3', 4, 5, 3.6, 0.4); s.mouth('kid3', 'flat', 3.6, 0.3);
      var t2 = s.text('lead', 'Класс — вторая группа после семьи. Дольше всего держится роль того, кого не зовут играть.', { left: 140, top: 206, width: 900, fontSize: 32 });
      s.lines(t2, 3.9);
      // скачки времени: перелистнули — дети на новых местах, линии другие; у Димы — по-прежнему ни одной
      [[4.5, 'через неделю', 1, [1, 'm', 0, 3, 2, 'a']], [7.6, 'через месяц', 2, [1, 'm', 'a', 0, 2, 3]]].forEach(function (j) {
        var sw = K().flip(s, j[0]), w = j[2];
        s.set(nets[w - 1], sw, { opacity: 1 }, { opacity: 0 });
        cl.forEach(function (b, i) { jump(s, b, W[w].c[i][0], W[w].c[i][1], sw); });
        s.actor('baby', { x: W[w].m[0], y: W[w].m[1] }, sw, 0.01); s.actor('kid2', { x: W[w].a[0], y: W[w].a[1] }, sw, 0.01);
        var lb = s.text('kidhand', j[1], { left: 1180, top: 300, fontSize: 52, color: '#13534D' });
        s.tween(lb, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
        s.set(lb, sw + 2.6, { opacity: 1 }, { opacity: 0 });
        passes(w, j[3], sw + 0.4, 0.5, nets[w]);
        s.gaze('kid3', 8, -2, sw + 0.4, 0.3); s.gaze('kid3', 4, 5, sw + 2.2, 0.4);
      });
      // учитель приходит с мячом и отдаёт его Мише
      var T = 10.6, w2 = W[2], TB = 880, TY = P().standY(TB, 140, true);
      s.out(nets[2], T + 2.6, { dur: 0.4 });
      s.set(bl, T, { opacity: 1 }, { opacity: 0 });
      K().cast(s, 'teacher', 2040, TY, 140, T, { dur: 0.01, gx: -7 }); s.hands('adult2', 'hold', T, 0.01);
      var tb = ball(s, ob, 2040 - 84, TY + 98);
      K().walk(s, 'adult2', 1840, T + 0.1, { step: 100, dur: 0.24, hold: 0.06 });
      move(s, tb, 1840 - 84, TY + 98, T + 0.1, 0.6, 'none');
      s.gaze('baby', 8, -3, T + 0.6, 0.3); s.gaze('kid2', 8, -3, T + 0.6, 0.3);
      sayH(s, 'Собирай команду!', 1500, 540, T + 1.0, T + 3.0, 'r');
      arc(s, tb, w2.m[0] + 36, w2.m[1] + 10, T + 2.0, 0.8, 140);
      s.hands('baby', 'hold', T + 2.6, 0.2); s.brow('baby', 'proud', T + 2.7, 0.3);
      // Миша и Аня идут к Диме: «Пойдём с нами!»
      var MN = [330, 850], AN = [700, 796];
      s.hands('baby', 'off', T + 3.1, 0.2);
      K().walk(s, 'baby', MN[0], T + 3.2, { step: 135, dur: 0.22, hold: 0.04 });
      move(s, tb, MN[0] + 36, MN[1] + 10, T + 3.2, 1.05, 'none');
      K().walk(s, 'kid2', AN[0], T + 3.2, { step: 112, dur: 0.24, hold: 0.06 });
      s.gaze('baby', -8, -2, T + 3.2, 0.3); s.gaze('kid2', -8, -2, T + 3.2, 0.3);
      s.gaze('kid3', 8, -1, T + 3.6, 0.3);
      sayH(s, 'Пойдём с нами!', 30, 704, T + 4.3, T + 6.5, 'r');
      s.mouth('kid3', 'smile', T + 5.0, 0.4);
      // Дима отходит от стены; мяч — Диме, Аня, снова Миша: линии сходятся к нему
      var DN = [520, 880];
      s.actor('kid3', { x: DN[0], y: DN[1] }, T + 5.4, 0.5, 'power2.out');
      jump(s, bl, MN[0] + 36, MN[1] + 10, T + 6.1); s.set(tb, T + 6.1, { opacity: 1 }, { opacity: 0 }); s.set(bl, T + 6.1, { opacity: 0 }, { opacity: 1 });
      arc(s, bl, DN[0] + 36, DN[1] + 10, T + 6.2, 0.5, 70); link(s, nets[3], MN, DN, T + 6.2, 0.5);
      arc(s, bl, AN[0] + 32, AN[1] + 12, T + 6.9, 0.5, 70); link(s, nets[3], DN, AN, T + 6.9, 0.5);
      arc(s, bl, MN[0] + 36, MN[1] + 10, T + 7.6, 0.5, 70); link(s, nets[3], AN, MN, T + 7.6, 0.5);
      s.gaze('kid3', 7, -1, T + 6.3, 0.2); s.gaze('kid2', -7, 0, T + 6.9, 0.2);
      concl(s, 'Вывод: из этой роли помогают выйти взрослые — и друзья.', T + 6.5);
      cite(s, 'Дж. Коуи, К. Додж, Х. Коппотелли, 1982: популярные · отвергаемые · пренебрегаемые · противоречивые · средние', T + 7.0);
      off(s, ['kid3', 'baby', 'kid2', 'adult2'], s.dur - 0.4);
    }
  });

  // 4:47,5 — «Я могу»: три быстрых плана; Аню высмеяли — Миша и Дима встают рядом: «Давай ещё раз!» (Э. Эриксон, 1950; 1959)
  Film.scene({
    id: 'ican', bars: 7,
    build: function (s) {
      var g = s.svg();
      var q = s.text('h3', 'Главный вопрос возраста — «Могу ли я?»', { left: 140, top: 128, width: 1640 });
      s.lines(q, 0.1);
      // кадр 1: три плана рядом
      var tri = s.node(g, 'g', {}), PY = 320, PB = 850;
      [140, 700, 1260].forEach(function (x) { s.node(tri, 'rect', { x: x, y: PY, width: 520, height: PB - PY, rx: 18, fill: PAPER, stroke: '#E3DACB', 'stroke-width': 2.5 }); });
      var labs = [];
      [[400, 1.6], [960, 2.4], [1520, 3.2]].forEach(function (p) {
        var e = s.text('kidhand', 'Я могу!', { left: p[0] - 150, top: PY + 22, width: 300, textAlign: 'center', fontSize: 50, color: '#13534D' });
        s.pop(e, p[1], { from: 0.6, dur: 0.4 }); labs.push(e);
      });
      // а) мама отпускает седло — Миша едет сам
      var GA = 810;
      s.path(tri, 'M160 ' + GA + ' H640', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      var bike = s.node(tri, 'g', {}), BX = 390, BY = GA - 36;
      [-60, 60].forEach(function (dx) { s.node(bike, 'circle', { cx: BX + dx, cy: BY, r: 36, fill: 'none', stroke: INK, 'stroke-width': 4 }); });
      s.path(bike, 'M' + (BX - 60) + ' ' + BY + ' L' + (BX - 20) + ' ' + (BY - 60) + ' L' + (BX + 60) + ' ' + BY + ' M' + (BX - 20) + ' ' + (BY - 60) + ' L' + (BX + 44) + ' ' + (BY - 66) + ' L' + (BX + 60) + ' ' + BY + ' M' + (BX + 44) + ' ' + (BY - 66) + ' L' + (BX + 50) + ' ' + (BY - 84) + ' h14', { stroke: INK, 'stroke-width': 4 });
      s.node(bike, 'rect', { x: BX - 28, y: BY - 68, width: 46, height: 10, rx: 5, fill: INK });
      K().cast(s, 'mom', 250, GA - 72, 144, 0, { gx: 7, gy: 3 }); s.hands('adult', 'hold', 0, 0.01);
      K().cast(s, 'misha', BX - 4, BY - 68 - 42, 84, 0, { mouth: 'soft', gx: 7 }); s.hands('baby', 'hold', 0, 0.01); s.brow('baby', 'focus', 0, 0.01);
      s.hands('adult', 'side', 0.7, 0.3);
      s.tween(bike, 0.8, { x: 0 }, { x: 150, duration: 1.3, ease: 'power1.inOut' });
      s.actor('baby', { x: BX - 4 + 150 }, 0.8, 1.3, 'power1.inOut');
      s.mouth('baby', 'smile', 1.5, 0.3); s.brow('baby', 'proud', 1.5, 0.3); s.mouth('adult', 'smile', 1.2, 0.3);
      // б) Аня решает пример у доски
      var bd = s.node(tri, 'g', {});
      s.node(bd, 'rect', { x: 730, y: 430, width: 460, height: 210, rx: 4, fill: '#3B5E54', stroke: '#C9A27A', 'stroke-width': 8 });
      s.path(tri, 'M720 ' + GA + ' H1200', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      var ex = s.node(bd, 'text', { x: 900, y: 560, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); ex.textContent = '7 × 8 = 56';
      s.tween(ex, 1.2, { opacity: 0 }, { opacity: 1, duration: 0.8 });
      K().cast(s, 'anya', 1060, GA - 64, 128, 0, { mouth: 'soft', gx: -6, gy: -5 }); s.brow('kid2', 'focus', 0, 0.01);
      s.hands('kid2', 'up', 1.0, 0.3); s.hands('kid2', 'side', 2.1, 0.3);
      s.mouth('kid2', 'smile', 2.2, 0.3); s.brow('kid2', 'proud', 2.2, 0.3);
      // в) Дима ставит мат лошадкой-конём; папа удивлён
      var ch = s.node(tri, 'g', {});
      s.path(tri, 'M1280 ' + GA + ' H1760', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.node(ch, 'rect', { x: 1390, y: 690, width: 250, height: 12, rx: 3, fill: '#E9D9BF', stroke: INK, 'stroke-width': 2.4 });
      s.path(ch, 'M1406 702 V' + GA + ' M1624 702 V' + GA, { stroke: INK, 'stroke-width': 2.4 });
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) { // доска в лёгкой перспективе
        var y0 = 690 - (r + 1) * 14, y1 = 690 - r * 14, sh = (r + 1) * 6, sh0 = r * 6, w0 = (220 - 2 * sh0) / 6, w1 = (220 - 2 * sh) / 6;
        var xa = 1405 + sh0 + c * w0, xb = 1405 + sh0 + (c + 1) * w0, xc = 1405 + sh + (c + 1) * w1, xd = 1405 + sh + c * w1;
        s.path(ch, 'M' + xa + ' ' + y1 + ' L' + xb + ' ' + y1 + ' L' + xc + ' ' + y0 + ' L' + xd + ' ' + y0 + ' Z', { fill: (r + c) % 2 ? '#8A6A4A' : '#F3E6D2', stroke: INK, 'stroke-width': 1.2 });
      }
      var king = s.node(ch, 'g', {}); K().pawn(s, king, 1575, 664, 1.0, false);
      s.path(king, 'M1575 612 v-18 M1567 602 h16', { stroke: INK, 'stroke-width': 3.5 });
      var kn = s.node(ch, 'g', {}); K().toyHorse(s, kn, 1450, 684, 0.42);
      s.tween(kn, 2.4, { x: 0, y: 0 }, { x: 80, y: -20, duration: 0.5, ease: 'power2.inOut' });
      s.tween(king, 2.95, { rotation: 0, svgOrigin: '1575 664' }, { rotation: 20, duration: 0.3, ease: 'power2.out' });
      K().cast(s, 'dima', 1334, GA - 46, 92, 0, { mouth: 'soft', gx: 7, gy: 4 }); s.hands('kid3', 'side', 2.3, 0.3);
      K().cast(s, 'dad', 1700, GA - 58, 116, 0, { mouth: 'soft', gx: -7, gy: 4 });
      s.mouth('kid3', 'smile', 3.0, 0.3); s.mouth('dad', 'flat', 3.0, 0.3); s.brow('dad', 'doubt', 3.0, 0.3);
      // кадр 2: класс; Аня у доски ошибается — один смеётся
      var sw = K().flip(s, 4.0);
      s.set(tri, sw, { opacity: 1 }, { opacity: 0 }); s.set(labs, sw, { opacity: 1 }, { opacity: 0 });
      hide(s, ['baby', 'adult', 'kid2', 'kid3', 'dad'], sw);
      // класс крупнее (×1,25): доска слева, Аня у доски, три парты первого ряда; Z(x, y) — из координат класса в кадр
      var KZ = 1.25, ZX = -10, ZY = 5, Z = function (x, y) { return [ZX + KZ * x, ZY + KZ * y]; };
      var cr = s.node(g, 'g', { opacity: 0, transform: 'translate(' + ZX + ' ' + ZY + ') scale(' + KZ + ')' }); s.set(cr, sw, { opacity: 0 }, { opacity: 1 });
      var room = P().classroom(s, cr, { floor: 700, rows: [{ floor: 700, k: 1, xs: [880, 1100, 1320, 1540] }, { floor: 560, k: 0.72, xs: [1000, 1230, 1460] }] });
      P().fill(s, cr, room.seats, ['0:0', '0:1', '0:2'], 4, -6);
      var B0 = room.seats[0][0], MS = Z(room.seats[0][1].x, room.seats[0][1].y), DS = Z(room.seats[0][2].x, room.seats[0][2].y), SD = room.seats[0][1].r * 2 * KZ;
      // тот, кто смеётся: одноклассник с прищуром (одна бровь вверх)
      var boy = grpAt(s, cr, B0.x, B0.y); Film.head(boy, 0, 0, B0.r, '#C95A44', null, { mouth: 'smile', brow: 'doubt', gx: -8 });
      for (var k2 = 0; k2 < 4; k2++) { s.tween(boy, 5.6 + k2 * 0.24, { y: B0.y }, { y: B0.y - 7, duration: 0.12, ease: 'power2.out' }); s.tween(boy, 5.72 + k2 * 0.24, { y: B0.y - 7 }, { y: B0.y, duration: 0.12, ease: 'power2.in' }); }
      s.actor('baby', { x: MS[0], y: MS[1], d: SD }, sw, 0.01); s.actor('baby', { o: 1 }, sw, 0.01); s.gaze('baby', -7, 0, sw, 0.01); s.brow('baby', 'calm', sw, 0.01); s.mouth('baby', 'smile', sw, 0.01);
      s.actor('kid3', { x: DS[0], y: DS[1], d: SD }, sw, 0.01); s.actor('kid3', { o: 1 }, sw, 0.01); s.gaze('kid3', -7, 0, sw, 0.01); s.mouth('kid3', 'smile', sw, 0.01);
      s.hands('baby', 'desk', sw, 0.01); s.hands('kid3', 'desk', sw, 0.01);
      var FLZ = Z(0, 700)[1], AD = 150, AX = Z(420, 0)[0], AY = FLZ - AD / 2;
      s.actor('kid2', { x: AX, y: AY, d: AD }, sw, 0.01); s.actor('kid2', { o: 1 }, sw, 0.01);
      s.gaze('kid2', -4, -6, sw, 0.01); s.mouth('kid2', 'soft', sw, 0.01); s.brow('kid2', 'focus', sw, 0.01);
      s.hands('kid2', 'up', sw + 0.1, 0.3);
      var bw = s.node(cr, 'text', { x: 360, y: 430, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); bw.textContent = '9 × 6 = 52';
      s.tween(bw, sw + 0.3, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      sayH(s, 'Ты никогда не научишься!', Z(B0.x, 0)[0] - 40, 440, 5.2, 7.4);
      s.brow('kid2', 'sad', 5.6, 0.3); s.mouth('kid2', 'sad', 5.6, 0.3); s.gaze('kid2', 3, 5, 5.6, 0.3);
      s.hands('kid2', 'side', 6.0, 0.4); // опускает мел
      // кадр 3: Миша и Дима встают рядом — «Давай ещё раз!»
      var MN = [Z(640, 0)[0], FLZ - SD / 2], DN = [Z(750, 0)[0], FLZ - SD / 2];
      s.hands('baby', 'off', 6.5, 0.2); s.hands('kid3', 'off', 6.5, 0.2);
      s.hop('baby', MS[0] - 80, MN[1], 6.6, 0.3, 30); s.hop('kid3', DS[0] - 80, DN[1], 6.7, 0.3, 30);
      K().walk(s, 'baby', MN[0], 7.0, { step: 160, dur: 0.22, hold: 0.04 });
      K().walk(s, 'kid3', DN[0], 7.0, { step: 180, dur: 0.22, hold: 0.04 });
      s.mouth('baby', 'soft', 7.0, 0.3); s.brow('baby', 'focus', 7.0, 0.3);
      s.hands('baby', 'side', 8.0, 0.3); s.hands('kid3', 'side', 8.0, 0.3);
      sayH(s, 'Давай ещё раз!', MN[0] + 42 - 330, MN[1] - SD / 2 - 104, 7.6, 9.8, 'r');
      s.gaze('kid2', 7, -2, 8.0, 0.3); s.brow('kid2', 'calm', 8.4, 0.3); s.mouth('kid2', 'soft', 8.4, 0.3);
      // вторая попытка: «52» стирается — «54»
      s.gaze('kid2', -4, -6, 9.0, 0.3); s.hands('kid2', 'up', 9.0, 0.3); s.brow('kid2', 'focus', 9.0, 0.3);
      s.out(bw, 9.2, { dur: 0.3 });
      var bw2 = s.node(cr, 'text', { x: 360, y: 430, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: 60px;' }); bw2.textContent = '9 × 6 = 54';
      s.tween(bw2, 9.5, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      s.hands('kid2', 'side', 10.1, 0.3); s.brow('kid2', 'proud', 10.1, 0.3); s.mouth('kid2', 'smile', 10.1, 0.3);
      s.gaze('kid2', 6, -3, 10.1, 0.3);
      sayH(s, 'Я могу!', AX + 30, AY - AD / 2 - 104, 10.2, 12.6);
      s.hop('kid2', AX, AY, 10.3, 0.32, 30);
      s.mouth('baby', 'smile', 10.3, 0.3); s.brow('baby', 'proud', 10.3, 0.3); s.mouth('kid3', 'smile', 10.3, 0.3);
      concl(s, 'Вывод: когда получается — «я могу». Когда высмеивают — «я хуже других». Поддержка помогает попробовать снова.', 10.4, 906);
      cite(s, 'Э. Эриксон, 1950 · «Я — это то, чему я учусь», 1959 · трудолюбие против неполноценности · industry vs. inferiority', 11.2);
      off(s, ['baby', 'kid2', 'kid3'], s.dur - 0.4);
    }
  });
})();
