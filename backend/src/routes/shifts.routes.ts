import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ShiftsService } from '../services/shifts.service.js';
import prisma from '../prisma.js';
import { ShiftType } from '@prisma/client';

const router = Router();

// Все роуты защищены авторизацией
router.use(requireAuth);

/**
 * Получить текущий профиль смен пользователя
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await prisma.shiftProfile.findFirst({
      where: { userId: req.userId, isDefault: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Профиль смен не найден' });
    }

    return res.json(profile);
  } catch (error) {
    console.error('Ошибка при получении профиля смен:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить профиль смен пользователя (например, поменять паттерн или дату начала)
 */
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  const { pattern, startDate, name } = req.body;

  if (!pattern || !Array.isArray(pattern) || pattern.length === 0) {
    return res.status(400).json({ error: 'Параметр pattern должен быть непустым массивом' });
  }

  // Валидируем элементы паттерна
  const validTypes = Object.values(ShiftType);
  const isValidPattern = pattern.every((type: any) => validTypes.includes(type));

  if (!isValidPattern) {
    return res.status(400).json({ error: `Параметр pattern может содержать только значения: ${validTypes.join(', ')}` });
  }

  if (!startDate) {
    return res.status(400).json({ error: 'Параметр startDate обязателен' });
  }

  try {
    const parsedDate = new Date(startDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Неверный формат даты startDate' });
    }

    // Ищем дефолтный профиль
    let profile = await prisma.shiftProfile.findFirst({
      where: { userId: req.userId, isDefault: true }
    });

    if (profile) {
      profile = await prisma.shiftProfile.update({
        where: { id: profile.id },
        data: {
          pattern: pattern as ShiftType[],
          startDate: parsedDate,
          name: name || profile.name
        }
      });
    } else {
      profile = await prisma.shiftProfile.create({
        data: {
          userId: req.userId!,
          pattern: pattern as ShiftType[],
          startDate: parsedDate,
          name: name || 'Основной',
          isDefault: true
        }
      });
    }

    // При изменении базового профиля сбрасываем неподтвержденные графики на будущие месяцы
    // Чтобы они перегенерировались по новому шаблону
    await prisma.monthlySchedule.deleteMany({
      where: {
        userId: req.userId,
        confirmed: false
      }
    });

    return res.json(profile);
  } catch (error) {
    console.error('Ошибка при обновлении профиля смен:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Получить сетку смен на определенный год/месяц
 */
router.get('/monthly/:year/:month', async (req: AuthenticatedRequest, res: Response) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Неверные параметры года или месяца' });
  }

  try {
    const schedule = await ShiftsService.getMonthlySchedule(req.userId!, year, month);
    return res.json(schedule);
  } catch (error) {
    console.error('Ошибка при получении графика смен:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить конкретный день в расписании (в черновике или подтвержденном)
 */
router.put('/monthly/:year/:month/day', async (req: AuthenticatedRequest, res: Response) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  const { date, shiftType, note } = req.body;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Неверные параметры года или месяца' });
  }

  if (!date || !shiftType) {
    return res.status(400).json({ error: 'Параметры date и shiftType обязательны' });
  }

  const validTypes = Object.values(ShiftType);
  if (!validTypes.includes(shiftType)) {
    return res.status(400).json({ error: `Параметр shiftType должен быть одним из: ${validTypes.join(', ')}` });
  }

  try {
    const dayShift = await ShiftsService.updateDayShift(req.userId!, year, month, date, shiftType, note);
    return res.json(dayShift);
  } catch (error) {
    console.error('Ошибка при редактировании дня смены:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Подтвердить график смен на месяц
 */
router.post('/monthly/:year/:month/confirm', async (req: AuthenticatedRequest, res: Response) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Неверные параметры года или месяца' });
  }

  try {
    const confirmedSchedule = await ShiftsService.confirmMonthlySchedule(req.userId!, year, month);
    return res.json({
      success: true,
      message: 'График смен успешно зафиксирован',
      schedule: confirmedSchedule
    });
  } catch (error) {
    console.error('Ошибка при подтверждении графика смен:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
