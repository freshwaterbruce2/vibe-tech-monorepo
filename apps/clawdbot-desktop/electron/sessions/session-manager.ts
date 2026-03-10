import { AgentMemoryMessage } from '../capabilities/ai-integration';

interface SessionRecord {
  memory: AgentMemoryMessage[];
  lastActivityAt: string;
}

export interface SessionAwareAgent {
  restoreMemorySnapshot(messages: AgentMemoryMessage[]): void;
  captureMemorySnapshot(): AgentMemoryMessage[];
}

export class SessionManager {
  private sessions = new Map<string, SessionRecord>();
  private queue: Promise<void> = Promise.resolve();

  async withSession<T>(
    sessionId: string,
    agent: SessionAwareAgent,
    work: () => Promise<T>
  ): Promise<T> {
    const run = async (): Promise<T> => {
      const session = this.sessions.get(sessionId);
      agent.restoreMemorySnapshot(session?.memory ?? []);

      try {
        const result = await work();
        this.sessions.set(sessionId, {
          memory: agent.captureMemorySnapshot(),
          lastActivityAt: new Date().toISOString(),
        });
        return result;
      } finally {
        agent.restoreMemorySnapshot([]);
      }
    };

    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await run();
    } finally {
      release();
    }
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }
}
