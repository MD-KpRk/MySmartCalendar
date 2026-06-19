import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import client from '../api/client.js';
import { 
  Bell, 
  Calendar,
  LogOut,
  Check,
  Globe,
  Clock
} from 'lucide-react';

export default function SettingsTab() {
  const { logout, shiftTimes, updateShiftTimes } = useStore();
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [dailySummaryTime, setDailySummaryTime] = useState('08:00');
  
  const [pattern, setPattern] = useState<string[]>(['DAY', 'NIGHT', 'SLEEP', 'OFF']);
  const [startDate, setStartDate] = useState('');
  
  // Времена смен, сон и дорога для каждой смены
  const [dayStart, setDayStart] = useState(shiftTimes.DAY.start);
  const [dayEnd, setDayEnd] = useState(shiftTimes.DAY.end);
  const [daySleepStart, setDaySleepStart] = useState(shiftTimes.DAY.sleepStart || '23:00');
  const [daySleepEnd, setDaySleepEnd] = useState(shiftTimes.DAY.sleepEnd || '07:00');
  const [dayCommuteToStart, setDayCommuteToStart] = useState(shiftTimes.DAY.commuteToStart || '07:00');
  const [dayCommuteToEnd, setDayCommuteToEnd] = useState(shiftTimes.DAY.commuteToEnd || '08:00');
  const [dayCommuteFromStart, setDayCommuteFromStart] = useState(shiftTimes.DAY.commuteFromStart || '20:00');
  const [dayCommuteFromEnd, setDayCommuteFromEnd] = useState(shiftTimes.DAY.commuteFromEnd || '21:00');

  const [nightStart, setNightStart] = useState(shiftTimes.NIGHT.start);
  const [nightEnd, setNightEnd] = useState(shiftTimes.NIGHT.end);
  const [nightSleepStart, setNightSleepStart] = useState(shiftTimes.NIGHT.sleepStart || '09:00');
  const [nightSleepEnd, setNightSleepEnd] = useState(shiftTimes.NIGHT.sleepEnd || '17:00');
  const [nightCommuteToStart, setNightCommuteToStart] = useState(shiftTimes.NIGHT.commuteToStart || '19:00');
  const [nightCommuteToEnd, setNightCommuteToEnd] = useState(shiftTimes.NIGHT.commuteToEnd || '20:00');
  const [nightCommuteFromStart, setNightCommuteFromStart] = useState(shiftTimes.NIGHT.commuteFromStart || '08:00');
  const [nightCommuteFromEnd, setNightCommuteFromEnd] = useState(shiftTimes.NIGHT.commuteFromEnd || '09:00');

  const [sleepStart, setSleepStart] = useState(shiftTimes.SLEEP.start);
  const [sleepEnd, setSleepEnd] = useState(shiftTimes.SLEEP.end);
  const [sleepSleepStart, setSleepSleepStart] = useState(shiftTimes.SLEEP.sleepStart || '23:00');
  const [sleepSleepEnd, setSleepSleepEnd] = useState(shiftTimes.SLEEP.sleepEnd || '07:00');
  const [sleepCommuteToStart, setSleepCommuteToStart] = useState(shiftTimes.SLEEP.commuteToStart || '00:00');
  const [sleepCommuteToEnd, setSleepCommuteToEnd] = useState(shiftTimes.SLEEP.commuteToEnd || '00:00');
  const [sleepCommuteFromStart, setSleepCommuteFromStart] = useState(shiftTimes.SLEEP.commuteFromStart || '08:00');
  const [sleepCommuteFromEnd, setSleepCommuteFromEnd] = useState(shiftTimes.SLEEP.commuteFromEnd || '09:00');

  const [offStart, setOffStart] = useState(shiftTimes.OFF.start);
  const [offEnd, setOffEnd] = useState(shiftTimes.OFF.end);
  const [offSleepStart, setOffSleepStart] = useState(shiftTimes.OFF.sleepStart || '23:00');
  const [offSleepEnd, setOffSleepEnd] = useState(shiftTimes.OFF.sleepEnd || '07:00');
  const [offCommuteToStart, setOffCommuteToStart] = useState(shiftTimes.OFF.commuteToStart || '00:00');
  const [offCommuteToEnd, setOffCommuteToEnd] = useState(shiftTimes.OFF.commuteToEnd || '00:00');
  const [offCommuteFromStart, setOffCommuteFromStart] = useState(shiftTimes.OFF.commuteFromStart || '00:00');
  const [offCommuteFromEnd, setOffCommuteFromEnd] = useState(shiftTimes.OFF.commuteFromEnd || '00:00');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Загружаем текущие настройки при монтировании
  useEffect(() => {
    async function loadSettings() {
      try {
        const resSettings = await client.get('/api/settings');
        setTimezone(resSettings.data.timezone);
        setNotifyEnabled(resSettings.data.notifyEnabled);
        setDailySummaryTime(resSettings.data.dailySummaryTime);

        const resProfile = await client.get('/api/shifts/profile');
        setPattern(resProfile.data.pattern);
        setStartDate(resProfile.data.startDate.split('T')[0]);
      } catch (err) {
        console.error('Ошибка при загрузке настроек:', err);
      }
    }
    loadSettings();
  }, []);

  // Синхронизируем локальные поля при изменении shiftTimes в Zustand
  useEffect(() => {
    setDayStart(shiftTimes.DAY.start);
    setDayEnd(shiftTimes.DAY.end);
    setDaySleepStart(shiftTimes.DAY.sleepStart || '23:00');
    setDaySleepEnd(shiftTimes.DAY.sleepEnd || '07:00');
    setDayCommuteToStart(shiftTimes.DAY.commuteToStart || '07:00');
    setDayCommuteToEnd(shiftTimes.DAY.commuteToEnd || '08:00');
    setDayCommuteFromStart(shiftTimes.DAY.commuteFromStart || '20:00');
    setDayCommuteFromEnd(shiftTimes.DAY.commuteFromEnd || '21:00');

    setNightStart(shiftTimes.NIGHT.start);
    setNightEnd(shiftTimes.NIGHT.end);
    setNightSleepStart(shiftTimes.NIGHT.sleepStart || '09:00');
    setNightSleepEnd(shiftTimes.NIGHT.sleepEnd || '17:00');
    setNightCommuteToStart(shiftTimes.NIGHT.commuteToStart || '19:00');
    setNightCommuteToEnd(shiftTimes.NIGHT.commuteToEnd || '20:00');
    setNightCommuteFromStart(shiftTimes.NIGHT.commuteFromStart || '08:00');
    setNightCommuteFromEnd(shiftTimes.NIGHT.commuteFromEnd || '09:00');

    setSleepStart(shiftTimes.SLEEP.start);
    setSleepEnd(shiftTimes.SLEEP.end);
    setSleepSleepStart(shiftTimes.SLEEP.sleepStart || '23:00');
    setSleepSleepEnd(shiftTimes.SLEEP.sleepEnd || '07:00');
    setSleepCommuteToStart(shiftTimes.SLEEP.commuteToStart || '00:00');
    setSleepCommuteToEnd(shiftTimes.SLEEP.commuteToEnd || '00:00');
    setSleepCommuteFromStart(shiftTimes.SLEEP.commuteFromStart || '08:00');
    setSleepCommuteFromEnd(shiftTimes.SLEEP.commuteFromEnd || '09:00');

    setOffStart(shiftTimes.OFF.start);
    setOffEnd(shiftTimes.OFF.end);
    setOffSleepStart(shiftTimes.OFF.sleepStart || '23:00');
    setOffSleepEnd(shiftTimes.OFF.sleepEnd || '07:00');
    setOffCommuteToStart(shiftTimes.OFF.commuteToStart || '00:00');
    setOffCommuteToEnd(shiftTimes.OFF.commuteToEnd || '00:00');
    setOffCommuteFromStart(shiftTimes.OFF.commuteFromStart || '00:00');
    setOffCommuteFromEnd(shiftTimes.OFF.commuteFromEnd || '00:00');
  }, [shiftTimes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await client.put('/api/settings', {
        timezone,
        notifyEnabled,
        dailySummaryTime
      });

      await client.put('/api/shifts/profile', {
        pattern,
        startDate
      });

      // Сохраняем временные диапазоны смен, их сон и дорогу
      updateShiftTimes({
        DAY: { 
          start: dayStart, end: dayEnd, 
          sleepStart: daySleepStart, sleepEnd: daySleepEnd,
          commuteToStart: dayCommuteToStart, commuteToEnd: dayCommuteToEnd,
          commuteFromStart: dayCommuteFromStart, commuteFromEnd: dayCommuteFromEnd
        },
        NIGHT: { 
          start: nightStart, end: nightEnd, 
          sleepStart: nightSleepStart, sleepEnd: nightSleepEnd,
          commuteToStart: nightCommuteToStart, commuteToEnd: nightCommuteToEnd,
          commuteFromStart: nightCommuteFromStart, commuteFromEnd: nightCommuteFromEnd
        },
        SLEEP: { 
          start: sleepStart, end: sleepEnd, 
          sleepStart: sleepSleepStart, sleepEnd: sleepSleepEnd,
          commuteToStart: sleepCommuteToStart, commuteToEnd: sleepCommuteToEnd,
          commuteFromStart: sleepCommuteFromStart, commuteFromEnd: sleepCommuteFromEnd
        },
        OFF: { 
          start: offStart, end: offEnd, 
          sleepStart: offSleepStart, sleepEnd: offSleepEnd,
          commuteToStart: offCommuteToStart, commuteToEnd: offCommuteToEnd,
          commuteFromStart: offCommuteFromStart, commuteFromEnd: offCommuteFromEnd
        }
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Блок: Базовый график */}
        <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-2">
            <Calendar size={14} className="text-tg-primary" />
            <span>Базовый цикл смен</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-tg-hint mb-1">Шаблон цикла смен:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['DAY', 'NIGHT', 'SLEEP', 'OFF'].map((step, idx) => (
                  <div key={idx} className="bg-white border border-neutral-200 rounded-lg p-2 text-center text-xs">
                    <span className="text-tg-hint text-[9px] block">День {idx + 1}</span>
                    <span className="font-semibold text-tg-text">
                      {step === 'DAY' && 'День'}
                      {step === 'NIGHT' && 'Ночь'}
                      {step === 'SLEEP' && 'Отсыпной'}
                      {step === 'OFF' && 'Выходной'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tg-hint mb-1">Дата начала текущего цикла:</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
              />
            </div>

            {/* Временные диапазоны для смен */}
            <div className="pt-3 border-t border-neutral-200 space-y-3">
              <label className="block text-[10px] text-tg-hint font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} className="text-tg-primary" />
                Диапазон времени для смен:
              </label>

              <div className="space-y-4 bg-white p-3 rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                {/* День */}
                <div className="space-y-2 pb-3">
                  <div className="text-xs text-tg-text font-bold">День (DAY)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало смены</span>
                      <input
                        type="time"
                        value={dayStart}
                        onChange={(e) => setDayStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец смены</span>
                      <input
                        type="time"
                        value={dayEnd}
                        onChange={(e) => setDayEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-tg-primary/30 bg-neutral-50/30 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Начало сна</span>
                      <input
                        type="time"
                        value={daySleepStart}
                        onChange={(e) => setDaySleepStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Конец сна</span>
                      <input
                        type="time"
                        value={daySleepEnd}
                        onChange={(e) => setDaySleepEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-sky-500/30 bg-sky-50/10 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу с</span>
                      <input
                        type="time"
                        value={dayCommuteToStart}
                        onChange={(e) => setDayCommuteToStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу до</span>
                      <input
                        type="time"
                        value={dayCommuteToEnd}
                        onChange={(e) => setDayCommuteToEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой с</span>
                      <input
                        type="time"
                        value={dayCommuteFromStart}
                        onChange={(e) => setDayCommuteFromStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой до</span>
                      <input
                        type="time"
                        value={dayCommuteFromEnd}
                        onChange={(e) => setDayCommuteFromEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Ночь */}
                <div className="space-y-2 pt-3 pb-3">
                  <div className="text-xs text-tg-text font-bold">Ночь (NIGHT)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало смены</span>
                      <input
                        type="time"
                        value={nightStart}
                        onChange={(e) => setNightStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец смены</span>
                      <input
                        type="time"
                        value={nightEnd}
                        onChange={(e) => setNightEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-tg-primary/30 bg-neutral-50/30 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Начало сна</span>
                      <input
                        type="time"
                        value={nightSleepStart}
                        onChange={(e) => setNightSleepStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Конец сна</span>
                      <input
                        type="time"
                        value={nightSleepEnd}
                        onChange={(e) => setNightSleepEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-sky-500/30 bg-sky-50/10 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу с</span>
                      <input
                        type="time"
                        value={nightCommuteToStart}
                        onChange={(e) => setNightCommuteToStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу до</span>
                      <input
                        type="time"
                        value={nightCommuteToEnd}
                        onChange={(e) => setNightCommuteToEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой с</span>
                      <input
                        type="time"
                        value={nightCommuteFromStart}
                        onChange={(e) => setNightCommuteFromStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой до</span>
                      <input
                        type="time"
                        value={nightCommuteFromEnd}
                        onChange={(e) => setNightCommuteFromEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Отсыпной */}
                <div className="space-y-2 pt-3 pb-3">
                  <div className="text-xs text-tg-text font-bold">Отсыпной (SLEEP)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало смены</span>
                      <input
                        type="time"
                        value={sleepStart}
                        onChange={(e) => setSleepStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец смены</span>
                      <input
                        type="time"
                        value={sleepEnd}
                        onChange={(e) => setSleepEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-tg-primary/30 bg-neutral-50/30 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Начало сна</span>
                      <input
                        type="time"
                        value={sleepSleepStart}
                        onChange={(e) => setSleepSleepStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Конец сна</span>
                      <input
                        type="time"
                        value={sleepSleepEnd}
                        onChange={(e) => setSleepSleepEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-sky-500/30 bg-sky-50/10 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу с</span>
                      <input
                        type="time"
                        value={sleepCommuteToStart}
                        onChange={(e) => setSleepCommuteToStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу до</span>
                      <input
                        type="time"
                        value={sleepCommuteToEnd}
                        onChange={(e) => setSleepCommuteToEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой с</span>
                      <input
                        type="time"
                        value={sleepCommuteFromStart}
                        onChange={(e) => setSleepCommuteFromStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой до</span>
                      <input
                        type="time"
                        value={sleepCommuteFromEnd}
                        onChange={(e) => setSleepCommuteFromEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Выходной */}
                <div className="space-y-2 pt-3">
                  <div className="text-xs text-tg-text font-bold">Выходной (OFF)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало смены</span>
                      <input
                        type="time"
                        value={offStart}
                        onChange={(e) => setOffStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец смены</span>
                      <input
                        type="time"
                        value={offEnd}
                        onChange={(e) => setOffEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-tg-primary/30 bg-neutral-50/30 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Начало сна</span>
                      <input
                        type="time"
                        value={offSleepStart}
                        onChange={(e) => setOffSleepStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-bold">Конец сна</span>
                      <input
                        type="time"
                        value={offSleepEnd}
                        onChange={(e) => setOffSleepEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-sky-500/30 bg-sky-50/10 p-2 rounded-r-lg">
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу с</span>
                      <input
                        type="time"
                        value={offCommuteToStart}
                        onChange={(e) => setOffCommuteToStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога на работу до</span>
                      <input
                        type="time"
                        value={offCommuteToEnd}
                        onChange={(e) => setOffCommuteToEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой с</span>
                      <input
                        type="time"
                        value={offCommuteFromStart}
                        onChange={(e) => setOffCommuteFromStart(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-sky-600 block uppercase font-bold">Дорога домой до</span>
                      <input
                        type="time"
                        value={offCommuteFromEnd}
                        onChange={(e) => setOffCommuteFromEnd(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Блок: Уведомления */}
        <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-2">
            <Bell size={14} className="text-tg-primary" />
            <span>Telegram уведомления</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => setNotifyEnabled(e.target.checked)}
                className="w-4 h-4 accent-tg-primary rounded"
              />
              <span className="text-xs text-tg-text">Включить уведомления от бота</span>
            </label>

            {notifyEnabled && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-tg-hint mb-1">Время отправки утренней сводки смен:</label>
                  <input
                    type="time"
                    required
                    value={dailySummaryTime}
                    onChange={(e) => setDailySummaryTime(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Блок: Локализация */}
        <div className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-2">
            <Globe size={14} className="text-tg-primary" />
            <span>Локализация</span>
          </h3>

          <div>
            <label className="block text-[10px] text-tg-hint mb-1">Часовой пояс:</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
              <option value="Europe/Samara">Самара (UTC+4)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
              <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
            </select>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 bg-tg-primary text-white font-bold rounded-xl text-xs hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <Check size={16} />
              <span>Настройки сохранены!</span>
            </>
          ) : (
            <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          )}
        </button>
      </form>

      {/* Выход из системы */}
      <button
        onClick={logout}
        className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <LogOut size={16} />
        <span>Выйти из аккаунта</span>
      </button>
    </div>
  );
}
