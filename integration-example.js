/**
 * Dashboard Integration Example
 * 
 * This example shows how to integrate the dashboard with your agent system.
 * 
 * Usage:
 * 1. Run the dashboard server: npm run server
 * 2. Run this example: node integration-example.js
 */

import { captureThought, captureAction, updateAgentStatus } from './agent-integration.js';

// Example function to integrate with your agent system
async function integrateWithAgent(agentId) {
  console.log(`Integrating with agent ${agentId}...`);
  
  // Update agent status to thinking
  await updateAgentStatus(agentId, 'thinking');
  
  // Simulate agent thinking
  await captureThought(agentId, 'Starting analysis of market conditions');
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate more thinking
  await captureThought(agentId, 'Identified potential arbitrage opportunity between Uniswap and SushiSwap');
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Update agent status to executing
  await updateAgentStatus(agentId, 'executing');
  
  // Simulate agent executing an action
  await captureAction(
    agentId,
    'SWAP',
    'pending',
    {
      fromToken: 'ETH',
      toToken: 'USDC',
      amount: '0.5',
      dex: 'Uniswap',
    }
  );
  
  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Simulate action completion
  await captureAction(
    agentId,
    'SWAP',
    'success',
    {
      fromToken: 'ETH',
      toToken: 'USDC',
      amount: '0.5',
      dex: 'Uniswap',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...`,
    }
  );
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate agent thinking again
  await updateAgentStatus(agentId, 'thinking');
  await captureThought(agentId, 'Successfully swapped 0.5 ETH for USDC. Looking for next opportunity.');
  
  console.log(`Integration with agent ${agentId} completed.`);
}

// Run the integration example
async function runExample() {
  try {
    // Integrate with agent-3 (a new agent)
    await integrateWithAgent('agent-3');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Integrate with agent-4 (another new agent)
    await integrateWithAgent('agent-4');
    
    console.log('Example completed successfully!');
  } catch (error) {
    console.error('Error running example:', error.message);
  }
}

// Run the example
runExample(); 