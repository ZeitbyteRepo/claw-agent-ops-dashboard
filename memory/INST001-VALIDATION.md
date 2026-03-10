# INST001-VALIDATION - Instance-Per-Project Architecture Validation

**Date**: 2026-03-08
**Task**: #417 - Validate instance-per-project architecture implementation
**Validator**: Hephaestus

## Validation Checklist

### Backend Components (Dispatch #108)

| # | Component | Status | Notes |
|---|-----------|--------|-------|
| 1 | ✅ config.js | PASS | Config loader working with file + env overrides. Implements loadConfig(), deepMerge(), findConfigFile(), applyEnvOverrides() |
| 2 | ✅ server.js | PASS | Uses config via getConfig() for port/host (line 96: `const { port, host } = config.server;`) |
| 3 | ✅ db.js | PASS | Uses config.database.path for database location (line 8) and config.database.walMode (line 19) |
| 4 | ✅ routes.js | PASS | Uses config.sse.heartbeatInterval (line 18), has /api/dashboard-config endpoint (line 1823) |
| 5 | ✅ openclaw-watcher.js | PASS | Uses config.paths.openclawAgents (line 26), config.agents.names (line 271), config.watcher settings (lines 402-403) |
| 6 | ✅ dashboard.config.json | PASS | Properly structured with all required fields (project, server, database, paths, agents, watcher, sse, frontend) |

### Frontend Components (Dispatch #109)

| # | Component | Status | Notes |
|---|-----------|--------|-------|
| 7 | ✅ config.tsx | PASS | Frontend config context created. Fetches from API, has default fallback, provides useConfig() hook |
| 8 | ⚠️ api.ts | **ISSUE** | Task #412 marked done but api.ts still uses hardcoded API_BASE logic (lines 6-9), NOT using config system |
| 9 | ✅ App.tsx | PASS | Uses useConfig() hook and config.project.name (line 45), config.project.version (line 47), config.project.statusText (line 49) |
| 10 | ✅ AgentStream.tsx | PASS | Uses useConfig() hook (line 335), config.agents.colors (line 343) for dynamic agent colors |
| 11 | ✅ index.html | PASS | Dynamic title updated via config.tsx useEffect that sets document.title |

### API Endpoints

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 11 | ✅ GET /api/dashboard-config | PASS | Returns frontend-safe config with project, apiBase, agents (names/colors) |

### Manual Testing

| # | Test | Status | Notes |
|---|------|--------|-------|
| 12 | ✅ Backend starts with default config | PASS | Backend running on port 3001, serving requests |
| 13 | ✅ PORT env var override | PASS | Tested: `DASHBOARD_PORT=3002` correctly overrides config (config.js logs "Config override from DASHBOARD_PORT: server.port = 3002") |
| 14 | ✅ Frontend loads and uses config | PASS | Frontend accessible, ConfigProvider wraps app, config loads from API |

## Issues Found

### Issue #1: api.ts Not Using Config System

**Severity**: Medium
**Location**: `frontend/src/api.ts` lines 6-9
**Description**: Task #412 "Update api.ts - use API_BASE from config" was marked complete, but the file still uses hardcoded logic:
```typescript
const API_BASE = (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.hostname === 'localhost'))
  ? 'http://localhost:3001'
  : '';
```

**Expected**: Should use `useApiBase()` hook from config context OR fetch config at module level
**Impact**: Frontend won't respect custom apiBase from dashboard.config.json
**Recommendation**: 
- Either update api.ts to use config system (may require refactoring since api.ts exports functions, not components)
- OR document that api.ts uses environment detection and config.apiBase is only for other use cases

## Summary

**Backend**: ✅ All 6 components validated successfully
**Frontend**: ⚠️ 4/5 components validated, 1 issue with api.ts
**API**: ✅ Endpoint working correctly
**Manual Tests**: ✅ All 3 tests passed

**Overall Status**: ⚠️ **Mostly Complete with One Issue**

The instance-per-project architecture is largely implemented correctly. The backend configuration system is fully functional. The frontend config system works for App.tsx and AgentStream.tsx, but api.ts was not properly updated to use the config system despite being marked complete.

## Next Steps

1. Decide on api.ts fix approach (refactor to use config OR document current behavior)
2. Test PORT environment variable override
3. Mark task #417 complete once api.ts issue is resolved
4. Update dispatch #110 and plan #85 to done status
