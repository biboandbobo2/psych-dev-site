/* Часть 4. Я сам · 2,5–3 года: горшок, автономия, кризис трёх лет, рождение «Я»; итог и финал */
/* global Film */
(function () {
  'use strict';
  var INK = '#1D2733', ACC = '#5C6BC0';

  // 2:50 — заставка части
  Film.scene({
    id: 'ch4', bars: 1,
    build: function (s) {
      s.chapterCard(4, 'Я сам', '2,5–3 года');
      s.range(30, 36, 0.15, 1.3);
      s.age(30, 0.2, 1.3, 2);
      Film.walk(s, 24, 30, 0.2);
      s.chapter(4, 'Я сам', 0.4, 65);
    }
  });

  // 2:52,5 — Горшок: Фрейд → как принято понимать сейчас
  Film.scene({
    id: 'potty', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Приучение к горшку', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Контроль над телом', { left: 140, top: 186, width: 1400 });
      s.lines(h, 0.2);
      var cards = [
        { x: 140, t: 0.9, who: 'З. Фрейд', title: 'Анальная стадия', body: 'Удовольствие и конфликт — вокруг контроля над телом. Строгость приучения, по Фрейду, оставляет след в характере.', cite: 'педантичность, упрямство — «анальный характер»' },
        { x: 990, t: 5.2, who: 'Как понимают сейчас', title: 'Дело готовности', body: 'Начинать, когда ребёнок готов, — обычно после 18–24 месяцев, без стыда и наказаний. Днём дети справляются в среднем к 3 годам.', cite: 'раннее «натаскивание» не ускоряет итог (Н. Блум и др., 2003)' }
      ];
      cards.forEach(function (c) {
        var card = s.div('card', { left: c.x, top: 330, width: 790, height: 470 });
        s.fade(card, c.t, { y: 24 });
        var kk = s.text('kicker muted', c.who, { left: c.x + 50, top: 372 });
        s.fade(kk, c.t + 0.2, { y: 6 });
        var ti = s.text('h3', c.title, { left: c.x + 50, top: 414, width: 690 });
        s.lines(ti, c.t + 0.3);
        var bo = s.text('body', c.body, { left: c.x + 50, top: 490, width: 690, fontSize: 30 });
        s.lines(bo, c.t + 0.6, { stagger: 0.09 });
        var ci = s.text('note', c.cite, { left: c.x + 50, top: 700, width: 690, fontSize: 23 });
        s.fade(ci, c.t + 1.6, { y: 6 });
      });
      var g = s.svg();
      var ar = s.path(g, 'M936 565 H984', { stroke: ACC, 'stroke-width': 4 });
      var ah = s.path(g, 'M972 554 L986 565 L972 576', { stroke: ACC, 'stroke-width': 4 });
      s.draw(ar, 4.9, { dur: 0.35 }); s.fade(ah, 5.2, { y: 0, dur: 0.2 });
    }
  });

  // 3:07,5 — Почему это важно: автономия против стыда и сомнения (Э. Эриксон) + данные о поддержке автономии
  Film.scene({
    id: 'erikson', bars: 6,
    build: function (s) {
      var k = s.text('kicker', 'Э. Эриксон · современные исследования', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Автономия против стыда и сомнения', { left: 140, top: 186, width: 1640 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Горшок — одна из первых областей, где ребёнок управляет собой сам: «удерживать и отпускать».', { left: 140, top: 318, width: 1640, fontSize: 34 });
      s.lines(ld, 0.9, { stagger: 0.1 });

      var rows = [
        { y: 440, t: 3.0, text: 'Взрослый даёт попробовать и поддерживает: «Сам? Давай!»', out: 'автономия · воля', on: true },
        { y: 590, t: 5.6, text: 'Взрослый торопит, стыдит, всё делает за ребёнка.', out: 'стыд · сомнение в себе', on: false }
      ];
      var g = s.svg();
      rows.forEach(function (r) {
        var cy = r.y + 44;
        var ic = s.node(g, 'g', {});
        if (r.on) {
          s.node(ic, 'circle', { cx: 180, cy: cy - 8, r: 30, fill: '#385771' });
          s.node(ic, 'circle', { cx: 262, cy: cy + 8, r: 22, fill: '#E4735A' });
          s.node(ic, 'rect', { x: 292, y: cy + 4, width: 24, height: 24, rx: 5, fill: '#E0A930' });
        } else {
          s.node(ic, 'circle', { cx: 238, cy: cy + 8, r: 22, fill: '#E4735A' });
          s.node(ic, 'circle', { cx: 272, cy: cy - 10, r: 34, fill: '#385771' });
          s.node(ic, 'rect', { x: 300, y: cy - 34, width: 24, height: 24, rx: 5, fill: '#E0A930' });
        }
        s.fade(ic, r.t, { y: 10 });
        var tx = s.text('lead', r.text, { left: 360, top: r.y + 12, width: 820, fontSize: 32 });
        s.lines(tx, r.t + 0.15);
        var ar = s.path(g, 'M1208 ' + cy + ' H1300', { stroke: r.on ? ACC : '#9A948C', 'stroke-width': 4 });
        var ah = s.path(g, 'M1288 ' + (cy - 11) + ' L1302 ' + cy + ' L1288 ' + (cy + 11), { stroke: r.on ? ACC : '#9A948C', 'stroke-width': 4 });
        s.draw(ar, r.t + 1.1, { dur: 0.4 }); s.fade(ah, r.t + 1.4, { y: 0, dur: 0.2 });
        var ch = s.div('chip' + (r.on ? ' on' : ''), { left: 1330, top: r.y + 15, fontSize: 30 }, null, r.out);
        if (!r.on) { ch.style.background = '#EFEBE4'; ch.style.borderColor = '#D9D0C4'; ch.style.color = '#5F676B'; }
        s.pop(ch, r.t + 1.5, { from: 0.85, dur: 0.5, origin: '0% 50%' });
      });
      var rl = s.div('rule', { left: 140, top: 566, width: 1640 });
      s.grow(rl, 5.2, { dur: 0.8 });
      var rl2 = s.div('rule', { left: 140, top: 730, width: 1640 });
      s.grow(rl2, 8.6, { dur: 0.8 });
      var res = s.text('lead', 'Поддержка самостоятельности в 12–15 месяцев предсказывает лучший самоконтроль к 1,5–2 годам <span class="soft">(А. Бернье, С. Карлсон, Н. Уиппл, 2010)</span>.', { left: 140, top: 756, width: 1640, fontSize: 31, color: '#3C4852' });
      s.lines(res, 9.0, { stagger: 0.1 });
    }
  });

  // 3:22,5 — Кризис трёх лет: «Я сам»
  Film.scene({
    id: 'crisis', bars: 6,
    build: function (s) {
      s.age(36, 0.3, 0.95, 2);
      Film.walk(s, 30, 36, 0.3);
      s.event('~3 года', 36, 1.9);

      var k = s.text('kicker', '~3 года · Л. С. Выготский', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Кризис трёх лет: «Я сам»', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);

      var CX = 1380, CY = 596, R = 190, RL = 238;
      var g = s.svg();
      var v = [], i;
      for (i = 0; i < 7; i++) {
        var a = (-90 + i * 360 / 7) * Math.PI / 180;
        v.push([CX + R * Math.cos(a), CY + R * Math.sin(a), a]);
      }
      var order = [0, 3, 6, 2, 5, 1, 4], d = '';
      order.forEach(function (j, n) { d += (n ? ' L' : 'M') + v[j][0].toFixed(1) + ' ' + v[j][1].toFixed(1); });
      d += ' Z';
      var star = s.path(g, d, { stroke: ACC, 'stroke-width': 2.5, fill: '#EBEDF7', 'fill-opacity': 0 });
      s.draw(star, 2.1, { dur: 1.6, ease: 'power2.inOut' });
      s.tween(star, 3.4, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': 0.7 }, duration: 0.8 });
      var names = ['негативизм', 'упрямство', 'строптивость', 'своеволие', 'протест-бунт', 'обесценивание', 'деспотизм'];
      names.forEach(function (nm, j) {
        var a = v[j][2], x = CX + RL * Math.cos(a), y = CY + RL * Math.sin(a);
        var c = Math.cos(a), st = { top: y - 17, width: 260 };
        if (Math.abs(c) < 0.3) { st.left = x - 130; st.textAlign = 'center'; if (Math.sin(a) < 0) st.top = y - 30; else st.top = y - 4; }
        else if (c > 0) { st.left = x + 4; st.textAlign = 'left'; }
        else { st.left = x - 264; st.textAlign = 'right'; }
        var dt = s.node(g, 'circle', { cx: v[j][0], cy: v[j][1], r: 6, fill: ACC, opacity: 0 });
        s.tween(dt, 2.3 + j * 0.2, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        var e = s.text('label', nm, st);
        e.style.fontSize = '26px'; e.style.color = '#1D2733';
        s.fade(e, 2.4 + j * 0.2, { y: 6 });
      });
      // ребёнок — в центре «семизвездия»
      s.actor('baby', { x: CX, y: CY + 4, d: 104, o: 1 }, 2.6, 1.2);
      s.face('baby', true, 3.4, 0.4); s.mouth('baby', 'flat', 3.4, 0.01); s.gaze('baby', 0, 0, 3.4, 0.01);

      var nt = s.text('note', 'Симптомы описала Э. Кёлер; Л. С. Выготский назвал их «семизвездием».', { left: 140, top: 330, width: 760 });
      s.lines(nt, 4.2, { stagger: 0.08 });
      var q = s.text('quote', '«За всяким негативным симптомом кризиса скрывается позитивное содержание».', { left: 140, top: 452, width: 780, fontSize: 40 });
      s.lines(q, 6.2, { stagger: 0.12 });
      var qc = s.text('cite', 'Л. С. Выготский', { left: 140, top: 614 });
      s.fade(qc, 7.4, { y: 6 });
      var rs = s.text('lead', 'Итог кризиса — <span class="acc">воля, самостоятельность и гордость</span> за свои достижения.', { left: 140, top: 690, width: 780, fontSize: 34 });
      s.lines(rs, 10.0, { stagger: 0.1 });
      s.mouth('baby', 'smile', 10.6, 0.4);
      s.squash('baby', 0.92, 1.1, 10.6, 0.15); s.squash('baby', 1, 1, 10.75, 0.45, 'back.out(3)');

      s.face('baby', false, 13.8, 0.3);
      s.rest(13.8, 1.1);
    }
  });


  // 3:37,5 — Рождение «Я»: линии возраста сходятся
  Film.scene({
    id: 'self', bars: 7,
    build: function (s) {
      var k = s.text('kicker', 'Главное новообразование возраста', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Рождение «Я»', { left: 140, top: 186, width: 900 });
      s.lines(h, 0.2);
      var ld = s.text('lead', 'Линии возраста сходятся в одном: появляется «Я» — внутренний образ себя.', { left: 140, top: 318, width: 800, fontSize: 36 });
      s.lines(ld, 0.9, { stagger: 0.1 });
      var q = s.text('quote', '«Возникновение личного действия и сознания „я сам“… представляют собой новообразования раннего детства».', { left: 140, top: 480, width: 800, fontSize: 36 });
      s.lines(q, 6.0, { stagger: 0.12 });
      var qc = s.text('cite', 'Д. Б. Эльконин', { left: 140, top: 634 });
      s.fade(qc, 7.2, { y: 6 });
      var nt = s.text('note', 'М. Льюис: мысленный образ «меня» складывается к концу второго года. М. Хау и М. Кураж: с ним начинается автобиографическая память.', { left: 140, top: 706, width: 820 });
      s.lines(nt, 10.6, { stagger: 0.08 });

      // пять линий сходятся к «Я»
      var g = s.svg();
      var CX = 1390, CY = 590, RR = 262;
      var nodes = [
        { a: -150, t: 'узнаю себя', sub: 'зеркало' },
        { a: -90, t: 'моё прошлое', sub: 'память' },
        { a: -30, t: 'я сам', sub: 'воля' },
        { a: 30, t: 'мы и они', sub: 'семья' },
        { a: 150, t: 'я говорю', sub: 'речь и символ' }
      ];
      s.actor('baby', { x: CX, y: CY, d: 118, o: 1 }, 1.0, 1.3);
      s.face('baby', true, 1.9, 0.4); s.mouth('baby', 'soft', 1.9, 0.01); s.gaze('baby', 0, 0, 1.9, 0.01);
      nodes.forEach(function (n, i) {
        var a = n.a * Math.PI / 180, x = CX + RR * Math.cos(a), y = CY + RR * Math.sin(a), t = 2.0 + i * 0.5;
        var ln = s.path(g, 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L' + (CX + 78 * Math.cos(a)).toFixed(1) + ' ' + (CY + 78 * Math.sin(a)).toFixed(1), { stroke: '#9FA8DA', 'stroke-width': 3 });
        s.draw(ln, t + 0.25, { dur: 0.6, ease: 'power2.in' });
        var dot = s.node(g, 'circle', { cx: x, cy: y, r: 11, fill: '#5C6BC0', opacity: 0 });
        s.tween(dot, t, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        var st, c = Math.cos(a);
        if (Math.abs(c) < 0.3) st = { left: x - 150, top: y - 88, width: 300, textAlign: 'center' };
        else if (c > 0) st = { left: x + 22, top: y - 26, width: 230, textAlign: 'left' };
        else st = { left: x - 252, top: y - 26, width: 230, textAlign: 'right' };
        var lb = s.text('label', n.t, st);
        lb.style.color = '#1D2733';
        s.fade(lb, t + 0.1, { y: 6 });
        var sb = s.text('note', n.sub, { left: st.left, top: st.top + 34, width: st.width, textAlign: st.textAlign, fontSize: 21 });
        s.fade(sb, t + 0.2, { y: 6 });
      });
      var glow = s.node(g, 'circle', { cx: CX, cy: CY, r: 76, fill: 'none', stroke: '#5C6BC0', 'stroke-width': 4, opacity: 0 });
      s.tween(glow, 4.85, { opacity: 0, attr: { r: 70 } }, { opacity: 1, attr: { r: 86 }, duration: 0.7, ease: 'power2.out' });
      var ya = s.text('display acc', 'Я', { left: CX - 60, top: CY + 76, width: 120, textAlign: 'center', fontSize: 84 });
      s.pop(ya, 5.0, { from: 0.7, dur: 0.7 }); // на сильную долю — вместе с аккордом челесты
      s.mouth('baby', 'smile', 5.0, 0.4);
      s.squash('baby', 0.93, 1.08, 5.0, 0.15); s.squash('baby', 1, 1, 5.15, 0.4, 'back.out(3)');

      s.face('baby', false, 16.0, 0.3);
      s.rest(16.0, 1.2);
    }
  });

  // 3:55 — Что запомнить: «паспорт возраста»
  Film.scene({
    id: 'summary', bars: 7,
    build: function (s) {
      var k = s.text('kicker', 'Итог', { left: 140, top: 150 });
      s.fade(k, 0.1, { y: 8 });
      var h = s.text('h2', 'Что запомнить', { left: 140, top: 186, width: 1000 });
      s.lines(h, 0.2);
      var rows = [
        ['Социальная ситуация', 'Совместная деятельность: ребёнок — предмет — взрослый'],
        ['Ведущая деятельность', 'Предметная (предметно-манипулятивная) <span class="by">· Д. Б. Эльконин</span>'],
        ['Доминирующая функция', 'Восприятие <span class="by">· Л. С. Выготский</span>'],
        ['Новообразования', '«Я» — главное; речь, наглядно-действенное мышление'],
        ['Кризис', 'Трёх лет: «Я сам»'],
        ['Э. Эриксон', 'Автономия против стыда и сомнения'],
        ['Ж. Пиаже', 'Конец сенсомоторной стадии: рождается символ']
      ];
      rows.forEach(function (r, i) {
        var y = 318 + i * 74, t = 0.8 + i * 0.95;
        var row = s.div('passport-row', { left: 140, top: y, width: 1640, paddingTop: 14 });
        Film.el('div', 'passport-k', row, r[0]);
        Film.el('div', 'passport-v', row, r[1]);
        s.fade(row, t, { y: 10, dur: 0.7 });
      });
    }
  });

  // 4:12,5 — Финал: цитата из лекции курса о раннем детстве, знак, карта курса и анонс
  Film.scene({
    id: 'outro', bars: 5,
    build: function (s) {
      s.actor('obj', { x: 904, y: 258, d: 50, o: 0 }, 0.0, 0.01);
      s.actor('obj', { o: 1 }, 0.4, 0.8);
      s.actor('baby', { x: 904, y: 202, d: 62, o: 1 }, 0.3, 1.5);
      s.actor('adult', { x: 1000, y: 216, d: 88, o: 0 }, 0.0, 0.01);
      s.actor('adult', { o: 1 }, 0.5, 1.2);
      var q = s.text('quote', '«Можно предположить, что то, что мы называем внутренним миром, как пространством для саморефлексии, появляется именно тут».', { left: 210, top: 312, width: 1500, textAlign: 'center', fontSize: 50 });
      s.lines(q, 0.9, { stagger: 0.14, dur: 1.2 });
      var c = s.text('cite', 'из лекции курса «Психология развития» о раннем детстве', { left: 360, top: 518, width: 1200, textAlign: 'center' });
      s.fade(c, 2.4, { y: 6 });

      s.rulerOut(3.0);
      s.brandOut(3.0);
      var logo = s.img('assets/brand/dom-header-tagline.png', { left: 960 - 224, top: 584, height: 120 });
      logo.alt = 'DOM Academy — Development of Mind';
      s.fade(logo, 3.8, { y: 10, dur: 1.0 });
      var sub = s.text('small-caps', 'Психология развития', { left: 0, top: 728, width: 1920, textAlign: 'center', fontSize: 21 });
      s.fade(sub, 4.3, { y: 6 });

      var g = s.svg();
      var M = s.map(g);
      s.mapIn(M, 4.4);
      s.mapNext(M, 6.0);
      var nx = s.CFG.series.next, nxX = M.x(nx) + M.segW / 2;
      var ann = s.text('note', 'Далее: дошкольный возраст, 3–7 лет', { left: nxX - 250, top: s.RY - 70, width: 500, textAlign: 'center', color: '#C26A00', fontWeight: 650 });
      s.fade(ann, 6.3, { y: 6 });

      s.actor('baby', { o: 0 }, 11.1, 0.8, 'power2.in');
      s.actor('adult', { o: 0 }, 11.1, 0.8, 'power2.in');
      s.actor('obj', { o: 0 }, 11.1, 0.8, 'power2.in');
    }
  });
})();
