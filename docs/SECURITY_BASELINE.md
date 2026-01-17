# Security Baseline

> Минимальные правила для безопасной публикации репозитория.
> **Последнее обновление:** 2026-01-17

## 1) Запрещено хранить в Git
- Любые `.env*` файлы (кроме `.env.example`).
- Приватные ключи (`*.pem`, `*.key`, `service-account*.json`).
- Артефакты тестов и бэкапы (например, `playwright-report/`, `test-results/`, `backups/`).
- Локальные бэкапы `.safety/`.

## 2) Где хранить переменные окружения

### Vercel
- `Preview` и `Production` должны иметь полный набор переменных из `.env.example`.
- Клиентские переменные — только с префиксом `VITE_`.
- Серверные ключи (например, API ключи для `/api/*`) — только в Server/Preview окружении.

### Локальная разработка
- Использовать `.env.local` (не отслеживается в Git).
- При необходимости — `.env.production.local` (тоже не в Git).

## 3) Проверки перед push

Минимальный набор:
- `git status --short` (рабочее дерево чистое).
- Быстрый secret-scan:
  - `rg -n "BEGIN PRIVATE KEY|VERCEL_TOKEN|VERCEL_OIDC_TOKEN|AIza" .`
  - `git grep -n "BEGIN PRIVATE KEY|VERCEL_TOKEN|VERCEL_OIDC_TOKEN|AIza" || true`
- Убедиться, что `.gitignore` содержит блок `# Security ignores`.

## 4) Что делать при подозрении утечки
- Немедленно убрать секреты из репозитория.
- Провести ротацию ключей/токенов в провайдерах.
- Обновить `.env.example` и документацию на плейсхолдеры.
- Записать инцидент в `docs/POSTMORTEM_COST_AND_SECURITY.md` (если это постфактум).

**См. также:**
- `docs/COST_GUARDRAILS.md`
- `PREVIEW_CHECKLIST_VERCEL.md`
