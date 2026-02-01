# Cost Guardrails

> Цель: предотвратить рост затрат на хранение и деплойные артефакты.
> **Последнее обновление:** 2026-01-17

## Где смотреть расходы

### GCP Billing
- Reports → фильтр по `Artifact Registry` и `Cloud Run`.
- Сравнивать недели с пиками деплоев.

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
- Фиксировать изменения в `CLEANUP_LOG.md`.

## Бюджетные лимиты + Telegram уведомления

**Цель:** предупреждение при $1 и жёсткая остановка при $5.

Что настроено (2026-02-01):
- Бюджет: `psych-dev-site-prod budget guardrail`, $5/мес, период — месяц.
- Пороги: 20% (≈$1) и 100% (=$5).
- Pub/Sub topic: `billing-budget-alerts`.
- Cloud Function: `billingBudgetAlert` (Pub/Sub → Telegram → disable billing).

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

Важно:
- При достижении $5 функция отключает биллинг проекта (жёсткий стоп).
- Это может остановить сервисы; повторное включение биллинга — вручную.
- Отключение биллинга не гарантирует сохранность всех ресурсов.

## Чек-лист после дня интенсивных деплоев
- Проверить количество ревизий Cloud Run.
- Проверить рост digest'ов в Artifact Registry.
- Убедиться, что `KEEP_LAST_N` соблюдён.
- Обновить `CLEANUP_SUMMARY.md`.

## Чек-лист перед публикацией/PR
- Убедиться, что `.env.*` не tracked (кроме `.env.example`).
- Проверить `.gitignore` на env/keys/artifacts.
- Запустить быстрый secret-scan по репозиторию.

**См. также:**
- `docs/SECURITY_BASELINE.md`
- `docs/POSTMORTEM_COST_AND_SECURITY.md`
