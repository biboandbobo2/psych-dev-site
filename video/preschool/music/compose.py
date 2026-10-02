"""Оригинальная музыка к ролику «От трёх до семи» (серия «Психология развития», эпизод «Дошкольный возраст»).

6/8, такт = 2,5 с (та же сетка, что в первых эпизодах): четверть с точкой = 1,25 с — покачивание «игры в лошадки».
Ре мажор; кризис семи лет — си минор, разрешение — снова ре мажор.
Тема серии — мотив колыбельной первого эпизода (ступени 5-6-5 | 3-5-3-2), здесь — в ритме галопа.
Деревянные духовые как роли в игре (флейта, кларнет, гобой, фагот) — кивок «Пете и волку»;
фортепиано, мягкие струнные, пиццикато и челеста — акценты, синхронные с анимацией.
«Больница» — четыре уровня игры: соло → голоса рядом, но порознь → перекличка → канон.

Партитура собрана по сценам (SCENES): порядок и длины совпадают с assets/js/scenes-*.js,
акценты — в секундах от начала сцены. Детерминированно: «очеловечивание» — фиксированный генератор (LCG).

Запуск: python3 compose.py  →  preschool.mid (затем render.sh)
"""
import mido

BPM, TPB = 72, 480               # четверть = 480 тиков; 6/8: такт = 6 восьмых = 3 четверти = 2,5 с
E8 = TPB // 2                    # восьмая
BAR = 6 * E8
SEC = TPB * BPM / 60             # тиков в секунду (576)
OUT = 'preschool.mid'

# ── Тема серии (позиция и длительность — в восьмых) ──
TH1 = [(0, 2, 81), (2, 1, 83), (3, 3, 81)]                 # A5 B5 A5   — «5-6-5»
TH2 = [(0, 2, 78), (2, 1, 81), (3, 2, 78), (5, 1, 76)]     # F#5 A5 F#5 E5 — «3-5-3-2»
GAL = [(0, 2, 81), (2, 1, 83), (3, 2, 81), (5, 1, 78)]     # тема в ритме галопа


def down(m, k=12):
    return [(b, d, n - k) for b, d, n in m]


CARD = dict(tex='card', harm=['Dsus4|D'], mel={1: [(0, 6, 74)]}, inst='fl',
            acc=[('cel', 0.0, 74, 40, 1), ('cel', 0.105, 78, 40, 1), ('cel', 0.21, 81, 40, 1)])

