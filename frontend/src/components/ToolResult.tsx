/**
 * ToolResult - Displays tool results in a collapsible/expandable format
 * 
 * Shows the output from tool calls with appropriate formatting based on
 * content type (text, JSON, error, etc.)
 */

import { useState } from 'react';

export interface ToolResultData {
  success: boolean;
  output?: string | unknown;
  error?: string;
  duration?: number;
  truncated?: boolean;
  byteCount?: number;
}

interface ToolResultProps {
  result: ToolResultData;
  toolName?: string;
  collapsed?: boolean;
  maxHeight?: number;
  showMeta?: boolean;
}

export function ToolResult({ 
  result, 
  toolName, 
  collapsed: defaultCollapsed = true,
  maxHeight = 200,
  showMeta = true 
}: ToolResultProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const isError = !result.success || !!result.error;
  const outputText = typeof result.output === 'string' 
    ? result.output 
    : JSON.stringify(result.output, null, 2);
  
  const lines = outputText.split('\n');
  const lineCount = lines.length;
  
  // Determine content type for styling
  const getContentType = (): 'json' | 'error' | 'text' | 'empty' => {
    if (isError || result.error) return 'error';
    if (!outputText || outputText === 'undefined' || outputText === 'null') return 'empty';
    try {
      JSON.parse(outputText);
      return 'json';
    } catch {
      return 'text';
    }
  };
  
  const contentType = getContentType();
  
  // Don't render if empty and successful
  if (contentType === 'empty' && result.success) {
    return (
      <span className="tool-result-empty text-[0.6rem] text-slate-500 italic">
        ✓ empty
      </span>
    );
  }
  
  return (
    <div className={`tool-result my-0.5 rounded border overflow-hidden ${
      isError 
        ? 'border-red-500/30 bg-red-500/5' 
        : 'border-slate-700/50 bg-slate-900/30'
    }`}>
      {/* Header */}
      <button 
        className="tool-result-header w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-800/30 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className={`collapse-indicator text-[0.55rem] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
          ▶
        </span>
        
        {/* Status icon */}
        <span className={`status-icon text-[0.65rem] ${
          isError ? 'text-red-400' : 'text-green-400'
        }`}>
          {isError ? '✗' : '✓'}
        </span>
        
        {toolName && (
          <span className="tool-name text-[0.6rem] text-purple-400 font-medium">
            {toolName}
          </span>
        )}
        
        {/* Content type badge */}
        <span className={`content-type text-[0.55rem] px-1 rounded ${
          contentType === 'json' ? 'text-cyan-400 bg-cyan-500/10' :
          contentType === 'error' ? 'text-red-400 bg-red-500/10' :
          'text-slate-400 bg-slate-500/10'
        }`}>
          {contentType}
        </span>
        
        {showMeta && (
          <span className="meta ml-auto flex items-center gap-2 text-[0.55rem] text-slate-500">
            {lineCount > 1 && (
              <span className="line-count tabular-nums">{lineCount} lines</span>
            )}
            {result.byteCount && (
              <span className="byte-count tabular-nums">{formatBytes(result.byteCount)}</span>
            )}
            {result.duration && (
              <span className="duration tabular-nums">{result.duration}ms</span>
            )}
          </span>
        )}
        
        {result.truncated && (
          <span className="truncated-badge text-[0.55rem] text-amber-400">
            truncated
          </span>
        )}
      </button>
      
      {/* Content */}
      {!isCollapsed && (
        <div 
          className="tool-result-content overflow-auto text-[0.65rem] font-mono"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {isError && result.error && (
            <div className="error-message px-2 py-1 bg-red-500/10 text-red-300 border-b border-red-500/20">
              {result.error}
            </div>
          )}
          
          <pre className={`output px-2 py-1 whitespace-pre-wrap break-words ${
            isError ? 'text-red-300/90' :
            contentType === 'json' ? 'text-cyan-300/90' :
            'text-slate-300/90'
          }`}>
            {contentType === 'json' && !isError
              ? formatJson(outputText)
              : outputText}
          </pre>
        </div>
      )}
    </div>
  );
}

// Compact inline variant
interface ToolResultInlineProps {
  result: ToolResultData;
  maxLength?: number;
}

export function ToolResultInline({ result, maxLength = 50 }: ToolResultInlineProps) {
  const isError = !result.success || !!result.error;
  const outputText = typeof result.output === 'string' 
    ? result.output 
    : JSON.stringify(result.output);
  
  const truncated = outputText.length > maxLength;
  const displayText = truncated ? outputText.slice(0, maxLength) + '...' : outputText;
  
  return (
    <span className={`tool-result-inline text-[0.6rem] ${
      isError ? 'text-red-400' : 'text-slate-400'
    }`}>
      <span className="status">{isError ? '✗' : '✓'}</span>
      {' '}
      <span className="output-preview">{displayText}</span>
    </span>
  );
}

// Helper: Format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Helper: Format JSON with syntax highlighting hints (CSS classes)
function formatJson(json: string): string {
  // Just return the JSON as-is; CSS will handle coloring
  // In a more advanced version, we'd parse and wrap in spans
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default ToolResult;
