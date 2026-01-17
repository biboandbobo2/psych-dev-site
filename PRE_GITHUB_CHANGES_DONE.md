# PRE_GITHUB_CHANGES_DONE.md

Историческая фиксация изменений подготовки репозитория к публикации.  
Актуальные правила см. `docs/SECURITY_BASELINE.md` и `PREVIEW_CHECKLIST_VERCEL.md`.

## Что было изменено
- `.gitignore`: добавлен блок `# Security ignores` для env/keys/artifacts.
- `.env.production`: снят с индекса (файл остаётся на диске, но не в Git).
- `.env.example`: создан шаблон с `<REPLACE_ME>`.
- Документация: ключи заменены на плейсхолдеры.
- Тесты: `UserMenu` переведён на `data-testid`, чтобы не зависеть от копирайта.
- Артефакты сняты с индекса:
  - `backups/periods-backup-2025-11-19T12-44-40.json`
  - `playwright-report/index.html`
  - `test-results/.last-run.json`

## Локальная валидация
- `npm run lint`: OK.
- `npm run build`: OK (предупреждение baseline-browser-mapping — не критично).
- `npm test`: OK (в логах есть предупреждения, но тесты проходят).

## Что нужно сделать вручную
- В Vercel Preview и Production задать все переменные из `.env.example`.
- Убедиться, что `.env.local` и `.env.production.local` не попадают в Git.

## Как откатить изменения (если нужно)
- Вернуть `.gitignore` из бэкапа:
  - `cp .safety/.gitignore.bak .gitignore`
- Вернуть файлы в индекс:
  - `git add .env.production backups/periods-backup-2025-11-19T12-44-40.json playwright-report/index.html test-results/.last-run.json`

**См. также:** `PRE_GITHUB_CHANGES_PLAN.md`.
