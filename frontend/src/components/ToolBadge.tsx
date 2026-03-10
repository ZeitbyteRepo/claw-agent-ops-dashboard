/**
 * ToolBadge - Purple pill badge for tool names
 * 
 * Displays tool invocations in a consistent, visually distinct way.
 * Used to show when the agent calls a tool like `read`, `write`, `exec`, etc.
 */

interface ToolBadgeProps {
  name: string;
  status?: 'pending' | 'running' | 'success' | 'error';
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function ToolBadge({ name, status, size = 'sm', onClick }: ToolBadgeProps) {
  const statusColors = {
    pending: 'border-slate-500/40',
    running: 'border-cyan-500/40 animate-pulse',
    success: 'border-green-500/40',
    error: 'border-red-500/40',
  };

  const statusIcons = {
    pending: '⏳',
    running: '⚡',
    success: '✓',
    error: '✗',
  };

  const sizeClasses = {
    sm: 'text-[0.65rem] px-1.5 py-0.5',
    md: 'text-[0.7rem] px-2 py-1',
  };

  const borderClass = status ? statusColors[status] : 'border-purple-500/35';
  const icon = status ? statusIcons[status] : null;

  return (
    <span 
      className={`tool-badge inline-flex items-center gap-1 rounded-full bg-purple-500/15 ${borderClass} ${sizeClasses[size]} text-purple-300 font-semibold whitespace-nowrap transition-all duration-200 hover:bg-purple-500/25 hover:border-purple-500/50 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      title={status ? `${name} - ${status}` : name}
    >
      <span className="tool-icon text-[0.6rem]">⚙</span>
      <span className="tool-name">{name}</span>
      {icon && (
        <span className={`status-indicator text-[0.55rem] ${
          status === 'error' ? 'text-red-400' : 
          status === 'success' ? 'text-green-400' : 
          status === 'running' ? 'text-cyan-400' : 'text-slate-400'
        }`}>
          {icon}
        </span>
      )}
    </span>
  );
}

// Tool badge with argument preview
interface ToolBadgeWithArgsProps {
  name: string;
  args?: Record<string, unknown>;
  status?: 'pending' | 'running' | 'success' | 'error';
  compact?: boolean;
}

export function ToolBadgeWithArgs({ name, args, status, compact = true }: ToolBadgeWithArgsProps) {
  // Build a short preview of arguments
  const argPreview = args ? Object.entries(args)
    .slice(0, 2)
    .map(([k, v]) => {
      const value = typeof v === 'string' 
        ? v.length > 20 ? v.slice(0, 17) + '...' : v
        : String(v);
      return `${k}=${value}`;
    })
    .join(', ') : '';

  return (
    <span className="tool-badge-args inline-flex items-center gap-1.5 flex-wrap">
      <ToolBadge name={name} status={status} />
      {argPreview && !compact && (
        <span className="tool-args-preview text-[0.6rem] text-slate-500 font-mono">
          ({argPreview}{Object.keys(args || {}).length > 2 ? ', ...' : ''})
        </span>
      )}
    </span>
  );
}

// Export default
export default ToolBadge;
