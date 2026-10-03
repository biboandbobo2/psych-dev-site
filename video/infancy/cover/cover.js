/* Обложка YouTube для «Первый год жизни»: снимок композиции (make_cover.sh) → 1280×720.
   Образ эпизода — младенец и взрослый смотрят друг на друга: с первых дней ребёнок настроен на людей. */
/* global Film */
(function () {
  'use strict';
  Film.scene({
    id: 'cover', bars: 1,
    build: function (s) {
      s.text('kicker', 'Психология развития', { left: 120, top: 250, fontSize: 34 });
      s.text('display', 'Первый<br>год жизни', { left: 112, top: 302, fontSize: 196, lineHeight: 1.0 });
      s.div('', { left: 122, top: 738, height: 76, padding: '0 34px', borderRadius: '38px', background: '#2E7D32', color: '#FFFFFF', display: 'flex', alignItems: 'center', fontFamily: 'DOMSans', fontWeight: 750, fontSize: 44 }, null, 'Младенчество · 0–1 год');
      s.actor('adult', { x: 1650, y: 500, d: 340, o: 1 }, 0, 0.01);
      s.actor('baby', { x: 1300, y: 660, d: 210, o: 1 }, 0, 0.01);
      s.face('adult', true, 0, 0.01); s.mouth('adult', 'smile', 0, 0.01); s.gaze('adult', -9, 5, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.gaze('baby', 9, -6, 0, 0.01);
      var g = s.svg();
      s.path(g, 'M1412 618 Q1448 576 1484 556', { stroke: '#8A8F90', 'stroke-width': 6, 'stroke-dasharray': '3 18' });
    }
  });
})();
