import prisma from '../prisma.js';
import { ShiftType } from '@prisma/client';

export interface ShiftDayInfo {
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  note?: string | null;
  isConfirmed: boolean;
}

/**
 * Преобразует объект даты в локальную строку YYYY-MM-DD
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Генерирует массив дат для определенного года и месяца
 */
function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  // month в JS Date идет от 0 до 11. Переданный month идет от 1 до 12.
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // 0-й день следующего месяца — это последний день нужного

  for (let d = startDate; d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

export class ShiftsService {
  /**
   * Получает расписание смен на месяц (сгенерированное или подтвержденное)
   */
  static async getMonthlySchedule(userId: number, year: number, month: number): Promise<{ confirmed: boolean; days: ShiftDayInfo[] }> {
    // 1. Ищем сохраненный (подтвержденный) график в БД
    const savedSchedule = await prisma.monthlySchedule.findUnique({
      where: {
        userId_year_month: { userId, year, month }
      },
      include: {
        days: true
      }
    });

    if (savedSchedule && savedSchedule.confirmed) {
      // Возвращаем сохраненный график
      const days: ShiftDayInfo[] = savedSchedule.days.map((d) => ({
        date: toLocalDateString(d.date),
        shiftType: d.shiftType,
        note: d.note,
        isConfirmed: true
      }));

      // Сортируем по дате
      days.sort((a, b) => a.date.localeCompare(b.date));

      return {
        confirmed: true,
        days
      };
    }

    // 2. Если графика нет или он не подтвержден, генерируем на основе базового профиля
    const profile = await prisma.shiftProfile.findFirst({
      where: { userId, isDefault: true }
    });

    if (!profile || profile.pattern.length === 0) {
      // Нет профиля — возвращаем пустую сетку со сменами OFF (выходной)
      const dates = getDatesInMonth(year, month);
      return {
        confirmed: false,
        days: dates.map((date) => ({
          date: toLocalDateString(date),
          shiftType: ShiftType.OFF,
          isConfirmed: false
        }))
      };
    }

    const { pattern, startDate } = profile;
    const dates = getDatesInMonth(year, month);
    
    // Получаем переопределенные дни (если график еще не подтвержден, но отдельные дни отредактированы)
    const tempDays = savedSchedule ? savedSchedule.days : [];
    const tempDaysMap = new Map(tempDays.map(d => [toLocalDateString(d.date), d]));

    const days: ShiftDayInfo[] = dates.map((date) => {
      const dateStr = toLocalDateString(date);
      
      // Если день был вручную переопределен пользователем
      if (tempDaysMap.has(dateStr)) {
        const tempDay = tempDaysMap.get(dateStr)!;
        return {
          date: dateStr,
          shiftType: tempDay.shiftType,
          note: tempDay.note,
          isConfirmed: false
        };
      }

      // Вычисляем смену по формуле циклического сдвига
      // Рассчитываем разницу в днях между startDate профиля и целевой датой
      const t1 = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const t2 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const diffTime = t2 - t1;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let shiftType: ShiftType = ShiftType.OFF;
      if (diffDays >= 0) {
        const index = diffDays % pattern.length;
        shiftType = pattern[index];
      } else {
        // Для дат до startDate
        const index = ((diffDays % pattern.length) + pattern.length) % pattern.length;
        shiftType = pattern[index];
      }

      return {
        date: dateStr,
        shiftType,
        isConfirmed: false
      };
    });

    return {
      confirmed: false,
      days
    };
  }

  /**
   * Обновляет (переопределяет) конкретный день в расписании (до подтверждения или после)
   */
  static async updateDayShift(userId: number, year: number, month: number, dateStr: string, shiftType: ShiftType, note?: string): Promise<any> {
    const targetDate = new Date(dateStr);

    // Ищем или создаем черновик расписания на месяц
    let schedule = await prisma.monthlySchedule.findUnique({
      where: { userId_year_month: { userId, year, month } }
    });

    if (!schedule) {
      schedule = await prisma.monthlySchedule.create({
        data: { userId, year, month, confirmed: false }
      });
    }

    // Добавляем или обновляем смену в этот день
    const existingDay = await prisma.shiftDay.findFirst({
      where: { monthlyScheduleId: schedule.id, date: targetDate }
    });

    if (existingDay) {
      return prisma.shiftDay.update({
        where: { id: existingDay.id },
        data: { shiftType, note }
      });
    } else {
      return prisma.shiftDay.create({
        data: {
          monthlyScheduleId: schedule.id,
          date: targetDate,
          shiftType,
          note
        }
      });
    }
  }

  /**
   * Подтверждает сгенерированное расписание на месяц, фиксируя его в БД
   */
  static async confirmMonthlySchedule(userId: number, year: number, month: number): Promise<any> {
    // 1. Генерируем полную сетку смен на месяц (с учетом уже внесенных изменений)
    const { days } = await this.getMonthlySchedule(userId, year, month);

    // 2. Ищем или создаем запись MonthlySchedule
    let schedule = await prisma.monthlySchedule.findUnique({
      where: { userId_year_month: { userId, year, month } }
    });

    if (!schedule) {
      schedule = await prisma.monthlySchedule.create({
        data: { userId, year, month, confirmed: true }
      });
    } else {
      await prisma.monthlySchedule.update({
        where: { id: schedule.id },
        data: { confirmed: true }
      });
    }

    // 3. Записываем/перезаписываем все дни месяца в базу
    const prismaTx = days.map((day) => {
      const targetDate = new Date(day.date);
      return prisma.shiftDay.upsert({
        where: {
          monthlyScheduleId_date: {
            monthlyScheduleId: schedule!.id,
            date: targetDate
          }
        },
        update: {
          shiftType: day.shiftType,
          note: day.note
        },
        create: {
          monthlyScheduleId: schedule!.id,
          date: targetDate,
          shiftType: day.shiftType,
          note: day.note
        }
      });
    });

    await prisma.$transaction(prismaTx);

    return prisma.monthlySchedule.findUnique({
      where: { id: schedule.id },
      include: { days: true }
    });
  }
}
