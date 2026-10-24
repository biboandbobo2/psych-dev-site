#!/usr/bin/env python3
"""Проверки эпизода до показа автору.

  python3 tools/check.py preschool            хронометраж: сцены в JS ↔ compose.py ↔ index.html ↔ render.sh ↔ SCRIPT.md ↔ главы YOUTUBE.md
  python3 tools/check.py preschool --frames   + лист кадров: начало (+0,1 с) и конец (−0,3 с) каждой сцены
  python3 tools/check.py preschool --frames --at 31.5,32,32.5   + свои моменты (частые кадры сложной анимации)

Кадры и листы contact-sheet-N.jpg — в <эпизод>/snapshots/ (в .gitignore). Код выхода 1 — если хронометраж расходится.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

BAR = 2.5
HF = 'npx --yes hyperframes@0.8.78'.split()


def js_scenes(ep):
    html = (ep / 'index.html').read_text()
    out = []
    for src in re.findall(r'src="(assets/js/scenes-\d+\.js)"', html):
        out += [(i, int(b)) for i, b in re.findall(r"id: '([\w-]+)', bars: (\d+)", (ep / src).read_text())]
    return out


def music_scenes(src):
    """Кортежи верхнего уровня списка SCENES: ('ssr', dict(bars=4, …)) с 3–7, ('ssr', 4) в 0–1 и 1–3."""
    pos, depth, out = src.index('SCENES = [') + len('SCENES = ['), 1, []
    while depth:
        c = src[pos]
        if c == '(' and depth == 1:
            m = re.match(r"\('([\w-]+)',\s*(?:dict\(bars=)?(\d+)", src[pos:])
            if m:
                out.append((m.group(1), int(m.group(2))))
        depth += c in '([{'
        depth -= c in ')]}'
        pos += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('episode')
    ap.add_argument('--frames', action='store_true')
    ap.add_argument('--at', default='')
    a = ap.parse_args()
    ep = Path(__file__).resolve().parent.parent / a.episode
    errors = []

    scenes = js_scenes(ep)
    total = sum(b for _, b in scenes) * BAR
    # SCENES в compose.py: ('ssr', dict(bars=4, …)) с 3–7, ('ssr', 4) в 0–1 и 1–3
    music = music_scenes((ep / 'music/compose.py').read_text())
    if not music:
        print('! в compose.py у сцен нет явных тактов (как в 1–3) — сверку с музыкой пропускаю')
    elif music != scenes:
        js, mu = dict(scenes), dict(music)
        for i in sorted(set(js) | set(mu), key=lambda k: [s for s, _ in scenes + music].index(k)):
            if js.get(i) != mu.get(i):
                errors.append(f'сцена {i}: в JS {js.get(i, "нет")} тактов, в compose.py {mu.get(i, "нет")}')
        if not any('сцена' in e for e in errors):
            errors.append('порядок сцен в JS и compose.py разный')

    dur = re.search(r'data-composition-id="main"[^>]*data-duration="([\d.]+)"', (ep / 'index.html').read_text())
    if not dur or float(dur.group(1)) != total:
        errors.append(f'index.html data-duration={dur and dur.group(1)}, а сцен на {total:g} с')
    rsh = (ep / 'render.sh').read_text()
    trim = re.search(r'atrim=0:([\d.]+)', rsh)
    fade = re.search(r'afade=t=out:st=([\d.]+):d=([\d.]+)', rsh)
    if not trim or float(trim.group(1)) != total:
        errors.append(f'render.sh atrim=0:{trim and trim.group(1)}, нужно {total:g}')
    if not fade or float(fade.group(1)) + float(fade.group(2)) != total:
        errors.append(f'render.sh: затухание должно кончаться на {total:g} с')
    for f in (ep / 'SCRIPT.md', ep / 'render.sh'):
        m = re.search(r'(\d+) такт\w* = (\d+):(\d+)', f.read_text()) if f.exists() else None
        if m and (int(m.group(1)) * BAR != total or int(m.group(2)) * 60 + int(m.group(3)) != total):
            errors.append(f'{f.name}: «{m.group(0)}», а сцен {total / BAR:g} тактов = {int(total // 60)}:{int(total % 60):02d}')
    # шестое место хронометража — проверка числа тактов внутри compose.py
    m = re.search(r'assert NBARS == (\d+)', (ep / 'music/compose.py').read_text())
    if m and int(m.group(1)) * BAR != total:
        errors.append(f'compose.py: assert NBARS == {m.group(1)}, а сцен {total / BAR:g} тактов')
    # главы в YOUTUBE.md — на началах сцен, первая 0:00, не короче 10 с (правило YouTube)
    yt = ep / 'YOUTUBE.md'
    starts, t = set(), 0.0
    for _, b in scenes:
        starts.add(int(t)); t += b * BAR
    chapters = [int(mm) * 60 + int(ss) for mm, ss in re.findall(r'^(\d+):(\d\d) \S', yt.read_text(), re.M)] if yt.exists() else []
    if chapters:
        if chapters[0] != 0:
            errors.append('YOUTUBE.md: первая глава должна быть 0:00')
        for c in chapters:
            if c not in starts:
                errors.append(f'YOUTUBE.md: глава {c // 60}:{c % 60:02d} не на начале сцены')
        for c1, c2 in zip(chapters, chapters[1:]):  # последнюю короткую YouTube принимает (7–10: 7,5 с)
            if c2 - c1 < 10:
                errors.append(f'YOUTUBE.md: глава {c1 // 60}:{c1 % 60:02d} короче 10 с')

    t = 0.0
    print(f'{"сцена":<12} {"такты":>5}  начало   конец')
    for i, b in scenes:
        print(f'{i:<12} {b:>5}  {int(t // 60)}:{t % 60:04.1f}  {int((t + b * BAR) // 60)}:{(t + b * BAR) % 60:04.1f}')
        t += b * BAR
    print(f'итого {total / BAR:g} тактов = {int(total // 60)}:{int(total % 60):02d}')
    for e in errors:
        print('✗', e)
    if not errors:
        print('✔ хронометраж сходится')

    if a.frames:
        times, t = [], 0.0
        for _, b in scenes:
            times += [t + 0.1, t + b * BAR - 0.3]
            t += b * BAR
        times += [float(x) for x in a.at.split(',') if x]
        subprocess.run(HF + ['snapshot', '.', '--no-end', '--describe', 'false', '-o', 'snapshots',
                             '--at', ','.join(f'{x:g}' for x in sorted(set(times)))], cwd=ep, check=True)
        print(f'листы кадров: {ep}/snapshots/contact-sheet*.jpg')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
