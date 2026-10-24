/* Лист героев 7–10 (v3.2, «Язык 7–10»): круг — весь человек, брови, руки-точки, своя вещь; учитель — капсула; родители — круги */
/* global Film */
(function () {
  'use strict';
  Film.scene({ id: 'sheet', bars: 2, build: function (s) {
    var K = Film.school, g = s.svg();
    s.rulerOut(0);
    // Герои — актёрами (как в сценах)
    K.cast(s, 'misha', 200, 300, 120, 0, { dur: 0.01 });
    K.cast(s, 'anya', 420, 300, 112, 0, { dur: 0.01 });
    K.cast(s, 'dima', 640, 300, 112, 0, { dur: 0.01 });
    K.cast(s, 'teacher', 900, 250, 120, 0, { dur: 0.01 });
    K.cast(s, 'mom', 1180, 290, 170, 0, { dur: 0.01 });
    K.cast(s, 'dad', 1440, 290, 170, 0, { dur: 0.01 });
    [[200, 'Миша'], [420, 'Аня'], [640, 'Дима'], [900, 'Ирина Петровна'], [1180, 'мама'], [1440, 'папа']].forEach(function (n) { K.tag(s, n[1], n[0], 430, 0); });
    // Через 2 с — выражения и руки: Миша поднял руку, Аня сосредоточена и держит, Дима смотрит в сторону, учитель сомневается
    s.brow('baby', 'proud', 2, 0.3); s.hands('baby', 'up', 2, 0.3);
    s.brow('kid2', 'focus', 2, 0.3); s.mouth('kid2', 'flat', 2, 0.3); s.hands('kid2', 'hold', 2, 0.3);
    s.gaze('kid3', 6, 0, 2, 0.3); s.hands('kid3', 'desk', 2, 0.3);
    s.brow('adult2', 'doubt', 2, 0.3); s.hands('adult2', 'side', 2, 0.3);
    s.brow('adult', 'sad', 2, 0.3); s.mouth('adult', 'soft', 2, 0.3);
    // Одноклассники — статисты, в двух масштабах
    for (var i = 0; i < 10; i++) {
      K.classmate(g, i, 160 + i * 170, 680, 44);
      K.classmate(g, i + 7, 160 + i * 170, 860, 22);
    }
    K.toyHorse(s, g, 1720, 340, 1.2);
  } });
})();
/* Лист мест (v3.2): класс сбоку (стул и парта, как в 3–7), двор с классиками, кухня, три дорожки */
(function () {
  'use strict';
  var P = function () { return Film.places; }, K = function () { return Film.school; };
  function hide(s) { ['baby', 'kid2', 'kid3', 'adult', 'adult2', 'dad'].forEach(function (id) { s.actor(id, { o: 0 }, 0, 0.01); s.hands(id, 'off', 0, 0.01); }); }
  Film.scene({ id: 'pl-class', bars: 2, build: function (s) {
    hide(s); var g = s.svg(), cr = P().classroom(s, g, { boardText: '2 + 3 = 5' });
    P().fill(s, g, cr.seats, ['0:0', '0:1', '0:3'], 0, -8);
    var a = cr.seats[0][0], b = cr.seats[0][1], d = cr.seats[0][3];
    K().cast(s, 'misha', a.x, a.y, a.r * 2, 0, { dur: 0.01, gx: -8 }); K().cast(s, 'anya', b.x, b.y, b.r * 2, 0, { dur: 0.01, gx: -8 });
    K().cast(s, 'dima', d.x, d.y, d.r * 2, 0, { dur: 0.01, gx: -8 });
    K().cast(s, 'teacher', cr.teacher.x, P().standY(cr.floor, 150, true), 150, 0, { dur: 0.01, gx: 6 }); s.hands('adult2', 'side', 0, 0.01);
    s.hands('baby', 'desk', 0, 0.01); s.hands('kid2', 'desk', 0, 0.01); s.hands('kid3', 'desk', 0, 0.01);
  } });
  Film.scene({ id: 'pl-yard', bars: 2, build: function (s) {
    hide(s); var g = s.svg(), y = P().yard(s, g, {});
    var c = y.classics.cells;
    K().cast(s, 'anya', c[5].x, c[5].y - 96, 100, 0, { dur: 0.01, gx: 4 }); s.hands('kid2', 'side', 0, 0.01);
    K().cast(s, 'misha', c[0].x - 170, c[0].y - 70, 104, 0, { dur: 0.01, gx: 6 });
    K().cast(s, 'dima', 760, y.ground - 50, 100, 0, { dur: 0.01, gx: 6, mouth: 'soft' }); s.brow('kid3', 'sad', 0, 0.01);
    [[1560, 0], [1700, 3], [1840, 6]].forEach(function (q, i) { K().classmate(g, q[1], q[0], y.ground + 190 - i * 30, 52, { gx: i === 2 ? -6 : 6 }); });
    K().ball(s, g, 1630, y.ground + 150, 22);
  } });
  Film.scene({ id: 'pl-kitchen', bars: 2, build: function (s) {
    hide(s); var g = s.svg(), k = P().kitchen(s, g, {});
    K().cast(s, 'mom', k.stove.x + 260, P().standY(k.floor, 220, false), 220, 0, { dur: 0.01, gx: 8 }); s.hands('adult', 'side', 0, 0.01);
    K().cast(s, 'misha', k.seat.x, k.seat.y - 62, 124, 0, { dur: 0.01, gx: -8 }); s.hands('baby', 'desk', 0, 0.01);
  } });
  Film.scene({ id: 'pl-paths', bars: 2, build: function (s) {
    hide(s); var g = s.svg(), p = P().paths(s, g, {});
    ['misha', 'anya', 'dima'].forEach(function (w) { var q = p.paths[w]; K().cast(s, w, q.start[0] + 160 * q.k, q.start[1] - 46 * q.k, 92 * q.k, 0, { dur: 0.01, gx: 6 }); });
  } });
})();
/* Проба заставок «дорога в школу» по стадиям (v3.6) */
(function () {
  'use strict';
  [[1, 'misha'], [2, 'anya'], [3, 'dima'], [4, null]].forEach(function (c) {
    Film.scene({ id: 'road' + c[0], bars: 2, build: function (s) {
      ['baby', 'kid2', 'kid3', 'adult', 'adult2', 'dad'].forEach(function (id) { s.actor(id, { o: 0 }, 0, 0.01); s.hands(id, 'off', 0, 0.01); });
      Film.places.schoolRoad(s, s.svg(), c[0], c[1], 0.4, 3.8);
    } });
  });
})();
