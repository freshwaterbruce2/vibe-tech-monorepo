import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

if (isMainThread) {
  console.log('[G-CLAW SWARM] Local Agent Swarm Orchestrator Initialized.');
  console.log('[G-CLAW SWARM] Engaging parallel thread execution...');

  const agents = [
    { name: 'Inquisitor', role: 'Linting & Dead Code Extraction', command: 'nx run-many -t lint' },
    { name: 'Architect', role: 'Dependency Validation', command: 'pnpm audit' },
    { name: 'Operator', role: 'Workspace Integrity', command: 'nx workspace-lint' }
  ];

  agents.forEach((agent) => {
    // Spawn a worker for each agent
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: agent
    });

    worker.on('message', (msg) => {
      console.log(`[${agent.name} | ${agent.role}] ${msg}`);
    });

    worker.on('error', (err) => {
      console.error(`[${agent.name} ERROR]`, err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[${agent.name}] Thread terminated with exit code ${code}`);
      } else {
        console.log(`[${agent.name}] Thread execution completed successfully.`);
      }
    });
  });

} else {
  // --- SUB-AGENT THREAD EXECUTION ---
  const { name, role, command } = workerData;
  parentPort.postMessage(`Online. Executing: ${command}`);

  // In a real swarm, this would execute the command via child_process.spawn.
  // For safety and prototype validation, we are simulating the hook first.
  const [cmd, ...args] = command.split(' ');
  const child = spawn(cmd, args, { shell: true, cwd: 'C:\\\\dev' });

  child.stdout.on('data', (data) => {
    parentPort.postMessage(`STDOUT: ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    parentPort.postMessage(`STDERR: ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    parentPort.postMessage(`Process exited with code ${code}`);
    process.exit(code);
  });
}
