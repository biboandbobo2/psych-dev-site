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
      Film.places.school(s, g, 1560, 860, 0.85); // та же школа, что в ролике
      s.path(g, 'M1180 120 V1000', { stroke: K.RED, 'stroke-width': 5 });
      s.path(g, 'M900 862 H1920', { stroke: '#CDC3B4', 'stroke-width': 4 });
      s.brandIn(0);
      var k = s.text('kicker', 'Психология развития', { left: 120, top: 250, fontSize: 34 });
      s.set(k, 0, { opacity: 1 }, { opacity: 1 });
      s.text('display', 'От семи<br>до десяти', { left: 112, top: 302, fontSize: 180, lineHeight: 1.0 });
      s.div('', { left: 122, top: 720, height: 76, padding: '0 34px', borderRadius: '38px', background: '#26A69A', color: '#1D2733', display: 'flex', alignItems: 'center', fontFamily: 'DOMSans', fontWeight: 750, fontSize: 42 }, null, 'Младший школьный возраст · 7–10 лет'); // тёмный текст на бирюзовом — контраст ≥ 4,5 : 1
      // Миша с ранцем шагает через линию
      var CX = 1200, CY = 734; // низ круга — на линии земли (862)
      K.cast(s, 'misha', CX, CY, 250, 0, { gx: 8, gy: -3, dur: 0.01 }); // рисовка ролика: ранец и воротничок — из cast
      s.brow('baby', 'calm', 0, 0.01); s.hands('baby', 'side', 0, 0.01);
      var w = s.text('kidhand', '1 класс', { left: 1300, top: 260, fontSize: 72, color: '#13534D' });
    }
  });
})();
