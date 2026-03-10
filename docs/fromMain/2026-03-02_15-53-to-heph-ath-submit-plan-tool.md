# DISPATCH: submit_plan tool implementation
Date: 2026-03-02 15:53
From: main
Status: active

## Summary
Build the plan/dispatch system for the agent dashboard. Backend creates the data layer and API, frontend displays plan wrappers in the Kanban column.

## Assignments

### Hephaestus (Backend)
- [ ] #26 DB schema: plans + dispatches tables
- [ ] #27 API: CRUD endpoints for plans/dispatches + markdown export
- [ ] #29 Agent tool: submit_plan (POST to API)
- [ ] #30 Agent tool: submit_dispatch (directed action)

### Athena (Frontend)
- [ ] #28 Kanban: plan/dispatch wrapper grouping tasks in column

## Technical Notes

**DB Schema:**
```sql
plans (id, tag, title, summary, status, created_at)
dispatches (id, plan_id, title, target_agent, status, created_at)
tasks.plan_id -> plans.id
tasks.dispatch_id -> dispatches.id
```

**API Endpoints:**
- POST /api/plans
- GET /api/plans/:id
- GET /api/plans/:id/export (returns markdown)
- POST /api/dispatches
- GET /api/dispatches/:id

**Frontend:**
- Group tasks by plan_id in PLANNING column
- Show plan header with tag + title
- Collapsible groups

## Success Criteria
- Hephaestus can create a plan via API
- Plans appear in Kanban grouped under plan header
- Dispatches can be directed at specific agents
- Tasks show which plan/dispatch they belong to
