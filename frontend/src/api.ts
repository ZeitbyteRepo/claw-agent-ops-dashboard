import { Plan, Dispatch, Task, AgentConfig, AgentConfigFile } from './types';

/**
 * @deprecated Use useApiClient() from apiClient.tsx instead
 * 
 * This module provides legacy API functions that use hardcoded API_BASE detection.
 * New code should use the ApiClientProvider and useApiClient() hook which respects
 * the dashboard.config.json apiBase setting.
 */

// Determine API base URL at module load time
// In development (localhost:5173), use http://localhost:3001
// In production (same origin), use relative URLs (empty string)
// NOTE: This is hardcoded logic - for custom apiBase, use useApiClient() instead
const API_BASE = (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.hostname === 'localhost'))
  ? 'http://localhost:3001'
  : '';

// Export for components that need to check the base URL
export const getApiBaseUrl = () => API_BASE;

/**
 * Create an API client with a custom base URL
 * Use this for instances where you need a specific apiBase instead of the hardcoded detection
 */
export function createApiClient(apiBase: string) {
  return {
    async fetchTasks(status?: string) {
      const url = status 
        ? `${apiBase}/api/tasks?status=${status}`
        : `${apiBase}/api/tasks`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },

    async fetchArchivedTasks(status: string): Promise<Task[]> {
      const res = await fetch(`${apiBase}/api/tasks?status=${status}&archived=true`);
      if (!res.ok) throw new Error('Failed to fetch archived tasks');
      return res.json();
    },

    async updateTask(id: number, updates: Partial<{ title: string; status: string; agent_id: string | null; notes: string; archived_at: string | null }>) {
      const res = await fetch(`${apiBase}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },

    async createTask(task: { title: string; status?: string; notes?: string | null; code?: string | null; agent_id?: string | null; plan_id?: number | null; dispatch_id?: number | null }) {
      const res = await fetch(`${apiBase}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },

    async archiveTask(id: number): Promise<Task> {
      const res = await fetch(`${apiBase}/api/tasks/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive task');
      return res.json();
    },

    async archiveDoneTasks(): Promise<void> {
      const res = await fetch(`${apiBase}/api/tasks/archive-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive done tasks');
    },

    async archiveIdeas(): Promise<void> {
      const res = await fetch(`${apiBase}/api/tasks/archive-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive ideas');
    },

    async restoreTask(id: number): Promise<Task> {
      const res = await fetch(`${apiBase}/api/tasks/${id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to restore task');
      return res.json();
    },

    // Plans
    async fetchPlans(): Promise<Plan[]> {
      const res = await fetch(`${apiBase}/api/plans`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },

    async fetchPlan(id: number): Promise<Plan> {
      const res = await fetch(`${apiBase}/api/plans/${id}`);
      if (!res.ok) throw new Error('Failed to fetch plan');
      return res.json();
    },

    async createPlan(plan: Partial<Plan>) {
      const res = await fetch(`${apiBase}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },

    async updatePlan(id: number, updates: Partial<Plan>) {
      const res = await fetch(`${apiBase}/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      return res.json();
    },

    async archivePlan(id: number) {
      const res = await fetch(`${apiBase}/api/plans/${id}/archive`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to archive plan');
      return res.json();
    },

    async restorePlan(id: number) {
      const res = await fetch(`${apiBase}/api/plans/${id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to restore plan');
      return res.json();
    },

    async fetchArchivedPlans(): Promise<Plan[]> {
      const res = await fetch(`${apiBase}/api/plans?archived=true`);
      if (!res.ok) throw new Error('Failed to fetch archived plans');
      return res.json();
    },

    async exportPlanMarkdown(id: number): Promise<string> {
      const res = await fetch(`${apiBase}/api/plans/${id}/export`);
      if (!res.ok) throw new Error('Failed to export plan');
      return res.text();
    },

    // Dispatches
    async fetchDispatches(): Promise<Dispatch[]> {
      const res = await fetch(`${apiBase}/api/dispatches`);
      if (!res.ok) throw new Error('Failed to fetch dispatches');
      return res.json();
    },

    async fetchDispatch(id: number): Promise<Dispatch> {
      const res = await fetch(`${apiBase}/api/dispatches/${id}`);
      if (!res.ok) throw new Error('Failed to fetch dispatch');
      return res.json();
    },

    async createDispatch(dispatch: Partial<Dispatch>) {
      const res = await fetch(`${apiBase}/api/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatch),
      });
      if (!res.ok) throw new Error('Failed to create dispatch');
      return res.json();
    },

    async updateDispatch(id: number, updates: Partial<Dispatch>) {
      const res = await fetch(`${apiBase}/api/dispatches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update dispatch');
      return res.json();
    },

    async archiveDispatch(id: number) {
      const res = await fetch(`${apiBase}/api/dispatches/${id}/archive`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to archive dispatch');
      return res.json();
    },

    async restoreDispatch(id: number) {
      const res = await fetch(`${apiBase}/api/dispatches/${id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to restore dispatch');
      return res.json();
    },

    async fetchArchivedDispatches(): Promise<Dispatch[]> {
      const res = await fetch(`${apiBase}/api/dispatches?archived=true`);
      if (!res.ok) throw new Error('Failed to fetch archived dispatches');
      return res.json();
    },

    // Agents
    async fetchAgents() {
      const res = await fetch(`${apiBase}/api/agents`);
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },

    async createAgent(agent: any) {
      const res = await fetch(`${apiBase}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      if (!res.ok) throw new Error('Failed to create agent');
      return res.json();
    },

    async updateAgentStatus(id: string, status: string) {
      const res = await fetch(`${apiBase}/api/agents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update agent status');
      return res.json();
    },

    async deleteAgent(id: string) {
      const res = await fetch(`${apiBase}/api/agents/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete agent');
    },

    // Streams
    async fetchStreams() {
      const res = await fetch(`${apiBase}/api/streams`);
      if (!res.ok) throw new Error('Failed to fetch streams');
      return res.json();
    },

    async fetchAgentStreams(agentId: string) {
      const res = await fetch(`${apiBase}/api/streams/${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch agent streams');
      return res.json();
    },

    async createStream(stream: any) {
      const res = await fetch(`${apiBase}/api/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stream),
      });
      if (!res.ok) throw new Error('Failed to create stream');
      return res.json();
    },

    // Agent Config
    async fetchAgentConfig(agentId: string): Promise<AgentConfig> {
      const res = await fetch(`${apiBase}/api/agents/${agentId}/config`);
      if (!res.ok) throw new Error('Failed to fetch agent config');
      return res.json();
    },

    async saveAgentConfig(agentId: string, files: AgentConfigFile[]): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${apiBase}/api/agents/${agentId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error('Failed to save agent config');
      return res.json();
    },

    // SSE
    connectSSE(onMessage: (event: SSEEvent) => void) {
      let eventSource: EventSource | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

      const connect = () => {
        eventSource = new EventSource(`${apiBase}/api/streams/live`);

        eventSource.onopen = () => {
          console.log('SSE connected');
        };

        eventSource.onerror = (err) => {
          console.error('SSE error:', err);
          eventSource?.close();
          
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(() => {
            console.log('SSE reconnecting...');
            connect();
          }, 3000);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            // Backend sends: { type: "task_event", data: {...} }
            onMessage({ type: parsed.type, data: parsed.data });
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };
      };

      connect();

      // Return cleanup function
      return () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        eventSource?.close();
      };
    },
  };
}

// Legacy API functions using hardcoded API_BASE
// These are kept for backward compatibility

export async function fetchTasks(status?: string) {
  const url = status 
    ? `${API_BASE}/api/tasks?status=${status}`
    : `${API_BASE}/api/tasks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function fetchArchivedTasks(status: string): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/api/tasks?status=${status}&archived=true`);
  if (!res.ok) throw new Error('Failed to fetch archived tasks');
  return res.json();
}

export async function updateTask(id: number, updates: Partial<{ title: string; status: string; agent_id: string | null; notes: string; archived_at: string | null }>) {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function createTask(task: { title: string; status?: string; notes?: string | null; code?: string | null; agent_id?: string | null; plan_id?: number | null; dispatch_id?: number | null }): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function archiveTask(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to archive task');
  return res.json();
}

export async function archiveDoneTasks(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tasks/archive-done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to archive done tasks');
}

export async function archiveIdeas(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tasks/archive-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to archive ideas');
}

export async function restoreTask(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore task');
  return res.json();
}

// Plans
export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE}/api/plans`);
  if (!res.ok) throw new Error('Failed to fetch plans');
  return res.json();
}

export async function fetchPlan(id: number): Promise<Plan> {
  const res = await fetch(`${API_BASE}/api/plans/${id}`);
  if (!res.ok) throw new Error('Failed to fetch plan');
  return res.json();
}

export async function createPlan(plan: Partial<Plan>) {
  const res = await fetch(`${API_BASE}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error('Failed to create plan');
  return res.json();
}

export async function updatePlan(id: number, updates: Partial<Plan>) {
  const res = await fetch(`${API_BASE}/api/plans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update plan');
  return res.json();
}

export async function archivePlan(id: number) {
  const res = await fetch(`${API_BASE}/api/plans/${id}/archive`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to archive plan');
  return res.json();
}

export async function restorePlan(id: number) {
  const res = await fetch(`${API_BASE}/api/plans/${id}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore plan');
  return res.json();
}

export async function fetchArchivedPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE}/api/plans?archived=true`);
  if (!res.ok) throw new Error('Failed to fetch archived plans');
  return res.json();
}

export async function exportPlanMarkdown(id: number): Promise<string> {
  const res = await fetch(`${API_BASE}/api/plans/${id}/export`);
  if (!res.ok) throw new Error('Failed to export plan');
  return res.text();
}

// Dispatches
export async function fetchDispatches(): Promise<Dispatch[]> {
  const res = await fetch(`${API_BASE}/api/dispatches`);
  if (!res.ok) throw new Error('Failed to fetch dispatches');
  return res.json();
}

export async function fetchDispatch(id: number): Promise<Dispatch> {
  const res = await fetch(`${API_BASE}/api/dispatches/${id}`);
  if (!res.ok) throw new Error('Failed to fetch dispatch');
  return res.json();
}

export async function createDispatch(dispatch: Partial<Dispatch>) {
  const res = await fetch(`${API_BASE}/api/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dispatch),
  });
  if (!res.ok) throw new Error('Failed to create dispatch');
  return res.json();
}

export async function updateDispatch(id: number, updates: Partial<Dispatch>) {
  const res = await fetch(`${API_BASE}/api/dispatches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update dispatch');
  return res.json();
}

export async function archiveDispatch(id: number) {
  const res = await fetch(`${API_BASE}/api/dispatches/${id}/archive`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to archive dispatch');
  return res.json();
}

export async function restoreDispatch(id: number) {
  const res = await fetch(`${API_BASE}/api/dispatches/${id}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore dispatch');
  return res.json();
}

export async function fetchArchivedDispatches(): Promise<Dispatch[]> {
  const res = await fetch(`${API_BASE}/api/dispatches?archived=true`);
  if (!res.ok) throw new Error('Failed to fetch archived dispatches');
  return res.json();
}

// Agents
export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function createAgent(agent: any) {
  const res = await fetch(`${API_BASE}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });
  if (!res.ok) throw new Error('Failed to create agent');
  return res.json();
}

export async function updateAgentStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE}/api/agents/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update agent status');
  return res.json();
}

export async function deleteAgent(id: string) {
  const res = await fetch(`${API_BASE}/api/agents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete agent');
}

// Streams
export async function fetchStreams() {
  const res = await fetch(`${API_BASE}/api/streams`);
  if (!res.ok) throw new Error('Failed to fetch streams');
  return res.json();
}

export async function fetchAgentStreams(agentId: string) {
  const res = await fetch(`${API_BASE}/api/streams/${agentId}`);
  if (!res.ok) throw new Error('Failed to fetch agent streams');
  return res.json();
}

export async function createStream(stream: any) {
  const res = await fetch(`${API_BASE}/api/streams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stream),
  });
  if (!res.ok) throw new Error('Failed to create stream');
  return res.json();
}

// Agent Config
export async function fetchAgentConfig(agentId: string): Promise<AgentConfig> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/config`);
  if (!res.ok) throw new Error('Failed to fetch agent config');
  return res.json();
}

export async function saveAgentConfig(agentId: string, files: AgentConfigFile[]): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error('Failed to save agent config');
  return res.json();
}

// SSE
export interface SSEEvent {
  type: string;
  data: any;
}

export function connectSSE(optionsOrCallback: SSEOptions | ((event: SSEEvent) => void)) {
  // Support both old callback style and new options style
  const onMessage = typeof optionsOrCallback === 'function' ? optionsOrCallback : optionsOrCallback.onMessage;
  const opts = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
  const onConnectionChange = opts?.onConnectionChange || opts?.onStateChange;
  
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  const connect = () => {
    const sseUrl = `${API_BASE}/api/streams/live`;
    console.log('[SSE] Connecting to:', sseUrl);
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('SSE connected');
      reconnectAttempts = 0;
      onConnectionChange?.({
        connected: true,
        reconnectAttempts: 0,
        lastConnected: new Date()
      });
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      eventSource?.close();
      reconnectAttempts++;
      
      onConnectionChange?.({
        connected: false,
        reconnectAttempts,
        lastConnected: null
      });
      
      // Reconnect after 3 seconds
      reconnectTimer = setTimeout(() => {
        console.log('SSE reconnecting...');
        connect();
      }, 3000);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log('[SSE] Parsed message:', parsed);
        // Backend sends: { type: "task_event", data: {...} }
        onMessage({ type: parsed.type, data: parsed.data });
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err, event.data);
      }
    };
  };

  connect();

  // Return cleanup function
  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    eventSource?.close();
  };
}

// Additional exports for backward compatibility

// Fetch all streams (alias for fetchStreams)
export async function fetchAllStreams() {
  return fetchStreams();
}

// Fetch claimed task for an agent
export async function fetchAgentClaimedTask(agentId: string): Promise<Task | null> {
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/claimed-task`);
  if (!res.ok) throw new Error('Failed to fetch claimed task');
  return res.json();
}

// SSE Connection State interface
export interface SSEConnectionState {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
}

// SSE Options interface (for backward compatibility with options object)
export interface SSEOptions {
  onMessage: (event: SSEEvent) => void;
  onConnectionChange?: (state: SSEConnectionState) => void;
  onStateChange?: (state: SSEConnectionState) => void; // Alias for backward compatibility
  maxReconnectAttempts?: number;
  baseReconnectDelay?: number;
  maxReconnectDelay?: number;
}
