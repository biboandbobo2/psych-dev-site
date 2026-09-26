/* Часть 2. Привязанность · 3–8 мес */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733';

  // 1:10 — заставка части
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      Film.chapterCard(s, 2, 'Привязанность', '3–8 месяцев');
      s.range(3, 8, 0.15, 1.3);
      s.chapter(2, 'Привязанность', 0.4, 57.5);
    }
  });

  // 1:12,5 — Харлоу: еда или тепло
  Film.scene({
    id: 'harlow', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Эксперимент Г. Харлоу, 1958', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что важнее: еда или тепло?', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Детёныши макак почти всё время проводили на мягкой «матери», а к проволочной подходили только поесть.', { left: 140, top: 330, width: 800 });
      s.lines(ld, 2.6, { stagger: 0.12 });
      var cc = s.text('h3', 'Привязанность строится на <span class="acc">тепле и утешении</span>, а не на еде.', { left: 140, top: 620, width: 800 });
      s.lines(cc, 6.6, { stagger: 0.12 });

      var g = s.svg();
      // проволочная «мать» с бутылочкой
      var wire = s.node(g, 'g', {});
      var defs = s.node(g, 'defs', {});
      var cpw = s.node(defs, 'clipPath', { id: 'clip-wire' });
      s.node(cpw, 'rect', { x: 1115, y: 420, width: 130, height: 290, rx: 30 });
      var wb = s.node(wire, 'rect', { x: 1115, y: 420, width: 130, height: 290, rx: 30, fill: 'none', stroke: INK, 'stroke-width': 3 });
      var mesh = s.node(wire, 'g', { 'clip-path': 'url(#clip-wire)', opacity: 0.8 });
      for (var x = 1133; x < 1245; x += 18) s.path(mesh, 'M' + x + ' 420 V710', { stroke: INK, 'stroke-width': 2 });
      for (var y = 448; y < 710; y += 30) s.path(mesh, 'M1115 ' + y + ' H1245', { stroke: INK, 'stroke-width': 2 });
      var wh = s.node(wire, 'circle', { cx: 1180, cy: 362, r: 44, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      s.node(wire, 'circle', { cx: 1164, cy: 356, r: 5, fill: INK });
      s.node(wire, 'circle', { cx: 1196, cy: 356, r: 5, fill: INK });
      s.path(wire, 'M1166 382 H1194', { stroke: INK, 'stroke-width': 3 });
      var bottle = s.node(wire, 'g', {});
      s.node(bottle, 'rect', { x: 1052, y: 466, width: 64, height: 34, rx: 10, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      s.node(bottle, 'rect', { x: 1062, y: 474, width: 40, height: 18, rx: 5, fill: '#F5E7BD' });
      s.path(bottle, 'M1052 474 Q1030 483 1052 492', { stroke: INK, 'stroke-width': 3, fill: '#F6D5CB' });
      s.draw(wb, 0.7, { dur: 1.2 });
      s.fade([mesh, wh], 1.1, { y: 0, dur: 0.7 });
      s.pop(bottle, 1.5, { from: 0.7 });
      var lw = s.text('label soft', 'проволочная, с молоком', { left: 1030, top: 730, width: 300, textAlign: 'center', fontSize: 24 });
      s.fade(lw, 1.8, { y: 6 });
      // мягкая «мать»
      var soft = s.node(g, 'g', {});
      s.node(soft, 'rect', { x: 1490, y: 420, width: 140, height: 290, rx: 64, fill: '#F0D7CF', stroke: INK, 'stroke-width': 3 });
      s.path(soft, 'M1506 500 Q1560 522 1614 500 M1506 572 Q1560 594 1614 572 M1506 644 Q1560 666 1614 644', { stroke: '#D9B3A6', 'stroke-width': 3 });
      s.node(soft, 'circle', { cx: 1560, cy: 360, r: 48, fill: '#F0D7CF', stroke: INK, 'stroke-width': 3 });
      s.node(soft, 'circle', { cx: 1543, cy: 354, r: 5, fill: INK });
      s.node(soft, 'circle', { cx: 1577, cy: 354, r: 5, fill: INK });
      s.path(soft, 'M1544 378 Q1560 390 1576 378', { stroke: INK, 'stroke-width': 3 });
      s.fade(soft, 1.0, { y: 14, dur: 0.9 });
      var ls = s.text('label soft', 'мягкая, из ткани', { left: 1410, top: 730, width: 300, textAlign: 'center', fontSize: 24 });
      s.fade(ls, 1.9, { y: 6 });
      // детёныш
      var pup = s.node(g, 'circle', { cx: 0, cy: 0, r: 26, fill: '#E4735A', stroke: '#FAF7F0', 'stroke-width': 6 });
      s.tween(pup, 0, { x: 1370, y: 640, opacity: 0, scale: 0.6 }, { x: 1370, y: 640, opacity: 0, scale: 0.6, duration: 0.001 });
      s.tween(pup, 2.3, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', transformOrigin: '50% 50%' });
      s.tween(pup, 3.0, { x: 1370, y: 640 }, { x: 1052, y: 540, duration: 1.0, ease: 'power2.inOut' });
      s.tween(pup, 4.1, { scale: 1 }, { scale: 1.12, duration: 0.25, ease: 'power1.inOut', transformOrigin: '50% 50%' });
      s.tween(pup, 4.35, { scale: 1.12 }, { scale: 1, duration: 0.25, ease: 'power1.inOut', transformOrigin: '50% 50%' });
      s.tween(pup, 4.8, { x: 1052, y: 540 }, { x: 1486, y: 560, duration: 1.4, ease: 'power2.inOut' });
    }
  });

  // 1:25 — Боулби: сигналы удерживают взрослого рядом
  Film.scene({
    id: 'bowlby', bars: 3,
    build: function (s) {
      s.actor('baby', { x: 430, y: 560, d: 120, o: 1 }, 0.1, 1.2);
      s.face('baby', true, 0.9, 0.4); s.mouth('baby', 'soft', 0.9, 0.01); s.gaze('baby', 6, 0, 0.9, 0.01);
      s.actor('adult', { x: 1560, y: 560, d: 170, o: 1 }, 0.3, 1.0);
      s.mouth('adult', 'soft', 0.3, 0.01);
      s.actor('adult', { x: 1290 }, 2.9, 1.4, 'power2.inOut');

      var k = s.text('kicker', 'Дж. Боулби', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Привязанность — врождённая система', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);

      var g = s.svg();
      var sig = ['плач', 'улыбка', 'взгляд', 'цепляние'], offs = [-120, -40, 40, 120];
      offs.forEach(function (o, i) {
        var p = s.path(g, 'M500 560 C700 ' + (560 + o) + ' 950 ' + (560 + o) + ' 1150 ' + (560 + o * 0.35), { stroke: '#E4735A', 'stroke-width': 2.5, 'stroke-dasharray': '3 10' });
        s.dash(p, 1.0 + i * 0.3, { dur: 0.8 });
        var chip = s.div('chip', { left: 760, top: 560 + o * 0.78 - 29, height: 52, fontSize: 25, padding: '0 22px' }, null, sig[i]);
        chip.style.borderColor = '#F0C4B7';
        s.pop(chip, 1.3 + i * 0.3, { from: 0.8, dur: 0.6 });
      });
      var ld = s.text('lead', 'Сигналы младенца удерживают взрослого рядом. Эволюционный смысл — <span class="acc">защита</span>.', { left: 140, top: 780, width: 1640 });
      s.lines(ld, 3.4);
    }
  });

  // 1:32,5 — «Неподвижное лицо» (Троник)
  Film.scene({
    id: 'stillface', bars: 5,
    build: function (s) {
      s.actor('baby', { x: 1180, y: 530, d: 130 }, 0.0, 1.1);
      s.actor('adult', { x: 1570, y: 490, d: 210 }, 0.0, 1.1);
      s.gaze('baby', 7, -3, 0.3, 0.4); s.gaze('adult', -6, 2, 0.3, 0.4);
      s.mouth('baby', 'smile', 0.9, 0.4); s.mouth('adult', 'smile', 0.9, 0.4);

      var k = s.text('kicker', 'Эксперимент Э. Троника, 1978', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', '«Неподвижное лицо»', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var steps = [
        { t: 0.9, y: 330, tx: 'Мама играет с малышом.' },
        { t: 3.5, y: 444, tx: 'Её лицо замирает — ни улыбки, ни ответа.' },
        { t: 6.1, y: 572, tx: 'Малыш пытается вернуть контакт, потом отворачивается и расстраивается.' }
      ];
      steps.forEach(function (st, i) {
        var b = s.div('num-badge', { left: 140, top: st.y }, null, String(i + 1));
        s.pop(b, st.t, { from: 0.7, dur: 0.6 });
        var tx = s.text('lead', st.tx, { left: 220, top: st.y + 2, width: 790, fontSize: 36 });
        s.lines(tx, st.t + 0.1);
      });
      var cc = s.text('lead', 'Младенец — <span class="acc">активный участник</span> общения: он ждёт ответа.', { left: 140, top: 780, width: 1640 });
      s.lines(cc, 9.3);

      var g = s.svg();
      var arc = s.path(g, 'M1250 452 Q1370 372 1470 420', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(arc, 1.2, { dur: 0.8 });
      // шаг 2: лицо взрослого замирает
      s.mouth('adult', 'flat', 3.6, 0.5);
      s.color('adult', '#7A8793', 3.7, 0.9);
      s.out(arc, 3.7, { dur: 0.6 });
      // шаг 3: попытки вернуть контакт → отворачивается
      var calls = [0, 1, 2].map(function (i) {
        var r = 20 + i * 14;
        return s.path(g, 'M' + (1262 + r * 0.45) + ' ' + (505 - r * 0.6) + ' Q' + (1262 + r) + ' 505 ' + (1262 + r * 0.45) + ' ' + (505 + r * 0.6), { stroke: '#E4735A', 'stroke-width': 3.5 });
      });
      calls.forEach(function (p, i) { s.draw(p, 6.3 + i * 0.28, { dur: 0.4 }); });
      s.mouth('baby', 'soft', 6.2, 0.4);
      s.out(calls, 7.7, { dur: 0.4 });
      s.gaze('baby', -9, 3, 7.9, 0.5);
      s.actor('baby', { x: 1140, y: 545 }, 7.9, 0.8, 'power2.inOut');
      s.mouth('baby', 'sad', 8.3, 0.5);
      // воссоединение: контакт восстанавливается
      s.color('adult', '#385771', 10.6, 0.8);
      s.mouth('adult', 'smile', 10.7, 0.5);
      s.gaze('baby', 7, -3, 11.0, 0.5);
      s.actor('baby', { x: 1180, y: 530 }, 11.0, 0.8, 'power2.inOut');
      s.mouth('baby', 'soft', 11.2, 0.4);
    }
  });

  // 1:45 — ~8 мес: страх чужих
  Film.scene({
    id: 'eight', bars: 4,
    build: function (s) {
      s.age(8, 0.2, 1.8);
      s.event('~8 мес', 8, 0.8);
      s.actor('adult', { x: 1400, y: 520, d: 190 }, 0.0, 1.1);
      s.actor('baby', { x: 1215, y: 590, d: 110 }, 0.0, 1.1);
      s.mouth('baby', 'smile', 0.4, 0.4); s.gaze('baby', 5, -3, 0.4, 0.4); s.gaze('adult', -5, 3, 0.4, 0.4);
      s.face('stranger', true, 0.0, 0.01); s.mouth('stranger', 'flat', 0.0, 0.01); s.gaze('stranger', -6, 2, 0.0, 0.01);
      s.actor('stranger', { x: 2080, y: 500, d: 170, o: 1 }, 0.0, 0.01);
      s.actor('stranger', { x: 1730 }, 1.4, 1.4, 'power3.out');
      s.gaze('baby', 9, -1, 2.0, 0.3);
      s.mouth('baby', 'sad', 2.3, 0.4);
      s.actor('baby', { x: 1290, y: 600, d: 104 }, 2.4, 0.7, 'power2.out');
      s.gaze('baby', -2, -4, 2.9, 0.4);

      var la = s.text('label acc-adult', 'свой', { left: 1300, top: 370, width: 200, textAlign: 'center' });
      var lb = s.text('label soft', 'чужой', { left: 1630, top: 362, width: 200, textAlign: 'center' });
      s.fade(la, 1.2, { y: 6 }); s.fade(lb, 2.0, { y: 6 });

      var k = s.text('kicker', '~8 месяцев', { left: 140, top: 250 });
      s.fade(k, 0.3, { y: 8 });
      var h = s.text('h2', 'Страх чужих и протест при разлуке', { left: 140, top: 286, width: 900 });
      s.lines(h, 0.45);
      var ld = s.text('lead', 'Привязанность сложилась: у ребёнка появился ' + s.HL('«свой» взрослый') + '.', { left: 140, top: 480, width: 820 });
      s.lines(ld, 3.2);
      s.hl(ld, 4.1);
      var nt = s.text('note', '«Тревога восьмого месяца» — Р. Шпиц', { left: 140, top: 640, width: 820 });
      s.fade(nt, 4.6, { y: 6 });
      s.actor('stranger', { x: 2100, o: 0 }, 8.6, 1.2, 'power2.in');
    }
  });

  // 1:55 — Надёжная база (Эйнсворт) и типы привязанности
  Film.scene({
    id: 'securebase', bars: 5,
    build: function (s) {
      s.actor('adult', { x: 1260, y: 470, d: 150 }, 0.0, 1.1);
      s.actor('baby', { x: 1350, y: 530, d: 64 }, 0.0, 1.1);
      s.face('baby', false, 0.0, 0.4); s.face('adult', false, 0.0, 0.4);

      var k = s.text('kicker', 'М. Эйнсворт', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Надёжная база', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'С надёжным взрослым ребёнок смелее исследует мир — и возвращается за поддержкой.', { left: 140, top: 330, width: 800 });
      s.lines(ld, 0.9);

      var g = s.svg();
      var objs = [[1560, 318], [1712, 470], [1566, 636]];
      var os = objs.map(function (p, i) {
        return s.node(g, 'rect', { x: p[0] - 19, y: p[1] - 19, width: 38, height: 38, rx: 8, fill: '#E0A930', transform: 'rotate(' + [8, -10, 14][i] + ' ' + p[0] + ' ' + p[1] + ')' });
      });
      s.pop(os, 0.8, { stagger: 0.15, from: 0.5 });
      var wp = [[1350, 530], [1520, 352], [1664, 470], [1372, 540], [1522, 606], [1352, 532]];
      var t = 1.8;
      for (var i = 1; i < wp.length; i++) {
        var a = wp[i - 1], b = wp[i];
        var seg = s.path(g, 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1], { stroke: '#E4735A', 'stroke-width': 2.5, 'stroke-dasharray': '2 10', opacity: 0.8 });
        s.dash(seg, t, { dur: 0.75, ease: 'power1.inOut' });
        s.actor('baby', { x: b[0], y: b[1] }, t, 0.75, 'power1.inOut');
        t += (i === 3 ? 1.05 : 0.85);
      }

      var cap = s.text('small-caps', 'Типы привязанности · методика «Незнакомая ситуация», 12–18 мес', { left: 140, top: 700 });
      s.fade(cap, 6.6, { y: 6 });
      var row = s.div(null, { left: 140, top: 742, display: 'flex', gap: '16px' });
      var names = ['надёжная', 'избегающая', 'амбивалентная', 'дезорганизованная*'];
      var chips = names.map(function (n, i) {
        var c = s.div('chip' + (i === 0 ? ' on' : ''), { position: 'static' }, row, n);
        return c;
      });
      s.pop(chips, 7.0, { stagger: 0.22, from: 0.85, dur: 0.6 });
      var nt = s.text('note', '*описали М. Мэйн и Дж. Соломон, 1990', { left: 140, top: 828 });
      s.fade(nt, 8.3, { y: 6 });

      s.actor('adult', { o: 0, d: 110 }, 11.3, 0.8, 'power2.in');
      s.rest(11.2, 1.2);
    }
  });
})();
