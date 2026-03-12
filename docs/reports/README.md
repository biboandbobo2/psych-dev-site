# Отчёты и артефакты

В этой папке лежат разовые документы, которые не являются постоянной инженерной базой знаний, но нужны для истории решений, аудита и операционного контекста.

## Аудиты перед публикацией

- [CODE_REVIEW_2026-03-12.md](CODE_REVIEW_2026-03-12.md) — полный локальный code review с findings и проверками
- [PRE_GITHUB_AUDIT_REPORT.md](PRE_GITHUB_AUDIT_REPORT.md) — итоговый pre-GitHub аудит
- [PRE_GITHUB_AUDIT_EVIDENCE.md](PRE_GITHUB_AUDIT_EVIDENCE.md) — доказательства и сырые наблюдения к аудиту
- [PRE_GITHUB_CHANGES_PLAN.md](PRE_GITHUB_CHANGES_PLAN.md) — план подготовки репозитория к публикации
- [PRE_GITHUB_CHANGES_DONE.md](PRE_GITHUB_CHANGES_DONE.md) — что было сделано по этому плану

## Инфраструктурные cleanup-отчёты

- [ARTIFACT_REGISTRY_INVESTIGATION.md](ARTIFACT_REGISTRY_INVESTIGATION.md) — инвентарь и анализ Artifact Registry
- [ARTIFACT_REGISTRY_CLEANUP_PLAN.md](ARTIFACT_REGISTRY_CLEANUP_PLAN.md) — план cleanup-прохода
- [CLEANUP_LOG.md](CLEANUP_LOG.md) — пошаговый операционный лог cleanup
- [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md) — краткий итог cleanup и метрики до/после

## Сгенерированные инвентари

- [PROJECT_MAP.md](PROJECT_MAP.md) — сгенерированная карта структуры проекта
- [verification-report.md](verification-report.md) — отчёт по сверке контента

## Правило размещения

Если документ:

- описывает одноразовый аудит, cleanup, миграцию или инвентарь;
- не является каноническим guide/reference/process документом;
- может устареть без влияния на ежедневную разработку,

его место в `docs/reports/`, а не в корне репозитория.

**Последнее обновление:** 2026-03-12
