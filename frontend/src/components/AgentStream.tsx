import { useRef, useMemo } from 'react';
import { Agent, ApiMessage } from '../types';
import { ClaimedTask } from './ClaimedTask';
import { AgentBillboard, BillboardData } from './Billboard';
import { TableBlock } from './TableBlock';
import { BulletList, NumberedList } from './ListBlock';
import { useConfig } from '../config';

interface AgentStreamProps {
  agent: Agent;
  messages: ApiMessage[];
  billboard?: BillboardData | null;
  onOpenConfig?: (agent: Agent) => void;
}

// CSS class fallback for agent colors (used when config not available)
const getAgentColorClass = (agentName: string): string => {
  const name = agentName.toLowerCase();
  if (name.includes("claw")) return "agent-mr-claw";
  if (name.includes("hephaestus")) return "agent-hephaestus";
  if (name.includes("athena")) return "agent-athena";
  return "agent-test";
};

const getAgentTextClass = (agentName: string): string => {
  const name = agentName.toLowerCase();
  if (name.includes("claw")) return "text-agent-mr-claw";
  if (name.includes("hephaestus")) return "text-agent-hephaestus";
  if (name.includes("athena")) return "text-agent-athena";
  return "text-agent-test";
};

// Markdown parsing types
type MarkdownToken = 
  | { type: 'text'; content: string }
  | { type: 'h1'; content: string }
  | { type: 'h2'; content: string }
  | { type: 'h3'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold-italic'; content: string }
  | { type: 'code-inline'; content: string }
  | { type: 'code-block'; content: string; language?: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'blockquote'; content: string }
  | { type: 'hr' }
  | { type: 'link'; text: string; url: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'tool'; toolName: string }
  | { type: 'dispatch-written'; path: string }
  | { type: 'dispatch-read'; path: string }
  | { type: 'filepath'; path: string; filename: string }
  | { type: 'url'; url: string; domain: string }
  | { type: 'keyvalue'; key: string; value: string };

// Extract filename from path
const extractFilename = (path: string): string => {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
};

// Extract domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

// Parse inline markdown (bold, italic, code, links, paths, urls, keyvalues)
const parseInlineMarkdown = (text: string): MarkdownToken[] => {
  const tokens: MarkdownToken[] = [];
  
  // Combined pattern for inline elements - order matters!
  const inlinePattern = /(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s<>"]+)|(~\/[^\s:*?"<>|]+)|(\/home\/[^\s:*?"<>|]+)|([A-Za-z]:\\[^\s:*?"<>|]+)|(\.\/[^\s:*?"<>|]+)|(\.\.\/[^\s:*?"<>|]+)|(\b[a-z_][a-z0-9_]*\s*:\s*[^\s,;]+(?=[\s,;]|$))/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) tokens.push({ type: 'text', content: beforeText });
    }
    
    const matched = match[0];
    
    if (matched.startsWith('***') && matched.endsWith('***')) {
      tokens.push({ type: 'bold-italic', content: matched.slice(3, -3) });
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      tokens.push({ type: 'bold', content: matched.slice(2, -2) });
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      tokens.push({ type: 'italic', content: matched.slice(1, -1) });
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      tokens.push({ type: 'code-inline', content: matched.slice(1, -1) });
    } else if (matched.startsWith('[') && matched.includes('](')) {
      const linkMatch = matched.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
      }
    } else if (matched.startsWith('http://') || matched.startsWith('https://')) {
      tokens.push({ type: 'url', url: matched, domain: extractDomain(matched) });
    } else if (matched.startsWith('~/') || matched.startsWith('/home/') || 
               matched.match(/^[A-Za-z]:\\/) || matched.startsWith('./') || matched.startsWith('../')) {
      tokens.push({ type: 'filepath', path: matched, filename: extractFilename(matched) });
    } else if (matched.includes(':') && !matched.startsWith('http')) {
      const colonIdx = matched.indexOf(':');
      const key = matched.slice(0, colonIdx).trim();
      const value = matched.slice(colonIdx + 1).trim();
      if (key && value) {
        tokens.push({ type: 'keyvalue', key, value });
      } else {
        tokens.push({ type: 'text', content: matched });
      }
    } else {
      tokens.push({ type: 'text', content: matched });
    }
    
    lastIndex = match.index + matched.length;
  }
  
  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex);
    if (rest) tokens.push({ type: 'text', content: rest });
  }
  
  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
};

