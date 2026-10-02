/* Часть 2. Мир глазами другого · мышление: сохранение (Пиаже), три горы, Макси (Виммер, Пернер), культура */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', OBJ = '#E0A930', WATER = '#9CC3D5', WATER_D = '#5E93AC', MUTE = '#8A8F90';

  // стакан: контур + вода (уровень задаётся высотой прямоугольника)
  function glass(s, g, x, base, w, h, level) {
    var G = s.node(g, 'g', {});
    var water = s.node(G, 'rect', { x: x - w / 2 + 4, y: base - level, width: w - 8, height: level, fill: WATER, rx: 3 });
    s.path(G, 'M' + (x - w / 2) + ' ' + (base - h) + ' L' + (x - w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + (base - h), { stroke: INK, 'stroke-width': 3.5 });
    return { g: G, water: water, x: x, base: base, w: w };
  }
  function setLevel(s, gl, t, from, to, dur) {
    s.tween(gl.water, t, { attr: { y: gl.base - from, height: from } }, { attr: { y: gl.base - to, height: to }, duration: dur, ease: 'power1.inOut' });
  }

  // 1:37,5 — заставка части
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      s.chapterCard(2, 'Мир глазами другого', 'мышление · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.age(48, 0.2, 1.3);
      s.chapter(2, 'Мир глазами другого', 0.4, 42.1);
    }
  });

  // 1:40 — Где больше воды? Сохранение (Ж. Пиаже, А. Шеминьская, 1941) → М. Дональдсон, 1978
  Film.scene({
    id: 'water', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Ж. Пиаже · А. Шеминьская, 1941', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Где больше воды?', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var p0 = s.text('lead', 'Воды поровну — ребёнок согласен.', { left: 140, top: 330, width: 780, fontSize: 34 });
      s.lines(p0, 1.0);

      var g = s.svg(), ov = s.over();
      var BASE = 700;
      var A = glass(s, g, 1080, BASE, 110, 170, 110);
      var B = glass(s, g, 1240, BASE, 110, 170, 110);
      var C = glass(s, g, 1460, BASE, 56, 330, 0);
      s.tween([A.g, B.g], 0.6, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 });
      s.tween(C.g, 1.6, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 });
      var task = s.text('label', '<span class="term">задача на сохранение<span class="en">conservation task</span></span>', { left: 1010, top: 740, fontSize: 30 });
      s.fade(task, 1.2, { y: 6 });

      // переливание из B в высокий узкий C (объём тот же: 102 × 110 ≈ 48 × 234)
      s.tween(B.g, 2.3, { x: 0, y: 0, rotation: 0 }, { x: 150, y: -230, rotation: 0, duration: 0.7, ease: 'power2.inOut', svgOrigin: '1240 700' });
      s.tween(B.g, 3.0, { rotation: 0 }, { rotation: 70, duration: 0.5, ease: 'power2.inOut', svgOrigin: '1240 700' });
      setLevel(s, B, 3.4, 110, 0, 1.1);
      setLevel(s, C, 3.5, 0, 234, 1.1);
      var stream = s.path(g, 'M1440 410 L1452 600', { stroke: WATER_D, 'stroke-width': 6, opacity: 0 });
      s.tween(stream, 3.4, { opacity: 0 }, { opacity: 0.8, duration: 0.15 });
      s.tween(stream, 4.45, { opacity: 0.8 }, { opacity: 0, duration: 0.15 });
      s.tween(B.g, 4.7, { rotation: 70 }, { rotation: 0, duration: 0.4, ease: 'power2.inOut', svgOrigin: '1240 700' });
      s.tween(B.g, 5.1, { x: 150, y: -230 }, { x: 0, y: 0, duration: 0.6, ease: 'power2.inOut' });

      // вопрос зрителю — пауза — ответ дошкольника
      s.out(p0, 4.8, { dur: 0.4 });
      var qv = s.text('statement', 'А теперь?', { left: 140, top: 330, width: 780, fontSize: 60 });
      s.lines(qv, 5.2);
      s.actor('baby', { x: 1700, y: 640, d: 104, o: 0 }, 5.0, 0.01);
      s.actor('baby', { o: 1 }, 5.1, 0.5);
      s.face('baby', true, 5.2, 0.3); s.mouth('baby', 'soft', 5.2, 0.01); s.gaze('baby', -8, -6, 5.2, 0.01);
      var bub = s.div('bubble tail-r', { left: 1590, top: 470 }, null, 'В высоком!');
      s.pop(bub, 6.9, { from: 0.7, dur: 0.5, origin: '90% 100%' });
      s.mouth('baby', 'smile', 6.9, 0.2);
      // взгляд «прилипает» к уровню воды
      var gz = s.path(ov, 'M1672 628 L1500 470', { stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '4 9' });
      s.dash(gz, 7.3, { dur: 0.6 });
      var lvl = s.path(ov, 'M1420 466 H1500', { stroke: ORANGE, 'stroke-width': 5 });
      s.draw(lvl, 7.8, { dur: 0.4 });

      s.out(qv, 8.2, { dur: 0.4 });
      var p1 = s.text('lead', 'Взгляд прилипает к одному признаку — высоте. Это ' + s.HL('центрация.'), { left: 140, top: 330, width: 800, fontSize: 34 });
      s.lines(p1, 8.5);
      s.hl(p1, 9.4);
      var p2 = s.text('body', 'Мысленно перелить воду обратно ребёнок ещё не может — нет обратимости. Справляются в среднем к 6–7 годам.', { left: 140, top: 440, width: 800, fontSize: 28 });
      s.lines(p2, 9.6, { stagger: 0.08 });
      s.age(78, 9.8, 1.4);
      var nl = s.text('small-caps', 'Сейчас понимают так', { left: 140, top: 590 });
      s.fade(nl, 11.4, { y: 6 });
      var now = s.text('body', 'Если смысл задачи ребёнку понятен, он рассуждает раньше, чем думал Пиаже (М. Дональдсон, 1978). Насколько раньше — предмет споров.', { left: 140, top: 626, width: 800, fontSize: 28 });
      s.lines(now, 11.6, { stagger: 0.08 });
    }
  });

  // 1:55 — Три горы → где Макси будет искать шоколадку? (Х. Виммер, Й. Пернер, 1983) → культура
  Film.scene({
    id: 'maxi', bars: 10,
    build: function (s) {
      var k = s.text('kicker', 'Чужая точка зрения', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h1 = s.text('h2', 'Три горы', { left: 140, top: 186, width: 900 });
      s.lines(h1, 0.2);
      var m1 = s.text('lead', 'Что видит кукла с другой стороны макета? До 7–8 лет ребёнок выбирает картинку со своим видом.', { left: 140, top: 330, width: 800, fontSize: 32 });
      s.lines(m1, 0.8, { stagger: 0.08 });
      var mc = s.text('cite', 'Ж. Пиаже, Б. Инельдер, 1948', { left: 140, top: 470 });
      s.fade(mc, 1.4, { y: 6 });
      var g0 = s.svg(), ov0 = s.over();
      s.actor('baby', { x: 1400, y: 800, d: 92 }, 0.0, 1.0, 'power3.inOut');
      s.mouth('baby', 'soft', 0.2, 0.3); s.gaze('baby', 0, -6, 0.2, 0.3);
      var mt = s.node(ov0, 'g', {});
      s.sk(mt, [[1180, 640], [1270, 470], [1360, 640]], { at: 0.6, dur: 0.6, seed: 301 });
      s.sk(mt, [[1300, 640], [1420, 400], [1540, 640]], { at: 0.8, dur: 0.6, seed: 303 });
      s.sk(mt, [[1480, 640], [1550, 520], [1620, 640]], { at: 1.0, dur: 0.6, seed: 305 });
      s.sk(mt, [[1400, 418], [1420, 400], [1440, 418]], { at: 1.5, dur: 0.3, seed: 307, color: ORANGE, width: 5 });
      var doll = s.node(g0, 'circle', { cx: 1420, cy: 340, r: 16, fill: '#C9A27E', opacity: 0 });
      s.tween(doll, 1.6, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 });
      var dl = s.text('note', 'кукла', { left: 1450, top: 316, fontSize: 22 });
      s.fade(dl, 1.8, { y: 4 });
      s.gaze('baby', 6, -4, 2.6, 0.4);
      [h1, m1, mc, dl].forEach(function (e) { s.out(e, 4.5, { dur: 0.4 }); });
      s.out(mt, 4.5, { dur: 0.4 }); s.out(doll, 4.5, { dur: 0.4 });
      s.actor('baby', { o: 0 }, 4.5, 0.4);

      // Макси
      var h2 = s.text('h2', 'Где Макси будет искать шоколадку?', { left: 140, top: 186, width: 1500 });
      s.lines(h2, 5.0);
      var g = s.svg(), ov = s.over();
      var CA = 1180, CB = 1560, CY = 640;
      [CA, CB].forEach(function (x, i) {
        var c = s.node(g, 'rect', { x: x - 80, y: CY - 60, width: 160, height: 150, rx: 16, fill: '#F5E7BD', stroke: '#A77A12', 'stroke-width': 3, opacity: 0 });
        s.tween(c, 5.2 + i * 0.15, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 });
        var lb = s.text('label', i ? 'другой шкаф' : 'первый шкаф', { left: x - 110, top: CY + 104, width: 220, textAlign: 'center', fontSize: 24, color: '#5F676B' });
        s.fade(lb, 5.4 + i * 0.15, { y: 6 });
      });
      var choc = s.node(g, 'rect', { x: CA - 22, y: CY - 10, width: 44, height: 30, rx: 5, fill: '#7A4A2A', opacity: 0 });
      // Макси кладёт шоколадку и уходит
      s.actor('kid2', { x: 900, y: 560, d: 96, o: 0 }, 5.0, 0.01);
      s.actor('kid2', { o: 1 }, 5.3, 0.5);
      s.face('kid2', true, 5.4, 0.3); s.mouth('kid2', 'smile', 5.4, 0.01); s.gaze('kid2', 8, 4, 5.4, 0.01);
      var mx = s.text('label', 'Макси', { left: 840, top: 432, width: 120, textAlign: 'center', fontSize: 24 });
      s.fade(mx, 5.6, { y: 6 }); s.out(mx, 8.0, { dur: 0.3 });
      s.tween(choc, 6.0, { opacity: 0, x: -200, y: -80 }, { opacity: 1, x: 0, y: 0, duration: 0.7, ease: 'power2.out' });
      // мысль Макси — рисованный слой: шоколадка в первом шкафу
      var th = s.node(ov, 'g', {});
      s.sk(th, Film.circ(900, 400, 62, 18), { at: 6.8, dur: 0.6, seed: 311 });
      s.sk(th, [[870, 470], [866, 480]], { at: 7.2, dur: 0.1, seed: 313, width: 5 });
      s.sk(th, [[874, 400], [926, 400], [926, 440], [874, 440], [874, 400]], { at: 7.2, dur: 0.4, seed: 315, color: '#A77A12' });
      s.sk(th, [[888, 412], [912, 412], [912, 428], [888, 428], [888, 412]], { at: 7.5, dur: 0.3, seed: 317, color: ORANGE, width: 5 });
      s.actor('kid2', { x: 760, o: 0 }, 8.0, 0.7, 'power2.in');
      s.tween(th, 8.0, { opacity: 1 }, { opacity: 0, duration: 0.5 });
      // мама перекладывает
      s.actor('adult', { x: 1560, y: 420, d: 140, o: 0 }, 8.0, 0.01);
      s.actor('adult', { x: 1370, o: 1 }, 8.3, 0.7, 'power3.out');
      s.tween(choc, 9.0, { x: 0, y: 0 }, { x: CB - CA, y: 0, duration: 1.0, ease: 'power2.inOut' });
      s.actor('adult', { x: 1560, o: 0 }, 10.3, 0.6, 'power2.in');
      // Макси возвращается — в голове всё ещё первый шкаф
      s.actor('kid2', { x: 900, o: 1 }, 10.4, 0.7, 'power2.out');
      s.tween(th, 10.9, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var q = s.text('statement', 'Где Макси будет искать?', { left: 140, top: 330, width: 640, fontSize: 52 });
      s.lines(q, 11.3);

      // ответы по возрасту (Х. Виммер, Й. Пернер, 1983)
      s.out(q, 13.4, { dur: 0.4 });
      var ans = [];
      var cap = s.text('small-caps', 'Ответили «в первом шкафу»', { left: 140, top: 330 });
      s.fade(cap, 13.7, { y: 6 }); ans.push(cap);
      s.age(44, 13.7, 1.4);
      [['3–4 года', 0], ['4–6 лет', 57], ['6–9 лет', 86]].forEach(function (r, i) {
        var y = 380 + i * 64;
        var lb = s.text('label', r[0], { left: 140, top: y, fontSize: 26 });
        var bg = s.div('', { left: 300, top: y + 6, width: 400, height: 22, background: '#E7E2DA', borderRadius: '11px' });
        var b = s.div('', { left: 300, top: y + 6, width: Math.max(4, 4 * r[1]), height: 22, background: ORANGE, borderRadius: '11px' });
        var v = s.text('label', r[1] ? r[1] + ' %' : 'никто', { left: 716, top: y, fontSize: 26, color: DEEP });
        s.fade(lb, 13.9 + i * 0.35, { y: 6 }); s.fade(bg, 13.9 + i * 0.35, { y: 0 });
        s.grow(b, 14.1 + i * 0.35, { dur: 0.7 }); s.fade(v, 14.6 + i * 0.35, { y: 0 });
        ans.push(lb, bg, b, v);
      });
      var wc = s.text('cite', 'Х. Виммер, Й. Пернер, 1983', { left: 140, top: 580 });
      s.fade(wc, 15.0, { y: 6 }); ans.push(wc);
      var term = s.text('h3 acc', '<span class="term">теория психического<span class="en">theory of mind</span></span>', { left: 140, top: 640 });
      s.fade(term, 15.6, { y: 10 }); ans.push(term);
      var meta = s.text('body', 'Метаанализ 178 исследований: перелом — около 4 лет; форма задачи сдвигает кривую, но не меняет её (Г. Уэллман и др., 2001).', { left: 140, top: 748, width: 820, fontSize: 25 });
      s.lines(meta, 16.4, { stagger: 0.07 }); ans.push(meta);

      // культура: порядок ступеней понимания (А. Шахаян и др., 2011)
      ans.forEach(function (e) { s.out(e, 19.6, { dur: 0.4 }); });
      var cl = s.text('small-caps', 'Порядок ступеней зависит от культуры', { left: 140, top: 330 });
      s.fade(cl, 20.0, { y: 6 });
      [['Австралия, США', ['разные желания', 'разные мнения', 'кто что знает', 'ложное убеждение']],
       ['Иран, Китай', ['разные желания', 'кто что знает', 'разные мнения', 'ложное убеждение']]].forEach(function (sq, j) {
        var y = 380 + j * 176;
        var nm = s.text('label', sq[0], { left: 140, top: y, fontSize: 25 });
        s.fade(nm, 20.2 + j * 0.8, { y: 6 });
        sq[1].forEach(function (w, i) {
          var ch = s.div('chip' + (i === 1 || i === 2 ? ' sw' : ''), { left: 140 + (i % 2) * 400, top: y + 42 + Math.floor(i / 2) * 58, height: 48, fontSize: 23, padding: '0 20px' }, null, (i + 1) + '. ' + w);
          s.fade(ch, 20.4 + j * 0.8 + i * 0.12, { y: 6 });
        });
      });
      var sc = s.text('cite', 'А. Шахаян и др., 2011; Г. Уэллман, Д. Лю, 2004', { left: 140, top: 744 });
      s.fade(sc, 22.0, { y: 6 });
    }
  });
})();
