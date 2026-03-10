import { createContext, useContext, ReactNode } from 'react';
import { Plan, Dispatch, Task, AgentConfig, AgentConfigFile } from './types';
import { useApiBase } from './config';

// API Client interface
interface ApiClient {
  // Tasks
  fetchTasks: (status?: string) => Promise<any>;
  fetchArchivedTasks: (status: string) => Promise<Task[]>;
  updateTask: (id: number, updates: Partial<{ title: string; status: string; agent_id: string | null; notes: string; archived_at: string | null }>) => Promise<Task>;
  createTask: (task: { title: string; status?: string; notes?: string | null; code?: string | null; agent_id?: string | null; plan_id?: number | null; dispatch_id?: number | null }) => Promise<Task>;
  archiveTask: (id: number) => Promise<Task>;
  archiveDoneTasks: () => Promise<void>;
  archiveIdeas: () => Promise<void>;
  restoreTask: (id: number) => Promise<Task>;
  
  // Plans
  fetchPlans: () => Promise<Plan[]>;
  fetchPlan: (id: number) => Promise<Plan>;
  createPlan: (plan: Partial<Plan>) => Promise<Plan>;
  updatePlan: (id: number, updates: Partial<Plan>) => Promise<Plan>;
  archivePlan: (id: number) => Promise<Plan>;
  restorePlan: (id: number) => Promise<Plan>;
  fetchArchivedPlans: () => Promise<Plan[]>;
  exportPlanMarkdown: (id: number) => Promise<string>;
  
  // Dispatches
  fetchDispatches: () => Promise<Dispatch[]>;
  fetchDispatch: (id: number) => Promise<Dispatch>;
  createDispatch: (dispatch: Partial<Dispatch>) => Promise<Dispatch>;
  updateDispatch: (id: number, updates: Partial<Dispatch>) => Promise<Dispatch>;
  archiveDispatch: (id: number) => Promise<Dispatch>;
  restoreDispatch: (id: number) => Promise<Dispatch>;
  fetchArchivedDispatches: () => Promise<Dispatch[]>;
  
  // Agents
  fetchAgents: () => Promise<any>;
  createAgent: (agent: any) => Promise<any>;
  updateAgentStatus: (id: string, status: string) => Promise<any>;
  deleteAgent: (id: string) => Promise<void>;
  
  // Streams
  fetchStreams: () => Promise<any>;
  fetchAgentStreams: (agentId: string) => Promise<any>;
  createStream: (stream: any) => Promise<any>;
  
  // Agent Config
  fetchAgentConfig: (agentId: string) => Promise<AgentConfig>;
  saveAgentConfig: (agentId: string, files: AgentConfigFile[]) => Promise<{ success: boolean; message: string }>;
  
  // SSE
  connectSSE: (onMessage: (event: SSEEvent) => void) => () => void;
}

interface SSEEvent {
  type: string;
  data: any;
}

const ApiClientContext = createContext<ApiClient | null>(null);

// Hook to access API client
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return client;
}

// Provider component
interface ApiClientProviderProps {
  children: ReactNode;
}

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const apiBase = useApiBase();
  
  // Create API functions with configured base URL
  const client: ApiClient = {
    // Tasks
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

    async archiveTask(id: number) {
      const res = await fetch(`${apiBase}/api/tasks/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive task');
      return res.json();
    },

    async archiveDoneTasks() {
      const res = await fetch(`${apiBase}/api/tasks/archive-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive done tasks');
    },

    async archiveIdeas() {
      const res = await fetch(`${apiBase}/api/tasks/archive-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to archive ideas');
    },

    async restoreTask(id: number) {
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
            const data = JSON.parse(event.data);
            onMessage({ type: event.type, data });
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

  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}
