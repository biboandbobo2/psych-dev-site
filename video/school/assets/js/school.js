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

  Film.school = { kid: kid, classroom: classroom, desk: desk, house: house, board: board, ruled: ruled, INK: INK, TEAL: TEAL, DEEP: DEEP, RED: RED, PAPER: PAPER };
})();
