import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, Agent, AgentThought, AgentAction, initializeSocket, getSocket, FACTIONS, FACTION_NAMES } from '../services/api';
import AgentCard from '../components/AgentCard';

// Define faction type
type FactionKey = keyof typeof FACTIONS | 'all';

// Helper function to assign sci-fi names to agents (copied from api.ts)
const assignSciFiName = (agent: Agent): Agent => {
  if (agent.faction) {
    // Check if the agent doesn't have a name or has a generic/default name
    const hasGenericName = !agent.name || 
                          agent.name.trim() === '' || 
                          agent.name.includes('Agent') || 
                          agent.name.includes('Bot') ||
                          /\d/.test(agent.name); // Only replace names with numbers
    
    if (hasGenericName) {
      const factionNames = FACTION_NAMES[agent.faction];
      // Generate a deterministic index based on agent ID to always get the same name for the same agent
      const nameIndex = agent.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % factionNames.length;
      return { ...agent, name: factionNames[nameIndex] };
    }
  }
  return agent;
};

// Check if an agent has actual data
const hasAgentData = (agent: Agent): boolean => {
  return agent.thoughts.length > 0 || agent.actions.length > 0;
};

// Normalize agent ID to handle prefixes like "cli:"
const normalizeAgentId = (id: string): string => {
  // Remove prefixes like "cli:" if they exist
  return id.replace(/^(cli:|ui:|web:)/i, '');
};

// Check if an agent is active (had activity in the last 5 minutes)
// This function is kept for reference but not used in the current implementation
/*
const isAgentActive = (agent: Agent): boolean => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  // Check for recent thoughts
  const hasRecentThoughts = agent.thoughts.some(thought => thought.timestamp > fiveMinutesAgo);
  
  // Check for recent actions
  const hasRecentActions = agent.actions.some(action => action.timestamp > fiveMinutesAgo);
  
  return hasRecentThoughts || hasRecentActions;
};
*/

