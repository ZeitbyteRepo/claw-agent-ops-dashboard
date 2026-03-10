import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onArchive?: (task: Task) => void;
}

// Extract [TAG] prefix from title (supports alphanumeric tags like POLISH2, INST001)
const parseTaskTitle = (title: string): { tag: string | null; displayTitle: string } => {
  const match = title.match(/^\[([A-Z0-9]+)\]\s*(.+)$/);
  if (match) {
    return { tag: match[1], displayTitle: match[2] };
  }
  return { tag: null, displayTitle: title };
};

// Generate consistent color for each tag
const getTagColors = (tag: string): { bg: string; text: string; border: string } => {
  const colors = [
    { bg: 'bg-cyan-900/50', text: 'text-cyan-300', border: 'border-cyan-700/50' },
    { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-700/50' },
    { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700/50' },
    { bg: 'bg-rose-900/50', text: 'text-rose-300', border: 'border-rose-700/50' },
    { bg: 'bg-emerald-900/50', text: 'text-emerald-300', border: 'border-emerald-700/50' },
    { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700/50' },
    { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-700/50' },
    { bg: 'bg-pink-900/50', text: 'text-pink-300', border: 'border-pink-700/50' },
    { bg: 'bg-teal-900/50', text: 'text-teal-300', border: 'border-teal-700/50' },
    { bg: 'bg-indigo-900/50', text: 'text-indigo-300', border: 'border-indigo-700/50' },
  ];
  
  // Hash tag string to pick consistent color
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get agent-specific color class
const getAgentColorClass = (agentId: string | null): string => {
  if (!agentId) return 'text-slate-600';
  const agentClasses: Record<string, string> = {
    'hephaestus': 'text-agent-hephaestus',
    'athena': 'text-agent-athena',
    'main': 'text-agent-mr-claw',
    'test': 'text-agent-test',
  };
  return agentClasses[agentId] || 'text-cyan-400';
};

export function TaskCard({ task, onClick, onArchive }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'transform 0.2s ease, opacity 0.15s ease, box-shadow 0.2s ease',
  };

  const { tag: parsedTag, displayTitle } = parseTaskTitle(task.title);
  // Use task.code if available, otherwise fall back to parsed tag
  const badgeCode = task.code || parsedTag;
  const tagColors = badgeCode ? getTagColors(badgeCode) : null;

  // Task state classes
  const isInProgress = task.status === 'in_progress';
  const isClaimed = task.agent_id && task.status === 'todo';
  const isDone = task.status === 'done';
  
  // State-based styling
  // Note: Done tasks in DONE column should be fully visible, not dimmed
  let stateClasses = '';
  if (isInProgress) {
    stateClasses = 'border-amber-500/70 bg-amber-950/20 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
  } else if (isClaimed) {
    stateClasses = 'border-cyan-700/30 bg-slate-950/40 opacity-70';
  } else if (isDone) {
    // Done tasks in DONE column should be fully visible (green glow)
    // Only dim if shown in other columns (via PlanGroup)
    stateClasses = 'border-green-700/50 bg-green-950/20';
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return diffMin + 'm';
    if (diffHour < 24) return diffHour + 'h';
    return date.toLocaleDateString();
  };

  // Separate drag handle from click area
  const handleClick = () => {
    // Don't trigger click if we were dragging
    if (!isDragging) {
      onClick?.(task);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`task-card-draggable task-card-animate relative bg-slate-950/80 rounded border border-cyan-900/40 p-1.5 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-950/20 ${isDragging ? 'task-card-dragging' : ''} ${stateClasses}`}
      onClick={handleClick}
    >
      {/* In Progress indicator */}
      {isInProgress && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="In Progress" />
      )}
      {/* Claimed indicator */}
      {isClaimed && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full" title="Claimed" />
      )}
      {/* ID Badge - top right corner */}
      <span className="absolute top-0.5 right-0.5 text-[8px] text-cyan-500/70 font-mono bg-slate-900/80 px-1 rounded">
        #{task.id}
      </span>
      
      {/* Drag handle */}
      <div 
        {...listeners}
        className="absolute top-1 left-1 w-4 h-4 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 group-hover:opacity-60 transition-opacity"
        style={{ opacity: 0.3 }}
      >
        <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="6" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="19" cy="6" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </div>
      
      <div className="text-green-400 text-xs leading-snug break-words pr-6">{displayTitle}</div>
      
      {/* Notes preview for planning tasks */}
      {task.status === 'planning' && task.notes && (
        <div className="mt-1 text-[10px] text-slate-400 leading-relaxed line-clamp-2 pl-1 border-l-2 border-slate-700/50">
          {task.notes.substring(0, 100)}{task.notes.length > 100 ? '...' : ''}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs mt-0.5">
        {badgeCode && tagColors && (
          <span className={`task-tag-badge flex-shrink-0 px-1 py-0.5 text-[10px] font-bold rounded ${tagColors.bg} ${tagColors.text} border ${tagColors.border}`}>
            {badgeCode}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {/* Archive button for ideas (replaces notes icon) */}
          {task.status === 'ideas' && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const { archiveTask } = await import('../api');
                  await archiveTask(task.id);
                  onArchive?.(task);
                } catch (err) {
                  console.error('Failed to archive idea:', err);
                }
              }}
              className="text-amber-400/70 text-[10px] hover:text-amber-400 transition-colors"
              title="Archive this idea"
            >
              📦
            </button>
          )}
          {/* Notes icon for non-ideas */}
          {task.status !== 'ideas' && task.notes && (
            <span className="text-amber-400/70 text-[10px]" title="Has notes">📝</span>
          )}
          <span className="text-[9px] text-slate-600">{getRelativeTime(task.updated_at)}</span>
          {/* Only show agent badge for non-planning tasks (agent-agnostic in planning) */}
          {task.status !== 'planning' && task.agent_name && (
            <span className={`${getAgentColorClass(task.agent_id)} text-[10px]`}>@{task.agent_name}</span>
          )}
          {/* Archive button for done tasks */}
          {isDone && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const { archiveTask } = await import('../api');
                  await archiveTask(task.id);
                  onArchive?.(task);
                } catch (err) {
                  console.error('Failed to archive task:', err);
                }
              }}
              className="px-1 py-0.5 text-[9px] bg-amber-900/40 text-amber-400 rounded hover:bg-amber-800/50 transition-colors"
              title="Archive this task"
            >
              📦
            </button>
          )}
        </div>
      </div>
    </div>
  );
}