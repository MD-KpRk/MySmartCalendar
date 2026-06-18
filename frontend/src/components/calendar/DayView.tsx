import { useState, useEffect } from 'react';
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
  LOW: 'text-neutral-400 border-neutral-800 bg-neutral-900/40',
  MEDIUM: 'text-sky-300 border-sky-500/20 bg-sky-950/20',
  HIGH: 'text-amber-300 border-amber-500/20 bg-amber-950/20',
  URGENT: 'text-rose-300 border-rose-500/20 bg-rose-950/20'
};

const PRIORITY_LABELS = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочно'
};

const EVENT_COLORS = [
  { value: '#2481cc', label: 'Синий (Тема)' },
  { value: '#f59e0b', label: 'Оранжевый' },
  { value: '#10b981', label: 'Зеленый' },
  { value: '#a855f7', label: 'Фиолетовый' },
  { value: '#ef4444', label: 'Красный' },
];

export default function DayView({ currentDate, setCurrentDate }: DayViewProps) {
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  // Состояния для Модального окна События
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartHour, setEventStartHour] = useState('09:00');
  const [eventEndHour, setEventEndHour] = useState('10:00');
  const [eventColor, setEventColor] = useState('#2481cc');

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

  useEffect(() => {
    fetchMonthlySchedule(year, month);
    fetchTasks();
    fetchEvents();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, fetchEvents, year, month]);

  useEffect(() => {
    setNoteText(dayShift?.note || '');
  }, [currentDate, dayShift]);

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

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
  };

  const handleToggleTaskStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask(id, { status: nextStatus });
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      await deleteTask(id);
    }
  };

  // Фильтр задач на этот день
  const dayTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    return isSameDay(new Date(task.deadline), currentDate);
  });
  const activeTasks = dayTasks.filter(t => t.status !== 'DONE');
  const completedTasks = dayTasks.filter(t => t.status === 'DONE');

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
      // Если оканчивается в 00:00 следующего дня, считаем 24
      const eH = eEnd.getHours() === 0 && eEnd.getDate() !== eStart.getDate() ? 24 : eEnd.getHours();
      return hour >= sH && hour < eH;
    });
  };

  // Клик по "+" на таймлайне
  const handleOpenCreateModal = (hour: number) => {
    setModalMode('create');
    setEventTitle('');
    setEventDesc('');
    setEventStartHour(`${String(hour).padStart(2, '0')}:00`);
    setEventEndHour(`${String(hour + 1).padStart(2, '0')}:00`);
    setEventColor('#2481cc');
    setShowEventModal(true);
  };

  // Клик по событию на таймлайне
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
    if (editingEventId !== null && window.confirm('Вы уверены, что хотите удалить это событие?')) {
      await deleteEvent(editingEventId);
      setShowEventModal(false);
    }
  };

  // Рендеринг часов (00:00 - 23:00)
  const renderHourlyTimeline = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      const hourStr = `${String(hour).padStart(2, '0')}:00`;
      const activeHourShift = getShiftForHour(hour);
      const hourEvents = getEventsForHour(hour);

      // Конфиг смены для расцветки
      const shiftConfig = activeHourShift ? SHIFT_TYPES.find(t => t.type === activeHourShift) : null;

      // Стили смены в зависимости от типа
      let shiftStyle = '';
      if (shiftConfig?.type === 'DAY') shiftStyle = 'bg-amber-500/10 border-l-4 border-amber-500';
      else if (shiftConfig?.type === 'NIGHT') shiftStyle = 'bg-indigo-500/10 border-l-4 border-indigo-500';
      else if (shiftConfig?.type === 'SLEEP') shiftStyle = 'bg-purple-500/10 border-l-4 border-purple-500';
      else if (shiftConfig?.type === 'OFF') shiftStyle = 'bg-emerald-500/10 border-l-4 border-emerald-500';

      return (
        <div 
          key={hour} 
          className={`flex items-start py-2 px-3 border-b border-neutral-900/45 hover:bg-neutral-900/15 transition-colors relative min-h-[52px] ${shiftStyle}`}
        >
          {/* Время */}
          <div className="w-12 text-[10px] font-bold text-tg-hint select-none mt-0.5">
            {hourStr}
          </div>

          {/* Контент часа (смена + события) */}
          <div className="flex-1 flex flex-col gap-1 pr-8">
            {/* Название смены на фоне */}
            {shiftConfig && hourEvents.length === 0 && (
              <span className="text-[9px] font-bold tracking-wider uppercase text-tg-hint/40 absolute right-4 top-2 pointer-events-none">
                Смена: {shiftConfig.label}
              </span>
            )}

            {/* События */}
            {hourEvents.map(event => (
              <button
                key={event.id}
                onClick={() => handleOpenEditModal(event)}
                style={{ borderLeftColor: event.color || '#2481cc' }}
                className="w-full text-left p-1.5 px-2 bg-neutral-900/90 rounded-md border-l-3 text-[11px] hover:bg-neutral-850 transition-all cursor-pointer shadow-sm select-none"
              >
                <div className="font-extrabold text-tg-text truncate">{event.title}</div>
                {event.description && (
                  <div className="text-[9px] text-tg-hint truncate leading-normal">{event.description}</div>
                )}
              </button>
            ))}
          </div>

          {/* Быстрое добавление события */}
          <button
            onClick={() => handleOpenCreateModal(hour)}
            className="absolute right-3 top-2.5 p-1 text-neutral-600 hover:text-tg-primary hover:bg-neutral-900 rounded-md transition-all cursor-pointer"
            title="Запланировать событие"
          >
            <Plus size={14} />
          </button>
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
      <div className="flex items-center justify-between bg-tg-secondary-bg p-3 rounded-xl border border-neutral-900">
        <button onClick={handlePrevDay} className="p-2 hover:bg-neutral-800 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
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
        <button onClick={handleNextDay} className="p-2 hover:bg-neutral-800 rounded-lg text-tg-hint hover:text-tg-text transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Карточка текущей смены */}
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
        currentShiftConfig 
          ? currentShiftConfig.color + ' border-current/10 shadow-lg' 
          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
      }`}>
        <div className="space-y-1">
          <span className="text-[10px] opacity-70 font-semibold uppercase tracking-wider block">Смена на этот день</span>
          <h2 className="text-lg font-extrabold">
            {currentShiftConfig ? currentShiftConfig.label : 'Без смены (не задано)'}
          </h2>
        </div>
        <div className="w-12 h-12 rounded-full bg-neutral-900/20 backdrop-blur-sm flex items-center justify-center border border-white/5">
          {CurrentIcon ? <CurrentIcon size={24} /> : <AlertCircle size={24} />}
        </div>
      </div>

      {/* Почасовое расписание */}
      <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-neutral-900 bg-neutral-950/20 flex items-center justify-between">
          <span className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-tg-primary" />
            Распорядок дня по часам
          </span>
        </div>
        <div className="h-80 overflow-y-auto divide-y divide-neutral-900/30 scrollbar-thin">
          {renderHourlyTimeline()}
        </div>
      </div>

      {/* Настройка смены */}
      <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-3.5 space-y-2.5">
        <span className="text-xs font-bold text-tg-hint uppercase tracking-wider block">Установить смену</span>
        <div className="grid grid-cols-4 gap-2">
          {SHIFT_TYPES.map((s) => {
            const Icon = s.icon;
            const isSelected = dayShift?.shiftType === s.type;
            return (
              <button
                key={s.type}
                onClick={() => handleShiftChange(s.type)}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-tg-primary text-tg-primary-text border-tg-primary scale-95 shadow-md shadow-tg-primary/20'
                    : 'bg-neutral-955 border-neutral-800 text-tg-hint hover:text-tg-text hover:bg-neutral-900/50'
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Заметка дня */}
      <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-3.5 space-y-2.5">
        <span className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} />
          Заметка
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Смена 12 часов, подработка, важная встреча..."
            className="flex-1 bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-primary transition-colors"
          />
          <button
            onClick={handleSaveNote}
            className="px-3.5 bg-neutral-850 hover:bg-neutral-700 text-tg-text rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 border border-neutral-800"
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Задачи на день */}
      <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-3.5 space-y-3">
        <span className="text-xs font-bold text-tg-hint uppercase tracking-wider block">Задачи на день</span>
        
        <form onSubmit={handleCreateTask} className="flex gap-1.5 items-center">
          <input
            type="text"
            required
            placeholder="Добавить задачу на этот день..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-850 rounded-lg px-1.5 py-1.5 text-[10px] text-tg-text focus:outline-none font-semibold"
          >
            <option value="LOW">Низкий</option>
            <option value="MEDIUM">Средний</option>
            <option value="HIGH">Высокий</option>
            <option value="URGENT">Срочно</option>
          </select>
          <button
            type="submit"
            className="p-1.5 bg-tg-primary text-tg-primary-text rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            <Plus size={16} />
          </button>
        </form>

        {dayTasks.length === 0 ? (
          <div className="text-center py-6 text-tg-hint text-xs border border-dashed border-neutral-850 rounded-lg bg-neutral-955/20">
            Нет задач на сегодня 👍
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map(task => (
              <div 
                key={task.id} 
                className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-850 rounded-lg"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <button 
                    onClick={() => handleToggleTaskStatus(task.id, task.status)}
                    className="text-tg-hint hover:text-tg-primary transition-colors mt-0.5"
                  >
                    <Square size={16} />
                  </button>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs text-tg-text font-medium truncate">{task.title}</p>
                    <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold uppercase tracking-wider ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-neutral-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {completedTasks.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-neutral-850">
                <span className="text-[10px] text-tg-hint font-bold uppercase tracking-wider block">Выполнено</span>
                {completedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-850 rounded-lg opacity-60"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <button 
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className="text-tg-primary hover:text-tg-hint transition-colors mt-0.5"
                      >
                        <CheckSquare size={16} />
                      </button>
                      <p className="text-xs text-tg-text line-through font-medium truncate">{task.title}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-neutral-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно События (Создание / Редактирование) */}
      {showEventModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tg-secondary-bg border border-neutral-900 rounded-2xl w-full max-w-sm overflow-hidden animate-accordion-down shadow-2xl">
            <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
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
                  required
                  placeholder="Например: Поход к врачу, спортзал..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.8 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Описание (опционально)</label>
                <input
                  type="text"
                  placeholder="Детали встречи, адрес..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.8 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
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
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tg-hint mb-1 font-semibold uppercase tracking-wider">Конец</label>
                  <input
                    type="time"
                    required
                    value={eventEndHour}
                    onChange={(e) => setEventEndHour(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
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
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        eventColor === c.value 
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-transparent hover:scale-105'
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
                    className="px-3.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Удалить событие"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 bg-tg-primary text-tg-primary-text font-bold rounded-xl text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
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
