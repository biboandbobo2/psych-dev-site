/* Обложка YouTube для «От трёх до семи»: снимок композиции (make_cover.sh) → 1280×720.
   Главное в превью — крупное название и образ эпизода: ребёнок верхом на палочке-лошадке. */
/* global Film */
(function () {
  'use strict';
  Film.scene({
    id: 'cover', bars: 1,
    build: function (s) {
      s.brandIn(0);
      var k = s.text('kicker', 'Психология развития', { left: 120, top: 250, fontSize: 34 });
      s.set(k, 0, { opacity: 1 }, { opacity: 1 });
      var t = s.text('display', 'От трёх<br>до семи', { left: 112, top: 302, fontSize: 196, lineHeight: 1.0 });
      var c = s.div('', { left: 122, top: 738, height: 76, padding: '0 34px', borderRadius: '38px', background: '#FB8C00', color: '#1D2733', display: 'flex', alignItems: 'center', fontFamily: 'DOMSans', fontWeight: 750, fontSize: 44 }, null, 'Дошкольный возраст · 3–7 лет'); // тёмный текст: белый на оранжевом — контраст 2,2 : 1

      // ребёнок верхом на палочке-лошадке (как в прологе, крупно)
      var CX = 1250, CY = 560, F = 2.33;
      s.actor('baby', { x: CX, y: CY, d: 280, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.gaze('baby', 7, -2, 0, 0.01);
      var g = s.svg(), ov = s.over();
      s.path(g, 'M' + (CX - 200 * F) + ' ' + (CY + 140 * F) + ' C' + (CX - 100 * F) + ' ' + (CY + 80 * F) + ' ' + (CX + 20 * F) + ' ' + CY + ' ' + (CX + 145 * F) + ' ' + (CY - 82 * F), { stroke: '#8B6A45', 'stroke-width': 24 });
      Film.icons.horse(s, ov, CX + 145 * F, CY - 82 * F, 2.4, { seed: 5 });
      s.sk(ov, [[CX - 210, CY - 40], [CX - 380, CY - 40]], { seed: 41, width: 6, opacity: 0.5 });
      s.sk(ov, [[CX - 190, CY + 50], [CX - 330, CY + 50]], { seed: 43, width: 6, opacity: 0.5 });
      s.sk(ov, [[CX - 220, CY + 130], [CX - 310, CY + 130]], { seed: 45, width: 6, opacity: 0.4 });
    }
  });
})();
