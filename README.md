# Psych Dev Site

Контент сайта теперь хранится в одном файле `public/content/periods.csv` (в браузере доступен как `/content/periods.csv`). Именно этот CSV загружается в рантайме и наполняет страницы периодов.

## Как обновлять контент
- Отредактируйте `public/content/periods.csv` в любом табличном редакторе, сохранив исходные колонки и порядок строк.
- Колонка `content_type` показывает, хранится ли элемент как обычная строка (`string`) или сериализованный объект (`object`). Для объектов допускается правка значений внутри JSON.
- После сохранения файла перезапустите dev-сервер (`npm run dev`) или просто обновите вкладку, если он уже запущен.

## Разработка
- `npm install`
- `npm run dev`
- Для предпросмотра production-сборки: `npm run build && npm run preview`
- Проверить, что все ссылки на YouTube разрешают встраивание: `npm run check:embeds`

## Контроль контента (CSV → Firestore)

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
- `.env.production` — шаблон для продакшна. Значения переменных задаются в Render Dashboard → Environment Variables и подставляются при билде.

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

Локально используйте `.env.local`, на Render достаточно заполнить те же ключи в настройках сервиса и убедиться, что `.env.production` присутствует в репозитории.

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
