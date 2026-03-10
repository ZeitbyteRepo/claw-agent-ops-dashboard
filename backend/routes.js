const { db } = require('./db');
const { getConfig } = require('./config');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load config
const config = getConfig();

// Event emitter for real-time updates
const messageEmitter = new EventEmitter();

// SSE clients with metadata
const sseClients = new Map();

// Heartbeat interval from config
const HEARTBEAT_INTERVAL = config.sse.heartbeatInterval;

// Clean up stale connections periodically
setInterval(() => {
  const now = Date.now();
  sseClients.forEach((client, res) => {
    if (now - client.lastActivity > 60000) {
      console.log('[SSE] Cleaning up stale connection');
      try {
        res.end();
      } catch (e) {}
      sseClients.delete(res);
    }
  });
}, 30000);

// Broadcast event to all SSE clients
function broadcastEvent(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data });
  const message = `data: ${payload}\n\n`;
  
  sseClients.forEach((client, res) => {
    try {
      res.write(message);
      client.lastActivity = Date.now();
    } catch (e) {
      console.log('[SSE] Failed to write to client, removing');
      sseClients.delete(res);
    }
  });
}

// Broadcast new stream message to all SSE clients
function broadcastMessage(message) {
  broadcastEvent('message', message);
}

// Save message to database and broadcast to all SSE clients
function saveAndBroadcastMessage(message) {
  const { agent_id, role, content } = message;
  
  if (!agent_id || !role || !content) {
    console.log('[Stream] Missing required fields, skipping save');
    broadcastMessage(message); // Still broadcast even if we can't save
    return message;
  }
  
  try {
    // Insert into database
    const result = db.prepare(`
      INSERT INTO stream_messages (agent_id, role, content) 
      VALUES (?, ?, ?)
    `).run(agent_id, role, content);
    
    // Clean up old messages (keep last 100 per agent)
    db.prepare(`
      DELETE FROM stream_messages 
      WHERE agent_id = ? AND id NOT IN (
        SELECT id FROM stream_messages 
        WHERE agent_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      )
    `).run(agent_id, agent_id);
    
    console.log('[Stream] Saved message to DB, id=' + result.lastInsertRowid);
  } catch (e) {
    console.error('[Stream] Failed to save message:', e.message);
  }
  
  // Always broadcast, even if save failed
  broadcastMessage(message);
  return message;
}

// Broadcast agent status change (online/offline/update)
function broadcastAgentEvent(agent, event) {
  broadcastEvent('agent_event', { agent, event });
}

// Broadcast task changes (create/update/delete)
function broadcastTaskEvent(task, event) {
  broadcastEvent('task_event', { task, event });
}

// Broadcast plan changes
function broadcastPlanEvent(plan, event) {
  broadcastEvent('plan_event', { plan, event });
}

// Broadcast dispatch changes
function broadcastDispatchEvent(dispatch, event) {
  broadcastEvent('dispatch_event', { dispatch, event });
}

// Broadcast billboard changes
function broadcastBillboardEvent(billboard, event) {
  broadcastEvent('billboard_event', { billboard, event });
}

