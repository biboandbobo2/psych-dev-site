/* Вступление (v3.2, «Язык 7–10»): крючок (палочка-лошадка становится знаком, лошадка — в ранец), титр с картой курса,
   «когда дети идут в первый класс» (Миша подхватывает ранец), «о чём этот возраст» (карта эпизода: школа и четыре строки-главы) */
/* global Film */
(function () {
  'use strict';
  var STICK = '#8B6A45', INK = '#2B3440', FLOOR = '#C9BBA2';
  var K = function () { return Film.school; }, P = function () { return Film.places; };

  // 0:00 — Крючок: палочка была лошадью — теперь палочка знак; игрушечную лошадку Миша кладёт в ранец
  Film.scene({
    id: 'prologue', bars: 3,
    build: function (s) {
      var g = s.svg(), ov = s.over(), GY = 700, CX = 330, CY = GY - 60;
      // ранец Миши в этой сцене лежит на земле (надевает его Миша в следующей сцене — «ages»)
      s.acc('baby', 'backpack'); s.gear('baby', 'backpack', false, 0, 0.01);
      // кадр 1: двор, галоп на палочке-лошадке (из 3–7)
      var yard = s.node(g, 'g', {});
      s.path(yard, 'M0 ' + GY + ' H1920', { stroke: FLOOR, 'stroke-width': 2.4 });
      P().tree(s, yard, 120, GY, 0.9); P().tree(s, yard, 1720, GY, 1.1);
      P().bench(s, yard, 1350, GY, 1.2);
      s.tween(yard, 0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      K().cast(s, 'misha', CX, CY, 120, 0.1, { gx: 7 });
      s.brow('baby', 'calm', 0, 0.01);
      s.hands('baby', 'hold', 0.1, 0.01);
      // палочка — в правой руке, наискосок: нижний конец у земли, сверху голова лошади
      var HX = CX + 150, HY = CY - 64, stick = s.node(g, 'g', {});
      s.path(stick, 'M' + (CX + 18) + ' ' + (GY - 2) + ' L' + HX + ' ' + HY, { stroke: STICK, 'stroke-width': 9 });
      s.tween(stick, 0.15, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var horse = s.node(ov, 'g', {});
      Film.icons.horse(s, horse, HX, HY, 0.6, { at: 0.3, dur: 0.8, seed: 5 });
      [0.9, 1.65].forEach(function (t) {
        s.hop('baby', s.A.baby.st.x + 80, CY, t, 0.5, 46);
        Film.ride(s, stick, 80, t, 0.5, 46);
        Film.ride(s, horse, 80, t, 0.5, 46);
      });
      var l1 = s.text('statement', 'Палочка была лошадью.', { left: 160, top: 790, width: 1600, textAlign: 'center' });
      s.lines(l1, 0.5);
      s.out(l1, 4.3, { dur: 0.3 });
      // кадр 2: лошадь гаснет; палочка падает на тетрадный лист и встаёт в ряд палочек прописи: IIII → 4
      s.out(horse, 2.5, { dur: 0.35 });
      s.out(stick, 2.65, { dur: 0.2 });
      s.out(yard, 2.6, { dur: 0.3 });
      s.actor('baby', { o: 0 }, 2.55, 0.3); s.hands('baby', 'off', 2.85, 0.01);
      var pg = s.node(g, 'g', {});
      P().page(s, pg, 560, 220, 800, 440, { cell: 44, margin: 132 });
      s.tween(pg, 2.75, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      var SX = 690, DXS = 80, Y1 = 330, Y2 = 506, ink = [];
      for (var i = 0; i < 3; i++) {
        var p = s.path(pg, 'M' + (SX + i * DXS) + ' ' + Y1 + ' L' + (SX + i * DXS) + ' ' + Y2, { stroke: '#2E3B4E', 'stroke-width': 8 });
        s.draw(p, 3.0 + i * 0.18, { dur: 0.16 });
        ink.push(p);
      }
      // сама палочка (коричневая) — четвёртая в ряду
      var st2 = s.node(ov, 'g', {}), X4 = SX + 3 * DXS;
      s.path(st2, 'M' + X4 + ' ' + Y1 + ' L' + X4 + ' ' + Y2, { stroke: STICK, 'stroke-width': 11 });
      s.tween(st2, 3.5, { opacity: 0, x: -260, y: -260, rotation: -70, transformOrigin: '50% 100%' },
        { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'power2.in' });
      s.tween(st2, 4.1, { rotation: 0 }, { rotation: 4, duration: 0.08, repeat: 3, yoyo: true, transformOrigin: '50% 100%' });
      s.out(ink, 4.55, { dur: 0.25 });
      s.tween(st2, 4.55, { opacity: 1 }, { opacity: 0, duration: 0.25 });
      var four = s.node(pg, 'text', { x: SX + 1.5 * DXS, y: Y2, 'text-anchor': 'middle', fill: '#2E3B4E', style: 'font-family: var(--kid); font-size: 220px' });
      four.textContent = '4';
      s.tween(four, 4.7, { opacity: 0, scale: 0.6, transformOrigin: '50% 80%' }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' });
      var l2 = s.text('statement', 'Теперь палочка — ' + s.HL('знак.'), { left: 160, top: 790, width: 1600, textAlign: 'center' });
      s.lines(l2, 4.45);
      s.hl(l2, 5.0);
      // кадр 3: снова двор; на земле игрушечная лошадка и ранец. Миша берёт лошадку целиком и кладёт в ранец
      s.out(pg, 5.15, { dur: 0.3 });
      s.tween(yard, 5.2, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var toy = s.node(g, 'g', {}); // лошадка рисуется под ранцем — в ранце она скрывается
      K().toyHorse(s, toy, 760, GY, 0.9);
      var bp = s.node(g, 'g', {});
      Film.toys.backpack(s, bp, 920, GY - 54, 1.4, '#26A69A', '#1C7A71');
      [toy, bp].forEach(function (e) { s.tween(e, 5.2, { opacity: 0 }, { opacity: 1, duration: 0.3 }); });
      s.actor('baby', { x: 1090, y: CY }, 5.15, 0.01); s.gaze('baby', -9, 2, 5.15, 0.01);
      s.actor('baby', { o: 1 }, 5.2, 0.3);
      K().walk(s, 'baby', 840, 5.35, { step: 85, dur: 0.12, hold: 0.03 }); // левая рука — над лошадкой
      s.hands('baby', 'hold', 5.75, 0.2);
      s.tween(toy, 5.95, { x: 0, y: 0 }, { x: 0, y: -60, duration: 0.25, ease: 'power2.out' });
      s.actor('baby', { x: 1040 }, 6.25, 0.4, 'power2.inOut');
      s.tween(toy, 6.25, { x: 0 }, { x: 160, duration: 0.4, ease: 'power2.inOut' });
      s.tween(toy, 6.7, { y: -60 }, { y: 0, duration: 0.2, ease: 'power2.in' });
      s.set(toy, 6.9, { opacity: 1 }, { opacity: 0 });
      s.mouth('baby', 'smile', 6.9, 0.2);
      s.squash('baby', 1.06, 0.94, 6.95, 0.08); s.squash('baby', 1, 1, 7.03, 0.2, 'back.out(3)');
      s.actor('baby', { o: 0 }, 7.15, 0.3);
      s.hands('baby', 'off', 7.45, 0.01);
    }
  });

  // 0:07,5 — Титр: карта курса → отрезок «7–10» вырастает в шкалу эпизода
  Film.scene({
    id: 'title', bars: 3,
    build: function (s) {
      var M = s.map();
      s.mapIn(M, 0.25);
      var cur = s.CFG.series.current, cx = M.x(cur) + M.segW / 2;
      var cap = s.text('small-caps', 'Карта курса', { left: s.X0, top: s.RY - 58 });
      s.fade(cap, 0.5, { y: 6 });
      s.out(cap, 3.7, { dur: 0.4 });
      s.face('baby', false, 0.0, 0.01);
      s.actor('baby', { x: cx, y: s.RY, d: 26, o: 0 }, 0.0, 0.01);
      s.actor('baby', { o: 1 }, 0.3, 0.4);
      var k = s.text('kicker', 'Психология развития', { left: 160, top: 318, width: 1600, textAlign: 'center' });
      s.fade(k, 0.75, { y: 10 });
      var t = s.text('display', 'От семи до десяти', { left: 160, top: 362, width: 1600, textAlign: 'center' });
      s.lines(t, 0.85, { dur: 1.2 });
      var sub = s.text('lead soft', 'Младший школьный возраст · 7–10 лет', { left: 160, top: 540, width: 1600, textAlign: 'center' });
      s.fade(sub, 1.5);
      s.mapZoom(M, 3.75);
      s.actor('baby', { x: s.X0 }, 3.85, 1.25, 'power3.inOut');
      s.brandIn(4.45);
      // шкала возраста — только здесь и там, где речь о возрасте (правка автора)
      s.actor('baby', { o: 0 }, 6.6, 0.4);
      s.rulerOut(6.4);
    }
  });

  // 0:15 — Когда дети идут в первый класс: ранец лежит в начале оси, Миша подхватывает его, надевает и идёт к полосе «Россия»
  var AGES = [['Англия', 5, 5, '5'], ['США', 6, 6, '6'], ['Германия', 6, 6, '6'], ['Россия', 6.5, 8, '6,5–8'], ['Финляндия', 7, 7, '7']];
  Film.scene({
    id: 'ages', bars: 3,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var h = s.text('h3', 'В разных странах в первый класс идут в разном возрасте — от 5 до 8 лет.', { left: 140, top: 130, width: 1640 });
      s.lines(h, 0.2);
      var X = function (a) { return 620 + (a - 4) * 270; }, Y0 = 330, DY = 112, AX = Y0 + DY * 4 + 70; // AX — ось возраста, по ней идёт Миша
      [4, 5, 6, 7, 8].forEach(function (a, i) {
        var tk = s.path(g, 'M' + X(a) + ' ' + (Y0 - 50) + ' V' + AX, { stroke: '#D9D0C4', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
        s.fade(tk, 0.4, { y: 0 });
        var lb = s.text('cite', a + (a < 5 ? ' года' : ' лет'), { left: X(a) - 60, top: AX + 16, width: 120, textAlign: 'center' });
        s.fade(lb, 0.5 + i * 0.05, { y: 6 });
      });
      AGES.forEach(function (r, i) {
        var y = Y0 + i * DY, at = 0.6 + i * 0.3, one = r[1] === r[2];
        var nm = s.text('lead', r[0], { left: 140, top: y - 28, fontSize: 34 });
        s.fade(nm, at, { y: 6 });
        var bar = s.node(g, 'rect', { x: one ? X(r[1]) - 14 : X(r[1]), y: y - 14, width: Math.max(28, X(r[2]) - X(r[1])), height: 28, rx: 14, fill: r[0] === 'Россия' ? K().TEAL : '#9FD6CF' });
        s.grow(bar, at + 0.15, { dur: 0.6 });
        var al = s.text('label', r[3], { left: one ? X(r[1]) - 60 : X(r[1]), top: y - 52, width: one ? 120 : 200, textAlign: one ? 'center' : 'left', fontSize: 24, color: 'var(--accent-deep)' });
        s.fade(al, at + 0.3, { y: 4 });
      });
      var axis = s.path(g, 'M' + (X(4) - 220) + ' ' + AX + ' H' + (X(8) + 40), { stroke: '#B3A898', 'stroke-width': 3 });
      s.draw(axis, 0.3, { dur: 0.8 });
      // ранец лежит в начале оси; Миша приходит слева, подхватывает его руками-точками и надевает
      var D = 70, MY = AX - D / 2, BX = X(4) - 120;
      var bp = s.node(ov, 'g', {});
      Film.toys.backpack(s, bp, BX, AX - 26, 0.62, '#26A69A', '#1C7A71');
      s.tween(bp, 0.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      K().cast(s, 'misha', BX + 190, MY, D, 1.0, { gx: -9, gy: 2, dur: 0.3 }); // приходит справа: ранец оказывается у него за спиной
      s.brow('baby', 'calm', 1.0, 0.01);
      K().walk(s, 'baby', BX + 50, 1.1, { step: 60, dur: 0.18, hold: 0.04 });
      s.gaze('baby', -8, 6, 1.9, 0.2);
      s.hands('baby', 'hold', 2.0, 0.25);
      // поднимает и закидывает за спину (ранец — слева, позади Миши, идущего вправо)
      s.tween(bp, 2.1, { x: 0, y: 0 }, { x: 14, y: -10, duration: 0.25, ease: 'power2.out' });
      s.tween(bp, 2.35, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      s.gear('baby', 'backpack', true, 2.4, 0.3);
      s.squash('baby', 1.08, 0.92, 2.6, 0.1); s.squash('baby', 1, 1, 2.7, 0.25, 'back.out(3)');
      s.hands('baby', 'off', 2.75, 0.25);
      s.gaze('baby', 9, 0, 2.8, 0.2);
      K().walk(s, 'baby', X(7.7), 2.95, { step: 90, dur: 0.18, hold: 0.05 }); // по оси — до места под полосой «Россия»
      s.gaze('baby', 2, -9, 5.0, 0.3);
      s.brow('baby', 'proud', 5.3, 0.3);
      s.actor('baby', { o: 0 }, 7.0, 0.35);
      s.brow('baby', 'calm', 7.35, 0.01);
      var src = s.text('cite', 'Eurydice; gov.uk; NCES; ФЗ «Об образовании в РФ», ст. 67', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 3.0, { y: 4 });
    }
  });

  // 0:22,5 — О чём этот возраст (Д. Б. Эльконин): тетрадный разворот — школа, от неё четыре строки-главы со значками
  var CHAPTERS = ['новое место — учитель и оценка', 'думать по правилам', 'помнить нарочно', 'видеть себя среди других'];
  // Значки строк (тонкая линия «Языка 7–10»); (x, y) — центр значка
  function icon(s, g, i, x, y) {
    var e = s.node(g, 'g', {});
    if (i === 0) { // учитель-капсула стоит у маленькой доски и показывает на неё указкой
      s.path(e, 'M' + (x - 74) + ' ' + (y + 40) + ' H' + (x + 44), { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.node(e, 'rect', { x: x - 72, y: y - 34, width: 46, height: 34, rx: 3, fill: '#3B5E54', stroke: INK, 'stroke-width': 2 });
      s.node(e, 'rect', { x: x - 4, y: y - 36, width: 34, height: 76, rx: 17, fill: '#4D6E8A' });
      [6, 20].forEach(function (dx) { s.node(e, 'circle', { cx: x + dx - 4, cy: y - 18, r: 3, fill: '#FFFDF8' }); });
      s.path(e, 'M' + (x + 3) + ' ' + (y - 8) + ' Q' + (x + 9) + ' ' + (y - 3) + ' ' + (x + 16) + ' ' + (y - 8), { stroke: '#FFFDF8', 'stroke-width': 2.4 });
      s.path(e, 'M' + (x - 6) + ' ' + (y + 2) + ' L' + (x - 40) + ' ' + (y - 16), { stroke: '#8B6A45', 'stroke-width': 3.5 });
    } else if (i === 1) { // ребёнок думает: облачко со схемой — лента и мерка, уложенная три раза
      Film.head(e, x - 44, y + 30, 14, '#E4735A', null, { gx: 4, gy: -4 });
      s.node(e, 'circle', { cx: x - 30, cy: y + 10, r: 3.5, fill: '#FFFDF8', stroke: INK, 'stroke-width': 1.8 });
      s.path(e, 'M' + (x - 30) + ' ' + (y + 2) + ' q-12 -24 12 -28 q6 -22 32 -14 q18 -14 36 4 q24 0 20 24 q8 18 -14 18 Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 2.4 });
      s.path(e, 'M' + (x - 18) + ' ' + (y - 10) + ' H' + (x + 50), { stroke: '#4F7CAC', 'stroke-width': 5 });
      s.path(e, 'M' + (x - 18) + ' ' + (y - 17) + ' H' + (x + 4), { stroke: '#8B6A45', 'stroke-width': 4 });
      [4, 27, 50].forEach(function (dx) { s.path(e, 'M' + (x + dx) + ' ' + (y - 20) + ' v18', { stroke: INK, 'stroke-width': 2.2 }); });
    } else if (i === 2) { // шёпот: ребёнок шепчет себе «мяч, дом…»
      Film.head(e, x - 26, y + 4, 26, '#E4735A', null, { mouth: 'soft', gx: 4 });
      var w = s.node(e, 'text', { x: x + 6, y: y + 12, fill: '#2E3B4E', style: 'font-family: var(--kid); font-size: 24px' });
      w.textContent = 'мяч, дом…';
    } else { // линии между детьми
      var pts = [[x - 34, y + 18], [x + 34, y + 18], [x, y - 24]];
      s.path(e, 'M' + pts[0].join(' ') + ' L' + pts[1].join(' ') + ' L' + pts[2].join(' ') + ' Z', { stroke: INK, 'stroke-width': 2, opacity: 0.6 });
      pts.forEach(function (q, j) { Film.head(e, q[0], q[1], 15, ['#E4735A', '#EC8A6F', '#D9654B'][j], null, {}); });
    }
    return e;
  }
  Film.scene({
    id: 'about', bars: 5,
    build: function (s) {
      var g = s.svg();
      var h = s.text('h3', 'В 7 лет ребёнок становится учеником — и это меняет всё:', { left: 140, top: 130, width: 1640 });
      s.lines(h, 0.2);
      // разворот тетради: две страницы, сгиб посередине
      var sp = s.node(g, 'g', {}), PY = 250, PH = 640;
      P().page(s, sp, 140, PY, 820, PH, { cell: 40, margin: false });
      P().page(s, sp, 960, PY, 820, PH, { cell: 40, margin: false });
      s.path(sp, 'M960 ' + PY + ' V' + (PY + PH), { stroke: '#B9B0A2', 'stroke-width': 3 });
      s.tween(sp, 0, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      // в центре левой страницы — школа на линейке
      var GY = 800, SCX = 590, SK = 0.78;
      var base = s.path(g, 'M220 ' + GY + ' H900', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      s.draw(base, 0.3, { dur: 0.5 });
      var sch = s.node(g, 'g', {});
      P().school(s, sch, SCX, GY, SK);
      s.tween(sch, 0.5, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      // Миша с ранцем приходит к школе
      K().cast(s, 'misha', 180, GY - 36, 72, 0.7, { gx: 9, gy: 0, dur: 0.3 });
      s.brow('baby', 'calm', 0.7, 0.01);
      K().walk(s, 'baby', SCX - 280 * SK - 92, 0.9, { step: 64, dur: 0.2, hold: 0.08 });
      s.gaze('baby', 9, -4, 2.2, 0.3);
      // четыре строки: от школы — линия к значку, рядом — название будущей главы
      var RY = [340, 480, 620, 760], AT = [3.6, 4.9, 6.2, 7.5];
      CHAPTERS.forEach(function (c, i) {
        var y = RY[i], at = AT[i];
        var x0 = SCX + 280 * SK + 30, ln = s.path(g, 'M' + x0 + ' ' + GY + ' C' + 930 + ' ' + GY + ' ' + 900 + ' ' + y + ' ' + 990 + ' ' + y, // от земли у школы — дорожки к строкам
           { stroke: INK, 'stroke-width': 2.4, opacity: 0.55 });
        s.draw(ln, at - 0.4, { dur: 0.5 });
        var ic = icon(s, g, i, 1080, y);
        s.tween(ic, at - 0.05, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
        var tx = s.text('lead', '<b class="acc">' + (i + 1) + '</b>  ' + c, { left: i === 2 ? 1250 : (i === 1 ? 1190 : 1150), top: y - 28, width: 620, fontSize: 36, lineHeight: 1.2 });
        s.lines(tx, at);
        s.gaze('baby', 9, i < 2 ? -6 : -2, at, 0.3);
        s.squash('baby', 1.04, 0.96, at + 0.1, 0.1); s.squash('baby', 1, 1, at + 0.2, 0.25, 'back.out(3)');
      });
      s.actor('baby', { o: 0 }, 12.0, 0.35);
      var src = s.text('cite', 'Д. Б. Эльконин: смена социальной ситуации развития запускает новый возраст', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 4.0, { y: 4 });
    }
  });
})();
