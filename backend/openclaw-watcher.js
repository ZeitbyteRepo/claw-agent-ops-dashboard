/**
 * OpenClaw Session Watcher
 * 
 * Watches OpenClaw session JSONL files for changes and broadcasts
 * new messages to the dashboard SSE clients.
 * 
 * Supports subagent attribution: detects when a session belongs to a subagent
 * (Hephaestus, Athena, etc.) and attributes messages accordingly.
 * 
 * Uses database-backed session registry for persistent attribution.
 */

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load config
const { getConfig } = require('./config');
const config = getConfig();

// Database-backed session registry
const sessionRegistry = require('./session-registry');

// OpenClaw agents directory from config
const OPENCLAW_AGENTS_DIR = config.paths.openclawAgents;

// Track file positions for incremental reading
const filePositions = new Map();

// Track active sessions per agent
const activeSessions = new Map();

// In-memory cache for session -> agent mapping (backed by database)
// Key: session ID (e.g., "2cc862ed-cdcb-496d-9789-76b6bd4dc35c")
// Value: agent id (e.g., "hephaestus", "athena")
const sessionToAgent = new Map();

// Track which sessions we've already scanned for subagent context
const sessionsScannedForContext = new Set();

/**
 * Get agent for session - checks database first, then cache
 */
function getAgentForSessionWithCache(sessionId) {
  // Check cache first
  if (sessionToAgent.has(sessionId)) {
    return sessionToAgent.get(sessionId);
  }
  
  // Check database
  const dbAgent = sessionRegistry.getAgentForSession(sessionId);
  if (dbAgent) {
    sessionToAgent.set(sessionId, dbAgent);
    return dbAgent;
  }
  
  return null;
}

/**
 * Register a session -> agent mapping in both database and cache
 */
function registerSessionWithCache(sessionId, agentId, label) {
  sessionToAgent.set(sessionId, agentId);
  sessionRegistry.registerSession(sessionId, agentId, label);
}

/**
 * Scan a session file for subagent context
 * Reads the first few messages to determine if this is a subagent session
 * Uses database-backed registry for persistence
 */
function scanSessionForSubagentContext(filePath, sessionId) {
  if (sessionsScannedForContext.has(sessionId)) {
    return getAgentForSessionWithCache(sessionId);
  }
  
  // Mark as scanned
  sessionsScannedForContext.add(sessionId);
  
  // First check database/cache
  const existingAgent = getAgentForSessionWithCache(sessionId);
  if (existingAgent) {
    console.log('[OpenClaw Watcher] Found existing mapping: ' + sessionId + ' -> ' + existingAgent);
    return existingAgent;
  }
  
  try {
    // Read the first part of the file
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim()).slice(0, 30); // First 30 lines to find Label
    
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'message' && event.message?.content) {
          let text = '';
          const msgContent = event.message.content;
          
          if (Array.isArray(msgContent)) {
            for (const part of msgContent) {
              if (part.type === 'text' && part.text) {
                text += part.text + '\n';
              }
            }
          } else if (typeof msgContent === 'string') {
            text = msgContent;
          }
          
          // Use registry's detection
          const subagentId = sessionRegistry.detectAgentFromContent(text, null);
          if (subagentId) {
            registerSessionWithCache(sessionId, subagentId, subagentId);
            console.log('[OpenClaw Watcher] Detected and registered subagent: ' + sessionId + ' -> ' + subagentId);
            return subagentId;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
    
    // No subagent context found - this is a main session
    return null;
  } catch (e) {
    console.error('[OpenClaw Watcher] Error scanning for subagent context:', e.message);
    return null;
  }
}

/**
 * Get the effective agent ID for a session
 * Returns the subagent ID if this is a subagent session, otherwise the path-based agent ID
 */
function getEffectiveAgentId(sessionId, pathAgentId) {
  // PATH-BASED DETECTION TAKES PRIORITY
  // If the session file is in a non-main folder, trust it
  if (pathAgentId !== 'main') {
    return pathAgentId;
  }
  
  // For main sessions, check if we have an explicit subagent mapping
  const cachedAgent = getAgentForSessionWithCache(sessionId);
  if (cachedAgent) {
    return cachedAgent;
  }
  
  // Default to main - don't try to detect from content
  return 'main';
}

