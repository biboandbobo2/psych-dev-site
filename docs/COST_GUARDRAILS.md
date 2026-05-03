# Cost Guardrails

> Цель: предотвратить рост затрат на хранение и деплойные артефакты.
> **Последнее обновление:** 2026-03-17

## Где смотреть расходы

### GCP Billing
- Reports → фильтр по `Artifact Registry` и `Cloud Run`.
- Сравнивать недели с пиками деплоев.
- Для разбивки по `Service -> SKU` на своей админ-странице нужен Cloud Billing export в BigQuery.

### Artifact Registry
- Размер repo (sizeBytes) и рост количества digest'ов.
- Особое внимание cache-образам и untagged версиям.

### Cloud Run
- Количество ревизий на сервис.
- Доля ревизий с `traffic=0%`.

## Политика Artifact Registry (рекомендованный минимум)

**Базовая политика:** удалять `untagged` версии старше `N` дней (например, `N=14`).
- Tagged версии не удаляются автоматически.
- Исключать критичные теги (`latest`, `prod`, `release*`) из авто-удаления.
- Перед включением политики — проверить фактических потребителей образов.

**Почему это безопасно:**
- Untagged версии обычно не используются напрямую.
- Сохраняется возможность отката по tag'ам и активным digest'ам.

## Политика Cloud Run revisions

Cloud Run не имеет встроенной retention-политики. Рекомендуемое правило:
- Всегда сохранять активные ревизии (`traffic>0`).
- Дополнительно хранить последние `KEEP_LAST_N` ревизий для отката.
- Удалять ревизии с `traffic=0%`, старше `X` дней.

Если автоматизация не настроена:
- Делать ручную чистку после активных релизов.
- Фиксировать изменения в [reports/CLEANUP_LOG.md](reports/CLEANUP_LOG.md).

## Бюджетные лимиты + Telegram уведомления

**Цель:** предупреждение при $1 и жёсткая остановка при $5.

Что настроено (2026-02-01):
- Бюджет: `psych-dev-site-prod budget guardrail`, $5/мес, период — месяц.
- Пороги: 20% (≈$1) и 100% (=$5).
- Pub/Sub topic: `billing-budget-alerts`.
- Cloud Function: `billingBudgetAlert` (Pub/Sub → Telegram → disable billing).

Что добавлено (2026-03-17):
- `billingBudgetAlert` дедуплицирует повторные сообщения по одному threshold-бакету и месяцу.
- Если расход не растёт, Telegram-уведомления о том же threshold перестают повторяться.
- Для одного threshold-бакета отправляется не больше `BILLING_ALERT_MAX_MESSAGES_PER_THRESHOLD` сообщений.
- Superadmin-страница может читать breakdown по `Service -> SKU` из Cloud Billing export в BigQuery.

Переменные окружения (обязательные):
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `BILLING_ACCOUNT_ID`

Опционально:
- `BILLING_PROJECT_ID` (иначе берётся `GCLOUD_PROJECT`)
- `BILLING_ALERT_USD` (default 1)
- `BILLING_HARD_STOP_USD` (default 5)
- `BILLING_ALERT_THRESHOLD` (default 0.2)
- `BILLING_HARD_STOP_THRESHOLD` (default 1)
- `BILLING_ALERT_MAX_MESSAGES_PER_THRESHOLD` (default 2)
- `BILLING_EXPORT_BQ_PROJECT_ID` (project с billing export dataset; по умолчанию текущий project)
- `BILLING_EXPORT_BQ_DATASET` (если нужно явно указать dataset)
- `BILLING_EXPORT_BQ_TABLE` (если нужно явно указать export table)
- `BILLING_EXPORT_BQ_LOCATION` (например `EU`, если BigQuery query требует location)
- `BILLING_SUMMARY_LOOKBACK_DAYS` (default 14)
- `BILLING_SUMMARY_MAX_SERVICES` (default 8)
- `BILLING_SUMMARY_MAX_SKUS_PER_SERVICE` (default 6)

Важно:
- При достижении $5 функция отключает биллинг проекта (жёсткий стоп).
- Это может остановить сервисы; повторное включение биллинга — вручную.
- Отключение биллинга не гарантирует сохранность всех ресурсов.
- Budget alerts сами по себе не являются hard cap; дедуп и disable-billing остаются best-effort автоматикой поверх budget notifications.

## Superadmin Billing Panel

- Источник данных: Cloud Billing export в BigQuery.
- Путь в UI: `/superadmin`.
- Breakdown строится по текущему месяцу и группируется как `Service -> SKU`.
- Если dataset/table не заданы через env, система сначала пытается авто-обнаружить export table вида `gcp_billing_export_v1_*`.
- Если export ещё не включён, superadmin-панель показывает diagnostic вместо пустой статистики.

## Чек-лист после дня интенсивных деплоев
- Проверить количество ревизий Cloud Run.
- Проверить рост digest'ов в Artifact Registry.
- Убедиться, что `KEEP_LAST_N` соблюдён.
- Обновить [reports/CLEANUP_SUMMARY.md](reports/CLEANUP_SUMMARY.md).

## Чек-лист перед публикацией/PR
- Убедиться, что `.env.*` не tracked (кроме `.env.example`).
- Проверить `.gitignore` на env/keys/artifacts.
- Запустить быстрый secret-scan по репозиторию.

**См. также:**
- `docs/SECURITY_BASELINE.md`
- `docs/POSTMORTEM_COST_AND_SECURITY.md`
