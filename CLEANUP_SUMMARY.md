# CLEANUP_SUMMARY — psych-dev-site-prod

Дата (UTC): 2026-01-17T09:38:00Z
Активный аккаунт: biboandbobo2@gmail.com
KEEP_LAST_N: 2

## 1) Что было сделано

### ШАГ 1 — удаление us-central1/gcf-artifacts
- Проверено отсутствие потребителей Cloud Run/Functions GEN_2 в us-central1.
- Репозиторий удалён: `projects/psych-dev-site-prod/locations/us-central1/repositories/gcf-artifacts`.
- Инвентарь и подтверждение удаления зафиксированы в `CLEANUP_LOG.md`.

### ШАГ 2 — очистка Cloud Run ревизий (ingestbook)
- Было 25 ревизий, оставлены 2 (KEEP_LAST_N=2, включая active).
- Удалено 23 ревизии с traffic=0%.
- Текущие ревизии:
  - `ingestbook-00025-mof` (traffic=100)
  - `ingestbook-00024-qex` (rollback)

### ШАГ 3 — удаление orphan digest’ов (europe-west1/gcf-artifacts)
- Пересчитаны USED_DIGESTS_TO_KEEP = 2.
- Найдено orphan digest’ов: 24 (untagged=23, tagged=1).
- Удаление началось успешно, затем остановлено из-за `PERMISSION_DENIED`.
- Фактически удалено 22 digest’а (по diff списка до/после).
- Остались 2 orphan digest’а (см. раздел 3).

## 2) Метрики до/после

### Cloud Run revisions
- До: 25
- После: 2

### Artifact Registry (europe-west1/gcf-artifacts)
- Total virtual size до: 1.19 GiB
- Total virtual size после: 215.93 MiB
- Оценка удалённого virtual size: 1003.21 MiB

Примечание: repo `sizeBytes` почти не изменился (990.04 MiB → 990.00 MiB). Это нормально из-за дедупликации слоёв и задержки обновления биллинга.

## 3) Текущее состояние образов (europe-west1/gcf-artifacts)

### KEEP (используются Cloud Run / rollback)
- `europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b` | 21.66 MiB | tags: latest,version_1
- `europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0f5807422c3c58b792a324e991cbdf3b1ef6fdf58a7688de6f47419d29b8ea00` | 21.66 MiB | tags: -

### ORPHAN (к удалению, но не удалены из-за прав)
- `europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b` | 21.65 MiB | tags: -
- `europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a` | 150.96 MiB | tags: latest

## 4) Ошибки и ограничения
- `PERMISSION_DENIED` при удалении digest’ов Artifact Registry (europe-west1).
- Один запуск batch delete завершился по таймауту (но часть удалений завершилась успешно).

## 5) Логи и артефакты
- `CLEANUP_LOG.md`
- `logs/artifact-registry-cleanup/` (JSON-снимки и списки)
- `logs/artifact-registry-cleanup/report_metrics.json`

## 6) Что осталось сделать
- Дать права на удаление артефактов в Artifact Registry (см. следующий раздел).
- Повторить удаление 2 оставшихся orphan digest’ов.
- Выполнить постпроверки (ШАГ 4) и сформировать итоговый отчёт.
