import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import {
  a2aHandshakeRequestPayloadSchema,
  a2aDelegateRequestPayloadSchema
} from '@vibetech/shared-ipc';
import { HERMES_INSTANCE_ID, WORKSPACE_ROOT, hermesCard } from './constants.js';
import { activeRuns, type PipelineRun } from './dashboard.js';

export async function registerA2aRoutes(app: FastifyInstance) {
  // GET /.well-known/agent.json - Discovery endpoint
  app.get('/.well-known/agent.json', async (_request, _reply) => {
    const port = app.server.address() && typeof app.server.address() === 'object'
      ? (app.server.address() as any).port
      : 6400;

    return {
      name: "hermes-bridge-dispatcher",
      description: "VibeTech Central IPC Bridge and Subagent Dispatcher",
      url: `http://127.0.0.1:${port}`,
      capabilities: ["streaming", "async_tasks"],
      authentication: ["Bearer"]
    };
  });

  // POST /v1/a2a - Standard A2A JSON-RPC 2.0 routing endpoint
  app.post('/v1/a2a', async (request, reply) => {
    const body = request.body as any;

    if (!body || typeof body !== 'object' || body.jsonrpc !== '2.0' || !body.method || !body.id) {
      return reply.status(400).send({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: Missing required JSON-RPC 2.0 fields.' },
        id: body?.id ?? null
      });
    }

    const { method, params, id } = body;

    try {
      if (method === 'message/send') {
        const text = params?.message?.text || params?.text;
        if (!text || typeof text !== 'string') {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid params: Missing params.message.text' },
            id
          });
        }

        const taskId = `tx-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Determine correct target repository path
        let repoPath = WORKSPACE_ROOT; // Default to the monorepo workspace root
        const lockPath = process.env['ACTIVE_PROJECT_LOCK_PATH'] ?? 'D:\\active-project\\active-project.json';

        if (fs.existsSync(lockPath)) {
          try {
            const lockContent = fs.readFileSync(lockPath, 'utf8');
            const lockData = JSON.parse(lockContent);
            if (lockData.activeProject) {
              const projectDirApps = path.join(WORKSPACE_ROOT, 'apps', lockData.activeProject);
              const projectDirPackages = path.join(WORKSPACE_ROOT, 'packages', lockData.activeProject);
              if (fs.existsSync(projectDirApps)) {
                repoPath = projectDirApps;
              } else if (fs.existsSync(projectDirPackages)) {
                repoPath = projectDirPackages;
              }
            }
          } catch (parseErr) {
            app.log.error(parseErr, 'Failed to parse active-project.json');
          }
        }

        // Create the PipelineRun record with 'running' status
        const run: PipelineRun = {
          taskId,
          goal: text,
          status: 'running',
          stdout: '',
          stderr: '',
          exitCode: null,
          startedAt: Date.now(),
          completedAt: null
        };
        activeRuns.set(taskId, run);

        // Spawn agy process in background
        const agyArgs = ['agent', 'run', `/goal ${text}`, '--repo', repoPath];
        const agyProcess = spawn('agy', agyArgs, {
          shell: true,
          env: { ...process.env }
        });

        agyProcess.stdout.on('data', (data) => {
          run.stdout += data.toString();
        });

        agyProcess.stderr.on('data', (data) => {
          run.stderr += data.toString();
        });

        agyProcess.on('close', (code) => {
          run.status = code === 0 ? 'success' : 'failed';
          run.exitCode = code;
          run.completedAt = Date.now();
          app.log.info(`[A2A HTTP] Task ${taskId} finished with code ${code}`);
        });

        agyProcess.on('error', (err) => {
          run.status = 'failed';
          run.stderr += `\nError spawning agy: ${err.message}`;
          run.completedAt = Date.now();
          app.log.error(err, `[A2A HTTP] Failed to spawn task ${taskId}`);
        });

        return {
          jsonrpc: '2.0',
          result: {
            taskId,
            status: 'WORKING'
          },
          id
        };
      }

      if (method === 'tasks/get') {
        const taskId = params?.taskId;
        if (!taskId || typeof taskId !== 'string') {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid params: Missing params.taskId' },
            id
          });
        }

        const run = activeRuns.get(taskId);
        if (!run) {
          return {
            jsonrpc: '2.0',
            result: {
              taskId,
              status: 'FAILED'
            },
            id
          };
        }

        let a2aStatus = 'WORKING';
        if (run.status === 'success') a2aStatus = 'COMPLETED';
        else if (run.status === 'failed') a2aStatus = 'FAILED';
        else if (run.status === 'queued') a2aStatus = 'SUBMITTED';

        return {
          jsonrpc: '2.0',
          result: {
            taskId,
            status: a2aStatus
          },
          id
        };
      }

      // Method not found
      return reply.status(404).send({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      app.log.error(error, `JSON-RPC error executing method ${method}`);
      return reply.status(500).send({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Internal error: ${errorMsg}` },
        id
      });
    }
  });

  // POST /api/a2a/jsonrpc - Existing integration test/custom JSON-RPC endpoint
  app.post('/api/a2a/jsonrpc', async (request, reply) => {
    const body = request.body as any;

    if (!body || typeof body !== 'object' || body.jsonrpc !== '2.0' || !body.method || !body.id) {
      return reply.status(400).send({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: Missing required JSON-RPC 2.0 fields.' },
        id: body?.id ?? null
      });
    }

    const { method, params, id } = body;

    try {
      if (method === 'a2a.handshake' || method === 'a2a_handshake') {
        const parseResult = a2aHandshakeRequestPayloadSchema.safeParse(params);
        if (!parseResult.success) {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: `Invalid params: ${parseResult.error.message}` },
            id
          });
        }

        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '1.0.0',
            receiverCard: hermesCard,
            status: 'accepted'
          },
          id
        };
      }

      if (method === 'a2a.delegate' || method === 'a2a_delegate') {
        const parseResult = a2aDelegateRequestPayloadSchema.safeParse(params);
        if (!parseResult.success) {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: `Invalid params: ${parseResult.error.message}` },
            id
          });
        }

        const { taskId, targetId, taskDescription } = parseResult.data;

        if (targetId !== HERMES_INSTANCE_ID) {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: `Invalid params: targetId '${targetId}' does not match HERMES_INSTANCE_ID '${HERMES_INSTANCE_ID}'` },
            id
          });
        }

        // Determine correct target repository path
        let repoPath = WORKSPACE_ROOT; // Default to the monorepo workspace root
        const lockPath = process.env['ACTIVE_PROJECT_LOCK_PATH'] ?? 'D:\\active-project\\active-project.json';

        if (fs.existsSync(lockPath)) {
          try {
            const lockContent = fs.readFileSync(lockPath, 'utf8');
            const lockData = JSON.parse(lockContent);
            if (lockData.activeProject) {
              const projectDirApps = path.join(WORKSPACE_ROOT, 'apps', lockData.activeProject);
              const projectDirPackages = path.join(WORKSPACE_ROOT, 'packages', lockData.activeProject);
              if (fs.existsSync(projectDirApps)) {
                repoPath = projectDirApps;
              } else if (fs.existsSync(projectDirPackages)) {
                repoPath = projectDirPackages;
              }
            }
          } catch (parseErr) {
            app.log.error(parseErr, 'Failed to parse active-project.json');
          }
        }

        // Create the PipelineRun record with 'running' status
        const run: PipelineRun = {
          taskId,
          goal: taskDescription,
          status: 'running',
          stdout: '',
          stderr: '',
          exitCode: null,
          startedAt: Date.now(),
          completedAt: null
        };
        activeRuns.set(taskId, run);

        // Spawn agy process in background
        const agyArgs = ['agent', 'run', `/goal ${taskDescription}`, '--repo', repoPath];
        const agyProcess = spawn('agy', agyArgs, {
          shell: true,
          env: { ...process.env }
        });

        agyProcess.stdout.on('data', (data) => {
          run.stdout += data.toString();
        });

        agyProcess.stderr.on('data', (data) => {
          run.stderr += data.toString();
        });

        agyProcess.on('close', (code) => {
          run.status = code === 0 ? 'success' : 'failed';
          run.exitCode = code;
          run.completedAt = Date.now();
          app.log.info(`[JSON-RPC A2A] Task ${taskId} finished with code ${code}`);
        });

        agyProcess.on('error', (err) => {
          run.status = 'failed';
          run.stderr += `\nError spawning agy: ${err.message}`;
          run.completedAt = Date.now();
          app.log.error(err, `[JSON-RPC A2A] Failed to spawn task ${taskId}`);
        });

        return {
          jsonrpc: '2.0',
          result: {
            taskId,
            responderId: HERMES_INSTANCE_ID,
            status: 'submitted'
          },
          id
        };
      }

      if (method === 'a2a.get_status' || method === 'a2a_get_status' || method === 'a2a.query_task') {
        const taskId = params?.taskId;
        if (!taskId || typeof taskId !== 'string') {
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid params: Missing or invalid string taskId' },
            id
          });
        }

        const run = activeRuns.get(taskId);
        if (!run) {
          return reply.status(404).send({
            jsonrpc: '2.0',
            error: { code: -32001, message: `Task ${taskId} not found` },
            id
          });
        }

        return {
          jsonrpc: '2.0',
          result: {
            taskId: run.taskId,
            status: run.status,
            result: run.stdout || run.stderr || '',
            exitCode: run.exitCode,
            startedAt: run.startedAt,
            completedAt: run.completedAt
          },
          id
        };
      }

      // Method not found
      return reply.status(404).send({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      app.log.error(error, `JSON-RPC error executing method ${method}`);
      return reply.status(500).send({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Internal error: ${errorMsg}` },
        id
      });
    }
  });
}