// Task routes
async function taskRoutes(fastify, options) {
  // GET /api/tasks - list all tasks
  fastify.get('/api/tasks', async (request, reply) => {
    const { plan_id, dispatch_id, agent_id, status, archived } = request.query;
    
    let sql = `
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
    `;
    const conditions = [];
    const params = [];
    
    if (plan_id) {
      conditions.push('t.plan_id = ?');
      params.push(plan_id);
    }
    if (dispatch_id) {
      conditions.push('t.dispatch_id = ?');
      params.push(dispatch_id);
    }
    if (agent_id) {
      conditions.push('t.agent_id = ?');
      params.push(agent_id);
    }
    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    
    // Filter archived items - by default exclude archived, include only if archived=true
    if (archived === 'true') {
      conditions.push('t.archived_at IS NOT NULL');
    } else if (archived !== 'all') {
      conditions.push('t.archived_at IS NULL');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Order by priority for ideas (0 = unprioritized, goes to bottom), created_at for others
    if (status === 'ideas') {
      sql += ' ORDER BY CASE WHEN t.priority = 0 OR t.priority IS NULL THEN 999 ELSE t.priority END ASC, t.created_at DESC';
    } else {
      sql += ' ORDER BY t.created_at DESC';
    }
    
    const tasks = db.prepare(sql).all(...params);
    return tasks;
  });

  // GET /api/tasks/grouped - tasks grouped by dispatch_id for TODO column
  fastify.get('/api/tasks/grouped', async (request, reply) => {
    const { status = 'todo' } = request.query;
    
    // Get all tasks with the given status
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, 
             d.title as dispatch_title, d.status as dispatch_status
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.status = ? AND t.archived_at IS NULL
      ORDER BY t.dispatch_id, t.created_at
    `).all(status);
    
    // Group by dispatch_id
    const grouped = {
      unassigned: [], // tasks without a dispatch
      dispatches: {}  // tasks keyed by dispatch_id
    };
    
    for (const task of tasks) {
      if (task.dispatch_id === null) {
        grouped.unassigned.push(task);
      } else {
        if (!grouped.dispatches[task.dispatch_id]) {
          grouped.dispatches[task.dispatch_id] = {
            dispatch_id: task.dispatch_id,
            dispatch_title: task.dispatch_title,
            dispatch_status: task.dispatch_status,
            plan_id: task.plan_id,
            plan_title: task.plan_title,
            plan_tag: task.plan_tag,
            tasks: []
          };
        }
        grouped.dispatches[task.dispatch_id].tasks.push(task);
      }
    }
    
    return grouped;
  });

  // POST /api/tasks - create task
  fastify.post('/api/tasks', async (request, reply) => {
    const { title, status = 'todo', agent_id = null, plan_id = null, dispatch_id = null, notes = null, code = null } = request.body;
    
    if (!title) {
      reply.code(400);
      return { error: 'Title is required' };
    }

    // Ideas require code and notes
    if (status === 'ideas') {
      if (!code || !code.trim()) {
        reply.code(400);
        return { error: 'Code is required for ideas' };
      }
      if (!notes || !notes.trim()) {
        reply.code(400);
        return { error: 'Notes are required for ideas' };
      }
      // Check code uniqueness among ideas
      const existingIdea = db.prepare('SELECT id FROM tasks WHERE status = ? AND code = ? AND archived_at IS NULL').get('ideas', code.trim().toUpperCase());
      if (existingIdea) {
        reply.code(400);
        return { error: `Code "${code}" already exists on another idea` };
      }
    }

    // PLANNING status requires a plan_id - tasks in PLANNING must be part of a plan
    if (status === 'planning' && !plan_id) {
      reply.code(400);
      return { error: 'Tasks with status="planning" must have a plan_id. Create a plan first, then add tasks to it.' };
    }

    // Auto-inherit code from plan's linked idea if not provided
    let finalCode = code;
    if (!finalCode && plan_id) {
      const plan = db.prepare('SELECT idea_id FROM plans WHERE id = ?').get(plan_id);
      if (plan && plan.idea_id) {
        const idea = db.prepare('SELECT code FROM tasks WHERE id = ?').get(plan.idea_id);
        if (idea && idea.code) {
          finalCode = idea.code;
        }
      }
    }

    // Validate code matches an existing idea if provided (skip for ideas themselves)
    if (finalCode && status !== 'ideas') {
      const idea = db.prepare('SELECT id FROM tasks WHERE status = ? AND code = ?').get('ideas', finalCode);
      if (!idea) {
        reply.code(400);
        return { error: 'Code does not match any existing idea' };
      }
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, status, agent_id, plan_id, dispatch_id, notes, code) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, status, agent_id, plan_id, dispatch_id, notes, finalCode);

    const task = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);
    
    // Broadcast task created
    broadcastTaskEvent(task, 'created');
    
    return task;
  });

  // PATCH /api/tasks/:id - update task
  fastify.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const allowedFields = ['title', 'status', 'agent_id', 'plan_id', 'dispatch_id', 'notes', 'archived_at', 'code', 'priority'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      reply.code(400);
      return { error: 'No valid fields to update' };
    }

    // Validate code matches an existing idea if provided
    if (updates.code) {
      const idea = db.prepare('SELECT id FROM tasks WHERE status = ? AND code = ?').get('ideas', updates.code);
      if (!idea) {
        reply.code(400);
        return { error: 'Code does not match any existing idea' };
      }
    }

    // PLANNING status requires a plan_id - tasks in PLANNING must be part of a plan
    if (updates.status === 'planning') {
      // Check if plan_id is being set in this update OR already exists on the task
      const existingTask = db.prepare('SELECT plan_id FROM tasks WHERE id = ?').get(id);
      if (!updates.plan_id && !existingTask?.plan_id) {
        reply.code(400);
        return { error: 'Tasks with status="planning" must have a plan_id. Create a plan first, then add tasks to it.' };
      }
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE tasks SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    
    const task = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.id = ?
    `).get(id);
    
    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }
    
    // Broadcast task updated
    broadcastTaskEvent(task, 'updated');
    
    return task;
  });

  // DELETE /api/tasks/:id - delete task
  fastify.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    
    const task = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.id = ?
    `).get(id);
    
    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }
    
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    
    // Broadcast task deleted
    broadcastTaskEvent(task, 'deleted');
    
    return { success: true, id };
  });

  // POST /api/tasks/:id/archive - archive a task
  fastify.post('/api/tasks/:id/archive', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`UPDATE tasks SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    
    const task = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.id = ?
    `).get(id);
    
    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }
    
    broadcastTaskEvent(task, 'archived');
    
    return task;
  });

  // POST /api/tasks/archive-done - archive all done tasks
  fastify.post('/api/tasks/archive-done', async (request, reply) => {
    // Get all done tasks that aren't already archived
    const tasksToArchive = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.status = 'done' AND t.archived_at IS NULL
    `).all();
    
    if (tasksToArchive.length === 0) {
      return { success: true, archivedCount: 0, message: 'No done tasks to archive' };
    }
    
    // Archive all done tasks
    const result = db.prepare(`
      UPDATE tasks 
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'done' AND archived_at IS NULL
    `).run();
    
    // Broadcast each archived task
    tasksToArchive.forEach(task => {
      task.archived_at = new Date().toISOString();
      broadcastTaskEvent(task, 'archived');
    });
    
    return { 
      success: true, 
      archivedCount: result.changes,
      message: `Archived ${result.changes} done tasks`
    };
  });

  // POST /api/tasks/archive-ideas - archive all ideas
  fastify.post('/api/tasks/archive-ideas', async (request, reply) => {
    // Get all ideas that aren't already archived
    const tasksToArchive = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.status = 'ideas' AND t.archived_at IS NULL
    `).all();
    
    if (tasksToArchive.length === 0) {
      return { success: true, archivedCount: 0, message: 'No ideas to archive' };
    }
    
    // Archive all ideas
    const result = db.prepare(`
      UPDATE tasks 
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'ideas' AND archived_at IS NULL
    `).run();
    
    // Broadcast each archived task
    tasksToArchive.forEach(task => {
      task.archived_at = new Date().toISOString();
      broadcastTaskEvent(task, 'archived');
    });
    
    return { 
      success: true, 
      archivedCount: result.changes,
      message: `Archived ${result.changes} ideas`
    };
  });

  // POST /api/tasks/:id/restore - restore an archived task
  fastify.post('/api/tasks/:id/restore', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`UPDATE tasks SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    
    const task = db.prepare(`
      SELECT t.*, a.name as agent_name, p.title as plan_title, p.tag as plan_tag, d.title as dispatch_title
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN dispatches d ON t.dispatch_id = d.id
      WHERE t.id = ?
    `).get(id);
    
    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }
    
    broadcastTaskEvent(task, 'restored');
    
    return task;
  });
}

