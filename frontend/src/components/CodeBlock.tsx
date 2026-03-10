/**
 * CodeBlock - Enhanced code block with syntax highlighting and features
 * 
 * Displays code with language badge, line numbers (optional), and
 * copy-to-clipboard functionality.
 */

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  collapsed?: boolean;
  maxLines?: number;
  showCopy?: boolean;
}

export function CodeBlock({ 
  code, 
  language, 
  filename,
  showLineNumbers = false,
  highlightLines = [],
  collapsed: defaultCollapsed = false,
  maxLines,
  showCopy = true
}: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);
  
  const lines = code.split('\n');
  const totalLines = lines.length;
  const shouldTruncate = maxLines && totalLines > maxLines;
  const displayLines = shouldTruncate && isCollapsed ? lines.slice(0, maxLines) : lines;
  const hiddenCount = shouldTruncate ? totalLines - maxLines : 0;
  
  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Get language color
  const getLanguageColor = (lang?: string): string => {
    const colors: Record<string, string> = {
      typescript: 'text-blue-400 bg-blue-500/10',
      javascript: 'text-yellow-400 bg-yellow-500/10',
      python: 'text-green-400 bg-green-500/10',
      rust: 'text-orange-400 bg-orange-500/10',
      go: 'text-cyan-400 bg-cyan-500/10',
      json: 'text-purple-400 bg-purple-500/10',
      bash: 'text-green-400 bg-green-500/10',
      shell: 'text-green-400 bg-green-500/10',
      html: 'text-red-400 bg-red-500/10',
      css: 'text-blue-400 bg-blue-500/10',
      sql: 'text-amber-400 bg-amber-500/10',
      markdown: 'text-slate-400 bg-slate-500/10',
    };
    return colors[lang?.toLowerCase() || ''] || 'text-slate-400 bg-slate-500/10';
  };
  
  return (
    <div className="code-block my-1.5 border border-slate-800/50 rounded overflow-hidden bg-slate-950/50">
      {/* Header */}
      <div className="code-header flex items-center gap-2 px-2 py-1 bg-slate-900/50 border-b border-slate-800/50">
        {/* Language badge */}
        {language && (
          <span className={`language-badge px-1.5 py-0.5 rounded text-[0.55rem] font-semibold uppercase tracking-wider ${getLanguageColor(language)}`}>
            {language}
          </span>
        )}
        
        {/* Filename */}
        {filename && (
          <span className="filename text-[0.6rem] text-slate-400 truncate">
            {filename}
          </span>
        )}
        
        {/* Line count */}
        <span className="line-count text-[0.55rem] text-slate-500 tabular-nums ml-auto">
          {totalLines} lines
        </span>
        
        {/* Copy button */}
        {showCopy && (
          <button 
            className="copy-btn text-[0.55rem] text-slate-500 hover:text-slate-300 transition-colors px-1"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? '✓ copied' : '📋 copy'}
          </button>
        )}
        
        {/* Collapse/expand for long code */}
        {shouldTruncate && (
          <button 
            className="collapse-btn text-[0.55rem] text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? `+${hiddenCount} more` : 'show less'}
          </button>
        )}
      </div>
      
      {/* Code content */}
      <div className="code-content overflow-x-auto">
        <pre className="px-2 py-1.5 text-[0.65rem] font-mono leading-relaxed">
          <code>
            {displayLines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = highlightLines.includes(lineNum);
              
              return (
                <div 
                  key={idx} 
                  className={`code-line flex ${isHighlighted ? 'bg-cyan-500/10 -mx-2 px-2' : ''}`}
                >
                  {showLineNumbers && (
                    <span className="line-number text-slate-600 text-right mr-3 select-none w-6 flex-shrink-0 tabular-nums">
                      {lineNum}
                    </span>
                  )}
                  <span className="line-content text-slate-300 whitespace-pre">
                    {line || ' '}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Inline code variant (single line, inline)
interface InlineCodeBlockProps {
  code: string;
  language?: string;
}

export function InlineCodeBlock({ code, language }: InlineCodeBlockProps) {
  return (
    <code className="inline-code-block px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/30 text-[0.65rem] text-slate-200 font-mono">
      {language && <span className="text-cyan-400/70 mr-1">{language}:</span>}
      {code}
    </code>
  );
}

// Diff block (for showing code changes)
interface DiffBlockProps {
  additions: string[];
  deletions: string[];
  context?: string[];
  filename?: string;
}

export function DiffBlock({ additions, deletions, context = [], filename }: DiffBlockProps) {
  const allLines: { type: 'add' | 'del' | 'ctx'; content: string }[] = [
    ...context.map(c => ({ type: 'ctx' as const, content: c })),
    ...deletions.map(d => ({ type: 'del' as const, content: d })),
    ...additions.map(a => ({ type: 'add' as const, content: a })),
  ];
  
  return (
    <div className="diff-block my-1.5 border border-slate-800/50 rounded overflow-hidden">
      {filename && (
        <div className="diff-header px-2 py-1 bg-slate-900/50 border-b border-slate-800/50 text-[0.6rem] text-slate-400">
          {filename}
        </div>
      )}
      
      <div className="diff-content font-mono text-[0.65rem]">
        {allLines.map((line, idx) => (
          <div 
            key={idx} 
            className={`diff-line flex ${
              line.type === 'add' ? 'bg-green-500/10' :
              line.type === 'del' ? 'bg-red-500/10' : ''
            }`}
          >
            <span className={`diff-marker w-4 text-center flex-shrink-0 ${
              line.type === 'add' ? 'text-green-400 bg-green-500/20' :
              line.type === 'del' ? 'text-red-400 bg-red-500/20' :
              'text-slate-600 bg-slate-800/50'
            }`}>
              {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
            </span>
            <span className={`diff-content px-2 whitespace-pre ${
              line.type === 'add' ? 'text-green-300' :
              line.type === 'del' ? 'text-red-300' :
              'text-slate-400'
            }`}>
              {line.content || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Command block (for shell commands)
interface CommandBlockProps {
  command: string;
  output?: string;
  exitCode?: number;
  showPrompt?: boolean;
}

export function CommandBlock({ command, output, exitCode, showPrompt = true }: CommandBlockProps) {
  const [showOutput, setShowOutput] = useState(true);
  
  return (
    <div className="command-block my-1.5 border border-slate-800/50 rounded overflow-hidden bg-slate-950/70">
      {/* Command */}
      <div className="command-input flex items-center gap-2 px-2 py-1 bg-slate-900/50">
        {showPrompt && <span className="prompt text-green-400">$</span>}
        <code className="command-text flex-1 text-[0.65rem] text-slate-200 font-mono">
          {command}
        </code>
        <button 
          className="copy-btn text-[0.55rem] text-slate-500 hover:text-slate-300"
          onClick={() => navigator.clipboard.writeText(command)}
        >
          📋
        </button>
      </div>
      
      {/* Output (if provided) */}
      {output && (
        <div className="command-output">
          <button 
            className="output-toggle w-full px-2 py-0.5 text-left text-[0.55rem] text-slate-500 hover:text-slate-400 border-t border-slate-800/30"
            onClick={() => setShowOutput(!showOutput)}
          >
            {showOutput ? '▼ hide output' : '▶ show output'}
          </button>
          
          {showOutput && (
            <pre className="output-content px-2 py-1 text-[0.6rem] text-slate-400 font-mono whitespace-pre-wrap border-t border-slate-800/30">
              {output}
            </pre>
          )}
        </div>
      )}
      
      {/* Exit code indicator */}
      {exitCode !== undefined && (
        <div className={`exit-code px-2 py-0.5 text-[0.55rem] border-t border-slate-800/30 ${
          exitCode === 0 ? 'text-green-400 bg-green-500/5' : 'text-red-400 bg-red-500/5'
        }`}>
          Exit code: {exitCode}
        </div>
      )}
    </div>
  );
}

export default CodeBlock;
