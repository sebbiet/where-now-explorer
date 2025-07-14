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

  constructor() {
    // Define rate limiting rules for different endpoints
    this.rules.set('geocoding', { maxRequests: 60, windowMs: 60000 }); // 60 requests per minute
    this.rules.set('routing', { maxRequests: 30, windowMs: 60000 }); // 30 requests per minute
    this.rules.set('geolocation', { maxRequests: 20, windowMs: 60000 }); // 20 requests per minute
    this.rules.set('default', { maxRequests: 100, windowMs: 60000 }); // Default: 100 requests per minute
  }

  /**
   * Check if a request to an endpoint is allowed
   */
  isAllowed(endpoint: string): boolean {
    const rule = this.rules.get(endpoint) || this.rules.get('default')!;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Clean old logs outside the current window
    this.requestLogs = this.requestLogs.filter(log => log.timestamp >= windowStart);

    // Count requests to this endpoint in the current window
    const requestsInWindow = this.requestLogs.filter(log => 
      log.endpoint === endpoint && log.timestamp >= windowStart
    ).length;

    return requestsInWindow < rule.maxRequests;
  }

  /**
   * Record a request to an endpoint
   */
  recordRequest(endpoint: string): void {
    this.requestLogs.push({
      endpoint,
      timestamp: Date.now()
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
      .filter(log => log.endpoint === endpoint && log.timestamp >= windowStart)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (!oldestRequestInWindow) {
      return 0;
    }

    return Math.max(0, (oldestRequestInWindow.timestamp + rule.windowMs) - now);
  }

  /**
   * Wrap a function with rate limiting
   */
  withRateLimit<T extends (...args: any[]) => Promise<any>>(
    endpoint: string,
    fn: T
  ): T {
    return (async (...args: Parameters<T>) => {
      if (!this.isAllowed(endpoint)) {
        const resetTime = this.getTimeUntilReset(endpoint);
        throw new Error(
          `Rate limit exceeded for ${endpoint}. Try again in ${Math.ceil(resetTime / 1000)} seconds.`
        );
      }

      this.recordRequest(endpoint);
      return await fn(...args);
    }) as T;
  }

  /**
   * Clear all request logs (for testing)
   */
  clear(): void {
    this.requestLogs = [];
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();
export default rateLimiter;