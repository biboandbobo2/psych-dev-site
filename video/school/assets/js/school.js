/* Эпизод 7–10: рисунки «тетради» — одноклассники с приметами, парты в перспективе, дом, доска, линия поля */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', TEAL = '#26A69A', DEEP = '#13534D', RED = '#D9534F', PAPER = '#FFFDF8', WOOD = '#C9A27A';
  var KIDS = ['#E4735A', '#EC8A6F', '#D9654B', '#F09A7E', '#C95A44'];

  // Одноклассник: круг цвета ребёнка + примета (сверстники — отдельные люди, а не «ещё один ребёнок»)
  function kid(s, g, x, y, r, i, attr) {
    var k = s.node(g, 'g', {});
    s.node(k, 'circle', { cx: x, cy: y, r: r, fill: KIDS[i % KIDS.length] });
    var w = Math.max(2, r * 0.09), a = { stroke: INK, 'stroke-width': w, fill: 'none' };
    if (attr === 'glasses') {
      s.node(k, 'circle', Object.assign({ cx: x - r * 0.36, cy: y - r * 0.12, r: r * 0.24 }, a));
      s.node(k, 'circle', Object.assign({ cx: x + r * 0.36, cy: y - r * 0.12, r: r * 0.24 }, a));
      s.path(k, 'M' + (x - r * 0.12) + ' ' + (y - r * 0.14) + ' L' + (x + r * 0.12) + ' ' + (y - r * 0.14), { stroke: INK, 'stroke-width': w });
    } else if (attr === 'pigtails') {
      [-1, 1].forEach(function (d) {
        s.node(k, 'circle', { cx: x + d * r * 1.02, cy: y - r * 0.2, r: r * 0.3, fill: '#7A4E2D' });
        s.node(k, 'circle', { cx: x + d * r * 0.86, cy: y - r * 0.46, r: r * 0.12, fill: RED });
      });
    } else if (attr === 'cap') {
      s.path(k, 'M' + (x - r * 0.92) + ' ' + (y - r * 0.36) + ' Q' + x + ' ' + (y - r * 1.5) + ' ' + (x + r * 0.92) + ' ' + (y - r * 0.36) + ' Z', { fill: TEAL, stroke: 'none' });
      s.path(k, 'M' + (x + r * 0.5) + ' ' + (y - r * 0.4) + ' L' + (x + r * 1.45) + ' ' + (y - r * 0.32), { stroke: TEAL, 'stroke-width': r * 0.2 });
    } else if (attr === 'freckles') {
      [[-0.42, 0.18], [-0.28, 0.3], [-0.5, 0.36], [0.42, 0.18], [0.28, 0.3], [0.5, 0.36]].forEach(function (p) {
        s.node(k, 'circle', { cx: x + p[0] * r, cy: y + p[1] * r, r: r * 0.055, fill: '#8C3B2A' });
      });
    } else if (attr === 'bow') {
      s.path(k, 'M' + x + ' ' + (y - r * 0.95) + ' l' + (-r * 0.42) + ' ' + (-r * 0.26) + ' l0 ' + (r * 0.52) + ' Z M' + x + ' ' + (y - r * 0.95) + ' l' + (r * 0.42) + ' ' + (-r * 0.26) + ' l0 ' + (r * 0.52) + ' Z', { fill: TEAL, stroke: 'none' });
    } else if (attr === 'fringe') {
      s.path(k, 'M' + (x - r * 0.85) + ' ' + (y - r * 0.45) + ' Q' + x + ' ' + (y - r * 1.25) + ' ' + (x + r * 0.85) + ' ' + (y - r * 0.45) + ' Q' + x + ' ' + (y - r * 0.7) + ' ' + (x - r * 0.85) + ' ' + (y - r * 0.45) + ' Z', { fill: '#3E2A1E', stroke: 'none' });
    }
    return k;
  }

  // Класс в перспективе: ряды парт сходятся к точке схода; задние ряды мельче и закрыты передними
  var ATTRS = ['glasses', 'pigtails', 'cap', 'freckles', 'bow', 'fringe', '', 'glasses', 'bow', 'cap'];
  function classroom(s, g, o) {
    o = o || {};
    var rows = o.rows || 4, cols = o.cols || 5, vx = o.vx || 960, vy = o.vy || 260, front = o.front || 900, back = o.back || 520;
    var spots = [];
    for (var r = rows - 1; r >= 0; r--) { // сзади вперёд — передние ряды перекрывают задние
      var t = r / (rows - 1), y = front - (front - back) * t, k = 1 - 0.55 * t; // масштаб ряда
      var span = 1500 * k, x0 = vx - span / 2;
      for (var c = 0; c < cols; c++) {
        var cx = x0 + span * (c + 0.5) / cols, id = r * cols + c;
        if (o.skip && o.skip(r, c)) { spots.push({ r: r, c: c, x: cx, y: y, k: k }); continue; }
        kid(s, g, cx, y - 64 * k, 40 * k, id, ATTRS[(id * 7) % ATTRS.length]);
        desk(s, g, cx, y, k);
        spots.push({ r: r, c: c, x: cx, y: y, k: k });
      }
    }
    return spots;
  }
  function desk(s, g, x, y, k) {
    var w = 190 * k, d = 26 * k, h = 70 * k;
    s.path(g, 'M' + (x - w / 2) + ' ' + y + ' L' + (x + w / 2) + ' ' + y + ' L' + (x + w / 2 - d) + ' ' + (y - d) + ' L' + (x - w / 2 + d) + ' ' + (y - d) + ' Z', { fill: WOOD, stroke: INK, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' });
    s.node(g, 'rect', { x: x - w / 2, y: y, width: w, height: h, fill: '#B48A62', stroke: INK, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' });
  }
  // Дом — линией ручки
  function house(s, g, x, y, k, o) {
    var p = 'M' + (x - 150 * k) + ' ' + y + ' L' + (x - 150 * k) + ' ' + (y - 170 * k) + ' L' + x + ' ' + (y - 290 * k) + ' L' + (x + 150 * k) + ' ' + (y - 170 * k) + ' L' + (x + 150 * k) + ' ' + y +
      ' M' + (x - 45 * k) + ' ' + y + ' L' + (x - 45 * k) + ' ' + (y - 120 * k) + ' L' + (x + 45 * k) + ' ' + (y - 120 * k) + ' L' + (x + 45 * k) + ' ' + y;
    var e = s.path(g, p, { stroke: DEEP, 'stroke-width': 4 });
    s.draw(e, o.at, { dur: o.dur || 1.0 });
    return e;
  }
  function board(s, g, x, y, w, h, o) {
    var b = s.node(g, 'rect', { x: x, y: y, width: w, height: h, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 8, opacity: 0 });
    s.tween(b, o.at, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    return b;
  }
  // Ровная линия по линейке: линейка едет вдоль, за ней остаётся черта
  function ruled(s, g, x1, y1, x2, y2, o) {
    var ln = s.path(g, 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, { stroke: o.color || DEEP, 'stroke-width': o.width || 4 });
    s.draw(ln, o.at, { dur: o.dur || 1.0, ease: 'power1.inOut' });
    return ln;
  }

  // Стакан (как в 3–7): контур + вода; уровень — высотой прямоугольника
  var WATER = '#9CC3D5';
  function glass(s, g, x, base, w, h, level) {
    var G = s.node(g, 'g', {});
    var water = s.node(G, 'rect', { x: x - w / 2 + 4, y: base - level, width: w - 8, height: level, fill: WATER, rx: 3 });
    s.path(G, 'M' + (x - w / 2) + ' ' + (base - h) + ' L' + (x - w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + base + ' L' + (x + w / 2) + ' ' + (base - h), { stroke: INK, 'stroke-width': 3.5 });
    return { g: G, water: water, x: x, base: base, w: w };
  }
  function setLevel(s, gl, t, from, to, dur, ease) {
    s.tween(gl.water, t, { attr: { y: gl.base - from, height: from } }, { attr: { y: gl.base - to, height: to }, duration: dur, ease: ease || 'power1.inOut' });
  }
  // Шаги по клеткам: ровный шаг с остановкой, короткая подготовка — сдержанная анимация возраста.
  // o.carry — элементы, которые едут вместе с героем (ранец)
  function walk(s, id, x1, lt, o) {
    o = o || {};
    var x0 = s.A[id].st.x, step = o.step || 96, n = Math.max(1, Math.round(Math.abs(x1 - x0) / step)), d = (x1 - x0) / n, t = lt, dur = o.dur || 0.26;
    for (var i = 0; i < n; i++) {
      s.squash(id, 1.04, 0.96, t, 0.08);
      s.actor(id, { x: x0 + d * (i + 1) }, t + 0.08, dur, 'power2.inOut');
      if (o.carry) s.tween(o.carry, t + 0.08, { x: (o.cx || 0) + d * i }, { x: (o.cx || 0) + d * (i + 1), duration: dur, ease: 'power2.inOut' });
      s.squash(id, 1, 1, t + 0.08, 0.2);
      t += dur + (o.hold || 0.14);
    }
    return t - lt;
  }
  // Реплика прописью в облачке; tail: 'l' | 'r'
  function say(s, text, x, y, at, out, tail) {
    var b = s.div('bubble say tail-' + (tail || 'l'), { left: x, top: y }, null, text);
    s.pop(b, at, { from: 0.7, dur: 0.4, origin: (tail === 'r' ? '90%' : '10%') + ' 100%' });
    if (out != null) s.out(b, out, { dur: 0.3 });
    return b;
  }

  // Перенос группы SVG синхронно с прыжком персонажа (та же кривая, что у hop в lib.js) — из 3–7
  function ride(s, g, dx, lt, dur, h) {
    var f = g.__st || (g.__st = { x: 0 });
    s.tween(g, lt + 0.09, { x: f.x }, { x: f.x + dx, duration: dur, ease: 'sine.inOut' });
    s.tween(g, lt + 0.09, { y: 0 }, { y: -h, duration: dur / 2, ease: 'power2.out' });
    s.tween(g, lt + 0.09 + dur / 2, { y: -h }, { y: 0, duration: dur / 2, ease: 'power2.in' });
    f.x += dx;
  }
  Film.ride = ride;

  // Перелистывание страницы: лист бумаги проезжает справа налево поверх кадра; смена содержимого — в середине (at + 0.45)
  function flip(s, at) {
    var e = s.div('pageflip', { left: 0, top: 0, width: 1920, height: 1080, transform: 'translateX(1960px)' }, s.ov);
    s.tween(e, at, { x: 1960 }, { x: -2000, duration: 0.9, ease: 'power2.inOut' });
    return at + 0.45;
  }


  // ---------- Рисунки версии 2: окружение и предметы (плоская заливка, тёмный контур) ----------
  var WALL = '#F3E6D2', ROOF = '#2B8F84', GLASS = '#CFE6EE', WOODD = '#9C7550', LEAF = '#7FB685', LEAF_D = '#4E8C5A';
  function A(fill, w) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linejoin': 'round' }; }
  // подпись героя (кто это) — при первом появлении
  function tag(s, text, x, y, at, out) {
    var e = s.text('tag', text, { left: x - 120, top: y, width: 240 });
    s.fade(e, at, { y: 4, dur: 0.4 });
    if (out != null) s.out(e, out, { dur: 0.3 });
    return e;
  }
  // Школа: два этажа окон, крыльцо, дверь, часы, флажок; (x, y) — середина низа
  function schoolHouse(s, g, x, y, k) {
    var h = s.node(g, 'g', {}), W2 = 300 * k, H = 300 * k;
    s.node(h, 'rect', Object.assign({ x: x - W2, y: y - H, width: 2 * W2, height: H }, A(WALL)));
    s.path(h, 'M' + (x - W2 - 30 * k) + ' ' + (y - H) + ' L' + x + ' ' + (y - H - 120 * k) + ' L' + (x + W2 + 30 * k) + ' ' + (y - H) + ' Z', A(ROOF));
    s.node(h, 'circle', Object.assign({ cx: x, cy: y - H - 50 * k, r: 26 * k }, A('#FFFDF8')));
    s.path(h, 'M' + x + ' ' + (y - H - 50 * k) + ' v' + (-16 * k) + ' M' + x + ' ' + (y - H - 50 * k) + ' h' + (12 * k), { stroke: INK, 'stroke-width': 3 });
    [-1, 1].forEach(function (side) {
      for (var r = 0; r < 2; r++) for (var c = 0; c < 2; c++) {
        var wx = x + side * (90 + c * 110) * k - 35 * k, wy = y - H + (40 + r * 120) * k;
        s.node(h, 'rect', Object.assign({ x: wx, y: wy, width: 70 * k, height: 80 * k, rx: 4 * k }, A(GLASS)));
        s.path(h, 'M' + (wx + 35 * k) + ' ' + wy + ' v' + (80 * k) + ' M' + wx + ' ' + (wy + 40 * k) + ' h' + (70 * k), { stroke: INK, 'stroke-width': 2 });
      }
    });
    s.node(h, 'rect', Object.assign({ x: x - 50 * k, y: y - 150 * k, width: 100 * k, height: 150 * k, rx: 50 * k }, A('#B48A62')));
    s.path(h, 'M' + x + ' ' + (y - 150 * k) + ' v' + (150 * k), { stroke: INK, 'stroke-width': 2.5 });
    s.node(h, 'rect', Object.assign({ x: x - 110 * k, y: y - 8, width: 220 * k, height: 16 }, A('#D9D0C4')));
    s.path(h, 'M' + (x + W2 - 20 * k) + ' ' + (y - H - 10 * k) + ' v' + (-110 * k), { stroke: INK, 'stroke-width': 3 });
    s.path(h, 'M' + (x + W2 - 20 * k) + ' ' + (y - H - 120 * k) + ' l' + (60 * k) + ' ' + (14 * k) + ' l' + (-60 * k) + ' ' + (14 * k) + ' Z', A(RED, 2.5));
    return h;
  }
  // Дерево: ствол и крона из кругов
  function tree(s, g, x, y, k, tone) {
    var t = s.node(g, 'g', {});
    s.node(t, 'rect', Object.assign({ x: x - 14 * k, y: y - 140 * k, width: 28 * k, height: 140 * k, rx: 6 * k }, A(WOODD)));
    [[0, -200, 90], [-70, -150, 66], [70, -150, 66], [0, -110, 70]].forEach(function (c) {
      s.node(t, 'circle', Object.assign({ cx: x + c[0] * k, cy: y + c[1] * k, r: c[2] * k }, A(tone || LEAF)));
    });
    return t;
  }
  function bush(s, g, x, y, k) {
    var b = s.node(g, 'g', {});
    [[-40, 0, 40], [0, -16, 48], [44, 0, 38]].forEach(function (c) { s.node(b, 'circle', Object.assign({ cx: x + c[0] * k, cy: y + c[1] * k, r: c[2] * k }, A(LEAF_D, 2.5))); });
    return b;
  }
  function bench(s, g, x, y, k) {
    var b = s.node(g, 'g', {});
    s.node(b, 'rect', Object.assign({ x: x - 90 * k, y: y - 60 * k, width: 180 * k, height: 16 * k, rx: 4 }, A('#C9A27A')));
    s.node(b, 'rect', Object.assign({ x: x - 90 * k, y: y - 100 * k, width: 180 * k, height: 14 * k, rx: 4 }, A('#C9A27A')));
    [-70, 70].forEach(function (dx) { s.path(b, 'M' + (x + dx * k) + ' ' + (y - 44 * k) + ' v' + (44 * k), { stroke: INK, 'stroke-width': 4 }); });
    return b;
  }
  function ball(s, g, x, y, r) {
    var b = s.node(g, 'g', {});
    s.node(b, 'circle', Object.assign({ cx: x, cy: y, r: r }, A('#F2C14E')));
    s.path(b, 'M' + (x - r) + ' ' + y + ' Q' + x + ' ' + (y - r * 0.6) + ' ' + (x + r) + ' ' + y, { stroke: RED, 'stroke-width': 3 });
    return b;
  }
  // Кухня: окно с занавесками, лампа над столом, стол со скатертью; (x, y) — середина пола под столом
  function kitchen(s, g, x, y, o) {
    var k = s.node(g, 'g', {});
    s.node(k, 'rect', { x: 0, y: 0, width: 1920, height: y - 150, fill: '#F4E9D8', opacity: 0.55 });
    s.node(k, 'rect', Object.assign({ x: x + 300, y: 260, width: 220, height: 200, rx: 6 }, A(GLASS)));
    s.path(k, 'M' + (x + 410) + ' 260 v200 M' + (x + 300) + ' 360 h220', { stroke: INK, 'stroke-width': 2.5 });
    s.path(k, 'M' + (x + 290) + ' 250 q30 110 0 220 h30 q-14 -110 0 -220 Z M' + (x + 530) + ' 250 q-30 110 0 220 h-30 q14 -110 0 -220 Z', A('#E8B4A0', 2));
    if (!o || o.lamp !== false) {
      s.path(k, 'M' + x + ' 300 V' + (y - 520), { stroke: INK, 'stroke-width': 2.5 });
      s.path(k, 'M' + (x - 60) + ' ' + (y - 450) + ' Q' + x + ' ' + (y - 520) + ' ' + (x + 60) + ' ' + (y - 450) + ' Z', A('#F2C14E'));
    }
    s.node(k, 'ellipse', { cx: x, cy: y - 120, rx: 360, ry: 70, fill: '#FFF1A6', opacity: 0.35 });
    s.node(k, 'rect', Object.assign({ x: x - 420, y: y - 140, width: 840, height: 30, rx: 4 }, A('#E8EEF2')));
    s.path(k, 'M' + (x - 420) + ' ' + (y - 110) + ' l20 40 l20 -40 l20 40 l20 -40 l20 40 l20 -40 M' + (x + 300) + ' ' + (y - 110) + ' l20 40 l20 -40 l20 40 l20 -40 l20 40 l20 -40', { stroke: '#B8C6D0', 'stroke-width': 2.5, fill: 'none' });
    [-380, 380].forEach(function (dx) { s.node(k, 'rect', Object.assign({ x: x + dx - 10, y: y - 110, width: 20, height: 110 }, A(WOODD))); });
    s.path(k, 'M0 ' + y + ' H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
    return k;
  }
  // Телефон с чатом: возвращает {el, add(text, at)} — сообщения въезжают снизу
  function phone(s, x, y, w, h) {
    var ph = s.div('phone', { left: x, top: y, width: w, height: h });
    var scr = Film.el('div', null, ph);
    Film.css(scr, { position: 'absolute', left: '16px', top: '60px', right: '16px', bottom: '40px', background: '#DCEFEA', borderRadius: '18px', overflow: 'hidden' });
    var head = Film.el('div', 'tag', ph, 'Родительский чат');
    Film.css(head, { position: 'absolute', left: 0, top: '20px', width: w + 'px', color: '#DCEFEA' });
    var n = 0;
    return { el: ph, add: function (text, at) {
      var m = Film.el('div', 'msg', scr, text);
      Film.css(m, { position: 'absolute', left: '14px', right: '14px', top: (24 + n * 150) + 'px' });
      s.tween(m, at, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      n += 1; return m;
    } };
  }
  // Шахматные фигуры: пешка и конь (плоские); white — светлая
  function pawn(s, g, x, y, k, white) {
    var p = s.node(g, 'g', {}), f = white ? '#FFFDF8' : INK;
    s.node(p, 'circle', Object.assign({ cx: x, cy: y - 34 * k, r: 10 * k }, A(f, 2.5)));
    s.path(p, 'M' + (x - 9 * k) + ' ' + (y - 26 * k) + ' L' + (x - 14 * k) + ' ' + (y - 6 * k) + ' H' + (x + 14 * k) + ' L' + (x + 9 * k) + ' ' + (y - 26 * k) + ' Z', A(f, 2.5));
    s.node(p, 'rect', Object.assign({ x: x - 18 * k, y: y - 7 * k, width: 36 * k, height: 8 * k, rx: 3 }, A(f, 2.5)));
    return p;
  }
  function knight(s, g, x, y, k, white) {
    var p = s.node(g, 'g', {}), f = white ? '#FFFDF8' : INK;
    s.path(p, 'M' + (x - 14 * k) + ' ' + (y - 6 * k) + ' Q' + (x - 16 * k) + ' ' + (y - 28 * k) + ' ' + (x - 2 * k) + ' ' + (y - 34 * k) + ' L' + (x - 12 * k) + ' ' + (y - 40 * k) + ' L' + (x + 4 * k) + ' ' + (y - 52 * k) + ' Q' + (x + 18 * k) + ' ' + (y - 44 * k) + ' ' + (x + 16 * k) + ' ' + (y - 6 * k) + ' Z', A(f, 2.5));
    s.node(p, 'rect', Object.assign({ x: x - 18 * k, y: y - 7 * k, width: 36 * k, height: 8 * k, rx: 3 }, A(f, 2.5)));
    return p;
  }
  // Шлем космонавта вокруг героя: круг-стекло, антенна, козырёк (возвращает козырёк)
  function helmet(s, g, cx, cy, r) {
    var h = s.node(g, 'g', {});
    s.node(h, 'circle', { cx: cx, cy: cy, r: r, fill: '#CFE6EE', opacity: 0.25 });
    s.node(h, 'circle', Object.assign({ cx: cx, cy: cy, r: r }, A('none', 5)));
    s.path(h, 'M' + (cx - r * 0.55) + ' ' + (cy - r * 0.7) + ' Q' + (cx - r * 0.2) + ' ' + (cy - r * 0.9) + ' ' + (cx + r * 0.1) + ' ' + (cy - r * 0.85), { stroke: '#FFFDF8', 'stroke-width': 6, opacity: 0.9 });
    s.path(h, 'M' + cx + ' ' + (cy - r) + ' v' + (-34), { stroke: INK, 'stroke-width': 4 });
    s.node(h, 'circle', Object.assign({ cx: cx, cy: cy - r - 40, r: 9 }, A(RED, 2.5)));
    s.node(h, 'rect', Object.assign({ x: cx - r * 0.9, y: cy + r * 0.82, width: r * 1.8, height: 26, rx: 10 }, A('#D9D0C4')));
    return h;
  }

  Film.school = { tag: tag, schoolHouse: schoolHouse, tree: tree, bush: bush, bench: bench, ball: ball, kitchen: kitchen, phone: phone, pawn: pawn, knight: knight, helmet: helmet, flip: flip, glass: glass, setLevel: setLevel, walk: walk, say: say, WATER: WATER, kid: kid, classroom: classroom, desk: desk, house: house, board: board, ruled: ruled, INK: INK, TEAL: TEAL, DEEP: DEEP, RED: RED, PAPER: PAPER };
})();
