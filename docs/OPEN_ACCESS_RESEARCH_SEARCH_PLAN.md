# Фича: Научный поиск по Open Access источникам (Variant C + Hybrid выдача)

Документ предназначен для постановки задачи Codex-агенту. Он задаёт пошаговый план реализации с **жёсткими QA‑гейтами** (тесты/сборка/смоук), чтобы агент не “ехал дальше”, пока не убедится, что новый код не ломает существующее.

---

## 1) Что делаем и как это выглядит пользователю

### UX (вариант C + гибрид выдачи)
1) **Глобальная точка входа**: кнопка/плашка “Научный поиск” в верхнем топ-баре рядом с существующими (“Заметки”, “Редактор”, “Админ‑панель”, профиль).
   - Реализуется в: `src/components/UserMenu.tsx`, который рендерится в `src/layouts/AppLayout.tsx`.

2) **Drawer (оверлей поверх страницы)**:
   - Клик по “Научный поиск” открывает Drawer справа (или снизу на мобилке): поле ввода + первые 15 результатов.
   - Есть кнопка **«Открыть все результаты»**, которая ведёт на страницу `/research?q=...`.

3) **Страница `/research`**:
   - Полноэкранная выдача с тем же поиском + фильтры (минимально: язык, год).

### Ключевой принцип MVP
**Без LLM‑саммаризации.** “Абзац” для каждой работы делаем бесплатно и детерминированно:
- Если есть abstract → берём 2–3 первых предложения **или** первые 450–650 символов (в зависимости от языка/пунктуации).
- Если abstract нет → формируем честный абзац из метаданных (“год/журнал/тип/тема”) и помечаем как «описание по метаданным».

LLM‑саммаризацию (даже маленькой моделью) выносим в Post‑MVP, чтобы не рисковать временем ответа/compute/лимитами serverless.

---

## 2) Источники и “список научных библиотек” (легко редактируется)

### Upstream API (откуда берём результаты)
- **OpenAlex** — основной индекс (широкий охват, OA‑признаки).
- **Semantic Scholar** — fallback: добывать plaintext abstract (обычно качественный), когда у OpenAlex абстракта нет/он неполный.
- (Опционально Post‑MVP) **Unpaywall** — для уточнения OA‑PDF по DOI.

### “Научные библиотеки/репозитории”, по которым разрешаем ссылки (Allow‑list)
Чтобы соответствовать требованию “искать только в открытых научных библиотеках”, в логике API вводим **редактируемый allow‑list хостов**: результат допускается в выдачу только если его landing page или pdf URL принадлежат разрешённым OA‑репозиториям/библиотекам.

Редактируемый список хранится отдельным файлом:
- `docs/research_sources.json` (см. приложенный шаблон ниже)
или (если хотите использовать в runtime прямо в коде) копируется/импортируется в:
- `src/features/researchSearch/config/research_sources.json`

MVP‑поведение:
- Результаты из OpenAlex/S2 фильтруются по allow‑list **по хосту ссылки** (`primaryUrl` или `oaPdfUrl`).
- Если allow‑list слишком строгий и выдача становится пустой, API возвращает меньше результатов и отдаёт пользователю честное сообщение в UI (“нашлось N работ” + подсказка расширить источники).

---

## 3) Техническая архитектура

### 3.1 Где живёт backend
**Vercel serverless function**: `GET /api/papers`
- В репозитории добавить `api/papers.ts` (или `api/papers/index.ts` — как удобнее для структуры).
- Функция делает внешние fetch к OpenAlex + (ограниченно) к Semantic Scholar.

Параметры:
- `q` (string, required, min 3)
- `limit` (int, default 15, max 20)
- `langs` (csv, default `ru,zh,de,fr,es,en`)
- `mode` (`drawer|page`, optional) — влияет на размер “кандидатного пула” (например 50 для drawer и 80 для page)

Ответ: нормализованный JSON (см. контракт ниже).

### 3.2 Где добавляем UI и страницу
- Top‑bar кнопка: `src/components/UserMenu.tsx`
- Drawer компонент: `src/features/researchSearch/components/ResearchSearchDrawer.tsx`
- Страница выдачи: `src/features/researchSearch/pages/ResearchPage.tsx`
- Роутинг:
  - Router: `src/App.jsx` (`<BrowserRouter>`)
  - Маршруты: `src/app/AppRoutes.tsx` → добавить Route `/research`