# ── Сцены: фактура, гармония по тактам («X|Y» — смена на второй доле), мелодия {такт: ноты}, инструмент, акценты ──
SCENES = [
    ('prologue', dict(tex='gallop', harm=['D', 'G/D', 'A7|D'], inst='fl',
                      mel={2: GAL, 3: [(0, 2, 76), (2, 1, 78), (3, 3, 74)]},
                      acc=[('pz', 3.0, 50, 64, .6), ('pz', 4.25, 50, 64, .6), ('pz', 5.5, 50, 66, .6),
                           ('cel', 2.15, 86, 36, .8)])),
    ('title', dict(tex='title', harm=['D', 'Bm7', 'Gmaj7|A'], inst='fl',
                   mel={1: TH1, 2: TH2, 3: [(0, 3, 79), (3, 3, 81)]}, acc=[('cel', 6.6, 86, 38, 1)])),
    ('note', dict(tex='calm', harm=['Asus4|A', 'F#m', 'Em7|A'], inst='cl',
                  mel={1: [(0, 6, 76)], 2: [(0, 3, 73), (3, 3, 78)], 3: [(0, 6, 76)]},
                  acc=[('cel', 3.0 + i * 0.09, n, 30, 0.4) for i, n in enumerate((74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98, 100))])),
    ('ch1', CARD),
    ('ssr', dict(tex='lilt', harm=['D', 'Bm', 'G', 'A'], inst='fl', mel={},
                 acc=[('pz', 2.95, 45, 52, .6), ('pz', 4.2, 45, 54, .6), ('cel', 5.6, 81, 40, 1), ('cel', 5.75, 85, 38, 1)])),
    ('fields', dict(tex='lilt', harm=['Bm', 'G', 'D/F#', 'Em7', 'G', 'Asus4|A'], inst='fl', mel={},
                    acc=[('cel', 2.4, 78, 34, .6), ('cel', 4.3, 81, 34, .6), ('cel', 10.4, 86, 40, 1.2), ('cel', 10.5, 90, 36, 1.2)])),
    ('hospital', dict(tex='hosp', harm=['D', 'D', 'G', 'A', 'Bm', 'G', 'Em7|A', 'D'], inst='fl',
                      mel={1: [(0, 1, 78), (1, 2, 74), (3, 1, 78), (4, 2, 74)],
                           2: [(0, 1, 78), (1, 2, 74), (3, 1, 78), (4, 2, 74)],
                           3: [(0, 3, 79), (3, 3, 83)], 4: [(0, 3, 81), (3, 3, 76)],
                           5: [(0, 1, 78), (1, 1, 81), (2, 1, 83)], 6: [(0, 1, 79), (1, 1, 83), (2, 1, 86)],
                           7: [(0, 2, 76), (2, 1, 74), (3, 3, 69)], 8: [(0, 3, 78), (3, 3, 74)]},
                      mel2={3: [(0, 1, 67), (1, 1, 71), (2, 1, 74), (3, 1, 71), (4, 2, 67)],
                            4: [(0, 1, 69), (1, 1, 73), (2, 1, 76), (3, 1, 73), (4, 2, 69)],
                            5: [(3, 1, 71), (4, 1, 74), (5, 1, 66)], 6: [(3, 1, 67), (4, 1, 71), (5, 1, 74)],
                            8: [(0, 2, 64), (2, 1, 62), (3, 3, 57)]},
                      acc=[('cel', 1.85, 86, 30, .3), ('cel', 2.75, 86, 30, .3), ('cel', 3.65, 86, 30, .3),
                           ('cel', 5.8, 81, 38, .8), ('cel', 12.4, 74, 36, .8), ('cel', 17.0, 78, 40, 1), ('cel', 17.1, 81, 38, 1)])),
    ('sentry', dict(tex='lilt', harm=['D', 'G', 'Bm', 'F#m', 'G', 'A', 'D'], inst='ob', mel={},
                    acc=[('pz', 1.6, 50, 50, .6), ('cel', 4.6, 86, 38, 1), ('cel', 8.3, 78, 34, 1.2), ('cel', 8.6, 74, 32, 1.2),
                         ('cel', 14.5, 81, 40, 1), ('cel', 14.6, 88, 38, .5)])),
    ('checks', dict(tex='lilt', harm=['G', 'D/F#', 'Em7', 'Asus4|A'], inst='cl', mel={},
                    acc=[x for i in range(4) for x in (('cel', 1.4 + i * 1.9, 83 - i * 2, 40, .4), ('pz', 1.4 + i * 1.9, 43, 52, .5))])),
    ('ch2', CARD),
    ('water', dict(tex='lilt', harm=['D', 'A/C#', 'Bm', 'G', 'Em7', 'Asus4|A'], inst='cl', mel={},
                   acc=[('cel', 3.4 + i * 0.16, n, 30, .4) for i, n in enumerate((90, 88, 86, 83, 81, 78, 76))]
                       + [('cel', 6.9, 86, 40, .8), ('cel', 7.8, 81, 36, .6)])),
    ('maxi', dict(tex='lilt', harm=['D', 'G', 'Bm', 'A', 'D/F#', 'G', 'Em7', 'A', 'Bm', 'G|A'], inst='cl', mel={},
                  acc=[('cel', 6.0, 78, 34, .5), ('cel', 6.8, 86, 34, .8), ('cel', 9.0, 74, 32, .6), ('cel', 10.9, 86, 36, .8),
                       ('cel', 11.3, 81, 36, .8), ('cel', 14.1, 78, 34, .5), ('cel', 14.45, 81, 34, .5), ('cel', 14.8, 86, 36, .5)])),
    ('ch3', CARD),
    ('candy', dict(tex='lilt', harm=['D', 'G', 'Bm', 'F#m', 'G', 'A'], inst='ob', mel={},
                   acc=[('pz', 5.0, 45, 52, .6), ('pz', 5.75, 45, 50, .6), ('cel', 7.8, 86, 36, .8),
                        ('cel', 9.4, 73, 30, 1.4), ('cel', 13.0, 79, 38, .8), ('cel', 13.3, 83, 36, .8)])),
    ('cards', dict(tex='lilt', harm=['D', 'A', 'Bm', 'G', 'A'], inst='ob', mel={},
                   acc=[('cel', 3.2, 86, 40, .5), ('cel', 6.4, 74, 36, .6), ('cel', 9.0, 86, 40, .5), ('cel', 9.1, 90, 36, .5)])),
    ('cups', dict(tex='lilt', harm=['G', 'D', 'A', 'Bm', 'Em7', 'A'], inst='ob', mel={},
                  acc=[('cel', 2.0 + i * 0.03, n, 34, .25) for i, n in enumerate((98, 95, 93, 91, 90, 88, 86, 85, 83, 81, 79, 78, 76, 74, 73))]
                      + [('cel', 2.7, 81, 40, .5), ('cel', 3.0, 78, 34, .8)])),
    ('conscience', dict(tex='lilt', harm=['Bm', 'G', 'D', 'A'], inst='fg', mel={},
                        acc=[('cel', 3.9, 78, 34, 1), ('cel', 7.0, 86, 38, .8)])),
    ('erikson', dict(tex='lilt', harm=['D', 'G', 'Em7', 'A'], inst='fl', mel={},
                     acc=[('cel', 2.2 + i * 0.12, n, 34, .4) for i, n in enumerate((74, 78, 81, 86, 90))]
                         + [('cel', 5.9 + i * 0.14, n, 30, .4) for i, n in enumerate((88, 83, 79, 76, 71))])),
    ('ch4', dict(tex='card', harm=['Bm'], mel={1: [(0, 6, 71)]}, inst='ob',
                 acc=[('cel', 0.0, 71, 40, 1), ('cel', 0.105, 74, 40, 1), ('cel', 0.21, 78, 40, 1)])),
    ('crisis7', dict(tex='crisis', harm=['Bm', 'Em', 'F#7', 'Bm', 'G', 'F#7'], inst='ob', mel={},
                     acc=[('cel', 3.7, 78, 34, .6), ('cel', 4.3, 81, 32, .6), ('cel', 9.6, 74, 34, .5), ('cel', 10.0, 78, 34, .5),
                          ('cel', 10.4, 83, 34, .5)])),
    ('shift', dict(tex='lilt', harm=['Bm', 'G', 'D', 'A', 'Asus4|A'], inst='cl', mel={},
                   acc=[('cel', 2.4, 74, 36, .8), ('cel', 2.6, 81, 36, .8)]
                       + [('cel', 5.2 + i * 0.04 * 4, 86 + (i % 3) * 2, 26, .25) for i in range(4)])),
    ('school', dict(tex='full', harm=['D', 'G', 'Bm7', 'A', 'G', 'D'], inst='fl',
                    mel={1: TH1, 2: TH2, 3: [(0, 3, 78), (3, 3, 74)], 4: [(0, 6, 76)], 5: [(0, 2, 79), (2, 1, 81), (3, 3, 83)], 6: [(0, 6, 81)]},
                    acc=[('cel', 6.4, 86, 40, 1), ('cel', 6.5, 90, 38, 1), ('cel', 7.4, 93, 30, 1.2)])),
    ('summary', dict(tex='summary', harm=['D', 'A/C#', 'Bm7', 'G', 'D/F#', 'Em7', 'A'], inst='fl',
                     mel={1: TH1, 3: TH2, 5: [(0, 3, 78), (3, 3, 74)], 7: [(0, 6, 76)]}, acc=[])),
    ('outro', dict(tex='outro', harm=['D', 'Bm7', 'G', 'Asus4|A', 'Dadd9'], inst='fl',
                   mel={1: TH1, 2: TH2, 3: [(0, 3, 74), (3, 3, 79)], 4: [(0, 3, 76), (3, 3, 73)], 5: [(0, 6, 74)]},
                   acc=[('cel', 6.0, 86, 34, .6), ('cel', 6.3125, 88, 32, .6), ('cel', 6.625, 86, 30, .6), ('cel', 7.5, 83, 28, .6)])),
]

