import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import client from '../api/client.js';
import { 
  Bell, 
  Calendar,
  LogOut,
  Check,
  Globe
} from 'lucide-react';

export default function SettingsTab() {
  const { logout } = useStore();
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [dailySummaryTime, setDailySummaryTime] = useState('08:00');
  
  const [pattern, setPattern] = useState<string[]>(['DAY', 'NIGHT', 'SLEEP', 'OFF']);
  const [startDate, setStartDate] = useState('');
  
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
        <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-tg-primary" />
            <span>Базовый цикл смен</span>
          </h3>

          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-tg-hint mb-1">Шаблон цикла (по умолчанию День/Ночь/Отсыпной/Выходной):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['DAY', 'NIGHT', 'SLEEP', 'OFF'].map((step, idx) => (
                  <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center text-xs">
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
              <p className="text-[9px] text-tg-hint mt-1.5">
                Цикл автоматически повторяется бесконечно вперед и назад от даты начала.
              </p>
            </div>

            <div>
              <label className="block text-[10px] text-tg-hint mb-1">Дата начала текущего цикла:</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
              />
              <p className="text-[9px] text-tg-hint mt-1">
                Дата, с которой начинается первый элемент в шаблоне цикла (День).
              </p>
            </div>
          </div>
        </div>

        {/* Блок: Уведомления */}
        <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
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
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
                  />
                  <p className="text-[9px] text-tg-hint mt-1">
                    Каждое утро бот будет присылать план на сегодня (смена, задачи, привычки).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Блок: Локализация */}
        <div className="bg-tg-secondary-bg border border-neutral-900 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={14} className="text-tg-primary" />
            <span>Локализация</span>
          </h3>

          <div>
            <label className="block text-[10px] text-tg-hint mb-1">Часовой пояс:</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
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
          className="w-full py-2.5 bg-tg-primary text-tg-primary-text font-bold rounded-xl text-xs hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
        className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
      >
        <LogOut size={16} />
        <span>Выйти из аккаунта</span>
      </button>
    </div>
  );
}
