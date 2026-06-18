import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2
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
    updateTask, 
    events,
    fetchEvents,
    shiftTimes
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
    fetchEvents();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, fetchEvents, startYear, startMonth, endYear, endMonth]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  // Генерируем 7 дней недели
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  // Номер недели
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });

  // Интервал недели для шапки
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
      {/* Шапка навигации */}
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

      {/* Горизонтальная карусель из 7 карточек дней (Snap scroll) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin gap-3.5 px-0.5">
        {weekDays.map((day) => {
          const dYear = day.getFullYear();
          const dMonth = day.getMonth() + 1;
          const monthKey = `${dYear}-${String(dMonth).padStart(2, '0')}`;
          const dateStr = format(day, 'yyyy-MM-dd');
          
          const schedule = schedules[monthKey];
          const shift = schedule?.days.find(d => d.date === dateStr);
          const shiftConfig = SHIFT_TYPES.find(t => t.type === shift?.shiftType);
          const ShiftIcon = shiftConfig?.icon;
          
          // Получаем время диапазона смены из настроек
          const shiftTimeRange = shift?.shiftType ? shiftTimes[shift.shiftType] : null;
          const hasTimeRange = shiftTimeRange && (shiftTimeRange.start !== '00:00' || shiftTimeRange.end !== '00:00');

          // Задачи на этот день
          const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));
          
          // События на этот день (сортированные хронологически)
          const dayEvents = events
            .filter(e => isSameDay(new Date(e.startAt), day))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

          const isCurrentSelected = isSameDay(currentDate, day);
          const isTodayDay = isToday(day);

          const weekdayName = format(day, 'EEEE', { locale: ru });
          const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

          return (
            <div 
              key={dateStr}
              onClick={() => handleDaySelect(day)}
              className={`p-4 bg-tg-secondary-bg border rounded-2xl flex flex-col space-y-3.5 min-w-[85%] sm:min-w-[320px] snap-center shrink-0 transition-all duration-200 cursor-pointer ${
                isCurrentSelected 
                  ? 'border-tg-primary/60 shadow-lg shadow-tg-primary/5 ring-1 ring-tg-primary/30' 
                  : 'border-neutral-900 hover:border-neutral-800'
              }`}
            >
              {/* Шапка карточки */}
              <div className="flex items-start justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${
                    isTodayDay 
                      ? 'bg-tg-primary text-tg-primary-text shadow-md' 
                      : 'bg-neutral-950 text-tg-text border border-neutral-900'
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider opacity-85 leading-none mb-0.5">
                      {format(day, 'eee', { locale: ru })}
                    </span>
                    <span className="text-sm font-extrabold leading-none">
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-tg-text">
                      {format(day, 'd MMMM', { locale: ru })}
                    </h4>
                    <p className="text-[9px] text-tg-hint uppercase tracking-wider font-semibold">
                      {capitalizedWeekday}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(day);
                    onSwitchToDay();
                  }}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-tg-primary hover:text-tg-primary/80 transition-colors flex items-center gap-1 text-[10px] font-semibold bg-tg-primary/10 rounded-md px-1.5 py-0.5 border border-tg-primary/20"
                  title="Открыть день по часам"
                >
                  <ExternalLink size={12} />
                  День
                </button>
              </div>

              {/* Карточка Смены */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                shiftConfig 
                  ? shiftConfig.color + ' border-current/10 bg-current/5' 
                  : 'bg-neutral-955 text-neutral-400 border-neutral-850'
              }`}>
                <div className="flex items-center gap-2">
                  {ShiftIcon && <ShiftIcon size={14} />}
                  <span className="font-bold">{shiftConfig ? shiftConfig.label : 'Без смены'}</span>
                </div>
                {hasTimeRange && (
                  <span className="text-[10px] font-extrabold tracking-wider bg-neutral-950/40 px-2 py-0.5 rounded-md border border-white/5">
                    {shiftTimeRange.start} - {shiftTimeRange.end}
                  </span>
                )}
              </div>

              {/* Заметка дня */}
              {shift?.note && (
                <div className="flex items-start gap-1.5 text-tg-hint bg-neutral-950/40 p-2 rounded-xl border border-neutral-900/50 text-xs">
                  <FileText size={14} className="mt-0.5 shrink-0 text-tg-hint/80" />
                  <span className="text-[10px] italic leading-relaxed">
                    {shift.note}
                  </span>
                </div>
              )}

              {/* Хронологический распорядок дня (Почасовые события) */}
              <div className="space-y-2">
                <span className="text-[10px] text-tg-hint font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} />
                  События дня ({dayEvents.length})
                </span>
                
                {dayEvents.length === 0 ? (
                  <div className="text-center py-2.5 text-[10px] text-tg-hint border border-dashed border-neutral-850 rounded-xl bg-neutral-955/5">
                    Событий не запланировано
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                    {dayEvents.map(event => (
                      <div 
                        key={event.id}
                        className="flex items-start gap-2 p-1.8 bg-neutral-950/70 border border-neutral-850/40 rounded-lg text-[10px]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: event.color || '#2481cc' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-extrabold text-tg-text truncate">{event.title}</span>
                            <span className="text-[8px] text-tg-hint font-bold shrink-0 bg-neutral-900 px-1 py-0.2 rounded border border-neutral-800">
                              {format(new Date(event.startAt), 'HH:mm')}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-[8px] text-tg-hint truncate mt-0.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Список задач */}
              <div className="space-y-2">
                <span className="text-[10px] text-tg-hint font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Задачи ({dayTasks.length})
                </span>

                {dayTasks.length === 0 ? (
                  <div className="text-center py-2.5 text-[10px] text-tg-hint border border-dashed border-neutral-850 rounded-xl bg-neutral-955/5">
                    Нет задач на этот день
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="flex items-center gap-2 text-[10px] text-tg-text p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className="text-tg-hint hover:text-tg-primary transition-colors shrink-0 cursor-pointer"
                        >
                          {task.status === 'DONE' ? (
                            <CheckSquare size={13} className="text-tg-primary" />
                          ) : (
                            <Square size={13} />
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
