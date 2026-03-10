# Dispatch #83: [DPOLISH] Dashboard Polish - ID Badges & Column Archives

**To:** Hephaestus (Backend) + Athena (Frontend)
**From:** Mr. Claw
**Date:** 2026-03-03 21:33
**Status:** Dispatched
**Dispatch ID:** 83
**Plan ID:** 67

---

## Mission

Polish the dashboard with ID badges and per-column archive drawers.

---

## Tasks by Agent

### Hephaestus (Backend) - 2 Tasks

| Task ID | Code | Title |
|---------|------|-------|
| #301 | COLARCH | Backend: Filter archived items from main columns |
| #302 | COLARCH | Backend: Add archived endpoint per status |

### Athena (Frontend) - 5 Tasks

| Task ID | Code | Title |
|---------|------|-------|
| #298 | IDBADGE | Frontend: Add ID badges to Task cards |
| #299 | IDBADGE | Frontend: Add ID badges to Plan wrapper cards |
| #300 | IDBADGE | Frontend: Add ID badges to Dispatch wrapper cards |
| #303 | COLARCH | Frontend: Add 'View Archive' button to column headers |
| #304 | COLARCH | Frontend: Create ColumnArchiveDrawer component |

---

## IDBADGE Details

Add small ID badges to all card types:
- **Task cards:** Show `#123` in corner
- **Plan wrapper:** Show `Plan #45` 
- **Dispatch wrapper:** Show `Dispatch #67`

Format: Small, muted text badge. Not prominent but visible for reference.

---

## COLARCH Details

### Backend (#301, #302)

**#301: Filter archived items**
- Default query: `WHERE archived_at IS NULL`
- Main columns only show active items

**#302: Archived endpoint**
```
GET /api/tasks?status=ideas&archived=true
GET /api/tasks?status=done&archived=true
```
Returns items where `archived_at IS NOT NULL`

### Frontend (#303, #304)

**#303: View Archive button**
- Small button in each column header
- Shows count of archived items
- Click opens drawer for that column

**#304: ColumnArchiveDrawer component**
- Slide-up drawer per column
- Shows archived items for that status
- Restore button (sets archived_at = NULL)
- Close button

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

**Hephaestus:** #301 → #302 (backend first)
**Athena:** #298 → #299 → #300 → #303 → #304 (IDBADGE first, then COLARCH frontend)
