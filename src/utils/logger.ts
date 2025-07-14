/**
 * Production-Safe Logging Utility
 * Provides structured logging that can be disabled in production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  component?: string;
  service?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: number;
  error?: Error;
}

class Logger {
  private isProduction = import.meta.env.PROD;
  private minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries in memory
  
  // Analytics integration (if available)
  private analytics: any = null;

  constructor() {
    // Initialize analytics if available
    if (typeof window !== 'undefined') {
      // Check for gtag availability (may be loaded asynchronously)
      if ((window as any).gtag) {
        this.analytics = (window as any).gtag;
      } else {
        // Try again after page load
        window.addEventListener('load', () => {
          if ((window as any).gtag) {
            this.analytics = (window as any).gtag;
          }
        });
      }
    }
  }

  /**
   * Set minimum log level (useful for debugging)
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Debug logging - only shown in development
   */
  debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info logging - important information
   */
  info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning logging - potential issues
   */
  warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error logging - errors that need attention
   */
  error(message: string, error?: Error, context: LogContext = {}): void {
    this.log(LogLevel.ERROR, message, { ...context, error: error?.message }, error);
    
    // Send critical errors to analytics in production
    if (this.isProduction && this.analytics && error) {
      this.analytics('event', 'exception', {
        description: `${message}: ${error.message}`,
        fatal: false,
        custom_map: {
          component: context.component,
          service: context.service,
          operation: context.operation
        }
      });
    }
  }

  /**
   * Performance timing logging
   */
  performance(operation: string, duration: number, context: LogContext = {}): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      type: 'performance'
    });

    // Send performance metrics to analytics
    if (this.isProduction && this.analytics) {
      this.analytics('event', 'timing_complete', {
        name: operation,
        value: Math.round(duration),
        custom_map: context
      });
    }
  }

  /**
   * User action logging for analytics
   */
  userAction(action: string, context: LogContext = {}): void {
    this.info(`User action: ${action}`, {
      ...context,
      action,
      type: 'user_action'
    });

    // Send user actions to analytics
    if (this.analytics) {
      this.analytics('event', 'custom_action', {
        action_name: action,
        custom_map: context
      });
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      error
    };

    // Store in memory (useful for debugging)
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, use console
    if (!this.isProduction) {
      const levelName = LogLevel[level];
      const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : '';
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`[${levelName}] ${message}`, contextStr);
          break;
        case LogLevel.INFO:
          console.info(`[${levelName}] ${message}`, contextStr);
          break;
        case LogLevel.WARN:
          console.warn(`[${levelName}] ${message}`, contextStr);
          break;
        case LogLevel.ERROR:
          if (error) {
            console.error(`[${levelName}] ${message}`, error, contextStr);
          } else {
            console.error(`[${levelName}] ${message}`, contextStr);
          }
          break;
      }
    }
  }

  /**
   * Get recent logs (useful for debugging)
   */
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Helper functions for common logging patterns
export const logPerformance = (operation: string) => {
  const start = performance.now();
  return {
    end: (context?: LogContext) => {
      const duration = performance.now() - start;
      logger.performance(operation, duration, context);
      return duration;
    }
  };
};

export const logAsyncOperation = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> => {
  const perf = logPerformance(operation);
  try {
    logger.debug(`Starting ${operation}`, context);
    const result = await fn();
    const duration = perf.end(context);
    logger.debug(`Completed ${operation} in ${Math.round(duration)}ms`, context);
    return result;
  } catch (error) {
    perf.end({ ...context, error: true });
    logger.error(`Failed ${operation}`, error as Error, context);
    throw error;
  }
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global error caught', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'global_error'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', new Error(event.reason), {
      type: 'unhandled_rejection'
    });
  });
}