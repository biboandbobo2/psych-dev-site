# Учебный ролик «От семи до десяти» (Младший школьный возраст, 7–10 лет)

Четвёртый эпизод серии «Психология развития» DOM Academy, 5:10. Герой — первоклассник Миша. Разбор, решения и источники — [SCRIPT.md](SCRIPT.md), сцены и весь текст — [STORYBOARD.md](STORYBOARD.md), синхронные моменты музыки — [music/SYNC.md](music/SYNC.md). Правила серии — [`../README.md`](../README.md).

## Структура

```
index.html            корневая композиция (310 с), шрифты: DOMSerif, DOMSans, DOMHand (пропись), DOMKid (детский почерк)
assets/js/lib.js      движок серии + камера (s.cam), стоп-кадр (s.freeze), текст поверх камеры (s.hud), приметы героев (s.acc)
assets/js/school.js   рисунки эпизода: класс в перспективе, школа, кухня, телефон, деревья, шахматы, шлем; ходьба по клеткам, перелистывание
assets/js/scenes-0…5.js  вступление, главы 1–4, итог
music/compose.py      партитура по главам (на основе 3–7) → school.mid
render.sh             музыка → видео → сведение
cover/, make_cover.sh обложка YouTube
sheet/                лист рисунков (проверка рисунков до сцен)
```

## Проверки

```bash
cd .. && python3 tools/check.py school --frames      # хронометраж и листы кадров
python3 tools/reading.py school/STORYBOARD.md         # время на чтение
python3 tools/strips.py school /tmp/strips            # кадры для слепого зрителя
~/.venvs/video-music/bin/python tools/audiocheck.py school   # автопроверка звука
```
