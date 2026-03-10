const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('./config');

// Load config and get database path
const config = getConfig();
const dbPath = config.database.path;

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance (if configured)
if (config.database.walMode) {
  db.pragma('journal_mode = WAL');
}

// Initialize database schema
function initializeDatabase() {
  // Create agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'idle' CHECK(status IN ('idle', 'active')),
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create dispatches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      title TEXT NOT NULL,
      target_agent TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'dispatched', 'in_progress', 'done', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    )
  `);

  // Create tasks table (updated with plan_id and dispatch_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
      agent_id TEXT,
      plan_id INTEGER,
      dispatch_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id),
      FOREIGN KEY (dispatch_id) REFERENCES dispatches(id)
    )
  `);

  // Create stream_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);

  // Migration: Add idea_id and content to plans
  try {
    const plansInfo = db.prepare('PRAGMA table_info(plans)').all();
    const hasIdeaId = plansInfo.some(col => col.name === 'idea_id');
    const hasContent = plansInfo.some(col => col.name === 'content');
    
    if (!hasIdeaId) {
      db.exec('ALTER TABLE plans ADD COLUMN idea_id INTEGER');
      console.log('Added idea_id column to plans');
    }
    if (!hasContent) {
      db.exec('ALTER TABLE plans ADD COLUMN content TEXT');
      console.log('Added content column to plans');
    }
  } catch (err) {
    console.log('Plans migration check:', err.message);
  }

  // Migration: Add plan_id and dispatch_id to tasks if they don't exist
  try {
    const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasPlanId = tasksInfo.some(col => col.name === 'plan_id');
    const hasDispatchId = tasksInfo.some(col => col.name === 'dispatch_id');
    
    if (!hasPlanId) {
      db.exec('ALTER TABLE tasks ADD COLUMN plan_id INTEGER REFERENCES plans(id)');
      console.log('Added plan_id column to tasks');
    }
    if (!hasDispatchId) {
      db.exec('ALTER TABLE tasks ADD COLUMN dispatch_id INTEGER REFERENCES dispatches(id)');
      console.log('Added dispatch_id column to tasks');
    }
  } catch (err) {
    console.log('Migration check:', err.message);
  }

  // Migration: Add notes and archived_at to tasks
  try {
    const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasNotes = tasksInfo.some(col => col.name === 'notes');
    const hasArchivedAt = tasksInfo.some(col => col.name === 'archived_at');
    
    if (!hasNotes) {
      db.exec('ALTER TABLE tasks ADD COLUMN notes TEXT');
      console.log('Added notes column to tasks');
    }
    if (!hasArchivedAt) {
      db.exec('ALTER TABLE tasks ADD COLUMN archived_at DATETIME');
      console.log('Added archived_at column to tasks');
    }
  } catch (err) {
    console.log('Tasks notes/archive migration:', err.message);
  }

  // Migration: Add archived_at to dispatches
  try {
    const dispatchesInfo = db.prepare('PRAGMA table_info(dispatches)').all();
    const hasArchivedAt = dispatchesInfo.some(col => col.name === 'archived_at');
    
    if (!hasArchivedAt) {
      db.exec('ALTER TABLE dispatches ADD COLUMN archived_at DATETIME');
      console.log('Added archived_at column to dispatches');
    }
  } catch (err) {
    console.log('Dispatches archive migration:', err.message);
  }

  // Migration: Add archived_at to plans
  try {
    const plansInfo = db.prepare('PRAGMA table_info(plans)').all();
    const hasArchivedAt = plansInfo.some(col => col.name === 'archived_at');
    
    if (!hasArchivedAt) {
      db.exec('ALTER TABLE plans ADD COLUMN archived_at DATETIME');
      console.log('Added archived_at column to plans');
    }
  } catch (err) {
    console.log('Plans archive migration:', err.message);
  }

  // Migration: Add code field to tasks (unique identifier)
  try {
    const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasCode = tasksInfo.some(col => col.name === 'code');
    
    if (!hasCode) {
      db.exec('ALTER TABLE tasks ADD COLUMN code TEXT');
      console.log('Added code column to tasks');
    }
  } catch (err) {
    console.log('Tasks code migration:', err.message);
  }

  // Migration: Add priority field to tasks (for ordering ideas)
  try {
    const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasPriority = tasksInfo.some(col => col.name === 'priority');
    
    if (!hasPriority) {
      db.exec('ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0');
      console.log('Added priority column to tasks');
    }
  } catch (err) {
    console.log('Tasks priority migration:', err.message);
  }

  // Migration: Update dispatches CHECK constraint to include 'archived' status
  // SQLite requires table recreation to modify constraints
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='dispatches'").get();
    if (tableInfo && !tableInfo.sql.includes("'archived'")) {
      console.log('Migrating dispatches table to support archived status...');
      
      // Create new table with updated constraint
      db.exec(`
        CREATE TABLE IF NOT EXISTS dispatches_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plan_id INTEGER,
          title TEXT NOT NULL,
          target_agent TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'dispatched', 'in_progress', 'done', 'failed', 'archived')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          archived_at DATETIME,
          FOREIGN KEY (plan_id) REFERENCES plans(id)
        )
      `);
      
      // Copy data
      db.exec(`
        INSERT INTO dispatches_new (id, plan_id, title, target_agent, status, created_at, updated_at)
        SELECT id, plan_id, title, target_agent, status, created_at, updated_at FROM dispatches
      `);
      
      // Drop old table and rename
      db.exec('DROP TABLE dispatches');
      db.exec('ALTER TABLE dispatches_new RENAME TO dispatches');
      
      console.log('Dispatches table migrated to support archived status');
    }
  } catch (err) {
    console.log('Dispatches constraint migration:', err.message);
  }

  // Create research_docs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS research_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      path TEXT,
      tags TEXT,
      pinned INTEGER DEFAULT 0,
      archived_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Research docs table initialized');

  // Create index for faster queries (after migration)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stream_messages_agent_id ON stream_messages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_stream_messages_created_at ON stream_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_plan_id ON tasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_dispatch_id ON tasks(dispatch_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);
    CREATE INDEX IF NOT EXISTS idx_dispatches_plan_id ON dispatches(plan_id);
    CREATE INDEX IF NOT EXISTS idx_dispatches_archived_at ON dispatches(archived_at);
    CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
    CREATE INDEX IF NOT EXISTS idx_plans_archived_at ON plans(archived_at);
    CREATE INDEX IF NOT EXISTS idx_research_docs_pinned ON research_docs(pinned);
    CREATE INDEX IF NOT EXISTS idx_research_docs_archived_at ON research_docs(archived_at);
  `);

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };
