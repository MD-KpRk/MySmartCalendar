import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function getRedisOptions() {
  try {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Обязательно для BullMQ
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

export const redisOptions = getRedisOptions();

// Создаем очередь для отправки напоминаний в Telegram
export const notificationQueue = new Queue('telegram-notifications', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3, // 3 попытки при сбое
    backoff: {
      type: 'exponential',
      delay: 5000, // Задержка между попытками
    },
    removeOnComplete: true, // Удалять успешные джобы
    removeOnFail: false, // Оставлять неудачные для анализа
  },
});

/**
 * Добавляет задачу напоминания в очередь
 * @param userId ID пользователя в БД
 * @param telegramId Telegram ID пользователя
 * @param message Текст сообщения
 * @param delayMs Задержка отправки в миллисекундах (отложенная задача)
 */
export async function scheduleNotification(userId: number, telegramId: string, message: string, delayMs: number) {
  await notificationQueue.add(
    'send-message',
    { userId, telegramId, message },
    { delay: delayMs }
  );
}
