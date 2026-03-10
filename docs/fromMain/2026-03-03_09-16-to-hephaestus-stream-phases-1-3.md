# Dispatch #76: [STREAM] Phases 1-3 - Tool & Content Components

**To:** Hephaestus
**From:** Mr. Claw
**Date:** 2026-03-03 09:16
**Status:** Active
**Dispatch ID:** 76

---

## Mission

Build the tool-related and content block components for the agent stream display. These are foundational — tool badges, code blocks, and message metadata.

---

## Tasks

| ID | Title | Phase |
|----|-------|-------|
| #247 | [STREAM] Phase 1.1: ToolBadge Component | 1 |
| #248 | [STREAM] Phase 1.2: ToolGroup Component | 1 |
| #249 | [STREAM] Phase 1.3: ToolResult Component | 1 |
| #250 | [STREAM] Phase 2.1: SenderMeta Component | 2 |
| #251 | [STREAM] Phase 2.2: FilePath Component | 2 |
| #252 | [STREAM] Phase 2.3: ThinkingBlock Component | 2 |
| #253 | [STREAM] Phase 3.1: CodeBlock Enhancement | 3 |
| #254 | [STREAM] Phase 3.2: JsonBlock Component | 3 |

---

## Specs

### Phase 1: Tool Components

**ToolBadge** - Purple pill badge for tool calls
- Parse `[tool: X]` patterns
- Icons: 📄 read, ✏️ edit, 💾 write, ⚡ exec, 🌐 web, 🖼️ image, 🖥️ browser, 👥 sessions
- Purple/gray color scheme

**ToolGroup** - Group consecutive tools into row
- Horizontal layout
- Scroll if too many
- Hover tooltip with count

**ToolResult** - Collapsible result card
- Auto-collapse if >20 lines
- Summary line when collapsed
- Click-to-expand

### Phase 2: Message Structure

**SenderMeta** - Condensed sender info
- Parse JSON metadata
- Show as `📝 label - HH:MM`

**FilePath** - Cyan styled paths
- Show filename prominently
- Full path on hover
- Cyan color

**ThinkingBlock** - Muted reasoning
- Italic, gray text
- Collapsible by default

### Phase 3: Content Blocks

**CodeBlock Enhancement**
- Syntax highlighting
- Line numbers (optional)
- Copy button
- Collapse/expand

**JsonBlock**
- Pretty print
- Collapsible nested objects
- Syntax highlighting

---

## Context

- Plan #61: [STREAM] Clean up stream for human digestibility
- Frontend: `~/clawd/agent-dashboard/frontend/`
- Components go in `src/components/stream/`
- Use existing Tailwind + dark theme

---

## API Endpoints

Claim tasks:
```
PATCH http://localhost:3001/api/tasks/{id}
{ "status": "in_progress" }
```

Complete tasks:
```
PATCH http://localhost:3001/api/tasks/{id}
{ "status": "done" }
```

Get your tasks:
```
GET http://localhost:3001/api/tasks?agent_id=hephaestus
```

---

## Workflow

1. Claim task #247 first (ToolBadge)
2. Build component
3. Mark #247 done
4. Claim next task
5. Repeat

Work in order: Phase 1 → Phase 2 → Phase 3
