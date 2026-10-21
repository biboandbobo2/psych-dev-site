/* Глава 3. Помнить нарочно · Дима (v3.2, «Язык 7–10»): шлем космонавта (Флейвелл, 1966; Эллиотт, 2021), шахматная дуэль (Чи, 1978) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', WOOD = '#E9D9BF', FLOOR = '#C9BBA2', PAPER = '#FFFDF8', GLASS = '#E8F1EE', RED = '#D9534F', TEAL = '#26A69A';
  var LEN = 50; // длина главы — для подписи в углу

  // ---------- общее для главы ----------
  function L(w, fill) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function ln(s, g, d, w, c) { return s.path(g, d, { stroke: c || INK, 'stroke-width': w || 3 }); }
  function txt(s, g, x, y, text, size, o) {
    o = o || {};
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', fill: o.color || INK, style: 'font-family: var(--kid); font-weight: ' + (o.weight || 700) + '; font-size: ' + (size || 32) + 'px' });
    t.textContent = text; return t;
  }
  function on(s, who, x, y, d, lt, o) {
    var id = K().cast(s, who, x, y, d, lt, o);
    s.brow(id, (o && o.brow) || 'calm', 0, 0.01); s.hands(id, 'off', 0, 0.01);
    return id;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); s.hands(id, 'off', s.dur - 0.4, 0.3); }); }
  function fadeIn(s, e, lt, dur) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: dur || 0.3 }); }
  function fadeOut(s, e, lt, dur) { s.tween(e, lt, { opacity: 1 }, { opacity: 0, duration: dur || 0.3 }); }
  function concl(s, text, lt) {
    var e = s.text('h3', '<span class="acc">Вывод:</span> ' + text, { left: 140, top: 930, width: 1640, fontSize: 42 });
    s.lines(e, lt);
    return e;
  }
  function cite(s, text, lt) { var e = s.text('cite', text, { left: 140, top: 1012, width: 1640, fontSize: 20 }); s.fade(e, lt, { y: 4 }); return e; }
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  // шёпот: губы шевелятся
  function whisper(s, id, t0, t1) { for (var t = t0, k = 0; t < t1; t += 0.22, k++) s.mouth(id, k % 2 ? 'flat' : 'soft', t, 0.1); s.mouth(id, 'soft', t1, 0.15); }

  // Заставка главы: карта трёх дорожек (places.paths), трое идут дальше к школе; дорожка героя главы — в его цвете, герой крупнее
  function trio(s, n, title, sub, who, t0, t1) {
    s.chapterCard(n, title, sub);
    var g0 = s.svg(), G = 600;
    s.node(g0, 'rect', { x: 0, y: G, width: 100, height: 1080 - G, fill: '#ECE3CF' }); s.path(g0, 'M0 ' + G + ' H100', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
    var g = s.node(g0, 'g', { transform: 'translate(70 0)' }), p = P().paths(s, g, { ground: G }); // карта сдвинута вправо: школа не задевает название главы
    var hot = s.path(g, p.paths[who].d, { stroke: K().KIDC[who], 'stroke-width': 6 });
    s.draw(hot, 0.2, { dur: 1.8 });
    var ids = [];
    ['misha', 'anya', 'dima'].forEach(function (w) {
      var q = p.paths[w], el = s.path(g, q.d, { stroke: 'none' }), len = el.getTotalLength(), base = w === who ? 124 : 88;
      var at = function (t) { t -= w === who ? 0 : 0.13; var pt = el.getPointAtLength(len * t), k = q.k + (0.8 - q.k) * t, d = base * k; return { x: pt.x, y: pt.y - d / 2, d: d }; };
      var a = at(t0), id = on(s, w, a.x + 70, a.y, a.d, 0.1, { gx: 6, dur: 0.3, mouth: w === who ? 'smile' : 'soft' });
      for (var i = 1; i <= 4; i++) {
        var b = at(t0 + (t1 - t0) * i / 4), t = 0.5 + (i - 1) * 0.95;
        b.x += 70; s.squash(id, 1.05, 0.95, t, 0.1); s.actor(id, b, t + 0.1, 0.6, 'power1.inOut'); s.squash(id, 1, 1, t + 0.1, 0.25);
      }
      ids.push(id);
    });
    s.hands(K().CAST[who][0], 'side', 0.6, 0.3);
    castOut(s, ids);
    s.chapter(n, title, 0.4, LEN - 0.6);
  }

  // 3:12,5 — заставка главы (20 тактов = 50 с)
  Film.scene({
    id: 'ch3', bars: 2,
    build: function (s) { trio(s, 3, 'Помнить нарочно', 'Дима сильный, но один — хочет, чтобы его позвали играть', 'dima', 0.6, 0.7); }
  });

  // ---------- «Шлем космонавта» ----------
  // картинки для опыта Флейвелла
  function pic(s, g, kind, x, y, k) {
    var c = s.node(g, 'g', {}), X = function (v) { return x + v * k; }, Y = function (v) { return y + v * k; };
    if (kind === 'ball') K().ball(s, c, x, y, 26 * k);
    else if (kind === 'tree') P().tree(s, c, x, Y(36), 0.3 * k);
    else if (kind === 'house') P().house(s, c, x, Y(32), 0.34 * k);
    else if (kind === 'fish') s.path(c, 'M' + X(-30) + ' ' + y + ' Q' + X(-6) + ' ' + Y(-22) + ' ' + X(16) + ' ' + y + ' Q' + X(-6) + ' ' + Y(22) + ' ' + X(-30) + ' ' + y + ' Z M' + X(16) + ' ' + y + ' L' + X(32) + ' ' + Y(-14) + ' L' + X(32) + ' ' + Y(14) + ' Z', L(2.6, '#BFDCE5'));
    else if (kind === 'cube') s.node(c, 'rect', Object.assign({ x: X(-22), y: Y(-22), width: 44 * k, height: 44 * k, rx: 3 }, L(2.6, '#F5D27A')));
    else if (kind === 'pyramid') s.path(c, 'M' + x + ' ' + Y(-28) + ' L' + X(26) + ' ' + Y(24) + ' L' + X(-26) + ' ' + Y(24) + ' Z', L(2.6, '#F2A39E'));
    else if (kind === 'arrow') s.path(c, 'M' + x + ' ' + Y(28) + ' V' + Y(-26) + ' M' + X(-20) + ' ' + Y(-6) + ' L' + x + ' ' + Y(-26) + ' L' + X(20) + ' ' + Y(-6), { stroke: INK, 'stroke-width': 4 });
    return c;
  }
  // экспериментатор — взрослый общественного мира: вытянутая капсула, как учитель, но другого цвета; лицо серии
  function grownup(s, g, x, floor, d, color) {
    var top = floor - 1.9 * d, G = s.node(g, 'g', { transform: 'translate(' + (x - d / 2) + ' ' + top + ') scale(' + (d / 100) + ')' });
    s.node(G, 'rect', { x: 0, y: 0, width: 100, height: 190, rx: 50, fill: color });
    var face = s.node(G, 'g', {}), W = '#FFFDF8';
    s.node(face, 'circle', { cx: 38, cy: 45, r: 4.6, fill: W }); s.node(face, 'circle', { cx: 62, cy: 45, r: 4.6, fill: W });
    s.path(face, 'M36 59 Q50 71 64 59', { stroke: W, 'stroke-width': 4.2 });
    var bl = s.path(face, 'M31 33 Q38 30 45 32', { stroke: W, 'stroke-width': 3.2 }), br = s.path(face, 'M55 32 Q62 30 69 33', { stroke: W, 'stroke-width': 3.2 });
    var hc = '#56697A', hl = s.node(G, 'circle', { cx: -6, cy: 116, r: 12, fill: hc }), hr = s.node(G, 'circle', { cx: 106, cy: 116, r: 12, fill: hc });
    return { g: G, face: face, bl: bl, br: br, hl: hl, hr: hr };
  }
  // шлем космонавта вокруг героя: стекло, блик, антенна, тёмный козырёк (поднят). Низ шлема прячется за столом (clip до yCut)
  function helmet(s, ov, cx, cy, R, yCut, n) {
    var defs = s.node(ov, 'defs', {});
    var cp = s.node(defs, 'clipPath', { id: 'hcut' + n }); s.node(cp, 'rect', { x: 0, y: 0, width: 1920, height: yCut });
    var cg = s.node(defs, 'clipPath', { id: 'hglass' + n }); s.node(cg, 'circle', { cx: cx, cy: cy, r: R - 3 });
    var wrap = s.node(ov, 'g', { 'clip-path': 'url(#hcut' + n + ')' }), h = s.node(wrap, 'g', {});
    s.node(h, 'circle', { cx: cx, cy: cy, r: R, fill: GLASS, opacity: 0.3 });
    var inner = s.node(h, 'g', { 'clip-path': 'url(#hglass' + n + ')' });
    var visor = s.node(inner, 'rect', { x: cx - R, y: cy - R - 4, width: 2 * R, height: 59, fill: '#2F3E4A' });
    s.node(h, 'circle', Object.assign({ cx: cx, cy: cy, r: R }, L(4, 'none')));
    s.path(h, 'M' + (cx + R * 0.35) + ' ' + (cy + R * 0.62) + ' Q' + (cx + R * 0.62) + ' ' + (cy + R * 0.45) + ' ' + (cx + R * 0.74) + ' ' + (cy + R * 0.2), { stroke: '#FFFDF8', 'stroke-width': 5, opacity: 0.9 });
    ln(s, h, 'M' + cx + ' ' + (cy - R) + ' v-28', 3.4);
    s.node(h, 'circle', Object.assign({ cx: cx, cy: cy - R - 34, r: 8 }, L(2.4, RED)));
    return { g: h, visor: visor, up: cy - R - 4, down: cy - 50 };
  }
  // облачко-ответ с тремя картинками (хвостик — к герою)
  function answer(s, ov, cx, top, kinds, ok, t) {
    var a = s.node(ov, 'g', {}), w = 300, h = 96;
    s.path(a, 'M' + (cx - w / 2 + 22) + ' ' + top + ' H' + (cx + w / 2 - 22) + ' Q' + (cx + w / 2) + ' ' + top + ' ' + (cx + w / 2) + ' ' + (top + 22) + ' V' + (top + h - 22) + ' Q' + (cx + w / 2) + ' ' + (top + h) + ' ' + (cx + w / 2 - 22) + ' ' + (top + h) +
      ' H' + (cx + 14) + ' L' + (cx - 4) + ' ' + (top + h + 26) + ' L' + (cx - 14) + ' ' + (top + h) + ' H' + (cx - w / 2 + 22) + ' Q' + (cx - w / 2) + ' ' + (top + h) + ' ' + (cx - w / 2) + ' ' + (top + h - 22) + ' V' + (top + 22) + ' Q' + (cx - w / 2) + ' ' + top + ' ' + (cx - w / 2 + 22) + ' ' + top + ' Z', L(2.6, PAPER));
    kinds.forEach(function (kd, j) {
      var q = kd === '?' ? txt(s, a, cx + 90, top + 68, '?', 54, { color: RED }) : pic(s, a, kd, cx - 90 + j * 90, top + h / 2, 0.62);
      s.tween(q, t + 0.25 + j * 0.3, { opacity: 0 }, { opacity: 1, duration: 0.15 });
    });
    s.tween(a, t, { opacity: 0, scale: 0.7, svgOrigin: cx + ' ' + (top + h) }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    if (ok) { var ck = s.path(a, 'M' + (cx + w / 2 + 16) + ' ' + (top + 50) + ' l14 16 l28 -32', { stroke: TEAL, 'stroke-width': 7 }); s.draw(ck, t + 1.2, { dur: 0.25 }); }
    return a;
  }

  // 3:17,5 — Шлем космонавта (Дж. Флейвелл и др., 1966; Э. Эллиотт и др., 2021)
  Film.scene({
    id: 'helmet', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over(), F = 900, TB = 700, TF = 830;
      // комната: пол, окно; стол — вид спереди, дети сидят за ним
      ln(s, g, 'M60 ' + F + ' H1860', 2.4, FLOOR);
      s.node(g, 'rect', Object.assign({ x: 1700, y: 280, width: 160, height: 180, rx: 6 }, L(3, GLASS)));
      ln(s, g, 'M1780 280 V460 M1700 370 H1860', 2.4);
      var tbl = s.node(g, 'g', {});
      s.path(tbl, 'M470 ' + TB + ' L1630 ' + TB + ' L1690 ' + TF + ' L410 ' + TF + ' Z', L(2.6, WOOD));
      s.node(tbl, 'rect', Object.assign({ x: 410, y: TF, width: 1280, height: 14 }, L(2.6, WOOD)));
      ln(s, tbl, 'M440 ' + (TF + 14) + ' V' + F + ' M1660 ' + (TF + 14) + ' V' + F, 2.6);
      // ряд из семи картинок на столе
      var ORDER = ['tree', 'ball', 'fish', 'cube', 'house', 'pyramid', 'arrow'], CX = function (i) { return 520 + i * 175; }, CT = 715;
      var cards = ORDER.map(function (kd, i) {
        var c = s.node(g, 'g', {});
        s.node(c, 'rect', Object.assign({ x: CX(i) - 55, y: CT, width: 110, height: 100, rx: 10 }, L(2.2, PAPER)));
        pic(s, c, kd, CX(i), CT + 50, 1.05);
        s.tween(c, 0.3 + i * 0.06, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
        return c;
      });
      // экспериментатор и дети
      var EX = 300, ex = grownup(s, g, EX, F, 150, '#7A8E9E');
      fadeIn(s, ex.g, 0.2, 0.4);
      var et = s.text('tag', 'экспериментатор', { left: EX - 160, top: F - 1.9 * 150 - 46, width: 320 });
      s.fade(et, 0.6, { y: 4 }); s.out(et, 4.6, { dur: 0.3 });
      var DX = 700, MX = 1250, KY = TB - 75;
      on(s, 'dima', DX, KY, 150, 0.3, { gx: 0, gy: 6 });
      on(s, 'misha', MX, KY, 150, 0.4, { gx: -2, gy: 6 });
      hudText(s, 'lead', 'Опыт Дж. Флейвелла: детям показывают картинки и просят запомнить порядок.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 0.3, 5.4);
      // показывает три: мяч, дом, рыба — по порядку
      var rings = [];
      [1, 4, 2].forEach(function (ci, j) {
        var t = 1.3 + j * 0.8;
        s.tween(cards[ci], t, { y: 0 }, { y: -16, duration: 0.2, ease: 'power2.out' });
        s.tween(cards[ci], t + 0.5, { y: -16 }, { y: 0, duration: 0.25, ease: 'power2.in' });
        var b = s.div('num-badge', { left: CX(ci) + 22, top: CT + 66 }, null, String(j + 1));
        s.pop(b, t + 0.15, { from: 0.5, dur: 0.3 });
        rings.push(b);
        s.tween(ex.hr, t - 0.1, { attr: { cx: 106, cy: 116 } }, { attr: { cx: 122, cy: 96 }, duration: 0.2 });
        s.tween(ex.hr, t + 0.5, { attr: { cx: 122, cy: 96 } }, { attr: { cx: 106, cy: 116 }, duration: 0.2 });
        s.gaze('kid3', (CX(ci) - DX) / 70, 7, t, 0.2); s.gaze('baby', (CX(ci) - MX) / 70, 7, t, 0.2);
      });
      s.tween(ex.face, 1.2, { x: 0, y: 0 }, { x: 8, y: 6, duration: 0.3 });
      s.tween(rings, 5.0, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      s.brow('kid3', 'focus', 1.3, 0.3); s.brow('baby', 'calm', 1.3, 0.3);
      // шлемы надевают; тёмный козырёк опускается и закрывает глаза — губы видно
      var hd = helmet(s, ov, DX, KY, 98, TB, 1), hm = helmet(s, ov, MX, KY, 98, TB, 2);
      s.tween([hd.g, hm.g], 5.3, { opacity: 0, y: -80 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' });
      s.gaze('kid3', 0, 0, 5.4, 0.2); s.gaze('baby', 0, 0, 5.4, 0.2);
      [hd, hm].forEach(function (h) { s.tween(h.visor, 6.0, { attr: { y: h.up } }, { attr: { y: h.down }, duration: 0.4, ease: 'power2.in' }); });
      hudText(s, 'lead', 'Шлем закрывает глаза, а губы видно: так заметно, повторяет ли ребёнок про себя.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 5.6, 12.0);
      var sec = s.text('kidhand', '15 секунд', { left: 875, top: 455, width: 250, textAlign: 'center', fontSize: 40, color: 'var(--accent-deep)' });
      s.fade(sec, 6.3, { y: 0 }); s.out(sec, 10.9, { dur: 0.3 });
      // наблюдатель смотрит на губы; наезд: Дима шепчет, Миша молчит
      s.tween(ex.face, 6.6, { x: 8, y: 6 }, { x: 9, y: 2, duration: 0.3 });
      s.tween(ex.bl, 6.6, { attr: { d: 'M31 33 Q38 30 45 32' } }, { attr: { d: 'M31 32 Q38 31 45 34' }, duration: 0.3 });
      s.tween(ex.br, 6.6, { attr: { d: 'M55 32 Q62 30 69 33' } }, { attr: { d: 'M55 34 Q62 31 69 32' }, duration: 0.3 });
      s.tween(ex.bl, 11.6, { attr: { d: 'M31 32 Q38 31 45 34' } }, { attr: { d: 'M31 33 Q38 30 45 32' }, duration: 0.3 });
      s.tween(ex.br, 11.6, { attr: { d: 'M55 34 Q62 31 69 32' } }, { attr: { d: 'M55 32 Q62 30 69 33' }, duration: 0.3 });
      s.cam({ cx: 860, cy: 600, z: 1.4 }, 6.6, 0.8, 'power2.inOut');
      whisper(s, 'kid3', 7.4, 10.4);
      K().say(s, 'мяч, дом, рыба…', 806, 520, 7.6, 10.6);
      s.mouth('baby', 'flat', 7.2, 0.2);
      [0, 1, 2, 3].forEach(function (j) { s.actor('baby', { x: MX + (j % 2 ? -8 : 8) }, 7.6 + j * 0.5, 0.25, 'sine.inOut'); });
      s.actor('baby', { x: MX }, 9.6, 0.25);
      s.cam({ cx: 960, cy: 540, z: 1 }, 10.8, 0.7, 'power2.inOut');
      // козырьки вверх: Дима — все три по порядку, Миша путается
      [hd, hm].forEach(function (h) { s.tween(h.visor, 11.4, { attr: { y: h.down } }, { attr: { y: h.up }, duration: 0.35, ease: 'power2.out' }); });
      s.gaze('kid3', 0, -4, 11.6, 0.2); s.gaze('baby', 0, -4, 11.6, 0.2);
      s.tween(ex.face, 11.6, { x: 9, y: 2 }, { x: 6, y: 0, duration: 0.3 });
      var aD = answer(s, ov, DX, 300, ['ball', 'house', 'fish'], true, 12.0);
      s.brow('kid3', 'proud', 13.2, 0.2); s.mouth('kid3', 'smile', 13.2, 0.2);
      var aM = answer(s, ov, MX, 300, ['house', 'ball', '?'], false, 12.5);
      s.brow('baby', 'sad', 13.4, 0.2); s.mouth('baby', 'sad', 13.4, 0.2);
      hudText(s, 'lead', 'Кто повторял про себя, помнил больше. В 5 лет так делают немногие, к 10 — почти все.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 12.2);
      cite(s, 'rehearsal · Дж. Флейвелл и др., 1966 · Э. Эллиотт и др., 2021 (17 лабораторий): шептали и многие пятилетки — раньше, чем думали', 12.8);
      // шлемы снимают; Миша смотрит на Диму — и сам начинает шептать
      fadeOut(s, [aD, aM], 14.8);
      s.tween([hd.g, hm.g], 15.0, { opacity: 1, y: 0 }, { opacity: 0, y: -80, duration: 0.5, ease: 'power2.in' });
      s.gaze('baby', -9, 0, 15.6, 0.3); s.brow('baby', 'doubt', 15.6, 0.3); s.mouth('baby', 'soft', 15.6, 0.3);
      s.gaze('kid3', 9, 0, 16.0, 0.3); s.mouth('kid3', 'smile', 16.0, 0.2);
      s.gaze('baby', -2, 6, 16.8, 0.3); s.brow('baby', 'focus', 16.8, 0.3);
      whisper(s, 'baby', 17.1, 19.6);
      K().say(s, 'мяч, дом, рыба…', 1350, 470, 17.2, 19.8);
      s.brow('baby', 'proud', 19.8, 0.3); s.mouth('baby', 'smile', 19.8, 0.3); s.gaze('kid3', 4, 0, 20.4, 0.3);
      concl(s, 'память становится нарочной — ребёнок сам выбирает, как запомнить.', 20.0);
      castOut(s, ['kid3', 'baby']);
    }
  });

  // ---------- «Шахматная дуэль» ----------
  // доска на столе в перспективе: строки 0 (дальняя) … 5 (ближняя)
  var BK = { yb: 560, yf: 688, xb: [930, 1270], xf: [900, 1300] };
  function bx(y, c) { var t = (y - BK.yb) / (BK.yf - BK.yb), l = BK.xb[0] + (BK.xf[0] - BK.xb[0]) * t, r = BK.xb[1] + (BK.xf[1] - BK.xb[1]) * t; return l + (r - l) * c / 6; }
  function by(r) { return BK.yb + (BK.yf - BK.yb) * r / 6; }
  function chessBoard(s, g) {
    var G = s.node(g, 'g', {});
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) {
      var y0 = by(r), y1 = by(r + 1);
      s.path(G, 'M' + bx(y0, c) + ' ' + y0 + ' L' + bx(y0, c + 1) + ' ' + y0 + ' L' + bx(y1, c + 1) + ' ' + y1 + ' L' + bx(y1, c) + ' ' + y1 + ' Z', { fill: (r + c) % 2 ? '#C9A27A' : '#F3E6D2' });
    }
    s.path(G, 'M' + BK.xb[0] + ' ' + BK.yb + ' L' + BK.xb[1] + ' ' + BK.yb + ' L' + BK.xf[1] + ' ' + BK.yf + ' L' + BK.xf[0] + ' ' + BK.yf + ' Z', L(2.6));
    return G;
  }
  function sq(r, c) { var y = (by(r) + by(r + 1)) / 2; return { x: (bx(y, c) + bx(y, c + 1)) / 2, y: y + 4, k: 0.5 + 0.06 * r }; }
  // крышка-коробка, которой закрывают доску (и лист с цифрами)
  function lid(s, g) {
    var G = s.node(g, 'g', {});
    s.path(G, 'M920 526 L1280 526 L1310 548 L890 548 Z', L(2.6, '#E6CDA8'));
    s.node(G, 'rect', Object.assign({ x: 890, y: 548, width: 420, height: 142, rx: 4 }, L(2.6, '#D9B98F')));
    return G;
  }
  // таймер «10 секунд»: подпись и черта, которая сокращается
  function timer(s, ov, t0, dur) {
    var e = s.text('kidhand', '10 секунд', { left: 1330, top: 470, fontSize: 32, color: 'var(--accent-deep)' });
    var bar = s.path(ov, 'M1332 530 H1480', { stroke: TEAL, 'stroke-width': 6 });
    s.fade(e, t0, { y: 0, dur: 0.3 }); s.out(e, t0 + dur + 0.2, { dur: 0.2 });
    s.tween(bar, t0, { opacity: 0, scaleX: 1, svgOrigin: '1332 530' }, { opacity: 1, scaleX: 1, duration: 0.2 });
    s.tween(bar, t0 + 0.2, { scaleX: 1 }, { scaleX: 0.02, duration: dur, ease: 'none' });
    s.tween(bar, t0 + dur + 0.2, { opacity: 1 }, { opacity: 0, duration: 0.2 });
  }

  // 3:42,5 — Шахматная дуэль: Дима против папы (М. Чи, 1978; В. Шнайдер и др., 1993)
  Film.scene({
    id: 'chess', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over(), F = 880;
      var kt = P().kitchen(s, g, { floor: F, stoveX: 1730, tableX: 1100 });
      // табурет папы слева от стола
      ln(s, g, 'M680 ' + (F - 100) + ' H800 M692 ' + (F - 100) + ' V' + F + ' M788 ' + (F - 100) + ' V' + F, 2.6);
      on(s, 'dad', 740, F - 200, 200, 0.1, { gx: 6, gy: 4 });
      on(s, 'dima', kt.seat.x, kt.seat.y - 62, 124, 0.2, { gx: -6, gy: 4 });
      // табло матча — тетрадный лист на стене
      var sh = s.node(g, 'g', {});
      P().page(s, sh, 240, 280, 420, 260, { cell: 30, margin: false });
      [[260, 270], [620, 270]].forEach(function (q) { s.node(sh, 'rect', { x: q[0] - 22, y: q[1], width: 44, height: 18, fill: '#EADFB8', opacity: 0.9, transform: 'rotate(-8 ' + q[0] + ' ' + (q[1] + 9) + ')' }); });
      txt(s, sh, 480, 330, 'папа', 28); txt(s, sh, 595, 330, 'Дима', 28);
      ln(s, sh, 'M260 346 H640', 2, INK);
      var r1 = txt(s, sh, 260, 395, 'фигуры', 28, { anchor: 'start', weight: 500 }), r2 = txt(s, sh, 260, 455, 'цифры', 28, { anchor: 'start', weight: 500 });
      fadeIn(s, sh, 0.2, 0.4);
      // кадр 1: позиция на 10 секунд; лошадка Миши — конём
      var cb = chessBoard(s, g);
      fadeIn(s, cb, 0.3, 0.3);
      var POS = [[0, 1, 'k', 1], [1, 4, 'p', 0], [2, 2, 'p', 1], [2, 5, 'k', 0], [3, 0, 'p', 0], [4, 1, 'p', 1], [4, 4, 'p', 0], [5, 2, 'k', 0]];
      var pcs = s.node(g, 'g', {});
      POS.forEach(function (p, i) { var q = sq(p[0], p[1]), pg = s.node(pcs, 'g', {}); (p[2] === 'k' ? K().knight : K().pawn)(s, pg, q.x, q.y, q.k, p[3]); s.tween(pg, 0.4 + i * 0.05, { opacity: 0 }, { opacity: 1, duration: 0.2 }); });
      var hq = sq(3, 3), hs = s.node(pcs, 'g', {}), hsIn = s.node(hs, 'g', {});
      K().toyHorse(s, hsIn, hq.x, hq.y, 0.4);
      s.tween(hs, 1.2, { opacity: 0, x: 1370 - hq.x, y: 700 - hq.y }, { opacity: 1, x: 1370 - hq.x, y: 700 - hq.y, duration: 0.1 });
      s.tween(hs, 1.3, { x: 1370 - hq.x }, { x: 0, duration: 0.6, ease: 'sine.inOut' });
      s.tween(hs, 1.3, { y: 700 - hq.y }, { y: 0, duration: 0.6, ease: 'back.out(1.4)' });
      s.hands('kid3', 'hold', 1.0, 0.25); s.hands('kid3', 'off', 1.9, 0.25);
      var ht = s.text('tag', 'лошадка Миши', { left: hq.x - 140, top: 488, width: 280, color: 'var(--accent-deep)', fontSize: 22 });
      s.fade(ht, 1.8, { y: 4 }); s.out(ht, 3.2, { dur: 0.2 });
      s.gaze('dad', 9, 6, 0.8, 0.3); s.gaze('kid3', -9, 6, 0.8, 0.3); s.brow('dad', 'focus', 1.9, 0.3);
      timer(s, ov, 1.9, 1.6);
      var lb = lid(s, g);
      s.tween(lb, 3.8, { opacity: 0, y: -140 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.in' });
      s.set([cb, pcs], 4.2, { opacity: 1 }, { opacity: 0 });
      hudText(s, 'h3', 'Кто запомнит больше — Дима или папа? <span class="acc">Угадайте.</span>', { left: 140, top: 130, width: 900, fontSize: 46 }, 0.4, 6.9);
      s.freeze(4.6, 2.3);
      s.gaze('dad', 2, -6, 4.6, 0.3); s.gaze('kid3', -2, -6, 4.6, 0.3); s.brow('kid3', 'calm', 4.6, 0.3);
      // кадр 2: табло — фигуры: Дима 9, папа 6; папа удивлён
      var p1 = txt(s, sh, 480, 395, '6', 34), d1 = txt(s, sh, 595, 395, '9', 34, { color: '#13534D' });
      fadeIn(s, r1, 7.0); fadeIn(s, d1, 7.2); fadeIn(s, p1, 7.5);
      var sc1 = txt(s, sh, 538, 515, '0 : 1', 40);
      fadeIn(s, sc1, 7.8); fadeOut(s, sc1, 14.0, 0.2);
      s.brow('kid3', 'proud', 7.3, 0.2); s.mouth('kid3', 'smile', 7.3, 0.2); s.squash('kid3', 0.94, 1.08, 7.3, 0.1); s.squash('kid3', 1, 1, 7.4, 0.3, 'back.out(3)');
      s.brow('dad', 'doubt', 7.7, 0.3); s.mouth('dad', 'flat', 7.7, 0.3); s.gaze('dad', 9, -2, 7.7, 0.3); s.squash('dad', 0.97, 1.05, 7.8, 0.15); s.squash('dad', 1, 1, 7.95, 0.3);
      hudText(s, 'lead', 'Дима знает шахматы и видит на доске знакомые узоры.', { left: 140, top: 130, width: 900, fontSize: 38 }, 7.2, 12.0);
      // кадр 3: реванш — ряд случайных цифр, тоже на 10 секунд, закрывается
      var dg = s.node(g, 'g', {});
      s.path(dg, 'M960 590 L1240 590 L1270 684 L930 684 Z', L(2.4, PAPER));
      txt(s, dg, 1100, 652, '7 3 9 1 5 8 2 6', 40, { weight: 600 });
      s.tween(dg, 8.4, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.tween(lb, 8.6, { opacity: 1, y: 0 }, { opacity: 0, y: -140, duration: 0.35, ease: 'power2.out' });
      s.brow('dad', 'focus', 8.6, 0.3); s.mouth('dad', 'soft', 8.6, 0.3); s.gaze('dad', 9, 6, 8.6, 0.3);
      s.brow('kid3', 'calm', 8.6, 0.3); s.mouth('kid3', 'soft', 8.6, 0.3); s.gaze('kid3', -9, 6, 8.6, 0.3);
      timer(s, ov, 9.0, 1.6);
      s.tween(lb, 10.9, { opacity: 0, y: -140 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.in' });
      s.set(dg, 11.3, { opacity: 1 }, { opacity: 0 });
      s.gaze('dad', 2, -6, 11.6, 0.3); s.gaze('kid3', -2, -6, 11.6, 0.3); s.brow('kid3', 'focus', 11.6, 0.3);
      // табло: цифры — папа 8, Дима 6; счёт 1 : 1
      var p2 = txt(s, sh, 480, 455, '8', 34, { color: '#13534D' }), d2 = txt(s, sh, 595, 455, '6', 34);
      fadeIn(s, r2, 12.6); fadeIn(s, p2, 12.8); fadeIn(s, d2, 13.1);
      var sc2 = txt(s, sh, 538, 515, '1 : 1', 40);
      fadeIn(s, sc2, 14.2);
      s.brow('dad', 'proud', 12.9, 0.3); s.mouth('dad', 'smile', 12.9, 0.3); s.gaze('dad', 9, 0, 12.9, 0.3);
      s.brow('kid3', 'calm', 13.2, 0.3); s.mouth('kid3', 'smile', 13.4, 0.3); s.gaze('kid3', -9, 0, 13.4, 0.3);
      hudText(s, 'lead', 'В цифрах узоров нет — и папа впереди.', { left: 140, top: 130, width: 900, fontSize: 38 }, 12.3);
      concl(s, 'память растёт вместе со знаниями.', 16.4);
      cite(s, 'М. Чи, 1978: дети ~10 лет и взрослые · В. Шнайдер и др., 1993 — повторилось', 14.6);
      castOut(s, ['dad', 'kid3']);
    }
  });
})();
