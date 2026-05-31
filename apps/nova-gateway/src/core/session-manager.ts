import crypto from 'crypto';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

export interface SessionState {
  history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  variables: Record<string, any>;
  activeProjectId: string | null;
}

export class SessionManager {
  /**
   * Resolves a platform-specific user to a Unified Client ID.
   * If the user doesn't exist, a new unified client and identity mapping are created.
   */
  public getOrCreateUnifiedClient(
    platform: string,
    platformUserId: string,
    platformUsername?: string
  ): string {
    try {
      // 1. Check if identity already exists
      const identityQuery = db.prepare(`
        SELECT unified_client_id FROM user_identities 
        WHERE platform = ? AND platform_user_id = ?
      `);
      
      const record = identityQuery.get(platform, platformUserId) as { unified_client_id: string } | undefined;

      if (record) {
        // Identity exists, update username if it changed
        if (platformUsername) {
          db.prepare(`
            UPDATE user_identities SET platform_username = ? 
            WHERE platform = ? AND platform_user_id = ?
          `).run(platformUsername, platform, platformUserId);
        }
        return record.unified_client_id;
      }

      // 2. Identity does not exist, create a new unified client
      const unifiedClientId = `client_${crypto.randomUUID().replace(/-/g, '')}`;
      
      // Perform database transaction for atomic safety
      const runTransaction = db.transaction(() => {
        db.prepare('INSERT INTO unified_clients (id) VALUES (?)').run(unifiedClientId);
        db.prepare(`
          INSERT INTO user_identities (unified_client_id, platform, platform_user_id, platform_username)
          VALUES (?, ?, ?, ?)
        `).run(unifiedClientId, platform, platformUserId, platformUsername || null);
      });

      runTransaction();
      logger.info(`Created new unified client profile: ${unifiedClientId} for ${platform}:${platformUserId}`);
      return unifiedClientId;

    } catch (err) {
      logger.error(`Failed to resolve user identity for ${platform}:${platformUserId}:`, {}, err as Error);
      throw err;
    }
  }

  /**
   * Links a platform identity to an existing unified client.
   * If the identity was previously linked to another client, they are merged.
   */
  public linkIdentity(
    unifiedClientId: string,
    platform: string,
    platformUserId: string,
    platformUsername?: string
  ): void {
    try {
      // Check if this identity is already mapped
      const checkQuery = db.prepare(`
        SELECT unified_client_id FROM user_identities 
        WHERE platform = ? AND platform_user_id = ?
      `);
      const existing = checkQuery.get(platform, platformUserId) as { unified_client_id: string } | undefined;

      if (existing) {
        if (existing.unified_client_id === unifiedClientId) {
          // Already linked to this client
          return;
        }
        // Identity is mapped to a DIFFERENT client - merge them
        this.mergeClients(unifiedClientId, existing.unified_client_id);
      } else {
        // Just insert the link
        db.prepare(`
          INSERT INTO user_identities (unified_client_id, platform, platform_user_id, platform_username)
          VALUES (?, ?, ?, ?)
        `).run(unifiedClientId, platform, platformUserId, platformUsername || null);
        logger.info(`Linked identity ${platform}:${platformUserId} to client ${unifiedClientId}`);
      }
    } catch (err) {
      logger.error(`Failed to link identity ${platform}:${platformUserId} to client ${unifiedClientId}:`, {}, err as Error);
      throw err;
    }
  }

  /**
   * Public interface to merge two client profiles.
   */
  public mergeProfiles(targetId: string, sourceId: string): void {
    this.mergeClients(targetId, sourceId);
  }

  /**
   * Merges a source client profile into a target client profile.
   */
  private mergeClients(targetId: string, sourceId: string): void {
    logger.info(`Merging client profile ${sourceId} into ${targetId}...`);
    
    try {
      const runTransaction = db.transaction(() => {
        // 1. Move all user identities from source to target
        db.prepare('UPDATE user_identities SET unified_client_id = ? WHERE unified_client_id = ?')
          .run(targetId, sourceId);

        // 2. Merge session states
        const sourceSession = this.getSession(sourceId);
        const targetSession = this.getSession(targetId);

        const mergedHistory = [...targetSession.history, ...sourceSession.history]
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-50); // Keep last 50 entries to remain under limits

        const mergedSession: SessionState = {
          history: mergedHistory,
          variables: { ...targetSession.variables, ...sourceSession.variables },
          activeProjectId: targetSession.activeProjectId || sourceSession.activeProjectId,
        };

        // 3. Update target session state
        db.prepare(`
          INSERT INTO client_sessions (unified_client_id, last_platform, last_channel_id, conversation_state, last_active)
          VALUES (?, 'merged', 'merged', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(unified_client_id) DO UPDATE SET
            conversation_state = excluded.conversation_state,
            last_active = CURRENT_TIMESTAMP
        `).run(targetId, JSON.stringify(mergedSession));

        // 4. Clean up source client
        db.prepare('DELETE FROM client_sessions WHERE unified_client_id = ?').run(sourceId);
        db.prepare('DELETE FROM unified_clients WHERE id = ?').run(sourceId);
      });

      runTransaction();
      logger.info(`Successfully merged client profile ${sourceId} into ${targetId}`);
    } catch (err) {
      logger.error(`Failed to merge client profile ${sourceId} into ${targetId}:`, {}, err as Error);
      throw err;
    }
  }

  /**
   * Retrieves conversation session state for a unified client.
   */
  public getSession(unifiedClientId: string): SessionState {
    const defaultState: SessionState = {
      history: [],
      variables: {},
      activeProjectId: null,
    };

    try {
      const query = db.prepare('SELECT conversation_state FROM client_sessions WHERE unified_client_id = ?');
      const record = query.get(unifiedClientId) as { conversation_state: string } | undefined;

      if (!record) {
        return defaultState;
      }

      return JSON.parse(record.conversation_state);
    } catch (err) {
      logger.error(`Failed to retrieve session for client ${unifiedClientId}:`, {}, err as Error);
      return defaultState;
    }
  }

  /**
   * Saves conversation session state for a unified client.
   */
  public saveSession(
    unifiedClientId: string,
    platform: string,
    channelId: string,
    state: SessionState
  ): void {
    try {
      db.prepare(`
        INSERT INTO client_sessions (unified_client_id, last_platform, last_channel_id, conversation_state, last_active)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(unified_client_id) DO UPDATE SET
          last_platform = excluded.last_platform,
          last_channel_id = excluded.last_channel_id,
          conversation_state = excluded.conversation_state,
          last_active = CURRENT_TIMESTAMP
      `).run(unifiedClientId, platform, channelId, JSON.stringify(state));
    } catch (err) {
      logger.error(`Failed to save session for client ${unifiedClientId}:`, {}, err as Error);
      throw err;
    }
  }
}

export const sessionManager = new SessionManager();
