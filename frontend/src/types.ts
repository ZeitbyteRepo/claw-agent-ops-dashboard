export interface Task {
  id: number;
  title: string;
  status: 'ideas' | 'planning' | 'todo' | 'in_progress' | 'blocked' | 'done';
  agent_id: string | null;
  agent_name: string | null;
  plan_id: number | null;
  dispatch_id: number | null;
  plan_title?: string | null;
  plan_tag?: string | null;
  dispatch_title?: string | null;
  notes?: string | null;
  code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: number;
  tag: string;
  title: string;
  summary: string | null;
  content?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  tasks?: Task[];
  dispatches?: Dispatch[];
}

export interface Dispatch {
  id: number;
  plan_id: number;
  title: string;
  target_agent: string | null;
  status: 'pending' | 'dispatched' | 'in_progress' | 'done' | 'failed' | 'archived';
  archived_at?: string | null;
  plan_title?: string | null;
  plan_tag?: string | null;
  tasks?: Task[];
  created_at: string;
}

export interface ApiMessage {
  id: number;
  agent_id: string;
  agent_name: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'active';
  last_seen: string;
  model?: string;
}

// Agent configuration files
export interface AgentConfigFile {
  path: string;
  filename: string;
  content: string;
  modified: boolean;
}

export interface AgentConfig {
  agent_id: string;
  files: AgentConfigFile[];
  last_modified: string;
}

// Tab definitions for the config editor
export const CONFIG_TABS = [
  { id: 'SOUL.md', label: 'SOUL', description: 'Core personality & behavior' },
  { id: 'USER.md', label: 'USER', description: 'User preferences & context' },
  { id: 'MEMORY.md', label: 'MEMORY', description: 'Long-term memory store' },
  { id: 'TOOLS.md', label: 'TOOLS', description: 'Local tool configuration' },
  { id: 'IDENTITY.md', label: 'IDENTITY', description: 'Name, avatar, emoji' },
] as const;

export type ConfigTabId = typeof CONFIG_TABS[number]['id'];
