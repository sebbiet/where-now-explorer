/**
 * Base Service Class
 * Provides common error handling, rate limiting, monitoring, and retry logic
 * for all service classes to extend
 */

import { retryWithBackoff } from '@/utils/retry';
import { rateLimiter } from './rateLimiter.service';
import { withApiMonitoring } from './apiMonitor.service';
import { withPerformanceTracking } from '@/utils/performanceMonitor';
import { deduplicateGeocodingRequest } from '@/utils/requestDeduplication';

// Base error options interface
export interface ServiceErrorOptions {
  code?: string;
  statusCode?: number;
  originalError?: Error;
}

// Specific error options interfaces
export interface NetworkErrorOptions {
  statusCode: number;
  originalError?: Error;
}

export interface ValidationErrorOptions {
  field?: string;
  originalError?: Error;
}

export interface RateLimitErrorOptions {
  resetTime: number;
  originalError?: Error;
}

export interface TimeoutErrorOptions {
  timeout: number;
  originalError?: Error;
}

// Base error classes for consistent error handling
export class ServiceError extends Error {
  public code?: string;
  public statusCode?: number;
  public originalError?: Error;

  constructor(message: string, options: ServiceErrorOptions = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.originalError = options.originalError;
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, options: NetworkErrorOptions) {
    super(message, {
      code: 'NETWORK_ERROR',
      statusCode: options.statusCode,
      originalError: options.originalError,
    });
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ServiceError {
  public field?: string;

  constructor(message: string, options: ValidationErrorOptions = {}) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      originalError: options.originalError,
    });
    this.name = 'ValidationError';
    this.field = options.field;
  }
}

export class RateLimitError extends ServiceError {
  public resetTime: number;

  constructor(message: string, options: RateLimitErrorOptions) {
    super(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      originalError: options.originalError,
    });
    this.name = 'RateLimitError';
    this.resetTime = options.resetTime;
  }
}

export class TimeoutError extends ServiceError {
  public timeout: number;

  constructor(message: string, options: TimeoutErrorOptions) {
    super(message, {
      code: 'TIMEOUT',
      statusCode: 408,
      originalError: options.originalError,
    });
    this.name = 'TimeoutError';
    this.timeout = options.timeout;
  }
}

// Configuration interfaces
export interface ServiceConfig {
  rateLimitKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableMonitoring?: boolean;
  enableDeduplication?: boolean;
  enablePerformanceTracking?: boolean;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: any;
  timeout?: number;
  skipRateLimit?: boolean;
  skipRetry?: boolean;
  skipMonitoring?: boolean;
}

export interface FallbackProvider<T> {
  name: string;
  execute: () => Promise<T>;
  priority: number;
}

export abstract class BaseService {
  protected config: Required<ServiceConfig>;
  protected serviceName: string;

  constructor(serviceName: string, config: ServiceConfig = {}) {
    this.serviceName = serviceName;
    this.config = {
      rateLimitKey: config.rateLimitKey || serviceName,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 10000,
      enableMonitoring: config.enableMonitoring ?? true,
      enableDeduplication: config.enableDeduplication ?? true,
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
    };
  }

  /**
   * Centralized error handling for all service operations
   */
  protected handleError(error: any, context: string): never {
    // Log the error with context
    this.logError(error, context);

    // Transform known error types
    if (error instanceof ServiceError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        'Network request failed. Please check your internet connection.',
        {
          statusCode: 0,
          originalError: error,
        }
      );
    }

    if (error.name === 'AbortError') {
      throw new TimeoutError('Request timed out. Please try again.', {
        timeout: this.config.timeout,
        originalError: error,
      });
    }

