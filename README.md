# Claw Agent Ops Dashboard

A real-time operations dashboard for managing AI agents and workflows. Built for OpenClaw.

## Features

### Agent Visibility
- Live SSE streams showing agent activity in real-time
- See what your agents are thinking, reading, and executing
- Per-agent color coding and identification

### Fixed Pipeline Workflow
```
IDEA → PLAN → REVIEW → DISPATCH → WORK → VERIFY
  ↓      ↓       ↓        ↓        ↓       ↓
IDEAS  PLANNING  human   TODO    agent   browser
column column  APPROVAL TASKS   WORKS   SNAPSHOT
```

- **IDEAS** - Capture raw ideas (never leave this column)
- **PLANNING** - Agent-agnostic tasks linked to plans
- **DISPATCH** - Assigned work wrapped in dispatch documents
- **IN_PROGRESS** - Agents actively working
- **BLOCKED** - Waiting on something
- **DONE** - Completed and ready to archive

### Research Library
- Pin important research for quick access
- Archive completed research
- Full-text search across all documents

## Tech Stack

**Backend:** Fastify + SQLite + SSE  
**Frontend:** React + Vite + TypeScript

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/ZeitbyteRepo/claw-agent-ops-dashboard.git
cd claw-agent-ops-dashboard

# Install all dependencies (backend + frontend)
npm install
```

### Running

```bash
# Run both backend and frontend in dev mode
npm run dev

# Or run separately:
npm run start     # Backend only (port 3001)
npm run dev:frontend  # Frontend only (port 5173)
```

- Backend runs on http://localhost:3001
- Frontend runs on http://localhost:5173

### Building for Production

```bash
npm run build
```

## Configuration

Edit `dashboard.config.json` to customize:

```json
{
  "project": {
    "name": "Agent Dashboard",
    "title": "Agent Dashboard"
  },
  "server": {
    "port": 3001
  },
  "agents": {
    "names": {
      "main": "Mr. Claw",
      "hephaestus": "Hephaestus",
      "athena": "Athena"
    },
    "colors": {
      "main": "#22d3ee",
      "hephaestus": "#f59e0b",
      "athena": "#8b5cf6"
    }
  }
}
```

### Environment Variables

| Variable | Config Path | Default |
|----------|-------------|---------|
| `DASHBOARD_PORT` | server.port | 3001 |
| `DASHBOARD_HOST` | server.host | 0.0.0.0 |
| `DASHBOARD_DB_PATH` | database.path | ./data/dashboard.db |
| `DASHBOARD_PROJECT_NAME` | project.name | Agent Dashboard |

## Architecture

### Instance-Per-Project

The dashboard is designed to run as isolated instances per project:

1. Copy the dashboard folder
2. Edit `dashboard.config.json` with project-specific settings
3. Set unique port and database path
4. Start the server

Each instance maintains its own:
- Database (tasks, plans, dispatches, research)
- Agent workspaces
- Configuration

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/tasks/:id` | PATCH | Update task |
| `/api/tasks/:id/archive` | POST | Archive task |
| `/api/plans` | GET/POST | List/create plans |
| `/api/dispatches` | GET/POST | List/create dispatches |
| `/api/research` | GET/POST | List/create research docs |
| `/api/agents/:id/stream` | GET | SSE stream for agent |
| `/api/dashboard-config` | GET | Frontend config |

## License

MIT