- (Опционально) компактная точка входа над навигацией курса: добавить маленькую кнопку/поле в компонент, который рендерит левую навигацию (агент должен найти корректное место по код‑базе).

---

## 4) Контракт API

### Request
`GET /api/papers?q=...&limit=15&langs=ru,zh,de,fr,es,en&mode=drawer`

### Response 200
```json
{
  "query": "…",
  "results": [
    {
      "id": "openalex:W123…",
      "title": "…",
      "year": 2021,
      "authors": ["…", "…"],
      "venue": "…",
      "language": "ru",
      "doi": "10.…",
      "primaryUrl": "https://…",
      "oaPdfUrl": "https://…",
      "paragraph": "…",
      "source": "openalex",
      "score": 0.87,
      "host": "cyberleninka.ru"
    }
  ],
  "meta": {
    "tookMs": 842,
    "cached": true,
    "sourcesUsed": ["openalex", "semanticscholar"],
    "allowListApplied": true
  }
}
```

### Errors
- 400 — invalid query / params
- 429 — rate limit exceeded
- 502 — upstream unavailable (OpenAlex down)
- 500 — unexpected error (без утечек деталей)

---

## 5) Требования к качеству и гейты (обязательно)

### Стек тестирования проекта
Используем текущий стек: Vitest + Testing Library + jest-dom + jsdom.

