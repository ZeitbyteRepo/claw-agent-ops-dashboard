const Fastify = require('fastify');
const { initializeDatabase } = require('./db');
const { taskRoutes, agentRoutes, streamRoutes, configRoutes, planRoutes, dispatchRoutes, billboardRoutes, researchRoutes, dashboardConfigRoutes, saveAndBroadcastMessage } = require('./routes');
const { startWatcher, getAgentName } = require('./openclaw-watcher');
const { getConfig } = require('./config');

// Load config
const config = getConfig();

// Initialize database
initializeDatabase();

// Create Fastify server
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Disable caching on all API responses
fastify.addHook('onSend', async (request, reply) => {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  reply.header('Surrogate-Control', 'no-store');
});

// Register routes
fastify.register(taskRoutes);
fastify.register(agentRoutes);
fastify.register(streamRoutes);
fastify.register(configRoutes);
fastify.register(planRoutes);
fastify.register(dispatchRoutes);
fastify.register(billboardRoutes);
fastify.register(researchRoutes);
fastify.register(dashboardConfigRoutes);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return { 
    name: 'Agent Dashboard API',
    version: '1.1.0',
    endpoints: [
      'GET /api/tasks',
      'POST /api/tasks',
      'PATCH /api/tasks/:id',
      'DELETE /api/tasks/:id',
      'GET /api/agents',
      'POST /api/agents',
      'DELETE /api/agents/:id',
      'PATCH /api/agents/:id/status',
      'GET /api/agents/:id/config',
      'PUT /api/agents/:id/config/:filename',
      'POST /api/agents/:id/config',
      'GET /api/streams',
      'GET /api/streams/:agentId',
      'POST /api/streams',
      'GET /api/streams/live (SSE)',
      'GET /api/plans',
      'POST /api/plans',
      'GET /api/plans/:id',
      'PATCH /api/plans/:id',
      'DELETE /api/plans/:id',
      'GET /api/plans/:id/export (markdown)',
      'GET /api/dispatches',
      'POST /api/dispatches',
      'GET /api/dispatches/:id',
      'PATCH /api/dispatches/:id',
      'DELETE /api/dispatches/:id'
    ]
  };
});

// Start server
const start = async () => {
  try {
    const { port, host } = config.server;
    await fastify.listen({ port, host });
    console.log(`Server running on http://localhost:${port}`);
    
    // Start OpenClaw session watcher for live streaming
    console.log('Starting OpenClaw session watcher...');
    const watcher = startWatcher((message) => {
      // Add agent name for display
      message.agent_name = getAgentName(message.agent_id);
      
      // Save to database AND broadcast to all SSE clients
      saveAndBroadcastMessage(message);
    }, { loadHistory: config.watcher.loadHistory });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      watcher.stop();
      process.exit(0);
    });
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();