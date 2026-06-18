import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();
router.use(requireAuth);

/**
 * Получить список событий пользователя (с опциональной фильтрацией по датам)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;

  try {
    const whereClause: any = { userId: req.userId };

    if (from || to) {
      whereClause.startAt = {};
      if (from) {
        whereClause.startAt.gte = new Date(from as string);
      }
      if (to) {
        whereClause.startAt.lte = new Date(to as string);
      }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { startAt: 'asc' }
    });

    return res.json(events);
  } catch (error) {
    console.error('Ошибка при получении событий:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Создать новое событие
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, location, startAt, endAt, allDay, color, recurrence } = req.body;

  if (!title || !startAt) {
    return res.status(400).json({ error: 'Параметры title и startAt обязательны' });
  }

  try {
    const event = await prisma.event.create({
      data: {
        userId: req.userId!,
        title,
        description,
        location,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        allDay: !!allDay,
        color,
        recurrence: recurrence || null
      }
    });

    // TODO: В будущем здесь будет вызов пересчета напоминаний в BullMQ

    return res.status(201).json(event);
  } catch (error) {
    console.error('Ошибка при создании события:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить существующее событие
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { title, description, location, startAt, endAt, allDay, color, recurrence } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID события' });
  }

  try {
    // Проверяем принадлежность события пользователю
    const existing = await prisma.event.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Событие не найдено или нет прав доступа' });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        location: location !== undefined ? location : existing.location,
        startAt: startAt ? new Date(startAt) : existing.startAt,
        endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : existing.endAt,
        allDay: allDay !== undefined ? !!allDay : existing.allDay,
        color: color !== undefined ? color : existing.color,
        recurrence: recurrence !== undefined ? recurrence : existing.recurrence
      }
    });

    // TODO: Пересчитать напоминания в BullMQ

    return res.json(updated);
  } catch (error) {
    console.error('Ошибка при обновлении события:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Удалить событие
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID события' });
  }

  try {
    const existing = await prisma.event.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Событие не найдено или нет прав доступа' });
    }

    await prisma.event.delete({
      where: { id }
    });

    // TODO: Удалить напоминания этого события в BullMQ

    return res.json({ success: true, message: 'Событие успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении события:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
