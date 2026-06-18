import { Bot, InlineKeyboard } from 'grammy';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TMA_URL = process.env.TMA_URL || 'https://calendar.yourdomain.com';

if (!BOT_TOKEN) {
  console.warn('ВНИМАНИЕ: Переменная TELEGRAM_BOT_TOKEN не задана. Telegram-бот не будет запущен.');
}

export const bot = BOT_TOKEN && BOT_TOKEN !== 'mock_token' ? new Bot(BOT_TOKEN) : null;

export async function initBot() {
  if (!bot) {
    console.log('Запуск Telegram-бота пропущен (отсутствует токен или режим разработки).');
    return;
  }

  // Обработка команды /start
  bot.command('start', async (ctx) => {
    const username = ctx.from?.first_name || 'друг';
    
    const keyboard = new InlineKeyboard().webApp(
      '📅 Открыть Календарь',
      TMA_URL
    );

    await ctx.reply(
      `Привет, ${username}! 👋\n\n` +
      `Добро пожаловать в **MySmartCalendar** — твой личный умный календарь смен!\n\n` +
      `Нажми кнопку ниже, чтобы открыть календарь, настроить свой график 2/2 (или любой другой) и начать планирование.`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  });

  // Запуск бота в фоновом режиме (long polling)
  bot.start({
    onStart: (botInfo) => {
      console.log(`Telegram-бот @${botInfo.username} успешно запущен в режиме Long Polling.`);
    }
  }).catch((err) => {
    console.error('Ошибка при запуске Telegram-бота:', err);
  });
}
