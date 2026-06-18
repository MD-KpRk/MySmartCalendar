import { Worker, Job } from 'bullmq';
import { redisOptions } from './queue.js';
import { bot } from '../bot/bot.js';

interface NotificationJobData {
  userId: number;
  telegramId: string;
  message: string;
  reminderId?: number;
}

export function initNotificationWorker() {
  if (!bot) {
    console.log('Воркер BullMQ запущен без Telegram бота (режим разработки). Сообщения будут логироваться в консоль.');
  }

  const worker = new Worker<NotificationJobData>(
    'telegram-notifications',
    async (job: Job<NotificationJobData>) => {
      const { telegramId, message, userId } = job.data;
      
      console.log(`[BullMQ Worker] Обработка задачи отправки пользователю ID:${userId} (TG:${telegramId})`);

      if (bot) {
        try {
          await bot.api.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
          console.log(`[BullMQ Worker] Сообщение успешно отправлено пользователю TG:${telegramId}`);
        } catch (error: any) {
          console.error(`[BullMQ Worker] Ошибка при отправке сообщения в Telegram (TG:${telegramId}):`, error);
          throw error;
        }
      } else {
        console.log(`[Mock Send TG to ${telegramId}]: ${message}`);
      }
    },
    {
      connection: redisOptions,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Задача ${job.id} успешно выполнена.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Задача ${job?.id} завершилась с ошибкой:`, err);
  });

  console.log('BullMQ воркер для Telegram-уведомлений успешно запущен.');
}
