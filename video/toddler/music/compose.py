"""Оригинальная музыка к ролику «От года до трёх» (серия «Психология развития», эпизод «Раннее детство»).

4/4, 96 уд/мин (такт = 2,5 с — та же сетка, что в первом эпизоде), соль мажор.
Тема серии — мотив колыбельной первого эпизода (ступени 5-6-5 | 3-5-3-2), здесь — в ритме шагов.
Фортепиано, струнные пиццикато (шаги), мягкие струнные, челеста — акценты, синхронные с анимацией.

Партитура собрана по сценам (SCENES): у каждой — фактура, гармония и мелодия по тактам,
акценты — в секундах от начала сцены. Поэтому сцены можно переставлять и удлинять:
вся сетка пересчитывается сама. Порядок и длины сцен совпадают с assets/js/scenes-*.js.
Детерминированно: «очеловечивание» — через фиксированный генератор (LCG), без random.

Запуск: python3 compose.py  →  toddler.mid (затем render.sh)
"""
import mido

BPM, TPB = 96, 480               # четверть = 480 тиков
BAR = 4 * TPB
SEC = TPB * BPM / 60             # тиков в секунде (768)
OUT = 'toddler.mid'

# ── Мотивы темы серии ──
L1 = [(0, 1.5, 74), (1.5, 0.5, 76), (2, 2, 74)]            # D5. E5 D5   — «5-6-5»
L2 = [(0, 1, 71), (1, 1, 74), (2, 1, 71), (3, 1, 69)]      # B4 D5 B4 A4 — «3-5-3-2»
L3 = [(0, 1, 67), (1, 1, 71), (2, 1, 74), (3, 1, 79)]      # G4 B4 D5 G5 — шаги вверх
L4 = [(0, 2, 74), (2, 2, 78)]                              # D5 → F#5 (на разрешении D)


def up(m, k=12):
    return [(b, d, n + k) for b, d, n in m]


CARD = dict(tex='card', harm=['Dsus4|D'], mel={1: [(0, 4, 74)]},
            acc=[('cel', 0.0, 74, 40, 1), ('cel', 0.105, 79, 40, 1), ('cel', 0.21, 83, 40, 1)])

