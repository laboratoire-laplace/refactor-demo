import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Define the base URL for the API
const API_URL = 'http://localhost:3000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Socket.io connection
let socket: Socket | null = null;

// Initialize socket connection
export const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  return socket;
};

// Get socket instance
export const getSocket = (): Socket | null => {
  return socket;
};

// Normalize agent ID to handle prefixes like "cli:"
export const normalizeAgentId = (id: string): string => {
  // Remove prefixes like "cli:" if they exist
  return id.replace(/^(cli:|ui:|web:)/i, '');
};

// Define faction keys
export type FactionKey = 'UC' | 'FS' | 'CP' | 'MWU' | 'SO' | 'ES' | 'TG';

// Agent types
export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'executing';
  thoughts: AgentThought[];
  actions: AgentAction[];
  faction?: FactionKey;
}

export interface AgentThought {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
}

export interface AgentAction {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'success' | 'failed';
  details: Record<string, unknown>;
  timestamp: number;
}

// Define faction information
export const FACTIONS = {
  UC: {
    name: 'United Coalition',
    description: 'Centralized, heavily militarized faction focused on security and order.',
    color: '#34A2DF',
  },
  FS: {
    name: 'Freehold of Syndicates',
    description: 'Decentralized, focuses on trade and commerce.',
    color: '#dd513c',
  },
  CP: {
    name: 'Celestial Priesthood',
    description:
      'Eschews high technology and blockchain, spreading religious beliefs and ancient wisdom.',
    color: '#FFFF84',
  },
  MWU: {
    name: "Mechanized Workers' Union",
    description: 'Advocates for the rights of cyborgs, modified humans, and robots.',
    color: '#2a9d8f',
  },
  SO: {
    name: 'Scientific Order',
    description:
      'Focuses on scientific advancement, split between Earthbound Scholars and Explorers.',
    color: '#4DDCFF',
  },
  ES: {
    name: 'Esoteric Syndicate',
    description: 'Mysterious and secretive, delving into ancient alien technologies.',
    color: '#ffb78a',
  },
  TG: {
    name: "Technomancers' Guild",
    description: 'Fuses technology with mystical practices.',
    color: '#3df2ad',
  },
};

// Sci-fi names for each faction
export const FACTION_NAMES = {
  UC: ['Vega', 'Steele', 'Reeves', 'Nova', 'Chen'],
  FS: ['Morgan', 'Shah', 'Nakamura', 'Reyes', 'Frost'],
  CP: ['Orion', 'Selene', 'Atlas', 'Aurora', 'Zion'],
  MWU: ['Ada', 'Maxwell', 'Cortez', 'Turing', 'Iris'],
  SO: ['Tesla', 'Lyra', 'Newton', 'Curie', 'Kepler'],
  ES: ['Veil', 'Dante', 'Freya', 'Silas', 'Raven'],
  TG: ['Thorne', 'Quinn', 'Cyrus', 'Phoebe', 'Milo']
};

// Helper function to assign factions to agents
const assignFactionsToAgents = (agents: Agent[]): Agent[] => {
  return agents.map(agent => {
    if (!agent.faction) {
      // Assign faction based on agent ID
      const agentIdLower = agent.id.toLowerCase();
      
      // Deterministic assignment based on agent ID
      const hash = agentIdLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const factionKeys = Object.keys(FACTIONS) as FactionKey[];
      const assignedFaction = factionKeys[hash % factionKeys.length];
      
      return {
        ...agent,
        faction: assignedFaction
      };
    }
    return agent;
  });
};

// Helper function to assign sci-fi names to agents
const assignSciFiNames = (agents: Agent[]): Agent[] => {
  return agents.map(agent => {
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
  });
};

// API functions
export const fetchAgents = async (): Promise<Agent[]> => {
  try {
    // Fetch real data from the API
    const response = await api.get('/api/agents');
    let agents = response.data;
    
    // Deduplicate agents with different prefixes but same base ID
    const uniqueAgents: Record<string, Agent> = {};
    agents.forEach((agent: Agent) => {
      const normalizedId = normalizeAgentId(agent.id);
      
      // If we already have this agent, merge their data
      if (uniqueAgents[normalizedId]) {
        // Keep the agent with the most data
        const existingAgent = uniqueAgents[normalizedId];
        
        // Check which agent has more data
        const existingDataPoints = existingAgent.thoughts.length + existingAgent.actions.length;
        const newDataPoints = agent.thoughts.length + agent.actions.length;
        
        if (newDataPoints > existingDataPoints) {
          // Merge thoughts and actions from both
          uniqueAgents[normalizedId] = {
            ...agent,
            thoughts: [...agent.thoughts, ...existingAgent.thoughts],
            actions: [...agent.actions, ...existingAgent.actions]
          };
        } else {
          // Just add any new thoughts/actions to the existing agent
          uniqueAgents[normalizedId] = {
            ...existingAgent,
            thoughts: [...existingAgent.thoughts, ...agent.thoughts],
            actions: [...existingAgent.actions, ...agent.actions]
          };
        }
      } else {
        // This is a new unique agent
        uniqueAgents[normalizedId] = agent;
      }
    });
    
    // Convert back to array
    agents = Object.values(uniqueAgents);
    
    // Ensure each agent has a faction
    agents = assignFactionsToAgents(agents);
    
    // Assign sci-fi names based on faction
    agents = assignSciFiNames(agents);
    
    return agents;
  } catch (error) {
    console.error('Error fetching agents:', error);
    // Return empty array instead of mock data
    return [];
  }
};

export default api; 