# ── Сетка ──
H, TEX, INST, M, M2, ACC_ALL, START = [], [], [], {}, {}, [], {}
bar = 1
for name, sc in SCENES:
    START[name] = bar
    for i, sym in enumerate(sc['harm']):
        H.append(sym); TEX.append(sc['tex']); INST.append(sc['inst'])
        if (i + 1) in sc['mel']:
            M[bar + i] = sc['mel'][i + 1]
        if (i + 1) in sc.get('mel2', {}):
            M2[bar + i] = sc['mel2'][i + 1]
    for kind, t, n, vel, dur in sc['acc']:
        ACC_ALL.append((kind, (bar - 1) * 2.5 + t, n, vel, dur))
    bar += len(sc['harm'])
NBARS = len(H)
print('bars:', NBARS, 'seconds:', NBARS * 2.5)

PC = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7],
        '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14], '6': [0, 4, 7, 9]}


def chord(sym):
    main, _, slash = sym.partition('/')
    root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
    r = PC[root]
    pcs = [(r + i) % 12 for i in QUAL[main[len(root):]]]
    b = PC[slash] if slash else r
    bass = 36 + b if b >= 4 else 48 + b
    return bass, pcs


def chord_at(b, eighth):
    a, _, c = H[b - 1].partition('|')
    return c if (c and eighth >= 3) else a