/**
 * Parse a JSONL line and extract message data
 */
function parseMessageLine(line, agentId, sessionId) {
  try {
    const event = JSON.parse(line);
    
    // Only process message events
    if (event.type !== 'message') return null;
    
    const msg = event.message;
    if (!msg || !msg.content) return null;
    
    // Extract text content
    let text = '';
    if (Array.isArray(msg.content)) {
      // Content is array of parts
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          text += part.text;
        } else if (part.type === 'thinking' && part.thinking) {
          // Skip thinking blocks for now
        } else if (part.type === 'toolCall') {
          text += '[tool: ' + part.name + ']';
        } else if (part.type === 'toolResult') {
          // Include tool results but truncate
          text += '[tool result]';
        }
      }
    } else if (typeof msg.content === 'string') {
      text = msg.content;
    }
    
    // Skip empty messages
    if (!text.trim()) return null;
    
    // Check if this message contains subagent context and update mapping
    if (!getAgentForSessionWithCache(sessionId)) {
      const subagentId = sessionRegistry.detectAgentFromContent(text, null);
      if (subagentId) {
        registerSessionWithCache(sessionId, subagentId, subagentId);
        console.log('[OpenClaw Watcher] Detected and registered subagent from content: ' + sessionId + ' -> ' + subagentId);
      }
    }
    
    // Get effective agent ID
    const effectiveAgentId = getEffectiveAgentId(sessionId, agentId);
    
    return {
      id: event.id,
      agent_id: effectiveAgentId,
      session_id: sessionId,
      role: msg.role,
      content: text.trim(),
      timestamp: event.timestamp || new Date().toISOString(),
      created_at: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
    };
  } catch (e) {
    return null;
  }
}

/**
 * Read new lines from a file since last position
 */
function readNewLines(filePath, agentId, sessionId) {
  try {
    const stat = fs.statSync(filePath);
    const currentSize = stat.size;
    const lastPos = filePositions.get(filePath) || 0;
    
    console.log('[OpenClaw Watcher] Reading ' + filePath + ' from pos ' + lastPos + ' (size: ' + currentSize + ')');
    
    if (currentSize <= lastPos) {
      console.log('[OpenClaw Watcher] No new content (currentSize <= lastPos)');
      return [];
    }
    
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(currentSize - lastPos);
    fs.readSync(fd, buffer, 0, buffer.length, lastPos);
    fs.closeSync(fd);
    
    filePositions.set(filePath, currentSize);
    
    const newContent = buffer.toString('utf8');
    const lines = newContent.split('\n').filter(l => l.trim());
    
    console.log('[OpenClaw Watcher] Found ' + lines.length + ' new lines');
    
    const messages = [];
    for (const line of lines) {
      const msg = parseMessageLine(line, agentId, sessionId);
      if (msg) {
        messages.push(msg);
      }
    }
    
    console.log('[OpenClaw Watcher] Parsed ' + messages.length + ' messages');
    
    return messages;
  } catch (e) {
    console.error('[OpenClaw Watcher] Error reading file:', e.message);
    return [];
  }
}

/**
 * Extract session ID from filename
 */
function getSessionId(filename) {
  return path.basename(filename, '.jsonl');
}

/**
 * Get agent name from agent ID
 */
function getAgentName(agentId) {
  return config.agents.names[agentId] || agentId;
}

/**
 * Scan for all session files and initialize positions
 * Also scans for subagent context in existing sessions
 * Skips ephemeral :run: sessions to avoid performance issues
 */
