/* Итог (v3.3): что вырастает (рефлексия — облачко-схема с меркой), «паспорт возраста» с разными авторами,
   финал — игра на площадке и цитата, «Приходите на курс» (Миша перескакивает на «10–13» — и у него появляется чёлка) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733';
  // Ранец Ани (bagBlue) / Димы (bagGreen) — своя вещь на спине: on — надет, иначе снят (лежит у парты или дома).
  // Снимается тиканьем 0 → 0, чтобы до первого появления ранец нигде не проступал
  function bag(s, id, on, lt) {
    var k = { kid2: 'bagBlue', kid3: 'bagGreen' }[id], e = s.acc(id, k);
    if (on) s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 }); else s.set(e, lt, { opacity: 0 }, { opacity: 0 });
  }
  var FLOOR = 900; // пол класса в places.classroom
  // плавный прыжок: вверх — вниз, без сжатия рывком
  function jump2(s, id, x, y, lt, dur, h) {
    var f = s.A[id].st;
    s.actor(id, { x: (f.x + x) / 2, y: Math.min(f.y, y) - h }, lt + 0.08, dur / 2, 'sine.out'); // плавно, без сжатия
    s.actor(id, { x: x, y: y }, lt + 0.08 + dur / 2, dur / 2, 'sine.in');
    return lt + 0.08 + dur;
  }

  // 5:07,5 — Что вырастает: перед тем как сдать тетрадь, Миша сам проверяет её — в облачке мерка проходит по палочкам
  // и находит кривую; Миша её исправляет, Ирина Петровна подходит и забирает тетрадь (рефлексия; метапознание — Дж. Флейвелл, 1979)
  Film.scene({
    id: 'grow', bars: 5,
    build: function (s) {
      var P = Film.places, g = s.svg(), ov = s.over();
      var cr = P.classroom(s, g, {});
      P.fill(s, g, cr.seats, [cr.heroes.misha, cr.heroes.anya, cr.heroes.dima], 0, -12); P.bags(s, g, cr.seats, cr.floor, [0]);
      var sp = function (w) { var q = cr.heroes[w].split(':'); return cr.seats[+q[0]][+q[1]]; }, M = sp('misha'), A = sp('anya'), D = sp('dima');
      K().cast(s, 'misha', M.x, M.y, M.r * 2, 0, { dur: 0.01, mouth: 'soft', gx: -10, gy: 6 }); s.gear('baby', 'backpack', false, 0, 0.01);
      Film.toys.backpack(s, g, M.x + M.r * 1.25, FLOOR - 40, 0.9, '#26A69A', '#1C7A71'); // ранец на полу у стула
      K().cast(s, 'anya', A.x, A.y, A.r * 2, 0, { dur: 0.01, gx: -12 });
      K().cast(s, 'dima', D.x, D.y, D.r * 2, 0, { dur: 0.01, gx: -12 });
      bag(s, 'kid2', false, 0); bag(s, 'kid3', false, 0); // в классе ранцы у парт
      var TX = cr.teacher.x, TY = P.standY(FLOOR, 150, true);
      K().cast(s, 'teacher', TX, TY, 150, 0, { dur: 0.01, gx: 10 });
      s.hands('baby', 'desk', 0, 0.01); s.hands('kid2', 'desk', 0, 0.01); s.hands('kid3', 'desk', 0, 0.01);
      // тетрадь лежит на парте Миши; над доской — врезка «крупно», связанная с тетрадью тонкими линиями
      var NX = M.desk.x2 - 64, NY = M.desk.y, nb = s.node(g, 'g', {});
      s.set(nb, 0, { x: NX, y: NY }, { x: NX, y: NY });
      s.path(nb, 'M-64 0 L64 0 L52 -26 L-76 -26 Z', { fill: '#FFFDF8', stroke: INK, 'stroke-width': 2.2 });
      s.path(nb, 'M0 0 L-12 -26', { stroke: INK, 'stroke-width': 1.8 });
      [-30, -16, 2, 16, 30].forEach(function (x) { s.path(nb, 'M' + x + ' -4 l-4 -18', { stroke: K().DEEP, 'stroke-width': 2 }); });
      // лупа: круглая линза с ручкой показывает тетрадь крупно; пунктир — к тетради на парте
      var ins = s.node(g, 'g', {}), LX = 820, LY = 410, LR = 140, clipId = 'lupa-grow';
      var cp = s.node(g, 'clipPath', { id: clipId }); s.node(cp, 'circle', { cx: LX, cy: LY, r: LR });
      s.path(ins, 'M' + (LX - 40) + ' ' + (LY + LR - 6) + ' L' + (NX - 64) + ' ' + (NY - 26) + ' M' + (LX + 60) + ' ' + (LY + LR - 12) + ' L' + (NX + 52) + ' ' + (NY - 26), { stroke: '#A79C8E', 'stroke-width': 2, 'stroke-dasharray': '6 6' });
      s.path(ins, 'M' + (LX + LR * 0.72) + ' ' + (LY + LR * 0.72) + ' L' + (LX + LR * 0.72 + 50) + ' ' + (LY + LR * 0.72 + 50), { stroke: INK, 'stroke-width': 14 }); // ручка — вправо-вниз, доска свободна
      var lens = s.node(ins, 'g', { 'clip-path': 'url(#' + clipId + ')' });
      P.page(s, lens, LX - LR, LY - LR, 2 * LR, 2 * LR, { cell: 26, margin: 40 });
      s.node(ins, 'circle', { cx: LX, cy: LY, r: LR, fill: 'none', stroke: INK, 'stroke-width': 6 });
      s.fade(ins, 0.05, { y: 6, dur: 0.4 });
      var SX = function (i) { return LX - 108 + i * 34; }, BAD = 4, bad = null;
      for (var i = 0; i < 7; i++) {
        var st = s.path(lens, i === BAD ? 'M' + (SX(i) - 9) + ' ' + (LY - 50) + ' L' + (SX(i) + 9) + ' ' + (LY + 50) : 'M' + SX(i) + ' ' + (LY - 50) + ' V' + (LY + 50), { stroke: K().DEEP, 'stroke-width': 6 });
        if (i === BAD) bad = st;
      }
      // облачко-схема над Мишей справа (пузырьки — к нему, мимо голов дальнего ряда): те же палочки, мерка идёт по ним
      var cg = s.node(ov, 'g', {}); Film.icons.cloud(s, cg, 1180, 380, 180, 82, { tail: [M.x, 640], at: 0.3, dur: 0.6, seed: 4 });
      var sch = s.node(ov, 'g', {}), CX = function (i) { return 1056 + i * 42; }, cBad;
      for (var j = 0; j < 7; j++) {
        var cs = s.path(sch, j === BAD ? 'M' + (CX(j) - 10) + ' 348 L' + (CX(j) + 10) + ' 412' : 'M' + CX(j) + ' 348 V412', { stroke: INK, 'stroke-width': 5 });
        if (j === BAD) cBad = cs;
      }
      s.tween(sch, 0.9, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var merka = s.node(ov, 'rect', { x: CX(0) + 7, y: 342, width: 10, height: 76, rx: 3, fill: '#26A69A', stroke: INK, 'stroke-width': 2 });
      s.tween(merka, 1.2, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      s.tween(merka, 1.3, { x: 0 }, { x: 42 * BAD, duration: 1.2, ease: 'steps(4)' });
      s.gaze('baby', 6, -8, 1.2, 0.3); s.brow('baby', 'focus', 1.2, 0.3);
      s.tween(cBad, 2.6, { attr: { stroke: INK } }, { attr: { stroke: '#D9534F' }, duration: 0.25 });
      s.brow('baby', 'doubt', 2.6, 0.3); s.mouth('baby', 'flat', 2.6, 0.3);
      // Миша сам исправляет палочку — и в облачке она выпрямляется
      s.gaze('baby', -10, 6, 3.0, 0.3);
      s.out(bad, 3.2, { dur: 0.25 });
      var fix = s.path(lens, 'M' + SX(BAD) + ' ' + (LY - 50) + ' V' + (LY + 50), { stroke: K().DEEP, 'stroke-width': 6 }); s.draw(fix, 3.4, { dur: 0.4 });
      s.out(cBad, 3.5, { dur: 0.2 });
      var cFix = s.path(sch, 'M' + CX(BAD) + ' 348 V412', { stroke: INK, 'stroke-width': 5 }); s.draw(cFix, 3.6, { dur: 0.3 });
      s.brow('baby', 'proud', 3.9, 0.3); s.mouth('baby', 'smile', 3.9, 0.3);
      // сдаёт тетрадь: Ирина Петровна подходит шагами, Миша отдаёт тетрадь ей в руку
      s.out([ins, cg, sch, merka], 4.5, { dur: 0.4 });
      s.gaze('adult2', 12, 0, 4.6, 0.15); var TN = 600, tw = K().walk(s, 'adult2', TN, 4.7, { step: 100, dur: 0.24, hold: 0.06 });
      var TH = 4.7 + tw + 0.1;
      s.hands('adult2', 'hold', TH - 0.2, 0.2); s.gaze('baby', -12, -4, TH - 0.4, 0.3);
      s.hands('baby', 'hold', TH, 0.2);
      s.tween(nb, TH + 0.1, { x: NX, y: NY }, { x: TN + 84, y: TY + 100, duration: 0.5, ease: 'power2.inOut' }); // тетрадь — в руке учителя
      s.mouth('adult2', 'smile', TH + 0.6, 0.3); s.hands('baby', 'off', TH + 0.8, 0.2);
      // строчки глав сходятся в четыре слова
      // четыре плашки в ряд — по главам 1–4: номер главы в бирюзовом кружке и слово; появляются по одной
      var row = ['по правилу', 'в уме', 'нарочно', 'со стороны'].map(function (w, i) {
        return '<div class="grow-card" style="display:flex;align-items:center;gap:14px;padding:8px 22px 8px 10px;background:#FFFDF8;border:1.5px solid #D8CFC0;border-radius:12px;">' +
          '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#26A69A;color:#FFFDF8;font-family:DOMSans;font-weight:700;font-size:24px;">' + (i + 1) + '</span>' +
          '<span class="label" style="font-size:34px;color:var(--ink);">' + w + '</span></div>';
      }).join('');
      var words = s.div('', { left: 140, top: 906, width: 1640 }, null, '<div class="label grow-title" style="font-size:30px;color:var(--accent-deep);">Что развивается</div><div style="display:flex;gap:24px;margin-top:8px;">' + row + '</div>');
      s.fade(words.querySelector('.grow-title'), 0.3, { y: 6 });
      s.fade(words.querySelectorAll('.grow-card'), 0.6, { y: 8, stagger: 0.35 });
      var t1 = s.text('h3', 'Главное, что развивается, — <span class="acc">рефлексия</span>: умение посмотреть на себя со стороны и проверить, как я думаю и учусь.', { left: 140, top: 124, width: 1040, fontSize: 34 });
      s.lines(t1, 4.3);
      var c = s.text('cite', 'на Западе это называют метапознанием — metacognition (Дж. Флейвелл, 1979)', { left: 140, top: 1036, width: 1640, fontSize: 20 });
      s.fade(c, 5.0, { y: 4 });
      ['baby', 'kid2', 'kid3', 'adult2'].forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); if (id !== 'adult2') s.hands(id, 'off', s.dur - 0.1, 0.01); });
    }
  });

  // 5:20 — Что запомнить: «паспорт возраста» (семь строк); у строк разные авторы — одной колонкой справа
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Ученик: дело оценивает общественный взрослый — учитель', 'Д. Б. Эльконин'],
        ['Ведущая деятельность', 'Учебная (игра остаётся)', 'В. В. Давыдов'],
        ['Доминирующая функция', 'Мышление: память и внимание становятся произвольными', 'Л. С. Выготский'],
        ['Новообразования', 'Произвольность, внутренний план действий, рефлексия', 'Дж. Флейвелл (метапознание)'],
        ['Кризис', 'Нет: стабильный период; впереди — подростковый кризис', ''],
        ['Психосоциальная стадия', 'Трудолюбие против неполноценности', 'Э. Эриксон'],
        ['Стадия мышления', 'Конкретные операции: логика на вещах', 'Ж. Пиаже']
      ];
      var col = s.div('', { left: 140, top: 310, width: 1640, display: 'flex', flexDirection: 'column', gap: '0px' });
      rows.forEach(function (r, i) {
        var row = Film.el('div', 'passport-row', col);
        row.style.padding = '18px 0 18px';
        var kk = Film.el('div', 'passport-k', row, r[0]);
        kk.style.width = '420px';
        var v = Film.el('div', 'passport-v', row, r[1]);
        v.style.fontSize = '31px'; v.style.flex = '1'; v.style.paddingRight = '44px'; // зазор до автора
        var a = Film.el('div', 'passport-a', row, r[2]);
        a.style.width = '360px';
        s.fade(row, 0.6 + i * 0.55, { y: 10, dur: 0.6 }); // все семь строк на экране к 4,5 с
      });
    }
  });

  // 5:32,5 — Финал: площадка — трое и одноклассники играют; Дима везёт игрушечную лошадку — над ней проступает рисованная
  // лошадь 3–7 (рифма с крючком); Миша прыгает выше всех — наезд; между тремя — линии; цитата, когда движение затихло
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      var P = Film.places, g = s.svg(), GR = 700, LN = { stroke: '#2B3440', 'stroke-width': 3 };
      // двор: школа слева, классики, скамейка, качели, дерево справа (верх неба свободен — под цитату)
      s.node(g, 'rect', { x: 0, y: GR, width: 1920, height: 500, fill: '#CFC4AE' });
      s.path(g, 'M0 ' + GR + ' H1920', { stroke: '#C9BBA2', 'stroke-width': 2.4 });
      P.school(s, g, 270, GR, 0.75); P.bench(s, g, 1280, GR, 1);
      P.classics(s, g, 760, GR + 200, 1.1);
      s.path(g, 'M1480 ' + GR + ' V520 M1620 ' + GR + ' V520', LN);
      var sw = s.node(g, 'g', {});
      s.path(sw, 'M1534 522 L1508 652 M1566 522 L1592 652', { stroke: '#2B3440', 'stroke-width': 2.2 }); // тросы — от крючков у оси, по бокам ребёнка
      s.node(sw, 'rect', { x: 1506, y: 650, width: 88, height: 10, rx: 3, fill: '#E9D9BF', stroke: '#2B3440', 'stroke-width': 2.2 });
      K().classmate(sw, 7, 1550, 622, 28, { gx: 6 });
      s.path(g, 'M1472 520 H1628', { stroke: '#2B3440', 'stroke-width': 5 }); // перекладина поверх концов тросов
      s.tween(sw, 0, { rotation: -12, svgOrigin: '1550 520' }, { rotation: 12, duration: 1.6, ease: 'sine.inOut', repeat: 7, yoyo: true });
      // одноклассники: двое перекидываются мячом, один подпрыгивает у классиков, ждёт очереди (до конца сцены)
      [[1, 180, 812, 40, 8], [11, 610, 790, 38, -8]].forEach(function (c) { K().classmate(g, c[0], c[1], c[2], c[3], { gx: c[4] }); });
      var bl = s.node(g, 'g', {}); K().ball(s, bl, 0, 0, 15);
      s.set(bl, 0, { x: 230, y: 806 }, { x: 230, y: 806 });
      [[230, 806, 560, 800, 0.4], [560, 800, 230, 806, 1.4], [230, 806, 560, 800, 2.4]].forEach(function (p) {
        s.tween(bl, p[4], { x: p[0] }, { x: p[2], duration: 0.8, ease: 'none' });
        s.tween(bl, p[4], { y: p[1] }, { y: 690, duration: 0.4, ease: 'power2.out' });
        s.tween(bl, p[4] + 0.4, { y: 690 }, { y: p[3], duration: 0.4, ease: 'power2.in' });
      });
      var hp = s.node(g, 'g', {}); K().classmate(hp, 6, 0, 0, 34, { gx: 6 }); s.set(hp, 0, { x: 400, y: 960 }, { x: 400, y: 960 });
      s.tween(hp, 0.2, { y: 960 }, { y: 936, duration: 0.3, ease: 'power2.out', repeat: 21, yoyo: true });
      // герои (ранец снят)
      var M = [1040, 800, 100], A = [1290, 745, 84], D0 = [1600, 836, 92], D = [1440, 836];
      K().cast(s, 'misha', M[0], M[1], M[2], 0, { dur: 0.01, gx: 8 }); s.gear('baby', 'backpack', false, 0, 0.01);
      K().cast(s, 'anya', A[0], A[1], A[2], 0, { dur: 0.01, gx: -6 });
      K().cast(s, 'dima', D0[0], D0[1], D0[2], 0, { dur: 0.01, gx: -12 }); s.hands('kid3', 'hold', 0, 0.01);
      bag(s, 'kid2', false, 0); bag(s, 'kid3', false, 0); // в финале ранцы сняты
      // Дима везёт игрушечную лошадку на верёвочке — и она «скачет»; лошадка и верёвка в одной группе, едут вместе с Димой
      var rig = s.node(g, 'g', {}), toy = s.node(rig, 'g', {}), HX = D0[0] + 120, HY = D0[1] + 46;
      K().toyHorse(s, toy, HX, HY, 0.6);
      var str = s.node(rig, 'line', { x1: D0[0] + 56, y1: D0[1] + 18, x2: HX - 26, y2: HY - 10, stroke: '#2B3440', 'stroke-width': 2 });
      var wt = K().walk(s, 'kid3', D[0], 0.4, { step: 80, dur: 0.24, hold: 0.06 });
      s.tween(rig, 0.4, { x: 0 }, { x: D[0] - D0[0], duration: wt, ease: 'sine.inOut' }); // так же, как идёт Дима
      var hop = function (t, dur, h) { // лошадка подскакивает — конец верёвки у неё поднимается вместе с ней
        s.tween(toy, t, { y: 0 }, { y: -h, duration: dur / 2, ease: 'sine.out' }); s.tween(toy, t + dur / 2, { y: -h }, { y: 0, duration: dur / 2, ease: 'sine.in' });
        s.tween(str, t, { attr: { y2: HY - 10 } }, { attr: { y2: HY - 10 - h }, duration: dur / 2, ease: 'sine.out' });
        s.tween(str, t + dur / 2, { attr: { y2: HY - 10 - h } }, { attr: { y2: HY - 10 }, duration: dur / 2, ease: 'sine.in' });
      };
      hop(0.57, 0.24, 18); hop(0.87, 0.24, 18); hop(1.49, 0.4, 34); hop(1.99, 0.4, 34);
      s.mouth('kid3', 'smile', 1.0, 0.3);
      // Миша прыгает — а потом выше всех; наезд на него
      [0.9, 1.5].forEach(function (t) { jump2(s, 'baby', M[0], M[1], t, 0.4, 50); });
      s.hands('kid2', 'side', 1.2, 0.3); jump2(s, 'kid2', A[0], A[1], 1.3, 0.4, 44);
      s.hands('baby', 'up', 2.1, 0.2);
      jump2(s, 'baby', M[0], M[1], 2.2, 0.7, 210);
      s.gaze('kid2', -6, -8, 2.3, 0.3); s.gaze('kid3', -8, -8, 2.3, 0.3);
      s.cam({ cx: 860, cy: 640, z: 1.12 }, 2.15, 1.0, 'power2.inOut'); // наезд мягкий: школа и вся площадка остаются в кадре
      s.hands('baby', 'off', 3.0, 0.2); s.hands('kid2', 'side', 2.7, 0.3);
      s.gaze('baby', 8, 0, 3.1, 0.3); s.gaze('kid2', -6, 2, 3.1, 0.3); s.gaze('kid3', -8, 0, 3.1, 0.3);
      // линии между тремя: все трое теперь вместе
      var net = s.node(g, 'g', {});
      g.insertBefore(net, rig);
      [[[M[0], M[1]], [A[0], A[1]]], [[A[0], A[1]], D], [[M[0], M[1]], D]].forEach(function (p, i) {
        var l = s.path(net, 'M' + p[0][0] + ' ' + p[0][1] + ' L' + p[1][0] + ' ' + p[1][1], { stroke: '#2B8F84', 'stroke-width': 3.2 });
        s.draw(l, 2.95 + i * 0.12, { dur: 0.45, ease: 'power1.inOut' });
      });
      // цитата — на плотной плашке в свободном небе, когда движение затихло; качели и скакалка не останавливаются
      var q = s.hud('', '<div class="quote" style="font-size: 40px;">«Ребёнок понимает, что мир не вращается вокруг него. Зато он может играть по-крупному и научиться многому — могущество от слова „могу“»</div>' +
        '<div class="cite" style="margin-top: 22px; font-size: 21px;">из лекции курса «Психология развития» о младшем школьном возрасте</div>',
        { left: 620, top: 118, width: 1100, textAlign: 'center', background: '#FFFDF8', border: '1.5px solid #E7E2DA', boxShadow: '0 22px 45px -30px rgba(17, 24, 39, 0.35)', padding: '18px 28px 20px', borderRadius: 16 });
      s.tween(q, 3.25, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      s.out(q, s.dur - 0.5, { dur: 0.4 });
      ['baby', 'kid2', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); s.hands(id, 'off', s.dur - 0.1, 0.01); });
    }
  });

  // 5:45 — Приходите на курс: QR-коды курса и канала; карта курса; Миша перескакивает на «10–13» — в прыжке у него появляется чёлка
  Film.scene({
    id: 'final', bars: 3, hold: true,
    build: function (s) {
      s.brandOut(0.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 196, top: 92, height: 96 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 0.3, { y: 10, dur: 0.9 });
      var h = s.text('h2', 'Приходите на курс', { left: 0, top: 220, width: 1920, textAlign: 'center' });
      s.lines(h, 0.6);
      var QR = window.FILM_QR || {};
      [['course', 'Курс «Психология развития»', 'academydom.com/vozrast', 530], ['tg', 'Телеграм-канал', 't.me/AlexeiZykov', 1010]].forEach(function (c, i) {
        var card = s.div('card', { left: c[3], top: 350, width: 380, height: 452 });
        var q = QR[c[0]];
        if (q) {
          var sv = Film.svg('svg', { width: 290, height: 290, viewBox: '0 0 ' + q.n + ' ' + q.n, 'shape-rendering': 'crispEdges' }, card);
          sv.style.position = 'absolute'; sv.style.left = '45px'; sv.style.top = '35px';
          Film.svg('path', { d: q.d, fill: INK }, sv);
        }
        var t = Film.el('div', 'label', card, c[1]);
        Film.css(t, { position: 'absolute', left: 0, top: 344, width: 380, textAlign: 'center', fontSize: 25 });
        var u = Film.el('div', 'note', card, c[2]);
        Film.css(u, { position: 'absolute', left: 0, top: 384, width: 380, textAlign: 'center', fontSize: 23, color: '#13534D', fontWeight: 650 });
        s.fade(card, 1.0 + i * 0.3, { y: 0, dur: 0.6 }); // проявляется на своём месте
      });
      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 0.3);
      var cur = s.CFG.series.current, nx = s.CFG.series.next;
      var cx = M.x(cur) + M.segW / 2, nxX = M.x(nx) + M.segW / 2, DM = 56, Y = s.RY - 14 - DM / 2; // над полоской карты, не на ней
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.brow('baby', 'calm', 0, 0.01); s.gaze('baby', 6, 0, 0, 0.01);
      s.hands('baby', 'off', 0, 0.01); s.gear('baby', 'backpack', false, 0, 0.01);
      s.actor('baby', { x: cx, y: Y, d: DM, o: 0 }, 0, 0.01); s.actor('baby', { o: 1 }, 0, 0.01); // стоит с начала сцены
      // чёлка (10–13): появляется на Мише в прыжке — следующий возраст рисуется по-новому
      var fr = Film.svg('svg', { viewBox: '0 0 100 100', overflow: 'visible' }, s.A.baby.body);
      fr.style.position = 'absolute'; fr.style.inset = '0'; fr.style.overflow = 'visible';
      Film.svg('path', { d: 'M9 36 Q14 0 50 -2 Q86 0 91 36 Q82 22 70 24 Q61 13 49 21 Q37 12 26 23 Q16 22 9 36 Z', fill: '#5A3B2E' }, fr);
      s.mapNext(M, 3.6);
      jump2(s, 'baby', nxX, Y, 3.9, 0.5, 70);
      s.tween(fr, 4.12, { opacity: 0, scale: 0.6, transformOrigin: '50% 30%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
      s.brow('baby', 'proud', 4.12, 0.25);
      var ann = s.text('note', 'Далее: ранняя подростковость, 10–13 лет', { left: nxX - 340, top: s.RY - 118, width: 680, textAlign: 'center', color: '#5E35B1', fontWeight: 650 });
      s.fade(ann, 4.3, { y: 6 });
    }
  });
})();