# ── Сцены: (id, фактура, гармония по тактам, мелодия {такт: ноты}, акценты [(вид, с, нота, громк., длит.)]) ──
SCENES = [
    ('prologue', dict(tex='intro', harm=['G', 'G/B', 'Cmaj7'], mel={2: [(2, 1, 71), (3, 1, 74)], 3: [(0, 4, 76)]},
                      acc=[('pz', 1.25, 55, 66, .7), ('pz', 1.875, 59, 69, .7), ('pz', 2.5, 62, 63, .7), ('pz', 3.75, 43, 61, .7),
                           ('cel', 5.0, 79, 44, 1.5), ('cel', 5.0, 83, 44, 1.5), ('cel', 5.0, 86, 41, 1.5)])),
    ('title', dict(tex='title', harm=['G', 'Em7', 'Cmaj7'], mel={1: L1, 2: L2, 3: L3}, acc=[('cel', 3.75, 86, 40, 1)])),
    ('note', dict(tex='calm', harm=['Dsus4|D', 'Bm7', 'Am7'], mel={1: L4, 2: [(0, 3, 74)], 3: [(0, 2, 72), (2, 2, 76)]},
                  acc=[('cel', 3.0 + i * 0.24, n, 32, 0.5) for i, n in enumerate((74, 79, 81, 83, 86))])),
    ('ch1', CARD),
    ('ssr', dict(tex='p1', harm=['G', 'Em7', 'Cmaj7', 'D', 'Cmaj7|D'],
                 mel={1: [(0, 2, 71), (2, 1, 74), (3, 1, 76)], 2: [(0, 3, 71), (3, 1, 67)], 3: [(0, 2, 72), (2, 2, 76)],
                      4: [(0, 3, 74), (3, 1, 78)], 5: [(0, 2, 76), (2, 2, 74)]}, acc=[])),
    ('objects', dict(tex='p1', harm=['G', 'Bm7', 'Cmaj7', 'G/B', 'Am7', 'Dsus4|D'],
                     mel={1: L1, 2: [(0, 2, 74), (2, 2, 78)], 3: [(0, 2, 72), (2, 2, 71)], 4: [(0, 1, 71), (1, 1, 74), (2, 2, 79)],
                          5: [(0, 2, 76), (2, 1, 72), (3, 1, 69)], 6: [(0, 2, 67), (2, 2, 66)]},
                     acc=[('pz', 3.06, 40, 52, .7)] + [('cel', 4.375 + i * 0.3125, n, 44, 0.6) for i, n in enumerate((79, 83, 86, 91))]
                         + [('cel', 8.07 + i * 0.12, n, 36, 0.3) for i, n in enumerate((86, 83, 79))]
                         + [('cel', 10.9375, 83, 46, 1), ('cel', 10.9375, 88, 40, 1)])),
    ('field', dict(tex='p1', harm=['Em', 'Cmaj7', 'G/B', 'Am7', 'Cmaj7', 'Dsus4|D'],
                   mel={1: [(0, 2, 71), (2, 2, 67)], 2: [(0, 3, 71)], 3: [(0, 2, 74), (2, 2, 71)], 4: [(0, 3, 72)],
                        5: [(0, 2, 71), (2, 2, 67)], 6: [(0, 2, 69), (2, 2, 66)]},
                   acc=[('cel', 5.05, 88, 34, 0.5), ('cel', 7.25, 88, 30, 0.5)])),
    ('ch2', CARD),
    ('words', dict(tex='p2', harm=['G', 'D/F#', 'Em7', 'Cmaj7', 'G/B', 'Am7', 'Cmaj7', 'Dsus4|D'],
                   mel={1: up(L1), 2: [(0, 1, 78), (1, 1, 76), (2, 2, 74)], 3: [(0, 1.5, 79), (1.5, 0.5, 78), (2, 2, 74)],
                        4: [(0, 2, 76), (2, 2, 79)], 5: [(0, 1, 83), (1, 1, 81), (2, 2, 79)], 6: [(0, 3, 76), (3, 1, 72)],
                        7: [(0, 2, 76), (2, 2, 79)], 8: [(0, 2, 81), (2, 2, 78)]},
                   acc=[('cel', 1.3 + i * 0.28, n, 34, 0.4) for i, n in enumerate((67, 71, 74, 79, 83, 86, 91))]
                       + [('cel', 2.0, 83, 42, 0.8), ('cel', 3.0, 91, 42, 0.8)]
                       + [('cel', 5.5 + i * 0.35, n, 40, 0.5) for i, n in enumerate((86, 88, 91))]
                       + [('cel', 14.0, 79, 34, 1)])),
    ('help', dict(tex='p2', harm=['C', 'G/B', 'Am7', 'D', 'Em7', 'Dsus4|D'],
                  mel={1: [(0, 2, 76), (2, 2, 79)], 2: [(0, 3, 74)], 3: [(0, 2, 72), (2, 2, 76)], 4: [(0, 3, 78), (3, 1, 76)],
                       5: [(0, 4, 74)], 6: [(0, 2, 72), (2, 2, 74)]},
                  acc=[('pz', 3.65, 45, 52, .7), ('cel', 6.73, 83, 44, 1), ('cel', 6.73, 86, 40, 1), ('pz', 9.2, 43, 50, .7)])),
    ('family', dict(tex='p2', harm=['G', 'Em7', 'Am7', 'D', 'G/B', 'Cmaj7', 'Am7', 'Dsus4|D'],
                    mel={1: L1, 2: L2, 3: [(0, 2, 72), (2, 2, 76)], 4: [(0, 2, 74), (2, 2, 78)], 5: L1,
                         6: [(0, 2, 76), (2, 2, 79)], 7: [(0, 2, 76), (2, 2, 72)], 8: [(0, 2, 74), (2, 2, 78)]},
                    acc=[('pz', 4.71, 43, 50, .7), ('pz', 6.0, 40, 46, .7), ('cel', 9.9, 83, 42, 1), ('cel', 9.9, 88, 38, 1)]
                        + [('cel', 12.7 + i * 0.2, n, 34, 0.6) for i, n in enumerate((74, 79, 83, 86))])),
    ('ch3', CARD),
    ('mirror', dict(tex='p2', harm=['G', 'Bm7', 'Em7', 'Cmaj7', 'Am7', 'Dsus4|D'],
                    mel={1: L1, 2: L2, 3: [(0, 2, 71), (2, 2, 74)], 4: [(0, 2, 76), (2, 2, 72)], 5: [(0, 2, 72), (2, 2, 76)],
                         6: [(0, 2, 72), (2, 2, 74)]},
                    acc=[('cel', 4.8, 76, 30, 0.4), ('cel', 7.6, 83, 44, 1), ('cel', 7.7, 88, 40, 1)])),
    ('play', dict(tex='p2', harm=['G', 'C/G', 'G', 'Am7', 'D'],
                  mel={1: [(0, .5, 74), (.5, .5, 76), (1, 1, 74), (2, 1, 71), (3, 1, 67)], 2: [(0, 1, 72), (1, 1, 76), (2, 2, 72)],
                       3: [(0, .5, 74), (.5, .5, 76), (1, 1, 74), (2, 1, 79), (3, 1, 74)], 4: [(0, 2, 72), (2, 2, 76)], 5: [(0, 2, 74), (2, 2, 78)]},
                  acc=[('cel', 7.25 + i * 0.06, n, 30 + i, 0.4) for i, n in enumerate((74, 76, 79, 81, 83, 86, 88, 91))])),
    ('speech', dict(tex='p2', harm=['Em7', 'Cmaj7', 'G/B', 'Am7', 'Cmaj7', 'Dsus4|D'],
                    mel={1: [(0, 3, 71)], 2: [(0, 2, 72), (2, 2, 76)], 3: [(0, 3, 74)], 4: [(0, 2, 72), (2, 2, 69)],
                         5: [(0, 2, 76), (2, 2, 72)], 6: [(0, 2, 67), (2, 2, 66)]},
                    acc=[('cel', 1.8, 83, 36, 0.5), ('cel', 4.4, 86, 36, 0.5), ('cel', 7.0, 88, 38, 0.5),
                         ('pz', 2.75, 43, 52, .7), ('pz', 5.35, 47, 52, .7), ('pz', 7.95, 50, 54, .7)]
                        + [('cel', 9.3 + i * 0.07, n, 32 - i, 0.35) for i, n in enumerate((91, 88, 86, 83, 79, 76))]
                        + [('cel', 10.0, 74, 34, 1.2)])),
    ('ch4', CARD),
    ('potty', dict(tex='p3', harm=['G', 'D/F#', 'Em7', 'Cmaj7', 'Am7', 'Dsus4|D'],
                   mel={1: L1, 2: [(0, 2, 74), (2, 2, 78)], 3: [(0, 2, 71), (2, 2, 74)], 4: [(0, 2, 72), (2, 2, 76)],
                        5: [(0, 2, 72), (2, 2, 76)], 6: [(0, 2, 74), (2, 2, 78)]},
                   acc=[('cel', 0.9, 79, 32, 1), ('cel', 5.2, 83, 34, 1)])),
    ('erikson', dict(tex='p3', harm=['C', 'G/B', 'Am7', 'D', 'Em7', 'Dsus4|D'],
                     mel={1: [(0, 2, 76), (2, 2, 79)], 2: [(0, 3, 74)], 3: [(0, 2, 72), (2, 2, 76)], 4: [(0, 3, 78), (3, 1, 76)],
                          5: [(0, 2, 71), (2, 2, 74)], 6: [(0, 2, 67), (2, 2, 66)]},
                     acc=[('cel', 4.5, 79, 38, 1), ('cel', 4.5, 83, 34, 1), ('pz', 7.1, 40, 44, .7)])),
    ('crisis', dict(tex='crisis', harm=['Em', 'C', 'Am', 'B7', 'Cmaj7', 'Dsus4|D'],
                    mel={1: [(0, 2, 71), (2, 1, 74), (3, 1, 76)], 2: [(0, 3, 76), (3, 1, 74)], 3: [(0, 2, 72), (2, 2, 76)],
                         4: [(0, 2, 75), (2, 2, 78)], 5: [(0, 2, 76), (2, 2, 79)], 6: [(0, 2, 79), (2, 2, 78)]},
                    acc=[('cel', 2.4 + i * 0.2, n, 34, 0.35) for i, n in enumerate((76, 79, 81, 83, 84, 88, 91))]
                        + [('cel', 10.625, n, 42, 1.5) for n in (79, 83, 86)])),
    ('self', dict(tex='self', harm=['G', 'D/F#', 'Em7', 'Bm7', 'Cmaj7', 'Am7', 'Dsus4|D'],
                  mel={1: up(L1), 2: [(0, 1, 83), (1, 1, 86), (2, 1, 83), (3, 1, 81)], 3: [(0, 1, 79), (1, 1, 83), (2, 1, 86), (3, 1, 91)],
                       4: [(0, 2, 90), (2, 2, 86)], 5: [(0, 2, 88), (2, 2, 84)], 6: [(0, 2, 84), (2, 2, 81)], 7: [(0, 2, 79), (2, 2, 78)]},
                  acc=[('cel', 2.0 + i * 0.5, n, 36, 0.6) for i, n in enumerate((74, 79, 83, 86, 91))]
                      + [('cel', 5.0, n, 42, 2) for n in (79, 83, 86, 91)])),
    ('summary', dict(tex='summary', harm=['G', 'D/F#', 'Em7', 'Cmaj7', 'G/B', 'Am7', 'Dsus4|D'],
                     mel={1: L1, 2: [(0, 1, 74), (1, 1, 78), (2, 2, 74)], 3: L2, 4: L3, 5: L1, 6: [(0, 2, 76), (2, 2, 72)], 7: L4},
                     acc=[])),
    ('outro', dict(tex='outro', harm=['G', 'Bm7', 'Cmaj7', 'Dsus4|D', 'Gadd9'],
                   mel={1: L1, 2: L2, 3: [(0, 2, 72), (2, 2, 76)], 4: L4, 5: [(0, 4, 79)]},
                   acc=[('cel', 6.0, 86, 34, 0.6), ('cel', 6.3125, 88, 32, 0.6), ('cel', 6.625, 86, 30, 0.6), ('cel', 7.5, 83, 28, 0.6)])),
]

