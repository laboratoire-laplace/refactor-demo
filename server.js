import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store connected clients
const clients = new Set();

// Store agents data
const agents = new Map();

// Flag to control mock data initialization
const USE_MOCK_DATA = false; // Always set to false

// Initialize agents
function initializeAgents() {
  console.log('Dashboard initialized. Waiting for real agent data...');
}

// Initialize agents (no mock data)
initializeAgents();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  clients.add(socket);

  // Send initial agents data - ensure we're sending the complete agents data
  const agentsArray = Array.from(agents.values());
  console.log(`Sending ${agentsArray.length} agents with their complete data to new client`);
  
  // Log the number of actions for each agent for debugging
  agentsArray.forEach(agent => {
    console.log(`Agent ${agent.id} has ${agent.actions.length} actions and ${agent.thoughts.length} thoughts`);
  });
  
  socket.emit('agents:init', agentsArray);

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clients.delete(socket);
  });
});

// API routes
app.get('/api/agents', (req, res) => {
  res.json(Array.from(agents.values()));
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// API endpoint to capture thoughts
app.post('/api/thoughts', (req, res) => {
  const { agentId, thought } = req.body;
  
  if (!agentId || !thought || !thought.content) {
    return res.status(400).json({ error: 'Invalid request. agentId and thought.content are required.' });
  }
  
  console.log(`Received thought from agent: ${agentId}`);
  
  // Get or create agent
  let agent = agents.get(agentId);
  if (!agent) {
    // Extract agent number from ID if possible (e.g., "agent-1" -> "1")
    const agentNumber = agentId.includes('-') ? agentId.split('-')[1] : '';
    const displayName = agentNumber ? `Agent ${agentNumber}` : agentId;
    
    agent = {
      id: agentId,
      name: displayName,
      status: 'thinking',
      thoughts: [],
      actions: [],
    };
    agents.set(agentId, agent);
    
    console.log(`Created new agent: ${agentId} (${displayName})`);
  }
  
  // Add thought to agent
  agent.thoughts.push(thought);
  agent.status = 'thinking';
  
  // Broadcast to all clients
  io.emit('agent:thought', { agentId, thought });
  io.emit('agent:update', agent);
  
  res.json({ success: true, thought });
});

// API endpoint to capture actions
app.post('/api/actions', (req, res) => {
  const { agentId, action } = req.body;
  
  if (!agentId || !action || !action.type) {
    return res.status(400).json({ error: 'Invalid request. agentId and action.type are required.' });
  }
  
  console.log(`Received action from agent: ${agentId} (${action.type}) - Status: ${action.status}, ID: ${action.id}`);
  
  // Get or create agent
  let agent = agents.get(agentId);
  if (!agent) {
    // Extract agent number from ID if possible (e.g., "agent-1" -> "1")
    const agentNumber = agentId.includes('-') ? agentId.split('-')[1] : '';
    const displayName = agentNumber ? `Agent ${agentNumber}` : agentId;
    
    agent = {
      id: agentId,
      name: displayName,
      status: 'executing',
      thoughts: [],
      actions: [],
    };
    agents.set(agentId, agent);
    
    console.log(`Created new agent: ${agentId} (${displayName})`);
  }
  
  // Check if action with this ID already exists
  const existingActionIndex = agent.actions.findIndex(a => a.id === action.id);
  
  if (existingActionIndex !== -1) {
    // Update existing action instead of adding a duplicate
    console.log(`Updating existing action ${action.id} from ${agent.actions[existingActionIndex].status} to ${action.status}`);
    
    // Preserve the original timestamp if the new action doesn't have one
    if (!action.timestamp && agent.actions[existingActionIndex].timestamp) {
      action.timestamp = agent.actions[existingActionIndex].timestamp;
    }
    
    agent.actions[existingActionIndex] = action;
  } else {
    // Add new action to agent
    console.log(`Adding new action ${action.id} with status ${action.status}`);
    
    // Ensure action has a timestamp
    if (!action.timestamp) {
      action.timestamp = Date.now();
    }
    
    agent.actions.push(action);
  }
  
  agent.status = 'executing';
  
  // Broadcast to all clients
  io.emit('agent:action', { agentId, action });
  io.emit('agent:update', agent);
  
  res.json({ success: true, action });
});

// API endpoint to update agent status
app.post('/api/agents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['idle', 'thinking', 'executing'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: idle, thinking, executing.' });
  }
  
  console.log(`Updating status for agent: ${id} to ${status}`);
  
  // Get or create agent
  let agent = agents.get(id);
  if (!agent) {
    // Extract agent number from ID if possible (e.g., "agent-1" -> "1")
    const agentNumber = id.includes('-') ? id.split('-')[1] : '';
    const displayName = agentNumber ? `Agent ${agentNumber}` : id;
    
    agent = {
      id,
      name: displayName,
      status,
      thoughts: [],
      actions: [],
    };
    agents.set(id, agent);
    
    console.log(`Created new agent: ${id} (${displayName})`);
  } else {
    agent.status = status;
  }
  
  // Broadcast to all clients
  io.emit('agent:update', agent);
  
  res.json({ success: true, agent });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 