# PRE_GITHUB_CHANGES_DONE.md

Ветка: `safety-prep-test` (локально). История не переписывалась.

## Что изменено
- `.gitignore`: добавлен блок `# Security ignores` для `.env*`, ключей, и артефактов тестов/backup.
- `.env.production`: снят с индекса (файл остается на диске).
- `.env.example`: создан шаблон с `<REPLACE_ME>`.
- Документация: заменены реальные значения `VITE_FIREBASE_API_KEY` на плейсхолдер:
  - `README.md`
  - `docs/QUICK_START.md`
  - `docs/archive/legacy/RENDER_SETUP.md`
- Устойчивость теста к копирайту:
  - `src/components/UserMenu.tsx`: добавлен `data-testid="user-menu-search-button"`.
  - `src/components/CombinedSearchDrawer.tsx`: добавлен `data-testid="combined-search-drawer"`.
  - `src/components/__tests__/UserMenu.research.test.tsx`: тест использует `data-testid` вместо текста UI.
- Артефакты сняты с индекса (файлы остаются на диске):
  - `backups/periods-backup-2025-11-19T12-44-40.json`
  - `playwright-report/`
  - `test-results/`

## Текущий git статус
```
D  .env.production
 M .gitignore
 M README.md
D  backups/periods-backup-2025-11-19T12-44-40.json
 M docs/QUICK_START.md
 M docs/archive/legacy/RENDER_SETUP.md
D  playwright-report/index.html
 M src/components/CombinedSearchDrawer.tsx
 M src/components/UserMenu.tsx
 M src/components/__tests__/UserMenu.research.test.tsx
D  test-results/.last-run.json
?? .env.example
?? .safety/
?? PREVIEW_CHECKLIST_VERCEL.md
?? PRE_GITHUB_CHANGES_DONE.md
?? PRE_GITHUB_CHANGES_PLAN.md
```

## Локальная валидация
- `npm run lint`: OK.
- `npm run build`: OK (есть предупреждение baseline-browser-mapping — не критично).
- `npm test`: OK (есть предупреждения в логах, но тесты проходят).

## Скан на секреты (после изменений)
- В tracked файлах: остались только плейсхолдеры и строковые подсказки (например "AIzaSy" в валидации).
- В untracked локальных файлах:
  - `.env.local` / `.env.production.local` содержат реальные токены (нормально, но нельзя коммитить).
  - `.safety/*` содержит бэкапы с реальными ключами — НЕ добавлять в Git.
  - `logs/lighthouse-timeline.json` содержит `apiKey` в URL (файл не отслеживается и `logs/` игнорируется).

## Что нужно сделать вручную
- В Vercel Preview задать все переменные из `.env.example` (см. `PREVIEW_CHECKLIST_VERCEL.md`).

## Команды для коммита и пуша (не выполнялись)
```bash
git add -u
git add .env.example PREVIEW_CHECKLIST_VERCEL.md PRE_GITHUB_CHANGES_DONE.md PRE_GITHUB_CHANGES_PLAN.md
git commit -m "Security: remove secrets from repo, add env template"
git push -u origin safety-prep-test
```

## Как откатить изменения
- Быстро вернуть `.gitignore`:
  - `cp .safety/.gitignore.bak .gitignore`
- Вернуть файлы в индекс:
  - `git add .env.production backups/periods-backup-2025-11-19T12-44-40.json playwright-report test-results`
- Полный откат рабочих изменений:
  - `git restore .`
  - Внимание: это удалит локальные правки. Альтернатива — использовать бэкапы в `.safety/`.
