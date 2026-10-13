/* Обложка YouTube для «От семи до десяти»: снимок композиции (make_cover.sh) → 1280×720.
   Крупное название и образ эпизода: Миша с ранцем переходит красную линию поля — в школу, в тетрадную клетку. */
/* global Film */
(function () {
  'use strict';
  Film.scene({
    id: 'cover', bars: 1,
    build: function (s) {
      var K = Film.school;
      s.rulerOut(0);
      var cells = s.div('cells', { left: 1180, top: 0, width: 740, height: 1080 });
      var g = s.svg(), ov = s.over();
      K.schoolHouse(s, g, 1560, 860, 0.85);
      s.path(g, 'M1180 120 V1000', { stroke: K.RED, 'stroke-width': 5 });
      s.path(g, 'M900 862 H1920', { stroke: '#CDC3B4', 'stroke-width': 4 });
      s.brandIn(0);
      var k = s.text('kicker', 'Психология развития', { left: 120, top: 250, fontSize: 34 });
      s.set(k, 0, { opacity: 1 }, { opacity: 1 });
      s.text('display', 'От семи<br>до десяти', { left: 112, top: 302, fontSize: 180, lineHeight: 1.0 });
      s.div('', { left: 122, top: 720, height: 76, padding: '0 34px', borderRadius: '38px', background: '#26A69A', color: '#1D2733', display: 'flex', alignItems: 'center', fontFamily: 'DOMSans', fontWeight: 750, fontSize: 42 }, null, 'Младший школьный возраст · 7–10 лет'); // тёмный текст на бирюзовом — контраст ≥ 4,5 : 1
      // Миша с ранцем шагает через линию
      var CX = 1200, CY = 700;
      var bp = s.node(g, 'g', {}); Film.toys.backpack(s, bp, CX - 130, CY - 10, 2.6, '#26A69A', '#1C7A71');
      s.actor('baby', { x: CX, y: CY, d: 250, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.gaze('baby', 8, -3, 0, 0.01); s.acc('baby', 'hero');
      var w = s.text('kidhand', '1 класс', { left: 1300, top: 260, fontSize: 72, color: '#13534D' });
    }
  });
})();
