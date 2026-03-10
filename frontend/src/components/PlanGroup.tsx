import { useState } from 'react';
import { Task, Plan } from '../types';
import { TaskCard } from './TaskCard';
import { archivePlan } from '../api';

interface PlanGroupProps {
  plan: Plan;
  tasks: Task[];
  onPlanClick?: (plan: Plan) => void;
  onTaskClick?: (task: Task) => void;
  onArchive?: (planId: number) => void;
}

export function PlanGroup({ plan, tasks, onPlanClick, onTaskClick, onArchive }: PlanGroupProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (tasks.length === 0) return null;

  // Separate completed and pending tasks
  const completedTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const allComplete = tasks.length > 0 && completedTasks.length === tasks.length;

  // Auto-expand completed tasks when all are done
  const effectiveShowCompleted = allComplete || showCompleted;

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (archiving) return;
    
    setArchiving(true);
    try {
      await archivePlan(plan.id);
      onArchive?.(plan.id);
    } catch (err) {
      console.error('Failed to archive plan:', err);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="mb-2 border border-cyan-900/40 rounded overflow-hidden">
      {/* Plan header */}
      <div 
        className="bg-gradient-to-r from-cyan-900/30 to-slate-900/30 px-2 py-1 border-b border-cyan-900/40 cursor-pointer hover:from-cyan-800/40 hover:to-slate-800/40 transition-colors"
        onClick={() => onPlanClick?.(plan)}
        title="Click to view plan details"
      >
        {/* Row 1: Tag + ID + Task counts */}
        <div className="flex items-center gap-2">
          {plan.tag && <span className="text-cyan-400 text-xs font-mono font-bold">[{plan.tag}]</span>}
          <span className="text-[8px] text-slate-600 font-mono">Plan #{plan.id}</span>
          
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
            onClick={handleArchive}
            disabled={archiving || !allComplete}
            className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
              !allComplete 
                ? 'bg-slate-800/20 text-slate-600 cursor-not-allowed'
                : archiving 
                  ? 'bg-slate-800/40 text-slate-500 cursor-wait'
                  : 'bg-amber-900/40 text-amber-400 hover:bg-amber-800/50'
            }`}
            title={allComplete ? "Archive completed plan" : "Complete all tasks to archive"}
          >
            📦 Archive
          </button>
        </div>
        
        {/* Row 2: Title (word wrapped) */}
        <div className="text-slate-300 text-xs font-medium mt-1 break-words">
          {plan.title}
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
          {/* Toggle - only show if not all complete */}
          {!allComplete && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full px-2 py-1 flex items-center gap-2 text-slate-500 hover:text-slate-400 hover:bg-slate-900/30 transition-colors"
            >
              <span className={`text-[10px] transition-transform ${effectiveShowCompleted ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="text-[10px]">
                {effectiveShowCompleted ? 'Hide' : 'Show'} {completedTasks.length} completed
              </span>
            </button>
          )}
          
          {/* Completed tasks (auto-expand when all complete) */}
          {effectiveShowCompleted && (
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
