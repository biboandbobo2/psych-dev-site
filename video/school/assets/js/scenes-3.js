/* Глава 3. Помнить нарочно · Дима (v3.3, «Язык 7–10»): козырёк (Флейвелл, 1966; Эллиотт, 2021), шахматная дуэль (Чи, 1978) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; }, P = function () { return Film.places; };
  var INK = '#2B3440', WOOD = '#E9D9BF', FLOOR = '#C9BBA2', PAPER = '#FFFDF8', RED = '#D9534F', TEAL = '#26A69A';
  var LEN = 50; // длина главы — для подписи в углу

  // ---------- общее для главы ----------
  function L(w, fill) { return { fill: fill || 'none', stroke: INK, 'stroke-width': w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function ln(s, g, d, w, c) { return s.path(g, d, { stroke: c || INK, 'stroke-width': w || 3 }); }
  function txt(s, g, x, y, text, size, o) {
    o = o || {};
    var t = s.node(g, 'text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', fill: o.color || INK, style: 'font-family: var(--' + (o.font || 'kid') + '); font-weight: ' + (o.weight || 700) + '; font-size: ' + (size || 32) + 'px' });
    t.textContent = text; return t;
  }
  function on(s, who, x, y, d, lt, o) {
    var id = K().cast(s, who, x, y, d, 0, Object.assign({}, o, { dur: 0.01 })); // стоят с начала сцены — без проявления «призраком»
    s.brow(id, (o && o.brow) || 'calm', 0, 0.01); if (who !== 'teacher') s.hands(id, 'off', 0, 0.01); // у учителя руки видны всегда
    if (who === 'misha') s.gear(id, 'backpack', !!(o && o.pack), 0, 0.01); // в классе ранец не на Мише — стоит у стула
    return id;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); if (id !== 'adult2') s.hands(id, 'off', s.dur - 0.4, 0.3); }); }
  function fadeIn(s, e, lt, dur) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: dur || 0.3 }); }
  function fadeOut(s, e, lt, dur) { s.tween(e, lt, { opacity: 1 }, { opacity: 0, duration: dur || 0.3 }); }
  // вывод — как в главе 1: 32 px, строками, «Вывод:» акцентом; источник — мелко под ним
  function concl(s, text, lt) {
    var e = s.hud('lead', '<b class="acc">Вывод:</b> ' + text, { left: 140, top: 912, width: 1640, fontSize: 32, lineHeight: 1.3 });
    s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 });
    s.lines(e, lt);
    s.tween(e, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function cite(s, text, lt) {
    var h = s.hud('cite', text, { left: 140, top: text.length > 140 ? 1004 : 1030, width: 1640, fontSize: 20 }); // длинный источник — в две строки, не обрезается краем
    s.tween(h, lt, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    s.tween(h, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.4 });
    return h;
  }
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  // стоп-кадр с подписью у значка паузы
  function freeze(s, at, dur) {
    s.freeze(at, dur);
    var e = s.hud('cite', 'пауза', { left: 1000, top: 994, fontSize: 22, color: 'var(--accent-deep)' });
    s.tween(e, at + 0.1, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    s.tween(e, at + dur - 0.25, { opacity: 1 }, { opacity: 0, duration: 0.2 });
  }
  // шёпот: губы шевелятся
  function whisper(s, id, t0, t1) { for (var t = t0, k = 0; t < t1; t += 0.22, k++) s.mouth(id, k % 2 ? 'flat' : 'soft', t, 0.1); s.mouth(id, 'soft', t1, 0.15); }
  // стул: сиденье, ножки, спинка с той стороны, куда ребёнок сидит спиной (back = -1 слева, +1 справа)
  function chair(s, g, x, floor, r, back, seatY) {
    var sy = seatY || floor - 1.45 * r, bx = x + back * 0.9 * r;
    ln(s, g, 'M' + (x - 0.9 * r) + ' ' + sy + ' H' + (x + 0.9 * r) + ' M' + bx + ' ' + sy + ' V' + (sy - 1.3 * r) + ' M' + (x - 0.75 * r) + ' ' + sy + ' V' + floor + ' M' + (x + 0.75 * r) + ' ' + sy + ' V' + floor, 2.6);
    return { x: x, y: sy - r, d: 2 * r };
  }

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


  // 3:15 — заставка главы (20 тактов = 50 с)
  Film.scene({
    id: 'ch3', bars: 2,
    build: function (s) { trio(s, 3, 'Помнить нарочно', 'Дима всё запоминает — но играть его не зовут', 'dima'); }
  });

  // ---------- «Козырёк» ----------
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
  // мягкий козырёк, как у кепки: ткань сверху на голове-круге (обрезана по кругу) и жёсткий край спереди;
  // поднят — закрывает только макушку; надвинут — закрывает глаза, губы видно. face = +1 (смотрит вправо) | -1
  // кепка с козырьком: купол на голове и плоский козырёк над глазами (вид спереди). Надвинута — купол и козырёк
  // закрывают брови и глаза (не просвечивают), рот и низ лица видны. Приходит сверху ровно по центру головы и уходит вверх
  function cap(s, ov, cx, cy, r, n) {
    var mv = s.node(ov, 'g', {}), R = r + 3, y0 = cy + 0.05 * r;
    s.path(mv, 'M' + (cx - R) + ' ' + y0 + ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + y0 + ' Z', { fill: '#3F7FA8', stroke: '#2D5F80', 'stroke-width': 2.5 });
    ln(s, mv, 'M' + cx + ' ' + (y0 - R) + ' V' + y0 + ' M' + (cx - 0.55 * R) + ' ' + (y0 - 0.82 * R) + ' Q' + (cx - 0.3 * R) + ' ' + (y0 - 0.4 * R) + ' ' + (cx - 0.35 * R) + ' ' + y0 +
      ' M' + (cx + 0.55 * R) + ' ' + (y0 - 0.82 * R) + ' Q' + (cx + 0.3 * R) + ' ' + (y0 - 0.4 * R) + ' ' + (cx + 0.35 * R) + ' ' + y0, 2, '#2D5F80');
    s.node(mv, 'circle', { cx: cx, cy: y0 - R, r: 0.09 * r, fill: '#2D5F80' });
    s.path(mv, 'M' + (cx - 1.08 * R) + ' ' + (y0 - 2) + ' Q' + cx + ' ' + (y0 + 0.26 * r) + ' ' + (cx + 1.08 * R) + ' ' + (y0 - 2) + ' Q' + cx + ' ' + (y0 + 0.08 * r) + ' ' + (cx - 1.08 * R) + ' ' + (y0 - 2) + ' Z', { fill: '#2D5F80', stroke: '#24506C', 'stroke-width': 2 });
    var off = -2.4 * r;
    s.set(mv, 0, { y: 0, opacity: 1 }, { y: off, opacity: 0 });
    return { mv: mv, off: off };
  }
  function capOn(s, k, t) { s.set(k.mv, t, { opacity: 0 }, { opacity: 1 }); s.tween(k.mv, t, { y: k.off }, { y: 0, duration: 0.7, ease: 'power2.out' }); }
  function capOff(s, k, t) { s.tween(k.mv, t, { y: 0 }, { y: k.off, duration: 0.6, ease: 'power2.in' }); s.set(k.mv, t + 0.6, { opacity: 1 }, { opacity: 0 }); }
  // облачко-ответ с тремя картинками (хвостик — к герою)
  function answer(s, ov, cx, top, kinds, ok, t) {
    var a = s.node(ov, 'g', {}), w = 360, h = 84;
    s.path(a, 'M' + (cx - w / 2 + 22) + ' ' + top + ' H' + (cx + w / 2 - 22) + ' Q' + (cx + w / 2) + ' ' + top + ' ' + (cx + w / 2) + ' ' + (top + 22) + ' V' + (top + h - 22) + ' Q' + (cx + w / 2) + ' ' + (top + h) + ' ' + (cx + w / 2 - 22) + ' ' + (top + h) +
      ' H' + (cx + 14) + ' L' + (cx - 4) + ' ' + (top + h + 14) + ' L' + (cx - 14) + ' ' + (top + h) + ' H' + (cx - w / 2 + 22) + ' Q' + (cx - w / 2) + ' ' + (top + h) + ' ' + (cx - w / 2) + ' ' + (top + h - 22) + ' V' + (top + 22) + ' Q' + (cx - w / 2) + ' ' + top + ' ' + (cx - w / 2 + 22) + ' ' + top + ' Z', L(2.6, PAPER));
    kinds.forEach(function (kd, j) {
      var q = kd === '?' ? txt(s, a, cx + 60, top + 62, '?', 50, { color: RED }) : pic(s, a, kd, cx - 120 + j * 90, top + h / 2, 0.62);
      s.tween(q, t + 0.25 + j * 0.3, { opacity: 0 }, { opacity: 1, duration: 0.15 });
    });
    s.tween(a, t, { opacity: 0, scale: 0.7, svgOrigin: cx + ' ' + (top + h) }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    if (ok) { var ck = s.path(a, 'M' + (cx + 108) + ' ' + (top + 44) + ' l14 16 l28 -32', { stroke: TEAL, 'stroke-width': 7 }); s.draw(ck, t + 1.2, { dur: 0.25 }); } // галочка — внутри облачка
    return a;
  }

  // 3:20 — Козырёк (Дж. Флейвелл и др., 1966; Э. Эллиотт и др., 2021); id сцены прежний
  Film.scene({
    id: 'helmet', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // класс после уроков, парты сдвинуты: доска, часы, окно, тот же пол; низкий стол посередине, дети на стульях по краям стола
      var cr = P().classroom(s, g, { rows: [] }), F = cr.floor;
      s.node(g, 'rect', { x: 0, y: F - 190, width: 1920, height: 190, fill: '#EFE6D6' }); ln(s, g, 'M0 ' + (F - 190) + ' H1920', 3, FLOOR); // полоса пола, как в остальных классах
      var TB = F - 130, TF = F - 94;
      var tbl = s.node(g, 'g', {});
      s.path(tbl, 'M790 ' + TB + ' L1330 ' + TB + ' L1360 ' + TF + ' L760 ' + TF + ' Z', L(2.6, WOOD));
      s.node(tbl, 'rect', Object.assign({ x: 760, y: TF, width: 600, height: 12 }, L(2.6, WOOD)));
      ln(s, tbl, 'M780 ' + (TF + 12) + ' V' + F + ' M1340 ' + (TF + 12) + ' V' + F, 2.6);
      // ряд из семи картинок на столе
      var ORDER = ['tree', 'ball', 'cube', 'house', 'pyramid', 'fish', 'arrow'], CX = function (i) { return 800 + i * 78; }, CT = F - 182, CW = 70; // мяч, дом, рыба — слева направо
      var cards = ORDER.map(function (kd, i) {
        var c = s.node(g, 'g', {});
        s.node(c, 'rect', Object.assign({ x: CX(i) - CW / 2, y: CT, width: CW, height: CW, rx: 8 }, L(2.2, PAPER)));
        pic(s, c, kd, CX(i), CT + CW / 2, 0.72);
        s.tween(c, 0.3 + i * 0.06, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
        return c;
      });
      // Ирина Петровна, Дима и Миша (ранец снят: опыт — не урок)
      var TD = 150, TY = P().standY(F, TD, true), TX = cr.teacher.x;
      on(s, 'teacher', TX, TY, TD, 0.1, { gx: 10, gy: 4 });
      var r = 62, cD = chair(s, g, 640, F, r, -1), cM = chair(s, g, 1500, F, r, 1);
      on(s, 'dima', cD.x, cD.y, cD.d, 0.2, { gx: 10, gy: 6 });
      on(s, 'misha', cM.x, cM.y, cM.d, 0.3, { gx: -10, gy: 6 }); // ранец снят: опыт — не урок
      hudText(s, 'h3', 'Опыт Дж. Флейвелла: детям показывают картинки и просят запомнить порядок.', { left: 140, top: 130, width: 1000, fontSize: 40 }, 0.3, 5.4);
      // Ирина Петровна объясняет — облачко у неё; потом по очереди показывает мяч, дом, рыбу; номер загорается в момент показа
      K().say(s, 'Я покажу три картинки. Запомни, в каком порядке!', 452, TY - 0.5 * TD - 92, 0.4, 3.7);
      var badges = [];
      [1, 3, 5].forEach(function (ci, j) {
        var t = 1.3 + j * 0.8;
        s.tween(cards[ci], t, { y: 0 }, { y: -12, duration: 0.2, ease: 'power2.out' });
        s.tween(cards[ci], t + 0.5, { y: -12 }, { y: 0, duration: 0.25, ease: 'power2.in' });
        var b = s.node(ov, 'g', {});
        s.node(b, 'circle', { cx: CX(ci) + CW / 2 - 4, cy: CT + 4, r: 16, fill: '#E4F4F2', stroke: TEAL, 'stroke-width': 2.5 });
        txt(s, b, CX(ci) + CW / 2 - 4, CT + 12, String(j + 1), 22, { color: '#13534D', weight: 800 });
        s.tween(b, t + 0.15, { opacity: 0, scale: 0.5, svgOrigin: (CX(ci) + CW / 2 - 4) + ' ' + (CT + 4) }, { opacity: 1, scale: 1, duration: 0.25 });
        badges.push(b);
        s.gaze('adult2', 10, 6, t - 0.1, 0.2); s.hands('adult2', 'up', t - 0.1, 0.2); s.hands('adult2', 'side', t + 0.55, 0.2);
        s.gaze('kid3', 10, 7, t, 0.2); s.gaze('baby', -10, 7, t, 0.2);
      });
      s.brow('kid3', 'focus', 1.3, 0.3);
      s.tween(badges, 5.0, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      // мягкие козырьки надвигают на глаза — губы видно
      s.gaze('kid3', 0, 0, 5.1, 0.2); s.gaze('baby', 0, 0, 5.1, 0.2);
      var kD = cap(s, ov, cD.x, cD.y, cD.d / 2, 1), kM = cap(s, ov, cM.x, cM.y, cM.d / 2, 2);
      [kD, kM].forEach(function (k) { capOn(s, k, 5.4); }); // надевают: сверху вниз, ровно по центру
      // пока козырьки опущены и дети вспоминают, картинки перевёрнуты рубашкой вверх
      function turn(t, back) {
        cards.forEach(function (c, i) {
          var ox = CX(i) + ' ' + (CT + CW / 2);
          s.tween(c, t + i * 0.04, { scaleX: 1, svgOrigin: ox }, { scaleX: 0.02, duration: 0.12, ease: 'power1.in' });
          s.set(backs[i], t + i * 0.04 + 0.12, { opacity: back ? 0 : 1 }, { opacity: back ? 1 : 0 });
          s.tween(c, t + i * 0.04 + 0.12, { scaleX: 0.02, svgOrigin: ox }, { scaleX: 1, duration: 0.12, ease: 'power1.out' });
        });
      }
      var backs = cards.map(function (c, i) {
        var b = s.node(c, 'g', {});
        s.node(b, 'rect', Object.assign({ x: CX(i) - CW / 2, y: CT, width: CW, height: CW, rx: 8 }, L(2.2, '#7FA6C4')));
        s.node(b, 'rect', { x: CX(i) - CW / 2 + 8, y: CT + 8, width: CW - 16, height: CW - 16, rx: 5, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 2 });
        s.set(b, 0, { opacity: 1 }, { opacity: 0 });
        return b;
      });
      turn(5.0, true);
      hudText(s, 'h3', 'Глаза закрыты козырьком, а губы видно: так заметно, повторяет ли ребёнок про себя.', { left: 140, top: 130, width: 1000, fontSize: 40 }, 5.6, 12.0);
      // секундомер в руке у Ирины Петровны: 15 секунд
      var sw = s.node(g, 'g', {}), SX = 1338, SY = TB - 4; // секундомер стоит на углу стола
      s.node(sw, 'circle', Object.assign({ cx: SX, cy: SY, r: 18 }, L(2.6, PAPER)));
      s.node(sw, 'rect', { x: SX - 4, y: SY - 26, width: 8, height: 7, rx: 2, fill: INK });
      var hand = ln(s, sw, 'M' + SX + ' ' + SY + ' V' + (SY - 12), 2.4);
      var swt = s.node(sw, 'text', { x: SX + 4, y: SY - 92, 'text-anchor': 'middle', fill: INK, style: 'font-family: var(--sans); font-weight: 700; font-size: 28px' }); swt.textContent = '15 секунд';
      void swt;
      s.tween(sw, 6.2, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      s.tween(hand, 6.4, { rotation: 0, svgOrigin: SX + ' ' + SY }, { rotation: 360, duration: 4.4, ease: 'none' });
      s.tween(sw, 11.0, { opacity: 1 }, { opacity: 0, duration: 0.3 });
      // Ирина Петровна смотрит на губы; Дима шепчет, Миша молчит
      K().say(s, 'Назови по порядку!', 452, TY - 0.5 * TD - 92, 10.65, 11.7); // после 15 секунд — просит назвать
      s.gaze('adult2', 10, 2, 6.8, 0.3); s.brow('adult2', 'focus', 6.8, 0.3);
      whisper(s, 'kid3', 7.2, 10.4);
      K().say(s, 'мяч, дом, рыба…', 700, F - 290, 7.4, 10.6);
      s.mouth('baby', 'flat', 7.0, 0.2);
      [0, 1, 2, 3].forEach(function (j) { s.actor('baby', { x: cM.x + (j % 2 ? -6 : 6) }, 7.6 + j * 0.5, 0.25, 'sine.inOut'); });
      s.actor('baby', { x: cM.x }, 9.6, 0.25);
      // козырьки вверх; сначала результат: Дима — все три по порядку, Миша путается
      [kD, kM].forEach(function (k) { capOff(s, k, 11.2); }); // снимают: вверх, ровно
      turn(13.6, false); // ответы сказаны — картинки открывают для проверки
      s.brow('adult2', 'calm', 11.4, 0.3); s.gaze('adult2', 10, -2, 11.4, 0.3);
      s.gaze('kid3', 4, -6, 11.6, 0.2); s.gaze('baby', -4, -6, 11.6, 0.2);
      var aD = answer(s, ov, cD.x + 60, F - 310, ['ball', 'house', 'fish'], true, 11.8);
      s.brow('kid3', 'proud', 13.0, 0.2); s.mouth('kid3', 'smile', 13.0, 0.2);
      var aM = answer(s, ov, cM.x - 30, F - 310, ['house', 'ball', '?'], false, 12.2);
      s.brow('baby', 'sad', 13.2, 0.2); s.mouth('baby', 'sad', 13.2, 0.2);
      hudText(s, 'h3', 'Кто повторял про себя, помнил больше. В 5 лет так делают немногие, к 10 — почти все.', { left: 140, top: 130, width: 1000, fontSize: 40 }, 13.4);
      cite(s, 'rehearsal · Дж. Флейвелл и др., 1966 · Э. Эллиотт и др., 2021 (17 лабораторий): шептали и многие пятилетки — раньше, чем думали', 13.8);
      // козырьки снимают; Миша смотрит на Диму — и сам начинает шептать
      fadeOut(s, [aD, aM], 15.0);
      s.gaze('baby', -12, 0, 15.8, 0.3); s.brow('baby', 'doubt', 15.8, 0.3); s.mouth('baby', 'soft', 15.8, 0.3);
      s.gaze('kid3', 12, 0, 16.2, 0.3); s.mouth('kid3', 'smile', 16.2, 0.2);
      s.gaze('baby', -10, 6, 17.0, 0.3); s.brow('baby', 'focus', 17.0, 0.3);
      whisper(s, 'baby', 17.2, 19.6);
      var sm = K().say(s, 'мяч, дом, рыба…', 1210, F - 290, 17.3, 19.8, 'r');
      Film.css(sm, { fontSize: '30px', padding: '6px 20px 10px' });
      s.brow('baby', 'proud', 20.0, 0.3); s.mouth('baby', 'smile', 20.0, 0.3); s.gaze('kid3', 6, 0, 20.4, 0.3);
      concl(s, 'память становится нарочной — ребёнок сам выбирает, как запомнить.', 20.6);
      castOut(s, ['kid3', 'baby', 'adult2']);
      s.gear('baby', 'backpack', true, s.dur - 0.05, 0.01); // ранец вернётся на Мишу к следующему выходу
    }
  });

  // ---------- «Шахматная дуэль» ----------
  // доска лежит на столе (вид чуть сверху): ряды 0 (дальний) … 2 (ближний)
  var BK = { yb: 636, yf: 688, xb: [822, 1098], xf: [800, 1120], R: 3 };
  function bx(y, c) { var t = (y - BK.yb) / (BK.yf - BK.yb), l = BK.xb[0] + (BK.xf[0] - BK.xb[0]) * t, r = BK.xb[1] + (BK.xf[1] - BK.xb[1]) * t; return l + (r - l) * c / 6; }
  function by(r) { return BK.yb + (BK.yf - BK.yb) * r / BK.R; }
  function chessBoard(s, g) {
    var G = s.node(g, 'g', {});
    for (var r = 0; r < BK.R; r++) for (var c = 0; c < 6; c++) {
      var y0 = by(r), y1 = by(r + 1);
      s.path(G, 'M' + bx(y0, c) + ' ' + y0 + ' L' + bx(y0, c + 1) + ' ' + y0 + ' L' + bx(y1, c + 1) + ' ' + y1 + ' L' + bx(y1, c) + ' ' + y1 + ' Z', { fill: (r + c) % 2 ? '#C9A27A' : '#F3E6D2' });
    }
    s.path(G, 'M' + BK.xb[0] + ' ' + BK.yb + ' L' + BK.xb[1] + ' ' + BK.yb + ' L' + BK.xf[1] + ' ' + BK.yf + ' L' + BK.xf[0] + ' ' + BK.yf + ' Z', L(2.6));
    return G;
  }
  function sq(r, c) { var y = (by(r) + by(r + 1)) / 2; return { x: (bx(y, c) + bx(y, c + 1)) / 2, y: y + 4, k: 0.62 + 0.06 * r }; }
  // крышка-коробка, которой закрывают доску (и карточку с цифрами)
  function lid(s, g) {
    var G = s.node(g, 'g', {});
    s.path(G, 'M812 526 L1102 526 L1124 544 L790 544 Z', L(2.6, '#E6CDA8'));
    s.node(G, 'rect', Object.assign({ x: 790, y: 544, width: 334, height: 146, rx: 4 }, L(2.6, '#D9B98F'))); // коробка по размеру доски и листка — часы рядом остаются видны
    return G;
  }
  // шахматные часы на краю стола и подпись «10 секунд» над ними; черта под подписью сокращается
  function timer(s, ov, t0, dur) {
    var e = s.text('label', '10 секунд', { left: 1128, top: 566, fontSize: 28, fontWeight: 750, color: INK });
    var bar = s.path(ov, 'M1142 618 H1236', { stroke: TEAL, 'stroke-width': 6 });
    s.fade(e, t0, { y: 0, dur: 0.3 }); s.out(e, t0 + dur + 0.2, { dur: 0.2 });
    s.tween(bar, t0, { opacity: 0, scaleX: 1, svgOrigin: '1142 618' }, { opacity: 1, scaleX: 1, duration: 0.2 });
    s.tween(bar, t0 + 0.2, { scaleX: 1 }, { scaleX: 0.02, duration: dur, ease: 'none' });
    s.tween(bar, t0 + dur + 0.2, { opacity: 1 }, { opacity: 0, duration: 0.2 });
  }
  // комната Димы вечером: стена, тёмное окно с луной, книжная полка, пол
  function room(s, g, F) {
    ln(s, g, 'M0 ' + F + ' H1920', 2.4, FLOOR);
    s.node(g, 'rect', Object.assign({ x: 1340, y: 230, width: 260, height: 230, rx: 6 }, L(3, '#2E3F5C')));
    s.node(g, 'circle', { cx: 1540, cy: 290, r: 22, fill: '#F5E6A8' });
    [[1390, 280], [1450, 330], [1500, 400], [1420, 410]].forEach(function (q) { s.node(g, 'circle', { cx: q[0], cy: q[1], r: 3, fill: '#F5E6A8' }); });
    ln(s, g, 'M1470 230 V460 M1340 345 H1600', 3, '#E8F1EE');
    var sh = s.node(g, 'g', {});
    s.node(sh, 'rect', Object.assign({ x: 1680, y: 300, width: 180, height: F - 300 }, L(2.6, WOOD)));
    [430, 560, 690].forEach(function (y) { ln(s, sh, 'M1680 ' + y + ' H1860', 2.4); });
    var C = ['#E4735A', '#26A69A', '#F5D27A', '#4F7CAC', '#B98A5E'];
    [300, 430, 560].forEach(function (y0, r) { for (var i = 0; i < 6; i++) s.node(sh, 'rect', Object.assign({ x: 1692 + i * 26, y: y0 + 130 - (88 + ((i + r) % 3) * 10), width: 20, height: 88 + ((i + r) % 3) * 10, rx: 2 }, L(2, C[(i + r) % 5]))); });
  }

  // 3:45 — Шахматная дуэль: Дима против папы (М. Чи, 1978; В. Шнайдер и др., 1993)
  Film.scene({
    id: 'chess', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over(), F = 880;
      room(s, g, F);
      // стол, два стула друг напротив друга
      s.node(g, 'rect', Object.assign({ x: 740, y: 690, width: 440, height: 14, rx: 4 }, L(2.6, WOOD)));
      ln(s, g, 'M764 704 V' + F + ' M1156 704 V' + F, 2.6);
      var cP = chair(s, g, 600, F, 90, -1), cDm = chair(s, g, 1320, F, 62, 1, 760); // у Димы стул повыше — оба над доской одинаково
      on(s, 'dad', cP.x, cP.y, cP.d, 0.1, { gx: 10, gy: 6 });
      on(s, 'dima', cDm.x, cDm.y, cDm.d, 0.2, { gx: -10, gy: 6 });
      var pt = s.text('tag', 'папа', { left: cP.x - cP.d / 2 - 150, top: cP.y - 16, width: 130, textAlign: 'right' });
      s.fade(pt, 0.4, { y: 4 });
      var dt = s.text('tag', 'Дима', { left: cDm.x + cDm.d / 2 + 20, top: cDm.y - 16, width: 130, textAlign: 'left' });
      s.fade(dt, 0.4, { y: 4 });
      // табло матча — тетрадный лист на стене
      var sh = s.node(g, 'g', {});
      P().page(s, sh, 240, 280, 420, 260, { cell: 30, margin: false });
      [[260, 270], [620, 270]].forEach(function (q) { s.node(sh, 'rect', { x: q[0] - 22, y: q[1], width: 44, height: 18, fill: '#EADFB8', opacity: 0.9, transform: 'rotate(-8 ' + q[0] + ' ' + (q[1] + 9) + ')' }); });
      txt(s, sh, 480, 330, 'Папа', 26, { font: 'sans' }); txt(s, sh, 595, 330, 'Дима', 26, { font: 'sans' }); // табличка — одним шрифтом
      ln(s, sh, 'M260 346 H640', 2, INK);
      var r1 = txt(s, sh, 260, 395, 'фигуры', 26, { anchor: 'start', font: 'sans' }), r2 = txt(s, sh, 260, 455, 'цифры', 26, { anchor: 'start', font: 'sans' }), r3 = txt(s, sh, 260, 515, 'счёт', 26, { anchor: 'start', font: 'sans' });
      fadeIn(s, sh, 0.2, 0.4);
      // кадр 1: позиция на 10 секунд (обычные пешки и кони)
      var cb = chessBoard(s, g);
      fadeIn(s, cb, 0.3, 0.3);
      var POS = [[0, 1, 'k', 1], [0, 4, 'p', 0], [1, 0, 'p', 0], [1, 2, 'p', 1], [1, 3, 'k', 0], [1, 5, 'p', 0], [2, 1, 'p', 1], [2, 4, 'k', 1], [2, 5, 'p', 0]];
      var pcs = s.node(g, 'g', {});
      POS.forEach(function (p, i) { var q = sq(p[0], p[1]), pg = s.node(pcs, 'g', {}); (p[2] === 'k' ? K().knight : K().pawn)(s, pg, q.x, q.y, q.k, p[3]); s.tween(pg, 0.4 + i * 0.05, { opacity: 0 }, { opacity: 1, duration: 0.2 }); });
      // шахматные часы на краю стола, справа от коробки: два циферблата и две кнопки
      var ck = s.node(g, 'g', {});
      s.node(ck, 'rect', Object.assign({ x: 1134, y: 648, width: 46, height: 42, rx: 6 }, L(2.4, '#B98A5E')));
      [[1146, 1], [1168, 0]].forEach(function (q) {
        s.node(ck, 'rect', Object.assign({ x: q[0] - 5, y: q[1] ? 639 : 643, width: 10, height: q[1] ? 9 : 5, rx: 2 }, L(2, INK)));
        s.node(ck, 'circle', Object.assign({ cx: q[0], cy: 670, r: 9.5 }, L(1.8, PAPER)));
        ln(s, ck, 'M' + q[0] + ' 670 V663 M' + q[0] + ' 670 h5', 1.6);
      });
      s.brow('dad', 'focus', 1.2, 0.3); s.brow('kid3', 'focus', 1.2, 0.3);
      timer(s, ov, 1.2, 2.0);
      var lb = lid(s, g);
      s.set(lb, 0, { y: 0 }, { y: -720 }); // коробка ждёт за верхним краем кадра — опускается и поднимается движением, непрозрачная
      s.tween(lb, 3.6, { y: -720 }, { y: 0, duration: 0.4, ease: 'power2.in' });
      s.set([cb, pcs], 4.0, { opacity: 1 }, { opacity: 0 });
      hudText(s, 'h3', 'Кто запомнит больше — Дима или папа? <span class="acc">Угадайте.</span>', { left: 140, top: 130, width: 1640, fontSize: 40 }, 0.4, 5.9);
      freeze(s, 4.2, 1.9);
      s.gaze('dad', 2, -6, 4.2, 0.3); s.gaze('kid3', -2, -6, 4.2, 0.3); s.brow('kid3', 'calm', 4.2, 0.3);
      // кадр 2: табло — фигуры: папа 6, Дима 9; папа удивлён (брови вверх, рот «о»)
      var p1 = txt(s, sh, 480, 395, '6', 32, { font: 'sans' }), d1 = txt(s, sh, 595, 395, '9', 32, { color: '#13534D', font: 'sans' });
      fadeIn(s, r1, 6.1); fadeIn(s, d1, 6.3); fadeIn(s, p1, 6.5);
      var sc1 = txt(s, sh, 538, 515, '0 : 1', 36, { font: 'sans' });
      fadeIn(s, r3, 6.7); fadeIn(s, sc1, 6.7); fadeOut(s, sc1, 14.2, 0.2);
      s.brow('kid3', 'proud', 6.3, 0.2); s.mouth('kid3', 'smile', 6.3, 0.2); s.squash('kid3', 0.94, 1.08, 6.3, 0.1); s.squash('kid3', 1, 1, 6.4, 0.3, 'back.out(3)');
      s.gaze('dad', 3, -2, 6.5, 0.2); s.brow('dad', 'proud', 6.5, 0.3); s.mouth('dad', 'flat', 6.5, 0.2);
      var mo = s.node(ov, 'g', {}), MX = cP.x + 3 * 1.8, MY = cP.y + (63 - 50 - 2) * 1.8;
      s.node(mo, 'ellipse', { cx: MX, cy: MY, rx: 30, ry: 10, fill: '#2C4459' });
      s.node(mo, 'ellipse', { cx: MX, cy: MY, rx: 8, ry: 10, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 4 });
      s.tween(mo, 6.6, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      s.tween(mo, 8.4, { opacity: 1 }, { opacity: 0, duration: 0.15 });
      s.squash('dad', 0.97, 1.05, 6.6, 0.15); s.squash('dad', 1, 1, 6.75, 0.3);
      s.mouth('dad', 'soft', 8.4, 0.2); s.brow('dad', 'calm', 8.4, 0.2);
      hudText(s, 'h3', 'Дима знает шахматы и видит на доске знакомые узоры.', { left: 140, top: 130, width: 1640, fontSize: 40 }, 6.9, 10.7); // гаснет до показа цифр
      // кадр 3: реванш — ряд случайных цифр на карточке, тоже на 10 секунд, закрывается
      var dg = s.node(g, 'g', {});
      ln(s, dg, 'M960 688 L1000 600', 2.4);
      s.node(dg, 'rect', Object.assign({ x: 800, y: 556, width: 320, height: 128, rx: 8 }, L(2.6, PAPER)));
      txt(s, dg, 960, 640, '7 3 9 1 5 8 2 6', 52, { weight: 600 }); // ряд случайных цифр — крупно на листке
      s.tween(dg, 11.45, { opacity: 0 }, { opacity: 1, duration: 0.01 });
      s.tween(lb, 11.05, { y: 0 }, { y: -720, duration: 0.4, ease: 'power2.in' });
      s.brow('dad', 'focus', 11.3, 0.3); s.gaze('dad', 10, 6, 11.3, 0.3);
      s.brow('kid3', 'focus', 11.3, 0.3); s.mouth('kid3', 'soft', 11.3, 0.3); s.gaze('kid3', -10, 6, 11.3, 0.3);
      timer(s, ov, 11.45, 1.45);
      s.tween(lb, 13.05, { y: -720 }, { y: 0, duration: 0.4, ease: 'power2.in' });
      s.set(dg, 13.5, { opacity: 1 }, { opacity: 0 });
      s.gaze('dad', 2, -6, 13.5, 0.3); s.gaze('kid3', -2, -6, 13.5, 0.3); s.brow('kid3', 'calm', 13.5, 0.3);
      // сначала результат: цифры — папа 8, Дима 6; счёт 1 : 1; только потом объяснение
      var p2 = txt(s, sh, 480, 455, '8', 32, { color: '#13534D', font: 'sans' }), d2 = txt(s, sh, 595, 455, '6', 32, { font: 'sans' });
      fadeIn(s, r2, 13.8); fadeIn(s, p2, 14.0); fadeIn(s, d2, 14.2);
      var sc2 = txt(s, sh, 538, 515, '1 : 1', 36, { font: 'sans' });
      fadeIn(s, sc2, 14.3);
      s.brow('dad', 'proud', 14.1, 0.3); s.mouth('dad', 'smile', 14.1, 0.3); s.gaze('dad', 10, 0, 14.1, 0.3);
      s.mouth('kid3', 'smile', 14.5, 0.3); s.gaze('kid3', -10, 0, 14.5, 0.3);
      hudText(s, 'h3', 'В цифрах узоров нет — и папа впереди.', { left: 140, top: 130, width: 1640, fontSize: 40 }, 14.7);
      concl(s, 'память растёт вместе со знаниями.', 17.0);
      cite(s, 'М. Чи, 1978: дети ~10 лет и взрослые · В. Шнайдер и др., 1993 — повторилось', 17.4);
      castOut(s, ['dad', 'kid3']);
    }
  });
})();
