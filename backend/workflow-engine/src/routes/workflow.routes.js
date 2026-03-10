// @ts-nocheck
/* eslint-disable consistent-return */
const express = require('express');
const router = express.Router();
const engine = require('../services/workflow');
const db = require('../config/database');

// Start a workflow
router.post('/start', async (req, res) => {
  try {
    const { template_id, context } = req.body;
    if (!template_id) {
      return res.status(400).json({ error: 'template_id required' });
    }
    const result = await engine.startWorkflow(template_id, context || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute next step
router.post('/:id/next', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const result = await engine.executeNextStep(workflowId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow status
router.get('/:id', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const workflow = await db.get('SELECT * FROM workflow_instances WHERE id = ?', [workflowId]);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const steps = await db.all(
      'SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_index',
      [workflowId],
    );

    res.json({
      ...workflow,
      state_data: JSON.parse(workflow.state_data || '{}'),
      steps: steps.map((s) => ({
        ...s,
        output_data: s.output_data ? JSON.parse(s.output_data) : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active workflows
router.get('/active', async (req, res) => {
  try {
    const workflows = await db.all(
      `SELECT * FROM workflow_instances
             WHERE status IN ('pending', 'in_progress')
             ORDER BY started_at DESC`,
    );
    res.json({ workflows, count: workflows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const workflows = await db.all(
      `SELECT wi.*, wt.name as template_name, wt.category
             FROM workflow_instances wi
             JOIN workflow_templates wt ON wi.template_id = wt.id
             ORDER BY wi.started_at DESC LIMIT ?`,
      [limit],
    );
    res.json({ workflows, count: workflows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
