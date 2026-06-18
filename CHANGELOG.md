# Changelog / История разработки проекта MySmartCalendar

В этом документе зафиксированы все этапы проектирования, разработки, настройки деплоя и исправления ошибок умного личного календаря смен **MySmartCalendar** в формате Telegram Mini App (TMA).

---

## 🚀 1. Архитектура и Структура проекта (MVP)
Создан монорепозиторий в папке [MySmartCalendar](file:///d:/MDKPRK/Desktop/MySmartCalendar) со следующим стеком технологий:
* **Backend**: Node.js, Express, TypeScript, Prisma ORM, BullMQ (очереди задач), Telegram-бот на grammy.
* **Frontend**: React 19, Vite, TypeScript, TailwindCSS v4 для верстки, Zustand для управления состоянием, Lucide-React для иконок.
* **Database**: PostgreSQL (основная БД) + Redis (брокер очередей для BullMQ).
* **Infrastructure**: Docker, Docker Compose, Caddy (как реверс-прокси на сервере), GitHub Actions (автоматический деплой).

---

## 💾 2. Моделирование базы данных (Prisma Schema)
Разработана реляционная схема базы данных в [schema.prisma](file:///d:/MDKPRK/Desktop/MySmartCalendar/backend/prisma/schema.prisma):
* `User` — хранит профиль пользователя, его Telegram ID, юзернейм, настройки часового пояса и уведомлений.
* `ShiftProfile` — шаблон смен пользователя (например, День / Ночь / Отсыпной / Выходной) с привязкой к дате старта.
* `MonthlySchedule` и `ShiftDay` — сетка смен на конкретный месяц с поддержкой ручных изменений дней и подтверждения графика.
* `Event` и `Task` — события календаря и задачи из списка дел.
* `Reminder` — запланированные и отправленные напоминания.
* `NotificationSetting` — детальные настройки напоминаний (за сколько минут до события оповещать, время отправки суточных сводок).
* `Note` — текстовые заметки к дням.
* `AiConversation` — история диалога со встроенным AI-ассистентом (Gemini 2.0).

---

## ⚙️ 3. Реализация Бэкенда и Telegram-бота
* **API Роуты**: Реализованы CRUD-контроллеры для работы со сменами, календарем событий, задачами и настройками пользователя.
* **Авторизация**: Защита эндпоинтов с помощью JWT (Bearer Token). Сессия выдается при проверке авторизационных данных Telegram.
* **Telegram-бот**: Бот `@MySmartCalBot` на базе `grammy` с обработкой команды `/start`, который приветствует пользователя и выводит Inline-кнопку для открытия Telegram Mini App.
* **Очереди уведомлений**: Настроена библиотека `BullMQ` с воркером для асинхронного планирования и отправки сообщений пользователям через бота (сводки на день, неделю, напоминания о задачах).

---

## 📱 4. Интерфейс Telegram Mini App (TMA)
Разработан премиальный адаптивный интерфейс с тремя вкладками (TabBar):
1. **Календарь смен** — сетка месяца с цветовой индикацией смен. По клику открывается шторка (Drawer) для ручного изменения типа смены и добавления заметки. Реализована кнопка подтверждения графика на месяц.
2. **Задачи** — список дел с приоритетами (Low, Medium, High, Urgent), дедлайнами и фильтрацией (активные/завершенные).
3. **Настройки** — выбор часового пояса, переключатели уведомлений и настройка даты начала текущего цикла смен.

---

## 🐳 5. Конфигурация деплоя и серверов
* **Docker**: Созданы [docker-compose.yml](file:///d:/MDKPRK/Desktop/MySmartCalendar/docker-compose.yml) и [Dockerfile](file:///d:/MDKPRK/Desktop/MySmartCalendar/docker/Dockerfile) для контейнеризации приложения, PostgreSQL и Redis.
* **Порты**: Для исключения конфликтов с уже запущенным на VPS проектом (`club-loyalty` на порту `3005`) бэкенду назначен порт **`3006`**.
* **Caddy (Прокси)**: Настроен Caddyfile хоста на сервере для перенаправления домена `https://calendar.217-30-10-118.nip.io` на локальный порт контейнера `127.0.0.1:3006`.
* **CI/CD**: Настроен GitHub Actions workflow в [.github/workflows/deploy.yml](file:///d:/MDKPRK/Desktop/MySmartCalendar/.github/workflows/deploy.yml) для автоматической сборки и деплоя проекта на VPS при пуше в ветку `main`.

---

## 🔧 6. Исправление критических ошибок деплоя и запуска

### 1. Ошибка Prisma в Docker (Alpine)
* **Проблема**: Prisma Query Engine падал в Alpine из-за отсутствия нужных библиотек OpenSSL.
* **Решение**: Добавлен `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` в Prisma Schema. В финальный образ Dockerfile добавлены пакеты `openssl` и `libc6-compat`, а генерация клиента перенесена на этап запуска контейнера.

### 2. Ошибка цифровой подписи Telegram (`initDataRaw`)
* **Проблема**: Приложение выдавало ошибку `Неверная цифровая подпись Telegram или данные устарели`.
* **Решение**: В [auth.ts](file:///d:/MDKPRK/Desktop/MySmartCalendar/backend/src/middleware/auth.ts) исправлена опечатка в константе HMAC-соли (с `'WebAppsData'` на `'WebAppData'`). Также переписан фильтр разбора параметров: теперь исключается **только** параметр `hash`, что позволило корректно учитывать параметр `signature` в проверке.

### 3. Отсутствие таблиц БД и падение сервера при авторизации (500 Error)
* **Проблема**: Ошибка `The table public.User does not exist in the current database` при попытке входа.
* **Решение**:
  * Сгенерирована начальная SQL-миграция для PostgreSQL: [backend/prisma/migrations/0_init/migration.sql](file:///d:/MDKPRK/Desktop/MySmartCalendar/backend/prisma/migrations/0_init/migration.sql) с помощью `prisma migrate diff`.
  * В CI/CD скрипт [.github/workflows/deploy.yml](file:///d:/MDKPRK/Desktop/MySmartCalendar/.github/workflows/deploy.yml) добавлен цикл ожидания готовности базы данных через утилиту `pg_isready` (так как Postgres стартовал дольше, чем накатывались таблицы).
  * Команда инициализации БД в CI/CD переведена на стандартную `npx prisma migrate deploy` для долгосрочной стабильной поддержки версионирования схемы.