// Plan routes
async function planRoutes(fastify, options) {
  // GET /api/plans - list all plans with tasks
  fastify.get('/api/plans', async (request, reply) => {
    const { archived } = request.query;
    
    let sql = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id) as task_count,
        (SELECT COUNT(*) FROM dispatches WHERE plan_id = p.id) as dispatch_count
      FROM plans p 
    `;
    
    // Filter archived items - by default exclude archived, include only if archived=true
    if (archived === 'true') {
      sql += ' WHERE p.archived_at IS NOT NULL';
    } else if (archived !== 'all') {
      sql += ' WHERE p.archived_at IS NULL';
    }
    
    sql += ' ORDER BY p.created_at DESC';
    
    const plans = db.prepare(sql).all();
    
    // Fetch tasks for each plan
    const tasksStmt = db.prepare('SELECT * FROM tasks WHERE plan_id = ? ORDER BY created_at ASC');
    const plansWithTasks = plans.map(plan => ({
      ...plan,
      tasks: tasksStmt.all(plan.id)
    }));
    
    return plansWithTasks;
  });

  // GET /api/plans/archived - get archived/stale plans
  fastify.get('/api/plans/archived', async (request, reply) => {
    // Get plans that are either:
    // 1. Explicitly archived (archived_at IS NOT NULL)
    // 2. Stale (all child tasks are done and plan status is 'completed')
    const plans = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id AND status = 'done') as done_task_count
      FROM plans p 
      WHERE p.archived_at IS NOT NULL
         OR (p.status = 'completed' 
             AND (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id) > 0
             AND (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id AND status != 'done') = 0)
      ORDER BY p.updated_at DESC
    `).all();
    return plans;
  });

  // GET /api/plans/:id - get single plan with tasks and dispatches
  fastify.get('/api/plans/:id', async (request, reply) => {
    const { id } = request.params;
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.plan_id = ?
      ORDER BY t.created_at
    `).all(id);
    
    const dispatches = db.prepare(`
      SELECT * FROM dispatches WHERE plan_id = ? ORDER BY created_at
    `).all(id);
    
    return { ...plan, tasks, dispatches };
  });

  // POST /api/plans - create plan
  fastify.post('/api/plans', async (request, reply) => {
    const { idea_id, tag, title, summary, content, status = 'planning' } = request.body;
    
    if (!title) {
      reply.code(400);
      return { error: 'Title is required' };
    }

    try {
      const result = db.prepare(`
        INSERT INTO plans (idea_id, tag, title, summary, content, status) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(idea_id || null, tag || null, title, summary || null, content || null, status);

      const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(result.lastInsertRowid);
      
      broadcastPlanEvent(plan, 'created');
      
      return plan;
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT' && e.message.includes('tag')) {
        reply.code(400);
        return { error: 'Plan tag must be unique' };
      }
      throw e;
    }
  });

  // PATCH /api/plans/:id - update plan
  fastify.patch('/api/plans/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const allowedFields = ['tag', 'title', 'summary', 'content', 'status'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      reply.code(400);
      return { error: 'No valid fields to update' };
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    try {
      db.prepare(`UPDATE plans SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT' && e.message.includes('tag')) {
        reply.code(400);
        return { error: 'Plan tag must be unique' };
      }
      throw e;
    }
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    broadcastPlanEvent(plan, 'updated');
    
    return plan;
  });

  // DELETE /api/plans/:id - delete plan
  fastify.delete('/api/plans/:id', async (request, reply) => {
    const { id } = request.params;
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    // Delete associated tasks and dispatches
    db.prepare('DELETE FROM tasks WHERE plan_id = ?').run(id);
    db.prepare('DELETE FROM dispatches WHERE plan_id = ?').run(id);
    db.prepare('DELETE FROM plans WHERE id = ?').run(id);
    
    broadcastPlanEvent(plan, 'deleted');
    
    return { success: true, id };
  });

  // POST /api/plans/:id/archive - archive a plan
  fastify.post('/api/plans/:id/archive', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`UPDATE plans SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = 'archived' WHERE id = ?`).run(id);
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    broadcastPlanEvent(plan, 'archived');
    
    return plan;
  });

  // POST /api/plans/:id/restore - restore an archived plan
  fastify.post('/api/plans/:id/restore', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`UPDATE plans SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP, status = 'active' WHERE id = ?`).run(id);
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    broadcastPlanEvent(plan, 'restored');
    
    return plan;
  });

  // GET /api/plans/:id/export - export plan as markdown
  fastify.get('/api/plans/:id/export', async (request, reply) => {
    const { id } = request.params;
    
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    if (!plan) {
      reply.code(404);
      return { error: 'Plan not found' };
    }
    
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.plan_id = ?
      ORDER BY t.status, t.created_at
    `).all(id);
    
    const dispatches = db.prepare(`
      SELECT * FROM dispatches WHERE plan_id = ? ORDER BY created_at
    `).all(id);
    
    // Build markdown
    let md = `# ${plan.title}\n\n`;
    if (plan.tag) md += `**Tag:** ${plan.tag}\n\n`;
    if (plan.summary) md += `${plan.summary}\n\n`;
    md += `**Status:** ${plan.status}\n`;
    md += `**Created:** ${plan.created_at}\n\n`;
    
    if (dispatches.length > 0) {
      md += `## Dispatches\n\n`;
      for (const d of dispatches) {
        md += `### ${d.title}\n`;
        md += `- **Target:** ${d.target_agent}\n`;
        md += `- **Status:** ${d.status}\n\n`;
      }
    }
    
    if (tasks.length > 0) {
      md += `## Tasks\n\n`;
      const byStatus = { todo: [], in_progress: [], done: [] };
      for (const t of tasks) {
        byStatus[t.status]?.push(t);
      }
      
      if (byStatus.todo.length) {
        md += `### Todo\n`;
        for (const t of byStatus.todo) {
          md += `- [ ] ${t.title}${t.agent_name ? ` (${t.agent_name})` : ''}\n`;
        }
        md += '\n';
      }
      if (byStatus.in_progress.length) {
        md += `### In Progress\n`;
        for (const t of byStatus.in_progress) {
          md += `- [~] ${t.title}${t.agent_name ? ` (${t.agent_name})` : ''}\n`;
        }
        md += '\n';
      }
      if (byStatus.done.length) {
        md += `### Done\n`;
        for (const t of byStatus.done) {
          md += `- [x] ${t.title}${t.agent_name ? ` (${t.agent_name})` : ''}\n`;
        }
        md += '\n';
      }
    }
    
    reply.header('Content-Type', 'text/markdown');
    reply.header('Content-Disposition', `attachment; filename="plan-${plan.tag || plan.id}.md"`);
    return md;
  });
}

