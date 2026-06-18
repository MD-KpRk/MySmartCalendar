import axios from 'axios';

// Используем относительный путь, так как фронтенд и бэкенд будут на одном хосте в продакшене.
// Для локальной разработки в vite.config.ts настроено проксирование '/api' -> 'http://localhost:3000'
const client = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик для добавления JWT токена в заголовки запросов
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик для обработки ошибок авторизации
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Токен недействителен или просрочен. Требуется повторная авторизация.');
      // Можно очистить токен при необходимости
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default client;
