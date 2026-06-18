import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  FileText, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays,
  isSameDay
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

export default function DayView({ currentDate, setCurrentDate }: DayViewProps) {
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  const { 
    schedules, 
    fetchMonthlySchedule, 
    updateDayShift,
    tasks,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask
  } = useStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  
  const schedule = schedules[monthKey];
  const shiftMap = new Map(schedule?.days.map(d => [d.date, d]) || []);
  const dayShift = shiftMap.get(dateStr);

  useEffect(() => {
    fetchMonthlySchedule(year, month);
    fetchTasks();
  }, [currentDate, fetchMonthlySchedule, fetchTasks, year, month]);

  useEffect(() => {
    // Обновляем текст заметки при смене дня
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

    // Устанавливаем дедлайн в конец выбранного дня
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

  // Фильтруем задачи, дедлайн которых совпадает с текущим днем
  const dayTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    return isSameDay(new Date(task.deadline), currentDate);
  });

  const activeTasks = dayTasks.filter(t => t.status !== 'DONE');
  const completedTasks = dayTasks.filter(t => t.status === 'DONE');

  // Оформление текущей смены
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

      {/* Выбор типа смены */}
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
                    : 'bg-neutral-950 border-neutral-800 text-tg-hint hover:text-tg-text hover:bg-neutral-900/50'
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
            className="px-3.5 bg-neutral-800 hover:bg-neutral-700 text-tg-text rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Задачи на день */}
      <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-3.5 space-y-3">
        <span className="text-xs font-bold text-tg-hint uppercase tracking-wider block">Задачи на день</span>
        
        {/* Форма создания задачи на этот день */}
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

        {/* Список задач */}
        {dayTasks.length === 0 ? (
          <div className="text-center py-6 text-tg-hint text-xs border border-dashed border-neutral-850 rounded-lg bg-neutral-955/20">
            Нет задач на сегодня 👍
          </div>
        ) : (
          <div className="space-y-2">
            {/* Активные задачи */}
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

            {/* Выполненные задачи */}
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
    </div>
  );
}
