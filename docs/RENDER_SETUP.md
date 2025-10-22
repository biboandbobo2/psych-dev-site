# Render Deployment Setup

## Current Status
✅ Code is deployed  
❌ Firebase not working (invalid-api-key error)

## Problem
Environment variables are not being injected into the Vite build.

## Solution

### Step 1: Verify Environment Variables in Render
1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Выберите сервис `psych-dev-site`
3. Перейдите на вкладку **Environment**
4. Убедитесь, что заданы все переменные:

```
VITE_FIREBASE_API_KEY=AIzaSyCJrB77CvgaZQ6Ig8DG0p3d9N5S5ZH5srw
VITE_FIREBASE_AUTH_DOMAIN=psych-dev-site-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=psych-dev-site-prod
VITE_FIREBASE_STORAGE_BUCKET=psych-dev-site-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1006911372271
VITE_FIREBASE_APP_ID=1:1006911372271:web:b7e9b4371c8ece412e941a
VITE_ADMIN_SEED_CODE=PSYCH-ADM-7Q9Z-2M4K-83VJ
```

### Step 2: Verify Build Settings
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **Auto-Deploy**: включен

### Step 3: Deploy
1. Убедитесь, что `.env.production` присутствует в репозитории
2. `git push`
3. Render автоматически запустит билд или выполните **Manual Deploy → Deploy latest commit**

### Step 4: Проверка
После деплоя откройте https://psych-dev-site.onrender.com и гляньте консоль браузера. Должно появиться сообщение:

```
🔍 Firebase env check: {
  hasApiKey: true,
  apiKeyLength: 39,
  hasAuthDomain: true,
  hasProjectId: true,
  projectId: "psych-dev-site-prod"
}
```

Если значения `false`, переменные не подставились.

## Troubleshooting

### Ошибка `auth/invalid-api-key`
1. Проверьте названия переменных в Render — они должны начинаться с `VITE_`
2. Исправьте опечатки, задеплойте вручную
3. Сбросьте кэш билда: Settings → Clear Build Cache → Manual Deploy

### Переменные `undefined`
1. Убедитесь, что `.env.production` закоммичен
2. Проверьте `.gitignore` — в нём не должно быть `.env.production`
3. Убедитесь, что Build Command запускает `npm run build`

### Билд падает
Смотрите логи деплоя в Render Dashboard.
