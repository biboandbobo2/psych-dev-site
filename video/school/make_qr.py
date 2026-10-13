"""QR-коды финальной карточки эпизода → assets/js/qr.js (данные для сцены 'final').

Запуск: python3 make_qr.py  (нужен segno: pip install segno)
Оба кода — версия 3 (29×29 модулей) с коррекцией M, чтобы на карточке они были одного размера.
"""
import json
import segno

LINKS = {
    'course': 'https://academydom.com/vozrast',
    'tg': 'https://t.me/AlexeiZykov',
}

out = {}
for key, url in LINKS.items():
    qr = segno.make(url, version=3, error='m', micro=False)
    rows = [list(r) for r in qr.matrix_iter(scale=1, border=0)]
    n = len(rows)
    d = []
    for y, row in enumerate(rows):          # тёмные модули строки — отрезками
        x = 0
        while x < n:
            if row[x]:
                x0 = x
                while x < n and row[x]:
                    x += 1
                d.append('M%d %dh%dv1h-%dz' % (x0, y, x - x0, x - x0))
            else:
                x += 1
    out[key] = {'url': url, 'n': n, 'd': ''.join(d)}

with open('assets/js/qr.js', 'w', encoding='utf-8') as f:
    f.write('/* QR-коды финальной карточки — сгенерировано make_qr.py, руками не править */\n')
    f.write('window.FILM_QR = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print({k: (v['n'], len(v['d'])) for k, v in out.items()})
