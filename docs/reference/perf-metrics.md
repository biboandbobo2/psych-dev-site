# Performance metrics (2025-11-12)

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
