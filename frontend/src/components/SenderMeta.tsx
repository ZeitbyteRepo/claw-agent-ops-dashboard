/**
 * SenderMeta - Displays sender metadata (role, timestamp, agent info)
 * 
 * Provides consistent formatting for who sent a message and when.
 * Used at the start of message cards in the stream.
 */

interface SenderMetaProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  name?: string;
  timestamp: string | Date;
  agentColor?: string;
  model?: string;
  compact?: boolean;
}

export function SenderMeta({ 
  role, 
  name, 
  timestamp, 
  agentColor,
  model,
  compact = true 
}: SenderMetaProps) {
  // Format timestamp
  const formatTime = (ts: string | Date): string => {
    const date = typeof ts === 'string' ? new Date(ts.replace(' ', 'T')) : ts;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Role icons and labels
  const roleConfig = {
    user: { icon: '💬', label: 'YOU', colorClass: 'text-amber-400' },
    assistant: { icon: '🤖', label: name || 'ASSISTANT', colorClass: agentColor || 'text-green-400' },
    system: { icon: '⚙️', label: 'SYS', colorClass: 'text-slate-500' },
    tool: { icon: '🔧', label: 'TOOL', colorClass: 'text-purple-400' },
  };

  const config = roleConfig[role];
  const formattedTime = formatTime(timestamp);

  if (compact) {
    return (
      <span className="sender-meta sender-meta-compact inline-flex items-center gap-1">
        <span className="timestamp text-[0.6rem] text-slate-600 tabular-nums">
          [{formattedTime}]
        </span>
        <span className={`role-label ${config.colorClass} text-[0.7rem] font-semibold`}>
          <span className="role-icon text-[0.6rem] mr-0.5">{config.icon}</span>
          {role === 'user' ? '>' : ''}{config.label}
        </span>
      </span>
    );
  }

  // Full variant with model info
  return (
    <div className="sender-meta sender-meta-full flex items-center gap-2 mb-1">
      <span className="timestamp text-[0.6rem] text-slate-600 tabular-nums">
        {formattedTime}
      </span>
      
      <span className={`role-label ${config.colorClass} text-[0.7rem] font-semibold flex items-center gap-1`}>
        <span className="role-icon text-[0.65rem]">{config.icon}</span>
        {role === 'user' ? '>' : ''}{config.label}
      </span>
      
      {model && role === 'assistant' && (
        <span className="model-badge text-[0.55rem] text-slate-500 px-1 rounded bg-slate-800/50">
          {model.split('/').pop()?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Minimal timestamp-only variant
interface TimestampOnlyProps {
  timestamp: string | Date;
  showSeconds?: boolean;
}

export function TimestampOnly({ timestamp, showSeconds = false }: TimestampOnlyProps) {
  const formatTime = (ts: string | Date): string => {
    const date = typeof ts === 'string' ? new Date(ts.replace(' ', 'T')) : ts;
    
    if (showSeconds) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <span className="timestamp text-[0.6rem] text-slate-600 tabular-nums">
      [{formatTime(timestamp)}]
    </span>
  );
}

// Relative time variant (e.g., "2m ago", "1h ago")
interface RelativeTimeProps {
  timestamp: string | Date;
  prefix?: string;
}

export function RelativeTime({ timestamp, prefix = '' }: RelativeTimeProps) {
  const getRelativeTime = (ts: string | Date): string => {
    const date = typeof ts === 'string' ? new Date(ts.replace(' ', 'T')) : ts;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 0) return 'now';
    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    
    return date.toLocaleDateString();
  };

  return (
    <span className="relative-time text-[0.6rem] text-slate-500">
      {prefix}{getRelativeTime(timestamp)}
    </span>
  );
}

// Agent status indicator with name
interface AgentStatusMetaProps {
  name: string;
  status: 'active' | 'idle' | 'offline';
  model?: string;
  colorClass?: string;
}

export function AgentStatusMeta({ name, status, model, colorClass }: AgentStatusMetaProps) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-slate-500',
  };

  const statusAnimClass = status === 'active' ? 'status-dot-active' : '';

  return (
    <div className="agent-status-meta flex items-center gap-1.5">
      <span className={`status-dot w-1.5 h-1.5 rounded-full ${statusColors[status]} ${statusAnimClass}`} />
      <span className={`agent-name text-[0.7rem] font-medium ${colorClass || 'text-slate-300'}`}>
        {name}
      </span>
      {model && (
        <span className="model text-[0.55rem] text-slate-500">
          ({model.split('/').pop()?.toUpperCase()})
        </span>
      )}
    </div>
  );
}

export default SenderMeta;