// Check for dispatch patterns
const detectDispatchPatterns = (content: string): { isDispatchWritten: boolean; isDispatchRead: boolean; path: string } => {
  const writtenPattern = /dispatch\s+written\s+to\s+(docs\/[^\s]+)/i;
  const readPattern = /read(?:ing)?\s+dispatch\s+(?:from\s+)?(docs\/[^\s]+)/i;
  const fileRefPattern = /(docs\/from\w+\/[^\s]+\.md)/i;
  
  const writtenMatch = content.match(writtenPattern);
  const readMatch = content.match(readPattern);
  const fileMatch = content.match(fileRefPattern);
  
  return {
    isDispatchWritten: !!writtenMatch || (content.toLowerCase().includes('dispatch') && content.toLowerCase().includes('written')),
    isDispatchRead: !!readMatch || (content.toLowerCase().includes('reading dispatch')),
    path: writtenMatch?.[1] || readMatch?.[1] || fileMatch?.[1] || ''
  };
};

// Main markdown parser
const parseMarkdown = (content: string): MarkdownToken[] => {
  const tokens: MarkdownToken[] = [];
  const lines = content.split('\n');
  let i = 0;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  
  const flushLists = () => {
    if (bulletItems.length > 0) {
      tokens.push({ type: 'bullet-list', items: [...bulletItems] });
      bulletItems = [];
    }
    if (numberedItems.length > 0) {
      tokens.push({ type: 'numbered-list', items: [...numberedItems] });
      numberedItems = [];
    }
  };
  
  const flushTable = () => {
    if (inTable && tableHeaders.length > 0) {
      tokens.push({ type: 'table', headers: tableHeaders, rows: tableRows });
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };
  
  while (i < lines.length) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      flushLists();
      flushTable();
      
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = '';
      } else {
        inCodeBlock = false;
        tokens.push({ type: 'code-block', content: codeBlockContent.trim(), language: codeBlockLang || undefined });
        codeBlockLang = '';
      }
      i++;
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      i++;
      continue;
    }
    
    const tableRowMatch = line.match(/^\|(.+)\|$/);
    const tableSeparatorMatch = line.match(/^\|[-:\s|]+\|$/);
    
    if (tableRowMatch && !tableSeparatorMatch) {
      flushLists();
      const cells = tableRowMatch[1].split('|').map(c => c.trim());
      if (!inTable) {
        tableHeaders = cells;
        inTable = true;
      } else {
        tableRows.push(cells);
      }
      i++;
      continue;
    }
    
    if (tableSeparatorMatch) {
      i++;
      continue;
    }
    
    flushTable();
    
    if (line.startsWith('### ')) {
      flushLists();
      tokens.push({ type: 'h3', content: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      flushLists();
      tokens.push({ type: 'h2', content: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      flushLists();
      tokens.push({ type: 'h1', content: line.slice(2) });
      i++;
      continue;
    }
    
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushLists();
      tokens.push({ type: 'hr' });
      i++;
      continue;
    }
    
    if (line.startsWith('> ')) {
      flushLists();
      tokens.push({ type: 'blockquote', content: line.slice(2) });
      i++;
      continue;
    }
    
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (numberedItems.length > 0) flushLists();
      bulletItems.push(bulletMatch[1]);
      i++;
      continue;
    }
    
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      if (bulletItems.length > 0) flushLists();
      numberedItems.push(numberedMatch[1]);
      i++;
      continue;
    }
    
    flushLists();
    
    const dispatchInfo = detectDispatchPatterns(line);
    if (dispatchInfo.isDispatchWritten) {
      tokens.push({ type: 'dispatch-written', path: dispatchInfo.path });
    }
    if (dispatchInfo.isDispatchRead) {
      tokens.push({ type: 'dispatch-read', path: dispatchInfo.path });
    }
    
    if (line.trim()) {
      const inlineTokens = parseInlineMarkdown(line);
      tokens.push(...inlineTokens);
    }
    
    i++;
  }
  
  flushLists();
  flushTable();
  
  if (inCodeBlock) {
    tokens.push({ type: 'code-block', content: codeBlockContent.trim(), language: codeBlockLang || undefined });
  }
  
  return tokens;
};

