import { create } from 'zustand';
import client from '../api/client.js';

interface User {
  id: number;
  telegramId: string;
  firstName: string;
  lastName?: string;
  timezone: string;
  shifts: any[];
}

interface ShiftDay {
  date: string;
  shiftType: 'DAY' | 'NIGHT' | 'SLEEP' | 'OFF';
  note?: string | null;
  isConfirmed: boolean;
}

interface MonthlySchedule {
  confirmed: boolean;
  days: ShiftDay[];
}

interface Task {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
}

export interface CalendarEvent {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  color?: string | null;
  recurrence?: any;
}

export interface ShiftTimeRange {
  start: string;
  end: string;
}

export type ShiftTimes = Record<'DAY' | 'NIGHT' | 'SLEEP' | 'OFF', ShiftTimeRange>;

const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  DAY: { start: '08:00', end: '20:00' },
  NIGHT: { start: '20:00', end: '08:00' },
  SLEEP: { start: '00:00', end: '00:00' },
  OFF: { start: '00:00', end: '00:00' },
};

const savedShiftTimes = localStorage.getItem('shiftTimes');
const initialShiftTimes: ShiftTimes = savedShiftTimes ? JSON.parse(savedShiftTimes) : DEFAULT_SHIFT_TIMES;

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Ключ: 'YYYY-MM'
  schedules: Record<string, MonthlySchedule>;
  tasks: Task[];
  events: CalendarEvent[];
  shiftTimes: ShiftTimes;
  
  // Действия
  loginWithTelegram: (initDataRaw: string) => Promise<boolean>;
  fetchMonthlySchedule: (year: number, month: number) => Promise<void>;
  fetchYearlySchedules: (year: number) => Promise<void>;
  updateDayShift: (year: number, month: number, date: string, shiftType: string, note?: string) => Promise<void>;
  confirmMonthlySchedule: (year: number, month: number) => Promise<void>;
  fetchTasks: () => Promise<void>;
  createTask: (title: string, description?: string, deadline?: string, priority?: string) => Promise<void>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  
  // События
  fetchEvents: () => Promise<void>;
  createEvent: (data: {
    title: string;
    description?: string;
    startAt: string;
    endAt?: string;
    allDay?: boolean;
    color?: string;
  }) => Promise<void>;
  updateEvent: (id: number, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  
  // Настройки смен
  updateShiftTimes: (times: ShiftTimes) => void;
  
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  schedules: {},
  tasks: [],
  events: [],
  shiftTimes: initialShiftTimes,

  loginWithTelegram: async (initDataRaw: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.post('/api/auth/telegram', { initDataRaw });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      set({ 
        token, 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Ошибка авторизации через Telegram';
      set({ error: errMsg, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  fetchMonthlySchedule: async (year: number, month: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    set({ isLoading: true, error: null });
    try {
      const response = await client.get(`/api/shifts/monthly/${year}/${month}`);
      set((state) => ({
        schedules: {
          ...state.schedules,
          [key]: response.data
        },
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при загрузке графика смен', isLoading: false });
    }
  },

  fetchYearlySchedules: async (year: number) => {
    set({ isLoading: true, error: null });
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        return client.get(`/api/shifts/monthly/${year}/${month}`).then(res => ({
          month,
          data: res.data
        }));
      });
      
      const results = await Promise.all(promises);
      
      set((state) => {
        const newSchedules = { ...state.schedules };
        results.forEach(({ month, data }) => {
          const key = `${year}-${String(month).padStart(2, '0')}`;
          newSchedules[key] = data;
        });
        return {
          schedules: newSchedules,
          isLoading: false
        };
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Ошибка при загрузке годового графика',
        isLoading: false
      });
    }
  },

  updateDayShift: async (year: number, month: number, date: string, shiftType: string, note?: string) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    set({ error: null });
    try {
      await client.put(`/api/shifts/monthly/${year}/${month}/day`, { date, shiftType, note });
      
      // Локально обновляем состояние, чтобы избежать повторного запроса
      set((state) => {
        const currentSchedule = state.schedules[key];
        if (!currentSchedule) return state;

        const updatedDays = currentSchedule.days.map((day) => {
          if (day.date === date) {
            return { ...day, shiftType: shiftType as any, note: note || null };
          }
          return day;
        });

        return {
          schedules: {
            ...state.schedules,
            [key]: {
              ...currentSchedule,
              days: updatedDays
            }
          }
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при обновлении смены' });
    }
  },

  confirmMonthlySchedule: async (year: number, month: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    set({ isLoading: true, error: null });
    try {
      const response = await client.post(`/api/shifts/monthly/${year}/${month}/confirm`);
      set((state) => ({
        schedules: {
          ...state.schedules,
          [key]: {
            confirmed: true,
            days: response.data.schedule.days.map((d: any) => ({
              date: d.date.split('T')[0], // форматируем дату в YYYY-MM-DD
              shiftType: d.shiftType,
              note: d.note,
              isConfirmed: true
            }))
          }
        },
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при подтверждении графика', isLoading: false });
    }
  },

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.get('/api/tasks');
      set({ tasks: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при загрузке задач', isLoading: false });
    }
  },

  createTask: async (title: string, description?: string, deadline?: string, priority?: string) => {
    set({ error: null });
    try {
      const response = await client.post('/api/tasks', { title, description, deadline, priority });
      set((state) => ({
        tasks: [response.data, ...state.tasks]
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при создании задачи' });
    }
  },

  updateTask: async (id: number, data: Partial<Task>) => {
    set({ error: null });
    try {
      const response = await client.put(`/api/tasks/${id}`, data);
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? response.data : task))
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при обновлении задачи' });
    }
  },

  deleteTask: async (id: number) => {
    set({ error: null });
    try {
      await client.delete(`/api/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при удалении задачи' });
    }
  },

  // Работа с событиями (почасовыми)
  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.get('/api/events');
      set({ events: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при загрузке событий', isLoading: false });
    }
  },

  createEvent: async (data) => {
    set({ error: null });
    try {
      const response = await client.post('/api/events', data);
      set((state) => ({
        events: [...state.events, response.data]
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при создании события' });
    }
  },

  updateEvent: async (id, data) => {
    set({ error: null });
    try {
      const response = await client.put(`/api/events/${id}`, data);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? response.data : e))
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при обновлении события' });
    }
  },

  deleteEvent: async (id) => {
    set({ error: null });
    try {
      await client.delete(`/api/events/${id}`);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Ошибка при удалении события' });
    }
  },

  // Обновление настроек смен
  updateShiftTimes: (times) => {
    localStorage.setItem('shiftTimes', JSON.stringify(times));
    set({ shiftTimes: times });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, schedules: {}, tasks: [], events: [] });
  }
}));
