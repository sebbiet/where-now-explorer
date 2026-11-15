/**
 * Rate Limiter Service
 * Implements client-side rate limiting to prevent API abuse
 */

interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
}

interface RequestLog {
  endpoint: string;
  timestamp: number;
}

class RateLimiterService {
  private requestLogs: RequestLog[] = [];
  private rules: Map<string, RateLimitRule> = new Map();
  private lastRequestAt = new Map<string, number>();
  private minIntervalMs = new Map<string, number>();

  constructor() {
    // Nominatim policy is 1 request per second. Keep a minute cap too.
    this.rules.set('geocoding', { maxRequests: 60, windowMs: 60000 });
    this.minIntervalMs.set('geocoding', 1000);
    this.rules.set('fallback-geocoding', { maxRequests: 60, windowMs: 60000 });
    this.minIntervalMs.set('fallback-geocoding', 1000);
    this.rules.set('routing', { maxRequests: 30, windowMs: 60000 });
    this.rules.set('geolocation', { maxRequests: 20, windowMs: 60000 });
    this.rules.set('default', { maxRequests: 100, windowMs: 60000 });
  }

  /**
   * Wait so requests to an endpoint are spaced at least minIntervalMs apart.
   */
  async waitForSlot(endpoint: string): Promise<void> {
    const minInterval = this.minIntervalMs.get(endpoint);
    if (!minInterval) {
      return;
    }
    const last = this.lastRequestAt.get(endpoint) ?? 0;
    const wait = last + minInterval - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  /**
   * Check if a request to an endpoint is allowed
   */
  isAllowed(endpoint: string): boolean {
    const rule = this.rules.get(endpoint) || this.rules.get('default')!;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Clean old logs outside the current window
    this.requestLogs = this.requestLogs.filter(
      (log) => log.timestamp >= windowStart
    );

    // Count requests to this endpoint in the current window
    const requestsInWindow = this.requestLogs.filter(
      (log) => log.endpoint === endpoint && log.timestamp >= windowStart
    ).length;

    return requestsInWindow < rule.maxRequests;
  }

  /**
   * Record a request to an endpoint
   */
  recordRequest(endpoint: string): void {
    const now = Date.now();
    this.lastRequestAt.set(endpoint, now);
    this.requestLogs.push({
      endpoint,
      timestamp: now,
    });
  }

  /**
   * Get time until rate limit resets for an endpoint
   */
  getTimeUntilReset(endpoint: string): number {
    const rule = this.rules.get(endpoint) || this.rules.get('default')!;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    const oldestRequestInWindow = this.requestLogs
      .filter(
        (log) => log.endpoint === endpoint && log.timestamp >= windowStart
      )
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (!oldestRequestInWindow) {
      return 0;
    }

    return Math.max(0, oldestRequestInWindow.timestamp + rule.windowMs - now);
  }

  /**
   * Wrap a function with rate limiting
   */
  withRateLimit<TArgs extends readonly unknown[], TReturn>(
    endpoint: string,
    fn: (...args: TArgs) => Promise<TReturn>
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      if (!this.isAllowed(endpoint)) {
        const resetTime = this.getTimeUntilReset(endpoint);
        throw new Error(
          `Rate limit exceeded for ${endpoint}. Try again in ${Math.ceil(resetTime / 1000)} seconds.`
        );
      }

      this.recordRequest(endpoint);
      return await fn(...args);
    };
  }

  /**
   * Clear all request logs (for testing)
   */
  clear(): void {
    this.requestLogs = [];
    this.lastRequestAt.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();
export default rateLimiter;
