import { useState, useEffect } from 'react';
import { Task } from '../types';
import { fetchAgentClaimedTask } from '../api';

interface ClaimedTaskProps {
  agentId: string;
  onTaskUpdate?: (task: Task | null) => void;
  showIdleState?: boolean;
}

export function ClaimedTask({ agentId, onTaskUpdate, showIdleState = false }: ClaimedTaskProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch claimed task on mount and when agent changes
  useEffect(() => {
    setLoading(true);
    fetchAgentClaimedTask(agentId)
      .then(t => {
        setTask(t);
        onTaskUpdate?.(t);
      })
      .catch(err => {
        console.error('Failed to fetch claimed task:', err);
        setTask(null);
        onTaskUpdate?.(null);
      })
      .finally(() => setLoading(false));
  }, [agentId, onTaskUpdate]);

  // Refresh task periodically (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgentClaimedTask(agentId)
        .then(t => {
          setTask(t);
          onTaskUpdate?.(t);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [agentId, onTaskUpdate]);

  // Expose refresh method via window for SSE updates
  useEffect(() => {
    const eventName = `refresh-claimed-task-${agentId}`;
    const handleRefresh = () => {
      fetchAgentClaimedTask(agentId)
        .then(t => {
          setTask(t);
          onTaskUpdate?.(t);
        })
        .catch(() => {});
    };
    window.addEventListener(eventName, handleRefresh);
    return () => window.removeEventListener(eventName, handleRefresh);
  }, [agentId, onTaskUpdate]);

  if (loading) {
    return (
      <div className="claimed-task-loading px-2 py-1 bg-slate-900/50 border-b border-slate-800/50">
        <span className="text-slate-500 text-[10px]">Loading task...</span>
      </div>
    );
  }

  if (!task) {
    if (showIdleState) {
      return (
        <div className="claimed-task-idle px-2 py-1 bg-slate-900/30 border-b border-slate-800/30">
          <span className="text-slate-500 text-[10px]">IDLE</span>
        </div>
      );
    }
    return null;
  }

  // Parse task title for tag
  const tagMatch = task.title.match(/^\[([^\]]+)\]/);
  const tag = tagMatch ? tagMatch[1] : null;
  const displayTitle = tag ? task.title.replace(/^\[([^\]]+)\]\s*/, '') : task.title;

  return (
    <div className="claimed-task px-2 py-1.5 bg-gradient-to-r from-cyan-950/30 to-slate-950 border-b border-cyan-800/30">
      <div className="flex items-center gap-1.5">
        <span className="text-amber-400 text-[10px] font-bold">ACTIVE:</span>
        {tag && (
          <span className="text-cyan-400 text-[10px] font-mono">[{tag}]</span>
        )}
        <span className="text-slate-200 text-xs truncate flex-1" title={displayTitle}>
          {displayTitle}
        </span>
        <span className="text-green-400 text-[10px]">#{task.id}</span>
      </div>
      {task.dispatch_title && (
        <div className="text-slate-500 text-[9px] mt-0.5 truncate" title={task.dispatch_title}>
          📨 {task.dispatch_title}
        </div>
      )}
    </div>
  );
}

// Helper to trigger refresh from outside
export function refreshClaimedTask(agentId: string) {
  window.dispatchEvent(new CustomEvent(`refresh-claimed-task-${agentId}`));
}
