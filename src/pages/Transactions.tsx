import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, AgentAction, initializeSocket, getSocket, FACTIONS } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import React from 'react';

interface EnhancedAgentAction extends AgentAction {
  agentName: string;
  faction?: string;
}

// Add a function to check if an action is blockchain-related
const isBlockchainAction = (action: EnhancedAgentAction): boolean => {
  if (!action) return false;
  
  // Check action type for blockchain-related keywords
  const actionType = typeof action.type === 'string' ? action.type.toLowerCase() : '';
  
  // Get action name from details if available
  let actionName = '';
  if (action.details && typeof action.details === 'object' && 'actionName' in action.details) {
    const nameValue = action.details.actionName;
    if (typeof nameValue === 'string') {
      actionName = nameValue.toLowerCase();
    }
  }
  
  // Common blockchain operation keywords
  const blockchainKeywords = [
    'swap', 'deposit', 'withdraw', 'stake', 'unstake', 'claim', 'transfer',
    'mint', 'burn', 'approve', 'invoke', 'execute', 'call', 'transaction',
    'addliquidity', 'removeliquidity', 'getamountout', 'getamountin',
    'deposittoreactor', 'withdrawfromreactor', 'reactor', 'harvest',
    'claimfaucet', 'faucet', 'erc20', 'token', 'pool', 'liquidity', 'balance', 'blockchain'
  ];
  
  // Check if action type or name contains any blockchain keywords
  const hasBlockchainKeyword = blockchainKeywords.some(keyword => 
    actionType.includes(keyword) || actionName.includes(keyword)
  );
  
  // Check if action type is one of the standard blockchain types
  const standardBlockchainTypes = [
    'SWAP', 'DEPOSIT', 'WITHDRAW', 'STAKE', 'UNSTAKE', 'CLAIM', 
    'APPROVE', 'TRANSFER', 'INVOKE', 'TRANSACTION', 'BLOCKCHAIN'
  ];
  
  const isStandardType = standardBlockchainTypes.includes(action.type);
  
  // Check if action has blockchain-specific properties in details
  let hasBlockchainProps = false;
  
  if (action.details && typeof action.details === 'object') {
    const details = action.details;
    hasBlockchainProps = 
      'contractAddress' in details ||
      'txHash' in details ||
      'transaction' in details ||
      'calldata' in details ||
      'abi' in details ||
      'tokenAddress' in details ||
      'poolAddress' in details ||
      'pairAddress' in details ||
      'lpToken' in details ||
      'reactorAddress' in details ||
      'reactorIndex' in details ||
      'amountIn' in details ||
      'amountOut' in details ||
      'tokenIn' in details ||
      'tokenOut' in details ||
      ('fromToken' in details && 'toToken' in details);
  }
  
  return hasBlockchainKeyword || isStandardType || hasBlockchainProps;
};

