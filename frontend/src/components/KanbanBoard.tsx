import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { PlanDetailModal } from './PlanDetailModal';
import { TaskPopup } from './TaskPopup';
import { IdeaForm } from './IdeaForm';
import { Task, Plan } from '../types';
import { fetchTasks, fetchArchivedTasks, updateTask, connectSSE, SSEEvent } from '../api';

const COLUMNS = [
  { id: 'ideas', title: 'IDEAS' },
  { id: 'planning', title: 'PLANNING' },
  { id: 'todo', title: 'DISPATCH' },
  { id: 'in_progress', title: 'IN_PROGRESS' },
  { id: 'blocked', title: 'BLOCKED' },
  { id: 'done', title: 'DONE' },
] as const;

type TaskStatus = 'ideas' | 'planning' | 'todo' | 'in_progress' | 'blocked' | 'done';

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Plan modal state
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Task popup state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskPopupOpen, setIsTaskPopupOpen] = useState(false);
  
  // Idea form state
  const [isIdeaFormOpen, setIsIdeaFormOpen] = useState(false);
  
  // Archive counts per column
  const [archiveCounts, setArchiveCounts] = useState<Record<string, number>>({});

  // Plan click handlers
  const handlePlanClick = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setIsPlanModalOpen(true);
  };

  const handlePlanModalClose = () => {
    setIsPlanModalOpen(false);
    setSelectedPlanId(null);
  };

  // Task click handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskPopupOpen(true);
  };

  const handleTaskPopupClose = () => {
    setIsTaskPopupOpen(false);
    setSelectedTask(null);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  // Load tasks initially and connect to SSE for real-time updates
  useEffect(() => {
    loadTasks();
    loadArchiveCounts();

    // Connect to SSE for real-time task updates
    const disconnect = connectSSE({
      onMessage: (event: SSEEvent) => {
        if (event.type === 'task_event') {
          const { task, event: taskEvent } = event.data;
          
          if (taskEvent === 'created') {
            // Add new task
            setTasks(prev => [task, ...prev]);
          } else if (taskEvent === 'updated') {
            // Update existing task
            setTasks(prev => prev.map(t => t.id === task.id ? task : t));
          } else if (taskEvent === 'deleted' || taskEvent === 'archived') {
            // Remove task (deleted or archived)
            setTasks(prev => prev.filter(t => t.id !== task.id));
            // Refresh archive counts
            loadArchiveCounts();
          }
        } else if (event.type === 'plan_event') {
          // Plan events trigger a full task reload to regroup
          loadTasks();
        } else if (event.type === 'dispatch_event') {
          // Dispatch events trigger a full task reload
          loadTasks();
        }
      }
    });

    return () => disconnect();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function loadArchiveCounts() {
    try {
      const counts: Record<string, number> = {};
      for (const col of COLUMNS) {
        const archived = await fetchArchivedTasks(col.id);
        counts[col.id] = archived.length;
      }
      setArchiveCounts(counts);
    } catch (err) {
      console.error('Failed to load archive counts:', err);
    }
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;
    let newStatus: TaskStatus = 'todo';
    const overIdStr = String(overId);
    const columnId = COLUMNS.find(c => c.id === overIdStr || c.title.toLowerCase() === overIdStr)?.id;
    if (columnId) {
      newStatus = columnId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === Number(overIdStr));
      if (overTask) newStatus = overTask.status as TaskStatus;
    }

    setTasks(prev => prev.map(task => task.id === activeId ? { ...task, status: newStatus } : task));
    try {
      await updateTask(activeId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      loadTasks();
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="text-cyan-400 text-xs"><span className="text-green-500">$</span> loading...</div></div>;
  }

  if (error) {
    return (
      <div className="h-full p-2">
        <div className="text-red-400 text-xs mb-2"><span className="text-red-500">[ERROR]</span> {error}</div>
        <button onClick={loadTasks} className="px-2 py-1 bg-cyan-900/30 text-cyan-400 text-xs border border-cyan-700/50 rounded">[retry]</button>
      </div>
    );
  }

  return (
    <div className="h-full p-2 w-full">
      <div className="mb-2 px-1 flex items-center justify-between">
        <div>
          <span className="text-cyan-400 text-xs font-semibold">TASK BOARD</span>
          <span className="text-slate-500 text-xs ml-2">[{tasks.length}]</span>
        </div>
      </div>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-1 h-[calc(100%-2rem)] w-full">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex-1 min-w-[120px]">
              <KanbanColumn 
                id={column.id} 
                title={column.title} 
                tasks={tasksByStatus[column.id] || []} 
                onPlanClick={handlePlanClick}
                onTaskClick={handleTaskClick}
                onTaskArchive={() => loadTasks()}
                onRestore={(restoredTask) => {
                  setTasks(prev => prev.map(t => t.id === restoredTask.id ? restoredTask : t));
                  loadArchiveCounts();
                }}
                archiveCount={archiveCounts[column.id] || 0}
                onAddClick={column.id === 'ideas' ? () => setIsIdeaFormOpen(true) : undefined}
                onArchiveAll={column.id === 'done' ? async () => {
                  try {
                    const { archiveDoneTasks } = await import('../api');
                    await archiveDoneTasks();
                    loadTasks(); // Reload tasks after archiving
                  } catch (err) {
                    console.error('Failed to archive done tasks:', err);
                  }
                } : undefined}
              />
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="bg-black border border-cyan-500 rounded p-2 shadow-lg shadow-cyan-500/20">
              <div className="text-cyan-400 text-xs">&gt; {activeTask.title}</div>
              {activeTask.agent_name && <span className="text-green-500 text-xs">@{activeTask.agent_name}</span>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Plan Detail Modal */}
      <PlanDetailModal
        planId={selectedPlanId}
        isOpen={isPlanModalOpen}
        onClose={handlePlanModalClose}
        onTaskClick={handleTaskClick}
      />

      {/* Task Popup */}
      <TaskPopup
        task={selectedTask!}
        isOpen={isTaskPopupOpen && selectedTask !== null}
        onClose={handleTaskPopupClose}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Idea Form */}
      <IdeaForm
        isOpen={isIdeaFormOpen}
        onClose={() => setIsIdeaFormOpen(false)}
        onIdeaCreated={() => {
          // SSE will handle the update - no need to add locally
          setIsIdeaFormOpen(false);
        }}
      />
    </div>
  );
}
