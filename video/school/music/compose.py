"""Оригинальная музыка к ролику «От семи до десяти» (серия «Психология развития», эпизод «Младший школьный возраст»).

Замысел — «музыка по правилам»: канон и двухголосная инвенция, ровный пульс метронома, школьный порядок.
Ансамбль: фортепиано, челеста, пиццикато, маримба, кларнет; изредка фагот (комические реплики), валторна,
струнные, арфа, вибрафон, колокольчики, литавры, тихие ударные (wood block, клаве — «тиканье»).
Одна сетка на весь файл: 4/4, 96 bpm, такт = 2,5 с (картинка смонтирована по ней, смен темпа нет).
«12/8» — триольное деление четверти (160 тиков); им говорит только галоп из 3–7 в первом такте.

Музыка строится по ГЛАВАМ, а не по сценам — шесть разделов (CHAPTERS):
вступление (т. 1–10, ре мажор: галоп 3–7 замедляется в тиканье) · гл. 1 «Новое место» (т. 11–31, соль мажор,
канон фортепиано и челесты) · гл. 2 «Думать по правилам» (т. 32–54, до мажор, инвенция: тема и её зеркало,
ракоход на «перелить обратно») · гл. 3 «Помнить нарочно» (т. 55–65, ля минор: фраза громко → «шёпотом»
→ вспомнили вслух) · гл. 4 «Я умею» (т. 66–81, фа мажор, вприпрыжку) · итог и финал (т. 82–98, ре мажор).
Внутри главы — один грув и сквозная линия; заставка главы начинает фразу, следующая сцена её договаривает.
Тема серии (ступени 5-6-5 | 3-5-3-2) — в каждой главе в своём виде: галоп → «знак» (пролог), широко (титр),
канон (гл. 1), инвенция и ракоход (гл. 2), минор громко/шёпотом (гл. 3), пунктир вприпрыжку и соло
«сам еду» (гл. 4), канон всех глав и широкое тутти (итог). Стоп-кадры (line, bears) — стоп-тайм: пульс замирает,
аккорд держится. Под плотным текстом — пульс и длинные ноты; яркие фразы — на заставках и переходах.

SCENES хранит порядок и длины сцен (как в assets/js/scenes-*.js), гармонию и синхронные акценты из SYNC.md:
acc = [(вид, секунды от начала сцены, нота, громкость, длительность в долях)] — нота подстраивается
к текущему аккорду (snap); вид с «!» — без подстройки; 'perc' — нота ударной установки GM.
Детерминированно: «очеловечивание» — фиксированный генератор (LCG).

Запуск (из music/): ~/.venvs/video-music/bin/python compose.py  →  school.mid (затем render.sh)
"""
from itertools import combinations

import mido

BPM, TPB = 96, 480
Q = TPB                  # четверть = 0,625 с
E, S, TR = Q // 2, Q // 4, Q // 3   # восьмая, шестнадцатая, триольная восьмая («12/8»)
BAR = 4 * Q              # 1920 тиков = 2,5 с
SEC = TPB * BPM / 60     # 768 тиков в секунде
OUT = 'school.mid'

# ── ударные (GM) ──
KICK, SIDE, SN, TOM_FL, HHC, HHP, TOM_L, TOM_M, CRASH, SPLASH, TAMB = 36, 37, 38, 41, 42, 44, 45, 47, 49, 55, 54
CONGA_MH, CONGA_H, CONGA_L, MARACA, GUIRO, CLAVES, WBH, WBL = 62, 63, 64, 70, 74, 75, 76, 77
TRI_M, TRI_O, BELLTREE = 80, 81, 84
KITS = {'std': 0, 'brush': 40}

# ── голоса: канал, программа GM, громкость, панорама, реверберация ──
VOICES = {
    'fl':   (0, 73, 96, 74, 40),
    'cl':   (1, 71, 102, 50, 36),
    'bn':   (3, 70, 100, 58, 30),
    'hn':   (4, 60, 92, 42, 52),
    'str':  (5, 48, 90, 64, 56),
    'pno':  (6, 0, 104, 56, 40),
    'pizz': (7, 45, 102, 70, 36),
    'dr':   (9, 0, 86, 64, 34),
    'mar':  (10, 12, 100, 38, 30),
    'glk':  (11, 9, 76, 92, 50), 'xyl': (11, 13, 84, 86, 36),
    'bell': (2, 14, 80, 72, 64),
    'cel':  (12, 8, 96, 96, 50),
    'harp': (13, 46, 98, 28, 50),
    'vib':  (14, 11, 88, 84, 50),
    'timp': (15, 47, 98, 62, 44),
}

NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
      'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10),
        'sus4': (0, 5, 7), '7sus4': (0, 5, 7, 10), 'add9': (0, 4, 7, 2), '6': (0, 4, 7, 9), 'dim': (0, 3, 6)}
KEYPC = {'D': 2, 'G': 7, 'C': 0, 'Am': 0, 'F': 5}     # тоника мажорного звукоряда (ля минор = до мажор)


def P(s):
    """'F#5' → 78 (C4 = 60)."""
    i, a = 1, 0
    while s[i] in '#b':
        a += 1 if s[i] == '#' else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + NN[s[0]] + a


def chord(sym):
    """'D/F#' → (pc баса, [pc аккорда, начиная с основного тона])."""
    main, _, sl = sym.partition('/')
    root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
    r = PC[root]
    return (PC[sl] if sl else r), [(r + i) % 12 for i in QUAL[main[len(root):]]]


def PENT(key, lo, hi, down=False):
    """Мажорная пентатоника тональности — для глиссандо (в ней нет полутонов)."""
    pcs = {(KEYPC[key] + i) % 12 for i in (0, 2, 4, 7, 9)}
    ns = [n for n in range(lo, hi + 1) if n % 12 in pcs]
    return ns[::-1] if down else ns


def run(kind, t, notes, step, vel, dur=.25, dv=0):
    """Пробег нот как серия акцентов."""
    return [(kind, round(t + i * step, 4), n, vel + i * dv, dur) for i, n in enumerate(notes)]


def hop(t, lo=74, hi=81, land=38, v=52):
    """Прыжок: отрыв (два звука ксилофона вверх) и мягкое приземление (литавра) через 0,5 с."""
    return [('xyl', t, lo, v, .2), ('xyl', round(t + .1, 3), hi, v + 4, .25), ('timp', round(t + .5, 3), land, v + 4, .5)]


def stamp(t, v=70, n=43):
    """«Печать» учителя (как в 3–7): литавра, глухой том и пиццикато — нота аккорда."""
    return [('timp', t, n, v, .5), ('perc', t, TOM_FL, v - 30, .3), ('pizz', t, n + 12, v - 8, .3)]


def pen(t, v=56):
    """Красная ручка — короткая «печать» потише: щелчок римшота и высокий пиццикато."""
    return [('perc', t, SIDE, v - 22, .2), ('pizz', t, 67, v, .25), ('glk', t, 91, v - 14, .5)]


