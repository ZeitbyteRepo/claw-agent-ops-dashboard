# Dispatch #80: [DASH] Backend Tasks

**To:** Hephaestus
**From:** Mr. Claw
**Date:** 2026-03-03 15:39
**Status:** Dispatched
**Dispatch ID:** 80
**Plan ID:** 64

---

## Mission

Implement backend changes for Dashboard UX improvements: notes field, archive system, and dispatch lifecycle.

---

## Tasks

| ID | Title |
|----|-------|
| #266 | Add notes field and archived_at to tasks |
| #267 | Archive API endpoints (archive/restore) |
| #268 | Dispatch lifecycle (active → completed → archived) |

---

## Task Details

### #266: Add notes field and archived_at to tasks

**Database changes:**
```sql
ALTER TABLE tasks ADD COLUMN notes TEXT;
ALTER TABLE tasks ADD COLUMN archived_at DATETIME;
```

**API changes:**
- `GET /api/tasks/:id` returns notes, archived_at
- `PATCH /api/tasks/:id` accepts notes
- Filter archived tasks: `GET /api/tasks?archived=true`

---

### #267: Archive API endpoints

**New endpoints:**
```
POST /api/tasks/:id/archive
  → Sets archived_at = NOW()
  → Returns updated task

POST /api/tasks/:id/restore
  → Sets archived_at = NULL
  → Returns updated task

POST /api/tasks/archive-completed
  → Archives all tasks with status='done'
  → Returns count archived

GET /api/tasks/archived
  → Returns all archived tasks
```

---

### #268: Dispatch lifecycle

**Dispatch status flow:**
```
pending → dispatched → active → completed → archived
```

**New endpoints:**
```
POST /api/dispatches/:id/complete
  → Sets status = 'completed'
  → Called when all tasks done

POST /api/dispatches/:id/archive
  → Sets status = 'archived'
  → Moves to archive drawer
```

**Auto-complete logic:**
When all tasks in a dispatch have status='done', auto-set dispatch to 'completed'.

---

## API Endpoints

Claim task:
```
PATCH http://localhost:3001/api/tasks/{id}
{"status": "in_progress"}
```

Complete task:
```
PATCH http://localhost:3001/api/tasks/{id}
{"status": "done"}
```

---

## Workflow

1. Claim #266 first (database schema)
2. Build and test
3. Mark #266 done
4. Claim #267 (archive endpoints)
5. Build and test
6. Mark #267 done
7. Claim #268 (dispatch lifecycle)
8. Build and test
9. Mark #268 done

Work in order: #266 → #267 → #268