const Transactions = () => {
  const [allActions, setAllActions] = useState<EnhancedAgentAction[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  
  // Fetch agents data
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  useEffect(() => {
    if (data) {
      // Combine all actions from all agents
      const actions = data.flatMap(agent => 
        agent.actions.map(action => ({
          ...action,
          agentName: agent.name,
          faction: agent.faction
        }))
      );
      
      // Filter to only include blockchain-related actions
      const blockchainActions = actions.filter(isBlockchainAction);
      
      // Sort by timestamp (newest first)
      blockchainActions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Deduplicate actions by ID
      const uniqueActions = Array.from(
        new Map(blockchainActions.map(action => [action.id, action])).values()
      );
      
      setAllActions(uniqueActions);
    }
  }, [data]);
  
  // Initialize socket connection
  useEffect(() => {
    const socket = initializeSocket();
    
    // Listen for new actions
    socket.on('agent:action', ({ agentId, action }) => {
      if (data) {
        const agent = data.find(a => a.id === agentId);
        if (agent) {
          setAllActions(prevActions => {
            // Create enhanced action with agent info
            const enhancedAction = {
              ...action,
              agentName: agent.name,
              faction: agent.faction
            };
            
            // Only add if it's a blockchain action
            if (!isBlockchainAction(enhancedAction)) {
              return prevActions;
            }
            
            // Check if we already have this action
            const actionExists = prevActions.some(a => a.id === action.id);
            if (actionExists) {
              // If action exists, update it instead of adding a duplicate
              return prevActions.map(a => a.id === action.id ? enhancedAction : a);
            }
            
            // Otherwise, add it to the beginning
            return [enhancedAction, ...prevActions];
          });
        }
      }
    });
    
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('agent:action');
      }
    };
  }, [data]);
  
  // Get faction color
  const getFactionColor = (faction?: string) => {
    if (!faction || !FACTIONS[faction as keyof typeof FACTIONS]) return '';
    return FACTIONS[faction as keyof typeof FACTIONS].color;
  };
  
  // Action status color
  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };
  
  // Toggle action details expansion
  const toggleActionExpansion = (actionId: string) => {
    if (expandedAction === actionId) {
      setExpandedAction(null);
    } else {
      setExpandedAction(actionId);
    }
  };
  
  // Get action type icon
  const getActionTypeIcon = (type: string, faction?: string) => {
    // Default icons
    const defaultIcons = {
      'SWAP': '🔄',
      'DEPOSIT': '📥',
      'WITHDRAW': '📤',
      'STAKE': '📌',
      'CLAIM': '💰',
      'SECURE': '🔒',
      'PREDICT': '🔮',
      'OPTIMIZE': '⚙️',
      'EXTRACT': '🔍',
      'DEPLOY': '🚀'
    };
    
    // Faction-specific overrides
    if (faction === 'UC' && type === 'SECURE') return '🛡️';
    if (faction === 'FS' && type === 'SWAP') return '💱';
    if (faction === 'CP' && type === 'PREDICT') return '🧿';
    if (faction === 'MWU' && type === 'OPTIMIZE') return '🔧';
    if (faction === 'SO' && type === 'DEPOSIT') return '📊';
    if (faction === 'ES' && type === 'EXTRACT') return '🕵️';
    if (faction === 'TG' && type === 'DEPLOY') return '✨';
    
    return defaultIcons[type as keyof typeof defaultIcons] || '⚡';
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-wide glow-text">TRANSACTIONS</h2>
        <p className="text-gray-400 mt-2 tracking-wide">View all on-chain transactions performed by your agents</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md backdrop-blur-sm">
          <p>Error loading transaction data. Please try again later.</p>
        </div>
      ) : (
        <>
          {allActions.length > 0 ? (
            <>
              {/* Desktop view */}
              <div className="hidden md:block card backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <table className="w-full">
                    <thead className="bg-black/40 border-b border-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {allActions.map((action) => {
                        const factionColor = getFactionColor(action.faction);
                        const isExpanded = expandedAction === action.id;
                        
                        return (
                          <React.Fragment key={`group-${action.id}`}>
                            <tr 
                              className="hover:bg-gray-800/30 transition-colors"
                              style={{ 
                                backgroundColor: action.faction ? `${factionColor}10` : '' 
                              }}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Link 
                                  to={`/agents/${action.agentId}`} 
                                  className="text-primary-400 hover:text-primary-300 transition-colors"
                                  style={{ color: factionColor ? `${factionColor}CC` : '' }}
                                >
                                  {action.agentName}
                                </Link>
                                {action.faction && (
                                  <span 
                                    className="ml-2 text-xs uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                                    style={{ 
                                      backgroundColor: `${factionColor}10`,
                                      color: `${factionColor}CC`,
                                      border: `1px solid ${factionColor}25`
                                    }}
                                  >
                                    {action.faction}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="mr-2">{getActionTypeIcon(action.type, action.faction)}</span>
                                  <span 
                                    className="px-2 py-0.5 bg-gray-700/70 rounded text-xs font-medium tracking-wider"
                                    style={{ 
                                      backgroundColor: action.faction ? `${factionColor}15` : '',
                                      color: action.faction ? `${factionColor}CC` : ''
                                    }}
                                  >
                                    {action.type}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-xs font-medium tracking-wider ${getActionStatusColor(action.status)}`}>
                                  {action.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button 
                                  onClick={() => toggleActionExpansion(action.id)}
                                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center ml-auto"
                                  style={{ color: factionColor ? `${factionColor}CC` : '' }}
                                >
                                  {isExpanded ? 'HIDE' : 'VIEW'}
                                  <svg 
                                    className={`ml-1 h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr 
                                key={`details-${action.id}`}
                                className="bg-black/40 border-b border-gray-800"
                                style={{ 
                                  backgroundColor: action.faction ? `${factionColor}08` : '' 
                                }}
                              >
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="p-2">
                                    <h4 className="text-sm font-medium mb-2 text-gray-300">Transaction Details:</h4>
                                    <pre 
                                      className="whitespace-pre-wrap text-xs bg-gray-900/70 p-3 rounded overflow-x-auto max-h-64 text-gray-300 font-mono scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                                      style={{ 
                                        backgroundColor: action.faction ? `${factionColor}08` : '',
                                        borderLeft: action.faction ? `3px solid ${factionColor}40` : '',
                                        scrollbarColor: action.faction ? `${factionColor}80 transparent` : '',
                                        scrollbarWidth: 'thin',
                                        scrollbarGutter: 'stable'
                                      }}
                                    >
                                      {JSON.stringify(action.details, null, 2)}
                                    </pre>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Mobile view */}
              <div className="md:hidden space-y-4 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {allActions.map((action) => {
                  const factionColor = getFactionColor(action.faction);
                  const isExpanded = expandedAction === action.id;
                  
                  return (
                    <div 
                      key={`mobile-${action.id}`} 
                      className="card backdrop-blur-sm overflow-hidden"
                      style={{ 
                        borderColor: action.faction ? `${factionColor}25` : '',
                        boxShadow: action.faction ? `0 0 10px ${factionColor}10` : ''
                      }}
                    >
                      <div 
                        className="p-4 border-b border-gray-800 bg-black/40 flex justify-between items-center"
                        style={{ 
                          background: action.faction 
                            ? `linear-gradient(to right, ${factionColor}05, ${factionColor}15, ${factionColor}05)`
                            : 'bg-black/40' 
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getActionTypeIcon(action.type, action.faction)}</span>
                          <div>
                            <span 
                              className="px-2 py-0.5 bg-gray-700/70 rounded text-xs font-medium tracking-wider"
                              style={{ 
                                backgroundColor: action.faction ? `${factionColor}15` : '',
                                color: action.faction ? `${factionColor}CC` : ''
                              }}
                            >
                              {action.type}
                            </span>
                            <div className="mt-1">
                              <span className={`text-xs font-medium tracking-wider ${getActionStatusColor(action.status)}`}>
                                {action.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400 mb-1">
                            {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                          </div>
                          <Link 
                            to={`/agents/${action.agentId}`} 
                            className="block text-primary-400 text-sm"
                            style={{ color: factionColor ? `${factionColor}CC` : '' }}
                          >
                            {action.agentName}
                          </Link>
                        </div>
                      </div>
                      
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          {action.faction && (
                            <span 
                              className="text-xs uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                              style={{ 
                                backgroundColor: `${factionColor}10`,
                                color: `${factionColor}CC`,
                                border: `1px solid ${factionColor}25`
                              }}
                            >
                              {action.faction}
                            </span>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => toggleActionExpansion(action.id)}
                          className="text-xs text-primary-400 hover:text-primary-300 flex items-center"
                          style={{ color: factionColor ? `${factionColor}CC` : '' }}
                        >
                          {isExpanded ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                          <svg 
                            className={`ml-1 h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 bg-black/40 border-t border-gray-800">
                          <h4 className="text-sm font-medium mb-2 text-gray-300">Transaction Details:</h4>
                          <pre 
                            className="whitespace-pre-wrap text-xs bg-gray-900/70 p-3 rounded overflow-x-auto max-h-64 text-gray-300 font-mono scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                            style={{ 
                              backgroundColor: action.faction ? `${factionColor}08` : '',
                              borderLeft: action.faction ? `3px solid ${factionColor}40` : '',
                              scrollbarColor: action.faction ? `${factionColor}80 transparent` : '',
                              scrollbarWidth: 'thin',
                              scrollbarGutter: 'stable'
                            }}
                          >
                            {JSON.stringify(action.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="card backdrop-blur-sm p-8 text-center">
              <div className="text-5xl mb-4">⚡</div>
              <p className="text-gray-400">No transactions found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;