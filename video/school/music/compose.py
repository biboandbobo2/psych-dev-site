"""Оригинальная музыка к ролику «От семи до десяти» (серия «Психология развития», эпизод «Младший школьный возраст»),
версия 2 (124 такта = 5:10).

Основа — партитура 3–7 (третья версия, принятая автором): те же тёплые тембры, регистры и громкости —
маримба, челеста, колокольчики, арфа, вибрафон, пиццикато и тихий контрабас, флейта, кларнет, гобой, струнные pp,
лёгкая перкуссия (wood block, клаве, маракас, треугольник). Без фагота, литавр, медных, тарелок и томов;
акценты — короткие светлые ноты не ниже C3, подтянутые к аккорду; бас мягкий, без отдельных низких ударов.
Одна сетка на весь файл: 4/4, 96 bpm, такт = 2,5 с (картинка смонтирована по ней, смен темпа нет).
«12/8» — триольное деление четверти (160 тиков).

Замысел — «музыка по правилам»: ровный пульс, канон и имитация в форме, но звук мягкий.
Музыка строится по ГЛАВАМ (CHAPTERS), громкость глав одна, меняются грув и тональность:
вступление (т. 1–10, ре мажор: галоп 3–7 → ровное тиканье) · гл. 1 «Новое место» (т. 11–42, соль мажор,
прямые восьмые маримбы, канон кларнета и флейты) · гл. 2 «Думать по правилам» (т. 43–66, до мажор, 12/8 арфы:
тема и её зеркало вместе, ракоход) · гл. 3 «Помнить нарочно» (т. 67–85, фа мажор, тик-так: в «шлеме» фраза вслух →
шёпотом у одной челесты → снова вслух; шахматная перекличка) · гл. 4 «Я умею» (т. 86–107, ля мажор, вприпрыжку
12/8; «Велосипед» — ровное течение и соло «сам еду») · итог и финал (т. 108–124, ре мажор: тема канонами,
широко под цитату, тоника до конца).
Тема серии (ступени 5-6-5 | 3-5-3-2) — в каждой главе в своём виде; заставка главы начинает её мягко (челеста,
арфа или флейта), следующая сцена договаривает. Стоп-кадры — пульс замирает, струнные pp держат аккорд.

SCENES хранит порядок и длины сцен (как в assets/js/scenes-*.js), гармонию и синхронные акценты из SYNC.md:
acc = [(вид, секунды от начала сцены, нота, громкость, длительность в долях)] — нота подстраивается
к текущему аккорду (snap); вид с «!» — без подстройки; 'perc' — нота ударной установки GM.
Детерминированно: «очеловечивание» — фиксированный генератор (LCG).

Запуск (из music/): ~/.venvs/video-music/bin/python compose.py  →  school.mid (затем render.sh)
"""
import re
from itertools import combinations

import mido

BPM, TPB = 96, 480
Q = TPB                  # четверть = 0,625 с
E, S, TR = Q // 2, Q // 4, Q // 3   # восьмая, шестнадцатая, триольная восьмая («12/8»)
BAR = 4 * Q              # 1920 тиков = 2,5 с
SEC = TPB * BPM / 60     # 768 тиков в секунде
OUT = 'school.mid'

# ── перкуссия (GM): только лёгкая — дерево, клаве, маракас, треугольник ──
CLAVES, WBH, WBL, MARACA, TRI_O = 75, 76, 77, 70, 81
KITS = {'std': 0}

# ── голоса: канал, программа GM, громкость, панорама, реверберация ──
VOICES = {
    'fl':   (0, 73, 100, 74, 40),
    'cl':   (1, 71, 102, 50, 36),
    'ob':   (2, 68, 94, 84, 36),
    'str':  (5, 48, 92, 64, 56),
    'xyl':  (6, 13, 84, 88, 36),
    'pizz': (7, 45, 100, 48, 36),
    'bass': (8, 32, 92, 62, 16),
    'dr':   (9, 0, 84, 64, 34),
    'mar':  (10, 12, 104, 38, 30),
    'glk':  (11, 9, 76, 92, 50), 'bell': (11, 14, 80, 72, 64),
    'cel':  (12, 8, 92, 98, 50),
    'harp': (13, 46, 100, 28, 50),
    'vib':  (14, 11, 90, 86, 50),
}

NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
      'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10),
        'sus4': (0, 5, 7), '7sus4': (0, 5, 7, 10), 'add9': (0, 4, 7, 2), '6': (0, 4, 7, 9), 'dim': (0, 3, 6)}
KEYPC = {'D': 2, 'G': 7, 'A': 9, 'F': 5, 'Bm': 2}     # тоника мажорного звукоряда (си минор = ре мажор)


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



KEYPC = {'D': 2, 'G': 7, 'C': 0, 'F': 5, 'A': 9}     # тоника мажорного звукоряда


def hop(t, lo=74, hi=81, v=46):
    """Прыжок: два светлых звука ксилофона вверх (без «приземления» внизу)."""
    return [('xyl', t, lo, v, .2), ('xyl', round(t + .1, 3), hi, v + 4, .25)]


def steps(kind, t0, t1, dt, notes, vel):
    """Шаги героя: по ноте на шаг, ноты по кругу из списка (подтягиваются к аккорду)."""
    k = int(round((t1 - t0) / dt)) + 1
    return [(kind, round(t0 + i * dt, 3), notes[i % len(notes)], vel, .25) for i in range(k)]


