/* Часть 4. На пороге школы · кризис семи лет: кризис, «сдвиг 5–7», внутренняя позиция школьника; итог и финал */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ORANGE = '#FB8C00', DEEP = '#A65300', STICK = '#8B6A45', MUTE = '#8A8F90';

  // 3:32,5 — заставка части
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

  // 3:35 — Кризис семи лет (Л. С. Выготский)
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

  // 3:50 — Рубеж 5–7 лет видят и другие науки: антропология (Б. Рогофф и др., 1975) и нейробиология
  Film.scene({
    id: 'border', bars: 5,
    build: function (s) {
      s.actor('baby', { o: 0 }, 0.0, 0.4); s.actor('obj', { o: 0 }, 0.0, 0.4);
      var k = s.text('kicker', 'Не только психология', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Рубеж 5–7 лет видят и другие науки', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);
      s.range(60, 84, 0.6, 1.0);
      var g = s.svg(), ov = s.over();
      var div = s.path(g, 'M960 330 V 800', { stroke: '#CDC3B4', 'stroke-width': 2, 'stroke-dasharray': '4 10' });
      s.dash(div, 0.8, { dur: 0.6 });
      var L = 140, R = 1020;
      // антропология: старший ведёт младшего — детям начинают доверять
      var la = s.text('small-caps', 'Антропология', { left: L, top: 330, color: DEEP });
      s.fade(la, 0.8, { y: 6 });
      s.actor('kid2', { x: 300, y: 500, d: 88, o: 0 }, 1.0, 0.01); s.actor('kid2', { o: 1 }, 1.1, 0.4);
      s.actor('kid3', { x: 220, y: 522, d: 52, o: 0 }, 1.0, 0.01); s.actor('kid3', { o: 1 }, 1.2, 0.4);
      s.face('kid2', true, 1.1, 0.3); s.mouth('kid2', 'smile', 1.1, 0.01); s.gaze('kid2', 8, -2, 1.1, 0.01);
      s.face('kid3', true, 1.2, 0.3); s.mouth('kid3', 'smile', 1.2, 0.01); s.gaze('kid3', 8, -4, 1.2, 0.01);
      var hand = s.node(ov, 'g', {});
      s.sk(hand, [[244, 530], [262, 536], [270, 528]], { at: 1.5, dur: 0.3, seed: 951, width: 3.6 });
      [2.41, 3.035, 3.66, 4.285].forEach(function (t) {
        s.hop('kid2', s.A.kid2.st.x + 80, 500, t, 0.32, 20);
        s.hop('kid3', s.A.kid3.st.x + 80, 522, t, 0.32, 14);
        Film.ride(s, hand, 80, t, 0.32, 17);
      });
      var at = s.text('body', '50 культур: в 16 из 27 сфер жизни новые роли и обязанности детям чаще всего дают именно в 5–7 лет — ребёнку начинают доверять и всерьёз учить.', { left: L, top: 600, width: 780, fontSize: 27 });
      s.lines(at, 1.4, { stagger: 0.08 });
      var ac = s.text('cite', 'Б. Рогофф и др., 1975', { left: L, top: 770 });
      s.fade(ac, 2.6, { y: 6 });
      // нейробиология: мозг, лобная кора
      var na = s.text('small-caps', 'Нейробиология', { left: R, top: 330, color: DEEP });
      s.fade(na, 5.0, { y: 6 });
      Film.icons.brain(s, ov, R + 260, 470, 1.45, { at: 5.4, dur: 1.0, seed: 961, lobe: 6.5 });
      var lb = s.otext('label', 'лобная кора', { left: R + 400, top: 360, fontSize: 24, color: DEEP });
      s.fade(lb, 6.8, { y: 4 });
      s.sk(ov, [[R + 396, 384], [R + 372, 404]], { at: 6.8, dur: 0.2, seed: 965, width: 3, color: DEEP });
      var nt = s.text('body', 'К 6 годам мозг почти взрослого размера — около 95 %. Медленнее всего созревает лобная кора — «пульт управления» поведением: она помогает сдерживаться и переключаться.', { left: R, top: 600, width: 760, fontSize: 27 });
      s.lines(nt, 6.0, { stagger: 0.08 });
      var nc = s.text('cite', 'Р. Ленрут, Дж. Гидд, 2006; А. Даймонд, 2013', { left: R, top: 770 });
      s.fade(nc, 7.2, { y: 6 });
      s.event('рубеж 5–7 лет', 72, 9.0);
      s.actor('kid2', { o: 0 }, 11.8, 0.4); s.actor('kid3', { o: 0 }, 11.8, 0.4);
    }
  });

  // 4:02,5 — Главное новообразование: внутренняя позиция школьника (Л. И. Божович, 1968)
  Film.scene({
    id: 'school', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Главное новообразование возраста', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Внутренняя позиция школьника', { left: 140, top: 186, width: 1600 });
      s.lines(h, 0.2);
      s.range(36, 84, 0.3, 1.2);
      var p1 = s.text('lead', 'Линии возраста сходятся: к 6–7 годам ребёнок хочет в школу — и уже не только ради ранца. Он хочет учиться всерьёз и занять место школьника.', { left: 140, top: 330, width: 760, fontSize: 32 });
      s.lines(p1, 0.8, { stagger: 0.08 });
      var c1 = s.text('cite', 'Л. И. Божович, 1968', { left: 140, top: 520 });
      s.fade(c1, 2.0, { y: 6 });

      var CX = 1380, CY = 600;
      s.actor('baby', { x: CX, y: CY, d: 110, o: 0 }, 0.4, 0.01);
      s.actor('baby', { o: 1 }, 0.5, 0.6);
      s.face('baby', true, 0.6, 0.3); s.mouth('baby', 'smile', 0.6, 0.01); s.gaze('baby', 0, -2, 0.6, 0.01);
      var g = s.svg(), star = s.node(g, 'g', {}), starL = [];
      var nodes = [['я в роли', 'часовой', -90], ['я представляю', 'палочка-лошадка', -18], ['я понимаю другого', 'Макси', 54], ['я выбираю', 'горькая конфета', 126], ['я по правилам', 'игра с правилами', 198]];
      nodes.forEach(function (n, i) {
        var a = n[2] * Math.PI / 180, R = 250;
        var x = CX + R * Math.cos(a), y = CY + R * Math.sin(a) * 0.86;
        var ln = s.path(star, 'M' + x + ' ' + y + ' L' + (CX + 70 * Math.cos(a)) + ' ' + (CY + 70 * Math.sin(a)), { stroke: '#F6C27A', 'stroke-width': 3 });
        s.draw(ln, 1.6 + i * 0.3, { dur: 0.6 });
        var dot = s.node(star, 'circle', { cx: x, cy: y, r: 9, fill: ORANGE, opacity: 0 });
        s.tween(dot, 1.6 + i * 0.3, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
        var right = Math.cos(a) >= -0.1;
        var lb = s.text('label', n[0] + '<br><span class="soft" style="font-weight:500; font-size: 21px">' + n[1] + '</span>', { left: right ? x + 18 : x - 238, top: y - 22, width: 220, textAlign: right ? 'left' : 'right', fontSize: 25 });
        s.fade(lb, 1.8 + i * 0.3, { y: 6 });
        starL.push(lb);
      });
      s.out(star, 5.4, { dur: 0.4 }); starL.forEach(function (e) { s.out(e, 5.4, { dur: 0.4 }); });
      // с ранцами — в школу
      var TOY = Film.toys, Y = 724;
      var kids = [['baby', 1120, 96, '#26A69A', '#1C7A71'], ['kid2', 990, 90, '#4A7FB0', '#2F5E8A'], ['kid3', 870, 86, '#E0A930', '#A77A12']];
      s.actor('baby', { x: 1120, y: Y, d: 96 }, 5.6, 0.7, 'power3.inOut');
      kids.forEach(function (kd, i) {
        var bp = s.node(g, 'g', {});
        TOY.backpack(s, bp, kd[1] - kd[2] * 0.42, Y - 4, kd[2] / 110, kd[3], kd[4]);
        if (i) {
          s.actor(kd[0], { x: kd[1], y: Y, d: kd[2], o: 0 }, 6.2, 0.01);
          s.actor(kd[0], { o: 1 }, 6.3 + i * 0.1, 0.4);
          s.face(kd[0], true, 6.3, 0.3); s.mouth(kd[0], 'smile', 6.3, 0.01); s.gaze(kd[0], 8, -2, 6.3, 0.01);
        }
        s.tween(bp, 6.25 + i * 0.1, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
        [7.41, 8.66, 9.91].forEach(function (t) {
          s.hop(kd[0], s.A[kd[0]].st.x + 110, Y, t, 0.5, 30);
          Film.ride(s, bp, 110, t, 0.5, 30);
        });
      });
      s.gaze('baby', 8, -2, 6.0, 0.3);
      var ov = s.over();
      Film.icons.school(s, ov, 1665, 800, 0.74, { at: 6.6, dur: 1.0, seed: 975 });
      var bell = s.node(ov, 'g', {});
      Film.icons.bell(s, bell, 1772, 640, 0.5, { at: 10.9, dur: 0.3, seed: 979 });
      [11.3, 11.5, 11.7].forEach(function (t, j) { s.tween(bell, t, { rotation: j % 2 ? 14 : -14 }, { rotation: j % 2 ? -14 : 14, duration: 0.2, svgOrigin: '1772 620' }); });
      s.tween(bell, 11.9, { rotation: -14 }, { rotation: 0, duration: 0.2, svgOrigin: '1772 620' });
      kids.forEach(function (kd) { s.squash(kd[0], 0.92, 1.1, 11.3, 0.15); s.squash(kd[0], 1, 1, 11.45, 0.4, 'back.out(3)'); });
      var p2 = s.text('body', 'Впереди — школа: большая игра по правилам на много лет.', { left: 140, top: 600, width: 760, fontSize: 30 });
      s.lines(p2, 6.4, { stagger: 0.08 });
    }
  });

  // 4:17,5 — Что запомнить: «паспорт возраста» (семь строк); фамилии — в одной колонке справа
  Film.scene({
    id: 'summary', bars: 5,
    build: function (s) {
      ['baby', 'kid2', 'kid3'].forEach(function (id) { s.actor(id, { o: 0 }, 0.0, 0.4); });
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Хочет жить общей жизнью со взрослыми — и делает это в игре', ''],
        ['Ведущая деятельность', 'Сюжетно-ролевая игра', 'Д. Б. Эльконин'],
        ['Доминирующая функция', 'Память', 'Л. С. Выготский'],
        ['Новообразования', 'Внутренняя позиция школьника — главное; произвольность, соподчинение мотивов', ''],
        ['Кризис', 'Семи лет: утрата непосредственности', 'Л. С. Выготский'],
        ['Психосоциальная стадия', 'Инициатива против вины', 'Э. Эриксон'],
        ['Стадия мышления', 'Дооперациональная: символ есть, обратимости ещё нет', 'Ж. Пиаже']
      ];
      var col = s.div('', { left: 140, top: 310, width: 1640, display: 'flex', flexDirection: 'column', gap: '0px' });
      rows.forEach(function (r, i) {
        var row = Film.el('div', 'passport-row', col);
        row.style.padding = '14px 0 14px';
        var kk = Film.el('div', 'passport-k', row, r[0]);
        kk.style.width = '420px';
        var v = Film.el('div', 'passport-v', row, r[1]);
        v.style.fontSize = '29px'; v.style.flex = '1';
        Film.el('div', 'passport-a', row, r[2]);
        s.fade(row, 0.8 + i * 0.8, { y: 10, dur: 0.7 });
      });
    }
  });

  // 4:30 — Финал: рисованный мир эпизода собирается вокруг ребёнка-«режиссёра»; цитата из лекции
  Film.scene({
    id: 'outro', bars: 4,
    build: function (s) {
      s.rulerOut(0.3);
      var CX = 960, CY = 318;
      s.actor('baby', { x: CX, y: CY, d: 100, o: 0 }, 0.0, 0.01);
      s.actor('baby', { o: 1 }, 0.2, 0.6);
      s.face('baby', true, 0.3, 0.3); s.mouth('baby', 'smile', 0.3, 0.01); s.gaze('baby', 0, -2, 0.3, 0.01);
      var ov = s.over(), IC = Film.icons, wrap = s.node(ov, 'g', { transform: 'translate(0 50)' });
      // значки — те же, что в сценах эпизода; рисуются на глазах и слетаются к ребёнку
      var items = [
        [-1, function (g, at) { IC.bear(s, g, 560, 250, 1.15, { at: at, dur: 0.8, seed: 981 }); }],
        [-1, function (g, at) { IC.bag(s, g, 752, 120, 1.0, { at: at, dur: 0.7, seed: 983 }); }],
        [-1, function (g, at) { IC.horse(s, g, 742, 388, 0.74, { at: at, dur: 0.8, seed: 985, stick: 110 }); }],
        [1, function (g, at) { IC.cloud(s, g, 1170, 132, 98, 62, { at: at, dur: 0.7, seed: 987, tail: [1016, 232] }); IC.choc(s, g, 1170, 130, 0.7, { at: at + 0.4, dur: 0.4, seed: 989 }); }],
        [1, function (g, at) { IC.candy(s, g, 1370, 262, 1.2, { at: at, dur: 0.6, seed: 991 }); }],
        [1, function (g, at) { IC.rocket(s, g, 1196, 372, 0.98, { at: at, dur: 0.7, seed: 993 }); }]
      ];
      items.forEach(function (it, i) {
        var g = s.node(wrap, 'g', {}), at = 0.35 + i * 0.16;
        it[1](g, at);
        s.tween(g, at, { x: it[0] * 140 }, { x: 0, duration: 1.0, ease: 'power3.out' });
        s.tween(g, 2.0, { y: 0 }, { y: i % 2 ? -7 : 7, duration: 7.5, ease: 'sine.inOut' });
      });
      s.squash('baby', 0.94, 1.08, 1.6, 0.2); s.squash('baby', 1, 1, 1.8, 0.4, 'back.out(3)');
      s.gaze('baby', -7, -3, 2.6, 0.5); s.gaze('baby', 7, -3, 4.2, 0.5); s.gaze('baby', 0, -2, 5.8, 0.5);
      var q = s.text('quote', '«Ребёнок выступает режиссёром игры: через предметы он ставит сцены, которые задевают его душу, и проживает внутри то, что ему важно».', { left: 210, top: 572, width: 1500, textAlign: 'center', fontSize: 44 });
      s.lines(q, 1.0, { stagger: 0.14, dur: 1.2 });
      var c = s.text('cite', 'из лекции курса «Психология развития» о дошкольном возрасте', { left: 360, top: 776, width: 1200, textAlign: 'center' });
      s.fade(c, 2.6, { y: 6 });
    }
  });

  // 4:40 — Приходите на курс: QR-коды курса и телеграм-канала; карта курса и анонс; ребёнок «переходит» к 7–10
  Film.scene({
    id: 'final', bars: 4, hold: true,
    build: function (s) {
      s.brandOut(0.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 196, top: 92, height: 96 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 0.3, { y: 10, dur: 0.9 });
      var h = s.text('h2', 'Приходите на курс', { left: 0, top: 220, width: 1920, textAlign: 'center' });
      s.lines(h, 0.8);
      var QR = window.FILM_QR || {};
      [['course', 'Курс «Психология развития»', 'academydom.com/vozrast', 530], ['tg', 'Телеграм-канал', 't.me/AlexeiZykov', 1010]].forEach(function (c, i) {
        var card = s.div('card', { left: c[3], top: 350, width: 380, height: 452 });
        var q = QR[c[0]];
        if (q) {
          var sv = Film.svg('svg', { width: 290, height: 290, viewBox: '0 0 ' + q.n + ' ' + q.n, 'shape-rendering': 'crispEdges' }, card);
          sv.style.position = 'absolute'; sv.style.left = '45px'; sv.style.top = '35px';
          Film.svg('path', { d: q.d, fill: '#1D2733' }, sv);
        }
        var t = Film.el('div', 'label', card, c[1]);
        Film.css(t, { position: 'absolute', left: 0, top: 344, width: 380, textAlign: 'center', fontSize: 25 });
        var u = Film.el('div', 'note', card, c[2]);
        Film.css(u, { position: 'absolute', left: 0, top: 384, width: 380, textAlign: 'center', fontSize: 23, color: '#A65300', fontWeight: 650 });
        s.fade(card, 1.4 + i * 0.3, { y: 16, dur: 0.7 });
      });
      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 0.4);
      var cur = s.CFG.series.current, nx = s.CFG.series.next;
      var cx = M.x(cur) + M.segW / 2, nxX = M.x(nx) + M.segW / 2, Y = s.RY - 24;
      s.actor('baby', { x: cx, y: Y, d: 40 }, 0.2, 1.1, 'power2.inOut');
      s.mapNext(M, 5.6);
      s.hop('baby', nxX, Y, 5.91, 0.5, 60);
      s.gaze('baby', 6, -2, 5.6, 0.3);
      var ann = s.text('note', 'Далее: младший школьный возраст, 7–10 лет', { left: nxX - 340, top: s.RY - 92, width: 680, textAlign: 'center', color: '#1C7A71', fontWeight: 650 });
      s.fade(ann, 6.3, { y: 6 });
    }
  });
})();
