/* Лист рисунков 7–10 (v2): проверить рисунки до сцен */
/* global Film */
(function () {
  'use strict';
  Film.scene({ id: 'sheet', bars: 2, build: function (s) {
    var K = Film.school, g = s.svg(), ov = s.over();
    s.rulerOut(0);
    K.schoolHouse(s, g, 380, 520, 0.8);
    K.tree(s, g, 820, 520, 0.9); K.bush(s, g, 980, 510, 0.9); K.bench(s, g, 1150, 520, 0.9); K.ball(s, g, 1300, 495, 24);
    K.knight(s, g, 1460, 520, 1.6, true); K.pawn(s, g, 1540, 520, 1.6, false); K.knight(s, g, 1620, 520, 1.6, false);
    K.kitchen(s, s.node(g, 'g', { transform: 'translate(0 560) scale(0.5)' }), 960, 1000);
    var ph = K.phone(s, 1420, 600, 300, 440); ph.add('Учитель верит в ребёнка — и ребёнок умнеет!', 0); ph.add('Не хвалите за ум — это вредно!', 0);
    s.actor('baby', { x: 300, y: 900, d: 110, o: 1 }, 0, 0.01); s.face('baby', true, 0, 0.01);
    var bp = s.node(g, 'g', {}); Film.toys.backpack(s, bp, 250, 894, 1.15, '#26A69A', '#1C7A71');
    s.actor('adult', { x: 480, y: 870, d: 150, o: 1 }, 0, 0.01); s.face('adult', true, 0, 0.01);
    s.actor('adult2', { x: 680, y: 870, d: 150, o: 1 }, 0, 0.01); s.face('adult2', true, 0, 0.01);
    s.actor('dad', { x: 880, y: 870, d: 160, o: 1 }, 0, 0.01); s.face('dad', true, 0, 0.01);
    s.acc('baby','hero'); s.acc('adult','bun'); s.acc('adult2','glasses'); s.acc('dad','moustache');
    K.tag(s, 'Миша', 300, 970, 0); K.tag(s, 'мама', 480, 960, 0); K.tag(s, 'учитель', 680, 960, 0); K.tag(s, 'папа', 880, 960, 0);
    K.helmet(s, ov, 1120, 860, 80);
    s.actor('kid2', { x: 1120, y: 860, d: 110, o: 1 }, 0, 0.01); s.face('kid2', true, 0, 0.01);
  } });
})();
