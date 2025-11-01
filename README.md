# Psych Dev Site

Образовательный ресурс по психологии развития с интерактивными инструментами для изучения и саморефлексии.

## Основные возможности

### 📚 Образовательный контент
⚠️ **Обновление:** ранее контент загружался из `public/content/periods.csv` (доступен как `/content/periods.csv`), но CSV-пайплайн выведен из эксплуатации. Документация по текущему источнику данных обновляется.

### 📝 Система заметок
- Создание личных заметок к каждому возрастному периоду
- Выбор тем для размышления из предзаготовленного списка
- Управление темами через админ-панель (`/admin/topics`)
- Хранение в Firestore, приватные для каждого пользователя

### 📊 Система тестирования (3 уровня)
1. **Уровень 1: Авторы и термины** (`/tests/authors`)
   - 10 вопросов на соответствие психологов и концепций
   - Разблокирует уровень 2 при 10/10

2. **Уровень 2: Цитаты** (`/tests/authors/level2`)
   - 10 известных цитат психологов
   - Разблокирует уровень 3 при 10/10

3. **Уровень 3: Термины в контексте** (`/tests/authors/level3`)
   - 10 цитат с пропущенными терминами
   - Финальный уровень

Вопросы хранятся в файлах:
- `src/data/authorsTestData.ts`
- `src/data/authorsTestLevel2Data.ts`
- `src/data/authorsTestLevel3Data.ts`

История результатов сохраняется в Firestore (`testResults` коллекция).

### 🗺️ Таймлайн жизни (`/timeline`)
- Интерактивная карта событий с ветвями, drag-n-drop и автоматическим сохранением в Firestore.
- Поддерживает классификацию по сферам жизни, метки «моё решение», undo/redo и управление ветками.
- Подробная документация: [Timeline Guide](docs/TimelineGuide.md).

### 👤 Система ролей
- **Student** - базовая роль, доступ к контенту, заметкам, тестам, таймлайну
- **Admin** - редактирование контента периодов (`/admin/content`), управление темами (`/admin/topics`)
- **Super Admin** - управление пользователями (`/admin/users`), выдача прав администратора

## Основные маршруты

### Публичные
- `/` → `/prenatal` - главная страница (редирект на пренатальный период)
- `/intro` - вводное занятие
- `/prenatal`, `/early-childhood`, `/preschool`, `/primary-school`, `/adolescence` - возрастные периоды

### Для авторизованных пользователей
- `/profile` - профиль пользователя
- `/notes` - создание и просмотр заметок
- `/tests` - список доступных тестов
- `/tests/authors` - тест уровень 1
- `/tests/authors/level2` - тест уровень 2 (разблокируется при 10/10 на уровне 1)
- `/tests/authors/level3` - тест уровень 3 (разблокируется при 10/10 на уровне 2)
- `/timeline` - интерактивный таймлайн жизни

### Для администраторов
- `/admin/content` - редактор контента периодов
- `/admin/content/edit/:periodId` - редактирование конкретного периода
- `/admin/topics` - управление темами для заметок

### Для супер-администраторов
- `/admin` - главная админ-панель
- `/admin/users` - управление пользователями и ролями
- `/admin/import` - импорт данных

## Как обновлять контент
- Отредактируйте `public/content/periods.csv` в любом табличном редакторе, сохранив исходные колонки и порядок строк.
- Колонка `content_type` показывает, хранится ли элемент как обычная строка (`string`) или сериализованный объект (`object`). Для объектов допускается правка значений внутри JSON.
- После сохранения файла перезапустите dev-сервер (`npm run dev`) или просто обновите вкладку, если он уже запущен.

## Разработка
- `npm install`
- `npm run dev`
- Для предпросмотра production-сборки: `npm run build && npm run preview`
- Проверить, что все ссылки на YouTube разрешают встраивание: `npm run check:embeds`

## Контроль контента (CSV → Firestore) *(устарело)*

⚠️ Этот раздел оставлен для истории: CSV-процесс больше не используется. Как только новая схема синхронизации будет задокументирована, обновим инструкцию.

