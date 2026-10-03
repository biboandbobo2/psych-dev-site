"""Оригинальная музыка к ролику «От трёх до семи» (серия «Психология развития», эпизод «Дошкольный возраст»).

Лёгкая оркестровая партитура «объясняющего» кино: маримба, ксилофон, колокольчики, челеста, арфа,
пиццикато и контрабас, деревянные духовые, струнные, валторна, засурдиненная труба, лёгкие ударные.
Одна сетка на весь файл: 4/4, 96 bpm, такт = 2,5 с (картинка смонтирована по ней, смен темпа нет).
«12/8» — триольное деление четверти (160 тиков).

Тональности по главам: интро — ре мажор; ч.1 «Как взрослые · игра» — соль мажор;
ч.2 «Мир глазами другого» — ля мажор (12/8); ч.3 «Хочу, но надо» — фа мажор с ре-минорными моментами;
ч.4 «На пороге школы» — си минор (энергично) → ре мажор (марш, гимн, кода).
Тема серии (ступени 5-6-5 | 3-5-3-2) — лейтмотив: галоп (пролог, финал), марш (часовой, школа),
покачивание 12/8 (ч.2–3), полный тутти-гимн (школа, итоги).

Партитура собрана по сценам (SCENES): порядок и длины совпадают с assets/js/scenes-*.js;
акценты acc = [(вид, секунды от начала сцены, нота, громкость, длительность в долях)] — подстраиваются
к текущему аккорду (snap); вид с «!» — без подстройки; 'perc' — нота ударной установки GM.
Детерминированно: «очеловечивание» — фиксированный генератор (LCG).

Запуск (из music/): ~/.venvs/video-music/bin/python compose.py  →  preschool.mid (затем render.sh)
"""
from itertools import combinations

import mido

BPM, TPB = 96, 480
Q = TPB                  # четверть = 0,625 с
E, S, TR = Q // 2, Q // 4, Q // 3   # восьмая, шестнадцатая, триольная восьмая («12/8»)
BAR = 4 * Q              # 1920 тиков = 2,5 с
SEC = TPB * BPM / 60     # 768 тиков в секунде
OUT = 'preschool.mid'

# ── ударные (GM) ──
KICK, SIDE, SN, TOM_FL, HHC, HHP, TOM_L, TOM_M, CRASH, SPLASH, TAMB = 36, 37, 38, 41, 42, 44, 45, 47, 49, 55, 54
CONGA_MH, CONGA_H, CONGA_L, MARACA, GUIRO, CLAVES, WBH, WBL = 62, 63, 64, 70, 74, 75, 76, 77
TRI_M, TRI_O, BELLTREE = 80, 81, 84
KITS = {'std': 0, 'brush': 40}