function scanExistingFiles() {
  const agentsDir = OPENCLAW_AGENTS_DIR;
  
  try {
    const agents = fs.readdirSync(agentsDir);
    
    for (const agentId of agents) {
      const sessionsDir = path.join(agentsDir, agentId, 'sessions');
      
      if (!fs.existsSync(sessionsDir)) continue;
      
      // Filter out ephemeral run sessions and deleted files
      const sessions = fs.readdirSync(sessionsDir).filter(f => 
        f.endsWith('.jsonl') && 
        !f.includes(':run:') &&
        !f.includes('.deleted')
      );
      
      console.log('[OpenClaw Watcher] Agent ' + agentId + ': ' + sessions.length + ' persistent sessions (skipping :run: and .deleted)');
      
      for (const sessionFile of sessions) {
        const filePath = path.join(sessionsDir, sessionFile);
        const sessionId = getSessionId(sessionFile);
        
        // Skip ephemeral run sessions
        if (isEphemeralRunSession(sessionId)) {
          continue;
        }
        
        if (!filePositions.has(filePath)) {
          const stat = fs.statSync(filePath);
          filePositions.set(filePath, 0);  // Start from 0 to read existing content
          console.log('[OpenClaw Watcher] Initialized position for ' + filePath + ' at 0 (will read ' + stat.size + ' bytes)');
          
          // Scan for subagent context in ALL sessions
          scanSessionForSubagentContext(filePath, sessionId);
        }
      }
    }
  } catch (e) {
    console.error('[OpenClaw Watcher] Error scanning files:', e.message);
  }
}

/**
 * Check if a session is an ephemeral run session (should be skipped)
 * Run sessions are created by cron heartbeats and accumulate over time
 */
function isEphemeralRunSession(sessionId) {
  // Skip sessions with :run: in the ID - these are ephemeral cron executions
  return sessionId.includes(':run:');
}

/**
 * Poll files for changes (fallback for when chokidar doesn't work)
 */
function startPolling(onMessage, intervalMs = 500) {
  const agentsDir = OPENCLAW_AGENTS_DIR;
  
  console.log('[OpenClaw Watcher] Starting polling mode with interval ' + intervalMs + 'ms');
  console.log('[OpenClaw Watcher] Skipping ephemeral :run: sessions');
  
  const pollInterval = setInterval(() => {
    try {
      const agents = fs.readdirSync(agentsDir);
      
      for (const agentId of agents) {
        const sessionsDir = path.join(agentsDir, agentId, 'sessions');
        
        if (!fs.existsSync(sessionsDir)) continue;
        
        // Filter out ephemeral run sessions and deleted files
        const sessions = fs.readdirSync(sessionsDir).filter(f => 
          f.endsWith('.jsonl') && 
          !f.includes(':run:') &&
          !f.includes('.deleted')
        );
        
        for (const sessionFile of sessions) {
          const filePath = path.join(sessionsDir, sessionFile);
          const sessionId = getSessionId(sessionFile);
          
          // Skip ephemeral run sessions
          if (isEphemeralRunSession(sessionId)) {
            continue;
          }
          
          // Initialize position if not set
          if (!filePositions.has(filePath)) {
            filePositions.set(filePath, 0);  // Start from 0 to read existing content
            
            // Scan for subagent context in ALL new sessions
            scanSessionForSubagentContext(filePath, sessionId);
            // DON'T continue - let it read the messages below
          }
          
          // Check for changes
          const messages = readNewLines(filePath, agentId, sessionId);
          
          for (const msg of messages) {
            console.log('[OpenClaw Watcher] Broadcasting ' + msg.role.toUpperCase() + ' from ' + msg.agent_id + ': ' + msg.content.substring(0, 50));
            onMessage(msg);
          }
        }
      }
    } catch (e) {
      console.error('[OpenClaw Watcher] Polling error:', e.message);
    }
  }, intervalMs);
  
  return {
    stop: () => {
      clearInterval(pollInterval);
      console.log('[OpenClaw Watcher] Polling stopped');
    }
  };
}

/**
 * Start watching OpenClaw session files
 */
