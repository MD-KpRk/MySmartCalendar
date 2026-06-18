import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { NotifType } from '@prisma/client';

const router = Router();
router.use(requireAuth);

/**
 * Получить настройки пользователя и уведомлений
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        timezone: true,
        notifyEnabled: true,
        dailySummaryTime: true,
        notificationSettings: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Ошибка при получении настроек:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить общие настройки пользователя
 */
router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  const { timezone, notifyEnabled, dailySummaryTime } = req.body;

  const updateData: any = {};
  if (timezone !== undefined) updateData.timezone = timezone;
  if (notifyEnabled !== undefined) updateData.notifyEnabled = !!notifyEnabled;
  if (dailySummaryTime !== undefined) {
    // Валидируем формат HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(dailySummaryTime)) {
      return res.status(400).json({ error: 'Неверный формат dailySummaryTime (ожидается HH:MM)' });
    }
    updateData.dailySummaryTime = dailySummaryTime;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        timezone: true,
        notifyEnabled: true,
        dailySummaryTime: true
      }
    });

    // TODO: В будущем пересчитать ежедневные задачи BullMQ при изменении dailySummaryTime

    return res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка при обновлении настроек:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить настройки конкретного типа уведомления
 */
router.put('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const { type, enabled, minutesBefore, time } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Параметр type обязателен' });
  }

  const validTypes = Object.values(NotifType);
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Параметр type должен быть одним из: ${validTypes.join(', ')}` });
  }

  try {
    const upsertedSetting = await prisma.notificationSetting.upsert({
      where: {
        userId_type: {
          userId: req.userId!,
          type: type as NotifType
        }
      },
      update: {
        enabled: enabled !== undefined ? !!enabled : undefined,
        minutesBefore: minutesBefore !== undefined ? parseInt(minutesBefore, 10) : undefined,
        time: time !== undefined ? time : undefined
      },
      create: {
        userId: req.userId!,
        type: type as NotifType,
        enabled: enabled !== undefined ? !!enabled : true,
        minutesBefore: minutesBefore !== undefined ? parseInt(minutesBefore, 10) : 30,
        time: time || '08:00'
      }
    });

    return res.json(upsertedSetting);
  } catch (error) {
    console.error('Ошибка при обновлении настроек уведомлений:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