### Запрет console.*
В src/* не добавлять `console.*` (pre-commit). Для отладочных сообщений использовать `debugLog/debugWarn/debugError`.

### Гейт после каждого шага
После каждого крупного шага агент обязан:
1) Запустить unit/component тесты.
2) Запустить сборку.
3) Провести ручной смоук (минимум сценариев ниже).
4) Зафиксировать результаты в `docs/qa-smoke-log.md` (добавить запись: дата, что проверено, commit hash).

**Агент не продолжает, пока гейт не зелёный.**

---

## 6) Пошаговый план реализации (для Codex)

> ВАЖНО: следовать архитектурным рекомендациям проекта — фича‑ориентированная структура, SRP, маленькие компоненты.

### Шаг A — Скелет фичи + пустой Drawer
A1) Создать структуру фичи:
- `src/features/researchSearch/`
  - `components/`
  - `hooks/`
  - `lib/`
  - `config/`
  - `types.ts`
  - `index.ts` (опционально)

A2) Добавить базовые типы (`types.ts`):
- `ResearchWork`
- `PapersApiResponse`
- `PapersApiError`

A3) Реализовать минимальный Drawer (пока без запросов):
- `ResearchSearchDrawer.tsx` — принимает `open`, `onClose`
- Простое содержимое: поле + текст “В разработке”

A4) Добавить кнопку “Научный поиск” в `src/components/UserMenu.tsx` (рядом с “Заметки”):
- По клику открывать Drawer
- Обеспечить доступность: `aria-label`, закрытие по Esc

**Тесты**
- Component test: “кнопка есть; клик открывает Drawer; Esc закрывает Drawer”.

**Гейт**

---

### Шаг B — Backend: `GET /api/papers` (OpenAlex, минимум)
B1) Добавить Vercel function `api/papers.ts`:
- Валидация `q`, `limit`, `langs`, `mode`
- Таймаут внешнего fetch
- Обработка ошибок в единый формат

B2) Запрос к OpenAlex:
- С OA‑фильтром
- Возвращать кандидатный пул (50–80)
- Нормализовать поля (title, authors, year, doi, links)

B3) Кэш‑заголовки:
- `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`

**Тесты**
- Unit: parse/validate params
- Unit: normalize OpenAlex fixture → `ResearchWork[]`
- Unit: upstream error → 502

**Гейт**

---

### Шаг C — Восстановление abstract + “paragraph” (без S2)
C1) Реализовать `reconstructAbstractFromInvertedIndex(invertedIndex)`:
- детерминированно, без внешних зависимостей

C2) `buildParagraph(work)`:
- если abstract → excerpt
- иначе → metadata paragraph (пометка)

C3) Подключить к pipeline в API, чтобы каждая карточка имела `paragraph` (если возможно).

**Тесты**
- Unit: восстановление inverted index (несколько кейсов)
- Unit: paragraph builder (abstract vs metadata)

**Гейт**

---

### Шаг D — Allow‑list “научных библиотек” (обязательно)
D1) Добавить файл `docs/research_sources.json` (шаблон ниже; редактируемый список).
D2) Зеркалировать этот файл для runtime (один из вариантов):
- Вариант 1 (предпочтительно для прозрачности): хранить копию в `src/features/researchSearch/config/research_sources.json` и импортировать её в API код (Node умеет читать JSON).
- Вариант 2: читать JSON из `docs/` через fs (только если гарантировано, что файл попадёт в deployment bundle; обычно безопаснее вариант 1).

D3) Реализовать `isAllowedHost(url)`:
- извлечь hostname
- проверить включён ли source в allow‑list
- применить к каждому результату: допускаем, если `oaPdfUrl` или `primaryUrl` проходит allow‑list.

D4) Если после фильтрации результатов < limit:
- вернуть меньше и честно указать `meta.allowListApplied=true`

**Тесты**
- Unit: host parsing + allow/deny
- Unit: фильтрация выдачи (fixture) работает ожидаемо

**Гейт**

---

### Шаг E — Fallback Semantic Scholar (ограниченно)
E1) Для работ без abstract после C/D:
- если есть DOI → попытаться получить abstract через S2
- ограничить количеством: максимум 5 fallback вызовов/запрос
- таймаут на каждый вызов

E2) Мержить abstract и перестраивать paragraph.

**Тесты**
- Unit: логика отбора на fallback + лимит 5
- Mock fetch: гарантия, что не делаем >5 запросов

**Гейт**

---

### Шаг F — Языковая диверсификация (MVP)
F1) Простое определение языка (title+abstract):
- использовать лёгкую библиотеку (если уже есть) или минимальный эвристический детектор (CJK/кириллица/латиница + стоп‑слова).
- Возвращать `en|ru|zh|de|fr|es|unknown`

F2) Diversification:
- не “квотируем” жёстко, но стараемся избежать 15/15 English, если есть альтернативы близкой релевантности.
- правило: не подмешивать сильно нерелевантное ради языка.

**Тесты**
- Unit: diversification сохраняет limit и устойчивый порядок

**Гейт**

---

### Шаг G — Реальный Drawer UI (fetch + состояния)
G1) Реализовать hook `useResearchSearch()`:
- debounce 500–800ms
- abort previous request
- min query length 3
- caching на клиенте (Map) по (q, langs)

G2) Drawer UI:
- Loading / Error / Empty / Results states
- Карточки: title, authors, year, host badge, кнопка “Открыть”
- “Открыть все результаты” → `navigate('/research?q=...')`

**Тесты**
- Component: debounce и fetch вызываются корректно
- Component: рендер состояний
- Component: кнопка “Открыть все результаты” ведёт на правильный URL

**Гейт**

---

### Шаг H — Страница `/research`
H1) Добавить страницу `ResearchPage.tsx`:
- читает `q` из query string (useSearchParams)
- запускает поиск
- фильтры: язык, год (минимально)
- переиспользует компоненты карточек

H2) Роутинг:
- В `src/app/AppRoutes.tsx` добавить:
  - `Route path="/research" element={<ResearchPage/>}` (с `RequireAuth`, если нужно ограничить доступ)

**Тесты**
- Component: страница читает `q` и показывает результаты
- Component: фильтры работают (локально на списке)

**Гейт**

---

### Шаг I — Rate limiting + финальная QA
I1) Добавить rate limiter в API (30 req / 5 min / IP)
I2) Финальные смоук сценарии:
- Открыть любую страницу курса → открыть Drawer → поиск
- “Открыть все результаты” → /research
- Фильтры /research
- Внешняя ссылка открывается в новой вкладке
- Проверить, что “Заметки/Редактор/Админ‑панель” не пострадали

I3) Запись в `docs/qa-smoke-log.md`

**Гейт финальный**

---

## 7) Примечания по производительности и стабильности

1) Ограничить число внешних вызовов:
- 1 запрос OpenAlex
- до 5 запросов S2 (fallback)
2) Всегда иметь таймауты и деградацию (частичная выдача лучше ошибки).
3) Использовать CDN‑кэш через Cache-Control.
4) По возможности добавить server-side memoization (in-memory Map) на время жизни инстанса.

---

## 8) Post‑MVP (отложено)
- Интеграция “Сохранить в заметки”
- Форматирование цитирования (APA/ГОСТ)
- LLM‑саммаризация (только после оценки стоимости/лимитов)
