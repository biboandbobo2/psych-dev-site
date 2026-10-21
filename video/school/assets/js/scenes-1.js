/* Глава 1 (v3.1). Новое место · Миша: заставка, первое сентября (Эльконин), мерка (Давыдов), а игра? (Эльконин; Пиаже), родительский чат */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', STICK = '#8B6A45', PAPER = '#FFFDF8', CELL = '#D6E4EA', RED = '#D9534F', WOOD = '#C9A27A', WALL = '#F1E4CF';
  var CH = 87.5; // длина главы 1, с

  // ---------- Локальные помощники ----------
  // Появление/уход элемента (t1 — когда уходит; d — длительность наплыва)
  function vis(s, e, t0, t1, d) {
    s.tween(e, t0, { opacity: 0 }, { opacity: 1, duration: d == null ? 0.3 : d });
    if (t1 != null) s.out(e, t1, { dur: d == null ? 0.3 : d });
  }
  // Пропись: лист в клетку с полем и рядом кривых палочек (x, y — левый верхний угол)
  function propis(s, g, x, y, w, h, n, sw) {
    var p = s.node(g, 'g', {});
    s.node(p, 'rect', { x: x, y: y, width: w, height: h, rx: 4, fill: PAPER, stroke: '#CDC3B4', 'stroke-width': 2 });
    var c = h / 6;
    for (var cx = x + c; cx < x + w - 2; cx += c) s.path(p, 'M' + cx + ' ' + (y + 2) + ' V' + (y + h - 2), { stroke: CELL, 'stroke-width': 1.5 });
    for (var cy = y + c; cy < y + h - 2; cy += c) s.path(p, 'M' + (x + 2) + ' ' + cy + ' H' + (x + w - 2), { stroke: CELL, 'stroke-width': 1.5 });
    s.path(p, 'M' + (x + w - c) + ' ' + y + ' V' + (y + h), { stroke: RED, 'stroke-width': 2 }); // поле справа
    var tilt = [-6, 9, -3, 14, 2, -10, 7, -4], st = [];
    for (var i = 0; i < n; i++) { // палочки-«почерк»: кривые, разной длины
      var sx = x + c * (1.2 + i * 1.1), t = tilt[i % tilt.length] * c / 60;
      st.push(s.path(p, 'M' + sx + ' ' + (y + c * 1.4) + ' Q' + (sx + t) + ' ' + (y + c * 2.4) + ' ' + (sx - t * 0.6) + ' ' + (y + c * (3.4 + (i % 3) * 0.2)), { stroke: '#2E3B4E', 'stroke-width': sw || 5 }));
    }
    p.sticks = st; p.cx = x + c * 1.2; p.c = c;
    return p;
  }
  // Наш класс: стена, доска, окно; парты рядами в перспективе. Одноклассники — постоянный состав (Film.school.classmate),
  // места героев (Миша, Аня) — пустые парты; Дима — за отдельной партой у окна. Возвращает места и группы одноклассников.
  function classRoom(s, parent) {
    var g = s.node(parent, 'g', {});
    s.node(g, 'rect', { x: 0, y: 90, width: 1920, height: 440, fill: WALL });
    s.path(g, 'M0 530 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
    s.node(g, 'rect', { x: 720, y: 250, width: 480, height: 160, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 8 });
    s.path(g, 'M760 300 q20 -16 40 0 t40 0 M760 350 h110', { stroke: '#E8EEF2', 'stroke-width': 3, opacity: 0.7 }); // мел
    s.node(g, 'rect', { x: 1650, y: 240, width: 210, height: 230, rx: 6, fill: '#CFE6EE', stroke: INK, 'stroke-width': 3 });
    s.path(g, 'M1755 240 V470 M1650 355 H1860', { stroke: INK, 'stroke-width': 2.5 });
    var rows = 3, cols = 5, vx = 860, front = 830, back = 570, hero = { '0,1': 'misha', '0,2': 'anya' };
    var seats = {}, kids = [], n = 0;
    for (var r = rows - 1; r >= 0; r--) {
      var t = r / (rows - 1), y = front - (front - back) * t, k = 1 - 0.55 * t, span = 1500 * k, x0 = vx - span / 2;
      for (var c = 0; c < cols; c++) {
        var cx = x0 + span * (c + 0.5) / cols, who = hero[r + ',' + c];
        if (who) { seats[who] = { x: cx, y: y - 64 * k, d: 80 * k }; }
        else { var kg = s.node(g, 'g', {}); K().classmate(kg, n, cx, y - 64 * k, 40 * k); kids.push({ g: kg, id: n, x: cx, y: y - 64 * k, r: 40 * k }); n += 1; }
        K().desk(s, g, cx, y, k);
      }
    }
    K().desk(s, g, 1740, 800, 0.85); // отдельная парта у окна
    seats.dima = { x: 1740, y: 746, d: 72 };
    seats.teacher = { x: 190, y: 560, d: 150 };
    return { g: g, seats: seats, kids: kids };
  }
  // Шахматная книжка (у Димы)
  function chessBook(s, g, x, y, k) {
    var b = s.node(g, 'g', {});
    s.node(b, 'rect', { x: x - 40 * k, y: y - 30 * k, width: 80 * k, height: 56 * k, rx: 4, fill: '#4F7CAC', stroke: INK, 'stroke-width': 2.5 });
    s.path(b, 'M' + x + ' ' + (y - 30 * k) + ' V' + (y + 26 * k), { stroke: INK, 'stroke-width': 2 });
    K().knight(s, b, x + 20 * k, y + 14 * k, 0.7 * k, true);
    return b;
  }
  // Вывод внизу и мелкая подпись источника
  function verdict(s, html, at) {
    var e = s.text('lead', '<b class="acc">Вывод:</b> ' + html, { left: 140, top: 922, width: 1640, fontSize: 32, lineHeight: 1.3 });
    s.lines(e, at);
    return e;
  }
  function small(s, text, at, top) {
    var e = s.text('cite', text, { left: 140, top: top || 1030, width: 1640, fontSize: 20 });
    s.fade(e, at, { y: 4 });
    return e;
  }
  function header(s, html, at, st) {
    var e = s.text('h3', html, Object.assign({ left: 140, top: 112, width: 1640 }, st || {}));
    s.lines(e, at);
    return e;
  }
  function off(s, ids, t) { ids.forEach(function (id) { s.actor(id, { o: 0 }, t, 0.3); }); }

  // 0:22,5 — заставка главы: три дорожки, зажигается Мишина
  Film.scene({
    id: 'ch1', bars: 2,
    build: function (s) {
      s.chapterCard(1, 'Новое место', 'Миша хочет, чтобы его хвалили, как дома');
      K().pathsCard(s, 1, 'misha', []);
      s.chapter(1, 'Новое место', 0.4, CH - 0.6);
    }
  });

  // 0:27,5 — Первое сентября (Д. Б. Эльконин): дома хвалят — за порогом-чертой оценивают
  Film.scene({
    id: 'firstday', bars: 7,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 4.05, T3 = 8.7, T4 = 12.3; // начала кадров 2–4
      // --- кадр 1: вечер дома, мама хвалит пропись ---
      var f1 = s.node(g, 'g', {});
      K().kitchen(s, f1, 820, 980);
      s.node(f1, 'rect', { x: 1124, y: 264, width: 212, height: 192, fill: '#2E4A66', opacity: 0.85 }); // за окном темно
      s.node(f1, 'circle', { cx: 1280, cy: 310, r: 22, fill: '#F5E6A8' });
      vis(s, f1, 0, T2, 0.01);
      K().cast(s, 'mom', 540, 730, 170, 0.1, { gx: 8, gy: 2 });
      K().cast(s, 'misha', 1000, 760, 110, 0.1, { gx: -8, gy: -2 });
      var pr1 = propis(s, ov, 720, 560, 210, 130, 6, 3.5); // Миша показывает пропись
      s.set(pr1, 0, { rotation: -5, transformOrigin: '50% 50%' }, { rotation: -5, transformOrigin: '50% 50%' });
      vis(s, pr1, 0.3, T2, 0.3);
      K().tag(s, 'мама', 540, 880, 0.6, 3.6); K().tag(s, 'Миша', 1000, 880, 0.6, 3.6);
      K().say(s, 'Какой молодец!', 480, 470, 0.4, 2.6);
      s.actor('adult', { x: 620 }, 1.0, 0.5, 'power2.out'); // мама обнимает
      s.actor('baby', { x: 960 }, 1.1, 0.4, 'power2.out');
      s.squash('adult', 1.08, 0.94, 1.2, 0.15); s.squash('adult', 1, 1, 1.35, 0.4, 'back.out(3)');
      s.squash('baby', 0.94, 1.08, 1.25, 0.12); s.squash('baby', 1, 1, 1.37, 0.3, 'back.out(3)');
      // шапка сцены: слева — дом, справа (кадр 2) — школа; красная линия поля делит их
      var h1 = s.text('h3', 'Дома любят за то, что ты есть.', { left: 140, top: 112, width: 760 });
      s.lines(h1, 1.6);
      // --- кадр 2: утро, порог — красная линия поля ---
      var sw = K().flip(s, T2 - 0.45);
      var cells = s.div('cells', { left: 962, top: 250, width: 958, height: 660 });
      s.set(cells, 0, { opacity: 0 }, { opacity: 0 });
      s.set(cells, sw, { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' }, { opacity: 1, clipPath: 'inset(0% 100% 0% 0%)' });
      s.tween(cells, 6.6, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.inOut' });
      s.out(cells, T3, { dur: 0.4 });
      var f2 = s.node(g, 'g', {});
      s.path(f2, 'M0 905 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      K().house(s, f2, 260, 905, 0.9, { at: sw, dur: 0.01 });
      K().tree(s, f2, 600, 905, 0.8, '#9CC8A0');
      s.path(f2, 'M960 250 V1000', { stroke: RED, 'stroke-width': 4 });
      K().schoolHouse(s, f2, 1440, 905, 0.72);
      [[1120, 4], [1195, 9], [1275, 11], [1610, 6]].forEach(function (q, i) { K().classmate(f2, q[1], q[0], 872 - (i % 2) * 6, 30, { mouth: 'smile' }); });
      vis(s, f2, sw, null, 0.01); s.out(f2, T3, { dur: 0.4 });
      s.actor('adult', { x: 420, y: 830, d: 150 }, sw, 0.01); s.gaze('adult', 8, 0, sw, 0.01);
      s.actor('baby', { x: 520, y: 857, d: 96 }, sw, 0.01); s.gaze('baby', 8, -2, sw, 0.01);
      var bp = s.node(ov, 'g', {});
      Film.toys.backpack(s, bp, 474, 852, 1.0, '#26A69A', '#1C7A71');
      vis(s, bp, sw, T3, 0.01);
      K().walk(s, 'baby', 840, 4.3, { carry: bp, step: 110, dur: 0.24, hold: 0.06 });
      s.actor('adult', { x: 740 }, 4.3, 1.2, 'power1.inOut');
      K().say(s, 'Пока, мам!', 790, 690, 5.5, 7.4);
      s.squash('adult', 1.05, 0.95, 5.8, 0.15); s.squash('adult', 1, 1, 5.95, 0.3, 'back.out(3)'); // мама машет
      K().walk(s, 'baby', 1240, 6.5, { carry: bp, cx: 320, step: 100, dur: 0.22, hold: 0.06 });
      s.gaze('baby', -9, -2, 8.0, 0.3); // оглядывается на маму
      K().cast(s, 'teacher', 1790, 835, 140, sw + 0.3, { gx: -8 });
      var h2 = s.text('h3', 'В школе оценивают, что ты сделал.', { left: 1020, top: 112, width: 800 });
      s.lines(h2, 7.4);
      // --- кадр 3: класс — Миша рядом с Аней, Дима один у окна ---
      var f3 = s.node(g, 'g', {}), C = classRoom(s, f3);
      vis(s, f3, T3, T4, 0.4);
      var book = chessBook(s, ov, C.seats.dima.x - 4, C.seats.dima.y + 64, 0.9);
      vis(s, book, T3, T4, 0.4);
      s.actor('adult', { o: 0 }, T3, 0.3); s.out(bp, T3, { dur: 0.3 });
      s.actor('adult2', { x: C.seats.teacher.x, y: C.seats.teacher.y, d: C.seats.teacher.d }, T3, 0.01); s.gaze('adult2', 8, 2, T3, 0.01);
      s.actor('baby', { x: 330, y: C.seats.misha.y, d: C.seats.misha.d }, T3, 0.01); s.gaze('baby', 8, -2, T3, 0.01);
      s.actor('baby', { x: C.seats.misha.x }, T3 + 0.4, 0.8, 'power2.inOut');
      K().cast(s, 'anya', C.seats.anya.x, C.seats.anya.y, C.seats.anya.d, T3, { gx: -8, dur: 0.4 });
      K().cast(s, 'dima', C.seats.dima.x, C.seats.dima.y, C.seats.dima.d, T3, { gx: -4, gy: 6, mouth: 'flat', dur: 0.4 });
      K().tag(s, 'Аня', C.seats.anya.x, 850, T3 + 0.6, T4 - 0.2); K().tag(s, 'Дима', C.seats.dima.x, 860, T3 + 0.8, T4 - 0.2);
      verdict(s, 'появляется новый взрослый — учитель. Его оценка — первая, которая не про любовь.', 10.0);
      off(s, ['kid2', 'kid3'], T4);
      // --- кадр 4: та же пропись — красная ручка, «3»; мама далеко ---
      var f4 = s.node(g, 'g', {});
      s.node(f4, 'rect', { x: 0, y: 250, width: 1920, height: 650, fill: WALL, opacity: 0.6 });
      s.node(f4, 'rect', { x: 330, y: 760, width: 1260, height: 140, fill: WOOD, stroke: INK, 'stroke-width': 3 });
      s.node(f4, 'rect', { x: 50, y: 280, width: 200, height: 220, rx: 6, fill: '#CFE6EE', stroke: INK, 'stroke-width': 3 }); // окно
      s.path(f4, 'M150 280 V500 M50 390 H250', { stroke: INK, 'stroke-width': 2.5 });
      var pr4 = propis(s, f4, 620, 300, 640, 420, 6, 9);
      vis(s, f4, T4, null, 0.4);
      s.actor('baby', { x: 400, y: 650, d: 170 }, T4, 0.01); s.gaze('baby', 9, 3, T4, 0.01);
      s.actor('adult2', { x: 1520, y: 560, d: 210 }, T4, 0.01); s.gaze('adult2', -9, 4, T4, 0.01);
      var pen = s.node(ov, 'g', {});
      s.node(pen, 'rect', { x: 0, y: -6, width: 150, height: 12, rx: 5, fill: RED, stroke: INK, 'stroke-width': 2 });
      s.set(pen, 0, { x: 1380, y: 600, rotation: -30, transformOrigin: '0% 50%', opacity: 0 }, { x: 1380, y: 600, rotation: -30, transformOrigin: '0% 50%', opacity: 0 });
      s.tween(pen, T4 + 0.3, { opacity: 0, x: 1380, y: 600 }, { opacity: 1, x: 900, y: 600, duration: 0.5, ease: 'power2.out' });
      var under = s.path(f4, 'M' + (pr4.cx + pr4.c * 3.3 - 30) + ' ' + (300 + pr4.c * 4.2) + ' H' + (pr4.cx + pr4.c * 3.3 + 40), { stroke: RED, 'stroke-width': 6 });
      s.draw(under, T4 + 0.8, { dur: 0.35 });
      s.tween(pen, T4 + 0.8, { x: 900 }, { x: 960, duration: 0.35, ease: 'power1.inOut' });
      var three = s.otext('cursive red', '3', { left: 1150, top: 330, fontSize: 170, lineHeight: 1 });
      s.pop(three, T4 + 1.4, { from: 0.4, dur: 0.3 });
      s.tween(pen, T4 + 1.3, { x: 960, y: 600 }, { x: 1180, y: 500, duration: 0.3, ease: 'power2.inOut' });
      s.out(pen, T4 + 2.0, { dur: 0.3 });
      s.mouth('baby', 'flat', T4 + 1.7, 0.3);
      s.gaze('baby', -9, -3, T4 + 2.3, 0.4); // оглядывается на окно
      s.actor('adult', { x: 150, y: 440, d: 46 }, T4 + 2.3, 0.01); s.gaze('adult', 6, 0, T4 + 2.3, 0.01); s.mouth('adult', 'soft', T4 + 2.3, 0.01);
      s.actor('adult', { o: 1 }, T4 + 2.4, 0.4); // мама — далеко, за окном
      small(s, 'Д. Б. Эльконин: учитель — первый общественный взрослый в жизни ребёнка', 13.5);
      off(s, ['baby', 'adult', 'adult2'], 17.0);
    }
  });

  // 0:45 — Мерка (В. В. Давыдов): ленты не приложить — палочка становится меркой, число — сколько раз уложилась
  Film.scene({
    id: 'merka', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over(), M = 100, RY = 470;
      var LEN = [3, 4, 2], COL = ['#E4735A', '#4F7CAC', '#E0A93B'];
      // класс: стена с двумя лентами на разных простенках, доска посередине
      s.node(g, 'rect', { x: 0, y: 90, width: 1920, height: 520, fill: WALL });
      s.path(g, 'M0 610 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      [[140, 420], [1320, 460]].forEach(function (w) { s.node(g, 'rect', { x: w[0], y: 400, width: w[1], height: 140, rx: 8, fill: '#FBF3E4', stroke: '#D9C9AE', 'stroke-width': 3 }); });
      s.node(g, 'rect', { x: 700, y: 250, width: 520, height: 200, rx: 6, fill: '#2F4A43', stroke: '#5C4632', 'stroke-width': 8 });
      var RX = [200, 1350, 860], ribbons = [];
      LEN.forEach(function (n, i) {
        var y = i === 2 ? 350 : RY;
        var r = s.node(g, 'rect', { x: RX[i], y: y - 8, width: n * M, height: 16, rx: 3, fill: COL[i] });
        ribbons.push(r);
      });
      s.grow(ribbons[0], 0.3, { dur: 0.5 }); s.grow(ribbons[1], 0.5, { dur: 0.5 });
      s.set(ribbons[2], 0, { opacity: 0 }, { opacity: 0 });
      // парты: Аня и одноклассники; посередине — Мишина парта с тетрадью и пеналом
      [[270, 0], [1440, 1], [1680, 2]].forEach(function (q) { K().classmate(g, q[1], q[0], 789, 32); K().desk(s, g, q[0], 840, 0.8); });
      K().desk(s, g, 540, 840, 0.8);
      K().desk(s, g, 960, 836, 1.0);
      var pc = s.node(g, 'g', {});
      s.node(pc, 'rect', { x: 1150, y: 786, width: 120, height: 34, rx: 14, fill: '#2B8F84', stroke: INK, 'stroke-width': 2.5 });
      var nb = s.div('paper cells', { left: 760, top: 636, width: 380, height: 190 });
      s.fade(nb, 0.2, { y: 6 });
      K().cast(s, 'anya', 540, 789, 64, 0.2, { gx: 6, gy: -4 });
      K().cast(s, 'teacher', 960, 480, 130, 0.1, { gx: 0 });
      K().say(s, 'Какая длиннее?<br>Их нельзя приложить друг к другу.', 990, 240, 0.3, 4.4);
      K().cast(s, 'misha', 1200, 700, 90, 0.2, { gx: -6, gy: 4 });
      // строки тетради: цветная метка ленты и палочки за каждый шаг
      var rowY = [650, 708, 766], marks = [];
      LEN.forEach(function (n, i) {
        var sw = s.node(ov, 'rect', { x: 785, y: rowY[i] + 24, width: 44, height: 10, rx: 3, fill: COL[i] });
        s.tween(sw, i === 2 ? 10.6 : 0.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        marks.push([]);
      });
      // палочка из пенала (та самая, из крючка)
      var stick = s.node(ov, 'g', {});
      s.path(stick, 'M0 0 H' + M, { stroke: STICK, 'stroke-width': 10 });
      s.set(stick, 0, { x: 1160, y: 803, opacity: 0 }, { x: 1160, y: 803, opacity: 0 });
      s.tween(stick, 4.5, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      var pos = { x: 1160, y: 803 };
      function measure(i, t0, step) {
        var x0 = RX[i], y = (i === 2 ? 350 : RY) - 22, n = LEN[i];
        s.actor('baby', { x: x0 + 50, y: y + 152 }, t0 - 0.6, 0.6, 'power2.inOut');
        s.tween(stick, t0 - 0.6, { x: pos.x, y: pos.y }, { x: x0, y: y, duration: 0.6, ease: 'power2.inOut' });
        s.gaze('baby', 0, -8, t0 - 0.1, 0.2);
        for (var j = 0; j < n; j++) {
          var t = t0 + j * step;
          if (j) s.tween(stick, t, { x: x0 + (j - 1) * M }, { x: x0 + j * M, duration: step * 0.55, ease: 'power2.inOut' });
          if (j) s.actor('baby', { x: x0 + 50 + j * M }, t, step * 0.55, 'power2.inOut');
          var tk = s.path(ov, 'M' + (x0 + (j + 1) * M) + ' ' + (y + 10) + ' v26', { stroke: INK, 'stroke-width': 3 });
          s.draw(tk, t + step * 0.5, { dur: 0.08 });
          var mk = s.path(ov, 'M' + (860 + j * 26) + ' ' + (rowY[i] + 8) + ' v42', { stroke: '#2E3B4E', 'stroke-width': 5 });
          s.draw(mk, t + step * 0.55, { dur: 0.1 });
          marks[i].push(tk);
        }
        pos = { x: x0 + (n - 1) * M, y: y };
      }
      measure(0, 5.4, 0.45);
      measure(1, 7.8, 0.4);
      K().say(s, 'Вторая!', 1440, 500, 9.5, 10.9, 'r');
      s.mouth('baby', 'smile', 9.5, 0.2); s.gaze('baby', -6, -2, 9.5, 0.2);
      header(s, 'Длиннее та, по которой мерка уложилась больше раз. Так палочка становится числом.', 9.7);
      // кадр 3: учитель молча вешает третью ленту — Миша сам меряет; «5»
      s.actor('adult2', { x: 620, y: 520 }, 10.2, 0.6, 'power2.inOut');
      s.gaze('adult2', 8, -4, 10.6, 0.3);
      s.tween(ribbons[2], 10.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.grow(ribbons[2], 10.6, { dur: 0.5 });
      measure(2, 11.8, 0.45);
      s.actor('baby', { x: 1180, y: 700 }, 12.9, 0.6, 'power2.inOut');
      s.actor('adult2', { x: 630, y: 610, d: 140 }, 12.6, 0.5, 'power2.inOut'); s.gaze('adult2', 8, 6, 12.9, 0.3);
      var five = s.otext('cursive red', '5', { left: 1050, top: 630, fontSize: 130, lineHeight: 1 });
      s.pop(five, 13.3, { from: 0.4, dur: 0.3 });
      s.gaze('baby', -8, 4, 13.3, 0.2);
      s.hop('baby', 1180, 700, 13.7, 0.4, 36); // Миша сияет
      verdict(s, 'в школе учат не ответу, а способу его найти. Это <b class="acc">учебная деятельность</b> — главное занятие возраста.', 13.9);
      small(s, 'learning activity · В. В. Давыдов, «Виды обобщения в обучении», 1972 · независимых сравнений системы почти нет', 15.0);
      s.out(stick, 13.0, { dur: 0.3 });
      off(s, ['baby', 'kid2', 'adult2'], 19.5);
    }
  });

  // 1:05 — А игра? (Д. Б. Эльконин, 1971; Ж. Пиаже, 1932): лошадка в ранце → перемена → двор, классики с правилами
  Film.scene({
    id: 'play', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      var T2 = 6.2, T3 = 11.6;
      header(s, 'Если главным стала учёба, куда делась игра?', 0.4);
      // --- кадр 1: урок, из ранца под партой выглядывает лошадка ---
      var f1 = s.node(g, 'g', {}), C = classRoom(s, f1);
      vis(s, f1, 0, null, 0.01); s.out(f1, T3, { dur: 0.4 });
      var bk = chessBook(s, ov, C.seats.dima.x - 4, C.seats.dima.y + 64, 0.9);
      vis(s, bk, 0, null, 0.01); s.out(bk, T3, { dur: 0.4 });
      K().cast(s, 'teacher', C.seats.teacher.x, C.seats.teacher.y, C.seats.teacher.d, 0.05, { gx: 8 });
      K().cast(s, 'misha', C.seats.misha.x, C.seats.misha.y, C.seats.misha.d, 0.05, { gx: 0, gy: -4 });
      K().cast(s, 'anya', C.seats.anya.x, C.seats.anya.y, C.seats.anya.d, 0.05, { gx: 0, gy: -4 });
      K().cast(s, 'dima', C.seats.dima.x, C.seats.dima.y, C.seats.dima.d, 0.05, { gx: -4, gy: 6, mouth: 'flat' });
      var toy = s.node(ov, 'g', {}), bp = s.node(ov, 'g', {});
      K().toyHorse(s, toy, 400, 862, 0.9);
      Film.toys.backpack(s, bp, 410, 878, 1.15, '#26A69A', '#1C7A71');
      vis(s, bp, 0, null, 0.01);
      s.tween(toy, 0.9, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }); // выглядывает
      s.gaze('kid2', -9, 6, 2.2, 0.3); s.mouth('kid2', 'smile', 2.4, 0.2);
      s.mouth('kid2', 'soft', 3.6, 0.3); s.gaze('kid2', 0, -4, 3.8, 0.3); // прячет улыбку
      // --- кадр 2: звонок — перемена; над лошадкой проступает рисованный слой 3–7 ---
      var bell = s.node(ov, 'g', {});
      Film.icons.bell(s, bell, 1500, 180, 1.4, { at: T2 - 0.2, dur: 0.4, seed: 9 });
      s.tween(bell, T2 + 0.2, { rotation: 0, transformOrigin: '50% 10%' }, { rotation: 14, duration: 0.08, repeat: 7, yoyo: true });
      s.out(bell, T2 + 1.8, { dur: 0.3 });
      s.tween(toy, T2 + 0.4, { x: 0, y: 0 }, { x: 312, y: -52, duration: 0.5, ease: 'power2.out' }); // на парту, между Мишей и Аней
      toy.__st = { x: 312 }; // Film.ride продолжает с этого сдвига
      s.out(bp, T2 + 0.6, { dur: 0.3 });
      var sk = s.node(ov, 'g', {});
      Film.icons.horse(s, sk, 700, 778, 0.6, { at: T2 + 1.0, dur: 0.7, seed: 7 });
      [[T2 + 1.9, 60], [T2 + 2.7, -60], [T2 + 3.5, 60]].forEach(function (q) {
        var t = q[0];
        Film.ride(s, toy, q[1], t, 0.45, 40); Film.ride(s, sk, q[1], t, 0.45, 40);
        s.hop('baby', s.A.baby.st.x, C.seats.misha.y, t, 0.45, 26);
        s.hop('kid2', s.A.kid2.st.x, C.seats.anya.y, t + 0.1, 0.45, 26);
      });
      s.mouth('baby', 'smile', T2 + 1.9, 0.2); s.gaze('baby', 8, 2, T2 + 1.9, 0.2); s.gaze('kid2', -8, 2, T2 + 1.9, 0.2); s.mouth('kid2', 'smile', T2 + 1.9, 0.2);
      // одноклассники выбегают из класса — на перемену
      C.kids.forEach(function (k, i) { s.tween(k.g, T2 + 3.0 + (i % 5) * 0.12, { x: 0, opacity: 1 }, { x: 1400, opacity: 0, duration: 1.3, ease: 'power2.in' }); });
      s.actor('adult2', { o: 0 }, T2 + 3.4, 0.4);
      // --- кадр 3: двор, классики обрастают правилами; Дима остаётся у стены ---
      var f3 = s.node(g, 'g', {});
      s.node(f3, 'rect', { x: 0, y: 640, width: 1920, height: 440, fill: '#E9E3D8' });
      s.path(f3, 'M0 640 H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
      K().tree(s, f3, 150, 640, 1.0); K().bush(s, f3, 380, 640, 0.9); K().tree(s, f3, 1120, 640, 0.85, '#9CC8A0'); K().bench(s, f3, 880, 640, 1.0); K().tree(s, f3, 1420, 640, 0.7);
      s.node(f3, 'rect', { x: 1560, y: 230, width: 360, height: 410, fill: '#F3E6D2', stroke: INK, 'stroke-width': 3 }); // стена школы
      for (var by = 270; by < 640; by += 46) s.path(f3, 'M1560 ' + by + ' H1920', { stroke: '#E2D3BC', 'stroke-width': 2 });
      s.node(f3, 'rect', { x: 1630, y: 450, width: 110, height: 190, rx: 6, fill: '#B48A62', stroke: INK, 'stroke-width': 3 }); // дверь
      // классики мелом: 1, 2, 3|4, 5, 6|7
      var HX = 640, HC = 120, hop = s.node(f3, 'g', {});
      [[0, 1], [1, 1], [2, 2], [3, 1], [4, 2]].forEach(function (q) {
        var x = HX + q[0] * HC;
        s.node(hop, 'rect', { x: x, y: 700, width: HC, height: 150, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 5 });
        if (q[1] === 2) s.path(hop, 'M' + x + ' 775 H' + (x + HC), { stroke: '#FFFDF8', 'stroke-width': 5 });
      });
      var line = s.path(f3, 'M' + (HX + 2 * HC) + ' 700 V850', { stroke: RED, 'stroke-width': 7, opacity: 0 });
      vis(s, f3, T3, null, 0.4);
      // те же одноклассники: очередь у классиков и игра
      var yard = [[260, 12], [330, 0], [1340, 7], [1420, 3]], jumper = s.node(g, 'g', {});
      yard.forEach(function (q) { K().classmate(f3, q[1], q[0], 760, 34, { mouth: 'smile' }); });
      K().classmate(jumper, 5, HX + 60, 760, 32, { mouth: 'smile' });
      vis(s, jumper, T3, null, 0.4);
      [[HX + 180, 0.0], [HX + 238, 0.55]].forEach(function (q, i) { // прыжки; второй — на линию
        var t = T3 + 0.8 + q[1];
        s.tween(jumper, t, { x: i ? 120 : 0 }, { x: q[0] - HX - 60, duration: 0.4, ease: 'sine.inOut' });
        s.tween(jumper, t, { y: 0 }, { y: -50, duration: 0.2, ease: 'power2.out' });
        s.tween(jumper, t + 0.2, { y: -50 }, { y: 0, duration: 0.2, ease: 'power2.in' });
      });
      s.tween(line, T3 + 1.6, { opacity: 0 }, { opacity: 1, duration: 0.15, repeat: 3, yoyo: true });
      s.set(line, T3 + 2.3, { opacity: 0 }, { opacity: 1 });
      s.actor('baby', { x: 500, y: 760, d: 76, o: 0 }, T3, 0.01); s.actor('baby', { o: 1 }, T3 + 0.1, 0.3); s.gaze('baby', 8, 0, T3, 0.01);
      s.actor('kid2', { x: 580, y: 760, d: 72, o: 0 }, T3, 0.01); s.actor('kid2', { o: 1 }, T3 + 0.1, 0.3); s.gaze('kid2', 8, 0, T3, 0.01);
      s.mouth('kid2', 'flat', T3 + 1.6, 0.2);
      K().say(s, 'Ты наступил на линию!', 560, 560, T3 + 1.7, T3 + 4.0);
      s.squash('kid2', 1.06, 0.94, T3 + 1.8, 0.1); s.squash('kid2', 1, 1, T3 + 1.9, 0.3, 'back.out(3)');
      s.out(toy, T3, { dur: 0.3 }); s.out(sk, T3, { dur: 0.3 });
      // Дима выходит с книжкой, останавливается у края — его не замечают — уходит к стене
      s.actor('kid3', { o: 0 }, T3, 0.01); s.actor('kid3', { x: 1685, y: 590, d: 72 }, T3 + 0.02, 0.01);
      s.gaze('kid3', -8, 0, T3, 0.01); s.mouth('kid3', 'soft', T3, 0.01);
      s.actor('kid3', { o: 1 }, T3 + 1.2, 0.3);
      var bk3 = chessBook(s, ov, 0, 0, 0.75);
      s.set(bk3, 0, { x: 1685, y: 625, opacity: 0 }, { x: 1685, y: 625, opacity: 0 });
      s.tween(bk3, T3 + 1.2, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.actor('kid3', { x: 1500, y: 760 }, T3 + 1.6, 0.8, 'power1.inOut');
      s.tween(bk3, T3 + 1.6, { x: 1685, y: 625 }, { x: 1500, y: 795, duration: 0.8, ease: 'power1.inOut' });
      s.mouth('kid3', 'flat', T3 + 3.2, 0.3);
      s.gaze('kid3', 8, 2, T3 + 4.6, 0.3);
      s.actor('kid3', { x: 1830, y: 590 }, T3 + 4.8, 1.0, 'power1.inOut');
      s.tween(bk3, T3 + 4.8, { x: 1500, y: 795 }, { x: 1830, y: 625, duration: 1.0, ease: 'power1.inOut' });
      s.gaze('kid3', -4, 6, T3 + 6.0, 0.3);
      verdict(s, 'игра не исчезла — ушла на перемену и обросла правилами.', 15.0);
      small(s, 'Д. Б. Эльконин, 1971: новая ведущая деятельность «не отменяет прежде существовавших, а лишь меняет их место» · Ж. Пиаже, 1932: игры по общим правилам — с 7–8 лет · П. Блэтчфорд и др., 2003: на перемене семилетки треть времени играют по правилам, ещё треть — во что-то своё', 15.8, 1000);
      off(s, ['baby', 'kid2', 'kid3'], 19.5);
    }
  });

  // 1:25 — Родительский чат: три совета — три проверки (у каждой — картинка опыта и штамп «Проверили»)
  // Картинки опыта (cx, cy — центр карточки 190 × 160)
  function expPic(s, g, cx, cy, kind) {
    var p = s.node(g, 'g', {});
    s.node(p, 'rect', { x: cx - 95, y: cy - 80, width: 190, height: 160, rx: 10, fill: PAPER, stroke: RED, 'stroke-width': 3 });
    if (kind === 1) { // класс и учитель
      s.node(p, 'rect', { x: cx - 70, y: cy - 62, width: 80, height: 46, rx: 3, fill: '#2F4A43' });
      Film.head(p, cx + 50, cy - 30, 26, '#4D6E8A', 'teacher', { glasses: true, mouth: 'smile' });
      [[-58, 40], [-10, 40], [38, 40]].forEach(function (q, i) { K().classmate(p, [2, 6, 13][i], cx + q[0], cy + q[1], 18, { mouth: 'smile' }); });
    } else if (kind === 2) { // ребёнок с похвалой
      K().classmate(p, 14, cx - 10, cy + 20, 40, { mouth: 'smile' });
      [[50, -40, 16], [-60, -46, 11], [62, 22, 10]].forEach(function (q) {
        var x = cx + q[0], y = cy + q[1], r = q[2], d = '';
        for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1) + ' '; }
        s.path(p, d + 'Z', { fill: '#F2C14E', stroke: INK, 'stroke-width': 2 });
      });
    } else { // ребёнок с картинками и ребёнок с наушниками
      K().classmate(p, 8, cx - 45, cy + 25, 30);
      s.node(p, 'rect', { x: cx - 88, y: cy - 66, width: 66, height: 50, rx: 3, fill: '#CFE6EE', stroke: INK, 'stroke-width': 2 });
      s.path(p, 'M' + (cx - 84) + ' ' + (cy - 20) + ' l18 -22 l12 12 l10 -8 l20 18 Z', { fill: '#7FB685', stroke: 'none' });
      K().classmate(p, 16, cx + 45, cy + 25, 30);
      s.path(p, 'M' + (cx + 15) + ' ' + (cy + 22) + ' Q' + (cx + 45) + ' ' + (cy - 30) + ' ' + (cx + 75) + ' ' + (cy + 22), { stroke: INK, 'stroke-width': 4 });
      [cx + 15, cx + 75].forEach(function (x) { s.node(p, 'rect', { x: x - 7, y: cy + 14, width: 14, height: 22, rx: 5, fill: '#4F7CAC', stroke: INK, 'stroke-width': 2 }); });
    }
    return p;
  }
  Film.scene({
    id: 'chat', bars: 10,
    build: function (s) {
      var g = s.svg();
      K().kitchen(s, g, 420, 980);
      s.node(g, 'rect', { x: 724, y: 264, width: 212, height: 192, fill: '#2E4A66', opacity: 0.85 }); // вечер за окном
      s.node(g, 'circle', { cx: 880, cy: 310, r: 22, fill: '#F5E6A8' });
      header(s, 'Учёные проверили советы из родительского чата.', 0.1, { width: 900 });
      K().cast(s, 'mom', 220, 755, 150, 0.2, { gx: 8, gy: 2 });
      K().cast(s, 'misha', 590, 778, 100, 0.3, { gx: 0, gy: 8, mouth: 'soft' });
      var hw = s.div('paper cells', { left: 520, top: 818, width: 150, height: 34 }); s.fade(hw, 0.4, { y: 0 });
      [1.2, 1.5, 1.8, 3.0, 3.3, 5.0, 5.3, 9.0, 9.3, 14.0, 14.3].forEach(function (tt) { s.squash('baby', 1.03, 0.97, tt, 0.1); s.squash('baby', 1, 1, tt + 0.1, 0.12); }); // пишет
      var ph = K().phone(s, 1150, 110, 620, 880);
      s.tween(ph.el, 0.5, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      s.tween(ph.el, 1.0, { rotation: 0 }, { rotation: 2, duration: 0.06, repeat: 5, yoyo: true }); // звенит
      var items = [
        ['Учитель верит в ребёнка — и ребёнок умнеет!', 'так бывает, только пока учитель ещё не знает детей.', 3.4, 7.2, 'soft'],
        ['Не хвалите за ум — это вредно!', 'вреда почти не нашли.', 12.0, 15.3, 'flat'],
        ['Ваш ребёнок визуал — учите картинками!', 'учить «под стиль» не помогает.', 18.2, 21.5, 'sad']
      ];
      items.forEach(function (it, i) {
        var m = ph.add(it[0], it[2]);
        m.style.top = (24 + i * 260) + 'px';
        var st = Film.el('div', 'tstamp', m.parentNode, '<b>Проверили:</b> ' + it[1]);
        Film.css(st, { position: 'absolute', left: '22px', top: (24 + i * 260 + 112) + 'px', fontFamily: 'var(--sans)', fontWeight: 650, fontSize: '25px', lineHeight: 1.25, whiteSpace: 'normal', width: '520px', background: '#FFFDF8', padding: '6px 14px' });
        s.tween(st, it[3], { opacity: 0, scale: 1.5, rotation: -10, transformOrigin: '30% 50%' }, { opacity: 1, scale: 1, rotation: -3, duration: 0.25, ease: 'power3.in' });
        var pic = expPic(s, g, 1045, 110 + 60 + 24 + i * 260 + 90, i + 1);
        s.tween(pic, it[3] + 0.15, { opacity: 0, scale: 1.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.in' });
        s.gaze('adult', 9, -2, it[2] + 0.2, 0.3);
        s.mouth('adult', it[4], it[2] + 1.5, 0.3);
      });
      // Миша смотрит на маму и смеётся
      s.gaze('baby', -9, -2, 22.4, 0.3); s.mouth('baby', 'smile', 22.6, 0.2);
      [22.8, 23.3].forEach(function (t) { s.squash('baby', 1.08, 0.92, t, 0.1); s.squash('baby', 1, 1, t + 0.1, 0.25, 'back.out(3)'); });
      s.gaze('adult', 8, 4, 23.4, 0.3); s.mouth('adult', 'smile', 23.6, 0.3);
      small(s, 'эффект Пигмалиона — Р. Раунденбуш, 1984 · установка на рост — Ю. Ли, Т. Бейтс, 2019 · стили обучения — Х. Пашлер и др., 2008', 8.0, 1030);
      off(s, ['baby', 'adult'], 24.5);
    }
  });
})();
