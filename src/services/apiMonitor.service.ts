/**
 * API Monitoring Service
 * Tracks API response times, success rates, and implements circuit breaker pattern
 */

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export class ApiMonitorService {
  private metrics = new Map<string, ApiMetrics>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private static readonly METRICS_WINDOW = 5 * 60 * 1000; // 5 minutes

  /**
   * Record API request
   */
  recordRequest(
    endpoint: string,
    success: boolean,
    responseTime: number,
    error?: string
  ): void {
    const metrics = this.metrics.get(endpoint) || this.createEmptyMetrics();

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      if (error) {
        metrics.lastError = error;
        metrics.lastErrorTime = Date.now();
      }
      this.updateCircuitBreaker(endpoint, false);
    }

    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime =
      metrics.totalResponseTime / metrics.totalRequests;

    this.metrics.set(endpoint, metrics);

    if (success) {
      this.updateCircuitBreaker(endpoint, true);
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(endpoint: string): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    if (breaker.isOpen) {
      // Check if we should try to close the circuit
      if (Date.now() >= breaker.nextRetryTime) {
        console.log(`Circuit breaker for ${endpoint} entering half-open state`);
        return false; // Allow one request through
      }
      return true;
    }

    return false;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(endpoint: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(endpoint) || {
      isOpen: false,
      failures: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    };

    if (success) {
      // Reset on success
      if (breaker.failures > 0) {
        console.log(`Circuit breaker for ${endpoint} reset after success`);
      }
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      // Increment failures
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (breaker.failures >= ApiMonitorService.CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        breaker.nextRetryTime =
          Date.now() + ApiMonitorService.CIRCUIT_BREAKER_TIMEOUT;
        console.warn(
          `Circuit breaker opened for ${endpoint} after ${breaker.failures} failures`
        );
      }
    }

    this.circuitBreakers.set(endpoint, breaker);
  }

  /**
   * Get API health status
   */
  getApiHealth(endpoint: string): {
    successRate: number;
    averageResponseTime: number;
    isHealthy: boolean;
    circuitBreakerOpen: boolean;
  } {
    const metrics = this.metrics.get(endpoint);
    if (!metrics || metrics.totalRequests === 0) {
      return {
        successRate: 100,
        averageResponseTime: 0,
        isHealthy: true,
        circuitBreakerOpen: false,
      };
    }

    const successRate =
      (metrics.successfulRequests / metrics.totalRequests) * 100;
    const isHealthy = successRate >= 95 && metrics.averageResponseTime < 2000;

    return {
      successRate,
      averageResponseTime: metrics.averageResponseTime,
      isHealthy,
      circuitBreakerOpen: this.isCircuitOpen(endpoint),
    };
  }

  /**
   * Get all monitored endpoints
   */
  getAllEndpointHealth(): Record<string, any> {
    const health: Record<string, any> = {};

    this.metrics.forEach((metrics, endpoint) => {
      health[endpoint] = {
        ...this.getApiHealth(endpoint),
        totalRequests: metrics.totalRequests,
        failedRequests: metrics.failedRequests,
        lastError: metrics.lastError,
        lastErrorTime: metrics.lastErrorTime
          ? new Date(metrics.lastErrorTime).toISOString()
          : null,
      };
    });

    return health;
  }

  /**
   * Select best provider based on health
   */
  selectBestProvider(providers: string[]): string | null {
    let bestProvider: string | null = null;
    let bestScore = -1;

    for (const provider of providers) {
      if (this.isCircuitOpen(provider)) continue;

      const health = this.getApiHealth(provider);
      // Score based on success rate and response time
      const score = health.successRate - health.averageResponseTime / 100;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): ApiMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Reset metrics for an endpoint
   */
  resetMetrics(endpoint: string): void {
    this.metrics.delete(endpoint);
    this.circuitBreakers.delete(endpoint);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.metrics.clear();
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const apiMonitor = new ApiMonitorService();

/**
 * Wrap a function with API monitoring
 */
export function withApiMonitoring<
  T extends (...args: unknown[]) => Promise<unknown>,
>(endpoint: string, fn: T): T {
  return (async (...args: Parameters<T>) => {
    // Check circuit breaker
    if (apiMonitor.isCircuitOpen(endpoint)) {
      throw new Error(
        `Circuit breaker is open for ${endpoint}. Service temporarily unavailable.`
      );
    }

    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const responseTime = Date.now() - startTime;
      apiMonitor.recordRequest(endpoint, true, responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      apiMonitor.recordRequest(
        endpoint,
        false,
        responseTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }) as T;
}