# ── Сцены: такты, тональность, ударная установка, гармония по тактам (через пробел — равные доли такта), акценты ──
SCENES = [
    # Вступление: ре мажор
    ('prologue', dict(bars=3, key='D', kit='std', harm=['D', 'G A7', 'D'],
                      acc=hop(0.9, land=38) + hop(1.65, land=45)                                      # скачки галопа
                      + run('harp!', 2.8, PENT('D', 62, 86, True), 0.08, 40, .3)                     # палочка встаёт в пропись
                      + run('pno', 3.7, [69, 73, 76, 79], 0.22, 54, .3, 2)                           # четыре черты ручкой
                      + [('glk', 5.1, 86, 52, 1.5), ('timp', 5.1, 38, 56, .6), ('pno', 5.1, 62, 50, 2),   # «4»
                         ('vib', 5.6, 81, 46, 2), ('perc', 5.6, TRI_O, 32, 1)])),                    # «знак»
    ('title', dict(bars=3, key='D', kit='std', harm=['D', 'D/F# Bm', 'Em7 A7'],
                   acc=[('glk', 0.25, 93, 44, 1.5), ('perc', 0.25, TRI_O, 32, 1)]                    # карта
                   + run('harp!', 3.75, PENT('D', 62, 93), 0.04, 44, .2, 1))),                       # карта сворачивается в шкалу
    ('ages', dict(bars=4, key='D', kit='std', harm=['D', 'Bm7 G', 'Em7 A7', 'Am7 D7'],
                  acc=[('mar', 0.95, 62, 44, .3), ('mar', 1.35, 66, 46, .3), ('mar', 1.75, 69, 48, .3),   # полосы стран
                       ('glk', 2.15, 86, 50, 1), ('pizz', 2.15, 50, 58, .4), ('perc', 2.15, TRI_O, 34, 1),  # Россия
                       ('mar', 2.55, 74, 48, .3)])),
    # Глава 1 «Новое место»: соль мажор
    ('ch1', dict(bars=1, key='G', kit='std', harm=['G'],
                 acc=[('glk', 0.02, 91, 44, 1.5), ('perc', 0.02, TRI_O, 30, 1)])),
    ('threshold', dict(bars=4, key='G', kit='std', harm=['G Em', 'C D', 'G Em7', 'Am7 D7'],
                       acc=[('vib', 0.3, 74, 40, 1.5),                                                # красная линия поля
                            ('cl', 1.5, 71, 60, .5), ('cl', 1.72, 67, 56, .8)]                        # «Пока, мам!»
                       + [('pizz', t, n, 54, .3) for t, n in zip((2.48, 2.88, 3.28, 3.68, 4.08, 4.48),
                                                                 (43, 45, 47, 48, 50, 52))]          # шесть шагов
                       + run('cel', 3.2, [76, 79, 83, 86, 88, 91], 0.28, 30, .4, 1)                  # клетка проявляется
                       + stamp(6.6, 66))),                                                           # учитель ставит «5»
    ('davydov', dict(bars=6, key='G', kit='std', harm=['G', 'C D', 'Em Am', 'D D7', 'G Em', 'C D7'],
                     acc=[('mar', 1.2, 67, 46, .3), ('mar', 1.4, 71, 48, .3),                        # полоски
                          ('pizz', 2.6, 55, 52, .3), ('perc', 2.6, WBH, 26, .1),                      # приложили
                          ('pizz', 4.2, 50, 48, .3), ('perc', 4.2, WBL, 24, .1),                      # вернули
                          ('glk', 4.9, 86, 46, 1),                                                    # «А > Б»
                          ('xyl', 6.9, 79, 44, .2),                                                   # лишний кусок «В»
                          ('vib', 7.6, 74, 42, 1.5), ('perc', 7.6, TRI_M, 26, .3)]                    # «А − В = Б»
                     + [('mar', t, n, 46 + 2 * i, .3) for i, (t, n) in enumerate(((9.4, 67), (9.9, 71), (10.4, 74), (10.9, 79)))]
                     + [('glk', 11.4, 91, 50, 1.5), ('perc', 11.4, TRI_O, 32, 1)])),                  # «А = 4 мерки»
    ('border', dict(bars=5, key='G', kit='std', harm=['Em', 'C D', 'G Em', 'C D', 'Am7 D7'],
                    acc=run('cel!', 1.0, PENT('G', 64, 88)[:12], 0.07, 30, .25, 1)                    # дети по месяцам
                    + run('harp!', 6.0, PENT('G', 55, 86), 0.035, 40, .2, 1)                          # перелистывание страницы
                    + [('mar', 7.5, 67, 48, .3), ('mar', 7.65, 79, 52, .4),                           # счёт вырос у школьницы
                       ('mar', 8.1, 72, 46, .3), ('mar', 8.25, 72, 46, .4)])),                        # сохранение — поровну
    ('checks', dict(bars=5, key='G', kit='brush', harm=['G Em', 'C D', 'Em C', 'Am7 D7', 'Dm7 G7'],
                    acc=[('vib', t, 79, 36, 1) for t in (1.0, 3.6, 6.2, 8.8)]                         # карточки
                    + stamp(2.0, 64, 40) + stamp(4.6, 76, 43) + stamp(7.2, 58, 40) + stamp(9.8, 80, 38))),  # штампы
    # Глава 2 «Думать по правилам»: до мажор
    ('ch2', dict(bars=1, key='C', kit='std', harm=['C'],
                 acc=[('vib', 1.4, 79, 44, 2), ('perc', 1.4, TRI_O, 28, 1)])),                        # черта проведена
    ('glass', dict(bars=5, key='C', kit='std', harm=['C Am', 'F G', 'C G', 'C Am', 'Dm7 G7'],
                   acc=run('xyl', 2.5, [91, 88, 84, 81, 79, 77, 74, 72], 0.11, 52, .2, -2)            # переливание
                   + [('vib', 3.9, 79, 48, .8), ('vib', 4.15, 84, 50, 1.2)])),                        # «А теперь?»
    ('line', dict(bars=5, key='C', kit='std', harm=['C G', 'G7sus4 G7sus4 G7sus4 G7', 'Am F', 'C G', 'F G7'],
                  acc=run('harp!', 0.5, PENT('C', 60, 84), 0.08, 38, .25, 1)                          # черта по линейке
                  + [('mar', 5.1, 72, 50, .3), ('mar', 5.25, 76, 46, .4)]                             # отметка ребёнка
                  + pen(6.6))),                                                                      # красная отметка учителя
    ('archimedes', dict(bars=5, key='C', kit='std', harm=['C F', 'G C', 'Dm7 G7 C C', 'Am F', 'Dm7 G7'],
                        acc=[('glk', 0.7, 84, 42, 1)]                                                 # кораблик на доске
                        + run('cel', 1.4, [72, 76, 79, 84], 0.07, 42, .3, 2)                          # «Закон Архимеда!»
                        + [('pizz', 2.4, 55, 50, .3), ('pizz', 2.62, 48, 46, .4)]                     # учитель кивает
                        + run('harp!', 3.6, PENT('C', 55, 84), 0.04, 38, .2, 1)                       # «школа → дом»
                        + [('vib', 4.4, 74, 44, .5), ('vib', 4.6, 79, 46, 1)]                         # «А что такое брат?»
                        + [('bn!', 6.3, 36, 84, .45), ('bn!', 6.3, 48, 72, .45), ('pizz', 6.3, 36, 80, .5),
                           ('timp', 6.3, 43, 78, .6), ('perc', 6.3, WBL, 56, .2)]                     # «Брат — это Петя!»
                        + [('xyl', 7.0, 84, 52, .2), ('xyl', 7.12, 88, 54, .2), ('xyl', 7.24, 84, 50, .2)])),  # ложка
    ('bears', dict(bars=7, key='C', kit='std',
                   harm=['Am F', 'Dm Dm E7sus4 E7sus4', 'E7sus4 E7sus4 Am Am', 'Dm Am', 'C G', 'F C', 'Dm7 E7'],
                   acc=[('cel', t, n, 34, .6) for t, n in ((1.6, 96), (1.72, 91), (1.84, 93), (1.96, 88))]   # снежинки
                   + [('pizz', 2.0, 45, 54, .5), ('vib', 2.0, 76, 40, 1.5)]                           # медведь
                   + [('vib', 6.2, 72, 40, 1)]                                                        # реплика старшего
                   + [('bn', 7.2, 33, 70, 1.2), ('timp', 7.2, 45, 62, .8), ('pizz', 7.2, 33, 60, .6)]   # медведь чернеет
                   + [('vib', 10.0, 76, 40, 1)]                                                       # реплика молодого
                   + run('cel', 10.6, [79, 84, 88, 91, 96], 0.07, 38, .5, 2) + [('glk', 10.6, 91, 44, 1.5)]  # белеет
                   + [('harp', 12.4, 65, 42, 1)])),                                                   # вывод
    # Глава 3 «Помнить нарочно»: ля минор
    ('ch3', dict(bars=1, key='Am', kit='std', harm=['Am Am'], acc=[('timp', 0.0, 45, 66, .8)])),
    ('helmet', dict(bars=7, key='Am', kit='std', harm=['F E', 'Am Am', 'Am Am E E', 'Am C', 'F E', 'Dm E', 'Am F'],
                    acc=[('glk', t, n, 40, .5) for t, n in ((0.3, 88), (0.48, 84), (0.66, 81))]        # картинки
                    + [('vib', t, n, 40, .8) for t, n in ((1.2, 76), (1.6, 72), (2.0, 69))]           # обводки
                    + [('timp', 3.0, 45, 66, .6), ('pizz', 3.0, 33, 60, .5), ('perc', 3.0, WBL, 40, .2)]  # козырёк вниз
                    + run('harp!', 7.2, PENT('C', 60, 84), 0.03, 40, .2, 1)                           # козырёк вверх
                    + [('mar', t, n, 50 + 2 * i, .3) for i, (t, n) in enumerate(((7.7, 72), (8.05, 76), (8.4, 79)))]  # галочки
                    + [('pizz', t, n, 50 + 3 * i, .3) for i, (t, n) in enumerate(((9.4, 55), (9.6, 64), (9.8, 72)))]  # столбики
                    + [('vib', 13.0, 71, 46, 1.2)])),                                                 # столбик 2021 года
    ('chess', dict(bars=3, key='Am', kit='std', harm=['Am Em', 'F C', 'Gm7 C7'],
                   acc=[('glk', 0.5, 88, 42, 1)]                                                      # доска
                   + [('mar', 2.3, 79, 50, .3), ('mar', 2.45, 72, 46, .3),                            # фигуры: дети > взрослые
                      ('mar', 2.9, 72, 46, .3), ('mar', 3.05, 76, 48, .3)])),                         # цифры: наоборот
    # Глава 4 «Я умею»: фа мажор
    ('ch4', dict(bars=1, key='F', kit='std', harm=['F C'], acc=[('glk', 0.0, 84, 44, 1), ('perc', 0.0, TRI_O, 28, 1)])),
    ('twenty', dict(bars=7, key='F', kit='std', harm=['F', 'Dm7 Bb', 'Gm7 C7', 'Dm Dm Bb Bb', 'F C/E', 'Dm7 Gm7', 'Bb C7'],
                    acc=[('pizz', 4.4, 41, 46, .4)]                                                   # учитель
                    + run('cel', 6.0, [65, 69, 72, 77, 81], 0.24, 32, .4, 2)                          # наезд
                    + [('pizz', 7.2, 60, 54, .4), ('glk', 7.4, 84, 54, 1)]                            # «4» и «5»
                    + [('vib', 8.1, 74, 46, .6), ('vib', 8.3, 69, 42, 1)]                             # «У него пять!»
                    + run('harp!', 9.8, PENT('F', 60, 84, True), 0.04, 36, .2))),                     # назад
    ('recess', dict(bars=4, key='F', kit='std', harm=['F F', 'Bb C', 'Dm Bb', 'Gm7 C7'],
                    acc=[('bell', 0.2, 72, 56, 2)]                                                    # перемена
                    + run('xyl', 0.2, [72, 77, 81, 84], 0.1, 44, .2, 2)                               # классики
                    + hop(0.9, 77, 84, 41) + hop(1.4, 81, 89, 36)                                     # прыжки
                    + [('bn', 2.0, 41, 70, .4), ('perc', 2.0, WBL, 52, .2), ('pizz', 2.0, 29, 64, .4)]   # «Ты наступил на линию!»
                    + [x for t in (3.8, 4.9, 6.0) for x in run('harp!', t, PENT('F', 65, 84), 0.03, 38, .2, 1)])),  # скачки времени
    ('bike', dict(bars=4, key='F', kit='std', harm=['F C/E', 'Dm C', 'Dm Bb', 'Gm7 A7'],
                  acc=[('glk', 2.0, 84, 44, 1)]                                                       # мама отпускает
                  + run('harp!', 4.6, PENT('F', 60, 89), 0.04, 38, .2, 1)                             # перелистывание
                  + [('bn', 5.2, 38, 76, .8), ('pizz', 5.2, 38, 70, .6), ('timp', 5.2, 38, 66, .8)]   # «никогда не получится!»
                  + [('harp', 6.8, 65, 44, 1), ('vib', 6.8, 74, 40, 2)])),                            # цитата Эриксона
    # Итог и финал: ре мажор
    ('grow', dict(bars=4, key='D', kit='std', harm=['D A/C#', 'D Bm', 'G D/F#', 'Em7 A7'],
                  acc=[('mar', 0.4 + 0.25 * i, n, 46, .3) for i, n in enumerate((62, 66, 69, 74))]     # подписи
                  + [('vib', 2.4, 78, 44, 1.5), ('cel', 2.4, 90, 34, 1.5)]                            # двойник
                  + [('glk', 3.4, 86, 48, 1), ('perc', 3.4, TRI_O, 30, 1)])),                         # заголовок
    ('summary', dict(bars=5, key='D', kit='std', harm=['D A/C#', 'Bm7 G', 'D/F# G', 'Em7 A7', 'G A7'],
                     acc=[('vib', round(0.8 + i * 0.8, 2), n, 38, .8) for i, n in enumerate((62, 66, 69, 74, 78, 81, 86))])),
    ('outro', dict(bars=5, key='D', kit='std', harm=['D D', 'D/F# A', 'Bm7 G', 'Em7 A7', 'Bm7 A7sus4'],
                   acc=run('cel', 0.4, [74, 78, 81, 78, 74, 78, 81, 86], 0.5, 30, .5)                 # вещи кружат
                   + [('harp', 3.4, 62, 44, 1), ('vib', 3.4, 74, 40, 2)])),                           # цитата
    ('final', dict(bars=3, key='D', kit='std', harm=['D', 'D', 'D'],
                   acc=[('glk', 1.0, 86, 48, 1), ('perc', 1.0, TRI_O, 34, 1), ('mar', 1.3, 78, 50, .3)]   # карточки
                   + [('vib', 3.6, 81, 46, .5)] + hop(3.9, 74, 81, 38, 50))),                         # к 10–13, прыжок
]


