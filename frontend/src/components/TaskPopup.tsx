import { useState, useEffect } from 'react';
import { Task, Plan } from '../types';
import { fetchPlan, updateTask } from '../api';

interface TaskPopupProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task: Task) => void;
}

export function TaskPopup({ task, isOpen, onClose, onTaskUpdated }: TaskPopupProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task?.plan_id && isOpen) {
      setPlanLoading(true);
      fetchPlan(task.plan_id)
        .then(setPlan)
        .catch(err => console.error('Failed to fetch plan:', err))
        .finally(() => setPlanLoading(false));
    } else {
      setPlan(null);
    }
  }, [task?.plan_id, isOpen]);

  useEffect(() => {
    setNotes(task?.notes || '');
  }, [task?.id, task?.notes]);

  const handleSaveNotes = async () => {
    if (!task || notes === task.notes) return;
    setSaving(true);
    try {
      const updated = await updateTask(task.id, { notes });
      onTaskUpdated?.(updated);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  const displayTitle = task.title || '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-950 border border-cyan-900/50 rounded-lg shadow-xl shadow-cyan-900/20 w-full max-w-[600px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-cyan-900/30 flex items-start justify-between bg-gradient-to-b from-slate-900/80 to-black rounded-t-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 font-mono">Task #{task.id}</span>
              {task.code && (
                <span className="px-1 py-0.5 text-[9px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded">
                  {task.code}
                </span>
              )}
            </div>
            <div className="text-cyan-400 text-sm font-medium mt-1">{displayTitle}</div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                task.status === 'done' ? 'bg-green-900/50 text-green-300' :
                task.status === 'in_progress' ? 'bg-amber-900/50 text-amber-300' :
                task.status === 'blocked' ? 'bg-red-900/50 text-red-300' :
                task.status === 'planning' ? 'bg-blue-900/50 text-blue-300' :
                'bg-slate-800 text-slate-400'
              }`}>
                {task.status.toUpperCase().replace('_', ' ')}
              </span>
              {task.agent_name && task.status !== 'planning' && (
                <>
                  <span>→</span>
                  <span className="text-cyan-400">@{task.agent_name}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scroll only when exceeding 90vh */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <div className="p-3 space-y-3">
            {/* Plan Details Section */}
            {task.plan_id && (
              <div className="border border-slate-800 rounded overflow-hidden">
                <div className="px-2 py-1.5 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
                  <span className="text-purple-400 text-[10px]">📋</span>
                  <span className="text-slate-400 text-xs font-medium">PLAN</span>
                  {planLoading ? (
                    <span className="text-slate-500 text-[10px] ml-auto">Loading...</span>
                  ) : plan && plan.tag && (
                    <span className="px-1 py-0.5 text-[9px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded ml-auto">
                      {plan.tag}
                    </span>
                  )}
                </div>
                {plan ? (
                  <div className="p-2 space-y-2">
                    <div className="text-cyan-300 text-xs font-medium">{plan.title}</div>
                    {plan.summary && (
                      <div className="text-slate-400 text-[11px] leading-relaxed">{plan.summary}</div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className={`px-1 py-0.5 rounded ${
                        plan.status === 'active' ? 'bg-green-900/50 text-green-300' :
                        plan.status === 'planning' ? 'bg-blue-900/50 text-blue-300' :
                        plan.status === 'completed' ? 'bg-slate-700 text-slate-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {plan.status}
                      </span>
                      <span>•</span>
                      <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : !planLoading && (
                  <div className="p-2 text-slate-500 text-xs text-center">Plan not found</div>
                )}
              </div>
            )}

            {/* Dispatch Info */}
            {task.dispatch_id && (
              <div className="px-2 py-1.5 bg-amber-900/20 border border-amber-900/30 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-[10px]">📤</span>
                  <span className="text-slate-400 text-xs">Dispatch</span>
                  <span className="text-[9px] text-slate-600 font-mono">#{task.dispatch_id}</span>
                  <span className="text-amber-300 text-xs">{task.dispatch_title || ''}</span>
                </div>
              </div>
            )}

            {/* Notes Editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs font-medium">📝 Notes</span>
                <div className="flex items-center gap-2">
                  {saving && <span className="text-cyan-400 text-[10px]">Saving...</span>}
                  {notes !== (task.notes || '') && (
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="px-2 py-0.5 text-[10px] bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 rounded hover:bg-cyan-800/50 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-700/50 transition-colors resize-none"
                rows={1}
                style={{ minHeight: '80px' }}
                ref={el => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = Math.max(80, el.scrollHeight) + 'px';
                  }
                }}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.max(80, target.scrollHeight) + 'px';
                }}
              />
            </div>

            {/* Timestamps */}
            <div className="text-[10px] text-slate-600 flex items-center gap-3">
              <span>Created: {new Date(task.created_at).toLocaleString()}</span>
              <span>Updated: {new Date(task.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-800 flex justify-end bg-slate-900/30 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
