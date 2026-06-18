import { useState } from 'react';
import DayView from './calendar/DayView.js';
import WeekView from './calendar/WeekView.js';
import MonthView from './calendar/MonthView.js';
import YearView from './calendar/YearView.js';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

const VIEWS = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
] as const;

export default function CalendarTab() {
  const [activeView, setActiveView] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  return (
    <div className="space-y-4">
      {/* Переключатель видов календаря (Segmented Control) */}
      <div className="grid grid-cols-4 p-1 bg-neutral-950 border border-neutral-900 rounded-xl">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeView === v.id
                ? 'bg-tg-primary text-tg-primary-text shadow-sm'
                : 'text-tg-hint hover:text-tg-text'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Отображение выбранного вида календаря */}
      <div className="transition-all duration-300">
        {activeView === 'day' && (
          <DayView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
          />
        )}
        
        {activeView === 'week' && (
          <WeekView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
            onSwitchToDay={() => setActiveView('day')}
          />
        )}

        {activeView === 'month' && (
          <MonthView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
            onSwitchToDay={() => setActiveView('day')}
          />
        )}

        {activeView === 'year' && (
          <YearView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
            onSwitchToMonth={() => setActiveView('month')}
          />
        )}
      </div>
    </div>
  );
}
