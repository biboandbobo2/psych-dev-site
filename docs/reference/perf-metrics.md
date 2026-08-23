# Performance metrics (2025-11-12)

## Замер 2026-07-20 — цепочка первой загрузки (prod, baseline для LS-задач)

Среда: десктоп (Mac, быстрый канал), Chrome через Playwright, `https://academydom.com`, профиль с сохранённой auth-сессией.

| Этап | Время от старта | Комментарий |
|---|---|---|
| TTFB (HTML, Cloudflare → Vercel) | 0,32 с | сам хостинг не узкое место |
| JS входа + vendor скачан и запущен | ~0,9–1,0 с | vendor 266 КБ gzip (587 мс) |
| `identitytoolkit …accounts:lookup` | 1,10 → 2,18 с | 1,08 с; Firestore ждёт auth-токен и не стартует раньше |
| Первый Firestore `Listen/channel` | 2,20 с | чтения periods + clinicalTopics + generalTopics (полные документы) |
| Данные дочитаны, сплеш исчезает | ~3,4–3,5 с | первый контент |

Отдельно: `index.html` содержит 11 `modulepreload` — на старте качаются чанки **всех** lazy-разделов, суммарно ~540 КБ gzip (admin 105, tests 40, booking 30, research 14, timeline-* ~30, vendor 266, index 48 и пр.) для любого посетителя, включая анонимного.

Нюанс: замер с сохранённой сессией; у нового посетителя `accounts:lookup` может быть короче или отсутствовать, но порядок цепочки (JS → auth init → Firestore → рендер) тот же. На слабых сетях каждый этап растягивается в 2–4 раза.

### Как перемерять (после каждой LS-задачи)

DevTools Console на проде, cache disabled, hard reload, после полной загрузки:

```js
// 1) Цепочка запросов: старт +длительность, КБ
performance.getEntriesByType('resource')
  .filter(r => /firestore|identitytoolkit|\.js($|\?)/.test(r.name))
  .map(r => `${Math.round(r.startTime)}ms +${Math.round(r.duration)}ms ${Math.round((r.transferSize||0)/1024)}KB ${r.name.split('/').pop().slice(0,60)}`);

// 2) LCP — главная метрика «дало ли результат»
new PerformanceObserver(l => console.log('LCP', Math.round(l.getEntries().pop().startTime), 'ms'))
  .observe({ type: 'largest-contentful-paint', buffered: true });

// 3) Суммарный JS на старте
Math.round(performance.getEntriesByType('resource')
  .filter(r => /\.js($|\?)/.test(r.name))
  .reduce((s, r) => s + (r.transferSize||0), 0) / 1024) + ' KB gzip';
```

Для «слабой сети»: DevTools → Network throttling «Fast 4G» + CPU 4× slowdown, тот же LCP. Мерить два сценария: первый визит (инкогнито) и повторный (обычное окно). Результаты дописывать в журнал ниже.

### Журнал перезамеров LS

| Дата | После задачи | LCP первый визит (десктоп) | LCP повторный | JS на старте | Примечание |
|---|---|---|---|---|---|
| 2026-07-20 | — (baseline) | ~3,5 с | ~3,5 с (кэша нет) | 540 КБ gzip | до LS-задач; 4G не мерили |
| 2026-08-18 | LS-2 + LS-1 | /home 1,44 с; /prenatal 0,88 с | /home 1,6 с; /prenatal **0,32 с** | 547 КБ gzip (не менялся) | FCP 0,3–0,5 с на всех страницах: рендер больше не ждёт Firestore (LS-2). Курсовые страницы при повторном визите рисуются из localStorage до первого Firestore-запроса на 0,54 с (LS-1). Условия: Chrome/Playwright, тёплый HTTP-кэш JS (строгое инкогнито недоступно), auth-сессия как в baseline. Остаток LCP /home — собственные данные страницы (карточки курсов из Firestore) → территория LS-3/LS-4; JS на старте — LS-5. 4G не мерили |
| 2026-08-23 | LS-5 + LS-7 | /home **3,17 с холодный** (кэша JS не было: свежие хэши после деплоя; сравним с baseline 2026-07-20 ~3,5 с, а не со строкой LS-1/LS-2) | /home **1,18 с**; /prenatal **0,22 с** (тёплый кэш — условия строки LS-1/LS-2) | **353 КБ gzip** холодный (entry 64 + vendor 252 + shared-constants + чанк /home); статический граф entry 515→321 КБ | LS-5: страничные правила chunkMapper удалены, entry больше не тянет admin/tests/timeline/profile/research/booking; modulepreload 11→2; дроверы UserMenu lazy. LS-7: все шрифты self-hosted (@fontsource-variable, Playfair только в лендингах), внешних хостов в критическом пути 0; preconnect → identitytoolkit + firestore. Холодный LCP /home всё ещё упирается в цепочку auth→Firestore (identitytoolkit на 1,9 с +0,55 с → Firestore 2,5 с → LCP 3,17 с) — ровно территория LS-4. Метрика бэклога «≤250 КБ» недостижима без сплита vendor (252 КБ: react+firebase+router — всё стартовое); 4G не мерили |
| 2026-08-23 | LS-5+7+3+6 (сектор, кроме LS-4) | Полухолодный /home (кэш только vendor): LCP 3,08 с; **FCP 1,13 с** — сплеш LS-6 ждёт render-blocking CSS, на холодном канале это ~1,1 с, не TTFB | /home **FCP 0,34 с** (сплеш ✓ цель LS-6), LCP 1,2–1,8 с (разброс Firestore) | без изменений после LS-5 (~350 КБ полухолодный) | Итог захода 2–3. LS-3 смержен, но индексы на проде ЧИТАЮТСЯ только после деплоя правил (`firebase deploy --only firestore:rules` — ждёт одобрения); до этого шторка/openness на fallback-пути (проверено вживую: шторка «Психология развития» открывается). После деплоя правил перемерить /home: цепочка Firestore должна укоротиться (courseNavIndex вместо коллекций занятий в useCoursesOpenness). Остаток холодного LCP — auth-цепочка (identitytoolkit на 1,4–1,9 с +0,5 с) → LS-4 |

