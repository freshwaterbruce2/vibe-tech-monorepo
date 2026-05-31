import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../src/db/client.js';
import { initializeSchema } from '../../src/db/schema.js';
import { sessionManager } from '../../src/core/session-manager.js';

describe('Unified Session Manager', () => {
  beforeAll(() => {
    // Assert we are using an in-memory database for testing
    expect(db.name).toBe(':memory:');
    initializeSchema();
  });

  it('should create a unified client ID and resolve it consistently', () => {
    const tgUserId = '12345678';
    const client1 = sessionManager.getOrCreateUnifiedClient('telegram', tgUserId, 'tguser');
    expect(client1).toBeDefined();
    expect(client1.startsWith('client_')).toBe(true);

    const client2 = sessionManager.getOrCreateUnifiedClient('telegram', tgUserId, 'tguser_newname');
    expect(client2).toBe(client1);

    // Verify username update occurred
    const row = db.prepare('SELECT platform_username FROM user_identities WHERE platform_user_id = ?').get(tgUserId) as any;
    expect(row.platform_username).toBe('tguser_newname');
  });

  it('should link a new platform identity to an existing unified client profile', () => {
    const tgUserId = '99999';
    const discordUserId = '88888';

    const client1 = sessionManager.getOrCreateUnifiedClient('telegram', tgUserId, 'tg_bro');
    sessionManager.linkIdentity(client1, 'discord', discordUserId, 'discord_bro');

    // Discord resolution should now yield the same client profile
    const resolvedClient = sessionManager.getOrCreateUnifiedClient('discord', discordUserId);
    expect(resolvedClient).toBe(client1);
  });

  it('should get and save conversation session state', () => {
    const userId = '55555';
    const client = sessionManager.getOrCreateUnifiedClient('telegram', userId, 'test_user');

    const state = sessionManager.getSession(client);
    expect(state.history).toEqual([]);
    expect(state.activeProjectId).toBeNull();

    // Modify state
    state.activeProjectId = 'project-123';
    state.history.push({
      role: 'user',
      content: 'hello',
      timestamp: new Date().toISOString()
    });
    state.variables.foo = 'bar';

    sessionManager.saveSession(client, 'telegram', 'channel-abc', state);

    // Retrieve again
    const loadedState = sessionManager.getSession(client);
    expect(loadedState.activeProjectId).toBe('project-123');
    expect(loadedState.variables.foo).toBe('bar');
    expect(loadedState.history.length).toBe(1);
    expect(loadedState.history[0]?.content).toBe('hello');
  });

  it('should merge two profiles when linking an identity that belongs to another client', () => {
    const clientA = sessionManager.getOrCreateUnifiedClient('telegram', 'user-a', 'user_tg');
    const clientB = sessionManager.getOrCreateUnifiedClient('discord', 'user-b', 'user_discord');

    // Setup session variables for both
    const stateA = sessionManager.getSession(clientA);
    stateA.variables.keyA = 'valueA';
    stateA.activeProjectId = 'projectA';
    stateA.history.push({ role: 'user', content: 'Msg A', timestamp: '2026-05-30T10:00:00Z' });
    sessionManager.saveSession(clientA, 'telegram', 'chA', stateA);

    const stateB = sessionManager.getSession(clientB);
    stateB.variables.keyB = 'valueB';
    stateB.variables.keyA = 'clobberedByB'; // Check collision handling
    stateB.activeProjectId = 'projectB';
    stateB.history.push({ role: 'user', content: 'Msg B', timestamp: '2026-05-30T11:00:00Z' });
    sessionManager.saveSession(clientB, 'discord', 'chB', stateB);

    // Link Telegram user A to Client B (which triggers a merge of Client A into Client B)
    sessionManager.linkIdentity(clientB, 'telegram', 'user-a');

    // Both identities should now resolve to Client B
    expect(sessionManager.getOrCreateUnifiedClient('telegram', 'user-a')).toBe(clientB);
    expect(sessionManager.getOrCreateUnifiedClient('discord', 'user-b')).toBe(clientB);

    // Verify session variables and history were merged
    const mergedState = sessionManager.getSession(clientB);
    expect(mergedState.variables.keyB).toBe('valueB');
    expect(mergedState.variables.keyA).toBe('valueA'); // Priority variables merged
    expect(mergedState.activeProjectId).toBe('projectB'); // Retains target's project
    expect(mergedState.history.length).toBe(2);
    expect(mergedState.history[0]?.content).toBe('Msg A');
    expect(mergedState.history[1]?.content).toBe('Msg B');

    // Verify client A profile is deleted
    const clientARecord = db.prepare('SELECT id FROM unified_clients WHERE id = ?').get(clientA);
    expect(clientARecord).toBeUndefined();
  });
});
