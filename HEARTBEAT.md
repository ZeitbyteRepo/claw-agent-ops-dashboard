# HEARTBEAT.md

# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

---

## Periodic Tasks

### Sync Kanban to Current State

On each heartbeat, update the Kanban to reflect the current state of work:

**API Endpoint:** ``http://localhost:3001``

1. **Check current tasks:** ``GET /api/tasks``
2. **Update task status:** ``PATCH /api/tasks/:id`` with ``{ "status": "new_status" }``
3. **Add new tasks:** ``POST /api/tasks`` with ``{ "title": "...", "status": "...", "agent_id": "..." }``

**Valid statuses:** ``ideas``, ``planning``, ``todo``, ``in_progress``, ``blocked``, ``done``

**Rules:**
- Move completed work to ``done``
- Move active work to ``in_progress``
- Add new tasks for work you're starting
- Keep the board accurate to what's actually happening

**Goal:** Anyone looking at the Kanban should immediately understand the project state.