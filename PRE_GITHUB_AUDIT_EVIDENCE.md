# PRE_GITHUB_AUDIT_EVIDENCE.md

Цель: собрать доказательную базу для подготовки репозитория к публикации в GitHub (read-only). Секреты маскированы.

## 0) Базовый Git-контекст
- `git status --short`:
  - Изменены: `CLEANUP_LOG.md`, `CLEANUP_SUMMARY.md`, `api/assistant.ts`, `api/books.ts`.
  - Неотслеживаемые: `.github/workflows/cloud-run-retention.yml`, `api/books.test.ts`, `scripts/README_CLEANUP.md`, `scripts/cleanup_cloud_run_revisions.ps1`, `scripts/cleanup_cloud_run_revisions.sh`.
- `git remote -v`: `origin git@github.com:biboandbobo2/psych-dev-site.git`.
- `git branch --show-current`: `main`.
- `git log -n 20 --oneline --decorate` (выдержка):
  - `c080b88` — "feat: Add GEMINI_API_KEY secret for embeddings" (упоминание секрета в сообщении коммита).

## 1) Окружение
- `node -v`: `v25.2.0`.
- `npm -v`: `11.6.2`.
- `gcloud --version`: `Google Cloud SDK 543.0.0`.
- `gcloud auth list`: active `biboandbobo2@gmail.com`.
- `gcloud config set project psych-dev-site-prod` и `gcloud config list`: project `psych-dev-site-prod`.

## 2) Проверка секретов в рабочем дереве (read-only)
### 2.1 Файлы окружения
- Найдены файлы: `.env.local`, `.env.production`, `.env.production.local`.
- `.gitignore` содержит `.env.local` и `.env*.local`, НО НЕ содержит `.env.production`.
- `git ls-files` показывает, что `.env.production` **отслеживается** в Git.

Содержимое (маскировано):
- `.env.production`:
  - `VITE_FIREBASE_API_KEY=${V…EY}`
  - `VITE_FIREBASE_AUTH_DOMAIN=${V…IN}`
  - `VITE_FIREBASE_PROJECT_ID=${V…ID}`
  - `VITE_FIREBASE_STORAGE_BUCKET=${V…ET}`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=${V…ID}`
  - `VITE_FIREBASE_APP_ID=${V…ID}`
  - `VITE_ADMIN_SEED_CODE=${V…DE}`
- `.env.local`:
  - `VERCEL_OIDC_TOKEN=eyJ…gHA`
  - `VERCEL_TOKEN=m9b…zew`
  - `VITE_FIREBASE_API_KEY=AIz…srw`
  - `VITE_FIREBASE_APP_ID=1:1…41a`
  - `VITE_FIREBASE_AUTH_DOMAIN=psy…com`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=100…271`
  - `VITE_FIREBASE_PROJECT_ID=psy…rod`
  - `VITE_FIREBASE_STORAGE_BUCKET=psy…app`
  - `VITE_ADMIN_SEED_CODE=PSY…3VJ`
