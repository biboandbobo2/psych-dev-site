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
