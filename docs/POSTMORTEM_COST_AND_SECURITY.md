# Postmortem: Cost & Security Prep

> Краткий разбор двух задач: снижение расходов на хранение в GCP и подготовка репозитория к публикации.
> **Последнее обновление:** 2026-02-01

## Контекст

### A) Рост расходов на хранение
- Основной источник микрозатрат — Artifact Registry (`gcf-artifacts`) и накопление образов/слоёв.
- Наиболее тяжёлые пакеты — образы функций/сервисов и их cache-слои.
- Cloud Run имел длинную историю ревизий, что удерживало большое число digest'ов.

### B) Безопасность перед публикацией
- В репозитории были потенциальные секреты в `.env` и артефакты тестов/backup.
- В документации встречались реальные значения ключей (заменены на плейсхолдеры).
- Тесты зависели от копирайта в UI и ломались при смене текста.

Источники и артефакты:
- `ARTIFACT_REGISTRY_INVESTIGATION.md`
- `CLEANUP_SUMMARY.md`
- `CLEANUP_LOG.md`
- `PRE_GITHUB_CHANGES_PLAN.md`
- `PRE_GITHUB_CHANGES_DONE.md`

## Что было сделано

### 1) Artifact Registry / Cloud Run
- Удалён repo `gcf-artifacts` в `us-central1` после подтверждения отсутствия потребителей.
- В Cloud Run сокращены ревизии `ingestbook`: оставлены только active + `KEEP_LAST_N=2`.
- Удалены orphan digest'ы в `europe-west1` частично; часть удаления остановлена из-за `PERMISSION_DENIED`.

Ключевые метрики (на момент фиксации):
- Cloud Run revisions: 25 → 2.
- Artifact Registry (virtual size): 1.19 GiB → 215.93 MiB.
- Остались 2 orphan digest'а (см. `CLEANUP_SUMMARY.md`).

Примечание: `imageSizeBytes` отражает виртуальный размер образов. Фактическая стоимость может быть ниже из-за дедупликации слоёв и задержек биллинга.

### 2) Безопасность перед GitHub
- `.env.production` снят с индекса; добавлен `.env.example` с плейсхолдерами.
- В `.gitignore` добавлен блок `# Security ignores` (env/keys/artifacts).
- Реальные ключи в документации заменены на плейсхолдеры.
- Удалены из индекса артефакты (`playwright-report`, `test-results`, backup-файл).
- Тест `UserMenu` стабилизирован через `data-testid` (не зависит от текста UI).
- Добавлен чек-лист Vercel Preview: `PREVIEW_CHECKLIST_VERCEL.md`.

### 3) Отключено платное сканирование контейнеров (2026-02-01)
- Отключено vulnerability scanning в Artifact Registry:
  - `gcf-artifacts` (us-central1)
  - `gcf-artifacts` (europe-west1)
- Отключен API `containerscanning.googleapis.com` на уровне проекта.

## Риски и контроль

### Риски
- Удаление digest'ов, которые используются активными ревизиями, может сломать откат/деплой.
- Tagged образы могут использоваться CI/CD, даже если Cloud Run их не использует.
- Ошибки прав доступа (`PERMISSION_DENIED`) блокируют безопасную чистку.

### Контрольные меры
- Хранить минимум ревизий: active + `KEEP_LAST_N`.
- Чистить только orphan digest'ы и только после проверки потребителей.
- Вести логи и снапшоты перед удалениями (`CLEANUP_LOG.md`, `logs/`).

## Что делать, если счета снова растут

1) Проверить Cloud Run
- Сколько ревизий у сервиса и сколько получают трафик.
- Оставлять active + `KEEP_LAST_N`.

2) Проверить Artifact Registry
- Список repo, total size, количество digest'ов.
- Выявить orphan digest'ы и удалить только после проверки использования.

3) Зафиксировать изменения
- Обновить `CLEANUP_LOG.md` и `CLEANUP_SUMMARY.md`.
- Добавить/обновить cleanup policy для untagged (если ещё не настроено).

## Следующие шаги
- Подтвердить статус оставшихся orphan digest'ов и удалить их при наличии прав.
- Настроить/проверить cleanup policy для `untagged` старше N дней.
- Автоматизировать чистку Cloud Run ревизий (скрипт/CI), если потребуется.

**См. также:**
- `docs/COST_GUARDRAILS.md`
- `docs/SECURITY_BASELINE.md`