# ── Сборка сетки ──
H, TEX, M, ACC_ALL, START = [], [], {}, [], {}
bar = 1
for name, sc in SCENES:
    START[name] = bar
    n = len(sc['harm'])
    for i, sym in enumerate(sc['harm']):
        H.append(sym)
        TEX.append(sc['tex'])
        if (i + 1) in sc['mel']:
            M[bar + i] = sc['mel'][i + 1]
    for kind, t, note_, vel, dur in sc['acc']:
        ACC_ALL.append((kind, (bar - 1) * 2.5 + t, note_, vel, dur))
    bar += n
NBARS = len(H)
print('bars:', NBARS, 'seconds:', NBARS * 2.5)

PC = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7],
        '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14], '7sus4': [0, 5, 7, 10], '6': [0, 4, 7, 9]}


def chord(sym):
    """'G/B', 'Cmaj7', 'Em7', 'Dsus4' → (bass_midi, [pitch classes])"""
    main, _, slash = sym.partition('/')
    root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
    r = PC[root]
    pcs = [(r + i) % 12 for i in QUAL[main[len(root):]]]
    b = PC[slash] if slash else r
    bass = 36 + b if b >= 4 else 48 + b          # бас в диапазоне E2..D#3
    return bass, pcs


def chord_at(bar, beat):
    sym = H[bar - 1]
    a, _, b = sym.partition('|')
    return (b if (b and beat >= 2) else a)


