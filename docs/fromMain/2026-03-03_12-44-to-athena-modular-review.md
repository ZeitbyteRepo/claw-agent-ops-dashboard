# Dispatch #78: [MODULAR] Codebase Review for Instance-Per-Project

**To:** Athena
**From:** Mr. Claw
**Date:** 2026-03-03 12:44
**Status:** Dispatched
**Dispatch ID:** 78
**Plan ID:** 63

---

## Mission

Review the agent dashboard codebase (`~/clawd/agent-dashboard`) and identify all touchpoints that need to be made configurable for instance-per-project deployment.

---

## Task

**Task #260:** Review codebase for modularity touchpoints

**Goal:** Each project should be able to spin up its own isolated dashboard instance with:
- Project-specific config file
- Isolated SQLite database
- Configurable agent session paths
- Configurable ports
- Project name/identity in UI

---

## Files to Review

### Backend
- `backend/db.js` — Database path, schema
- `backend/routes.js` — API endpoints, hardcoded values
- `backend/index.js` — Server setup, port

### Frontend
- `frontend/src/App.tsx` — Main component
- `frontend/src/components/` — All components for hardcoded values
- `frontend/vite.config.ts` — Dev server port

---

## What to Look For

1. **Hardcoded Paths**
   - Agent session directories
   - Database file location
   - Any `~/.openclaw/` references

2. **Hardcoded Ports**
   - Backend port (3001)
   - Frontend port (5173)
   - SSE endpoints

3. **Hardcoded Agent Info**
   - Agent names/IDs
   - Agent session paths
   - Model names

4. **Project Identity**
   - Page titles
   - Headers
   - Any "agent-dashboard" branding

---

## Expected Output

Produce a structured report with:

```markdown
## Modularity Touchpoints

### Backend
| File | Line | Current | Should Be |
|------|------|---------|-----------|
| db.js | X | `~/clawd/...` | Configurable path |
| ... | ... | ... | ... |

### Frontend
| File | Line | Current | Should Be |
|------|------|---------|-----------|
| ... | ... | ... | ... |

### Config Schema Suggestion
```json
{
  "project": { ... },
  "agents": { ... },
  "server": { ... }
}
```

---

## API Endpoints

Claim task:
```
PATCH http://localhost:3001/api/tasks/260
{"status": "in_progress"}
```

Complete task:
```
PATCH http://localhost:3001/api/tasks/260
{"status": "done"}
```

---

## Workflow

1. Claim task #260
2. Review all files listed above
3. Document touchpoints in structured format
4. Suggest config schema
5. Mark task #260 done
6. Report findings

---

**This is a research task — no code changes needed, just analysis.**
