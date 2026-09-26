/* Часть 3. Мир вещей · 8–12 мес, итог и финал */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733';

  function cup(s, g, cx, base) { // колпачок-«чашка», стоящий на линии base
    return s.path(g, 'M' + (cx - 58) + ' ' + base + ' L' + (cx - 46) + ' ' + (base - 84) + ' Q' + (cx - 44) + ' ' + (base - 94) + ' ' + (cx - 32) + ' ' + (base - 94) +
      ' L' + (cx + 32) + ' ' + (base - 94) + ' Q' + (cx + 44) + ' ' + (base - 94) + ' ' + (cx + 46) + ' ' + (base - 84) + ' L' + (cx + 58) + ' ' + base + ' Z',
      { fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
  }

  // 2:07,5 — заставка части
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      Film.chapterCard(s, 3, 'Мир вещей', '8–12 месяцев');
      s.range(8, 12, 0.15, 1.3);
      s.chapter(3, 'Мир вещей', 0.4, 52.5);
    }
  });

  // 2:10 — Постоянство объекта (Пиаже)
  Film.scene({
    id: 'objperm', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Ж. Пиаже', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Постоянство объекта', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var ka = s.text('small-caps', 'До ~8 месяцев', { left: 140, top: 332, color: '#2E7D32' });
      s.fade(ka, 0.8, { y: 6 });
      var ta = s.text('lead', 'Игрушку накрыли — её будто больше нет.', { left: 140, top: 368, width: 940, fontSize: 36 });
      s.lines(ta, 0.9);
      var kb = s.text('small-caps', '8–12 месяцев', { left: 140, top: 566, color: '#2E7D32' });
      s.fade(kb, 3.8, { y: 6 });
      var tb = s.text('lead', 'Ищет спрятанное — но там, где находил раньше.', { left: 140, top: 602, width: 940, fontSize: 36 });
      s.lines(tb, 3.9);
      var err = s.div('chip', { left: 140, top: 734, height: 54, fontSize: 26 }, null, 'Ошибка «А, но не Б»');
      err.style.borderColor = '#E4735A'; err.style.color = '#B8533D';
      s.pop(err, 7.5, { from: 0.85, dur: 0.6 });
      var nt = s.text('note', 'Р. Байярджон: методом нарушения ожидания признаки понимания видны уже в 3,5–4,5 мес.', { left: 140, top: 842, width: 1640 });
      s.fade(nt, 9.0, { y: 6 });

      var g = s.svg();
      // ── А: игрушку накрыли ──
      var toyA = s.node(g, 'rect', { x: 1228, y: 418, width: 44, height: 44, rx: 9, fill: '#E0A930' });
      s.pop(toyA, 1.1, { from: 0.5 });
      var cA = cup(s, g, 1250, 470);
      s.tween(cA, 0, { y: -150, opacity: 0 }, { y: -150, opacity: 0, duration: 0.001 });
      s.tween(cA, 1.6, { y: -150, opacity: 0 }, { y: -150, opacity: 1, duration: 0.3 });
      s.tween(cA, 1.9, { y: -150 }, { y: 0, duration: 0.6, ease: 'power3.in' });
      var kidA = s.node(g, 'circle', { cx: 1560, cy: 430, r: 32, fill: '#E4735A', stroke: '#FAF7F0', 'stroke-width': 6 });
      s.pop(kidA, 1.0, { from: 0.5 });
      var gzA = s.path(g, 'M1522 434 L1300 440', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(gzA, 1.2, { dur: 0.6 });
      s.out(gzA, 2.7, { dur: 0.5 });
      s.tween(kidA, 2.8, { x: 0 }, { x: 60, duration: 0.8, ease: 'power2.inOut' });
      var la = s.text('note', 'поиска нет', { left: 1540, top: 486, width: 200, textAlign: 'center' });
      s.fade(la, 3.1, { y: 6 });

      // ── Б: ошибка «А, но не Б» ──
      var base = 772;
      var cupA = cup(s, g, 1230, base), cupB = cup(s, g, 1430, base);
      var lA = s.text('h3', 'А', { left: 1200, top: base + 10, width: 60, textAlign: 'center', fontSize: 38 });
      var lB = s.text('h3', 'Б', { left: 1400, top: base + 10, width: 60, textAlign: 'center', fontSize: 38 });
      s.fade([cupA, cupB], 4.2, { stagger: 0.15, y: 14 });
      s.fade([lA, lB], 4.4, { y: 6, stagger: 0.15 });
      var toyB = s.node(g, 'rect', { x: 1208, y: base - 44, width: 44, height: 44, rx: 9, fill: '#E0A930', opacity: 0 });
      g.insertBefore(toyB, cupA);
      // игрушку прячут под А
      s.tween(cupA, 4.8, { y: 0 }, { y: -110, duration: 0.45, ease: 'power2.out' });
      s.tween(toyB, 4.8, { opacity: 0, y: -60 }, { opacity: 1, y: -60, duration: 0.2 });
      s.tween(toyB, 5.05, { y: -60 }, { y: 0, duration: 0.4, ease: 'power2.in' });
      s.tween(cupA, 5.5, { y: -110 }, { y: 0, duration: 0.45, ease: 'power2.in' });
      // на глазах у ребёнка перекладывают под Б
      s.tween(cupA, 6.1, { y: 0 }, { y: -110, duration: 0.4, ease: 'power2.out' });
      s.tween(cupB, 6.1, { y: 0 }, { y: -110, duration: 0.4, ease: 'power2.out' });
      s.tween(toyB, 6.45, { x: 0 }, { x: 200, duration: 0.6, ease: 'power2.inOut' });
      s.tween(cupA, 7.05, { y: -110 }, { y: 0, duration: 0.4, ease: 'power2.in' });
      s.tween(cupB, 7.05, { y: -110 }, { y: 0, duration: 0.4, ease: 'power2.in' });
      var kidB = s.node(g, 'circle', { cx: 1660, cy: 700, r: 32, fill: '#E4735A', stroke: '#FAF7F0', 'stroke-width': 6 });
      s.pop(kidB, 4.3, { from: 0.5 });
      var reach = s.path(g, 'M1622 690 C1520 600 1330 590 1262 662', { stroke: '#E4735A', 'stroke-width': 3.5, 'stroke-dasharray': '3 10' });
      s.dash(reach, 7.4, { dur: 0.8 });
      var head = s.path(g, 'M1262 640 L1258 666 L1283 660', { stroke: '#E4735A', 'stroke-width': 3.5 });
      s.fade(head, 8.1, { y: 0, dur: 0.3 });
    }
  });

  // 2:22,5 — Совместное внимание (~9 мес)
  Film.scene({
    id: 'joint', bars: 5,
    build: function (s) {
      s.age(9, 0.2, 1.2);
      s.event('~9 мес', 9, 0.6);
      s.actor('baby', { x: 1250, y: 660, d: 120, o: 1 }, 0.2, 1.3);
      s.actor('adult', { x: 1680, y: 650, d: 170, o: 1 }, 0.4, 1.1);
      s.face('baby', true, 1.0, 0.4); s.mouth('baby', 'smile', 1.0, 0.01); s.gaze('baby', 7, 0, 1.0, 0.01);
      s.face('adult', true, 1.0, 0.4); s.mouth('adult', 'smile', 1.0, 0.01); s.gaze('adult', -7, 0, 1.0, 0.01);
      s.actor('obj', { x: 1466, y: 330, d: 30, o: 0 }, 2.0, 0.01);
      s.actor('obj', { d: 74, o: 1 }, 2.1, 0.7, 'power3.out');
      s.tween(s.A.obj.el, 2.1, { rotation: -20 }, { rotation: 8, duration: 0.9, ease: 'power3.out' });

      var k = s.text('kicker', '~9 месяцев', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Совместное внимание', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Ребёнок и взрослый смотрят на один предмет — и знают, что смотрят <span class="acc">вместе</span>.', { left: 140, top: 330, width: 800 });
      s.lines(ld, 1.1);
      var bd = s.text('lead', 'Появляется указательный жест. Общение становится ситуативно-деловым (М. И. Лисина).', { left: 140, top: 540, width: 800, fontSize: 34, color: '#3C4852' });
      s.lines(bd, 5.8);
      var nt = s.text('note', '«Революция девяти месяцев» — М. Томаселло', { left: 140, top: 730, width: 800 });
      s.fade(nt, 7.0, { y: 6 });

      var g = s.svg();
      var tri = s.node(g, 'polygon', { points: '1250,660 1680,650 1466,330', fill: '#E5EFE6', opacity: 0 });
      var dy = s.path(g, 'M1318 658 L1596 652', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(dy, 1.4, { dur: 0.7 });
      s.gaze('adult', -5, -6, 3.0, 0.5);
      var ga = s.path(g, 'M1628 588 L1500 368', { stroke: '#385771', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(ga, 3.0, { dur: 0.7 });
      s.gaze('baby', 5, -7, 3.6, 0.5);
      var gb = s.path(g, 'M1286 604 L1434 368', { stroke: '#E4735A', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(gb, 3.6, { dur: 0.7 });
      s.tween(tri, 4.4, { opacity: 0 }, { opacity: 0.85, duration: 1.0, ease: 'power2.inOut' });
      var dy2 = s.path(g, 'M1318 658 L1596 652', { stroke: '#2E7D32', 'stroke-width': 3.5 });
      s.draw(dy2, 4.5, { dur: 0.8 });
      // указательный жест
      var pt = s.path(g, 'M1286 604 L1424 384', { stroke: '#B8533D', 'stroke-width': 4.5 });
      var ph = s.path(g, 'M1402 398 L1424 384 L1421 410', { stroke: '#B8533D', 'stroke-width': 4.5 });
      s.draw(pt, 6.2, { dur: 0.5 }); s.fade(ph, 6.65, { y: 0, dur: 0.3 });
      var pl = s.text('note', 'указательный жест', { left: 1060, top: 474, width: 270, textAlign: 'right', color: '#B8533D', fontWeight: 650 });
      s.fade(pl, 6.6, { y: 6 });

      s.actor('obj', { o: 0, d: 40 }, 11.3, 0.7, 'power2.in');
      s.actor('adult', { o: 0, d: 120 }, 11.3, 0.8, 'power2.in');
      s.face('baby', false, 11.2, 0.3);
      s.rest(11.2, 1.2);
    }
  });

  // 2:32,5 — Кризис одного года
  Film.scene({
    id: 'crisis', bars: 5,
    build: function (s) {
      // первые шаги: три «шажка» по шкале 9 → 12
      s.age(12, 0.3, 1.8, 3);
      for (var i = 0; i < 3; i++) {
        var a = s.mx(9 + i), b = s.mx(10 + i), t = 0.3 + i * 0.6;
        s.actor('baby', { x: (a + b) / 2, y: s.RY - 22 }, t, 0.3, 'power2.out');
        s.actor('baby', { x: b, y: s.RY }, t + 0.3, 0.3, 'power2.in');
      }
      s.event('~12 мес', 12, 1.4);

      var k = s.text('kicker', '~12 месяцев', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Кризис одного года', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var cards = [
        { x: 140, title: 'Ходьба', body: 'Мир становится досягаемым.', note: 'норма ВОЗ: 8–18 мес', icon: 'feet' },
        { x: 700, title: 'Автономная речь', body: 'Первые «свои» слова, понятные близким.', note: 'Л. С. Выготский', icon: 'speech' },
        { x: 1260, title: 'Протест', body: 'Бурные реакции на запреты — первые проявления воли.', note: 'гипобулические реакции (Л. С. Выготский)', icon: 'bolt' }
      ];
      cards.forEach(function (c, i) {
        var t = 1.6 + i * 1.7;
        var card = s.div('card', { left: c.x, top: 318, width: 520, height: 470 });
        s.fade(card, t, { y: 24 });
        var ic = s.svg({ left: c.x + 44, top: 356, width: 80, height: 80 });
        if (c.icon === 'feet') {
          s.node(ic, 'ellipse', { cx: 26, cy: 48, rx: 12, ry: 20, fill: '#E4735A' });
          s.node(ic, 'ellipse', { cx: 56, cy: 34, rx: 12, ry: 20, fill: '#E4735A' });
          [[18, 22], [26, 19], [34, 22]].forEach(function (p) { s.node(ic, 'circle', { cx: p[0], cy: p[1], r: 3.6, fill: '#E4735A' }); });
          [[48, 8], [56, 5], [64, 8]].forEach(function (p) { s.node(ic, 'circle', { cx: p[0], cy: p[1], r: 3.6, fill: '#E4735A' }); });
        } else if (c.icon === 'speech') {
          s.path(ic, 'M10 14 H70 Q76 14 76 20 V50 Q76 56 70 56 H34 L20 70 V56 H10 Q4 56 4 50 V20 Q4 14 10 14 Z', { fill: '#DFE9F1', stroke: '#385771', 'stroke-width': 3.5 });
          [24, 40, 56].forEach(function (x) { s.node(ic, 'circle', { cx: x, cy: 35, r: 4.5, fill: '#385771' }); });
        } else {
          s.path(ic, 'M44 4 L18 44 H38 L30 76 L62 30 H42 L52 4 Z', { fill: '#F5E7BD', stroke: '#B8533D', 'stroke-width': 3.5 });
        }
        s.pop(ic, t + 0.2, { from: 0.6, dur: 0.6 });
        var ti = s.text('h3', c.title, { left: c.x + 44, top: 460, width: 440 });
        s.lines(ti, t + 0.3);
        var bo = s.text('body', c.body, { left: c.x + 44, top: 530, width: 440 });
        s.lines(bo, t + 0.55);
        var no = s.text('note', c.note, { left: c.x + 44, top: 700, width: 440, fontSize: 23 });
        s.fade(no, t + 0.9, { y: 6 });
      });
    }
  });

  // 2:45 — Что запомнить
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var items = [
        'Младенец — <span class="acc">«максимально социальное существо»</span> (Л. С. Выготский).',
        'Ведущая деятельность — <span class="acc">непосредственно-эмоциональное общение</span> со взрослым.',
        'К ~8 мес складывается <span class="acc">привязанность</span> — основа базового доверия к миру (Э. Эриксон).',
        'К году — <span class="acc">совместное внимание</span>, первые шаги и слова.'
      ];
      items.forEach(function (tx, i) {
        var y = [326, 440, 556, 710][i], t = 0.8 + i * 1.8;
        var b = s.div('num-badge', { left: 140, top: y }, null, String(i + 1));
        s.pop(b, t, { from: 0.7, dur: 0.6 });
        var e = s.text('lead', tx, { left: 222, top: y + 3, width: 1520, fontSize: 36 });
        s.lines(e, t + 0.1);
      });
    }
  });

  // 2:57,5 — Финал: цитата из лекции курса, бренд
  Film.scene({
    id: 'outro', bars: 4,
    build: function (s) {
      s.actor('baby', { x: 918, y: 232, d: 58, o: 1 }, 0.3, 1.6);
      s.actor('adult', { x: 1000, y: 222, d: 84, o: 1 }, 0.5, 1.4);
      s.face('adult', false, 0.0, 0.01);
      var q = s.text('quote', '«Человек не картошка… Ему очень важно слышать голос, чтобы его гладили — в широком смысле, чтобы его любили».', { left: 260, top: 318, width: 1400, textAlign: 'center' });
      s.lines(q, 0.8, { stagger: 0.14, dur: 1.2 });
      var c = s.text('cite', 'из лекции «Психология младенчества»', { left: 460, top: 574, width: 1000, textAlign: 'center' });
      s.fade(c, 2.6, { y: 6 });

      s.rulerOut(3.6);
      s.brandOut(3.6);
      var lock = s.div(null, { left: 0, top: 684, width: 1920, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '22px' });
      var psi = s.div(null, { position: 'static', width: 68, height: 68, borderRadius: 19, background: '#2E7D32', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DOMSans', fontWeight: 700, fontSize: 42 }, lock, 'Ψ');
      var nm = s.div(null, { position: 'static', fontFamily: 'DOMSans', fontWeight: 700, fontSize: 44, color: '#1D2733', letterSpacing: '0.01em' }, lock, 'DOM Academy');
      s.fade(lock, 4.6, { y: 10, dur: 1.0 });
      var sub = s.text('small-caps', 'Психология развития', { left: 0, top: 778, width: 1920, textAlign: 'center', fontSize: 21 });
      s.fade(sub, 5.0, { y: 6 });
      var nx = s.text('note', 'Далее: ранний возраст, 1–3 года', { left: 0, top: 836, width: 1920, textAlign: 'center', fontSize: 25 });
      s.fade(nx, 5.6, { y: 6 });

      s.actor('baby', { o: 0 }, 8.7, 0.8, 'power2.in');
      s.actor('adult', { o: 0 }, 8.7, 0.8, 'power2.in');
    }
  });
})();
