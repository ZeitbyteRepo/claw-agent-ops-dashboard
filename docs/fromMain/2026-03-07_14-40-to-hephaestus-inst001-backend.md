# Dispatch #108: Backend Configuration System

**Plan:** #84 [INST001-CONFIG] Configuration System for Instance-Per-Project
**Target:** Hephaestus
**Status:** TODO

## Goal

Implement configurable dashboard.config.json to support isolated instances per project.

## Research Source

Based on `docs/modularity-touchpoints-report.md` - read this for full context.

## Your Tasks (7)

| ID | Title | Notes |
|----|-------|-------|
| #405 | Create config loader (backend/config.js) | Load from dashboard.config.json, env var overrides, expand ~ paths |
| #406 | Update server.js - use config for port/host | Use config.server.port and config.server.host |
| #407 | Update db.js - use config for database path | Use config.database.path |
| #408 | Update routes.js - use config for paths/intervals | Use config.paths, config.sse.heartbeatInterval |
| #409 | Update openclaw-watcher.js - use config for paths/names | Use config.paths.openclawAgents, config.agents.names |
| #410 | Add /api/dashboard-config endpoint | Return frontend-safe config (project, apiBase, agents) |
| #416 | Create default dashboard.config.json | Already partially created - review and finalize |

## Config Schema

```json
{
  "project": { "name", "version", "title", "statusText" },
  "server": { "port", "host", "corsOrigin" },
  "database": { "path", "walMode" },
  "paths": { "openclawAgents", "openclawWorkspace", "agentWorkspaces" },
  "agents": { "names": {...}, "colors": {...} },
  "watcher": { "pollingInterval", "usePolling", "loadHistory" },
  "sse": { "heartbeatInterval" },
  "frontend": { "apiBase", "devPort" }
}
```

## Environment Overrides

Support these env vars:
- `PORT` → server.port
- `HOST` → server.host
- `DATABASE_PATH` → database.path
- `OPENCLAW_AGENTS_DIR` → paths.openclawAgents
- `PROJECT_NAME` → project.name

## Notes

- Some files already have partial config changes from earlier work - review and refine
- Config loader should be a singleton with reload capability
- Make database path absolute if relative

## Verification

After implementation:
1. Backend should start with default config
2. `PORT=3002 npm start` should work
3. `/api/dashboard-config` should return frontend config
