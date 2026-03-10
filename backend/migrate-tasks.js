const {db} = require('./db');

console.log('Migrating tasks table to support 6 statuses...');

// Create a new table with the correct schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ideas' CHECK(status IN ('ideas', 'planning', 'todo', 'in_progress', 'blocked', 'done')),
    agent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Copy data
const tasks = db.prepare('SELECT * FROM tasks').all();
console.log(`Found ${tasks.length} tasks to migrate`);

for (const task of tasks) {
  let newStatus = task.status;
  if (newStatus === 'todo') newStatus = 'todo';
  else if (newStatus === 'in_progress') newStatus = 'in_progress';
  else if (newStatus === 'done') newStatus = 'done';
  else newStatus = 'ideas';
  
  db.prepare(`
    INSERT INTO tasks_new (id, title, status, agent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(task.id, task.title, newStatus, task.agent_id, task.created_at, task.updated_at);
}

// Drop old table and rename
db.exec('DROP TABLE tasks');
db.exec('ALTER TABLE tasks_new RENAME TO tasks');

console.log('Migration complete!');