1. **Соберите эталонный JSON:** `npm run transform` – преобразует `public/content/*.csv` в `public/transformed-data.json`.
2. **Проверьте расхождения:**
   - Убедитесь, что доступны креденшелы Firebase Admin (`export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json` или выполните `gcloud auth application-default login`).
   - Запустите `npm run verify`. Скрипт подключится к проекту `psych-dev-site-prod`, сверит Firestore с эталоном и создаст два файла:
     - `verification-report.md` – подробный Markdown-отчёт.
     - `verification-diff.json` – машинночитаемый дифф.
3. **(Опционально) Поправьте Firestore:**
   - Dry-run: `npm run reconcile` – только покажет, что будет обновлено.
   - Применение: `npm run reconcile:apply` – дозапишет недостающие поля/элементы и обновит скаляры без удаления существующих значений. После применения обновлений снова выполните `npm run verify`.

> Скрипты не удаляют «лишние» значения в базе, они только дозаписывают недостающее и синхронизируют разносящиеся поля.

## Структура данных Firestore

### Коллекции
- **`users/{userId}`** - профили пользователей, роли (student/admin/super-admin)
- **`notes/{noteId}`** - личные заметки пользователей по периодам
- **`topics/{topicId}`** - темы для размышлений (редактируемые админами)
- **`testResults/{resultId}`** - результаты прохождения тестов
- **`timelines/{userId}`** - данные таймлайнов пользователей (nodes, edges, ageMax)
- **`periods/{periodId}`** - контент возрастных периодов (исторически синхронизировался из CSV; актуальный источник данных уточняется)
- **`intro/{document}`** - контент вводного занятия

### Правила доступа (`firestore.rules`)
- Пользователи видят только свои заметки, результаты тестов и таймлайны
- Темы доступны для чтения всем авторизованным, редактировать могут только админы
- Контент периодов доступен всем для чтения, редактировать могут только админы

## Firebase

Для локального администрирования и загрузки ассетов потребуется подключённый проект Firebase.

1. Создайте файл `.env.local` и добавьте переменные:

   ```bash
   VITE_FIREBASE_API_KEY=AIzaSyCJrB77CvgaZQ6Ig8DG0p3d9N5S5ZH5srw
   VITE_FIREBASE_AUTH_DOMAIN=psych-dev-site-prod.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=psych-dev-site-prod
   VITE_FIREBASE_STORAGE_BUCKET=psych-dev-site-prod.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1006911372271
   VITE_FIREBASE_APP_ID=1:1006911372271:web:b7e9b4371c8ece412e941a
   VITE_ADMIN_SEED_CODE=SET_YOUR_ONE_TIME_CODE
   ```

   Замените `SET_YOUR_ONE_TIME_CODE` на одноразовый код для выдачи прав администратора.

2. Выполните команды:

   ```bash
   npm install
   npx firebase login
   npx firebase functions:config:set admin.seed_code="<ваш одноразовый код>"
   npm run firebase:deploy:all
   ```

3. Запустите dev-сервер: `npm run dev -- --port=5174`.

4. Откройте `http://localhost:5174/login`, войдите через Google и перейдите на `/admin`.

5. Нажмите «Сделать меня админом» (код используется один раз). После этого станут доступны загрузки в `assets/` и защищённые коллекции Firestore/Storage.

### Environment Variables

- `.env.local` — локальные секреты; хранится только на вашем компьютере и перечислен в `.gitignore`.
- `.env.production` — шаблон для продакшна. Сайт больше не хостится на Render; заполните переменные на актуальной платформе деплоя.

Список переменных:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_SEED_CODE
```

Локально используйте `.env.local`, а для продакшена настройте те же ключи в панели выбранной платформы (инфраструктура обновлена, Render больше не используется).

### Cloud Functions bootstrap
1. `npx firebase functions:config:set admin.seed_code="PSYCH-ADM-7Q9Z-2M4K-83VJ" --project psych-dev-site-prod`
2. `cd functions && npm i && npm run build && cd ..`
3. `npx firebase deploy --only storage,firestore:rules,functions --project psych-dev-site-prod`

## Review checklist

| Проверка                                           | Инструмент                     |
| -------------------------------------------------- | ------------------------------ |
| Сайдбар не дублируется на **каждом** slug-е        | ручной переход                 |
| На странице нет `[` `]` `"`                        | визуально                      |
| Под мобилку (< 640 px) нет горизонтального скролла | DevTools Responsive            |
| Lighthouse Mobile ≥ 90                             | `npm run preview` + Lighthouse |
| Пустые секции (нет данных) не рендерятся           | ручной переход                 |
