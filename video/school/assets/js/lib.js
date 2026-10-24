/* Движок серии «Психология развития» (DOM Academy) поверх HyperFrames + GSAP.
   Эпизод 3–7: акцент для текста (accentText), сверстники kid2/kid3, второй взрослый adult2,
   рисованный слой #sketch над персонажами (s.over / s.otext / s.sk — см. sketch.js).
   Эпизод 7–10: «камера» (s.cam) — сдвиг и масштаб сцены вместе с героями, стоп-кадр (s.freeze). Шкала возраста и подписи (#ruler, #ui) камерой не двигаются.
   Эпизод настраивается через window.FILM_CONFIG: шкала возраста, цвет эпизода, карта курса.
   Всё детерминировано: без Math.random/Date/rAF; всё движение — в одном paused-таймлайне,
   который HyperFrames перематывает покадрово. Время сцен кратно такту музыки (такт = 2,5 с). */
/* global gsap */
(function () {
  'use strict';

  var W = 1920, H = 1080, BAR = 2.5;
  var X0 = 140, X1 = 1780, RY = 952; // шкала возраста внизу кадра
  var CFG = window.FILM_CONFIG || {};
  var RUL = CFG.ruler || { from: 0, to: 12, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], majors: [0, 3, 6, 9, 12], labels: { 0: '0', 3: '3', 6: '6', 9: '9', 12: '12' }, unit: 'мес' };
  var ACC = CFG.accent || '#2E7D32';
  var ACC_T = CFG.accentText || ACC; // акцент для текста (контраст к бумаге ≥ 4,5 : 1)
  function mx(m) { return X0 + ((m - RUL.from) / (RUL.to - RUL.from)) * (X1 - X0); }
  var NS = 'http://www.w3.org/2000/svg';

  // ---------- Русская типографика: неразрывные пробелы ----------
  var SHORT = '(?:[А-Яа-яЁёA-Za-z]{1,2}|без|для|про|под|над|при|что|как|или|его|её|их|ещё|уже|все|всё|это)';
  var reShort = new RegExp('(^|[\\s\\u00A0(«„"])(' + SHORT + ') ', 'gi');
  function T(s) {
    if (s == null) return '';
    var r = String(s);
    r = r.replace(/ (—|–)(?=\s)/g, ' $1');                                  // тире — к предыдущему слову
    r = r.replace(/([А-ЯЁA-Z]\.) (?=[А-ЯЁA-Z])/g, '$1 ');                    // инициалы
    r = r.replace(/(\d) (?=(?:мес|лет|год|года|месяц|месяца|месяцев)(?![а-яё]))/g, '$1 '); // число + единица
    for (var i = 0; i < 3; i++) r = r.replace(reShort, '$1$2 ');             // короткие слова — к следующему
    return r;
  }
  function TH(html) {
    return String(html).split(/(<[^>]+>)/g).map(function (p) { return p.charAt(0) === '<' ? p : T(p); }).join('');
  }
  function HL(text) { return '<span class="hl"><span class="hl-bg"></span><span class="hl-tx">' + text + '</span></span>'; }

  // ---------- DOM ----------
  function el(tag, cls, parent, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = TH(html);
    if (parent) parent.appendChild(e);
    return e;
  }
  var UNITLESS = /^(opacity|zIndex|fontWeight|lineHeight|flex|order)$/;
  function css(e, st) {
    for (var k in st) { var v = st[k]; e.style[k] = (typeof v === 'number' && !UNITLESS.test(k)) ? v + 'px' : v; }
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- Разбивка текста на строки (для маскированного появления) ----------
  function tokenize(node, out, wrapCls) {
    Array.prototype.slice.call(node.childNodes).forEach(function (k) {
      if (k.nodeType === 3) {
        k.nodeValue.split(/( +)/).forEach(function (p) {
          if (!p) return;
          if (/^ +$/.test(p)) { out.push({ space: true }); return; }
          var s = document.createElement('span');
          s.className = 'w' + (wrapCls ? ' ' + wrapCls : '');
          s.textContent = p;
          out.push({ node: s });
        });
      } else if (k.nodeType === 1) {
        if (k.tagName === 'BR') { out.push({ node: k, br: true }); return; }
        if (k.classList.contains('hl') || k.hasAttribute('data-atom')) { out.push({ node: k }); return; }
        tokenize(k, out, (wrapCls ? wrapCls + ' ' : '') + k.className);
      }
    });
  }
  function splitLines(e) {
    var toks = [];
    tokenize(e, toks, '');
    e.innerHTML = '';
    toks.forEach(function (t) { e.appendChild(t.space ? document.createTextNode(' ') : t.node); });
    var lines = [], cur = null, lastTop = null;
    toks.forEach(function (t) {
      if (t.space) { if (cur) cur.push(t); return; }
      if (t.br) { cur = null; return; }
      var top = t.node.offsetTop;
      if (cur === null || Math.abs(top - lastTop) > 6) { cur = []; lines.push(cur); lastTop = top; }
      cur.push(t);
    });
    e.innerHTML = '';
    var out = [];
    lines.forEach(function (ln) {
      while (ln.length && ln[ln.length - 1].space) ln.pop();
      var L = document.createElement('span'); L.className = 'ln';
      var I = document.createElement('span'); I.className = 'li';
      ln.forEach(function (t) { I.appendChild(t.space ? document.createTextNode(' ') : t.node); });
      L.appendChild(I); e.appendChild(L); out.push(I);
    });
    return out;
  }

  // ---------- Состояние ----------
  var Film = {
    W: W, H: H, BAR: BAR, X0: X0, X1: X1, RY: RY, mx: mx,
    T: T, TH: TH, HL: HL, el: el, css: css, svg: svg, splitLines: splitLines,
    scenes: [], tl: null, ACC: ACC, ACC_T: ACC_T, CFG: CFG
  };
  var tl, root, layers = {}, A = {}, R = {};

  Film.scene = function (def) { Film.scenes.push(def); };

  // ---------- Примитивы анимации (абсолютное время) ----------
  function linesIn(e, t, o) {
    o = o || {};
    var lis = e.__lines || (e.__lines = splitLines(e));
    tl.fromTo(lis, { yPercent: 112 }, { yPercent: 0, duration: o.dur || 1.0, ease: o.ease || 'expo.out', stagger: o.stagger == null ? 0.09 : o.stagger }, t);
    return lis;
  }
  function fadeIn(e, t, o) {
    o = o || {};
    tl.fromTo(e, { opacity: 0, y: o.y == null ? 16 : o.y, x: o.x || 0 },
      { opacity: o.to == null ? 1 : o.to, y: 0, x: 0, duration: o.dur || 0.8, ease: o.ease || 'power3.out', stagger: o.stagger || 0 }, t);
  }
  function fadeOut(e, t, o) {
    o = o || {};
    tl.fromTo(e, { opacity: o.from == null ? 1 : o.from }, { opacity: 0, duration: o.dur || 0.5, ease: o.ease || 'power2.inOut', stagger: o.stagger || 0, immediateRender: false }, t);
  }
  function popIn(e, t, o) {
    o = o || {};
    tl.fromTo(e, { opacity: 0, scale: o.from || 0.55 },
      { opacity: 1, scale: 1, duration: o.dur || 0.8, ease: o.ease || 'power3.out', stagger: o.stagger || 0, transformOrigin: o.origin || '50% 50%' }, t);
  }
  function growX(e, t, o) {
    o = o || {};
    tl.fromTo(e, { scaleX: 0 }, { scaleX: 1, duration: o.dur || 1.0, ease: o.ease || 'power3.inOut', transformOrigin: o.origin || '0% 50%', stagger: o.stagger || 0 }, t);
  }
  function growY(e, t, o) {
    o = o || {};
    tl.fromTo(e, { scaleY: 0 }, { scaleY: 1, duration: o.dur || 0.8, ease: o.ease || 'power3.out', transformOrigin: o.origin || '50% 100%', stagger: o.stagger || 0 }, t);
  }
  function draw(p, t, o) {
    o = o || {};
    var len = p.getTotalLength();
    var sw = parseFloat(p.getAttribute('stroke-width')) || 2;
    var hide = len + sw + 2; // скругл. «шапка» линии не должна торчать точкой до начала прорисовки
    p.style.strokeDasharray = len + ' ' + (len + 2 * sw + 10);
    tl.fromTo(p, { strokeDashoffset: o.reverse ? -hide : hide }, { strokeDashoffset: 0, duration: o.dur || 1.0, ease: o.ease || 'power2.inOut' }, t);
  }
  var maskN = 0;
  function drawDashed(p, t, o) {
    var s = p.ownerSVGElement;
    var defs = s.querySelector('defs') || svg('defs', {}, s);
    var id = 'mk' + (++maskN);
    var m = svg('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 6000, height: 6000 }, defs);
    var sw = (parseFloat(p.getAttribute('stroke-width')) || 2) + 10;
    var mp = svg('path', { d: p.getAttribute('d'), fill: 'none', stroke: '#fff', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, m);
    p.setAttribute('mask', 'url(#' + id + ')');
    draw(mp, t, o);
  }
  function hl(e, t, o) {
    var bgs = e.classList && e.classList.contains('hl') ? [e.querySelector('.hl-bg')] : e.querySelectorAll('.hl-bg');
    tl.fromTo(bgs, { scaleX: 0 }, { scaleX: 1, duration: (o && o.dur) || 0.7, ease: 'power2.inOut', stagger: 0.15 }, t);
  }

  // ---------- Персонажи ----------
  function makeActor(id) {
    var e = el('div', 'actor', layers.actors);
    e.id = 'a-' + id;
    var b = el('div', 'body', e);
    A[id] = { el: e, body: b, st: { x: W / 2, y: H / 2, d: 100, o: 0 }, sq: { sx: 1, sy: 1 } };
    gsap.set(e, { x: W / 2, y: H / 2, scale: 1, opacity: 0 });
    return A[id];
  }
  function aTo(id, props, t, dur, ease) {
    var a = A[id], f = a.st, n = {}, k;
    for (k in f) n[k] = f[k];
    for (k in props) n[k] = props[k];
    tl.fromTo(a.el, { x: f.x, y: f.y, scale: f.d / 100, opacity: f.o },
      { x: n.x, y: n.y, scale: n.d / 100, opacity: n.o, duration: dur == null ? 1.2 : dur, ease: ease || 'power3.inOut', immediateRender: false }, t);
    a.st = n;
  }
  function aColor(id, color, t, dur) {
    var a = A[id], from = a.color || getComputedStyle(a.body).backgroundColor;
    tl.fromTo(a.body, { backgroundColor: from }, { backgroundColor: color, duration: dur || 0.8, ease: 'power2.inOut', immediateRender: false }, t);
    a.color = color;
  }
  var BROW = { calm: ['M31 33 Q38 30 45 32', 'M55 32 Q62 30 69 33'], focus: ['M31 32 Q38 31 45 34', 'M55 34 Q62 31 69 32'],
    doubt: ['M31 34 Q38 31 45 33', 'M55 29 Q62 26 69 30'], proud: ['M31 30 Q38 25 45 28', 'M55 28 Q62 25 69 30'], sad: ['M31 35 Q38 31 45 29', 'M55 29 Q62 31 69 35'] };
  var MOUTH = { smile: 'M36 59 Q50 71 64 59', soft: 'M37 61 Q50 67 63 61', flat: 'M37 63 Q50 63 63 63', sad: 'M38 67 Q50 58 62 67', o: 'M44 64 Q50 56 56 64 Q50 72 44 64' }; // o — удивление
  function addFace(id, shape) {
    var a = A[id];
    if (a.face) return a.face;
    var s = svg('svg', { 'class': 'face', viewBox: '0 0 100 100' }, a.body);
    var g = svg('g', {}, s);
    svg('circle', { cx: 38, cy: 45, r: 4.6, fill: '#FFFDF8' }, g);
    svg('circle', { cx: 62, cy: 45, r: 4.6, fill: '#FFFDF8' }, g);
    var m = svg('path', { d: MOUTH[shape || 'smile'], fill: 'none', stroke: '#FFFDF8', 'stroke-width': 4.2, 'stroke-linecap': 'round' }, g);
    // брови (с эпизода 7–10): оттенки чувств; по умолчанию — спокойные
    var bw = svg('g', {}, g), bl = svg('path', { d: BROW.calm[0], fill: 'none', stroke: '#FFFDF8', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, bw), br = svg('path', { d: BROW.calm[1], fill: 'none', stroke: '#FFFDF8', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, bw);
    a.face = { svg: s, g: g, mouth: m, cur: shape || 'smile', gx: 0, gy: 0, brows: bw, bl: bl, br: br, bcur: 'calm' };
    return a.face;
  }
  function faceShow(id, on, t, dur) {
    var f = addFace(id);
    tl.fromTo(f.svg, { opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0, duration: dur || 0.6, ease: 'power2.inOut', immediateRender: false }, t);
  }
  function mouth(id, shape, t, dur) {
    var f = addFace(id);
    tl.fromTo(f.mouth, { attr: { d: MOUTH[f.cur] } }, { attr: { d: MOUTH[shape] }, duration: dur || 0.6, ease: 'power2.inOut', immediateRender: false }, t);
    f.cur = shape;
  }
  function brow(id, kind, t, dur) {
    var f = addFace(id), d = dur || 0.4;
    tl.fromTo(f.bl, { attr: { d: BROW[f.bcur][0] } }, { attr: { d: BROW[kind][0] }, duration: d, ease: 'power2.inOut', immediateRender: false }, t);
    tl.fromTo(f.br, { attr: { d: BROW[f.bcur][1] } }, { attr: { d: BROW[kind][1] }, duration: d, ease: 'power2.inOut', immediateRender: false }, t);
    f.bcur = kind;
  }
  function gaze(id, gx, gy, t, dur) {
    var f = addFace(id);
    tl.fromTo(f.g, { x: f.gx, y: f.gy }, { x: gx, y: gy, duration: dur || 0.6, ease: 'power2.inOut', immediateRender: false }, t);
    f.gx = gx; f.gy = gy;
  }

  // Приметы героев (7–10, v3.2 — «Язык 7–10»): круг — весь человек, волос нет; у героя одна своя вещь.
  // backpack — ранец Миши (за спиной, сбоку); bow — бант Ани; glasses — очки Димы: тонкие линзы вокруг глаз, бровей нет (их заменяет оправа)
  function addAcc(id, kind) {
    var a = A[id], f;
    if (kind === 'glasses') {
      // очки v4 (вариант Б): белая линия, как брови и рот; скруглённые линзы, глаза внутри мельче, рот ниже — лицо не «в кучу»
      f = addFace(id); f.brows.style.display = 'none';
      f.g.querySelectorAll('circle').forEach(function (c) { c.setAttribute('r', 3.8); });
      [37, 63].forEach(function (cx) { svg('rect', { x: cx - 10, y: 37, width: 20, height: 16, rx: 6, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 2.6 }, f.g); });
      svg('path', { d: 'M47 44 H53', stroke: '#FFFDF8', 'stroke-width': 2.6 }, f.g);
      f.mouth.setAttribute('transform', 'translate(0 5) scale(1)');
      return f.g;
    }
    var S = svg('svg', { 'class': 'acc-' + kind, viewBox: '0 0 100 100', overflow: 'visible' }, a.body);
    S.style.position = 'absolute'; S.style.inset = '0'; S.style.overflow = 'visible';
    var BAGC = { backpack: ['#26A69A', '#1C7A71'], bagBlue: ['#7E9CD6', '#4E6FA8'], bagGreen: ['#8CBF6E', '#5E9443'] }; // ранцы: Миша, Аня, Дима (как у парт)
    if (BAGC[kind]) { a.body.insertBefore(S, a.body.firstChild); S.style.zIndex = '-1'; S.style.transformOrigin = '50% 50%';
      svg('rect', { x: -24, y: 34, width: 38, height: 52, rx: 11, fill: BAGC[kind][0], stroke: BAGC[kind][1], 'stroke-width': 3 }, S);
      svg('rect', { x: -16, y: 58, width: 15, height: 10, rx: 3, fill: '#F5D27A', stroke: BAGC[kind][1], 'stroke-width': 2 }, S);
    } else if (kind === 'collar') { // Миша: белый школьный воротничок — узнаётся и без ранца
      svg('path', { d: 'M30 90 L50 100 L38 108 Z M70 90 L50 100 L62 108 Z', fill: '#FFFDF8', stroke: '#1D2733', 'stroke-width': 2 }, S);
    } else if (kind === 'bow') {
      svg('path', { d: 'M70 4 l-15 -10 l0 20 Z M70 4 l15 -10 l0 20 Z', fill: '#26A69A' }, S);
      svg('circle', { cx: 70, cy: 4, r: 5, fill: '#1C7A71' }, S);
    }
    return S;
  }
  // Руки-точки (7–10): появляются, когда герой действует. pose: 'off' | 'side' | 'up' (рука-линия вверх) | 'desk' (на парте) | 'hold' (держит перед собой)
  var HANDS = { off: [[50, 80], [50, 80], 0], side: [[-6, 66], [106, 66], 1], up: [[-6, 66], [110, -8], 1], desk: [[-12, 60], [4, 74], 1], hold: [[-10, 70], [110, 70], 1] };
  function handsOf(id) {
    var a = A[id];
    if (a.hands) return a.hands;
    var S = svg('svg', { 'class': 'hands', viewBox: '0 0 100 100', overflow: 'visible' }, a.body);
    S.style.position = 'absolute'; S.style.inset = '0'; S.style.overflow = 'visible';
    var n = 0, col = getComputedStyle(a.body).backgroundColor.replace(/\d+(\.\d+)?/g, function (v) { return n++ < 3 ? Math.round(v * 0.86) : v; }); // руки на тон темнее тела — видны и поверх круга
    var arm = svg('path', { d: 'M90 58 Q118 34 112 -4', fill: 'none', stroke: col, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0 }, S);
    var l = svg('circle', { cx: 50, cy: 80, r: 12, fill: col, opacity: 0 }, S), r = svg('circle', { cx: 50, cy: 80, r: 12, fill: col, opacity: 0 }, S);
    a.hands = { svg: S, arm: arm, l: l, r: r, cur: 'off' };
    return a.hands;
  }
  function hands(id, pose, t, dur) {
    var h = handsOf(id), d = dur || 0.35, dy = id === 'adult2' ? 50 : 0; // капсула учителя: руки на поясе
    var sh = function (q) { return [[q[0][0], q[0][1] + (q[0][1] > 0 ? dy : 0)], [q[1][0], q[1][1] + (q[1][1] > 0 ? dy : 0)], q[2]]; }, p0 = sh(HANDS[h.cur]), p = sh(HANDS[pose]);
    tl.fromTo(h.l, { attr: { cx: p0[0][0], cy: p0[0][1] }, opacity: p0[2] }, { attr: { cx: p[0][0], cy: p[0][1] }, opacity: p[2], duration: d, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(h.r, { attr: { cx: p0[1][0], cy: p0[1][1] }, opacity: p0[2] }, { attr: { cx: p[1][0], cy: p[1][1] }, opacity: p[2], duration: d, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(h.arm, { opacity: h.cur === 'up' ? 1 : 0 }, { opacity: pose === 'up' ? 1 : 0, duration: d * 0.6, immediateRender: false }, t + (pose === 'up' ? d * 0.4 : 0));
    h.cur = pose;
  }
  // Ребёнок-статист (одноклассники): круг + лицо серии + спокойные брови; o.bow / o.glasses — редкие приметы
  Film.head = function (parent, x, y, r, color, kind, o) {
    o = o || {};
    var g = svg('g', { transform: 'translate(' + (x - r) + ' ' + (y - r) + ') scale(' + (r / 50) + ')' }, parent);
    svg('circle', { cx: 50, cy: 50, r: 50, fill: color }, g);
    var face = svg('g', { transform: 'translate(' + (o.gx || 0) + ' ' + (o.gy || 0) + ')' }, g); // o.gx — взгляд (лицо сдвигается целиком)
    svg('circle', { cx: 38, cy: 45, r: 4.6, fill: '#FFFDF8' }, face);
    svg('circle', { cx: 62, cy: 45, r: 4.6, fill: '#FFFDF8' }, face);
    svg('path', { d: MOUTH[o.mouth || 'smile'], fill: 'none', stroke: '#FFFDF8', 'stroke-width': 4.2, 'stroke-linecap': 'round' }, face);
    if (o.glasses || kind === 'glasses') { // очки v4 — как у актёра
      face.querySelectorAll('circle').forEach(function (c) { c.setAttribute('r', 3.8); });
      [37, 63].forEach(function (cx) { svg('rect', { x: cx - 10, y: 37, width: 20, height: 16, rx: 6, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 2.6 }, face); });
      svg('path', { d: 'M47 44 H53', stroke: '#FFFDF8', 'stroke-width': 2.6 }, face);
    } else BROW[o.brow || 'calm'].forEach(function (d) { svg('path', { d: d, fill: 'none', stroke: '#FFFDF8', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, face); });
    if (o.bow || kind === 'bow') { svg('path', { d: 'M70 4 l-15 -10 l0 20 Z M70 4 l15 -10 l0 20 Z', fill: '#26A69A' }, g); svg('circle', { cx: 70, cy: 4, r: 5, fill: '#1C7A71' }, g); }
    return g;
  };

  // Сжатие/растяжение «тела» (опора — низ круга)
  function squash(id, sx, sy, t, dur, ease) {
    var a = A[id], f = a.sq;
    tl.fromTo(a.body, { scaleX: f.sx, scaleY: f.sy }, { scaleX: sx, scaleY: sy, duration: dur || 0.12, ease: ease || 'power2.out', immediateRender: false }, t);
    a.sq = { sx: sx, sy: sy };
  }
  // Прыжок-шаг: присесть → дуга → приземлиться с «пружиной». Длительность ≈ dur + 0.3
  function hop(id, x, y, t, dur, h) {
    var a = A[id], f = a.st;
    dur = dur || 0.46; h = h == null ? 70 : h;
    var peakY = Math.min(f.y, y) - h;
    squash(id, 1.12, 0.86, t, 0.09);
    squash(id, 0.92, 1.1, t + 0.09, 0.1);
    tl.fromTo(a.el, { x: f.x }, { x: x, duration: dur, ease: 'sine.inOut', immediateRender: false }, t + 0.09);
    tl.fromTo(a.el, { y: f.y }, { y: peakY, duration: dur / 2, ease: 'power2.out', immediateRender: false }, t + 0.09);
    tl.fromTo(a.el, { y: peakY }, { y: y, duration: dur / 2, ease: 'power2.in', immediateRender: false }, t + 0.09 + dur / 2);
    squash(id, 1.16, 0.84, t + 0.09 + dur, 0.08);
    squash(id, 1, 1, t + 0.17 + dur, 0.34, 'back.out(3)');
    a.st = { x: x, y: y, d: f.d, o: f.o };
    return t + 0.09 + dur; // момент приземления
  }

  // ---------- Шкала возраста ----------
  function buildRuler() {
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H }, layers.ruler);
    s.style.position = 'absolute'; s.style.left = '0'; s.style.top = '0';
    R.svg = s;
    R.line = svg('path', { d: 'M' + X0 + ' ' + RY + ' H' + X1, stroke: '#CDC3B4', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, s);
    R.ticks = []; R.labels = [];
    RUL.ticks.forEach(function (m) {
      var major = RUL.majors.indexOf(m) >= 0;
      R.ticks.push(svg('line', { x1: mx(m), x2: mx(m), y1: RY - (major ? 9 : 5), y2: RY + (major ? 9 : 5), stroke: major ? '#B3A898' : '#D3C9BB', 'stroke-width': 2, 'stroke-linecap': 'round' }, s));
    });
    RUL.majors.forEach(function (m) {
      var tx = svg('text', { x: mx(m), y: RY + 42, 'text-anchor': 'middle' }, s);
      tx.textContent = RUL.labels[m] != null ? RUL.labels[m] : String(m);
      R.labels.push(tx);
    });
    if (RUL.unit) {
      var unit = svg('text', { x: mx(RUL.to) + 26, y: RY + 42, 'text-anchor': 'start' }, s);
      unit.textContent = RUL.unit;
      R.labels.push(unit);
    }
    R.range = svg('rect', { x: X0, y: RY - 3, width: 0.01, height: 6, rx: 3, fill: ACC, opacity: 0 }, s);
    R.ghost = svg('circle', { cx: X0, cy: RY, r: 8, fill: '#FAF7F0', stroke: '#E4735A', 'stroke-width': 3, opacity: 0 }, s);
    R.events = svg('g', {}, s);
    R.cur = { a: RUL.from, b: RUL.from, o: 0 };
    R.age = RUL.from;
    gsap.set([R.line], { opacity: 1 });
  }
  function rulerIn(t) {
    draw(R.line, t, { dur: 1.6, ease: 'power3.inOut' });
    tl.fromTo(R.ticks, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07 }, t + 0.3);
    tl.fromTo(R.labels, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.18 }, t + 0.5);
    tl.fromTo(R.ghost, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, t + 1.0);
  }
  function rulerRange(m1, m2, t, dur) {
    var f = R.cur;
    tl.fromTo(R.range, { attr: { x: mx(f.a), width: Math.max(0.01, mx(f.b) - mx(f.a)), opacity: f.o } },
      { attr: { x: mx(m1), width: mx(m2) - mx(m1), opacity: 1 }, duration: dur || 1.2, ease: 'power3.inOut', immediateRender: false }, t);
    R.cur = { a: m1, b: m2, o: 1 };
  }
  function rulerAge(m, t, dur, hops) {
    var from = R.age;
    if (hops) {
      var step = (m - from) / hops, d = (dur || 1.5) / hops;
      for (var i = 0; i < hops; i++) {
        var a = from + step * i, b = from + step * (i + 1);
        tl.fromTo(R.ghost, { attr: { cx: mx(a) } }, { attr: { cx: mx(b) }, duration: d, ease: 'power2.inOut', immediateRender: false }, t + d * i);
      }
    } else {
      tl.fromTo(R.ghost, { attr: { cx: mx(from) } }, { attr: { cx: mx(m) }, duration: dur || 1.2, ease: 'power3.inOut', immediateRender: false }, t);
    }
    R.age = m;
  }
  function rulerEvent(label, m, tIn, tOut) {
    var g = svg('g', { opacity: 0 }, R.events);
    svg('line', { x1: mx(m), x2: mx(m), y1: RY - 18, y2: RY - 30, stroke: ACC, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    var tx = svg('text', { x: mx(m), y: RY - 42, 'text-anchor': 'middle', 'class': 'evt-t' }, g);
    tx.textContent = label;
    tx.setAttribute('style', 'font-family: DOMSans; font-weight: 750; font-size: 21px; fill: ' + ACC_T + '; letter-spacing: 0.02em;');
    tl.fromTo(g, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', immediateRender: false }, tIn);
    tl.fromTo(g, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'power2.in', immediateRender: false }, tOut);
  }

  // ---------- Карта курса: все возрастные периоды серии ----------
  // periods: [{ label, color, done }] — done: эпизод уже вышел (его отрезок в цвете своего раздела)
  function mapBuild(parent, periods, cur, o) {
    o = o || {};
    var y = o.y == null ? RY : o.y;
    var g = svg('g', {}, parent);
    var N = periods.length, gap = 10, segW = (X1 - X0 - gap * (N - 1)) / N;
    var M = { g: g, segs: [], labs: [], segW: segW, y: y, x: function (i) { return X0 + i * (segW + gap); } };
    periods.forEach(function (p, i) {
      var fill = i === cur ? ACC : (p.done ? p.color : '#DDD6CA');
      var r = svg('rect', { x: M.x(i), y: y - 5, width: segW, height: 10, rx: 5, fill: fill }, g);
      if (p.done && i !== cur) r.setAttribute('fill-opacity', '0.55');
      M.segs.push(r);
      var tx = svg('text', { x: M.x(i) + segW / 2, y: y + 42, 'text-anchor': 'middle' }, g);
      tx.textContent = p.label;
      tx.setAttribute('style', 'font-family: DOMSans; font-weight: ' + (i === cur ? 800 : 650) + '; font-size: 19px; fill: ' + (i === cur ? ACC_T : '#8A8F90') + ';');
      M.labs.push(tx);
    });
    return M;
  }
  function mapIn(M, t) {
    M.segs.forEach(function (r, i) {
      tl.fromTo(r, { attr: { width: 0.01 } }, { attr: { width: M.segW }, duration: 0.55, ease: 'power2.out' }, t + i * 0.05);
    });
    tl.fromTo(M.labs, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.05 }, t + 0.25);
  }
  // Текущий отрезок «вырастает» в шкалу эпизода
  function mapZoom(M, cur, t) {
    var others = M.segs.filter(function (_, i) { return i !== cur; }).concat(M.labs);
    tl.fromTo(others, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: 'power2.in', immediateRender: false }, t);
    tl.fromTo(M.segs[cur], { attr: { x: M.x(cur), width: M.segW, y: M.y - 5, height: 10 } },
      { attr: { x: X0, width: X1 - X0, y: RY - 3, height: 6 }, duration: 1.25, ease: 'power3.inOut', immediateRender: false }, t + 0.1);
    rulerIn(t + 0.55);
    tl.fromTo(R.range, { attr: { x: X0, width: X1 - X0, opacity: 0 } }, { attr: { x: X0, width: X1 - X0, opacity: 1 }, duration: 0.01, immediateRender: false }, t + 1.36);
    tl.fromTo(M.segs[cur], { opacity: 1 }, { opacity: 0, duration: 0.01, immediateRender: false }, t + 1.37);
    R.cur = { a: RUL.from, b: RUL.to, o: 1 };
  }
  // Анонс: следующий отрезок окрашивается в цвет своего раздела и «дышит»
  function mapNext(M, i, color, t) {
    var r = M.segs[i];
    tl.fromTo(r, { attr: { fill: '#DDD6CA' } }, { attr: { fill: color }, duration: 0.7, ease: 'power2.inOut', immediateRender: false }, t);
    tl.fromTo(M.labs[i], { fill: '#8A8F90' }, { fill: color, duration: 0.7, ease: 'power2.inOut', immediateRender: false }, t);
    var ring = svg('rect', { x: M.x(i) - 5, y: M.y - 10, width: M.segW + 10, height: 20, rx: 10, fill: 'none', stroke: color, 'stroke-width': 2.5, opacity: 0 }, M.g);
    for (var k = 0; k < 3; k++) {
      tl.fromTo(ring, { opacity: 0.9, attr: { x: M.x(i) - 5, y: M.y - 10, width: M.segW + 10, height: 20 } },
        { opacity: 0, attr: { x: M.x(i) - 17, y: M.y - 22, width: M.segW + 34, height: 44 }, duration: 1.4, ease: 'power2.out', immediateRender: false }, t + 0.5 + k * 1.6);
    }
    return ring;
  }

  // ---------- Заставка главы (общая для серии) ----------
  function chapterCard(s, n, title, range) {
    var num = s.text('display acc', String(n), { left: 140, top: 262, fontSize: 250, lineHeight: 1 });
    s.pop(num, 0.02, { from: 0.8, dur: 0.9 });
    var t = s.text('h1', title, { left: 330, top: 318, width: 1300 });
    s.lines(t, 0.12, { dur: 1.0 });
    var r = s.text('small-caps', range, { left: 336, top: 438 });
    s.fade(r, 0.35, { y: 8 });
  }

  // ---------- Интерфейс ----------
  function buildUI() {
    var b = el('div', null, layers.ui);
    b.id = 'brand';
    var im = document.createElement('img');
    im.src = 'assets/brand/dom-header.png'; im.alt = 'DOM Academy';
    b.appendChild(im);
    Film.brandEl = b;
  }
  function chapterLabel(n, title, tIn, tOut) {
    var e = el('div', 'chapter', layers.ui, '<span class="num">' + n + '</span> · ' + title);
    tl.fromTo(e, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', immediateRender: false }, tIn);
    tl.fromTo(e, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power2.in', immediateRender: false }, tOut);
  }

  // ---------- Камера и стоп-кадр (с эпизода 7–10) ----------
  // Камера наводит точку сцены (cx, cy) в центр кадра с увеличением z; двигает сцену и героев вместе.
  var CAM = { els: [], st: { cx: 960, cy: 540, z: 1 } };
  function camTr(c) { return { x: W / 2 - c.cx * c.z, y: H / 2 - c.cy * c.z, scale: c.z, transformOrigin: '0 0' }; }
  function camTo(c, t, dur, ease) {
    var f = CAM.st, n = { cx: c.cx == null ? f.cx : c.cx, cy: c.cy == null ? f.cy : c.cy, z: c.z == null ? f.z : c.z };
    var to = camTr(n); to.duration = dur || 0.001; to.ease = ease || 'power2.inOut'; to.immediateRender = false;
    tl.fromTo(CAM.els, camTr(f), to, t);
    CAM.st = n;
  }
  // Стоп-кадр: рамка акцентом и знак паузы поверх кадра. Движение на это время сцена не ставит сама.
  function freeze(t, dur) {
    var e = el('div', 'freeze', layers.ui, '<i></i><i></i>');
    tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(e, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power2.in', immediateRender: false }, t + dur - 0.25);
  }

  // ---------- Сцена ----------
  function makeScene(def, t0) {
    var box = el('div', 'scene', layers.scenes);
    box.id = 'sc-' + def.id;
    var ov = el('div', 'ov', layers.sketch); // рисованный слой сцены — над персонажами
    ov.id = 'ov-' + def.id;
    var dur = def.bars * BAR, end = t0 + dur;
    var s = {
      id: def.id, t0: t0, dur: dur, end: end, box: box, ov: ov, A: A, R: R, mx: mx, W: W, H: H, RY: RY, X0: X0, X1: X1, HL: HL,
      at: function (lt) { return t0 + lt; },
      text: function (cls, html, st, parent) { var e = el('div', cls, parent || box, html); e.classList.add('abs'); if (st) css(e, st); return e; },
      div: function (cls, st, parent, html) { var e = el('div', cls, parent || box, html); e.classList.add('abs'); if (st) css(e, st); return e; },
      svg: function (st) {
        st = st || {};
        var w = st.width || W, h = st.height || H;
        var e = svg('svg', { width: w, height: h, viewBox: (st.vx || 0) + ' ' + (st.vy || 0) + ' ' + w + ' ' + h }, st.parent || box);
        e.style.position = 'absolute'; e.style.left = (st.left || 0) + 'px'; e.style.top = (st.top || 0) + 'px';
        return e;
      },
      path: function (parent, d, attrs) { var a = { d: d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; for (var k in attrs) a[k] = attrs[k]; return svg('path', a, parent); },
      node: function (parent, tag, attrs) { return svg(tag, attrs, parent); },
      lines: function (e, lt, o) { return linesIn(e, t0 + lt, o); },
      fade: function (e, lt, o) { fadeIn(e, t0 + lt, o); },
      out: function (e, lt, o) { fadeOut(e, t0 + lt, o); },
      pop: function (e, lt, o) { popIn(e, t0 + lt, o); },
      grow: function (e, lt, o) { growX(e, t0 + lt, o); },
      growY: function (e, lt, o) { growY(e, t0 + lt, o); },
      draw: function (p, lt, o) { draw(p, t0 + lt, o); },
      dash: function (p, lt, o) { drawDashed(p, t0 + lt, o); },
      hl: function (e, lt, o) { hl(e, t0 + lt, o); },
      tween: function (e, lt, from, to) {
        // первый твин прозрачности, который начинается с нуля, прячет элемент с самого начала —
        // иначе элемент виден до своего появления (а потом «появляется второй раз»)
        if (from.opacity != null) [].concat(e).forEach(function (x) { if (!x.__op) { x.__op = 1; if (from.opacity === 0) x.style.opacity = 0; } });
        to.immediateRender = false; tl.fromTo(e, from, to, t0 + lt);
      },
      set: function (e, lt, from, to) { to.duration = 0.001; to.immediateRender = false; tl.fromTo(e, from, to, t0 + lt); },
      actor: function (id, props, lt, dur, ease) { aTo(id, props, t0 + lt, dur, ease); },
      hop: function (id, x, y, lt, dur, h) { return hop(id, x, y, t0 + lt, dur, h) - t0; },
      squash: function (id, sx, sy, lt, dur, ease) { squash(id, sx, sy, t0 + lt, dur, ease); },
      color: function (id, c, lt, dur) { aColor(id, c, t0 + lt, dur); },
      face: function (id, on, lt, dur) { faceShow(id, on, t0 + lt, dur); },
      acc: function (id, kind) { var a = A[id]; a.accs = a.accs || {}; if (!a.accs[kind]) a.accs[kind] = addAcc(id, kind); return a.accs[kind]; },
      mouth: function (id, shape, lt, dur) { mouth(id, shape, t0 + lt, dur); },
      brow: function (id, kind, lt, dur) { brow(id, kind, t0 + lt, dur); },
      gear: function (id, kind, on, lt, dur) { var e = A[id].accs && A[id].accs[kind]; if (e) tl.fromTo(e, { opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0, duration: dur || 0.3, immediateRender: false }, t0 + lt); }, // снять/надеть свою вещь (ранец)
      hands: function (id, pose, lt, dur) { hands(id, pose, t0 + lt, dur); },
      gaze: function (id, gx, gy, lt, dur) { gaze(id, gx, gy, t0 + lt, dur); },
      rest: function (lt, dur, ease) { aTo('baby', { x: mx(R.age), y: RY, d: 26, o: 1 }, t0 + lt, dur == null ? 1.2 : dur, ease); },
      age: function (m, lt, dur, hops) { rulerAge(m, t0 + lt, dur, hops); },
      range: function (a, b, lt, dur) { rulerRange(a, b, t0 + lt, dur); },
      event: function (label, m, lt, ltOut) { rulerEvent(label, m, t0 + lt, ltOut == null ? end - 0.4 : t0 + ltOut); },
      chapter: function (n, title, lt, ltOut) { chapterLabel(n, title, t0 + lt, t0 + ltOut); },
      rulerIn: function (lt) { rulerIn(t0 + lt); },
      brandIn: function (lt) { fadeIn(Film.brandEl, t0 + lt, { y: -8, dur: 0.9 }); },
      brandOut: function (lt) { fadeOut(Film.brandEl, t0 + lt, { dur: 0.6 }); },
      rulerOut: function (lt) { fadeOut(R.svg, t0 + lt, { dur: 0.9 }); },
      map: function (parent, o) { return mapBuild(parent || R.svg, CFG.series.periods, CFG.series.current, o); },
      mapIn: function (M, lt) { mapIn(M, t0 + lt); },
      mapZoom: function (M, lt) { mapZoom(M, CFG.series.current, t0 + lt); },
      mapNext: function (M, lt) { var nx = CFG.series.next; return mapNext(M, nx, CFG.series.periods[nx].color, t0 + lt); },
      chapterCard: function (n, title, range) { chapterCard(s, n, title, range); },
      // «реквизит» поверх персонажей (например, рука ребёнка); видимостью управляет сцена
      prop: function (cls, st) { var e = el('div', 'prop ' + (cls || ''), layers.actors); if (st) css(e, st); gsap.set(e, { opacity: 0 }); return e; },
      // рисованный слой над персонажами: svg и тексты живут и гаснут вместе со сценой
      over: function (st) { st = st || {}; st.parent = ov; return this.svg(st); },
      otext: function (cls, html, st) { return this.text(cls, html, st, ov); },
      sk: function (parent, pts, o) { return Film.sketch.stroke(this, parent, pts, o); },
      cam: function (c, lt, dur, ease) { camTo(c, t0 + lt, dur, ease); },
      freeze: function (lt, dur) { freeze(t0 + lt, dur); },
      // текст поверх кадра, который камера не двигает (слой #ui); гасить вручную
      hud: function (cls, html, st) { var e = el('div', cls, layers.ui, html); e.classList.add('abs'); if (st) css(e, st); gsap.set(e, { opacity: 0 }); return e; },
      img: function (src, st, parent) { var e = document.createElement('img'); e.src = src; e.className = 'abs'; (parent || box).appendChild(e); if (st) css(e, st); return e; },
      ACC: ACC, CFG: CFG
    };
    return s;
  }

  // ---------- Сборка ----------
  Film.ready = function () {
    var probe = 'АаБбЁёЙйЖжЩщЪъЫыЭэЮюЯя AaBbQqGg 0123456789 «»—–…·~№';
    return Promise.all([
      document.fonts.load('600 70px DOMSerif', probe),
      document.fonts.load('500 64px DOMSerif', probe),
      document.fonts.load('italic 500 54px DOMSerif', probe),
      document.fonts.load('500 32px DOMSans', probe),
      document.fonts.load('700 22px DOMSans', probe + ' Ψ'),
      document.fonts.load('400 50px DOMHand', probe),
      document.fonts.load('400 40px DOMKid', probe)
    ]).then(function () { return document.fonts.ready; });
  };

  Film.build = function (opts) {
    opts = opts || {};
    root = document.getElementById('root');
    var camA = el('div', 'layer cam', root), camB;
    layers.scenes = el('div', 'layer', camA); layers.scenes.id = 'scenes';
    layers.ruler = el('div', 'layer', root); layers.ruler.id = 'ruler';
    camB = el('div', 'layer cam', root);
    layers.actors = el('div', 'layer', camB); layers.actors.id = 'actors';
    layers.sketch = el('div', 'layer', camB); layers.sketch.id = 'sketch';
    CAM.els = [camA, camB];
    layers.ui = el('div', 'layer', root); layers.ui.id = 'ui';
    var grain = el('div', null, root); grain.id = 'grain';

    tl = gsap.timeline({ paused: true });
    Film.tl = tl;
    ['stranger', 'adult3', 'dad', 'adult2', 'adult', 'obj', 'kid4', 'kid3', 'kid2', 'baby'].forEach(makeActor); // dad — с эпизода 7–10
    buildRuler();
    buildUI();

    var t = 0;
    Film.scenes.forEach(function (def) {
      var s = makeScene(def, t);
      camTo({ cx: W / 2, cy: H / 2, z: 1 }, t, 0); // камера не «протекает» из прошлой сцены
      tl.fromTo([s.box, s.ov], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, t);
      def.build(s);
      if (!def.hold) // hold: сцена остаётся до последнего кадра (финальная карточка)
        tl.fromTo([s.box, s.ov], { autoAlpha: 1, y: 0, filter: 'blur(0px)' },
          { autoAlpha: 0, y: -14, filter: 'blur(7px)', duration: 0.5, ease: 'power2.in', immediateRender: false }, s.end - 0.5);
      t = s.end;
    });
    Film.total = t;

    var main = tl;
    if (opts.from != null || opts.to != null) {
      var a = opts.from || 0, b = opts.to == null ? t : opts.to;
      main = gsap.timeline({ paused: true });
      main.add(tl.tweenFromTo(a, b, { ease: 'none', immediateRender: false }), 0);
    }
    window.__timelines = window.__timelines || {};
    window.__timelines.main = main;
    Film.main = main;
  };

  window.Film = Film;
})();
