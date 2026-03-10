import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../api';

export interface BillboardData {
  agent_id: string;
  message: string | null;
  message_type: 'info' | 'warning' | 'success' | 'error' | 'progress';
  progress: number | null;
  updated_at: string;
  agent_name: string;
}

interface AgentBillboardProps {
  agentId: string;
  billboard: BillboardData | null;
}

// Get styles based on message type
const getTypeStyles = (type: string) => {
  switch (type) {
    case 'warning':
      return {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/50',
        text: 'text-amber-200',
        icon: '⚠️'
      };
    case 'success':
      return {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        text: 'text-green-200',
        icon: '✅'
      };
    case 'error':
      return {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-200',
        icon: '❌'
      };
    case 'progress':
      return {
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/50',
        text: 'text-cyan-200',
        icon: '📊'
      };
    case 'info':
    default:
      return {
        bg: 'bg-slate-500/20',
        border: 'border-slate-400/50',
        text: 'text-slate-200',
        icon: '📢'
      };
  }
};

// Get agent color for progress bar
const getAgentAccentColor = (agentId: string) => {
  if (agentId === 'hephaestus') return 'bg-amber-500';
  if (agentId === 'athena') return 'bg-purple-500';
  return 'bg-cyan-500';
};

export function AgentBillboard({ agentId, billboard }: AgentBillboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Animate in when billboard appears
  useEffect(() => {
    if (billboard?.message) {
      setIsDismissed(false);
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [billboard?.message, billboard?.updated_at]);

  // Auto-dismiss success messages after 10 seconds
  useEffect(() => {
    if (billboard?.message_type === 'success' && billboard.message) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setIsDismissed(true), 300);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [billboard?.message, billboard?.message_type]);

  if (!billboard || !billboard.message || isDismissed) {
    return null; // Don't render if no message or dismissed
  }

  const styles = getTypeStyles(billboard.message_type);
  const accentColor = getAgentAccentColor(agentId);

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300);
  };

  return (
    <div className={`billboard ${styles.bg} ${styles.border} border-b px-3 py-2.5 flex-shrink-0 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg flex-shrink-0 mt-0.5">{styles.icon}</span>
        <div className="flex-1 min-w-0">
          {/* Message - supports multiline */}
          <p className={`${styles.text} text-sm font-semibold leading-snug whitespace-pre-wrap break-words`}>
            {billboard.message}
          </p>
          
          {/* Progress bar for progress type */}
          {billboard.message_type === 'progress' && billboard.progress !== null && (
            <div className="mt-2 space-y-1">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${accentColor} transition-all duration-500 ease-out`}
                  style={{ width: `${billboard.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Progress</span>
                <span>{billboard.progress}%</span>
              </div>
            </div>
          )}
          
          {/* Timestamp */}
          {billboard.updated_at && (
            <div className="mt-1.5 text-[9px] text-slate-500 flex items-center gap-1">
              <span>🕐</span>
              <span>{getRelativeTime(billboard.updated_at)}</span>
            </div>
          )}
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 flex-shrink-0"
          title="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Hook for fetching billboard data
export function useBillboard(agentId: string) {
  const [billboard, setBillboard] = useState<BillboardData | null>(null);

  useEffect(() => {
    const apiBase = getApiBaseUrl();
    // Initial fetch
    fetch(`${apiBase}/api/billboards/${agentId}`)
      .then(res => res.json())
      .then(data => setBillboard(data))
      .catch(err => console.error('[Billboard] Failed to fetch:', err));
  }, [agentId]);

  return billboard;
}

// Global billboard state for SSE updates
const billboardListeners = new Map<string, Set<(billboard: BillboardData) => void>>();

export function registerBillboardListener(agentId: string, callback: (billboard: BillboardData) => void) {
  if (!billboardListeners.has(agentId)) {
    billboardListeners.set(agentId, new Set());
  }
  billboardListeners.get(agentId)!.add(callback);
  
  return () => {
    billboardListeners.get(agentId)?.delete(callback);
  };
}

export function updateBillboardFromSSE(billboard: BillboardData) {
  const listeners = billboardListeners.get(billboard.agent_id);
  if (listeners) {
    listeners.forEach(cb => cb(billboard));
  }
}
