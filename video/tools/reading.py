#!/usr/bin/env python3
"""Время на чтение по раскадровке — до сборки.

  python3 tools/reading.py school/STORYBOARD.md

Сцена — заголовок «### мм:сс — Название (N тактов)», текстовый блок — строка «> …».
Норма серии: 0,4 с на слово + 1 с на блок. [small] и [?] не считаются; [speech]/[kid] — считаются.
Печатает по сценам: нужно на чтение / есть по тактам, отмечает нехватку и сверяет время начала сцен.
"""
import re
import sys

BAR = 2.5
head = re.compile(r'^### (\d+):(\d+(?:,\d+)?) — (.+?) \((\d+) такт')
scenes, cur = [], None
for line in open(sys.argv[1], encoding='utf-8'):
    m = head.match(line)
    if m:
        cur = {'t': int(m.group(1)) * 60 + float(m.group(2).replace(',', '.')), 'name': m.group(3), 'bars': int(m.group(4)), 'need': 0.0}
        scenes.append(cur)
    elif cur and line.startswith('> ') and not re.match(r'> \[(small|\?)\]', line):
        text = re.sub(r'^> (\[\w+\] )?', '', line.strip())
        words = [w for w in text.split() if re.search(r'\w', w)]
        cur['need'] += 0.4 * len(words) + 1

t, short = 0.0, 0
for s in scenes:
    have = s['bars'] * BAR
    flag = ''
    if s['need'] > have:
        flag = f'  ✗ не хватает {s["need"] - have:.1f} с'
        short += 1
    if abs(s['t'] - t) > 0.01:
        flag += f'  ! начало {int(t // 60)}:{t % 60:04.1f} по тактам'
    print(f'{int(s["t"] // 60)}:{s["t"] % 60:04.1f}  {s["name"][:34]:<34} {s["bars"]:>2} т.  чтение {s["need"]:5.1f} / {have:5.1f} с{flag}')
    t += have
print(f'итого {sum(s["bars"] for s in scenes)} тактов = {int(t // 60)}:{int(t % 60):02d}; сцен с нехваткой: {short}')
