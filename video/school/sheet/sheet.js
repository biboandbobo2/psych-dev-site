/* Лист героев 7–10 (v3): приметы прилегают к голове; лица у всех; проверка в трёх масштабах */
/* global Film */
(function () {
  'use strict';
  Film.scene({ id: 'sheet', bars: 2, build: function (s) {
    var K = Film.school, g = s.svg();
    s.rulerOut(0);
    // Крупно: главные герои и взрослые (актёры — так они живут в сценах)
    var CAST = [['baby', 'hero', 'Миша'], ['kid2', 'anya', 'Аня'], ['kid3', 'dima', 'Дима'],
      ['adult', 'bun', 'мама'], ['adult2', 'teacher', 'учитель'], ['dad', 'dad', 'папа']];
    CAST.forEach(function (c, i) {
      var x = 190 + i * 300, d = i < 3 ? 150 : 190;
      s.actor(c[0], { x: x, y: 330, d: d, o: 1 }, 0, 0.01); s.face(c[0], true, 0, 0.01);
      s.acc(c[0], c[1]);
      if (c[0] === 'kid3' || c[0] === 'adult2') s.acc(c[0], 'glasses');
      K.tag(s, c[2], x, 330 + d / 2 + 40, 0);
    });
    // Взгляд в сторону: очки едут вместе с глазами
    s.gaze('kid3', 6, 2, 1, 0.5); s.gaze('adult2', -6, 0, 1, 0.5);
    // Статисты: класс (r 40) и дальний ряд (r 18) — у всех лица
    var KINDS = ['curly', 'ponytail', 'buzz', 'cap', 'anya', 'dima', 'bun', 'hero', null, 'curly'];
    var COL = ['#E4735A', '#EC8A6F', '#D9654B', '#F09A7E', '#C95A44'];
    KINDS.forEach(function (k, i) {
      Film.head(g, 160 + i * 170, 720, 40, COL[i % 5], k, { glasses: i === 2 || i === 9 });
      Film.head(g, 160 + i * 170, 880, 18, COL[(i + 2) % 5], k, { glasses: i === 2 || i === 9 });
    });
  } });
})();