- `.env.production.local`:
  - `VITE_FIREBASE_API_KEY=AIz…srw`
  - `VITE_FIREBASE_AUTH_DOMAIN=psy…com`
  - `VITE_FIREBASE_PROJECT_ID=psy…rod`
  - `VITE_FIREBASE_STORAGE_BUCKET=psy…app`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=100…271`
  - `VITE_FIREBASE_APP_ID=1:1…41a`
  - `VITE_ADMIN_SEED_CODE=PSY…3VJ`

### 2.2 Поиск по рабочему дереву (ключевые слова)
`rg` совпадения по ключевым словам (пути и строки):
- `docs/QUICK_START.md:24` — `VITE_FIREBASE_API_KEY=AIz…srw`
- `docs/archive/legacy/RENDER_SETUP.md:22` — `VITE_FIREBASE_API_KEY=AIz…srw`
- `README.md:351` — `VITE_FIREBASE_API_KEY=AIz…srw`
- `README.md:391` — `GEMINI_API_KEY` (упоминание переменной)
- `functions/src/ingestBook.ts:104` — `GEMINI_API_KEY` (использование env-переменной)
- `api/books.ts:48` — `GEMINI_API_KEY` (использование env-переменной)
- `render.yaml:8` — `VITE_FIREBASE_API_KEY` (ключ конфигурации, без значения)

Потенциальные совпадения по токен-префиксам:
- `docs/QUICK_START.md:24` — `AIz…srw`.
- `docs/archive/legacy/RENDER_SETUP.md:22` — `AIz…srw`.
- `README.md:351` — `AIz…srw`.
- `backups/periods-backup-2025-11-19T12-44-40.json:44/797` — **ложное совпадение** ("risk-" в тексте URL).
- `package-lock.json:12016/13522` — **ложные совпадения** (части слов "netmask", "queue-microtask").

### 2.3 Проверка staged/unstaged
- `git diff`: изменения затрагивают `CLEANUP_LOG.md`, `CLEANUP_SUMMARY.md`, `api/assistant.ts`, `api/books.ts`.
- `git diff --staged`: пусто.

## 3) Поиск секретов в истории Git
- `git log --all --grep="API_KEY|SECRET|TOKEN|PRIVATE" -n 200`:
  - найден коммит `c080b88` (сообщение содержит `GEMINI_API_KEY`).
- `git grep -n -o "AIza" $(git rev-list --all)`:
  - повторяющиеся совпадения в истории для `README.md:351`, `docs/QUICK_START.md:24`, `docs/archive/legacy/RENDER_SETUP.md:22`.
- `git grep -n -o "BEGIN PRIVATE KEY" $(git rev-list --all)`:
  - совпадений нет.
- `git grep -n -o "service_account|private_key_id|client_email" $(git rev-list --all)`:
  - совпадений нет.

## 4) CI/CD и деплой-механика в репозитории (read-only)
- `.github/workflows/ci.yml`: линт, тесты, build, e2e (без деплоя).
- `.github/workflows/cloud-run-retention.yml`: файл присутствует (неотслеживаемый).
- `package.json` scripts:
  - `deploy:all`, `deploy:functions`, `deploy:rules`, `deploy:storage` — `firebase deploy ...`.
  - `firebase:deploy:*` — аналогичные скрипты без явного project.
- `firebase.json`: Functions runtime `nodejs20`, rules/firestore/storage.
- Присутствуют `render.yaml` и `vercel.json` (альтернативные платформы).

## 5) GCP (read-only) — состояние прод-проекта
### 5.1 Cloud Run
- `gcloud run services list --project=psych-dev-site-prod --platform=managed --format=json`:
  - сервис `ingestbook`, регион `europe-west1`.
- `gcloud run services describe ingestbook ... --format=json`:
  - traffic: `ingestbook-00025-mof` = 100%.
- `gcloud run revisions list --service=ingestbook ... --format=json`:
  - `ingestbook-00025-mof` (image @ `sha256:af07...843b`).
  - `ingestbook-00024-qex` (image @ `sha256:0f58...ea00`).

### 5.2 Cloud Functions
- `gcloud functions list --gen2 --project=psych-dev-site-prod --format=json`: **ошибка** (флаг `--gen2` не распознан).
- `gcloud functions list --v2 --project=psych-dev-site-prod --format=json`:
  - GEN_2: `ingestBook` (europe-west1).
  - GEN_1: 11 функций (us-central1).

### 5.3 Artifact Registry
- `gcloud artifacts repositories list --project=psych-dev-site-prod --format=json`:
  - `europe-west1/gcf-artifacts` (DOCKER).
  - `us-central1/gcf-artifacts` (DOCKER).
- `gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json`:
  - 2 digest’а, суммарно ~43.32 MiB (virtual size по манифестам):
    - `sha256:0f58...ea00` (tags: none).
    - `sha256:af07...843b` (tags: `latest`, `version_1`).

### 5.4 Cleanup policy (Artifact Registry)
- `gcloud artifacts repositories describe gcf-artifacts --location=europe-west1 --project=psych-dev-site-prod --format=json`:
  - Cleanup policies:
    - `delete-untagged-older-than-14d` (tagState=UNTAGGED, olderThan=14d).
    - `keep-critical-tags` (tagPrefixes: `latest`, `prod`, `release`).

### 5.5 Бюджеты и алерты
- `gcloud services list --enabled --project=psych-dev-site-prod`:
  - `billingbudgets.googleapis.com` **не включен**.
- `gcloud beta billing budgets list --billing-account=...`:
  - результат: пусто (API/permissions недоступны через CLI).

## 6) Логи и артефакты проверки
Сырые выводы команд сохранены в `logs/pre-github-audit/`:
- `run_services.json`, `run_service_ingestbook.json`, `run_revisions_ingestbook.json`
- `functions_v2.json`, `functions_gen2.json` (ошибка `--gen2`)
- `ar_repos.json`, `ar_images_eu.json`, `ar_repo_eu_describe.json`, `ar_repo_eu_cleanup_policies.json`
- `enabled_services.json`, `billing_accounts.json`, `budgets_010C05-CE6FD2-DF4CA1.json`
- `rg_keywords.txt`, `rg_token_prefixes.txt`, `git_grep_aiza.txt`

