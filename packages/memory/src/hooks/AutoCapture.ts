/**
 * Automatic Context Capture for Memory System
 * Hooks into session lifecycle to auto-record episodic memories
 */

import { createLogger } from '@vibetech/logger';
import type { MemoryManager } from '../core/MemoryManager.js';

const logger = createLogger('AutoCapture');

export interface CaptureConfig {
  /** Capture session start/end events */
  captureSessionEvents?: boolean;
  /** Capture file edit events */
  captureFileEdits?: boolean;
  /** Capture git commits */
  captureGitCommits?: boolean;
  /** Minimum importance for auto-capture (1-10) */
  minImportance?: number;
  /** Source identifier (e.g., 'claude-code', 'gemini-cli') */
  sourceId: string;
}

export class AutoCapture {
  private sessionId: string;
  private sessionStartTime: number;

  constructor(
    private memory: MemoryManager,
    private config: CaptureConfig
  ) {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${this.config.sourceId}-${timestamp}-${random}`;
  }

  /**
   * Capture session start
   */
  async captureSessionStart(metadata?: Record<string, any>): Promise<void> {
    if (!this.config.captureSessionEvents) return;

    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query: `Session started: ${this.sessionId}`,
      response: 'New Claude Code session initialized',
      timestamp: this.sessionStartTime,
      sessionId: this.sessionId,
      metadata: {
        event: 'session_start',
        ...metadata,
      },
    });

    logger.info(`Session ${this.sessionId} started`);
  }

  /**
   * Capture session end with summary
   */
  async captureSessionEnd(summary?: string): Promise<void> {
    if (!this.config.captureSessionEvents) return;

    const duration = Date.now() - this.sessionStartTime;
    const durationMin = Math.round(duration / 60000);

    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query: `Session ended: ${this.sessionId}`,
      response: summary || `Session completed after ${durationMin} minutes`,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        event: 'session_end',
        duration,
        durationMinutes: durationMin,
      },
    });

    logger.info(`Session ${this.sessionId} ended (${durationMin}m)`);
  }

  /**
   * Capture user query and agent response
   */
  async captureInteraction(query: string, response: string, metadata?: Record<string, any>): Promise<void> {
    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query,
      response,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        event: 'interaction',
        ...metadata,
      },
    });
  }

  /**
   * Capture file edit event
   */
  async captureFileEdit(filePath: string, changeType: 'create' | 'edit' | 'delete', summary?: string): Promise<void> {
    if (!this.config.captureFileEdits) return;

    const query = `File ${changeType}: ${filePath}`;
    const response = summary || `${changeType} operation on ${filePath}`;

    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query,
      response,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        event: 'file_edit',
        filePath,
        changeType,
      },
    });

    // Also track as procedural pattern if it's a common operation
    if (changeType === 'edit') {
      const fileExt = filePath.split('.').pop() || 'unknown';
      this.memory.procedural.upsert({
        pattern: `edit_${fileExt}_file`,
        context: `Editing ${fileExt} files`,
        successRate: 1.0,
        lastUsed: Date.now(),
        metadata: { fileType: fileExt },
      });
    }
  }

  /**
   * Capture git commit
   */
  async captureGitCommit(message: string, files: string[], branch?: string): Promise<void> {
    if (!this.config.captureGitCommits) return;

    const query = `Git commit: ${message}`;
    const response = `Committed ${files.length} file(s) to ${branch || 'current branch'}`;

    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query,
      response,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        event: 'git_commit',
        message,
        fileCount: files.length,
        files: files.slice(0, 10), // Limit to first 10 files
        branch,
      },
    });

    // Track commit pattern
    this.memory.procedural.upsert({
      pattern: 'git_commit',
      context: 'Creating git commits',
      successRate: 1.0,
      lastUsed: Date.now(),
      metadata: { fileCount: files.length },
    });
  }

  /**
   * Capture tool/command usage
   */
  async captureToolUse(toolName: string, args: unknown, result: 'success' | 'failure', metadata?: Record<string, unknown>): Promise<void> {
    const query = `Tool used: ${toolName}`;
    const response = `${result === 'success' ? 'Successfully' : 'Failed to'} execute ${toolName}`;

    this.memory.episodic.add({
      sourceId: this.config.sourceId,
      query,
      response,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: {
        event: 'tool_use',
        toolName,
        result,
        ...metadata,
      },
    });

    // Track as procedural pattern
    this.memory.procedural.upsert({
      pattern: toolName,
      context: `Using ${toolName} tool`,
      successRate: result === 'success' ? 1.0 : 0.0,
      lastUsed: Date.now(),
      metadata: { args },
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }
}
