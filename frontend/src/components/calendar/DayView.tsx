import { useState, useEffect, useRef } from 'react';
import { useStore, CalendarEvent } from '../../store/useStore.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  FileText, 
  Plus, 
  Trash2,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays,
  isSameDay,
  addHours
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { SHIFT_TYPES } from './MonthView.js';

interface DayViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const PRIORITY_COLORS = {
  LOW: 'text-neutral-500 border-neutral-200 bg-neutral-100',
  MEDIUM: 'text-sky-855 border-sky-200 bg-sky-50',
  HIGH: 'text-amber-800 border-amber-200 bg-amber-50',
  URGENT: 'text-rose-800 border-rose-200 bg-rose-50'
};

const PRIORITY_LABELS = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочно'
};

const EVENT_COLORS = [
  { value: '#1a73e8', label: 'Синий (Тема)' },
  { value: '#f59e0b', label: 'Оранжевый' },
  { value: '#10b981', label: 'Зеленый' },
  { value: '#a855f7', label: 'Фиолетовый' },
  { value: '#ef4444', label: 'Красный' },
];

export default function DayView({ currentDate, setCurrentDate }: DayViewProps) {
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [showAddTaskInput, setShowAddTaskInput] = useState(false);
  
  // Текущее время для красной линии-индикатора
  const [currentTime, setCurrentTime] = useState(new Date());

  // Состояния для Модального окна События
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartHour, setEventStartHour] = useState('09:00');
  const [eventEndHour, setEventEndHour] = useState('10:00');
  const [eventColor, setEventColor] = useState('#2481cc');

  const titleInputRef = useRef<HTMLInputElement>(null);

  const { 
    schedules, 
    fetchMonthlySchedule, 
    updateDayShift,
    tasks,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    events,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    shiftTimes
  } = useStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const yesterdayDateStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
  
  const schedule = schedules[monthKey];
  const shiftMap = new Map(schedule?.days.map(d => [d.date, d]) || []);
  const dayShift = shiftMap.get(dateStr);

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

  const dayShiftType = dayShift?.shiftType || 'OFF';
  const activeShiftRange = shiftTimes[dayShiftType as 'DAY' | 'NIGHT' | 'SLEEP' | 'OFF'] || shiftTimes.OFF;
  const sleepBlocks = getSleepBlocks(activeShiftRange.sleepStart, activeShiftRange.sleepEnd);

  // Вчерашняя смена и её настройки для точного расчета дороги
  const yesterday = subDays(currentDate, 1);
  const yYear = yesterday.getFullYear();
  const yMonth = yesterday.getMonth() + 1;
  const yMonthKey = `${yYear}-${String(yMonth).padStart(2, '0')}`;
  const ySchedule = schedules[yMonthKey];
  const yShift = ySchedule?.days.find(d => d.date === yesterdayDateStr);
  const yesterdayShiftType = yShift?.shiftType || 'OFF';
  const yesterdayRange = shiftTimes[yesterdayShiftType as 'DAY' | 'NIGHT' | 'SLEEP' | 'OFF'] || shiftTimes.OFF;

  const commuteBlocks = getCommuteBlocks(
    activeShiftRange,
    yesterdayRange
  );


  useEffect(() => {
    fetchMonthlySchedule(year, month);
    fetchTasks();
    fetchEvents();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, fetchEvents, year, month]);

  useEffect(() => {
    setNoteText(dayShift?.note || '');
  }, [currentDate, dayShift]);

  // Обновление таймера раз в минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Автофокус при открытии модального окна события
  useEffect(() => {
    if (showEventModal) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 80);
    }
  }, [showEventModal]);

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Обертка для подтверждения действий через Telegram WebApp SDK
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

  const handleShiftChange = async (type: string) => {
    await updateDayShift(year, month, dateStr, type, noteText);
  };

  const handleSaveNote = async () => {
    const existingType = dayShift?.shiftType || 'OFF';
    await updateDayShift(year, month, dateStr, existingType, noteText);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const deadline = new Date(currentDate);
    deadline.setHours(23, 59, 59, 999);

    await createTask(
      newTaskTitle.trim(),
      undefined,
      deadline.toISOString(),
      newTaskPriority
    );

    setNewTaskTitle('');
    setNewTaskPriority('MEDIUM');
    setShowAddTaskInput(false);
  };

  const handleToggleTaskStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask(id, { status: nextStatus });
  };

  const handleDeleteTask = async (id: number) => {
    const ok = await confirmAction('Вы уверены, что хотите удалить эту задачу?');
    if (ok) {
      await deleteTask(id);
    }
  };

  // Фильтр задач на этот день
  const dayTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    return isSameDay(new Date(task.deadline), currentDate);
  });

  // Фильтр событий на этот день
  const dayEvents = events.filter(event => {
    return isSameDay(new Date(event.startAt), currentDate);
  });

  // Хелпер: проверка попадает ли час в смену
  const getShiftForHour = (hour: number) => {
    // 1. Смена на сегодня
    if (dayShift?.shiftType) {
      const range = shiftTimes[dayShift.shiftType];
      if (range && (range.start !== '00:00' || range.end !== '00:00')) {
        const [sH] = range.start.split(':').map(Number);
        const [eH] = range.end.split(':').map(Number);
        if (sH < eH) {
          if (hour >= sH && hour < eH) return dayShift.shiftType;
        } else if (sH > eH) {
          if (hour >= sH) return dayShift.shiftType;
        }
      }
    }
    
    // 2. Ночная смена со вчера
    const yesterdayShift = shiftMap.get(yesterdayDateStr);
    if (yesterdayShift?.shiftType) {
      const range = shiftTimes[yesterdayShift.shiftType];
      if (range && (range.start !== '00:00' || range.end !== '00:00')) {
        const [sH] = range.start.split(':').map(Number);
        const [eH] = range.end.split(':').map(Number);
        if (sH > eH) {
          if (hour < eH) return yesterdayShift.shiftType;
        }
      }
    }
    return null;
  };

  // Хелпер: получить события для этого часа
  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(e => {
      const eStart = new Date(e.startAt);
      const eEnd = e.endAt ? new Date(e.endAt) : addHours(eStart, 1);
      const sH = eStart.getHours();
      const eH = eEnd.getHours() === 0 && eEnd.getDate() !== eStart.getDate() ? 24 : eEnd.getHours();
      return hour >= sH && hour < eH;
    });
  };

  // Клик по пустой часовой ячейке таймлайна (создание)
  const handleOpenCreateModal = (hour: number) => {
    setModalMode('create');
    setEventTitle('');
    setEventDesc('');
    setEventStartHour(`${String(hour).padStart(2, '0')}:00`);
    setEventEndHour(`${String(hour + 1).padStart(2, '0')}:00`);
    setEventColor('#2481cc');
    setShowEventModal(true);
  };

  // Клик по событию на таймлайне (редактирование)
  const handleOpenEditModal = (event: CalendarEvent) => {
    setModalMode('edit');
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDesc(event.description || '');
    
    const startDateObj = new Date(event.startAt);
    setEventStartHour(format(startDateObj, 'HH:mm'));
    
    const endDateObj = event.endAt ? new Date(event.endAt) : addHours(startDateObj, 1);
    setEventEndHour(format(endDateObj, 'HH:mm'));
    setEventColor(event.color || '#2481cc');
    setShowEventModal(true);
  };

  // Сохранить событие (Создание / Изменение)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const [sH, sM] = eventStartHour.split(':').map(Number);
    const [eH, eM] = eventEndHour.split(':').map(Number);

    const startAt = new Date(currentDate);
    startAt.setHours(sH, sM, 0, 0);

    const endAt = new Date(currentDate);
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

  // Удалить событие
  const handleDeleteEvent = async () => {
    if (editingEventId !== null) {
      const ok = await confirmAction('Вы уверены, что хотите удалить это событие?');
      if (ok) {
        await deleteEvent(editingEventId);
        setShowEventModal(false);
      }
    }
  };

  // Рендеринг часов (00:00 - 23:00)
  const renderHourlyTimeline = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const isTodayDay = isSameDay(currentDate, new Date());

    return hours.map(hour => {
      const startHourStr = `${String(hour).padStart(2, '0')}:00`;
      const endHourStr = `${String((hour + 1) % 24).padStart(2, '0')}:00`;
      const rangeStr = `${startHourStr} - ${endHourStr}`;
      const activeHourShift = getShiftForHour(hour);
      const hourEvents = getEventsForHour(hour);

      // Конфиг смены для расцветки
      const shiftConfig = activeHourShift ? SHIFT_TYPES.find(t => t.type === activeHourShift) : null;

      // Стили смены в зависимости от типа
      let shiftStyle = '';
      if (shiftConfig?.type === 'DAY') shiftStyle = 'bg-amber-50/30 border-l-4 border-amber-500';
      else if (shiftConfig?.type === 'NIGHT') shiftStyle = 'bg-indigo-50/30 border-l-4 border-indigo-500';
      else if (shiftConfig?.type === 'SLEEP') shiftStyle = 'bg-purple-50/30 border-l-4 border-purple-500';
      else if (shiftConfig?.type === 'OFF') shiftStyle = 'bg-emerald-50/30 border-l-4 border-emerald-500';

      return (
        <div 
          key={hour} 
          onClick={() => handleOpenCreateModal(hour)}
          className={`flex items-start py-2 px-3 border-b border-neutral-200 hover:bg-neutral-50 transition-colors relative h-14 select-none cursor-pointer ${shiftStyle}`}
        >
          {/* Время в виде диапазона */}
          <div className="w-20 text-[8.5px] font-bold text-tg-hint select-none mt-0.5 whitespace-nowrap">
            {rangeStr}
          </div>

          {/* Контент часа (смена + события) */}
          <div className="flex-1 flex flex-col gap-1 pr-4 min-w-0 z-10">
            {/* Название смены на фоне */}
            {shiftConfig && hourEvents.length === 0 && (
              <span className="text-[9px] font-bold tracking-wider uppercase text-tg-hint/30 absolute right-4 top-4 pointer-events-none">
                Смена: {shiftConfig.label}
              </span>
            )}

            {/* События */}
            {hourEvents.map(event => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation(); // Не открываем окно создания
                  handleOpenEditModal(event);
                }}
                style={{ borderLeftColor: event.color || '#1a73e8' }}
                className="w-full text-left p-1 px-2 bg-white border border-neutral-200 border-l-3 text-[10px] hover:bg-neutral-50 rounded transition-all cursor-pointer shadow-sm select-none"
              >
                <div className="font-extrabold text-tg-text truncate">{event.title}</div>
                {event.description && (
                  <div className="text-[8.5px] text-tg-hint truncate leading-normal mt-0.5">{event.description}</div>
                )}
              </button>
            ))}
          </div>

          {/* Индикатор текущего времени (красная линия с точкой) */}
          {isTodayDay && hour === currentHour && (
            <div 
              className="absolute right-0 border-t border-red-500 z-20 pointer-events-none flex items-center"
              style={{ top: `${(currentMinute / 60) * 100}%`, left: '92px' }}
            >
              <div className="w-1.8 h-1.8 rounded-full bg-red-500 -ml-0.9" />
            </div>
          )}
        </div>
      );
    });
  };

  const currentShiftConfig = SHIFT_TYPES.find(t => t.type === dayShift?.shiftType);
  const CurrentIcon = currentShiftConfig?.icon;

  const dayLabel = format(currentDate, 'd MMMM yyyy', { locale: ru });
  const weekdayRaw = format(currentDate, 'EEEE', { locale: ru });
  const weekdayLabel = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);

  return (
    <div className="space-y-4">
      {/* Навигация по дням */}
      <div className="flex items-center justify-between bg-tg-secondary-bg p-3 rounded-xl border border-neutral-200">
        <button onClick={handlePrevDay} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="font-bold block text-base leading-tight">
            {dayLabel}
          </span>
          <span className="text-[10px] text-tg-hint font-semibold uppercase tracking-wider">
            {weekdayLabel}
          </span>
        </div>
        <button onClick={handleNextDay} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Карточка текущей смены */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
        currentShiftConfig 
          ? currentShiftConfig.color + ' border-current/10 shadow-sm' 
          : 'bg-neutral-50 border-neutral-200 text-tg-hint font-semibold'
      }`}>
        <div className="space-y-0.5">
          <span className="text-[9px] opacity-70 font-semibold uppercase tracking-wider block">Смена на этот день</span>
          <h2 className="text-base font-extrabold">
            {currentShiftConfig ? currentShiftConfig.label : 'Без смены (не задано)'}
          </h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-neutral-200">
          {CurrentIcon ? <CurrentIcon size={20} /> : <AlertCircle size={20} />}
        </div>
      </div>

      {/* Задачи дня (Раздел All-day вверху) */}
      <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare size={13} className="text-tg-primary" />
            Задачи дня ({dayTasks.length})
          </span>
          <button 
            type="button"
            onClick={() => setShowAddTaskInput(!showAddTaskInput)}
            className="text-[9px] font-bold text-tg-primary hover:text-tg-primary/80 flex items-center gap-1 px-1.5 py-0.5 bg-tg-primary/10 rounded-md border border-tg-primary/20 cursor-pointer"
          >
            <Plus size={10} /> Добавить
          </button>
        </div>

        {showAddTaskInput && (
          <form onSubmit={handleCreateTask} className="flex gap-1.5 items-center bg-white p-1.5 rounded-lg border border-neutral-200 animate-accordion-down">
            <input
              type="text"
              required
              placeholder="Новая задача..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-transparent text-xs text-tg-text focus:outline-none min-w-0"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              className="bg-white border border-neutral-200 rounded px-1 py-0.5 text-[9px] text-tg-text focus:outline-none font-bold"
            >
              <option value="LOW">Низкий</option>
              <option value="MEDIUM">Средний</option>
              <option value="HIGH">Высокий</option>
              <option value="URGENT">Срочно</option>
            </select>
            <button
              type="submit"
              className="p-1 bg-tg-primary text-white rounded hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </form>
        )}

        {dayTasks.length === 0 ? (
          <p className="text-center py-2 text-[10px] text-tg-hint italic select-none">Нет задач на сегодня 👍</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {dayTasks.map(task => {
              const isDone = task.status === 'DONE';
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 transition-all ${
                    isDone ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button 
                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                      className="text-tg-hint hover:text-tg-primary transition-colors cursor-pointer"
                    >
                      {isDone ? <CheckSquare size={13} className="text-tg-primary" /> : <Square size={13} />}
                    </button>
                    <span className={`text-xs text-tg-text truncate ${isDone ? 'line-through text-tg-hint font-normal' : 'font-semibold'}`}>
                      {task.title}
                    </span>
                    {!isDone && (
                      <span className={`text-[7px] px-1 py-0.1 rounded border font-semibold uppercase tracking-wider scale-90 ${PRIORITY_COLORS[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-0.5 text-neutral-600 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Почасовое расписание (Таймлайн) */}
      <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-2.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-tg-primary" />
            Распорядок дня по часам
          </span>
        </div>
        <div className="h-96 overflow-y-auto divide-y divide-neutral-200 scrollbar-thin relative">
          {renderHourlyTimeline()}

          {/* Отрисовка времени сна */}
          {sleepBlocks.map((block, idx) => (
            <div
              key={`sleep-${idx}`}
              className="absolute bg-neutral-100/65 border-y border-dashed border-neutral-350/30 pointer-events-none z-0 flex items-center justify-center overflow-hidden animate-fade-in"
              style={{
                left: '92px',
                right: 0,
                top: `${block.top * 56}px`,
                height: `${block.height * 56}px`
              }}
            >
              {block.height * 56 >= 22 && (
                <span className="text-[9px] font-extrabold text-neutral-400 select-none">
                  Время сна
                </span>
              )}
            </div>
          ))}

          {/* Отрисовка времени в пути / дороги */}
          {commuteBlocks.map((block, idx) => (
            <div
              key={`commute-${idx}`}
              className="absolute bg-sky-50/65 border-y border-dashed border-sky-350/30 pointer-events-none z-0 flex items-center justify-center overflow-hidden animate-fade-in"
              style={{
                left: '92px',
                right: 0,
                top: `${block.top * 56}px`,
                height: `${block.height * 56}px`
              }}
            >
              {block.height * 56 >= 22 && (
                <span className="text-[9px] font-extrabold text-sky-500 select-none">
                  {block.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Настройка смены */}
      <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-3 space-y-2">
        <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider block">Установить смену</span>
        <div className="grid grid-cols-4 gap-2">
          {SHIFT_TYPES.map((s) => {
            const Icon = s.icon;
            const isSelected = dayShift?.shiftType === s.type;
            return (
              <button
                key={s.type}
                onClick={() => handleShiftChange(s.type)}
                className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-tg-primary text-white border-tg-primary scale-95 shadow-sm'
                    : 'bg-white border-neutral-200 text-tg-hint hover:text-tg-text hover:bg-neutral-50'
                }`}
              >
                <Icon size={16} />
                <span className="text-[9.5px]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Заметка дня */}
      <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-3 space-y-2">
        <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={13} />
          Заметка
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Смена 12 часов, подработка, важная встреча..."
            className="flex-1 bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-1.8 text-xs text-tg-text focus:outline-none focus:border-tg-primary transition-colors"
          />
          <button
            onClick={handleSaveNote}
            className="px-3.5 bg-neutral-850 hover:bg-neutral-700 text-tg-text rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 border border-neutral-800"
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Модальное окно События (Создание / Редактирование) */}
      {showEventModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm overflow-hidden animate-accordion-down shadow-2xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-tg-text">
                {modalMode === 'create' ? 'Запланировать событие' : 'Редактировать событие'}
              </h3>
              <button 
                onClick={() => setShowEventModal(false)}
                className="text-tg-hint hover:text-tg-text p-1 hover:bg-neutral-800 rounded-lg"
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