# ── голоса: канал, программа GM, громкость, панорама, реверберация ──
VOICES = {
    'fl':   (0, 73, 100, 74, 40), 'picc': (0, 72, 84, 80, 40),
    'cl':   (1, 71, 102, 50, 36),
    'ob':   (2, 68, 96, 84, 36),
    'bn':   (3, 70, 104, 58, 30),
    'hn':   (4, 60, 96, 42, 52), 'tpt': (4, 59, 84, 78, 40),
    'str':  (5, 48, 92, 64, 56),
    'trem': (6, 44, 80, 70, 50), 'xyl': (6, 13, 86, 88, 36),
    'pizz': (7, 45, 102, 48, 36),
    'bass': (8, 32, 108, 62, 16),
    'dr':   (9, 0, 90, 64, 34),
    'mar':  (10, 12, 104, 38, 30),
    'glk':  (11, 9, 76, 92, 50), 'bell': (11, 14, 84, 72, 64),
    'cel':  (12, 8, 92, 98, 50),
    'harp': (13, 46, 100, 28, 50),
    'vib':  (14, 11, 90, 86, 50),
    'timp': (15, 47, 100, 62, 44),
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


def hop(t, lo=74, hi=81, land=38, v=52):
    """Прыжок: отрыв (два звука ксилофона вверх) и мягкое приземление (литавра) через 0,5 с."""
    return [('xyl', t, lo, v, .2), ('xyl', round(t + .1, 3), hi, v + 4, .25), ('timp', round(t + .5, 3), land, v + 4, .5)]


# ── Сцены: такты, тональность, ударная установка, гармония по тактам (через пробел — равные доли такта), акценты ──
SCENES = [
    ('prologue', dict(bars=3, key='D', kit='std', harm=['D', 'D', 'G A7'],
                      acc=[('harp', 0.25, 62, 56, 1)]
                      + run('cel', 1.05, [69, 74, 78, 81, 86, 90, 93], 0.18, 34, .5, 2)
                      + hop(2.5) + hop(3.75) + hop(5.0))),
    ('title', dict(bars=3, key='D', kit='std', harm=['D', 'Bm7 Gmaj7', 'Em7 A7'],
                   acc=[('glk', 0.85, 93, 46, 1.5), ('perc', 0.85, TRI_O, 34, 1)]
                   + run('harp!', 3.75, PENT('D', 62, 93), 0.045, 48, .2, 1))),
    ('note', dict(bars=3, key='D', kit='std', harm=['G D/F#', 'Em7 A7', 'D D7'],
                  acc=run('cel!', 3.0, [64, 67, 71, 74, 76, 79, 83, 86, 88, 93, 97, 100], 0.09, 32, .3, 1))),
    ('ch1', dict(bars=1, key='G', kit='std', harm=['G'],
                 acc=[('glk', 0.0, 91, 50, 1.5), ('perc', 0.0, TRI_O, 38, 1)])),
    ('ssr', dict(bars=4, key='G', kit='std', harm=['G G/B', 'C D', 'G E7', 'Am7 D7'],
                 acc=[('xyl', 0.6, 71, 56, .25), ('xyl', 0.85, 74, 58, .25), ('xyl', 1.1, 79, 62, .3)]
                 + [x for t in (2.5, 3.75) for x in (('xyl', t, 67, 50, .2), ('xyl', t + .12, 74, 54, .2), ('xyl', t + .36, 71, 44, .3))]
                 + [('harp', 5.0, 55, 62, 1)] + run('glk', 5.6, [79, 83, 86, 83], 0.1, 44)
                 + [('xyl', 6.25, 68, 50, .2), ('xyl', 6.37, 76, 56, .25), ('timp', 6.75, 40, 52, .5)]
                 + [('tpt', 7.5, 76, 74, .35), ('tpt', 7.75, 76, 78, .6), ('tpt', 8.75, 74, 70, .35), ('tpt', 9.0, 78, 74, .6)]
                 + [x for t in (7.5, 8.75) for x in (('perc', t, TOM_L, 44, .3), ('perc', t, KICK, 40, .3))])),
    ('fields', dict(bars=6, key='G', kit='std', harm=['Gmaj7', 'Em7', 'Cmaj7', 'D', 'Bm7 Em7', 'Am7 D7'],
                    acc=run('cel', 2.4, [74, 79, 83, 86], 0.08, 40)
                    + [x for t in (3.75, 5.0, 6.25) for x in (('harp', t, 62, 50, .4), ('harp', round(t + .09, 3), 69, 54, .5))]
                    + [('vib', 7.8, 74, 46, 2), ('perc', 7.8, TRI_O, 26, 1)]
                    + run('harp!', 10.4, PENT('G', 55, 91), 0.035, 44, .2, 1) + [('glk', 10.9, 86, 50, 1)])),
    ('hospital', dict(bars=10, key='G', kit='std',
                      harm=['G', 'G', 'Em7', 'G', 'Em7 C', 'C D', 'G Em', 'G Em7', 'C C D G G G G G', 'G'],
                      acc=[('xyl', t, 79, 54, .2) for t in (3.75, 5.0, 6.25, 11.85)] + [('harp', 10.25, 74, 44, .6)]
                      + [('glk', 8.1, 86, 52, 1), ('perc', 12.9, TRI_O, 40, 1), ('glk', 12.9, 84, 46, 1)]
                      + [('bn', 15.0, 43, 72, .4), ('bn', 15.3, 55, 66, .3), ('bn', 15.5, 50, 64, .5)]
                      + [('pizz', 16.3, 52, 62, .4), ('perc', 18.6, GUIRO, 48, .6), ('hn', 19.6, 55, 56, .8)]
                      + [('timp', 21.0, 43, 84, 1.5), ('pizz', 21.0, 43, 80, 1), ('hn', 21.0, 67, 72, 2), ('hn', 21.0, 71, 66, 2),
                         ('perc', 21.0, CRASH, 34, 2)])),
    ('sentry', dict(bars=7, key='G', kit='std',
                    harm=['G Em', 'C D7', 'D', 'D D A7 D', 'Bm7 Em7', 'Am7 D7 G G', 'Cmaj7 B7'],
                    acc=[('pizz', 1.6, 43, 56, .5)]
                    + [('perc', round(5.0 + 0.625 * i, 3), KICK, 46, .3) for i in range(4)]
                    + [('glk', 8.0, 86, 44, 1), ('bell', 9.3, 74, 80, 3), ('timp', 10.0, 47, 60, 1), ('pizz', 10.0, 47, 60, .5)]
                    + run('harp!', 13.75, PENT('G', 55, 79), 0.04, 44, .2, 1) + [('vib', 13.75, 79, 48, 2), ('glk', 14.9, 88, 50, 1)])),
    ('checks', dict(bars=4, key='G', kit='brush', harm=['Em Em', 'Am B7', 'Em C', 'Bm7 E7'],
                    acc=[x for t in (1.4, 3.3, 5.2, 7.1)
                         for x in (('timp', t, 40, 72, .5), ('perc', t, TOM_FL, 40, .3), ('pizz', t, 64, 62, .3))])),
    ('ch2', dict(bars=1, key='A', kit='brush', harm=['A'],
                 acc=[('vib', 0.0, 81, 56, 2), ('perc', 0.0, TRI_O, 36, 1)])),
    ('water', dict(bars=6, key='A', kit='brush', harm=['A D', 'F#m E', 'E7 E7 E7 A', 'D A', 'Bm7 E', 'A F#m D E'],
                   acc=[('glk', 0.6, 93, 44, .6), ('glk', 0.75, 97, 42, .6), ('pizz', 1.6, 57, 54, .3),
                        ('harp', 2.3, 62, 50, .3), ('harp', 2.4, 69, 52, .4)]
                   + run('xyl', 3.3, [88, 85, 81, 78, 76, 73, 69, 66], 0.15, 54, .2, -2)
                   + [('perc', 5.0, CLAVES, 30, .1), ('perc', 5.625, CLAVES, 26, .1)]
                   + [('xyl', 6.78, 76, 56, .2), ('xyl', 6.9, 81, 64, .4), ('glk', 6.9, 88, 54, 1), ('pizz', 6.9, 45, 70, .5),
                      ('perc', 6.9, TRI_O, 40, 1), ('vib', 7.3, 76, 46, 1), ('glk', 9.4, 88, 50, 1)])),
    ('maxi', dict(bars=10, key='A', kit='brush',
                  harm=['A', 'D E', 'A F#m', 'D E', 'E7 E7sus4', 'F#m D', 'A F#m', 'D E', 'A D', 'Bm7 E7'],
                  acc=[('harp', 0.6, 57, 54, .8), ('harp', 0.8, 61, 54, .8), ('harp', 1.0, 64, 56, .8)]
                  + [('pizz', 5.0, 45, 60, .4), ('glk', 6.0, 85, 50, .8)] + run('cel', 6.8, [78, 81, 85], 0.08, 40)
                  + [('bn', 8.0, 57, 60, .3), ('bn', 8.15, 50, 58, .5), ('pizz', 10.4, 52, 56, .3)]
                  + [('vib', 11.3, 71, 50, 2), ('vib', 11.3, 76, 46, 2), ('harp', 12.8, 66, 46, .5)]
                  + [('bn!', 14.0, 47, 72, .45), ('bn!', 14.3, 46, 68, .9)]
                  + [('xyl', 15.0, 81, 60, .25), ('xyl', 15.1, 85, 62, .25), ('glk', 15.2, 93, 54, 1)]
                  + [('mar', 16.5, 73, 56, .3), ('mar', 16.85, 76, 58, .3), ('mar', 17.2, 81, 60, .3)]
                  + [('vib', 18.6, 74, 52, 1.5), ('glk', 18.6, 86, 46, 1)])),
    ('culture', dict(bars=4, key='A', kit='std', harm=['A E/G#', 'F#m D', 'Bm7 E', 'A A'],
                     acc=[('mar', t, n, 54 + 2 * i, .4) for i, (t, n) in enumerate(((2.5, 66), (3.125, 69), (3.75, 74), (4.375, 78)))]
                     + [('mar', 1.6, 74, 52, .3), ('mar', 1.8, 78, 52, .3), ('mar', 2.2, 78, 50, .3), ('mar', 2.4, 74, 50, .3)]
                     + [('vib', 5.0, 80, 50, 2), ('perc', 5.0, TRI_O, 30, 1)])),
    ('ch3', dict(bars=1, key='F', kit='std', harm=['F'],
                 acc=[('glk', 0.0, 89, 50, 1.5)])),
    ('candy', dict(bars=7, key='F', kit='std',
                   harm=['F C/E', 'Dm Bb', 'F/C C7', 'Bb C7 F F', 'Dm Dm Gm A7', 'Bb F/A Gm7 C7', 'F F'],
                   acc=[('vib', 0.9, 72, 40, 1), ('bn', 2.5, 50, 58, .4), ('bn', 2.7, 45, 56, .6)]
                   + [('cel', 4.4, 77, 40, .3), ('cel', 4.5, 81, 42, .4), ('cel', 5.0, 77, 40, .3), ('cel', 5.1, 81, 42, .4)]
                   + [('perc', 6.25, WBH, 30, .1), ('pizz', 7.25, 48, 54, .4), ('perc', 8.75, TRI_O, 44, 1), ('glk', 8.75, 89, 52, 1),
                      ('glk', 9.4, 84, 46, .8), ('pizz', 10.6, 50, 50, .4), ('cel', 11.2, 81, 36, 1), ('harp', 12.5, 58, 48, .8),
                      ('harp', 14.4, 72, 50, .4), ('harp', 14.55, 67, 50, .6)])),
    ('cards', dict(bars=5, key='F', kit='std',
                   harm=['F C', 'F F F F F G G G', 'G G D D', 'Am7 Am7 D7 D7 D7 G G G', 'G G C7 C7'],
                   acc=[('xyl', 3.2, 84, 52, .2), ('glk', 4.1, 86, 52, 1), ('perc', 4.1, TRI_O, 36, 1)]
                   + [('bn', 6.4, 45, 70, .3), ('perc', 6.4, WBL, 46, .2), ('bn', 6.6, 38, 66, .6)]
                   + [('glk', 9.0, 91, 56, 1.5), ('xyl', 9.0, 79, 58, .3)] + run('harp!', 9.0, PENT('G', 67, 91), 0.04, 44, .2, 1))),
    ('cups', dict(bars=6, key='F', kit='std', harm=['F F', 'Dm Bb', 'F C', 'Dm Dm Gm7 C7', 'F/A Bb', 'Gm7 C7'],
                  acc=run('glk', 0.8, [77, 81, 84], 0.12, 42, .4)
                  + run('xyl!', 2.0, [96, 93, 89, 84, 81, 77, 72, 69, 65, 60, 57], 0.035, 66, .2, -2)
                  + [('perc', 2.0, SPLASH, 44, 1), ('timp', 2.15, 41, 52, .6), ('xyl', 2.3, 84, 56, .3), ('perc', 2.3, TRI_M, 40, .3),
                     ('vib', 3.0, 74, 50, .5), ('vib', 3.25, 81, 52, 1.2)])),
    ('conscience', dict(bars=4, key='F', kit='std', harm=['Bb F/A', 'Gm7 C', 'F/A Bb', 'F/C C7 F F'],
                        acc=[('harp', 5.6, 65, 44, 1), ('glk', 7.0, 82, 50, 1), ('pizz', 7.0, 58, 60, .3)])),
    ('erikson', dict(bars=4, key='F', kit='std', harm=['F Bb', 'Gm7 C7', 'F F Dm Dm Dm Dm Bb Bb', 'Bb C F F'],
                     acc=[('xyl', t, n, 54 + 2 * i, .25) for i, (t, n) in enumerate(((1.0, 65), (1.3, 69), (1.6, 72), (1.9, 77)))]
                     + [('perc', t, WBH, 30, .1) for t in (1.0, 1.3, 1.6, 1.9)]
                     + run('glk', 2.2, [82, 86, 89], 0.07, 44) + run('harp!', 3.0, PENT('F', 53, 89), 0.035, 46, .2, 1)
                     + [('timp', 3.0, 43, 60, .5), ('pizz', 5.3, 38, 66, .5)]
                     + run('xyl', 5.9, [86, 81, 77, 74, 69, 65, 62], 0.06, 58, .25, -3) + [('perc', 6.35, TOM_L, 40, .3)])),
    ('ch4', dict(bars=1, key='Bm', kit='std', harm=['Bm Bm F#7 F#7'],
                 acc=[('timp', 0.0, 47, 84, 1), ('perc', 0.0, CRASH, 30, 1)])),
    ('crisis7', dict(bars=6, key='Bm', kit='std', harm=['Bm Bm', 'G A', 'Bm E', 'G F#', 'Bm E/G#', 'G A'],
                     acc=run('harp!', 1.0, PENT('Bm', 59, 90), 0.03, 46, .2, 1)
                     + run('cel', 3.7, [74, 78, 81, 86], 0.08, 40)
                     + [x for t in (9.6, 10.0, 10.4) for x in (('hn', t, 66, 72, .4), ('timp', t, 47, 70, .4), ('pizz', t, 59, 64, .3))])),
    ('border', dict(bars=5, key='D', kit='std', harm=['D', 'Bm7 G', 'Em7 G', 'Asus4 Asus4 A A A A D D D D', 'G A'],
                    acc=[('pizz', t, n, 58, .4) for t, n in ((2.5, 59), (3.125, 62), (3.75, 67), (4.375, 71))]
                    + run('cel', 6.5, [79, 83, 86, 91], 0.06, 44) + [('perc', 6.5, BELLTREE, 36, 1.5), ('glk', 6.6, 91, 48, 1)]
                    + run('harp!', 8.63, PENT('D', 50, 86), 0.025, 44, .2, 1)
                    + [('timp', 9.0, 38, 70, 1.5), ('perc', 9.0, TRI_O, 40, 2)])),
    ('school', dict(bars=6, key='D', kit='std', harm=['D A/C#', 'Bm D/A', 'G D/F#', 'Em7 A7', 'D D G G', 'D D D7 D7'],
                    acc=[('glk', t, n, 46 + 2 * i, .5) for i, (t, n) in enumerate(((1.6, 74), (1.9, 78), (2.2, 81), (2.5, 86), (2.8, 90)))]
                    + [('perc', 6.25, TOM_L, 40, .3), ('pizz', 6.25, 50, 60, .4)]
                    + [('timp', t, 45, 64, .5) for t in (7.5, 8.75, 10.0)]
                    + [('bell', 11.25, 74, 84, 4), ('perc', 11.25, CRASH, 34, 2)])),
    ('summary', dict(bars=6, key='G', kit='std', harm=['G D/F#', 'Em7 C', 'G/B C', 'Am7 D7', 'G Em7', 'Em7 A7'],
                     acc=[('vib', round(0.8 + i * 0.7, 2), n, 40, .8) for i, n in enumerate((67, 71, 74, 79, 83, 86, 91, 95))])),
    ('outro', dict(bars=4, key='D', kit='std', harm=['D Bm7', 'D/F# A', 'Bm7 G', 'Em7 A7'],
                   acc=run('cel', 0.3, [74, 78, 81, 86, 90, 93], 0.22, 36, .4)
                   + [('harp', 1.0, 62, 46, 1), ('vib', 1.0, 74, 44, 2)])),
    ('final', dict(bars=4, key='D', kit='std', harm=['D G/D', 'Em7 A7', 'D', 'D'],
                   acc=[('glk', 0.3, 86, 50, 1), ('perc', 0.3, TRI_O, 38, 1), ('harp', 0.8, 74, 50, .8),
                        ('mar', 1.4, 78, 52, .3), ('mar', 1.7, 81, 54, .3), ('glk', 4.0, 88, 46, 1)]
                   + [('xyl', 6.0, 69, 48, .2), ('xyl', 6.1, 74, 52, .25), ('timp', 6.5, 38, 44, .6)])),
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
assert NBARS == 121, NBARS
print('bars:', NBARS, 'seconds:', NBARS * 2.5)


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


# ════════════════════════ Сцены ════════════════════════
COMP = {}


def scene(fn):
    COMP[fn.__name__[3:]] = fn
    return fn


HOOVES = {WBL: ('x.o...x.o...', 40), WBH: ('...x.o...x.o', 34)}      # «копыта» в 12/8: долго-коротко


@scene
def sc_prologue(b):            # ре мажор, галоп 12/8: копыта, пиццикато, маримба на «и», тема у флейты
    dpat(b, b, HOOVES, 0.7)
    dpat(b + 1, b + 2, HOOVES)
    bassline('pizz', T(b), T(b + 3), 'gallop', 64, lo=38)
    stabs('mar', T(b), T(b + 3), [(k + 2 / 3, .25, 0) for k in range(4)], 50, 62, 76)
    seq('fl', T(b + 1), "A5/2 B5/1 A5/3 F#5/2 A5/1 F#5/2 E5/1 | B5/2 A5/1 G5/2 B5/1 A5/3 r/3", TR, 88)
    pad('str', T(b + 2), T(b + 3), 40, 57, 74)
    for i, n in enumerate((TOM_M, TOM_L, TOM_FL)):
        put('dr', T(b + 2, 3) + i * TR, TR, n, 30 + 5 * i, 9)


@scene
def sc_title(b):               # тема широко: флейта, струнные, валторна, арфа, блеск колокольчиков
    seq('fl', T(b), "r/3 A5/2 B5/1 A5/2 | F#5/2 A5/1 F#5/2 E5/3 | G5/2 F#5/1 E5/2 D5/1 E5/2", E, 90, art=.96)
    seq('glk', T(b, 1.5), "A6/2 B6/1 A6/2", E, 40)
    seq('hn', T(b), "D4/8 | D4/4 B3/4 | B3/4 E4/4", E, 62, art=.98)
    pad('str', T(b), T(b + 3), 50, 57, 76)
    bassline('str', T(b), T(b + 3), 'root', 54, lo=38)
    swell('str', T(b), T(b + 1), 70, 110)
    arp('harp', T(b), T(b + 3), [0, 1, 2, 3, 4, 3, 2, 1], E, 44, 50, 81, art=1.4)
    put('timp', T(b), Q * 2, 38, 64)


@scene
def sc_note(b):                # лёгкие арпеджио маримбы и вибрафона, кларнет, тихий шейкер
    seq('cl', T(b), "B4/1 D5/1 G5/2 F#5/2 D5/2 | E5/1 G5/1 B5/2 A5/2 G5/1 E5/1 | F#5/3 A5/1 D5/2 C5/2", E, 78)
    arp('mar', T(b), T(b + 3), [0, 2, 1, 3, 2, 4, 3, 1], E, 40, 55, 76, art=.6)
    stabs('vib', T(b), T(b + 3), [(0, 1.8, 0), (2, 1.8, -4)], 36, 64, 79)
    dpat(b, b + 2, {MARACA: ('.x.x.x.x', 22)})
    bassline('pizz', T(b), T(b + 3), 'half', 52, lo=38)


@scene
def sc_ch1(b):                 # заставка главы 1, соль мажор: глиссандо арфы, валторна «5-6-5»
    gliss('harp', T(b), 55, 91, 28, 50, 'G')
    seq('hn', T(b, .5), "D4/1 E4/1 D4/2 B3/3", E, 76)
    put('pizz', T(b), Q, 43, 70)
    put('timp', T(b), Q, 43, 66)
    pad('str', T(b), T(b + 1), 50, 55, 74)


@scene
def sc_ssr(b):                 # прыгучий грув 4/4: бас, маримба, шейкер; «машина» — фагот и клаксон
    seq('cl', T(b), "G4/1. B4/1. D5/1. G5/1. F#5/1. G5/1. A5/2 | G5/1. E5/1. C5/2 D5/1. F#5/1. A5/2", E, 82)
    car = seq('bn', T(b + 2), "G3/1. B3/1. D4/1. B3/1. E3/1. G#3/1. B3/1. D4/1. | A3/2 C4/1. E4/1. F#3/1. A3/1. C4/1. D4/1.", E, 92)
    for t, d, p in car:
        put('cl', t, d, p + 12, 56)
    bassline('bass', T(b), T(b + 2), 'bounce', 68)
    bassline('bass', T(b + 2), T(b + 4), 'walk', 68)
    arp('mar', T(b), T(b + 2), [0, 2, 1, 2, 0, 2, 1, 3], E, 48, 60, 79, art=.6, acc=[6, 0, 2, 0, 4, 0, 2, 0])
    stabs('mar', T(b + 2), T(b + 4), [(k + .5, .2, 0) for k in range(4)], 46, 60, 74)
    dpat(b, b + 1, {MARACA: ('xoxoxoxo', 28)})
    dpat(b + 2, b + 3, {MARACA: ('xoxoxoxo', 30), SIDE: ('..x...x.', 34), KICK: ('x...x...', 30)})


@scene
def sc_fields(b):              # волшебство без ударных: арфа, челеста, флейта; струнные растут под цитату
    seq('fl', T(b), "B5/2 A5/1 G5/1 F#5/2 D5/2 | E5/4 r/4 | r/8 | F#5/4 A5/2 G5/2 | F#5/3 E5/1 G5/4 | E5/2 C5/2 D5/2 F#5/2",
        E, 76, art=.96)
    seq('cel', T(b + 1, 2), "D6/2 E6/1 D6/1 | B5/2 D6/1 B5/1 A5/4", E, 58)
    arp('harp', T(b), T(b + 3), [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], TR, 42, 55, 86, art=1.5)
    arp('harp', T(b + 3), T(b + 6), [0, 2, 4, 2], E, 40, 55, 83, art=1.5)
    bassline('pizz', T(b), T(b + 3), 'root', 48, lo=38)
    pad('str', T(b + 3), T(b + 6), 58, 55, 79, 4)
    bassline('str', T(b + 3), T(b + 6), 'root', 56, lo=38)
    swell('str', T(b + 3), T(b + 4, 2), 50, 120)
    swell('str', T(b + 5), T(b + 6), 120, 100)
    seq('hn', T(b + 3), "A3/8 | B3/4 B3/4 | C4/4 C4/4", E, 54, art=.98)


@scene
def sc_hospital(b):            # четыре уровня игры (Эльконин): соло → рядом → перекличка → канон
    seq('fl', T(b), "r/4 D5/1 E5/1 G5/1 A5/1", E, 72)
    arp('mar', T(b), T(b + 1), [0, 2, 1, 2], E, 42, 60, 76, art=.6)
    # L1 (такты 2–3) один голос; L2 (4–5) — тот же мотив гобоя + независимый кларнет
    seq('ob', T(b + 1), ' | '.join(["G5/1. E5/1. D5/1. r/1 G5/1. E5/1. D5/1. r/1"] * 4), E, 80)
    bassline('pizz', T(b), T(b + 5), 'root', 48, lo=38)
    seq('cl', T(b + 3), "B3/3 D4/3 G4/2 | A4/3 G4/3 E4/2", E, 74)
    pad('str', T(b + 3), T(b + 5), 32, 50, 64)
    # L3 (6–7): перекличка флейты и кларнета
    seq('fl', T(b + 5), "r/1 E5/1 G5/1 A5/1 r/4 | B5/1. A5/1. G5/2 r/4", E, 84)
    seq('cl', T(b + 5, 2), "G4/1 F#4/1 D4/2 | r/4 E5/1> D5/1 B4/2", E, 80)
    bassline('bass', T(b + 5), T(b + 7), 'walk', 64)
    arp('mar', T(b + 5), T(b + 7), [0, 1, 2, 1], E, 40, 60, 76, art=.5)
    dpat(b + 5, b + 6, {MARACA: ('xoxoxoxo', 24)})
    # L4 (8–9): строгий канон на три голоса (пентатоника — без полутонов), каданс «Так не делают»
    subj = [(0, 1, 'D5'), (1, 1, 'E5'), (2, 2, 'G5'), (4, 1, 'E5'), (5, 1, 'D5'), (6, 2, 'B4'),
            (8, 1, 'D5'), (9, 1, 'E5'), (10, 1, 'G5'), (11, 1, 'A5'), (12, 2, 'B5')]
    cad = T(b + 8, 1.5)
    for v, lag, tr, vel in (('fl', 0, 0, 84), ('ob', 1, -12, 80), ('bn', 2, -24, 88)):
        for pos, d, nm in subj:
            t = T(b + 7, lag) + pos * E
            if t < cad:
                put(v, t, min(d * E, cad - t) * .92, P(nm) + tr, vel)
    seq('fl', cad, "B5/5", E, 88)
    seq('ob', cad, "G4/5", E, 80)
    seq('bn', cad, "G2/5", E, 86)
    bassline('bass', T(b + 7), cad, 'walk', 68)
    stabs('mar', T(b + 7), cad, [(k + .5, .2, 0) for k in range(4)], 44, 60, 74)
    dpat(b + 7, b + 7, {MARACA: ('xoxoxoxo', 30), SIDE: ('..x...x.', 34), KICK: ('x...x...', 34)})
    dpat(b + 8, b + 8, {MARACA: ('xox.....', 30), KICK: ('x.......', 34)})
    # 10: успокоение
    pad('str', cad, T(b + 10), 46, 55, 74)
    bassline('bass', T(b + 9), T(b + 10), 'root', 56)
    arp('harp', T(b + 9), T(b + 10), [7, 6, 5, 4, 3, 2, 1, 0], E, 40, 55, 86, art=1.4)
    seq('cl', T(b + 9), "D5/2 B4/2 G4/4", E, 64)


@scene
def sc_sentry(b):              # один — ёрзает; в игре — игрушечный марш; повтор 2004 — сдувается; вывод — тепло
    seq('cl', T(b), "r/2 D5/1. r/3 B4/1. C5/1. r/2 A4/1. r/1 B4/1. r/1 G4/2 | "
                    "C5/1. r/1 E5/1. r/3 D5/1. r/1 C5/1. r/2 A4/1. r/1 F#4/1. r/2", S, 86)
    dpat(b, b + 1, {CLAVES: ('x..x.x...x..x...', 24), WBL: ('......x.......x.', 20)})
    bassline('pizz', T(b), T(b + 1, 3), 'half', 50, lo=38)
    roll(T(b + 1, 3), T(b + 2), SN, 16, 40)
    seq('picc', T(b + 2), "A6/1.5 B6/.5 A6/2 F#6/1.5 A6/.5 F#6/1 E6/1 | D6/1 F#6/1 A6/1 D7/1 C#7/1.5 B6/.5 A6/2", E, 66)
    bassline('bn', T(b + 2), T(b + 4), 'march', 74, lo=38)
    dpat(b + 2, b + 2, {SN: ('X.o.x.ooX.o.xoxo', 30)})
    dpat(b + 3, b + 3, {SN: ('X.o.x.ooX.o.x...', 30), KICK: ('x.......x.......', 36)})
    stabs('mar', T(b + 2), T(b + 4), [(k + .5, .2, 0) for k in range(4)], 40, 62, 76)
    pad('str', T(b + 2), T(b + 4), 62, 55, 76)
    swell('str', T(b + 2), T(b + 2, 1.6), 30, 30, 1)
    swell('str', T(b + 2, 1.6), T(b + 3, .8), 30, 118)
    swell('str', T(b + 3, 3), T(b + 4), 118, 70)
    seq('bn', T(b + 4), "D4/2 C#4/1 B3/1 G3/2 E3/2 | A2/2 D3/2 G2/4", E, 82)
    put('dr', T(b + 4), 60, SN, 18, 9)
    bassline('pizz', T(b + 4), T(b + 5), 'root', 46, lo=38)
    seq('hn', T(b + 5, 2), "D4/2 G4/2 | E4/2 G4/1 E4/1 D#4/4", E, 74, art=.98)
    swell('str', T(b + 5, 2), T(b + 5, 2) + 2, 108, 108, 1)
    pad('str', T(b + 5, 2), T(b + 7), 50, 55, 74)
    arp('harp', T(b + 5, 2), T(b + 7), [0, 2, 4, 6, 4, 2], TR, 38, 55, 86, art=1.4)
    bassline('pizz', T(b + 5, 2), T(b + 7), 'root', 50, lo=38)


@scene
def sc_checks(b):              # «расследование»: пиццикато шагом, щётки, кларнет стаккато (фагот — во второй половине)
    cl = seq('cl', T(b), "E4/1. G4/1. B4/1. r/1 A4/1. G4/1. F#4/1. r/1 | C5/1. A4/1. E4/1. r/1 D#4/1. F#4/1. A4/1. r/1 | "
                         "G4/1. B4/1. E5/1. r/1 E5/1. C5/1. G4/1. r/1 | D5/1. B4/1. F#4/1. A4/1. G#4/1. B4/1. D5/1. E5/1.", E, 92)
    for t, d, p in cl:
        if t >= T(b + 2):
            put('bn', t, d, p - 12, 74)
    bassline('pizz', T(b), T(b + 4), 'walk', 72, lo=40)
    dpat(b, b + 3, {SN: ('oxXxoxXx', 26), HHP: ('..x...x.', 30)})


BRUSH = {SN: ('x.ox.ox.ox.o', 22), HHP: ('...x.....x..', 26)}            # щётки в 12/8


@scene
def sc_ch2(b):                 # заставка главы 2, ля мажор 12/8: арфа триолями, кларнет «5-6-5»
    arp('harp', T(b), T(b + 1), [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], TR, 46, 57, 88, art=1.5)
    seq('cl', T(b), "E5/2 F#5/1 E5/3 C#5/2 E5/1 A5/3", TR, 78)
    put('pizz', T(b), Q * 2, 45, 66)
    dpat(b, b, {SN: ('x.ox.ox.ox.o', 20)})


@scene
def sc_water(b):               # 12/8: арфа, вибрафон, бас; переливание — «бульк» ксилофона; стоп-тайм «А теперь?»
    seq('cl', T(b), "C#5/2 E5/1 A5/3 F#5/2 E5/1 D5/3 | C#5/3 A4/3 B4/2 C#5/1 B4/3 | r/9 C#5/1 E5/1 A5/1 | "
                    "A5/2 F#5/1 D5/3 E5/2 C#5/1 A4/3 | B4/2 D5/1 F#5/3 E5/2 G#5/1 B5/3 | A5/3 E5/3 F#5/3 G#5/3", TR, 80)

    def groove(t0, t1):
        arp('harp', t0, t1, [0, 1, 2, 3, 2, 1], TR, 44, 57, 81, art=1.4)
        stabs('vib', t0, t1, [(0, 1.7, 0), (2, 1.7, -4)], 36, 64, 79)
        bassline('bass', t0, t1, 'lilt', 64)
    groove(T(b), T(b + 2))
    groove(T(b + 2, 3), T(b + 6))
    dpat(b, b + 1, BRUSH)
    dpat(b + 3, b + 5, BRUSH)
    put('vib', T(b + 2), Q * 2 - 20, 71, 40, 1)                       # стоп-тайм: одна нота и тиканье
    arp('harp', T(b + 2, 2), T(b + 2, 3), [0, 1, 2], TR, 36, 57, 81)


@scene
def sc_maxi(b):                # три горы → история Макси → мама на цыпочках → вопрос → ответы
    seq('fl', T(b), "r/3 E5/2 F#5/1 E5/3 C#5/3 | D5/2 F#5/1 A5/3 G#5/3 E5/3", TR, 76)
    pad('str', T(b), T(b + 2), 42, 55, 74)
    bassline('str', T(b), T(b + 2), 'root', 48, lo=38)
    arp('harp', T(b), T(b + 2), [0, 2, 4, 2], Q, 40, 57, 81, art=2)
    stabs('vib', T(b), T(b + 2), [(0, 3.6, 0)], 34, 64, 79)
    tip = T(b + 3) + 4 * TR
    seq('cl', T(b + 2), "A4/2 C#5/1 E5/2 C#5/1 F#5/2 E5/1 C#5/3 | D5/4", TR, 80)
    arp('mar', T(b + 2), tip, [0, 1, 2, 1, 2, 3], TR, 40, 60, 79, art=.6)
    bassline('bass', T(b + 2), tip, 'lilt', 62)
    dpat(b + 2, b + 2, BRUSH)
    seq('pizz', tip, "F#3/1. r/1 A3/1. r/1 G#3/1. r/1 B3/1. r/1 | E4/1. r/1 D4/1. r/1", TR, 64)
    for k in range(2, 6):
        put('dr', T(b + 3) + k * 2 * TR, 40, SN, 14, 9)
    pad('trem', T(b + 4, 2), T(b + 5, 2), 46, 59, 76)                 # вопрос: тремоло и рокот литавры
    roll(T(b + 4, 2), T(b + 5), 40, 20, 42, 60, 'timp')
    arp('harp', T(b + 5), T(b + 5, 2), [0, 1, 2, 3, 2, 1], TR, 38, 57, 81, art=1.4)
    seq('cl', T(b + 5), "C#5/3 A4/3 F#4/3 r/3", TR, 66)
    pad('str', T(b + 5), T(b + 6), 34, 55, 72)
    fl = seq('fl', T(b + 6), "E5/2 F#5/1 E5/3 C#5/2 E5/1 C#5/2 B4/1 | D5/2 F#5/1 A5/3 G#5/2 B5/1 E5/3 | "
                             "A5/2 B5/1 A5/3 F#5/2 A5/1 F#5/2 E5/1 | D5/2 C#5/1 B4/3 D5/2 E5/1 G#5/3", TR, 86)
    under('cl', [n for n in fl if n[0] >= T(b + 8)], 62, 'A')
    arp('mar', T(b + 6), T(b + 10), [0, 1, 2, 1, 2, 3], TR, 42, 60, 79, art=.6, acc=[6, 0, 0, 3, 0, 0])
    bassline('bass', T(b + 6), T(b + 10), 'lilt', 66)
    dpat(b + 6, b + 9, {**BRUSH, KICK: ('x.....x.....', 26)})
    pad('str', T(b + 8), T(b + 10), 40, 55, 72)


@scene
def sc_culture(b):             # шире и теплее: тема у струнных, валторна, арфа, мягкие конги
    seq('str', T(b), "E5/3 F#5/1 E5/4 | C#5/3 E5/1 D5/2 F#5/2 | D5/3 C#5/1 B4/2 G#4/2 | A4/8", E, 82, art=.98)
    seq('hn', T(b), "C#4/4 B3/4 | A3/4 A3/4 | B3/4 B3/4 | C#4/8", E, 62, art=.98)
    pad('str', T(b), T(b + 4), 40, 50, 66)
    arp('harp', T(b), T(b + 4), [0, 2, 1, 3, 2, 4, 3, 5], E, 40, 52, 81, art=1.4)
    bassline('bass', T(b), T(b + 4), 'half', 60)
    dpat(b, b + 3, {CONGA_L: ('x.......x.......', 28), CONGA_MH: ('....x.x.....x.x.', 22), CONGA_H: ('......x.......x.', 24)})


@scene
def sc_ch3(b):                 # заставка главы 3, фа мажор: флейта «5-6-5», маримба, клаве
    seq('fl', T(b), "C6/1 D6/1 C6/2 A5/1 C6/1 A5/1 G5/1", E, 80)
    arp('mar', T(b), T(b + 1), [0, 1, 2, 1], E, 46, 53, 72, art=.6)
    put('pizz', T(b), Q, 41, 66)
    put('pizz', T(b, 2), Q, 48, 56)
    gliss('harp', T(b), 53, 89, 24, 44, 'F')
    dpat(b, b, {CLAVES: ('x.x.x.x.', 26)})


@scene
def sc_candy(b):               # ожидание (тик-так, тремоло) → крадётся → похвала → слёзы (ре минор) → объяснение
    seq('cl', T(b), "A4/1 C5/1 F5/2 E5/1 D5/1 C5/2 | D5/2 F5/2 D5/1 C5/1 Bb4/2 | A4/2 C5/2", E, 84)
    dpat(b, b + 2, {WBH: ('x...x...', 30), WBL: ('..x...x.', 26)})
    pad('trem', T(b), T(b + 3), 36, 57, 72)
    bassline('pizz', T(b), T(b + 3), 'half', 50, lo=38)
    seq('bn', T(b + 2, 2), "C3/1. E3/1. G3/1. Bb3/1. C4/1.", S, 72)
    seq('fl', T(b + 3), "r/2 D5/1 E5/1 F5/1 A5/1 C6/2", E, 88)
    arp('mar', T(b + 3, 2), T(b + 4), [0, 1, 2, 3], E, 48, 60, 81, art=.6)
    bassline('pizz', T(b + 3), T(b + 4), 'walk', 56, lo=38)
    dpat(b + 3, b + 3, {MARACA: ('....xoxo', 26), TAMB: ('....x...', 22)})
    seq('ob', T(b + 4), "r/2 A5/2 G5/1 F5/1 E5/1 C#5/1", E, 76)
    pad('trem', T(b + 4), T(b + 5), 34, 57, 72)
    bassline('pizz', T(b + 4), T(b + 5), 'root', 46, lo=38)
    seq('fl', T(b + 5), "D5/2 C5/2 D5/1 Bb4/1 G5/1 E5/1", E, 80)
    seq('cl', T(b + 6), "C5/1.5 D5/.5 C5/2 A4/1.5 C5/.5 A4/1 G4/1", E, 74)
    pad('str', T(b + 5), T(b + 7), 46, 53, 72)
    arp('harp', T(b + 5), T(b + 7), [0, 2, 1, 3, 2, 4, 3, 1], E, 38, 53, 81, art=1.4)
    bassline('pizz', T(b + 5), T(b + 7), 'walk', 50, lo=38)


@scene
def sc_cards(b):               # заводной механизм: маримба 16-ми, клаве; смена правила — на тон выше; «застрял»
    stuck = T(b + 2)
    arp('mar', T(b), stuck, [0, 2, 1, 3], S, 48, 60, 84, art=.5, acc=[6, 0, 2, 0])
    for i in range(9):
        put('mar', stuck + i * S, S * .5, 74, 50 + (i % 2) * 4)
    arp('mar', T(b + 2, 2.5), T(b + 5), [0, 2, 1, 3], S, 48, 60, 84, art=.5, acc=[6, 0, 2, 0])
    dpat(b, b + 4, {CLAVES: ('x.o.x.o.x.o.x.o.', 24)})
    bassline('pizz', T(b), stuck, 'march', 54, lo=38)
    bassline('pizz', T(b + 2, 2.5), T(b + 5), 'march', 54, lo=38)
    seq('ob', T(b), "F5/1. A5/1. C6/1. A5/1. G5/1. E5/1. C5/1. E5/1. | F5/1. A5/1. C6/1. A5/1. F5/1. B5/1. D6/1. B5/1. | "
                    "r/6 A5/1. F#5/1. | C6/1. A5/1. E5/1. A5/1. F#5/1. G5/1 B5/1 D6/1 | G5/2 D5/1 B4/1 C5/1. E5/1. G5/1. Bb5/1.", E, 90)
    seq('fl', T(b + 3, 2.5), "G5/1 B5/1 D6/1 | B5/2 G5/2 E5/1. G5/1. C6/1. E6/1.", E, 78)
    pad('vib', T(b + 3, 2.5), T(b + 5), 40, 64, 79)


@scene
def sc_cups(b):                # шкатулка → грохот 15 чашек → вопрос → вальсовое покачивание 12/8, тема у кларнета
    arp('cel', T(b), T(b, 3), [0, 2, 1, 3, 2, 1], TR, 40, 65, 84, art=1.2)
    put('pizz', T(b), Q * 2, 41, 56)
    seq('bn', T(b + 1), "D3/2 F3/1 A3/3 Bb2/2 D3/1 F3/3", TR, 78)
    pad('str', T(b + 1), T(b + 2), 36, 55, 70)
    cl = seq('cl', T(b + 2), "C5/2 D5/1 C5/3 A4/2 C5/1 A4/2 G4/1 | D5/2 E5/1 F5/3 G5/2 F5/1 E5/3 | "
                             "F5/2 G5/1 A5/3 Bb5/2 A5/1 F5/3 | G5/2 F5/1 D5/3 E5/2 C5/1 Bb4/3", TR, 82)
    for t, d, p in cl[:7]:
        put('cel', t, d, p + 12, 38, 1, 'drop')
    bassline('pizz', T(b + 2), T(b + 6), 'march', 56, lo=38)
    stabs('mar', T(b + 2), T(b + 6), [(k + o, .2, -4 if o > .5 else 0) for k in range(4) for o in (1 / 3, 2 / 3)], 36, 60, 76)
    dpat(b + 2, b + 5, {TAMB: ('...x.....x..', 18)})


@scene
def sc_conscience(b):          # тепло, половинный темп: валторна и струнные; «внутренний голос» — флейта
    seq('hn', T(b), "C5/3 D5/1 C5/2 A4/2 | Bb4/3 A4/1 G4/2 E4/2 | A4/3 Bb4/1 C5/2 D5/2 | C5/2 E4/2 F4/4", E, 74, art=.98)
    seq('fl', T(b + 1, .5), "D6/1 C6/1 A5/1 C6/2 G5/2", E, 52)
    pad('str', T(b), T(b + 4), 50, 53, 72)
    bassline('bass', T(b), T(b + 4), 'half', 58)
    swell('str', T(b + 2), T(b + 2, 1.5), 96, 122)
    swell('str', T(b + 3), T(b + 4), 122, 104)
    dpat(b, b + 3, {KICK: ('x.......', 30), SIDE: ('....x...', 28)})


@scene
def sc_erikson(b):             # кубики → ракета (разгон) → вершина и стоп на окрике → падение → мягкое восстановление
    seq('cl', T(b), "F4/1. A4/1. C5/1. F5/1. D5/1. Bb4/1. F4/2", E, 88)
    arp('mar', T(b), T(b + 2), [0, 2, 1, 2, 0, 2, 1, 3], E, 44, 60, 79, art=.6)
    bassline('pizz', T(b), T(b + 2), 'march', 56, lo=38)
    dpat(b, b, {MARACA: ('xoxoxoxo', 24), SIDE: ('..x...x.', 28)})
    dpat(b + 1, b + 1, {MARACA: ('xoxoxoxo', 28), KICK: ('x...x...', 30)})
    roll(T(b + 1, 2), T(b + 2), SN, 14, 46)
    seq('fl', T(b + 1, 1), "C5/1 D5/1 E5/1 F5/1 G5/1 A5/1 Bb5/1 C6/1 D6/1 E6/1 F6/1 G6/1", S, 80)
    pad('str', T(b + 1), T(b + 2), 54, 55, 76)
    swell('str', T(b + 1), T(b + 2), 50, 120)
    stop = T(b + 2) + int(.3 * SEC)
    for v, ns, vel in (('str', (65, 69, 72, 77), 70), ('hn', (65, 69), 72), ('pizz', (41,), 76), ('timp', (41,), 80),
                       ('mar', (72, 77, 81), 60), ('fl', (89,), 80)):
        for n in ns:
            put(v, T(b + 2), stop - T(b + 2) - 10, n, vel, jit=0)
    put('dr', T(b + 2), Q, CRASH, 40, 9)
    swell('str', T(b + 2, 1), T(b + 2, 2.9), 120, 96)
    seq('bn', T(b + 2, 1.5), "A3/1 F3/1 D3/2", E, 72)
    seq('cl', T(b + 2, 3), "F4/1 G4/1 | D5/2 E5/2 F5/4", E, 76)
    pad('str', T(b + 2, 3), T(b + 4), 40, 53, 72)
    arp('harp', T(b + 2, 3), T(b + 4), [0, 1, 2, 3, 4, 3, 2, 1], E, 38, 53, 81, art=1.4)
    bassline('pizz', T(b + 3), T(b + 4), 'root', 46, lo=38)


STAC8 = [(k * .5, .22, 8 if k % 2 == 0 else 0) for k in range(8)]    # струнные стаккато восьмыми


@scene
def sc_ch4(b):                 # заставка главы 4, си минор — сразу с напором
    stabs('str', T(b), T(b + 1), STAC8, 54, 59, 74)
    seq('ob', T(b), "F#5/1 G#5/1 F#5/2 D5/1 F#5/1 C#5/2", E, 84)
    bassline('bass', T(b), T(b + 1), 'drive', 64)
    put('timp', T(b, 2), Q, 42, 70)
    roll(T(b, 3), T(b + 1), SN, 18, 44)


@scene
def sc_crisis7(b):             # кризис семи лет: си минор (дорийский), энергично — струнные стаккато, бас восьмыми
    ob = seq('ob', T(b), "r/2 F#5/1. G#5/1. F#5/2 D5/1. F#5/1. | D5/1. C#5/1. B4/2 r/1 A4/1. B4/1. C#5/1. | "
                         "D5/1. F#5/1. B5/2 G#5/1. B5/1. E5/2 | D6/1. B5/1. G5/1. B5/1. A#5/2 C#6/2 | "
                         "r/2 F#5/1. G#5/1. B5/2 G#5/1. E5/1. | D5/1. E5/1. F#5/1. G5/1. A5/2 C#6/2", E, 88)
    under('cl', [n for n in ob if n[0] >= T(b + 2)], 60, 'Bm')
    stabs('str', T(b), T(b + 6), STAC8, 50, 57, 74)
    bassline('bass', T(b), T(b + 6), 'drive', 64)
    dpat(b, b + 5, {KICK: ('x...x...', 40), SN: ('..x...x.', 30), HHC: ('xoxoxoxo', 24)})
    for k in (0, 2, 4):
        put('timp', T(b + k), Q, 47, 70)


@scene
def sc_border(b):              # удивление, ре мажор, широко: флейта, валторна, струнные, арфа
    seq('fl', T(b), "A5/3 B5/1 A5/2 F#5/2 | A5/2 F#5/1 E5/1 D5/4 | E5/3 F#5/1 G5/2 B5/2 | A5/2 G5/3 F#5/3 | "
                    "D5/2 E5/1 G5/1 F#5/2 E5/2", E, 80, art=.97)
    seq('hn', T(b), "D4/8 | D4/4 B3/4 | B3/4 D4/4 | D4/8 | B3/4 C#4/4", E, 60, art=.98)
    pad('str', T(b), T(b + 5), 48, 55, 76, 4)
    bassline('str', T(b), T(b + 5), 'root', 52, lo=38)
    swell('str', T(b), T(b) + 2, 90, 90, 1)
    swell('str', T(b + 3), T(b + 3, 2.5), 90, 122)
    swell('str', T(b + 4), T(b + 5), 122, 104)
    arp('harp', T(b), T(b + 5), [0, 2, 4, 2, 1, 3, 5, 3], E, 38, 55, 86, art=1.4)


@scene
def sc_school(b):              # уверенный марш, тутти: тема впервые всем оркестром; школьный звонок
    mel = ("A5/1.5 B5/.5 A5/2 F#5/1.5 A5/.5 F#5/1 E5/1 | D5/1.5 E5/.5 F#5/2 A5/2 F#5/2 | G5/1.5 A5/.5 B5/2 A5/1.5 G5/.5 F#5/2 | "
           "E5/1.5 F#5/.5 G5/2 A5/1 B5/1 C#6/2 | D6/3 A5/1 B5/2 G5/2 | A5/1.5 B5/.5 A5/2 F#5/2 C6/2")
    m = seq('fl', T(b), mel, E, 86)
    seq('ob', T(b), mel, E, 64)
    seq('str', T(b), mel, E, 56)
    seq('xyl', T(b + 4), "D7/3 A6/1 B6/2 G6/2 | A6/1.5 B6/.5 A6/2 F#6/2 C7/2", E, 46)
    under('cl', m, 60, 'D')
    seq('hn', T(b), "F#4/4 E4/4 | F#4/4 F#4/4 | D4/4 D4/4 | E4/4 E4/4 | F#4/4 D4/4 | F#4/4 F#4/2 C4/2", E, 64)
    stabs('str', T(b), T(b + 6), [(0, .4, 8), (1, .4, 0), (2, .4, 6), (3, .4, 0)], 40, 52, 66)
    bassline('bn', T(b), T(b + 6), 'march', 66, lo=38)
    bassline('bass', T(b), T(b + 6), 'half', 62)
    dpat(b, b + 5, {KICK: ('x.......x.......', 36), SN: ('X.o.x.oox.o.x.oo', 25)})
    put('dr', T(b), Q * 2, CRASH, 36, 9)


@scene
def sc_summary(b):             # итоги: тёплая тема у кларнета (флейта октавой выше), лёгкий грув
    cl = seq('cl', T(b), "D5/3 E5/1 D5/4 | B4/3 D5/1 B4/2 A4/2 | G5/3 A5/1 B5/2 C6/2 | A5/3 G5/1 F#5/2 E5/1 D5/1 | "
                         "D5/3 E5/1 D5/4 | B4/3 C#5/1 E5/2 G5/2", E, 82, art=.96)
    for t, d, p in cl:
        if not T(b + 2) <= t < T(b + 4):
            put('fl', t, d, p + 12, 60)
    arp('harp', T(b), T(b + 6), [0, 2, 1, 3, 2, 4, 3, 1], E, 40, 55, 83, art=1.4)
    stabs('pizz', T(b), T(b + 6), [(k + .5, .25, 0) for k in range(4)], 40, 55, 69)
    bassline('bass', T(b), T(b + 6), 'bounce', 62)
    pad('str', T(b), T(b + 6), 38, 55, 72)
    dpat(b, b + 5, {MARACA: ('xoxoxoxo', 22), SIDE: ('..x...x.', 26), KICK: ('x.......', 26)})


@scene
def sc_outro(b):               # тема мягко, но полно: флейта и струнные, валторна, арфа
    seq('fl', T(b), "A5/3 B5/1 A5/4 | F#5/3 A5/1 F#5/2 E5/2 | D5/3 E5/1 D5/2 B4/2 | E5/3 F#5/1 G5/2 E5/2", E, 82, art=.97)
    seq('str', T(b), "A4/3 B4/1 A4/4 | F#4/3 A4/1 F#4/2 E4/2 | D4/3 E4/1 D4/2 B3/2 | E4/3 F#4/1 G4/2 E4/2", E, 58, art=.97)
    seq('hn', T(b), "F#4/8 | A4/4 C#4/4 | D4/8 | B3/4 C#4/4", E, 60, art=.98)
    pad('str', T(b), T(b + 4), 40, 50, 64)
    arp('harp', T(b), T(b + 4), [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3], TR, 38, 55, 86, art=1.4)
    bassline('bass', T(b), T(b + 4), 'root', 58)


@scene
def sc_final(b):               # светлая кода: галоп возвращается, чистый тонический аккорд с такта 120
    dpat(b, b + 1, HOOVES, 0.85)
    put('dr', T(b + 2), Q, WBL, 34, 9)
    bassline('pizz', T(b), T(b + 2), 'gallop', 60, lo=38)
    stabs('mar', T(b), T(b + 2), [(k + 2 / 3, .25, 0) for k in range(4)], 46, 62, 76)
    seq('fl', T(b), "A5/2 B5/1 A5/3 F#5/2 A5/1 F#5/2 E5/1 | G5/2 A5/1 B5/2 G5/1 E5/2 G5/1 C#6/2 E6/1", TR, 84)
    pad('str', T(b), T(b + 2), 44, 55, 74)
    swell('str', T(b), T(b) + 2, 104, 104, 1)
    seq('fl', T(b + 2), "D6/16", E, 80, art=.97)
    for v, ns, vel in (('str', (50, 57, 62, 66, 69), 58), ('hn', (62, 66), 62), ('cl', (69,), 56), ('bass', (38,), 66),
                       ('vib', (74, 78, 81), 40)):
        for n in ns:
            put(v, T(b + 2) + 6, 2 * BAR - 60, n, vel, jit=0)
    put('timp', T(b + 2), Q * 2, 38, 70)
    gliss('harp', T(b + 2), 50, 86, 26, 46, 'D')
    put('glk', T(b + 2), Q * 3, 98, 44)


# ════════════════════════ Сборка ════════════════════════
KIT_EV, kit = [], None
for name, sc in SCENES:
    if sc['kit'] != kit:
        KIT_EV.append((max(0, T(START[name]) - 2), KITS[sc['kit']]))
        kit = sc['kit']
    COMP[name](START[name])
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
