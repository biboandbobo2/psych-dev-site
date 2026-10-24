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
    ln(s, G, 'M' + x + ' ' + (y - H - 100 * k) + ' v' + (-70 * k), 2.6);
    s.path(G, 'M' + x + ' ' + (y - H - 170 * k) + ' l' + (50 * k) + ' ' + (12 * k) + ' l' + (-50 * k) + ' ' + (12 * k) + ' Z', { fill: RED });
    return G;
  }
  // Дерево: ствол линией, крона — светло-зелёный круг с контуром
  function tree(s, g, x, y, k) {
    var G = s.node(g, 'g', {});
    ln(s, G, 'M' + x + ' ' + y + ' V' + (y - 120 * k), 4);
    s.node(G, 'circle', Object.assign({ cx: x, cy: y - 175 * k, r: 78 * k }, L(3, LEAF)));
    return G;
  }
  function bench(s, g, x, y, k) {
    var G = s.node(g, 'g', {}), w = 180 * k;
    rect(s, G, x - w / 2, y - 50 * k, w, 12 * k, WOOD, 2.6, 4);
    rect(s, G, x - w / 2, y - 84 * k, w, 12 * k, WOOD, 2.6, 4);
    ln(s, G, 'M' + (x - w / 2 + 16 * k) + ' ' + (y - 84 * k) + ' V' + y + ' M' + (x + w / 2 - 16 * k) + ' ' + (y - 84 * k) + ' V' + y, 2.6);
    return G;
  }

  // Класс сбоку: доска слева (перед детьми), учитель у доски, парты рядами вправо, дети смотрят влево — на доску.
  // Возвращает { board: {x,y,w,h}, teacher: {x,y}, seats: [[{x,y,r}, {x,y,r}], …] } — по два места за партой, ряды спереди назад.
  function classroom(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {});
    var floor = o.floor || 900; // пол класса — на 900: под ним место для вывода во всех главах (одна высота во всём ролике)
    ln(s, G, 'M60 ' + floor + ' H1860', 2.4, FLOOR);
    rect(s, G, 1640, 170, 200, 220, GLASS, 3, 6); ln(s, G, 'M1740 170 V390 M1640 280 H1840', 2.4);
    s.node(G, 'circle', Object.assign({ cx: 1240, cy: 200, r: 44 }, L(3, PAPER))); ln(s, G, 'M1240 200 v-28 M1240 200 h20', 3);
    var b = { x: 100, y: 260, w: 520, h: 300 };
    rect(s, G, b.x - 10, b.y - 10, b.w + 20, b.h + 20, '#C9A27A', 3, 6);
    rect(s, G, b.x, b.y, b.w, b.h, BOARD, 3, 4);
    ln(s, G, 'M' + (b.x + 30) + ' ' + (b.y + b.h + 10) + ' h' + (b.w - 60), 4, '#C9A27A');
    if (o.boardText) chalk(s, G, b.x + b.w / 2, b.y + b.h / 2 + 16, o.boardText, 56);
    // ряды вдоль класса: ребёнок на стуле, лицом к доске (влево); перед ним — своя парта. Дальний ряд — выше и мельче.
    var rows = o.rows || [{ floor: floor, k: 1, xs: [1000, 1270, 1540, 1810] }, { floor: floor - 190, k: 0.72, xs: [1090, 1300, 1510, 1720] }], seats = [];
    // стена и пол: плинтус по линии дальнего ряда и светлый пол между рядами — дальние парты стоят на полу, стена читается
    if (rows.length > 1) {
      var back = rows[rows.length - 1].floor;
      s.node(G, 'rect', { x: 0, y: back, width: 1920, height: floor - back, fill: '#EFE6D6' });
      ln(s, G, 'M0 ' + back + ' H1920', 3, FLOOR);
    }
    rows.slice().reverse().forEach(function (row) {
      var line = [], k = row.k, r = 54 * k, seatY = row.floor - 78 * k;
      row.xs.forEach(function (x) {
        // парта перед ребёнком (слева): столешница на уровне середины круга, ножки до пола
        var dx2 = x - r * 0.95, dx1 = dx2 - 150 * k, dy = seatY - r * 0.9;
        rect(s, G, dx1, dy, dx2 - dx1, 10 * k, WOOD, 2.4, 3);
        ln(s, G, 'M' + (dx1 + 12 * k) + ' ' + (dy + 10 * k) + ' V' + row.floor + ' M' + (dx2 - 12 * k) + ' ' + (dy + 10 * k) + ' V' + row.floor, 2.4);
        // стул под ребёнком: сиденье, спинка справа, ножки
        ln(s, G, 'M' + (x - r * 0.8) + ' ' + seatY + ' H' + (x + r * 0.9) + ' M' + (x + r * 0.9) + ' ' + seatY + ' V' + (seatY - r * 1.25) + ' M' + (x - r * 0.65) + ' ' + seatY + ' V' + row.floor + ' M' + (x + r * 0.8) + ' ' + seatY + ' V' + row.floor, 2.6);
        line.push({ x: x, y: seatY - r, r: r, desk: { x1: dx1, x2: dx2, y: dy } });
      });
      seats.unshift(line);
    });
    return { g: G, board: b, floor: floor, teacher: { x: 400, floor: floor }, seats: seats, heroes: SEATS };
  }
  // Ранцы первого ряда (у каждого ребёнка свой цвет) — стоят на полу у стула, справа от него. skip — номера мест без ранца (место Миши: его ранец рисует сцена)
  var BAGS = [['#E9A23B', '#B97A1E'], ['#7E9CD6', '#4E6FA8'], ['#C77DBB', '#954C88'], ['#8CBF6E', '#5E9443'], ['#E07A6E', '#B24E43']];
  function bags(s, g, seats, floor, skip) {
    var res = [];
    (seats[0] || []).forEach(function (p, i) {
      if (skip && skip.indexOf(i) >= 0) { res.push(null); return; }
      var c = BAGS[i % BAGS.length], G = s.node(g, 'g', {});
      Film.toys.backpack(s, G, p.x + p.r * 1.25, floor - 40, 0.9, c[0], c[1]);
      res.push({ g: G, x: p.x + p.r * 1.25, y: floor - 40 });
    });
    return res;
  }
  // Постоянные места героев в классе (ряд:место): Миша и Аня рядом в первом ряду, Дима — последним в первом ряду. Не менять между сценами.
  var SEATS = { misha: '0:0', anya: '0:1', dima: '0:3' };
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
    var G = s.node(g, 'g', {}), ground = o.ground || 700;
    s.node(G, 'circle', Object.assign({ cx: 1660, cy: 170, r: 56 }, L(3, '#F5D27A')));
    s.path(G, 'M1100 210 q20 -44 70 -30 q30 -40 80 -6 q50 -4 46 36 Z', L(2.6, PAPER));
    s.node(G, 'rect', { x: 0, y: ground, width: 1920, height: 1080 - ground, fill: '#CFC4AE' }); // асфальт — темнее бумаги, чтобы мел читался
    ln(s, G, 'M0 ' + ground + ' H1920', 2.4, FLOOR);
    school(s, G, o.schoolX || 400, ground, o.schoolK || 1.05);
    tree(s, G, 1000, ground, 0.95); tree(s, G, 1800, ground, 1.1);
    bench(s, G, 1420, ground, 1);
    var cl = null;
    if (o.classics !== false) cl = classics(s, G, o.cx || 1060, ground + 200, o.ck || 1.4);
    return { g: G, ground: ground, classics: cl };
  }
  // Классики: клетки 1–10 в перспективе (вид сбоку-сверху), мелом
  function classics(s, g, x, y, k) {
    var G = s.node(g, 'g', {}), c = 74 * k, h = 52 * k;
    var cells = [[0, 0, '1'], [1, 0, '2'], [2, 0, '3'], [3, -0.5, '4'], [3, 0.5, '5'], [4, 0, '6'], [5, -0.5, '7'], [5, 0.5, '8'], [6, 0, '9'], [7, 0, '10']];
    var pts = [];
    cells.forEach(function (q) {
      var cx = x - 3.5 * c + q[0] * c, cy = y + q[1] * h;
      s.node(G, 'rect', { x: cx - c / 2, y: cy - h / 2, width: c, height: h, fill: 'rgba(255,255,255,0.22)', stroke: '#FFFFFF', 'stroke-width': 5 });
      var t = s.node(G, 'text', { x: cx, y: cy + 11 * k, 'text-anchor': 'middle', fill: '#FFFFFF', style: 'font-family: var(--kid); font-weight: 700; font-size: ' + (32 * k) + 'px' }); t.textContent = q[2];
      pts.push({ x: cx, y: cy });
    });
    return { g: G, cells: pts };
  }

  // Кухня: стена, окно, плита с кастрюлей и паром, стол; лампа висит на проводе от потолка
  function kitchen(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), floor = o.floor || 940;
    ln(s, G, 'M0 ' + floor + ' H1920', 2.4, FLOOR);
    ln(s, G, 'M0 110 H1920', 2, FLOOR);
    rect(s, G, 1380, 230, 280, 240, GLASS, 3, 6); ln(s, G, 'M1520 230 V470 M1380 350 H1660', 2.4);
    // плита слева: корпус, духовка, кастрюля с паром
    var sx = o.stoveX || 260, st = floor - 220; // плита ниже — мама не тянется к кастрюле
    rect(s, G, sx - 150, st, 300, 220, PAPER, 3, 8);
    rect(s, G, sx - 112, st + 74, 224, 120, null, 2.4, 6);
    [-50, 50].forEach(function (dx) { s.node(G, 'circle', Object.assign({ cx: sx + dx, cy: st + 44, r: 12 }, L(2.4, PAPER))); }); // ручки плиты
    rect(s, G, sx - 80, st - 86, 160, 86, PAPER, 3, 10); ln(s, G, 'M' + (sx - 86) + ' ' + (st - 88) + ' H' + (sx + 86) + ' M' + (sx - 100) + ' ' + (st - 60) + ' h20 M' + (sx + 80) + ' ' + (st - 60) + ' h20', 3.4); // крышка и ручки кастрюли
    [0, 1, 2].forEach(function (i) { ln(s, G, 'M' + (sx - 34 + i * 34) + ' ' + (st - 104) + ' q-12 -26 0 -52', 2.2, '#9AA1A6'); });
    // стол справа
    var tx = o.tableX || 1060, ty = floor - 190;
    rect(s, G, tx - 220, ty, 440, 16, WOOD, 2.6, 4);
    ln(s, G, 'M' + (tx - 196) + ' ' + (ty + 16) + ' V' + floor + ' M' + (tx + 196) + ' ' + (ty + 16) + ' V' + floor, 2.6);
    // стул Миши справа от стола: сиденье, спинка справа
    var cx = tx + 330, cy = floor - 100;
    ln(s, G, 'M' + (cx - 60) + ' ' + cy + ' H' + (cx + 60) + ' M' + (cx + 60) + ' ' + cy + ' V' + (cy - 110) + ' M' + (cx - 48) + ' ' + cy + ' V' + floor + ' M' + (cx + 52) + ' ' + cy + ' V' + floor, 2.6);
    // лампа на проводе над столом
    ln(s, G, 'M' + tx + ' 110 V322', 2.2);
    s.path(G, 'M' + (tx - 56) + ' 364 Q' + tx + ' 316 ' + (tx + 56) + ' 364 Z', L(2.6, '#F5D27A'));
    return { g: G, floor: floor, stove: { x: sx, top: st }, table: { x: tx, y: ty }, seat: { x: tx + 330, y: floor - 100 } };
  }

  // Три дорожки из трёх домов к одной школе (первая сцена главы 1 и заставки глав)
  var PATHC = { misha: '#E4735A', anya: '#E4735A', dima: '#E4735A' };
  // Вид сбоку на общую землю: три домика слева на разном удалении (дальние выше и мельче), школа справа;
  // дорожки — пунктир по земле от каждого дома к двери школы. Возвращает точки на дорожках для героев.
  function paths(s, g, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), ground = o.ground || 560;
    s.node(G, 'rect', { x: 0, y: ground, width: 1920, height: 1080 - ground, fill: '#ECE3CF' });
    ln(s, G, 'M0 ' + ground + ' H1920', 2.4, FLOOR);
    var door = [1500, ground + 20];
    school(s, G, 1500, ground + 20, 0.8);
    var homes = { dima: [220, ground + 30, 0.6], anya: [330, ground + 210, 0.8], misha: [200, ground + 430, 1] }, res = {};
    Object.keys(homes).forEach(function (k) {
      var h = homes[k]; house(s, G, h[0], h[1], h[2]);
      var x0 = h[0] + 90 * h[2], y0 = h[1], d = 'M' + x0 + ' ' + y0 + ' C' + (x0 + 420) + ' ' + y0 + ' ' + (door[0] - 360) + ' ' + (door[1] + 10) + ' ' + (door[0]) + ' ' + (door[1] + 6);
      s.path(G, d, { stroke: '#2F4A8A', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 14', opacity: 0.8 });
      res[k] = { d: d, home: h, start: [x0, y0], k: h[2] };
    });
    return { g: G, paths: res, door: door, ground: ground };
  }
  // Точка на дорожке героя: t = 0 — у дома, 1 — у двери школы (кубическая кривая из paths)
  function pathPoint(p, who, t) {
    var q = p.paths[who], x0 = q.start[0], y0 = q.start[1], d = p.door;
    var c1 = [x0 + 420, y0], c2 = [d[0] - 360, d[1] + 10], e = [d[0], d[1] + 6], u = 1 - t;
    return { x: u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * e[0], y: u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * e[1], k: q.k };
  }

  // Заставка главы «дорога в школу» (v3.6): дорожки меняются с возрастом.
  // stage 1 — каждый идёт своей дорожкой; 2–3 — дорожки Миши и Ани сходятся, к школе они идут вместе; 4 — к ним присоединяется Дима.
  // Все трое успевают дойти до двери за [t0, t0 + dur]; hero — герой главы (его дорожка ярче, он чуть крупнее). Возвращает { g, door }.
  function bez(a, c1, c2, b, t) { var u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; }
  function sample(a, c1, c2, b, n) { var r = []; for (var i = 0; i <= n; i++) r.push(bez(a, c1, c2, b, i / n)); return r; }
  function dOf(pts) { return pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); }
  function schoolRoad(s, g, stage, hero, t0, dur, o) {
    o = o || {};
    var G = s.node(g, 'g', {}), ground = o.ground || 560;
    s.node(G, 'rect', { x: 0, y: ground, width: 1920, height: 1080 - ground, fill: '#ECE3CF' });
    ln(s, G, 'M0 ' + ground + ' H1920', 2.4, FLOOR);
    var E = [1500, ground + 26];
    school(s, G, 1500, ground + 20, 0.8);
    var homes = { dima: [220, ground + 30, 0.6], anya: [330, ground + 210, 0.8], misha: [200, ground + 430, 1] };
    var M = [900, ground + 250]; // точка, где сходятся дорожки
    var together = stage >= 4 ? ['misha', 'anya', 'dima'] : stage >= 2 ? ['misha', 'anya'] : [];
    var shared = sample(M, [M[0] + 260, M[1]], [E[0] - 260, E[1] + 10], E, 10), routes = {};
    Object.keys(homes).forEach(function (k) {
      var h = homes[k]; house(s, G, h[0], h[1], h[2]);
      var S = [h[0] + 90 * h[2], h[1]];
      var pts = together.indexOf(k) >= 0
        ? sample(S, [S[0] + 280, S[1]], [M[0] - 220, M[1]], M, 10).concat(shared.slice(1))
        : sample(S, [S[0] + 420, S[1]], [E[0] - 360, E[1] + 10], E, 20);
      var hot = k === hero || (stage === 4 && !hero);
      s.path(G, dOf(pts.slice(0, together.indexOf(k) >= 0 ? 11 : 21)), { stroke: '#2F4A8A', 'stroke-width': hot ? 5 : 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 14', opacity: hot ? 0.95 : 0.55 });
      routes[k] = { pts: pts, k0: h[2] };
    });
    if (together.length) s.path(G, dOf(shared), { stroke: '#2F4A8A', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.85 }); // общая дорожка — сплошная
    // дети идут: по 20 отрезкам, без рывков; вместе идущие — рядом (сдвиг поперёк дорожки), масштаб к школе уменьшается
    var side = stage >= 4 ? { misha: 0, anya: -70, dima: -140 } : { misha: 0, anya: -70, dima: 0 }; // на общей дорожке идут друг за другом (сдвиг по ходу), не друг на друге
    Object.keys(routes).forEach(function (k) {
      var r = routes[k], id = Film.school.CAST[k][0], n = r.pts.length - 1, dt = dur / n;
      var base = 84 * (k === hero ? 1.12 : 1);
      var pos = function (i) { var q = r.pts[i], f = i / n, w = together.indexOf(k) >= 0 ? side[k] * Math.min(1, Math.max(0, (i - 6) / 4)) : 0, sc = r.k0 + (0.8 - r.k0) * f; return { x: q[0] + w, y: q[1] - 46 * sc, d: base * sc }; };
      var p0 = pos(0);
      Film.school.cast(s, k, p0.x, p0.y, p0.d, Math.max(0, t0 - 0.3), { dur: 0.01, gx: 10 });
      for (var i = 1; i <= n; i++) { var p = pos(i); s.actor(id, { x: p.x, y: p.y, d: p.d }, t0 + (i - 1) * dt, dt, 'none'); }
      s.tween(s.A[id].body, t0, { y: 0 }, { y: -6, duration: dur / (2 * Math.max(4, Math.round(n / 3))), ease: 'sine.inOut', yoyo: true, repeat: 2 * Math.max(4, Math.round(n / 3)) - 1 });
      s.actor(id, { o: 0 }, t0 + dur + 0.05, 0.01); // вошли в дверь
    });
    return { g: G, door: E };
  }

  Film.places = { schoolRoad: schoolRoad, bags: bags, SEATS: SEATS, pathPoint: pathPoint, standY: standY, page: page, house: house, school: school, tree: tree, bench: bench, classroom: classroom, fill: fill, yard: yard, classics: classics, kitchen: kitchen, paths: paths, chalk: chalk, PATHC: PATHC, INK: INK, BOARD: BOARD };
})();
