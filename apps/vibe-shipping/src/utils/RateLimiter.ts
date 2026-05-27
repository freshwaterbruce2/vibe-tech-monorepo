/**
 * Request Rate Limiter
 * Extracted from server.ts (lines 216-249)
 *
 * Sliding window rate limiting per client ID.
 */

export class RateLimiter {
  private requests = new Map<string, number[]>()

  constructor(
    private readonly windowMs = 60000,
    private readonly maxRequests = 100
  ) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs

    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, [])
    }

    const clientRequests = this.requests.get(clientId)!

    // Remove old requests outside the window
    while (clientRequests.length > 0 && clientRequests[0]! < windowStart) {
      clientRequests.shift()
    }

    if (clientRequests.length >= this.maxRequests) {
      return false
    }

    clientRequests.push(now)
    return true
  }

  getRemainingRequests(clientId: string): number {
    const clientRequests = this.requests.get(clientId) ?? []
    return Math.max(0, this.maxRequests - clientRequests.length)
  }
}