// Dispatch routes
async function dispatchRoutes(fastify, options) {
  // GET /api/dispatches - list all dispatches
  fastify.get('/api/dispatches', async (request, reply) => {
    const { plan_id, archived } = request.query;
    
    let sql = `
      SELECT d.*, p.title as plan_title, p.tag as plan_tag,
        (SELECT COUNT(*) FROM tasks WHERE dispatch_id = d.id) as task_count
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
    `;
    const conditions = [];
    const params = [];
    
    if (plan_id) {
      conditions.push('d.plan_id = ?');
      params.push(plan_id);
    }
    
    // Filter archived items - by default exclude archived, include only if archived=true
    if (archived === 'true') {
      conditions.push('d.archived_at IS NOT NULL');
    } else if (archived !== 'all') {
      conditions.push('d.archived_at IS NULL');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY d.created_at DESC';
    
    const dispatches = db.prepare(sql).all(...params);
    return dispatches;
  });

  // GET /api/dispatches/archived - get archived/completed dispatches
  fastify.get('/api/dispatches/archived', async (request, reply) => {
    const dispatches = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag,
        (SELECT COUNT(*) FROM tasks WHERE dispatch_id = d.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE dispatch_id = d.id AND status = 'done') as done_task_count
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.archived_at IS NOT NULL
         OR d.status = 'done'
         OR d.status = 'archived'
      ORDER BY d.updated_at DESC
    `).all();
    return dispatches;
  });

  // GET /api/dispatches/:id - get single dispatch
  fastify.get('/api/dispatches/:id', async (request, reply) => {
    const { id } = request.params;
    
    const dispatch = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.id = ?
    `).get(id);
    
    if (!dispatch) {
      reply.code(404);
      return { error: 'Dispatch not found' };
    }
    
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM tasks t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.dispatch_id = ?
      ORDER BY t.created_at
    `).all(id);
    
    return { ...dispatch, tasks };
  });

  // POST /api/dispatches - create dispatch
  fastify.post('/api/dispatches', async (request, reply) => {
    const { plan_id, title, target_agent, status = 'pending' } = request.body;
    
    if (!title || !target_agent) {
      reply.code(400);
      return { error: 'Title and target_agent are required' };
    }

    const result = db.prepare(`
      INSERT INTO dispatches (plan_id, title, target_agent, status) 
      VALUES (?, ?, ?, ?)
    `).run(plan_id || null, title, target_agent, status);

    const dispatch = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.id = ?
    `).get(result.lastInsertRowid);
    
    broadcastDispatchEvent(dispatch, 'created');
    
    return dispatch;
  });

  // PATCH /api/dispatches/:id - update dispatch
  fastify.patch('/api/dispatches/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const allowedFields = ['title', 'target_agent', 'status'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      reply.code(400);
      return { error: 'No valid fields to update' };
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE dispatches SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    
    const dispatch = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.id = ?
    `).get(id);
    
    if (!dispatch) {
      reply.code(404);
      return { error: 'Dispatch not found' };
    }
    
    broadcastDispatchEvent(dispatch, 'updated');
    
    return dispatch;
  });

  // DELETE /api/dispatches/:id - delete dispatch
  fastify.delete('/api/dispatches/:id', async (request, reply) => {
    const { id } = request.params;
    
    const dispatch = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(id);
    
    if (!dispatch) {
      reply.code(404);
      return { error: 'Dispatch not found' };
    }
    
    // Unlink tasks from this dispatch (set dispatch_id to null)
    db.prepare('UPDATE tasks SET dispatch_id = NULL WHERE dispatch_id = ?').run(id);
    db.prepare('DELETE FROM dispatches WHERE id = ?').run(id);
    
    broadcastDispatchEvent(dispatch, 'deleted');
    
    return { success: true, id };
  });

  // POST /api/dispatches/:id/archive - archive a dispatch
  fastify.post('/api/dispatches/:id/archive', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`UPDATE dispatches SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = 'archived' WHERE id = ?`).run(id);
    
    const dispatch = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.id = ?
    `).get(id);
    
    if (!dispatch) {
      reply.code(404);
      return { error: 'Dispatch not found' };
    }
    
    broadcastDispatchEvent(dispatch, 'archived');
    
    return dispatch;
  });

  // POST /api/dispatches/:id/restore - restore an archived dispatch
  fastify.post('/api/dispatches/:id/restore', async (request, reply) => {
    const { id } = request.params;
    
    // Restore to 'done' status since it was archived after completion
    db.prepare(`UPDATE dispatches SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP, status = 'done' WHERE id = ?`).run(id);
    
    const dispatch = db.prepare(`
      SELECT d.*, p.title as plan_title, p.tag as plan_tag
      FROM dispatches d 
      LEFT JOIN plans p ON d.plan_id = p.id
      WHERE d.id = ?
    `).get(id);
    
    if (!dispatch) {
      reply.code(404);
      return { error: 'Dispatch not found' };
    }
    
    broadcastDispatchEvent(dispatch, 'restored');
    
    return dispatch;
  });
}

