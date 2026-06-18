import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  telegramId?: bigint;
}

/**
 * Валидирует initDataRaw от Telegram с использованием HMAC-SHA256
 */
export function verifyTelegramInitData(initDataRaw: string): { isValid: boolean; user?: any } {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'mock_token';

  if (BOT_TOKEN === 'mock_token') {
    // В режиме локальной разработки без реального токена пропускаем проверку для моков
    console.warn('ВНИМАНИЕ: Используется mock_token. Проверка initData пропущена.');
    const params = new URLSearchParams(initDataRaw);
    const userStr = params.get('user');
    return {
      isValid: true,
      user: userStr ? JSON.parse(userStr) : { id: 12345, first_name: 'DevUser', username: 'dev_user' }
    };
  }

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) {
      console.error('Ошибка верификации: отсутствуют параметры или hash в initDataRaw');
      return { isValid: false };
    }

    // Собираем все параметры, кроме hash, сортируем по алфавиту
    const keys = Array.from(params.keys()).filter((key) => key !== 'hash');
    keys.sort();

    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    // Вычисляем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    // Вычисляем валидационный хэш
    const validationHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (validationHash !== hash) {
      console.error('КРИТИЧЕСКАЯ ОШИБКА: Подпись Telegram не совпала!');
      console.error('Входящий initDataRaw:', initDataRaw);
      console.error('Сформированная dataCheckString:', dataCheckString);
      console.error('Вычисленный validationHash:', validationHash);
      console.error('Ожидаемый hash от Telegram:', hash);
      return { isValid: false };
    }

    // Проверяем актуальность данных (рекомендуется проверять auth_date, например, не старше 7 дней)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400 * 7) { 
      console.error('Ошибка верификации: данные initData устарели (более 7 дней)');
      return { isValid: false };
    }

    const userStr = params.get('user');
    return {
      isValid: true,
      user: userStr ? JSON.parse(userStr) : undefined
    };
  } catch (e) {
    console.error('Ошибка верификации initData:', e);
    return { isValid: false };
  }
}

/**
 * Middleware для защиты API роутов с помощью JWT
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret-key-12345';
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация (Bearer Token)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; telegramId: string };
    req.userId = decoded.userId;
    req.telegramId = BigInt(decoded.telegramId);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Неверный или просроченный токен' });
  }
}