class LCG:
    def __init__(self, seed=20260927):
        self.s = seed
    def next(self):
        self.s = (1103515245 * self.s + 12345) % 2 ** 31
        return self.s / 2 ** 31
    def jitter(self, a):
        return (self.next() * 2 - 1) * a


rng = LCG()
CH = {'acc': 0, 'mel': 1, 'pad': 2, 'pizz': 3, 'cel': 4}
events = {c: [] for c in CH.values()}
notes_log = []                                     # (start, end, pitch, ch) — для проверки диссонансов


def note(ch, tick, dur, n, vel, jit=True):
    t0 = max(0, int(tick + (rng.jitter(8) if jit else 0)))
    v = max(1, min(127, int(vel + rng.jitter(4))))
    t1 = t0 + max(30, int(dur))
    events[ch].append((t0, mido.Message('note_on', channel=ch, note=n, velocity=v)))
    events[ch].append((t1, mido.Message('note_off', channel=ch, note=n, velocity=0)))
    notes_log.append((t0, t1, n, ch))


def cc(ch, tick, ctrl, val):
    events[ch].append((int(tick), mido.Message('control_change', channel=ch, control=ctrl, value=int(val))))


def tones(pcs, lo, hi):
    return [n for n in range(lo, hi + 1) if n % 12 in pcs]


def upper(pcs):
    """Верхние голоса без основного тона у септаккордов (его берёт бас)"""
    return pcs[1:] if len(pcs) >= 4 else pcs


def T(bar, beat=0.0):
    return (bar - 1) * BAR + beat * TPB


