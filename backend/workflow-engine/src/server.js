// @ts-check
/**
 * Workflow Engine Server
 * Orchestrates multi-step workflows across NOVA and Vibe.
 */

import cors from 'cors';
import sqlite3 from 'sqlite3';
import { WebSocket } from 'ws';
const express = require('express');

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {{ name: string; app: string; action?: string }} WorkflowStep */
/** @typedef {{ id: number; templateId: number; steps: WorkflowStep[]; currentStep: number; context: Record<string, unknown> }} ActiveWorkflow */
/** @typedef {{ name: string; steps: string }} WorkflowTemplateRow */
/** @typedef {{ state_data?: string }} WorkflowInstanceRow */
/** @typedef {{ output_data?: string }} WorkflowStepRow */
/** @typedef {{ message?: string }} ErrorLike */

const app = express();
const PORT = 5003;
const DATABASE_PATH = process.env.DATABASE_PATH || 'D:\\databases\\database.db';

app.use(cors());
app.use(express.json());

/**
 * @returns {sqlite3.Database}
 */
function getDb() {
  return new sqlite3.Database(DATABASE_PATH);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((/** @type {ErrorLike} */ (error)).message)
    : 'Unknown error';
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function firstString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(firstString(value) ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

class WorkflowEngine {
  constructor() {
    /** @type {Map<number, ActiveWorkflow>} */
    this.activeWorkflows = new Map();
    /** @type {WebSocket | null} */
    this.ipcBridgeWs = null;
    this.connectToIPCBridge();
  }

  connectToIPCBridge() {
    try {
      this.ipcBridgeWs = new WebSocket('ws://localhost:5004');
      this.ipcBridgeWs.on('open', () => {
         
        console.warn('[OK] Connected to IPC Bridge');
      });
      this.ipcBridgeWs.on('error', (err) => {
         
        console.warn('[WARN] IPC Bridge not available:', getErrorMessage(err));
      });
    } catch {
       
      console.warn('[WARN] Could not connect to IPC Bridge');
    }
  }

  /**
   * @param {number} templateId
   * @param {Record<string, unknown>} [context]
   * @returns {Promise<{ workflowId: number; name: string; steps: number; status: 'started' }>}
   */
  // eslint-disable-next-line require-await -- interface requirement
  async startWorkflow(templateId, context = {}) {
    const db = getDb();
    const engine = this;

    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM workflow_templates WHERE id = ?',
        [templateId],
        /** @param {Error | null} err @param {WorkflowTemplateRow | undefined} template */
        (err, template) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          if (!template) {
            db.close();
            reject(new Error('Template not found'));
            return;
          }

          /** @type {WorkflowStep[]} */
          const steps = JSON.parse(template.steps);

          db.run(
            `INSERT INTO workflow_instances
             (template_id, workflow_name, state_data, status)
             VALUES (?, ?, ?, ?)`,
            [templateId, template.name, JSON.stringify(context), 'in_progress'],
            /** @this {sqlite3.RunResult} @param {Error | null} runErr */
            function onInsert(runErr) {
              if (runErr) {
                db.close();
                reject(runErr);
                return;
              }

              const workflowId = this.lastID;
              const stmt = db.prepare(
                `INSERT INTO workflow_steps
                 (workflow_id, step_index, step_name, app_source, status)
                 VALUES (?, ?, ?, ?, ?)`
              );

              steps.forEach((step, index) => {
                stmt.run(workflowId, index, step.name, step.app, 'pending');
              });

              stmt.finalize();
              db.run('UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = ?', [templateId]);
              db.close();

              engine.activeWorkflows.set(workflowId, {
                id: workflowId,
                templateId,
                steps,
                currentStep: 0,
                context,
              });

              resolve({
                workflowId,
                name: template.name,
                steps: steps.length,
                status: 'started',
              });
            }
          );
        }
      );
    });
  }

  /**
   * @param {number} workflowId
   * @returns {Promise<{ workflowId: number; step?: string; status: 'completed'; nextStep?: string; message?: string }>}
   */
  // eslint-disable-next-line require-await -- interface requirement
  async executeNextStep(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const step = workflow.steps[workflow.currentStep];
    if (!step) {
      return this.completeWorkflow(workflowId);
    }

    const db = getDb();
    return new Promise((resolve, reject) => {
      const stepStartTime = new Date().toISOString();

      db.run(
        `UPDATE workflow_steps
         SET status = ?, started_at = ?
         WHERE workflow_id = ? AND step_index = ?`,
        ['in_progress', stepStartTime, workflowId, workflow.currentStep],
        /** @param {Error | null} err */
        async (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

           
          console.warn(`[STEP] ${step.name} (${step.app}) - ${step.action ?? 'run'}`);
          await new Promise((done) => setTimeout(done, 500));

          const stepEndTime = new Date().toISOString();
          const duration = 1;

          db.run(
            `UPDATE workflow_steps
             SET status = ?, completed_at = ?, duration_seconds = ?, output_data = ?
             WHERE workflow_id = ? AND step_index = ?`,
            ['completed', stepEndTime, duration, JSON.stringify({ result: 'success', simulated: true }), workflowId, workflow.currentStep],
            /** @param {Error | null} completeErr */
            (completeErr) => {
              db.close();
              if (completeErr) {
                reject(completeErr);
                return;
              }

              workflow.currentStep += 1;
              const db2 = getDb();
              db2.run(
                `UPDATE workflow_instances
                 SET current_step = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [workflow.currentStep, workflowId],
                /** @param {Error | null} updateErr */
                (updateErr) => {
                  db2.close();
                  if (updateErr) {
                    reject(updateErr);
                    return;
                  }

                  resolve({
                    workflowId,
                    step: step.name,
                    status: 'completed',
                    nextStep:
                      workflow.currentStep < workflow.steps.length
                        ? workflow.steps[workflow.currentStep]?.name
                        : 'complete',
                  });
                }
              );
            }
          );
        }
      );
    });
  }

  /**
   * @param {number} workflowId
   * @returns {Promise<{ workflowId: number; status: 'completed'; message: string }>}
   */
  // eslint-disable-next-line require-await -- interface requirement
  async completeWorkflow(workflowId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE workflow_instances
         SET status = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['completed', workflowId],
        /** @param {Error | null} err */
        (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          this.activeWorkflows.delete(workflowId);
          resolve({
            workflowId,
            status: 'completed',
            message: 'Workflow completed successfully',
          });
        }
      );
    });
  }
}

const engine = new WorkflowEngine();

app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'healthy',
    service: 'workflow-engine',
    version: '1.0.0',
    active_workflows: engine.activeWorkflows.size,
  });
});

app.get('/api/templates', (_req, res) => {
  const db = getDb();
  db.all(
    'SELECT * FROM workflow_templates ORDER BY category, name',
    /** @param {Error | null} err @param {WorkflowTemplateRow[]} templates */
    (err, templates = []) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({
        templates: templates.map((template) => ({
          ...template,
          steps: JSON.parse(template.steps),
        })),
        count: templates.length,
      });
    }
  );
});

app.post('/api/workflows/start', async (req, res) => {
  try {
    const templateId = toPositiveInt(req.body?.template_id, NaN);
    if (!Number.isFinite(templateId)) {
      return res.status(400).json({ error: 'template_id required' });
    }
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
    const result = await engine.startWorkflow(templateId, /** @type {Record<string, unknown>} */ (context));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post('/api/workflows/:id/next', async (req, res) => {
  try {
    const workflowId = toPositiveInt(req.params.id, NaN);
    if (!Number.isFinite(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow id' });
    }
    const result = await engine.executeNextStep(workflowId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get('/api/workflows/:id', (req, res) => {
  const workflowId = toPositiveInt(req.params.id, NaN);
  if (!Number.isFinite(workflowId)) {
    return res.status(400).json({ error: 'Invalid workflow id' });
  }

  const db = getDb();
  return db.get(
    'SELECT * FROM workflow_instances WHERE id = ?',
    [workflowId],
    /** @param {Error | null} err @param {WorkflowInstanceRow | undefined} workflow */
    (err, workflow) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: err.message });
      }

      if (!workflow) {
        db.close();
        return res.status(404).json({ error: 'Workflow not found' });
      }

      return db.all(
        'SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_index',
        [workflowId],
        /** @param {Error | null} stepErr @param {WorkflowStepRow[]} steps */
        (stepErr, steps = []) => {
          db.close();
          if (stepErr) {
            return res.status(500).json({ error: stepErr.message });
          }
          return res.json({
            ...workflow,
            state_data: JSON.parse(workflow.state_data || '{}'),
            steps: steps.map((step) => ({
              ...step,
              output_data: step.output_data ? JSON.parse(step.output_data) : null,
            })),
          });
        }
      );
    }
  );
});

app.get('/api/workflows/active', (_req, res) => {
  const db = getDb();
  db.all(
    `SELECT * FROM workflow_instances
     WHERE status IN ('pending', 'in_progress')
     ORDER BY started_at DESC`,
    /** @param {Error | null} err @param {Record<string, unknown>[]} workflows */
    (err, workflows = []) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({
        workflows,
        count: workflows.length,
      });
    }
  );
});

app.get('/api/workflows/history', (req, res) => {
  const limit = toPositiveInt(req.query.limit, 10);
  const db = getDb();
  db.all(
    `SELECT wi.*, wt.name as template_name, wt.category
     FROM workflow_instances wi
     JOIN workflow_templates wt ON wi.template_id = wt.id
     ORDER BY wi.started_at DESC LIMIT ?`,
    [limit],
    /** @param {Error | null} err @param {Record<string, unknown>[]} workflows */
    (err, workflows = []) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({
        workflows,
        count: workflows.length,
      });
    }
  );
});

app.listen(PORT, () => {
   
  console.warn('\n[OK] Workflow Engine');
  console.warn(`[OK] Listening on http://127.0.0.1:${PORT}`);
  console.warn(`[OK] Database: ${DATABASE_PATH}`);
  console.warn('\n[OK] Endpoints:');
  console.warn('     GET  /api/health');
  console.warn('     GET  /api/templates');
  console.warn('     POST /api/workflows/start');
  console.warn('     POST /api/workflows/:id/next');
  console.warn('     GET  /api/workflows/:id');
  console.warn('     GET  /api/workflows/active');
  console.warn('     GET  /api/workflows/history');
  console.warn('\n');
   
});
