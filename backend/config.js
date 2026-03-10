/**
 * Configuration loader for agent-dashboard
 * Loads configuration from dashboard.config.json with environment variable overrides
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Default configuration
const DEFAULT_CONFIG = {
  project: {
    name: 'Agent Dashboard',
    version: '1.0.0',
    title: 'Agent Dashboard',
    statusText: 'monitoring'
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    corsOrigin: true
  },
  database: {
    path: './data/dashboard.db',
    walMode: true
  },
  paths: {
    openclawAgents: path.join(os.homedir(), '.openclaw', 'agents'),
    openclawWorkspace: path.join(os.homedir(), '.openclaw', 'workspace'),
    agentWorkspaces: {}
  },
  agents: {
    names: {
      main: 'Mr. Claw',
      hephaestus: 'Hephaestus',
      athena: 'Athena'
    },
    colors: {
      main: '#22d3ee',
      hephaestus: '#f59e0b',
      athena: '#8b5cf6'
    }
  },
  watcher: {
    pollingInterval: 500,
    usePolling: true,
    loadHistory: false
  },
  sse: {
    heartbeatInterval: 15000
  },
  frontend: {
    apiBase: 'http://localhost:3001',
    devPort: 5173
  },
  // Legacy support
  openclaw: {
    agentsPath: path.join(os.homedir(), '.openclaw', 'agents'),
    watchInterval: 1000
  },
  ui: {
    refreshInterval: 5000,
    messageLimit: 500
  }
};

// Find config file - check multiple locations
function findConfigFile() {
  const locations = [
    // Environment variable path
    process.env.DASHBOARD_CONFIG,
    // Current working directory
    path.join(process.cwd(), 'dashboard.config.json'),
    // Project root (relative to this file)
    path.join(__dirname, '..', 'dashboard.config.json'),
    // User home directory
    path.join(os.homedir(), '.openclaw', 'dashboard.config.json'),
    // /etc for system-wide config (Linux/Mac)
    '/etc/openclaw/dashboard.config.json'
  ].filter(Boolean);

  for (const location of locations) {
    if (location && fs.existsSync(location)) {
      return location;
    }
  }

  return null;
}

// Load configuration from file
function loadConfigFile(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to load config from ${configPath}:`, err.message);
    return {};
  }
}

// Deep merge configuration objects
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Apply environment variable overrides
function applyEnvOverrides(config) {
  const envMappings = {
    'DASHBOARD_PORT': 'server.port',
    'DASHBOARD_HOST': 'server.host',
    'DASHBOARD_DB_PATH': 'database.path',
    'OPENCLAW_AGENTS_PATH': 'openclaw.agentsPath',
    'DASHBOARD_PROJECT_NAME': 'project.name'
  };

  for (const [envVar, configPath] of Object.entries(envMappings)) {
    if (process.env[envVar]) {
      const keys = configPath.split('.');
      let current = config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = current[keys[i]] || {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = process.env[envVar];
      console.log(`Config override from ${envVar}: ${configPath} = ${process.env[envVar]}`);
    }
  }

  return config;
}

// Load and merge all configuration sources
function loadConfig() {
  // Start with defaults
  let config = { ...DEFAULT_CONFIG };

  // Load from file if exists
  const configPath = findConfigFile();
  if (configPath) {
    console.log(`Loading config from: ${configPath}`);
    const fileConfig = loadConfigFile(configPath);
    config = deepMerge(config, fileConfig);
  } else {
    console.log('No config file found, using defaults');
  }

  // Apply environment variable overrides
  config = applyEnvOverrides(config);

  // Resolve paths
  if (config.database && config.database.path) {
    // Make database path absolute if not already
    if (!path.isAbsolute(config.database.path)) {
      config.database.path = path.resolve(process.cwd(), config.database.path);
    }
  }

  // Resolve paths.openclawAgents
  if (config.paths && config.paths.openclawAgents) {
    if (config.paths.openclawAgents.startsWith('~')) {
      config.paths.openclawAgents = config.paths.openclawAgents.replace('~', os.homedir());
    }
  }
  
  // Resolve paths.agentWorkspaces
  if (config.paths && config.paths.agentWorkspaces) {
    for (const agentId of Object.keys(config.paths.agentWorkspaces)) {
      const workspacePath = config.paths.agentWorkspaces[agentId];
      if (workspacePath.startsWith('~')) {
        config.paths.agentWorkspaces[agentId] = workspacePath.replace('~', os.homedir());
      }
    }
  }
  
  // Resolve paths.openclawWorkspace
  if (config.paths && config.paths.openclawWorkspace) {
    if (config.paths.openclawWorkspace.startsWith('~')) {
      config.paths.openclawWorkspace = config.paths.openclawWorkspace.replace('~', os.homedir());
    }
  }
  
  // Also resolve legacy openclaw.agentsPath
  if (config.openclaw && config.openclaw.agentsPath) {
    if (config.openclaw.agentsPath.startsWith('~')) {
      config.openclaw.agentsPath = config.openclaw.agentsPath.replace('~', os.homedir());
    }
  }
  
  // Ensure paths.openclawAgents is set (fallback to legacy path)
  if (!config.paths.openclawAgents && config.openclaw && config.openclaw.agentsPath) {
    config.paths.openclawAgents = config.openclaw.agentsPath;
  }

  return config;
}

// Export singleton config
const config = loadConfig();

function getConfig() {
  return config;
}

// Get frontend-safe config (subset of full config)
function getFrontendConfig() {
  return {
    project: config.project,
    apiBase: config.frontend?.apiBase || `http://localhost:${config.server.port}`,
    agents: {
      names: config.agents?.names || {},
      colors: config.agents?.colors || {}
    }
  };
}

module.exports = {
  config,
  getConfig,
  getFrontendConfig,
  loadConfig,
  findConfigFile,
  DEFAULT_CONFIG
};
