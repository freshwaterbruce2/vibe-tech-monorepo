/**
 * SessionManager Tests
 *
 * Exercises session creation, agent tracking, checkpointing/restore,
 * metrics, and export/import round-trips.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionManager } from '../../services/SessionManager';
import type { AgentSession } from '../../services/SessionManager';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const seedAgentActivity = (agent: AgentSession, successes: number, failures: number) => {
  for (let i = 0; i < successes + failures; i += 1) {
    agent.tasks.push({ id: `t-${i}`, description: `task ${i}`, status: 'completed' });
  }
  for (let i = 0; i < successes; i += 1) {
    agent.results.push({ success: true });
  }
  for (let i = 0; i < failures; i += 1) {
    agent.results.push({ success: false, error: 'boom' });
  }
};

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession', () => {
    it('creates an active session with a UUID-based id', () => {
      const session = manager.createSession('V:/monorepo/apps/demo');

      expect(session.id).toMatch(new RegExp(`^session_${UUID_RE}$`));
      expect(session.status).toBe('active');
      expect(session.projectPath).toBe('V:/monorepo/apps/demo');
      expect(session.agents).toEqual([]);
      expect(session.timestamp).toBeInstanceOf(Date);
    });

    it('generates unique session ids', () => {
      const a = manager.createSession('/p1');
      const b = manager.createSession('/p2');
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('addAgentToSession', () => {
    it('attaches an agent session with zeroed usage', () => {
      const session = manager.createSession('/p');

      const agent = manager.addAgentToSession(session.id, 'agent-1', 'Coder');

      expect(agent).toMatchObject({
        agentId: 'agent-1',
        agentName: 'Coder',
        cost: 0,
        tokenUsage: { input: 0, output: 0 },
      });
      expect(session.agents).toHaveLength(1);
    });

    it('throws for an unknown session', () => {
      expect(() => manager.addAgentToSession('nope', 'a', 'A')).toThrow('Session not found');
    });
  });

  describe('updateAgentState', () => {
    it('merges new state into the matching agent', () => {
      const session = manager.createSession('/p');
      manager.addAgentToSession(session.id, 'agent-1', 'Coder');

      manager.updateAgentState(session.id, 'agent-1', { step: 1 });
      manager.updateAgentState(session.id, 'agent-1', { phase: 'plan' });

      expect(session.agents[0].state).toEqual({ step: 1, phase: 'plan' });
    });

    it('ignores unknown sessions and unknown agents', () => {
      const session = manager.createSession('/p');
      manager.addAgentToSession(session.id, 'agent-1', 'Coder');

      expect(() => manager.updateAgentState('missing', 'agent-1', { a: 1 })).not.toThrow();
      expect(() => manager.updateAgentState(session.id, 'ghost', { a: 1 })).not.toThrow();
      expect(session.agents[0].state).toEqual({});
    });
  });

  describe('checkpoints', () => {
    it('creates a deep-cloned checkpoint with a UUID-based id', () => {
      const session = manager.createSession('/p');
      manager.addAgentToSession(session.id, 'agent-1', 'Coder');

      const checkpoint = manager.createCheckpoint(session.id, 'before refactor');

      expect(checkpoint.checkpointId).toMatch(new RegExp(`^checkpoint_${UUID_RE}$`));
      expect(checkpoint.description).toBe('before refactor');
      expect(checkpoint.sessionId).toBe(session.id);
      // Deep clone: mutating the live session must not affect the checkpoint
      manager.addAgentToSession(session.id, 'agent-2', 'Tester');
      expect(checkpoint.state.agents).toHaveLength(1);
    });

    it('throws when checkpointing an unknown session', () => {
      expect(() => manager.createCheckpoint('missing', 'x')).toThrow('Session not found');
    });

    it('restores a checkpoint into a fresh active session', () => {
      const session = manager.createSession('/p');
      manager.addAgentToSession(session.id, 'agent-1', 'Coder');
      const checkpoint = manager.createCheckpoint(session.id, 'snap');

      const restored = manager.restoreFromCheckpoint(checkpoint.checkpointId);

      expect(restored).not.toBeNull();
      expect(restored?.id).not.toBe(session.id);
      expect(restored?.id).toMatch(new RegExp(`^session_${UUID_RE}$`));
      expect(restored?.status).toBe('active');
      expect(restored?.agents).toHaveLength(1);
    });

    it('returns null for an unknown checkpoint id', () => {
      const session = manager.createSession('/p');
      manager.createCheckpoint(session.id, 'snap');

      expect(manager.restoreFromCheckpoint('checkpoint_missing')).toBeNull();
    });
  });

  describe('getSessionHistory', () => {
    it('returns sessions newest-first and honors the limit', () => {
      const first = manager.createSession('/p1');
      first.timestamp = new Date(Date.now() - 60_000);
      const second = manager.createSession('/p2');
      second.timestamp = new Date(Date.now() - 30_000);
      const third = manager.createSession('/p3');

      const history = manager.getSessionHistory(2);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe(third.id);
      expect(history[1].id).toBe(second.id);
    });
  });

  describe('calculateSessionMetrics', () => {
    it('aggregates tokens, tasks, and success rate across agents', () => {
      const session = manager.createSession('/p');
      const agentA = manager.addAgentToSession(session.id, 'a', 'A');
      const agentB = manager.addAgentToSession(session.id, 'b', 'B');
      agentA.tokenUsage = { input: 100, output: 50 };
      agentB.tokenUsage = { input: 10, output: 5 };
      seedAgentActivity(agentA, 2, 0); // 2 tasks, all successful
      seedAgentActivity(agentB, 1, 1); // 2 tasks, half successful
      session.totalCost = 10;
      session.duration = 1234;

      const metrics = manager.calculateSessionMetrics(session.id);

      expect(metrics).not.toBeNull();
      expect(metrics?.totalTokens).toBe(165);
      expect(metrics?.totalTasks).toBe(4);
      expect(metrics?.successRate).toBeCloseTo((1 + 0.5) / 2);
      expect(metrics?.avgCostPerTask).toBeCloseTo(2.5);
      expect(metrics?.duration).toBe(1234);
    });

    it('returns null for an unknown session', () => {
      expect(manager.calculateSessionMetrics('missing')).toBeNull();
    });
  });

  describe('export / import', () => {
    it('exports a session as pretty JSON', () => {
      const session = manager.createSession('/p');

      const json = manager.exportSession(session.id);

      expect(JSON.parse(json).id).toBe(session.id);
      expect(JSON.parse(json).projectPath).toBe('/p');
    });

    it('throws when exporting an unknown session', () => {
      expect(() => manager.exportSession('missing')).toThrow('Session not found');
    });

    it('imports a session under a brand new id', () => {
      const session = manager.createSession('/p');
      const json = manager.exportSession(session.id);

      const imported = manager.importSession(json);

      expect(imported.id).not.toBe(session.id);
      expect(imported.id).toMatch(new RegExp(`^session_${UUID_RE}$`));
      expect(imported.projectPath).toBe('/p');
      expect(imported.timestamp).toBeInstanceOf(Date);
    });
  });
});
