import { useState } from 'react';
import { Task, Dispatch } from '../types';
import { TaskCard } from './TaskCard';

interface DispatchGroupProps {
  dispatch: Dispatch;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDispatchClick?: (dispatch: Dispatch) => void;
  onArchive?: (dispatchId: number) => void;
}

export function DispatchGroup({ dispatch, tasks, onTaskClick, onDispatchClick, onArchive }: DispatchGroupProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (tasks.length === 0) return null;

  // Separate completed and pending tasks
  const completedTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const allComplete = tasks.length > 0 && completedTasks.length === tasks.length;

  return (
    <div className="mb-2 border border-amber-900/40 rounded overflow-hidden">
      {/* Dispatch header */}
      <div 
        className="bg-gradient-to-r from-amber-900/30 to-slate-900/30 px-2 py-1 border-b border-amber-900/40 cursor-pointer hover:from-amber-900/40 hover:to-slate-900/40 transition-colors"
        onClick={() => onDispatchClick?.(dispatch)}
      >
        {/* Row 1: ID + Agent + Task counts */}
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-xs">📤</span>
          <span className="text-[8px] text-slate-600 font-mono">Dispatch #{dispatch.id}</span>
          {dispatch.target_agent && (
            <span className="px-1 py-0.5 text-[9px] bg-cyan-900/40 text-cyan-400 rounded">
              → {dispatch.target_agent}
            </span>
          )}
          
          <div className="flex items-center gap-1 ml-auto">
            {pendingTasks.length > 0 && (
              <span className="text-slate-500 text-xs">({pendingTasks.length} pending)</span>
            )}
            {completedTasks.length > 0 && (
              <span className="px-1 py-0.5 text-[9px] bg-green-900/40 text-green-400 rounded">
                ✓{completedTasks.length}
              </span>
            )}
          </div>
          
          {/* Archive button - always visible, disabled if not all complete */}
          <button
            onClick={() => onArchive?.(dispatch.id)}
            disabled={!allComplete}
            className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
              !allComplete 
                ? 'bg-slate-800/20 text-slate-600 cursor-not-allowed'
                : 'bg-amber-900/40 text-amber-400 hover:bg-amber-800/50'
            }`}
            title={allComplete ? "Archive completed dispatch" : "Complete all tasks to archive"}
          >
            📦 Archive
          </button>
        </div>
        
        {/* Row 2: Title (word wrapped) */}
        <div className="text-slate-300 text-xs font-medium mt-1 break-words">
          {dispatch.title}
        </div>
      </div>
      
      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="p-1 space-y-1">
          {pendingTasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      )}
      
      {/* Completed tasks section */}
      {completedTasks.length > 0 && (
        <div className="border-t border-slate-800/50">
          {/* Toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full px-2 py-1 flex items-center gap-2 text-slate-500 hover:text-slate-400 hover:bg-slate-900/30 transition-colors"
          >
            <span className={`text-[10px] transition-transform ${showCompleted ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className="text-[10px]">
              {showCompleted ? 'Hide' : 'Show'} {completedTasks.length} completed
            </span>
          </button>
          
          {/* Completed tasks (collapsed by default) */}
          {showCompleted && (
            <div className="p-1 pt-0 space-y-1 opacity-60">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="p-2 text-slate-600 text-xs text-center">
          No tasks
        </div>
      )}
    </div>
  );
}
