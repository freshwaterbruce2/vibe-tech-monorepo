/**
 * Simple async semaphore enforcing a maximum number of concurrent operations.
 */
export class Semaphore {
  private readonly queue: Array<() => void> = [];
  private activeCount = 0;

  constructor(private readonly maxConcurrency: number) {
    if (maxConcurrency <= 0) {
      throw new Error('maxConcurrency must be positive');
    }
  }

  async acquire(): Promise<() => void> {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.activeCount += 1;
    return () => this.release();
  }

  private release(): void {
    this.activeCount -= 1;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  get running(): number {
    return this.activeCount;
  }
}
