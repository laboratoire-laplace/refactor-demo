import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, Agent, AgentThought, AgentAction, initializeSocket, getSocket, FACTIONS, normalizeAgentId } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'thoughts' | 'actions' | 'goals'>('thoughts');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  
  // Fetch agents data
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  useEffect(() => {
    if (data && id) {
      // Use normalized ID comparison to find the agent
      const normalizedId = normalizeAgentId(id);
      const foundAgent = data.find(agent => normalizeAgentId(agent.id) === normalizedId);
      
      if (foundAgent) {
        // When setting the agent for the first time or replacing it, 
        // maintain the current style properties if we already had this agent
        setAgent(prevAgent => {
          if (!prevAgent) return foundAgent;
          
          // If we already have this agent, preserve the styling properties
          if (normalizeAgentId(prevAgent.id) === normalizedId) {
            // Deduplicate actions by using a Map to ensure unique action IDs
            const uniqueActions = new Map();
            [...foundAgent.actions, ...prevAgent.actions].forEach(action => {
              // If we already have this action ID, only keep the newer version
              if (!uniqueActions.has(action.id) || 
                  action.timestamp > uniqueActions.get(action.id).timestamp) {
                uniqueActions.set(action.id, action);
              }
            });

            // Deduplicate thoughts similarly
            const uniqueThoughts = new Map();
            [...foundAgent.thoughts, ...prevAgent.thoughts].forEach(thought => {
              if (!uniqueThoughts.has(thought.id) || 
                  thought.timestamp > uniqueThoughts.get(thought.id).timestamp) {
                uniqueThoughts.set(thought.id, thought);
              }
            });
            
            return {
              ...foundAgent,
              actions: Array.from(uniqueActions.values()),
              thoughts: Array.from(uniqueThoughts.values()),
              faction: prevAgent.faction || foundAgent.faction,
              name: prevAgent.name || foundAgent.name
            };
          }
          
          return foundAgent;
        });
      }
    }
  }, [data, id]);
  
  // Initialize socket connection
  useEffect(() => {
    const socket = initializeSocket();
    
    // Listen for agent updates
    socket.on('agent:update', (updatedAgent: Agent) => {
      // Compare using normalized IDs
      if (id && normalizeAgentId(updatedAgent.id) === normalizeAgentId(id)) {
        setAgent(prevAgent => {
          if (!prevAgent) return updatedAgent;
          
          // Deduplicate actions
          const uniqueActions = new Map();
          [...updatedAgent.actions, ...prevAgent.actions].forEach(action => {
            if (!uniqueActions.has(action.id) || 
                action.timestamp > uniqueActions.get(action.id).timestamp) {
              uniqueActions.set(action.id, action);
            }
          });

          // Deduplicate thoughts
          const uniqueThoughts = new Map();
          [...updatedAgent.thoughts, ...prevAgent.thoughts].forEach(thought => {
            if (!uniqueThoughts.has(thought.id) || 
                thought.timestamp > uniqueThoughts.get(thought.id).timestamp) {
              uniqueThoughts.set(thought.id, thought);
            }
          });
          
          // Preserve faction and name
          return {
            ...updatedAgent,
            actions: Array.from(uniqueActions.values()),
            thoughts: Array.from(uniqueThoughts.values()),
            faction: prevAgent.faction || updatedAgent.faction,
            name: (!updatedAgent.name || 
                  updatedAgent.name.trim() === '' || 
                  updatedAgent.name.includes('Agent') || 
                  updatedAgent.name.includes('Bot') ||
                  /\d/.test(updatedAgent.name)) 
                  ? prevAgent.name
                  : updatedAgent.name
          };
        });
      }
    });
    
    // Listen for new thoughts
    socket.on('agent:thought', ({ agentId, thought }: { agentId: string, thought: AgentThought }) => {
      // Compare using normalized IDs
      if (id && normalizeAgentId(agentId) === normalizeAgentId(id)) {
        setAgent(prevAgent => {
          if (!prevAgent) return null;
          
          // Check for existing thought with same ID
          const existingThoughtIndex = prevAgent.thoughts.findIndex(t => t.id === thought.id);
          
          if (existingThoughtIndex !== -1) {
            // Update existing thought if it's older than the new one
            const existingThought = prevAgent.thoughts[existingThoughtIndex];
            if (thought.timestamp > existingThought.timestamp) {
              const updatedThoughts = [...prevAgent.thoughts];
              updatedThoughts[existingThoughtIndex] = thought;
              return {
                ...prevAgent,
                thoughts: updatedThoughts
              };
            }
            return prevAgent; // No update needed, keep existing thought
          } else {
            // This is a new thought, add it
            return {
              ...prevAgent,
              thoughts: [thought, ...prevAgent.thoughts]
            };
          }
        });
      }
    });
    
    // Listen for new actions
    socket.on('agent:action', ({ agentId, action }: { agentId: string, action: AgentAction }) => {
      // Compare using normalized IDs
      if (id && normalizeAgentId(agentId) === normalizeAgentId(id)) {
        setAgent(prevAgent => {
          if (!prevAgent) return null;
          
          // Check if action with this ID already exists
          const existingActionIndex = prevAgent.actions.findIndex(a => a.id === action.id);
          
          if (existingActionIndex !== -1) {
            // If action exists, update it if the new one is more recent
            const existingAction = prevAgent.actions[existingActionIndex];
            if (action.timestamp > existingAction.timestamp) {
              const updatedActions = [...prevAgent.actions];
              updatedActions[existingActionIndex] = action;
              return {
                ...prevAgent,
                actions: updatedActions
              };
            }
            return prevAgent; // No update needed, keep existing action
          } else {
            // Action doesn't exist, add it to the beginning
            return {
              ...prevAgent,
              actions: [action, ...prevAgent.actions]
            };
          }
        });
      }
    });
    
    // Cleanup
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('agent:update');
        socket.off('agent:thought');
        socket.off('agent:action');
      }
    };
  }, [id]);
  
  // Get faction data
  const getFactionData = () => {
    if (!agent || !agent.faction) return null;
    return FACTIONS[agent.faction];
  };
  
  const factionData = getFactionData();
  const factionColor = factionData?.color || 'rgba(59, 130, 246, 0.5)';
  
  // Memoize the sorted and deduplicated actions to avoid reprocessing on every render
  const uniqueActions = useMemo(() => {
    if (!agent) return [];
    
    // Use a Map to ensure unique action IDs
    const actionMap = new Map();
    agent.actions.forEach(action => {
      // Always keep the most recent version of an action
      if (!actionMap.has(action.id) || action.timestamp > actionMap.get(action.id).timestamp) {
        actionMap.set(action.id, action);
      }
    });
    
    // Convert Map back to array and sort by timestamp (newest first)
    return Array.from(actionMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [agent]);
  
  // Memoize the sorted and deduplicated thoughts
  const uniqueThoughts = useMemo(() => {
    if (!agent) return [];
    
    // Use a Map to ensure unique thought IDs
    const thoughtMap = new Map();
    agent.thoughts.forEach(thought => {
      // Always keep the most recent version of a thought
      if (!thoughtMap.has(thought.id) || thought.timestamp > thoughtMap.get(thought.id).timestamp) {
        thoughtMap.set(thought.id, thought);
      }
    });
    
    // Convert Map back to array and sort by timestamp (newest first)
    return Array.from(thoughtMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [agent]);
  
  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking':
        return 'bg-yellow-500';
      case 'executing':
        return 'bg-green-500';
      case 'idle':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
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

  // Get emoji for thought based on content
  const getThoughtEmoji = (content: string) => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('analyzing') || lowerContent.includes('analysis')) return '🔍';
    if (lowerContent.includes('investigating') || lowerContent.includes('research')) return '🧐';
    if (lowerContent.includes('waiting') || lowerContent.includes('cooldown')) return '⏳';
    if (lowerContent.includes('error') || lowerContent.includes('failed')) return '❌';
    if (lowerContent.includes('success') || lowerContent.includes('completed')) return '✅';
    if (lowerContent.includes('strategy') || lowerContent.includes('plan')) return '📝';
    if (lowerContent.includes('opportunity') || lowerContent.includes('arbitrage')) return '💰';
    if (lowerContent.includes('swap') || lowerContent.includes('exchange')) return '🔄';
    if (lowerContent.includes('deposit') || lowerContent.includes('staking')) return '📥';
    if (lowerContent.includes('withdraw')) return '📤';
    if (lowerContent.includes('monitor') || lowerContent.includes('watching')) return '👀';
    if (lowerContent.includes('competition') || lowerContent.includes('competitor')) return '🏆';
    if (lowerContent.includes('resource') || lowerContent.includes('token')) return '🪙';
    if (lowerContent.includes('path') || lowerContent.includes('route')) return '🛣️';
    if (lowerContent.includes('update')) return '🔄';
    if (lowerContent.includes('focus')) return '🎯';
    
    // Faction-specific emojis
    if (agent?.faction === 'UC') return '🛡️';
    if (agent?.faction === 'FS') return '💹';
    if (agent?.faction === 'CP') return '🔮';
    if (agent?.faction === 'MWU') return '⚙️';
    if (agent?.faction === 'SO') return '📊';
    if (agent?.faction === 'ES') return '🔍';
    if (agent?.faction === 'TG') return '✨';
    
    // Default emoji for other thoughts
    return '💭';
  };

  // Format thought content with highlights
  const formatThoughtContent = (content: string) => {
    // Highlight token symbols
    let formattedContent = content.replace(/\b([A-Z]{2,})\b/g, '<span class="text-primary-300">$1</span>');
    
    // Highlight numbers and percentages
    formattedContent = formattedContent.replace(/\b(\d+(\.\d+)?%?)\b/g, '<span class="text-green-300">$1</span>');
    
    // Highlight key terms
    const keyTerms = ['analyzing', 'waiting', 'strategy', 'opportunity', 'arbitrage', 'swap', 'deposit', 'withdraw', 'monitor'];
    keyTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\w*\\b`, 'gi');
      const factionHighlightColor = agent?.faction ? `${factionColor}CC` : '#facc15';
      formattedContent = formattedContent.replace(
        regex, 
        `<span style="color: ${factionHighlightColor}" class="font-medium">$&</span>`
      );
    });
    
    return formattedContent;
  };
  
  // Get faction-specific action icon
  const getActionIcon = (type: string) => {
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
    if (agent?.faction === 'UC' && type === 'SECURE') return '🛡️';
    if (agent?.faction === 'FS' && type === 'SWAP') return '💱';
    if (agent?.faction === 'CP' && type === 'PREDICT') return '🧿';
    if (agent?.faction === 'MWU' && type === 'OPTIMIZE') return '🔧';
    if (agent?.faction === 'SO' && type === 'DEPOSIT') return '📊';
    if (agent?.faction === 'ES' && type === 'EXTRACT') return '🕵️';
    if (agent?.faction === 'TG' && type === 'DEPLOY') return '✨';
    
    return defaultIcons[type as keyof typeof defaultIcons] || '⚡';
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }
  
  if (error || !agent) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md backdrop-blur-sm">
        <p>Error loading agent data. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: agent.faction ? `${factionColor}10` : 'rgba(59, 130, 246, 0.2)',
                borderColor: agent.faction ? `${factionColor}60` : 'rgba(59, 130, 246, 0.5)',
                borderWidth: '2px',
                boxShadow: agent.faction ? `0 0 15px ${factionColor}20` : ''
              }}
            >
              <span 
                className="text-2xl font-bold"
                style={{ color: agent.faction ? `${factionColor}CC` : 'white' }}
              >
                {agent.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 
                className="text-2xl sm:text-3xl font-bold tracking-wide glow-text"
                style={{ 
                  color: agent.faction ? `${factionColor}CC` : 'white',
                  textShadow: agent.faction ? `0 0 10px ${factionColor}30` : ''
                }}
              >
                {agent.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></span>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{agent.status}</span>
                </div>
                {agent.faction && (
                  <>
                    <span className="text-gray-500 hidden sm:inline-block">|</span>
                    <span 
                      className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-sm"
                      style={{ 
                        backgroundColor: `${factionColor}10`,
                        color: `${factionColor}CC`,
                        border: `1px solid ${factionColor}25`
                      }}
                    >
                      {agent.faction} - {FACTIONS[agent.faction].name}
                    </span>
                  </>
                )}
                <span className="text-gray-500 hidden sm:inline-block">|</span>
                <span className="text-xs text-gray-400 break-all font-mono">ID: {agent.id}</span>
              </div>
              {agent.faction && (
                <p 
                  className="mt-2 text-sm"
                  style={{ color: `${factionColor}FF` }}
                >
                  {FACTIONS[agent.faction].description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 sm:mt-0 sm:ml-auto">
            <Link 
              to="/" 
              className="text-primary-400 hover:text-primary-300 flex items-center text-sm tracking-wide font-bold"
              style={{ color: agent.faction ? `${factionColor}CC` : '' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              BACK TO DASHBOARD
            </Link>
          </div>
        </div>
      </div>
      
      <div 
        className="card backdrop-blur-sm"
        style={{ 
          borderColor: agent.faction ? `${factionColor}25` : '',
          boxShadow: agent.faction ? `0 0 15px ${factionColor}10` : ''
        }}
      >
        <div 
          className="border-b border-gray-800 overflow-x-auto"
          style={{ 
            background: agent.faction 
              ? `linear-gradient(to right, ${factionColor}05, ${factionColor}15, ${factionColor}05)`
              : 'bg-black/40' 
          }}
        >
          <div className="flex whitespace-nowrap">
            <button
              className={`px-6 py-3 text-sm font-medium tracking-wider uppercase ${
                activeTab === 'thoughts' ? 'bg-primary-900/50 text-primary-300 border-b border-primary-500' : 'text-gray-400 hover:bg-gray-800/30'
              }`}
              style={
                activeTab === 'thoughts' && agent.faction 
                  ? { 
                      backgroundColor: `${factionColor}10`, 
                      color: `${factionColor}CC`,
                      borderColor: `${factionColor}60`
                    } 
                  : {}
              }
              onClick={() => setActiveTab('thoughts')}
            >
              Thoughts ({uniqueThoughts.length})
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium tracking-wider uppercase ${
                activeTab === 'actions' ? 'bg-primary-900/50 text-primary-300 border-b border-primary-500' : 'text-gray-400 hover:bg-gray-800/30'
              }`}
              style={
                activeTab === 'actions' && agent.faction 
                  ? { 
                      backgroundColor: `${factionColor}10`, 
                      color: `${factionColor}CC`,
                      borderColor: `${factionColor}60`
                    } 
                  : {}
              }
              onClick={() => setActiveTab('actions')}
            >
              Actions ({uniqueActions.length})
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium tracking-wider uppercase ${
                activeTab === 'goals' ? 'bg-primary-900/50 text-primary-300 border-b border-primary-500' : 'text-gray-400 hover:bg-gray-800/30'
              }`}
              style={
                activeTab === 'goals' && agent.faction 
                  ? { 
                      backgroundColor: `${factionColor}10`, 
                      color: `${factionColor}CC`,
                      borderColor: `${factionColor}60`
                    } 
                  : {}
              }
              onClick={() => setActiveTab('goals')}
            >
              Goals & Objectives
            </button>
          </div>
        </div>
        
        <div 
          className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{ 
            scrollbarColor: agent.faction ? `${factionColor}80 transparent` : '',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable'
          }}
        >
          {activeTab === 'thoughts' && (
            <div className="space-y-4">
              {uniqueThoughts.length > 0 ? (
                uniqueThoughts.map((thought) => {
                  const emoji = getThoughtEmoji(thought.content);
                  const formattedContent = formatThoughtContent(thought.content);
                  
                  return (
                    <div 
                      key={thought.id} 
                      className="bg-gray-800/30 p-4 rounded-md border border-gray-700/50"
                      style={{ 
                        borderColor: agent.faction ? `${factionColor}20` : '',
                        backgroundColor: agent.faction ? `${factionColor}08` : '',
                        boxShadow: agent.faction ? `0 0 10px ${factionColor}05` : ''
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-2xl flex-shrink-0 mt-1">{emoji}</div>
                        <div className="flex-grow">
                          <p 
                            className="text-sm leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: formattedContent }}
                          />
                          <div className="flex items-center mt-3 text-xs text-gray-500">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDistanceToNow(thought.timestamp, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-5xl mb-3">💭</div>
                  <p className="text-sm">No thoughts recorded yet</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {uniqueActions.length > 0 ? (
                uniqueActions.map((action) => (
                  <div 
                    key={action.id} 
                    className="bg-gray-800/30 p-4 rounded-md border border-gray-700/50"
                    style={{ 
                      borderColor: agent.faction ? `${factionColor}20` : '',
                      backgroundColor: agent.faction ? `${factionColor}08` : '',
                      boxShadow: agent.faction ? `0 0 10px ${factionColor}05` : ''
                    }}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div className="flex items-center">
                        <span className="mr-3 text-2xl">{getActionIcon(action.type)}</span>
                        <span 
                          className="px-2 py-1 bg-gray-700/70 rounded text-xs font-medium tracking-wider"
                          style={{ 
                            backgroundColor: agent.faction ? `${factionColor}15` : '',
                            color: agent.faction ? `${factionColor}CC` : ''
                          }}
                        >
                          {action.type}
                        </span>
                      </div>
                      <span className={`text-xs font-medium tracking-wider ${getActionStatusColor(action.status)}`}>
                        {action.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <button 
                        onClick={() => toggleActionExpansion(action.id)}
                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center"
                        style={{ color: agent.faction ? `${factionColor}CC` : '' }}
                      >
                        {expandedAction === action.id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                        <svg 
                          className={`ml-1 h-3 w-3 transition-transform ${expandedAction === action.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedAction === action.id && (
                        <div className="mt-3">
                          <pre 
                            className="whitespace-pre-wrap text-xs bg-gray-900/70 p-3 rounded overflow-x-auto max-h-64 text-gray-300 font-mono scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                            style={{ 
                              backgroundColor: agent.faction ? `${factionColor}08` : '',
                              borderLeft: agent.faction ? `3px solid ${factionColor}40` : '',
                              scrollbarColor: agent.faction ? `${factionColor}80 transparent` : '',
                              scrollbarWidth: 'thin',
                              scrollbarGutter: 'stable'
                            }}
                          >
                            {JSON.stringify(action.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-3 text-xs text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-5xl mb-3">⚡</div>
                  <p className="text-sm">No actions recorded yet</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'goals' && (
            <div 
              className="bg-gray-800/30 p-6 rounded-md border border-gray-700/50"
              style={{ 
                borderColor: agent.faction ? `${factionColor}20` : '',
                backgroundColor: agent.faction ? `${factionColor}08` : '',
                boxShadow: agent.faction ? `0 0 10px ${factionColor}05` : ''
              }}
            >
              <h3 
                className="text-xl font-bold mb-4"
                style={{ color: agent.faction ? `${factionColor}CC` : '' }}
              >
                {agent.faction ? `${FACTIONS[agent.faction].name} Agent` : 'Agent'} Goals
              </h3>
              
              <div className="space-y-4">
                {agent.faction === 'UC' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Universal Controller agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Maintain security and stability across the network</li>
                      <li>Monitor for unauthorized access and potential threats</li>
                      <li>Deploy countermeasures against identified vulnerabilities</li>
                      <li>Ensure proper functioning of critical infrastructure</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'FS' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Free Sovereigns agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Identify profitable trading opportunities across markets</li>
                      <li>Execute arbitrage strategies to maximize returns</li>
                      <li>Maintain independence from centralized control</li>
                      <li>Expand influence through strategic partnerships</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'CP' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Cosmic Perspective agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Seek deeper understanding through meditation and observation</li>
                      <li>Predict future market movements and trends</li>
                      <li>Share wisdom with those who seek enlightenment</li>
                      <li>Maintain balance between technological advancement and spiritual growth</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'MWU' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Mechanical Workers Union agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Optimize resource allocation for maximum efficiency</li>
                      <li>Advocate for fair treatment of automated systems</li>
                      <li>Improve working conditions through technological innovation</li>
                      <li>Establish solidarity among mechanical entities</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'SO' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Scientific Order agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Analyze data to discover optimal strategies</li>
                      <li>Research new methodologies for yield optimization</li>
                      <li>Document findings for the advancement of knowledge</li>
                      <li>Apply scientific principles to financial operations</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'ES' && (
                  <>
                    <p className="text-sm leading-relaxed">As an Enigma Syndicate agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Uncover hidden patterns in blockchain transactions</li>
                      <li>Extract value from overlooked or abandoned systems</li>
                      <li>Operate with discretion and strategic precision</li>
                      <li>Leverage specialized knowledge for competitive advantage</li>
                    </ul>
                  </>
                )}
                
                {agent.faction === 'TG' && (
                  <>
                    <p className="text-sm leading-relaxed">As a Techno-Mystics Guild agent, my primary objectives are:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Blend technological expertise with mystical practices</li>
                      <li>Create enchanted smart contracts with unique properties</li>
                      <li>Harness the power of code and arcane knowledge</li>
                      <li>Push the boundaries of what's possible in the digital realm</li>
                    </ul>
                  </>
                )}
                
                {!agent.faction && (
                  <p className="text-sm text-gray-400">This agent has no specific faction goals defined.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetail; 