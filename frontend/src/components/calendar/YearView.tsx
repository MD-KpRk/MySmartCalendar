import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addYears, 
  subYears,
  startOfMonth,
  getDaysInMonth,
  getDay,
  isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface YearViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onSwitchToMonth: () => void;
}

export default function YearView({ currentDate, setCurrentDate, onSwitchToMonth }: YearViewProps) {
  const { schedules, fetchYearlySchedules, isLoading } = useStore();
  const year = currentDate.getFullYear();

  useEffect(() => {
    fetchYearlySchedules(year);
  }, [year, fetchYearlySchedules]);

  const handlePrevYear = () => setCurrentDate(subYears(currentDate, 1));
  const handleNextYear = () => setCurrentDate(addYears(currentDate, 1));

  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleMonthClick = (monthIdx: number) => {
    // Устанавливаем дату на 1 число выбранного месяца и года
    setCurrentDate(new Date(year, monthIdx, 1));
    onSwitchToMonth();
  };

  const renderMiniMonth = (monthIdx: number) => {
    const monthDate = new Date(year, monthIdx, 1);
    const firstDay = startOfMonth(monthDate);
    // Смещение: 0 (Пн) - 6 (Вс)
    const startOffset = (getDay(firstDay) + 6) % 7;
    const daysInMonth = getDaysInMonth(monthDate);
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    const schedule = schedules[monthKey];
    
    const shiftMap = new Map(schedule?.days.map(d => [d.date, d]) || []);

    const cells = [];
    
    // Пустые ячейки для выравнивания
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square w-full"></div>);
    }

    // Дни месяца
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayShift = shiftMap.get(dateStr);
      const isTodayDay = isToday(new Date(year, monthIdx, d));

      // Цвет для каждого типа смены
      let colorClass = 'bg-neutral-50 text-neutral-400 border-neutral-100';
      if (dayShift?.shiftType === 'DAY') {
        colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
      } else if (dayShift?.shiftType === 'NIGHT') {
        colorClass = 'bg-indigo-50 text-indigo-850 border-indigo-200';
      } else if (dayShift?.shiftType === 'SLEEP') {
        colorClass = 'bg-purple-50 text-purple-850 border-purple-200';
      } else if (dayShift?.shiftType === 'OFF') {
        colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      }

      cells.push(
        <div
          key={d}
          className={`aspect-square w-full text-[6.5px] font-extrabold flex items-center justify-center rounded-sm border ${colorClass} ${
            isTodayDay ? 'ring-1 ring-tg-primary ring-offset-[0.5px] ring-offset-tg-secondary-bg' : ''
          }`}
        >
          {d}
        </div>
      );
    }

    return cells;
  };

  // Компонент скелетона для загрузки года
  const YearSkeleton = () => (
    <div className="grid grid-cols-3 gap-2.5 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-2.5 h-[115px] flex flex-col justify-between">
          <div className="h-3 bg-neutral-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: 35 }).map((_, j) => (
              <div key={j} className="aspect-square bg-neutral-100 rounded-sm"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Шапка навигации по годам */}
      <div className="flex items-center justify-between bg-tg-secondary-bg p-3 rounded-xl border border-neutral-200">
        <button onClick={handlePrevYear} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-extrabold text-base">
          {year} год
        </span>
        <button onClick={handleNextYear} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Сетка мини-месяцев или лоадер */}
      {isLoading ? (
        <YearSkeleton />
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {months.map((monthIdx) => {
            const date = new Date(year, monthIdx, 1);
            const monthName = format(date, 'LLLL', { locale: ru });
            const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            return (
              <button
                key={monthIdx}
                onClick={() => handleMonthClick(monthIdx)}
                className="bg-tg-secondary-bg border border-neutral-200 hover:border-neutral-300 rounded-xl p-2.5 flex flex-col justify-start text-left cursor-pointer transition-all hover:scale-[1.02] duration-200 active:scale-[0.98] outline-none focus:border-tg-primary/30"
              >
                {/* Название месяца */}
                <span className="text-[10px] font-extrabold text-center block w-full mb-1.5 text-tg-text">
                  {capitalizedMonthName}
                </span>

                {/* Строка дней недели */}
                <div className="grid grid-cols-7 text-center text-[6px] text-tg-hint font-bold uppercase mb-1">
                  <div>п</div>
                  <div>в</div>
                  <div>с</div>
                  <div>ч</div>
                  <div>п</div>
                  <div>с</div>
                  <div>в</div>
                </div>

                {/* Сетка дней */}
                <div className="grid grid-cols-7 gap-0.5 w-full">
                  {renderMiniMonth(monthIdx)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
