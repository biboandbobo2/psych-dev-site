/* Глава 2. Думать по правилам · Аня (v3.3, «Язык 7–10»): самая младшая (Лейтон), куда поставить 150 (Сиглер, Опфер), кит — рыба? (Выготский) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', CHALK = '#F4F1E6', BOARD = '#3B5E54', FRAME = '#C9A27A', WOOD = '#E9D9BF', FLOOR = '#C9BBA2',
    PAPER = '#FFFDF8', GLASS = '#E8F1EE', RED = '#D9534F', TEAL = '#26A69A', WATER = '#BFDCE5';
  var LEN = 67.5; // длина главы — для подписи в углу
  var GX = -12; // дети в классе смотрят на доску (она слева)

  // ---------- общее для главы ----------
  function L(w, fill) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function ln(s, g, d, w, c) { return s.path(g, d, { stroke: c || INK, 'stroke-width': w || 3 }); }
  // мел на доске (svg-текст рукописью)
  function chalk(s, g, x, y, text, size, o) {
    o = o || {};
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', fill: o.color || CHALK, style: 'font-family: var(--hand); font-size: ' + (size || 40) + 'px' });
    t.textContent = text; return t;
  }
  // детский почерк в облачке (svg-текст)
  function kid(s, g, x, y, text, size, color) {
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': 'middle', fill: color || INK, style: 'font-family: var(--kid); font-weight: 700; font-size: ' + (size || 40) + 'px' });
    t.textContent = text; return t;
  }
  // герой в кадр: актёр + спокойные брови, руки спрятаны
  function on(s, who, x, y, d, lt, o) {
    var id = K().cast(s, who, x, y, d, 0, Object.assign({}, o, { dur: 0.01 })); // стоят с начала сцены — без проявления «призраком»
    s.brow(id, (o && o.brow) || 'calm', 0, 0.01); if (who !== 'teacher') s.hands(id, 'off', 0, 0.01); // у учителя руки видны всегда
    if (who === 'misha') s.gear(id, 'backpack', !!(o && o.pack), 0, 0.01); // в классе ранец не на Мише — стоит у стула
    return id;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); if (id !== 'adult2') s.hands(id, 'off', s.dur - 0.4, 0.3); }); }
  function show(s, e, lt) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 }); }
  function hide(s, e, lt) { [].concat(e).forEach(function (x) { s.set(x, lt, { opacity: 1 }, { opacity: 0 }); }); }
  function fadeIn(s, e, lt, dur) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: dur || 0.3 }); }
  // нижний текст и вывод — как в главе 1: 32 px, строками, «Вывод:» акцентом
  function bottom(s, html, lt) {
    var e = s.hud('lead', html, { left: 140, top: 912, width: 1640, fontSize: 32, lineHeight: 1.3 });
    s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 });
    s.lines(e, lt);
    s.tween(e, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function concl(s, text, lt) { return bottom(s, '<b class="acc">Вывод:</b> ' + text, lt); }
  function cite(s, text, lt) {
    var h = s.hud('cite', text, { left: 140, top: text.length > 140 ? 1004 : 1030, width: 1640, fontSize: 20 }); // длинный источник — в две строки, не обрезается краем
    s.tween(h, lt, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    s.tween(h, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.4 });
    return h;
  }
  // текст в слое #ui: переживает перелистывание; гаснет в out (или к концу сцены)
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  // быстрое перелистывание: лист проезжает за 0,5 с, смена кадра — в середине
  function flip(s, at) {
    var e = s.hud('pageflip', '', { left: 0, top: 0, width: 1920, height: 1080 }); // в слое #ui: камера не уменьшает лист
    s.tween(e, at, { x: 1960, opacity: 1 }, { x: -2000, opacity: 1, duration: 0.4, ease: 'power1.inOut' });
    return at + 0.2;
  }
  // стоп-кадр с подписью у значка паузы
  function freeze(s, at, dur) {
    s.freeze(at, dur);
    var e = s.hud('cite', 'пауза', { left: 1000, top: 994, fontSize: 22, color: 'var(--accent-deep)' });
    s.tween(e, at + 0.1, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    s.tween(e, at + dur - 0.25, { opacity: 1 }, { opacity: 0, duration: 0.2 });
  }
  // одноклассник в обёртке-группе (чтобы двигать)
  function mate(s, g, i, x, y, r, gx) { var w = s.node(g, 'g', {}); K().classmate(w, i, x, y, r, { gx: gx == null ? GX : gx }); return w; }
  // плавная ходьба той же общей длительности T (Film.glide: одно движение + мягкое покачивание)
  function glideT(s, id, x1, lt, T, o) {
    var dx = Math.abs(x1 - s.A[id].st.x), n = Math.max(1, Math.round(dx / 110));
    return Film.glide(s, id, x1, lt, Object.assign({ step: Math.max(1, dx / n), dur: T / n, hold: 0.14 }, o || {})); // 0,14 — как было при ловушке «hold: 0 = по умолчанию»; с ним собран опубликованный ролик
  }
  // Заставка главы: общая «дорога в школу» (places.schoolRoad) — трое доходят до двери, герой главы выделен
  function trio(s, n, title, sub, who) {
    // подпись главы выше обычной — не наезжает на школу общей карты
    var num = s.text('display acc', String(n), { left: 140, top: 140, fontSize: 250, lineHeight: 1 }); s.pop(num, 0.02, { from: 0.8, dur: 0.9 });
    var tt = s.text('h1', title, { left: 330, top: 196, width: 1000 }); s.lines(tt, 0.12, { dur: 1.0 });
    var st = s.text('lead', sub, { left: 336, top: 312, width: 900, fontSize: 34 }); s.fade(st, 0.35, { y: 8 }); // подзаголовок обычным регистром, как в главе 1
    s.gear('baby', 'backpack', true, 0, 0.01); // по дороге ранец на Мише
    ['baby', 'kid2', 'kid3'].forEach(function (id) { s.brow(id, 'calm', 0, 0.01); s.hands(id, 'off', 0, 0.01); });
    P().schoolRoad(s, s.svg(), n, who, 0.4, 3.8);
    s.chapter(n, title, 0.4, LEN - 0.6);
  }


  // 2:07,5 — заставка главы (27 тактов = 67,5 с)
  Film.scene({
    id: 'ch2', bars: 2,
    build: function (s) { trio(s, 2, 'Думать по правилам', 'Аня — младше всех и боится отстать', 'anya'); }
  });


  // большая доска пониже (ребёнку дотянуться): в том же классе places.classroom, старая доска закрыта стеной
  function lowBoard(s, g, x, y, w, h) {
    s.node(g, 'rect', { x: 78, y: 238, width: 564, height: 344, fill: '#F7F4EC' });
    s.node(g, 'rect', Object.assign({ x: x - 10, y: y - 10, width: w + 20, height: h + 20, rx: 6 }, L(3, FRAME)));
    s.node(g, 'rect', Object.assign({ x: x, y: y, width: w, height: h, rx: 4 }, L(3, BOARD)));
    ln(s, g, 'M' + (x + 30) + ' ' + (y + h + 10) + ' h' + (w - 60), 4, FRAME);
  }
  function seatOf(cr, who) { var q = cr.heroes[who].split(':'); return cr.seats[+q[0]][+q[1]]; }
  // класс: places.classroom как есть; одноклассники на всех местах, кроме героев; ранец Миши стоит на полу у его стула
  function klass(s, g) {
    var cr = P().classroom(s, g, {});
    P().fill(s, g, cr.seats, ['0:0', '0:1', '0:3'], 0, GX);
    var pm = seatOf(cr, 'misha');
    Film.toys.backpack(s, g, pm.x + 70, cr.floor - 30, 0.75, '#26A69A', '#1C7A71'); // тот же размер, что в главах 1 и 4
    P().bags(s, g, cr.seats, cr.floor, [0]); // ранцы одноклассников у стульев первого ряда
    return cr;
  }
  // реплика: облачко с хвостом к говорящему (tx, ty — кончик хвоста)
  function talk(s, parent, text, x, y, w, tx, ty, at, out, size) {
    var b = s.node(parent, 'g', {}), h = (size || 34) + 32, bx = x + 26;
    s.path(b, 'M' + bx + ' ' + (y + h - 2) + ' L' + tx + ' ' + ty + ' L' + (bx + 26) + ' ' + (y + h - 2) + ' Z', L(2.5, PAPER));
    s.node(b, 'rect', Object.assign({ x: x, y: y, width: w, height: h, rx: h / 2 }, L(2.5, PAPER)));
    s.node(b, 'rect', { x: bx + 2, y: y + h - 5, width: 22, height: 6, fill: PAPER });
    var t = s.node(b, 'text', { x: x + w / 2, y: y + h / 2 + (size || 34) * 0.35, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--hand); font-size: ' + (size || 34) + 'px' });
    t.textContent = text;
    s.tween(b, at, { opacity: 0, scale: 0.7, svgOrigin: tx + ' ' + ty }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    s.tween(b, out, { opacity: 1 }, { opacity: 0, duration: 0.3 });
    return b;
  }

  // 2:12,5 — Самая младшая (Т. Лейтон и др., 2018)
  Film.scene({
    id: 'smallest', bars: 6,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // кадр 1: Ирина Петровна строит класс по дням рождения — шеренга от неё слева направо, сентябрь → август
      var A = s.node(g, 'g', {}), cr0 = P().classroom(s, A, { rows: [] }), FL = cr0.floor; // парты сдвинуты: все встали в шеренгу на свободном полу
      s.node(A, 'rect', { x: 0, y: FL - 190, width: 1920, height: 190, fill: '#EFE6D6' }); ln(s, A, 'M0 ' + (FL - 190) + ' H1920', 3, FLOOR); // полоса пола, как в остальных классах
      var t1 = s.text('h3', 'В одном классе разница — почти год.', { left: 140, top: 130, width: 1040, fontSize: 40 });
      s.lines(t1, 0.3);
      var TD = 150, TX = cr0.teacher.x, TY = P().standY(FL, TD, true);
      on(s, 'teacher', TX, TY, TD, 0.1, { gx: 10 });
      var N = 10, X = function (i) { return 600 + i * 132 + (i >= 6 ? 24 : 0); }, D = function (i) { return i === 9 ? 74 : 112 - i * 2.6; }; // Аня (последняя, август) заметно меньше всех
      var who = { 3: 'dima', 6: 'misha', 9: 'anya' }, m = 0;
      for (var i = 0; i < N; i++) {
        var t = 0.6 + i * 0.17;
        if (who[i]) { on(s, who[i], X(i), FL - D(i) / 2, D(i), t, { gx: -6, dur: 0.25 }); continue; }
        mate(s, A, m++, X(i), FL - D(i) / 2, D(i) / 2, -6); // стоят с начала сцены
      }
      s.gaze('adult2', 10, 4, 0.6, 0.3);
      var m1 = s.text('label', 'сентябрь', { left: X(0) - 100, top: FL - D(0) - 48, width: 200, textAlign: 'center' });
      var m2 = s.text('label', 'август', { left: X(N - 1) - 100, top: FL - D(N - 1) - 50, width: 200, textAlign: 'center', color: 'var(--accent-deep)' });
      s.fade(m1, 0.9, { y: 4 }); s.fade(m2, 2.3, { y: 4 });
      s.brow('kid2', 'doubt', 2.5, 0.3); s.mouth('kid2', 'soft', 2.5, 0.3);

      // кадр 2: урок; Аня вертится, роняет пенал — у Ирины Петровны мысль «СДВГ?»; календарь у доски — мысль гаснет
      var sw = flip(s, 3.6);
      hide(s, [A, t1, m1, m2], sw);
      var B = s.node(g, 'g', {});
      show(s, B, sw);
      var cr = klass(s, B), F = cr.floor;
      var pm = seatOf(cr, 'misha'), pa = seatOf(cr, 'anya'), pd = seatOf(cr, 'dima');
      s.gear('baby', 'backpack', false, sw, 0.01);
      s.actor('baby', { x: pm.x, y: pm.y, d: 2 * pm.r }, sw, 0.01); s.gaze('baby', GX, 0, sw, 0.01);
      s.actor('kid2', { x: pa.x, y: pa.y, d: 2 * pa.r }, sw, 0.01); s.gaze('kid2', GX, 0, sw, 0.01); s.brow('kid2', 'calm', sw, 0.01);
      s.actor('kid3', { x: pd.x, y: pd.y, d: 2 * pd.r }, sw, 0.01); s.gaze('kid3', GX, 0, sw, 0.01);
      ['baby', 'kid3'].forEach(function (id) { s.hands(id, 'desk', sw, 0.01); });
      // пенал на парте Ани
      // Аня вертится
      s.hands('kid2', 'side', sw + 0.4, 0.08); s.brow('kid2', 'doubt', sw + 0.4, 0.2);
      [0, 1, 2, 3].forEach(function (j) {
        var tt = sw + 0.5 + j * 0.3;
        s.actor('kid2', { x: pa.x + (j % 2 ? -10 : 10) }, tt, 0.15, 'sine.inOut');
        s.squash('kid2', 1.05, 0.95, tt, 0.08); s.squash('kid2', 1, 1, tt + 0.08, 0.14);
      });
      s.actor('kid2', { x: pa.x }, sw + 1.7, 0.2);
      s.gaze('kid2', 10, -4, sw + 0.5, 0.2); s.gaze('kid2', -8, 4, sw + 1.1, 0.2);
      s.mouth('kid2', 'flat', sw + 2.1, 0.2); s.gaze('kid2', -4, 8, sw + 2.1, 0.2); s.brow('kid2', 'sad', sw + 2.1, 0.2); s.hands('kid2', 'off', sw + 2.1, 0.08);
      s.brow('adult2', 'doubt', sw + 2.3, 0.3); s.mouth('adult2', 'flat', sw + 2.3, 0.3); s.gaze('adult2', 10, 2, sw + 2.3, 0.3);
      // мысль учителя: облачко над ней, пузырьки ведут к ней
      var CX = 820, CY = 600, th = s.node(ov, 'g', {});
      Film.icons.cloud(s, th, CX, CY, 115, 48, { tail: [TX + 30, TY - TD / 2 - 6], at: sw + 2.6, dur: 0.5 });
      var tq = s.node(th, 'text', { x: CX, y: CY + 15, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--kid); font-weight: 700; font-size: 44px' }); tq.textContent = 'СДВГ?';
      s.tween(tq, sw + 3.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var t2 = s.text('h3', 'Самым младшим в классе на треть чаще ставят СДВГ — синдром дефицита внимания и гиперактивности.', { left: 140, top: 130, width: 1040, fontSize: 36 }); // две строки — не наезжает на доску
      s.lines(t2, sw + 0.3);
      // листок календаря на стене у доски
      var cal = s.node(B, 'g', {}), KX = 760, KY = 250;
      s.node(cal, 'rect', Object.assign({ x: KX - 60, y: KY, width: 120, height: 140, rx: 6 }, L(2.6, PAPER)));
      s.node(cal, 'rect', Object.assign({ x: KX - 60, y: KY, width: 120, height: 38, rx: 6 }, L(2.6, RED)));
      s.node(cal, 'circle', { cx: KX, cy: KY - 8, r: 6, fill: INK });
      var cm = s.node(cal, 'text', { x: KX, y: KY + 27, 'text-anchor': 'middle', fill: '#FFFDF8', style: 'font-family: var(--sans); font-weight: 700; font-size: 22px' }); cm.textContent = 'август';
      var cn = s.node(cal, 'text', { x: KX, y: KY + 120, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--serif); font-weight: 600; font-size: 74px' }); cn.textContent = '31';
      var cc = s.node(cal, 'text', { x: KX, y: KY + 172, 'text-anchor': 'middle', fill: '#13534D', style: 'font-family: var(--sans); font-weight: 700; font-size: 22px' }); cc.textContent = 'день рождения Ани';
      s.tween(cal, 10.2, { opacity: 0, scale: 0.6, svgOrigin: KX + ' ' + (KY + 70) }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
      s.gaze('adult2', 10, -6, 10.4, 0.3); s.gaze('kid2', -6, -8, 10.5, 0.3);
      s.tween(th, 10.8, { opacity: 1 }, { opacity: 0, duration: 0.6 });
      s.brow('adult2', 'calm', 11.0, 0.3); s.mouth('adult2', 'soft', 11.0, 0.3); s.gaze('adult2', 10, 2, 11.2, 0.3);
      s.brow('kid2', 'calm', 11.3, 0.3); s.mouth('kid2', 'smile', 11.3, 0.3);
      bottom(s, 'Часто за диагнозом — <b class="acc">просто возраст</b>: ребёнок младше соседей.', 10.9);
      cite(s, 'Т. Лейтон и др., 2018: 408 тыс. детей, США; где граница набора в другой день — разницы нет', 11.6);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });

  // 2:27,5 — Куда поставить 150? (Р. Сиглер, Дж. Опфер, 2003; 2007)
  Film.scene({
    id: 'line150', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // кадр 1: Аня решает 3 + 5; в облачке над ней — схема счёта палочками; соседи уже подняли руки
      var A = s.node(g, 'g', {});
      var cr = klass(s, A), F1 = cr.floor;
      var pm = seatOf(cr, 'misha'), pa = seatOf(cr, 'anya'), pd = seatOf(cr, 'dima');
      on(s, 'misha', pm.x, pm.y, 2 * pm.r, 0.05, { gx: GX, dur: 0.01 });
      on(s, 'anya', pa.x, pa.y, 2 * pa.r, 0.05, { gx: GX, dur: 0.01, brow: 'focus' });
      on(s, 'dima', pd.x, pd.y, 2 * pd.r, 0.05, { gx: GX, dur: 0.01 });
      var TD = 150, TY = P().standY(F1, TD, true);
      on(s, 'teacher', cr.teacher.x, TY, TD, 0.05, { gx: 10, dur: 0.01 });
      s.hands('kid2', 'desk', 0.05, 0.01); s.hands('baby', 'desk', 0.05, 0.01); s.hands('kid3', 'desk', 0.05, 0.01);
      var bx = cr.board.x + cr.board.w / 2, by = cr.board.y + cr.board.h / 2 + 22;
      var ex1 = chalk(s, A, bx - 30, by, '3 + 5 =', 76); fadeIn(s, ex1, 0.2);
      var ta = s.text('h3', 'Аня решает 3 + 5 — то пальцами, то в уме.', { left: 140, top: 130, width: 1040, fontSize: 40 });
      s.lines(ta, 0.3);
      var CX = 1130, CY = 455, cl = Film.icons.cloud(s, ov, CX, CY, 195, 78, { tail: [1250, 622], at: 0.6, dur: 0.5 }); // пузырьки — в просвет над задними партами, к Ане
      // палочки: | | | + | | | | |
      function sticks(a, b, t0) {
        var G = s.node(ov, 'g', {}), xs = [], n = a + b, w = 30, x0 = CX - ((n - 1) * w + 30) / 2;
        for (var k = 0; k < n; k++) xs.push(x0 + k * w + (k >= a ? 30 : 0));
        var st = xs.map(function (x) { return s.path(G, 'M' + x + ' ' + (CY - 34) + ' V' + (CY + 10), { stroke: INK, 'stroke-width': 5 }); });
        var pl = kid(s, G, x0 + (a - 1) * w + 30, CY - 2, '+', 40);
        s.tween(st.concat([pl]), t0, { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.04 });
        return { g: G, st: st, xs: xs };
      }
      var S1 = sticks(3, 5, 1.0);
      S1.st.forEach(function (p, k) {
        var tt = 1.4 + k * 0.15;
        s.tween(p, tt, { stroke: INK }, { stroke: TEAL, duration: 0.08 });
        var nm = kid(s, S1.g, S1.xs[k], CY + 44, String(k + 1), 26, TEAL);
        s.tween(nm, tt, { opacity: 0 }, { opacity: 1, duration: 0.1 });
      });
      s.gaze('kid2', 0, -8, 1.0, 0.3);
      // соседи уже подняли руки — Аня сомневается: «Я не успеваю…»
      s.hands('baby', 'up', 1.9, 0.3); s.hands('kid3', 'up', 2.0, 0.3);
      s.gaze('kid2', 8, 0, 2.2, 0.2); s.brow('kid2', 'doubt', 2.2, 0.25); s.mouth('kid2', 'flat', 2.2, 0.25);
      talk(s, ov, 'Я не успеваю…', 1372, 500, 250, pa.x + 46, pa.y - pa.r + 6, 2.3, 4.5, 30); // хвост — между задним рядом, к Ане
      s.tween(S1.g, 2.8, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — «5 → 6, 7, 8»
      var c5 = [kid(s, ov, CX - 100, CY + 10, '5 →', 48), kid(s, ov, CX - 12, CY + 10, '6,', 48), kid(s, ov, CX + 48, CY + 10, '7,', 48), kid(s, ov, CX + 102, CY + 10, '8', 48)];
      c5.forEach(function (e, k) { s.tween(e, 2.95 + k * 0.22, { opacity: 0 }, { opacity: 1, duration: 0.15 }); });
      s.tween(c5, 3.8, { opacity: 1 }, { opacity: 0, duration: 0.2 });
      // потом — сразу «8»
      var c8 = kid(s, ov, CX, CY + 28, '8', 88, TEAL);
      s.tween(c8, 3.95, { opacity: 0, scale: 0.5, svgOrigin: CX + ' ' + CY }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      var ans = chalk(s, A, bx + 150, by, '8', 76); fadeIn(s, ans, 4.05);
      s.gaze('kid2', GX, -4, 3.9, 0.2); s.brow('kid2', 'calm', 4.0, 0.2); s.mouth('kid2', 'soft', 4.0, 0.2);
      s.hands('baby', 'desk', 4.2, 0.3); s.hands('kid3', 'desk', 4.2, 0.3);
      // следующий пример — и в облачке снова палочки; Ирина Петровна идёт к большой доске
      s.tween([ex1, ans, c8], 4.4, { opacity: 1 }, { opacity: 0, duration: 0.15 });
      var ex2 = chalk(s, A, bx - 30, by, '4 + 3 =', 76); fadeIn(s, ex2, 4.5, 0.2);
      s.brow('kid2', 'focus', 4.5, 0.2);
      var S2 = sticks(4, 3, 4.6);
      var TX2 = 150;
      glideT(s, 'adult2', TX2, 4.5, 0.75); s.gaze('adult2', -12, 0, 4.5, 0.2); // идёт влево — смотрит влево

      // кадр 2: «2 класс». Аню вызвали к доске. Числовая прямая 0…1000. Куда поставить 150? Стоп-кадр.
      var sw = flip(s, 5.3);
      hide(s, [A, ta, cl, S2.g], sw);
      var B = s.node(g, 'g', {});
      show(s, B, sw);
      var cr2 = klass(s, B);
      lowBoard(s, B, 230, 380, 560, 440);
      s.actor('baby', { x: pm.x, y: pm.y }, sw, 0.01); s.gaze('baby', GX, -2, sw, 0.01);
      s.actor('kid3', { x: pd.x, y: pd.y }, sw, 0.01); s.gaze('kid3', GX, -2, sw, 0.01);
      var AY = F1 - 55;
      s.actor('kid2', { x: 600, y: AY, d: 110 }, sw, 0.01); s.gaze('kid2', -10, -6, sw, 0.01); s.hands('kid2', 'off', sw, 0.01);
      s.brow('kid2', 'calm', sw, 0.01); s.mouth('kid2', 'smile', sw, 0.01);
      s.gaze('adult2', 10, 0, sw, 0.01);
      var L0 = 300, L1 = 740, LY = 760, X = function (v) { return L0 + (L1 - L0) * v / 1000; };
      var c2 = chalk(s, B, 258, 430, '2 класс', 40, { anchor: 'start' });
      var nl = s.path(B, 'M' + L0 + ' ' + LY + ' H' + L1 + ' M' + L0 + ' ' + (LY - 16) + ' V' + (LY + 16) + ' M' + L1 + ' ' + (LY - 16) + ' V' + (LY + 16), { stroke: CHALK, 'stroke-width': 5 });
      s.draw(nl, sw + 0.2, { dur: 0.7 });
      var n0 = chalk(s, B, L0, LY - 26, '0', 34), n1 = chalk(s, B, L1, LY - 26, '1000', 34); // подписи над прямой — Аня у доски их не закрывает
      fadeIn(s, [n0, n1], sw + 0.8);
      hudText(s, 'h3', 'Числовая прямая: от 0 до 1000. Куда поставить 150?', { left: 140, top: 130, width: 1000, fontSize: 40 }, sw + 0.3, 11.0);
      freeze(s, 8.3, 2.6);
      hudText(s, 'h3 acc', 'Угадайте.', { left: 140, top: 230, fontSize: 40 }, 8.4, 11.0);
      // кадр 3: Аня ставит флажок почти на середину; потом красный флажок учителя у 150; потом объяснение
      // флажок-магнит: из руки (hx, hy) встаёт на прямую; left — полотнище влево; hgt — высота древка
      function flag(color, x, t, hx, hy, left, hgt) {
        var f = s.node(B, 'g', {}), H = hgt || 100;
        ln(s, f, 'M' + x + ' ' + LY + ' V' + (LY - H), 5, '#8B6A45');
        s.path(f, 'M' + x + ' ' + (LY - H) + ' l' + (left ? -48 : 48) + ' 17 l' + (left ? 48 : -48) + ' 17 Z', L(2.4, color));
        s.tween(f, t, { opacity: 0, x: hx - x, y: hy - LY + 40, scale: 0.6, svgOrigin: x + ' ' + LY }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
        return f;
      }
      var AX = X(470);
      s.gaze('kid2', -12, 0, 10.9, 0.15); glideT(s, 'kid2', AX - 62, 11.0, 0.8);
      s.brow('kid2', 'proud', 11.9, 0.2); s.hands('kid2', 'up', 11.9, 0.12); s.gaze('kid2', 6, -8, 11.9, 0.2);
      var fa = flag(TEAL, AX, 12.1, AX + 6, AY - 55);
      var la = chalk(s, B, AX + 26, LY - 112, 'Аня', 26); fadeIn(s, la, 12.4);
      s.hands('kid2', 'side', 12.6, 0.3);
      s.gaze('adult2', 12, 0, 12.5, 0.15); glideT(s, 'adult2', 185, 12.6, 0.6); s.gaze('adult2', 10, -4, 13.2, 0.2);
      flag(RED, X(150), 13.3, 290, TY + 40);
      var lr = chalk(s, B, X(150) + 30, LY - 112, 'правильно', 26, { color: '#F5D27A' }); fadeIn(s, lr, 13.5);
      s.brow('kid2', 'sad', 13.7, 0.3); s.mouth('kid2', 'flat', 13.7, 0.3); s.gaze('kid2', -10, -6, 13.7, 0.3); s.hands('kid2', 'off', 13.7, 0.3);
      s.mouth('baby', 'smile', 13.9, 0.2); s.mouth('kid3', 'smile', 13.9, 0.2);
      hudText(s, 'h3', 'Так ошибаются почти все второклассники: 100 для них — уже огромное число, и маленькие числа в голове «растянуты».', { left: 140, top: 130, width: 1000, fontSize: 40 }, 14.1, 19.0);
      cite(s, 'Р. Сиглер, Дж. Опфер, 2003: «растянуто» расставляют числа 91 % второклассников и 3 % взрослых · Дж. Опфер, Р. Сиглер, 2007 · счёт разными способами вперемешку — Р. Сиглер, 1987; 1996', 15.0);
      s.gaze('adult2', -12, 0, 18.3, 0.15); glideT(s, 'adult2', TX2, 18.4, 0.7); s.gaze('adult2', 10, 0, 19.15, 0.15); // учитель отходит — не телепортируется
      // кадр 4: «4 класс» — та же прямая; бледный старый флажок «2 класс», красный «правильно» на месте; Аня ставит почти точно
      var sw2 = flip(s, 19.4);
      hide(s, [c2, la], sw2);
      s.set(fa, sw2, { opacity: 1 }, { opacity: 0.35 });
      var lo = chalk(s, B, AX + 26, LY - 112, '2 класс', 24, { color: '#A9B8B2' }); show(s, lo, sw2);
      var c4 = chalk(s, B, 258, 430, '4 класс', 40, { anchor: 'start' }); show(s, c4, sw2);
      s.mouth('adult2', 'smile', sw2, 0.01); s.brow('adult2', 'calm', sw2, 0.01);
      s.actor('kid2', { x: 600 }, sw2, 0.01); s.brow('kid2', 'focus', sw2, 0.01); s.mouth('kid2', 'soft', sw2, 0.01); s.gaze('kid2', -10, -4, sw2, 0.01);
      var NX = X(160);
      s.gaze('kid2', -12, 0, 19.8, 0.15); glideT(s, 'kid2', NX - 66, 19.9, 0.9);
      s.hands('kid2', 'up', 20.8, 0.12);
      flag(TEAL, NX, 21.0, NX + 2, AY - 55, true, 70);
      // флажок 4 класса без подписи: Аня стоит под ним и говорит «Успела!» — подпись налезала на «правильно»
      s.hands('kid2', 'side', 21.4, 0.3); s.brow('kid2', 'proud', 21.4, 0.2); s.mouth('kid2', 'smile', 21.4, 0.2); s.gaze('kid2', 4, -6, 21.4, 0.2);
      s.squash('kid2', 0.94, 1.08, 21.5, 0.1); s.squash('kid2', 1, 1, 21.6, 0.3, 'back.out(3)');
      s.gaze('kid2', 12, 0, 21.75, 0.15); glideT(s, 'kid2', 610, 21.8, 0.7); s.gaze('kid2', 2, -2, 22.55, 0.2);
      talk(s, ov, 'Успела!', 535, 668, 150, 600, AY - 52, 22.5, 24.4);
      s.mouth('adult2', 'smile', 21.8, 0.2);
      concl(s, 'к 4 классу числа в голове выстраиваются ровно.', 21.4);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });

  // ---------- картинки для «Кита»: карточки — плоская заливка, на доске — мелом ----------
  function fishD(s, g, x, y, k, st) {
    var d = 'M' + (x + 32 * k) + ' ' + y + ' Q' + (x + 2 * k) + ' ' + (y - 24 * k) + ' ' + (x - 26 * k) + ' ' + y + ' Q' + (x + 2 * k) + ' ' + (y + 24 * k) + ' ' + (x + 32 * k) + ' ' + y + ' Z' +
      ' M' + (x - 24 * k) + ' ' + y + ' L' + (x - 46 * k) + ' ' + (y - 17 * k) + ' L' + (x - 46 * k) + ' ' + (y + 17 * k) + ' Z';
    var b = s.path(g, d, st);
    var e = s.node(g, 'circle', { cx: x + 18 * k, cy: y - 5 * k, r: 3 * k, fill: st.stroke });
    return [b, e];
  }
  // кит: крупное тело, хвост поднят, лопасти хвоста врозь; фонтан над головой
  function whaleD(s, g, x, y, k, st) {
    var P2 = function (a, b) { return (x + a * k).toFixed(1) + ' ' + (y + b * k).toFixed(1); };
    var d = 'M' + P2(-46, 4) + ' Q' + P2(-44, -30) + ' ' + P2(0, -32) + ' Q' + P2(50, -32) + ' ' + P2(58, 0) + ' Q' + P2(58, 22) + ' ' + P2(24, 22) + ' L' + P2(-24, 22) + ' Q' + P2(-44, 20) + ' ' + P2(-46, 4) + ' Z' +
      ' M' + P2(-45, 6) + ' L' + P2(-64, 0) + ' L' + P2(-64, 8) + ' Z' +
      ' M' + P2(-62, 4) + ' L' + P2(-88, -20) + ' L' + P2(-78, 4) + ' L' + P2(-88, 26) + ' Z'; // хвост-«ласточка»
    var b = s.path(g, d, st);
    var e = s.node(g, 'circle', { cx: x + 34 * k, cy: y - 8 * k, r: 3.5 * k, fill: st.stroke });
    return [b, e];
  }
  // фонтан: струя вверх и брызги, загнутые вниз (как у фонтана), над точкой (x, y)
  function spout(s, g, x, y, k, color, w) {
    var P2 = function (a, b) { return (x + a * k).toFixed(1) + ' ' + (y + b * k).toFixed(1); };
    return s.path(g, 'M' + P2(0, 0) + ' L' + P2(0, -34) + ' M' + P2(0, -30) + ' Q' + P2(-10, -44) + ' ' + P2(-24, -32) + ' M' + P2(0, -30) + ' Q' + P2(10, -44) + ' ' + P2(24, -32), { stroke: color, 'stroke-width': w || 3 });
  }
  function catD(s, g, x, y, k) {
    s.path(g, 'M' + (x - 22 * k) + ' ' + (y - 8 * k) + ' L' + (x - 20 * k) + ' ' + (y - 34 * k) + ' L' + (x - 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 20 * k) + ' ' + (y - 34 * k) + ' L' + (x + 22 * k) + ' ' + (y - 8 * k) + ' Q' + (x + 24 * k) + ' ' + (y + 20 * k) + ' ' + x + ' ' + (y + 20 * k) + ' Q' + (x - 24 * k) + ' ' + (y + 20 * k) + ' ' + (x - 22 * k) + ' ' + (y - 8 * k) + ' Z', L(2.4, '#F5D27A'));
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 2 * k, r: 2.6 * k, fill: INK }); });
  }
  // собака: голова с висячими ушами и носом
  function dogD(s, g, x, y, k) {
    s.path(g, 'M' + (x - 18 * k) + ' ' + (y - 22 * k) + ' Q' + (x - 34 * k) + ' ' + (y - 18 * k) + ' ' + (x - 30 * k) + ' ' + (y + 8 * k) + ' Q' + (x - 22 * k) + ' ' + (y + 6 * k) + ' ' + (x - 18 * k) + ' ' + (y - 6 * k) + ' Z' +
      ' M' + (x + 18 * k) + ' ' + (y - 22 * k) + ' Q' + (x + 34 * k) + ' ' + (y - 18 * k) + ' ' + (x + 30 * k) + ' ' + (y + 8 * k) + ' Q' + (x + 22 * k) + ' ' + (y + 6 * k) + ' ' + (x + 18 * k) + ' ' + (y - 6 * k) + ' Z', L(2.4, '#B98A5E'));
    s.node(g, 'ellipse', Object.assign({ cx: x, cy: y - 2 * k, rx: 20 * k, ry: 22 * k }, L(2.4, '#E8C79A')));
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 8 * k, r: 2.6 * k, fill: INK }); });
    s.node(g, 'ellipse', { cx: x, cy: y + 8 * k, rx: 5 * k, ry: 3.6 * k, fill: INK });
  }
  // карточка 88 × 64 с картинкой (магнит на доске)
  function card(s, parent, x, y, draw, name) {
    var c = s.node(parent, 'g', {});
    s.node(c, 'rect', Object.assign({ x: x - 46, y: y - 36, width: 92, height: 72, rx: 8 }, L(2.2, PAPER)));
    draw(c, x, y);
    if (name) chalk(s, c, x, y + 64, name, 24); // подпись мелом под карточкой — едет вместе с ней
    return c;
  }


  // 2:52,5 — Кит — рыба? (Л. С. Выготский, 1934)
  Film.scene({
    id: 'whale', bars: 9,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var cr = klass(s, g), F = cr.floor;
      lowBoard(s, g, 230, 380, 560, 440); // та же большая доска, что в «150»
      var pm = seatOf(cr, 'misha'), pd = seatOf(cr, 'dima');
      on(s, 'misha', pm.x, pm.y, 2 * pm.r, 0.1, { gx: GX }); s.hands('baby', 'desk', 0.1, 0.01);
      on(s, 'dima', pd.x, pd.y, 2 * pd.r, 0.1, { gx: GX }); s.hands('kid3', 'desk', 0.1, 0.01);
      // нижняя часть доски — таблица мелом «рыбы | звери» (до неё Аня дотягивается); верхняя — рисунки учителя
      var COL = { f: [300, 400], b: [528, 626, 724] }, RY = 694;
      var tb = s.node(g, 'g', {});
      ln(s, tb, 'M464 610 V800 M250 640 H775', 3, CHALK);
      chalk(s, tb, 350, 630, 'рыбы', 30); chalk(s, tb, 626, 630, 'звери', 30);
      chalk(s, tb, 510, 428, 'Разложи: рыбы или звери?', 36); // задание — видно с начала сцены
      fadeIn(s, tb, 0.3, 0.4);
      var AY = F - 55, ax = 500;
      on(s, 'anya', ax, AY, 110, 0.2, { gx: -4, gy: -8, brow: 'focus' });
      var TD = 150, TY = P().standY(F, TD, true), TX = 150;
      on(s, 'teacher', TX, TY, TD, 0.2, { gx: 8 });
      // Аня раскладывает карточки: каждая — из её поднятой руки на своё место
      function put(c, to, t) {
        var fx = ax + 60 - to, fy = AY - 60 - RY;
        s.tween(c, t, { opacity: 0, x: fx, y: fy, scale: 0.6, svgOrigin: to + ' ' + RY }, { opacity: 1, x: fx, y: fy, scale: 0.6, duration: 0.12 });
        s.tween(c, t + 0.12, { x: fx, y: fy, scale: 0.6 }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.inOut' });
      }
      s.hands('kid2', 'up', 0.6, 0.12);
      put(card(s, g, COL.f[0], RY, function (c, x, y) { fishD(s, c, x + 6, y, 0.9, L(2.4, '#F5B97A')); }, 'рыба'), COL.f[0], 0.7);
      put(card(s, g, COL.b[0], RY, function (c, x, y) { catD(s, c, x, y + 4, 0.9); }, 'кошка'), COL.b[0], 1.3);
      put(card(s, g, COL.b[1], RY, function (c, x, y) { dogD(s, c, x, y + 4, 0.9); }, 'собака'), COL.b[1], 1.9);
      var wc = card(s, g, COL.f[1], RY, function (c, x, y) { whaleD(s, c, x + 10, y + 12, 0.55, L(2.2, '#BFD4E8')); spout(s, c, x + 21, y - 6, 0.6, '#5E8FB0', 2.6); }, 'кит');
      put(wc, COL.f[1], 2.5);
      s.hands('kid2', 'side', 3.1, 0.3); s.brow('kid2', 'proud', 3.0, 0.2); s.mouth('kid2', 'smile', 3.0, 0.2); s.gaze('kid2', 6, -6, 3.0, 0.2);
      s.squash('kid2', 0.94, 1.06, 3.0, 0.1); s.squash('kid2', 1, 1, 3.1, 0.3, 'back.out(3)');
      talk(s, ov, 'Он же плавает!', 440, 470, 260, 468, AY - 50, 3.1, 5.4); // хвост — в просвет между карточками
      // Ирина Петровна стоит сбоку доски, показывает рукой и рисует наверху: рыба с жабрами, кит у поверхности с фонтаном, мама-кит с китёнком
      s.gaze('kid2', -2, -10, 5.6, 0.3); s.brow('kid2', 'calm', 5.6, 0.3);
      var CH = { fill: 'none', stroke: CHALK, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      s.gaze('adult2', 10, -6, 6.0, 0.3); s.hands('adult2', 'up', 6.5, 0.3);
      var w0 = s.path(g, 'M265 470 q22 -9 44 0 t44 0 t44 0', { stroke: WATER, 'stroke-width': 3.5 });
      s.draw(w0, 6.7, { dur: 0.3 });
      var f1 = fishD(s, g, 330, 505, 0.9, CH);
      s.draw(f1[0], 6.9, { dur: 0.6 }); fadeIn(s, f1[1], 7.4);
      var gills = s.path(g, 'M334 497 q-4 8 0 16 M340 495 q-4 10 0 20', { stroke: '#F2A39E', 'stroke-width': 3.2 });
      s.draw(gills, 7.5, { dur: 0.3 });
      var l1 = chalk(s, g, 325, 574, 'дышит в воде', 23); fadeIn(s, l1, 7.7);
      var w1w = s.path(g, 'M430 516 q22 -9 44 0 t44 0 t44 0 t44 0', { stroke: WATER, 'stroke-width': 3.5 });
      s.draw(w1w, 8.0, { dur: 0.3 });
      var w1 = whaleD(s, g, 520, 514, 0.75, CH);
      s.draw(w1[0], 8.2, { dur: 0.6 }); fadeIn(s, w1[1], 8.7);
      var fn = spout(s, g, 535, 490, 0.85, WATER, 3.5);
      s.draw(fn, 8.8, { dur: 0.3 });
      var l2 = chalk(s, g, 518, 574, 'дышит воздухом', 23); fadeIn(s, l2, 9.0);
      var w2 = whaleD(s, g, 700, 502, 0.55, CH), w3 = whaleD(s, g, 722, 530, 0.28, CH);
      s.draw(w2[0], 9.3, { dur: 0.5 }); s.draw(w3[0], 9.7, { dur: 0.3 }); fadeIn(s, [w2[1], w3[1]], 9.8);
      var l3 = chalk(s, g, 698, 574, 'кормит молоком', 23); fadeIn(s, l3, 10.0);
      s.hands('adult2', 'side', 10.4, 0.3); s.gaze('adult2', 8, -2, 10.5, 0.3);
      // Аня сама переносит кита к зверям: подходит, берёт рукой и несёт
      s.gaze('kid2', -12, 0, 11.1, 0.15); glideT(s, 'kid2', COL.f[1] - 66, 11.2, 0.8); s.gaze('kid2', 6, -8, 12.0, 0.2); s.brow('kid2', 'focus', 11.2, 0.2); s.mouth('kid2', 'soft', 11.2, 0.2);
      s.hands('kid2', 'up', 12.1, 0.12);
      s.gaze('kid2', 12, -4, 12.35, 0.15); glideT(s, 'kid2', COL.b[2] - 66, 12.4, 1.2, { carry: wc, cx: 0 }); // кит едет вместе с рукой Ани s.gaze('kid2', 4, -6, 13.65, 0.2);
      s.hands('kid2', 'side', 13.7, 0.3); s.brow('kid2', 'proud', 13.7, 0.2); s.mouth('kid2', 'smile', 13.7, 0.2);
      s.squash('kid2', 0.94, 1.06, 13.8, 0.1); s.squash('kid2', 1, 1, 13.9, 0.3, 'back.out(3)');
      s.mouth('adult2', 'smile', 13.8, 0.2);
      hudText(s, 'h3', 'Житейское понятие ребёнок собирает из опыта — по виду. Научное получает готовым определением — в школе.', { left: 140, top: 130, width: 1000, fontSize: 40 }, 11.0);
      s.gaze('baby', GX, -6, 15.0, 0.4);
      concl(s, 'в школе учатся судить по признакам, а не по тому, как вещь выглядит.', 18.2);
      cite(s, 'Л. С. Выготский, «Мышление и речь», 1934, гл. 6 · scientific concepts · даже из 10–15-летних лишь половина знает, что китёнок питается молоком (М. Кубятко, П. Прокоп, 2009)', 18.8);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });
})();
