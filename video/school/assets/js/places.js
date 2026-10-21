/* Эпизод 7–10 (v3.2): места тонкой ровной линией — «по линейке», как окружение 3–7, но чернилами.
   Заливки — только светлые (как окно в 3–7); тёмное пятно одно — школьная доска. Мебель никогда не режет круг-героя:
   ребёнок сидит над линией парты (низ круга — на столешнице). Все функции возвращают места для героев. */
/* global Film */
(function () {
  'use strict';
  var INK = '#2B3440', PAPER = '#FFFDF8', GLASS = '#E8F1EE', BOARD = '#3B5E54', CHALK = '#F4F1E6', GRID = '#D6E7E3', RED = '#D9534F',
    LEAF = '#9CCB9F', LEAF_D = '#6FA877', WOOD = '#E9D9BF', FLOOR = '#C9BBA2';
  function L(w, fill) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function rect(s, g, x, y, w, h, fill, sw, rx) { return s.node(g, 'rect', Object.assign({ x: x, y: y, width: w, height: h, rx: rx || 0 }, L(sw, fill))); }
  function ln(s, g, d, sw, c) { return s.path(g, d, { stroke: c || INK, 'stroke-width': sw || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
  function chalk(s, g, x, y, text, size) {
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': 'middle', fill: CHALK, style: 'font-family: var(--hand); font-size: ' + (size || 40) + 'px' });
    t.textContent = text; return t;
  }

  // Тетрадный лист: клетка и красная линия полей (ровная, на расстоянии margin от правого края)
  function page(s, g, x, y, w, h, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), c = o.cell || 30;
    rect(s, G, x, y, w, h, PAPER, 2);
    for (var i = c; i < w; i += c) ln(s, G, 'M' + (x + i) + ' ' + y + ' V' + (y + h), 1, GRID);
    for (var j = c; j < h; j += c) ln(s, G, 'M' + x + ' ' + (y + j) + ' H' + (x + w), 1, GRID);
    if (o.margin !== false) ln(s, G, 'M' + (x + w - (o.margin || 2 * c)) + ' ' + y + ' V' + (y + h), 2, RED);
    return G;
  }
  // Домик (дом героя): квадрат, крыша-треугольник, окно, дверь. (x, y) — середина низа
  function house(s, g, x, y, k, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), w = 150 * k, h = 120 * k;
    rect(s, G, x - w / 2, y - h, w, h, PAPER);
    ln(s, G, 'M' + (x - w / 2 - 14 * k) + ' ' + (y - h) + ' L' + x + ' ' + (y - h - 80 * k) + ' L' + (x + w / 2 + 14 * k) + ' ' + (y - h) + ' Z', 3);
    if (o.roof) s.node(G, 'path', { d: 'M' + (x - w / 2 - 14 * k) + ' ' + (y - h) + ' L' + x + ' ' + (y - h - 80 * k) + ' L' + (x + w / 2 + 14 * k) + ' ' + (y - h) + ' Z', fill: o.roof, opacity: 0.35 });
    rect(s, G, x - w / 2 + 20 * k, y - h + 26 * k, 44 * k, 40 * k, GLASS, 2.4);
    ln(s, G, 'M' + (x - w / 2 + 42 * k) + ' ' + (y - h + 26 * k) + ' v' + (40 * k), 2);
    rect(s, G, x + 14 * k, y - 70 * k, 40 * k, 70 * k, PAPER, 2.4, 4);
    return G;
  }
  // Школа: длинное здание тонкой линией, часы, флажок, дверь; (x, y) — середина низа
  function school(s, g, x, y, k) {
    var G = s.node(g, 'g', {}), W = 560 * k, H = 260 * k;
    rect(s, G, x - W / 2, y - H, W, H, PAPER);
    ln(s, G, 'M' + (x - W / 2 - 20 * k) + ' ' + (y - H) + ' L' + x + ' ' + (y - H - 100 * k) + ' L' + (x + W / 2 + 20 * k) + ' ' + (y - H) + ' Z', 3);
    s.node(G, 'circle', Object.assign({ cx: x, cy: y - H - 42 * k, r: 22 * k }, L(2.4, PAPER)));
    ln(s, G, 'M' + x + ' ' + (y - H - 42 * k) + ' v' + (-13 * k) + ' M' + x + ' ' + (y - H - 42 * k) + ' h' + (10 * k), 2.2);
    for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) {
      if (r === 1 && (c === 2 || c === 3)) continue;
      var wx = x - W / 2 + (34 + c * 86) * k, wy = y - H + (36 + r * 104) * k;
      rect(s, G, wx, wy, 56 * k, 64 * k, GLASS, 2.2);
      ln(s, G, 'M' + (wx + 28 * k) + ' ' + wy + ' v' + (64 * k), 1.6);
    }
    rect(s, G, x - 46 * k, y - 120 * k, 92 * k, 120 * k, PAPER, 2.6, 6);
    ln(s, G, 'M' + x + ' ' + (y - 120 * k) + ' v' + (120 * k), 2.2);
    ln(s, G, 'M' + (x + W / 2 - 30 * k) + ' ' + (y - H) + ' v' + (-110 * k), 2.6);
    s.path(G, 'M' + (x + W / 2 - 30 * k) + ' ' + (y - H - 110 * k) + ' l' + (54 * k) + ' ' + (13 * k) + ' l' + (-54 * k) + ' ' + (13 * k) + ' Z', { fill: RED });
    return G;
  }
  // Дерево: ствол линией, крона — светло-зелёный круг с контуром
  function tree(s, g, x, y, k) {
    var G = s.node(g, 'g', {});
    ln(s, G, 'M' + x + ' ' + y + ' V' + (y - 120 * k), 4);
    s.node(G, 'circle', Object.assign({ cx: x, cy: y - 170 * k, r: 70 * k }, L(3, LEAF)));
    s.node(G, 'circle', Object.assign({ cx: x - 46 * k, cy: y - 130 * k, r: 40 * k }, L(3, LEAF)));
    return G;
  }
  function bench(s, g, x, y, k) {
    var G = s.node(g, 'g', {}), w = 180 * k;
    rect(s, G, x - w / 2, y - 50 * k, w, 12 * k, WOOD, 2.6, 4);
    rect(s, G, x - w / 2, y - 84 * k, w, 12 * k, WOOD, 2.6, 4);
    ln(s, G, 'M' + (x - w / 2 + 16 * k) + ' ' + (y - 38 * k) + ' V' + y + ' M' + (x + w / 2 - 16 * k) + ' ' + (y - 38 * k) + ' V' + y + ' M' + (x - w / 2 + 16 * k) + ' ' + (y - 72 * k) + ' V' + (y - 50 * k) + ' M' + (x + w / 2 - 16 * k) + ' ' + (y - 72 * k) + ' V' + (y - 50 * k), 2.6);
    return G;
  }

  // Класс сбоку: доска слева (перед детьми), учитель у доски, парты рядами вправо, дети смотрят влево — на доску.
  // Возвращает { board: {x,y,w,h}, teacher: {x,y}, seats: [[{x,y,r}, {x,y,r}], …] } — по два места за партой, ряды спереди назад.
  function classroom(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {});
    var rows = o.rows || [{ y: 880, k: 1.3 }, { y: 690, k: 1 }], cols = o.cols || [990, 1330, 1670], seats = [];
    var floor = rows[0].y + 72 * rows[0].k;
    ln(s, G, 'M60 ' + floor + ' H1860', 2.4, FLOOR);
    // окно справа
    rect(s, G, 1630, 200, 200, 220, GLASS, 3, 6); ln(s, G, 'M1730 200 V420 M1630 310 H1830', 2.4);
    // часы над доской и рядом — на пустой стене
    s.node(G, 'circle', Object.assign({ cx: 1180, cy: 230, r: 44 }, L(3, PAPER))); ln(s, G, 'M1180 230 v-28 M1180 230 h20', 3);
    // доска слева — на уровне детей
    var b = { x: 100, y: 300, w: 500, h: 290 };
    rect(s, G, b.x - 10, b.y - 10, b.w + 20, b.h + 20, '#C9A27A', 3, 6);
    rect(s, G, b.x, b.y, b.w, b.h, BOARD, 3, 4);
    ln(s, G, 'M' + (b.x + 30) + ' ' + (b.y + b.h + 10) + ' h' + (b.w - 60), 4, '#C9A27A');
    if (o.boardText) chalk(s, G, b.x + b.w / 2, b.y + b.h / 2 + 14, o.boardText, 54);
    rows.slice().reverse().forEach(function (row) { // сначала дальний ряд — ближний рисуется поверх
      var line = [];
      cols.forEach(function (cx) {
        var x = cx + (1.3 - row.k) * 60, w = 280 * row.k, r = 46 * row.k;
        line.push({ x: x - 66 * row.k, y: row.y - r - 2, r: r }, { x: x + 66 * row.k, y: row.y - r - 2, r: r });
        rect(s, G, x - w / 2, row.y, w, 10 * row.k, WOOD, 2.4, 3);
        ln(s, G, 'M' + (x - w / 2 + 14 * row.k) + ' ' + (row.y + 10 * row.k) + ' V' + (row.y + 72 * row.k) + ' M' + (x + w / 2 - 14 * row.k) + ' ' + (row.y + 10 * row.k) + ' V' + (row.y + 72 * row.k), 2.4);
      });
      seats.unshift(line);
    });
    // учитель стоит на полу у доски: для капсулы d — y = floor − 1,4·d
    return { g: G, board: b, floor: floor, teacher: { x: 700, floor: floor }, seats: seats };
  }
  // y центра лица учителя-капсулы, стоящей на полу (тело: 50 над центром, 140 под ним в единицах 100)
  function standY(floor, d, capsule) { return floor - (capsule ? 1.4 : 0.5) * d; }
  // Посадить одноклассников-статистов на места, кроме занятых героями (skip — массив 'ряд:место')
  function fill(s, g, seats, skip, start, gx) {
    var n = start || 0;
    seats.forEach(function (row, ri) { row.forEach(function (p, pi) {
      if (skip && skip.indexOf(ri + ':' + pi) >= 0) return;
      Film.school.classmate(g, n++, p.x, p.y, p.r, { gx: gx == null ? -6 : gx });
    }); });
  }

  // Двор школы: здание сзади слева, деревья, скамейка, классики мелом с цифрами 1–10 на асфальте
  function yard(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), ground = o.ground || 820;
    s.node(G, 'rect', { x: 0, y: ground, width: 1920, height: 1080 - ground, fill: '#D8CFBD' }); // асфальт — темнее бумаги, чтобы мел читался
    ln(s, G, 'M0 ' + ground + ' H1920', 2.4, FLOOR);
    school(s, G, o.schoolX || 400, ground, o.schoolK || 1.05);
    tree(s, G, 1080, ground, 1); tree(s, G, 1780, ground, 1.15);
    bench(s, G, 1420, ground, 1);
    var cl = null;
    if (o.classics !== false) cl = classics(s, G, o.cx || 1000, ground + 130, o.ck || 1.35);
    return { g: G, ground: ground, classics: cl };
  }
  // Классики: клетки 1–10 в перспективе (вид сбоку-сверху), мелом
  function classics(s, g, x, y, k) {
    var G = s.node(g, 'g', {}), c = 74 * k, h = 52 * k;
    var cells = [[0, 0, '1'], [1, 0, '2'], [2, 0, '3'], [3, -0.5, '4'], [3, 0.5, '5'], [4, 0, '6'], [5, -0.5, '7'], [5, 0.5, '8'], [6, 0, '9'], [7, 0, '10']];
    var pts = [];
    cells.forEach(function (q) {
      var cx = x - 3.5 * c + q[0] * c, cy = y + q[1] * h;
      s.node(G, 'rect', { x: cx - c / 2, y: cy - h / 2, width: c, height: h, fill: 'rgba(255,255,255,0.18)', stroke: '#FFFFFF', 'stroke-width': 4 });
      var t = s.node(G, 'text', { x: cx, y: cy + 9 * k, 'text-anchor': 'middle', fill: '#FFFFFF', style: 'font-family: var(--kid); font-size: ' + (26 * k) + 'px' }); t.textContent = q[2];
      pts.push({ x: cx, y: cy });
    });
    return { g: G, cells: pts };
  }

  // Кухня: стена, окно, плита с кастрюлей и паром, стол; лампа висит на проводе от потолка
  function kitchen(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), floor = o.floor || 940;
    ln(s, G, 'M60 ' + floor + ' H1860', 2.4, FLOOR);
    ln(s, G, 'M60 110 H1860', 2, FLOOR);
    rect(s, G, 800, 230, 280, 240, GLASS, 3, 6); ln(s, G, 'M940 230 V470 M800 350 H1080', 2.4);
    // плита слева: корпус, духовка, кастрюля с паром
    var sx = o.stoveX || 260, st = floor - 300;
    rect(s, G, sx - 150, st, 300, 300, PAPER, 3, 8);
    rect(s, G, sx - 112, st + 90, 224, 160, null, 2.4, 6);
    ln(s, G, 'M' + (sx - 70) + ' ' + (st + 40) + ' h40 M' + (sx + 30) + ' ' + (st + 40) + ' h40', 3);
    rect(s, G, sx - 80, st - 86, 160, 86, PAPER, 3, 10); ln(s, G, 'M' + (sx - 104) + ' ' + (st - 86) + ' H' + (sx + 104), 3.4);
    [0, 1, 2].forEach(function (i) { ln(s, G, 'M' + (sx - 34 + i * 34) + ' ' + (st - 104) + ' q-12 -26 0 -52', 2.2, '#9AA1A6'); });
    // стол справа
    var tx = o.tableX || 1420, ty = floor - 170;
    rect(s, G, tx - 300, ty, 600, 16, WOOD, 2.6, 4);
    ln(s, G, 'M' + (tx - 266) + ' ' + (ty + 16) + ' V' + floor + ' M' + (tx + 266) + ' ' + (ty + 16) + ' V' + floor, 2.6);
    // лампа на проводе над столом
    ln(s, G, 'M' + tx + ' 110 V320', 2.2);
    s.path(G, 'M' + (tx - 56) + ' 364 Q' + tx + ' 310 ' + (tx + 56) + ' 364 Z', L(2.6, '#F5D27A'));
    return { g: G, floor: floor, stove: { x: sx, top: st }, table: { x: tx, y: ty } };
  }

  // Три дорожки из трёх домов к одной школе (первая сцена главы 1 и заставки глав)
  var PATHC = { misha: '#E4735A', anya: '#26A69A', dima: '#4F7CAC' };
  function paths(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {});
    var homes = { misha: [260, 360], anya: [260, 760], dima: [520, 960] }, door = [1480, 640];
    school(s, G, 1560, 700, 0.75);
    var res = {};
    Object.keys(homes).forEach(function (k) {
      var h = homes[k]; house(s, G, h[0], h[1], 0.75, { roof: PATHC[k] });
      var d = 'M' + (h[0] + 80) + ' ' + (h[1] - 10) + ' C' + (h[0] + 420) + ' ' + (h[1] - 10) + ' ' + (door[0] - 420) + ' ' + door[1] + ' ' + door[0] + ' ' + door[1];
      var p = s.path(G, d, { stroke: PATHC[k], 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '2 16', opacity: 0.85 });
      res[k] = { path: p, d: d, home: h };
    });
    return { g: G, paths: res, door: door };
  }

  Film.places = { standY: standY, page: page, house: house, school: school, tree: tree, bench: bench, classroom: classroom, fill: fill, yard: yard, classics: classics, kitchen: kitchen, paths: paths, chalk: chalk, PATHC: PATHC, INK: INK, BOARD: BOARD };
})();