def snap(n, tick):
    """Ближайший звук аккорда (вверх при равенстве) — акценты не спорят с гармонией"""
    b = int(tick // BAR) + 1
    beat = (tick - (b - 1) * BAR) / TPB
    pcs = chord(chord_at(max(1, min(NBARS, b)), beat))[1]
    return min(range(n - 6, n + 7), key=lambda x: (abs(x - n) if x % 12 in pcs else 99, -x))


SNAPPED = [(k, int(round(s * SEC)), snap(n, int(round(s * SEC))), v, d) for k, s, n, v, d in ACC_ALL]

# занятые мелодией и акцентами звуковысотные классы — по половинам тактов
BUSY = {}


def busy(tick0, tick1, n):
    for h in range(int(tick0 // (2 * TPB)), int(max(tick0, tick1 - 1) // (2 * TPB)) + 1):
        BUSY.setdefault(h, set()).add(n % 12)


for b_, lst in M.items():
    for (b, d, n) in lst:
        busy(T(b_, b), T(b_, b) + d * TPB, n)
for kind, tk, m, v, d in SNAPPED:
    busy(tk, tk + d * TPB, m)


def free(pcs, h):
    """Тона аккорда без тех, что стоят в полутоне от мелодии/акцентов в этой половине такта"""
    bz = BUSY.get(h, set())
    ok = [p for p in pcs if not any(((p - q) % 12) in (1, 11) for q in bz)]
    return ok if len(ok) >= 2 else pcs[:2]


VEL_MEL = {'intro': 54, 'title': 60, 'calm': 54, 'card': 56, 'p1': 58, 'p2': 58, 'p3': 60, 'crisis': 60, 'self': 62, 'summary': 56, 'outro': 54}
VEL_ACC = {'intro': 40, 'title': 42, 'calm': 36, 'card': 38, 'p1': 42, 'p2': 40, 'p3': 42, 'crisis': 44, 'self': 42, 'summary': 38, 'outro': 36}
VEL_PAD = {'intro': 26, 'title': 34, 'calm': 30, 'card': 30, 'p1': 28, 'p2': 38, 'p3': 32, 'crisis': 46, 'self': 44, 'summary': 38, 'outro': 34}
FLOW = ('title', 'calm', 'p2', 'summary', 'crisis', 'self')

prev_pad = [62, 67, 71]
for bar in range(1, NBARS + 1):
    tex = TEX[bar - 1]
    t_bar = T(bar)
    va = VEL_ACC[tex]
    last_bars = bar >= NBARS - 2
    if last_bars: va -= (bar - (NBARS - 3)) * 3
    for half in (0, 1):
        sym = chord_at(bar, 2 * half)
        bass, pcs = chord(sym)
        th = t_bar + half * 2 * TPB
        hidx = int(th // (2 * TPB))
        upc = free(upper(pcs), hidx)
        up3 = tones(upc, bass + 12, bass + 26)
        HALF_END = th + 2 * TPB - 20
        cc(CH['acc'], th + 15, 64, 127); cc(CH['acc'], th + 2 * TPB - 25, 64, 0)
        final = (bar == NBARS)
        # ── пиццикато: шаги ──
        if tex == 'p3':
            seq = [bass, bass + 7 if (bass + 7) % 12 in pcs else bass + 12]
            for k, n in enumerate(seq):
                note(CH['pizz'], th + k * TPB, TPB * 0.8, n, 58 if k == 0 else 50)
        elif tex in ('p1', 'title') or (tex == 'crisis' and bar < START['crisis'] + 4):
            note(CH['pizz'], th, TPB * 0.9, bass, 58)
        elif tex in ('p2', 'summary', 'crisis', 'self', 'card', 'calm') and half == 0:
            note(CH['pizz'], th, TPB * 0.9, bass, 54 if tex != 'calm' else 46)
        elif tex == 'outro' and not final and half == 0:
            note(CH['pizz'], th, TPB * 0.9, bass, 48)
        # ── фортепиано ──
        if tex == 'intro':
            if bar >= 2 and half == 0:
                for n in up3[:3]:
                    note(CH['acc'], th + TPB, TPB * 2.6, n, va)       # такт целиком: одна гармония
        elif tex in ('p1', 'p3'):
            for n in up3[:3]:
                note(CH['acc'], th + TPB, TPB * 0.55, n, va - 2)      # лёгкие аккорды на 2-ю и 4-ю доли
        elif tex == 'card':
            if half == 0:
                note(CH['acc'], th, TPB * 1.9, bass, va)
            for n in up3[:3]:
                note(CH['acc'], th + 20, 2 * TPB - 60, n, va - 6)
        elif tex in FLOW:
            seq = tones(upc, bass + 7, bass + 24)
            pat = [bass] + ([seq[i % len(seq)] for i in (0, 1, 2)] if half == 0 else [seq[i % len(seq)] for i in (1, 2, 1)])
            for k, n in enumerate(pat):         # восьмые: бас и три звука аккорда на каждую половину такта
                st = th + k * TPB // 2
                note(CH['acc'], st, min(TPB * (1.5 if k == 0 else 0.8), HALF_END - st), n, (va + 2) if k == 0 else (va - 6))
        elif tex == 'outro' and not final:
            seq = tones(upc, bass + 7, bass + 24)
            for k, n in enumerate([bass] + seq[:3]):
                st = th + k * TPB // 2
                note(CH['acc'], st, min(TPB * (1.5 if k == 0 else 0.9), HALF_END - st), n, va - (0 if k == 0 else 6))
        # ── струнные ──
        if (tex != 'intro' or bar == 3) and not final:
            pool = tones(upc, 57, 79)
            cands = []
            for i in range(len(pool)):
                for j in range(i + 1, len(pool)):
                    for k in range(j + 1, len(pool)):
                        v = [pool[i], pool[j], pool[k]]
                        if len({x % 12 for x in v}) >= 2 and v[2] - v[0] <= 12:
                            cands.append(v)
            if not cands:
                cands = [pool[:3]]
            pad = min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev_pad)))
            prev_pad = pad
            for n in pad:
                note(CH['pad'], th + 6, 2 * TPB - 14, n, VEL_PAD[tex], jit=False)
    # ── мелодия ──
    for (b, d, n) in M.get(bar, []):
        vm = VEL_MEL[tex] + (4 if b in (0, 2) else -2)
        if last_bars: vm -= (bar - (NBARS - 3)) * 2
        note(CH['mel'], t_bar + b * TPB, d * TPB * 0.95, n, vm)

# финальный аккорд: держится до конца
fb = T(NBARS)
for n in [43, 55, 62, 67, 69, 71, 74]:
    note(CH['acc'], fb, BAR - 40, n, 32)
for n in [62, 67, 71]:
    note(CH['pad'], fb + 6, BAR - 60, n, 30, jit=False)

for kind, tk, m, v, d in SNAPPED:
    note(CH['cel'] if kind == 'cel' else CH['pizz'], tk, d * TPB, m, v, jit=False)

# ── Проверка: нет ли одновременных нот через полутон / малую нону ──
bad = 0
L = sorted(notes_log)
for i in range(len(L)):
    a0, a1, an, ach = L[i]
    for j in range(i + 1, len(L)):
        b0, b1, bn, bch = L[j]
        if b0 >= a1 - 60:
            break
        if min(a1, b1) - max(a0, b0) < 120:      # короче восьмой — проходящие, не считаем
            continue
        if abs(an - bn) in (1, 13, 25):
            bad += 1
            if bad <= 12:
                print('clash bar %.2f: %d(ch%d) vs %d(ch%d)' % (max(a0, b0) / BAR + 1, an, ach, bn, bch))
print('clashes:', bad)

# ── Файл ──
mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
meta = mido.MidiTrack(); mid.tracks.append(meta)
meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
meta.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
meta.append(mido.MetaMessage('end_of_track', time=NBARS * BAR + 4 * TPB))
setup = {CH['acc']: (0, 88, 58, 10), CH['mel']: (0, 104, 68, 8), CH['pad']: (49, 60, 72, 40),
         CH['pizz']: (45, 84, 52, 22), CH['cel']: (8, 70, 76, 34)}  # program, volume, pan, reverb send
for ch in sorted(setup):
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    prog, vol, pan, rev = setup[ch]
    tr.extend([mido.Message('program_change', channel=ch, program=prog, time=0),
               mido.Message('control_change', channel=ch, control=7, value=vol, time=0),
               mido.Message('control_change', channel=ch, control=10, value=pan, time=0),
               mido.Message('control_change', channel=ch, control=91, value=rev, time=0),
               mido.Message('control_change', channel=ch, control=93, value=0, time=0)])
    evs = sorted(events[ch], key=lambda e: (e[0], 0 if e[1].type == 'note_off' else 1))
    last = 0
    for t, msg in evs:
        msg.time = t - last
        last = t
        tr.append(msg)
mid.save(OUT)
print('saved', OUT, 'length %.2f s' % mid.length, 'notes:', len(notes_log))
