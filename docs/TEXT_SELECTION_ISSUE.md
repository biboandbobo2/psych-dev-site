# Проблема с выделением текста на сайте

**Дата начала:** 2025-11-14
**Статус:** НЕ РЕШЕНО
**Браузеры:** Chrome, Safari

## Описание проблемы

Текст на сайте не выделяется мышкой. Вместо выделения текст "драгается" (как изображение), что делает невозможным копирование контента пользователями.

### Симптомы

- ❌ **НЕ работает:** Текст в элементах `<h1>`, `<h2>`, `<p>`, `<span>` и других на основных страницах
- ✅ **Работает:** Текст в `<input>` элементах с inline style `style="-webkit-user-select: text;"`
- ✅ **Работает:** Некоторые `<p>` элементы в редакторе (причина неизвестна)

### Примеры из DevTools

**НЕ выделяется:**
```html
<p class="text-sm leading-6 text-muted uppercase tracking-[0.3em]">Навигация</p>
<h1 class="text-5xl md:text-6xl leading-tight font-semibold tracking-tight text-fg">Пренатальный период</h1>
```

**Выделяется:**
```html
<input required class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
       placeholder="Пренатальный период" type="text" value="Пренатальный период"
       style="-webkit-user-select: text;">

<p class="text-xs text-gray-500 mt-1 max-w-prose">
  Когда заглушка включена, пользователи увидят сообщение: <em>"..."</em> вместо контента раздела.
</p>
```

## История проблемы

### Предыдущее решение (февраль 2025)

Согласно `docs/audit-backlog.md`, **такая же проблема уже была решена** ранее:

> **HP-2.A Text selection regression (2025-02)**
> - **Причина:** глобальный listener `disableNativeTextDrag()` в `src/main.tsx` перехватывал любое `dragstart` без фильтрации и ставил `preventDefault`, поэтому Chrome/Safari не переходили в режим выделения текста и отображали «призрак».
> - **Решение:** Создан хук `useDisableDrag(ref)` для локального отключения drag событий вместо глобального listener.

**Текущее состояние:** В `src/main.tsx` нет глобального `disableNativeTextDrag()`, но проблема вернулась.

## Попытки решения

### 1. Inline стили на текстовых элементах (Claude)

**Файлы:** `src/pages/PeriodPage.tsx`, `src/components/ui/Section.jsx`, `src/app/NotFound.jsx`

**Что сделали:**
```typescript
// Создали константу
export const GLOBAL_TEXT_SELECTABLE_STYLE: CSSProperties = {
  WebkitUserSelect: 'text',
  MozUserSelect: 'text',
  userSelect: 'text',
};

// Применили к h1, p элементам
<h1 style={GLOBAL_TEXT_SELECTABLE_STYLE} className="...">
  {heading}
</h1>
```

**Результат:** ❌ НЕ РАБОТАЕТ
**Причина:** React применил только `-webkit-user-select: text`, но остальные свойства не появились в DOM

---

### 2. Удаление framer-motion компонентов (Claude)

**Гипотеза:** Motion компоненты перехватывают события мыши

**Что сделали:**
- Заменили `<Motion.div>` на `<div>` в `PeriodPage.tsx`
- Заменили `<Motion.section>` на `<section>` в `Section.jsx`
- Удалили анимационные props (`initial`, `animate`, `exit`)

**Результат:** ❌ НЕ РАБОТАЕТ (проблема НЕ в framer-motion)

---

### 3. CSS с !important (Claude)

**Файл:** `src/index.css`

**Попытка 1 - Универсальный селектор:**
```css
/* Force text selection globally with maximum specificity */
*,
*::before,
*::after {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}
```

**Результат:** ❌ НЕ РАБОТАЕТ

**Попытка 2 - С исключениями:**
```css
*:not(button):not(input[type="button"]):not(input[type="submit"]):not([role="button"]):not(.select-none):not(img):not(svg) {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}
```

**Результат:** ❌ НЕ РАБОТАЕТ
**Вывод:** CSS правила не работают, что-то их перебивает с более высоким приоритетом

---

### 4. JavaScript принудительное добавление inline стилей (Claude)

**Файл:** `src/main.tsx`

**Что сделали:**
```typescript
function enableTextSelection() {
  const selectors = 'h1, h2, h3, h4, h5, h6, p, span, div, a, li, td, th, label, small';
  const elements = document.querySelectorAll(selectors);
  elements.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.webkitUserSelect = 'text';
      el.style.userSelect = 'text';
    }
  });
}

// Запуск через 100ms после старта
setTimeout(enableTextSelection, 100);

// Повторный запуск каждую секунду
setInterval(enableTextSelection, 1000);
```

**Результат:** ❌ НЕ РАБОТАЕТ (по отчёту пользователя)

---

### 5. Попытки Codex (из отчёта пользователя)

**Изменённые файлы:**
- Удалён глобальный drag disable из `src/main.tsx`
- Добавлены CSS правила в `src/index.css`
- Создан хук `useDisableDrag`
- Добавлен Playwright тест
- Модифицированы несколько компонентов

**Результат:** ❌ НЕ РАБОТАЕТ

---

## Диагностика

### Что мы знаем точно

1. **Inline стили работают** - `<input>` с `style="-webkit-user-select: text;"` выделяется
2. **CSS правила не работают** - ни обычные, ни с `!important`
3. **Проблема НЕ в framer-motion** - удаление Motion компонентов не помогло
4. **JavaScript добавление стилей не работает** - даже принудительное изменение через DOM API

