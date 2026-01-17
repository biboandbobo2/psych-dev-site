# PRE_GITHUB_AUDIT_REPORT.md

Аудит выполнен в режиме read-only. Секреты не раскрываются. Подробные доказательства: `PRE_GITHUB_AUDIT_EVIDENCE.md`.

## Краткое резюме
- В рабочем дереве есть реальные секреты в `.env.local` и `.env.production.local`, а `.env.production` отслеживается Git (риск случайной публикации).
- В документации и истории Git есть публичный API key (`AIza…`), который необходимо рассматривать как потенциально чувствительный (нужны ограничения и/или замена на шаблон перед публикацией).
- Деплой, судя по репозиторию, выполняется через Firebase CLI (скрипты в `package.json`); CI в GitHub Actions деплой не делает.
- Guardrails частично есть: cleanup policy в Artifact Registry уже настроен, но бюджеты/алерты через CLI не подтверждены, а скрипт Cloud Run cleanup присутствует только локально (не закоммичен).

## Как сейчас происходит деплой (факты)
- GitHub Actions (`.github/workflows/ci.yml`) выполняет lint/test/build, без деплоя.
- Деплой в прод выполняется вручную через Firebase CLI (`package.json` scripts `deploy:*`, `firebase:deploy:*`) в проект `psych-dev-site-prod`.
- Cloud Functions GEN_2 (`ingestBook`) использует Cloud Run сервис `ingestbook` в `europe-west1`; каждый деплой функций создает новые ревизии и контейнеры в Artifact Registry.
- В репозитории присутствуют `render.yaml` и `vercel.json` — альтернативные/исторические пути деплоя.

## Guardrails против роста затрат (факты)
- Artifact Registry: в `europe-west1/gcf-artifacts` уже есть cleanup policy (удаление untagged старше 14 дней + keep для `latest/prod/release`). Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 5.4.
- Cloud Run retention: скрипты есть локально (`scripts/cleanup_cloud_run_revisions.*`), но файл не отслеживается в Git (не попадает в GitHub без явного добавления). Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 4.
- Billing Budgets через CLI не подтверждены (API `billingbudgets.googleapis.com` не включен). Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 5.5.

## MUST (обязательно до публикации)
- Секреты в рабочем дереве и Git: обнаружены реальные токены в `.env.local` и `.env.production.local`, а `.env.production` отслеживается Git; риск утечки при публикации. Что сделать: 1) удалить `.env.production` из Git и добавить `.env.production`/`.env.*` в `.gitignore`, 2) вынести значения в менеджер секретов/локальные env, 3) добавить `.env.example` с плейсхолдерами; evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 2.1.
- Публичный ключ Firebase (`VITE_FIREBASE_API_KEY=AIz…srw`) присутствует в `README.md`, `docs/QUICK_START.md`, `docs/archive/legacy/RENDER_SETUP.md` и в истории Git; риск злоупотребления квотами, утечки контекста или автоматических блокировок при открытии репозитория. Что сделать: 1) заменить значения на плейсхолдеры, 2) ограничить ключ в GCP (HTTP referrers/allowed APIs), 3) при необходимости — ротация и очистка истории; evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` разделы 2.2 и 3.

## SHOULD (очень желательно)
- Утвердить и документировать cost guardrails: добавить в репозиторий инструкцию по cleanup policy и скрипт Cloud Run cleanup (с dry-run по умолчанию), чтобы защита от роста затрат была воспроизводима. Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` разделы 4 и 5.4.
- Настроить budgets/alerts: включить `billingbudgets.googleapis.com` и создать бюджет/алерты на Artifact Registry и Cloud Run; сейчас через CLI не подтверждается. Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 5.5.
- Очистить репозиторий от артефактов и бэкапов: `backups/periods-backup-*.json`, `playwright-report/`, `test-results/` сейчас отслеживаются Git и не должны попадать в публичный репозиторий; добавить в `.gitignore` и удалить из истории при необходимости. Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 2.2 и Git status.
- Документировать деплой: в README добавить явные шаги (кто/как выполняет `firebase deploy`, что это создает в Artifact Registry, как контролировать ревизии Cloud Run). Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 4.

## COULD (по желанию)
- Добавить pre-commit/CI скан секретов (gitleaks/secretlint) перед пушем, чтобы предотвращать утечки; evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 2.
- Подготовить workflow для регулярного retention (GitHub Actions) и задокументировать минимальные IAM роли для запуска (без автоматического применения). Evidence: `PRE_GITHUB_AUDIT_EVIDENCE.md` раздел 4.

## Приоритеты до GitHub (сводно)
- MUST: исключить секреты из рабочего дерева и истории; заменить публичные ключи в документации на плейсхолдеры и ограничить реальные ключи.
- SHOULD: закрепить guardrails (cleanup policy + скрипты), настроить бюджеты, очистить репо от артефактов.
- COULD: автоматизировать проверки секретов и retention, добавить минимальные IAM роли в docs.

