import { useState } from 'react';

// InlineCode - gray pill for code snippets
interface InlineCodeProps {
  code: string;
  language?: string;
}

export function InlineCode({ code, language }: InlineCodeProps) {
  return (
    <code className="inline-code px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/30 text-slate-200 text-[0.65rem] font-mono whitespace-pre-wrap">
      {language && <span className="text-cyan-400/70 mr-1">{language}:</span>}
      {code}
    </code>
  );
}

// KeyValue - cyan key, muted colon, white value
interface KeyValueProps {
  k: string;
  v: string | number | boolean;
  inline?: boolean;
}

export function KeyValue({ k: key, v: value, inline = true }: KeyValueProps) {
  const displayValue = typeof value === 'boolean' 
    ? (value ? '✓' : '✗') 
    : String(value);
  
  const valueColor = typeof value === 'boolean'
    ? value ? 'text-green-400' : 'text-red-400'
    : typeof value === 'number'
    ? 'text-amber-400 tabular-nums'
    : 'text-white';
  
  if (inline) {
    return (
      <span className="keyvalue-inline inline-flex items-baseline gap-0.5 text-[0.7rem]">
        <span className="text-cyan-400 font-medium">{key}</span>
        <span className="text-slate-500">:</span>
        <span className={valueColor}>{displayValue}</span>
      </span>
    );
  }
  
  return (
    <div className="keyvalue-block flex items-baseline gap-1 text-xs">
    <span className="text-cyan-400 font-medium">{key}</span>
    <span className="text-slate-500">:</span>
    <span className={valueColor}>{displayValue}</span>
  </div>
  );
}

// UrlLink - cyan, underline on hover, domain only
interface UrlLinkProps {
  url: string;
  text?: string;
  showDomain?: boolean;
}

export function UrlLink({ url, text, showDomain = true }: UrlLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  let domain = url;
  try {
    domain = new URL(url).hostname;
  } catch {
    // Invalid URL, use as-is
  }
  
  const displayText = text || (showDomain ? domain : url);
  
  return (
    <a 
      href={url}
      className="url-link inline-flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 transition-colors text-[0.7rem]"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={url}
    >
      <span className="url-icon text-[0.6rem]">⬈</span>
      <span className={`url-text ${isHovered ? 'underline' : 'underline-dashed'}`}>
        {displayText}
      </span>
    </a>
  );
}

// FilePath - amber/gold file path chip
interface FilePathProps {
  path: string;
  showFilename?: boolean;
  truncate?: number;
  variant?: 'default' | 'compact' | 'full';
  showIcon?: boolean;
  showExtension?: boolean;
}

export function FilePath({ 
  path, 
  showFilename = true, 
  truncate = 40,
  variant = 'default',
  showIcon = true,
  showExtension = false
}: FilePathProps) {
  const parts = path.split(/[/\\]/);
  const filename = parts[parts.length - 1] || path;
  const dir = parts.slice(0, -1).join('/');
  const extension = filename.includes('.') ? filename.split('.').pop() : '';
  
  const shouldTruncate = path.length > truncate;
  const displayPath = shouldTruncate 
    ? `...${path.slice(-truncate + 3)}` 
    : path;
  
  // Get file icon based on extension
  const getFileIcon = (ext?: string): string => {
    if (!ext) return '📄';
    const icons: Record<string, string> = {
      'ts': '📘',
      'tsx': '⚛️',
      'js': '📒',
      'jsx': '⚛️',
      'py': '🐍',
      'rs': '🦀',
      'go': '🐹',
      'md': '📝',
      'json': '📋',
      'yaml': '⚙️',
      'yml': '⚙️',
      'toml': '⚙️',
      'css': '🎨',
      'html': '🌐',
      'sql': '🗃️',
      'sh': '💻',
      'bash': '💻',
    };
    return icons[ext.toLowerCase()] || '📄';
  };
  
  // Compact variant - just filename
  if (variant === 'compact') {
    return (
      <span 
        className="filepath-chip-compact inline-flex items-center gap-0.5 px-1 py-0.3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[0.65rem] font-mono"
        title={path}
      >
        {showIcon && <span className="filepath-icon text-[0.6rem]">{getFileIcon(extension)}</span>}
        <span className="filepath-name truncate max-w-[100px]">{filename}</span>
      </span>
    );
  }
  
  // Full variant - show complete path
  if (variant === 'full') {
    return (
      <span 
        className="filepath-chip-full inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[0.65rem] font-mono"
        title={path}
      >
        {showIcon && <span className="filepath-icon text-[0.6rem]">{getFileIcon(extension)}</span>}
        <span className="filepath-full break-all">{path}</span>
      </span>
    );
  }
  
  // Default variant
  return (
    <span 
      className="filepath-chip inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[0.7rem] font-mono"
      title={path}
    >
      {showIcon && <span className="filepath-icon text-[0.65rem]">{getFileIcon(extension)}</span>}
      {showFilename ? (
        <>
          {dir && <span className="filepath-dir text-amber-400/60 truncate max-w-[80px]">{dir}/</span>}
          <span className="filepath-name">{showExtension && extension ? `${filename}` : filename}</span>
        </>
      ) : (
        <span className="filepath-full">{displayPath}</span>
      )}
    </span>
  );
}