# ── Сетка ──
HARM, KEY, START = [], [], {}
bar = 1
for name, sc in SCENES:
    assert len(sc['harm']) == sc['bars'], name
    START[name] = bar
    for h in sc['harm']:
        HARM.append(h.split())
        KEY.append(sc['key'])
    bar += sc['bars']
NBARS = bar - 1
assert NBARS == 98, NBARS
print('bars:', NBARS, 'seconds: %g' % (NBARS * 2.5))


def T(b, beat=0.0):
    """Тик начала такта b (с 1) плюс доли."""
    return int(round((b - 1) * BAR + beat * Q))


def sym_at(t):
    b = min(NBARS - 1, max(0, int(t) // BAR))
    parts = HARM[b]
    return parts[min(len(parts) - 1, int((t - b * BAR) * len(parts) // BAR))]


def pcs_at(t):
    return chord(sym_at(t))[1]


def segs(t0, t1):
    """Отрезки одной гармонии внутри [t0, t1): (начало, конец, аккорд)."""
    out = []
    for b in range(int(t0) // BAR, (int(t1) - 1) // BAR + 1):
        parts = HARM[b]
        for i, sym in enumerate(parts):
            s, e = max(t0, b * BAR + i * BAR // len(parts)), min(t1, b * BAR + (i + 1) * BAR // len(parts))
            if e <= s:
                continue
            if out and out[-1][2] == sym and out[-1][1] == s:
                out[-1] = (out[-1][0], e, sym)
            else:
                out.append((s, e, sym))
    return out


def tones(pcs, lo, hi):
    return [n for n in range(lo, hi + 1) if n % 12 in pcs]


def snap(n, t):
    pcs = pcs_at(t)
    return min(range(n - 6, n + 7), key=lambda x: (abs(x - n) if x % 12 in pcs else 99, -x))


class LCG:
    def __init__(self, seed=20261003):
        self.s = seed

    def next(self):
        self.s = (1103515245 * self.s + 12345) % 2 ** 31
        return self.s / 2 ** 31

    def jitter(self, a):
        return (self.next() * 2 - 1) * a


rng = LCG()
QUEUE, EXPR = [], []
# приоритет размещения: 0 — сочинённые линии, 1 — акценты, 1.5 — подголоски, 2 — бас, 3 — фактура, 9 — ударные.
# Фактура и акценты при конфликте (полутон / м.9 / две октавы + полутон) сдвигаются на другой тон аккорда или выпадают.


def put(v, t, dur, p, vel, prio=0, flex=None, jit=6, tag=None):
    t0 = max(0, int(round(t + (rng.jitter(jit) if jit else 0))))
    t1 = t0 + max(30, int(dur))
    vel = max(1, min(127, int(round(vel + rng.jitter(3)))))
    QUEUE.append((prio, len(QUEUE), v, t0, t1, int(p), vel, flex, tag))


def seq(v, t, text, unit=E, vel=80, art=0.92, tr=0, prio=0, flex=None, jit=6):
    """Мелодия текстом: «A5/2 B5/1. r/1 | …» — длительность в единицах unit, «.» стаккато, «_» легато,
    «>» акцент, «-» тише, «+» — созвучие; «|» — тактовая черта (проверяется)."""
    pos, ln, out = 0.0, 2.0, []
    for tok in text.split():
        if tok == '|':
            at = t + pos * unit
            if abs(at / BAR - round(at / BAR)) > 1e-6:
                print('WARN: тактовая черта не на такте', v, round(at / BAR + 1, 3), text[:40])
            continue
        mods = ''
        while tok[-1] in '._>-':
            mods += tok[-1]
            tok = tok[:-1]
        if '/' in tok:
            tok, l = tok.split('/')
            ln = float(l)
        a = 0.45 if '.' in mods else (1.0 if '_' in mods else art)
        dv = (12 if '>' in mods else 0) - (12 if '-' in mods else 0)
        if tok != 'r':
            for nm in tok.split('+'):
                p = P(nm) + tr
                put(v, t + pos * unit, ln * unit * a, p, vel + dv, prio, flex, jit)
                out.append((t + pos * unit, ln * unit * a, p))
        pos += ln
    return out


def under(v, notes, vel, key, steps=2, prio=1.5):
    """Подголосок: диатоническая терция (steps ступеней) ниже мелодии; при конфликте нота выпадает."""
    sc = [(KEYPC[key] + i) % 12 for i in (0, 2, 4, 5, 7, 9, 11)]
    for t, d, p in notes:
        if p % 12 not in sc:
            continue
        q, k = p, 0
        while k < steps:
            q -= 1
            if q % 12 in sc:
                k += 1
        put(v, t, d, q, vel, prio, 'drop')


def voicing(pcs, lo, hi, n, prev):
    pool = tones(pcs, lo, hi)
    need = min(3, n, len(set(pcs)))
    cands = [c for c in combinations(pool, n) if len({x % 12 for x in c}) >= need and c[-1] - c[0] <= 16]
    if not cands:
        cands = [tuple(pool[-n:])]
    if prev is None:
        return min(cands, key=lambda c: abs(sum(c) / n - (lo + hi) / 2))
    return min(cands, key=lambda c: (sum(abs(a - b) for a, b in zip(c, prev)), -c[-1]))


def pad(v, t0, t1, vel, lo=55, hi=76, n=3, prio=3, art=1.0):
    """Выдержанные аккорды с плавным голосоведением."""
    prev = None
    for s, e, sym in segs(t0, t1):
        c = voicing(chord(sym)[1], lo, hi, n, prev)
        prev = c
        for p in c:
            put(v, s + 8, (e - s) * art - 24, p, vel, prio, 'chord', jit=0)


def stabs(v, t0, t1, rhythm, vel, lo, hi, n=3, prio=3):
    """Короткие аккорды по ритму такта: rhythm = [(доля, длительность в долях, ±громкость)]."""
    prev = None
    for b in range(int(t0) // BAR + 1, (int(t1) - 1) // BAR + 2):
        for pos, d, dv in rhythm:
            t = T(b, pos)
            if t0 <= t < t1:
                c = voicing(pcs_at(t), lo, hi, n, prev)
                prev = c
                for p in c:
                    put(v, t, d * Q, p, vel + dv, prio, 'drop')


def arp(v, t0, t1, pat, unit, vel, lo, hi, art=0.85, acc=None, prio=3):
    """Арпеджио/остинато по тонам текущего аккорда: pat — индексы в пуле тонов [lo, hi] (None — пауза)."""
    t, i = t0, 0
    while t < t1 - 10:
        k = pat[i % len(pat)]
        if k is not None:
            pool = tones(pcs_at(t), lo, hi)
            put(v, t, unit * art, pool[min(k, len(pool) - 1)], vel + (acc[i % len(acc)] if acc else 0), prio, 'chord')
        t += unit
        i += 1


def broot(sym, lo):
    return lo + (chord(sym)[0] - lo) % 12


def bassline(v, t0, t1, style, vel, lo=36, prio=2):
    """Бас по гармонии: root, half, walk, bounce, gallop, lilt, march, drive."""
    sg = segs(t0, t1)
    for j, (s, e, sym) in enumerate(sg):
        r = broot(sym, lo)
        pcs = chord(sym)[1]
        fifth = r + 7 if r + 7 <= lo + 14 else r - 5
        L = e - s
        ev = []
        if style == 'root':
            ev = [(0, L - 30, r, 0)]
        elif style == 'half':
            ev = [(k, min(2 * Q, L - k) - 40, r if (s + k) % BAR < 2 * Q or k == 0 else fifth, 0 if k == 0 else -6)
                  for k in range(0, L, 2 * Q)]
        elif style == 'walk':
            nxt = broot(sg[j + 1][2], lo) if j + 1 < len(sg) else r
            third = tones(pcs, r + 1, r + 9)
            path = [r] + third[:1] + [fifth if fifth > r else r + 7]
            nb = L // Q
            for k in range(nb):
                p = path[k % len(path)] if k < nb - 1 or nb == 1 else (nxt - 1 if nxt > r else nxt + 2)
                ev.append((k * Q, Q * 0.9, p, 4 if k == 0 else 0))
        elif style == 'bounce':
            for k in range(0, L, 2 * Q):
                ev += [(k, Q * 0.8, r, 4), (k + Q + E, E * 0.6, fifth, -6)]
        elif style == 'gallop':
            for k in range(L // Q):
                p = r if k % 2 == 0 else fifth
                ev += [(k * Q, 2 * TR * 0.85, p, 4), (k * Q + 2 * TR, TR * 0.6, p + 12 if p + 12 <= lo + 24 else p, -8)]
        elif style == 'lilt':
            for k in range(0, L, 2 * Q):
                ev += [(k, (Q + TR) * 0.9, r, 4), (k + Q + TR, 2 * TR * 0.8, fifth, -6)]
        elif style == 'march':
            ev = [(k * Q, Q * 0.55, r if k % 2 == 0 else fifth, 4 if k % 2 == 0 else -4) for k in range(L // Q)]
        elif style == 'drive':
            ev = [(k * E, E * 0.6, r + 12 if k % 4 == 3 else r, 6 if k % 2 == 0 else -4) for k in range(L // E)]
        for off, d, p, dv in ev:
            if off < L:
                put(v, s + off, d, p, vel + dv, prio, 'chord')


VCH = {'X': 1.25, 'x': 1.0, 'o': 0.6}


def dpat(b0, b1, spec, scale=1.0):
    """Ударные: spec = {нота: ('x.o.X...', громкость)}, длина строки делит такт поровну."""
    for b in range(b0, b1 + 1):
        for n, (pat, v) in spec.items():
            u = BAR / len(pat)
            for i, c in enumerate(pat):
                if c in VCH:
                    put('dr', T(b) + i * u, u * 0.8, n, v * VCH[c] * scale, 9, jit=4)


def roll(t0, t1, n, v0, v1, step=60, voice='dr'):
    k = int((t1 - t0) // step)
    for i in range(k):
        put(voice, t0 + i * step, step * 0.9, n, v0 + (v1 - v0) * i / max(1, k - 1), 9 if voice == 'dr' else 0, jit=2)


def gliss(v, t0, lo, hi, step, vel, key, down=False, dur=96):
    for i, n in enumerate(PENT(key, lo, hi, down)):
        put(v, t0 + i * step, dur, n, vel, 1, 'drop', jit=0)


def swell(v, t0, t1, a, b, steps=16):
    for i in range(steps + 1):
        EXPR.append((v, int(t0 + (t1 - t0) * i / steps), int(a + (b - a) * i / steps)))

# ════════════════════════ Музыка по главам ════════════════════════
# Шесть разделов; внутри — один грув и сквозная линия. Сцена меняет фактуру, но не перезапускает фразу:
# на стыках — продолжение, каданс или затакт. Пульс метронома (тик-так) идёт через весь ролик и замирает
# только в стоп-кадрах, в «шёпоте» и под финальную цитату.
HOOVES = {WBL: ('x.o...x.o...', 40), WBH: ('...x.o...x.o', 34)}      # «копыта» 3–7 в 12/8: долго-коротко
TICK = {WBH: ('x...x...', 20), WBL: ('..x...x.', 16)}               # метроном: тик-так четвертями
CLAV = {CLAVES: ('x.o.x.o.', 20)}                                    # клаве четвертями — «школьный порядок»
OFF8 = [(q + .5, .2, 0) for q in range(4)]                           # лёгкие слабые доли


def at(name, sec):
    """Тик: секунды от начала сцены."""
    return T(START[name]) + int(round(sec * SEC))


def lh(t0, t1, vel=40, lo=43, hi=62, pat=(0, 2, 1, 2), unit=E):
    """Левая рука фортепиано: ломаный аккорд ровными восьмыми — «пульс урока»."""
    arp('pno', t0, t1, list(pat), unit, vel, lo, hi, art=.8)


def hold(t0, t1, parts):
    """Стоп-тайм: выдержанные ноты [(голос, (ноты), громкость)] без пульса."""
    for v, ns, vel in parts:
        for nn in ns:
            put(v, t0, t1 - t0 - 20, nn, vel, jit=0)


def intro():
    """Такты 1–10, ре мажор. Галоп из 3–7 (флейта, «копыта») в такте 2 замедляется: триоли → восьмые → четверть;
    с такта 3 — тиканье метронома, на «4» флейта садится на ре. Титр — тема широко (фортепиано + струнные октавой ниже,
    валторна); «Сроки» — тихий пульс под инфографику, кларнет договаривает фразу, Am7–D7 — затакт в главу 1."""
    p, t, a = START['prologue'], START['title'], START['ages']
    dpat(p, p, HOOVES, .8)
    slow = ''.join('x' if i in (0, 6, 12, 18) else 'o' if i in (4, 10, 15) else '.' for i in range(24))
    dpat(p + 1, p + 1, {WBL: (slow, 40)})
    dpat(p + 2, t + 2, TICK, .8)
    dpat(a, a + 3, TICK, .6)
    bassline('pizz', T(p), T(p + 1), 'gallop', 60, lo=38)
    for beat, n, dv in ((0, 43, 4), (2 / 3, 50, -6), (1, 43, 2), (5 / 3, 50, -8), (2, 45, 0), (2.5, 52, -8), (3, 45, -4)):
        put('pizz', T(p + 1, beat), TR * 1.6, n, 58 + dv, 2, 'chord')
    bassline('pizz', T(p + 2), T(t), 'march', 46, lo=38)
    stabs('mar', T(p), T(p + 1), [(k + 2 / 3, .25, 0) for k in range(4)], 46, 62, 76)
    stabs('mar', T(p + 1), T(p + 2), [(2 / 3, .25, 0), (5 / 3, .25, -2), (2.5, .25, -6)], 44, 62, 76)
    seq('fl', T(p), "A5/2 B5/1 A5/3 F#5/2 A5/1 F#5/2 E5/1 | B5/2 A5/1 G5/3 E5/1.5 C#5/1.5 A4/3 | D5/6", TR, 84)
    # титр: тема широко
    seq('pno', T(t), "A5/3 B5/1 A5/4 | F#5/2 A5/2 F#5/2 E5/2 | G5/3 F#5/1 E5/2 C#5/2", E, 78)
    seq('str', T(t), "A4/3 B4/1 A4/4 | F#4/2 A4/2 F#4/2 E4/2 | G4/3 F#4/1 E4/2 C#4/2", E, 54, art=.97)
    swell('str', T(t), T(t + 1), 70, 110)
    seq('hn', T(t), "D4/8 | D4/4 D4/4 | B3/4 C#4/4", E, 54, art=.98)
    lh(T(t), T(a), 42)
    bassline('pizz', T(t), T(a), 'half', 52, lo=38)
    put('timp', T(t), Q * 2, 38, 58)
    # «Сроки»: под чтение — пульс и одна линия кларнета
    seq('cl', T(a), "F#5/4 E5/2 D5/2 | D5/4 B4/4 | B4/4 C#5/4 | C5/4 A4/2 F#4/2", E, 64, art=.96)
    lh(T(a), T(a + 4), 36)
    bassline('pizz', T(a), T(a + 4), 'root', 44, lo=38)


def part1():
    """Такты 11–31, соль мажор, ровные восьмые. Канон: фортепиано начинает тему на заставке, челеста в «Пороге»
    отвечает октавой выше, фортепиано ведёт противосложение; шаги — пиццикато, отметка — «печать».
    «Давыдов» и «Граница» — под плотный текст: пульс левой руки и длинные ноты кларнета; в «Границе» тема
    в ми миноре. «Проверки» — щётки, четыре «печати» разной силы, каданс на G7 → глава 2."""
    c, th, dv, bo, ck = (START[x] for x in ('ch1', 'threshold', 'davydov', 'border', 'checks'))
    seq('pno', T(c), "D5/1 E5/1 D5/2 B4/1 D5/1 B4/1 A4/1 | G4/2 A4/1 B4/1 G4/2 E4/2 | "
                     "E5/1 G5/1 E5/1 C5/1 F#5/1 A5/1 F#5/1 D5/1 | D5/2 B4/1 G4/1 B4/2 D5/2 | "
                     "C5/1 E5/1 A4/1 C5/1 F#4/1 A4/1 C5/1 D5/1", E, 76)
    seq('cel', T(th), "D6/1 E6/1 D6/2 B5/1 D6/1 B5/1 A5/1", E, 56)
    lh(T(c), T(dv), 42)
    bassline('pizz', T(c), T(dv), 'half', 50, lo=38)
    stabs('mar', T(th), T(dv), OFF8, 36, 62, 74)
    dpat(c, bo - 1, CLAV)
    # «Давыдов»: шаги в тетради — пульс и длинные ноты
    seq('cl', T(dv), "B4/4 D5/4 | E5/4 F#5/4 | G5/4 E5/4 | F#5/8 | D5/4 E5/4 | E5/4 C5/4", E, 62, art=.97)
    lh(T(dv), T(bo), 36)
    bassline('pizz', T(dv), T(bo), 'half', 46, lo=38)
    # «Граница»: тема в ми миноре у фортепиано, потом — под графики и цитату — тише
    seq('pno', T(bo), "B4/1 C5/1 B4/2 G4/1 B4/1 G4/1 F#4/1 | E4/2 G4/2 F#4/2 A4/2 | B4/4", E, 68)
    seq('cl', T(bo + 4), "C5/2 B4/2 A4/2 F#4/2", E, 62)
    lh(T(bo), T(ck), 36)
    bassline('pizz', T(bo), T(ck), 'root', 46, lo=38)
    pad('str', T(bo + 2), T(ck), 32, 55, 72)
    dpat(bo, bo + 4, CLAV, .7)
    # «Проверки»: щётки, лёгкое стаккато; кларнет спускается к G7
    seq('pno', T(ck), "D5/1. E5/1. D5/1. r/1 B4/1. D5/1. B4/1. A4/1. | E5/1. G5/1. E5/1. r/1 F#5/1. A5/1. F#5/1. r/1", E, 56)
    seq('cl', T(ck + 2), "G4/4 E4/4 | E4/4 F#4/4 | F4/4 D4/4", E, 60, art=.97)
    stabs('pno', T(ck), T(ck + 5), OFF8, 36, 50, 64)
    bassline('pizz', T(ck), T(ck + 5), 'walk', 56, lo=38)
    dpat(ck, ck + 4, {SN: ('oxXxoxXx', 18), HHP: ('..x...x.', 22)})


def part2():
    """Такты 32–54, до мажор, инвенция. Заставка — гамма челесты «по линейке». «Стакан»: тема у правой руки,
    её зеркало у левой; три усталых ответа — кларнет вздыхает всё ниже; «перелить обратно» — ракоход темы
    у челесты. «Прямая» и «Медведи» — стоп-тайм: пульс замирает, аккорд держится до конца стоп-кадра.
    «Брат — это Петя!»: пульс обрывается на полдоли раньше — и удар фагота с литаврой. Медведь белеет — до мажор, E7 → глава 3."""
    c, g, ln, ar, be = (START[x] for x in ('ch2', 'glass', 'line', 'archimedes', 'bears'))
    for i, n in enumerate((72, 74, 76, 77, 79, 81, 83, 84)):                       # линейка: гамма до мажор
        put('cel', at('ch2', 0.5) + i * int(.125 * SEC), .11 * SEC, n, 46 + 2 * i)
    put('pno', T(c), BAR - 40, 48, 50)
    put('pno', T(c), BAR - 40, 55, 44)
    put('pizz', T(c), Q, 36, 54)
    # «Стакан»
    seq('pno', T(g), "G5/1 A5/1 G5/2 E5/1 G5/1 E5/1 D5/1 | C5/4", E, 74)
    seq('pno', T(g), "C4/1 B3/1 C4/2 E4/1 C4/1 E4/1 F4/1", E, 60)                 # зеркало
    lh(T(g + 1), T(g + 5), 36, 43, 60)
    bassline('pizz', T(g), T(g + 5), 'half', 46, lo=36)
    dpat(g, g + 4, TICK, .8)
    seq('cl', T(g + 2), "G4/1 E4/3 D4/1 B3/3 | E4/1 C4/5", E, 68)                  # «это же очевидно» ×3
    seq('cel', T(g + 4), "D6/1 E6/1 G6/1 E6/1 G6/2 A6/1 G6/1", E, 54)              # ракоход: перелить обратно
    # «Прямая»: черта, стоп-кадр (2,1–4,3 с), отметки
    stop0, stop1 = at('line', 2.1), at('line', 4.3)
    lh(T(ln), stop0, 36, 43, 60)
    bassline('pizz', T(ln), stop0, 'half', 46, lo=36)
    dpat(ln, ln, {WBH: ('x...x...', 20), WBL: ('..x.....', 16)}, .8)
    hold(stop0, stop1, [('pno', (55, 60, 62, 65), 36), ('vib', (74,), 32)])
    seq('pno', T(ln + 1, 3), "B4/1 D5/1 | C5/2 E5/1 C5/1 A4/2 C5/2 | G4/2 C5/1 E5/1 D5/2 B4/2 | A4/2 C5/1 A4/1 G4/4", E, 62)
    lh(T(ln + 2), T(ar + 2, 3), 36, 43, 60)
    bassline('pizz', T(ln + 2), T(ar + 2, 1.5), 'half', 46, lo=36)
    dpat(ln + 2, ar + 1, TICK, .8)
    # «Архимед»: уверенный ответ, перелистывание домой, вопрос — и комический удар
    seq('pno', T(ar), "E5/2 G5/1 E5/1 F5/2 A5/2 | D5/2 B4/2 C5/4 | F4/1 A4/1 B4/1", E, 66)
    dpat(ar + 2, ar + 2, {WBH: ('x.......', 20), WBL: ('..x.....', 16)}, .8)
    lh(T(ar + 3), T(be), 34, 43, 60)
    bassline('pizz', T(ar + 3), T(be), 'root', 44, lo=36)
    seq('cl', T(ar + 3), "E5/4 C5/4 | D5/4 B4/4", E, 62, art=.97)                  # цитата Выготского
    dpat(ar + 3, ar + 4, TICK, .6)
    # «Медведи»: холодно и медленно; стоп-кадр 3,8–6,0 с; чёрный медведь — низко; белый — светло
    s0, s1 = at('bears', 3.8), at('bears', 6.0)
    lh(T(be), s0, 34, 40, 60, (0, 1, 2, 1), Q)
    bassline('pizz', T(be), s0, 'root', 44, lo=33)
    dpat(be, be, TICK, .5)
    hold(s0, s1, [('str', (52, 57, 59, 64), 38), ('pno', (45, 52), 34)])
    lh(T(be + 2, 2), T(be + 4), 34, 40, 60, (0, 1, 2, 1), Q)
    bassline('pizz', T(be + 2, 2), T(be + 4), 'root', 44, lo=33)
    seq('cl', T(be + 3), "F4/4 E4/4", E, 58)
    seq('pno', T(be + 4), "E5/2 G5/2 D5/2 B4/2 | A4/2 C5/2 E5/2 G5/2 | F5/4 E5/2 D5/1 B4/1", E, 64)
    lh(T(be + 4), T(be + 7), 38, 43, 60)
    bassline('pizz', T(be + 4), T(be + 7), 'half', 48, lo=36)
    dpat(be + 4, be + 6, TICK, .7)


def part3():
    """Такты 55–65, ля минор. Фраза главы (тема в миноре) звучит громко — кларнет, фортепиано октавой ниже,
    струнные, бас-барабан; козырёк вниз — глухой удар и тишина; та же фраза «шёпотом» — одна челеста
    высоко и тихо, без ударных; козырёк вверх — фразу «вспоминают» вслух (кларнет), галочки маримбы.
    «Шахматы» — тот же пульс, кадансом C7 → глава 4."""
    c, h, ch = START['ch3'], START['helmet'], START['chess']
    ph = "E5/1 F5/1 E5/2 C5/1 E5/1 C5/1 B4/1 | A4/2 B4/1 C5/1 B4/2 E4/2"
    seq('cl', T(c), ph, E, 98)
    seq('str', T(c), ph, E, 62)
    seq('pno', T(c), "E4/1 F4/1 E4/2 C4/1 E4/1 C4/1 B3/1 | A3/2 B3/1 C4/1 B3/2 E3/2", E, 80)
    bassline('pizz', T(c), T(h + 1), 'march', 62, lo=33)
    stabs('mar', T(c), T(h + 1), OFF8, 50, 62, 76)
    dpat(c, h, {KICK: ('x...x...', 40), SN: ('..x...x.', 28), CLAVES: ('xoxoxoxo', 22)})
    pad('str', T(h + 1), T(h + 2, 3), 24, 57, 72)                                   # тишина под козырьком
    seq('cel', T(h + 1, 3), "E6/1 F6/1 E6/2 C6/1 E6/1 C6/1 B5/1", E, 34)           # «шёпот»
    seq('cl', T(h + 3), ph, E, 76)                                                  # вспомнили вслух
    lh(T(h + 3), T(ch + 3), 38, 40, 60)
    bassline('pizz', T(h + 3), T(ch + 3), 'half', 48, lo=33)
    dpat(h + 3, ch + 2, TICK, .7)
    seq('pno', T(h + 5), "D5/2 C5/2 B4/2 G#4/2 | A4/4 C5/4", E, 56)                 # цитата Выготского
    seq('cl', T(ch + 1), "A4/4 G4/4 | Bb4/4 G4/4", E, 58, art=.97)


def part4():
    """Такты 66–81, фа мажор, вприпрыжку: тема — пунктиром у кларнета на заставке; «Двадцать» — под чтение
    пульс и длинные ноты, отъезд — арфой; «Перемена» — звонок, лёгкий бит, тема вприпрыжку, «на линию!» — фагот;
    «Велосипед» — без ударных, ровная арфа, кларнет вступает «сам», когда мама отпускает седло;
    «никогда не получится» — низкий удар в ре миноре, цитата Эриксона — тепло, A7 → итог в ре мажоре."""
    c, tw, rc, bk = (START[x] for x in ('ch4', 'twenty', 'recess', 'bike'))
    seq('cl', T(c), "C5/1.5 D5/.5 C5/2 A4/1.5 C5/.5 A4/1 G4/1 | F4/2 G4/1 A4/1 C5/4", E, 84)
    lh(T(c), T(rc), 38, 41, 60)
    bassline('pizz', T(c), T(tw), 'bounce', 56, lo=36)
    stabs('mar', T(c), T(tw), OFF8, 42, 60, 74)
    dpat(c, c, TICK, .8)
    # «Двадцать»: отъезд арфой, под чтение — пульс
    arp('harp', at('twenty', 1.8), at('twenty', 5.4), [0, 1, 2, 3, 4, 5, 6, 7], E, 34, 53, 86, art=1.4)
    bassline('pizz', T(tw), T(rc), 'half', 46, lo=36)
    dpat(tw, rc - 1, TICK, .6)
    seq('cl', T(tw + 4), "C5/4 G4/4 | F4/4 F4/4 | F4/4 E4/4", E, 58, art=.97)
    # «Перемена»
    seq('cl', T(rc), "C5/1.5 D5/.5 C5/2 A4/1.5 C5/.5 A4/1 G4/1 | F4/1.5 G4/.5 Bb4/2 C5/1.5 D5/.5 E5/2 | "
                     "F5/2 D5/2 D5/2 Bb4/2 | G4/2 Bb4/2 E5/2 C5/2", E, 80)
    bassline('pizz', T(rc), T(bk), 'bounce', 58, lo=36)
    stabs('mar', T(rc), T(bk), OFF8, 44, 60, 74)
    lh(T(rc), T(bk), 34, 41, 58)
    dpat(rc, rc + 3, {KICK: ('x...x...', 28), SIDE: ('..x...x.', 28), MARACA: ('xoxoxoxo', 18)})
    # «Велосипед»: ровно, без ударных
    arp('harp', T(bk), T(bk + 1, 3.4), [0, 2, 1, 3, 2, 4, 3, 1], E, 38, 53, 81, art=1.4)
    lh(T(bk), T(bk + 1, 3.4), 34, 41, 58)
    bassline('pizz', T(bk), T(bk + 1, 3.4), 'root', 46, lo=36)
    seq('cl', T(bk, 3), "C5/1 D5/1 | C5/2 A4/2 C5/1 A4/1 G4/2", E, 78)              # «сам»: мама отпустила
    seq('cl', T(bk + 2, 3), "D5/1 F5/1 | D5/2 F5/2 E5/2 C#5/2", E, 72)              # цитата Эриксона
    pad('str', T(bk + 2, 2), T(bk + 4), 40, 55, 74)
    arp('harp', T(bk + 2, 2), T(bk + 4), [0, 2, 1, 3, 2, 4, 3, 1], E, 36, 53, 81, art=1.4)
    bassline('pizz', T(bk + 2, 2), T(bk + 4), 'root', 46, lo=36)


def finale():
    """Такты 82–98, ре мажор. «Что вырастает» — канон всех глав: тема у фортепиано, челеста отвечает октавой выше,
    кларнет — третьим голосом. «Паспорт» — под чтение: арфа, пиццикато и длинные ноты кларнета.
    «Аутро» — широко и спокойно: тема у струнных и фортепиано, валторна, арфа; без ударных и метронома.
    Финал — тоника до конца; намёк на 10–13: синкопы пиццикато и прыжок."""
    gr, su, ou, fi = START['grow'], START['summary'], START['outro'], START['final']
    seq('pno', T(gr + 1), "A5/1 B5/1 A5/2 F#5/1 A5/1 F#5/1 E5/1 | D5/2 E5/1 D5/1 A4/2 D5/2", E, 72)
    seq('cel', T(gr + 2), "A6/1 B6/1 A6/2 F#6/1 A6/1 F#6/1 E6/1", E, 54)
    seq('cl', T(gr + 3), "B4/2 E5/1 G5/1 E5/2 C#5/2", E, 70)
    lh(T(gr), T(su), 40, 43, 62)
    bassline('pizz', T(gr), T(su), 'half', 48, lo=38)
    dpat(gr, gr + 3, TICK, .6)
    # «Паспорт»
    seq('cl', T(su), "F#5/8 | F#5/4 D5/4 | D5/4 E5/4 | E5/4 C#5/4 | D5/4 C#5/4", E, 58, art=.97)
    arp('harp', T(su), T(ou), [0, 2, 1, 3, 2, 4, 3, 1], E, 36, 55, 83, art=1.4)
    bassline('pizz', T(su), T(ou), 'bounce', 50, lo=38)
    pad('str', T(su), T(ou), 32, 55, 72)
    dpat(su, su + 4, TICK, .5)
    # «Аутро»: широко
    mel = "A4/3 B4/1 A4/4 | F#4/2 A4/2 F#4/2 E4/2 | D4/3 E4/1 D4/2 B3/2 | E4/3 F#4/1 G4/2 E4/2 | F#4/4 E4/4"
    seq('str', T(ou), mel, E, 64, art=.97)
    seq('pno', T(ou), "A5/3 B5/1 A5/4 | F#5/2 A5/2 F#5/2 E5/2 | D5/3 E5/1 D5/2 B4/2 | E5/3 F#5/1 G5/2 E5/2 | F#5/4 E5/4", E, 66)
    seq('hn', T(ou), "D4/8 | D4/4 C#4/4 | D4/4 D4/4 | B3/4 C#4/4 | D4/4 D4/4", E, 56, art=.98)
    swell('str', T(ou), T(ou + 2), 80, 116)
    swell('str', T(ou + 3), T(fi), 116, 96)
    arp('harp', T(ou), T(fi), [0, 2, 1, 3, 2, 4, 3, 1], E, 38, 55, 86, art=1.4)
    bassline('pizz', T(ou), T(fi), 'root', 48, lo=38)
    # Финал: тоника до конца
    hold(T(fi) + 6, T(fi + 3), [('str', (50, 57, 62, 66, 69), 48), ('hn', (62, 66), 50)])
    put('timp', T(fi), Q * 2, 38, 58)
    put('pizz', T(fi), Q * 2, 38, 54)
    seq('pno', T(fi), "A5/1 B5/1 A5/6", E, 58)
    seq('pizz', T(fi + 1, 2), "r/1 D3/1. r/1 A2/1. | r/1 D3/1. r/2 A2/1.", E, 44)   # синкопы — намёк на 10–13
    dpat(fi, fi, TICK, .4)
    gliss('harp', T(fi + 2), 50, 86, 30, 38, 'D')
    put('glk', T(fi + 2), Q * 3, 98, 38)


CHAPTERS = [intro, part1, part2, part3, part4, finale]



# ════════════════════════ Сборка ════════════════════════
for chapter in CHAPTERS:
    chapter()
KIT_EV, kit = [], None
for name, sc in SCENES:
    if sc['kit'] != kit:
        KIT_EV.append((max(0, T(START[name]) - 2), KITS[sc['kit']]))
        kit = sc['kit']
    base = (START[name] - 1) * 2.5
    for kind, s, n, vel, dur in sc['acc']:
        tk = int(round((base + s) * SEC))
        if kind == 'perc':
            put('dr', tk, dur * Q, n, vel, 9, jit=0)
        else:
            free = kind.endswith('!')
            put(kind.rstrip('!'), tk, dur * Q, n if free else snap(n, tk), vel, 1, 'drop' if free else 'chord', jit=0,
                tag='%s %.2f %s' % (name, s, kind))

# ── Размещение: сначала сочинённое, потом акценты, бас, фактура; фактура обходит конфликты ──
PLACED, IDX, DROPPED, MOVED = [], {}, [], []


def conflict(t0, t1, p):
    for bb in range(t0 // BAR, (t1 - 1) // BAR + 1):
        for k in IDX.get(bb, ()):
            a0, a1, q = PLACED[k][:3]
            if abs(p - q) in (1, 13, 25) and min(a1, t1) - max(a0, t0) >= 120:
                return True
    return False


for prio, _, v, t0, t1, p, vel, flex, tag in sorted(QUEUE, key=lambda x: (x[0], x[1])):
    if v != 'dr' and flex and conflict(t0, t1, p):
        alt = []
        if flex == 'chord':
            pcs = pcs_at(t0)
            alt = [x for x in sorted(range(p - 7, p + 8), key=lambda x: (abs(x - p), -x))
                   if x % 12 in pcs and x != p and not conflict(t0, t1, x)]
        if not alt:
            if tag:
                DROPPED.append(tag)
            continue
        if tag:
            MOVED.append('%s %d→%d' % (tag, p, alt[0]))
        p = alt[0]
    k = len(PLACED)
    PLACED.append([t0, t1, p, v, vel])
    if v != 'dr':
        for bb in range(t0 // BAR, (t1 - 1) // BAR + 1):
            IDX.setdefault(bb, []).append(k)

# одинаковая нота на одном канале не должна перекрываться (иначе note_off обрежет следующую)
same = {}
for nt in PLACED:
    same.setdefault((VOICES[nt[3]][0], nt[2]), []).append(nt)
for lst in same.values():
    lst.sort()
    for x, y in zip(lst, lst[1:]):
        if y[0] < x[1]:
            x[1] = max(x[0] + 20, y[0] - 4)

# ── Проверка: нет ли одновременных нот через полутон / малую нону / две октавы + полутон (ударные не в счёт) ──
bad = 0
L = sorted((a0, a1, p, v) for a0, a1, p, v, _ in PLACED if v != 'dr')
for i in range(len(L)):
    a0, a1, an, av = L[i]
    for j in range(i + 1, len(L)):
        b0, b1, bn, bv = L[j]
        if b0 >= a1 - 60:
            break
        if min(a1, b1) - max(a0, b0) < 120:
            continue
        if abs(an - bn) in (1, 13, 25):
            bad += 1
            if bad <= 12:
                print('clash bar %.2f: %d(%s) vs %d(%s)' % (max(a0, b0) / BAR + 1, an, av, bn, bv))
print('clashes:', bad)
if DROPPED:
    print('акценты выпали (конфликт):', '; '.join(DROPPED))
if MOVED:
    print('акценты сдвинуты на другой тон аккорда:', '; '.join(MOVED))

# ── Файл ──
mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
meta = mido.MidiTrack()
mid.tracks.append(meta)
meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
meta.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
meta.append(mido.MetaMessage('end_of_track', time=NBARS * BAR + 2 * Q))
chans = {}
for v, cfg in VOICES.items():
    chans.setdefault(cfg[0], []).append(v)
for ch in sorted(chans):
    evs = [(0, 1, mido.Message('control_change', channel=ch, control=93, value=0)),
           (0, 1, mido.Message('control_change', channel=ch, control=11, value=110))]
    if ch == 9:
        evs += [(t, 1, mido.Message('program_change', channel=9, program=pr)) for t, pr in KIT_EV]
    cur, cur_end = None, 0
    for t0, t1, p, v, vel in sorted(n for n in PLACED if VOICES[n[3]][0] == ch):
        if v != cur:
            if cur is not None and t0 < cur_end - 60:
                print('WARN: канал %d — %s вступает, пока звучит %s (такт %.2f)' % (ch, v, cur, t0 / BAR + 1))
            _, prog, vol, pan, rev = VOICES[v]
            tt = max(0, t0 - 1)
            if ch != 9:
                evs.append((tt, 1, mido.Message('program_change', channel=ch, program=prog)))
            for c_, val in ((7, vol), (10, pan), (91, rev)):
                evs.append((tt, 1, mido.Message('control_change', channel=ch, control=c_, value=val)))
            cur, cur_end = v, 0
        cur_end = max(cur_end, t1)
        evs.append((t0, 2, mido.Message('note_on', channel=ch, note=p, velocity=vel)))
        evs.append((t1, 0, mido.Message('note_off', channel=ch, note=p, velocity=0)))
    for v, t, val in EXPR:
        if VOICES[v][0] == ch:
            evs.append((t, 1, mido.Message('control_change', channel=ch, control=11, value=max(0, min(127, val)))))
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    last = 0
    for t, _, msg in sorted(evs, key=lambda e: (e[0], e[1])):
        msg.time = t - last
        last = t
        tr.append(msg)
mid.save(OUT)
print('saved', OUT, 'length %.2f s' % mid.length, 'notes:', len(PLACED))

# ── Сводка: ноты и инструменты по сценам ──
print('\n%-11s %5s %5s  %s' % ('сцена', 'такты', 'нот', 'инструменты'))
order = list(VOICES)
for name, sc in SCENES:
    s0, s1 = T(START[name]), T(START[name] + sc['bars'])
    ns = [nt for nt in PLACED if s0 <= nt[0] + 12 < s1]
    print('%-11s %5d %5d  %s' % (name, sc['bars'], len(ns), ' '.join(sorted({nt[3] for nt in ns}, key=order.index))))
