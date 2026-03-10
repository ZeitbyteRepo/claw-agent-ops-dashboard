import { useState, useEffect, useMemo } from 'react';
import { Plan, Dispatch, Task } from '../types';
import { fetchPlan, createDispatch, fetchAgents } from '../api';

interface PlanDetailModalProps {
  planId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatchCreated?: (dispatch: Dispatch) => void;
  onTaskClick?: (task: Task) => void;
}

interface ParsedPhase {
  name: string;
  slices: ParsedSlice[];
}

interface ParsedSlice {
  name: string;
  items: string[];
}

// Parse plan content markdown into phases/slices
function parsePlanContent(content: string): ParsedPhase[] {
  const phases: ParsedPhase[] = [];
  const lines = content.split('\n');
  let currentPhase: ParsedPhase | null = null;
  let currentSlice: ParsedSlice | null = null;

  for (const line of lines) {
    // Phase header: ## Phase X: Name
    const phaseMatch = line.match(/^##\s+Phase\s+\d+:\s*(.+)$/);
    if (phaseMatch) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = { name: phaseMatch[1].trim(), slices: [] };
      currentSlice = null;
      continue;
    }

    // Slice header: ### Slice X.Y: Name
    const sliceMatch = line.match(/^###\s+Slice\s+[\d.]+:\s*(.+)$/);
    if (sliceMatch && currentPhase) {
      if (currentSlice) currentPhase.slices.push(currentSlice);
      currentSlice = { name: sliceMatch[1].trim(), items: [] };
      continue;
    }

    // Task item: - [ ] Task description
    const taskMatch = line.match(/^-\s+\[\s*\]\s*(.+)$/);
    if (taskMatch && currentSlice) {
      currentSlice.items.push(taskMatch[1].trim());
      continue;
    }
  }

  // Push remaining
  if (currentSlice && currentPhase) {
    currentPhase.slices.push(currentSlice);
  }
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

export function PlanDetailModal({ planId, isOpen, onClose, onDispatchCreated, onTaskClick }: PlanDetailModalProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState<{ phase: string; slice: string } | null>(null);
  const [targetAgent, setTargetAgent] = useState<string>('');
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  // Parse phases/slices from content
  const phases = useMemo(() => {
    if (!plan?.content) return [];
    return parsePlanContent(plan.content);
  }, [plan?.content]);

  // Load plan data
  useEffect(() => {
    if (!isOpen || !planId) {
      setPlan(null);
      return;
    }

    setLoading(true);
    fetchPlan(planId)
      .then(data => setPlan(data))
      .catch(err => console.error('Failed to load plan:', err))
      .finally(() => setLoading(false));
  }, [isOpen, planId]);

  // Load agents for dispatch creation
  useEffect(() => {
    if (!isOpen) return;
    fetchAgents()
      .then(data => setAgents(data.filter((a: { id: string }) => !a.id.startsWith('test-agent'))))
      .catch(() => {});
  }, [isOpen]);

  // Toggle phase expansion
  const togglePhase = (phaseName: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseName)) {
        next.delete(phaseName);
      } else {
        next.add(phaseName);
      }
      return next;
    });
  };

  // Check if slice already has a dispatch
  const getDispatchForSlice = (sliceName: string): Dispatch | undefined => {
    return plan?.dispatches?.find(d => d.title.includes(sliceName));
  };

  // Start dispatch creation
  const startCreateDispatch = (phase: string, slice: string) => {
    setSelectedSlice({ phase, slice });
    setTargetAgent('');
  };

  // Create dispatch
  const handleCreateDispatch = async () => {
    if (!selectedSlice || !planId || !targetAgent) return;

    setCreatingDispatch(true);
    try {
      const dispatch = await createDispatch({
        plan_id: planId,
        title: `Slice: ${selectedSlice.slice}`,
        target_agent: targetAgent,
      });
      onDispatchCreated?.(dispatch);
      setSelectedSlice(null);
      // Reload plan to get updated dispatches
      const updated = await fetchPlan(planId);
      setPlan(updated);
    } catch (err) {
      console.error('Failed to create dispatch:', err);
    } finally {
      setCreatingDispatch(false);
    }
  };

  if (!isOpen || !planId) return null;

  // Check if archived/stale
  const isArchived = plan?.status === 'archived' || plan?.status === 'completed';

  // Task summary for archived plans
  const totalTasks = plan?.tasks?.length || 0;
  const completedTasks = plan?.tasks?.filter(t => t.status === 'done').length || 0;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 ${isArchived ? 'archived-popup-overlay' : ''}`}>
      <div className={`bg-slate-950 rounded-lg shadow-2xl w-full max-w-[900px] flex flex-col ${
        isArchived 
          ? 'border border-slate-700/50 shadow-slate-800/20 archived-popup' 
          : 'border border-slate-800'
      }`}
      style={{ maxHeight: '90vh' }}
      >
        {/* ARCHIVED Banner */}
        {isArchived && (
          <div className="shrink-0 bg-gradient-to-r from-red-900/80 via-orange-900/80 to-red-900/80 px-4 py-1.5 flex items-center justify-center gap-2 border-b border-red-800/50">
            <span className="text-red-200 text-xs font-bold tracking-widest uppercase">📦 Archived</span>
            {plan?.updated_at && (
              <span className="text-red-300/70 text-[10px]">Completed {getRelativeTime(plan.updated_at)}</span>
            )}
          </div>
        )}
        
        {/* Header */}
        <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-3 ${
          isArchived 
            ? 'bg-gradient-to-b from-slate-800/50 to-slate-950 border-slate-700/40' 
            : 'border-slate-800'
        }`}>
          {/* Plan ID Badge */}
          <span className="text-[10px] text-slate-600 font-mono">Plan #{planId}</span>
          {plan?.tag && <span className="text-cyan-400 text-sm font-mono font-bold">[{plan.tag}]</span>}
          <span className={`text-slate-200 font-semibold ${isArchived ? 'text-slate-400' : ''}`}>{plan?.title || 'Plan Detail'}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            plan?.status === 'active' ? 'bg-green-900/50 text-green-400' :
            plan?.status === 'planning' ? 'bg-blue-900/50 text-blue-400' :
            plan?.status === 'completed' ? 'bg-slate-700 text-slate-300' :
            'bg-slate-800 text-slate-400'
          }`}>
            {plan?.status}
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - auto-height with scroll when needed */}
        <div className={`overflow-y-auto ${isArchived ? 'opacity-80' : ''}`} style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading plan...</div>
          ) : (
            <div className="space-y-3">
              {/* Task Summary (for archived) */}
              {isArchived && totalTasks > 0 && (
                <div className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-medium">Task Summary</span>
                    <span className="text-slate-500 text-xs">{totalTasks} tasks</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <span className="text-green-400 text-sm font-bold">{completionPercent}%</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span className="text-green-400">✓ {completedTasks} completed</span>
                    {totalTasks - completedTasks > 0 && (
                      <span className="text-amber-400">⏳ {totalTasks - completedTasks} remaining</span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Summary */}
              {plan?.summary && (
                <div className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded">
                  <div className="text-slate-500 text-[10px] uppercase mb-1">Summary</div>
                  <div className="text-slate-300 text-xs">{plan.summary}</div>
                </div>
              )}
              
              {/* Phases */}
              {phases.map(phase => (
                <div key={phase.name} className="border border-slate-800 rounded overflow-hidden">
                  {/* Phase Header */}
                  <div
                    className="px-3 py-2 bg-slate-900/50 flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => togglePhase(phase.name)}
                  >
                    <span className={`text-slate-400 text-xs transition-transform ${expandedPhases.has(phase.name) ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    <span className="text-slate-200 text-sm font-medium">{phase.name}</span>
                    <span className="text-slate-500 text-xs ml-auto">{phase.slices.length} slices</span>
                  </div>

                  {/* Phase Content */}
                  {expandedPhases.has(phase.name) && (
                    <div className="p-2 space-y-2">
                      {phase.slices.map(slice => {
                        const existingDispatch = getDispatchForSlice(slice.name);
                        
                        return (
                          <div key={slice.name} className="pl-4 border-l-2 border-slate-700">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-cyan-400 text-xs font-medium">{slice.name}</span>
                              {existingDispatch && (
                                <span className="text-green-400 text-[10px] px-1.5 py-0.5 bg-green-900/30 rounded">
                                  DISPATCHED → {existingDispatch.target_agent}
                                </span>
                              )}
                            </div>
                            
                            {/* Task items */}
                            <ul className="text-slate-400 text-xs space-y-0.5 mb-2">
                              {slice.items.slice(0, 3).map((item, i) => (
                                <li key={i} className="truncate">• {item}</li>
                              ))}
                              {slice.items.length > 3 && (
                                <li className="text-slate-500">+{slice.items.length - 3} more</li>
                              )}
                            </ul>

                            {/* Dispatch button */}
                            {!existingDispatch && (
                              <button
                                onClick={() => startCreateDispatch(phase.name, slice.name)}
                                className="text-[10px] px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded hover:bg-cyan-800/40 transition-colors"
                              >
                                + Create Dispatch
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {phases.length === 0 && (
                <div className="space-y-2">
                  {/* Show tasks directly when no markdown content */}
                  <div className="text-slate-500 text-xs uppercase mb-2">Tasks ({plan?.tasks?.length || 0})</div>
                  {plan?.tasks && plan.tasks.length > 0 ? (
                    <div className="space-y-1">
                      {plan.tasks.map(task => (
                        <div 
                          key={task.id}
                          className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded cursor-pointer hover:bg-slate-800/50 transition-colors"
                          onClick={() => {
                            onTaskClick?.(task);
                            onClose();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 text-[10px] font-mono">#{task.id}</span>
                            <span className="text-slate-200 text-xs">{task.title}</span>
                            {task.agent_name && (
                              <span className="text-cyan-400 text-[10px] ml-auto">@{task.agent_name}</span>
                            )}
                          </div>
                          {task.notes && (
                            <div className="text-slate-500 text-[10px] mt-1 line-clamp-2">{task.notes.substring(0, 100)}...</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-600 text-sm text-center py-4">No tasks in this plan</div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className={`shrink-0 px-4 py-3 border-t flex items-center justify-between text-xs ${
          isArchived 
            ? 'bg-slate-800/30 border-slate-700/40 text-slate-600' 
            : 'border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-3">
            {totalTasks > 0 && (
              <span className={isArchived ? 'text-slate-500' : ''}>
                {completedTasks}/{totalTasks} tasks complete
              </span>
            )}
            {plan?.created_at && (
              <span>Created {getRelativeTime(plan.created_at)}</span>
            )}
            {isArchived && plan?.updated_at && (
              <span className="text-amber-500/70">Completed {getRelativeTime(plan.updated_at)}</span>
            )}
          </div>
          {plan?.dispatches && plan.dispatches.length > 0 && (
            <span className="text-cyan-400">{plan.dispatches.length} dispatches</span>
          )}
        </div>

        {/* Dispatch Creation Modal */}
        {selectedSlice && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 w-80">
              <h3 className="text-slate-200 text-sm font-semibold mb-3">Create Dispatch</h3>
              <p className="text-slate-400 text-xs mb-3">
                Slice: <span className="text-cyan-400">{selectedSlice.slice}</span>
              </p>
              
              <label className="block text-slate-400 text-xs mb-1">Target Agent</label>
              <select
                value={targetAgent}
                onChange={e => setTargetAgent(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 mb-3"
              >
                <option value="">Select agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.name.toLowerCase()}>
                    {agent.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setSelectedSlice(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDispatch}
                  disabled={!targetAgent || creatingDispatch}
                  className={`px-3 py-1.5 text-xs rounded ${
                    targetAgent && !creatingDispatch
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {creatingDispatch ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}