// Tool pattern parser
const parseMessageContent = (content: string): { type: string; text: string; toolName?: string }[] => {
  const toolPattern = /\[tool:\s*(\w+)\]/g;
  const parts: { type: string; text: string; toolName?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = toolPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index).trim();
      if (textPart) parts.push({ type: "text", text: textPart });
    }
    parts.push({ type: "tool", text: match[0], toolName: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", text: remaining });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: content }];
};

export function AgentStream({ agent, messages, billboard, onOpenConfig }: AgentStreamProps) {
  const { config } = useConfig();
  const agentColorClass = getAgentColorClass(agent.name);
  const agentTextClass = getAgentTextClass(agent.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get agent color from config or fall back to CSS class
  const agentColor = useMemo(() => {
    const agentId = agent.id.toLowerCase();
    return config.agents.colors[agentId] || null;
  }, [config, agent.id]);
  
  // CSS custom properties for agent color (if configured)
  const agentStyle = agentColor ? {
    '--agent-color': agentColor,
    '--agent-color-faded': `${agentColor}20`,
    '--agent-color-rgb': parseInt(agentColor.slice(1,3), 16) + ',' + 
                         parseInt(agentColor.slice(3,5), 16) + ',' + 
                         parseInt(agentColor.slice(5,7), 16)
  } as React.CSSProperties : undefined;

  const sendMessage = async () => {
    const message = inputRef.current?.value?.trim();
    if (message) {
      try {
        await fetch(`${config.apiBase}/api/agents/${agent.id}/inject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (inputRef.current) inputRef.current.value = '';
      } catch (err) {
        console.error('Failed to inject message:', err);
      }
    }
  };

  const parseDate = (dateStr: string) => {
    // Database stores timestamps in UTC format (no timezone)
    // Append 'Z' to treat as UTC, then display in local timezone
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(" ", "T") + 'Z';
    return new Date(utcStr);
  };

  const formatTime = (dateStr: string) => {
    const date = parseDate(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  // Detect message type based on content patterns
  const getMessageType = (msg: ApiMessage): 'user' | 'system' | 'assistant' | 'error' | 'success' => {
    if (msg.role === 'user') return 'user';
    if (msg.role === 'system') return 'system';
    
    const content = msg.content.toLowerCase();
    
    // Error patterns
    const errorPatterns = [
      /\berror\b/, /\bfailed\b/, /\bfailure\b/, /\bexception\b/,
      /❌/, /⚠️.*error/, /\bunable to\b/, /\bcould not\b/,
      /status.*404/, /status.*500/, /status.*400/
    ];
    
    // Success patterns  
    const successPatterns = [
      /\bsuccess\b/, /\bsuccessful\b/, /\bcomplete\b/, /\bcompleted\b/,
      /✅/, /🎉/, /\bdone\b/, /\bfixed\b/, /\bresolved\b/,
      /\bcreated\b/, /\bsaved\b/, /\bupdated\b/
    ];
    
    // Check for error (higher priority - errors should be visible)
    if (errorPatterns.some(p => p.test(content))) {
      return 'error';
    }
    
    // Check for success
    if (successPatterns.some(p => p.test(content))) {
      return 'success';
    }
    
    return 'assistant';
  };

  const getRelativeTime = (dateStr: string) => {
    const date = parseDate(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    if (diffSec < 0) return "now";
    if (diffSec < 60) return diffSec + "s";
    if (diffMin < 60) return diffMin + "m";
    if (diffHour < 24) return diffHour + "h";
    return date.toLocaleDateString();
  };

  const lastMessage = messages.length > 0 ? messages[0] : null;
  const lastActivity = lastMessage ? getRelativeTime(lastMessage.created_at) : "-";
  const isActive = agent.status === "active";
  const statusColor = isActive ? "bg-green-500" : agent.status === "idle" ? "bg-yellow-500" : "bg-slate-500";
  const shortSessionId = agent.id.length > 6 ? agent.id.slice(0, 6) : agent.id;

  const truncatePath = (path: string, maxLen: number = 40): string => {
    if (path.length <= maxLen) return path;
    const filename = extractFilename(path);
    const dir = path.slice(0, path.length - filename.length);
    const shortenedDir = dir.length > 15 ? dir.slice(0, 12) + '...' : dir;
    return shortenedDir + filename;
  };

  const renderMarkdownTokens = (tokens: MarkdownToken[]): React.ReactNode => {
    return tokens.map((token, idx) => {
      switch (token.type) {
        case 'h1':
          return <h1 key={idx} className="md-h1">{token.content}</h1>;
        case 'h2':
          return <h2 key={idx} className="md-h2">{token.content}</h2>;
        case 'h3':
          return <h3 key={idx} className="md-h3">{token.content}</h3>;
        case 'bold':
          return <strong key={idx} className="md-bold">{token.content}</strong>;
        case 'italic':
          return <em key={idx} className="md-italic">{token.content}</em>;
        case 'bold-italic':
          return <strong key={idx} className="md-bold"><em>{token.content}</em></strong>;
        case 'code-inline':
          return <code key={idx} className="md-code-inline">{token.content}</code>;
        case 'code-block':
          return (
            <pre key={idx} className="md-code-block">
              {token.language && <div className="md-code-lang">{token.language}</div>}
              <code>{token.content}</code>
            </pre>
          );
        case 'bullet-list':
          return (
            <BulletList key={idx} items={token.items} />
          );
        case 'numbered-list':
          return (
            <NumberedList key={idx} items={token.items} />
          );
        case 'blockquote':
          return <blockquote key={idx} className="md-blockquote">{token.content}</blockquote>;
        case 'hr':
          return <hr key={idx} className="md-hr" />;
        case 'link':
          return (
            <a key={idx} href={token.url} className="md-link" target="_blank" rel="noopener noreferrer">
              {token.text}
            </a>
          );
        case 'url':
          return (
            <a key={idx} href={token.url} className="widget-url" target="_blank" rel="noopener noreferrer" title={token.url}>
              <span className="url-icon">⬈</span>
              <span className="url-domain">{token.domain}</span>
            </a>
          );
        case 'filepath':
          return (
            <span key={idx} className="widget-filepath" title={token.path}>
              <span className="path-icon">📁</span>
              <span className="path-text">{truncatePath(token.path)}</span>
            </span>
          );
        case 'keyvalue':
          return (
            <span key={idx} className="widget-keyvalue">
              <span className="kv-key">{token.key}</span>
              <span className="kv-colon">:</span>
              <span className="kv-value">{token.value}</span>
            </span>
          );
        case 'table':
          return (
            <TableBlock key={idx} headers={token.headers} rows={token.rows} />
          );
        case 'dispatch-written':
          return (
            <span key={idx} className="dispatch-badge dispatch-written">
              <span className="dispatch-icon">📝</span>
              <span className="dispatch-label">DISPATCH</span>
              {token.path && <span className="dispatch-path">{token.path}</span>}
            </span>
          );
        case 'dispatch-read':
          return (
            <span key={idx} className="dispatch-badge dispatch-read">
              <span className="dispatch-icon">✓</span>
              <span className="dispatch-label">READ</span>
            </span>
          );
        case 'tool':
          return <span key={idx} className="tool-badge">{(token as any).toolName}</span>;
        case 'text':
        default:
          if (token.content.includes('\n')) {
            return token.content.split('\n').map((line, lineIdx) => (
              <span key={`${idx}-${lineIdx}`}>
                {lineIdx > 0 && <br />}
                {line}
              </span>
            ));
          }
          return <span key={idx}>{token.content}</span>;
      }
    });
  };

  const renderContent = (content: string) => {
    const parts = parseMessageContent(content);
    const hasTools = parts.some(p => p.type === 'tool');
    
    if (hasTools) {
      return parts.map((part, idx) => {
        if (part.type === "tool") {
          return <span key={idx} className="tool-badge">{part.toolName}</span>;
        }
        const tokens = parseMarkdown(part.text);
        return <span key={idx}>{renderMarkdownTokens(tokens)}</span>;
      });
    }
    
    const tokens = parseMarkdown(content);
    return renderMarkdownTokens(tokens);
  };

  return (
    <div 
      className={"terminal-window stream-container " + agentColorClass + " h-full flex flex-col bg-slate-950 rounded-sm " + (isActive ? "active" : "")}
      style={agentStyle}
    >
      {/* Row 1: Billboard */}
      <AgentBillboard agentId={agent.id} billboard={billboard ?? null} />
      
      {/* Row 2: Current Task */}
      <ClaimedTask agentId={agent.id} showIdleState={true} />
      
      {/* Row 3: Identity (name, status, session) */}
      <div className="stream-header px-2 py-1 bg-gradient-to-b from-slate-900/80 to-black border-b flex items-center gap-1.5 flex-shrink-0 border-slate-800/50">
        <div className={"w-1.5 h-1.5 rounded-full " + statusColor + (isActive ? " status-dot-active" : "")} />
        <span className={agentTextClass + " text-xs font-medium truncate"}>{agent.name}</span>
        <span className="text-[10px] text-slate-500">({shortSessionId})</span>
        <span className="text-[10px] text-slate-600 uppercase tracking-wide">{agent.status}</span>
        <span className="timestamp text-[10px] ml-auto flex-shrink-0">{lastActivity}</span>
        {onOpenConfig && (
          <button
            onClick={() => onOpenConfig(agent)}
            className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5 ml-1"
            title="Open agent config"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Row 4: Model */}
      {agent.model && (
        <div className="px-2 py-0.5 bg-slate-900/50 border-b border-slate-800/30">
          <span className="text-[9px] text-slate-500 font-mono">
            {(agent.model || '').split('/').pop()?.toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="message-card text-xs text-slate-600">
            <span className="text-green-500">&gt;</span> waiting...
          </div>
        ) : (
          <>
            {messages.slice(0, 50).map((msg) => {
              const msgType = getMessageType(msg);
              const messageClass = `message-${msgType}`;
              const roleTextClass = msgType === 'user' ? "text-amber-400" : 
                                    msgType === 'system' ? "text-slate-500" :
                                    msgType === 'error' ? "text-red-400" :
                                    msgType === 'success' ? "text-green-400" :
                                    agentTextClass;
              const roleLabel = msgType === 'user' ? "YOU" :
                               msgType === 'system' ? "SYS" :
                               msgType === 'error' ? "ERR" :
                               msgType === 'success' ? "OK" :
                               agent.name;
              
              return (
                <div key={msg.id} className={"message-card text-xs break-words " + messageClass}>
                  <span className="timestamp">[{formatTime(msg.created_at)}]</span>{" "}
                  <span className={"role-label " + roleTextClass}>
                    <span className="message-type-icon"></span>
                    {msgType === 'user' ? ">" : ""}{roleLabel}
                  </span>
                  <span className="colon-sep">:</span>{" "}
                  <span className="message-content">{renderContent(msg.content)}</span>
                </div>
              );
            })}
            <div className="message-card text-xs">
              <span className="text-green-500">&gt;</span>
              <span className="cursor-blink text-green-500">_</span>
            </div>
          </>
        )}
      </div>
      
      {/* Message Input */}
      <div className="border-t border-slate-800/50 p-1.5 bg-slate-950/50">
        <form 
          className="flex gap-1" 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Send message..."
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-[10px] text-slate-300 placeholder-slate-600 focus:border-cyan-600/50 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-cyan-900/40 text-cyan-400 text-[10px] rounded hover:bg-cyan-800/50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}