function startWatcher(onMessage, options = {}) {
  const { loadHistory = false } = options;
  const usePolling = options.usePolling ?? config.watcher.usePolling;
  const pollInterval = options.pollInterval ?? config.watcher.pollingInterval;
  
  const watchPattern = path.join(OPENCLAW_AGENTS_DIR, '*', 'sessions', '*.jsonl');
  
  console.log('[OpenClaw Watcher] Watching: ' + watchPattern);
  console.log('[OpenClaw Watcher] loadHistory: ' + loadHistory);
  console.log('[OpenClaw Watcher] usePolling: ' + usePolling);
  
  // Initialize file positions for existing files
  scanExistingFiles();
  
  // Use polling mode (more reliable on Windows)
  if (usePolling) {
    const poller = startPolling(onMessage, pollInterval);
    
    return {
      watcher: null,
      stop: () => {
        poller.stop();
        console.log('[OpenClaw Watcher] Stopped');
      },
      getActiveSessions: () => activeSessions,
      getFilePositions: () => filePositions,
      getSessionToAgent: () => sessionToAgent
    };
  }
  
  // Use chokidar (original approach)
  const watcher = chokidar.watch(watchPattern, {
    persistent: true,
    ignoreInitial: !loadHistory,
    usePolling: true,  // Enable polling in chokidar
    interval: 100,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  
  watcher.on('add', (filePath) => {
    console.log('[OpenClaw Watcher] ADD event: ' + filePath);
    
    const match = filePath.match(/agents[\/\\]([^\/\\]+)[\/\\]sessions[\/\\]([^\/\\]+)\.jsonl$/);
    if (!match) {
      console.log('[OpenClaw Watcher] Path did not match pattern');
      return;
    }
    
    const agentId = match[1];
    const sessionId = getSessionId(filePath);
    
    console.log('[OpenClaw Watcher] Matched agentId: ' + agentId + ', sessionId: ' + sessionId);
    
    // Scan for subagent context in ALL new sessions
    scanSessionForSubagentContext(filePath, sessionId);
    
    if (loadHistory) {
      filePositions.set(filePath, 0);
    } else {
      // Set position to current size so we only read NEW content
      const stat = fs.statSync(filePath);
      filePositions.set(filePath, 0);  // Start from 0
      console.log('[OpenClaw Watcher] Set initial position to 0 (will read ' + stat.size + ' bytes)');
      return;
    }
    
    const messages = readNewLines(filePath, agentId, sessionId);
    
    if (!activeSessions.has(agentId)) {
      activeSessions.set(agentId, new Set());
    }
    activeSessions.get(agentId).add(sessionId);
    
    for (const msg of messages) {
      console.log('[OpenClaw Watcher] ' + msg.role.toUpperCase() + ' from ' + msg.agent_id + ': ' + msg.content.substring(0, 50));
      onMessage(msg);
    }
  });
  
  watcher.on('change', (filePath) => {
    console.log('[OpenClaw Watcher] CHANGE event: ' + filePath);
    
    const match = filePath.match(/agents[\/\\]([^\/\\]+)[\/\\]sessions[\/\\]([^\/\\]+)\.jsonl$/);
    if (!match) {
      console.log('[OpenClaw Watcher] Path did not match pattern');
      return;
    }
    
    const agentId = match[1];
    const sessionId = getSessionId(filePath);
    
    console.log('[OpenClaw Watcher] Matched agentId: ' + agentId + ', sessionId: ' + sessionId);
    
    // If we haven't seen this file before, start from current position
    if (!filePositions.has(filePath)) {
      const stat = fs.statSync(filePath);
      filePositions.set(filePath, 0);  // Start from 0 to read existing content
      console.log('[OpenClaw Watcher] First time seeing file, set position to 0 (will read ' + stat.size + ' bytes)');
      
      // Scan for subagent context in ALL new sessions
      scanSessionForSubagentContext(filePath, sessionId);
    }
    
    const messages = readNewLines(filePath, agentId, sessionId);
    
    for (const msg of messages) {
      console.log('[OpenClaw Watcher] Broadcasting ' + msg.role.toUpperCase() + ' from ' + msg.agent_id + ': ' + msg.content.substring(0, 50));
      onMessage(msg);
    }
  });
  
  watcher.on('error', (error) => {
    console.error('[OpenClaw Watcher] Error:', error);
  });
  
  watcher.on('ready', () => {
    console.log('[OpenClaw Watcher] Ready - watching for new messages');
  });
  
  return {
    watcher,
    stop: () => {
      watcher.close();
      console.log('[OpenClaw Watcher] Stopped');
    },
    getActiveSessions: () => activeSessions,
    getFilePositions: () => filePositions,
    getSessionToAgent: () => sessionToAgent
  };
}

module.exports = {
  startWatcher,
  parseMessageLine,
  getAgentName,
  detectSubagentFromContent: sessionRegistry.detectAgentFromContent.bind(sessionRegistry),
  scanSessionForSubagentContext,
  sessionToAgent
};
