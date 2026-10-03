/* Обложка YouTube для «От года до трёх»: снимок композиции (make_cover.sh) → 1280×720.
   Образ эпизода — «Я сам!»: ребёнок сам забрался на кубик. */
/* global Film */
(function () {
  'use strict';
  Film.scene({
    id: 'cover', bars: 1,
    build: function (s) {
      s.text('kicker', 'Психология развития', { left: 120, top: 250, fontSize: 34, color: '#4A58A6' });
      s.text('display', 'От года<br>до трёх', { left: 112, top: 302, fontSize: 196, lineHeight: 1.0 });
      s.div('', { left: 122, top: 738, height: 76, padding: '0 34px', borderRadius: '38px', background: '#4A58A6', color: '#FFFFFF', display: 'flex', alignItems: 'center', fontFamily: 'DOMSans', fontWeight: 750, fontSize: 44 }, null, 'Раннее детство · 1–3 года');
      var g = s.svg();
      s.path(g, 'M1080 912 H1860', { stroke: '#CDC3B4', 'stroke-width': 4 });
      s.actor('obj', { x: 1290, y: 782, d: 260, o: 1 }, 0, 0.01);
      var L = document.createElement('div'); // буква на кубике — чтобы он читался игрушкой, а не туловищем
      L.textContent = 'А';
      Film.css(L, { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DOMSerif', fontWeight: 700, fontSize: 64, color: '#FFFDF8' });
      s.A.obj.body.appendChild(L);
      s.actor('baby', { x: 1290, y: 560, d: 180, o: 1 }, 0, 0.01);
      s.face('baby', true, 0, 0.01); s.mouth('baby', 'smile', 0, 0.01); s.gaze('baby', 6, -3, 0, 0.01);
      s.actor('adult', { x: 1690, y: 790, d: 240, o: 1 }, 0, 0.01);
      s.face('adult', true, 0, 0.01); s.mouth('adult', 'smile', 0, 0.01); s.gaze('adult', -9, -6, 0, 0.01);
      s.div('bubble tail-l', { left: 1330, top: 300, fontSize: 64, padding: '18px 40px 22px' }, null, 'Я сам!');
    }
  });
})();
