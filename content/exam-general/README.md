# Тесты к зачёту по общей психологии

Мастер-копии 10 тестов категории full-course курса `general`, опубликованных в Firestore в мае 2026. Этот каталог — источник истины: при изменениях в Firestore синхронизируй обратно сюда (см. ниже), при пересоздании / миграции — публикуй отсюда через `scripts/publishTestFromJson.ts`.

## Состав

| Файл | Test ID в Firestore | Заголовок |
|---|---|---|
| `01-photos.json` | `cUrx3Kdmi55bumXEGwIf` | Узнай учёного по фото |
| `02-biography.json` | `hl1OS3sIUJyXz27hikhE` | Угадай учёного по факту биографии |
| `03-quotes.json` | `oXV9VfgDrKGiM3WNPEB4` | Узнай автора по цитате |
| `04-concepts.json` | `8ASf8OXbjT8jROPicJLF` | Идеи учёных: ключевые концепции |
| `05-compare.json` | `KCQf1Iy3k0fRe9cub8t1` | Идеи учёных: сравнение позиций |
| `06-cases.json` | `6SmPq56Ox1L3q6hwJTXm` | Кейсы курса: какое понятие тут работает |
| `06b-cases-level2.json` | `I0Pc9VoDjHxXVHaTkrzN` | Кейсы курса: уровень 2 |
| `07-terms-level1.json` | `5Mkagqdk39QpkO4oIPL6` | Термины курса — уровень 1: узнай определение |
| `08-terms-level2.json` | `fTOZq14ILqJYS1BkPafR` | Термины курса — уровень 2: различи близкие |
| `09-terms-level3.json` | `e3U7r6IHXzn3iRQR5V5p` | Термины курса — уровень 3: анализ сценариев |

ID в Firestore зафиксирован в поле `_firestoreTestId` каждого JSON.

`photos/` — 9 портретов учёных (Wikimedia Commons + университетские мемориалы). Используются только в `01-photos.json` через поле `_photoFile` в каждом вопросе.

## Публикация

**Создать новый тест:**
```bash
npx tsx scripts/publishTestFromJson.ts content/exam-general/01-photos.json \
  --photos content/exam-general/photos
```

**Обновить существующий:**
```bash
npx tsx scripts/publishTestFromJson.ts content/exam-general/01-photos.json \
  --photos content/exam-general/photos \
  --update cUrx3Kdmi55bumXEGwIf
```

**Сухой прогон (без записи в Firestore/Storage):**
```bash
npx tsx scripts/publishTestFromJson.ts content/exam-general/01-photos.json \
  --photos content/exam-general/photos \
  --update cUrx3Kdmi55bumXEGwIf \
  --dry-run
```

Скрипт сам:
1. Создаёт/обновляет документ в коллекции `tests`.
2. Заливает фото в Storage по пути `tests/{testId}/questions/{questionId}/image.jpg`.
3. Генерирует Firebase Storage download token и проставляет `imageUrl` каждому вопросу.

Аутентификация: Application Default Credentials. Если ещё не настроен — `gcloud auth application-default login`.

## Синхронизация Firestore → JSON

Если правил тесты напрямую в Firestore (через админ-UI или Admin SDK), верни источник в репо. Простой однострочник:

```bash
NODE_PATH=node_modules node -e "
const admin = require('firebase-admin');
const fs = require('node:fs');
admin.initializeApp({ projectId: 'psych-dev-site-prod' });
(async () => {
  const snap = await admin.firestore().collection('tests').doc('TESTID').get();
  const d = snap.data();
  const out = { version: '1.0', exportedAt: new Date().toISOString(),
    _firestoreTestId: 'TESTID',
    test: { title: d.title, course: d.course, rubric: d.rubric,
      ...(d.prerequisiteTestId ? { prerequisiteTestId: d.prerequisiteTestId } : {}),
      requiredPercentage: d.requiredPercentage,
      defaultRevealPolicy: d.defaultRevealPolicy, appearance: d.appearance,
      questions: (d.questions || []).map(q => { const c = {...q}; delete c.imageUrl; return c; }),
    },
  };
  fs.writeFileSync('content/exam-general/NN-file.json', JSON.stringify(out, null, 2) + '\n');
})().then(() => process.exit(0));
"
```

При синхронизации обратно НЕ сохраняй `imageUrl` (он содержит уникальный токен Storage и не нужен в источнике — скрипт публикации сам сгенерирует свежий).

## Чек-лист перед изменением

Все изменения должны пройти **10 пунктов чек-листа** из [docs/guides/testing-system.md → «Чек-лист при создании теста»](../../docs/guides/testing-system.md). Особенно важно:

- Источники в `resourcesRight` — НЕ БРЭ (bigenc.ru), НЕ wikiquote как источник определения, НЕ общие монографии (marxists.org/Мышление и речь). Предпочитать ru.wikipedia.
- `explanation` с примером и разбором каждого дистрактора.
- Самопроверка перед публикацией (пункт 10): фактическая точность, уникальность маркера, единообразие формата, визуальная проверка ссылок, чтение explanation, прогон 4 ответов как угадывающий.

## Цепочки тестов (prerequisite)

Текущие цепочки (поле `prerequisiteTestId` в источнике):

- Цитаты → Концепции → Сравнение позиций:
  `03-quotes` → `04-concepts` (70%) → `05-compare` (80%).
- Кейсы → Кейсы уровень 2:
  `06-cases` → `06b-cases-level2` (70%).
- Термины 1 → 2 → 3:
  `07-terms-level1` → `08-terms-level2` (70%) → `09-terms-level3` (80%).

Остальные тесты независимые.
