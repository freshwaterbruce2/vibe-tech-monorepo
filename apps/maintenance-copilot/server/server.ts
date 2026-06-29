/**
 * Remediation router for the Monorepo Maintenance Co-Pilot gateway.
 * Mounted by server/index.ts via `app.use(repairRouter)`; routes carry their
 * own absolute `/api/repair/*` paths. Handlers live in ./remediation.ts.
 */
import { Router } from 'express';
import { handleDependencyFix, handleDatabaseUnlock, handleDaemonRecovery } from './remediation.js';

const router = Router();

// Gated remediation endpoint for version alignments
router.post('/api/repair/align-deps', async (_req, res) => {
  const result = await handleDependencyFix();
  res.status(result.success ? 200 : 500).json(result);
});

// Gated remediation endpoint for unlocking active DB transactions
router.post('/api/repair/unlock-db', async (req, res) => {
  const { dbName } = req.body;
  if (!dbName) {
    return res.status(400).json({ success: false, log: 'Missing target database identifier.' });
  }
  const result = await handleDatabaseUnlock(dbName);
  res.status(result.success ? 200 : 500).json(result);
});

// Gated remediation endpoint for recovering from training OOM failures
router.post('/api/repair/recover-daemon', async (_req, res) => {
  const result = await handleDaemonRecovery();
  res.status(result.success ? 200 : 500).json(result);
});

// Remember to expose or mount this router onto your main app instance (e.g., app.use(router))
export default router;