    // Handle HTTP errors
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      const message = this.getHttpErrorMessage(status);
      throw new NetworkError(message, {
        statusCode: status,
        originalError: error,
      });
    }

    // Default to generic service error
    throw new ServiceError(
      `${this.serviceName} operation failed: ${error.message || 'Unknown error'}`,
      {
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        originalError: error,
      }
    );
  }

  /**
   * Check rate limits before executing operation
   */
  protected checkRateLimit(): void {
    if (!rateLimiter.isAllowed(this.config.rateLimitKey)) {
      const resetTime = rateLimiter.getTimeUntilReset(this.config.rateLimitKey);
      throw new RateLimitError(
        `Too many requests. Please wait ${Math.ceil(resetTime / 1000)} seconds.`,
        { resetTime }
      );
    }
    rateLimiter.recordRequest(this.config.rateLimitKey);
  }

  /**
   * Execute HTTP request with full error handling pipeline
   */
  protected async executeRequest<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Check rate limits unless explicitly skipped
    if (!options.skipRateLimit) {
      this.checkRateLimit();
    }

    const fetchOperation = async (): Promise<T> => {
      let fetchPromise: Promise<Response>;

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
      };

      // Add timeout if specified
      if (options.timeout || this.config.timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout || this.config.timeout
        );
        fetchOptions.signal = controller.signal;

        fetchPromise = fetch(url, fetchOptions).finally(() => {
          clearTimeout(timeoutId);
        });
      } else {
        fetchPromise = fetch(url, fetchOptions);
      }

      // Execute with monitoring if enabled
      const monitoredFetch =
        options.skipMonitoring || !this.config.enableMonitoring
          ? () => fetchPromise
          : withApiMonitoring(this.serviceName, () => fetchPromise);

      const response = await monitoredFetch();

      // Handle HTTP errors
      if (!response.ok) {
        const error = new NetworkError(
          this.getHttpErrorMessage(response.status),
          { statusCode: response.status }
        );
        throw error;
      }

      return response.json();
    };

    // Execute with retry logic unless explicitly skipped
    const operation = options.skipRetry
      ? fetchOperation
      : () =>
          retryWithBackoff(fetchOperation, {
            maxAttempts: this.config.maxRetries,
            onRetry: (attempt, delay) => {
              this.logRetry(attempt, delay);
            },
          });

    // Execute with performance tracking if enabled
    if (this.config.enablePerformanceTracking) {
      return withPerformanceTracking(this.serviceName, operation);
    }

    return operation();
  }

  /**
   * Execute operation with fallback providers
   */
  protected async executeWithFallbacks<T>(
    primaryOperation: () => Promise<T>,
    fallbackProviders: FallbackProvider<T>[] = []
  ): Promise<T> {
    // Try primary operation first
    try {
      return await primaryOperation();
    } catch (error) {
      this.logFallbackAttempt('primary', error);
    }

    // Try fallback providers in priority order
    const sortedProviders = fallbackProviders.sort(
      (a, b) => a.priority - b.priority
    );
    const errors: Error[] = [];

    for (const provider of sortedProviders) {
      try {
        this.logFallbackAttempt(provider.name, null);
        return await provider.execute();
      } catch (error) {
        this.logFallbackAttempt(provider.name, error);
        errors.push(error as Error);
      }
    }

    // All providers failed
    throw new ServiceError(
      `All ${this.serviceName} providers failed. Last errors: ${errors.map((e) => e.message).join(', ')}`,
      {
        code: 'ALL_PROVIDERS_FAILED',
        statusCode: 500,
      }
    );
  }

  /**
   * Execute operation with request deduplication
   */
  protected async executeWithDeduplication<T>(
    operationType: string,
    operationKey: any,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enableDeduplication) {
      return operation();
    }

    return deduplicateGeocodingRequest(operationType, operationKey, operation);
  }

  /**
   * Validate input parameters
   */
  protected validateInput(
    input: any,
    validationRules: Record<string, (value: any) => boolean>
  ): void {
    for (const [field, validator] of Object.entries(validationRules)) {
      if (!validator(input[field])) {
        throw new ValidationError(`Invalid ${field} provided`, { field });
      }
    }
  }

  /**
   * Get HTTP error message based on status code
   */
  private getHttpErrorMessage(status: number): string {
    const errorMessages: Record<number, string> = {
      400: 'Bad request. Please check your input.',
      401: 'Unauthorized. Please check your credentials.',
      403: 'Forbidden. You do not have permission to access this resource.',
      404: 'Resource not found.',
      408: 'Request timeout. Please try again.',
      429: 'Too many requests. Please slow down.',
      500: 'Internal server error. Please try again later.',
      502: 'Bad gateway. The server is temporarily unavailable.',
      503: 'Service unavailable. Please try again later.',
      504: 'Gateway timeout. The server took too long to respond.',
    };

    return errorMessages[status] || `HTTP error ${status}`;
  }

  /**
   * Log errors with consistent format
   */
  private logError(error: any, context: string): void {
    const errorInfo = {
      service: this.serviceName,
      context,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    console.error(`[${this.serviceName}] ${context}:`, errorInfo);
  }

  /**
   * Log retry attempts
   */
  private logRetry(attempt: number, delay: number): void {
    console.log(
      `[${this.serviceName}] Retrying operation (attempt ${attempt}) after ${Math.round(delay)}ms`
    );
  }

  /**
   * Log fallback attempts
   */
  private logFallbackAttempt(provider: string, error: any): void {
    if (error) {
      console.warn(`[${this.serviceName}] ${provider} provider failed:`, error);
    } else {
      console.log(
        `[${this.serviceName}] Attempting operation with ${provider} provider`
      );
    }
  }
}
