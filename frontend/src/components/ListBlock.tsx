interface ListBlockProps {
  items: string[];
  ordered?: boolean;
  startNumber?: number;
  compact?: boolean;
}

// Bullet list component with proper indentation
export function BulletList({ items, compact = false }: ListBlockProps) {
  if (items.length === 0) return null;
  
  return (
    <ul className={`list-block bullet-list ${compact ? 'compact' : ''} my-1 pl-4`}>
      {items.map((item, idx) => (
        <li key={idx} className="list-item bullet-item flex items-start gap-1.5">
          <span className="bullet-marker text-cyan-400 flex-shrink-0 mt-0.5">•</span>
          <span className="list-item-content text-slate-300 flex-1">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Numbered list component
export function NumberedList({ items, startNumber = 1, compact = false }: ListBlockProps) {
  if (items.length === 0) return null;
  
  const maxDigits = String(startNumber + items.length - 1).length;
  
  return (
    <ol className={`list-block numbered-list ${compact ? 'compact' : ''} my-1 pl-1`} start={startNumber}>
      {items.map((item, idx) => {
        const num = startNumber + idx;
        return (
          <li key={idx} className="list-item numbered-item flex items-start gap-1">
            <span 
              className="number-marker text-cyan-400/80 flex-shrink-0 tabular-nums text-right"
              style={{ minWidth: `${maxDigits + 1.5}ch` }}
            >
              {num}.
            </span>
            <span className="list-item-content text-slate-300 flex-1">
              {item}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Generic list block that auto-detects type
export function ListBlock({ items, ordered = false, compact = false }: ListBlockProps) {
  if (ordered) {
    return <NumberedList items={items} compact={compact} />;
  }
  return <BulletList items={items} compact={compact} />;
}

// Nested list support (for complex markdown)
interface NestedListItem {
  content: string;
  children?: NestedListItem[];
}

interface NestedListProps {
  items: NestedListItem[];
  depth?: number;
}

export function NestedList({ items, depth = 0 }: NestedListProps) {
  if (items.length === 0) return null;
  
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';
  
  return (
    <ul className={`nested-list ${indentClass} my-0.5`}>
      {items.map((item, idx) => (
        <li key={idx} className="nested-list-item">
          <div className="flex items-start gap-1.5">
            <span className="text-cyan-400/70">•</span>
            <span className="text-slate-300">{item.content}</span>
          </div>
          {item.children && item.children.length > 0 && (
            <NestedList items={item.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

// Task list (checkboxes)
interface TaskListProps {
  tasks: { text: string; completed: boolean }[];
  onToggle?: (index: number) => void;
}

export function TaskList({ tasks, onToggle }: TaskListProps) {
  if (tasks.length === 0) return null;
  
  const completedCount = tasks.filter(t => t.completed).length;
  
  return (
    <div className="task-list my-1.5">
      {tasks.length > 1 && (
        <div className="task-list-progress mb-1 flex items-center gap-2 text-[10px]">
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500/50 transition-all duration-300"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
          <span className="text-slate-500 tabular-nums">{completedCount}/{tasks.length}</span>
        </div>
      )}
      <ul className="space-y-0.5">
        {tasks.map((task, idx) => (
          <li 
            key={idx} 
            className={`task-item flex items-start gap-2 text-xs cursor-${onToggle ? 'pointer' : 'default'} hover:bg-slate-800/30 px-1 py-0.5 rounded transition-colors`}
            onClick={() => onToggle?.(idx)}
          >
            <span className={`task-checkbox flex-shrink-0 ${task.completed ? 'text-green-400' : 'text-slate-500'}`}>
              {task.completed ? '☑' : '☐'}
            </span>
            <span className={`task-text flex-1 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
              {task.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
