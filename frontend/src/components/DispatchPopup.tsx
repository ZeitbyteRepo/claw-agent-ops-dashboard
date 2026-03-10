import { useState, useEffect } from 'react';
import { Dispatch, Task } from '../types';
import { fetchDispatch, archiveDispatch, restoreDispatch, updateTask } from '../api';

interface DispatchPopupProps {
  dispatchId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatchUpdated?: (dispatch: Dispatch) => void;
  onTaskClick?: (task: Task) => void;
}

export function DispatchPopup({ dispatchId, isOpen, onClose, onDispatchUpdated, onTaskClick }: DispatchPopupProps) {
  const [dispatch, setDispatch] = useState<(Dispatch & { tasks?: Task[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Load dispatch data
  useEffect(() => {
    if (!isOpen || !dispatchId) {
      setDispatch(null);
      return;
    }

    setLoading(true);
    fetchDispatch(dispatchId)
      .then(data => setDispatch(data))
      .catch(err => console.error('Failed to load dispatch:', err))
      .finally(() => setLoading(false));
  }, [isOpen, dispatchId]);

  const handleArchive = async () => {
    if (!dispatchId) return;
    
    setArchiving(true);
    try {
      const updated = await archiveDispatch(dispatchId);
      onDispatchUpdated?.(updated);
      setDispatch(prev => prev ? { ...prev, status: 'archived', archived_at: updated.archived_at } : null);
    } catch (err) {
      console.error('Failed to archive dispatch:', err);
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    if (!dispatchId) return;
    
    setArchiving(true);
    try {
      const updated = await restoreDispatch(dispatchId);
      onDispatchUpdated?.(updated);
      setDispatch(prev => prev ? { ...prev, status: 'done', archived_at: null } : null);
    } catch (err) {
      console.error('Failed to restore dispatch:', err);
    } finally {
      setArchiving(false);
    }
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus });
      // Reload dispatch to get updated tasks
      const updated = await fetchDispatch(dispatchId!);
      setDispatch(updated);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !dispatchId) return null;

  // Separate tasks by status
  const pendingTasks = dispatch?.tasks?.filter(t => t.status !== 'done') || [];
  const completedTasks = dispatch?.tasks?.filter(t => t.status === 'done') || [];
  const allComplete = (dispatch?.tasks?.length || 0) > 0 && completedTasks.length === (dispatch?.tasks?.length || 0);

  // Check if archived
  const isArchived = dispatch?.status === 'archived' || dispatch?.archived_at;

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${isArchived ? 'archived-popup-overlay' : ''}`}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className={`bg-slate-950 rounded-lg shadow-xl w-full max-w-[700px] flex flex-col ${
          isArchived 
            ? 'border border-slate-700/50 shadow-slate-800/20 archived-popup' 
            : 'border border-amber-900/50 shadow-amber-900/20'
        }`}
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ARCHIVED Banner */}
        {isArchived && (
          <div className="shrink-0 bg-gradient-to-r from-red-900/80 via-orange-900/80 to-red-900/80 px-4 py-1.5 flex items-center justify-center gap-2 border-b border-red-800/50">
            <span className="text-red-200 text-xs font-bold tracking-widest uppercase">📦 Archived</span>
            {dispatch?.archived_at && (
              <span className="text-red-300/70 text-[10px]">{getRelativeTime(dispatch.archived_at)}</span>
            )}
          </div>
        )}
        
        {/* Header */}
        <div className={`shrink-0 px-3 py-2 border-b flex items-start justify-between ${
          isArchived 
            ? 'bg-gradient-to-b from-slate-800/50 to-slate-950 border-slate-700/40' 
            : 'bg-gradient-to-b from-amber-900/30 to-slate-950 border-amber-900/40'
        }`}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">📤</span>
              <span className="text-slate-200 text-sm font-medium">{dispatch?.title || 'Dispatch Details'}</span>
              {/* Dispatch ID Badge */}
              <span className="text-[9px] text-slate-600 font-mono">Dispatch #{dispatch?.id}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                dispatch?.status === 'done' ? 'bg-green-900/50 text-green-300' :
                dispatch?.status === 'in_progress' ? 'bg-amber-900/50 text-amber-300' :
                dispatch?.status === 'dispatched' ? 'bg-blue-900/50 text-blue-300' :
                dispatch?.status === 'archived' ? 'bg-slate-700 text-slate-400' :
                'bg-slate-800 text-slate-400'
              }`}>
                {dispatch?.status?.toUpperCase()}
              </span>
              {dispatch?.target_agent && (
                <>
                  <span>→</span>
                  <span className="text-cyan-400">@{dispatch.target_agent}</span>
                </>
              )}
              {dispatch?.plan_title && (
                <>
                  <span>•</span>
                  <span className="text-purple-400">{dispatch.plan_title}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - auto-height with scroll when needed */}
        <div className={`overflow-y-auto ${isArchived ? 'opacity-80' : ''}`} style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-3 space-y-3">
          {loading ? (
            <div className="text-slate-500 text-xs text-center py-4">Loading dispatch...</div>
          ) : (
            <>
              {/* Task Summary (for archived) */}
              {isArchived && dispatch?.tasks && (
                <div className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-medium">Task Summary</span>
                    <span className="text-slate-500 text-xs">{dispatch.tasks.length} tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500/70 transition-all"
                        style={{ width: `${dispatch.tasks.length ? (completedTasks.length / dispatch.tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-green-400 text-xs font-medium">
                      {completedTasks.length}/{dispatch.tasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                    <span className="text-green-400">✓ {completedTasks.length} completed</span>
                    {pendingTasks.length > 0 && (
                      <span className="text-amber-400">⏳ {pendingTasks.length} pending</span>
                    )}
                  </div>
                </div>
              )}

              {/* Task Progress (for non-archived) */}
              {!isArchived && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${dispatch?.tasks?.length ? (completedTasks.length / dispatch.tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs">
                    {completedTasks.length}/{dispatch?.tasks?.length || 0}
                  </span>
                </div>
              )}

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>📋</span>
                    <span>Pending Tasks</span>
                    <span className="text-slate-500">({pendingTasks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {pendingTasks.map(task => (
                      <div 
                        key={task.id}
                        className="px-2 py-1.5 bg-slate-900/50 border border-slate-800 rounded flex items-center gap-2 cursor-pointer hover:border-slate-700 transition-colors"
                        onClick={() => onTaskClick?.(task)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskStatusChange(task.id, 'done');
                          }}
                          className="w-4 h-4 border border-slate-600 rounded hover:border-green-500 hover:bg-green-500/20 transition-colors flex items-center justify-center"
                        >
                          <span className="text-[10px] text-slate-500 hover:text-green-400">✓</span>
                        </button>
                        <span className="text-slate-600 text-[9px] font-mono">#{task.id}</span>
                        <span className="text-slate-300 text-xs flex-1 truncate">{task.title}</span>
                        {task.agent_name && (
                          <span className="text-cyan-400 text-[10px]">@{task.agent_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <span>✅</span>
                    <span>Completed</span>
                    <span className="text-green-500/60">({completedTasks.length})</span>
                  </div>
                  <div className="space-y-1 opacity-60">
                    {completedTasks.map(task => (
                      <div 
                        key={task.id}
                        className="px-2 py-1.5 bg-slate-900/30 border border-slate-800/50 rounded flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onTaskClick?.(task)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskStatusChange(task.id, 'todo');
                          }}
                          className="w-4 h-4 bg-green-500/30 border border-green-500/50 rounded flex items-center justify-center"
                        >
                          <span className="text-[10px] text-green-400">✓</span>
                        </button>
                        <span className="text-slate-600 text-[9px] font-mono">#{task.id}</span>
                        <span className="text-slate-400 text-xs flex-1 truncate line-through">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!dispatch?.tasks || dispatch.tasks.length === 0) && (
                <div className="text-slate-500 text-xs text-center py-4">
                  No tasks in this dispatch
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className={`shrink-0 px-3 py-2 border-t flex items-center justify-between ${
          isArchived 
            ? 'bg-slate-800/30 border-slate-700/40' 
            : 'bg-slate-900/30 border-slate-800'
        }`}>
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            {dispatch?.created_at && (
              <span>Created: {getRelativeTime(dispatch.created_at)}</span>
            )}
            {dispatch?.archived_at && (
              <span className="text-amber-500/70">Archived: {getRelativeTime(dispatch.archived_at)}</span>
            )}
          </div>
          <div className="flex gap-2">
            {dispatch?.status === 'archived' ? (
              <button
                onClick={handleRestore}
                disabled={archiving}
                className="px-2 py-1 text-[10px] bg-cyan-900/40 text-cyan-400 rounded hover:bg-cyan-800/50 transition-colors disabled:opacity-50"
              >
                {archiving ? 'Restoring...' : '↩️ Restore'}
              </button>
            ) : allComplete && dispatch?.status === 'done' ? (
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="px-2 py-1 text-[10px] bg-amber-900/40 text-amber-400 rounded hover:bg-amber-800/50 transition-colors disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : '📦 Archive'}
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
