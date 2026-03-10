# Dispatch #109: Frontend Configuration Integration

**Plan:** #84 [INST001-CONFIG] Configuration System for Instance-Per-Project
**Target:** Athena
**Status:** TODO (waits for Hephaestus #410)

## Goal

Make frontend use configuration from API instead of hardcoded values.

## Dependency

**Wait for Hephaestus to complete #410** (Add /api/dashboard-config endpoint).

## Your Tasks (5)

| ID | Title | Notes |
|----|-------|-------|
| #411 | Create frontend config loader - fetch from API | Fetch `/api/dashboard-config` on app start, provide via context |
| #412 | Update api.ts - use API_BASE from config | Replace hardcoded `http://localhost:3001` |
| #413 | Update App.tsx - use project name from config | Use config.project.name for header |
| #414 | Update AgentStream.tsx - use agent colors from config | Use config.agents.colors for agent styling |
| #415 | Update index.html - dynamic title | Set document.title from config.project.title |

## Config API Response

```json
{
  "project": {
    "name": "Agent Dashboard",
    "version": "1.0.0",
    "title": "Agent Dashboard",
    "statusText": "monitoring"
  },
  "apiBase": "http://localhost:3001",
  "agents": {
    "names": { "main": "Mr. Claw", "hephaestus": "Hephaestus", "athena": "Athena" },
    "colors": { "main": "#22d3ee", "hephaestus": "#f59e0b", "athena": "#8b5cf6" }
  }
}
```

## Implementation Approach

1. **Config Context**: Create `ConfigContext` that fetches config on mount
2. **useConfig hook**: Components use this to access config
3. **Fallback**: If config fetch fails, use sensible defaults
4. **Loading state**: Show loading indicator while config loads

## Files to Create/Modify

**Create:**
- `frontend/src/config.ts` - Config context + hook

**Modify:**
- `frontend/src/api.ts` - Use config.apiBase
- `frontend/src/App.tsx` - Use config.project
- `frontend/src/components/AgentStream.tsx` - Use config.agents.colors
- `frontend/index.html` - Dynamic title (or set via useEffect in App)

## Verification

After implementation:
1. Frontend should show project name from config in header
2. Agent streams should use colors from config
3. API calls should use apiBase from config
4. Browser tab title should match config.project.title
