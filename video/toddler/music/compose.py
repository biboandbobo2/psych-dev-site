"""Оригинальная музыка к ролику «От года до трёх» (серия «Психология развития», эпизод «Раннее детство»).

4/4, 96 уд/мин (такт = 2,5 с — та же сетка, что в первом эпизоде), соль мажор, 72 такта = 180 с.
Тема серии — мотив колыбельной первого эпизода (ступени 5-6-5 | 3-5-3-2), здесь — в ритме шагов.
Фортепиано, струнные пиццикато (шаги), мягкие струнные, челеста — акценты, синхронные с анимацией.
Каждая смена сцены — на сильную долю такта (карта сцен — SCENES).
Детерминированно: «очеловечивание» — через фиксированный генератор (LCG), без random.

Запуск: python3 compose.py  →  toddler.mid (затем render.sh)
"""
import mido

BPM, TPB = 96, 480               # четверть = 480 тиков
BAR = 4 * TPB
SEC = TPB * BPM / 60             # тиков в секунде (768)
OUT = 'toddler.mid'
NBARS = 72

# ── Карта сцен (такты) — совпадает с assets/js/scenes-*.js ──
SCENES = [
    ('prologue', 3), ('title', 3), ('ch1', 1), ('ssr', 5), ('objects', 6), ('field', 6),
    ('ch2', 1), ('words', 8), ('help', 6), ('ch3', 1), ('mirror', 5), ('play', 5), ('erikson', 5),
    ('crisis', 6), ('summary', 6), ('outro', 5)]
assert sum(b for _, b in SCENES) == NBARS
START = {}
_b = 1
for name, n in SCENES:
    START[name] = _b
    _b += n

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


# ── Гармония по тактам ──
H = []
H += ['G', 'G/B', 'Cmaj7']                               # 1–3 пролог
H += ['G', 'Em7', 'Cmaj7']                               # 4–6 титр (тема серии)
H += ['Dsus4']                                           # 7 часть 1
H += ['G', 'Em7', 'Cmaj7', 'D', 'Cmaj7']                 # 8–12 ребёнок — предмет — взрослый
H += ['G', 'Bm7', 'Cmaj7', 'G/B', 'Am7', 'Dsus4']        # 13–18 предметная деятельность
H += ['Em', 'Cmaj7', 'G/B', 'Am7', 'Cmaj7', 'Dsus4']     # 19–24 восприятие (камень)
H += ['Dsus4']                                           # 25 часть 2
H += ['G', 'D/F#', 'Em7', 'Cmaj7', 'G/B', 'Am7', 'Cmaj7', 'Dsus4']   # 26–33 словарный взрыв
H += ['C', 'G/B', 'Am7', 'D', 'Em7', 'Dsus4']            # 34–39 помочь другому
H += ['Dsus4']                                           # 40 часть 3
H += ['G', 'Bm7', 'Em7', 'Cmaj7', 'Dsus4']               # 41–45 зеркало
H += ['G', 'C/G', 'G', 'Am7', 'D']                       # 46–50 игра
H += ['Em7', 'Cmaj7', 'G/B', 'Am7', 'Dsus4']             # 51–55 Эриксон
H += ['Em', 'C', 'Am', 'B7', 'Cmaj7', 'Dsus4']           # 56–61 кризис трёх лет → разрешение
H += ['G', 'D/F#', 'Em7', 'Cmaj7', 'Am7', 'Dsus4']       # 62–67 что запомнить
H += ['G', 'Bm7', 'Cmaj7', 'Dsus4', 'Gadd9']             # 68–72 финал
assert len(H) == NBARS, len(H)
# смена аккорда с середины такта (такт → аккорд с 3-й доли)
HALF = {7: 'D', 12: 'D', 18: 'D', 24: 'D', 25: 'D', 33: 'D', 39: 'D', 40: 'D', 45: 'D', 55: 'D',
        61: 'D', 67: 'D', 71: 'D'}


def chord_at(bar, beat):
    return HALF[bar] if (bar in HALF and beat >= 2) else H[bar - 1]


