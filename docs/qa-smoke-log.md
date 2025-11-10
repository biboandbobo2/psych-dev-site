# QA / Smoke Log

| Дата | Сценарий / Команда | Результат | Ответственный | Примечания |
|------|--------------------|-----------|---------------|------------|
| 2025-11-10 | `npm run build` | Vite build завершился, есть warning по chunk > 500кБ, артефакты `dist/assets/index-xyfPF6x7.js` (gzip 2,298 кБ) | Aleksej | Предупреждение по chunk, без ошибок |
| 2025-11-10 | `npx lighthouse http://localhost:4173/timeline --only-categories=performance,accessibility,best-practices --output=json --output-path=logs/lighthouse-timeline.json` | Lighthouse сгенерировал JSON `logs/lighthouse-timeline.json` (Performance/Accessibility/Best Practices) | Aleksej | Сервер на `localhost:4173`, отчет сохраняется в `logs/`; следить за предупреждением о чанках >500кБ |
| 2025-11-10 | `npm run test` | Vitest: 10 файлов, 43 теста — ✅ | Codex AI | Локальная проверка после рефакторинга страниц периодов |

> Заполняйте таблицу после каждого запуска `npm run test`, `npm run build`, а также после ручных smoke-проверок (CRUD заметок, экспорт, создание события из заметки, сценарии администратора). Добавляйте ссылки на PR/коммиты в колонку «Примечания».
