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
  
  // Времена смен
  const [dayStart, setDayStart] = useState(shiftTimes.DAY.start);
  const [dayEnd, setDayEnd] = useState(shiftTimes.DAY.end);
  const [nightStart, setNightStart] = useState(shiftTimes.NIGHT.start);
  const [nightEnd, setNightEnd] = useState(shiftTimes.NIGHT.end);
  const [sleepStart, setSleepStart] = useState(shiftTimes.SLEEP.start);
  const [sleepEnd, setSleepEnd] = useState(shiftTimes.SLEEP.end);
  const [offStart, setOffStart] = useState(shiftTimes.OFF.start);
  const [offEnd, setOffEnd] = useState(shiftTimes.OFF.end);

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
    setNightStart(shiftTimes.NIGHT.start);
    setNightEnd(shiftTimes.NIGHT.end);
    setSleepStart(shiftTimes.SLEEP.start);
    setSleepEnd(shiftTimes.SLEEP.end);
    setOffStart(shiftTimes.OFF.start);
    setOffEnd(shiftTimes.OFF.end);
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

      // Сохраняем временные диапазоны смен
      updateShiftTimes({
        DAY: { start: dayStart, end: dayEnd },
        NIGHT: { start: nightStart, end: nightEnd },
        SLEEP: { start: sleepStart, end: sleepEnd },
        OFF: { start: offStart, end: offEnd }
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

              <div className="space-y-3 bg-white p-3 rounded-lg border border-neutral-200">
                {/* День */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-xs text-tg-text font-bold">День (DAY)</span>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало</span>
                    <input
                      type="time"
                      value={dayStart}
                      onChange={(e) => setDayStart(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец</span>
                    <input
                      type="time"
                      value={dayEnd}
                      onChange={(e) => setDayEnd(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                </div>

                {/* Ночь */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-xs text-tg-text font-bold">Ночь (NIGHT)</span>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало</span>
                    <input
                      type="time"
                      value={nightStart}
                      onChange={(e) => setNightStart(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец</span>
                    <input
                      type="time"
                      value={nightEnd}
                      onChange={(e) => setNightEnd(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                </div>

                {/* Отсыпной */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-xs text-tg-text font-bold">Отсыпной (SLEEP)</span>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало</span>
                    <input
                      type="time"
                      value={sleepStart}
                      onChange={(e) => setSleepStart(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец</span>
                    <input
                      type="time"
                      value={sleepEnd}
                      onChange={(e) => setSleepEnd(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                </div>

                {/* Выходной */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-xs text-tg-text font-bold">Выходной (OFF)</span>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Начало</span>
                    <input
                      type="time"
                      value={offStart}
                      onChange={(e) => setOffStart(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-tg-hint block uppercase font-semibold">Конец</span>
                    <input
                      type="time"
                      value={offEnd}
                      onChange={(e) => setOffEnd(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                    />
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
