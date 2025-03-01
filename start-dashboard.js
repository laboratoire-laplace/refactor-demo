/**
 * Dashboard Starter
 * 
 * This script starts both the frontend and backend servers for the Refactor Demo Dashboard.
 * 
 * Usage:
 * node start-dashboard.js
 * 
 * The dashboard now uses real agent data by default.
 */

import { spawn } from 'child_process';
import path from 'path';
// Explicitly import process from node:process for ESM compatibility
import process from 'node:process';

// Always use real data
const useRealData = true;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Function to format log messages
function formatLog(prefix, message) {
  const timestamp = new Date().toLocaleTimeString();
  return `${colors.dim}[${timestamp}]${colors.reset} ${prefix} ${message}`;
}

// Function to start a process
function startProcess(command, args, name, prefixColor) {
  console.log(formatLog(`${prefixColor}[${name}]${colors.reset}`, `Starting ${name}...`));
  
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      // Always set USE_MOCK_DATA to false
      USE_MOCK_DATA: 'false'
    }
  });
  
  childProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(formatLog(`${prefixColor}[${name}]${colors.reset}`, line));
      }
    });
  });
  
  childProcess.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(formatLog(`${prefixColor}[${name}]${colors.fg.red}`, line));
      }
    });
  });
  
  childProcess.on('close', (code) => {
    console.log(formatLog(`${prefixColor}[${name}]${colors.reset}`, `Process exited with code ${code !== 0 ? colors.fg.red + code + colors.reset : colors.fg.green + code + colors.reset}`));
  });
  
  return childProcess;
}

// Start the backend server
const backendProcess = startProcess('node', ['server.js'], 'Backend', colors.fg.cyan);

// Start the frontend development server
const frontendProcess = startProcess('npm', ['run', 'dev'], 'Frontend', colors.fg.magenta);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(formatLog(`${colors.fg.yellow}[System]${colors.reset}`, 'Shutting down all processes...'));
  
  backendProcess.kill();
  frontendProcess.kill();
  
  // Give processes time to shut down
  setTimeout(() => {
    console.log(formatLog(`${colors.fg.yellow}[System]${colors.reset}`, 'All processes terminated.'));
    process.exit(0);
  }, 1000);
});

// Start the dashboard
console.log('\n' + colors.bright + colors.fg.green + '✓ Refactor Demo Dashboard is starting up!' + colors.reset);
console.log(colors.fg.yellow + '• Backend server will be available at: ' + colors.fg.white + 'http://localhost:3000' + colors.reset);
console.log(colors.fg.yellow + '• Frontend will be available at: ' + colors.fg.white + 'http://localhost:5173' + colors.reset);
console.log(colors.fg.yellow + '• Data mode: ' + colors.fg.white + 'Real data (waiting for agents)' + colors.reset);
console.log(colors.fg.yellow + '• Press Ctrl+C to stop both servers' + colors.reset + '\n'); 