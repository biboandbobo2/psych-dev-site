/* Часть 3. Я сам · 2–3 года, итог и финал */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ACC = '#5C6BC0', MUTE = '#8A8F90';

  // 1:37,5 — заставка части
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.chapterCard(3, 'Я сам', '2–3 года');
      s.range(24, 36, 0.15, 1.3);
      s.age(24, 0.2, 1.3, 2);
      Film.walk(s, 18, 24, 0.2);
      s.chapter(3, 'Я сам', 0.4, 55);
    }
  });

  // 1:40 — Узнавание себя в зеркале
  Film.scene({
    id: 'mirror', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Б. Амстердам, 1972 · М. Льюис, Дж. Брукс-Ганн, 1979', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Кто в зеркале?', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Ребёнку незаметно ставят пятнышко на нос и подводят к зеркалу.', { left: 140, top: 330, width: 800 });
      s.lines(ld, 1.0);
      var k1 = s.text('small-caps', 'До ~1,5 года', { left: 140, top: 512 });
      s.fade(k1, 3.9, { y: 6 });
      var b1 = s.text('body', 'Тянется к пятну в зеркале.', { left: 140, top: 546, width: 800 });
      s.lines(b1, 4.0);
      var k2 = s.text('small-caps', 'К 1,5–2 годам', { left: 140, top: 626, color: ACC });
      s.fade(k2, 6.4, { y: 6 });
      var b2 = s.text('body', 'Трогает свой нос: <span class="acc">узнаёт себя</span>.', { left: 140, top: 660, width: 800 });
      s.lines(b2, 6.5);
      var nt = s.text('note', 'Вслед за этим появляются гордость, смущение, стыд — эмоции, в которых есть «я».', { left: 140, top: 760, width: 820 });
      s.lines(nt, 9.2, { stagger: 0.08 });

      var g = s.svg();
      // зеркало
      var MX = 1430, MY = 420, MW = 290, MH = 380;
      var defs = s.node(g, 'defs', {});
      var cp = s.node(defs, 'clipPath', { id: 'clip-mirror' });
      s.node(cp, 'rect', { x: MX + 8, y: MY + 8, width: MW - 16, height: MH - 16, rx: 22 });
      var frame = s.node(g, 'rect', { x: MX, y: MY, width: MW, height: MH, rx: 30, fill: '#E9EDF6', stroke: INK, 'stroke-width': 3 });
      var glass = s.node(g, 'g', { 'clip-path': 'url(#clip-mirror)' });
      var shine = s.path(glass, 'M' + (MX + 30) + ' ' + (MY + 150) + ' L' + (MX + 150) + ' ' + (MY + 30) + ' M' + (MX + 40) + ' ' + (MY + 230) + ' L' + (MX + 230) + ' ' + (MY + 40), { stroke: '#FFFFFF', 'stroke-width': 10, opacity: 0.8 });
      s.fade([frame, shine], 1.4, { y: 12 });
      var ml = s.text('note', 'зеркало', { left: MX, top: MY + MH + 10, width: MW, textAlign: 'center' });
      s.fade(ml, 1.8, { y: 6 });

      // ребёнок и его отражение
      var CY = 640;
      s.actor('baby', { x: 1180, y: CY, d: 130, o: 1 }, 1.2, 1.3);
      s.face('baby', true, 2.1, 0.4); s.mouth('baby', 'soft', 2.1, 0.01); s.gaze('baby', 8, 0, 2.1, 0.01);
      var dot = s.node(s.A.baby.face.g, 'circle', { cx: 50, cy: 55, r: 6.2, fill: '#9E1830', opacity: 0 });
      s.tween(dot, 2.9, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      var RX = MX + MW / 2 + 10;
      var refl = s.node(glass, 'g', { opacity: 0 });
      s.node(refl, 'circle', { cx: RX, cy: CY, r: 65, fill: '#E4735A' });
      s.node(refl, 'circle', { cx: RX - 26, cy: CY - 6.5, r: 6, fill: '#FFFDF8' });
      s.node(refl, 'circle', { cx: RX + 5, cy: CY - 6.5, r: 6, fill: '#FFFDF8' });
      var rm = s.path(refl, 'M' + (RX - 27) + ' ' + (CY + 14) + ' Q' + (RX - 10) + ' ' + (CY + 21) + ' ' + (RX + 6) + ' ' + (CY + 14), { stroke: '#FFFDF8', 'stroke-width': 5.4 });
      var rdot = s.node(refl, 'circle', { cx: RX - 10, cy: CY + 6.5, r: 8, fill: '#9E1830', opacity: 0 });
      s.tween(refl, 2.2, { opacity: 0 }, { opacity: 0.92, duration: 0.6 });
      s.tween(rdot, 2.9, { opacity: 0 }, { opacity: 1, duration: 0.25 });

      // «рука» ребёнка
      var hand = s.prop('hand');
      var H0 = [1262, 712];
      s.set(hand, 0, { x: H0[0], y: H0[1], opacity: 0 }, { x: H0[0], y: H0[1], opacity: 0 });
      s.tween(hand, 3.9, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      // до ~1,5 года: тянется к пятну в зеркале
      var r1 = s.path(g, 'M' + H0[0] + ' ' + H0[1] + ' Q1360 700 ' + (MX + 22) + ' ' + (CY + 8), { stroke: '#B9B2A8', 'stroke-width': 3, 'stroke-dasharray': '3 10' });
      s.dash(r1, 4.2, { dur: 0.6 });
      s.tween(hand, 4.2, { x: H0[0], y: H0[1] }, { x: MX + 22, y: CY + 8, duration: 0.6, ease: 'power2.inOut' });
      var tap = s.node(g, 'circle', { cx: MX + 22, cy: CY + 8, r: 18, fill: 'none', stroke: '#9A948C', 'stroke-width': 2.5, opacity: 0 });
      s.tween(tap, 4.8, { opacity: 0.9, attr: { r: 18 } }, { opacity: 0, attr: { r: 44 }, duration: 0.6, ease: 'power2.out' });
      var x1 = Film.cross(s, g, MX - 40, MY + 60, '#9A948C');
      s.fade(x1, 4.9, { y: 0, dur: 0.3 });
      s.tween(hand, 5.4, { x: MX + 22, y: CY + 8 }, { x: H0[0], y: H0[1], duration: 0.6, ease: 'power2.inOut' });
      s.out([r1, x1], 5.9, { dur: 0.4 });
      // к 1,5–2 годам: трогает свой нос — пятно стёрто
      var NOSE = [1190, 648];
      s.tween(hand, 6.8, { x: H0[0], y: H0[1] }, { x: NOSE[0] + 8, y: NOSE[1] + 4, duration: 0.55, ease: 'power2.inOut' });
      s.tween(hand, 7.4, { x: NOSE[0] + 8 }, { x: NOSE[0] - 4, duration: 0.14, ease: 'sine.inOut' });
      s.tween(hand, 7.54, { x: NOSE[0] - 4 }, { x: NOSE[0] + 8, duration: 0.14, ease: 'sine.inOut' });
      s.tween([dot, rdot], 7.6, { opacity: 1 }, { opacity: 0, duration: 0.25 });
      s.tween(hand, 7.9, { x: NOSE[0] + 8, y: NOSE[1] + 4 }, { x: H0[0], y: H0[1], duration: 0.55, ease: 'power2.inOut' });
      var ok = Film.check(s, g, 1290, 560, ACC);
      s.draw(ok, 8.1, { dur: 0.3 });
      s.mouth('baby', 'smile', 8.0, 0.35);
      s.tween(rm, 8.0, { attr: { d: 'M' + (RX - 27) + ' ' + (CY + 14) + ' Q' + (RX - 10) + ' ' + (CY + 21) + ' ' + (RX + 6) + ' ' + (CY + 14) } },
        { attr: { d: 'M' + (RX - 28) + ' ' + (CY + 11) + ' Q' + (RX - 10) + ' ' + (CY + 27) + ' ' + (RX + 7) + ' ' + (CY + 11) }, duration: 0.35 });
      s.tween(hand, 10.9, { opacity: 1 }, { opacity: 0, duration: 0.3 });

      s.face('baby', false, 11.1, 0.3);
      s.rest(11.1, 1.2);
    }
  });

  // 1:52,5 — Игра: замещение
  Film.scene({
    id: 'play', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Д. Б. Эльконин · Ф. И. Фрадкина', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Палочка становится ложкой', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var steps = [
        ['Повторяет действие взрослого: кормит куклу.', 1.1],
        ['Переносит его на другие игрушки: кормит мишку.', 4.1],
        ['Замещает один предмет другим: палочка — «ложка».', 7.0]
      ];
      steps.forEach(function (st, i) {
        var y = 330 + i * 120;
        var b = s.div('num-badge', { left: 140, top: y }, null, String(i + 1));
        s.pop(b, st[1], { from: 0.7, dur: 0.6 });
        var e = s.text('lead', st[0], { left: 222, top: y + 4, width: 760, fontSize: 34 });
        s.lines(e, st[1] + 0.1);
      });
      var cc = s.text('lead', 'Замещение — начало <span class="acc">воображения</span>. Из него вырастет сюжетно-ролевая игра дошкольника.', { left: 140, top: 700, width: 860, fontSize: 32, color: '#3C4852' });
      s.lines(cc, 9.4, { stagger: 0.1 });

      var g = s.svg();
      var EX = 1560, EY = 600; // «едок»
      // кукла
      var doll = s.node(g, 'g', { opacity: 0 });
      s.path(doll, 'M' + (EX - 62) + ' ' + (EY + 170) + ' L' + (EX - 38) + ' ' + (EY + 52) + ' Q' + EX + ' ' + (EY + 36) + ' ' + (EX + 38) + ' ' + (EY + 52) + ' L' + (EX + 62) + ' ' + (EY + 170) + ' Z', { fill: '#EBEDF7', stroke: INK, 'stroke-width': 3 });
      s.node(doll, 'circle', { cx: EX, cy: EY, r: 52, fill: '#F6E3D6', stroke: INK, 'stroke-width': 3 });
      s.path(doll, 'M' + (EX - 50) + ' ' + (EY - 12) + ' Q' + (EX - 30) + ' ' + (EY - 66) + ' ' + EX + ' ' + (EY - 52) + ' Q' + (EX + 30) + ' ' + (EY - 66) + ' ' + (EX + 50) + ' ' + (EY - 12), { fill: '#B8533D', stroke: INK, 'stroke-width': 3 });
      s.node(doll, 'circle', { cx: EX - 17, cy: EY + 2, r: 5, fill: INK });
      s.node(doll, 'circle', { cx: EX + 17, cy: EY + 2, r: 5, fill: INK });
      s.node(doll, 'ellipse', { cx: EX, cy: EY + 26, rx: 8, ry: 7, fill: '#B8533D' });
      // мишка
      var bear = s.node(g, 'g', { opacity: 0 });
      s.node(bear, 'ellipse', { cx: EX, cy: EY + 118, rx: 64, ry: 58, fill: '#C9A27E', stroke: INK, 'stroke-width': 3 });
      s.node(bear, 'circle', { cx: EX - 40, cy: EY - 40, r: 20, fill: '#C9A27E', stroke: INK, 'stroke-width': 3 });
      s.node(bear, 'circle', { cx: EX + 40, cy: EY - 40, r: 20, fill: '#C9A27E', stroke: INK, 'stroke-width': 3 });
      s.node(bear, 'circle', { cx: EX, cy: EY, r: 54, fill: '#C9A27E', stroke: INK, 'stroke-width': 3 });
      s.node(bear, 'ellipse', { cx: EX, cy: EY + 20, rx: 24, ry: 18, fill: '#E8D3BC' });
      s.node(bear, 'circle', { cx: EX - 18, cy: EY - 6, r: 5, fill: INK });
      s.node(bear, 'circle', { cx: EX + 18, cy: EY - 6, r: 5, fill: INK });
      s.node(bear, 'ellipse', { cx: EX, cy: EY + 24, rx: 7, ry: 6, fill: '#B8533D' });
      s.tween(doll, 1.4, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 });
      s.tween(doll, 4.2, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      s.tween(bear, 4.4, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 });
      var el = s.text('note', 'кукла', { left: EX - 90, top: EY + 184, width: 180, textAlign: 'center' });
      s.fade(el, 1.6, { y: 6 }); s.out(el, 4.2, { dur: 0.3 });
      var el2 = s.text('note', 'мишка', { left: EX - 90, top: EY + 184, width: 180, textAlign: 'center' });
      s.fade(el2, 4.6, { y: 6 });

      // ложка → палочка (с «воображаемой» ложкой вокруг)
      var tool = s.node(g, 'g', {});
      var spoon = s.node(tool, 'g', {});
      s.path(spoon, 'M-26 0 L-118 0', { stroke: INK, 'stroke-width': 8 });
      s.node(spoon, 'ellipse', { cx: 0, cy: 0, rx: 28, ry: 14, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      var stick = s.node(tool, 'g', { opacity: 0 });
      s.path(stick, 'M26 0 C-10 -6 -60 6 -118 0', { stroke: '#8B6A45', 'stroke-width': 10 });
      s.path(stick, 'M-40 2 L-52 -12', { stroke: '#8B6A45', 'stroke-width': 6 });
      var ghost = s.node(tool, 'g', { opacity: 0 });
      s.node(ghost, 'ellipse', { cx: 0, cy: 0, rx: 34, ry: 19, fill: 'none', stroke: ACC, 'stroke-width': 3, 'stroke-dasharray': '4 8' });
      s.set(tool, 0, { x: 1300, y: 700, opacity: 0 }, { x: 1300, y: 700, opacity: 0 });
      s.tween(tool, 1.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      function feed(t) { // поднести ко рту и обратно
        s.tween(tool, t, { x: 1300, y: 700 }, { x: EX - 46, y: EY + 28, duration: 0.6, ease: 'power2.inOut' });
        s.tween(tool, t + 0.9, { x: EX - 46, y: EY + 28 }, { x: 1300, y: 700, duration: 0.6, ease: 'power2.inOut' });
      }
      feed(2.2); feed(5.2); feed(8.2);
      s.tween(spoon, 7.2, { opacity: 1 }, { opacity: 0, duration: 0.35 });
      s.tween(stick, 7.3, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      s.tween(ghost, 7.6, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var tl1 = s.text('note', 'ложка', { left: 1150, top: 740, width: 200, textAlign: 'center' });
      s.fade(tl1, 1.8, { y: 6 }); s.out(tl1, 7.1, { dur: 0.3 });
      var tl2 = s.text('note', 'палочка — «ложка»', { left: 1110, top: 740, width: 280, textAlign: 'center', color: ACC, fontWeight: 650 });
      s.fade(tl2, 7.5, { y: 6 });
    }
  });

  // 2:05 — Э. Эриксон: автономия против стыда и сомнения
  Film.scene({
    id: 'erikson', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Э. Эриксон', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Автономия против стыда и сомнения', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Ребёнку важно пробовать самому — и ошибаться без страха.', { left: 140, top: 318, width: 1640 });
      s.lines(ld, 1.0);

      var rows = [
        { y: 456, t: 2.6, text: 'Взрослый даёт попробовать и поддерживает: «Сам? Давай!»', out: 'автономия · воля', on: true },
        { y: 640, t: 5.6, text: 'Взрослый торопит, стыдит, всё делает за ребёнка.', out: 'стыд · сомнение в себе', on: false }
      ];
      var g = s.svg();
      rows.forEach(function (r) {
        var cy = r.y + 44;
        // значок: взрослый и ребёнок с кубиком
        var ic = s.node(g, 'g', {});
        if (r.on) {
          s.node(ic, 'circle', { cx: 180, cy: cy - 8, r: 30, fill: '#385771' });
          s.node(ic, 'circle', { cx: 262, cy: cy + 8, r: 22, fill: '#E4735A' });
          s.node(ic, 'rect', { x: 292, y: cy + 4, width: 24, height: 24, rx: 5, fill: '#E0A930' });
        } else {
          s.node(ic, 'circle', { cx: 238, cy: cy + 8, r: 22, fill: '#E4735A' });
          s.node(ic, 'circle', { cx: 272, cy: cy - 10, r: 34, fill: '#385771' });
          s.node(ic, 'rect', { x: 300, y: cy - 34, width: 24, height: 24, rx: 5, fill: '#E0A930' });
        }
        s.fade(ic, r.t, { y: 10 });
        var tx = s.text('lead', r.text, { left: 360, top: r.y + 12, width: 820, fontSize: 32 });
        s.lines(tx, r.t + 0.15);
        var ar = s.path(g, 'M1208 ' + cy + ' H1300', { stroke: r.on ? ACC : '#9A948C', 'stroke-width': 4 });
        var ah = s.path(g, 'M1288 ' + (cy - 11) + ' L1302 ' + cy + ' L1288 ' + (cy + 11), { stroke: r.on ? ACC : '#9A948C', 'stroke-width': 4 });
        s.draw(ar, r.t + 1.1, { dur: 0.4 }); s.fade(ah, r.t + 1.4, { y: 0, dur: 0.2 });
        var ch = s.div('chip' + (r.on ? ' on' : ''), { left: 1330, top: r.y + 15, fontSize: 30 }, null, r.out);
        if (!r.on) { ch.style.background = '#EFEBE4'; ch.style.borderColor = '#D9D0C4'; ch.style.color = '#5F676B'; }
        s.pop(ch, r.t + 1.5, { from: 0.85, dur: 0.5, origin: '0% 50%' });
      });
      var rl = s.div('rule', { left: 140, top: 598, width: 1640 });
      s.grow(rl, 5.2, { dur: 0.8 });
      var nt = s.text('note', 'Добродетель этой стадии, по Э. Эриксону, — воля.', { left: 140, top: 800, width: 1640 });
      s.fade(nt, 9.4, { y: 6 });
    }
  });

  // 2:17,5 — Кризис трёх лет: «Я сам»
  Film.scene({
    id: 'crisis', bars: 6,
    build: function (s) {
      s.age(36, 0.3, 1.9, 4);
      Film.walk(s, 24, 36, 0.3);
      s.event('~3 года', 36, 1.9);

      var k = s.text('kicker', '~3 года · Л. С. Выготский', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Кризис трёх лет: «Я сам»', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var CX = 1380, CY = 596, R = 190, RL = 238;
      var g = s.svg();
      var v = [], i;
      for (i = 0; i < 7; i++) {
        var a = (-90 + i * 360 / 7) * Math.PI / 180;
        v.push([CX + R * Math.cos(a), CY + R * Math.sin(a), a]);
      }
      var order = [0, 3, 6, 2, 5, 1, 4], d = '';
      order.forEach(function (j, n) { d += (n ? ' L' : 'M') + v[j][0].toFixed(1) + ' ' + v[j][1].toFixed(1); });
      d += ' Z';
      var star = s.path(g, d, { stroke: ACC, 'stroke-width': 2.5, fill: '#EBEDF7', 'fill-opacity': 0 });
      s.draw(star, 2.1, { dur: 1.6, ease: 'power2.inOut' });
      s.tween(star, 3.4, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': 0.7 }, duration: 0.8 });
      var names = ['негативизм', 'упрямство', 'строптивость', 'своеволие', 'протест-бунт', 'обесценивание', 'деспотизм'];
      names.forEach(function (nm, j) {
        var a = v[j][2], x = CX + RL * Math.cos(a), y = CY + RL * Math.sin(a);
        var c = Math.cos(a), st = { top: y - 17, width: 260 };
        if (Math.abs(c) < 0.3) { st.left = x - 130; st.textAlign = 'center'; if (Math.sin(a) < 0) st.top = y - 30; else st.top = y - 4; }
        else if (c > 0) { st.left = x + 4; st.textAlign = 'left'; }
        else { st.left = x - 264; st.textAlign = 'right'; }
        var dt = s.node(g, 'circle', { cx: v[j][0], cy: v[j][1], r: 6, fill: ACC, opacity: 0 });
        s.tween(dt, 2.3 + j * 0.2, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        var e = s.text('label', nm, st);
        e.style.fontSize = '26px'; e.style.color = '#1D2733';
        s.fade(e, 2.4 + j * 0.2, { y: 6 });
      });
      // ребёнок — в центре «семизвездия»
      s.actor('baby', { x: CX, y: CY + 4, d: 104, o: 1 }, 2.6, 1.2);
      s.face('baby', true, 3.4, 0.4); s.mouth('baby', 'flat', 3.4, 0.01); s.gaze('baby', 0, 0, 3.4, 0.01);

      var nt = s.text('note', 'Симптомы описала Э. Кёлер; Л. С. Выготский назвал их «семизвездием».', { left: 140, top: 330, width: 760 });
      s.lines(nt, 4.2, { stagger: 0.08 });
      var q = s.text('quote', '«За всяким негативным симптомом кризиса скрывается позитивное содержание».', { left: 140, top: 452, width: 780, fontSize: 40 });
      s.lines(q, 6.2, { stagger: 0.12 });
      var qc = s.text('cite', 'Л. С. Выготский', { left: 140, top: 614 });
      s.fade(qc, 7.4, { y: 6 });
      var rs = s.text('lead', 'Итог кризиса — <span class="acc">воля, самостоятельность и гордость</span> за свои достижения.', { left: 140, top: 690, width: 780, fontSize: 34 });
      s.lines(rs, 10.0, { stagger: 0.1 });
      s.mouth('baby', 'smile', 10.6, 0.4);
      s.squash('baby', 0.92, 1.1, 10.6, 0.15); s.squash('baby', 1, 1, 10.75, 0.45, 'back.out(3)');

      s.face('baby', false, 13.8, 0.3);
      s.rest(13.8, 1.1);
    }
  });

  // 2:32,5 — Что запомнить: «паспорт возраста»
  Film.scene({
    id: 'summary', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Совместная деятельность: ребёнок — предмет — взрослый'],
        ['Ведущая деятельность', 'Предметная (предметно-манипулятивная) <span class="by">· Д. Б. Эльконин</span>'],
        ['Доминирующая функция', 'Восприятие <span class="by">· Л. С. Выготский</span>'],
        ['Новообразования', 'Речь, наглядно-действенное мышление, «я»'],
        ['Кризис', 'Трёх лет: «Я сам»'],
        ['Э. Эриксон', 'Автономия против стыда и сомнения'],
        ['Ж. Пиаже', 'Конец сенсомоторной стадии: рождается символ']
      ];
      rows.forEach(function (r, i) {
        var y = 318 + i * 76, t = 0.8 + i * 0.95;
        var row = s.div('passport-row', { left: 140, top: y, width: 1640, paddingTop: 16 });
        Film.el('div', 'passport-k', row, r[0]);
        Film.el('div', 'passport-v', row, r[1]);
        s.fade(row, t, { y: 10, dur: 0.7 });
      });
    }
  });

  // 2:47,5 — Финал: цитата из лекции курса, знак DOM Academy, карта курса и анонс
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      s.actor('obj', { x: 904, y: 268, d: 50, o: 0 }, 0.0, 0.01);
      s.actor('obj', { o: 1 }, 0.4, 0.8);
      s.actor('baby', { x: 904, y: 212, d: 62, o: 1 }, 0.3, 1.5);
      s.actor('adult', { x: 1000, y: 226, d: 88, o: 0 }, 0.0, 0.01);
      s.actor('adult', { o: 1 }, 0.5, 1.2);
      var q = s.text('quote', '«Кризисы — это такие закономерные швы развития».', { left: 260, top: 330, width: 1400, textAlign: 'center' });
      s.lines(q, 0.9, { stagger: 0.14, dur: 1.2 });
      var c = s.text('cite', 'из лекции «Введение» курса «Психология развития»', { left: 360, top: 424, width: 1200, textAlign: 'center' });
      s.fade(c, 2.2, { y: 6 });

      s.rulerOut(3.0);
      s.brandOut(3.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 243, top: 528, height: 130 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 3.8, { y: 10, dur: 1.0 });
      var sub = s.text('small-caps', 'Психология развития', { left: 0, top: 690, width: 1920, textAlign: 'center', fontSize: 21 });
      s.fade(sub, 4.3, { y: 6 });

      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 4.4);
      s.mapNext(M, 6.0);
      var nx = s.CFG.series.next, nxX = M.x(nx) + M.segW / 2;
      var ann = s.text('note', 'Далее: дошкольный возраст, 3–7 лет', { left: nxX - 250, top: s.RY - 70, width: 500, textAlign: 'center', color: '#C26A00', fontWeight: 650 });
      s.fade(ann, 6.3, { y: 6 });

      s.actor('baby', { o: 0 }, 11.1, 0.8, 'power2.in');
      s.actor('adult', { o: 0 }, 11.1, 0.8, 'power2.in');
      s.actor('obj', { o: 0 }, 11.1, 0.8, 'power2.in');
    }
  });
})();
