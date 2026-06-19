import { useState, useEffect } from 'react';
import { useStore } from './store/useStore.js';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MessageSquare, 
  Settings as SettingsIcon,
  User as UserIcon,
  Loader
} from 'lucide-react';

// Импорт вкладок
import CalendarTab from './components/CalendarTab.js';
import TasksTab from './components/TasksTab.js';
import SettingsTab from './components/SettingsTab.js';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks' | 'ai' | 'settings'>('calendar');
  const { 
    user, 
    isAuthenticated, 
    loginWithTelegram, 
    isLoading, 
    error 
  } = useStore();

  // Безопасное получение initData из Telegram WebApp
  const initDataRaw = window.Telegram?.WebApp?.initData || '';

  // При первой загрузке проводим авторизацию на бэкенде
  useEffect(() => {
    // Принудительно ставим светлый класс для HTML
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');

    async function authorize() {
      if (initDataRaw) {
        await loginWithTelegram(initDataRaw);
      } else {
        // Если запуск локальный (без Telegram), генерируем моковый initDataRaw
        console.log('Локальный запуск: отправка моковых данных разработчика.');
        const mockUser = {
          id: 999999,
          first_name: 'Dev',
          last_name: 'Developer',
          username: 'dev_user'
        };
        const mockInitDataRaw = `user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${Math.floor(Date.now() / 1000)}&hash=mock_hash`;
        await loginWithTelegram(mockInitDataRaw);
      }
    }

    if (!isAuthenticated) {
      authorize();
    }
  }, [initDataRaw, isAuthenticated, loginWithTelegram]);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tg-bg text-tg-text">
        <Loader className="animate-spin text-tg-primary mb-3" size={36} />
        <p className="text-xs text-tg-hint font-medium">Авторизация в MySmartCalendar...</p>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tg-bg text-tg-text p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-red-400">
          ⚠️
        </div>
        <div className="space-y-1">
          <h2 className="font-bold text-sm">Ошибка подключения</h2>
          <p className="text-xs text-tg-hint max-w-xs">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-tg-primary text-tg-primary-text font-bold text-xs rounded-xl"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-tg-bg text-tg-text pb-20 select-none">
      {/* Шапка */}
      <header className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-tg-primary flex items-center justify-center text-tg-primary-text font-bold text-sm shadow-md">
            {user ? user.firstName[0] : <UserIcon size={16} />}
          </div>
          <div>
            <h1 className="text-xs font-bold text-tg-text">
              {user ? `${user.firstName} ${user.lastName || ''}` : 'Гость'}
            </h1>
            <p className="text-[10px] text-tg-hint">MySmartCalendar MVP</p>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {activeTab === 'calendar' && <CalendarTab />}
        
        {activeTab === 'tasks' && <TasksTab />}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="text-tg-primary" size={20} />
              AI Ассистент
            </h2>
            <div className="p-6 text-center rounded-xl bg-tg-secondary-bg border border-neutral-200 space-y-2">
              <p className="text-xs text-tg-text font-semibold">Искусственный интеллект (Gemini 2.0)</p>
              <p className="text-[11px] text-tg-hint leading-relaxed">
                Интеграция ИИ-ассистента запланирована на Фазу 3. Вы сможете создавать события, задачи и анализировать свое рабочее расписание смен простым текстовым запросом.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Панель навигации (Таббар) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-neutral-200 bg-white/95 backdrop-blur-md flex items-center justify-around px-2 z-40 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'calendar' ? 'text-tg-primary font-bold' : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          <CalendarIcon size={20} />
          <span className="text-[9px]">Календарь</span>
        </button>

        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'tasks' ? 'text-tg-primary font-bold' : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          <CheckSquare size={20} />
          <span className="text-[9px]">Задачи</span>
        </button>

        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'ai' ? 'text-tg-primary font-bold' : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          <MessageSquare size={20} />
          <span className="text-[9px]">AI Чат</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'settings' ? 'text-tg-primary font-bold' : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          <SettingsIcon size={20} />
          <span className="text-[9px]">Настройки</span>
        </button>
      </nav>
    </div>
  );
}
