# 🔧 План рефакторинга TestEditorForm и TestEditorModal

> **Дата создания:** 2025-11-09
> **Статус:** 📋 В работе
> **Цель:** Уменьшить TestEditorForm (1033→~300) и TestEditorModal (1009→~400)

---

## 📊 Текущее состояние

### TestEditorForm.tsx (1033 строки)

**Проблемы:**
- ❌ **21 useState** - слишком много state в одном компоненте
- ❌ **6 useEffect** - сложная логика синхронизации
- ❌ **20+ обработчиков** - запутанная логика
- ✅ Уже есть подкомпоненты (TestAppearanceEditor, TestQuestionsManager, etc.)
- ⚠️ Логика theme/appearance тесно связана с основной логикой

**State группы:**
1. **Основные поля** (7): title, rubric, prerequisiteTestId, requiredPercentage, questionCount, questions, currentStatus
2. **Appearance** (2): appearance, appearanceBullets
3. **Next Level** (2): isNextLevel, showBadgeConfig
4. **Theme** (5): themePresetId, mainColor, badgeLockedToPrimary, themeOverrides, themeAdvancedOpen
5. **Input validation** (8): questionCountInput, questionCountError, thresholdInput, thresholdError, previousTestIdInput, previousTestQuery, debouncedPreviousTestQuery, previousTestError
6. **UI** (2): loading, saving

### TestEditorModal.tsx (1009 строк)

**Проблемы:**
- ❌ **12 useState** - много state
- ❌ **7 useEffect** - сложная синхронизация
- ❌ Огромный компонент совмещает: список тестов + фильтрацию + CRUD + импорт/экспорт
- ❌ URL sync логика встроена в компонент
- ❌ Фильтрация и сортировка - сложная логика

**State группы:**
1. **Данные** (3): tests, loading, error
2. **Навигация** (1): selectedTestId
3. **Фильтры** (4): filters, filterOpen, filterDraft, searchParams
4. **Кэш** (1): nextLevelCache
5. **UI feedback** (1): feedback
6. **Delete** (2): pendingDelete, isDeleting
7. **Import** (1): importedTest

---

## 🎯 План рефакторинга TestEditorForm.tsx

**Цель:** 1033 → ~300-350 строк

### Этап 1: Создать hooks для state management

**Создать файл:** `src/components/tests/editor/hooks/useTestEditorForm.ts` (~150 строк)

```typescript
export function useTestEditorForm(testId: string | null, importedData) {
  // Все основные поля (title, rubric, questionCount, questions, etc.)
  // Вернуть: { form: {...fields}, setters: {...}, handlers: {...} }
}
```

**Создать файл:** `src/components/tests/editor/hooks/useTestTheme.ts` (~100 строк)

```typescript
export function useTestTheme() {
  // Theme state (presetId, mainColor, overrides, etc.)
  // Handlers (handlePresetChange, handleRandomizeTheme, etc.)
}
```

**Создать файл:** `src/components/tests/editor/hooks/useTestPrerequisite.ts` (~80 строк)

```typescript
export function useTestPrerequisite(existingTests: Test[]) {
  // Prerequisite logic (previousTestQuery, debounced search, validation)
  // Filtered tests, handlers
}
```

**Создать файл:** `src/components/tests/editor/hooks/useTestSave.ts` (~150 строк)

```typescript
export function useTestSave(testId, form, theme, appearance) {
  // Save logic (handleSaveDraft, handlePublish, handleUnpublish)
  // Validation, API calls
}
```

### Этап 2: Извлечь вспомогательные компоненты

**Создать:** `src/components/tests/editor/TestThemeSection.tsx` (~120 строк)
- Обёртка для theme UI
- Использует useTestTheme hook
- Включает TestAppearanceEditor

**Создать:** `src/components/tests/editor/TestFormHeader.tsx` (~40 строк)
- Заголовок модального окна
- Кнопка закрытия

### Этап 3: Рефакторинг главного компонента

**TestEditorForm.tsx** (~300 строк):
```typescript
export function TestEditorForm({ testId, onClose, onSaved, existingTests, importedData }) {
  const form = useTestEditorForm(testId, importedData);
  const theme = useTestTheme();
  const prerequisite = useTestPrerequisite(existingTests);
  const { saving, handleSaveDraft, handlePublish, handleUnpublish } = useTestSave(...);

  return (
    <div>
      <TestFormHeader onClose={onClose} title={...} />
      <TestBasicMetadata {...form} />
      <TestPrerequisiteConfig {...prerequisite} />
      <TestQuestionsManager {...form.questions} />
      <TestThemeSection {...theme} />
      <TestActionButtons {...handlers} />
    </div>
  );
}
```

---

## 🎯 План рефакторинга TestEditorModal.tsx

**Цель:** 1009 → ~400 строк

### Этап 1: Создать hooks

**Создать файл:** `src/components/tests/modal/hooks/useTestsList.ts` (~100 строк)

```typescript
export function useTestsList() {
  // tests, loading, error
  // loadTests, refreshTests
}
```

**Создать файл:** `src/components/tests/modal/hooks/useTestsFilters.ts` (~120 строк)