def smile(t, hi=88, lo=84, v=44):
    """«Неверный / усталый ответ» — лёгкая нисходящая терция челесты, с улыбкой."""
    return [('cel', t, hi, v, .4), ('cel', round(t + .22, 3), lo, v - 4, .8)]


# ── Сцены: такты, тональность, ударная установка, гармония по тактам (через пробел — равные доли такта), акценты ──
SCENES = [
    # ── Вступление (ре мажор) ──
    ('prologue', dict(bars=3, key='D', kit='std', harm=['D', 'D', 'G A7'],
                      acc=hop(0.9) + hop(1.65)                                                     # галоп из 3–7
                      + run('harp', 2.8, [62, 66, 69, 74], 0.22, 38, .5)                          # палочка встаёт в пропись
                      + run('cel', 3.7, [74, 78, 81, 86], 0.22, 44, .4, 2)                         # четыре черты
                      + [('glk', 5.1, 86, 48, 1), ('perc', 5.1, TRI_O, 24, 1)])),                  # «4»
    ('title', dict(bars=3, key='D', kit='std', harm=['D', 'Bm7 G', 'Em7 A7'],
                   acc=[('glk', 0.25, 93, 40, 1), ('harp', 0.25, 62, 44, 1)]                     # карта
                   + run('harp!', 3.75, PENT('D', 62, 86, True), 0.05, 38, .2))),                # сворачивается в шкалу
    ('ages', dict(bars=4, key='D', kit='std', harm=['D', 'G D/F#', 'Em7 A7', 'D D7'],
                  acc=run('mar', 0.95, [66, 69, 74, 78, 81], 0.4, 42, .3, 1)                     # полосы стран
                  + steps('pizz', 3.0, 5.7, 0.3, [57, 62, 66], 36)                                 # Миша идёт по оси
                  + hop(5.8, 76, 83) + [('glk', 6.3, 86, 44, 1)])),                                # «Россия»
    # ── Глава 1 «Новое место» (соль мажор) ──
    ('ch1', dict(bars=1, key='G', kit='std', harm=['G'], acc=[('harp', 0.0, 55, 40, 1)])),
    ('firstday', dict(bars=5, key='G', kit='std', harm=['G', 'Em7 C', 'G D', 'C D', 'G D7'],
                      acc=steps('pizz', 0.5, 1.7, 0.3, [55, 59], 36)                               # с мамой
                      + [('glk', 1.9, 86, 42, .8)]                                                 # «Пока, мам!»
                      + steps('mar', 2.7, 4.2, 0.3, [67, 71, 74], 38)                              # через линию
                      + [('vib', 3.6, 74, 40, 1)] + run('cel', 4.4, [79, 83], 0.12, 38)            # учитель, тетрадь
                      + [('glk', 5.4, 91, 48, 1), ('perc', 5.4, TRI_O, 22, 1)]                     # красная «5»
                      + run('harp', 6.4, [67, 71, 74, 79, 83], 0.2, 38, .5))),                    # дуги
    ('merka', dict(bars=9, key='G', kit='std',
                   harm=['G', 'Em7', 'C D', 'G', 'Em7 Am7', 'D', 'G Em7', 'C D', 'G D7'],
                   acc=[('mar', 0.6, 67, 42, .3), ('mar', 0.8, 71, 42, .3)]                        # ленты
                   + [('vib', 1.8, 74, 40, .5), ('vib', 2.05, 79, 42, 1), ('xyl', 2.6, 79, 42, .25)]
                   + run('mar', 4.3, [67, 71, 74], 0.6, 44, .3, 2)                                 # мерка по А
                   + run('mar', 7.1, [67, 71, 74, 79], 0.6, 44, .3, 2)                             # мерка по Б
                   + [('glk', 9.4, 86, 48, 1), ('cel', 10.9, 79, 40, .4), ('cel', 11.1, 83, 42, .6)])),
    ('youngest', dict(bars=9, key='G', kit='std',
                      harm=['G', 'D/F# Em7', 'C G/B', 'Am7 D', 'G', 'Em7', 'C', 'Am7 D7', 'G G'],
                      acc=run('cel!', 0.8, PENT('G', 67, 91), 0.1, 30, .3, 1)                     # дети встают в ряд
                      + hop(2.2, 79, 86)                                                           # Миша последним
                      + run('harp!', 9.6, PENT('G', 67, 91), 0.07, 34, .2, 1)                     # перелистывание
                      + [('mar', 13.5, 74, 44, .3), ('mar', 13.65, 79, 46, .4)])),                 # столбики
    ('chat', dict(bars=8, key='G', kit='std', harm=['G', 'Em7', 'C', 'D7', 'G', 'Em7', 'Am7 D7', 'Dm7 G7'],
                  acc=[('glk', round(1.0 + 0.1 * i, 2), (86, 91)[i % 2], 32, .2) for i in range(6)]  # звонок
                  + [x for t in (1.4, 8.0, 13.0) for x in (('cel', t, 79, 38, .3), ('cel', round(t + .1, 2), 83, 40, .4))]
                  + [x for t in (4.4, 11.0, 16.0) for x in (('pizz', t, 67, 48, .3), ('perc', t, WBL, 26, .2))])),
    # ── Глава 2 «Думать по правилам» (до мажор, 12/8) ──
    ('ch2', dict(bars=1, key='C', kit='std', harm=['C'], acc=[('harp', 0.0, 60, 40, 1)])),
    ('glass', dict(bars=8, key='C', kit='std',
                   harm=['C', 'Am7 F', 'C G', 'F G', 'C Am', 'F G', 'Em7 Am7', 'Dm7 G7'],
                   acc=run('harp', 0.5, [67, 72, 76, 79], 0.12, 36, .4)                           # облако-воспоминание
                   + [('glk', 1.6, 88, 44, .8)]                                                    # «В высоком!»
                   + run('cel', 4.2, [84, 79, 76, 72], 0.12, 34, .4)                              # облако тает
                   + run('harp!', 6.7, PENT('C', 60, 88, True), 0.075, 36, .2)                    # переливание
                   + [('vib', 8.2, 76, 40, .5), ('vib', 8.45, 79, 42, 1)]                          # «А теперь где больше?»
                   + smile(9.6) + smile(11.0))),                                                  # два усталых ответа
    ('line', dict(bars=7, key='C', kit='std', harm=['C', 'Fmaj7', 'C', 'G C', 'Am F', 'Dm7 G', 'C G7'],
                  acc=run('harp', 0.5, [60, 64, 67, 72, 76, 79], 0.18, 36, .4)                    # линия
                  + steps('pizz', 5.6, 7.76, 0.36, [55, 60, 64, 67], 36)                           # с флажком
                  + [('glk', 7.9, 84, 46, .8), ('cel', 8.1, 79, 40, .3), ('cel', 8.22, 84, 44, .6)]  # флажок, «150 — тут!»
                  + [('mar', 9.8, 72, 42, .3), ('mar', 9.92, 76, 44, .4)]                          # флажок учителя
                  + run('harp!', 14.6, PENT('C', 72, 88), 0.06, 34, .2)                           # перелистывание
                  + [('glk', 15.6, 88, 44, 1)])),                                                  # галочка
    ('archimedes', dict(bars=8, key='C', kit='std',
                        harm=['C', 'Am7 F', 'C G', 'F C', 'Am7 Dm7', 'G C', 'F G', 'Dm7 C7'],
                        acc=[('vib', 1.4, 76, 40, .5), ('vib', 1.65, 79, 42, 1)]                   # вопрос учителя
                        + hop(3.0, 76, 84) + [('glk', 3.4, 88, 44, .8)]                            # подпрыгивает, отвечает
                        + run('harp', 3.8, [67, 72, 76, 72, 67, 72, 76, 79], 0.19, 34, .4)         # кораблик на доске
                        + [('pizz', 5.6, 60, 42, .3), ('pizz', 5.85, 55, 40, .4)]                  # кивок
                        + run('harp!', 7.0, PENT('C', 72, 88), 0.06, 34, .2)                      # перелистывание «дома»
                        + [('vib', 8.4, 76, 40, .5), ('vib', 8.65, 79, 42, 1), ('cel', 9.8, 84, 34, 1.5)]
                        + [('pizz', 11.1, 67, 56, .3), ('glk', 11.1, 91, 50, .6)]                  # «Брат — это Петя!»
                        + [('xyl', 11.8, 84, 38, .2), ('xyl', 11.9, 88, 40, .25)])),               # младший машет ложкой
    # ── Глава 3 «Помнить нарочно» (фа мажор, тик-так) ──
    ('ch3', dict(bars=1, key='F', kit='std', harm=['F'], acc=[('harp', 0.0, 53, 38, 1)])),
    ('helmet', dict(bars=11, key='F', kit='std',
                    harm=['F', 'F C', 'F Dm', 'Bb C', 'F', 'Dm7 Gm7', 'C7 F', 'Bb F', 'Gm7 C', 'F Dm', 'Gm7 C7'],
                    acc=run('cel', 0.6, [77, 81, 84], 0.2, 36, .4)                                # картинки
                    + run('mar', 1.6, [72, 77, 81], 0.45, 42, .3)                                 # обводки
                    + [('vib', 3.0, 77, 40, 1)]                                                    # шлем
                    + run('harp', 4.6, [84, 79, 76], 0.12, 34, .4)                                # козырёк вниз
                    + run('harp', 9.4, [72, 77, 81, 84], 0.1, 36, .4)                             # козырёк вверх
                    + run('glk', 9.9, [84, 89, 93], 0.35, 42, .5, 2)                              # галочки
                    + run('mar', 11.6, [72, 77, 81], 0.2, 42, .3)                                 # столбики
                    + [('glk', 17.0, 89, 44, 1)])),                                                # столбик 2021
    ('chess', dict(bars=7, key='F', kit='std', harm=['F', 'Dm Bb', 'F C', 'Bb F', 'Gm7 C', 'F Dm', 'Dm7 E7'],
                   acc=[('harp', 0.8, 65, 40, 1), ('perc', 1.0, WBH, 26, .2)]                     # доска, «10 с»
                   + [('cel', 3.2, 84, 38, .4), ('cel', 3.4, 77, 34, .8)]                          # доску накрыли
                   + run('mar', 4.1, [65, 69, 72, 77, 81, 84], 0.38, 40, .3, 2)                   # фигуры по памяти
                   + [('glk', 6.2, 89, 48, 1), ('perc', 6.2, TRI_O, 22, 1)]                        # «Миша 9»
                   + run('cel', 10.0, [72, 77, 81, 84, 89], 0.1, 34, .3)                          # ряд цифр
                   + [('pizz', 12.0, 62, 44, .3)] + smile(12.2, 86, 81, 40))),                    # «папа 8»
    # ── Глава 4 «Я умею» (ля мажор, вприпрыжку) ──
    ('ch4', dict(bars=1, key='A', kit='std', harm=['A'], acc=[('harp', 0.0, 57, 40, 1)])),
    ('twenty', dict(bars=8, key='A', kit='std', harm=['A', 'F#m D', 'A E', 'D E', 'A C#m', 'D E', 'F#m D', 'Bm7 E7'],
                    acc=[('mar', 7.2, 76, 44, .3), ('mar', 7.4, 81, 48, .4), ('glk', 8.1, 88, 48, 1)]  # «4», «5», «У него пять!»
                    + run('cel', 14.6, [76, 81, 85, 88], 0.33, 36, .5, 2))),                       # плитки самооценки
    ('recess', dict(bars=7, key='A', kit='std', harm=['A', 'D A', 'F#m E', 'D A', 'Bm E', 'A F#m', 'D E'],
                    acc=hop(0.8, 76, 81, 42) + hop(1.3, 76, 81, 42)                                # прыжки
                    + [('pizz', 1.9, 64, 46, .3), ('perc', 1.9, WBH, 24, .2)]                      # «Ты наступил на линию!»
                    + [x for t in (3.8, 5.0, 6.2) for x in run('harp', t, [69, 73, 76], 0.06, 34, .4)]  # скачки времени
                    + steps('pizz', 7.6, 8.2, 0.3, [57, 61, 64], 36)                               # идёт к мальчику
                    + [('glk', 8.6, 88, 46, 1), ('vib', 8.6, 81, 40, 1)]                           # «Пойдём с нами!»
                    + [x for i in range(4) for x in hop(round(10.2 + 0.4 * i, 2), 76, 81, 38)])),  # к классикам
    ('bike', dict(bars=6, key='A', kit='std', harm=['A', 'D A', 'D F#m', 'Bm7 E', 'F#m Bm7', 'Em7 A7'],
                  acc=[('harp', 2.2, 69, 40, 1)]                                                   # мама отпускает
                  + run('harp!', 5.6, PENT('A', 69, 88), 0.06, 32, .2)                            # перелистывание
                  + [('vib', 6.4, 81, 36, .6), ('vib', 6.7, 78, 34, 1.2)])),                      # «никогда не получится» — мягко
    # ── Итог и финал (ре мажор) ──
    ('grow', dict(bars=4, key='D', kit='std', harm=['D', 'Bm7 G', 'Em7 A', 'D A7'],
                  acc=run('cel', 0.4, [74, 78, 81], 0.37, 36, .4) + [('vib', 2.4, 78, 40, 1)])),
    ('summary', dict(bars=5, key='D', kit='std', harm=['D A/C#', 'Bm7 G', 'D/F# G', 'Em7 A7', 'D D G A7'],
                     acc=[('vib', round(0.8 + i * 0.8, 2), n, 38, .8) for i, n in enumerate((62, 66, 69, 74, 78, 81, 86))])),
    ('outro', dict(bars=5, key='D', kit='std', harm=['D', 'Bm7 F#m', 'G D/F#', 'Em7 A', 'G A7'],
                   acc=run('cel', 0.4, [74, 78, 81, 86, 81, 78, 74, 78, 81], 0.5, 30, .5))),       # вещи кружат
    ('final', dict(bars=3, key='D', kit='std', harm=['D', 'D', 'D'],
                   acc=[('glk', 1.0, 86, 44, 1), ('harp', 1.3, 74, 44, .8)]                        # карточки
                   + hop(3.9, 74, 81, 40) + [('mar', 4.3, 78, 38, .4)])),                          # прыжок к 10–13
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
assert NBARS == 124, NBARS
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


MEL = 0.9                # мелодия чуть тише относительно фактуры — без скачков громкости на входах


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
                put(v, t + pos * unit, ln * unit * a, p, (vel + dv) * MEL, prio, flex, jit)
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
# Шесть разделов; внутри — один грув и сквозная мелодическая линия. Сцена меняет фактуру,
# но не перезапускает фразу: на стыках — продолжение, каданс или затакт (мягкая арфа).
# Громкость глав одна: мелодия 66–76, фактура 32–40, бас 44–52, струнные pp 32–38.
HOOVES = {WBL: ('x.o...x.o...', 40), WBH: ('...x.o...x.o', 34)}      # «копыта» 3–7 в 12/8
TICK8 = {CLAVES: ('x.o.x.o.', 18)}                                  # метроном восьмыми
SHAKE12 = {MARACA: ('x.ox.ox.ox.o', 16)}                            # покачивание 12/8
TICKTOCK = {WBH: ('x...x...', 24), WBL: ('..x...x.', 20)}           # тик-так четвертями


def octave(text, k):
    """Мелодия текстом, сдвинутая на k октав."""
    return re.sub(r'([A-G][#b]?)(\d)', lambda m: m.group(1) + str(int(m.group(2)) + k), text)


SKIP = [(k, .55, 2) for k in range(4)] + [(k + 2 / 3, .25, -8) for k in range(4)]   # вприпрыжку: долго-коротко


def intro():
    """Такты 1–10, ре мажор. Галоп 3–7 в первом такте (флейта, «копыта»), палочка становится знаком —
    галоп переходит в ровные восьмые маримбы и клаве. Титр — тема серии широко у флейты, «Возраст» — кларнет."""
    p, t, a = START['prologue'], START['title'], START['ages']
    dpat(p, p, HOOVES, .6)
    bassline('pizz', T(p), T(p + 1), 'gallop', 46, lo=43)
    stabs('mar', T(p), T(p + 1), [(k + 2 / 3, .25, 0) for k in range(4)], 38, 62, 76)
    seq('fl', T(p), "A5/2 B5/1 A5/3 F#5/2 A5/1 F#5/2 E5/1 | D5/9 E5/3", TR, 72)
    seq('fl', T(p + 2), "B5/4 A5/2 G5/1 E5/1", E, 70)
    pad('str', T(p + 1), T(a + 4), 34, 55, 74)
    bassline('pizz', T(p + 1), T(a), 'half', 46, lo=43)
    dpat(p + 2, a + 3, TICK8)
    arp('mar', T(p + 2), T(a + 4), [0, 2, 1, 2, 0, 2, 1, 3], E, 34, 60, 79, art=.6, acc=[4, 0, 2, 0, 3, 0, 2, 0])
    # титр: тема 5-6-5 | 3-5-3-2 широко
    seq('fl', T(t), "A5/3 B5/1 A5/4 | F#5/3 A5/1 F#5/2 E5/2 | D5/3 E5/1 F#5/2 C#5/2", E, 74)
    arp('harp', T(t), T(a), [0, 2, 1, 3, 2, 4, 3, 1], E, 34, 55, 83, art=1.4)
    # «Возраст»: кларнет ровными четвертями — Миша шагает по оси
    seq('cl', T(a), "D5/2 F#5/2 A5/2 F#5/2 | G5/2 B5/2 A5/2 F#5/2 | E5/2 G5/2 A5/2 C#5/2 | D5/4 C5/4", E, 70)
    bassline('bass', T(a), T(a + 4), 'half', 46, lo=38)
    gliss('harp', T(a + 3, 3.2), 55, 79, 30, 36, 'G')                   # подхват в главу 1


def part1():
    """Такты 11–42, соль мажор, прямые восьмые маримбы и клаве. Заставка: челеста начинает тему (5-6-5),
    «Первый день» договаривает у кларнета и начинает канон: флейта вступает тактом позже октавой выше
    (пентатоника — голоса не трутся). «Мерка» и «Самый младший» — тише и проще под текст, имитация
    гобой → челеста, канон флейта → кларнет. «Родительский чат» — стаккато гобоя, каданс в до мажор."""
    c, f, m, y, ch = (START[x] for x in ('ch1', 'firstday', 'merka', 'youngest', 'chat'))

    def groove(t0, t1, vel=36):
        arp('mar', t0, t1, [0, 2, 1, 2, 0, 2, 1, 3], E, vel, 60, 79, art=.6, acc=[4, 0, 2, 0, 3, 0, 2, 0])
        bassline('pizz', t0, t1, 'bounce', vel + 12, lo=43)
    # заставка: тема начинается мягко
    seq('cel', T(c), "D6/2 E6/2 D6/4", E, 62)
    arp('harp', T(c), T(f), [0, 1, 2, 3, 4, 3, 2, 1], E, 34, 55, 83, art=1.4)
    bassline('pizz', T(c), T(f), 'root', 46, lo=43)
    arp('mar', T(c), T(f), [0, 2, 1, 2, 0, 2, 1, 3], E, 34, 60, 79, art=.6)
    pad('str', T(c), T(f + 1), 36, 55, 74)
    dpat(c, ch + 7, TICK8, .9)
    # «Первый день»: тема договаривается, затем канон кларнет → флейта
    subj = "E5/2 G5/1 E5/1 D5/2 E5/2 | D5/2 B4/1 G4/1 A4/2 D5/2 | E5/2 G5/1 E5/1 D5/2 A4/2 | B4/2 A4/1 G4/1 A4/4"
    seq('cl', T(f), "B4/2 D5/1 B4/1 A4/2 G4/2 | " + subj, E, 72)
    seq('fl', T(f + 2), octave(subj, 1), E, 64)
    groove(T(f), T(m + 4))
    # «Мерка»: под шаги мерки — выдержанные ноты кларнета; под объяснение — имитация гобой → челеста
    seq('cl', T(m + 1), "B4/8 | C5/4 D5/4 | B4/8 | E5/4 C5/4", E, 56)
    pad('str', T(m + 4), T(y), 32, 55, 74)
    groove(T(m + 4), T(y), 32)
    ob = seq('ob', T(m + 5), "A4/4 D5/4 | B4/4 E5/4 | E5/4 D5/4 | B4/4 A4/4", E, 58)
    for tt, d, pp in ob[:6]:
        put('cel', tt + 2 * Q, d * .8, pp + 12, 34, 1.5, 'drop')
    # «Самый младший»: канон флейта → кларнет (тактом позже, октавой ниже)
    fl = seq('fl', T(y + 1), "A5/2 B5/1 A5/1 G5/2 E5/2 | E5/2 G5/1 E5/1 D5/2 B4/2 | A4/2 E5/1 A4/1 D5/2 A4/2 | "
                             "B4/2 D5/1 G5/1 B5/4", E, 62)
    for tt, d, pp in fl:
        put('cl', tt + BAR, d, pp - 12, 54)
    groove(T(y), T(ch))
    seq('cl', T(y), "D5/4 B4/4", E, 56)
    pad('str', T(y), T(ch), 32, 55, 74)
    seq('ob', T(y + 6), "E5/4 G5/4 | C5/4 E5/4 | D5/4 C5/4", E, 56)
    # «Родительский чат»: стаккато-«переписка» гобоя, кларнет держит; каданс Dm7–G7 → до мажор
    seq('cl', T(ch), "B4/8", E, 56)
    seq('ob', T(ch + 1), "D5/1. E5/1. D5/1. r/1 B4/1. D5/1. B4/1. A4/1. | C5/1. E5/1. G5/1. r/1 E5/1. G5/1. E5/1. D5/1. | "
                         "D5/1. F#5/1. A5/1. r/1 F#5/1. A5/1. F#5/1. E5/1. | D5/1. E5/1. D5/1. r/1 B4/1. D5/1. B4/1. A4/1.", E, 66)
    seq('cl', T(ch + 5), "B4/8 | C5/4 C5/4 | C5/4 B4/4", E, 58)
    stabs('mar', T(ch), T(ch + 8), [(q + .5, .2, 0) for q in range(4)], 34, 60, 74)
    bassline('pizz', T(ch), T(ch + 8), 'bounce', 48, lo=43)
    pad('str', T(ch + 4), T(ch + 8), 34, 55, 74)
    gliss('harp', T(ch + 7, 3.2), 55, 79, 30, 36, 'C')


def part2():
    """Такты 43–66, до мажор, 12/8: арфа триолями, вибрафон, маракас, пиццикато «долго-коротко».
    Заставка: челеста начинает тему; «Стаканы» — кларнет договаривает (воспоминание из 3–7, то же покачивание);
    дальше «правило»: тема у флейты и её зеркало у кларнета звучат вместе (инвенция). Стоп-кадр «Линии» —
    пульс замирает, струнные pp держат аккорд. «Архимед» — ракоход темы, каданс в фа мажор."""
    c, g, l, a = START['ch2'], START['glass'], START['line'], START['archimedes']

    def groove(t0, t1, vel=36):
        arp('harp', t0, t1, [0, 1, 2, 3, 2, 1], TR, vel, 55, 79, art=1.4)
        stabs('vib', t0, t1, [(0, 1.7, 0), (2, 1.7, -4)], vel - 6, 64, 79)
        bassline('pizz', t0, t1, 'lilt', vel + 8, lo=43)
        dpat(t0 // BAR + 1, (t1 - 1) // BAR + 1, SHAKE12)
    seq('cel', T(c), "G5/2 A5/1 G5/3 E5/2 G5/1 E5/2 D5/1", TR, 64)
    groove(T(c), T(l + 1), 34)
    pad('str', T(c), T(g + 2), 32, 55, 72)
    seq('cl', T(g), "C5/3 E5/2 G5/1 A5/3 G5/3 | A5/2 G5/1 E5/3 F5/2 A5/1 C6/3 | G5/3 E5/3 D5/6", TR, 70)
    pad('str', T(g + 3), T(g + 5), 34, 55, 72)
    seq('ob', T(g + 3), "A4/6 B4/6 | C5/12", TR, 52)
    # инвенция: тема (флейта) и зеркало (кларнет) вместе
    seq('fl', T(g + 5), "G5/2 A5/1 G5/3 E5/2 G5/1 E5/2 D5/1 | E5/3 G5/3 A5/3 E5/3 | F5/3 D5/3 D5/3 B4/3", TR, 68)
    seq('cl', T(g + 5), "E4/2 D4/1 E4/3 G4/2 E4/1 G4/2 A4/1 | B4/3 G4/3 A4/3 C5/3 | A4/3 F4/3 G4/6", TR, 62)
    # «Линия»: стоп-кадр 2,6–4,8 с — держим аккорд, пульс замирает
    pad('str', T(l), T(l + 3), 40, 55, 74)
    seq('cl', T(l), "E5/6 C5/6 | A4/12- | G4/6 C5/6", TR, 58)
    put('vib', T(l + 1), BAR - 60, 76, 38, 1)
    put('harp', T(l + 1), BAR - 60, 65, 34, 1)
    groove(T(l + 2), T(a + 8), 34)
    seq('fl', T(l + 3), "D5/2 E5/1 D5/3 C5/2 E5/1 G5/3 | A5/3 E5/3 F5/3 A5/3 | F5/2 E5/1 D5/3 B4/3 D5/3 | C5/6 D5/3 F5/3", TR, 68)
    seq('cl', T(l + 3), "B4/2 A4/1 B4/3 E4/2 G4/1 C5/3 | C5/3 A4/3 A4/3 C5/3 | A4/6 G4/6 | E4/6 D4/6", TR, 60)
    pad('str', T(l + 4), T(a), 32, 55, 72)
    # «Архимед»: реплики под вопросы, ракоход темы под «дома», каданс C7 → фа мажор
    seq('cl', T(a), "G4/3 C5/3 E5/6", TR, 64)
    seq('cl', T(a + 3), "A4/6 G4/6", TR, 58)
    pad('str', T(a + 1), T(a + 5), 32, 55, 72)
    seq('fl', T(a + 5), "D5/2 E5/1 G5/3 E5/2 G5/1 A5/2 G5/1 | A5/3 F5/3 G5/6 | F5/6 E5/6", TR, 68)
    seq('cl', T(a + 7), "D5/6 Bb4/6", TR, 58)
    pad('str', T(a + 5), T(a + 8), 32, 55, 72)
    gliss('harp', T(a + 7, 3.2), 53, 77, 30, 36, 'F')


def part3():
    """Такты 67–85, фа мажор, тик-так: wood block четвертями, пиццикато «маршем», маримба восьмыми.
    Заставка: флейта начинает тему. «Шлем»: фраза вслух (кларнет + флейта) → наезд, фактура редеет →
    та же фраза шёпотом у одной челесты на струнных pp → козырёк вверх, фраза снова вслух.
    «Шахматы»: перекличка флейты (Миша) и кларнета (папа); каданс E7 → ля мажор."""
    c, h, ch = START['ch3'], START['helmet'], START['chess']

    def groove(t0, t1, vel=36):
        arp('mar', t0, t1, [0, 1, 2, 1], E, vel, 60, 77, art=.5)
        bassline('pizz', t0, t1, 'march', vel + 12, lo=43)
    seq('fl', T(c), "C6/2 D6/1 C6/1 A5/2 C6/1 A5/1 | G5/2 A5/2 F5/4", E, 66)
    arp('harp', T(c), T(h), [0, 1, 2, 3, 4, 3, 2, 1], E, 32, 53, 81, art=1.4)
    bassline('pizz', T(c), T(h), 'root', 44, lo=43)
    dpat(c, c, TICKTOCK, .7)
    dpat(h, h + 1, TICKTOCK)
    groove(T(h), T(h + 2, 1))
    pad('str', T(c), T(h + 2), 34, 53, 72)
    pad('str', T(h + 4), T(h + 5), 34, 53, 72)
    # вслух
    phrase = "C5/1 D5/1 C5/1 A4/1 C5/1 A4/1 G4/2"
    for tt, d, pp in seq('cl', T(h + 1), phrase, E, 66):
        put('fl', tt, d, pp + 12, 48)
    # наезд: фактура редеет; шёпот — одна челеста
    dpat(h + 2, h + 2, {WBH: ('x...x...', 16), WBL: ('..x.....', 14)})
    arp('mar', T(h + 2, 1), T(h + 2, 2), [0, 1, 2, 1], E, 30, 60, 77, art=.5)
    bassline('pizz', T(h + 2, 1), T(h + 3, 3), 'root', 38, lo=43)
    seq('cel', T(h + 2, 2.5), octave(phrase, 1), E, 56)
    pad('str', T(h + 2), T(h + 4), 40, 53, 72)
    # козырёк вверх — снова вслух
    for tt, d, pp in seq('cl', T(h + 4), phrase.replace('G4/2', 'G4/1 A4/1') + " | F4/4 G4/4", E, 64):
        if tt < T(h + 5):
            put('fl', tt, d, pp + 12, 46)
    dpat(h + 4, ch + 6, TICKTOCK, .9)
    groove(T(h + 4), T(ch + 7), 34)
    pad('str', T(h + 5), T(ch), 32, 53, 72)
    seq('ob', T(h + 5), "A4/4 Bb4/4 | G4/4 A4/4 | F4/4 A4/4 | Bb4/4 C5/4 | A4/4 F4/4 | G4/4 E4/4", E, 56)
    # «Шахматы»: перекличка
    seq('fl', T(ch), "C6/1 D6/1 C6/1 A5/1 F5/4", E, 66)
    seq('cl', T(ch + 1), "C5/1 D5/1 C5/1 A4/1 F4/4", E, 64)
    seq('fl', T(ch + 2), "A5/1 Bb5/1 A5/1 F5/1 G5/2 E5/2", E, 66)
    seq('cl', T(ch + 3), "F4/1 G4/1 F4/1 D4/1 C4/2 A4/2", E, 62)
    seq('fl', T(ch + 4), "Bb5/2 G5/2 C6/2 E5/2", E, 54)
    seq('cl', T(ch + 5), "A4/2 C5/2 D5/2 F5/2 | A4/4 B4/4", E, 62)
    seq('fl', T(ch + 6), "F5/4 E5/2 G#5/2", E, 62)
    pad('str', T(ch + 4), T(ch + 7), 32, 53, 72)
    gliss('harp', T(ch + 6, 3.2), 57, 81, 30, 36, 'A')


def part4():
    """Такты 86–107, ля мажор, вприпрыжку (12/8 «долго-коротко» маримбы, маракас, пиццикато).
    Заставка: арфа с челестой начинают тему; «Двадцать» — кларнет договаривает, под текст — тихий гобой;
    «Перемена» — тема вприпрыжку у флейты; «Велосипед» — ровное течение арфы, соло флейты «сам еду»,
    на «никогда не получится» — мягкий фа-диез минор, каданс A7 → ре мажор."""
    c, tw, r, b = START['ch4'], START['twenty'], START['recess'], START['bike']

    def groove(t0, t1, vel=34):
        stabs('mar', t0, t1, SKIP, vel, 62, 76)
        bassline('pizz', t0, t1, 'lilt', vel + 14, lo=43)
        dpat(t0 // BAR + 1, (t1 - 1) // BAR + 1, SHAKE12)
    th = "E5/2 F#5/1 E5/3 C#5/2 E5/1 C#5/2 B4/1"
    seq('harp', T(c), th, TR, 70)
    seq('cel', T(c), octave(th, 1), TR, 44)
    stabs('mar', T(c), T(tw), SKIP, 34, 62, 76)
    dpat(c, c, SHAKE12, .8)
    bassline('pizz', T(c), T(tw), 'root', 44, lo=43)
    pad('str', T(c), T(tw + 1), 32, 55, 74)
    groove(T(tw), T(b))
    seq('cl', T(tw), "A4/3 C#5/2 E5/1 A5/3 E5/3 | F#5/2 A5/1 F#5/3 D5/2 F#5/1 A5/3 | E5/6 B4/2 E5/1 G#5/3 | F#5/6 E5/6", TR, 70)
    pad('str', T(tw + 4), T(r), 32, 55, 74)
    seq('ob', T(tw + 4), "E5/6 G#5/6 | A5/6 G#5/6 | F#5/12 | D5/6 E5/3 G#5/3", TR, 56)
    seq('fl', T(r), th + " | A4/2 B4/1 D5/3 E5/2 C#5/1 A4/3", TR, 70)
    seq('ob', T(r + 2), "C#5/6 B4/6 | A4/6 C#5/6", TR, 56)
    seq('cl', T(r + 4), "D5/3 F#5/3 E5/3 G#5/3 | A5/6 F#5/6 | F#5/6 E5/6", TR, 64)
    pad('str', T(r + 2), T(b), 32, 55, 74)
    # «Велосипед»: ровное течение
    arp('harp', T(b), T(b + 6), [0, 1, 2, 3, 2, 1], TR, 36, 55, 81, art=1.4)
    bassline('pizz', T(b), T(b + 6), 'half', 46, lo=43)
    pad('str', T(b), T(b + 6), 34, 55, 74)
    seq('fl', T(b), "r/9 C#5/1 D5/1 E5/1 | F#5/3 A5/3 E5/6 | D5/3 F#5/3 C#5/6-", TR, 66)
    seq('cl', T(b + 3), "D5/6 B4/6 | C#5/6 D5/6 | B4/6 C#5/6", TR, 60)
    gliss('harp', T(b + 5, 3.2), 50, 74, 30, 36, 'D')


def finale():
    """Такты 108–124, ре мажор: «Растём» — тема у кларнета в тёплом регистре; итоги — кларнет с флейтой
    октавой выше на арфе и пиццикато (как в 3–7); «Аутро» под цитату — широко и спокойно: флейта со струнными,
    без ударных; финал — тоника до конца."""
    g, su, ou, fi = START['grow'], START['summary'], START['outro'], START['final']
    arp('harp', T(g), T(fi), [0, 2, 1, 3, 2, 4, 3, 1], E, 34, 55, 83, art=1.4)
    pad('str', T(g), T(fi), 34, 55, 72)
    bassline('pizz', T(g), T(su), 'half', 46, lo=43)
    seq('cl', T(g), "A4/3 B4/1 A4/4 | F#4/3 A4/1 F#4/2 E4/2 | G4/3 B4/1 A4/2 C#5/2 | D5/4 C#5/2 E5/2", E, 70)
    cl = seq('cl', T(su), "F#5/3 G5/1 A5/2 E5/2 | F#5/3 E5/1 D5/2 B4/2 | A4/3 D5/1 B4/2 D5/2 | G5/3 F#5/1 E5/2 C#5/2 | "
                          "D5/3 F#5/1 G5/2 E5/2", E, 72, art=.96)
    for tt, d, pp in cl:
        put('fl', tt, d, pp + 12, 50)
    stabs('pizz', T(su), T(ou), [(q + .5, .25, 0) for q in range(4)], 36, 55, 69)
    bassline('bass', T(su), T(ou), 'half', 46, lo=38)
    dpat(su, su + 4, {MARACA: ('xoxoxoxo', 16)})
    # под цитату — широко
    mel = "A5/4 B5/2 A5/2 | F#5/3 A5/1 F#5/2 E5/2 | D5/4 B4/2 D5/2 | E5/4 G5/2 C#5/2 | B4/4 A4/4"
    seq('fl', T(ou), mel, E, 70, art=.97)
    seq('str', T(ou), octave(mel, -1), E, 50, art=.97)
    bassline('pizz', T(ou), T(fi), 'root', 42, lo=43)
    # финал: 3-2-1 и тоника до конца
    seq('fl', T(fi), "F#5/3 E5/1 D5/12", E, 64, art=.98)
    for v, ns, vel in (('str', (50, 57, 62, 66, 69), 40), ('cl', (69,), 44), ('bass', (38,), 42), ('vib', (74, 78, 81), 30)):
        for nn in ns:
            put(v, T(fi) + 6, 3 * BAR - 60, nn, vel, jit=0)
    gliss('harp', T(fi), 50, 86, 30, 34, 'D')
    put('glk', T(fi + 1, 2), Q * 3, 98, 36)


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
