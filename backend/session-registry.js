const fs = require('fs');
const {db} = require('./db');

// Register a session -> agent mapping
function registerSession(sessionId, agentId, label) {
  try {
    db.prepare('INSERT OR REPLACE INTO sessions (session_id, agent_id, label) VALUES (?, ?, ?)').run(sessionId, agentId, label);
    console.log('[Session Registry] Registered: ' + sessionId + ' -> ' + agentId);
  } catch (e) {
    console.error('[Session Registry] Error:', e.message);
  }
}

// Look up agent for a session
function getAgentForSession(sessionId) {
  try {
    const row = db.prepare('SELECT agent_id FROM sessions WHERE session_id = ?').get(sessionId);
    return row ? row.agent_id : null;
  } catch (e) {
    return null;
  }
}

// Detect agent from content - STRICT version
// Only matches explicit subagent context markers, NOT casual mentions of agent names
function detectAgentFromContent(content, label) {
  if (!content) return null;
  
  // MUST have explicit [Subagent Context] marker to be considered a subagent
  // This prevents false positives from casual mentions like "Athena completed..."
  if (!content.includes('[Subagent Context]') && !content.includes('[subagent context]')) {
    return null;
  }
  
  // Extract the subagent context block
  const contextMatch = content.match(/\[Subagent Context\]([\s\S]*?)(?:\[\/?Subagent Context\]|$)/i);
  const contextBlock = contextMatch ? contextMatch[1] : content;
  
  // Pattern 1: Label: Athena - task
  const labelMatch = contextBlock.match(/Label:\s*([A-Za-z]+)\s*-/i);
  if (labelMatch) {
    const name = labelMatch[1].toLowerCase();
    if (['hephaestus', 'athena', 'hermes', 'apollo'].includes(name)) {
      return name;
    }
  }
  
  // Pattern 2: Agent: athena (explicit assignment)
  const agentMatch = contextBlock.match(/Agent:\s*([a-z]+)/i);
  if (agentMatch) {
    const name = agentMatch[1].toLowerCase();
    if (['hephaestus', 'athena', 'hermes', 'apollo', 'main'].includes(name)) {
      return name;
    }
  }
  
  // Pattern 3: Check label parameter (from spawn)
  if (label) {
    const lowerLabel = label.toLowerCase();
    // Must be explicit like "Athena - task" not just contain the word
    if (/^athena\s*[-:]/.test(lowerLabel)) return 'athena';
    if (/^hephaestus\s*[-:]/.test(lowerLabel)) return 'hephaestus';
    if (/^hermes\s*[-:]/.test(lowerLabel)) return 'hermes';
    if (/^apollo\s*[-:]/.test(lowerLabel)) return 'apollo';
  }
  
  return null;
}

module.exports = { registerSession, getAgentForSession, detectAgentFromContent };