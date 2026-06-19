import { useState, useEffect, useRef } from 'react';
import { useStore, CalendarEvent } from '../../store/useStore.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  X,
  Trash2
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  subWeeks,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  isSameDay,
  getWeek,
  isToday,
  addHours
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { SHIFT_TYPES } from './MonthView.js';

interface WeekViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onSwitchToDay: () => void;
}

const EVENT_COLORS = [
  { value: '#1a73e8', label: 'Синий (Тема)' },
  { value: '#f59e0b', label: 'Оранжевый' },
  { value: '#10b981', label: 'Зеленый' },
  { value: '#a855f7', label: 'Фиолетовый' },
  { value: '#ef4444', label: 'Красный' },
];

export default function WeekView({ currentDate, setCurrentDate, onSwitchToDay }: WeekViewProps) {
  const { 
    schedules, 
    fetchMonthlySchedule, 
    tasks, 
    fetchTasks, 
    updateTask, 
    events,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    shiftTimes
  } = useStore();

  const [showEventModal, setShowEventModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartHour, setEventStartHour] = useState('09:00');
  const [eventEndHour, setEventEndHour] = useState('10:00');
  const [eventColor, setEventColor] = useState('#1a73e8');
  const [eventTargetDate, setEventTargetDate] = useState<Date>(new Date());

  const [currentTime, setCurrentTime] = useState(new Date());

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1;
  const endYear = end.getFullYear();
  const endMonth = end.getMonth() + 1;

  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });

  const rowHeight = 24; // Высота строки (24px для еще более узких строк)

  useEffect(() => {
    fetchMonthlySchedule(startYear, startMonth);
    if (startMonth !== endMonth || startYear !== endYear) {
      fetchMonthlySchedule(endYear, endMonth);
    }
    fetchTasks();
    fetchEvents();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, fetchEvents, startYear, startMonth, endYear, endMonth]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayIndex = weekDays.findIndex(day => isToday(day));

  const getSleepBlocks = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return [];
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const startVal = sH + sM / 60;
    const endVal = eH + eM / 60;
    if (startVal === endVal) return [];

    if (startVal < endVal) {
      return [{ top: startVal, height: endVal - startVal }];
    } else {
      return [
        { top: 0, height: endVal },
        { top: startVal, height: 24 - startVal }
      ];
    }
  };

  const getCommuteBlocks = (
    todayRange: any,
    yesterdayRange: any
  ) => {
    const blocks: { top: number; height: number; label: string }[] = [];

    const parseTimeToFloat = (t?: string) => {
      if (!t) return null;
      const [h, m] = t.split(':').map(Number);
      return h + m / 60;
    };

    const isValidRange = (startStr?: string, endStr?: string) => {
      if (!startStr || !endStr) return false;
      if (startStr === '00:00' && endStr === '00:00') return false;
      return startStr !== endStr;
    };

    // 1. Дорога на работу для сегодняшней смены
    if (todayRange && isValidRange(todayRange.commuteToStart, todayRange.commuteToEnd)) {
      const startVal = parseTimeToFloat(todayRange.commuteToStart);
      const endVal = parseTimeToFloat(todayRange.commuteToEnd);
      if (startVal !== null && endVal !== null) {
        if (startVal < endVal) {
          blocks.push({
            top: startVal,
            height: endVal - startVal,
            label: 'Дорога на работу'
          });
        }
      }
    }

    // 2. Дорога домой для сегодняшней смены (если это НЕ ночная/overnight смена)
    if (todayRange && isValidRange(todayRange.commuteFromStart, todayRange.commuteFromEnd)) {
      const sS = parseTimeToFloat(todayRange.start);
      const sE = parseTimeToFloat(todayRange.end);
      const isOvernight = sS !== null && sE !== null && sS > sE;
      if (!isOvernight) {
        const startVal = parseTimeToFloat(todayRange.commuteFromStart);
        const endVal = parseTimeToFloat(todayRange.commuteFromEnd);
        if (startVal !== null && endVal !== null) {
          if (startVal < endVal) {
            blocks.push({
              top: startVal,
              height: endVal - startVal,
              label: 'Дорога домой'
            });
          }
        }
      }
    }

    // 3. Дорога домой для вчерашней смены (если вчерашняя смена была overnight)
    if (yesterdayRange && isValidRange(yesterdayRange.commuteFromStart, yesterdayRange.commuteFromEnd)) {
      const sS = parseTimeToFloat(yesterdayRange.start);
      const sE = parseTimeToFloat(yesterdayRange.end);
      const isOvernight = sS !== null && sE !== null && sS > sE;
      if (isOvernight) {
        const startVal = parseTimeToFloat(yesterdayRange.commuteFromStart);
        const endVal = parseTimeToFloat(yesterdayRange.commuteFromEnd);
        if (startVal !== null && endVal !== null) {
          if (startVal < endVal) {
            blocks.push({
              top: startVal,
              height: endVal - startVal,
              label: 'Дорога домой'
            });
          }
        }
      }
    }

    return blocks;
  };

  useEffect(() => {
    if (gridContainerRef.current) {
      setTimeout(() => {
        const container = gridContainerRef.current;
        if (container) {
          const columnWidth = 110;
          const hourColumnWidth = 48;
          const activeIdx = todayIndex !== -1 ? todayIndex : 3;
          const targetScroll = (activeIdx * columnWidth) + hourColumnWidth - (container.clientWidth / 2) + (columnWidth / 2);
          container.scrollTo({
            left: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  }, [weekNumber, todayIndex]);

  useEffect(() => {
    if (showEventModal) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 80);
    }
  }, [showEventModal]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const formattedRange = `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;

  const handleToggleTaskStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask(id, { status: nextStatus });
  };

  const handleDaySelect = (day: Date) => {
    setCurrentDate(day);
  };

  const confirmAction = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(message, (ok: boolean) => {
          resolve(ok);
        });
      } else {
        resolve(window.confirm(message));
      }
    });
  };

  const handleOpenCreateModal = (day: Date, hour: number) => {
    setModalMode('create');
    setEventTargetDate(day);
    setEventTitle('');
    setEventDesc('');
    setEventStartHour(`${String(hour).padStart(2, '0')}:00`);
    setEventEndHour(`${String((hour + 1) % 24).padStart(2, '0')}:00`);
    setEventColor('#1a73e8');
    setShowEventModal(true);
  };

  const handleOpenEditModal = (event: CalendarEvent, day: Date) => {
    setModalMode('edit');
    setEventTargetDate(day);
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDesc(event.description || '');
    
    const startDateObj = new Date(event.startAt);
    setEventStartHour(format(startDateObj, 'HH:mm'));
    
    const endDateObj = event.endAt ? new Date(event.endAt) : addHours(startDateObj, 1);
    setEventEndHour(format(endDateObj, 'HH:mm'));
    setEventColor(event.color || '#1a73e8');
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const [sH, sM] = eventStartHour.split(':').map(Number);
    const [eH, eM] = eventEndHour.split(':').map(Number);

    const startAt = new Date(eventTargetDate);
    startAt.setHours(sH, sM, 0, 0);

    const endAt = new Date(eventTargetDate);
    endAt.setHours(eH, eM, 0, 0);

    const eventData = {
      title: eventTitle.trim(),
      description: eventDesc.trim() || undefined,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      color: eventColor
    };

    if (modalMode === 'create') {
      await createEvent(eventData);
    } else if (modalMode === 'edit' && editingEventId !== null) {
      await updateEvent(editingEventId, eventData);
    }

    setShowEventModal(false);
  };

  const handleDeleteEvent = async () => {
    if (editingEventId !== null) {
      const ok = await confirmAction('Вы уверены, что хотите удалить это событие?');
      if (ok) {
        await deleteEvent(editingEventId);
        setShowEventModal(false);
      }
    }
  };

  // Получить события на день
  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.startAt), day));
  };

  // Проверка вчерашней смены для ночного перекрытия
  const getYesterdayOvernightShift = (day: Date) => {
    const yesterday = subDays(day, 1);
    const yYear = yesterday.getFullYear();
    const yMonth = yesterday.getMonth() + 1;
    const yMonthKey = `${yYear}-${String(yMonth).padStart(2, '0')}`;
    const yDateStr = format(yesterday, 'yyyy-MM-dd');
    const ySchedule = schedules[yMonthKey];
    const yShift = ySchedule?.days.find(d => d.date === yDateStr);
    
    if (yShift?.shiftType) {
      const range = shiftTimes[yShift.shiftType];
      if (range) {
        const [sH] = range.start.split(':').map(Number);
        const [eH] = range.end.split(':').map(Number);
        if (sH > eH) {
          return { shiftType: yShift.shiftType, endHour: eH, endMin: range.end.split(':')[1] ? Number(range.end.split(':')[1]) : 0 };
        }
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-215px)] space-y-3">
      {/* Шапка навигации */}
      <div className="flex items-center justify-between bg-tg-secondary-bg p-2.5 rounded-xl border border-neutral-200 shrink-0">
        <button onClick={handlePrevWeek} className="p-1.5 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <span className="font-extrabold block text-xs leading-tight">
            Неделя {weekNumber}
          </span>
          <span className="text-[9px] text-tg-hint font-bold uppercase tracking-wider">
            {formattedRange}
          </span>
        </div>
        <button onClick={handleNextWeek} className="p-1.5 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Табличный скролл-контейнер */}
      <div 
        ref={gridContainerRef}
        className="flex-1 min-h-0 overflow-auto border border-neutral-200 rounded-xl bg-white relative scroll-smooth"
      >
        <div className="min-w-[820px] flex flex-col relative">
          
          {/* Sticky Header: Дни недели */}
          <div className="flex sticky top-0 bg-white border-b border-neutral-300 z-30 select-none">
            {/* Левый верхний угол */}
            <div className="w-12 shrink-0 sticky left-0 bg-white z-40 border-r border-neutral-300 flex flex-col items-center justify-center py-2 text-[9px] text-tg-hint font-extrabold uppercase">
              Час
            </div>
            
            {/* Заголовки дней */}
            {weekDays.map((day) => {
              const isTodayDay = isToday(day);
              const isSelected = isSameDay(currentDate, day);
              const weekdayName = format(day, 'eee', { locale: ru });
              const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
              
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    handleDaySelect(day);
                    onSwitchToDay();
                  }}
                  className={`flex-1 min-w-[110px] py-2 border-r border-neutral-300 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
                    isSelected ? 'bg-neutral-50/50' : 'hover:bg-neutral-50/30'
                  }`}
                >
                  <span className={`text-[8.5px] uppercase tracking-wider font-bold ${
                    isTodayDay ? 'text-tg-primary' : 'text-tg-hint'
                  }`}>
                    {capitalizedWeekday}
                  </span>
                  <span className={`text-sm font-black mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${
                    isTodayDay 
                      ? 'bg-tg-primary text-white shadow-sm font-extrabold' 
                      : 'text-tg-text'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Row: Смена и заметка (All-day) */}
          <div className="flex border-b border-neutral-300 bg-neutral-50/30">
            <div className="w-12 shrink-0 sticky left-0 bg-neutral-50 z-20 border-r border-neutral-300 flex items-center justify-center text-[9px] font-black text-tg-hint uppercase py-2 select-none">
              Смены
            </div>
            {weekDays.map((day) => {
              const dYear = day.getFullYear();
              const dMonth = day.getMonth() + 1;
              const monthKey = `${dYear}-${String(dMonth).padStart(2, '0')}`;
              const dateStr = format(day, 'yyyy-MM-dd');
              const schedule = schedules[monthKey];
              const shift = schedule?.days.find(d => d.date === dateStr);
              const shiftConfig = SHIFT_TYPES.find(t => t.type === shift?.shiftType);
              const ShiftIcon = shiftConfig?.icon;
              
              const shiftTimeRange = shift?.shiftType ? shiftTimes[shift.shiftType] : null;
              const hasTimeRange = shiftTimeRange && (shiftTimeRange.start !== '00:00' || shiftTimeRange.end !== '00:00');

              return (
                <div
                  key={`shift-${dateStr}`}
                  onClick={() => handleDaySelect(day)}
                  className="flex-1 min-w-[110px] p-1.5 border-r border-neutral-300 flex flex-col justify-between text-[9px] min-h-[52px] bg-white hover:bg-neutral-50/30 cursor-pointer"
                >
                  {shiftConfig ? (
                    <div className={`p-1.5 rounded border flex flex-col justify-center h-full transition-colors ${shiftConfig.color}`}>
                      <div className="flex items-center gap-1 font-bold">
                        {ShiftIcon && <ShiftIcon size={10} />}
                        <span className="truncate">{shiftConfig.label}</span>
                      </div>
                      {hasTimeRange && (
                        <span className="text-[8px] opacity-80 mt-0.5 font-semibold">
                          {shiftTimeRange.start}-{shiftTimeRange.end}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-tg-hint/30 text-[8.5px] flex items-center justify-center h-full italic">
                      Нет смены
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid Layout со сплошным скроллом и абсолютным позиционированием */}
          <div className="flex relative" style={{ height: `${24 * rowHeight}px` }}>
            
            {/* Левая шкала времени (sticky) */}
            <div className="w-12 shrink-0 sticky left-0 bg-white border-r border-neutral-300 z-20 flex flex-col select-none">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div 
                  key={hour} 
                  className="flex items-center justify-center text-[9px] font-extrabold text-tg-hint border-b border-neutral-200"
                  style={{ height: `${rowHeight}px` }}
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Колонки дней */}
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dYear = day.getFullYear();
              const dMonth = day.getMonth() + 1;
              const monthKey = `${dYear}-${String(dMonth).padStart(2, '0')}`;
              const schedule = schedules[monthKey];
              const shift = schedule?.days.find(d => d.date === dateStr);
              const isTodayDay = isToday(day);
              
              // 1. Получаем смену текущего дня
              const shiftConfig = shift?.shiftType ? SHIFT_TYPES.find(t => t.type === shift.shiftType) : null;
              const shiftTimeRange = shift?.shiftType ? shiftTimes[shift.shiftType] : null;
              const hasShiftTime = shiftTimeRange && (shiftTimeRange.start !== '00:00' || shiftTimeRange.end !== '00:00');

              // 2. Получаем смену со вчера (для утреннего перекрытия ночной смены)
              const yShiftData = getYesterdayOvernightShift(day);
              const yShiftConfig = yShiftData ? SHIFT_TYPES.find(t => t.type === yShiftData.shiftType) : null;

              // Вчерашняя смена и её настройки для точного расчета дороги
              const yesterday = subDays(day, 1);
              const yYear = yesterday.getFullYear();
              const yMonth = yesterday.getMonth() + 1;
              const yMonthKey = `${yYear}-${String(yMonth).padStart(2, '0')}`;
              const ySchedule = schedules[yMonthKey];
              const yShiftDateStr = format(yesterday, 'yyyy-MM-dd');
              const yShift = ySchedule?.days.find(d => d.date === yShiftDateStr);
              const yesterdayShiftType = yShift?.shiftType || 'OFF';
              const yesterdayRange = shiftTimes[yesterdayShiftType as 'DAY' | 'NIGHT' | 'SLEEP' | 'OFF'] || shiftTimes.OFF;

              // 3. События
              const dayEvents = getEventsForDay(day);

              // Вычисляем время сна для смены этого дня
              const dayShiftType = shift?.shiftType || 'OFF';
              const activeShiftRange = shiftTimes[dayShiftType as 'DAY' | 'NIGHT' | 'SLEEP' | 'OFF'] || shiftTimes.OFF;
              const daySleepBlocks = getSleepBlocks(activeShiftRange.sleepStart, activeShiftRange.sleepEnd);

              const dayCommuteBlocks = getCommuteBlocks(
                activeShiftRange,
                yesterdayRange
              );

              return (
                <div 
                  key={dateStr}
                  className="flex-1 min-w-[110px] border-r border-neutral-300 relative bg-white overflow-hidden"
                  style={{ height: `${24 * rowHeight}px` }}
                >
                  {/* Горизонтальные линии сетки часов */}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div 
                      key={hour} 
                      onClick={() => handleOpenCreateModal(day, hour)}
                      className="absolute left-0 right-0 border-b border-neutral-200 hover:bg-neutral-50/20 cursor-pointer"
                      style={{ top: `${hour * rowHeight}px`, height: `${rowHeight}px` }}
                    />
                  ))}

                  {/* Отрисовка времени сна */}
                  {daySleepBlocks.map((block, idx) => (
                    <div
                      key={`sleep-${idx}`}
                      className="absolute left-0 right-0 bg-neutral-100/60 border-y border-dashed border-neutral-350/30 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
                      style={{
                        top: `${block.top * rowHeight}px`,
                        height: `${block.height * rowHeight}px`
                      }}
                    >
                      {block.height * rowHeight >= 18 && (
                        <span className="text-[8px] font-extrabold text-neutral-400 select-none">
                          Сон
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Отрисовка времени в пути / дороги */}
                  {dayCommuteBlocks.map((block, idx) => (
                    <div
                      key={`commute-${idx}`}
                      className="absolute left-0 right-0 bg-sky-50/60 border-y border-dashed border-sky-300/30 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
                      style={{
                        top: `${block.top * rowHeight}px`,
                        height: `${block.height * rowHeight}px`
                      }}
                    >
                      {block.height * rowHeight >= 16 && (
                        <span className="text-[7.5px] font-extrabold text-sky-500 select-none">
                          {block.label}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* 4. Отрисовка области смены вчерашнего дня (окончание ночной смены) */}
                  {yShiftConfig && yShiftData && (
                    <div 
                      className={`absolute left-0.5 right-0.5 rounded-b-md border-b border-x flex flex-col justify-center px-1.5 z-0 select-none pointer-events-none ${yShiftConfig.color}`}
                      style={{ 
                        top: 0, 
                        height: `${(yShiftData.endHour + yShiftData.endMin / 60) * rowHeight}px` 
                      }}
                    >
                      <span className="text-[7px] font-black tracking-wider uppercase truncate">
                        {yShiftConfig.label} (ночь)
                      </span>
                    </div>
                  )}

                  {/* 5. Отрисовка области смены сегодняшнего дня */}
                  {shiftConfig && hasShiftTime && (() => {
                    const [sH, sM] = shiftTimeRange!.start.split(':').map(Number);
                    const [eH, eM] = shiftTimeRange!.end.split(':').map(Number);
                    
                    if (sH < eH) {
                      // Дневная смена
                      const topPos = (sH + sM / 60) * rowHeight;
                      const heightVal = (eH - sH + (eM - sM) / 60) * rowHeight;
                      return (
                        <div 
                          className={`absolute left-0.5 right-0.5 rounded-md border flex flex-col justify-center px-1.5 z-0 select-none pointer-events-none ${shiftConfig.color}`}
                          style={{ top: `${topPos}px`, height: `${heightVal}px` }}
                        >
                          <span className="text-[7.5px] font-black tracking-wider uppercase truncate">
                            Смена: {shiftConfig.label}
                          </span>
                        </div>
                      );
                    } else {
                      // Ночная смена (до полуночи сегодняшнего дня)
                      const topPos = (sH + sM / 60) * rowHeight;
                      const heightVal = (24 - sH - sM / 60) * rowHeight;
                      return (
                        <div 
                          className={`absolute left-0.5 right-0.5 rounded-t-md border-t border-x flex flex-col justify-center px-1.5 z-0 select-none pointer-events-none ${shiftConfig.color}`}
                          style={{ top: `${topPos}px`, height: `${heightVal}px` }}
                        >
                          <span className="text-[7.5px] font-black tracking-wider uppercase truncate">
                            Смена: {shiftConfig.label}
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* 6. Отрисовка событий в виде полноценных карточек */}
                  {dayEvents.map((event) => {
                    const eStart = new Date(event.startAt);
                    const eEnd = event.endAt ? new Date(event.endAt) : addHours(eStart, 1);
                    const startH = eStart.getHours() + eStart.getMinutes() / 60;
                    const endH = eEnd.getHours() + eEnd.getMinutes() / 60;
                    
                    const topPos = startH * rowHeight;
                    const heightVal = Math.max(18, (endH - startH) * rowHeight);

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(event, day);
                        }}
                        style={{ 
                          top: `${topPos}px`, 
                          height: `${heightVal}px`,
                          borderLeftColor: event.color || '#1a73e8' 
                        }}
                        className="absolute left-1 right-1 bg-white border border-neutral-200 border-l-3 text-tg-text p-1 text-[8px] rounded hover:bg-neutral-50 cursor-pointer shadow-sm z-10 flex flex-col justify-start overflow-hidden leading-tight text-left"
                        title={event.title}
                      >
                        <span className="font-extrabold truncate block w-full">{event.title}</span>
                        {heightVal > 22 && event.description && (
                          <span className="text-[7px] text-tg-hint truncate block w-full">{event.description}</span>
                        )}
                      </button>
                    );
                  })}

                  {/* 7. Красная линия времени */}
                  {isTodayDay && (() => {
                    const topPos = (currentTime.getHours() + currentTime.getMinutes() / 60) * rowHeight;
                    return (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                        style={{ top: `${topPos}px` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.8" />
                      </div>
                    );
                  })()}

                </div>
              );
            })}
          </div>

          {/* Row: Задачи внизу колонок */}
          <div className="flex border-t border-neutral-300 bg-neutral-50/30">
            <div className="w-12 shrink-0 sticky left-0 bg-neutral-50 z-20 border-r border-neutral-300 flex items-center justify-center text-[9px] font-black text-tg-hint uppercase py-3 select-none">
              Задачи
            </div>
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));

              return (
                <div
                  key={`tasks-${dateStr}`}
                  className="flex-1 min-w-[110px] p-2 border-r border-neutral-300 flex flex-col bg-white"
                >
                  {dayTasks.length > 0 ? (
                    <div className="space-y-1.5">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center gap-1.5 text-[8.5px] text-tg-text hover:bg-neutral-50 rounded p-0.5 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskStatus(task.id, task.status);
                          }}
                        >
                          <span className="shrink-0">
                            {task.status === 'DONE' ? (
                              <CheckSquare size={10} className="text-tg-primary" />
                            ) : (
                              <Square size={10} className="text-tg-hint" />
                            )}
                          </span>
                          <span className={`truncate ${task.status === 'DONE' ? 'line-through text-tg-hint font-normal' : 'font-bold'}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-[8.5px] text-tg-hint/40 font-bold py-1 select-none">
                      Задач: 0
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Модальное окно События */}
      {showEventModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm overflow-hidden animate-accordion-down shadow-2xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-tg-text">
                  {modalMode === 'create' ? 'Запланировать событие' : 'Редактировать событие'}
                </h3>
                <p className="text-[9px] text-tg-hint font-medium">
                  на {format(eventTargetDate, 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
              <button 
                onClick={() => setShowEventModal(false)}
                className="text-tg-hint hover:text-tg-text p-1 hover:bg-neutral-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Название события</label>
                <input
                  type="text"
                  ref={titleInputRef}
                  required
                  placeholder="Например: Поход к врачу, спортзал..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.8 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Описание (опционально)</label>
                <input
                  type="text"
                  placeholder="Детали встречи, адрес..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.8 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Начало</label>
                  <input
                    type="time"
                    required
                    value={eventStartHour}
                    onChange={(e) => setEventStartHour(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Конец</label>
                  <input
                    type="time"
                    required
                    value={eventEndHour}
                    onChange={(e) => setEventEndHour(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                  />
                </div>
              </div>

              {/* Выбор цвета */}
              <div>
                <label className="block text-[10px] text-tg-hint mb-1.5 font-semibold uppercase tracking-wider">Цветовой маркер</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEventColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-6 h-6 rounded-full border border-neutral-200 transition-all cursor-pointer ${
                        eventColor === c.value 
                          ? 'ring-2 ring-tg-primary ring-offset-2 scale-110 shadow-lg' 
                          : 'hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-2 pt-2">
                {modalMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    className="px-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Удалить событие"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 bg-tg-primary text-white font-bold rounded-xl text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {modalMode === 'create' ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