### Странные наблюдения

1. **Один `<p>` в редакторе выделяется БЕЗ inline стилей:**
   ```html
   <p class="text-xs text-gray-500 mt-1 max-w-prose">
     Когда заглушка включена, пользователи увидят сообщение...
   </p>
   ```
   Файл: `src/pages/admin/content-editor/components/ContentMetadataForm.tsx:107-110`

   **Почему он работает?** Неизвестно. Нет inline стилей, только Tailwind классы.

2. **React не применяет все свойства из CSSProperties:**
   - Задали: `{ WebkitUserSelect: 'text', MozUserSelect: 'text', userSelect: 'text' }`
   - Получили в DOM: только `style="-webkit-user-select: text;"`

### Гипотезы

#### Гипотеза 1: Tailwind CSS перезаписывает стили
- Tailwind может добавлять `user-select: none` через свои utility классы
- **Как проверить:** Искать в скомпилированном CSS наличие `user-select: none`

#### Гипотеза 2: Глобальный JavaScript блокирует события
- Какой-то глобальный обработчик `mousedown`/`selectstart` вызывает `preventDefault()`
- **Как проверить:**
  ```javascript
  document.addEventListener('selectstart', (e) => {
    console.log('selectstart blocked:', e.target);
  }, true);
  ```

#### Гипотеза 3: CSS transform или другие свойства блокируют выделение
- Некоторые CSS свойства могут влиять на возможность выделения
- **Как проверить:** Временно отключить все анимации и transforms

#### Гипотеза 4: Проблема в порядке применения стилей
- Inline стили могут перезаписываться позже другими стилями
- **Как проверить:** Посмотреть в DevTools Computed styles, откуда приходит финальное значение `user-select`

## Текущие изменения в коде

### Файлы с изменениями

1. **`src/index.css`** - добавлено глобальное CSS правило с `!important`
2. **`src/main.tsx`** - добавлен JavaScript для принудительного добавления inline стилей
3. **`src/pages/PeriodPage.tsx`** - удалён Motion.div, добавлены inline стили к h1/p
4. **`src/components/ui/Section.jsx`** - удалён Motion.section, добавлены inline стили
5. **`src/app/NotFound.jsx`** - удалён Motion.div, добавлены inline стили
6. **`src/pages/admin/content-editor/utils/constants.ts`** - добавлена константа `GLOBAL_TEXT_SELECTABLE_STYLE`

### Нужно откатить

Перед следующей попыткой рекомендуется:
1. Вернуть Motion компоненты (они не были причиной проблемы)
2. Удалить JavaScript код из `src/main.tsx` (он не работает и влияет на производительность)
3. Упростить CSS правила в `src/index.css`

## Следующие шаги для отладки

### 1. Проверить DevTools Computed Styles

На странице `/prenatal` в DevTools для `<h1>`:
```javascript
const h1 = document.querySelector('h1');
const computed = window.getComputedStyle(h1);
console.log('user-select:', computed.userSelect);
console.log('-webkit-user-select:', computed.webkitUserSelect);
```

Нужно понять, какое **финальное** значение `user-select` применяется к элементу.

### 2. Проверить глобальные обработчики событий

```javascript
// В консоли DevTools
getEventListeners(document);
getEventListeners(document.body);
```

Искать обработчики: `mousedown`, `selectstart`, `dragstart`.

### 3. Проверить Tailwind compiled CSS

Открыть скомпилированный CSS файл (`dist/assets/index-*.css`) и искать все вхождения `user-select`:
```bash
grep -n "user-select" dist/assets/index-*.css
```

### 4. Тестовая страница без React/Tailwind

Создать минимальную HTML страницу для проверки, работает ли выделение без фреймворков:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { user-select: text !important; }
  </style>
</head>
<body>
  <h1>Test heading</h1>
  <p>Test paragraph</p>
</body>
</html>
```

Если выделение работает - проблема в React/Tailwind/библиотеках.

### 5. Проверить сторонние библиотеки

Возможные кандидаты:
- `framer-motion` (уже проверили - не причина)
- `react-router-dom`
- `react-helmet-async`
- Любые другие библиотеки, которые могут влиять на DOM

### 6. Bisect через git

Если проблема появилась недавно:
```bash
git log --oneline --since="2025-02-01" -- src/
```

Найти коммит, где была предыдущая фикса (февраль 2025), и сравнить с текущим состоянием.

## Рабочий обходной путь (для input элементов)

Для элементов форм (input, textarea) работает:
```typescript
import { SELECTABLE_TEXT_STYLE } from '../pages/admin/content-editor/utils/constants';

<input
  style={SELECTABLE_TEXT_STYLE}
  // ... other props
/>
```

**Константа:**
```typescript
export const SELECTABLE_TEXT_STYLE: CSSProperties = {
  WebkitUserSelect: 'text',
  MozUserSelect: 'text',
  msUserSelect: 'text',
  userSelect: 'text',
};
```

## Ссылки

- `docs/audit-backlog.md` - история предыдущего решения (февраль 2025)
- `src/shared/useDisableDrag.ts` - хук для локального отключения drag
- `README.md` - документация по использованию `useDisableDrag`

## Контакты для обсуждения

- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Если найдёте решение - обязательно обновите этот документ!

---

**Последнее обновление:** 2025-11-14
**Обновил:** Claude (Sonnet 4.5)
