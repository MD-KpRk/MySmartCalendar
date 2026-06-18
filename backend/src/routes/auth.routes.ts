import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyTelegramInitData } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret-key-12345';

router.post('/telegram', async (req: any, res: Response) => {
  const { initDataRaw } = req.body;

  if (!initDataRaw) {
    return res.status(400).json({ error: 'Параметр initDataRaw обязателен' });
  }

  const { isValid, user: tgUser } = verifyTelegramInitData(initDataRaw);

  if (!isValid || !tgUser) {
    return res.status(401).json({ error: 'Неверная цифровая подпись Telegram или данные устарели' });
  }

  try {
    const telegramId = BigInt(tgUser.id);

    // Ищем пользователя или создаем, если он зашел впервые
    let dbUser = await prisma.user.findUnique({
      where: { telegramId },
      include: { shifts: true }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername: tgUser.username || null,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || null,
          timezone: 'Europe/Moscow',
          // Сразу создаем дефолтный профиль смен День/Ночь/Отсыпной/Выходной (Д/Н/О/В)
          shifts: {
            create: {
              name: 'Основной (Д/Н/О/В)',
              pattern: ['DAY', 'NIGHT', 'SLEEP', 'OFF'],
              startDate: new Date(), // стартует с сегодняшнего дня по умолчанию
              isDefault: true
            }
          },
          // Создаем базовые настройки уведомлений
          notificationSettings: {
            createMany: {
              data: [
                { type: 'EVENT_REMINDER', enabled: true, minutesBefore: 30 },
                { type: 'DAILY_SUMMARY', enabled: true, time: '08:00' },
                { type: 'WEEKLY_PLAN', enabled: true, time: '10:00' },
                { type: 'UNFINISHED_TASKS', enabled: true, time: '21:00' }
              ]
            }
          }
        },
        include: { shifts: true }
      });
    } else {
      // Обновляем username или имя, если они изменились в Telegram
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          telegramUsername: tgUser.username || null,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || null
        }
      });
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: dbUser.id, telegramId: dbUser.telegramId.toString() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: dbUser.id,
        telegramId: dbUser.telegramId.toString(),
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        timezone: dbUser.timezone,
        shifts: dbUser.shifts
      }
    });
  } catch (error) {
    console.error('Ошибка авторизации пользователя:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при авторизации' });
  }
});

export default router;
