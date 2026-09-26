"""Оригинальная музыка к ролику «Первый год жизни».

Колыбельная в 3/4, 72 уд/мин (такт = 2,5 с), фа мажор, 76 тактов = 190 с.
Каждая смена сцены ролика приходится на сильную долю такта (карта сцен — SCENES).
Фортепиано (мелодия + аккомпанемент) и мягкие струнные со 2-й части.
Детерминированно: «очеловечивание» — через фиксированный генератор (LCG), без random.

Запуск: python3 compose.py  →  infancy.mid (затем render.sh)
"""
import mido

BPM, TPB = 72, 480           # четверть = 480 тиков
BAR = 3 * TPB
OUT = 'infancy.mid'

# ── Карта сцен (такты, 1-based) — совпадает с assets/js/scenes-*.js ──
SCENES = [
    ('prologue', 3), ('title', 2), ('ch1', 1), ('reflexes', 5), ('methods', 5), ('paradox', 4),
    ('komplex', 5), ('leading', 3), ('ch2', 1), ('harlow', 5), ('bowlby', 3), ('stillface', 5),
    ('eight', 4), ('securebase', 5), ('ch3', 1), ('objperm', 5), ('joint', 5), ('crisis', 5),
    ('summary', 5), ('outro', 4)]
assert sum(b for _, b in SCENES) == 76

# ── Аккорды: имя → (басовая нота MIDI, ступени аккорда как классы высоты) ──
PC = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7],
        '7': [0, 4, 7, 10], 'm6': [0, 3, 7, 9], 'add9': [0, 4, 7, 14], '7sus4': [0, 5, 7, 10]}


def chord(sym):
    """'C/E', 'Bbmaj7', 'Dm7', 'Asus4' → (bass_midi, [pitch classes])"""
    main, _, slash = sym.partition('/')
    root = main[:2] if len(main) > 1 and main[1] in '#b' else main[:1]
    q = main[len(root):]
    r = PC[root]
    pcs = [(r + i) % 12 for i in QUAL[q]]
    b = PC[slash] if slash else r
    bass = 36 + b if b >= 5 else 48 + b  # бас в диапазоне F2..E3
    if bass > 52:
        bass -= 12
    return bass, pcs


# ── Гармония по тактам (76) ──
H = []
H += ['F', 'F/A', 'Bbmaj7']                              # 1–3 пролог
H += ['F', 'C/E']                                        # 4–5 титр
H += ['Dm7']                                             # 6 часть 1
H += ['F', 'C/E', 'Dm7', 'Bbmaj7', 'Csus4']              # 7–11 рефлексы
H += ['F', 'Am7', 'Bbmaj7', 'Gm7', 'Csus4']              # 12–16 методы
H += ['Dm7', 'Bbmaj7', 'Gm7', 'Csus4']                   # 17–20 противоречие
H += ['F', 'C/E', 'Dm7', 'Bbmaj7', 'F/C']                # 21–25 комплекс оживления
H += ['Bbmaj7', 'Gm7', 'Csus4']                          # 26–28 ведущая деятельность
H += ['C7sus4']                                          # 29 часть 2
H += ['F', 'Dm7', 'Bbmaj7', 'Am7', 'Gm7']                # 30–34 Харлоу
H += ['F/A', 'Bbmaj7', 'Csus4']                          # 35–37 Боулби
H += ['Dm', 'Dm/C', 'Bbmaj7', 'Gm6', 'Asus4']            # 38–42 неподвижное лицо
H += ['Dm', 'Bb', 'F/A', 'Csus4']                        # 43–46 ~8 мес
H += ['F', 'C/E', 'Dm7', 'Bbmaj7', 'Csus4']              # 47–51 надёжная база
H += ['C7sus4']                                          # 52 часть 3
H += ['F', 'Gm7', 'Am7', 'Bbmaj7', 'C']                  # 53–57 постоянство объекта
H += ['F', 'Dm7', 'Bbmaj7', 'Gm7', 'Csus4']              # 58–62 совместное внимание
H += ['Dm7', 'Bbmaj7', 'F/A', 'Gm7', 'Csus4']            # 63–67 кризис 1 года
H += ['F', 'C/E', 'Dm7', 'Bbmaj7', 'Csus4']              # 68–72 итог
H += ['Bbmaj7', 'C', 'Fadd9', 'Fadd9']                   # 73–76 финал
assert len(H) == 76, len(H)

# Разрешения задержаний внутри такта: (такт, доля) → аккорд с этой доли
SUB = {(42, 2): 'A', (67, 2): 'C', (72, 2): 'C'}

# ── Мелодия: такт → [(доля, длительность в долях, нота)] ──
A1 = [(0, 2, 72), (2, 1, 74)]; A2 = [(0, 3, 72)]; A3 = [(0, 2, 69), (2, 1, 72)]; A4 = [(0, 2, 69), (2, 1, 67)]
B1 = [(0, 2, 77), (2, 1, 76)]; B2 = [(0, 3, 72)]; B3 = [(0, 1, 70), (1, 1, 69), (2, 1, 67)]; B4 = [(0, 2, 65), (2, 1, 67)]


