/* Часть 1. Встреча с миром · 0–3 мес */
/* global Film */
(function () {
  'use strict';

  function chapterCard(s, n, title, range) {
    var num = s.text('display acc', String(n), { left: 140, top: 262, fontSize: 250, lineHeight: 1 });
    s.pop(num, 0.02, { from: 0.8, dur: 0.9 });
    var t = s.text('h1', title, { left: 330, top: 318, width: 1300 });
    s.lines(t, 0.12, { dur: 1.0 });
    var r = s.text('small-caps', range, { left: 336, top: 438 });
    s.fade(r, 0.35, { y: 8 });
  }
  Film.chapterCard = chapterCard;

  // 0:12,5 — заставка части
  Film.scene({
    id: 'ch1', bars: 1,
    build: function (s) {
      chapterCard(s, 1, 'Встреча с миром', '0–3 месяца');
      s.range(0, 3, 0.15, 1.3);
      s.chapter(1, 'Встреча с миром', 0.4, 57.5);
    }
  });

  // 0:15 — Врождённые рефлексы: «срок жизни» по шкале месяцев
  Film.scene({
    id: 'reflexes', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Новорождённость', { left: 140, top: 150 });
      s.fade(k, 0.15, { y: 8 });
      var h = s.text('h2', 'Врождённые рефлексы', { left: 140, top: 186, width: 1400 });
      s.lines(h, 0.25);

      var g = s.svg();
      [0, 3, 6, 9, 12].forEach(function (m, i) {
        var p = s.path(g, 'M' + s.mx(m) + ' 322 V' + (s.RY - 26), { stroke: '#E2DBD0', 'stroke-width': 2, 'stroke-dasharray': '2 12' });
        s.fade(p, 0.7 + i * 0.06, { y: 0, dur: 0.6 });
      });

      var rows = [
        { n: 'Шаговый', a: 1.5, b: 2, age: 'угасает к 1,5–2 мес' },
        { n: 'Поисковый', a: 3, b: 4, age: 'к 3–4 мес' },
        { n: 'Хватательный', a: 3, b: 4, age: 'к 3–4 мес' },
        { n: 'Моро', a: 4, b: 5, age: 'к 4–5 мес' },
        { n: 'Бабинского', a: 12, b: 12, age: 'сохраняется до 1–2 лет', long: true }
      ];
      rows.forEach(function (r, i) {
        var y = 340 + i * 92, t = 1.2 + i * 0.42;
        var x0 = s.mx(0), solid = s.mx(r.a) - x0, full = s.mx(r.b) - x0;
        var bar = s.div(null, { left: x0, top: y, width: r.long ? (s.X1 - x0 + 36) : full, height: 54, borderRadius: 27 });
        bar.style.background = r.long
          ? 'linear-gradient(90deg, #F6D5CB 0, #F6D5CB ' + (s.X1 - x0 - 40) + 'px, rgba(246,213,203,0.35) ' + (s.X1 - x0 + 36) + 'px)'
          : 'linear-gradient(90deg, #F6D5CB 0, #F6D5CB ' + solid + 'px, rgba(246,213,203,0) ' + full + 'px)';
        s.grow(bar, t, { dur: 1.1, ease: 'power3.inOut' });
        var lab = s.text('label', r.n, { left: x0 + 24, top: y + 12, color: '#1D2733' });
        s.fade(lab, t + 0.35, { y: 0, x: -8, dur: 0.6 });
        if (r.long) {
          var ag = s.text('note', r.age, { left: s.X1 - 460, top: y + 12, width: 440, textAlign: 'right', color: '#B8533D', fontWeight: 650 });
          s.fade(ag, t + 0.9, { y: 0, x: -8, dur: 0.6 });
        } else {
          var ag2 = s.text('note', r.age, { left: x0 + full + 18, top: y + 13, whiteSpace: 'nowrap' });
          s.fade(ag2, t + 0.9, { y: 0, x: -8, dur: 0.6 });
        }
      });

      var c = s.text('lead', 'На смену рефлексам приходят <span class="acc">произвольные движения</span>.', { left: 140, top: 818, width: 1640 });
      s.lines(c, 6.4);
    }
  });
  // 0:27,5 — Как изучают младенцев
  Film.scene({
    id: 'methods', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Методы исследования', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Как спросить того, кто ещё не говорит?', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);

      var INK = '#1D2733', MUTE = '#B9B2A8';
      // ── Карточка 1: взгляд ──
      var c1 = s.div('card', { left: 140, top: 322, width: 790, height: 540 });
      s.fade(c1, 0.8, { y: 24 });
      var c2 = s.div('card', { left: 990, top: 322, width: 790, height: 540 });
      s.fade(c2, 4.5, { y: 24 });
      var k1 = s.text('kicker muted', 'Взгляд', { left: 190, top: 364 });
      s.fade(k1, 1.0, { y: 6 });
      var g = s.svg();
      var cx = [300, 500, 700], cy = 488, r = 60;
      var face = s.node(g, 'g', {});
      s.node(face, 'circle', { cx: cx[0], cy: cy, r: r, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      s.node(face, 'circle', { cx: cx[0] - 21, cy: cy - 12, r: 7, fill: INK });
      s.node(face, 'circle', { cx: cx[0] + 21, cy: cy - 12, r: 7, fill: INK });
      s.path(face, 'M' + (cx[0] - 22) + ' ' + (cy + 20) + ' Q' + cx[0] + ' ' + (cy + 36) + ' ' + (cx[0] + 22) + ' ' + (cy + 20), { stroke: INK, 'stroke-width': 4 });
      var eye = s.node(g, 'g', {});
      [60, 40, 20].forEach(function (rr, i) { s.node(eye, 'circle', { cx: cx[1], cy: cy, r: rr, fill: i === 2 ? INK : '#FFFDF8', stroke: INK, 'stroke-width': 3 }); });
      var news = s.node(g, 'g', {});
      var defs = s.node(g, 'defs', {});
      var cp = s.node(defs, 'clipPath', { id: 'clip-news' });
      s.node(cp, 'circle', { cx: cx[2], cy: cy, r: r - 2 });
      s.node(news, 'circle', { cx: cx[2], cy: cy, r: r, fill: '#FFFDF8', stroke: INK, 'stroke-width': 3 });
      var nl = s.node(news, 'g', { 'clip-path': 'url(#clip-news)' });
      [-36, -18, 0, 18, 36].forEach(function (dy, i) {
        s.path(nl, 'M' + (cx[2] - 70) + ' ' + (cy + dy) + ' H' + (cx[2] + (i % 2 ? 28 : 70)), { stroke: INK, 'stroke-width': 5, 'stroke-dasharray': i % 2 ? '14 6 22 6' : '26 7 12 7' });
      });
      s.pop([face, eye, news], 1.25, { stagger: 0.15, from: 0.7 });
      var bw = [150, 78, 56];
      bw.forEach(function (w, i) {
        var b = s.node(g, 'rect', { x: cx[i] - 75, y: cy + 88, width: w, height: 14, rx: 7, fill: i === 0 ? '#2E7D32' : MUTE });
        s.grow(b, 2.1 + i * 0.18, { dur: 1.0 });
      });
      var nb = s.text('note', 'полоса — сколько младенец смотрит', { left: 225, top: 600, fontSize: 22 });
      s.fade(nb, 2.7, { y: 6 });
      var t1 = s.text('lead', 'Дольше рассматривают лицо, чем другие узоры.', { left: 190, top: 668, width: 700, fontSize: 36 });
      s.lines(t1, 3.0);
      var ci1 = s.text('cite', 'Р. Фанц, 1961', { left: 190, top: 790 });
      s.fade(ci1, 3.6, { y: 6 });

      // ── Карточка 2: сосание ──
      var k2 = s.text('kicker muted', 'Сосание', { left: 1040, top: 364 });
      s.fade(k2, 4.7, { y: 6 });
      var pac = s.node(g, 'g', {});
      s.node(pac, 'circle', { cx: 1092, cy: 492, r: 18, fill: 'none', stroke: INK, 'stroke-width': 4 });
      s.node(pac, 'rect', { x: 1106, y: 456, width: 26, height: 72, rx: 13, fill: '#FFFDF8', stroke: INK, 'stroke-width': 4 });
      s.path(pac, 'M1132 478 Q1178 470 1182 492 Q1178 514 1132 506', { stroke: INK, 'stroke-width': 4, fill: '#F6D5CB' });
      s.pop(pac, 4.95, { from: 0.7 });
      var arr = s.path(g, 'M1204 492 H1232', { stroke: '#8A8F90', 'stroke-width': 3 });
      var arrH = s.path(g, 'M1224 484 L1234 492 L1224 500', { stroke: '#8A8F90', 'stroke-width': 3 });
      s.draw(arr, 5.25, { dur: 0.4 }); s.fade(arrH, 5.5, { y: 0, dur: 0.3 });
      var H1 = [18, 34, 52, 30, 62, 44, 24, 50, 66, 38, 22, 46, 30, 16];
      var H2 = [10, 16, 24, 14, 26, 18, 12, 22, 28, 16, 10, 20, 14, 8];
      var barsA = [], barsB = [];
      H1.forEach(function (hh, i) {
        barsA.push(s.node(g, 'rect', { x: 1256 + i * 16, y: 452 - hh / 2, width: 8, height: hh, rx: 4, fill: '#2E7D32' }));
        barsB.push(s.node(g, 'rect', { x: 1256 + i * 16, y: 552 - H2[i] / 2, width: 8, height: H2[i], rx: 4, fill: MUTE }));
      });
      s.growY(barsA, 5.55, { stagger: 0.035, origin: '50% 50%', dur: 0.6 });
      s.growY(barsB, 5.85, { stagger: 0.035, origin: '50% 50%', dur: 0.6 });
      var la = s.text('label acc', 'голос мамы', { left: 1492, top: 436, fontSize: 26 });
      var lb = s.text('label soft', 'другой голос', { left: 1492, top: 536, fontSize: 26 });
      s.fade([la, lb], 6.1, { y: 0, x: -8, stagger: 0.25 });
      var t2 = s.text('lead', 'Меняют ритм сосания, чтобы слышать голос мамы.', { left: 1040, top: 668, width: 700, fontSize: 36 });
      s.lines(t2, 6.6);
      var ci2 = s.text('cite', 'Э. ДеКаспер, У. Файфер, 1980', { left: 1040, top: 790 });
      s.fade(ci2, 7.2, { y: 6 });
    }
  });

  // 0:40 — Главное противоречие (Выготский)
  Film.scene({
    id: 'paradox', bars: 4,
    build: function (s) {
      s.actor('baby', { x: 1690, y: 560, d: 96, o: 1 }, 0.15, 1.5);
      s.actor('adult', { x: 1350, y: 560, d: 170, o: 1 }, 0.35, 1.3);

      var k = s.text('kicker', 'Главное противоречие младенчества', { left: 140, top: 250 });
      s.fade(k, 0.3, { y: 8 });
      var st = s.text('statement', '<span class="acc">Максимальная социальность</span> — при минимальных возможностях общения', { left: 140, top: 292, width: 1000 });
      s.lines(st, 0.5, { stagger: 0.11 });
      var rule = s.div('rule', { left: 140, top: 556, width: 44 });
      s.grow(rule, 1.6, { dur: 0.6 });
      var ci = s.text('cite', 'Л. С. Выготский', { left: 200, top: 541 });
      s.fade(ci, 1.75, { y: 0, x: -8 });
      var ex = s.text('lead', 'Всё, что нужно младенцу, приходит к нему через взрослого.', { left: 140, top: 660, width: 900 });
      s.lines(ex, 5.0);

      var g = s.svg();
      var offs = [-120, -60, 0, 60, 120], bundle = [];
      offs.forEach(function (o) {
        var y0 = 560 + o * 0.62, x0 = 1350 + Math.sqrt(Math.max(0, 85 * 85 - (o * 0.62) * (o * 0.62))) + 8;
        bundle.push(s.path(g, 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' C1540 ' + (560 + o * 0.62) + ' 1560 560 1634 560', { stroke: '#385771', 'stroke-width': 2.5, opacity: 0.85 }));
      });
      bundle.forEach(function (p, i) { s.draw(p, 2.0 + i * 0.12, { dur: 1.0 }); });
      var bl = s.text('note', 'уход · пища · тепло · впечатления · общение', { left: 1200, top: 386, width: 640, textAlign: 'center', color: '#385771', fontWeight: 650, fontSize: 23 });
      s.fade(bl, 2.9, { y: 8 });
      var back = s.path(g, 'M1690 614 Q1530 740 1370 648', { stroke: '#E4735A', 'stroke-width': 2.5, 'stroke-dasharray': '3 9' });
      s.dash(back, 3.8, { dur: 1.0 });
      var bb = s.text('note', 'крик · взгляд', { left: 1360, top: 716, width: 340, textAlign: 'center', color: '#B8533D', fontWeight: 650, fontSize: 23 });
      s.fade(bb, 4.3, { y: 8 });
    }
  });

  // 0:50 — Комплекс оживления (~2–3 мес)
  Film.scene({
    id: 'komplex', bars: 5,
    build: function (s) {
      s.age(2.5, 0.2, 1.4);
      s.event('~2–3 мес', 2.5, 0.5);
      s.actor('baby', { x: 1250, y: 560, d: 130 }, 0.1, 1.3);
      s.actor('adult', { x: 1650, y: 540, d: 170 }, 0.1, 1.3);
      s.face('adult', true, 1.1); s.mouth('adult', 'soft', 1.1, 0.01);

      var k = s.text('kicker', '~2–3 месяца', { left: 140, top: 300 });
      s.fade(k, 0.3, { y: 8 });
      var h = s.text('h2', 'Комплекс оживления', { left: 140, top: 336, width: 900 });
      s.lines(h, 0.45);
      var ex = s.text('lead', 'Кризис новорождённости завершён — начинается <span class="acc">младенчество</span>.', { left: 140, top: 474, width: 820 });
      s.lines(ex, 6.0);
      var nt = s.text('note', 'Описан Н. Л. Фигуриным и М. П. Денисовой', { left: 140, top: 642, width: 820 });
      s.fade(nt, 7.0, { y: 6 });

      var g = s.svg();
      // 1. сосредоточение взгляда
      var gz = s.path(g, 'M1326 540 H1560', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '2 11' });
      s.dash(gz, 1.9, { dur: 0.8 });
      s.gaze('baby', 5, -2, 1.9, 0.5);
      var l1 = s.text('label', 'сосредоточение взгляда', { left: 1300, top: 470, width: 290, textAlign: 'center', fontSize: 24 });
      s.fade(l1, 2.2, { y: 6 });
      // 2. улыбка
      s.face('baby', true, 2.9, 0.5); s.mouth('baby', 'smile', 2.9, 0.01);
      var l2 = s.text('label', 'улыбка', { left: 1150, top: 646, width: 200, textAlign: 'center', fontSize: 24 });
      s.fade(l2, 3.1, { y: 6 });
      // 3. двигательное оживление
      var mv = [
        s.path(g, 'M1178 470 Q1162 452 1170 430', { stroke: '#E4735A', 'stroke-width': 3.5 }),
        s.path(g, 'M1204 452 Q1196 430 1210 412', { stroke: '#E4735A', 'stroke-width': 3.5 }),
        s.path(g, 'M1156 520 Q1134 512 1122 492', { stroke: '#E4735A', 'stroke-width': 3.5 })
      ];
      mv.forEach(function (p, i) { s.draw(p, 3.8 + i * 0.12, { dur: 0.5 }); });
      var l3 = s.text('label', 'оживлённые движения', { left: 1050, top: 368, width: 300, textAlign: 'center', fontSize: 24 });
      s.fade(l3, 4.0, { y: 6 });
      // 4. гуление
      var snd = [18, 30, 42].map(function (rr) {
        return s.path(g, 'M' + (1330 + rr * 0.5) + ' ' + (590 - rr * 0.55) + ' Q' + (1330 + rr) + ' 590 ' + (1330 + rr * 0.5) + ' ' + (590 + rr * 0.55), { stroke: '#E4735A', 'stroke-width': 3 });
      });
      snd.forEach(function (p, i) { s.draw(p, 4.7 + i * 0.14, { dur: 0.45 }); });
      var l4 = s.text('label', 'гуление', { left: 1350, top: 598, width: 200, textAlign: 'center', fontSize: 24 });
      s.fade(l4, 4.9, { y: 6 });
      // «вспышка» оживления
      var halo = s.node(g, 'circle', { cx: 1250, cy: 560, r: 70, fill: 'none', stroke: '#E4735A', 'stroke-width': 3 });
      s.tween(halo, 5.4, { attr: { r: 70 }, opacity: 0.7 }, { attr: { r: 118 }, opacity: 0, duration: 1.4, ease: 'power2.out' });
      s.set(halo, 0, { opacity: 0 }, { opacity: 0 });
    }
  });

  // 1:02,5 — Ведущая деятельность (Эльконин)
  Film.scene({
    id: 'leading', bars: 3,
    build: function (s) {
      s.actor('baby', { x: 1320, y: 560, d: 120 }, 0.0, 1.0);
      s.actor('adult', { x: 1650, y: 540, d: 170 }, 0.0, 1.0);
      s.mouth('adult', 'smile', 0.6, 0.5);
      s.gaze('baby', 6, -2, 0.2, 0.4);
      var k = s.text('kicker', 'Ведущая деятельность · Д. Б. Эльконин', { left: 140, top: 250 });
      s.fade(k, 0.15, { y: 8 });
      var st = s.text('statement', 'Непосредственно-эмоциональное общение со взрослым', { left: 140, top: 290, width: 1040, fontWeight: 600 });
      s.lines(st, 0.3, { stagger: 0.1 });
      var ld = s.text('lead', 'Ребёнку нужен не только уход, но и <span class="acc">отклик</span>: лицо, голос, ответная улыбка.', { left: 140, top: 560, width: 900 });
      s.lines(ld, 1.8);
      var g = s.svg();
      var a1 = s.path(g, 'M1590 470 Q1490 392 1386 476', { stroke: '#385771', 'stroke-width': 3 });
      var a2 = s.path(g, 'M1384 640 Q1490 716 1592 628', { stroke: '#E4735A', 'stroke-width': 3, 'stroke-dasharray': '3 9' });
      s.draw(a1, 1.2, { dur: 0.9 }); s.dash(a2, 1.6, { dur: 0.9 });
      // конец части 1: ребёнок возвращается на шкалу (3 мес)
      s.age(3, 5.6, 1.0);
      s.face('baby', false, 5.9, 0.4);
      s.actor('adult', { o: 0, d: 130 }, 6.0, 0.9, 'power2.in');
      s.rest(5.9, 1.4);
    }
  });
})();
