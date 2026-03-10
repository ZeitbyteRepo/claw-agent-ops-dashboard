/**
 * JsonBlock - Pretty-printed JSON with collapsible structure
 * 
 * Displays JSON data with syntax highlighting, collapsible objects/arrays,
 * and type indicators.
 */

import { useState } from 'react';

interface JsonBlockProps {
  data: unknown;
  collapsed?: boolean;
  maxDepth?: number;
  maxHeight?: number;
  showTypes?: boolean;
  label?: string;
}

export function JsonBlock({ 
  data, 
  collapsed: defaultCollapsed = false,
  maxDepth = 4,
  maxHeight = 300,
  showTypes = true,
  label
}: JsonBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Parse if string
  const jsonData = typeof data === 'string' ? safeParseJson(data) : data;
  const isValidJson = jsonData !== null;
  
  if (!isValidJson) {
    return (
      <div className="json-block json-error my-1 px-2 py-1 border border-red-500/30 rounded bg-red-500/5">
        <span className="error-label text-[0.6rem] text-red-400">Invalid JSON</span>
        <pre className="error-content text-[0.6rem] text-red-300/80 mt-1">{String(data)}</pre>
      </div>
    );
  }
  
  // Get summary info
  const summary = getJsonSummary(jsonData);
  
  return (
    <div className="json-block my-1 border border-slate-800/50 rounded overflow-hidden bg-slate-950/30">
      {/* Header */}
      <button 
        className="json-header w-full flex items-center gap-2 px-2 py-1 bg-slate-900/50 hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className={`collapse-indicator text-[0.55rem] text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
          ▶
        </span>
        
        {label && (
          <span className="json-label text-[0.6rem] text-cyan-400 font-medium">
            {label}
          </span>
        )}
        
        <span className="json-type-badge text-[0.55rem] px-1 rounded bg-purple-500/10 text-purple-400">
          JSON
        </span>
        
        <span className="json-summary text-[0.6rem] text-slate-400 flex-1 truncate ml-1">
          {summary}
        </span>
        
        {showTypes && (
          <span className="json-type text-[0.55rem] text-slate-500">
            {getTypeName(jsonData)}
          </span>
        )}
      </button>
      
      {/* Content */}
      {!isCollapsed && (
        <div 
          className="json-content overflow-auto text-[0.65rem] font-mono"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <JsonValue 
            value={jsonData} 
            depth={0} 
            maxDepth={maxDepth}
          />
        </div>
      )}
    </div>
  );
}

// Recursive JSON value renderer
interface JsonValueProps {
  value: unknown;
  depth: number;
  maxDepth: number;
  keyName?: string;
}

