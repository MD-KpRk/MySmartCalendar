import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  subWeeks,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  getWeek,
  isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { SHIFT_TYPES } from './MonthView.js';

interface WeekViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onSwitchToDay: () => void;
}

export default function WeekView({ currentDate, setCurrentDate, onSwitchToDay }: WeekViewProps) {
  const { 
    schedules, 
    fetchMonthlySchedule, 
    tasks, 
    fetchTasks, 
    updateTask
  } = useStore();

  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1;
  const endYear = end.getFullYear();
  const endMonth = end.getMonth() + 1;

  useEffect(() => {
    fetchMonthlySchedule(startYear, startMonth);
    if (startMonth !== endMonth || startYear !== endYear) {
      fetchMonthlySchedule(endYear, endMonth);
    }
    fetchTasks();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, startYear, startMonth, endYear, endMonth]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  // Генерируем 7 дней недели
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  // Получаем номер недели
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });

  // Форматируем диапазон дат для шапки
  const formattedRange = `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;

  const handleToggleTaskStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask(id, { status: nextStatus });
  };

  const handleDaySelect = (day: Date) => {
    setCurrentDate(day);
  };

  return (
    <div className="space-y-4">
      {/* Шапка навигации по неделям */}
      <div className="flex items-center justify-between bg-tg-secondary-bg p-3 rounded-xl border border-neutral-900">
        <button onClick={handlePrevWeek} className="p-2 hover:bg-neutral-800 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="font-bold block text-sm leading-tight">
            Неделя {weekNumber}
          </span>
          <span className="text-[10px] text-tg-hint font-semibold uppercase tracking-wider">
            {formattedRange}
          </span>
        </div>
        <button onClick={handleNextWeek} className="p-2 hover:bg-neutral-800 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 7 Вертикальных Карточек дней недели */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dYear = day.getFullYear();
          const dMonth = day.getMonth() + 1;
          const monthKey = `${dYear}-${String(dMonth).padStart(2, '0')}`;
          const dateStr = format(day, 'yyyy-MM-dd');
          
          const schedule = schedules[monthKey];
          const shift = schedule?.days.find(d => d.date === dateStr);
          const shiftConfig = SHIFT_TYPES.find(t => t.type === shift?.shiftType);
          const ShiftIcon = shiftConfig?.icon;
          
          const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));
          const isCurrentSelected = isSameDay(currentDate, day);
          const isTodayDay = isToday(day);

          const weekdayName = format(day, 'EEEE', { locale: ru });
          const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

          return (
            <div 
              key={dateStr}
              onClick={() => handleDaySelect(day)}
              className={`p-3 bg-tg-secondary-bg border rounded-xl flex flex-col space-y-2.5 transition-all duration-200 cursor-pointer ${
                isCurrentSelected 
                  ? 'border-tg-primary/60 shadow-lg shadow-tg-primary/5 ring-1 ring-tg-primary/30' 
                  : 'border-neutral-900 hover:border-neutral-800'
              }`}
            >
              {/* Верхняя строка карточки: Дата и Смена */}
              <div className="flex items-start justify-between">
                {/* Инфо о дате */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs ${
                    isTodayDay 
                      ? 'bg-tg-primary text-tg-primary-text shadow-md' 
                      : 'bg-neutral-955 text-tg-text border border-neutral-900'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider opacity-85 leading-none mb-0.5">
                      {format(day, 'eee', { locale: ru })}
                    </span>
                    <span className="text-sm font-extrabold leading-none">
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-tg-text">
                      {format(day, 'd MMMM', { locale: ru })}
                    </h4>
                    <p className="text-[10px] text-tg-hint">
                      {capitalizedWeekday}
                    </p>
                  </div>
                </div>

                {/* Бейдж Смены */}
                <div className="flex items-center gap-1.5">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    shiftConfig 
                      ? shiftConfig.color + ' border-current/15' 
                      : 'bg-neutral-955 text-neutral-400 border-neutral-850'
                  }`}>
                    {ShiftIcon && <ShiftIcon size={12} />}
                    <span>{shiftConfig ? shiftConfig.label : 'Без смены'}</span>
                  </div>

                  {/* Кнопка "Подробнее" */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentDate(day);
                      onSwitchToDay();
                    }}
                    className="p-1.5 hover:bg-neutral-800 rounded-lg text-tg-hint hover:text-tg-text transition-colors"
                    title="Подробный вид"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              {/* Средняя часть: Заметка и Задачи */}
              {(shift?.note || dayTasks.length > 0) && (
                <div className="pl-12 space-y-2 border-t border-neutral-850/40 pt-2 text-xs">
                  {/* Заметка */}
                  {shift?.note && (
                    <div className="flex items-start gap-1.5 text-tg-hint bg-neutral-950/40 p-1.5 rounded-lg border border-neutral-900/50">
                      <FileText size={12} className="mt-0.5 shrink-0 text-tg-hint/80" />
                      <span className="text-[10px] italic leading-tight">
                        {shift.note}
                      </span>
                    </div>
                  )}

                  {/* Список задач */}
                  {dayTasks.length > 0 && (
                    <div className="space-y-1">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center gap-2 text-[10px] text-tg-text"
                          onClick={(e) => e.stopPropagation()} // Предотвращаем клик по карточке дня при клике на задачу
                        >
                          <button 
                            onClick={() => handleToggleTaskStatus(task.id, task.status)}
                            className="text-tg-hint hover:text-tg-primary transition-colors shrink-0"
                          >
                            {task.status === 'DONE' ? (
                              <CheckSquare size={12} className="text-tg-primary" />
                            ) : (
                              <Square size={12} />
                            )}
                          </button>
                          <span className={`truncate ${task.status === 'DONE' ? 'line-through text-tg-hint' : 'font-medium'}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
