/**
 * ToolGroup - Groups consecutive tool calls into a collapsible section
 * 
 * When multiple tools are called in sequence, this component provides
 * a clean way to display them as a group with expand/collapse functionality.
 */

import { useState } from 'react';
import { ToolBadge } from './ToolBadge';

export interface ToolCall {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status?: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  duration?: number; // in ms
}

interface ToolGroupProps {
  tools: ToolCall[];
  title?: string;
  collapsed?: boolean;
  showTimings?: boolean;
}

export function ToolGroup({ tools, title, collapsed: defaultCollapsed = true, showTimings = false }: ToolGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  if (tools.length === 0) return null;
  
  // Single tool - no grouping needed
  if (tools.length === 1) {
    const tool = tools[0];
    return (
      <div className="tool-group tool-group-single flex items-center gap-1.5 my-0.5">
        <ToolBadge name={tool.name} status={tool.status} />
        {showTimings && tool.duration && (
          <span className="tool-timing text-[0.55rem] text-slate-500 tabular-nums">
            {tool.duration}ms
          </span>
        )}
      </div>
    );
  }
  
  // Multiple tools - show group
  const successCount = tools.filter(t => t.status === 'success').length;
  const errorCount = tools.filter(t => t.status === 'error').length;
  const runningCount = tools.filter(t => t.status === 'running').length;
  
  const totalCount = tools.length;
  const totalDuration = tools.reduce((sum, t) => sum + (t.duration || 0), 0);
  
  return (
    <div className="tool-group tool-group-multi my-1 border border-slate-800/50 rounded overflow-hidden">
      {/* Header - always visible */}
      <button 
        className="tool-group-header w-full flex items-center gap-2 px-2 py-1 bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className={`collapse-indicator text-[0.6rem] text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
          ▶
        </span>
        
        <span className="tool-count text-[0.65rem] text-slate-400">
          {totalCount} tools
        </span>
        
        {title && (
          <span className="tool-group-title text-[0.65rem] text-slate-500 truncate">
            {title}
          </span>
        )}
        
        {/* Status summary */}
        <span className="status-summary flex items-center gap-1 ml-auto text-[0.6rem]">
          {successCount > 0 && (
            <span className="text-green-400">✓{successCount}</span>
          )}
          {errorCount > 0 && (
            <span className="text-red-400">✗{errorCount}</span>
          )}
          {runningCount > 0 && (
            <span className="text-cyan-400 animate-pulse">⚡{runningCount}</span>
          )}
        </span>
        
        {showTimings && totalDuration > 0 && (
          <span className="total-timing text-[0.55rem] text-slate-500 tabular-nums">
            {totalDuration}ms
          </span>
        )}
      </button>
      
      {/* Tool list - collapsible */}
      {!isCollapsed && (
        <div className="tool-list px-2 py-1 space-y-0.5 bg-slate-950/50">
          {tools.map((tool) => (
            <div key={tool.id} className="tool-item flex items-center gap-1.5">
              <ToolBadge name={tool.name} status={tool.status} size="sm" />
              
              {/* Show first arg if it's a file path or URL */}
              {tool.args && (
                <span className="tool-arg-preview text-[0.6rem] text-slate-500 truncate max-w-[120px]">
                  {String(tool.args.path || tool.args.url || tool.args.file_path || '')}
                </span>
              )}
              
              {showTimings && tool.duration && (
                <span className="tool-timing text-[0.55rem] text-slate-500 tabular-nums ml-auto">
                  {tool.duration}ms
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Timeline variant - shows tools in a vertical timeline
interface ToolTimelineProps {
  tools: ToolCall[];
  showConnectors?: boolean;
}

export function ToolTimeline({ tools, showConnectors = true }: ToolTimelineProps) {
  if (tools.length === 0) return null;
  
  return (
    <div className="tool-timeline relative pl-3 my-1">
      {showConnectors && (
        <div className="timeline-connector absolute left-[7px] top-2 bottom-2 w-px bg-slate-700" />
      )}
      
      {tools.map((tool) => (
        <div key={tool.id} className="tool-timeline-item relative flex items-start gap-2 mb-1 last:mb-0">
          <span className={`timeline-dot absolute left-[-10px] top-1.5 w-2 h-2 rounded-full ${
            tool.status === 'success' ? 'bg-green-500' :
            tool.status === 'error' ? 'bg-red-500' :
            tool.status === 'running' ? 'bg-cyan-500 animate-pulse' :
            'bg-slate-500'
          }`} />
          
          <ToolBadge name={tool.name} status={tool.status} />
          
          {tool.duration && (
            <span className="tool-timing text-[0.55rem] text-slate-500 tabular-nums ml-auto">
              {tool.duration}ms
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default ToolGroup;
