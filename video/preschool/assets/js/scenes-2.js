/* Часть 2. Мир глазами другого · мышление: сохранение (Пиаже), три горы, Макси (Виммер, Пернер) */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', WATER = '#9CC3D5', WATER_D = '#5E93AC', MUTE = '#8A8F90';
  var RED = '#C8553D', GREEN = '#2E7D32';

  // стакан: контур + вода (уровень задаётся высотой прямоугольника)
  function glass(s, g, x, base, w, h, level) {
    var G = s.node(g, 'g', {});
    var water = s.node(G, 'rect', { x: x - w / 2 + 4, y: base - level, width: w - 8, height: level, fill: WATER, rx: 3 });
    s.path(G, 'M' + (x - w / 2) + ' ' + (base - h) + ' L' + (x - w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + (base - h), { stroke: INK, 'stroke-width': 3.5 });
    return { g: G, water: water, x: x, base: base, w: w };
  }
  function setLevel(s, gl, t, from, to, dur, ease) {
    s.tween(gl.water, t, { attr: { y: gl.base - from, height: from } }, { attr: { y: gl.base - to, height: to }, duration: dur, ease: ease || 'power1.inOut' });
  }

  // 1:42,5 — заставка части
  Film.scene({
    id: 'ch2', bars: 1,
    build: function (s) {
      s.chapterCard(2, 'Мир глазами другого', 'мышление · 3–7 лет');
      s.range(36, 84, 0.15, 1.3);
      s.age(48, 0.2, 1.3);
      s.chapter(2, 'Мир глазами другого', 0.4, 42.1);
    }
  });

  // 1:45 — Где больше воды? Сохранение (Ж. Пиаже, А. Шеминьская, 1941) → М. Дональдсон, 1978
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
      var C = glass(s, g, 1460, BASE, 56, 330, 0);
      // Стакан B переливают по-настоящему: его система координат — с началом в крае слива (правый верх),
      // вращение — вокруг этого края. Вода — прямоугольник в координатах кадра (поверхность всегда горизонтальна),
      // обрезанный внутренностью стакана; пока вода у края, всё, что выше края, «выливается» само.
      function TR(p, a) { return 'translate(' + p[0] + ' ' + p[1] + ') rotate(' + a + ')'; }
      var LIP0 = [1295, 530], LIP1 = [1447, 215], WTOP = BASE - 110;
      var defs = s.node(g, 'defs', {});
      var clip = s.node(defs, 'clipPath', { id: 'pour-b', clipPathUnits: 'userSpaceOnUse' });
      var cr = s.node(clip, 'rect', { x: -108, y: 0, width: 106, height: 168, transform: TR(LIP0, 0) });
      var wB = s.node(g, 'rect', { x: 900, y: WTOP, width: 900, height: 700, fill: WATER, 'clip-path': 'url(#pour-b)' });
      var gB = s.node(g, 'g', { transform: TR(LIP0, 0) });
      s.path(gB, 'M-110 0 V170 H0 V0', { stroke: INK, 'stroke-width': 3.5 });
      function moveB(t, p0, a0, p1, a1, dur, ease) {
        [cr, gB].forEach(function (e) { s.tween(e, t, { attr: { transform: TR(p0, a0) } }, { attr: { transform: TR(p1, a1) }, duration: dur, ease: ease }); });
      }
      s.tween([A.g, C.g], 0.6, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.25 });
      s.tween([gB, wB], 0.72, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      var task = s.text('label', '<span class="term">задача на сохранение<span class="en">conservation task</span></span>', { left: 1010, top: 740, fontSize: 30 });
      s.fade(task, 1.2, { y: 6 });
      // поднять → наклонить (вода доходит до края) → лить → вернуть пустым
      var dy = LIP1[1] - LIP0[1];
      moveB(2.3, LIP0, 0, LIP1, 0, 0.7, 'power2.inOut');
      s.tween(wB, 2.3, { attr: { y: WTOP } }, { attr: { y: WTOP + dy }, duration: 0.7, ease: 'power2.inOut' });
      moveB(3.0, LIP1, 0, LIP1, 48, 0.8, 'power1.in');
      s.tween(wB, 3.0, { attr: { y: WTOP + dy } }, { attr: { y: LIP1[1] }, duration: 0.8, ease: 'power1.in' });
      moveB(3.8, LIP1, 48, LIP1, 95, 1.2, 'sine.inOut');
      s.set(wB, 5.0, { attr: { y: LIP1[1] } }, { attr: { y: 2000 } });
      setLevel(s, C, 3.8, 0, 234, 1.05, 'sine.inOut');
      var stream = s.node(g, 'rect', { x: LIP1[0] - 3, y: LIP1[1] + 2, width: 7, height: 0, rx: 3.5, fill: WATER_D, opacity: 0 });
      s.tween(stream, 3.8, { opacity: 0 }, { opacity: 0.9, duration: 0.08 });
      s.tween(stream, 3.8, { attr: { height: 0 } }, { attr: { height: BASE - LIP1[1] - 2 }, duration: 0.12, ease: 'power2.in' });
      s.tween(stream, 3.92, { attr: { height: BASE - LIP1[1] - 2 } }, { attr: { height: BASE - 234 - LIP1[1] - 2 }, duration: 0.93, ease: 'sine.inOut' });
      s.tween(stream, 4.8, { opacity: 0.9 }, { opacity: 0, duration: 0.15 });
      moveB(5.15, LIP1, 95, LIP1, 0, 0.5, 'power2.inOut');
      moveB(5.65, LIP1, 0, LIP0, 0, 0.6, 'power2.inOut');

      // ребёнок смотрит с самого начала
      s.actor('baby', { x: 1720, y: 640, d: 104, o: 0 }, 0.6, 0.01);
      s.actor('baby', { o: 1 }, 0.7, 0.5);
      s.face('baby', true, 0.8, 0.3); s.mouth('baby', 'soft', 0.8, 0.01); s.gaze('baby', -9, 0, 0.8, 0.01);
      s.squash('baby', 0.95, 1.06, 1.6, 0.12); s.squash('baby', 1, 1, 1.72, 0.25, 'back.out(3)');
      s.squash('baby', 0.95, 1.06, 2.0, 0.12); s.squash('baby', 1, 1, 2.12, 0.25, 'back.out(3)');
      s.gaze('baby', -8, -7, 2.4, 0.4); s.gaze('baby', -9, -2, 4.6, 0.4);

      // вопрос зрителю — пауза — ответ дошкольника
      s.out(p0, 4.8, { dur: 0.4 });
      var qv = s.text('statement', 'А теперь?', { left: 140, top: 330, width: 780, fontSize: 60 });
      s.lines(qv, 5.2);
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

  // 2:00 — Три горы → где Макси будет искать шоколадку? (Х. Виммер, Й. Пернер, 1983)
  Film.scene({
    id: 'maxi', bars: 10,
    build: function (s) {
      var TOY = Film.toys, IC = Film.icons;
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
      s.sk(mt, [[1180, 640], [1270, 470], [1360, 640]], { at: 0.6, dur: 0.6, seed: 301, fill: '#EFE6D6' });
      s.sk(mt, [[1300, 640], [1420, 400], [1540, 640]], { at: 0.8, dur: 0.6, seed: 303, fill: '#F3ECDF' });
      s.sk(mt, [[1480, 640], [1550, 520], [1620, 640]], { at: 1.0, dur: 0.6, seed: 305, fill: '#EFE6D6' });
      s.sk(mt, [[1400, 418], [1420, 400], [1440, 418]], { at: 1.5, dur: 0.3, seed: 307, color: ORANGE, width: 5 });
      var doll = s.node(g0, 'circle', { cx: 1420, cy: 340, r: 16, fill: '#C9A27E', opacity: 0 });
      s.tween(doll, 1.6, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 });
      var dl = s.text('note', 'кукла', { left: 1450, top: 316, fontSize: 22 });
      s.fade(dl, 1.8, { y: 4 });
      s.gaze('baby', 6, -4, 2.6, 0.4);
      [h1, m1, mc, dl].forEach(function (e) { s.out(e, 4.3, { dur: 0.4 }); });
      s.out(mt, 4.3, { dur: 0.4 }); s.out(doll, 4.3, { dur: 0.4 });
      // ребёнок-испытуемый садится смотреть историю
      var OX = 1340, OY = 862;
      s.actor('baby', { x: OX, y: OY, d: 84 }, 4.4, 0.8, 'power3.inOut');
      s.gaze('baby', -4, -8, 4.6, 0.3);

      // Макси, шкафы, шоколадка
      var h2 = s.text('h2', 'Где Макси будет искать шоколадку?', { left: 140, top: 186, width: 1500 });
      s.lines(h2, 4.7);
      var g = s.svg(), ov = s.over();
      var CA = 1200, CB = 1480, CYB = 760;
      [CA, CB].forEach(function (x, i) {
        var c = TOY.cupboard(s, g, x, CYB, 150, 170, i ? '#DCE8F0' : '#F5E7BD', i ? '#4A7FB0' : '#A77A12');
        s.tween(c, 4.9 + i * 0.15, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 });
        var lb = s.text('label', 'шкаф ' + (i + 1), { left: x - 80, top: CYB + 20, width: 160, textAlign: 'center', fontSize: 24, color: '#5F676B' });
        s.fade(lb, 5.1 + i * 0.15, { y: 6 });
      });
      var choc = s.node(g, 'g', {});
      TOY.choc(s, choc, CA, 672, 0.8);
      s.set(choc, 0, { x: -150, y: -40, opacity: 0 }, { x: -150, y: -40, opacity: 0 });
      // Макси кладёт шоколадку в шкаф 1 и уходит
      var MX = 1040, MY = 650;
      s.actor('kid2', { x: MX - 160, y: MY, d: 96, o: 0 }, 4.9, 0.01);
      s.actor('kid2', { o: 1 }, 5.0, 0.35);
      s.face('kid2', true, 5.0, 0.3); s.mouth('kid2', 'smile', 5.0, 0.01); s.gaze('kid2', 8, 2, 5.0, 0.01);
      s.hop('kid2', MX, MY, 5.21, 0.42, 40);
      var mxl = s.text('label', 'Макси', { left: MX - 70, top: MY + 56, width: 140, textAlign: 'center', fontSize: 25 });
      s.fade(mxl, 5.5, { y: 6 }); s.out(mxl, 8.0, { dur: 0.3 });
      s.tween(choc, 5.8, { x: -150, y: -40, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
      // мысль Макси — рисованный слой: шоколадка в шкафу 1
      var th = s.node(ov, 'g', {});
      IC.cloud(s, th, MX, 440, 100, 64, { at: 6.8, dur: 0.7, seed: 311, tail: [MX, 598] });
      IC.choc(s, th, MX, 420, 0.62, { at: 7.25, dur: 0.4, seed: 315 });
      var tht = s.otext('label', 'в шкафу 1', { left: MX - 80, top: 452, width: 160, textAlign: 'center', fontSize: 21, color: DEEP });
      s.fade(tht, 7.5, { y: 4 });
      s.hop('kid2', MX - 160, MY, 8.0, 0.42, 30);
      s.actor('kid2', { o: 0 }, 8.4, 0.3);
      s.tween([th, tht], 8.0, { opacity: 1 }, { opacity: 0, duration: 0.4 });
      // мама перекладывает
      s.actor('adult', { x: 1790, y: 600, d: 136, o: 0 }, 8.2, 0.01);
      s.actor('adult', { x: 1670, o: 1 }, 8.3, 0.6, 'power3.out');
      var ml = s.text('label', 'мама', { left: 1600, top: 676, width: 140, textAlign: 'center', fontSize: 25 });
      s.fade(ml, 8.6, { y: 6 }); s.out(ml, 10.2, { dur: 0.3 });
      s.tween(choc, 9.0, { x: 0, y: 0 }, { x: (CB - CA) / 2, y: -80, duration: 0.5, ease: 'power2.out' });
      s.tween(choc, 9.5, { x: (CB - CA) / 2, y: -80 }, { x: CB - CA, y: 0, duration: 0.5, ease: 'power2.in' });
      s.actor('adult', { x: 1790, o: 0 }, 10.2, 0.5, 'power2.in');
      // Макси возвращается — в голове всё ещё шкаф 1
      s.actor('kid2', { x: MX - 160, o: 1 }, 10.4, 0.3);
      s.hop('kid2', MX, MY, 10.5, 0.42, 40);
      s.fade(mxl, 10.8, { y: 6 });
      s.tween([th, tht], 10.9, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      var q = s.text('statement', 'Где Макси будет искать?', { left: 140, top: 330, width: 640, fontSize: 52 });
      s.lines(q, 11.3);
      s.out(q, 12.4, { dur: 0.35 });

      // отвечать нужно за Макси, а не за себя
      var why = s.text('lead', 'Ребёнок видел всё. Но ответить нужно не за себя, а за Макси — из его головы.', { left: 140, top: 330, width: 800, fontSize: 32 });
      s.lines(why, 12.8, { stagger: 0.08 });
      var marks = s.svg();
      var a1 = s.text('body', '3 года: «В шкафу 2!» — там, где шоколадка на самом деле.', { left: 196, top: 470, width: 740, fontSize: 28 });
      var x1 = Film.cross(s, marks, 160, 490, RED);
      s.lines(a1, 14.0, { stagger: 0.07 }); s.draw(x1, 14.1, { dur: 0.3 });
      var a2 = s.text('body', '5 лет: «В шкафу 1!» — там, где её оставил Макси.', { left: 196, top: 556, width: 740, fontSize: 28 });
      var c2 = Film.check(s, marks, 160, 576, GREEN);
      s.lines(a2, 15.0, { stagger: 0.07 }); s.draw(c2, 15.1, { dur: 0.3 });
      var p1 = s.path(ov, 'M' + (OX + 30) + ' ' + (OY - 40) + ' Q' + (OX + 90) + ' ' + (OY - 70) + ' ' + (CB - 20) + ' ' + (CYB + 10), { stroke: RED, 'stroke-width': 3.5, 'stroke-dasharray': '5 9' });
      s.dash(p1, 14.0, { dur: 0.5 });
      var p2 = s.path(ov, 'M' + (OX - 30) + ' ' + (OY - 40) + ' Q' + (OX - 90) + ' ' + (OY - 70) + ' ' + (CA + 20) + ' ' + (CYB + 10), { stroke: GREEN, 'stroke-width': 3.5, 'stroke-dasharray': '5 9' });
      s.dash(p2, 15.0, { dur: 0.5 });
      s.gaze('baby', 5, -8, 14.0, 0.3); s.gaze('baby', -5, -8, 15.0, 0.3);
      [why, a1, a2, marks].forEach(function (e) { s.out(e, 16.2, { dur: 0.35 }); });
      s.out(p1, 16.2, { dur: 0.35 }); s.out(p2, 16.2, { dur: 0.35 });

      // ответы по возрасту (Х. Виммер, Й. Пернер, 1983)
      var cap = s.text('small-caps', 'Ответили верно — «в шкафу 1»', { left: 140, top: 330 });
      s.fade(cap, 16.4, { y: 6 });
      s.age(44, 16.4, 1.4);
      [['3–4 года', 0], ['4–6 лет', 57], ['6–9 лет', 86]].forEach(function (r, i) {
        var y = 380 + i * 64;
        var lb = s.text('label', r[0], { left: 140, top: y, fontSize: 26 });
        var bg = s.div('', { left: 300, top: y + 6, width: 400, height: 22, background: '#E7E2DA', borderRadius: '11px' });
        var b = s.div('', { left: 300, top: y + 6, width: Math.max(4, 4 * r[1]), height: 22, background: ORANGE, borderRadius: '11px' });
        var v = s.text('label', r[1] ? r[1] + ' %' : 'никто', { left: 716, top: y, fontSize: 26, color: DEEP });
        s.fade(lb, 16.5 + i * 0.35, { y: 6 }); s.fade(bg, 16.5 + i * 0.35, { y: 0 });
        s.grow(b, 16.6 + i * 0.35, { dur: 0.7 }); s.fade(v, 17.1 + i * 0.35, { y: 0 });
      });
      var wc = s.text('cite', 'Х. Виммер, Й. Пернер, 1983', { left: 140, top: 580 });
      s.fade(wc, 17.8, { y: 6 });
      var term = s.text('h3 acc', '<span class="term">теория психического<span class="en">theory of mind</span></span>', { left: 140, top: 640 });
      s.fade(term, 18.6, { y: 10 });
      var meta = s.text('body', 'Метаанализ 178 исследований: перелом — около 4 лет; форма задачи сдвигает кривую, но не меняет её (Г. Уэллман и др., 2001).', { left: 140, top: 748, width: 820, fontSize: 25 });
      s.lines(meta, 19.4, { stagger: 0.07 });
      s.actor('kid2', { o: 0 }, 24.1, 0.4);
    }
  });

})();