```typescript
export function useTestsFilters(searchParams, setSearchParams) {
  // filters state, filterDraft
  // URL sync logic
  // applyFilters, resetFilters
}
```

**Создать файл:** `src/components/tests/modal/hooks/useTestImportExport.ts` (~80 строк)

```typescript
export function useTestImportExport() {
  // importedTest state
  // handleFileChange, handleDownloadTemplate
}
```

**Создать файл:** `src/components/tests/modal/hooks/useTestDelete.ts` (~60 строк)

```typescript
export function useTestDelete(onDeleted: () => void) {
  // pendingDelete, isDeleting
  // handleDelete, confirmDelete
}
```

### Этап 2: Извлечь UI компоненты

**Создать:** `src/components/tests/modal/TestsListHeader.tsx` (~80 строк)
- Заголовок, кнопка создания, импорт/экспорт

**Создать:** `src/components/tests/modal/TestsFilterPanel.tsx` (~150 строк)
- Фильтры (статус, рубрика, количество вопросов, сортировка)
- Использует useTestsFilters

**Создать:** `src/components/tests/modal/TestsListTable.tsx` (~120 строк)
- Таблица тестов
- Клик по тесту, кнопка удаления

**Создать:** `src/components/tests/modal/TestDeleteConfirmDialog.tsx` (~40 строк)
- Диалог подтверждения удаления

### Этап 3: Рефакторинг главного компонента

**TestEditorModal.tsx** (~400 строк):
```typescript
export function TestEditorModal({ onClose }) {
  const { tests, loading, error, refreshTests } = useTestsList();
  const filters = useTestsFilters(searchParams, setSearchParams);
  const importExport = useTestImportExport();
  const deleteTest = useTestDelete(refreshTests);
  const [selectedTestId, setSelectedTestId] = useState(null);

  const filteredTests = useMemo(() => applyFiltersLogic(tests, filters), [tests, filters]);

  if (selectedTestId) {
    return <TestEditorForm testId={selectedTestId} onClose={...} onSaved={...} />;
  }

  return (
    <div>
      <TestsListHeader {...importExport} onCreateNew={...} />
      <TestsFilterPanel {...filters} />
      <TestsListTable tests={filteredTests} onSelect={...} onDelete={...} />
      <TestDeleteConfirmDialog {...deleteTest} />
    </div>
  );
}
```

---

## 📋 Порядок выполнения

### План A: TestEditorForm сначала

1. ✅ Этап 1.1: Создать `useTestEditorForm` hook
2. ✅ Этап 1.2: Создать `useTestTheme` hook
3. ✅ Этап 1.3: Создать `useTestPrerequisite` hook
4. ✅ Этап 1.4: Создать `useTestSave` hook
5. ✅ Этап 2.1: Создать `TestThemeSection` component
6. ✅ Этап 2.2: Создать `TestFormHeader` component
7. ✅ Этап 3: Рефакторинг `TestEditorForm.tsx`
8. ✅ Тестирование, commit

### План B: TestEditorModal после

9. ✅ Этап 1.1: Создать `useTestsList` hook
10. ✅ Этап 1.2: Создать `useTestsFilters` hook
11. ✅ Этап 1.3: Создать `useTestImportExport` hook
12. ✅ Этап 1.4: Создать `useTestDelete` hook
13. ✅ Этап 2.1: Создать `TestsListHeader` component
14. ✅ Этап 2.2: Создать `TestsFilterPanel` component
15. ✅ Этап 2.3: Создать `TestsListTable` component
16. ✅ Этап 2.4: Создать `TestDeleteConfirmDialog` component
17. ✅ Этап 3: Рефакторинг `TestEditorModal.tsx`
18. ✅ Тестирование, commit

---

## 🎯 Ожидаемые результаты

### TestEditorForm.tsx

| Метрика | Было | Цель | Улучшение |
|---------|------|------|-----------|
| **Строки** | 1033 | ~300-350 | **-68%** |
| **useState** | 21 | 0 (в хуках) | ✅ |
| **useEffect** | 6 | 1-2 | ✅ |
| **Hooks созданы** | - | 4 | ✅ |
| **Компоненты созданы** | - | 2 | ✅ |

### TestEditorModal.tsx

| Метрика | Было | Цель | Улучшение |
|---------|------|------|-----------|
| **Строки** | 1009 | ~400 | **-60%** |
| **useState** | 12 | 1-2 | ✅ |
| **useEffect** | 7 | 2-3 | ✅ |
| **Hooks созданы** | - | 4 | ✅ |
| **Компоненты созданы** | - | 4 | ✅ |

### Общий итог

- **Удалено:** ~1200 строк
- **Создано:** 8 hooks + 6 components
- **Все компоненты:** < 200 строк ✅
- **Архитектура:** Соответствует ARCHITECTURE_GUIDELINES ✅

---

## ⚠️ Важные замечания

1. **Тестирование обязательно** после каждого этапа
2. **Коммиты** после каждого крупного этапа (1-7, 8-18)
3. **URL sync** в TestEditorModal - критичная функциональность
4. **Theme logic** в TestEditorForm - сложная логика, тестировать тщательно
5. **Не трогать** уже готовые подкомпоненты (TestQuestionsManager, etc.)

---

**Готов начинать выполнение!** 🚀
