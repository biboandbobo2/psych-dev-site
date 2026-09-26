# Учебный ролик «Первый год жизни» (Младенчество, 0–1 год)

Ролик на 3:10 для раздела «Младенчество» курса «Психология развития». Он без диктора: текст на экране, схемы и оригинальная музыка. Сценарий и монтажный лист — в [SCRIPT.md](SCRIPT.md).

Ролик собран на [HyperFrames](https://github.com/heygen-com/hyperframes): это HTML-страница, которую Chrome покадрово снимает в MP4. Вся анимация — один детерминированный таймлайн GSAP.

## Структура

```
index.html               корневая композиция (190 с) + @font-face
assets/css/theme.css     дизайн-система: цвета и шрифты сайта
assets/js/lib.js         движок: персонажи, шкала 0–12 мес, типографика, анимации строк
assets/js/scenes-0.js    пролог и титр
assets/js/scenes-1.js    часть 1 «Встреча с миром» (0–3 мес)
assets/js/scenes-2.js    часть 2 «Привязанность» (3–8 мес)
assets/js/scenes-3.js    часть 3 «Мир вещей» (8–12 мес), итог, финал
assets/fonts/            Playfair Display и Manrope (латиница + кириллица, OFL)
assets/vendor/gsap.min.js
music/compose.py         партитура (колыбельная 3/4, 72 bpm) → infancy.mid
render.sh                полная пересборка: музыка → видео → сведение
```

Длительность каждой сцены задаётся в тактах музыки: `bars`, один такт = 2,5 с. Поэтому смены сцен всегда совпадают с сильной долей. Если меняете длину сцены, поменяйте её и в `SCENES` в `music/compose.py`.

## Как пересобрать

Нужны Node 22+, FFmpeg, FluidSynth, банк звуков MuseScore General и Python 3 с `mido`:

```bash
sudo apt install ffmpeg fluidsynth musescore-general-soundfont
pip install mido
./render.sh            # результат: renders/infancy-first-year.mp4
```

Chrome HyperFrames скачает сам: `npx hyperframes browser ensure`. Уже установленный браузер можно указать через `PRODUCER_HEADLESS_SHELL_PATH`.

Для предпросмотра отдельных кадров:

```bash
npx hyperframes@0.8.78 snapshot . --at 20,60,100
```

## Важно про кириллицу

HyperFrames 0.8.78 подменяет популярные шрифты своими встроенными файлами, а в них только латиница:
- «Inter», «Montserrat», «Roboto», «Open Sans», «Lato», «Poppins», «Playfair Display» и др.;
- а также их «псевдонимы»: Arial и Helvetica превращаются в Inter, Georgia — в EB Garamond и т. п.

На весах 400/700/900 кириллица в таком случае рисуется системным шрифтом.

Решение, которое использовано здесь:
- класть в проект файлы шрифтов с кириллицей;
- объявлять свой `@font-face` с `unicode-range`;
- давать семейству собственное имя (`DOMSerif`, `DOMSans`).

Тогда HyperFrames не трогает эти шрифты.

## Следующий ролик (например, «Ранний возраст, 1–3 года»)

Движок переиспользуется:
1. Скопируйте папку.
2. Перепишите сцены в `scenes-*.js`.
3. Поменяйте подписи шкалы в `lib.js` (`buildRuler`).
4. Перепишите гармонию и мелодию в `music/compose.py`.

Персонажи, типографика, переходы и музыкальная сетка останутся теми же, и серия будет выглядеть единой.

## Лицензии

- **Шрифты:** SIL Open Font License.
- **GSAP:** стандартная лицензия GreenSock, бесплатна для этого использования.
- **Музыка:** оригинальная композиция для DOM Academy; звуки — MuseScore General SoundFont (MIT).
- **Внешние платные сервисы** не использовались.
