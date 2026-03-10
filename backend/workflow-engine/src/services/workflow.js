// @ts-nocheck
const { WebSocket } = require('ws');
const crypto = require('crypto');
const db = require('../config/database');

class WorkflowEngine {
  constructor() {
    this.activeWorkflows = new Map(); // workflow_id => state
    this.pendingCommands = new Map(); // messageId => { resolve, reject, timeout }
    this.ipcBridgeWs = null;
    this.connectToIPCBridge();
  }

  connectToIPCBridge() {
    try {
      this.ipcBridgeWs = new WebSocket('ws://localhost:5004');

      this.ipcBridgeWs.on('open', () => {
        console.warn('[OK] Connected to IPC Bridge');
        this.ipcBridgeWs.send(
          JSON.stringify({
            messageId: crypto.randomUUID(),
            type: 'identify',
            timestamp: Date.now(),
            source: 'workflow-engine',
            version: '1.0.0',
          }),
        );
      });

      this.ipcBridgeWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'command_result' || msg.type === 'command_response') {
            const correlationId = msg.correlationId || msg.payload?.commandId;

            if (correlationId && this.pendingCommands.has(correlationId)) {
              const { resolve, reject, timeout } = this.pendingCommands.get(correlationId);
              clearTimeout(timeout);
              this.pendingCommands.delete(correlationId);

              if (msg.payload && msg.payload.success === false) {
                reject(new Error(msg.payload.error || 'Command failed'));
              } else {
                resolve(msg.payload);
              }
            }
          }
        } catch (e) {
          console.error('[ERROR] Failed to handle IPC message', e);
        }
      });

      this.ipcBridgeWs.on('error', (err) => {
        console.warn('[WARN] IPC Bridge not available:', err.message);
      });

      this.ipcBridgeWs.on('close', () => {
        console.warn('[WARN] IPC Bridge disconnected. Retrying in 5s...');
        setTimeout(() => this.connectToIPCBridge(), 5000);
      });
    } catch {
      console.warn('[WARN] Could not connect to IPC Bridge');
    }
  }

  sendCommand(target, commandText, context = {}) {
    if (!this.ipcBridgeWs || this.ipcBridgeWs.readyState !== WebSocket.OPEN) {
      throw new Error('IPC Bridge not connected');
    }

    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        if (this.pendingCommands.has(messageId)) {
          this.pendingCommands.delete(messageId);
          reject(new Error('Command timeout'));
        }
      }, 30000);

      this.pendingCommands.set(messageId, { resolve, reject, timeout });

      const message = {
        messageId,
        type: 'command_request',
        timestamp: Date.now(),
        source: 'workflow-engine',
        target: target,
        payload: {
          text: commandText,
          target: target,
          context: context,
        },
      };

      this.ipcBridgeWs.send(JSON.stringify(message));
    });
  }

  async startWorkflow(templateId, context = {}) {
    const template = await db.get('SELECT * FROM workflow_templates WHERE id = ?', [templateId]);

    if (!template) {
      throw new Error('Template not found');
    }

    const steps = JSON.parse(template.steps);

    const result = await db.run(
      `INSERT INTO workflow_instances
             (template_id, workflow_name, state_data, status)
             VALUES (?, ?, ?, ?)`,
      [templateId, template.name, JSON.stringify(context), 'in_progress'],
    );

    const workflowId = result.lastID;

    // Create pending steps (parallel inserts — all independent of each other)
    await Promise.all(
      steps.map((step, index) =>
        db.run(
          `INSERT INTO workflow_steps
                 (workflow_id, step_index, step_name, app_source, status)
                 VALUES (?, ?, ?, ?, ?)`,
          [workflowId, index, step.name, step.app, 'pending'],
        ),
      ),
    );

    // Update usage count
    await db.run('UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = ?', [
      templateId,
    ]);

    this.activeWorkflows.set(workflowId, {
      id: workflowId,
      templateId,
      steps,
      currentStep: 0,
      context,
    });

    return {
      workflowId,
      name: template.name,
      steps: steps.length,
      status: 'started',
    };
  }

  async executeNextStep(workflowId) {
    let workflow = this.activeWorkflows.get(workflowId);

    // If not in memory, try to load from DB or throw
    if (!workflow) {
      // Check if it's a valid unfinished workflow in DB
      const instance = await db.get('SELECT * FROM workflow_instances WHERE id = ?', [workflowId]);
      if (!instance) throw new Error('Workflow not found');

      if (instance.status === 'completed') {
        return { status: 'completed', message: 'Workflow already completed' };
      }

      // Rehydrate (simplified)
      const template = await db.get('SELECT * FROM workflow_templates WHERE id = ?', [
        instance.template_id,
      ]);
      const steps = JSON.parse(template.steps);

      workflow = {
        id: workflowId,
        templateId: instance.template_id,
        steps,
        currentStep: instance.current_step,
        context: JSON.parse(instance.state_data || '{}'),
      };
      this.activeWorkflows.set(workflowId, workflow);
    }

    const step = workflow.steps[workflow.currentStep];
    if (!step) {
      return this.completeWorkflow(workflowId);
    }

    const stepStartTime = new Date().toISOString();

    await db.run(
      `UPDATE workflow_steps
             SET status = ?, started_at = ?
             WHERE workflow_id = ? AND step_index = ?`,
      ['in_progress', stepStartTime, workflowId, workflow.currentStep],
    );

    console.warn(`[STEP] ${step.name} (${step.app}) - ${step.action}`);

    let target = 'nova';
    if (step.app === 'vscode') target = 'vibe';
    if (step.app === 'system' || step.app === 'browser') target = 'desktop-commander-v3';

    try {
      let result;
      if (process.env.SIMULATE_WORKFLOW === 'true') {
        await new Promise((r) => setTimeout(r, 1000));
        result = { success: true, simulated: true };
      } else {
        result = await this.sendCommand(target, step.action, {
          workflowId,
          stepIndex: workflow.currentStep,
          ...workflow.context,
        });
      }

      const stepEndTime = new Date().toISOString();
      const duration = (new Date(stepEndTime) - new Date(stepStartTime)) / 1000;

      await db.run(
        `UPDATE workflow_steps
                 SET status = ?, completed_at = ?, duration_seconds = ?, output_data = ?
                 WHERE workflow_id = ? AND step_index = ?`,
        [
          'completed',
          stepEndTime,
          duration,
          JSON.stringify(result || {}),
          workflowId,
          workflow.currentStep,
        ],
      );

      workflow.currentStep++;

      await db.run(
        `UPDATE workflow_instances
                 SET current_step = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
        [workflow.currentStep, workflowId],
      );

      return {
        workflowId,
        step: step.name,
        status: 'completed',
        result,
        nextStep:
          workflow.currentStep < workflow.steps.length
            ? workflow.steps[workflow.currentStep].name
            : 'complete',
      };
    } catch (execError) {
      const stepEndTime = new Date().toISOString();
      console.error(`[ERROR] Step failed: ${execError.message}`);

      await db.run(
        `UPDATE workflow_steps
                 SET status = ?, completed_at = ?, error_message = ?
                 WHERE workflow_id = ? AND step_index = ?`,
        ['failed', stepEndTime, execError.message, workflowId, workflow.currentStep],
      );

      throw execError;
    }
  }

  async completeWorkflow(workflowId) {
    await db.run(
      `UPDATE workflow_instances
             SET status = ?, completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
      ['completed', workflowId],
    );

    this.activeWorkflows.delete(workflowId);

    return {
      workflowId,
      status: 'completed',
      message: 'Workflow completed successfully',
    };
  }
}

// Singleton instance
const engine = new WorkflowEngine();
module.exports = engine;
