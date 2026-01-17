# PREVIEW_CHECKLIST_VERCEL.md

Цель: проверить ветку `safety-prep-test` на Vercel Preview до переноса изменений в `main`.

## 1) Проверка логов деплоя (Vercel)
- Build successful (нет ошибок "Missing env" или "undefined" для VITE_* переменных).
- Нет ошибок сборки Vite/TypeScript.
- Нет ошибок serverless функций (если используются `/api/*`).

## 2) Smoke-check страниц
Откройте Preview URL и проверьте минимум:
- Главная страница (рендер, стили, базовая навигация).
- /notes (если доступно)
- /timeline (если доступно)
- /research (поиск/доступность UI)
- /profile (если доступно)

## 3) Env vars для Preview
Список из `.env.example` (должны быть заданы в Vercel → Project Settings → Environment Variables → Preview):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_ADMIN_SEED_CODE`

Дополнительно (server-side, если используется AI/Backend в Vercel Functions):
- `GEMINI_API_KEY` (без него `/api/assistant` вернет 503)
- При наличии других серверных ключей (например Google/GenAI) — убедиться, что они заданы только в Server/Preview окружении.

## 4) Важно
После удаления `.env.production` из Git сборка в Preview будет зависеть от настроенных Environment Variables. Если ранее build брал значения из файла — теперь их нужно задать в Vercel для Preview.

