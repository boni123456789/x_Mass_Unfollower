import { spawn } from 'child_process';

console.log('\n⚡ Starting CleanSweep X (Backend Proxy Server + Frontend Vite)...\n');

const server = spawn('node', ['--watch', 'server.js'], { stdio: 'inherit', shell: true });
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  try { server.kill(); } catch (e) {}
  try { vite.kill(); } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