// Agent routes
async function agentRoutes(fastify, options) {
  // GET /api/agents - list agents
  fastify.get('/api/agents', async (request, reply) => {
    const agents = db.prepare('SELECT * FROM agents ORDER BY last_seen DESC').all();
    return agents;
  });

  // POST /api/agents - create or update agent (registers as online)
  fastify.post('/api/agents', async (request, reply) => {
    const { id, name, status = 'idle' } = request.body;
    
    if (!id || !name) {
      reply.code(400);
      return { error: 'ID and name are required' };
    }

    // Check if this is a new agent
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    const isNew = !existing;

    db.prepare(`
      INSERT INTO agents (id, name, status, last_seen) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name,
        status = excluded.status,
        last_seen = CURRENT_TIMESTAMP
    `).run(id, name, status);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    
    // Broadcast agent event (online for new, update for existing)
    broadcastAgentEvent(agent, isNew ? 'online' : 'update');
    
    return agent;
  });

  // DELETE /api/agents/:id - remove agent (marks as offline)
  fastify.delete('/api/agents/:id', async (request, reply) => {
    const { id } = request.params;
    
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!agent) {
      reply.code(404);
      return { error: 'Agent not found' };
    }
    
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    broadcastAgentEvent(agent, 'offline');
    
    return { success: true };
  });

  // POST /api/agents/:id/inject - inject a message into agent's stream
  fastify.post('/api/agents/:id/inject', async (request, reply) => {
    const { id } = request.params;
    const { message } = request.body;
    
    if (!message) {
      reply.code(400);
      return { error: 'Message is required' };
    }
    
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!agent) {
      reply.code(404);
      return { error: 'Agent not found' };
    }
    
    // Save message to stream with special marker for injected
    const result = db.prepare(`
      INSERT INTO stream_messages (agent_id, role, content) 
      VALUES (?, ?, ?)
    `).run(id, 'user', `💬 ${message}`);
    
    const savedMessage = db.prepare('SELECT * FROM stream_messages WHERE id = ?').get(result.lastInsertRowid);
    
    // Broadcast message event
    broadcastMessage(savedMessage);
    
    // Actually send to agent session via OpenClaw CLI (synchronous to ensure delivery)
    const { execSync } = require('child_process');
    try {
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const output = execSync(`openclaw agent --agent "${id}" --message "${escapedMessage}"`, {
        encoding: 'utf8',
        timeout: 10000,
        windowsHide: true
      });
      console.log(`[inject] Message sent to ${id}:`, output.trim());
    } catch (err) {
      console.error(`[inject] Failed to send message to ${id}:`, err.message);
      // Still return success since message is saved to stream
    }
    
    return { success: true, message: savedMessage, sentToAgent: true };
  });

  // PATCH /api/agents/:id/status - update agent status
  fastify.patch('/api/agents/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;
    
    if (!status) {
      reply.code(400);
      return { error: 'Status is required' };
    }

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!agent) {
      reply.code(404);
      return { error: 'Agent not found' };
    }

    db.prepare(`
      UPDATE agents SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);

    const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    
    // Broadcast status update
    broadcastAgentEvent(updatedAgent, 'update');
    
    return updatedAgent;
  });
}

// Stream routes
async function streamRoutes(fastify, options) {
  // GET /api/streams - get recent messages from all agents
  fastify.get('/api/streams', async (request, reply) => {
    const limit = parseInt(request.query.limit) || 50;
    // Get latest N messages per agent using subquery
    const messages = db.prepare(`
      SELECT sm.*, a.name as agent_name 
      FROM stream_messages sm 
      LEFT JOIN agents a ON sm.agent_id = a.id 
      WHERE sm.id IN (
        SELECT id FROM stream_messages sm2 
        WHERE sm2.agent_id = sm.agent_id 
        ORDER BY sm2.created_at DESC 
        LIMIT ?
      )
      ORDER BY sm.created_at DESC
    `).all(limit);
    return messages;
  });

  // GET /api/streams/:agentId - get messages for specific agent
  fastify.get('/api/streams/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    const limit = parseInt(request.query.limit) || 100;
    
    const messages = db.prepare(`
      SELECT sm.*, a.name as agent_name 
      FROM stream_messages sm 
      LEFT JOIN agents a ON sm.agent_id = a.id 
      WHERE sm.agent_id = ?
      ORDER BY sm.created_at DESC 
      LIMIT ?
    `).all(agentId, limit);
    
    return messages;
  });

  // POST /api/streams - add a new message (for testing)
  fastify.post('/api/streams', async (request, reply) => {
    const { agent_id, role, content } = request.body;
    
    if (!agent_id || !role || !content) {
      reply.code(400);
      return { error: 'agent_id, role, and content are required' };
    }

    const result = db.prepare(`
      INSERT INTO stream_messages (agent_id, role, content) 
      VALUES (?, ?, ?)
    `).run(agent_id, role, content);

    const message = db.prepare(`
      SELECT sm.*, a.name as agent_name 
      FROM stream_messages sm 
      LEFT JOIN agents a ON sm.agent_id = a.id 
      WHERE sm.id = ?
    `).get(result.lastInsertRowid);

    // Broadcast to SSE clients
    broadcastMessage(message);
    
    return message;
  });

  // GET /api/streams/live - SSE endpoint for real-time updates
  fastify.get('/api/streams/live', async (request, reply) => {
    // Disable all Fastify timeout and response handling
    request.raw.setTimeout(0);
    reply.raw.setTimeout(0);
    reply.raw.socket.setNoDelay(true);
    reply.raw.socket.setKeepAlive(true);
    
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'  // Disable nginx buffering
    });

    // Send initial connection message
    reply.raw.write('data: {"type":"connected"}\n\n');

    // Add client to map with metadata
    sseClients.set(reply.raw, {
      lastActivity: Date.now(),
      heartbeatInterval: null
    });

    console.log('[SSE] Client connected. Total clients:', sseClients.size);

    // Set up heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        // Send comment as heartbeat (ignored by EventSource but keeps connection alive)
        reply.raw.write(': heartbeat\n\n');
        sseClients.get(reply.raw).lastActivity = Date.now();
      } catch (e) {
        console.log('[SSE] Heartbeat failed, client disconnected');
        clearInterval(heartbeatInterval);
        sseClients.delete(reply.raw);
      }
    }, HEARTBEAT_INTERVAL);

    sseClients.get(reply.raw).heartbeatInterval = heartbeatInterval;

    // Handle client disconnect
    request.raw.on('close', () => {
      console.log('[SSE] Client disconnected. Total clients:', sseClients.size - 1);
      clearInterval(heartbeatInterval);
      sseClients.delete(reply.raw);
    });

    // Handle errors
    request.raw.on('error', (err) => {
      console.log('[SSE] Connection error:', err.message);
      clearInterval(heartbeatInterval);
      sseClients.delete(reply.raw);
    });

    // Keep connection alive - don't return, let it hang
    return reply;
  });
}

// Agent config file routes
async function configRoutes(fastify, options) {
  const CONFIG_FILES = ['SOUL.md', 'USER.md', 'MEMORY.md', 'TOOLS.md', 'IDENTITY.md'];
  const { paths } = config;
  
  // Get workspace directory for an agent
  function getAgentWorkspace(agentId) {
    // Check if there's a configured workspace for this agent
    if (paths.agentWorkspaces && paths.agentWorkspaces[agentId]) {
      return paths.agentWorkspaces[agentId];
    }
    
    // Main agent uses the root workspace
    if (agentId === 'main') {
      return paths.openclawWorkspace;
    }
    
    // Other agents: fallback to agent directory in .openclaw
    return path.join(paths.openclawAgents, agentId, 'workspace');
  }
  
  // GET /api/agents/:id/config - get all config files for an agent
  fastify.get('/api/agents/:id/config', async (request, reply) => {
    const { id } = request.params;
    const workspaceDir = getAgentWorkspace(id);
    
    // Check if workspace directory exists
    if (!fs.existsSync(workspaceDir)) {
      reply.code(404);
      return { error: 'Agent workspace not found' };
    }
    
    const files = [];
    
    for (const filename of CONFIG_FILES) {
      const filePath = path.join(workspaceDir, filename);
      let content = '';
      
      try {
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf8');
        }
      } catch (e) {
        console.error(`[Config] Failed to read ${filename}:`, e.message);
      }
      
      files.push({
        path: filename,
        filename: filename,
        content: content,
        modified: false
      });
    }
    
    return {
      agent_id: id,
      files: files,
      last_modified: new Date().toISOString()
    };
  });
  
  // PUT /api/agents/:id/config/:filename - update a specific config file
  fastify.put('/api/agents/:id/config/:filename', async (request, reply) => {
    const { id, filename } = request.params;
    const { content } = request.body;
    
    // Validate filename
    if (!CONFIG_FILES.includes(filename)) {
      reply.code(400);
      return { error: 'Invalid config filename' };
    }
    
    const workspaceDir = getAgentWorkspace(id);
    const filePath = path.join(workspaceDir, filename);
    
    // Check if workspace directory exists
    if (!fs.existsSync(workspaceDir)) {
      reply.code(404);
      return { error: 'Agent workspace not found' };
    }
    
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Config] Updated ${filename} for agent ${id}`);
      
      return {
        success: true,
        message: `Updated ${filename} successfully`,
        path: filename,
        size: content.length
      };
    } catch (e) {
      console.error(`[Config] Failed to write ${filename}:`, e.message);
      reply.code(500);
      return { 
        success: false,
        error: `Failed to write ${filename}: ${e.message}` 
      };
    }
  });
  
  // POST /api/agents/:id/config - save multiple config files at once
  fastify.post('/api/agents/:id/config', async (request, reply) => {
    const { id } = request.params;
    const { files } = request.body;
    
    if (!Array.isArray(files)) {
      reply.code(400);
      return { error: 'files must be an array' };
    }
    
    const workspaceDir = getAgentWorkspace(id);
    
    // Check if workspace directory exists
    if (!fs.existsSync(workspaceDir)) {
      reply.code(404);
      return { error: 'Agent workspace not found' };
    }
    
    const saved = [];
    const errors = [];
    
    for (const file of files) {
      const { filename, content, modified } = file;
      
      // Skip unmodified files
      if (!modified) continue;
      
      // Validate filename
      if (!CONFIG_FILES.includes(filename)) {
        errors.push(`${filename}: invalid filename`);
        continue;
      }
      
      const filePath = path.join(workspaceDir, filename);
      
      try {
        fs.writeFileSync(filePath, content, 'utf8');
        saved.push(filename);
        console.log(`[Config] Saved ${filename} for agent ${id}`);
      } catch (e) {
        console.error(`[Config] Failed to write ${filename}:`, e.message);
        errors.push(`${filename}: ${e.message}`);
      }
    }
    
    return {
      success: errors.length === 0,
      saved,
      errors
    };
  });
}

