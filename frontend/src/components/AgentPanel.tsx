import { useState, useEffect, useCallback } from 'react';
import { Agent, ApiMessage } from '../types';
import { fetchAgents, fetchAllStreams, connectSSE, SSEConnectionState, getApiBaseUrl } from '../api';
import { AgentStream } from './AgentStream';
import { AgentConfigModal } from './AgentConfigModal';
import { refreshClaimedTask } from './ClaimedTask';
import { BillboardData } from './Billboard';

const API_BASE = getApiBaseUrl();

export function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [billboards, setBillboards] = useState<Map<string, BillboardData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    connected: false,
    reconnectAttempts: 0,
    lastConnected: null
  });
  
  // Config modal state
  const [configModalAgent, setConfigModalAgent] = useState<Agent | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const openConfigModal = useCallback((agent: Agent) => {
    setConfigModalAgent(agent);
    setIsConfigModalOpen(true);
  }, []);

  const closeConfigModal = useCallback(() => {
    setIsConfigModalOpen(false);
    setConfigModalAgent(null);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [agentsData, messagesData, billboardsRes] = await Promise.all([
        fetchAgents(), 
        fetchAllStreams(),
        fetch(`${API_BASE}/api/billboards`).then(r => r.json())
      ]);
      // Filter out test agents (created by sessions_spawn subagents)
      const realAgents = agentsData.filter((agent: Agent) => 
        !agent.id.startsWith('test-agent') && 
        !agent.name.startsWith('Test Agent')
      );
      setAgents(realAgents);
      setMessages(messagesData);
      
      // Build billboards map
      const billboardsMap = new Map<string, BillboardData>();
      billboardsRes.forEach((b: BillboardData) => {
        billboardsMap.set(b.agent_id, b);
      });
      setBillboards(billboardsMap);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    const disconnect = connectSSE({
      onMessage: (event) => {
        const { type, data } = event;
        
        switch (type) {
          case 'connected':
            // Initial connection - no action needed
            break;
            
          case 'message':
            // New stream message - add to messages list
            setMessages(prev => [data, ...prev].slice(0, 500));
            break;
            
          case 'agent_event':
            // Agent online/offline/update event
            // ONLY allow updates to existing persistent agents (from database)
            // Temp subagents should never be added via SSE
            const { agent, event: agentEvent } = data;
            
            switch (agentEvent) {
              case 'online':
                // Only add if it's a known persistent agent (main, hephaestus, athena)
                // SSE should not add new agents - only database via loadData() should
                setAgents(prev => {
                  const exists = prev.some(a => a.id === agent.id);
                  if (exists) {
                    // Update existing agent
                    return prev.map(a => a.id === agent.id ? agent : a);
                  }
                  // Don't add new agents via SSE - they must come from database
                  console.log('[SSE] Ignoring unknown agent:', agent.id);
                  return prev;
                });
                break;
                
              case 'offline':
                // Agent went offline - remove from list
                setAgents(prev => prev.filter(a => a.id !== agent.id));
                break;
                
              case 'update':
                // Agent status update - only update if exists
                setAgents(prev => {
                  const exists = prev.some(a => a.id === agent.id);
                  if (!exists) {
                    console.log('[SSE] Ignoring update for unknown agent:', agent.id);
                    return prev;
                  }
                  return prev.map(a => a.id === agent.id ? agent : a);
                });
                break;
            }
            break;
            
          case 'task_event':
            // Task claimed/completed/updated - refresh claimed task for affected agent
            const { task } = data;
            if (task?.agent_id) {
              // Refresh the claimed task component for this agent
              refreshClaimedTask(task.agent_id);
            }
            break;
            
          case 'billboard_event':
            // Billboard updated/cleared
            const { billboard } = data;
            if (billboard?.agent_id) {
              setBillboards(prev => {
                const newMap = new Map(prev);
                newMap.set(billboard.agent_id, billboard);
                return newMap;
              });
            }
            break;
            
          default:
            // Unknown event type - ignore
            console.log('Unknown SSE event type:', type);
        }
      },
      onStateChange: (state) => {
        setConnectionState(state);
      },
      maxReconnectAttempts: 20,
      baseReconnectDelay: 500,
      maxReconnectDelay: 10000
    });
    
    return () => disconnect();
  }, [loadData]);

  const agentMessages = agents.map(agent => ({
    agent,
    messages: messages.filter(m => m.agent_id === agent.id),
    billboard: billboards.get(agent.id),
  }));

  const getConnectionIndicator = () => {
    if (connectionState.connected) {
      return (
        <span className="text-green-400 text-xs flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          LIVE
        </span>
      );
    } else if (connectionState.reconnectAttempts > 0) {
      return (
        <span className="text-yellow-400 text-xs flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
          RECONNECTING ({connectionState.reconnectAttempts})
        </span>
      );
    } else {
      return (
        <span className="text-red-400 text-xs flex items-center gap-1">
          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
          DISCONNECTED
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-green-400 text-sm">
          <span className="text-green-500">&gt;</span> loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-2">
        <div className="text-red-400 text-sm"><span className="text-red-500">[ERROR]</span> {error}</div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400 text-sm">
          <span className="text-green-500">&gt;</span> No agents online. Waiting for connections...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 py-1 bg-gradient-to-b from-slate-900/80 to-black border-b border-cyan-900/30 flex items-center gap-2">
        <span className="text-cyan-400 text-xs font-semibold">AGENT STREAMS</span>
        <span className="text-slate-500 text-xs">[{agents.filter(a => a.status === 'active').length}/{agents.length}]</span>
        <span className="ml-auto">{getConnectionIndicator()}</span>
      </div>
      <div className="flex-1 p-1 overflow-x-auto">
        <div className="flex gap-1 h-full justify-end">
          {agentMessages.map(({ agent, messages, billboard }) => (
            <div key={agent.id} className="w-[300px] flex-shrink-0 h-full">
              <AgentStream 
                agent={agent} 
                messages={messages}
                billboard={billboard}
                onOpenConfig={openConfigModal}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Config Modal */}
      {configModalAgent && (
        <AgentConfigModal
          agentId={configModalAgent.id}
          agentName={configModalAgent.name}
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
        />
      )}
    </div>
  );
}