## 1.1 Build snapshot
- `npm run build` (UTC 2025-11-12 11:09)
  - `dist/assets/index-BogIFvUc.js`: 5,959,563 B (~5.96 MB) │ gzip 3,866,831 B (~3.87 MB)
  - `dist/assets/index-BFUqMtQG.css`: 70,277 B (~70 KB) │ gzip 14,720 B (~14.7 KB)
  - Vite warning about chunks > 500 KB persists because весь роутинг находится в одном файле.

## 1.1 Lighthouse (mobile emulation, throttled)
Запуск: `npm run dev -- --host 127.0.0.1 --port 4173` +
```
npx lighthouse http://127.0.0.1:4173/<route> \
  --chrome-flags="--no-sandbox --headless" \
  --emulated-form-factor=mobile \
  --output=json \
  --output-path=/tmp/lh-<route>.json \
  --quiet
```

| Route | Performance | FCP | Speed Index | LCP | TTI | TBT | Примечания |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 55 | 49.5 s | 49.5 s | 107.7 s | 107.7 s | 20 ms | `firestore.googleapis.com/.../Listen/channel` остаётся открытым, Lighthouse ждёт завершения подписки и тики идут до тайм-аута; влияния на пользовательский опыт нет, но нефиксированные метрики. |
| `/tests` | 55 | 49.5 s | 49.5 s | 107.1 s | 107.1 s | 10 ms | Та же причина: длительная подписка Firestore. |
| `/timeline` | 55 | 49.5 s | 49.5 s | 106.8 s | 106.8 s | 20 ms | Аналогично. |
| `/admin` | 55 | 49.4 s | 49.4 s | 106.4 s | 106.4 s | 30 ms | Без авторизации показана страница логина; подписка Firestore сохраняется. |

> Примечание: для более точных значений нужно либо отключить постоянные LISTEN-подключения (mock на уровне API), либо настроить Lighthouse так, чтобы он закрывал соединение раньше (например, флаг `--disable-storage-reset` + `--max-wait-for-load=30000`).

## 1.1 Статус выполнения
- [x] `npm run build` и запись размеров `dist/assets/index-*.js`
- [x] `npx lighthouse` отчёты для `/`, `/tests`, `/timeline`, `/admin`
- [x] Документация результатов и указание шага 1.1 для последующего сравнения

## Следующие шаги
1. После внедрения ленивой загрузки повторить шаг 1.1, особенно сбор `lighthouse` (скрипт выше) и записать новые значения.
2. Решить, как ограничить постоянные подписки Firestore в измерениях (локальные mock-сервисы, стабилизация `AuthProvider`).

## Дополнительно: manualChunks и timeline
- После настройки `manualChunks` и выделения ленивых компонентов `Timeline` chunk ≈ 4.84 МБ, отдельные `timeline-canvas` (9 кБ), `timeline-left-panel` (5 кБ), `timeline-right-panel` (27 кБ), `timeline-bulk` (6 кБ) и `timeline-help` (3 кБ). Остальные чанки: `admin` ~640 кБ, `tests` ~156 кБ, `notes` ~33 кБ, `profile` ~11 кБ, `MigrateTopics` ~5.5 кБ.
