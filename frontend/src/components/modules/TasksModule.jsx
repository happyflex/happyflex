import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';

const TasksModule = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useWorkspace();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', dueDate: '' });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      addTask(newTask);
      setNewTask({ title: '', priority: 'medium', dueDate: '' });
      setIsAdding(false);
    }
  };

  const priorityColors = {
    high: 'text-red-400 border-red-500/30 bg-red-500/10',
    medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    low: 'text-green-400 border-green-500/30 bg-green-500/10'
  };

  const priorityLabels = {
    high: 'Vysoká',
    medium: 'Střední',
    low: 'Nízká'
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Moje úkoly</h3>
          <p className="text-xs text-gray-400">
            {activeTasks.length} aktivních • {completedTasks.length} dokončených
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nový
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-3 bg-[#0a1628] rounded-lg border border-cyan-500/30">
          <Input
            placeholder="Název úkolu..."
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="mb-2 bg-[#0f1d35] border-cyan-500/30 text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <div className="flex items-center gap-2 mb-2">
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="flex-1 px-3 py-2 bg-[#0f1d35] border border-cyan-500/30 rounded-md text-white text-sm"
            >
              <option value="low">Nízká priorita</option>
              <option value="medium">Střední priorita</option>
              <option value="high">Vysoká priorita</option>
            </select>
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              className="flex-1 bg-[#0f1d35] border-cyan-500/30 text-white"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="text-gray-400">
              Zrušit
            </Button>
            <Button size="sm" onClick={handleAddTask} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Přidat
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {activeTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-2">Aktivní</h4>
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                          {priorityLabels[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.dueDate).toLocaleDateString('cs-CZ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                      onClick={() => deleteTask(task.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2">Dokončené</h4>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 p-3 bg-[#0a1628] rounded-lg border border-green-500/20 opacity-60"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-through">{task.title}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                      onClick={() => deleteTask(task.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TasksModule;