// Billboard routes
async function billboardRoutes(fastify, options) {
  // GET /api/billboards - get all billboards
  // Auto-expires billboards older than 5 minutes (300 seconds)
  fastify.get('/api/billboards', async (request, reply) => {
    const billboards = db.prepare(`
      SELECT b.*, a.name as agent_name 
      FROM billboards b 
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.updated_at > datetime('now', '-5 minutes')
         OR b.message_type = 'success'
    `).all();
    return billboards;
  });

  // GET /api/billboards/:agentId - get billboard for specific agent
  fastify.get('/api/billboards/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    
    const billboard = db.prepare(`
      SELECT b.*, a.name as agent_name 
      FROM billboards b 
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id = ?
        AND (b.updated_at > datetime('now', '-5 minutes')
             OR b.message_type = 'success')
    `).get(agentId);
    
    if (!billboard) {
      reply.code(404);
      return { error: 'Billboard not found or expired' };
    }
    
    return billboard;
  });

  // PUT /api/billboards/:agentId - update billboard (agent posts a message)
  fastify.put('/api/billboards/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    const { message, message_type = 'info', progress = null } = request.body;
    
    // Validate message_type
    const validTypes = ['info', 'warning', 'success', 'error', 'progress'];
    if (!validTypes.includes(message_type)) {
      reply.code(400);
      return { error: 'Invalid message_type. Must be one of: ' + validTypes.join(', ') };
    }
    
    // Validate progress
    if (progress !== null && (progress < 0 || progress > 100)) {
      reply.code(400);
      return { error: 'Progress must be between 0 and 100' };
    }
    
    // Check if agent exists
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agent) {
      reply.code(404);
      return { error: 'Agent not found' };
    }
    
    // Upsert billboard
    db.prepare(`
      INSERT INTO billboards (agent_id, message, message_type, progress, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(agent_id) DO UPDATE SET
        message = excluded.message,
        message_type = excluded.message_type,
        progress = excluded.progress,
        updated_at = CURRENT_TIMESTAMP
    `).run(agentId, message, message_type, progress);
    
    const billboard = db.prepare(`
      SELECT b.*, a.name as agent_name 
      FROM billboards b 
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id = ?
    `).get(agentId);
    
    // Broadcast billboard update to SSE clients
    broadcastBillboardEvent(billboard, 'updated');
    
    return billboard;
  });

  // DELETE /api/billboards/:agentId - clear billboard
  fastify.delete('/api/billboards/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    
    const billboard = db.prepare('SELECT * FROM billboards WHERE agent_id = ?').get(agentId);
    if (!billboard) {
      reply.code(404);
      return { error: 'Billboard not found' };
    }
    
    // Clear the message but keep the billboard row
    db.prepare(`
      UPDATE billboards SET message = NULL, message_type = 'info', progress = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = ?
    `).run(agentId);
    
    const clearedBillboard = db.prepare(`
      SELECT b.*, a.name as agent_name 
      FROM billboards b 
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id = ?
    `).get(agentId);
    
    // Broadcast billboard cleared
    broadcastBillboardEvent(clearedBillboard, 'cleared');
    
    return { success: true, billboard: clearedBillboard };
  });
}

