/**
 * Test Suite for Agent Tools Patterns
 * 
 * Tests the common workflows agents use:
 * 1. Claim task: PATCH /api/tasks/:id {"status":"in_progress"}
 * 2. Complete task: PATCH /api/tasks/:id {"status":"done"}
 * 3. Get my tasks: GET /api/tasks?agent_id=X&status=todo
 * 4. Get my dispatch: GET /api/dispatches/:id
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Test configuration
const BASE_URL = 'http://localhost:3001';

// Helper to make HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {}
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Agent Tools - Task Workflows', () => {
  
  describe('Claim Task Pattern', () => {
    
    test('agent can claim a task by setting status to in_progress', async () => {
      // Create an agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'claim-test-agent-' + Date.now(),
        name: 'ClaimTestAgent'
      });
      
      const agentId = agentRes.data.id;
      
      // Create a task in todo status
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task to claim',
        status: 'todo'
      });
      
      const taskId = taskRes.data.id;
      
      // Agent claims the task
      const { status, data } = await request('PATCH', `/api/tasks/${taskId}`, {
        status: 'in_progress',
        agent_id: agentId
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'in_progress', 'Status should be in_progress');
      assert.strictEqual(data.agent_id, agentId, 'Agent should be assigned');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
    test('claiming task sets agent_id automatically', async () => {
      // Create an agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'auto-claim-agent-' + Date.now(),
        name: 'AutoClaimAgent'
      });
      
      const agentId = agentRes.data.id;
      
      // Create a task
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task for auto-claim'
      });
      
      const taskId = taskRes.data.id;
      
      // Claim with agent_id
      const { data } = await request('PATCH', `/api/tasks/${taskId}`, {
        status: 'in_progress',
        agent_id: agentId
      });
      
      assert.strictEqual(data.agent_id, agentId, 'Agent ID should be set');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
  });
  
  describe('Complete Task Pattern', () => {
    
    test('agent can complete a task by setting status to done', async () => {
      // Create a task in in_progress
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task to complete',
        status: 'in_progress'
      });
      
      const taskId = taskRes.data.id;
      
      // Complete the task
      const { status, data } = await request('PATCH', `/api/tasks/${taskId}`, {
        status: 'done'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'done', 'Status should be done');
      
      // Verify by fetching
      const verifyRes = await request('GET', '/api/tasks');
      const ourTask = verifyRes.data.find(t => t.id === taskId);
      assert.strictEqual(ourTask.status, 'done', 'Status should persist');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
    });
    
    test('task transitions through full workflow', async () => {
      // Create a task
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Full workflow task',
        status: 'todo'
      });
      
      const taskId = taskRes.data.id;
      
      // todo -> in_progress
      await request('PATCH', `/api/tasks/${taskId}`, { status: 'in_progress' });
      let res = await request('GET', '/api/tasks');
      let task = res.data.find(t => t.id === taskId);
      assert.strictEqual(task.status, 'in_progress', 'Should be in_progress');
      
      // in_progress -> done
      await request('PATCH', `/api/tasks/${taskId}`, { status: 'done' });
      res = await request('GET', '/api/tasks');
      task = res.data.find(t => t.id === taskId);
      assert.strictEqual(task.status, 'done', 'Should be done');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
    });
    
    test('can set task to blocked status', async () => {
      // Create a task
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task that gets blocked',
        status: 'in_progress'
      });
      
      const taskId = taskRes.data.id;
      
      // Set to blocked
      const { status, data } = await request('PATCH', `/api/tasks/${taskId}`, {
        status: 'blocked'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'blocked', 'Status should be blocked');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
    });
    
  });
  
  describe('Get My Tasks Pattern', () => {
    
    test('agent can filter tasks by agent_id', async () => {
      // Create an agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'my-tasks-agent-' + Date.now(),
        name: 'MyTasksAgent'
      });
      
      const agentId = agentRes.data.id;
      
      // Create tasks for this agent
      const task1 = await request('POST', '/api/tasks', {
        title: 'My task 1',
        agent_id: agentId,
        status: 'todo'
      });
      
      const task2 = await request('POST', '/api/tasks', {
        title: 'My task 2',
        agent_id: agentId,
        status: 'in_progress'
      });
      
      // Create a task for another agent
      const otherTask = await request('POST', '/api/tasks', {
        title: 'Other task'
      });
      
      // Get my tasks
      const { status, data } = await request('GET', `/api/tasks?agent_id=${agentId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.ok(Array.isArray(data), 'Should return an array');
      
      // All tasks should belong to this agent
      for (const task of data) {
        assert.strictEqual(task.agent_id, agentId, 'Task should belong to agent');
      }
      
      // Should include our tasks
      const myTaskIds = data.map(t => t.id);
      assert.ok(myTaskIds.includes(task1.data.id), 'Should include task 1');
      assert.ok(myTaskIds.includes(task2.data.id), 'Should include task 2');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${task1.data.id}`);
      await request('DELETE', `/api/tasks/${task2.data.id}`);
      await request('DELETE', `/api/tasks/${otherTask.data.id}`);
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
    test('agent can filter by status to get todo tasks', async () => {
      // Create an agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'todo-filter-agent-' + Date.now(),
        name: 'TodoFilterAgent'
      });
      
      const agentId = agentRes.data.id;
      
      // Create tasks with different statuses
      const todoTask = await request('POST', '/api/tasks', {
        title: 'Todo task',
        agent_id: agentId,
        status: 'todo'
      });
      
      const inProgressTask = await request('POST', '/api/tasks', {
        title: 'In progress task',
        agent_id: agentId,
        status: 'in_progress'
      });
      
      const doneTask = await request('POST', '/api/tasks', {
        title: 'Done task',
        agent_id: agentId,
        status: 'done'
      });
      
      // Get only todo tasks
      const { data } = await request('GET', `/api/tasks?agent_id=${agentId}&status=todo`);
      
      // All returned tasks should be todo
      for (const task of data) {
        assert.strictEqual(task.status, 'todo', 'Task should be todo status');
      }
      
      // Should include our todo task
      const taskIds = data.map(t => t.id);
      assert.ok(taskIds.includes(todoTask.data.id), 'Should include todo task');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${todoTask.data.id}`);
      await request('DELETE', `/api/tasks/${inProgressTask.data.id}`);
      await request('DELETE', `/api/tasks/${doneTask.data.id}`);
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
    test('agent can get in_progress (claimed) tasks', async () => {
      // Create an agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'claimed-tasks-agent-' + Date.now(),
        name: 'ClaimedTasksAgent'
      });
      
      const agentId = agentRes.data.id;
      
      // Create tasks
      const claimedTask = await request('POST', '/api/tasks', {
        title: 'Claimed task',
        agent_id: agentId,
        status: 'in_progress'
      });
      
      const todoTask = await request('POST', '/api/tasks', {
        title: 'Todo task',
        agent_id: agentId,
        status: 'todo'
      });
      
      // Get in_progress tasks
      const { data } = await request('GET', `/api/tasks?agent_id=${agentId}&status=in_progress`);
      
      assert.strictEqual(data.length, 1, 'Should have exactly 1 in_progress task');
      assert.strictEqual(data[0].id, claimedTask.data.id, 'Should be the claimed task');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${claimedTask.data.id}`);
      await request('DELETE', `/api/tasks/${todoTask.data.id}`);
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
  });
  
  describe('Get My Dispatch Pattern', () => {
    
    test('agent can get dispatch details with tasks', async () => {
      // Create a dispatch
      const dispatchRes = await request('POST', '/api/dispatches', {
        title: 'Test Dispatch for Agent',
        target_agent: 'test-agent-123'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      // Create tasks for this dispatch
      const task1 = await request('POST', '/api/tasks', {
        title: 'Dispatch Task 1',
        dispatch_id: dispatchId,
        status: 'todo'
      });
      
      const task2 = await request('POST', '/api/tasks', {
        title: 'Dispatch Task 2',
        dispatch_id: dispatchId,
        status: 'todo'
      });
      
      // Get dispatch details
      const { status, data } = await request('GET', `/api/dispatches/${dispatchId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.id, dispatchId, 'Should have correct dispatch ID');
      assert.ok(Array.isArray(data.tasks), 'Should have tasks array');
      assert.strictEqual(data.tasks.length, 2, 'Should have 2 tasks');
      
      // Verify task titles
      const taskTitles = data.tasks.map(t => t.title);
      assert.ok(taskTitles.includes('Dispatch Task 1'), 'Should have task 1');
      assert.ok(taskTitles.includes('Dispatch Task 2'), 'Should have task 2');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${task1.data.id}`);
      await request('DELETE', `/api/tasks/${task2.data.id}`);
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
    test('agent can see dispatch status progression', async () => {
      // Create a dispatch
      const dispatchRes = await request('POST', '/api/dispatches', {
        title: 'Status Progression Dispatch',
        target_agent: 'progression-agent'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      // Initial status should be pending
      let { data } = await request('GET', `/api/dispatches/${dispatchId}`);
      assert.strictEqual(data.status, 'pending', 'Initial status should be pending');
      
      // Update to dispatched (valid per DB constraint)
      await request('PATCH', `/api/dispatches/${dispatchId}`, { status: 'dispatched' });
      data = (await request('GET', `/api/dispatches/${dispatchId}`)).data;
      assert.strictEqual(data.status, 'dispatched', 'Status should be dispatched');
      
      // Update to in_progress
      await request('PATCH', `/api/dispatches/${dispatchId}`, { status: 'in_progress' });
      data = (await request('GET', `/api/dispatches/${dispatchId}`)).data;
      assert.strictEqual(data.status, 'in_progress', 'Status should be in_progress');
      
      // Update to done
      await request('PATCH', `/api/dispatches/${dispatchId}`, { status: 'done' });
      data = (await request('GET', `/api/dispatches/${dispatchId}`)).data;
      assert.strictEqual(data.status, 'done', 'Status should be done');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
    test('agent can get dispatch with plan context', async () => {
      // Create a plan
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan with dispatch context',
        tag: 'CTX'
      });
      
      const planId = planRes.data.id;
      
      // Create a dispatch linked to plan
      const dispatchRes = await request('POST', '/api/dispatches', {
        plan_id: planId,
        title: 'Dispatch with plan context',
        target_agent: 'context-agent'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      // Get dispatch - should include plan info
      const { data } = await request('GET', `/api/dispatches/${dispatchId}`);
      
      assert.strictEqual(data.plan_id, planId, 'Should have plan_id');
      assert.ok(data.plan_title, 'Should have plan_title');
      assert.strictEqual(data.plan_tag, 'CTX', 'Should have plan_tag');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
      await request('DELETE', `/api/plans/${planId}`);
    });
    
  });
  
  describe('Agent Registration', () => {
    
    test('agent can register itself', async () => {
      const agentData = {
        id: 'self-register-' + Date.now(),
        name: 'SelfRegisterAgent',
        status: 'active'
      };
      
      const { status, data } = await request('POST', '/api/agents', agentData);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.id, agentData.id, 'ID should match');
      assert.strictEqual(data.name, agentData.name, 'Name should match');
      assert.ok(data.last_seen, 'Should have last_seen');
      
      // Cleanup
      await request('DELETE', `/api/agents/${agentData.id}`);
    });
    
    test('agent can update its status', async () => {
      // Create agent
      const agentRes = await request('POST', '/api/agents', {
        id: 'status-update-agent-' + Date.now(),
        name: 'StatusUpdateAgent',
        status: 'active'
      });
      
      const agentId = agentRes.data.id;
      
      // Update to idle via /api/agents/:id/status
      const { status, data } = await request('PATCH', `/api/agents/${agentId}/status`, {
        status: 'idle'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'idle', 'Status should be idle');
      
      // Cleanup
      await request('DELETE', `/api/agents/${agentId}`);
    });
    
  });
  
});

console.log('Running Agent Tools Tests...');
console.log('Make sure the backend server is running at', BASE_URL);
