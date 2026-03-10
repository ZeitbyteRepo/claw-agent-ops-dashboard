# Research Report: pi.dev Platform

**Task:** #317 [INST001] Research pi.dev platform
**Date:** 2026-03-04
**Status:** Research Complete

---

## Executive Summary

**pi.dev** (actually **pi-coding-agent** from the pi-mono monorepo) is **NOT a cloud platform** — it's a **local-first toolkit** of NPM packages for building AI agents. This is important: it doesn't replace our backend; it **already powers our frontend and agents**.

**Key Finding:** OpenClaw (which we're using) is built ON TOP of pi-coding-agent packages. The dashboard's current architecture is already aligned with pi.dev's design patterns.

---

## What is pi.dev / pi-coding-agent?

### Core Packages (from pi-mono monorepo)

| Package | Purpose |
|---------|---------|
| `@mariozechner/pi-ai` | Unified LLM API (Anthropic, OpenAI, Google, etc.) |
| `@mariozechner/pi-agent-core` | Agent loop, tool execution, state management |
| `@mariozechner/pi-coding-agent` | Full coding agent with sessions, skills, extensions |
| `@mariozechner/pi-tui` | Terminal UI with differential rendering |
| `@mariozechner/pi-web-ui` | **Web components for AI chat interfaces** |
| `@mariozechner/pi-mom` | Slack bot integration |

### Architecture Stack

```
┌─────────────────────────────────────────┐
│ Your Application (OpenClaw, Dashboard)  │
├────────────────────┬────────────────────┤
│ pi-coding-agent    │ pi-web-ui          │
│ Sessions, tools,   │ Chat components,   │
│ extensions         │ artifacts, storage │
├────────────────────┴────────────────────┤
│ pi-agent-core                            │
│ Agent loop, tool execution, events       │
├─────────────────────────────────────────┤
│ pi-ai                                    │
│ Streaming, models, multi-provider LLM    │
└─────────────────────────────────────────┘
```

---

## Sessions: How They Work

### JSONL Tree Structure

Sessions are stored as **JSONL files with a tree structure**:
- Each entry has an `id` and `parentId`
- Enables **in-place branching** without creating new files
- Full history preserved even through compaction
- Navigate with `/tree`, `/branch`, `/rewind`

### Session Storage

```
~/.pi/agent/sessions/           # CLI sessions
~/.omp/agent/sessions/          # oh-my-pi sessions
~/.openclaw/agent/sessions/     # OpenClaw sessions
```

### Key Features

1. **Compaction** - Summarizes old messages to fit context windows
2. **Branching** - Side-quests without polluting main context
3. **Hot Reloading** - Extensions can modify and reload during sessions
4. **Custom Messages** - Extension state persisted alongside LLM messages

---

## pi-web-ui: Relevant for Dashboard

The `@mariozechner/pi-web-ui` package provides **ready-made web components**:

### Components Available

| Component | Description |
|-----------|-------------|
| `ChatPanel` | Complete chat interface with streaming |
| `AgentInterface` | Message display, input editor |
| `ArtifactsPanel` | HTML, SVG, Markdown rendering |
| `ApiKeyPromptDialog` | API key management UI |

### Storage Layer

```typescript
// IndexedDB-backed storage
const settings = new SettingsStore();
const providerKeys = new ProviderKeysStore();
const sessions = new SessionsStore();

const backend = new IndexedDBStorageBackend({
  dbName: 'my-app',
  stores: [settings, providerKeys, sessions]
});
```

### Agent Integration

```typescript
const agent = new Agent({
  initialState: {
    systemPrompt: 'You are a helpful assistant.',
    model: getModel('anthropic', 'claude-sonnet-4-5'),
    messages: [],
    tools: [],
  },
  convertToLlm: defaultConvertToLlm,
});

const chatPanel = new ChatPanel();
await chatPanel.setAgent(agent);
```

---

## Architecture Comparison

### Current Dashboard Architecture

```
┌─────────────────────────────────────────────┐
│ Frontend (React + Vite)                      │
│ - KanbanBoard, AgentStream, Modals           │
│ - Custom SSE connection                      │
│ - TailwindCSS styling                        │
├─────────────────────────────────────────────┤
│ Backend (Node.js + Express)                  │
│ - REST API for tasks/plans/dispatches        │
│ - SQLite database                            │
│ - SSE broadcaster                            │
│ - OpenClaw watcher                           │
├─────────────────────────────────────────────┤
│ OpenClaw Agents                              │
│ - pi-coding-agent SDK                        │
│ - Session files in ~/.openclaw               │
└─────────────────────────────────────────────┘
```

### What pi-web-ui Would Replace

| Current | pi-web-ui Equivalent |
|---------|---------------------|
| `AgentStream.tsx` | `ChatPanel` + `AgentInterface` |
| Custom message parsing | Built-in markdown, tool display |
| Custom SSE handling | Agent event system |
| Manual state management | `Agent` class state |

### What pi-web-ui Would NOT Replace

| Stays Custom | Reason |
|--------------|--------|
| `KanbanBoard` | Task management UI (not chat) |
| Backend REST API | Task/plan/dispatch CRUD |
| SQLite database | Persistent storage |
| SSE broadcaster | Multi-client updates |

---

## Recommendation: Partial Integration

### ❌ Don't Replace Backend

pi.dev is **NOT a hosted platform**. It's a **local toolkit**. We still need:
- REST API for task/plan/dispatch management
- SQLite for persistent data
- SSE for real-time updates to multiple clients

### ✅ Consider pi-web-ui for Agent Stream

Could replace `AgentStream.tsx` with `ChatPanel`:
- **Pros**: Battle-tested, markdown rendering, tool display, streaming
- **Cons**: Different styling, need to customize for terminal aesthetic, learning curve

### ✅ Already Using pi-agent-core

OpenClaw agents are built on pi-agent-core. Our dashboard correctly reads their session files. This is the intended architecture.

---

## Integration Options

### Option 1: Status Quo (Recommended for Now)

Keep current architecture. It's already aligned with pi.dev patterns:
- Backend manages tasks/plans/dispatches
- Frontend displays agent streams via SSE
- Agents run via OpenClaw (pi-coding-agent SDK)

**Effort:** None
**Risk:** None

### Option 2: Replace AgentStream with pi-web-ui

Import `ChatPanel` from `@mariozechner/pi-web-ui`:

```bash
npm install @mariozechner/pi-web-ui @mariozechner/pi-agent-core
```

**Pros:**
- Less custom code to maintain
- Built-in artifact rendering (HTML, SVG, Markdown)
- Better tool result display

**Cons:**
- Need to style to match terminal aesthetic
- May conflict with existing Tailwind setup
- Learning curve for agent integration

**Effort:** Medium
**Risk:** Medium

### Option 3: Hybrid - Use pi-web-ui Components Selectively

Import only useful pieces:
- `ArtifactsPanel` for HTML/SVG rendering
- Storage classes for IndexedDB persistence
- Keep custom AgentStream for terminal look

**Effort:** Low-Medium
**Risk:** Low

---

## Conclusion

**pi.dev is not a cloud service** — it's the **toolkit that powers OpenClaw**. Our dashboard's current architecture is already correct:

1. ✅ Backend manages structured data (tasks, plans, dispatches)
2. ✅ Frontend displays agent streams via SSE
3. ✅ Agents run locally via OpenClaw (pi-coding-agent SDK)

**No major architecture change needed.** Consider Option 3 (hybrid) if we want better artifact rendering or IndexedDB storage, but the current setup is solid.

---

## Key Takeaways

| Question | Answer |
|----------|--------|
| Is pi.dev a hosted platform? | **No** — it's NPM packages |
| Does it replace our backend? | **No** — we still need REST API + SQLite |
| Does it replace AgentStream? | **Optional** — could use ChatPanel component |
| Does it simplify architecture? | **No change needed** — already aligned |
| Should we migrate? | **Not required** — consider hybrid later |

---

## References

- [pi-mono GitHub](https://github.com/badlogic/pi-mono)
- [pi-web-ui package](https://github.com/badlogic/pi-mono/tree/main/packages/web-ui)
- [How to Build a Custom Agent Framework with PI](https://nader.substack.com/p/how-to-build-a-custom-agent-framework)
- [Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
