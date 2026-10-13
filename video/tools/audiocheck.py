#!/usr/bin/env python3
"""Автопроверка звука (раз музыку никто не слушает до показа — меряем):
скачки моментальной громкости > 6 LU за 0,5 с, низ < 150 Гц громче общего уровня минус 6 дБ,
пики выше −3 dBFS в окнах 250 мс, всплески > +4 LU на границах сцен.

  ~/.venvs/video-music/bin/python tools/audiocheck.py school   (нужен numpy; читает <эпизод>/renders/music_master.wav)
"""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

EP = Path(__file__).resolve().parent.parent / sys.argv[1]
WAV = str(EP / 'renders' / 'music_master.wav')
SR = 48000
_sc = []
for _src in re.findall(r'src="(assets/js/scenes-\d+\.js)"', (EP / 'index.html').read_text()):
    _sc += [(i, int(b)) for i, b in re.findall(r"id: '([\w-]+)', bars: (\d+)", (EP / _src).read_text())]
BOUND, NAMES, _t = [], [], 0.0
for _i, _b in _sc:
    if _t > 0:
        BOUND.append(_t); NAMES.append(_i)
    _t += _b * 2.5


def ebur(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=metadata=1,ametadata=print:file=-',
                          '-f', 'null', '-'], capture_output=True, text=True).stdout
    t, M, S = [], [], []
    for blk in out.split('frame:')[1:]:
        t.append(float(re.search(r'pts_time:([\d.]+)', blk).group(1)))
        M.append(float(re.search(r'r128.M=([-\d.]+)', blk).group(1)))
        S.append(float(re.search(r'r128.S=([-\d.]+)', blk).group(1)))
    return np.array(t), np.array(M), np.array(S)


def pcm(path, af=None):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path] + (['-af', af] if af else []) + \
          ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32)


def stereo(path):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)


t, M, S = ebur(WAV)
M = np.maximum(M, -70)
print('кадров ebur128:', len(t), 'шаг', round(t[1] - t[0], 3))
step = t[1] - t[0]
k = int(round(.5 / step))
jumps = []
for i in range(len(t) - k):
    if t[i] < 1.0 or t[i] > 306:
        continue
    d = M[i + k] - M[i]
    if abs(d) > 6:
        jumps.append((t[i], d))
# сгруппировать
groups = []
for tt, d in jumps:
    if groups and tt - groups[-1][1] < 1.0:
        g = groups[-1]; g[1] = tt; g[2] = max(g[2], d, key=abs)
    else:
        groups.append([tt, tt, d])
print('\n1) скачки моментальной громкости > 6 LU за 0,5 с (t 1–306 с):', len(groups))
for a, b, d in groups:
    print('   %.1f–%.1f с  %+.1f LU' % (a, b + .5, d))
print('   кратковременная (3 с): min %.1f, max %.1f LUFS (t 3–305)' % (S[(t > 3) & (t < 305)].min(), S[(t > 3) & (t < 305)].max()))
print('   моментальная: max %.1f LUFS' % M.max())

full = pcm(WAV)
low = pcm(WAV, 'lowpass=f=150,lowpass=f=150')
n = len(full) // SR
bad = []
lows = []
for s in range(n):
    a = full[s * SR:(s + 1) * SR]; b = low[s * SR:(s + 1) * SR]
    fa = 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9); fb = 20 * np.log10(np.sqrt(np.mean(b ** 2)) + 1e-9)
    lows.append(fb - fa)
    if fb > fa - 6 and fa > -60:
        bad.append((s, fb - fa))
lows = np.array(lows)
print('\n2) низ < 150 Гц относительно общего (1-с окна): max %+.1f дБ (с %d), медиана %+.1f дБ; окон > −6 дБ: %d'
      % (lows[:-4].max(), int(np.argmax(lows[:-4])), np.median(lows), len(bad)))
for s, d in bad:
    print('   %d с  %+.1f дБ' % (s, d))

st = stereo(WAV)
w = SR // 4
pk = [20 * np.log10(np.abs(st[i:i + w]).max() + 1e-12) for i in range(0, len(st) - w, w)]
pk = np.array(pk)
print('\n3) пики по окнам 250 мс: max %.2f dBFS (окно %.2f с); окон выше −3 dBFS: %d'
      % (pk.max(), np.argmax(pk) * .25, int((pk > -3).sum())))

print('\n4) границы сцен: max M за 1 с после − max M за 2 с до (порог +4 LU)')
worst = []
for b, nm in zip(BOUND, NAMES):
    before = M[(t >= b - 2) & (t < b)].max(); after = M[(t >= b) & (t < b + 1)].max()
    worst.append((after - before, b, nm))
    flag = '  ✗' if after - before > 4 else ''
    print('   %-10s %6.1f с  %+.1f LU%s' % (nm, b, after - before, flag))
print('   максимум: %+.1f LU (%s)' % max(worst)[0::2])

print('\n5) громкость по главам (энергетическое среднее моментальной, LUFS):')
for nm, a, b in (('вступление', 1, 25), ('гл. 1', 25, 105), ('гл. 2', 105, 165), ('гл. 3', 165, 212.5),
                 ('гл. 4', 212.5, 267.5), ('итог/финал', 267.5, 305)):
    sel = M[(t >= a) & (t < b)]
    print('   %-11s %.1f  (min S %.1f)' % (nm, 10 * np.log10(np.mean(10 ** (sel / 10))), S[(t >= max(a, 3)) & (t < b)].min()))
