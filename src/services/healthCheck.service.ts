/**
 * Health Check Service
 * Monitors application health and provides status endpoints
 */

import { logger } from '@/utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: HealthCheck[];
  uptime: number;
  version: string;
  environment: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration: number;
  details?: Record<string, unknown>;
}

export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
}

class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private lastHealthStatus: HealthStatus | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor(
    private config: HealthCheckConfig = {
      timeout: 5000,
      retries: 2,
      interval: 30000, // 30 seconds
    }
  ) {
    this.initializeDefaultChecks();
    this.startMonitoring();
  }

  /**
   * Register a custom health check
   */
  registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
    logger.info(`Health check '${name}' registered`, {
      service: 'HealthCheck',
      checkName: name,
    });
  }

  /**
   * Run all health checks and return status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Run all registered checks
    for (const [name, checkFn] of this.checks) {
      try {
        const start = performance.now();
        const result = await Promise.race([
          checkFn(),
          this.timeoutPromise(this.config.timeout),
        ]);
        const duration = performance.now() - start;

        checks.push({
          ...result,
          duration,
          name,
        });
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: this.config.timeout,
          details: { error: String(error) },
        });
      }
    }

    // Determine overall status
    const overallStatus = this.calculateOverallStatus(checks);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      uptime: Date.now() - this.startTime,
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
      environment: import.meta.env.PROD ? 'production' : 'development',
    };

    this.lastHealthStatus = healthStatus;

    logger.debug('Health check completed', {
      service: 'HealthCheck',
      status: overallStatus,
      checkCount: checks.length,
      failedChecks: checks.filter((c) => c.status === 'fail').length,
    });

    return healthStatus;
  }

  /**
   * Get the last health status (cached)
   */
  getLastHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus;
  }

  /**
   * Check if the application is healthy
   */
  async isHealthy(): Promise<boolean> {
    const status = await this.getHealthStatus();
    return status.status === 'healthy';
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      const status = await this.getHealthStatus();

      if (status.status !== 'healthy') {
        logger.warn('Application health degraded', {
          service: 'HealthCheck',
          status: status.status,
          failedChecks: status.checks
            .filter((c) => c.status === 'fail')
            .map((c) => c.name),
        });
      }
    }, this.config.interval);

    logger.info('Health monitoring started', {
      service: 'HealthCheck',
      interval: this.config.interval,
    });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Health monitoring stopped', { service: 'HealthCheck' });
    }
  }

  /**
   * Initialize default health checks
   */
  private initializeDefaultChecks(): void {
    // Browser API availability check
    this.registerCheck('browser-apis', async () => {
      const requiredAPIs = ['fetch', 'localStorage', 'navigator'];
      const missing: string[] = [];

      requiredAPIs.forEach((api) => {
        if (!(api in window)) {
          missing.push(api);
        }
      });

      return {
        name: 'browser-apis',
        status: missing.length === 0 ? 'pass' : 'fail',
        message:
          missing.length === 0
            ? 'All required browser APIs available'
            : `Missing APIs: ${missing.join(', ')}`,
        duration: 0,
        details: { requiredAPIs, missing },
      };
    });

    // Memory usage check
    this.registerCheck('memory-usage', async () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usage = (usedMB / limitMB) * 100;

        return {
          name: 'memory-usage',
          status: usage < 80 ? 'pass' : usage < 90 ? 'warn' : 'fail',
          message: `Memory usage: ${usedMB}MB / ${limitMB}MB (${usage.toFixed(1)}%)`,
          duration: 0,
          details: { usedMB, limitMB, usagePercent: usage },
        };
      }

      return {
        name: 'memory-usage',
        status: 'warn',
        message: 'Memory API not available',
        duration: 0,
      };
    });

    // Local storage check
    this.registerCheck('local-storage', async () => {
      try {
        const testKey = '__health_check_test__';
        localStorage.setItem(testKey, 'test');
        const value = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        return {
          name: 'local-storage',
          status: value === 'test' ? 'pass' : 'fail',
          message:
            value === 'test'
              ? 'Local storage working'
              : 'Local storage test failed',
          duration: 0,
        };
      } catch (error) {
        return {
          name: 'local-storage',
          status: 'fail',
          message: 'Local storage not available or full',
          duration: 0,
          details: { error: String(error) },
        };
      }
    });

    // Network connectivity check
    this.registerCheck('network-connectivity', async () => {
      if ('onLine' in navigator) {
        const isOnline = navigator.onLine;
        return {
          name: 'network-connectivity',
          status: isOnline ? 'pass' : 'warn',
          message: isOnline
            ? 'Network connection available'
            : 'No network connection detected',
          duration: 0,
          details: { onLine: isOnline },
        };
      }

      return {
        name: 'network-connectivity',
        status: 'warn',
        message: 'Network status API not available',
        duration: 0,
      };
    });

    // Geolocation API check
    this.registerCheck('geolocation-api', async () => {
      if ('geolocation' in navigator) {
        return {
          name: 'geolocation-api',
          status: 'pass',
          message: 'Geolocation API available',
          duration: 0,
        };
      }

      return {
        name: 'geolocation-api',
        status: 'fail',
        message: 'Geolocation API not available',
        duration: 0,
      };
    });

    // Service Worker check
    this.registerCheck('service-worker', async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const isActive = registration?.active !== null;

          return {
            name: 'service-worker',
            status: isActive ? 'pass' : 'warn',
            message: isActive
              ? 'Service worker active'
              : 'Service worker not active',
            duration: 0,
            details: {
              available: true,
              active: isActive,
              scope: registration?.scope,
            },
          };
        } catch (error) {
          return {
            name: 'service-worker',
            status: 'warn',
            message: 'Service worker check failed',
            duration: 0,
            details: { error: String(error) },
          };
        }
      }

      return {
        name: 'service-worker',
        status: 'warn',
        message: 'Service Worker API not available',
        duration: 0,
      };
    });

    // External API connectivity check
    this.registerCheck('external-apis', async () => {
      try {
        // Test with our proxied geocoding endpoint
        const testUrl = '/api/geocoding/status.php';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              Accept: 'text/plain',
            },
          });
          clearTimeout(timeoutId);

          const isHealthy = response.ok;

          return {
            name: 'external-apis',
            status: isHealthy ? 'pass' : 'warn',
            message: isHealthy
              ? 'External API connectivity working'
              : 'External API connectivity degraded',
            duration: 0,
            details: {
              statusCode: response.status,
              endpoint: 'nominatim-proxy',
            },
          };
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        // If we can't reach the API, it might be a network issue
        return {
          name: 'external-apis',
          status: 'warn',
          message: 'External API connectivity may be limited',
          duration: 0,
          details: { error: String(error) },
        };
      }
    });

    logger.info('Default health checks initialized', {
      service: 'HealthCheck',
      checkCount: this.checks.size,
    });
  }

  /**
   * Calculate overall health status from individual checks
   */
  private calculateOverallStatus(
    checks: HealthCheck[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const failedChecks = checks.filter((c) => c.status === 'fail');
    const warningChecks = checks.filter((c) => c.status === 'warn');

    if (failedChecks.length > 0) {
      return 'unhealthy';
    }

    if (warningChecks.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Create a timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }
}

// Create singleton instance
export const healthCheck = new HealthCheckService();

// Express-style middleware for health endpoints (if using Node.js)
export const createHealthEndpoint = () => {
  return async (req: any, res: any) => {
    try {
      const status = await healthCheck.getHealthStatus();
      const httpStatus =
        status.status === 'healthy'
          ? 200
          : status.status === 'degraded'
            ? 200
            : 503;

      res.status(httpStatus).json(status);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        error: String(error),
      });
    }
  };
};
