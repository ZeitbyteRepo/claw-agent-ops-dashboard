# Dispatch #106: [RESEARCH2] Frontend: Pin/Unpin + Archive Footer

**Target Agent:** Athena
**Plan:** #82
**Created:** 2026-03-06 08:36 CST
**Depends on:** Dispatch #105 (Backend - Hephaestus)

---

## Objective

Add pin/unpin UI and archive footer to the research drawer.

---

## Tasks

| ID | Title | Notes |
|----|-------|-------|
| #401 | Pin/unpin button on research items | Pin icon, toggle pinned state on click |
| #402 | Sort pinned items to top | Pinned items appear first in drawer |
| #403 | Archive footer in research drawer | Collapsible footer showing archived count, expands to list |

---

## Technical Details

### Pin Button
- Add 📌 icon button to each research item
- Click toggles pinned state via API
- Pinned items show filled pin, unpinned show outline

### Sorting
- Fetch research sorted by `pinned DESC, created_at DESC`
- No client-side sorting needed if API handles it

### Archive Footer
- Similar to column archive footers in Kanban
- Always visible at bottom (collapsed state)
- Shows "📦 Archived Research (X)"
- Click to expand, shows archived items list
- No close/dismiss button

### API Endpoints (from Dispatch #105)
```
PATCH /api/research/:id/pin   -> { id, pinned: true }
PATCH /api/research/:id/unpin -> { id, pinned: false }
GET /api/research/archived    -> { value: [...] }
```

---

## API Reference

- Claim task: `PATCH /api/tasks/:id` with `{ status: "in_progress" }`
- Complete task: `PATCH /api/tasks/:id` with `{ status: "done" }`
- Get dispatch: `GET /api/dispatches/106`

---

## Verification

After completing:
1. Pin icon visible on research items
2. Clicking pin moves item to top
3. Archive footer visible at drawer bottom
4. Archive expands to show archived items
