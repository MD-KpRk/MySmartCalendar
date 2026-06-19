import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Coffee, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertCircle,
  FileText,
  ExternalLink
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  getDaysInMonth, 
  getDay, 
  startOfMonth, 
  isToday 
} from 'date-fns';
import { ru } from 'date-fns/locale';

export const SHIFT_TYPES = [
  { type: 'DAY', label: 'День', color: 'bg-amber-100/80 text-amber-950 border-amber-300 hover:bg-amber-200', icon: Sun },
  { type: 'NIGHT', label: 'Ночь', color: 'bg-indigo-100/80 text-indigo-950 border-indigo-300 hover:bg-indigo-200', icon: Moon },
  { type: 'SLEEP', label: 'Отсыпной', color: 'bg-purple-100/80 text-purple-950 border-purple-300 hover:bg-purple-200', icon: Sunrise },
  { type: 'OFF', label: 'Выходной', color: 'bg-emerald-100/80 text-emerald-950 border-emerald-300 hover:bg-emerald-200', icon: Coffee },
];

interface MonthViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onSwitchToDay: () => void;
}

export default function MonthView({ currentDate, setCurrentDate, onSwitchToDay }: MonthViewProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const { 
    schedules, 
    fetchMonthlySchedule, 
    updateDayShift, 
    confirmMonthlySchedule, 
    isLoading 
  } = useStore();

  const schedule = schedules[monthKey];

  useEffect(() => {
    fetchMonthlySchedule(year, month);
  }, [currentDate, fetchMonthlySchedule, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDateStr(null);
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDateStr(null);
  };

  // Вычисление смещения для сетки дней (Пн - Вс)
  const firstDayOfMonth = startOfMonth(currentDate);
  const startOffset = (getDay(firstDayOfMonth) + 6) % 7;
  const daysInMonth = getDaysInMonth(currentDate);

  // Карта смен для быстрого поиска по дате (YYYY-MM-DD)
  const shiftMap = new Map(schedule?.days.map(d => [d.date, d]) || []);

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const selectedDate = new Date(dateStr);
    setCurrentDate(selectedDate); // Синхронизируем глобальную дату
    const existing = shiftMap.get(dateStr);
    setNoteText(existing?.note || '');
  };

  const handleShiftChange = async (type: string) => {
    if (!selectedDateStr) return;
    await updateDayShift(year, month, selectedDateStr, type, noteText);
  };

  const handleSaveNote = async () => {
    if (!selectedDateStr) return;
    const existing = shiftMap.get(selectedDateStr);
    if (!existing) return;
    await updateDayShift(year, month, selectedDateStr, existing.shiftType, noteText);
  };

  const handleConfirmSchedule = async () => {
    if (window.confirm(`Вы уверены, что хотите зафиксировать график смен на ${format(currentDate, 'LLLL yyyy', { locale: ru })}?`)) {
      await confirmMonthlySchedule(year, month);
    }
  };

  const renderDays = () => {
    const cells = [];
    
    // Пустые ячейки в начале
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="h-14 bg-transparent"></div>);
    }

    // Дни месяца
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const date = new Date(Date.UTC(year, month - 1, dayNum));
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShift = shiftMap.get(dateStr);
      const isTodayDay = isToday(new Date(year, month - 1, dayNum));

      // Находим стиль и иконку
      const shiftConfig = SHIFT_TYPES.find(t => t.type === dayShift?.shiftType) || {
        icon: null,
        color: 'bg-neutral-50 text-neutral-550 border-neutral-100 hover:bg-neutral-100/50'
      };
      
      const IconComponent = shiftConfig.icon;

      cells.push(
        <button
          key={dateStr}
          onClick={() => handleDayClick(dateStr)}
          className={`h-14 relative flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${shiftConfig.color} ${
            isTodayDay ? 'ring-2 ring-tg-primary ring-offset-2 ring-offset-tg-bg' : ''
          } ${selectedDateStr === dateStr ? 'scale-95 shadow-lg border-tg-primary/50' : ''}`}
        >
          <div className="flex w-full justify-between items-start">
            <span className={`text-xs font-semibold ${isTodayDay ? 'text-tg-primary font-bold' : ''}`}>
              {dayNum}
            </span>
            {dayShift?.note && (
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            )}
          </div>
          <div className="flex items-center justify-center flex-1 w-full mt-1">
            {IconComponent && <IconComponent size={16} className="opacity-90" />}
          </div>
        </button>
      );
    }

    return cells;
  };

  const selectedDayInfo = selectedDateStr ? shiftMap.get(selectedDateStr) : null;
  const formattedSelectedDate = selectedDateStr 
    ? format(new Date(selectedDateStr), 'd MMMM (EEEE)', { locale: ru }) 
    : '';

  return (
    <div className="space-y-4">
      {/* Шапка Календаря */}
      <div className="flex items-center justify-between bg-tg-secondary-bg p-3 rounded-xl border border-neutral-200">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold capitalize text-base">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-neutral-200 rounded-lg text-tg-hint hover:text-tg-text">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Индикатор Подтверждения */}
      {schedule && (
        <div className={`flex items-center justify-between p-3 rounded-xl text-xs border ${
          schedule.confirmed 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-805 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {schedule.confirmed ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{schedule.confirmed ? 'График на месяц зафиксирован' : 'Черновик графика (не подтвержден)'}</span>
          </div>
          {!schedule.confirmed && (
            <button 
              onClick={handleConfirmSchedule}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md transition-colors"
            >
              Подтвердить
            </button>
          )}
        </div>
      )}

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-tg-hint font-bold uppercase tracking-wider">
        <div>пн</div>
        <div>вт</div>
        <div>ср</div>
        <div>чт</div>
        <div>пт</div>
        <div>сб</div>
        <div>вс</div>
      </div>

      {/* Сетка Календаря */}
      {isLoading && !schedule ? (
        <div className="h-64 flex items-center justify-center text-tg-hint text-sm">
          Загрузка графика...
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {renderDays()}
        </div>
      )}


      {/* Боковая панель деталей выбранного дня (BottomSheet) */}
      {selectedDateStr && (
        <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-4 space-y-4 animate-accordion-down">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-tg-text">{formattedSelectedDate}</h3>
              <button
                onClick={onSwitchToDay}
                className="p-1 text-tg-primary hover:text-tg-primary/80 transition-colors flex items-center gap-1 text-[10px] font-semibold bg-tg-primary/10 rounded-md px-1.5 py-0.5 border border-tg-primary/25"
                title="Перейти к дневному виду"
              >
                <ExternalLink size={10} />
                Подробнее
              </button>
            </div>
            <button 
              onClick={() => setSelectedDateStr(null)}
              className="text-xs text-tg-hint hover:text-tg-text"
            >
              Закрыть
            </button>
          </div>

          {/* Смена смены */}
          <div className="space-y-2">
            <span className="text-xs text-tg-hint">Рабочая смена в этот день:</span>
            <div className="grid grid-cols-4 gap-2">
              {SHIFT_TYPES.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedDayInfo?.shiftType === s.type;
                return (
                  <button
                    key={s.type}
                    onClick={() => handleShiftChange(s.type)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-tg-primary text-tg-primary-text border-tg-primary scale-95'
                        : 'bg-white border-neutral-200 text-tg-hint hover:text-tg-text hover:bg-neutral-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px]">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Заметка к дню */}
          <div className="space-y-2">
            <span className="text-xs text-tg-hint flex items-center gap-1">
              <FileText size={14} />
              Заметка на этот день:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Например: Смена 12ч, подработка..."
                className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
              />
              <button
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-250 text-tg-text rounded-lg text-xs font-semibold transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
