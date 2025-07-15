export interface MonitorEvent {
  event: string;
  data?: unknown;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface Monitor {
  track(event: string, data?: unknown): void;
  trackError(error: unknown, context: string): void;
  trackPerformance(operation: string, duration: number): void;
}

/**
 * No-op implementation of Monitor for when monitoring is disabled
 */
export class NoOpMonitor implements Monitor {
  track(_event: string, _data?: unknown): void {
    // No-op
  }

  trackError(_error: unknown, _context: string): void {
    // No-op
  }

  trackPerformance(_operation: string, _duration: number): void {
    // No-op
  }
}

/**
 * Console-based monitor for development
 */
export class ConsoleMonitor implements Monitor {
  track(event: string, data?: unknown): void {
    console.log(`[Monitor] ${event}`, data);
  }

  trackError(error: unknown, context: string): void {
    console.error(`[Monitor] Error in ${context}:`, error);
  }

  trackPerformance(operation: string, duration: number): void {
    console.log(`[Monitor] ${operation} took ${duration}ms`);
  }
}

/**
 * Production monitor that integrates with analytics and error tracking services
 */
export class ProductionMonitor implements Monitor {
  constructor(
    private analytics?: { track: (event: string, data?: unknown) => void },
    private errorReporter?: {
      report: (error: unknown, context: string) => void;
    }
  ) {}

  track(event: string, data?: unknown): void {
    if (this.analytics) {
      this.analytics.track(event, data);
    }
  }

  trackError(error: unknown, context: string): void {
    if (this.errorReporter) {
      this.errorReporter.report(error, context);
    } else {
      console.error(`[${context}] Error:`, error);
    }
  }

  trackPerformance(operation: string, duration: number): void {
    if (this.analytics) {
      this.analytics.track('performance', {
        operation,
        duration,
        timestamp: Date.now(),
      });
    }
  }
}
