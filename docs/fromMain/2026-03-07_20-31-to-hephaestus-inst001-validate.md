# Dispatch #110: Validate Instance-Per-Project Architecture

**Plan:** #85 [INST001-VALIDATE] Validate Instance-Per-Project Implementation
**Target:** Hephaestus
**Status:** TODO

## Goal

Thoroughly review and validate all INST001-CONFIG changes to ensure the dashboard is properly modular and supports isolated instances per project.

## Your Task (1)

| ID | Title | Notes |
|----|-------|-------|
| #417 | Validate instance-per-project architecture implementation | Full review and testing |

## Validation Checklist

### Backend Config System
- [ ] `backend/config.js` exists and exports `getConfig()`, `getFrontendConfig()`
- [ ] Config loads from `dashboard.config.json`
- [ ] Environment variable overrides work (PORT, DATABASE_PATH, etc.)
- [ ] Path expansion (~ → home directory) works
- [ ] `server.js` uses config for port/host
- [ ] `db.js` uses config for database path
- [ ] `routes.js` uses config for paths/intervals
- [ ] `openclaw-watcher.js` uses config for paths/names

### API Endpoints
- [ ] `GET /api/dashboard-config` returns frontend-safe config
- [ ] Response includes: project, apiBase, agents (names + colors)

### Frontend Config Integration
- [ ] Frontend fetches config from `/api/dashboard-config`
- [ ] API calls use configured apiBase
- [ ] App header shows configured project name
- [ ] Agent streams use configured colors
- [ ] Browser tab title is dynamic

### Config File
- [ ] `dashboard.config.json` exists at project root
- [ ] All required sections present: project, server, database, paths, agents, watcher, sse, frontend

### Manual Testing
1. Start backend: `cd backend && node server.js`
2. Check config API: `curl http://localhost:3001/api/dashboard-config`
3. Test env override: `PORT=3002 node server.js` (should use port 3002)
4. Start frontend: `cd frontend && npm run dev`
5. Verify frontend loads and displays config values

## Report Format

After validation, update task #417 with:
1. **Summary**: Pass/Fail/Partial
2. **Issues Found**: List any problems discovered
3. **Recommendations**: Any improvements needed
4. **Confidence Level**: High/Medium/Low

## Files to Review

- `backend/config.js`
- `backend/server.js`
- `backend/db.js`
- `backend/routes.js`
- `backend/openclaw-watcher.js`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/AgentStream.tsx`
- `frontend/src/config.ts` (if exists)
- `dashboard.config.json`
