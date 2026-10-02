/* Часть 4. На пороге школы · кризис семи лет: кризис, «сдвиг 5–7», внутренняя позиция школьника; итог и финал */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', STICK = '#8B6A45', MUTE = '#8A8F90';

  // 3:25 — заставка части
  Film.scene({
    id: 'ch4', bars: 1,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4); s.actor('adult', { o: 0 }, 0.0, 0.4);
      s.chapterCard(4, 'На пороге школы', 'кризис семи лет · 6–7 лет');
      s.range(66, 84, 0.15, 1.3);
      s.age(78, 0.2, 1.3);
      s.chapter(4, 'На пороге школы', 0.4, 44.6);
    }
  });

  // 3:27,5 — Кризис семи лет (Л. С. Выготский)
  Film.scene({
    id: 'crisis7', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Л. С. Выготский · «Кризис семи лет»', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Между «хочу» и «делаю»', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var g = s.svg(), ov = s.over();
      var CX = 1120, CY = 700, OX = 1660;
      s.actor('baby', { x: CX, y: CY, d: 116, o: 0 }, 0.3, 0.01);
      s.actor('baby', { o: 1 }, 0.4, 0.5);
      s.face('baby', true, 0.5, 0.3); s.mouth('baby', 'smile', 0.5, 0.01); s.gaze('baby', 8, 0, 0.5, 0.01);
      s.actor('obj', { x: OX, y: CY + 20, d: 70, o: 0 }, 0.5, 0.01);
      s.actor('obj', { o: 1 }, 0.7, 0.5);
      // раньше: желание → сразу действие
      var arrow = s.node(ov, 'g', {});
      s.sk(arrow, [[CX + 80, CY], [OX - 70, CY]], { at: 1.0, dur: 0.6, seed: 901, width: 4.5 });
      s.sk(arrow, [[OX - 92, CY - 16], [OX - 70, CY], [OX - 92, CY + 16]], { at: 1.5, dur: 0.25, seed: 903, width: 4.5 });
      var was = s.text('small-caps', 'раньше: сразу', { left: CX + 120, top: CY - 66 });
      s.fade(was, 1.4, { y: 6 });
      // теперь: мысль вклинивается
      s.out(arrow, 3.0, { dur: 0.4 }); s.out(was, 3.0, { dur: 0.4 });
      var a1 = s.node(ov, 'g', {}), a2 = s.node(ov, 'g', {});
      s.sk(a1, [[CX + 80, CY], [CX + 180, CY]], { at: 3.4, dur: 0.3, seed: 905, width: 4.5 });
      var cloud = s.node(ov, 'g', {});
      s.sk(cloud, [[1310, 700], [1300, 660], [1330, 630], [1370, 636], [1400, 612], [1440, 630], [1470, 666], [1460, 704], [1420, 728], [1370, 724], [1330, 728], [1310, 700]], { at: 3.7, dur: 0.8, seed: 907, color: ORANGE, width: 4.5 });
      var cq = s.text('label', 'как это будет<br>выглядеть?', { left: 1300, top: 648, width: 180, textAlign: 'center', fontSize: 21, color: DEEP });
      s.fade(cq, 4.3, { y: 4 });
      s.sk(a2, [[1500, CY], [OX - 70, CY]], { at: 4.6, dur: 0.3, seed: 909, width: 4.5 });
      s.sk(a2, [[OX - 92, CY - 16], [OX - 70, CY], [OX - 92, CY + 16]], { at: 4.85, dur: 0.2, seed: 911, width: 4.5 });
      s.gaze('baby', 6, -6, 3.8, 0.3); s.mouth('baby', 'soft', 3.8, 0.3);
      var p1 = s.text('lead', 'Утрата детской непосредственности: в поступки привносится «интеллектуальный момент, который вклинивается между переживанием и непосредственным поступком».', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p1, 4.0, { stagger: 0.08 });
      var nt = s.text('note', 'Манерничанье и кривляние — преходящие симптомы.', { left: 140, top: 532, width: 760 });
      s.fade(nt, 6.6, { y: 6 });
      // логика чувств
      var p2 = s.text('lead', 'Впервые возникает «логика чувств»: ребёнок понимает, что значит «я радуюсь», «я сердит», «я добрый». Остаются самолюбие и самооценка.', { left: 140, top: 612, width: 800, fontSize: 30 });
      s.lines(p2, 8.4, { stagger: 0.08 });
      [['я радуюсь', 1010, 590], ['я сердит', 1150, 786], ['я добрый', 960, 786]].forEach(function (w, i) {
        var e = s.otext('note', w[0], { left: w[1], top: w[2], color: DEEP, fontWeight: 650 });
        s.fade(e, 9.6 + i * 0.4, { y: 6 });
      });
      var cite = s.text('cite', 'Л. С. Выготский, лекция 1933/34 года', { left: 140, top: 790 });
      s.fade(cite, 11.0, { y: 6 });
    }
  });

  // 3:42,5 — Один перелом — две науки (Ш. Уайт, 1965; А. Самерофф, М. Хейт, 1996; Б. Рогофф и др., 1975)
  Film.scene({
    id: 'shift', bars: 5,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4); s.actor('obj', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Две традиции', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Один перелом — две науки', { left: 140, top: 186, width: 1100 });
      s.lines(h, 0.2);
      s.range(60, 84, 0.6, 1.0);
      var p1 = s.text('lead', 'Перелом 5–7 лет описывают и на Западе — его отмечают психологи, нейробиологи и антропологи.', { left: 140, top: 330, width: 800, fontSize: 30 });
      s.lines(p1, 0.8, { stagger: 0.08 });
      // две подписи сходятся к отрезку 5–7 на шкале
      var ov = s.over();
      var mid = (s.mx(60) + s.mx(84)) / 2;
      var L1 = s.otext('label', 'кризис семи лет<br><span class="soft" style="font-weight:500">Л. С. Выготский</span>', { left: 140, top: 720, width: 420, fontSize: 26 });
      var L2 = s.otext('label', '<span class="term">«сдвиг 5–7 лет»<span class="en">five-to-seven shift</span></span><br><span class="soft" style="font-weight:500">Ш. Уайт, 1965</span>', { left: 1380, top: 720, width: 400, fontSize: 26 });
      s.fade(L1, 1.6, { y: 8 }); s.fade(L2, 2.0, { y: 8 });
      s.sk(ov, [[440, 772], [820, 860], [mid - 24, s.RY - 22]], { at: 2.4, dur: 0.8, seed: 951, color: ORANGE, width: 4 });
      s.sk(ov, [[1370, 790], [1388, 870], [mid + 16, s.RY - 22]], { at: 2.6, dur: 0.8, seed: 953, color: ORANGE, width: 4 });
      var sh = s.text('note', '«Возраст разума и ответственности» — А. Самерофф, М. Хейт, 1996', { left: 140, top: 470, width: 800 });
      s.fade(sh, 3.4, { y: 6 });
      // Рогофф: 50 культур, 27 сфер, в 16 — новые обязанности в 5–7 лет
      var cap = s.text('small-caps', '50 культур · 27 сфер жизни', { left: 1010, top: 330 });
      s.fade(cap, 5.0, { y: 6 });
      var g = s.svg();
      for (var i = 0; i < 27; i++) {
        var x = 1010 + (i % 9) * 56, y = 380 + Math.floor(i / 9) * 56;
        var on = i < 16;
        var sq = s.node(g, 'rect', { x: x, y: y, width: 42, height: 42, rx: 8, fill: on ? ORANGE : '#E7E2DA', opacity: 0 });
        s.tween(sq, 5.2 + i * 0.04, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3 });
      }
      var rg = s.text('body', 'В 16 из 27 сфер новые обязанности детям чаще всего дают в 5–7 лет.', { left: 1010, top: 560, width: 760, fontSize: 26 });
      s.lines(rg, 6.8, { stagger: 0.08 });
      var rc = s.text('cite', 'Б. Рогофф и др., 1975', { left: 1010, top: 640 });
      s.fade(rc, 7.6, { y: 6 });
    }
  });

  // 3:55 — Главное новообразование: внутренняя позиция школьника (Л. И. Божович, 1968); палочка → карандаш
  Film.scene({
    id: 'school', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Главное новообразование возраста', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Внутренняя позиция школьника', { left: 140, top: 186, width: 1600 });
      s.lines(h, 0.2);
      s.range(36, 84, 0.3, 1.2);
      var p1 = s.text('lead', 'Линии возраста сходятся: к 6–7 годам ребёнок хочет учиться всерьёз — занять место школьника.', { left: 140, top: 330, width: 760, fontSize: 32 });
      s.lines(p1, 0.8, { stagger: 0.08 });
      var c1 = s.text('cite', 'Л. И. Божович, 1968', { left: 140, top: 470 });
      s.fade(c1, 1.8, { y: 6 });

      var CX = 1380, CY = 600;
      s.actor('baby', { x: CX, y: CY, d: 110, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.5, 0.6);
      s.face('baby', true, 0.6, 0.3); s.mouth('baby', 'smile', 0.6, 0.01); s.gaze('baby', 0, -2, 0.6, 0.01);
      var g = s.svg();
      var nodes = [['я в роли', 'часовой', -90], ['я представляю', 'палочка', -18], ['я понимаю другого', 'Макси', 54], ['я выбираю', 'конфета', 126], ['я по правилам', 'игра с правилами', 198]];
      nodes.forEach(function (n, i) {
        var a = n[2] * Math.PI / 180, R = 250;
        var x = CX + R * Math.cos(a), y = CY + R * Math.sin(a) * 0.86;
        var ln = s.path(g, 'M' + x + ' ' + y + ' L' + (CX + 70 * Math.cos(a)) + ' ' + (CY + 70 * Math.sin(a)), { stroke: '#F6C27A', 'stroke-width': 3 });
        s.draw(ln, 1.6 + i * 0.3, { dur: 0.6 });
        var dot = s.node(g, 'circle', { cx: x, cy: y, r: 9, fill: ORANGE, opacity: 0 });
        s.tween(dot, 1.6 + i * 0.3, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        var right = Math.cos(a) >= -0.1;
        var lb = s.text('label', n[0] + '<br><span class="soft" style="font-weight:500; font-size: 21px">' + n[1] + '</span>', { left: right ? x + 18 : x - 238, top: y - 22, width: 220, textAlign: right ? 'left' : 'right', fontSize: 25 });
        s.fade(lb, 1.8 + i * 0.3, { y: 6 });
      });
      // палочка → карандаш; клетка тетради — тизер следующего эпизода
      var ov = s.over();
      var stick = s.path(ov, 'M' + (CX + 60) + ' ' + (CY + 70) + ' L' + (CX + 150) + ' ' + (CY - 30), { stroke: STICK, 'stroke-width': 11 });
      s.tween(stick, 4.4, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      s.tween(stick, 6.4, { opacity: 1 }, { opacity: 0, duration: 0.5 });
      var pen = s.node(ov, 'g', {});
      s.sk(pen, [[CX + 54, CY + 64], [CX + 136, CY - 26], [CX + 150, CY - 14], [CX + 68, CY + 76], [CX + 54, CY + 64]], { at: 6.4, dur: 0.6, seed: 971, color: ORANGE, width: 4.5 });
      s.sk(pen, [[CX + 54, CY + 64], [CX + 44, CY + 88], [CX + 68, CY + 76]], { at: 6.9, dur: 0.3, seed: 973, width: 4.5 });
      s.mouth('baby', 'smile', 6.6, 0.2); s.squash('baby', 0.94, 1.08, 6.8, 0.3); s.squash('baby', 1, 1, 7.1, 0.4, 'back.out(3)');
      var grid = s.node(g, 'g', { opacity: 0 });
      for (var gx = 1000; gx <= 1780; gx += 40) s.path(grid, 'M' + gx + ' 300 V 880', { stroke: '#C9D8E6', 'stroke-width': 1.5 });
      for (var gy = 300; gy <= 880; gy += 40) s.path(grid, 'M1000 ' + gy + ' H 1780', { stroke: '#C9D8E6', 'stroke-width': 1.5 });
      s.tween(grid, 7.4, { opacity: 0 }, { opacity: 0.55, duration: 1.0 });
      s.tween(grid, 11.6, { opacity: 0.55 }, { opacity: 0, duration: 1.2 });
      var p2 = s.text('body', 'Палочка становится карандашом: следующая игра — по правилам школы.', { left: 140, top: 560, width: 760, fontSize: 28 });
      s.lines(p2, 7.6, { stagger: 0.08 });
    }
  });

  // 4:10 — Что запомнить: «паспорт возраста» (восемь строк с эпизода 3–7)
  Film.scene({
    id: 'summary', bars: 7,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Стремление жить общей жизнью со взрослыми — через игру'],
        ['Ведущая деятельность', 'Сюжетно-ролевая игра <span class="by">· Д. Б. Эльконин</span>'],
        ['Доминирующая функция', 'Память <span class="by">· Л. С. Выготский</span>'],
        ['Новообразования', 'Внутренняя позиция школьника — главное; произвольность, соподчинение мотивов'],
        ['Кризис', 'Семи лет: утрата непосредственности'],
        ['Э. Эриксон', 'Инициатива против вины'],
        ['Ж. Пиаже', 'Дооперациональная стадия: символ есть, обратимости ещё нет'],
        ['Ключевые исследования', 'Теория психического — около 4 лет; переключение правил — к 5; <span style="white-space:nowrap">«сдвиг 5–7 лет»</span>']
      ];
      var col = s.div('', { left: 140, top: 300, width: 1640, display: 'flex', flexDirection: 'column', gap: '0px' });
      rows.forEach(function (r, i) {
        var row = Film.el('div', 'passport-row', col);
        row.style.padding = '12px 0 12px';
        Film.el('div', 'passport-k', row, r[0]);
        var v = Film.el('div', 'passport-v', row, r[1]);
        v.style.fontSize = '29px';
        s.fade(row, 0.8 + i * 0.85, { y: 10, dur: 0.7 });
      });
    }
  });

  // 4:27,5 — Финал: мир эпизода вокруг ребёнка-«режиссёра», цитата из лекции, знак, карта курса и анонс
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      var CX = 960, CY = 190;
      s.actor('baby', { x: CX, y: CY, d: 84, o: 0 }, 0.0, 0.01);
      s.actor('baby', { o: 1 }, 0.2, 0.8);
      s.face('baby', true, 0.3, 0.3); s.mouth('baby', 'smile', 0.3, 0.01); s.gaze('baby', 0, -2, 0.3, 0.01);
      var ov = s.over(), SK = Film.sketch, items = [];
      function item(ax, ay) { var it = s.node(ov, 'g', {}); items.push([it, ax]); return it; }
      function at(ax, ay, pts, k) { return pts.map(function (p) { return [ax + p[0] * (k || 1), ay + p[1] * (k || 1)]; }); }
      // лошадь (как в прологе)
      var hz = item(-1);
      SK.stroke(s, hz, at(CX - 330, CY + 30, [[0, 0], [23, -46], [53, -80], [99, -92], [141, -80], [161, -54], [143, -34], [95, -32], [63, -16], [39, 16], [13, 42]], 0.62), { seed: 981 });
      SK.stroke(s, hz, at(CX - 330, CY + 30, [[29, -58], [13, -46], [23, -34], [1, -26], [13, -10]], 0.62), { seed: 982, color: ORANGE, width: 4.5 });
      s.path(hz, 'M' + (CX - 380) + ' ' + (CY + 90) + ' L' + (CX - 330) + ' ' + (CY + 30), { stroke: STICK, 'stroke-width': 8 });
      // пилотка часового
      var cp = item(-1);
      SK.stroke(s, cp, at(CX - 190, CY - 70, [[-40, 20], [-24, -6], [0, -16], [24, -6], [40, 20], [0, 26], [-40, 20]]), { seed: 983 });
      SK.stroke(s, cp, [[CX - 190, CY - 66], [CX - 189, CY - 65]], { seed: 984, color: ORANGE, width: 9 });
      // стетоскоп
      var st = item(-1);
      SK.stroke(s, st, at(CX - 150, CY + 70, [[-22, -24], [-16, 8], [0, 18], [16, 8], [22, -24]]), { seed: 985 });
      SK.stroke(s, st, Film.circ(CX - 126, CY + 104, 9, 10), { seed: 986, color: ORANGE });
      // мысль Макси: облако со шкафом и шоколадкой
      var th = item(1);
      SK.stroke(s, th, Film.circ(CX + 190, CY - 60, 44, 18), { seed: 987 });
      SK.stroke(s, th, at(CX + 190, CY - 60, [[-20, -16], [20, -16], [20, 18], [-20, 18], [-20, -16]]), { seed: 988, color: '#A77A12' });
      SK.stroke(s, th, at(CX + 190, CY - 60, [[-8, -4], [8, -4], [8, 6], [-8, 6], [-8, -4]]), { seed: 989, color: ORANGE, width: 4.5 });
      // ракета-замысел
      var rk = item(1);
      SK.stroke(s, rk, at(CX + 330, CY + 40, [[-18, 40], [0, -36], [18, 40], [-18, 40]]), { seed: 990, color: ORANGE, width: 4.5 });
      SK.stroke(s, rk, at(CX + 330, CY + 40, [[-18, 40], [-30, 56], [-12, 46]]), { seed: 991, color: ORANGE });
      SK.stroke(s, rk, at(CX + 330, CY + 40, [[18, 40], [30, 56], [12, 46]]), { seed: 992, color: ORANGE });
      // карандаш
      var pc = item(1);
      SK.stroke(s, pc, at(CX + 160, CY + 80, [[0, 0], [90, -40], [98, -26], [8, 14], [0, 0]]), { seed: 993, color: ORANGE, width: 4.5 });
      SK.stroke(s, pc, at(CX + 160, CY + 80, [[0, 0], [-16, 16], [8, 14]]), { seed: 994 });
      items.forEach(function (it, i) {
        var fx = it[1] * 460, fy = 140 + (i % 3) * 50;
        s.tween(it[0], 0.3 + i * 0.12, { x: fx, y: fy, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' });
      });
      var q = s.text('quote', '«Ребёнок выступает режиссёром игры: через предметы он ставит сцены, которые задевают его душу, и проживает внутри то, что ему важно. Он режиссёр, демиург, постановщик».', { left: 210, top: 330, width: 1500, textAlign: 'center', fontSize: 44 });
      s.lines(q, 0.9, { stagger: 0.14, dur: 1.2 });
      var c = s.text('cite', 'из лекции курса «Психология развития» о дошкольном возрасте', { left: 360, top: 548, width: 1200, textAlign: 'center' });
      s.fade(c, 2.6, { y: 6 });

      s.rulerOut(3.0);
      s.brandOut(3.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 224, top: 614, height: 110 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 3.8, { y: 10, dur: 1.0 });
      var sub = s.text('small-caps', 'Психология развития', { left: 0, top: 744, width: 1920, textAlign: 'center', fontSize: 21 });
      s.fade(sub, 4.3, { y: 6 });

      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 4.4);
      s.mapNext(M, 6.0);
      var nx = s.CFG.series.next, nxX = M.x(nx) + M.segW / 2;
      var ann = s.text('note', 'Далее: младший школьный возраст, 7–10 лет', { left: nxX - 340, top: s.RY - 70, width: 680, textAlign: 'center', color: '#1C7A71', fontWeight: 650 });
      s.fade(ann, 6.3, { y: 6 });

      s.actor('baby', { o: 0 }, 11.1, 0.8, 'power2.in');
    }
  });
})();
