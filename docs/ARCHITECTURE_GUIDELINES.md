# 🏗️ Руководство по архитектуре проекта

> **Цель:** Предотвратить необходимость масштабных рефакторингов в будущем
> **Целевая аудитория:** Разработчики, AI агенты, code reviewers

**Дата создания:** 2025-11-07
**Статус:** Действующий стандарт

---

## 📋 Содержание

1. [Основные принципы](#основные-принципы)
2. [Правила размера файлов](#правила-размера-файлов)
3. [Структура проекта](#структура-проекта)
4. [Композиция компонентов](#композиция-компонентов)
5. [State Management](#state-management)
6. [Testing](#testing)
7. [Чеклист перед коммитом](#чеклист-перед-коммитом)
8. [Инструменты автоматизации](#инструменты-автоматизации)
9. [Примеры хороших практик](#примеры-хороших-практик)

---

## Основные принципы

### 1. Single Responsibility Principle (SRP)

Каждый компонент/функция должна решать **одну задачу**.

**❌ Плохо:**
```typescript
// AdminContentEdit.tsx - 956 строк
// Делает всё: UI, валидация, API вызовы, состояние
function AdminContentEdit() {
  // 50 useState
  // 30 функций
  // 200 строк JSX
}
```

**✅ Хорошо:**
```typescript
// AdminContentEdit.tsx - 150 строк
// Только координация
function AdminContentEdit() {
  const { content, updateContent } = useContent();

  return (
    <>
      <ContentHeader />
      <ContentForm content={content} onUpdate={updateContent} />
      <ContentPreview content={content} />
    </>
  );
}
```

### 2. Don't Repeat Yourself (DRY)

Избегайте дублирования кода. Извлекайте общую логику.

**❌ Плохо:**
```typescript
// Tests.tsx
const testChains = buildTestChains(tests);

// AgeTests.tsx
const testChains = buildTestChains(ageTests);
// Дублирование ~150-200 строк рендеринга
```

**✅ Хорошо:**
```typescript
// TestCard.tsx - переиспользуемый компонент
export function TestCard({ test, chain }) {
  // Рендеринг теста
}

// Tests.tsx и AgeTests.tsx используют TestCard
```

### 3. Composition over Inheritance

Используйте композицию компонентов вместо наследования.

**✅ Хорошо:**
```typescript
<Modal>
  <ModalHeader title="Заголовок" />
  <ModalBody>
    <Form>...</Form>
  </ModalBody>
  <ModalFooter>
    <Button>Сохранить</Button>
  </ModalFooter>
</Modal>
```

---

## Правила размера файлов

### 🚦 Светофор размеров

| Строки | Статус | Действие |
|--------|--------|----------|
| **< 300** | 🟢 **Отлично** | Идеальный размер, продолжайте |
| **300-500** | 🟡 **Приемлемо** | Следите, не допускайте роста |
| **500-800** | 🟠 **Предупреждение** | Запланируйте рефакторинг |
| **> 800** | 🔴 **КРИТИЧНО** | Немедленно разбить! |

### Автоматическая проверка

```bash
# Найти все файлы > 500 строк
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500'
```

### Исключения

Разрешено > 500 строк только для:
- Типов и интерфейсов (`types.ts`)
- Констант и данных (`constants.ts`, `data/`)
- Конфигурации

---

## Структура проекта

### Текущая структура (функциональная)

```
src/
├── pages/           # Страницы-роуты
├── components/      # Переиспользуемые компоненты
├── hooks/           # Кастомные хуки
├── lib/             # Инфраструктура (Firebase, API)
├── utils/           # Вспомогательные функции
├── types/           # TypeScript типы
├── auth/            # Авторизация
└── data/            # Статичные данные
```

### Рекомендуемая структура (по фичам)

```
src/
├── features/
│   ├── notes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types.ts
│   │   └── index.ts
│   └── timeline/
│       └── ...
├── shared/          # Общие компоненты
│   ├── ui/          # UI компоненты (Button, Modal)
│   └── hooks/       # Общие хуки
├── lib/             # Инфраструктура
├── auth/            # Авторизация
└── types/           # Глобальные типы
```

**Преимущества:**
- ✅ Чёткие границы фич
- ✅ Легко найти код
- ✅ Можно удалить фичу целиком
- ✅ Масштабируемость

### Правила организации

1. **Файлы утилит фичи** → в `features/[feature]/utils/`
   ```
   ❌ src/utils/testImportExport.ts
   ✅ src/features/tests/utils/importExport.ts
   ```

2. **Типы фичи** → в `features/[feature]/types.ts`
   ```
   ❌ src/types/tests.ts (если используется только в тестах)
   ✅ src/features/tests/types.ts
   ```

3. **Общие типы** → в `src/types/`
   ```
   ✅ src/types/notes.ts (используется в tests, timeline, notes)
   ```

---

## Композиция компонентов

### Правило "7 ± 2"

Компонент не должен иметь больше **7-9 дочерних элементов** или **useState**.

**❌ Плохо:**
```typescript
function BigForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  // ... 20 useState

  return (
    <form>
      {/* 500 строк JSX */}
    </form>
  );
}
```

**✅ Хорошо:**
```typescript
// PersonalInfoForm.tsx
function PersonalInfoForm({ data, onChange }) {
  return (
    <FormSection>
      <Input name="name" value={data.name} onChange={onChange} />
      <Input name="email" value={data.email} onChange={onChange} />
      <Input name="age" value={data.age} onChange={onChange} />
    </FormSection>
  );
}

// ContactInfoForm.tsx
function ContactInfoForm({ data, onChange }) {
  return (
    <FormSection>
      <Input name="city" value={data.city} onChange={onChange} />
      <Input name="phone" value={data.phone} onChange={onChange} />
    </FormSection>
  );
}

// BigForm.tsx - 80 строк
function BigForm() {
  const { formData, updateField } = useFormState();

  return (
    <form>
      <PersonalInfoForm data={formData} onChange={updateField} />
      <ContactInfoForm data={formData} onChange={updateField} />
      <ProfileSettingsForm data={formData} onChange={updateField} />
      <FormActions />
    </form>
  );
}
```

### Атомарный дизайн

```
Atoms (атомы) → Button, Input, Label
Molecules (молекулы) → FormField (Input + Label)
Organisms (организмы) → LoginForm (FormField + FormField + Button)
Templates (шаблоны) → AuthLayout
Pages (страницы) → LoginPage
```

**Пример:**
```typescript
// atoms/Button.tsx
export function Button({ children, onClick, variant }) {
  return <button className={variant} onClick={onClick}>{children}</button>;
}

// molecules/FormField.tsx
export function FormField({ label, name, value, onChange }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} value={value} onChange={onChange} />
    </div>
  );
}

// organisms/LoginForm.tsx
export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={onSubmit}>
      <FormField label="Email" value={email} onChange={setEmail} />
      <FormField label="Password" value={password} onChange={setPassword} />
      <Button variant="primary">Войти</Button>
    </form>
  );
}
```

---

## Security, Roles & Logging

### Logging & Privacy

#### Правило использования debug утилит
Все продакшен-логи проходят через `src/lib/debug.ts` — хелпер учитывает `import.meta.env.DEV` (включён автоматически в `npm run dev`) и флаг `DEVLOG`/`VITE_DEVLOG`. В проде `debug*`-вызовы тихо игнорируются.

**✅ Правильно:**
```ts
import { debugLog, debugWarn, debugError } from '../lib/debug';

function handleSaveNote() {
  try {
    debugLog('[Notes] Saving note...', noteData);
    // ... логика сохранения
    debugLog('✅ Note saved successfully');
  } catch (err) {
    debugError('Error saving note', err); // ✅ Используем debugError
    alert('Ошибка при сохранении заметки');
  }
}
```

**❌ Неправильно:**
```ts
function handleSaveNote() {
  try {
    console.log('[Notes] Saving note...', noteData); // ❌ Запрещено!
    // ... логика
  } catch (err) {
    console.error('Error saving note', err); // ❌ Заблокирует коммит!
    alert('Ошибка при сохранении заметки');
  }
}
```

#### Автоматическая проверка
- **Husky `pre-commit`** запускает `npm run lint && npm run check-console`
- **`npm run check-console`** проверяет staged-файлы в `src/` и `functions/src/`
- **Блокируется коммит**, если найдены `console.*` вне `debug.ts`/`scripts/**`

**Пример ошибки при коммите:**
```bash
🚫 Обнаружены необёрнутые console.* в staged-файлах:
  src/pages/Notes.tsx:91: console.error('Error saving note', err);
Используйте debugLog/debugError/debugWarn или поправьте console.* в debug-утилитах.
husky - pre-commit script failed (code 1)
```

#### Дополнительные правила
- Прямые вызовы `console.*` запрещены в `src/*`, `shared/*` и `functions/src/*`
- В Cloud Functions используйте `functionsDebug*` из `functions/src/lib/debug.ts`
- Запрещено логировать: ID токены, email/UID, содержимое заметок, результаты тестов, env-переменные
- Для ошибок UI используйте `src/lib/errorHandler.ts`, `ErrorBoundary` и `ErrorToast`

**Включение отладки локально:**
```bash
DEVLOG=true npm run dev
# или
DEVLOG=true npm run build && npm run preview
```

### Access Control & Roles
- Роли: `student`, `admin`, `super-admin`.
- Storage Rules: `storage.rules` use `isAdminOrSuperAdmin()` so админы и супер-админы имеют одинаковый доступ к `assets/`, `tests/**` и `uploads`; синхронизируйте с UI.
- Клиент: используйте `useAuthStore` (`isAdmin`, `isSuperAdmin`) и не храните секреты (seed-коды и т.п.) в бандле.
- Cloud Functions: helper `ensureAdmin` обязан принимать `role === 'admin' || role === 'super-admin'`; каждая callable-функция вызывает его перед основной логикой, поэтому новые роли мгновенно вступают в силу.
- Firebase Rules: при изменении ролевой модели обновляйте `firestore.rules`, `storage.rules` и UI одновременно.
- Seed-код хранится только на стороне функций (`functions.config().admin.seed_code`). Для выдачи доступа super-admin или владелец проекта обновляют настройку SEED и вызывают `seedAdmin` на сервере; клиентская кнопка «Сделать меня админом» убрана. См. `docs/audit-backlog.md#L10` и `docs/TimelineGuide.md#Phase-6-QA-и-метрики` для процессов ротации и документации.

### QA / Smoke Tracking
- После каждого `npm run test`, `npm run build` и ручных smoke-сценариев (CRUD заметок, экспорт, создание события, админ-флоу) добавляйте строку в `docs/qa-smoke-log.md`.
- Формат: дата, сценарий/команда, результат, ответственный, ссылка на PR/коммит.
- Изменения без записи в логе считаются непроверенными.

### 🧱 Feature requirements для chunk-friendly UI
- Все новые фичи (особенно ленивые страницы типа `Timeline`, `Notes`, `TestsPage`) проектируются как композиция легковесного контейнера + отдельных визуальных блоков, каждая часть живёт в своём файле/папке.  
- Хуки и бизнес-логика (`useTimelineState`, `useTimelineHistory`, `dragDrop`, экспорт) должны находиться в `src/hooks` или спец-папках, которые можно динамически импортировать; UI-компонент получает только `props`.  
- Shared-хуки/компоненты не должны импортировать страницы и наоборот: это предотвращает попадание тяжелого JS в initial bundle.  
- Каждый lazy-блок оборачивается в `Suspense` + `PageLoader` и имеет понятный label (напр. `PageLoader label="Загрузка таймлайна"`), это нужно учитывать на этапе дизайна фичи.  
- При добавлении новой страницы или heavy-компонента сразу фиксируйте `manualChunks` в `vite.config.js` и описывайте chunk-архи в `docs/lazy-loading-migration.md`, чтобы сразу держать target 200-600 кБ.  
- Утилиты и константы, которые нужны сразу нескольким ленивым страницам (`removeUndefined`, `AGE_RANGE_*`, topic-helpers и т.п.), выносите в `src/utils/*`/`shared` и импортируйте напрямую из обычных модулей, а не через page-level chunk. Иначе один ленивый chunk может импортировать другой и по цепочке пытаться прочитать `const`, ещё не инициализированный, что ведёт к `ReferenceError: Cannot access uninitialized variable` на проде.

---

## State Management

**Статус:** Migration to Zustand completed (2025-11-09)

### Текущий стек

- ✅ **Zustand** - основное решение для глобального состояния приложения
  - `useAuthStore` - авторизация (user, loading, roles, methods)
  - `useTestStore` - тестирование (progress, answers, scoring)
  - Redux DevTools integration для отладки
  - Atomic селекторы для оптимизации ре-рендеров

- ⚠️ **Context API** - legacy, постепенно мигрируется на Zustand
  - `AuthProvider` - сейчас compatibility wrapper над `useAuthStore`

### Иерархия выбора

```
1. Local state (useState) → для UI состояния компонента
2. Compound components → для связанных компонентов
3. Custom hooks → для переиспользуемой логики
4. Zustand → для глобального состояния (PREFERRED)
5. Context API → только для подсистем (темизация, локализация)
```

### Когда использовать что

#### 1. **useState** - локальное UI состояние

```typescript
// ✅ Хорошо для:
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  // Состояние используется только здесь
}
```

#### 2. **Custom Hook** - переиспользуемая логика

```typescript
// ✅ Хорошо для:
function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    // ...
  };

  return { notes, loading, fetchNotes };
}

// Используется в Notes.tsx, Profile.tsx
```

#### 3. **Context** - подсистема

```typescript
// ✅ Хорошо для:
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Логика авторизации
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Используется по всему приложению
```

#### 4. **Zustand** - глобальное состояние (ПРЕДПОЧТИТЕЛЬНО)

```typescript
// ✅ Хорошо для:
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user }),
      logout: async () => {
        await signOut(auth);
        set({ user: null });
      },
    }),
    { name: 'AuthStore' }
  )
);

// Использование с atomic селекторами:
function UserMenu() {
  const user = useAuthStore((state) => state.user); // ✅ re-render только при изменении user
  const logout = useAuthStore((state) => state.logout);
  // ...
}
```

**Best practices для Zustand:**
- ✅ Используйте atomic селекторы для минимизации ре-рендеров
- ✅ Включайте devtools middleware для отладки
- ✅ Создавайте отдельные stores для разных доменов (auth, tests, etc.)
- ❌ Избегайте получения всего store: `useStore((state) => state)` // infinite loops!

### Правило "Prop Drilling"

Если пропсы передаются через **> 2 уровня** → используйте Context или хук.

**❌ Плохо:**
```typescript
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user} />
    </GrandChild>
  </Child>
</Parent>
```

**✅ Хорошо:**
```typescript
const { user } = useAuth();
// Любой компонент может получить user
```

---

## Testing

**Статус:** Test infrastructure established (2025-11-09)

**Цель проекта:** Стремление к полному покрытию кода unit тестами

### Текущий стек

- ✅ **Vitest** - современный, быстрый test runner (интеграция с Vite)
- ✅ **@testing-library/react** - тестирование React компонентов
- ✅ **@testing-library/jest-dom** - дополнительные matchers для DOM
- ✅ **jsdom** - браузерная среда для тестов

### Структура тестов

```
src/
├── utils/
│   ├── testChainHelpers.ts
│   └── testChainHelpers.test.ts         ← unit test рядом с файлом
├── components/
│   ├── TestCard.tsx
│   └── TestCard.test.tsx                 ← component test рядом с компонентом
└── tests/
    └── setup.ts                          ← глобальная настройка тестов
```

### Команды для тестирования

```bash
npm test              # watch mode - тесты перезапускаются при изменениях
npm run test:ui       # UI mode - визуальный интерфейс
npm run test:coverage # запуск с отчетом покрытия
```

### Что тестировать

#### ✅ Обязательно покрыть тестами:

1. **Utility functions** - чистые функции с предсказуемым output
   ```typescript
   // testChainHelpers.test.ts
   describe('buildTestChains', () => {
     it('should return empty array for empty input', () => {
       expect(buildTestChains([])).toEqual([]);
     });
   });
   ```

2. **Custom hooks** - переиспользуемая логика
   ```typescript
   // useTestProgress.test.ts
   import { renderHook, act } from '@testing-library/react';

   describe('useTestProgress', () => {
     it('should increment score', () => {
       const { result } = renderHook(() => useTestProgress(10));
       act(() => {
         result.current.incrementScore();
       });
       expect(result.current.score).toBe(1);
     });
   });
   ```

3. **Validation logic** - критически важно для корректности
   ```typescript
   // validators.test.ts
   describe('validateEmail', () => {
     it('should accept valid email', () => {
       expect(validateEmail('test@example.com')).toBe(true);
     });

     it('should reject invalid email', () => {
       expect(validateEmail('invalid')).toBe(false);
     });
   });
   ```

4. **Business logic** - сложные вычисления, преобразования данных
   ```typescript
   // testScoring.test.ts
   describe('calculateScore', () => {
     it('should return 100% for all correct answers', () => {
       const answers = [true, true, true];
       expect(calculateScore(answers)).toBe(100);
     });
   });
   ```

#### ⚠️ Опционально (по ресурсам):

1. **UI components** - snapshots, interaction tests
2. **Integration tests** - взаимодействие компонентов
3. **E2E tests** - полные пользовательские сценарии (Playwright/Cypress)

### Best practices

**Структура теста (AAA pattern):**
```typescript
it('should do something', () => {
  // Arrange - подготовка
  const input = [1, 2, 3];

  // Act - действие
  const result = myFunction(input);

  // Assert - проверка
  expect(result).toEqual([2, 4, 6]);
});
```

**Naming convention:**
```typescript
// ✅ Хорошо - описательно
it('should return empty array for empty input')
it('should throw error when user is not authenticated')

// ❌ Плохо - неясно
it('works')
it('test1')
```

**Coverage goals:**
- Utilities: 90%+
- Hooks: 80%+
- Components: 60%+ (критические компоненты 80%+)
- Общее покрытие: стремимся к 70%+

### Текущее покрытие

**Covered (2025-11-09):**
- ✅ `testChainHelpers.ts` - 3 tests
- ✅ `testAppearance.ts` - 6 tests

**TODO (приоритет):**
- ⏳ `useTestProgress.ts`
- ⏳ `useAnswerValidation.ts`
- ⏳ `useQuestionNavigation.ts`
- ⏳ Custom hooks (useNotes, useTopics, useTests)
- ⏳ Validation functions

---

## Чеклист перед коммитом

Перед каждым коммитом проверьте:

### 📏 Размер и структура

- [ ] Файл < 500 строк? (или есть веская причина)
- [ ] Компонент < 300 строк?
- [ ] Не более 7-9 useState в компоненте?
- [ ] Функция < 50 строк?
- [ ] Файлы в правильных папках? (утилиты фичи в `features/[feature]/utils/`)

### 🧩 Архитектура

- [ ] Компонент решает одну задачу (SRP)?
- [ ] Нет дублирования кода (DRY)?
- [ ] Логика извлечена в хуки?
- [ ] UI отделён от бизнес-логики?
- [ ] Prop drilling < 2 уровней?

### 📝 Документация

- [ ] Есть JSDoc для сложных функций?
- [ ] Есть комментарии для нетривиальной логики?
- [ ] README обновлён (если добавлена новая фича)?

### 🔒 TypeScript

- [ ] Нет использования `any`?
- [ ] Все пропсы типизированы?
- [ ] Интерфейсы экспортируются?
- [ ] TypeScript компилируется без ошибок?

### ✅ Качество

- [ ] Нет `console.*` (используйте `debugLog`, `debugWarn`, `debugError` из `src/lib/debug.ts`)?
- [ ] Pre-commit hook проверки проходят (`npm run check-console`)?
- [ ] Нет закомментированного кода?
- [ ] Imports отсортированы?
- [ ] Форматирование Prettier применено?

### 🧪 Тестирование

- [ ] Код вручную протестирован?
- [ ] Edge cases учтены?
- [ ] Unit-тесты написаны (для сложной логики)?
- [ ] Результаты (unit/build/smoke) записаны в `docs/qa-smoke-log.md` с ссылкой на коммит?
- [ ] Проверки ролей и правил логирования соблюдены?

---

## Инструменты автоматизации

### 1. ESLint правила

Добавьте в `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    // Ограничение размера файлов
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],

    // Ограничение сложности функций
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true }],

    // Ограничение параметров функции
    'max-params': ['warn', 4],

    // Запрет any
    '@typescript-eslint/no-explicit-any': 'error',

    // Обязательные типы для функций
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
    }],
  },
};
```

### 2. Pre-commit hooks (Husky)

```bash
npm install --save-dev husky lint-staged
```

`.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Проверка размера файлов
echo "Checking file sizes..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$'); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 500 ]; then
    echo "❌ $file has $lines lines (max 500)"
    exit 1
  fi
done

# Lint staged files
npx lint-staged
```

### 3. Lint-staged конфигурация

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 4. CI/CD проверка

`.github/workflows/size-check.yml`:
```yaml
name: File Size Check

on: [pull_request]

jobs:
  check-sizes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check file sizes
        run: |
          find src -name "*.tsx" -o -name "*.ts" | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt 800 ]; then
              echo "❌ $file: $lines lines (critical)"
              exit 1
            elif [ "$lines" -gt 500 ]; then
              echo "⚠️  $file: $lines lines (warning)"
            fi
          done
```

---

## Примеры хороших практик

### Пример 1: Рефакторинг монолитного компонента

**До (956 строк):**
```typescript
// AdminContentEdit.tsx
function AdminContentEdit() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  // ... 30 useState

  const handleSave = async () => {
    // 50 строк валидации
    // 30 строк API вызова
    // 20 строк обработки ошибок
  };

  return (
    <div>
      {/* 500 строк JSX */}
    </div>
  );
}
```

**После (150 строк):**
```typescript
// pages/AdminContentEdit.tsx
function AdminContentEdit() {
  const { contentId } = useParams();
  const { content, loading, error, updateContent } = useContent(contentId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ContentEditLayout>
      <ContentEditHeader content={content} />
      <ContentEditForm
        content={content}
        onUpdate={updateContent}
      />
      <ContentEditPreview content={content} />
    </ContentEditLayout>
  );
}

// hooks/useContent.ts (100 строк)
function useContent(id: string) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = async () => {
    // Загрузка
  };

  const updateContent = async (updates) => {
    // Обновление с валидацией
  };

  useEffect(() => {
    fetchContent();
  }, [id]);

  return { content, loading, error, updateContent };
}

// components/ContentEditForm.tsx (120 строк)
function ContentEditForm({ content, onUpdate }) {
  return (
    <Form onSubmit={onUpdate}>
      <TitleField value={content.title} onChange={...} />
      <BodyField value={content.body} onChange={...} />
      <TagsField value={content.tags} onChange={...} />
      <PublishToggle value={content.isPublished} onChange={...} />
    </Form>
  );
}
```

**Результат:**
- 956 → 370 строк (61% сокращение)
- Логика в хуке (тестируемо)
- Компоненты переиспользуемые
- Легко читать и поддерживать

### Пример 2: Извлечение общей логики

**До (дублирование):**
```typescript
// Tests.tsx
const testChains = useMemo(() => {
  const map = new Map();
  for (const test of tests) {
    map.set(test.id, test);
  }
  // ... 50 строк логики
}, [tests]);

// AgeTests.tsx
const testChains = useMemo(() => {
  const map = new Map();
  for (const test of ageTests) {
    map.set(test.id, test);
  }
  // ... те же 50 строк логики
}, [ageTests]);
```

**После (переиспользование):**
```typescript
// hooks/useTestChains.ts
export function useTestChains(tests: Test[]) {
  return useMemo(() => {
    const map = new Map();
    for (const test of tests) {
      map.set(test.id, test);
    }
    // ... логика
    return chains;
  }, [tests]);
}

// Tests.tsx
const testChains = useTestChains(tests);

// AgeTests.tsx
const testChains = useTestChains(ageTests);
```

**Результат:**
- Нет дублирования
- Логика тестируемая
- Изменения в одном месте

### Пример 3: Правильная структура папок

**До:**
```
src/
├── utils/
│   ├── testImportExport.ts  ❌ Относится к тестам
│   ├── testAppearance.ts    ❌ Относится к тестам
│   └── mediaUpload.ts       ✅ Общая утилита
└── data/
    ├── authorsTestData.ts   ❌ Legacy, к удалению
```

**После:**
```
src/
├── features/
│   └── tests/
│       ├── utils/
│       │   ├── importExport.ts  ✅ Утилиты тестов
│       │   └── appearance.ts    ✅ Утилиты тестов
│       └── data/
│           └── (удалено, миграция в Firestore)
└── shared/
    └── utils/
        └── mediaUpload.ts       ✅ Общая утилита
```

---

## Заключение

### Ключевые takeaways

1. **Размер имеет значение** - Компонент > 500 строк = проблема
2. **Разделяй и властвуй** - SRP, DRY, композиция
3. **Извлекайте логику** - Хуки делают код тестируемым
4. **Организуйте по фичам** - Легче масштабировать
5. **Автоматизируйте проверки** - ESLint, Husky, CI/CD

### Что делать с существующим кодом?

См. планы рефакторинга:
- [TESTS_REFACTORING_PLAN.md](./TESTS_REFACTORING_PLAN.md)
- [TIMELINE_REFACTORING_PLAN.md](./TIMELINE_REFACTORING_PLAN.md)
- [CORE_REFACTORING_PLAN.md](./CORE_REFACTORING_PLAN.md)

### Для новых фич

Перед началом работы:
1. Прочитайте этот документ ✅
2. Следуйте [чеклисту перед коммитом](#чеклист-перед-коммитом) ✅
3. Проверяйте размер файлов (`wc -l`) ✅
4. Код-ревью с фокусом на архитектуру ✅

---

**Последнее обновление:** 2025-11-07
**Следующий пересмотр:** После завершения рефакторингов
