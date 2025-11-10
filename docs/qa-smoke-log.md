# QA / Smoke Log

| Дата | Сценарий / Команда | Результат | Ответственный | Примечания |
|------|--------------------|-----------|---------------|------------|
| 2025-11-10 | `npx lighthouse http://localhost:4173/timeline --only-categories=performance,accessibility,best-practices --output=json --output-path=logs/lighthouse-timeline.json` | Lighthouse сгенерировал JSON `logs/lighthouse-timeline.json` (Performance/Accessibility/Best Practices) | Aleksej | Сервер на `localhost:4173`, отчет сохраняется в `logs/`; следить за предупреждением о чанках >500кБ |

> Заполняйте таблицу после каждого запуска `npm run test`, `npm run build`, а также после ручных smoke-проверок (CRUD заметок, экспорт, создание события из заметки, сценарии администратора). Добавляйте ссылки на PR/коммиты в колонку «Примечания».
