#!/usr/bin/env python3
"""Полоски кадров для слепого зрителя: по три кадра на сцену (35 %, 65 %, 93 % длины), склеенные в один PNG.

  python3 tools/strips.py school [выходная папка]

Титр, заставки глав (ch1…) и финальная карточка пропускаются. Результат — 01.png, 02.png, … и scenes.txt
(номер → id сцены → время). Дальше — субагент с чистым контекстом (модель слабее, без знаний предмета)
открывает файлы по порядку и пересказывает каждую сцену: что произошло, какая мысль, что непонятно.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ep = Path(__file__).resolve().parent.parent / sys.argv[1]
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.mkdtemp(prefix='strips-'))
out.mkdir(parents=True, exist_ok=True)
html = (ep / 'index.html').read_text()
scenes = []
for src in re.findall(r'src="(assets/js/scenes-\d+\.js)"', html):
    scenes += [(i, int(b)) for i, b in re.findall(r"id: '([\w-]+)', bars: (\d+)", (ep / src).read_text())]
t, plan = 0.0, []
for sid, bars in scenes:
    d = bars * 2.5
    if sid not in ('title', 'final') and not re.match(r'ch\d+$', sid):
        plan.append((sid, [round(t + d * f, 2) for f in (0.35, 0.65, 0.93)]))
    t += d
times = [x for _, ts in plan for x in ts]
raw = out / 'raw'
subprocess.run('npx --yes hyperframes@0.8.78 snapshot . --no-end --describe false'.split() + ['-o', str(raw), '--at', ','.join(map(str, times))], cwd=ep, check=True)
frames = sorted(raw.glob('frame-*.png'))
lines = []
for n, (sid, ts) in enumerate(plan):
    fs = frames[3 * n:3 * n + 3]
    dst = out / f'{n + 1:02d}.png'
    args = ['ffmpeg', '-loglevel', 'error', '-y']
    for f in fs:
        args += ['-i', str(f)]
    args += ['-filter_complex', '[0]scale=960:-1[a];[1]scale=960:-1[b];[2]scale=960:-1[c];[a][b][c]hstack=inputs=3', '-frames:v', '1', str(dst)]
    subprocess.run(args, check=True)
    lines.append(f'{n + 1:02d} {sid} {ts[0]}–{ts[2]} с')
(out / 'scenes.txt').write_text('\n'.join(lines) + '\n')
print(f'{len(plan)} сцен → {out}')