const Dashboard = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [factionFilter, setFactionFilter] = useState<FactionKey>('all');
  
  // Fetch agents data
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  // Update agents when data changes
  useEffect(() => {
    if (data) {
      // Only keep agents with actual data
      const agentsWithData = data.filter(hasAgentData);
      
      // Replace the entire agents list with what we received from the API
      setAgents(agentsWithData);
    }
  }, [data]);
  
  // Memoize the filtered agents to avoid unnecessary recalculations
  const displayedAgents = useMemo(() => 
    factionFilter === 'all' 
      ? agents 
      : agents.filter(agent => agent.faction === factionFilter),
    [agents, factionFilter]
  );
  
  // Memoize the system stats to avoid unnecessary recalculations
  const systemStats = useMemo(() => ({
    totalAgents: agents.length,
    totalThoughts: agents.reduce((sum, agent) => sum + agent.thoughts.length, 0),
    totalActions: agents.reduce((sum, agent) => sum + agent.actions.length, 0)
  }), [agents]);
  
  // Use callback for faction filter change
  const handleFactionFilterChange = useCallback((faction: FactionKey) => {
    setFactionFilter(faction);
  }, []);
  
  // Initialize socket connection
  useEffect(() => {
    const socket = initializeSocket();
    
    // Handler for agent updates
    const handleAgentUpdate = (updatedAgent: Agent) => {
      // Only update if the agent has data
      if (hasAgentData(updatedAgent)) {
        setAgents(prevAgents => {
          // Find if agent exists - using normalized ID comparison
          const normalizedUpdatedId = normalizeAgentId(updatedAgent.id);
          const existingAgent = prevAgents.find(agent => 
            normalizeAgentId(agent.id) === normalizedUpdatedId
          );
          
          if (existingAgent) {
            // Preserve faction and sci-fi name from existing agent if they exist
            
            // IMPORTANT: Merge actions and thoughts instead of replacing them
            // Create maps to deduplicate by ID
            const uniqueThoughts = new Map();
            [...existingAgent.thoughts, ...updatedAgent.thoughts].forEach(thought => {
              uniqueThoughts.set(thought.id, thought);
            });
            
            const uniqueActions = new Map();
            [...existingAgent.actions, ...updatedAgent.actions].forEach(action => {
              uniqueActions.set(action.id, action);
            });
            
            const mergedAgent = {
              ...updatedAgent,
              faction: existingAgent.faction || updatedAgent.faction,
              name: (!updatedAgent.name || 
                    updatedAgent.name.trim() === '' || 
                    updatedAgent.name.includes('Agent') || 
                    updatedAgent.name.includes('Bot') ||
                    /\d/.test(updatedAgent.name)) 
                    ? existingAgent.name
                    : updatedAgent.name,
              // Use the merged collections of thoughts and actions
              thoughts: Array.from(uniqueThoughts.values()),
              actions: Array.from(uniqueActions.values())
            };
            
            // Update existing agent - match by normalized ID
            return prevAgents.map(agent => 
              normalizeAgentId(agent.id) === normalizedUpdatedId ? mergedAgent : agent
            );
          } else {
            // Add new agent with sci-fi name
            const namedAgent = assignSciFiName(updatedAgent);
            return [...prevAgents, namedAgent];
          }
        });
      }
    };
    
    // Handler for new thoughts
    const handleAgentThought = ({ agentId, thought }: { agentId: string, thought: AgentThought }) => {
      setAgents(prevAgents => 
        prevAgents.map(agent => {
          // Compare using normalized IDs
          if (normalizeAgentId(agent.id) === normalizeAgentId(agentId)) {
            // Check if thought with this ID already exists
            const thoughtExists = agent.thoughts.some(t => t.id === thought.id);
            if (thoughtExists) {
              // If duplicate, create a new ID by appending the current timestamp
              thought = {
                ...thought,
                id: `${thought.id}-${Date.now()}`
              };
            }
            
            // Keep the existing agent data structure and just update thoughts
            return {
              ...agent,
              thoughts: [thought, ...agent.thoughts]
            };
          }
          return agent;
        })
      );
    };
    
    // Handler for new actions
    const handleAgentAction = ({ agentId, action }: { agentId: string, action: AgentAction }) => {
      console.log(`Received action update for agent ${agentId}: ${action.type} (${action.status}), ID: ${action.id}`);
      
      setAgents(prevAgents => 
        prevAgents.map(agent => {
          // Compare using normalized IDs
          if (normalizeAgentId(agent.id) === normalizeAgentId(agentId)) {
            // Check if action with this ID already exists
            const existingActionIndex = agent.actions.findIndex(a => a.id === action.id);
            
            if (existingActionIndex !== -1) {
              // If action exists, update it instead of creating duplicate
              console.log(`Updating existing action ${action.id} for agent ${agent.name} from ${agent.actions[existingActionIndex].status} to ${action.status}`);
              
              const updatedActions = [...agent.actions];
              updatedActions[existingActionIndex] = {
                ...action,
                // Preserve the original timestamp if it exists
                timestamp: action.timestamp || agent.actions[existingActionIndex].timestamp
              };
              
              return {
                ...agent,
                actions: updatedActions
              };
            } else {
              // Action doesn't exist, add it to the beginning
              console.log(`Adding new action ${action.id} for agent ${agent.name}`);
              return {
                ...agent,
                actions: [action, ...agent.actions]
              };
            }
          }
          return agent;
        })
      );
    };
    
    // Handler for new agents
    const handleNewAgent = (newAgent: Agent) => {
      // Only add the agent if it has data
      if (hasAgentData(newAgent)) {
        setAgents(prevAgents => {
          // Check if agent already exists - using normalized ID comparison
          const normalizedNewId = normalizeAgentId(newAgent.id);
          const existingAgent = prevAgents.find(agent => normalizeAgentId(agent.id) === normalizedNewId);
          
          if (existingAgent) {
            // Agent already exists, update it by merging data
            
            // Deduplicate thoughts and actions when merging
            const uniqueThoughts = new Map();
            [...newAgent.thoughts, ...existingAgent.thoughts].forEach(thought => {
              uniqueThoughts.set(thought.id, thought);
            });
            
            const uniqueActions = new Map();
            [...newAgent.actions, ...existingAgent.actions].forEach(action => {
              uniqueActions.set(action.id, action);
            });
            
            const mergedAgent = {
              ...existingAgent,
              thoughts: Array.from(uniqueThoughts.values()),
              actions: Array.from(uniqueActions.values()),
              status: newAgent.status || existingAgent.status
            };
            
            return prevAgents.map(agent => 
              normalizeAgentId(agent.id) === normalizedNewId ? mergedAgent : agent
            );
          }
          
          // This is a truly new agent - assign faction and sci-fi name
          const namedAgent = assignSciFiName(newAgent);
          return [...prevAgents, namedAgent];
        });
      }
    };
    
    // Register event handlers
    socket.on('agent:update', handleAgentUpdate);
    socket.on('agent:thought', handleAgentThought);
    socket.on('agent:action', handleAgentAction);
    socket.on('agent:new', handleNewAgent);
    
    // Cleanup function
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('agent:update', handleAgentUpdate);
        socket.off('agent:thought', handleAgentThought);
        socket.off('agent:action', handleAgentAction);
        socket.off('agent:new', handleNewAgent);
      }
    };
  }, []); // Empty dependency array since we only want to set up the socket once

  return (
    <div className="mb-8">
      <div className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-wide glow-text">AGENT DASHBOARD</h2>
        <p className="text-gray-400 mt-2 tracking-wide">Monitor your agents' thoughts and on-chain actions in real-time</p>
      </div>
      
      {/* Faction Filter */}
      <div className="mb-6 card backdrop-blur-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-gray-300">Filter by Faction:</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                factionFilter === 'all' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
              onClick={() => handleFactionFilterChange('all')}
            >
              ALL
            </button>
            
            {Object.entries(FACTIONS).map(([key, faction]) => {
              // Only show faction buttons for factions that have agents
              const hasFactionAgent = agents.some(agent => agent.faction === key);
              if (!hasFactionAgent) return null;
              
              return (
                <button
                  key={key}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center`}
                  style={{
                    backgroundColor: factionFilter === key ? `${faction.color}30` : 'rgba(31, 41, 55, 0.5)',
                    color: factionFilter === key ? faction.color : '#9CA3AF',
                    border: factionFilter === key ? `1px solid ${faction.color}60` : '1px solid transparent'
                  }}
                  onClick={() => handleFactionFilterChange(key as FactionKey)}
                >
                  <span 
                    className="w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: faction.color }}
                  ></span>
                  {key}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Faction Legend */}
        {factionFilter !== 'all' && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-sm text-gray-300">
              <span 
                className="font-medium"
                style={{ color: FACTIONS[factionFilter].color }}
              >
                {FACTIONS[factionFilter].name}:
              </span> {FACTIONS[factionFilter].description}
            </div>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md backdrop-blur-sm">
          <p>Error loading agents data. Please try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {displayedAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
            
            {displayedAgents.length === 0 && (
              <div className="col-span-full text-center py-16 card backdrop-blur-sm">
                {factionFilter === 'all' ? (
                  <>
                    <p className="text-gray-400 mb-4">No agents are currently running</p>
                    <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                      The dashboard is waiting for real agent data. Make sure your agents are running and properly configured to send data to the dashboard.
                    </p>
                    <div className="flex flex-col gap-3 items-center">
                      <p className="text-gray-400 text-sm">To connect agents to the dashboard:</p>
                      <ol className="text-left text-gray-500 text-sm max-w-md">
                        <li className="mb-2">1. Set <code className="bg-gray-800 px-1 rounded">ENABLE_DASHBOARD=true</code> in your agent's .env file</li>
                        <li className="mb-2">2. Ensure agents have a valid <code className="bg-gray-800 px-1 rounded">contextId</code> property</li>
                        <li>3. Check that your agents are running and generating logs</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 mb-4">No agents found in the selected faction</p>
                    <button 
                      className="px-6 py-2 bg-[#444444] hover:bg-[#4a4a4a] text-white rounded-md transition-all tracking-wide"
                      onClick={() => handleFactionFilterChange('all')}
                    >
                      SHOW ALL AGENTS
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-8 card backdrop-blur-sm p-5">
            <h3 className="text-lg font-bold mb-4 tracking-wide">SYSTEM STATUS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#212020]/40 p-4 rounded-md border border-gray-800 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Active Agents</p>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold mt-2 glow-text">{systemStats.totalAgents}</p>
              </div>
              <div className="bg-[#212020]/40 p-4 rounded-md border border-gray-800 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Thoughts</p>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold mt-2 glow-text">
                  {systemStats.totalThoughts}
                </p>
              </div>
              <div className="bg-[#212020]/40 p-4 rounded-md border border-gray-800 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Actions</p>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold mt-2 glow-text">
                  {systemStats.totalActions}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard; 