def up(m, k=12):
    return [(b, d, n + k) for b, d, n in m]


M = {}
def put(bar, notes):
    M[bar] = notes

# пролог и титр
put(1, A1); put(2, A2); put(3, A3)
put(4, [(0, 2, 69), (2, 1, 67)]); put(5, [(0, 3, 67)])
# часть 1
for i, m in enumerate([A1, A2, A3, A4, [(0, 3, 65)]]): put(7 + i, m)                       # рефлексы
for i, m in enumerate([B1, B2, B3, [(0, 3, 70)], B4]): put(12 + i, m)                      # методы
for i, m in enumerate([[(0, 3, 69)], [(0, 3, 74)], [(0, 3, 70)], [(0, 2, 67), (2, 1, 65)]]): put(17 + i, m)  # противоречие
for i, m in enumerate([up(A1), up(A2), up(A3), up(A4), [(0, 3, 77)]]): put(21 + i, m)       # комплекс оживления
put(26, [(0, 2, 74), (2, 1, 72)]); put(27, [(0, 3, 70)]); put(28, [(0, 2, 67), (2, 1, 65)])
# часть 2
for i, m in enumerate([[(0, 2, 72), (2, 1, 74)], [(0, 3, 77)], [(0, 2, 74), (2, 1, 72)], [(0, 3, 76)], [(0, 2, 74), (2, 1, 70)]]): put(30 + i, m)
for i, m in enumerate([[(0, 3, 72)], [(0, 2, 74), (2, 1, 72)], [(0, 2, 72), (2, 1, 70)]]): put(35 + i, m)
for i, m in enumerate([[(0, 2, 69), (2, 1, 74)], [(0, 3, 69)], [(0, 2, 65), (2, 1, 67)], [(0, 2, 70), (2, 1, 74)], [(0, 2, 69), (2, 1, 73)]]): put(38 + i, m)
for i, m in enumerate([[(0, 3, 74)], [(0, 2, 74), (2, 1, 72)], [(0, 3, 72)], [(0, 2, 72), (2, 1, 70)]]): put(43 + i, m)
for i, m in enumerate([A1, A2, A3, A4, [(0, 3, 65)]]): put(47 + i, m)
# часть 3
for i, m in enumerate([[(0, .5, 72), (.5, .5, 77), (1, 1, 76), (2, 1, 72)], [(0, .5, 70), (.5, .5, 74), (1, 1, 72), (2, 1, 70)],
                       [(0, .5, 72), (.5, .5, 76), (1, 1, 74), (2, 1, 72)], [(0, .5, 74), (.5, .5, 77), (1, 2, 74)], [(0, 3, 76)]]): put(53 + i, m)
for i, m in enumerate([A1, [(0, 3, 72)], [(0, 2, 69), (2, 1, 74)], [(0, 2, 74), (2, 1, 70)], [(0, 2, 67), (2, 1, 65)]]): put(58 + i, m)
for i, m in enumerate([[(0, 1, 69), (1, 1, 72), (2, 1, 74)], [(0, 1, 69), (1, 1, 74), (2, 1, 77)], [(0, 2, 81), (2, 1, 79)],
                       [(0, 3, 77)], [(0, 2, 77), (2, 1, 76)]]): put(63 + i, m)
for i, m in enumerate([A1, A2, A3, A4, B4]): put(68 + i, m)
put(73, [(0, 2, 74), (2, 1, 72)]); put(74, [(0, 2, 72), (2, 1, 67)]); put(75, [(0, 3, 69)])

# ── Динамика по тактам ──
def section(bar):
    if bar <= 5: return 'intro'
    if bar <= 28: return 'p1'
    if bar <= 51: return 'p2'
    if bar <= 72: return 'p3'
    return 'outro'

VEL_MEL = {'intro': 56, 'p1': 60, 'p2': 60, 'p3': 62, 'outro': 54}
VEL_ACC = {'intro': 42, 'p1': 46, 'p2': 42, 'p3': 44, 'outro': 40}


class LCG:
    def __init__(self, seed=20260926):
        self.s = seed
    def next(self):
        self.s = (1103515245 * self.s + 12345) % 2 ** 31
        return self.s / 2 ** 31
    def jitter(self, a):
        return (self.next() * 2 - 1) * a


rng = LCG()
events = {0: [], 1: [], 2: []}  # канал → [(tick, msg)]


def note(ch, tick, dur, n, vel):
    t0 = max(0, int(tick + rng.jitter(10)))
    v = max(1, min(127, int(vel + rng.jitter(4))))
    events[ch].append((t0, mido.Message('note_on', channel=ch, note=n, velocity=v)))
    events[ch].append((t0 + max(30, int(dur)), mido.Message('note_off', channel=ch, note=n, velocity=0)))


def cc(ch, tick, ctrl, val):
    events[ch].append((int(tick), mido.Message('control_change', channel=ch, control=ctrl, value=int(val))))


def tones(pcs, lo, hi):
    return [n for n in range(lo, hi + 1) if n % 12 in pcs]


