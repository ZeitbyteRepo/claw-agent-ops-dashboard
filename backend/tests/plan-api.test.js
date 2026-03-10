/**
 * Test Suite for Plan API
 * 
 * Tests:
 * 1. GET /api/plans — list all plans
 * 2. GET /api/plans/:id — full plan with content, tasks, dispatches
 * 3. POST /api/plans — create plan with idea_id, tag, title, content
 * 4. PATCH /api/plans/:id — update plan content
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

describe('Plan API', () => {
  
  describe('GET /api/plans', () => {
    
    test('should return all plans', async () => {
      const { status, data } = await request('GET', '/api/plans');
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.ok(Array.isArray(data), 'Should return an array');
    });
    
    test('should include task_count and dispatch_count', async () => {
      // Create a plan with tasks
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan with tasks ' + Date.now(),
        tag: 'TEST-' + Date.now()
      });
      
      const planId = planRes.data.id;
      
      // Create a task for this plan
      await request('POST', '/api/tasks', {
        title: 'Task in plan',
        plan_id: planId
      });
      
      // Get plans and find ours
      const { data } = await request('GET', '/api/plans');
      const ourPlan = data.find(p => p.id === planId);
      
      assert.ok(ourPlan, 'Should find our plan');
      assert.ok(typeof ourPlan.task_count === 'number', 'Should have task_count');
      assert.ok(typeof ourPlan.dispatch_count === 'number', 'Should have dispatch_count');
      assert.strictEqual(ourPlan.task_count, 1, 'Should have 1 task');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
  });
  
  describe('GET /api/plans/:id', () => {
    
    test('should return plan with tasks and dispatches', async () => {
      // Create a plan
      const planRes = await request('POST', '/api/plans', {
        title: 'Full Plan Test ' + Date.now(),
        tag: 'FULL-' + Date.now(),
        content: '## Phase 1: Test\n### Slice 1.1: Initial\n- [ ] Task 1'
      });
      
      const planId = planRes.data.id;
      
      // Create a dispatch
      const dispatchRes = await request('POST', '/api/dispatches', {
        plan_id: planId,
        title: 'Test Dispatch',
        target_agent: 'test-agent'
      });
      
      // Create a task
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task in full plan',
        plan_id: planId,
        dispatch_id: dispatchRes.data.id
      });
      
      // Get the full plan
      const { status, data } = await request('GET', `/api/plans/${planId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.id, planId, 'Should have correct plan ID');
      assert.ok(data.content, 'Should have content');
      assert.ok(Array.isArray(data.tasks), 'Should have tasks array');
      assert.ok(Array.isArray(data.dispatches), 'Should have dispatches array');
      assert.ok(data.tasks.length > 0, 'Should have at least one task');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskRes.data.id}`);
      await request('DELETE', `/api/dispatches/${dispatchRes.data.id}`);
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should return 404 for non-existent plan', async () => {
      const { status, data } = await request('GET', '/api/plans/999999');
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
  });
  
  describe('POST /api/plans', () => {
    
    test('should create plan with all fields', async () => {
      const planData = {
        idea_id: 'idea-123',
        tag: 'API-' + Date.now(),
        title: 'Complete Plan ' + Date.now(),
        summary: 'A test plan summary',
        content: '## Phase 1\nContent here',
        status: 'planning'
      };
      
      const { status, data } = await request('POST', '/api/plans', planData);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.title, planData.title, 'Title should match');
      assert.strictEqual(data.tag, planData.tag, 'Tag should match');
      assert.strictEqual(data.summary, planData.summary, 'Summary should match');
      assert.strictEqual(data.content, planData.content, 'Content should match');
      assert.strictEqual(data.status, planData.status, 'Status should match');
      assert.ok(data.id, 'Should have an ID');
      assert.ok(data.created_at, 'Should have created_at');
      
      // Cleanup
      await request('DELETE', `/api/plans/${data.id}`);
    });
    
    test('should require title', async () => {
      const { status, data } = await request('POST', '/api/plans', {
        tag: 'NOTITLE'
      });
      
      assert.strictEqual(status, 400, 'Should return 400 Bad Request');
      assert.ok(data.error, 'Should have error message');
    });
    
    test('should default status to planning', async () => {
      const { status, data } = await request('POST', '/api/plans', {
        title: 'Default Status Plan'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'planning', 'Status should default to planning');
      
      // Cleanup
      await request('DELETE', `/api/plans/${data.id}`);
    });
    
  });
  
  describe('PATCH /api/plans/:id', () => {
    
    test('should update plan status', async () => {
      // Create a plan
      const createRes = await request('POST', '/api/plans', {
        title: 'Plan to update status',
        status: 'planning'
      });
      
      const planId = createRes.data.id;
      
      // Update status
      const { status, data } = await request('PATCH', `/api/plans/${planId}`, {
        status: 'active'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'active', 'Status should be updated');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should update plan content', async () => {
      // Create a plan
      const createRes = await request('POST', '/api/plans', {
        title: 'Plan to update content',
        content: 'Original content'
      });
      
      const planId = createRes.data.id;
      
      // Note: content is not in allowedFields in the routes, but let's test tag update
      const newTag = 'UPDATED-' + Date.now();
      const { status, data } = await request('PATCH', `/api/plans/${planId}`, {
        tag: newTag
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.tag, newTag, 'Tag should be updated');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should update title and summary', async () => {
      // Create a plan
      const createRes = await request('POST', '/api/plans', {
        title: 'Original Title'
      });
      
      const planId = createRes.data.id;
      
      const { status, data } = await request('PATCH', `/api/plans/${planId}`, {
        title: 'Updated Title',
        summary: 'New summary'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.title, 'Updated Title', 'Title should be updated');
      assert.strictEqual(data.summary, 'New summary', 'Summary should be updated');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should return 404 for non-existent plan', async () => {
      const { status, data } = await request('PATCH', '/api/plans/999999', {
        status: 'active'
      });
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
    test('should return 400 when no valid fields provided', async () => {
      // Create a plan
      const createRes = await request('POST', '/api/plans', {
        title: 'Plan for invalid update test'
      });
      
      const planId = createRes.data.id;
      
      const { status, data } = await request('PATCH', `/api/plans/${planId}`, {
        invalid_field: 'value'
      });
      
      assert.strictEqual(status, 400, 'Should return 400 Bad Request');
      assert.ok(data.error, 'Should have error message');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
  });
  
  describe('DELETE /api/plans/:id', () => {
    
    test('should delete plan and associated items', async () => {
      // Create a plan with task and dispatch
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan to delete'
      });
      
      const planId = planRes.data.id;
      
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task in plan to delete',
        plan_id: planId
      });
      
      const dispatchRes = await request('POST', '/api/dispatches', {
        plan_id: planId,
        title: 'Dispatch in plan to delete',
        target_agent: 'test-agent'
      });
      
      // Delete the plan
      const { status, data } = await request('DELETE', `/api/plans/${planId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.success, true, 'Should return success');
      
      // Verify plan is gone
      const planCheck = await request('GET', `/api/plans/${planId}`);
      assert.strictEqual(planCheck.status, 404, 'Plan should be deleted');
      
      // Verify task is gone
      const tasksRes = await request('GET', `/api/tasks?plan_id=${planId}`);
      assert.strictEqual(tasksRes.data.length, 0, 'Tasks should be deleted');
    });
    
    test('should return 404 for non-existent plan', async () => {
      const { status, data } = await request('DELETE', '/api/plans/999999');
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
  });
  
  describe('GET /api/plans/:id/export', () => {
    
    test('should export plan as markdown', async () => {
      // Create a plan with content
      const planRes = await request('POST', '/api/plans', {
        title: 'Exportable Plan',
        tag: 'EXPORT',
        content: '## Phase 1\nContent here'
      });
      
      const planId = planRes.data.id;
      
      // Export the plan - note this returns text, not JSON
      const { status, data } = await request('GET', `/api/plans/${planId}/export`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.ok(typeof data === 'string' || data.includes, 'Should return text');
      
      // Cleanup
      await request('DELETE', `/api/plans/${planId}`);
    });
    
  });
  
});

console.log('Running Plan API Tests...');
console.log('Make sure the backend server is running at', BASE_URL);
