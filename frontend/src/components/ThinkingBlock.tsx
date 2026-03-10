/**
 * ThinkingBlock - Collapsible thinking/reasoning block
 * 
 * Displays agent thinking/reasoning content in a collapsible section.
 * Useful for hiding verbose reasoning while keeping it accessible.
 */

import { useState } from 'react';

interface ThinkingBlockProps {
  content: string;
  collapsed?: boolean;
  duration?: number;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

export function ThinkingBlock({ 
  content, 
  collapsed: defaultCollapsed = true,
  duration,
  showIcon = true,
  variant = 'default'
}: ThinkingBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  if (!content || content.trim().length === 0) return null;
  
  // Get preview text (first line or truncated)
  const lines = content.split('\n').filter(l => l.trim());
  const previewText = lines[0]?.slice(0, 60) || '';
  const hasMoreContent = lines.length > 1 || (lines[0]?.length || 0) > 60;
  
  // Minimal variant - just a small indicator
  if (variant === 'minimal') {
    return (
      <span className="thinking-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/50 text-[0.6rem] text-slate-400 border border-slate-700/50">
        {showIcon && <span className="thinking-icon">💭</span>}
        <span className="thinking-label">thinking</span>
        {duration && (
          <span className="thinking-duration tabular-nums text-slate-500">{duration}ms</span>
        )}
      </span>
    );
  }
  
  // Compact variant - single line with expand option
  if (variant === 'compact') {
    return (
      <div className="thinking-block-compact my-0.5">
        <button 
          className="flex items-center gap-1.5 text-left w-full group"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {showIcon && <span className="thinking-icon text-[0.65rem]">💭</span>}
          <span className="thinking-label text-[0.6rem] text-slate-400 group-hover:text-slate-300 transition-colors">
            {isCollapsed ? 'thinking' : 'hide thinking'}
          </span>
          {duration && (
            <span className="thinking-duration text-[0.55rem] text-slate-500 tabular-nums">
              {duration}ms
            </span>
          )}
        </button>
        
        {!isCollapsed && (
          <div className="thinking-content mt-1 pl-4 text-[0.65rem] text-slate-400/90 border-l border-slate-700/50 whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>
    );
  }
  
  // Default variant - full collapsible block
  return (
    <div className="thinking-block my-1 border border-slate-800/50 rounded overflow-hidden bg-slate-900/30">
      {/* Header */}
      <button 
        className="thinking-header w-full flex items-center gap-2 px-2 py-1 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className={`collapse-indicator text-[0.55rem] text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
          ▶
        </span>
        
        {showIcon && <span className="thinking-icon text-[0.65rem]">💭</span>}
        
        <span className="thinking-label text-[0.6rem] text-slate-400 font-medium">
          Thinking
        </span>
        
        {/* Preview text */}
        {isCollapsed && hasMoreContent && (
          <span className="thinking-preview text-[0.55rem] text-slate-500 truncate flex-1 ml-1">
            "{previewText}..."
          </span>
        )}
        
        {!isCollapsed && (
          <span className="thinking-count text-[0.55rem] text-slate-500">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        )}
        
        {duration && (
          <span className="thinking-duration text-[0.55rem] text-slate-500 tabular-nums ml-auto">
            {duration}ms
          </span>
        )}
      </button>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="thinking-content px-3 py-2 text-[0.65rem] text-slate-400/90 whitespace-pre-wrap border-t border-slate-800/30 bg-slate-950/30">
          {content}
        </div>
      )}
    </div>
  );
}

// Streaming thinking block (shows content as it arrives)
interface StreamingThinkingProps {
  content: string;
  isComplete?: boolean;
  showCursor?: boolean;
}

export function StreamingThinking({ content, isComplete = false, showCursor = true }: StreamingThinkingProps) {
  if (!content) return null;
  
  return (
    <div className="thinking-streaming my-1 px-2 py-1 border-l-2 border-cyan-500/30 bg-cyan-500/5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="thinking-icon text-[0.65rem]">💭</span>
        <span className="thinking-label text-[0.6rem] text-cyan-400/80">
          {isComplete ? 'Thinking' : 'Thinking...'}
        </span>
        {!isComplete && (
          <span className="thinking-status text-[0.55rem] text-cyan-400/50 animate-pulse">
            ●
          </span>
        )}
      </div>
      
      <div className="thinking-content text-[0.65rem] text-slate-400/90 whitespace-pre-wrap">
        {content}
        {!isComplete && showCursor && (
          <span className="cursor-blink text-cyan-400">▌</span>
        )}
      </div>
    </div>
  );
}

// Reasoning block - similar to thinking but with different styling
interface ReasoningBlockProps {
  content: string;
  steps?: string[];
  collapsed?: boolean;
}

export function ReasoningBlock({ content, steps, collapsed = true }: ReasoningBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  
  // If steps provided, show as numbered list
  if (steps && steps.length > 0) {
    return (
      <div className="reasoning-block my-1 border border-purple-500/20 rounded overflow-hidden">
        <button 
          className="reasoning-header w-full flex items-center gap-2 px-2 py-1 bg-purple-500/5 hover:bg-purple-500/10 transition-colors text-left"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className={`collapse-indicator text-[0.55rem] text-purple-400/50 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
            ▶
          </span>
          <span className="reasoning-icon text-[0.65rem]">🧠</span>
          <span className="reasoning-label text-[0.6rem] text-purple-400 font-medium">
            Reasoning
          </span>
          <span className="step-count text-[0.55rem] text-purple-400/50 ml-auto">
            {steps.length} steps
          </span>
        </button>
        
        {!isCollapsed && (
          <ol className="reasoning-steps px-3 py-1.5 text-[0.65rem] text-slate-400/90 space-y-0.5 bg-slate-950/30">
            {steps.map((step, idx) => (
              <li key={idx} className="flex gap-1.5">
                <span className="step-number text-purple-400/70 tabular-nums">{idx + 1}.</span>
                <span className="step-content">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
  
  // Otherwise, show as plain content
  return (
    <ThinkingBlock 
      content={content} 
      collapsed={isCollapsed}
      showIcon={true}
    />
  );
}

export default ThinkingBlock;