# ── Мелодия: такт → [(доля, длительность в долях, нота)] ──
L1 = [(0, 1.5, 74), (1.5, 0.5, 76), (2, 2, 74)]            # D5. E5 D5   — «5-6-5»
L2 = [(0, 1, 71), (1, 1, 74), (2, 1, 71), (3, 1, 69)]      # B4 D5 B4 A4 — «3-5-3-2»
L3 = [(0, 1, 67), (1, 1, 71), (2, 1, 74), (3, 1, 79)]      # G4 B4 D5 G5 — шаги вверх
L4 = [(0, 2, 74), (2, 2, 78)]                              # D5 → F#5 (на разрешении D)
M = {}


def put(bar, notes):
    M[bar] = notes


def up(m, k=12):
    return [(b, d, n + k) for b, d, n in m]


# пролог: тишина мелодии, шаги — пиццикато; на «Я сам!» — ответ челесты
put(2, [(2, 1, 71), (3, 1, 74)])
put(3, [(0, 4, 76)])
# титр — тема серии
put(4, L1); put(5, L2); put(6, L3); put(7, L4)
# часть 1: вещи
put(8, [(0, 2, 71), (2, 1, 74), (3, 1, 76)]); put(9, [(0, 3, 71), (3, 1, 67)])
put(10, [(0, 2, 72), (2, 2, 76)]); put(11, [(0, 3, 74), (3, 1, 78)]); put(12, [(0, 2, 76), (2, 2, 74)])
put(13, L1); put(14, [(0, 2, 74), (2, 2, 78)]); put(15, [(0, 2, 72), (2, 2, 71)])
put(16, [(0, 1, 71), (1, 1, 74), (2, 2, 79)]); put(17, [(0, 2, 76), (2, 1, 72), (3, 1, 69)]); put(18, [(0, 2, 67), (2, 2, 66)])
put(19, [(0, 2, 71), (2, 2, 67)]); put(20, [(0, 3, 71)]); put(21, [(0, 2, 74), (2, 2, 71)])
put(22, [(0, 3, 72)]); put(23, [(0, 2, 71), (2, 2, 67)]); put(24, [(0, 2, 69), (2, 2, 66)])
# часть 2: слова и люди — тема выше и шире
put(26, up(L1)); put(27, [(0, 1, 78), (1, 1, 76), (2, 2, 74)]); put(28, [(0, 1.5, 79), (1.5, 0.5, 78), (2, 2, 74)])
put(29, [(0, 2, 76), (2, 2, 79)]); put(30, [(0, 1, 83), (1, 1, 81), (2, 2, 79)]); put(31, [(0, 3, 76), (3, 1, 72)])
put(32, [(0, 2, 76), (2, 2, 79)]); put(33, [(0, 2, 81), (2, 2, 78)])
put(34, [(0, 2, 76), (2, 2, 79)]); put(35, [(0, 3, 74)]); put(36, [(0, 2, 72), (2, 2, 76)])
put(37, [(0, 3, 78), (3, 1, 76)]); put(38, [(0, 4, 74)]); put(39, [(0, 2, 72), (2, 2, 74)])
# часть 3: я сам
put(41, L1); put(42, L2); put(43, [(0, 2, 71), (2, 2, 74)]); put(44, [(0, 2, 76), (2, 2, 72)]); put(45, [(0, 2, 72), (2, 2, 74)])
put(46, [(0, .5, 74), (.5, .5, 76), (1, 1, 74), (2, 1, 71), (3, 1, 67)]); put(47, [(0, 1, 72), (1, 1, 76), (2, 2, 72)])
put(48, [(0, .5, 74), (.5, .5, 76), (1, 1, 74), (2, 1, 79), (3, 1, 74)]); put(49, [(0, 2, 72), (2, 2, 76)]); put(50, [(0, 2, 74), (2, 2, 78)])
put(51, [(0, 3, 71)]); put(52, [(0, 2, 72), (2, 2, 76)]); put(53, [(0, 3, 74)]); put(54, [(0, 2, 72), (2, 2, 69)]); put(55, [(0, 2, 67), (2, 2, 66)])
# кризис: ми минор, напряжение, затем разрешение
put(56, [(0, 2, 71), (2, 1, 74), (3, 1, 76)]); put(57, [(0, 3, 76), (3, 1, 74)]); put(58, [(0, 2, 72), (2, 2, 76)])
put(59, [(0, 2, 75), (2, 2, 78)]); put(60, [(0, 2, 76), (2, 2, 79)]); put(61, [(0, 2, 79), (2, 2, 78)])
# итог и финал — тема серии
put(62, L1); put(63, [(0, 1, 74), (1, 1, 78), (2, 2, 74)]); put(64, L2); put(65, L3); put(66, [(0, 2, 76), (2, 2, 72)]); put(67, L4)
put(68, L1); put(69, L2); put(70, [(0, 2, 72), (2, 2, 76)]); put(71, L4); put(72, [(0, 4, 79)])


