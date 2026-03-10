# Modularity Touchpoints Report

**Task:** #260 - Review codebase for modularity touchpoints
**Date:** 2026-03-03
**Status:** Research Complete

---

## Summary

The agent-dashboard codebase currently has numerous hardcoded values that prevent instance-per-project deployment. Each project should be able to spin up its own isolated instance with project-specific configuration.

---

## Backend Touchpoints

### `backend/server.js`

| Line | Current | Should Be |
|------|---------|-----------|
| 54 | `port: 3001` | Configurable port (env: `PORT`, default: 3001) |
| 54 | `host: '0.0.0.0'` | Configurable host (env: `HOST`, default: '0.0.0.0') |
| 60 | `console.log('Server running on http://localhost:3001')` | Use actual port |

### `backend/db.js`

| Line | Current | Should Be |
|------|---------|-----------|
| 6 | `path.join(__dirname, 'data')` | Configurable data directory |
| 9 | `path.join(__dirname, 'data', 'dashboard.db')` | Configurable database path (env: `DATABASE_PATH`) |

### `backend/routes.js`

| Line | Current | Should Be |
|------|---------|-----------|
| 12 | `const HEARTBEAT_INTERVAL = 15000` | Configurable heartbeat interval |
| 783-785 | `const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw', 'workspace')` | Configurable workspace paths |
| 786 | `const AGENTS_DIR = path.join(os.homedir(), '.openclaw', 'agents')` | Configurable agents directory |
| 788-803 | `getAgentWorkspace()` hardcoded paths | Configurable agent workspace mapping |

### `backend/openclaw-watcher.js`

| Line | Current | Should Be |
|------|---------|-----------|
| 16 | `path.join(os.homedir(), '.openclaw', 'agents')` | Configurable OpenClaw agents directory |
| 261 | `intervalMs = 500` | Configurable polling interval |
| 324 | `usePolling: true, pollInterval: 500` | Configurable watcher options |
| 399-403 | Agent name mapping (hardcoded) | Configurable agent display names |

```javascript
// Current hardcoded agent names
const names = {
  'main': 'Mr. Claw',
  'hephaestus': 'Hephaestus',
  'athena': 'Athena',
  'hermes': 'Hermes',
  'apollo': 'Apollo'
};
```

### `backend/session-registry.js`

| Line | Current | Should Be |
|------|---------|-----------|
| 38 | Hardcoded agent list in `detectAgentFromContent()` | Configurable agent ID list |

---

## Frontend Touchpoints

### `frontend/src/api.ts`

| Line | Current | Should Be |
|------|---------|-----------|
| 1 | `const API_BASE = 'http://localhost:3001'` | Environment variable `VITE_API_BASE` |

### `frontend/src/components/AgentPanel.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 9 | `const API_BASE = 'http://localhost:3001'` | Use shared config or environment variable |

### `frontend/src/components/AgentStream.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 15-18 | `getAgentColorClass()` hardcoded agent names | Configurable agent color mapping |
| 24-27 | `getAgentTextClass()` hardcoded agent names | Configurable agent text color mapping |

```javascript
// Current hardcoded agent detection
if (name.includes("claw")) return "agent-mr-claw";
if (name.includes("hephaestus")) return "agent-hephaestus";
if (name.includes("athena")) return "agent-athena";
return "agent-test";
```

### `frontend/src/App.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 24 | `~/agent-dashboard` | Configurable project name |
| 26 | `v1.0.0` | Configurable version (from package.json or env) |
| 28 | `[monitoring]` | Configurable status text |

### `frontend/index.html`

| Line | Current | Should Be |
|------|---------|-----------|
| 7 | `<title>Agent Dashboard</title>` | Configurable project title |

### `frontend/vite.config.ts`

| Current | Should Be |
|---------|-----------|
| No port configured (defaults to 5173) | Configurable dev server port via `server.port` |

### `frontend/src/index.css`

| Line | Current | Should Be |
|------|---------|-----------|
| 13-16 | Hardcoded agent CSS variables | Configurable agent color theme |
| 429-449 | Hardcoded agent color classes | Generated from config |

