#!/usr/bin/env node
/**
 * Dispatch Workflow Audit Script
 * 
 * Checks:
 * 1. All plans have idea_id
 * 2. All PLANNING tasks have agent_id = null
 * 3. All TODO tasks have dispatch_id
 * 4. All dispatches have descriptive titles
 */

const { db } = require('./db');

console.log('='.repeat(60));
console.log('DISPATCH WORKFLOW AUDIT');
console.log('='.repeat(60));
console.log();

let violations = 0;

// Check 1: Plans without idea_id
console.log('📋 Check 1: Plans without idea_id');
console.log('-'.repeat(40));
const plansWithoutIdea = db.prepare(`
  SELECT id, tag, title, status 
  FROM plans 
  WHERE idea_id IS NULL AND archived_at IS NULL
`).all();

if (plansWithoutIdea.length === 0) {
  console.log('  ✅ All active plans have idea_id');
} else {
  console.log(`  ❌ Found ${plansWithoutIdea.length} plans without idea_id:`);
  plansWithoutIdea.forEach(p => {
    console.log(`     - Plan #${p.id} [${p.tag}]: ${p.title}`);
  });
  violations += plansWithoutIdea.length;
}
console.log();

// Check 2: PLANNING tasks with agent_id set
console.log('📝 Check 2: PLANNING tasks with agent_id (should be null)');
console.log('-'.repeat(40));
const planningWithAgent = db.prepare(`
  SELECT t.id, t.title, t.agent_id, t.plan_id
  FROM tasks t
  WHERE t.status = 'planning' 
    AND t.agent_id IS NOT NULL 
    AND t.archived_at IS NULL
`).all();

if (planningWithAgent.length === 0) {
  console.log('  ✅ All PLANNING tasks have agent_id = null');
} else {
  console.log(`  ❌ Found ${planningWithAgent.length} PLANNING tasks with agent_id:`);
  planningWithAgent.forEach(t => {
    console.log(`     - Task #${t.id}: ${t.title} (agent: ${t.agent_id})`);
  });
  violations += planningWithAgent.length;
}
console.log();

// Check 3: TODO tasks without dispatch_id
console.log('📤 Check 3: TODO tasks without dispatch_id');
console.log('-'.repeat(40));
const todoWithoutDispatch = db.prepare(`
  SELECT t.id, t.title, t.plan_id
  FROM tasks t
  WHERE t.status = 'todo' 
    AND t.dispatch_id IS NULL 
    AND t.archived_at IS NULL
`).all();

if (todoWithoutDispatch.length === 0) {
  console.log('  ✅ All TODO tasks have dispatch_id');
} else {
  console.log(`  ⚠️  Found ${todoWithoutDispatch.length} TODO tasks without dispatch_id:`);
  todoWithoutDispatch.forEach(t => {
    console.log(`     - Task #${t.id}: ${t.title}`);
  });
  // This is a warning, not a hard violation
}
console.log();

// Check 4: Dispatches with generic/non-descriptive titles
console.log('📦 Check 4: Dispatches with non-descriptive titles');
console.log('-'.repeat(40));
const genericDispatches = db.prepare(`
  SELECT id, title, target_agent, status
  FROM dispatches
  WHERE archived_at IS NULL
    AND (
      title LIKE 'Dispatch%'
      OR title LIKE 'New dispatch%'
      OR title = ''
      OR LENGTH(title) < 10
    )
`).all();

if (genericDispatches.length === 0) {
  console.log('  ✅ All dispatches have descriptive titles');
} else {
  console.log(`  ⚠️  Found ${genericDispatches.length} dispatches with generic titles:`);
  genericDispatches.forEach(d => {
    console.log(`     - Dispatch #${d.id}: "${d.title}" (→ ${d.target_agent})`);
  });
}
console.log();

// Check 5: Tasks with invalid status
console.log('🔍 Check 5: Tasks with invalid status');
console.log('-'.repeat(40));
const validStatuses = ['ideas', 'planning', 'todo', 'in_progress', 'blocked', 'done'];
const invalidStatusTasks = db.prepare(`
  SELECT id, title, status
  FROM tasks
  WHERE status NOT IN (${validStatuses.map(s => `'${s}'`).join(',')})
    AND archived_at IS NULL
`).all();

if (invalidStatusTasks.length === 0) {
  console.log('  ✅ All tasks have valid status');
} else {
  console.log(`  ❌ Found ${invalidStatusTasks.length} tasks with invalid status:`);
  invalidStatusTasks.forEach(t => {
    console.log(`     - Task #${t.id}: ${t.title} (status: ${t.status})`);
  });
  violations += invalidStatusTasks.length;
}
console.log();

// Check 6: Orphaned tasks (no plan_id and no dispatch_id)
console.log('🔗 Check 6: Orphaned tasks (no plan, no dispatch)');
console.log('-'.repeat(40));
const orphanedTasks = db.prepare(`
  SELECT id, title, status
  FROM tasks
  WHERE plan_id IS NULL 
    AND dispatch_id IS NULL
    AND status NOT IN ('ideas', 'done')
    AND archived_at IS NULL
`).all();

if (orphanedTasks.length === 0) {
  console.log('  ✅ No orphaned tasks');
} else {
  console.log(`  ⚠️  Found ${orphanedTasks.length} orphaned tasks:`);
  orphanedTasks.forEach(t => {
    console.log(`     - Task #${t.id}: ${t.title} (status: ${t.status})`);
  });
}
console.log();

// Summary
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total violations: ${violations}`);
console.log(`Warnings: ${todoWithoutDispatch.length + genericDispatches.length + orphanedTasks.length}`);
console.log();

if (violations === 0) {
  console.log('✅ Audit passed - no critical violations found');
  process.exit(0);
} else {
  console.log('❌ Audit failed - violations found');
  process.exit(1);
}
