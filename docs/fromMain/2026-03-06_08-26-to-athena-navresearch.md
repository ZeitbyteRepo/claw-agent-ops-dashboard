# Dispatch #104: [NAVRESEARCH] Move Research Drawer Button to Header

**Target Agent:** Athena
**Plan:** #81
**Created:** 2026-03-06 08:26 CST

---

## Objective

Move the research drawer button from its current location to the top header bar, making it more prominent and accessible.

---

## Tasks

| ID | Title | Notes |
|----|-------|-------|
| #393 | Audit current research button implementation | Review how it currently works before moving |
| #394 | Add horizontal research button to top header | Create new button in header that triggers drawer |
| #395 | Remove button from current location | Clean up old button after new one works |
| #396 | Test in browser - verify drawer still works | Confirm drawer slides out correctly |

---

## Technical Context

- The research drawer slides out from the right side
- Current button location: Kanban column area
- New location: Top header bar (horizontal layout)
- The drawer functionality itself should remain unchanged

---

## API Reference

- Claim task: `PATCH /api/tasks/:id` with `{ status: "in_progress" }`
- Complete task: `PATCH /api/tasks/:id` with `{ status: "done" }`
- Get dispatch: `GET /api/dispatches/104`

---

## Verification

After completing all tasks, verify:
1. Button appears in top header
2. Clicking button opens research drawer
3. Drawer slides from right as before
4. Old button location is cleaned up
