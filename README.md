# MySmartCalendar

Умный личный календарь в формате Telegram Mini App (TMA). Поддерживает ведение задач, планирование с учётом рабочих смен по циклу 2/2 (День / Ночь / Отсыпной / Выходной), умные уведомления через Telegram-бота и ИИ-ассистента на базе Google Gemini.

---

## 🛠️ Стек технологий

- **Frontend**: React 19, Vite, TypeScript, TailwindCSS v4, Zustand, Lucide React (SVG-иконки).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis + BullMQ (фоновые задачи и очереди уведомлений), grammy (Telegram-бот).
- **AI**: Vercel AI SDK + Google Gemini 2.0 Flash.
- **Инфраструктура**: Docker Compose, GitHub Actions, Caddy (на хосте VPS для SSL).

---

## 🚀 Быстрый старт (Локальная разработка)

### Требования
- Установленный Node.js (v20+)
- Установленный Docker (для локального Postgres и Redis)

### Шаг 1: Подготовка окружения
1. Сделайте копию `.env.example` в папке `backend/` и переименуйте в `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Укажите ваши настройки в файле `backend/.env` (токен Telegram-бота, ключ Gemini API).

### Шаг 2: Запуск баз данных
Запустите Postgres и Redis локально через Docker. Из корня проекта:
```bash
docker compose up postgres redis -d
```

### Шаг 3: Инициализация бэкенда
1. Перейдите в папку бэкенда:
   ```bash
   cd backend
   npm install
   ```
2. Запустите миграции базы данных и генерацию Prisma Client:
   ```bash
   npx prisma migrate dev
   ```
3. Запустите бэкенд в dev-режиме:
   ```bash
   npm run dev
   ```
   Сервер запустится на порту `3000`.

### Шаг 4: Инициализация фронтенда
1. Откройте новый терминал и перейдите в папку фронтенда:
   ```bash
   cd frontend
   npm install
   ```
2. Запустите фронтенд в dev-режиме:
   ```bash
   npm run dev
   ```
   Фронтенд запустится на порту `5173` с настроенным проксированием всех запросов к `/api` на локальный бэкенд. При запуске вне клиента Telegram приложение автоматически создаст моковую сессию разработчика.

---

## 🐋 Деплой в Docker (Production)

Приложение спроектировано так, чтобы Express бэкенд раздавал скомпилированные статические файлы фронтенда из папки `public`. Это позволяет разворачивать весь стек на одном сервере с одним портом.

Для ручного запуска на VPS:
1. Создайте `.env` в корне проекта на основе секретов.
2. Соберите и запустите контейнеры:
   ```bash
   docker compose up --build -d
   ```
3. Примените миграции Prisma внутри контейнера:
   ```bash
   docker compose exec -T app npx prisma migrate deploy
   ```

### Настройка Caddy на VPS
Добавьте в ваш `Caddyfile` проксирование на порт приложения `3000`:
```caddy
calendar.yourdomain.com {
    reverse_proxy localhost:3000
}
```
Caddy автоматически сгенерирует SSL-сертификаты.

---

## 🤖 Настройка CI/CD (GitHub Actions)

В папке `.github/workflows/deploy.yml` уже настроен автоматический деплой на VPS по SSH при коммите в ветку `main` или `master`.

Чтобы настроить его, добавьте следующие Secrets в настройки вашего репозитория на GitHub (`Settings -> Secrets and variables -> Actions`):
- `VPS_HOST` — IP-адрес или домен вашего сервера
- `VPS_USERNAME` — имя пользователя (например, `root`)
- `VPS_SSH_KEY` — приватный SSH-ключ для доступа к серверу
- `DB_USER` — имя пользователя PostgreSQL (например, `postgres`)
- `DB_PASSWORD` — надежный пароль для базы данных
- `DB_NAME` — имя базы данных (например, `mysmartcalendar`)
- `JWT_SECRET` — случайный секретный ключ для генерации JWT токенов
- `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather
- `GEMINI_API_KEY` — API ключ Google Gemini
- `TMA_URL` — HTTPS URL вашего Mini App (например, `https://calendar.yourdomain.com`)
