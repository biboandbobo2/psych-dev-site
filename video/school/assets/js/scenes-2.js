/* Глава 2. Думать по правилам · Аня (v3.1): самая младшая (Лейтон), куда поставить 150 (Сиглер, Опфер), кит — рыба? (Выготский) */
/* global Film */
(function () {
  'use strict';
  var K = function () { return Film.school; };
  var INK = '#1D2733', CHALK = '#F3EFE4', SKIN = '#EC8A6F', STICK = '#8B6A45';

  // ---------- общее для главы ----------
  // стена класса и пол
  function room(s, g, floor) {
    s.node(g, 'rect', { x: 0, y: 0, width: 1920, height: floor, fill: '#F4E9D8', opacity: 0.55 });
    s.path(g, 'M0 ' + floor + ' H1920', { stroke: '#CDC3B4', 'stroke-width': 3 });
  }
  // одноклассник из постоянного состава класса (Film.school.classmate), обёрнут в группу — чтобы двигать
  function mate(s, g, i, x, y, r, mouth) {
    var w = s.node(g, 'g', {});
    if (K().classmate) K().classmate(w, i, x, y, r, { mouth: mouth || 'soft' });
    else Film.head(w, x, y, r, '#E4735A', null, { mouth: mouth || 'soft' });
    return w;
  }
  // мел на доске
  function chalk(s, html, st) { st.color = CHALK; return s.text('kidhand', html, st); }
  // вывод — внизу, держится до конца сцены
  function concl(s, text, lt, top) {
    var e = s.text('h3', '<span class="acc">Вывод:</span> ' + text, { left: 140, top: top || 930, width: 1640, fontSize: 42 });
    s.lines(e, lt);
    return e;
  }
  function cite(s, text, lt, hud) {
    var st = { left: 140, top: 1012, width: 1640, fontSize: 20 };
    if (!hud) { var e = s.text('cite', text, st); s.fade(e, lt, { y: 4 }); return e; }
    var h = s.hud('cite', text, st);
    s.tween(h, lt, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    s.tween(h, s.dur - 0.5, { opacity: 1 }, { opacity: 0, duration: 0.4 });
    return h;
  }
  // текст в слое #ui: переживает перелистывание, гаснет сам к концу сцены (или в out)
  function hudText(s, cls, html, st, lt, out) {
    var e = s.hud(cls, html, st);
    s.tween(e, lt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
    s.tween(e, out == null ? s.dur - 0.5 : out, { opacity: 1 }, { opacity: 0, duration: 0.35 });
    return e;
  }
  function castOut(s, ids) { ids.forEach(function (id) { s.actor(id, { o: 0 }, s.dur - 0.4, 0.3); }); }
  function show(s, e, lt) { s.tween(e, lt, { opacity: 0 }, { opacity: 1, duration: 0.01 }); }
  function hide(s, e, lt) { [].concat(e).forEach(function (x) { s.set(x, lt, { opacity: 1 }, { opacity: 0 }); }); }

  // 1:50 — заставка главы (26 тактов = 65 с)
  Film.scene({
    id: 'ch2', bars: 2,
    build: function (s) {
      s.chapterCard(2, 'Думать по правилам', 'Аня — младше всех и боится отстать');
      K().pathsCard(s, 2, 'anya', [{ who: 'misha', x: 410, text: 'новый взрослый' }, { who: 'misha', x: 500, text: 'мерка' }, { who: 'misha', x: 610, text: 'игра с правилами' }]);
      s.chapter(2, 'Думать по правилам', 0.4, 64.4);
    }
  });

  // 1:55 — Самая младшая (Т. Лейтон и др., 2018)
  Film.scene({
    id: 'smallest', bars: 6,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      // кадр 1: класс выстроился по дням рождения перед учителем
      var A = s.node(g, 'g', {});
      room(s, A, 900);
      K().board(s, A, 480, 260, 960, 400, { at: 0.1 });
      var date = chalk(s, '1 сентября', { left: 480, top: 310, width: 960, textAlign: 'center', fontSize: 72 });
      s.fade(date, 0.3, { y: 0 });
      var mon = chalk(s, 'сен окт ноя дек янв фев мар апр май июн июл авг', { left: 480, top: 500, width: 960, textAlign: 'center', fontSize: 44 });
      s.fade(mon, 0.6, { y: 0 });
      var t1 = s.text('h3', 'В одном классе разница — почти год.', { left: 140, top: 130, width: 1640, fontSize: 46 });
      s.lines(t1, 0.4);
      K().cast(s, 'teacher', 190, 800, 170, 0.2, { gx: 8 });
      var BOT = 870, X = function (i) { return 400 + i * 72; }, R = function (i) { return 34 - i * 0.45; };
      var heads = [], m = 0, who = { 2: 'dima', 10: 'misha', 19: 'anya' };
      for (var i = 0; i < 20; i++) {
        if (who[i]) continue;
        var h = mate(s, A, m++, X(i), BOT - R(i), R(i));
        s.tween(h, 0.5 + i * 0.05, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)' });
        heads.push(h);
      }
      K().cast(s, 'dima', X(2), BOT - R(2), 2 * R(2), 0.6, { gx: -6 });
      K().cast(s, 'misha', X(10), BOT - R(10), 2 * R(10), 1.0, { gx: 6 });
      K().cast(s, 'anya', 1880, BOT - 25, 50, 1.8, { gx: -8, mouth: 'soft' });
      s.hop('kid2', X(19), BOT - 25, 2.0, 0.4, 30);
      var arr = s.path(A, 'M560 ' + (BOT + 26) + ' H1620', { stroke: '#8A8F90', 'stroke-width': 3, 'stroke-dasharray': '8 10' });
      var arh = s.path(A, 'M1606 ' + (BOT + 16) + ' L1622 ' + (BOT + 26) + ' L1606 ' + (BOT + 36), { stroke: '#8A8F90', 'stroke-width': 3 });
      var m1 = s.text('label', 'сентябрь', { left: 380, top: BOT + 8 }), m2 = s.text('label', 'август', { left: 1660, top: BOT + 8 });
      s.fade([m1, m2], 1.6, { y: 4 }); s.tween([arr, arh], 1.6, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      var tg = [K().tag(s, 'Дима', X(2), BOT - 120, 1.2), K().tag(s, 'Миша', X(10), BOT - 112, 1.2)];
      var ta = s.text('tag', 'Аня · 31 августа', { left: 1480, top: BOT - 104, width: 330, textAlign: 'right', color: 'var(--accent-deep)' });
      s.fade(ta, 2.4, { y: 4 });

      // кадр 2: урок; Аня вертится, роняет пенал — над ней тень «СДВГ?»
      var sw = K().flip(s, 4.4);
      hide(s, [A, date, mon, t1, m1, m2, ta].concat(tg), sw);
      var B = s.node(g, 'g', {});
      show(s, B, sw);
      room(s, B, 600);
      K().board(s, B, 500, 330, 520, 170, { at: sw });
      var SKIP = { '0-2': 1, '0-3': 1, '1-4': 1 };
      var spots = K().classroom(s, B, { rows: 3, cols: 5, front: 880, back: 590, skip: function (r, c) { return SKIP[r + '-' + c]; } });
      var at = function (r, c) { return spots.filter(function (p) { return p.r === r && p.c === c; })[0]; };
      [[1, 4], [0, 3], [0, 2]].forEach(function (rc) { var p = at(rc[0], rc[1]); K().desk(s, B, p.x, p.y, p.k); }); // парты героев
      var pa = at(0, 3), pm = at(0, 2), pd = at(1, 4);
      s.actor('kid2', { x: pa.x, y: pa.y - 64, d: 80 }, sw, 0.01);
      s.actor('baby', { x: pm.x, y: pm.y - 64, d: 80 }, sw, 0.01);
      s.actor('kid3', { x: pd.x, y: pd.y - 64 * pd.k, d: 80 * pd.k }, sw, 0.01);
      s.actor('adult2', { x: 150, y: 720 }, sw, 0.01);
      // Аня вертится
      [0, 1, 2, 3].forEach(function (j) {
        var t = sw + 0.5 + j * 0.32;
        s.actor('kid2', { x: pa.x + (j % 2 ? -10 : 10) }, t, 0.16, 'sine.inOut');
        s.squash('kid2', 1.05, 0.95, t, 0.08); s.squash('kid2', 1, 1, t + 0.08, 0.14);
      });
      s.actor('kid2', { x: pa.x }, sw + 1.8, 0.2);
      s.gaze('kid2', 8, 4, sw + 0.5, 0.2); s.gaze('kid2', -6, -4, sw + 1.2, 0.2);
      var pen = s.node(ov, 'rect', { x: pa.x + 30, y: pa.y - 34, width: 70, height: 22, rx: 8, fill: '#F2C14E', stroke: INK, 'stroke-width': 2.5 });
      show(s, pen, sw);
      s.tween(pen, sw + 1.5, { y: 0, rotation: 0, svgOrigin: (pa.x + 65) + ' ' + (pa.y - 23) }, { y: 120, rotation: 70, duration: 0.45, ease: 'power2.in' });
      s.mouth('kid2', 'flat', sw + 1.9, 0.2); s.gaze('kid2', 4, 8, sw + 1.9, 0.2);
      s.mouth('adult2', 'sad', sw + 2.0, 0.3); s.gaze('adult2', 9, 2, sw + 2.0, 0.3);
      var shadow = s.otext('display', 'СДВГ?', { left: 1060, top: 360, width: 400, textAlign: 'center', fontSize: 120, color: INK });
      s.tween(shadow, sw + 2.3, { opacity: 0, y: 10 }, { opacity: 0.5, y: 0, duration: 0.8 });
      var t2 = s.text('lead', 'Самым младшим в классе на треть чаще ставят СДВГ — синдром дефицита внимания и гиперактивности.', { left: 140, top: 130, width: 1640, fontSize: 36 });
      s.lines(t2, sw + 1.2);
      // листок календаря — тень бледнеет
      var cal = s.div('paper', { left: 1590, top: 330, width: 190, height: 200, overflow: 'hidden' });
      var cb = Film.el('div', null, cal); Film.css(cb, { height: '46px', background: 'var(--margin)', color: '#fff', font: '700 24px DOMSans', textAlign: 'center', lineHeight: '46px' }); cb.textContent = 'август';
      var cn = Film.el('div', null, cal); Film.css(cn, { font: '600 110px DOMSerif', textAlign: 'center', lineHeight: '140px', color: INK }); cn.textContent = '31';
      s.pop(cal, 9.3, { from: 0.6, dur: 0.4 });
      var cl = s.path(ov, 'M1585 440 Q1500 470 1460 440', { stroke: K().DEEP, 'stroke-width': 3, 'stroke-dasharray': '8 8' });
      s.dash(cl, 9.6, { dur: 0.5 });
      s.tween(shadow, 9.9, { opacity: 0.5 }, { opacity: 0.07, duration: 1.2, ease: 'power1.inOut' });
      s.mouth('adult2', 'soft', 10.4, 0.3); s.mouth('kid2', 'smile', 10.6, 0.3);
      var t3 = s.text('lead', 'Часто за диагнозом — <b class="acc">просто возраст</b>: ребёнок младше соседей.', { left: 140, top: 240, width: 1640, fontSize: 36 });
      s.lines(t3, 9.5);
      cite(s, 'Т. Лейтон и др., 2018: 408 тыс. детей, США; где граница набора в другой день — разницы нет', 11.0);
      castOut(s, ['adult2', 'kid2', 'baby', 'kid3']);
    }
  });

  // 2:10 — Куда поставить 150? (Р. Сиглер, Дж. Опфер, 2003; 2007)
  Film.scene({
    id: 'line150', bars: 10,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      room(s, g, 820);
      K().board(s, g, 300, 280, 1320, 340, { at: 0.05 });
      K().cast(s, 'teacher', 170, 700, 170, 0.1, { gx: 8 });
      K().cast(s, 'anya', 1500, 720, 120, 0.1, { gx: -8, mouth: 'soft' });
      // одноклассники за партами — спиной к нам не рисуем: ряд голов внизу
      var mates = [];
      for (var i = 0; i < 8; i++) mates.push(mate(s, g, i + 3, 380 + i * 150, 868, 38, 'soft'));
      // кадр 1: 3 + 5 — считает на пальцах
      var F1 = [], ex = chalk(s, '3 + 5 = ?', { left: 400, top: 320, fontSize: 110 });
      s.fade(ex, 0.3, { y: 0 }); F1.push(ex);
      var hands = s.node(ov, 'g', {}), fingers = [];
      [1160, 1330].forEach(function (hx) {
        s.node(hands, 'rect', { x: hx - 62, y: 742, width: 124, height: 64, rx: 26, fill: SKIN, stroke: INK, 'stroke-width': 3 });
        for (var f = 0; f < 5; f++) fingers.push(s.node(hands, 'rect', { x: hx - 58 + f * 24, y: 680, width: 20, height: 70, rx: 10, fill: SKIN, stroke: INK, 'stroke-width': 2.5, opacity: 0.25 }));
      });
      s.tween(hands, 0.4, { opacity: 0 }, { opacity: 1, duration: 0.3 }); F1.push(hands);
      function count(a, b, t0, step) { for (var k = a; k < b; k++) s.tween(fingers[k], t0 + (k - a) * step, { opacity: 0.25, y: 10 }, { opacity: 1, y: 0, duration: 0.12 }); }
      function reset(t) { s.set(fingers, t, { opacity: 1 }, { opacity: 0.25 }); }
      var w1 = chalk(s, '1, 2, 3 … 8', { left: 400, top: 470, fontSize: 64 });
      s.fade(w1, 0.8, { y: 0 }); s.out(w1, 2.6, { dur: 0.2 });
      count(0, 8, 0.8, 0.2);
      reset(2.7);
      var w2 = chalk(s, '5 … 6, 7, 8', { left: 400, top: 470, fontSize: 64 });
      s.fade(w2, 2.8, { y: 0 }); s.out(w2, 4.2, { dur: 0.2 });
      s.set(fingers.slice(0, 5), 2.8, { opacity: 0.25 }, { opacity: 1 });
      count(5, 8, 3.2, 0.25);
      reset(4.3);
      s.tween(hands, 4.3, { y: 0 }, { y: 40, duration: 0.3 });
      var w3 = chalk(s, '8!', { left: 400, top: 470, fontSize: 80 });
      s.pop(w3, 4.4, { from: 0.5, dur: 0.3 });
      s.squash('kid2', 0.92, 1.1, 4.4, 0.12); s.squash('kid2', 1, 1, 4.52, 0.3, 'back.out(3)'); s.mouth('kid2', 'smile', 4.4, 0.2);
      // следующий пример — снова пальцы
      s.out([ex, w3], 5.2, { dur: 0.2 });
      var ex2 = chalk(s, '6 + 3 = ?', { left: 400, top: 320, fontSize: 110 });
      s.fade(ex2, 5.3, { y: 0 }); F1.push(ex2);
      s.tween(hands, 5.3, { y: 40 }, { y: 0, duration: 0.25 });
      s.mouth('kid2', 'soft', 5.3, 0.2);
      count(0, 4, 5.5, 0.18);
      // кадр 2: 2 класс, числовая прямая 0…1000
      var sw = K().flip(s, 6.2);
      hide(s, F1, sw);
      s.actor('kid2', { x: 1730, y: 700 }, sw, 0.01); s.gaze('kid2', -8, -4, sw, 0.01);
      var cls = chalk(s, '2 класс', { left: 330, top: 290, fontSize: 44 });
      show(s, cls, sw);
      var L0 = 420, L1 = 1500, LY = 470, P = function (v) { return L0 + (L1 - L0) * v / 1000; };
      var ln = s.path(ov, 'M' + L0 + ' ' + LY + ' H' + L1 + ' M' + L0 + ' ' + (LY - 20) + ' V' + (LY + 20) + ' M' + L1 + ' ' + (LY - 20) + ' V' + (LY + 20), { stroke: CHALK, 'stroke-width': 6 });
      s.draw(ln, sw + 0.3, { dur: 0.8 });
      var n0 = chalk(s, '0', { left: L0 - 40, top: LY + 30, width: 80, textAlign: 'center', fontSize: 52 }), n1 = chalk(s, '1000', { left: L1 - 80, top: LY + 30, width: 160, textAlign: 'center', fontSize: 52 });
      s.fade([n0, n1], sw + 1.0, { y: 0 });
      hudText(s, 'h3', 'Числовая прямая: от 0 до 1000. Куда поставить 150?', { left: 140, top: 130, width: 1640, fontSize: 46 }, 7.0, 13.8);
      s.freeze(8.8, 2.8);
      hudText(s, 'h3 acc', 'Угадайте.', { left: 140, top: 196, fontSize: 46 }, 8.9, 13.8);
      // кадр 3: Аня уверенно ставит почти на середину; класс хихикает; учитель — у самого начала
      function flag(color, x, t) {
        var f = s.node(ov, 'g', {});
        s.path(f, 'M' + x + ' ' + LY + ' V' + (LY - 120), { stroke: STICK, 'stroke-width': 7 });
        s.path(f, 'M' + x + ' ' + (LY - 120) + ' l60 20 l-60 20 Z', { fill: color, stroke: INK, 'stroke-width': 2.5 });
        s.tween(f, t, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.in' });
        return f;
      }
      s.actor('kid2', { x: P(470) + 60 }, 11.7, 0.8, 'power2.inOut'); s.mouth('kid2', 'smile', 11.7, 0.2);
      var fa = flag(K().TEAL, P(470), 12.5);
      var la = chalk(s, '150?', { left: P(470) - 10, top: LY - 190, fontSize: 48 });
      s.fade(la, 12.7, { y: 0 });
      mates.forEach(function (h, j) {
        s.tween(h, 13.0 + j * 0.06, { y: 0 }, { y: -12, duration: 0.14, repeat: 3, yoyo: true, ease: 'sine.inOut' });
      });
      s.mouth('kid2', 'flat', 13.2, 0.2); s.gaze('kid2', 0, 8, 13.2, 0.2);
      s.actor('adult2', { x: 300 }, 13.2, 0.5);
      var fr = flag(K().RED, P(150), 13.8);
      var lr = s.text('kidhand red', '150', { left: P(150) - 40, top: LY - 190, fontSize: 48 });
      s.fade(lr, 14.0, { y: 0 });
      hudText(s, 'h3', 'Так ошибаются почти все второклассники: 100 для них — уже огромное число, и маленькие числа в голове «растянуты».', { left: 140, top: 130, width: 1640, fontSize: 42 }, 14.1);
      cite(s, 'Р. Сиглер, Дж. Опфер, 2003: «растянуто» расставляют числа 91 % второклассников и 3 % взрослых · Дж. Опфер, Р. Сиглер, 2007 · счёт разными способами вперемешку — Р. Сиглер, 1987; 1996', 15.0, true);
      // кадр 4: 4 класс — та же прямая; старый флажок рядом; лошадка скачет от старого к новому
      var sw2 = K().flip(s, 17.6);
      hide(s, [fr, lr, la, cls], sw2);
      s.set(fa, sw2, { opacity: 1 }, { opacity: 0.45 });
      var cls4 = chalk(s, '4 класс', { left: 330, top: 290, fontSize: 44 });
      show(s, cls4, sw2);
      s.actor('kid2', { x: 1250 }, sw2, 0.01); s.mouth('kid2', 'soft', sw2, 0.01); s.gaze('kid2', -8, -4, sw2, 0.01);
      s.actor('adult2', { x: 170 }, sw2, 0.01); s.mouth('adult2', 'smile', sw2, 0.01);
      s.actor('kid2', { x: P(160) + 70 }, 18.3, 0.8, 'power2.inOut');
      flag(K().TEAL, P(160), 19.2);
      s.mouth('kid2', 'smile', 19.4, 0.2); s.squash('kid2', 0.92, 1.1, 19.5, 0.12); s.squash('kid2', 1, 1, 19.62, 0.3, 'back.out(3)');
      var horse = s.node(ov, 'g', {});
      K().toyHorse(s, horse, P(470) + 50, LY, 0.8);
      s.tween(horse, 19.6, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var dx = (P(160) + 50 - P(470) - 50) / 3;
      [20.0, 20.55, 21.1].forEach(function (t) { Film.ride(s, horse, dx, t, 0.42, 46); });
      concl(s, 'к 4 классу числа в голове выстраиваются ровно.', 20.4);
      castOut(s, ['adult2', 'kid2']);
    }
  });

  // ---------- картинки для «Кита» ----------
  function fish(s, g, x, y, k, fill) {
    s.path(g, 'M' + (x + 30 * k) + ' ' + y + ' Q' + x + ' ' + (y - 22 * k) + ' ' + (x - 26 * k) + ' ' + y + ' Q' + x + ' ' + (y + 22 * k) + ' ' + (x + 30 * k) + ' ' + y + ' Z M' + (x - 24 * k) + ' ' + y + ' L' + (x - 44 * k) + ' ' + (y - 16 * k) + ' L' + (x - 44 * k) + ' ' + (y + 16 * k) + ' Z', { fill: fill, stroke: INK, 'stroke-width': 2.5 });
    s.node(g, 'circle', { cx: x + 16 * k, cy: y - 4 * k, r: 3 * k, fill: INK });
  }
  function whale(s, g, x, y, k, o) {
    o = o || {};
    var st = o.chalk ? { fill: 'none', stroke: CHALK, 'stroke-width': 4 } : { fill: '#5E7FA8', stroke: INK, 'stroke-width': 2.5 };
    var d = 'M' + (x - 50 * k) + ' ' + (y + 2 * k) + ' Q' + (x - 46 * k) + ' ' + (y - 32 * k) + ' ' + x + ' ' + (y - 34 * k) + ' Q' + (x + 50 * k) + ' ' + (y - 34 * k) + ' ' + (x + 58 * k) + ' ' + (y - 2 * k) +
      ' Q' + (x + 58 * k) + ' ' + (y + 22 * k) + ' ' + (x + 26 * k) + ' ' + (y + 22 * k) + ' L' + (x - 30 * k) + ' ' + (y + 22 * k) + ' Q' + (x - 46 * k) + ' ' + (y + 18 * k) + ' ' + (x - 50 * k) + ' ' + (y + 2 * k) + ' Z' +
      ' M' + (x - 48 * k) + ' ' + (y + 4 * k) + ' L' + (x - 80 * k) + ' ' + (y - 20 * k) + ' L' + (x - 68 * k) + ' ' + (y + 6 * k) + ' L' + (x - 80 * k) + ' ' + (y + 26 * k) + ' Z';
    var b = s.path(g, d, st);
    s.node(g, 'circle', { cx: x + 34 * k, cy: y - 8 * k, r: 3.5 * k, fill: o.chalk ? CHALK : INK });
    return b;
  }
  function cat(s, g, x, y, k) {
    s.path(g, 'M' + (x - 22 * k) + ' ' + (y - 8 * k) + ' L' + (x - 20 * k) + ' ' + (y - 34 * k) + ' L' + (x - 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 6 * k) + ' ' + (y - 20 * k) + ' L' + (x + 20 * k) + ' ' + (y - 34 * k) + ' L' + (x + 22 * k) + ' ' + (y - 8 * k) + ' Q' + (x + 24 * k) + ' ' + (y + 20 * k) + ' ' + x + ' ' + (y + 20 * k) + ' Q' + (x - 24 * k) + ' ' + (y + 20 * k) + ' ' + (x - 22 * k) + ' ' + (y - 8 * k) + ' Z', { fill: '#F2B25C', stroke: INK, 'stroke-width': 2.5 });
    [-8, 8].forEach(function (dx) { s.node(g, 'circle', { cx: x + dx * k, cy: y - 2 * k, r: 2.8 * k, fill: INK }); });
    s.path(g, 'M' + (x - 30 * k) + ' ' + (y + 6 * k) + ' L' + (x - 12 * k) + ' ' + (y + 6 * k) + ' M' + (x + 12 * k) + ' ' + (y + 6 * k) + ' L' + (x + 30 * k) + ' ' + (y + 6 * k), { stroke: INK, 'stroke-width': 2 });
  }
  // карточка 140 × 100 с картинкой; draw(g, cx, cy) рисует картинку
  function card(s, parent, x, y, draw) {
    var c = s.node(parent, 'g', {});
    s.node(c, 'rect', { x: x - 70, y: y - 50, width: 140, height: 100, rx: 10, fill: '#FFFDF8', stroke: '#B8AC9A', 'stroke-width': 2 });
    draw(c, x, y);
    return c;
  }

  // 2:35 — Кит — рыба? (Л. С. Выготский, 1934)
  Film.scene({
    id: 'whale', bars: 8,
    build: function (s) {
      var g = s.svg(), ov = s.over();
      room(s, g, 820);
      // таблица «рыбы | звери» на стене
      s.node(g, 'rect', { x: 140, y: 370, width: 560, height: 430, rx: 8, fill: '#FFFDF8', stroke: '#B8AC9A', 'stroke-width': 2 });
      s.path(g, 'M420 380 V790 M150 436 H690', { stroke: '#CDC3B4', 'stroke-width': 2.5 });
      var h1 = s.text('label', 'рыбы', { left: 140, top: 384, width: 280, textAlign: 'center' }), h2 = s.text('label', 'звери', { left: 420, top: 384, width: 280, textAlign: 'center' });
      s.fade([h1, h2], 0.2, { y: 4 });
      K().board(s, g, 880, 370, 800, 330, { at: 0.1 });
      K().cast(s, 'teacher', 1790, 740, 150, 0.2, { gx: -8 });
      K().cast(s, 'anya', 820, 760, 110, 0.3, { gx: -8 });
      K().cast(s, 'misha', 590, 860, 96, 0.3, { gx: -6 });
      for (var i = 0; i < 5; i++) mate(s, g, i + 9, 1330 + i * 92, 920, 34, 'soft');
      // книжка «Чудо-юдо рыба-кит»
      var bk = s.node(g, 'g', {});
      s.node(bk, 'rect', { x: 1000, y: 860, width: 260, height: 120, rx: 6, fill: '#E9C46A', stroke: INK, 'stroke-width': 3 });
      s.path(bk, 'M1130 860 V980', { stroke: INK, 'stroke-width': 2 });
      fish(s, bk, 1210, 940, 0.7, '#5E7FA8');
      s.tween(bk, 0.4, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      var bt = s.text('note', 'Чудо-юдо рыба-кит', { left: 1006, top: 868, width: 124, fontSize: 20, lineHeight: 1.1, color: 'var(--ink)' });
      s.fade(bt, 0.4, { y: 0 });
      // раскладывает карточки
      var SLOT = { f1: [280, 498], f2: [280, 615], f3: [280, 732], b1: [560, 498], b2: [560, 615], b3: [560, 732] };
      function put(c, from, to, t) {
        s.tween(c, t, { opacity: 0, x: from[0] - to[0], y: from[1] - to[1] }, { opacity: 1, x: from[0] - to[0], y: from[1] - to[1], duration: 0.15 });
        s.tween(c, t + 0.15, { x: from[0] - to[0], y: from[1] - to[1] }, { x: 0, y: 0, duration: 0.55, ease: 'power2.inOut' });
      }
      var HAND = [800, 690];
      put(card(s, ov, SLOT.f1[0], SLOT.f1[1], function (c, x, y) { fish(s, c, x + 6, y, 1.3, '#F2A65A'); }), HAND, SLOT.f1, 0.8);
      put(card(s, ov, SLOT.b1[0], SLOT.b1[1], function (c, x, y) { cat(s, c, x, y + 4, 1.2); }), HAND, SLOT.b1, 1.5);
      put(card(s, ov, SLOT.b2[0], SLOT.b2[1], function (c, x, y) { K().toyHorse(s, c, x - 4, y + 44, 0.82); }), [590, 790], SLOT.b2, 2.2);
      s.gaze('kid2', -8, -4, 0.8, 0.2); s.gaze('baby', 2, -9, 2.2, 0.2);
      var wc = card(s, ov, SLOT.f2[0], SLOT.f2[1], function (c, x, y) { whale(s, c, x + 10, y + 4, 0.8); });
      put(wc, HAND, SLOT.f2, 3.0);
      s.hop('kid2', 820, 760, 3.0, 0.36, 24);
      K().say(s, 'Он же плавает!', 860, 560, 3.8, 6.4);
      hudText(s, 'lead', 'Почему кит — не рыба? Рыба дышит в воде. Кит дышит воздухом и кормит детёнышей молоком.', { left: 140, top: 130, width: 1640, fontSize: 38 }, 4.6);
      // учитель рисует на доске: кит дышит воздухом, кормит молоком
      s.gaze('kid2', 9, -4, 5.4, 0.3); s.gaze('baby', 9, -4, 5.4, 0.3); s.gaze('adult2', -9, -6, 5.4, 0.3);
      var wb = s.node(ov, 'g', {});
      var wv = s.path(wb, 'M920 560 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0', { stroke: '#9CC3D5', 'stroke-width': 4 });
      s.draw(wv, 5.5, { dur: 0.5 });
      var w1 = whale(s, wb, 1060, 530, 1.4, { chalk: true });
      s.draw(w1, 5.7, { dur: 0.9 });
      var fn = s.path(wb, 'M1060 482 Q1052 430 1030 412 M1060 482 Q1068 430 1092 412 M1060 482 V400', { stroke: '#9CC3D5', 'stroke-width': 4 });
      s.draw(fn, 6.6, { dur: 0.5 });
      var l1 = chalk(s, 'дышит воздухом', { left: 920, top: 590, fontSize: 40 });
      s.fade(l1, 7.0, { y: 0 });
      var w2 = whale(s, wb, 1440, 480, 1.1, { chalk: true }), w3 = whale(s, wb, 1560, 560, 0.6, { chalk: true });
      s.draw(w2, 7.4, { dur: 0.7 }); s.draw(w3, 7.9, { dur: 0.5 });
      var l2 = chalk(s, 'кормит молоком', { left: 1330, top: 590, fontSize: 40 });
      s.fade(l2, 8.4, { y: 0 });
      s.tween(Array.prototype.slice.call(wb.querySelectorAll('circle')), 5.7, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      // Аня сама переносит кита к зверям
      s.gaze('kid2', -8, -4, 9.0, 0.2); s.mouth('kid2', 'soft', 9.0, 0.2);
      s.actor('kid2', { x: 760 }, 9.1, 0.4);
      s.tween(wc, 9.5, { x: 0, y: 0 }, { x: SLOT.b3[0] - SLOT.f2[0], y: SLOT.b3[1] - SLOT.f2[1], duration: 0.8, ease: 'power2.inOut' });
      s.mouth('kid2', 'smile', 10.3, 0.2); s.squash('kid2', 0.92, 1.1, 10.3, 0.12); s.squash('kid2', 1, 1, 10.42, 0.3, 'back.out(3)');
      s.mouth('adult2', 'smile', 10.4, 0.2);
      var ex = s.text('lead', 'Житейское понятие ребёнок собирает из опыта — по виду. Научное получает готовым определением — в школе.', { left: 140, top: 240, width: 1640, fontSize: 34 });
      s.lines(ex, 11.2);
      concl(s, 'правило сильнее вида.', 17.4);
      cite(s, 'Л. С. Выготский, «Мышление и речь», 1934, гл. 6 · scientific concepts · даже из 10–15-летних лишь треть знает, что дельфин дышит лёгкими (М. Кубятко, П. Прокоп, 2009)', 12.5);
      castOut(s, ['adult2', 'kid2', 'baby']);
    }
  });
})();
