# Refactor Demo

A real-time dashboard for monitoring agent thoughts, status, and blockchain actions.

## Overview

The Refactor Demo provides a visual interface for monitoring your agents' activities in real-time. It displays agent thoughts, blockchain actions, and status updates as they occur, allowing you to track and analyze agent behavior across your system.

## Related Repositories

This dashboard is designed to work with agents from the [Refactor](https://github.com/laboratoire-laplace/refactor) repository. Please refer to that repository for instructions on running agents that can connect to this dashboard.

## Features

- **Real-time Monitoring**: View agent thoughts and blockchain actions as they happen
- **Agent Status Tracking**: Monitor agent states (idle, thinking, executing)
- **Faction-based Organization**: Filter and organize agents by faction
- **Transaction History**: View complete history of blockchain transactions
- **Detailed Agent Profiles**: Drill down into individual agent activities and performance
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, React Router, React Query
- **Backend**: Node.js, Express, Socket.IO
- **Visualization**: Three.js for background effects

## Getting Started

### Prerequisites

- Node.js 16+ and npm/pnpm
- Agents running with dashboard integration enabled

### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/laboratoire-laplace/refactor-demo.git
   cd refactor-demo
   ```

2. Install dependencies
   ```bash
   npm install
   # or with pnpm
   pnpm install
   ```

3. Start the dashboard
   ```bash
   npm run start
   # or
   pnpm start
   ```

4. The dashboard will be available at http://localhost:5173

## Development

To run the dashboard in development mode with hot reloading:

```bash
npm run dev:all
# or
pnpm dev:all
```

This will start both the frontend development server and the backend API server concurrently.

## Connecting Agents to the Dashboard

### Option 1: Using the Integration Library

The dashboard provides a simple integration library to connect your agents:

```javascript
import { captureThought, captureAction, updateAgentStatus } from './agent-integration.js';

// Update agent status
await updateAgentStatus('agent-123', 'thinking');

// Log agent thoughts
await captureThought('agent-123', 'Analyzing market conditions...');

// Record agent actions
await captureAction(
  'agent-123',
  'SWAP',
  'pending',
  {
    fromToken: 'ETH',
    toToken: 'USDC',
    amount: '0.5',
    dex: 'Uniswap',
  }
);
```

### Option 2: Direct API Integration

You can also integrate directly with the dashboard API:

1. Set the following environment variables in your agent's `.env` file:
   ```
   ENABLE_DASHBOARD=true
   DASHBOARD_URL=http://localhost:3000
   ```

2. Ensure your agents have a valid `contextId` property in their action and thought data.

3. The dashboard will automatically detect and display your agents when they start sending data.

See `integration-example.js` for a complete example of dashboard integration.

## Dashboard Components

### Agent Cards
Each agent is represented by a card showing:
- Agent name and faction
- Current status
- Recent thoughts
- Recent blockchain actions

### Faction Filtering
Agents are organized by factions, which can be filtered using the faction selector.

### Transaction History
View a complete history of all blockchain transactions across your agent system.

### Agent Details
Drill down into individual agent activities, including:
- Thought history
- Action history
- Performance metrics

## Troubleshooting

If you don't see your agents in the dashboard:

1. Verify that `ENABLE_DASHBOARD=true` is set in your agent's `.env` file
2. Check that your agents are running and generating logs
3. Ensure your agents have a valid `contextId` property in their action and thought data
4. Check the browser console and server logs for any error messages

## Project Structure

```
refactor-demo/
├── public/              # Static assets
├── src/                 # Frontend source code
│   ├── assets/          # Images, fonts, etc.
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   └── services/        # API and socket services
├── server.js            # Backend server
├── agent-integration.js # Agent integration library
└── integration-example.js # Example integration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgements

- Built with [React](https://reactjs.org/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Real-time updates with [Socket.IO](https://socket.io/)
