/**
 * Dashboard Integration Script
 * 
 * This script captures agent thoughts and actions from your agent system
 * and sends them to the dashboard server.
 * 
 * Usage:
 * 1. Import this script in your agent runner
 * 2. Call captureThought() and captureAction() functions when agents generate thoughts or perform actions
 */

import axios from 'axios';

// Dashboard server URL
const DASHBOARD_URL = 'http://localhost:3000';

/**
 * Capture an agent's thought and send it to the dashboard
 * 
 * @param {string} agentId - The ID of the agent (e.g., 'agent-1')
 * @param {string} content - The thought content
 * @returns {Promise} - Promise resolving to the API response
 */
export async function captureThought(agentId, content) {
  try {
    const thought = {
      id: `thought-${Date.now()}`,
      agentId,
      content,
      timestamp: Date.now(),
    };
    
    const response = await axios.post(`${DASHBOARD_URL}/api/thoughts`, {
      agentId,
      thought,
    });
    
    console.log(`Thought captured for ${agentId}`);
    return response.data;
  } catch (error) {
    console.error('Error capturing thought:', error.message);
    return null;
  }
}

/**
 * Capture an agent's on-chain action and send it to the dashboard
 * 
 * @param {string} agentId - The ID of the agent (e.g., 'agent-1')
 * @param {string} type - The action type (e.g., 'SWAP', 'DEPOSIT')
 * @param {string} status - The action status ('pending', 'success', 'failed')
 * @param {Object} details - The action details (e.g., { fromToken: 'ETH', toToken: 'USDC', amount: '0.5' })
 * @returns {Promise} - Promise resolving to the API response
 */
export async function captureAction(agentId, type, status, details) {
  try {
    const action = {
      id: `action-${Date.now()}`,
      agentId,
      type,
      status,
      details,
      timestamp: Date.now(),
    };
    
    const response = await axios.post(`${DASHBOARD_URL}/api/actions`, {
      agentId,
      action,
    });
    
    console.log(`Action captured for ${agentId}`);
    return response.data;
  } catch (error) {
    console.error('Error capturing action:', error.message);
    return null;
  }
}

/**
 * Update agent status
 * 
 * @param {string} agentId - The ID of the agent (e.g., 'agent-1')
 * @param {string} status - The agent status ('idle', 'thinking', 'executing')
 * @returns {Promise} - Promise resolving to the API response
 */
export async function updateAgentStatus(agentId, status) {
  try {
    const response = await axios.post(`${DASHBOARD_URL}/api/agents/${agentId}/status`, {
      status,
    });
    
    console.log(`Status updated for ${agentId}: ${status}`);
    return response.data;
  } catch (error) {
    console.error('Error updating agent status:', error.message);
    return null;
  }
}

// Example usage:
// captureThought('agent-1', 'I am analyzing market conditions');
// captureAction('agent-1', 'SWAP', 'success', { fromToken: 'ETH', toToken: 'USDC', amount: '0.5' });
// updateAgentStatus('agent-1', 'thinking');

module.exports = {
  captureThought,
  captureAction,
  updateAgentStatus,
}; 