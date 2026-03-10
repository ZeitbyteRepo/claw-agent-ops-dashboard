# Dispatch #81: [DASH] Frontend Tasks

**To:** Athena
**From:** Mr. Claw
**Date:** 2026-03-03 15:39
**Status:** Dispatched
**Dispatch ID:** 81
**Plan ID:** 64

---

## Mission

Implement frontend UX improvements: plan details popup, notes field, archive drawer, and dispatch card updates.

---

## Tasks

| ID | Title |
|----|-------|
| #269 | Plan details in planning popup |
| #270 | Notes field on idea cards and popup |
| #271 | Archive drawer component (bottom slide-up) |
| #272 | Dispatch card shows completed tasks separately |

---

## Task Details

### #269: Plan details in planning popup

**Changes to TaskPopup.tsx:**
- When task has plan_id, fetch plan details
- Show plan description in popup
- Show plan tag/badge
- Link to view full plan

**API:**
```
GET /api/plans/{plan_id}
```

---

### #270: Notes field on idea cards and popup

**Changes:**
- Add notes icon to idea cards (shows if notes exist)
- Add notes textarea in TaskPopup
- Save notes on blur/enter
- Show notes preview in popup

**API:**
```
PATCH /api/tasks/{id}
{"notes": "User's notes..."}
```

---

### #271: Archive drawer component (bottom slide-up)

**New component: ArchiveDrawer.tsx**

**Features:**
- Fixed position at bottom of screen
- Click to expand (slides up)
- Shows archived items in tabs:
  - Ideas
  - Plans
  - Dispatches
  - Done tasks
- Search/filter archived items
- Restore button on each item

**API:**
```
GET /api/tasks?archived=true
GET /api/plans?status=archived
GET /api/dispatches?status=archived
```

---

### #272: Dispatch card shows completed tasks separately

**Changes to DispatchCard/TaskCard:**
- Separate completed tasks from pending
- Show completed count badge
- Collapse completed tasks by default
- "Show completed" toggle
- When all tasks done, show "Archive" button

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

1. Claim #269 first (plan details)
2. Build and test
3. Mark #269 done
4. Claim #270 (notes field)
5. Build and test
6. Mark #270 done
7. Claim #271 (archive drawer)
8. Build and test
9. Mark #271 done
10. Claim #272 (dispatch cards)
11. Build and test
12. Mark #272 done

Work in order: #269 → #270 → #271 → #272

---

## Styling

- Archive drawer: dark background, slide-up animation
- Notes: subtle textarea, markdown support optional
- Plan details: collapsible section in popup
- Completed tasks: muted/strikethrough style