---

## Configuration Schema Suggestion

### `dashboard.config.json`

```json
{
  "project": {
    "name": "Agent Dashboard",
    "version": "1.0.0",
    "title": "Agent Dashboard",
    "statusText": "monitoring"
  },
  
  "server": {
    "port": 3001,
    "host": "0.0.0.0",
    "corsOrigin": true
  },
  
  "database": {
    "path": "./data/dashboard.db",
    "walMode": true
  },
  
  "paths": {
    "openclawAgents": "~/.openclaw/agents",
    "openclawWorkspace": "~/.openclaw/workspace",
    "agentWorkspaces": {
      "main": "~/.openclaw/workspace",
      "athena": "~/clawd/agent-dashboard",
      "hephaestus": "~/clawd/hephaestus"
    }
  },
  
  "agents": {
    "names": {
      "main": "Mr. Claw",
      "hephaestus": "Hephaestus",
      "athena": "Athena",
      "hermes": "Hermes",
      "apollo": "Apollo"
    },
    "colors": {
      "main": "#22d3ee",
      "hephaestus": "#f59e0b",
      "athena": "#8b5cf6",
      "hermes": "#10b981",
      "apollo": "#f43f5e"
    }
  },
  
  "watcher": {
    "pollingInterval": 500,
    "usePolling": true,
    "loadHistory": false
  },
  
  "sse": {
    "heartbeatInterval": 15000,
    "maxReconnectAttempts": 20,
    "baseReconnectDelay": 500,
    "maxReconnectDelay": 10000
  },
  
  "frontend": {
    "apiBase": "http://localhost:3001",
    "devPort": 5173
  }
}
```

---

## Environment Variable Overrides

Allow overriding config values with environment variables:

```bash
# Server
PORT=3002
HOST=127.0.0.1

# Database
DATABASE_PATH=/var/data/dashboard.db

# Paths
OPENCLAW_AGENTS_DIR=/custom/agents
OPENCLAW_WORKSPACE=/custom/workspace

# Frontend (Vite)
VITE_API_BASE=http://localhost:3002
VITE_PROJECT_NAME="My Project Dashboard"
```

---

## Implementation Priority

### High Priority (Required for Instance-Per-Project)

1. **Server port** - Multiple instances on same machine
2. **Database path** - Isolated data per project
3. **API base URL** - Frontend must know backend location
4. **Project name/title** - Identity in UI

### Medium Priority (Nice to Have)

5. **Agent workspace paths** - Per-project agent workspaces
6. **Agent names/colors** - Project-specific agent branding
7. **Watcher configuration** - Tuning for different environments

### Low Priority (Polish)

8. **SSE heartbeat interval** - Rarely needs changing
9. **Dev server port** - Only for development
10. **Status text** - Cosmetic

---

## Recommended Implementation

1. **Create `dashboard.config.json`** in project root
2. **Add config loader** in backend (`backend/config.js`)
3. **Generate frontend config** at build time from `dashboard.config.json`
4. **Support environment variable overrides** for all config values
5. **Add CLI flag** `--config` to specify config file path

---

## Files to Create/Modify

### Create
- `backend/config.js` - Configuration loader
- `dashboard.config.json` - Default configuration
- `frontend/src/config.ts` - Frontend configuration (generated or imported)

### Modify
- `backend/server.js` - Use config for port/host
- `backend/db.js` - Use config for database path
- `backend/routes.js` - Use config for paths/intervals
- `backend/openclaw-watcher.js` - Use config for paths/names
- `frontend/src/api.ts` - Use config for API_BASE
- `frontend/src/App.tsx` - Use config for project info
- `frontend/index.html` - Dynamic title (via config)
- `frontend/vite.config.ts` - Use config for dev port

---

## Notes

- Current codebase has **no environment variable usage** for configuration
- All paths use `os.homedir()` + hardcoded subpaths
- Agent names and colors are scattered across multiple files
- Frontend has duplicate `API_BASE` definitions (api.ts and AgentPanel.tsx)
- Database is currently in `backend/data/dashboard.db` - should be configurable for project isolation