class LCG:
    def __init__(self, seed=20261003):
        self.s = seed
    def next(self):
        self.s = (1103515245 * self.s + 12345) % 2 ** 31
        return self.s / 2 ** 31
    def jitter(self, a):
        return (self.next() * 2 - 1) * a


rng = LCG()
CH = {'acc': 0, 'fl': 1, 'pad': 2, 'pizz': 3, 'cel': 4, 'cl': 5, 'ob': 6, 'fg': 7}
events = {c: [] for c in CH.values()}
notes_log = []


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
    return pcs[1:] if len(pcs) >= 4 else pcs


def T(b, eighth=0.0):
    return (b - 1) * BAR + eighth * E8


# ── Мелодия по умолчанию: тона аккорда, плавное движение, ритмы 6/8 ──
RHY = [[(0, 2), (2, 1), (3, 3)], [(0, 3), (3, 2), (5, 1)], [(0, 1), (1, 1), (2, 1), (3, 3)], [(0, 2), (2, 1), (3, 2), (5, 1)], [(0, 3), (3, 3)]]
prev = 78
for b in range(1, NBARS + 1):
    if b in M or TEX[b - 1] in ('card', 'calm', 'hosp', 'gallop'):
        if b in M and M[b]:
            prev = M[b][-1][2]
        continue
    nxt_scene_start = any(START[nm] == b + 1 for nm, _ in SCENES) or b == NBARS
    rh = [(0, 6)] if nxt_scene_start else RHY[(b * 7 + len(H[b - 1])) % len(RHY)]
    out = []
    for k, (p, d) in enumerate(rh):
        pcs = chord(chord_at(b, p))[1]
        cand = tones(pcs, 69, 88)
        step = 1 if (b + k) % 3 else -1
        target = prev + step * 2
        n = min(cand, key=lambda x: (abs(x - target), x == prev))
        out.append((p, d, n)); prev = n
    M[b] = out

