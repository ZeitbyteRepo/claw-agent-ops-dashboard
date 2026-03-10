import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DashboardConfig {
  project: {
    name: string;
    version: string;
    title: string;
    statusText: string;
  };
  apiBase: string;
  agents: {
    names: Record<string, string>;
    colors: Record<string, string>;
  };
}

// Default config - used as fallback if API fails
const DEFAULT_CONFIG: DashboardConfig = {
  project: {
    name: 'Agent Dashboard',
    version: '1.0.0',
    title: 'Agent Dashboard',
    statusText: 'monitoring'
  },
  apiBase: 'http://localhost:3001',
  agents: {
    names: {
      'main': 'Mr. Claw',
      'hephaestus': 'Hephaestus',
      'athena': 'Athena',
      'hermes': 'Hermes',
      'apollo': 'Apollo'
    },
    colors: {
      'main': '#22d3ee',
      'hephaestus': '#f59e0b',
      'athena': '#8b5cf6',
      'hermes': '#10b981',
      'apollo': '#f43f5e'
    }
  }
};

interface ConfigContextValue {
  config: DashboardConfig;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

// Hook to access config
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Convenience hooks for common config values
export function useApiBase(): string {
  const { config } = useConfig();
  return config.apiBase;
}

export function useProjectName(): string {
  const { config } = useConfig();
  return config.project.name;
}

export function useProjectTitle(): string {
  const { config } = useConfig();
  return config.project.title;
}

export function useAgentColor(agentId: string): string {
  const { config } = useConfig();
  return config.agents.colors[agentId?.toLowerCase()] || '#6b7280';
}

export function useAgentName(agentId: string): string {
  const { config } = useConfig();
  return config.agents.names[agentId?.toLowerCase()] || agentId;
}

// Provider component
interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from API - use current origin in production, localhost in dev
      const apiBase = window.location.origin.includes('localhost') 
        ? 'http://localhost:3001' 
        : window.location.origin;
      
      const response = await fetch(`${apiBase}/api/dashboard-config`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.warn('Failed to fetch dashboard config, using defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to load config');
      // Keep using default config
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Update document title when config loads
  useEffect(() => {
    if (config.project.title) {
      document.title = config.project.title;
    }
  }, [config.project.title]);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refetch: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export default DEFAULT_CONFIG;
