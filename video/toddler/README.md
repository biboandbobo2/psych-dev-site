# Учебный ролик «От года до трёх» (Раннее детство, 1–3 года)

Второй эпизод серии «Психология развития» DOM Academy: 4:25 для раздела «Раннее детство (1–3 года)». Как и первый ([`../infancy`](../infancy)), ролик без диктора — только текст на экране, схемы и оригинальная музыка. Сценарий, принципы серии и источники — в [SCRIPT.md](SCRIPT.md).

Ролик собран на [HyperFrames](https://github.com/heygen-com/hyperframes): это HTML-страница, которую Chrome покадрово снимает в MP4. Вся анимация — один детерминированный таймлайн GSAP.

## Структура

```
index.html               корневая композиция (265 с), @font-face и FILM_CONFIG эпизода
assets/css/theme.css     дизайн-система серии + акцент эпизода (индиго раздела /1-3)
assets/js/lib.js         движок серии: персонажи, шкала, карта курса, заставки глав, типографика
assets/js/scenes-0.js    пролог, титр с картой курса, «сроки — это статистика»
assets/js/scenes-1.js    часть 1 «Вещи» (1–1,5 года)
assets/js/scenes-2.js    часть 2 «Слова и люди» (1,5–2 года)
assets/js/scenes-3.js    часть 3 «Символы» (2–2,5 года)
assets/js/scenes-4.js    часть 4 «Я сам» (2,5–3 года), «паспорт возраста», финал
assets/brand/            знак DOM Academy (см. ../_brand)
assets/fonts/            Playfair Display и Manrope (латиница + кириллица, OFL)
assets/vendor/gsap.min.js
music/compose.py         партитура по сценам (4/4, 96 bpm, тема серии) → toddler.mid
render.sh                полная пересборка: музыка → видео → сведение
cover/, make_cover.sh    обложка YouTube (снимок композиции → cover/cover-youtube.jpg, 1280×720)
```

Длительность каждой сцены задаётся в тактах: `bars`, один такт = 2,5 с (как в первом эпизоде). Партитура в `music/compose.py` собрана по тем же сценам: если меняете длину или порядок сцен, поменяйте блок сцены в `SCENES` (гармония — по аккорду на такт). Акценты челесты заданы в секундах от начала сцены — после правок анимации сверьте их.

## Как пересобрать

Нужны Node 22+, FFmpeg, FluidSynth, банк звуков MuseScore General и Python 3 с `mido`:

```bash
sudo apt install ffmpeg fluidsynth musescore-general-soundfont
pip install mido
./render.sh            # результат: renders/toddler-one-to-three.mp4
```

Предпросмотр кадров: `npx hyperframes@0.8.78 snapshot . --at 10,60,150`.

## Следующий эпизод серии

1. Скопируйте папку эпизода.
2. В `index.html` поменяйте `FILM_CONFIG`:
   - `accent` — цвет раздела из `src/theme/periods.ts`;
   - `ruler` — шкала возраста;
   - `series.current` и `series.next`;
   - `done: true` у вышедших эпизодов.
3. В `theme.css` поменяйте `--accent*`.
4. Перепишите сцены и музыку, сохранив тему серии.

Карта курса, заставки глав, «паспорт возраста» и финальная карточка перестроятся сами.

Про кириллицу в HyperFrames — см. README первого эпизода: шрифты подключены под собственными именами `DOMSerif` и `DOMSans`.

## Лицензии

- **Шрифты:** SIL Open Font License.
- **GSAP:** стандартная лицензия GreenSock, бесплатна для этого использования.
- **Музыка:** оригинальная композиция для DOM Academy; звуки — MuseScore General SoundFont (MIT).
- **Знак DOM Academy** — собственность DOM Academy.
- **Внешние платные сервисы** не использовались.