// FilePathList - multiple file paths
interface FilePathListProps {
  paths: string[];
  max?: number;
  variant?: 'default' | 'compact';
}

export function FilePathList({ paths, max = 5, variant = 'compact' }: FilePathListProps) {
  const visiblePaths = paths.slice(0, max);
  const hiddenCount = paths.length - max;
  
  return (
    <span className="filepath-list inline-flex flex-wrap items-center gap-1">
      {visiblePaths.map((path, idx) => (
        <FilePath key={idx} path={path} variant={variant} />
      ))}
      {hiddenCount > 0 && (
        <span className="more-paths text-[0.6rem] text-slate-500">
          +{hiddenCount} more
        </span>
      )}
    </span>
  );
}

// FilePath with action (e.g., read/write indicator)
interface FilePathActionProps {
  path: string;
  action: 'read' | 'write' | 'delete' | 'create';
}

export function FilePathAction({ path, action }: FilePathActionProps) {
  const actionConfig = {
    read: { icon: '📖', label: 'READ', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25' },
    write: { icon: '✏️', label: 'WRITE', color: 'text-green-400 bg-green-500/10 border-green-500/25' },
    delete: { icon: '🗑️', label: 'DELETE', color: 'text-red-400 bg-red-500/10 border-red-500/25' },
    create: { icon: '✨', label: 'CREATE', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' },
  };
  
  const config = actionConfig[action];
  
  return (
    <span className="filepath-action inline-flex items-center gap-1.5">
      <span className={`action-badge inline-flex items-center gap-0.5 px-1 py-0.3 rounded text-[0.55rem] font-semibold border ${config.color}`}>
        <span className="action-icon">{config.icon}</span>
        <span className="action-label uppercase">{config.label}</span>
      </span>
      <FilePath path={path} variant="compact" showIcon={false} />
    </span>
  );
}

// Mention - @agent highlight
interface MentionProps {
  name: string;
  isAgent?: boolean;
}

export function Mention({ name, isAgent = true }: MentionProps) {
  return (
    <span className={`mention inline-flex items-center px-1 py-0.5 rounded text-[0.7rem] font-medium ${
      isAgent 
        ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300' 
        : 'bg-slate-500/15 border border-slate-500/30 text-slate-300'
    }`}>
      @{name}
    </span>
  );
}

// Tag - #task or #plan reference
interface TagProps {
  tag: string;
  type?: 'task' | 'plan' | 'dispatch' | 'default';
}

export function Tag({ tag, type = 'default' }: TagProps) {
  const typeStyles = {
    task: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    plan: 'bg-green-500/15 border-green-500/30 text-green-300',
    dispatch: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    default: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  };
  
  return (
    <span className={`tag inline-flex items-center px-1 py-0.5 rounded border text-[0.7rem] ${typeStyles[type]}`}>
      #{tag}
    </span>
  );
}

// Status badge - for status values
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    // Task/Dispatch statuses
    'todo': 'bg-slate-500/20 text-slate-400',
    'in_progress': 'bg-amber-500/20 text-amber-400',
    'done': 'bg-green-500/20 text-green-400',
    'blocked': 'bg-red-500/20 text-red-400',
    'ideas': 'bg-purple-500/20 text-purple-400',
    'planning': 'bg-blue-500/20 text-blue-400',
    
    // Agent statuses
    'active': 'bg-green-500/20 text-green-400',
    'idle': 'bg-yellow-500/20 text-yellow-400',
    'offline': 'bg-slate-500/20 text-slate-400',
    
    // Dispatch statuses
    'pending': 'bg-slate-500/20 text-slate-400',
    'dispatched': 'bg-blue-500/20 text-blue-400',
    'failed': 'bg-red-500/20 text-red-400',
  };
  
  const style = statusStyles[status.toLowerCase()] || 'bg-slate-500/20 text-slate-400';
  const sizeClass = size === 'sm' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5';
  
  return (
    <span className={`status-badge inline-flex items-center rounded ${style} ${sizeClass} uppercase font-semibold tracking-wider`}>
      {status.replace('_', ' ')}
    </span>
  );
}
