/* Рисованный слой эпизода 3–7: «смысловое поле» Выготского поверх геометрии.
   Линия — графит или акцент, слегка неровная, двойной проход «карандашом».
   Детерминированно: дрожание — из фиксированного генератора, фактура — feTurbulence с постоянным seed. */
/* global Film */
(function () {
  'use strict';
  var GRAPHITE = '#3F464D';

  function lcg(seed) {
    var x = seed >>> 0;
    return function () { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
  }

  // Сглаженный путь через точки (Catmull-Rom → кубические Безье) с лёгким дрожанием
  function rough(pts, seed, amp) {
    var r = lcg(seed || 7), a = amp == null ? 2.2 : amp;
    var p = pts.map(function (q) { return [q[0] + (r() - 0.5) * 2 * a, q[1] + (r() - 0.5) * 2 * a]; });
    if (p.length < 3) return 'M' + p[0][0] + ' ' + p[0][1] + ' L' + p[1][0] + ' ' + p[1][1];
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function defs(svgEl) {
    if (svgEl.__pencil) return svgEl.__pencil;
    var d = svgEl.querySelector('defs') || Film.svg('defs', {}, svgEl);
    var f = Film.svg('filter', { id: 'pencil' + (Film.__pn = (Film.__pn || 0) + 1), x: '-5%', y: '-5%', width: '110%', height: '110%' }, d);
    Film.svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', result: 'n' }, f);
    Film.svg('feDisplacementMap', { 'in': 'SourceGraphic', in2: 'n', scale: '2.4', xChannelSelector: 'R', yChannelSelector: 'G' }, f);
    svgEl.__pencil = 'url(#' + f.id + ')';
    return svgEl.__pencil;
  }

  // Штрих «карандашом»: два прохода — основной и второй, чуть смещённый и бледнее
  function stroke(s, parent, pts, o) {
    o = o || {};
    var svgEl = parent.ownerSVGElement || parent;
    var flt = defs(svgEl);
    var col = o.color || GRAPHITE, w = o.width || 4.2, seed = o.seed || 11;
    var g = s.node(parent, 'g', { filter: flt });
    // заливка — под штрихом; если линия рисуется на глазах, заливка проявляется к концу прорисовки
    if (o.fill) {
      var fo = o.fillOpacity == null ? 1 : o.fillOpacity;
      var fp = s.node(g, 'path', { d: rough(pts, seed, o.amp) + ' Z', fill: o.fill, stroke: 'none', opacity: o.at != null ? 0 : fo });
      if (o.at != null) s.tween(fp, o.at + (o.dur || 0.9) * 0.6, { opacity: 0 }, { opacity: fo, duration: 0.45 });
    }
    var a = s.path(g, rough(pts, seed, o.amp), { stroke: col, 'stroke-width': w, opacity: o.opacity == null ? 0.92 : o.opacity });
    var b = s.path(g, rough(pts.map(function (q) { return [q[0] + 1.6, q[1] - 1.2]; }), seed + 101, o.amp), { stroke: col, 'stroke-width': w * 0.55, opacity: 0.45 });
    if (o.at != null) { s.draw(a, o.at, { dur: o.dur || 0.9, ease: o.ease || 'power1.inOut' }); s.draw(b, o.at + 0.08, { dur: o.dur || 0.9, ease: o.ease || 'power1.inOut' }); }
    return g;
  }

  Film.sketch = { rough: rough, stroke: stroke, GRAPHITE: GRAPHITE };
})();