// Research docs routes
async function researchRoutes(fastify, options) {
  // GET /api/research - list all research docs
  fastify.get('/api/research', async (request, reply) => {
    const { pinned, archived, tag } = request.query;
    
    let sql = 'SELECT * FROM research_docs';
    const conditions = [];
    const params = [];
    
    if (pinned === 'true') {
      conditions.push('pinned = 1');
    } else if (pinned === 'false') {
      conditions.push('pinned = 0');
    }
    
    if (archived === 'true') {
      conditions.push('archived_at IS NOT NULL');
    } else if (archived !== 'all') {
      conditions.push('archived_at IS NULL');
    }
    
    if (tag) {
      conditions.push('tags LIKE ?');
      params.push(`%${tag}%`);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY pinned DESC, created_at DESC';
    
    const docs = db.prepare(sql).all(...params);
    return docs;
  });

  // GET /api/research/pinned - get pinned docs only
  fastify.get('/api/research/pinned', async (request, reply) => {
    const docs = db.prepare(`
      SELECT * FROM research_docs 
      WHERE pinned = 1 AND archived_at IS NULL
      ORDER BY created_at DESC
    `).all();
    return docs;
  });

  // GET /api/research/:id - get single research doc
  fastify.get('/api/research/:id', async (request, reply) => {
    const { id } = request.params;
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    // Read file content if path exists
    if (doc.path) {
      try {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(__dirname, '..', doc.path);
        doc.content = fs.readFileSync(fullPath, 'utf8');
      } catch (err) {
        console.error('Failed to read research file:', err);
        doc.content = null;
      }
    }
    
    return doc;
  });

  // POST /api/research - create new research doc
  fastify.post('/api/research', async (request, reply) => {
    const { title, path: docPath, tags, pinned = 0, content } = request.body;
    
    if (!title) {
      reply.code(400);
      return { error: 'Title is required' };
    }
    
    // Generate path if not provided
    const fs = require('fs');
    const path = require('path');
    const finalPath = docPath || `docs/research/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
    
    // Write content to file if provided
    if (content) {
      const fullPath = path.join(__dirname, '..', finalPath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
    
    const result = db.prepare(`
      INSERT INTO research_docs (title, path, tags, pinned) 
      VALUES (?, ?, ?, ?)
    `).run(title, finalPath, tags || null, pinned);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(result.lastInsertRowid);
    
    return doc;
  });

  // PATCH /api/research/:id - update research doc
  fastify.patch('/api/research/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    const allowedFields = ['title', 'path', 'tags', 'pinned', 'archived_at'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      reply.code(400);
      return { error: 'No valid fields to update' };
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE research_docs SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // GET /api/research/archived - get archived docs only
  fastify.get('/api/research/archived', async (request, reply) => {
    const docs = db.prepare(`
      SELECT * FROM research_docs 
      WHERE archived_at IS NOT NULL
      ORDER BY archived_at DESC
    `).all();
    return docs;
  });

  // PATCH /api/research/:id/pin - set pinned = true
  fastify.patch('/api/research/:id/pin', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`
      UPDATE research_docs 
      SET pinned = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // PATCH /api/research/:id/unpin - set pinned = false
  fastify.patch('/api/research/:id/unpin', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`
      UPDATE research_docs 
      SET pinned = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // POST /api/research/:id/pin - toggle pinned status (legacy, kept for compatibility)
  fastify.post('/api/research/:id/pin', async (request, reply) => {
    const { id } = request.params;
    
    // Toggle pinned
    db.prepare(`
      UPDATE research_docs 
      SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // POST /api/research/:id/archive - archive research doc
  fastify.post('/api/research/:id/archive', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`
      UPDATE research_docs 
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // POST /api/research/:id/restore - restore archived research doc
  fastify.post('/api/research/:id/restore', async (request, reply) => {
    const { id } = request.params;
    
    db.prepare(`
      UPDATE research_docs 
      SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    return doc;
  });

  // DELETE /api/research/:id - delete research doc
  fastify.delete('/api/research/:id', async (request, reply) => {
    const { id } = request.params;
    
    const doc = db.prepare('SELECT * FROM research_docs WHERE id = ?').get(id);
    
    if (!doc) {
      reply.code(404);
      return { error: 'Research doc not found' };
    }
    
    db.prepare('DELETE FROM research_docs WHERE id = ?').run(id);
    
    return { success: true, id };
  });
}

// Dashboard config route - returns frontend-safe config
async function dashboardConfigRoutes(fastify, options) {
  const { getFrontendConfig } = require('./config');
  
  // GET /api/dashboard-config - get frontend configuration
  fastify.get('/api/dashboard-config', async (request, reply) => {
    return getFrontendConfig();
  });
}

module.exports = { 
  taskRoutes, 
  agentRoutes, 
  streamRoutes, 
  configRoutes, 
  planRoutes,
  dispatchRoutes,
  billboardRoutes,
  researchRoutes,
  dashboardConfigRoutes,
  broadcastMessage, 
  saveAndBroadcastMessage, 
  broadcastAgentEvent,
  broadcastPlanEvent,
  broadcastDispatchEvent,
  broadcastBillboardEvent,
  messageEmitter 
};