def section(bar):
    if bar <= 3: return 'intro'
    if bar <= 7: return 'title'
    if bar <= 24: return 'p1'
    if bar <= 39: return 'p2'
    if bar <= 55: return 'p3'
    if bar <= 61: return 'crisis'
    if bar <= 67: return 'summary'
    return 'outro'


VEL_MEL = {'intro': 54, 'title': 60, 'p1': 58, 'p2': 58, 'p3': 60, 'crisis': 60, 'summary': 56, 'outro': 54}
VEL_ACC = {'intro': 40, 'title': 42, 'p1': 42, 'p2': 40, 'p3': 42, 'crisis': 44, 'summary': 38, 'outro': 36}


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


ACCENTS = []


def chord_at_tick(tick):
    bar = int(tick // BAR) + 1
    beat = (tick - (bar - 1) * BAR) / TPB
    bar = max(1, min(NBARS, bar))
    return chord_at(bar, beat), bar, (0 if beat < 2 else 1)


def snap(n, tick):
    """Ближайший звук аккорда (вверх при равенстве) — акценты не спорят с гармонией"""
    sym, _, _ = chord_at_tick(tick)
    pcs = chord(sym)[1]
    best = min(range(n - 6, n + 7), key=lambda x: (abs(x - n) if x % 12 in pcs else 99, -x))
    return best


# ── Акценты, синхронные с анимацией (секунды от начала ролика) ──
def at(sec):
    return int(round(sec * SEC))


def cel(sec, n, v=46, d=0.5):
    ACCENTS.append(('cel', sec, n, v, d))


def pz(sec, n, v=62):
    ACCENTS.append(('pz', sec, n, v, 0.7))


# пролог: три шага (приземления на доли 2–4), кубик падает, «Я сам!»
for s_, n in [(1.25, 55), (1.875, 59), (2.5, 62)]: pz(s_, n, 66)
pz(3.75, 43, 64)
for n in (79, 83, 86): cel(5.0, n, 44, 1.5)
# зум карты курса → шкала эпизода
cel(11.25, 86, 40, 1)
# заставки частей: номер главы
for bar in (START['ch1'], START['ch2'], START['ch3']):
    for i, n in enumerate((74, 79, 83)): cel((bar - 1) * 2.5 + i * 0.105, n, 40, 1)
# пирамидка: неверное кольцо, потом кольца по размеру
o = (START['objects'] - 1) * 2.5
pz(o + 3.06, 40, 52)
for i, n in enumerate((79, 83, 86, 91)): cel(o + 4.375 + i * 0.3125, n, 44, 0.6)
# ложка «как рукой»: каша падает; «как орудием»: доехала
for i, n in enumerate((86, 83, 79)): cel(o + 8.07 + i * 0.12, n, 36, 0.3)
cel(o + 10.9375, 83, 46, 1); cel(o + 10.9375, 88, 40, 1)
# камень «притягивает»
f = (START['field'] - 1) * 2.5
cel(f + 5.05, 88, 34, 0.5); cel(f + 7.25, 88, 30, 0.5)
# словарный взрыв: восходящее арпеджио по кривой, точки, фразы-пузыри
w = (START['words'] - 1) * 2.5
for i, n in enumerate((67, 71, 74, 79, 83, 86, 91)): cel(w + 1.3 + i * 0.28, n, 34, 0.4)
cel(w + 2.0, 83, 42, 0.8); cel(w + 3.0, 91, 42, 0.8)
for i, n in enumerate((86, 88, 91)): cel(w + 5.5 + i * 0.35, n, 40, 0.5)
# помочь другому: уронил / помог / бросил нарочно
hp = (START['help'] - 1) * 2.5
pz(hp + 3.65, 45, 52)
cel(hp + 6.73, 83, 44, 1); cel(hp + 6.73, 86, 40, 1)
pz(hp + 9.2, 43, 50)
# зеркало: тап по стеклу, узнал себя
mr = (START['mirror'] - 1) * 2.5
cel(mr + 4.8, 76, 30, 0.4)
cel(mr + 7.6, 83, 44, 1); cel(mr + 7.7, 88, 40, 1)
# игра: палочка → «ложка» (глиссандо воображения)
pl = (START['play'] - 1) * 2.5
for i, n in enumerate((74, 76, 79, 81, 83, 86, 88, 91)): cel(pl + 7.25 + i * 0.06, n, 30 + i, 0.4)
# Эриксон: «автономия» — светлый аккорд
er = (START['erikson'] - 1) * 2.5
cel(er + 4.1, 79, 38, 1); cel(er + 4.1, 83, 34, 1)
# кризис: семь симптомов по кругу; разрешение — улыбка ребёнка
cr = (START['crisis'] - 1) * 2.5
for i, n in enumerate((76, 79, 81, 83, 84, 88, 91)): cel(cr + 2.4 + i * 0.2, n, 34, 0.35)
for n in (79, 83, 86): cel(cr + 10.625, n, 42, 1.5)
# финал: следующий период «дышит» — вопросительная фигура
ou = (START['outro'] - 1) * 2.5
for i, (dt, n) in enumerate([(6.0, 86), (6.3125, 88), (6.625, 86), (7.5, 83)]): cel(ou + dt, n, 34 - i * 2, 0.6)


# звуки акцентов: притянуть к аккорду, убрать повторы подряд
_last = {}
SNAPPED = []
for kind, sec_, n, v, d in ACCENTS:
    tk = int(round(sec_ * SEC))
    m = snap(n, tk)
    key = (kind, round(sec_, 3))
    SNAPPED.append((kind, tk, m, v, d))

# занятые мелодией и акцентами звуковысотные классы — по половинам тактов
BUSY = {}
def busy(tick0, tick1, n):
    h0 = int(tick0 // (2 * TPB)); h1 = int(max(tick0, tick1 - 1) // (2 * TPB))
    for h in range(h0, h1 + 1):
        BUSY.setdefault(h, set()).add(n % 12)
for bar_, lst in M.items():
    for (b, d, n) in lst:
        busy(T(bar_, b), T(bar_, b) + d * TPB, n)
for kind, tk, m, v, d in SNAPPED:
    busy(tk, tk + d * TPB, m)


def free(pcs, h):
    """Тона аккорда без тех, что стоят в полутоне от мелодии/акцентов в этой половине такта"""
    bz = BUSY.get(h, set())
    ok = [p for p in pcs if not any(((p - q) % 12) in (1, 11) for q in bz)]
    return ok if len(ok) >= 2 else [p for p in pcs if p not in [((q + 1) % 12) for q in bz] + [((q - 1) % 12) for q in bz]] or pcs[:2]


prev_pad = [62, 67, 71]
for bar in range(1, NBARS + 1):
    sec = section(bar)
    t_bar = T(bar)
    va = VEL_ACC[sec]
    if bar >= 70: va -= (bar - 69) * 3
    for half in (0, 1):
        sym = chord_at(bar, 2 * half)
        bass, pcs = chord(sym)
        th = t_bar + half * 2 * TPB
        # педаль — на каждую смену гармонии
        cc(CH['acc'], th + 15, 64, 127); cc(CH['acc'], th + 2 * TPB - 25, 64, 0)
        hidx = int(th // (2 * TPB))
        upc = free(upper(pcs), hidx)
        up3 = tones(upc, bass + 12, bass + 26)
        HALF_END = th + 2 * TPB - 20
        # ── пиццикато: шаги ──
        if sec in ('p1', 'p3', 'title') or (sec == 'crisis' and bar < 60):
            if sec == 'p3':
                seq = [bass, bass + 7 if (bass + 7) % 12 in pcs else bass + 12]
                for k, n in enumerate(seq):
                    note(CH['pizz'], th + k * TPB, TPB * 0.8, n, 58 if k == 0 else 50)
            else:
                note(CH['pizz'], th, TPB * 0.9, bass, 58)
        elif sec in ('p2', 'summary') or (sec == 'crisis'):
            if half == 0:
                note(CH['pizz'], th, TPB * 0.9, bass, 54)
        elif sec == 'outro' and bar <= 71 and half == 0:
            note(CH['pizz'], th, TPB * 0.9, bass, 48)
        # ── фортепиано: аккомпанемент ──
        if sec == 'intro':
            if bar >= 2 and half == 0:
                for n in up3[:3]:
                    note(CH['acc'], th + TPB, TPB * 2.6, n, va)       # такт целиком: одна гармония
        elif sec in ('p1', 'p3'):
            # лёгкие аккорды на 2-ю и 4-ю доли — «шаги»
            for n in up3[:3]:
                note(CH['acc'], th + TPB, TPB * 0.55, n, va - 2)
        elif sec in ('title', 'p2', 'summary', 'crisis'):
            # текучие восьмые
            seq = tones(upc, bass + 7, bass + 24)
            pat = [bass] + ([seq[i % len(seq)] for i in (0, 1, 2)] if half == 0 else [seq[i % len(seq)] for i in (1, 2, 1)])
            for k, n in enumerate(pat):         # восьмые: бас и три звука аккорда на каждую половину такта
                st = th + k * TPB // 2
                note(CH['acc'], st, min(TPB * (1.5 if k == 0 else 0.8), HALF_END - st), n, (va + 2) if k == 0 else (va - 6))
        elif sec == 'outro':
            if bar <= 71:
                seq = tones(upc, bass + 7, bass + 24)
                for k, n in enumerate([bass] + seq[:3]):
                    st = th + k * TPB // 2
                    note(CH['acc'], st, min(TPB * (1.5 if k == 0 else 0.9), HALF_END - st), n, va - (0 if k == 0 else 6))
        # ── струнные: с титра, тише в части 1 ──
        if (sec != 'intro' or bar == 3) and bar <= 71:
            pool = tones(upc, 57, 79)
            cands = []
            for i in range(len(pool)):
                for j in range(i + 1, len(pool)):
                    for k in range(j + 1, len(pool)):
                        v = [pool[i], pool[j], pool[k]]
                        if len({x % 12 for x in v}) >= 2 and v[2] - v[0] <= 12:
                            cands.append(v)
            if not cands:
                cands = [[pool[0], pool[1], pool[2]]]
            pad = min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev_pad)))
            prev_pad = pad
            vs = {'intro': 26, 'title': 34, 'p1': 28, 'p2': 38, 'p3': 32, 'crisis': 46, 'summary': 38, 'outro': 34}[sec]
            for n in pad:
                note(CH['pad'], th + 6, 2 * TPB - 14, n, vs, jit=False)
    # ── мелодия ──
    for (b, d, n) in M.get(bar, []):
        vm = VEL_MEL[sec] + (4 if b in (0, 2) else -2)
        if bar >= 70: vm -= (bar - 69) * 2
        note(CH['mel'], t_bar + b * TPB, d * TPB * 0.95, n, vm)

# финальный аккорд: держится до конца
fb = T(72)
for n in [43, 55, 62, 67, 69, 71, 74]:
    note(CH['acc'], fb, BAR - 40, n, 32)
for n in [62, 67, 71]:
    note(CH['pad'], fb + 6, BAR - 60, n, 30, jit=False)

for kind, tk, m, v, d in SNAPPED:
    if kind == 'cel':
        note(CH['cel'], tk, d * TPB, m, v, jit=False)
    else:
        note(CH['pizz'], tk, d * TPB, m, v, jit=False)

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
        iv = abs(an - bn)
        if iv in (1, 13, 25):
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
