import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const PRIORITY_COLORS = {
  LOW: 'text-neutral-500 border-neutral-200 bg-neutral-100',
  MEDIUM: 'text-sky-855 border-sky-200 bg-sky-50',
  HIGH: 'text-amber-800 border-amber-200 bg-amber-50',
  URGENT: 'text-rose-800 border-rose-200 bg-rose-50'
};

const PRIORITY_LABELS = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочно'
};

export default function TasksTab() {
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [deadline, setDeadline] = useState('');

  const { tasks, fetchTasks, createTask, updateTask, deleteTask, isLoading } = useStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createTask(
      newTitle.trim(),
      undefined,
      deadline ? new Date(deadline).toISOString() : undefined,
      priority
    );

    setNewTitle('');
    setDeadline('');
    setPriority('MEDIUM');
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await updateTask(id, { status: nextStatus });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      await deleteTask(id);
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'DONE');
  const completedTasks = tasks.filter(t => t.status === 'DONE');

  return (
    <div className="space-y-4">
      {/* Форма создания задачи */}
      <form onSubmit={handleSubmit} className="bg-tg-secondary-bg border border-neutral-200 rounded-xl p-3 space-y-3">
        <h3 className="text-xs font-bold text-tg-hint uppercase tracking-wider">Новая задача</h3>
        
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Что нужно сделать?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
          />
          <button
            type="submit"
            className="px-3.5 bg-tg-primary text-white rounded-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-tg-hint mb-1">Приоритет:</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
            >
              <option value="LOW">Низкий</option>
              <option value="MEDIUM">Средний</option>
              <option value="HIGH">Высокий</option>
              <option value="URGENT">Срочно</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-tg-hint mb-1">Срок выполнения (опционально):</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-tg-text focus:outline-none focus:border-tg-primary"
            />
          </div>
        </div>
      </form>

      {/* Списки задач */}
      {isLoading && tasks.length === 0 ? (
        <div className="text-center py-8 text-tg-hint text-xs">Загрузка списка задач...</div>
      ) : (
        <div className="space-y-4">
          {/* Активные задачи */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
              <span>В процессе</span>
              <span className="bg-neutral-200 text-tg-text text-[10px] px-1.5 py-0.5 rounded-full">
                {activeTasks.length}
              </span>
            </h4>

            {activeTasks.length === 0 ? (
              <div className="text-center py-6 bg-tg-secondary-bg border border-neutral-200 rounded-xl text-tg-hint text-xs">
                Все задачи выполнены! Отличная работа 👍
              </div>
            ) : (
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 bg-tg-secondary-bg border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button 
                        onClick={() => handleToggleStatus(task.id, task.status)}
                        className="text-tg-hint hover:text-tg-primary transition-colors mt-0.5"
                      >
                        <Square size={18} />
                      </button>
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs text-tg-text font-medium truncate">{task.title}</p>
                        
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {/* Приоритет */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider ${PRIORITY_COLORS[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          
                          {/* Дедлайн */}
                          {task.deadline && (
                            <span className="text-[9px] text-tg-hint flex items-center gap-1">
                              <Calendar size={10} />
                              {format(new Date(task.deadline), 'd MMM yyyy', { locale: ru })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-neutral-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Выполненные задачи */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
                <span>Завершено</span>
                <span className="bg-neutral-200 text-tg-text text-[10px] px-1.5 py-0.5 rounded-full">
                  {completedTasks.length}
                </span>
              </h4>

              <div className="space-y-2 opacity-60">
                {completedTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 bg-tg-secondary-bg border border-neutral-200 rounded-xl"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button 
                        onClick={() => handleToggleStatus(task.id, task.status)}
                        className="text-tg-primary hover:text-tg-hint transition-colors mt-0.5"
                      >
                        <CheckSquare size={18} />
                      </button>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs text-tg-text line-through font-medium truncate">{task.title}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-neutral-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