# занятые мелодиями и акцентами звуковысотные классы — по половинам такта (по 3 восьмые)
BUSY = {}


def busy(t0, t1, n):
    for h in range(int(t0 // (3 * E8)), int(max(t0, t1 - 1) // (3 * E8)) + 1):
        BUSY.setdefault(h, set()).add(n % 12)


def snap(n, tick):
    b = int(tick // BAR) + 1
    eighth = (tick - (b - 1) * BAR) / E8
    pcs = chord(chord_at(max(1, min(NBARS, b)), eighth))[1]
    return min(range(n - 6, n + 7), key=lambda x: (abs(x - n) if x % 12 in pcs else 99, -x))


SNAPPED = [(k, int(round(s * SEC)), snap(n, int(round(s * SEC))), v, d) for k, s, n, v, d in ACC_ALL]
for mm in (M, M2):
    for b_, lst in mm.items():
        for (p, d, n) in lst:
            busy(T(b_, p), T(b_, p) + d * E8, n)
for kind, tk, m, v, d in SNAPPED:
    busy(tk, tk + d * TPB, m)


def free(pcs, h):
    bz = BUSY.get(h, set())
    ok = [p for p in pcs if not any(((p - q) % 12) in (1, 11) for q in bz)]
    return ok if len(ok) >= 2 else pcs[:2]


VEL_MEL = {'gallop': 58, 'title': 62, 'calm': 52, 'card': 56, 'lilt': 58, 'hosp': 60, 'crisis': 60, 'full': 64, 'summary': 56, 'outro': 54}
VEL_ACC = {'gallop': 44, 'title': 42, 'calm': 34, 'card': 38, 'lilt': 40, 'hosp': 38, 'crisis': 44, 'full': 44, 'summary': 38, 'outro': 36}
VEL_PAD = {'gallop': 22, 'title': 34, 'calm': 30, 'card': 30, 'lilt': 28, 'hosp': 26, 'crisis': 48, 'full': 46, 'summary': 38, 'outro': 34}

prev_pad = [62, 66, 69]
for b in range(1, NBARS + 1):
    tex = TEX[b - 1]
    va = VEL_ACC[tex]
    if b >= NBARS - 2: va -= (b - (NBARS - 3)) * 3
    final = (b == NBARS)
    for half in (0, 1):
        sym = chord_at(b, 3 * half)
        bass, pcs = chord(sym)
        th = T(b) + half * 3 * E8
        hidx = int(th // (3 * E8))
        upc = free(upper(pcs), hidx)
        up3 = tones(upc, bass + 12, bass + 26)
        cc(CH['acc'], th + 15, 64, 127); cc(CH['acc'], th + 3 * E8 - 25, 64, 0)
        # ── пиццикато: шаги галопа и опора ──
        if tex == 'gallop':
            note(CH['pizz'], th, E8 * 1.6, bass, 60)
            note(CH['pizz'], th + 2 * E8, E8 * 0.8, bass + 7 if (bass + 7) % 12 in pcs else bass + 12, 50)
        elif tex in ('lilt', 'title', 'hosp', 'summary', 'crisis', 'full') and half == 0:
            note(CH['pizz'], th, E8 * 2, bass, 54)
        elif tex == 'outro' and not final and half == 0:
            note(CH['pizz'], th, E8 * 2, bass, 46)
        # ── фортепиано ──
        if tex == 'gallop':
            for n in up3[:3]:
                note(CH['acc'], th + 2 * E8, E8 * 0.7, n, va - 4)             # «дум-да» — короткий аккорд на третьей восьмой
        elif tex in ('lilt', 'title', 'hosp', 'summary', 'full'):
            seq = tones(upc, bass + 7, bass + 24)
            pat = [bass] + [seq[i % len(seq)] for i in ((0, 1) if half == 0 else (1, 2))]
            for k, n in enumerate(pat):                                       # бас + два звука аккорда восьмыми
                st = th + k * E8
                note(CH['acc'], st, E8 * (2.6 if k == 0 else 0.9), n, (va + 2) if k == 0 else (va - 6))
        elif tex == 'calm':
            for n in [bass] + up3[:3]:
                note(CH['acc'], th + 10, 3 * E8 - 40, n, va - (0 if n == bass else 4))
        elif tex == 'card':
            if half == 0:
                note(CH['acc'], th, E8 * 5.6, bass, va)
            for n in up3[:3]:
                note(CH['acc'], th + 20, 3 * E8 - 60, n, va - 6)
        elif tex == 'crisis':
            for k in range(3):                                                 # тревожные повторы восьмыми
                for n in up3[:2]:
                    note(CH['acc'], th + k * E8, E8 * 0.85, n, va - 4 + (2 if k == 0 else 0))
            note(CH['acc'], th, 3 * E8 - 30, bass, va)
        elif tex == 'outro' and not final:
            seq = tones(upc, bass + 7, bass + 24)
            for k, n in enumerate([bass] + seq[:2]):
                st = th + k * E8
                note(CH['acc'], st, E8 * (2.6 if k == 0 else 1.0), n, va - (0 if k == 0 else 6))
        # ── фагот: бас-линия в кризисе и в общем звучании ──
        if tex in ('crisis', 'full') and half == 0:
            note(CH['fg'], th, BAR - 60, bass - 12 if bass - 12 >= 34 else bass, 54)
        # ── струнные ──
        if not final and tex != 'gallop':
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
            pad = min(cands, key=lambda v: sum(abs(a - c) for a, c in zip(v, prev_pad)))
            prev_pad = pad
            for n in pad:
                note(CH['pad'], th + 6, 3 * E8 - 14, n, VEL_PAD[tex], jit=False)
    # ── мелодии ──
    inst = INST[b - 1]
    for (p, d, n) in M.get(b, []):
        vm = VEL_MEL[tex] + (4 if p in (0, 3) else -2)
        if b >= NBARS - 2: vm -= (b - (NBARS - 3)) * 2
        note(CH[inst], T(b, p), d * E8 * 0.95, n, vm)
        if tex == 'full':                                                       # весь ансамбль: гобой в октаву ниже, кларнет — терцией
            note(CH['ob'], T(b, p), d * E8 * 0.95, n - 12, vm - 6)
            pcs = chord(chord_at(b, p))[1]
            th3 = [x for x in range(n - 5, n - 2) if x % 12 in pcs]
            if th3:
                note(CH['cl'], T(b, p), d * E8 * 0.95, th3[-1] - 12, vm - 10)
    for (p, d, n) in M2.get(b, []):                                             # второй голос «больницы» — кларнет
        note(CH['cl'], T(b, p), d * E8 * 0.95, n, VEL_MEL[tex] - 4)

# финальный аккорд
fb = T(NBARS)
for n in [38, 50, 57, 62, 64, 66, 69]:
    note(CH['acc'], fb, BAR - 40, n, 32)
for n in [62, 66, 69]:
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
        if min(a1, b1) - max(a0, b0) < 120:
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
meta.append(mido.MetaMessage('time_signature', numerator=6, denominator=8, time=0))
meta.append(mido.MetaMessage('end_of_track', time=NBARS * BAR + 4 * TPB))
setup = {CH['acc']: (0, 86, 58, 10), CH['fl']: (73, 92, 72, 22), CH['pad']: (49, 60, 64, 40), CH['pizz']: (45, 84, 52, 22),
         CH['cel']: (8, 70, 76, 34), CH['cl']: (71, 88, 46, 22), CH['ob']: (68, 80, 82, 22), CH['fg']: (70, 80, 40, 18)}
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