def upper(pcs):
    """Верхние голоса без основного тона у септаккордов (бас берёт основной тон)"""
    return pcs[1:] if len(pcs) >= 4 else pcs


prev_pad = [65, 69, 72]
for bar in range(1, 77):
    sec = section(bar)
    t_bar = (bar - 1) * BAR
    sym = H[bar - 1]
    bass, pcs = chord(sym)
    # педаль: смена на каждом такте
    cc(0, t_bar + 20, 64, 127); cc(0, t_bar + BAR - 25, 64, 0)
    cc(1, t_bar + 20, 64, 127); cc(1, t_bar + BAR - 25, 64, 0)
    va = VEL_ACC[sec]
    if bar >= 63 and bar <= 67: va += (bar - 62) * 2          # нарастание к «первому шагу»
    if bar >= 73: va -= (bar - 72) * 3
    # аккомпанемент (канал 0)
    if bar == 1 or bar >= 75:
        pass                                                   # пролог: одна мелодия; финал: держится аккорд
    elif sec in ('intro', 'p1', 'outro'):
        note(0, t_bar, BAR * 0.98, bass, va + 4)
        up_t = [n for n in tones(upper(pcs), bass + 7, bass + 21)][:3]
        for n in up_t:
            note(0, t_bar + TPB, TPB * 1.9, n, va - 4)
    else:
        seq_t = tones(upper(pcs), bass + 7, bass + 24)
        pat = [bass] + [seq_t[i % len(seq_t)] for i in (0, 1, 2, 1, 0)]
        for k, n in enumerate(pat):
            sub = SUB.get((bar, 2)) if k >= 4 else None
            if sub:
                b2, pc2 = chord(sub)
                cand = tones(upper(pc2), bass + 7, bass + 24)
                n = min(cand, key=lambda x: abs(x - n))
            note(0, t_bar + k * TPB // 2, TPB * (1.6 if k == 0 else 0.9), n, (va + 3) if k == 0 else (va - 6 + (3 if k == 3 else 0)))
    # мелодия (канал 1)
    for (b, d, n) in M.get(bar, []):
        vm = VEL_MEL[sec] + (4 if b == 0 else -2)
        if 63 <= bar <= 67: vm += (bar - 62) * 2
        note(1, t_bar + b * TPB, d * TPB * 0.97, n, vm)
    # струнные (канал 2): со 2-й части и в финале
    if bar >= 29:
        pcs_pad = upper(pcs)
        cands = []
        lo, hi = 57, 79
        pool = tones(pcs_pad, lo, hi)
        for i in range(len(pool)):
            for j in range(i + 1, len(pool)):
                for k in range(j + 1, len(pool)):
                    v = [pool[i], pool[j], pool[k]]
                    if len({x % 12 for x in v}) == 3 and v[2] - v[0] <= 12:
                        cands.append(v)
        pad = min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev_pad)))
        prev_pad = pad
        vs = 40 if bar < 73 else 36
        if 38 <= bar <= 42: vs = 46                            # напряжение «неподвижного лица»
        sub = SUB.get((bar, 2))
        for n in pad:
            note(2, t_bar + 6, (2 * TPB - 20) if sub else (BAR - 12), n, vs)
        if sub:                                                # разрешение задержания на 3-й доле
            _, pc2 = chord(sub)
            pool2 = tones(upper(pc2), 57, 79)
            pad2 = [min(pool2, key=lambda x: abs(x - n)) for n in pad]
            for n in sorted(set(pad2)):
                note(2, t_bar + 2 * TPB, TPB - 12, n, vs)
            prev_pad = pad2

# финальный аккорд: держится до конца
fb = 74 * BAR
for n in [41, 53, 60, 65, 69, 72, 79]:
    note(0, fb, BAR * 2 - 40, n, 34)

# ── Файл ──
mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
meta = mido.MidiTrack(); mid.tracks.append(meta)
meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
meta.append(mido.MetaMessage('time_signature', numerator=3, denominator=4, time=0))
meta.append(mido.MetaMessage('end_of_track', time=76 * BAR + 4 * TPB))
setup = {0: (0, 92, 58, 8), 1: (0, 104, 64, 6), 2: (49, 56, 70, 36)}  # program, volume, pan, reverb send
for ch in (0, 1, 2):
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    prog, vol, pan, rev = setup[ch]
    init = [mido.Message('program_change', channel=ch, program=prog, time=0),
            mido.Message('control_change', channel=ch, control=7, value=vol, time=0),
            mido.Message('control_change', channel=ch, control=10, value=pan, time=0),
            mido.Message('control_change', channel=ch, control=91, value=rev, time=0),
            mido.Message('control_change', channel=ch, control=93, value=0, time=0)]
    tr.extend(init)
    evs = sorted(events[ch], key=lambda e: (e[0], 0 if e[1].type == 'note_off' else 1))
    last = 0
    for t, msg in evs:
        msg.time = t - last
        last = t
        tr.append(msg)
mid.save(OUT)
print('saved', OUT, 'length %.2f s' % mid.length, 'notes:', sum(1 for ch in events for _, m in events[ch] if m.type == 'note_on'))
