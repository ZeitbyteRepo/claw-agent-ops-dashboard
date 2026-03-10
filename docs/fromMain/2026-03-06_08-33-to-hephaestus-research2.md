# Dispatch #105: [RESEARCH2] Backend: Pin Column + API Endpoints

**Target Agent:** Hephaestus
**Plan:** #82
**Created:** 2026-03-06 08:33 CST

---

## Objective

Add backend support for pinning/unpinning research documents and archiving old research.

---

## Tasks

| ID | Title | Notes |
|----|-------|-------|
| #398 | Add pinned column to research_docs table | Boolean, default false |
| #399 | Pin/unpin API endpoints | PATCH /api/research/:id/pin, /unpin |
| #400 | Archived research API endpoint | GET /api/research/archived |

---

## Technical Details

### Database Migration
```sql
ALTER TABLE research_docs ADD COLUMN pinned INTEGER DEFAULT 0;
```

### API Endpoints

**Pin research:**
```
PATCH /api/research/:id/pin
Response: { id, pinned: true, ... }
```

**Unpin research:**
```
PATCH /api/research/:id/unpin
Response: { id, pinned: false, ... }
```

**Get archived research:**
```
GET /api/research/archived
Response: { value: [ ...archived docs ] }
```

### Sorting
Update GET /api/research to sort by pinned DESC, then by created_at DESC.

---

## API Reference

- Claim task: `PATCH /api/tasks/:id` with `{ status: "in_progress" }`
- Complete task: `PATCH /api/tasks/:id` with `{ status: "done" }`
- Get dispatch: `GET /api/dispatches/105`

---

## Verification

After completing:
1. Verify pinned column exists in DB
2. Test pin/unpin endpoints via curl
3. Test archived endpoint returns only archived docs
