/**
 * Test Suite for Dispatch API
 * 
 * Tests:
 * 1. GET /api/dispatches — list all dispatches
 * 2. GET /api/dispatches/:id — dispatch with tasks
 * 3. POST /api/dispatches — create dispatch
 * 4. PATCH /api/dispatches/:id — update dispatch status
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

describe('Dispatch API', () => {
  
  describe('GET /api/dispatches', () => {
    
    test('should return all dispatches', async () => {
      const { status, data } = await request('GET', '/api/dispatches');
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.ok(Array.isArray(data), 'Should return an array');
    });
    
    test('should filter by plan_id', async () => {
      // Create a plan
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan for dispatch filter ' + Date.now()
      });
      
      const planId = planRes.data.id;
      
      // Create dispatches
      const dispatch1 = await request('POST', '/api/dispatches', {
        plan_id: planId,
        title: 'Dispatch for plan ' + planId,
        target_agent: 'test-agent'
      });
      
      const dispatch2 = await request('POST', '/api/dispatches', {
        title: 'Dispatch without plan',
        target_agent: 'other-agent'
      });
      
      // Filter by plan_id
      const { status, data } = await request('GET', `/api/dispatches?plan_id=${planId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.ok(Array.isArray(data), 'Should return an array');
      
      // All returned dispatches should have the correct plan_id
      for (const dispatch of data) {
        assert.strictEqual(dispatch.plan_id, planId, 'Dispatch should have correct plan_id');
      }
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatch1.data.id}`);
      await request('DELETE', `/api/dispatches/${dispatch2.data.id}`);
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should include task_count and plan info', async () => {
      // Create a plan
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan with dispatch ' + Date.now(),
        tag: 'TASKCOUNT'
      });
      
      const planId = planRes.data.id;
      
      // Create a dispatch
      const dispatchRes = await request('POST', '/api/dispatches', {
        plan_id: planId,
        title: 'Dispatch with tasks',
        target_agent: 'test-agent'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      // Create tasks for this dispatch
      await request('POST', '/api/tasks', {
        title: 'Task 1 for dispatch',
        dispatch_id: dispatchId
      });
      
      await request('POST', '/api/tasks', {
        title: 'Task 2 for dispatch',
        dispatch_id: dispatchId
      });
      
      // Get dispatches and find ours
      const { data } = await request('GET', '/api/dispatches');
      const ourDispatch = data.find(d => d.id === dispatchId);
      
      assert.ok(ourDispatch, 'Should find our dispatch');
      assert.strictEqual(ourDispatch.task_count, 2, 'Should have 2 tasks');
      assert.ok(ourDispatch.plan_title, 'Should have plan_title');
      assert.strictEqual(ourDispatch.plan_tag, 'TASKCOUNT', 'Should have plan_tag');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
      await request('DELETE', `/api/plans/${planId}`);
    });
    
  });
  
  describe('GET /api/dispatches/:id', () => {
    
    test('should return dispatch with tasks', async () => {
      // Create a dispatch
      const dispatchRes = await request('POST', '/api/dispatches', {
        title: 'Full Dispatch Test',
        target_agent: 'athena'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      // Create tasks
      const task1 = await request('POST', '/api/tasks', {
        title: 'Task 1',
        dispatch_id: dispatchId
      });
      
      const task2 = await request('POST', '/api/tasks', {
        title: 'Task 2',
        dispatch_id: dispatchId
      });
      
      // Get the full dispatch
      const { status, data } = await request('GET', `/api/dispatches/${dispatchId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.id, dispatchId, 'Should have correct dispatch ID');
      assert.ok(Array.isArray(data.tasks), 'Should have tasks array');
      assert.strictEqual(data.tasks.length, 2, 'Should have 2 tasks');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${task1.data.id}`);
      await request('DELETE', `/api/tasks/${task2.data.id}`);
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
    test('should return 404 for non-existent dispatch', async () => {
      const { status, data } = await request('GET', '/api/dispatches/999999');
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
  });
  
  describe('POST /api/dispatches', () => {
    
    test('should create dispatch with all fields', async () => {
      // Create a plan first
      const planRes = await request('POST', '/api/plans', {
        title: 'Plan for dispatch'
      });
      
      const planId = planRes.data.id;
      
      const dispatchData = {
        plan_id: planId,
        title: 'Complete Dispatch ' + Date.now(),
        target_agent: 'hephaestus',
        status: 'pending'
      };
      
      const { status, data } = await request('POST', '/api/dispatches', dispatchData);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.title, dispatchData.title, 'Title should match');
      assert.strictEqual(data.target_agent, dispatchData.target_agent, 'Target agent should match');
      assert.strictEqual(data.plan_id, planId, 'Plan ID should match');
      assert.strictEqual(data.status, dispatchData.status, 'Status should match');
      assert.ok(data.id, 'Should have an ID');
      assert.ok(data.created_at, 'Should have created_at');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${data.id}`);
      await request('DELETE', `/api/plans/${planId}`);
    });
    
    test('should require title and target_agent', async () => {
      const { status, data } = await request('POST', '/api/dispatches', {
        title: 'No agent'
      });
      
      assert.strictEqual(status, 400, 'Should return 400 Bad Request');
      assert.ok(data.error, 'Should have error message');
      
      const { status: status2, data: data2 } = await request('POST', '/api/dispatches', {
        target_agent: 'no-title'
      });
      
      assert.strictEqual(status2, 400, 'Should return 400 Bad Request');
      assert.ok(data2.error, 'Should have error message');
    });
    
    test('should default status to pending', async () => {
      const { status, data } = await request('POST', '/api/dispatches', {
        title: 'Default Status Dispatch',
        target_agent: 'test-agent'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'pending', 'Status should default to pending');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${data.id}`);
    });
    
  });
  
  describe('PATCH /api/dispatches/:id', () => {
    
    test('should update dispatch status', async () => {
      // Create a dispatch
      const createRes = await request('POST', '/api/dispatches', {
        title: 'Dispatch to update status',
        target_agent: 'test-agent',
        status: 'pending'
      });
      
      const dispatchId = createRes.data.id;
      
      // Update status to dispatched (valid per DB constraint)
      const { status, data } = await request('PATCH', `/api/dispatches/${dispatchId}`, {
        status: 'dispatched'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.status, 'dispatched', 'Status should be dispatched');
      
      // Update status to in_progress
      const { data: data2 } = await request('PATCH', `/api/dispatches/${dispatchId}`, {
        status: 'in_progress'
      });
      
      assert.strictEqual(data2.status, 'in_progress', 'Status should be in_progress');
      
      // Update status to done
      const { data: data3 } = await request('PATCH', `/api/dispatches/${dispatchId}`, {
        status: 'done'
      });
      
      assert.strictEqual(data3.status, 'done', 'Status should be done');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
    test('should update title and target_agent', async () => {
      // Create a dispatch
      const createRes = await request('POST', '/api/dispatches', {
        title: 'Original Title',
        target_agent: 'original-agent'
      });
      
      const dispatchId = createRes.data.id;
      
      const { status, data } = await request('PATCH', `/api/dispatches/${dispatchId}`, {
        title: 'Updated Title',
        target_agent: 'updated-agent'
      });
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.title, 'Updated Title', 'Title should be updated');
      assert.strictEqual(data.target_agent, 'updated-agent', 'Target agent should be updated');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
    test('should return 404 for non-existent dispatch', async () => {
      const { status, data } = await request('PATCH', '/api/dispatches/999999', {
        status: 'sent'
      });
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
    test('should return 400 when no valid fields provided', async () => {
      // Create a dispatch
      const createRes = await request('POST', '/api/dispatches', {
        title: 'Dispatch for invalid update test',
        target_agent: 'test-agent'
      });
      
      const dispatchId = createRes.data.id;
      
      const { status, data } = await request('PATCH', `/api/dispatches/${dispatchId}`, {
        invalid_field: 'value'
      });
      
      assert.strictEqual(status, 400, 'Should return 400 Bad Request');
      assert.ok(data.error, 'Should have error message');
      
      // Cleanup
      await request('DELETE', `/api/dispatches/${dispatchId}`);
    });
    
  });
  
  describe('DELETE /api/dispatches/:id', () => {
    
    test('should delete dispatch and unlink tasks', async () => {
      // Create a dispatch with tasks
      const dispatchRes = await request('POST', '/api/dispatches', {
        title: 'Dispatch to delete',
        target_agent: 'test-agent'
      });
      
      const dispatchId = dispatchRes.data.id;
      
      const taskRes = await request('POST', '/api/tasks', {
        title: 'Task in dispatch to delete',
        dispatch_id: dispatchId
      });
      
      const taskId = taskRes.data.id;
      
      // Delete the dispatch
      const { status, data } = await request('DELETE', `/api/dispatches/${dispatchId}`);
      
      assert.strictEqual(status, 200, 'Should return 200 OK');
      assert.strictEqual(data.success, true, 'Should return success');
      
      // Verify dispatch is gone
      const dispatchCheck = await request('GET', `/api/dispatches/${dispatchId}`);
      assert.strictEqual(dispatchCheck.status, 404, 'Dispatch should be deleted');
      
      // Verify task still exists but dispatch_id is null
      const taskCheck = await request('GET', '/api/tasks');
      const ourTask = taskCheck.data.find(t => t.id === taskId);
      assert.ok(ourTask, 'Task should still exist');
      assert.strictEqual(ourTask.dispatch_id, null, 'Task dispatch_id should be null');
      
      // Cleanup
      await request('DELETE', `/api/tasks/${taskId}`);
    });
    
    test('should return 404 for non-existent dispatch', async () => {
      const { status, data } = await request('DELETE', '/api/dispatches/999999');
      
      assert.strictEqual(status, 404, 'Should return 404 Not Found');
      assert.ok(data.error, 'Should have error message');
    });
    
  });
  
});

console.log('Running Dispatch API Tests...');
console.log('Make sure the backend server is running at', BASE_URL);
