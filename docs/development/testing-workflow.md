# Testing & Validation Workflow

## Автоматические проверки

### Pre-commit (перед коммитом)

Запускается автоматически при каждом `git commit`:

```bash
✓ ESLint (проверка кода)
✓ check-console (запрет console.*)
✓ check:init (проверка инициализации модулей)
```

### Pre-push (перед пушем)

Запускается автоматически при каждом `git push` через `npm run validate`:

```bash
✓ lint
✓ check-console (full-repo, src/+api/+functions/src/)
✓ check:init
✓ check:functions-runtime
✓ build (production сборка)
```

Integration-тесты в pre-push не входят (требуют Java 11+ и могут быть медленными). Запускайте `npm run test:integration` отдельно перед важными PR.

## Ручные проверки

### Быстрая валидация (рекомендуется перед коммитом)

```bash
npm run validate
```

Запускает:
- ESLint
- Проверка console.*
- Проверка инициализации модулей
- Production build

**Время выполнения:** ~5-10 секунд

### Полная валидация (рекомендуется перед пушем)

```bash
npm run validate:full
```

Запускает всё из `validate` + unit тесты

**Время выполнения:** ~15-30 секунд

### E2E тесты на production build

```bash
npm run test:e2e:prod
```

Создаёт production build и запускает smoke тесты в Playwright.

**Время выполнения:** ~30-60 секунд

### Integration тесты (Firebase эмуляторы)

```bash
npm run test:integration
```

Автоматически поднимает Firebase эмуляторы (Firestore, Auth, Storage), гоняет тесты в `tests/integration/`, гасит эмуляторы. Все тесты бесплатные — только локальные эмуляторы, без AI-API и реальных Firebase project-вызовов.

**Требования:** Java 11+ (для эмуляторов), `firebase-tools` (через `npm install`), свободные порты `8080/9099/9199`.

**Время выполнения:** ~3-5 секунд (без cold start эмуляторов).

**Watch-режим для разработки** (требует поднятых эмуляторов):
```bash
# Терминал 1
npm run firebase:emulators:start

# Терминал 2
npm run test:integration:watch
```

**Подробности и список тестов:** [../guides/testing-system.md](../guides/testing-system.md#integration-tests).

## Рекомендуемый workflow

### 1. Во время разработки

```bash
# Запускайте dev сервер
npm run dev

# Периодически проверяйте код
npm run lint
npm run check-console
```

### 2. Перед коммитом

```bash
# Опционально: быстрая проверка всего
npm run validate

# Коммит (автоматически запустится pre-commit hook)
git commit -m "feat: add new feature"
```

### 3. Перед пушем

```bash
# Рекомендуется: полная валидация
npm run validate:full

# Опционально: E2E тесты
npm run test:e2e:prod

# Пуш (автоматически запустится pre-push hook)
git push
```

## Отладка проблем

### Если pre-commit hook не проходит

1. Проверьте ошибки в выводе
2. Исправьте проблемы
3. Добавьте изменения: `git add .`
4. Повторите коммит

### Пропуск хуков (не рекомендуется!)

```bash
# Пропустить pre-commit
git commit --no-verify -m "message"

# Пропустить pre-push
git push --no-verify
```

⚠️ Используйте только в экстренных случаях!

## CI/CD интеграция

Все эти проверки также должны запускаться в CI/CD pipeline:

```yaml
# .github/workflows/ci.yml (пример)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run validate:full
      - run: npm run test:e2e:prod
```

## Быстрые команды

| Команда | Описание | Время |
|---------|----------|-------|
| `npm run lint` | ESLint проверка | 2-3 сек |
| `npm run check-console` | Проверка console.* | 1 сек |
| `npm run check:init` | Проверка инициализации | 1 сек |
| `npm run build` | Production build | 3-5 сек |
| `npm run validate` | Всё выше вместе | 5-10 сек |
| `npm run validate:full` | validate + unit tests (без integration) | 15-30 сек |
| `npm test` | Unit тесты (watch mode) | - |
| `npm run test:ci` | Все тесты однократно (включая integration без эмуляторов — упадут) | 5-10 сек |
| `npm run test:integration` | Integration tests с автозапуском эмуляторов | 3-5 сек |
| `npm run test:integration:watch` | Integration в watch (требует firebase:emulators:start) | - |
| `npm run test:e2e` | E2E тесты (dev) | 10-20 сек |
| `npm run test:e2e:prod` | E2E тесты (prod) | 30-60 сек |

---

**Последнее обновление:** 2026-04-27
