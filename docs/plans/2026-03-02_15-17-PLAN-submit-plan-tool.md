# [PLAN] Build submit_plan Tool for Agents
Date: 2026-03-02 15:17
Agent: main
Status: planning

## Summary
Create an agent tool called `submit_plan` that allows AI agents to submit planning documents. The tool will create a structured planning doc and populate the Kanban with PLANNING tasks automatically.

## Goals
- Agents can create plans programmatically
- Plans are structured, parseable markdown
- Tasks auto-created with proper `[TAG]` badges
- Planning docs stored in `docs/plans/`

## Tasks
- [ ] #26 Create submit_plan tool schema
- [ ] #27 Backend API endpoint for plan submission
- [ ] #28 Planning doc template and parser
- [ ] #29 Agent tool registration in OpenClaw config
- [ ] #30 Test: Agent submits plan → tasks appear in PLANNING

## Technical Notes
- Tool should accept: `tag`, `summary`, `tasks[]`, `notes`
- Output: planning doc path, created task IDs
- Location: `docs/plans/YYYY-MM-DD_HH-MM-TAG-name.md`
- Tasks get `dispatch_id` field linking to plan

## Dependencies
- Database needs `dispatch_id` field on tasks table
- Planning doc format must be parseable by frontend
- Frontend shows planning doc wrapper for PLANNING tasks

## Success Criteria
- Agent can call `submit_plan` with structured input
- Planning doc appears in `docs/plans/`
- Tasks appear in Kanban PLANNING column with `[TAG]` badge
- Planning doc is human-readable and machine-parseable
