import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { TaskStatus, Priority } from '@prisma/client';

const router = Router();
router.use(requireAuth);

/**
 * Получить список задач пользователя
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: [
        { status: 'asc' }, // сначала PENDING / IN_PROGRESS
        { priority: 'desc' }, // по приоритету (высокий сначала)
        { deadline: 'asc' } // по дедлайну
      ]
    });

    return res.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Создать новую задачу
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, deadline, priority, tags } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Параметр title обязателен' });
  }

  try {
    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || Priority.MEDIUM,
        tags: tags || []
      }
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Обновить существующую задачу
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { title, description, deadline, status, priority, tags } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID задачи' });
  }

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Задача не найдена или нет прав доступа' });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (deadline !== undefined) dataToUpdate.deadline = deadline ? new Date(deadline) : null;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (tags !== undefined) dataToUpdate.tags = tags;
    
    if (status !== undefined) {
      dataToUpdate.status = status;
      // Если статус изменился на DONE, пишем completedAt
      if (status === TaskStatus.DONE && existing.status !== TaskStatus.DONE) {
        dataToUpdate.completedAt = new Date();
      } else if (status !== TaskStatus.DONE) {
        dataToUpdate.completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: dataToUpdate
    });

    return res.json(updated);
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Удалить задачу
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID задачи' });
  }

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Задача не найдена или нет прав доступа' });
    }

    await prisma.task.delete({
      where: { id }
    });

    return res.json({ success: true, message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
