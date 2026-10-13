/* Глава 2. Думать по правилам · мышление: тот же стакан (Пиаже), куда поставить 150 (Опфер, Сиглер), закон Архимеда и брат (Выготский) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', WATER = '#9CC3D5', WATER_D = '#5E93AC', STICK = '#8B6A45';

  function kid(s, id, x, y, d, lt, acc, gx) {
    s.actor(id, { x: x, y: y, d: d, o: 0 }, 0, 0.01); s.actor(id, { o: 1 }, lt, 0.4);
    s.face(id, true, lt, 0.01); s.mouth(id, 'smile', lt, 0.01); s.gaze(id, gx || 0, -2, lt, 0.01);
    if (acc) s.acc(id, acc);
  }

  // 1:45 — заставка главы (24 такта = 60 с)
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      s.chapterCard(2, 'Думать по правилам', 'Как меняется мышление?');
      K().ruled(s, s.svg(), 336, 476, 1100, 476, { at: 0.5, dur: 0.9, width: 4 });
      s.chapter(2, 'Думать по правилам', 0.4, 59.4);
    }
  });

  // 1:47,5 — Тот же стакан: три года назад «в высоком!», теперь вопрос кажется глупым (Ж. Пиаже)
  Film.scene({
    id: 'glass', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var k = s.text('kicker', 'Ж. Пиаже · тот же опыт, что в 3–7', { left: 140, top: 130 });
      s.fade(k, 0.1, { y: 8 });
      // воспоминание: маленький Миша, «В высоком!»
      var mem = s.node(ov, 'g', {});
      s.node(mem, 'ellipse', { cx: 520, cy: 520, rx: 330, ry: 200, fill: '#FFFDF8', stroke: K().DEEP, 'stroke-width': 3, 'stroke-dasharray': '10 10' });
      s.node(mem, 'circle', { cx: 420, cy: 600, r: 34, fill: '#E4735A' });
      s.node(mem, 'circle', { cx: 410, cy: 592, r: 4, fill: '#FFFDF8' }); s.node(mem, 'circle', { cx: 430, cy: 592, r: 4, fill: '#FFFDF8' });
      s.path(mem, 'M408 610 Q420 620 432 610', { stroke: '#FFFDF8', 'stroke-width': 3.5 });
      s.path(mem, 'M540 640 V560 H600 V640 Z', { fill: 'none', stroke: INK, 'stroke-width': 3 });
      s.node(mem, 'rect', { x: 543, y: 600, width: 54, height: 40, fill: WATER });
      s.path(mem, 'M650 640 V470 H680 V640 Z', { fill: 'none', stroke: INK, 'stroke-width': 3 });
      s.node(mem, 'rect', { x: 653, y: 540, width: 24, height: 100, fill: WATER });
      s.tween(mem, 0.5, { opacity: 0, scale: 0.9, svgOrigin: '520 520' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
      var ago = s.otext('kidhand', 'Три года назад', { left: 330, top: 380, fontSize: 44, color: 'var(--accent-deep)' });
      s.fade(ago, 0.8, { y: 4 });
      var vb = s.div('bubble say tail-l', { left: 380, top: 470, fontSize: '30px' }, s.ov, 'В высоком!');
      s.pop(vb, 1.6, { from: 0.7, dur: 0.35, origin: '10% 100%' });
      s.out([mem, ago, vb], 4.2, { dur: 0.5 });
      // сейчас: учитель переливает воду, трое одноклассников отвечают устало
      var BASE = 820;
      var A = K().glass(s, g, 420, BASE, 110, 170, 110), C = K().glass(s, g, 780, BASE, 56, 330, 0);
      function TR(p, a) { return 'translate(' + p[0] + ' ' + p[1] + ') rotate(' + a + ')'; }
      var LIP0 = [655, 650], LIP1 = [767, 335], WTOP = BASE - 110;
      var defs = s.node(g, 'defs', {}), clip = s.node(defs, 'clipPath', { id: 'pour-7', clipPathUnits: 'userSpaceOnUse' });
      var cr = s.node(clip, 'rect', { x: -108, y: 0, width: 106, height: 168, transform: TR(LIP0, 0) });
      var wB = s.node(g, 'rect', { x: 300, y: WTOP, width: 900, height: 700, fill: WATER, 'clip-path': 'url(#pour-7)' });
      var gB = s.node(g, 'g', { transform: TR(LIP0, 0) });
      s.path(gB, 'M-110 0 V170 H0 V0', { stroke: INK, 'stroke-width': 3.5 });
      function moveB(t, p0, a0, p1, a1, dur, ease) {
        [cr, gB].forEach(function (e) { s.tween(e, t, { attr: { transform: TR(p0, a0) } }, { attr: { transform: TR(p1, a1) }, duration: dur, ease: ease }); });
      }
      s.tween([A.g, C.g], 4.4, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 });
      s.tween([gB, wB], 4.5, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      kid(s, 'adult2', 180, 640, 140, 4.4, 'glasses', 8);
      K().tag(s, 'учитель', 180, 730, 4.8, 7.0);
      var T0 = 5.4, dy = LIP1[1] - LIP0[1];
      moveB(T0, LIP0, 0, LIP1, 0, 0.6, 'power2.inOut');
      s.tween(wB, T0, { attr: { y: WTOP } }, { attr: { y: WTOP + dy }, duration: 0.6, ease: 'power2.inOut' });
      moveB(T0 + 0.6, LIP1, 0, LIP1, 48, 0.7, 'power1.in');
      s.tween(wB, T0 + 0.6, { attr: { y: WTOP + dy } }, { attr: { y: LIP1[1] }, duration: 0.7, ease: 'power1.in' });
      moveB(T0 + 1.3, LIP1, 48, LIP1, 95, 1.0, 'sine.inOut');
      s.set(wB, T0 + 2.3, { attr: { y: LIP1[1] } }, { attr: { y: 2000 } });
      K().setLevel(s, C, T0 + 1.3, 0, 234, 0.9, 'sine.inOut');
      var stream = s.node(g, 'rect', { x: LIP1[0] - 3, y: LIP1[1] + 2, width: 7, height: 0, rx: 3.5, fill: WATER_D, opacity: 0 });
      s.tween(stream, T0 + 1.3, { opacity: 0 }, { opacity: 0.9, duration: 0.08 });
      s.tween(stream, T0 + 1.3, { attr: { height: 0 } }, { attr: { height: BASE - LIP1[1] - 2 }, duration: 0.12, ease: 'power2.in' });
      s.tween(stream, T0 + 1.42, { attr: { height: BASE - LIP1[1] - 2 } }, { attr: { height: BASE - 234 - LIP1[1] - 2 }, duration: 0.78, ease: 'sine.inOut' });
      s.tween(stream, T0 + 2.15, { opacity: 0.9 }, { opacity: 0, duration: 0.15 });
      moveB(T0 + 2.4, LIP1, 95, LIP1, 0, 0.4, 'power2.inOut');
      moveB(T0 + 2.8, LIP1, 0, LIP0, 0, 0.5, 'power2.inOut');
      K().say(s, 'А теперь где больше?', 120, 470, 8.2, 12.0);
      kid(s, 'baby', 1280, 820, 104, 4.6, 'hero', -9);
      kid(s, 'kid4', 1520, 820, 100, 4.7, 'cap', -9);
      K().tag(s, 'Миша', 1280, 900, 5.0, 8.0); K().tag(s, 'Дима', 1520, 900, 5.0, 8.0);
      ['baby', 'kid4'].forEach(function (id, i) { s.mouth(id, 'flat', 9.2 + i * 1.4, 0.2); s.gaze(id, 0, -9, 9.2 + i * 1.4, 0.3); }); // закатили глаза
      K().say(s, 'Та же вода!', 1220, 650, 9.6);
      K().say(s, 'Он выше, зато уже.', 1430, 540, 11.0);
      var t1 = s.text('h3', 'Правило в уме: не добавили, не убавили — значит, столько же.', { left: 140, top: 180, width: 1640, fontSize: 46 });
      s.lines(t1, 12.8);
      var t2 = s.text('lead', 'Пиаже: это <b class="acc">конкретные операции</b> — логика, пока перед глазами вещи.', { left: 140, top: 300, width: 1640, fontSize: 36 });
      s.lines(t2, 15.4);
      var src = s.text('cite', 'concrete operations · Ж. Пиаже, Б. Инельдер, 1966: тождество, обратимость, компенсация · реплики — постановка', { left: 140, top: 1010, fontSize: 20 });
      s.fade(src, 16.6, { y: 4 });
      ['baby', 'kid4', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, 19.5, 0.4); });
    }
  });

  // 2:07,5 — Куда поставить 150? Миша идёт по числовой прямой с флажком (Дж. Опфер, Р. Сиглер, 2007)
  Film.scene({
    id: 'line', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over(), X0 = 260, X1 = 1660, Y = 700, L = X1 - X0;
      var t1 = s.hud('lead', 'Второклассникам дают пустую линию от 0 до 1000.', { left: 140, top: 130, width: 1640, fontSize: 38 });
      s.tween(t1, 0.3, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      var q = s.hud('h2', 'Куда поставить 150?', { left: 140, top: 200 });
      s.tween(q, 1.6, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      K().ruled(s, g, X0, Y, X1, Y, { at: 0.5, dur: 1.0, width: 6 });
      [[X0, '0'], [X1, '1000']].forEach(function (p, i) {
        K().ruled(s, g, p[0], Y - 24, p[0], Y + 24, { at: 1.3 + i * 0.1, dur: 0.2, width: 6 });
        var lb = s.text('lead', p[1], { left: p[0] - 60, top: Y + 40, width: 120, textAlign: 'center' });
        s.fade(lb, 1.4 + i * 0.1, { y: 6 });
      });
      s.freeze(2.6, 2.2);
      var gu = s.hud('small-caps', 'Угадайте', { left: 140, top: 300 });
      s.tween(gu, 2.7, { opacity: 0 }, { opacity: 1, duration: 0.2 }); s.tween(gu, 4.6, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // Миша с флажком идёт по дорожке; кадр едет рядом
      var MX = X0 + L * 0.47;
      s.actor('baby', { x: X0, y: Y - 70, d: 90, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 5.0, 0.3);
      s.face('baby', true, 5.0, 0.01); s.mouth('baby', 'smile', 5.0, 0.01); s.gaze('baby', 9, 0, 5.0, 0.01); s.acc('baby', 'hero');
      var flag = s.node(ov, 'g', {});
      s.path(flag, 'M0 0 V-90', { stroke: STICK, 'stroke-width': 7 });
      s.path(flag, 'M0 -90 L44 -76 L0 -62 Z', { fill: '#26A69A', stroke: INK, 'stroke-width': 2.5 });
      s.set(flag, 0, { x: X0 + 40, y: Y - 40, opacity: 0 }, { x: X0 + 40, y: Y - 40, opacity: 0 });
      s.tween(flag, 5.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.out([t1, q], 4.9, { dur: 0.3 });
      s.cam({ cx: X0 + 200, cy: Y - 120, z: 1.5 }, 5.0, 0.8, 'power2.inOut');
      s.actor('baby', { x: MX - 40 }, 5.6, 2.2, 'sine.inOut');
      s.tween(flag, 5.6, { x: X0 + 40 }, { x: MX, duration: 2.2, ease: 'sine.inOut' });
      for (var b = 0; b < 6; b++) { s.squash('baby', 1.04, 0.96, 5.7 + b * 0.36, 0.08); s.squash('baby', 1, 1, 5.78 + b * 0.36, 0.2); }
      s.cam({ cx: MX - 100, cy: Y - 120, z: 1.5 }, 5.6, 2.2, 'sine.inOut');
      s.tween(flag, 7.9, { y: Y - 40 }, { y: Y, duration: 0.25, ease: 'power3.in' }); // воткнул
      var me = s.text('kidhand', '150 — тут!', { left: MX - 60, top: Y - 230, fontSize: 40 });
      s.fade(me, 8.1, { y: 6 });
      s.cam({ cx: 960, cy: 540, z: 1 }, 8.8, 0.9, 'power2.inOut');
      var RX = X0 + L * 0.15, rf = s.node(ov, 'g', {});
      s.path(rf, 'M' + RX + ' ' + Y + ' V' + (Y - 90), { stroke: '#8A8F90', 'stroke-width': 6 });
      s.path(rf, 'M' + RX + ' ' + (Y - 90) + ' l40 14 l-40 14 Z', { fill: K().RED, stroke: INK, 'stroke-width': 2.5 });
      s.tween(rf, 9.8, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.in' });
      var rt = s.text('cursive red', 'на самом деле 150 — здесь', { left: RX - 60, top: Y + 40, fontSize: 40 });
      s.fade(rt, 10.0, { y: 6 });
      var t2 = s.hud('lead', 'Для второклассника 100 — уже огромное число. Поэтому 150 у него оказывается почти посередине.', { left: 140, top: 130, width: 1640, fontSize: 38 });
      s.tween(t2, 10.4, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
      s.tween(t2, 14.6, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      // два года спустя — ставит верно
      var sw = K().flip(s, 14.6);
      [flag, me].forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      s.actor('baby', { x: RX - 60, d: 104 }, sw, 0.01);
      var f4 = s.text('kidhand', 'Через два года, в 4 классе', { left: 140, top: 140, fontSize: 56, color: 'var(--accent-deep)' });
      s.tween(f4, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      var ck = s.path(ov, 'M' + (RX + 30) + ' ' + (Y - 120) + ' l14 16 l28 -32', { stroke: '#26A69A', 'stroke-width': 7 });
      s.draw(ck, 15.6, { dur: 0.25 });
      s.mouth('baby', 'smile', 15.4, 0.2);
      var src = s.hud('cite', 'Так ставят 91 % второклассников и 3 % взрослых (Р. Сиглер, Дж. Опфер, 2003). Объясняют это по-разному (Х. Барт, А. Паладино, 2011).', { left: 140, top: 1010, fontSize: 20 });
      s.tween(src, 11.0, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      s.tween([src, f4], 17.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.actor('baby', { o: 0 }, 17.0, 0.4);
    }
  });

  // 2:25 — Закон Архимеда и брат (Л. С. Выготский, 1934, т. 2 СС, с. 200)
  Film.scene({
    id: 'archimedes', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var t0 = s.text('h3', 'Выготский заметил странное.', { left: 140, top: 130, width: 1600, fontSize: 46 });
      s.lines(t0, 0.3);
      var school = s.node(g, 'g', {});
      K().board(s, school, 860, 330, 580, 360, { at: 0.2 });
      kid(s, 'adult2', 640, 700, 150, 0.4, 'glasses', 8);
      K().say(s, 'Что такое закон Архимеда?', 420, 500, 1.4, 6.8);
      kid(s, 'baby', 1720, 760, 104, 0.6, 'hero', -8);
      K().tag(s, 'учитель', 640, 790, 0.8, 3.4); K().tag(s, 'Миша', 1720, 840, 0.8, 3.4);
      s.hop('baby', 1720, 760, 3.0, 0.36, 30);
      var ans = K().say(s, 'Тело в воде выталкивается вверх!', 1460, 500, 3.4, 6.8, 'r');
      ans.style.whiteSpace = 'normal'; ans.style.width = '340px';
      var boat = s.path(school, 'M1000 560 L1300 560 L1255 620 L1045 620 Z M1045 560 L1160 470 L1160 560', { stroke: '#F3EFE4', 'stroke-width': 4 });
      s.draw(boat, 3.8, { dur: 0.8 });
      var wv = s.path(school, 'M900 640 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0', { stroke: '#9CC3D5', 'stroke-width': 4 });
      s.draw(wv, 4.4, { dur: 0.6 });
      var arr = s.path(school, 'M1150 680 V600 M1130 622 L1150 600 L1170 622', { stroke: '#F3EFE4', 'stroke-width': 4 });
      s.draw(arr, 4.9, { dur: 0.4 });
      s.squash('adult2', 1, 0.92, 5.6, 0.15); s.squash('adult2', 1, 1, 5.75, 0.25); // учитель кивает
      // вечером дома
      var sw = K().flip(s, 7.0);
      [school, t0].forEach(function (e) { s.set(e, sw, { opacity: 1 }, { opacity: 0 }); });
      s.actor('adult2', { o: 0 }, sw, 0.01);
      var home = s.node(g, 'g', { opacity: 0 });
      s.set(home, sw, { opacity: 0 }, { opacity: 1 });
      K().kitchen(s, home, 960, 1000);
      var ev = s.text('kidhand', 'Вечером дома', { left: 140, top: 130, fontSize: 56, color: 'var(--accent-deep)' });
      s.tween(ev, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.actor('baby', { x: 960, y: 780, d: 100 }, sw, 0.01); s.gaze('baby', 9, -2, sw, 0.01);
      kid(s, 'adult', 1280, 760, 150, sw, 'bun', -8);
      kid(s, 'kid3', 680, 800, 64, sw, null, 8);
      K().tag(s, 'мама', 1500, 750, sw + 0.3, sw + 3); K().tag(s, 'брат Петя', 680, 700, sw + 0.3, sw + 3);
      var spoon = s.path(ov, 'M712 760 L742 720', { stroke: '#8A8F90', 'stroke-width': 6 });
      s.tween(spoon, sw, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      K().say(s, 'А что такое брат?', 1000, 560, 8.4, 11.0, 'r');
      s.mouth('baby', 'flat', 9.8, 0.2); s.gaze('baby', 0, -9, 9.8, 0.3); // думает
      s.gaze('baby', -9, 3, 10.8, 0.25); s.mouth('baby', 'smile', 10.8, 0.2);
      K().say(s, 'Брат — это Петя!', 760, 560, 11.1, 14.0);
      s.hop('kid3', 680, 800, 11.8, 0.36, 26); s.tween(spoon, 11.8, { rotation: 0, svgOrigin: '712 760' }, { rotation: -30, duration: 0.18, repeat: 3, yoyo: true });
      s.squash('adult', 1.05, 0.95, 12.0, 0.15); s.squash('adult', 1, 1, 12.15, 0.3, 'back.out(3)'); // мама смеётся
      var t2 = s.text('h3', 'Научное понятие ребёнок знает по определению. Житейское — из жизни, и определить его труднее.', { left: 140, top: 230, width: 1060, fontSize: 42 });
      s.lines(t2, 13.4);
      var src = s.text('cite', '«Ребёнок лучше формулирует, что такое закон Архимеда, чем что такое брат» · Л. С. Выготский, 1934 · научные понятия · scientific concepts · реплики — постановка', { left: 140, top: 1020, fontSize: 18 });
      s.fade(src, 15.0, { y: 4 });
      ['baby', 'adult', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, 19.5, 0.4); });
      s.out(spoon, 19.5, { dur: 0.4 });
    }
  });
})();