function JsonValue({ value, depth, maxDepth }: JsonValueProps) {
  const [collapsed, setCollapsed] = useState(depth >= maxDepth);
  
  // Primitive values
  if (value === null) {
    return (
      <span className="json-null text-slate-500">null</span>
    );
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className="json-boolean text-amber-400">{value ? 'true' : 'false'}</span>
    );
  }
  
  if (typeof value === 'number') {
    return (
      <span className="json-number text-cyan-400 tabular-nums">{value}</span>
    );
  }
  
  if (typeof value === 'string') {
    // Check if it looks like a URL, path, or date
    if (value.match(/^https?:\/\//)) {
      return (
        <span className="json-string">
          "<a href={value} className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">{value}</a>"
        </span>
      );
    }
    if (value.match(/^(\/|~\/|[A-Za-z]:\\)/)) {
      return (
        <span className="json-string">
          "<span className="text-amber-400">{value}</span>"
        </span>
      );
    }
    
    // Truncate long strings
    const displayValue = value.length > 100 ? value.slice(0, 97) + '...' : value;
    return (
      <span className="json-string text-green-400">"{escapeString(displayValue)}"</span>
    );
  }
  
  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="json-array text-slate-400">[]</span>;
    }
    
    const itemCount = value.length;
    
    return (
      <span className="json-array">
        <button 
          className="collapse-btn inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className={`text-[0.5rem] transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
          <span className="text-[0.55rem]">{collapsed ? `[${itemCount}]` : '['}</span>
        </button>
        
        {collapsed ? null : (
          <>
            <ul className="ml-3 border-l border-slate-700/50 pl-2 my-0.5">
              {value.slice(0, 50).map((item, idx) => (
                <li key={idx} className="json-item py-px">
                  <span className="json-index text-slate-600 mr-1">{idx}:</span>
                  <JsonValue value={item} depth={depth + 1} maxDepth={maxDepth} />
                </li>
              ))}
              {itemCount > 50 && (
                <li className="text-[0.55rem] text-slate-500 py-px">
                  ... {itemCount - 50} more items
                </li>
              )}
            </ul>
            <span className="text-slate-400">]</span>
          </>
        )}
      </span>
    );
  }
  
  // Objects
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    
    if (entries.length === 0) {
      return <span className="json-object text-slate-400">{'{}'}</span>;
    }
    
    return (
      <span className="json-object">
        <button 
          className="collapse-btn inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className={`text-[0.5rem] transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
          <span className="text-[0.55rem]">{collapsed ? `{${entries.length}}` : '{'}</span>
        </button>
        
        {collapsed ? null : (
          <>
            <ul className="ml-3 border-l border-slate-700/50 pl-2 my-0.5">
              {entries.map(([k, v]) => (
                <li key={k} className="json-property py-px">
                  <span className="json-key text-purple-400">"{k}"</span>
                  <span className="text-slate-500">: </span>
                  <JsonValue value={v} depth={depth + 1} maxDepth={maxDepth} keyName={k} />
                </li>
              ))}
            </ul>
            <span className="text-slate-400">{'}'}</span>
          </>
        )}
      </span>
    );
  }
  
  // Fallback
  return <span className="text-slate-400">{String(value)}</span>;
}

// Compact inline JSON preview
interface JsonPreviewProps {
  data: unknown;
  maxLength?: number;
}

export function JsonPreview({ data, maxLength = 60 }: JsonPreviewProps) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const truncated = str.length > maxLength;
  const display = truncated ? str.slice(0, maxLength - 3) + '...' : str;
  
  return (
    <span className="json-preview text-[0.6rem] text-slate-400 font-mono">
      {display}
    </span>
  );
}

// JSON path viewer (shows path to a value)
interface JsonPathViewerProps {
  data: unknown;
  path: string;
}

export function JsonPathViewer({ data, path }: JsonPathViewerProps) {
  const value = getValueByPath(data, path);
  
  return (
    <div className="json-path-viewer my-1">
      <div className="path-header flex items-center gap-2 text-[0.6rem]">
        <span className="path text-cyan-400 font-mono">{path}</span>
        <span className="separator text-slate-500">=</span>
      </div>
      <div className="path-value ml-2 mt-0.5">
        <JsonValue value={value} depth={0} maxDepth={3} />
      </div>
    </div>
  );
}

// Helper functions
function safeParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function getJsonSummary(data: unknown): string {
  if (data === null) return 'null';
  if (typeof data !== 'object') return String(data).slice(0, 40);
  
  if (Array.isArray(data)) {
    return `Array(${data.length})`;
  }
  
  const keys = Object.keys(data as Record<string, unknown>);
  if (keys.length === 0) return 'empty object';
  if (keys.length <= 3) return `{ ${keys.join(', ')} }`;
  return `{ ${keys.slice(0, 3).join(', ')}, ... }`;
}

function getTypeName(data: unknown): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return `array[${data.length}]`;
  if (typeof data === 'object') return `object(${Object.keys(data).length})`;
  return typeof data;
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function getValueByPath(data: unknown, path: string): unknown {
  const parts = path.replace(/^\$?\.?/, '').split('.');
  let current = data;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    
    const key = part.replace(/\[(\d+)\]/g, '.$1').split('.')[0];
    const index = parseInt(key);
    
    if (!isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }
  
  return current;
}

export default JsonBlock;
