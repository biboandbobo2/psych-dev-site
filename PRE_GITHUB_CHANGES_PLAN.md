# PRE_GITHUB_CHANGES_PLAN.md

Контекст: работаем в отдельной ветке `safety-prep-test` (локально). Изменения минимальные, обратимые, без переписывания истории.

## A) MUST — обязательное перед публикацией

### 1) Убрать секреты из Git и предотвратить их попадание
- Что: добавить блок security-исключений в `.gitignore` ('.env*', ключи, артефакты тестов/backup).
- Почему: сейчас `.env.production` отслеживается, а в репо есть чувствительные env/токены и артефакты.
- Файлы: `.gitignore`.
- Команды:
  - `cp .gitignore .safety/.gitignore.bak`
  - добавить блок "# Security ignores" в конец `.gitignore`.
- Риски: минимальные (может скрыть файлы от отслеживания).
- Откат: `cp .safety/.gitignore.bak .gitignore`.

### 2) Убрать tracked `.env.production` из индекса (без удаления с диска)
- Что: `git rm --cached .env.production`.
- Почему: файл отслеживается и может утечь в GitHub.
- Файлы: `.env.production` (останется на диске, но не будет в Git).
- Команды (после подтверждения): `git rm --cached .env.production`.
- Риски: минимальные (требует, чтобы переменные были в env при сборке).
- Откат: `git add .env.production`.

### 3) Создать `.env.example` без секретов
- Что: создать шаблон env с плейсхолдерами.
- Почему: безопасно документировать переменные без значений.
- Файлы: `.env.example`.
- Команды:
  - если нет `.env.example`: `cp .env.production .env.example`
  - заменить значения на `<REPLACE_ME>`.
- Риски: нет (док-файл).
- Откат: удалить `.env.example` или восстановить бэкап.

### 4) Удалить реальные ключи из README/docs
- Что: заменить `VITE_FIREBASE_API_KEY=AIz...` на плейсхолдер.
- Почему: ключы в документации утекут в public репозиторий.
- Файлы: `README.md`, `docs/QUICK_START.md`, `docs/archive/legacy/RENDER_SETUP.md`.
- Команды:
  - сделать бэкап в `.safety/`
  - заменить значения на `VITE_FIREBASE_API_KEY=<YOUR_FIREBASE_API_KEY>`.
- Риски: минимальные (правка docs).
- Откат: восстановить файлы из `.safety/`.

### 5) Убрать артефакты и бэкапы из индекса (если tracked)
- Что: снять с индекса `backups/periods-backup-*.json`, `playwright-report/`, `test-results/`.
- Почему: архивы/артефакты не должны публиковаться.
- Файлы: `backups/periods-backup-*.json`, `playwright-report/`, `test-results/`.
- Команды (после подтверждения):
  - `git rm --cached backups/periods-backup-*.json`
  - `git rm --cached -r playwright-report test-results`
- Риски: минимальные (файлы останутся на диске).
- Откат: `git add backups/periods-backup-*.json playwright-report test-results`.

## B) SHOULD — желательно

### 6) Убедиться, что cleanup scripts включены в репозиторий
- Что: `scripts/cleanup_cloud_run_revisions.*` уже tracked (проверено).
- Почему: guardrail против роста ревизий.
- Риски/откат: не требуется.

### 7) Документировать переменные для Vercel Preview
- Что: собрать список из `.env.example` и описать в `PREVIEW_CHECKLIST_VERCEL.md`.
- Почему: без env Preview может падать.
- Риски: нет.

## C) COULD — по желанию

### 8) Добавить pre-commit/CI скан секретов
- Что: gitleaks/secretlint.
- Почему: предотвращает утечки.
- Риски: добавляет проверку в CI.
- Откат: удалить конфиги.

## Требуемые подтверждения перед изменениями
- Для `git rm --cached .env.production`: `UNTRACK_ENV_PROD`.
- Для снятия артефактов: `UNTRACK_ARTIFACTS`.
- Для запуска всего набора изменений: `APPLY_SAFETY_CHANGES`.

