import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBot } from './bot/bot.js';
import { initNotificationWorker } from './jobs/worker.js';

// Импорт роутов
import authRouter from './routes/auth.routes.js';
import shiftsRouter from './routes/shifts.routes.js';
import eventsRouter from './routes/events.routes.js';
import tasksRouter from './routes/tasks.routes.js';
import settingsRouter from './routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS для разработки
app.use(cors({
  origin: '*', // В продакшене можно ограничить конкретным доменом TMA
  credentials: true
}));

app.use(express.json());

// API роуты
app.use('/api/auth', authRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/settings', settingsRouter);

// Раздача собранной статики фронтенда (React SPA)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Для всех остальных GET-запросов (не относящихся к /api) отдаем index.html (SPA Routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Запуск сервера Express
app.listen(PORT, () => {
  console.log(`Сервер MySmartCalendar запущен на порту ${PORT}`);
  
  // Инициализация и запуск Telegram бота
  initBot();
  
  // Запуск воркера уведомлений BullMQ
  initNotificationWorker();
});
