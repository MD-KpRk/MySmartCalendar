import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

// На всякий случай сообщаем Telegram, что приложение готово к отрисовке
try {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
} catch (e) {
  console.error('Ошибка инициализации Telegram WebApp SDK:', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
