import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, Plan, Dispatch } from '../types';
import { TaskCard } from './TaskCard';
import { PlanGroup } from './PlanGroup';
import { DispatchGroup } from './DispatchGroup';
import { DispatchPopup } from './DispatchPopup';
import { TaskPopup } from './TaskPopup';
import { PlanDetailModal } from './PlanDetailModal';
import { useState, useEffect, useRef } from 'react';
import { fetchPlans, fetchDispatches, fetchArchivedTasks, restoreTask, fetchArchivedPlans, fetchArchivedDispatches } from '../api';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onPlanClick?: (plan: Plan) => void;
  onTaskClick?: (task: Task) => void;
  onTaskArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  archiveCount?: number;
  onAddClick?: () => void;
  onArchiveAll?: () => void;
}

export function KanbanColumn({ id, title, tasks, onPlanClick, onTaskClick, onTaskArchive, onRestore, onAddClick, onArchiveAll }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [prevCount, setPrevCount] = useState(tasks.length);
  const [countBump, setCountBump] = useState(false);
  const firstRender = useRef(true);

  // Archive footer state
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [archivedPlans, setArchivedPlans] = useState<Plan[]>([]);
  const [archivedDispatches, setArchivedDispatches] = useState<Dispatch[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  
  // Selected archived task for popup
  const [selectedArchivedTask, setSelectedArchivedTask] = useState<Task | null>(null);
  const [isArchivedTaskPopupOpen, setIsArchivedTaskPopupOpen] = useState(false);

  // Selected archived plan for popup
  const [selectedArchivedPlanId, setSelectedArchivedPlanId] = useState<number | null>(null);
  const [isArchivedPlanModalOpen, setIsArchivedPlanModalOpen] = useState(false);

  // Selected archived dispatch for popup
  const [selectedArchivedDispatchId, setSelectedArchivedDispatchId] = useState<number | null>(null);
  const [isArchivedDispatchPopupOpen, setIsArchivedDispatchPopupOpen] = useState(false);

  // Plan state for PLANNING column
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  
  // Dispatch state for Todo column
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);
  
  // Dispatch popup state
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null);
  const [isDispatchPopupOpen, setIsDispatchPopupOpen] = useState(false);

  const handleDispatchClick = (dispatch: Dispatch) => {
    setSelectedDispatchId(dispatch.id);
    setIsDispatchPopupOpen(true);
  };

  const handleDispatchPopupClose = () => {
    setIsDispatchPopupOpen(false);
    setSelectedDispatchId(null);
  };

  // Load archived items when footer is expanded
  useEffect(() => {
    if (!archiveExpanded) return;

    setArchiveLoading(true);
    
    if (id === 'planning') {
      // Load archived plans
      fetchArchivedPlans()
        .then(plans => setArchivedPlans(plans))
        .catch(err => console.error('Failed to load archived plans:', err))
        .finally(() => setArchiveLoading(false));
    } else if (id === 'todo') {
      // Load archived dispatches
      fetchArchivedDispatches()
        .then(dispatches => setArchivedDispatches(dispatches))
        .catch(err => console.error('Failed to load archived dispatches:', err))
        .finally(() => setArchiveLoading(false));
    } else {
      // Load archived tasks for other columns
      fetchArchivedTasks(id)
        .then(tasks => setArchivedTasks(tasks))
        .catch(err => console.error('Failed to load archived tasks:', err))
        .finally(() => setArchiveLoading(false));
    }
  }, [archiveExpanded, id]);

  const handleRestore = async (task: Task) => {
    try {
      const updated = await restoreTask(task.id);
      setArchivedTasks(prev => prev.filter(t => t.id !== task.id));
      onRestore?.(updated);
    } catch (err) {
      console.error('Failed to restore task:', err);
    }
  };

  // Handle clicking an archived task
  const handleArchivedTaskClick = (task: Task) => {
    setSelectedArchivedTask(task);
    setIsArchivedTaskPopupOpen(true);
  };

  // Handle clicking an archived plan
  const handleArchivedPlanClick = (plan: Plan) => {
    setSelectedArchivedPlanId(plan.id);
    setIsArchivedPlanModalOpen(true);
  };

  // Handle clicking an archived dispatch
  const handleArchivedDispatchClick = (dispatch: Dispatch) => {
    setSelectedArchivedDispatchId(dispatch.id);
    setIsArchivedDispatchPopupOpen(true);
  };

  // Load plans only for PLANNING column
  useEffect(() => {
    if (id !== 'planning') return;

    setPlansLoading(true);
    fetchPlans()
      .then(plansData => {
        setPlans(plansData);
      })
      .catch(err => {
        console.error('Failed to load plans:', err);
      })
      .finally(() => {
        setPlansLoading(false);
      });
  }, [id]);
  
  // Load dispatches only for TODO column
  useEffect(() => {
    if (id !== 'todo') return;

    setDispatchesLoading(true);
    fetchDispatches()
      .then(dispatchesData => {
        setDispatches(dispatchesData);
      })
      .catch(err => {
        console.error('Failed to load dispatches:', err);
      })
      .finally(() => {
        setDispatchesLoading(false);
      });
  }, [id]);

  // Animate count changes
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setPrevCount(tasks.length);
      return;
    }
    if (tasks.length !== prevCount) {
      setCountBump(true);
      setPrevCount(tasks.length);
      const timer = setTimeout(() => setCountBump(false), 300);
      return () => clearTimeout(timer);
    }
  }, [tasks.length, prevCount]);

  const statusColors: Record<string, string> = {
    'IDEAS': 'text-purple-400',
    'PLANNING': 'text-blue-400',
    'DISPATCH': 'text-slate-400',
    'IN_PROGRESS': 'text-amber-400',
    'BLOCKED': 'text-red-400',
    'DONE': 'text-green-400',
  };

  // For PLANNING column: show ALL plans (including completed ones) until manually archived
  const renderPlanningColumn = () => {
    if (plansLoading) {
      return (
        <div className="text-slate-500 text-xs text-center py-2">
          <span className="text-green-500">&gt;</span> Loading plans...
        </div>
      );
    }

    // Show ALL plans that are not archived (regardless of task status)
    const activePlans = plans.filter(p => !p.archived_at);

    return (
      <>
        {/* Plan Groups - show all non-archived plans */}
        {activePlans.map(plan => (
          <PlanGroup
            key={plan.id}
            plan={plan}
            tasks={plan.tasks || []}
            onPlanClick={onPlanClick}
            onTaskClick={onTaskClick}
            onArchive={(planId) => {
              // Remove the archived plan from the list
              setPlans(prev => prev.filter(p => p.id !== planId));
            }}
          />
        ))}

        {/* Empty state */}
        {activePlans.length === 0 && (
          <div className="empty-column text-slate-600 text-xs text-center py-2">
            <span className="text-green-500">&gt;</span> [empty]<span className="cursor-blink text-green-500">_</span>
          </div>
        )}
      </>
    );
  };

  // Standard column rendering (non-PLANNING, non-TODO)
  const renderStandardColumn = () => (
    <>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} onArchive={onTaskArchive} />)}
      </SortableContext>
      {tasks.length === 0 && (
        <div className="empty-column text-slate-600 text-xs text-center py-2">
          <span className="text-green-500">&gt;</span> [empty]<span className="cursor-blink text-green-500">_</span>
        </div>
      )}
    </>
  );
  
  // For TODO column: group tasks by dispatch_id
  const renderTodoColumn = () => {
    if (dispatchesLoading) {
      return (
        <div className="text-slate-500 text-xs text-center py-2">
          <span className="text-green-500">&gt;</span> Loading dispatches...
        </div>
      );
    }

    // Group tasks by dispatch_id
    const tasksWithDispatch = tasks.filter(t => t.dispatch_id !== null);
    const tasksWithoutDispatch = tasks.filter(t => t.dispatch_id === null);
    
    // Group by dispatch
    const tasksByDispatch = tasksWithDispatch.reduce((acc, task) => {
      const key = task.dispatch_id!;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {} as Record<number, Task[]>);

    // Get dispatches that have tasks in this column
    const activeDispatches = dispatches.filter(d => tasksByDispatch[d.id]);

    return (
      <>
        {/* Dispatch Groups */}
        {activeDispatches.map(dispatch => (
          <DispatchGroup
            key={dispatch.id}
            dispatch={dispatch}
            tasks={tasksByDispatch[dispatch.id] || []}
            onTaskClick={onTaskClick}
            onDispatchClick={handleDispatchClick}
          />
        ))

        /* Ungrouped tasks (no dispatch_id) */
        }
        {tasksWithoutDispatch.length > 0 && (
          <div className="ungrouped-tasks space-y-1">
            {tasksWithoutDispatch.map(task => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} onArchive={onTaskArchive} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="empty-column text-slate-600 text-xs text-center py-2">
            <span className="text-green-500">&gt;</span> [empty]<span className="cursor-blink text-green-500">_</span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className={`kanban-column flex flex-col h-full terminal-window transition-all duration-200 ${isOver ? 'drag-over ring-1 ring-cyan-500/40 bg-cyan-950/10' : ''}`}>
        <div className="px-2 py-1 bg-gradient-to-b from-slate-900/80 to-black border-b border-cyan-900/30 flex items-center gap-1">
          <span className={statusColors[title] + " column-header text-xs font-semibold"}>{title.replace('_', ' ')}</span>
          <span className={`text-slate-600 text-xs ${countBump ? 'count-update' : ''}`}>
            [{(id === 'planning' ? plans.filter(p => !p.archived_at).length : tasks.length).toString().padStart(2, '0')}]
          </span>
          {/* Add button for IDEAS column */}
          {id === 'ideas' && onAddClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick();
              }}
              className="ml-auto px-1.5 py-0.5 text-[10px] bg-green-900/40 text-green-400 border border-green-700/50 rounded hover:bg-green-800/50 transition-colors"
              title="Add new idea"
            >
              +
            </button>
          )}
          {/* Archive All button for DONE column */}
          {id === 'done' && onArchiveAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (tasks.length > 0) onArchiveAll();
              }}
              className={`ml-auto px-1.5 py-0.5 text-[9px] border rounded transition-colors ${
                tasks.length > 0 
                  ? 'bg-amber-900/40 text-amber-400 border-amber-700/50 hover:bg-amber-800/50' 
                  : 'bg-slate-800/40 text-slate-600 border-slate-700/50 cursor-not-allowed'
              }`}
              title={tasks.length > 0 ? 'Archive all done tasks' : 'No tasks to archive'}
            >
              📦 archive
            </button>
          )}
        </div>
        <div ref={setNodeRef} className="flex-1 p-1 space-y-1 min-h-[100px] overflow-y-auto transition-colors duration-200">
          {id === 'planning' ? renderPlanningColumn() : id === 'todo' ? renderTodoColumn() : renderStandardColumn()}
        </div>

        {/* Persistent Archive Footer - only for columns with permanent items */}
        {['ideas', 'planning', 'todo', 'done'].includes(id) && (
        <div 
          className={`border-t cursor-pointer transition-all duration-200 ${
            archiveExpanded ? 'flex flex-col' : ''
          } ${
            id === 'ideas' ? 'border-purple-900/40 bg-purple-950/30' :
            id === 'planning' ? 'border-blue-900/40 bg-blue-950/30' :
            id === 'todo' ? 'border-emerald-900/40 bg-emerald-950/30' :
            'border-slate-700/40 bg-slate-950/95'
          }`}
          style={{ height: archiveExpanded ? '150px' : '24px' }}
          onClick={() => setArchiveExpanded(!archiveExpanded)}
        >
          {/* Footer header - always visible */}
          <div className={`px-2 py-1 flex items-center justify-between select-none ${
            id === 'ideas' ? 'bg-purple-900/20' :
            id === 'planning' ? 'bg-blue-900/20' :
            id === 'todo' ? 'bg-emerald-900/20' :
            'bg-slate-800/20'
          }`}>
            <span className={`text-[9px] font-medium ${
              id === 'ideas' ? 'text-purple-400' :
              id === 'planning' ? 'text-blue-400' :
              id === 'todo' ? 'text-emerald-400' :
              'text-slate-400'
            }`}>
              📦 {id === 'ideas' ? 'Ideas' : id === 'planning' ? 'Plans' : id === 'todo' ? 'Dispatch' : 'Done'} Archive
            </span>
            <div className="flex items-center gap-1">
              {archiveLoading ? (
                <span className="text-slate-500 text-[9px]">...</span>
              ) : (
                <span className={`text-[9px] ${
                  id === 'ideas' ? 'text-purple-500/70' :
                  id === 'planning' ? 'text-blue-500/70' :
                  id === 'todo' ? 'text-emerald-500/70' :
                  'text-slate-500/70'
                }`}>
                  {id === 'planning' ? `${archivedPlans.length} plans` :
                   id === 'todo' ? `${archivedDispatches.length} dispatches` :
                   `${archivedTasks.length} tasks`}
                </span>
              )}
              <span className={`text-[9px] transition-transform ${archiveExpanded ? 'rotate-90' : ''} ${
                id === 'ideas' ? 'text-purple-500/50' :
                id === 'planning' ? 'text-blue-500/50' :
                id === 'todo' ? 'text-emerald-500/50' :
                'text-slate-500/50'
              }`}>
                ▶
              </span>
            </div>
          </div>
          
          {/* Expanded content */}
          {archiveExpanded && (
            <div className="flex-1 overflow-y-auto text-[9px]" onClick={e => e.stopPropagation()}>
              {archiveLoading ? (
                <div className="text-slate-500 text-center py-2">Loading...</div>
              ) : id === 'planning' ? (
                archivedPlans.length === 0 ? (
                  <div className="text-slate-600 text-center py-2">No archived plans</div>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {archivedPlans.map(plan => (
                        <tr 
                          key={plan.id}
                          onClick={() => handleArchivedPlanClick(plan)}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                        >
                          <td className="px-1 py-0.5 text-purple-400 font-mono w-8">#{plan.id}</td>
                          <td className="px-1 py-0.5 text-slate-400 truncate max-w-0">[{plan.tag}] {plan.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : id === 'todo' ? (
                archivedDispatches.length === 0 ? (
                  <div className="text-slate-600 text-center py-2">No archived dispatches</div>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {archivedDispatches.map(dispatch => (
                        <tr 
                          key={dispatch.id}
                          onClick={() => handleArchivedDispatchClick(dispatch)}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                        >
                          <td className="px-1 py-0.5 text-amber-400 font-mono w-8">#{dispatch.id}</td>
                          <td className="px-1 py-0.5 text-slate-400 truncate max-w-0">{dispatch.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                archivedTasks.length === 0 ? (
                  <div className="text-slate-600 text-center py-2">No archived tasks</div>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {archivedTasks.map(task => (
                        <tr 
                          key={task.id}
                          onClick={() => handleArchivedTaskClick(task)}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                        >
                          <td className="px-1 py-0.5 text-slate-600 font-mono w-8">#{task.id}</td>
                          <td className="px-1 py-0.5 text-slate-400 truncate max-w-0">{task.title}</td>
                          <td className="px-1 py-0.5 w-12 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(task);
                              }}
                              className="px-1 py-0.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded transition-colors"
                            >
                              restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Dispatch Popup (only for TODO column) */}
      <DispatchPopup
        dispatchId={selectedDispatchId}
        isOpen={isDispatchPopupOpen}
        onClose={handleDispatchPopupClose}
        onTaskClick={onTaskClick}
      />

      {/* Archived Task Popup */}
      <TaskPopup
        task={selectedArchivedTask}
        isOpen={isArchivedTaskPopupOpen && selectedArchivedTask !== null}
        onClose={() => {
          setIsArchivedTaskPopupOpen(false);
          setSelectedArchivedTask(null);
        }}
        onTaskUpdated={(updated) => {
          // Update the archived task in the list
          setArchivedTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        }}
      />

      {/* Archived Plan Modal */}
      <PlanDetailModal
        planId={selectedArchivedPlanId}
        isOpen={isArchivedPlanModalOpen}
        onClose={() => {
          setIsArchivedPlanModalOpen(false);
          setSelectedArchivedPlanId(null);
        }}
      />

      {/* Archived Dispatch Popup */}
      <DispatchPopup
        dispatchId={selectedArchivedDispatchId}
        isOpen={isArchivedDispatchPopupOpen}
        onClose={() => {
          setIsArchivedDispatchPopupOpen(false);
          setSelectedArchivedDispatchId(null);
        }}
        onTaskClick={onTaskClick}
      />
    </>
  );
}
