/* Часть 3. Символы · 2–2,5 года: образ себя, замещение в игре, речь для себя */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ACC = '#5C6BC0';

  // 2:05 — заставка части
  Film.scene({
    id: 'ch3', bars: 1,
    build: function (s) {
      s.chapterCard(3, 'Символы', '2–2,5 года');
      s.range(24, 30, 0.15, 1.3);
      s.age(24, 0.2, 1.3, 2);
      Film.walk(s, 18, 24, 0.2);
      s.chapter(3, 'Символы', 0.4, 45);
    }
  });

  // 2:07,5 — Узнавание себя в зеркале
  Film.scene({
    id: 'mirror', bars: 6,
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
      var nt = s.text('note', 'Вслед за этим появляются гордость, смущение, стыд — эмоции, в которых есть «я».', { left: 140, top: 752, width: 820 });
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

      var cu = s.text('note', 'Но это и вопрос культуры: в Кении пятно тронули лишь 2 ребёнка из 82 <span class="soft">(Т. Броуш и др., 2011)</span>.', { left: 140, top: 842, width: 820, color: '#3C4852' });
      s.lines(cu, 11.2, { stagger: 0.08 });

      s.face('baby', false, 13.6, 0.3);
      s.rest(13.6, 1.2);
    }
  });

  // 2:22,5 — Игра: замещение
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

  // 2:35 — Речь для себя: эгоцентрическая речь (Ж. Пиаже) → внутренняя речь (Л. С. Выготский)
  Film.scene({
    id: 'speech', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Ж. Пиаже · Л. С. Выготский', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Речь для себя', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var p1 = s.text('lead', 'Ж. Пиаже: <span class="acc">эгоцентрическая речь</span> — ребёнок говорит, не обращаясь к слушателю.', { left: 140, top: 330, width: 800, fontSize: 34 });
      s.lines(p1, 1.0, { stagger: 0.1 });
      var p2 = s.text('lead', 'Л. С. Выготский: это путь к <span class="acc">внутренней речи</span> — словом ребёнок начинает управлять собой.', { left: 140, top: 500, width: 800, fontSize: 34 });
      s.lines(p2, 5.2, { stagger: 0.1 });
      var nt = s.text('note', 'Появляется к трём годам, пик — в дошкольном возрасте. Роль «речи для себя» в саморегуляции подтверждают и современные исследования (А. Уинслер, Ч. Фернихоу).', { left: 140, top: 690, width: 820 });
      s.lines(nt, 10.0, { stagger: 0.08 });

      var g = s.svg();
      var GY = 800;
      var ground = s.path(g, 'M1040 ' + GY + ' H1780', { stroke: '#D9D0C4', 'stroke-width': 2.5 });
      s.draw(ground, 0.5, { dur: 0.9 });
      s.actor('baby', { x: 1210, y: GY - 55, d: 110, o: 1 }, 0.3, 1.2);
      s.face('baby', true, 1.1, 0.4); s.mouth('baby', 'soft', 1.1, 0.01); s.gaze('baby', 7, 2, 1.1, 0.01);
      // башня из кубиков
      var BX = 1470, SZ = 66;
      [2.4, 5.0, 7.6].forEach(function (t, i) {
        var y = GY - SZ * (i + 1);
        var b = s.node(g, 'rect', { x: BX - SZ / 2, y: y, width: SZ, height: SZ, rx: 12, fill: ['#E0A930', '#E7B84F', '#EEC871'][i], stroke: '#1D2733', 'stroke-width': 3, opacity: 0 });
        s.tween(b, t, { opacity: 0, y: -70 }, { opacity: 1, y: -70, duration: 0.12 });
        s.tween(b, t + 0.05, { y: -70 }, { y: 0, duration: 0.3, ease: 'power2.in' });
      });
      // реплики «для себя» — никому не адресованы
      var lines = [['Сюда…', 1.8, 4.1], ['Нет, вот сюда!', 4.4, 6.7], ['Вот так!', 7.0, null]];
      var last;
      lines.forEach(function (ln) {
        var b = s.div('bubble tail-l', { left: 1186, top: GY - 232, fontSize: 30 }, null, ln[0]);
        s.pop(b, ln[1], { from: 0.8, dur: 0.4, origin: '8% 100%' });
        if (ln[2] != null) s.out(b, ln[2], { dur: 0.25 }); else last = b;
      });
      s.mouth('baby', 'smile', 8.0, 0.3);
      // …и уходит внутрь: внутренняя речь
      s.tween(last, 9.3, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: -20, y: 150, scale: 0.15, opacity: 0, duration: 0.8, ease: 'power2.in', transformOrigin: '8% 100%' });
      var halo = s.node(g, 'circle', { cx: 1210, cy: GY - 55, r: 84, fill: 'none', stroke: '#5C6BC0', 'stroke-width': 3, 'stroke-dasharray': '4 10', opacity: 0 });
      s.tween(halo, 10.0, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var hl = s.text('note', 'внутренняя речь', { left: 1110, top: GY - 186, width: 200, textAlign: 'center', color: '#5C6BC0', fontWeight: 650 });
      s.fade(hl, 10.2, { y: 6 });

      s.face('baby', false, 13.6, 0.3);
      s.out([halo, hl], 13.5, { dur: 0.4 });
      s.rest(13.6, 1.2);
    }
  });
})();
