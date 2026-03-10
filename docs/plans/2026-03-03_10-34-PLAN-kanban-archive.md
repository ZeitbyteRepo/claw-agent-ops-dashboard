# Plan: Kanban Archive System

**Tag:** ARCHIVE
**Status:** Draft
**Created:** 2026-03-03 10:34

---

## Problem

The DONE column has 57 completed tasks, creating visual clutter and making it hard to see active work. As more tasks complete, this will only get worse.

---

## Proposed Solution

Add an **archive system** that hides old completed tasks from the Kanban while keeping them accessible for reference.

---

## Design

### New Status: `archived`

Add `archived` as a valid task status. Archived tasks:
- Do NOT appear in Kanban columns
- Are accessible via API with `?status=archived`
- Can be viewed in a separate "Archive" view

### UI Changes

1. **DONE Column Header**
   - Add "Archive All" button (appears when DONE has tasks)
   - Shows count: "DONE [57]" → after archive → "DONE [0]"

2. **Archive View**
   - Small "View Archive" link below Kanban or in header
   - Opens modal/panel showing archived tasks grouped by plan/epic
   - Searchable, sortable by date

3. **Optional: Auto-collapse DONE**
   - DONE column shows count-only by default
   - Click to expand (separate from archive)

---

## Implementation Phases

### Phase 1: Backend (API)
- [ ] Add `archived` to valid statuses in db.js
- [ ] Add `PATCH /api/tasks/archive-completed` endpoint (bulk archive all `done` tasks)
- [ ] Add `GET /api/tasks?status=archived` support
- [ ] Update task counts to exclude archived

### Phase 2: Frontend (UI)
- [ ] Update KanbanColumn to show "Archive All" button on DONE
- [ ] Create ArchiveModal component
- [ ] Add "View Archive" link to Kanban header
- [ ] Update task card to show archived badge/state

### Phase 3: Polish
- [ ] Add "Restore" button on archived tasks (set back to `done`)
- [ ] Add confirmation dialog before bulk archive
- [ ] Add filtering by plan/epic in archive view

---

## Database Changes

```sql
-- No schema change needed, just new status value
-- Valid statuses: ideas, planning, todo, in_progress, blocked, done, archived
```

---

## API Endpoints

### New Endpoints
```
PATCH /api/tasks/archive-completed
  → Sets all tasks with status='done' to status='archived'
  → Returns count of archived tasks

GET /api/tasks?status=archived
  → Returns archived tasks (already supported)
```

### Modified Endpoints
```
GET /api/tasks
  → By default excludes status='archived'
  → Add ?include_archived=true to include them
```

---

## Open Questions

1. **Auto-archive?** Should tasks auto-archive after X days in DONE?
2. **Per-plan archive?** Archive by plan/epic instead of all at once?
3. **Archive permissions?** Should this be restricted to certain agents?

---

## Effort Estimate

- Phase 1 (Backend): ~2 hours
- Phase 2 (Frontend): ~3 hours
- Phase 3 (Polish): ~2 hours
- **Total: ~7 hours**

---

## Discussion Points

- Should we do collapsible DONE column AND archive, or just archive?
- Should archive be undo-able (restore)?
- Should we show "Recently Archived" somewhere?
