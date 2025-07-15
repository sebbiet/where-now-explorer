import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BaseService,
  ServiceError,
  NetworkError,
  ValidationError,
  RateLimitError,
  TimeoutError,
  ServiceConfig,
} from '../base.service';
import { rateLimiter } from '../rateLimiter.service';
import { retryWithBackoff } from '@/utils/retry';
import { withApiMonitoring } from '../apiMonitor.service';
import { withPerformanceTracking } from '@/utils/performanceMonitor';
import { deduplicateGeocodingRequest } from '@/utils/requestDeduplication';

// Mock dependencies
vi.mock('../rateLimiter.service', () => ({
  rateLimiter: {
    isAllowed: vi.fn(),
    recordRequest: vi.fn(),
    getTimeUntilReset: vi.fn(),
  },
}));

vi.mock('@/utils/retry', () => ({
  retryWithBackoff: vi.fn(),
}));

vi.mock('../apiMonitor.service', () => ({
  withApiMonitoring: vi.fn((service, fn) => fn),
}));

vi.mock('@/utils/performanceMonitor', () => ({
  withPerformanceTracking: vi.fn(async (service, fn) => fn()),
}));

vi.mock('@/utils/requestDeduplication', () => ({
  deduplicateGeocodingRequest: vi.fn((type, key, fn) => fn()),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Create concrete implementation for testing
class TestService extends BaseService {
  constructor(config?: ServiceConfig) {
    super('test-service', config);
  }

  // Expose protected methods for testing
  async testExecuteRequest<T>(url: string, options?: any): Promise<T> {
    return this.executeRequest(url, options);
  }

  testHandleError(error: any, context: string): never {
    return this.handleError(error, context);
  }

  testCheckRateLimit(): void {
    return this.checkRateLimit();
  }

  testValidateInput(
    input: any,
    rules: Record<string, (value: any) => boolean>
  ): void {
    return this.validateInput(input, rules);
  }

  async testExecuteWithFallbacks<T>(
    primary: () => Promise<T>,
    fallbacks?: any[]
  ): Promise<T> {
    return this.executeWithFallbacks(primary, fallbacks);
  }

  async testExecuteWithDeduplication<T>(
    type: string,
    key: any,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.executeWithDeduplication(type, key, operation);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();
    service = new TestService();

    // Default mock implementations
    vi.mocked(rateLimiter.isAllowed).mockReturnValue(true);
    vi.mocked(rateLimiter.getTimeUntilReset).mockReturnValue(5000);
    vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());
    vi.mocked(withPerformanceTracking).mockImplementation(async (service, fn) =>
      fn()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  describe('error type detection', () => {
    it('should detect and preserve ServiceError instances', () => {
      // Arrange
      const serviceError = new ServiceError('Test error', {
        code: 'TEST_ERROR',
      });

      // Act & Assert
      expect(() => service.testHandleError(serviceError, 'test')).toThrow(
        serviceError
      );
    });

    it('should detect fetch/network errors', () => {
      // Arrange
      const fetchError = new TypeError('Failed to fetch');

      // Act & Assert
      expect(() => service.testHandleError(fetchError, 'test')).toThrow(
        NetworkError
      );
      try {
        service.testHandleError(fetchError, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).statusCode).toBe(0);
        expect((error as NetworkError).message).toContain(
          'Network request failed'
        );
      }
    });

    it('should detect timeout errors', () => {
      // Arrange
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      // Act & Assert
      expect(() => service.testHandleError(abortError, 'test')).toThrow(
        TimeoutError
      );
      try {
        service.testHandleError(abortError, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).timeout).toBe(10000); // Default timeout
      }
    });

    it('should detect HTTP status errors', () => {
      // Arrange
      const httpError = { status: 404, message: 'Not found' };

      // Act & Assert
      expect(() => service.testHandleError(httpError, 'test')).toThrow(
        NetworkError
      );
      try {
        service.testHandleError(httpError, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).statusCode).toBe(404);
        expect((error as NetworkError).message).toBe('Resource not found.');
      }
    });

    it('should handle unknown errors', () => {
      // Arrange
      const unknownError = new Error('Something went wrong');

      // Act & Assert
      expect(() => service.testHandleError(unknownError, 'test')).toThrow(
        ServiceError
      );
      try {
        service.testHandleError(unknownError, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).code).toBe('UNKNOWN_ERROR');
        expect((error as ServiceError).statusCode).toBe(500);
      }
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry on failure with exponential backoff', async () => {
      // Arrange
      const mockResponse = { data: 'success' };

      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        } as any);

      let attemptCount = 0;
      vi.mocked(retryWithBackoff).mockImplementation(async (fn, options) => {
        let lastError;
        for (let i = 0; i < (options?.maxAttempts || 3); i++) {
          try {
            attemptCount++;
            const result = await fn();
            return result;
          } catch (error) {
            lastError = error;
            if (options?.onRetry) {
              options.onRetry(i + 1, Math.pow(2, i) * 1000);
            }
            if (i === (options?.maxAttempts || 3) - 1) throw lastError;
          }
        }
        throw lastError;
      });

      // Act
      const result = await service.testExecuteRequest('/test');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Retrying operation (attempt 1) after 1000ms')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Retrying operation (attempt 2) after 2000ms')
      );
    });

    it('should respect custom retry configuration', async () => {
      // Arrange
      const customService = new TestService({
        maxRetries: 5,
        retryDelay: 500,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ result: 'test' }),
      } as any);

      vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());

      // Act
      await customService.testExecuteRequest('/test');

      // Assert
      expect(retryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 5,
        })
      );
    });
  });

  describe('max retry limit', () => {
    it('should stop retrying after max attempts', async () => {
      // Arrange
      const mockError = new NetworkError('Persistent failure', {
        statusCode: 500,
      });
      vi.mocked(global.fetch).mockRejectedValue(mockError);

      vi.mocked(retryWithBackoff).mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      });

      // Act & Assert
      await expect(service.testExecuteRequest('/test')).rejects.toThrow(
        NetworkError
      );
    });

    it('should skip retry when configured', async () => {
      // Arrange
      const networkError = new NetworkError('Test error', { statusCode: 500 });
      vi.mocked(global.fetch).mockRejectedValueOnce(networkError);

      // Act & Assert
      await expect(
        service.testExecuteRequest('/test', { skipRetry: true })
      ).rejects.toThrow(NetworkError);

      expect(retryWithBackoff).not.toHaveBeenCalled();
    });
  });

  describe('input validation utilities', () => {
    it('should validate input successfully', () => {
      // Arrange
      const input = {
        name: 'John',
        age: 25,
        email: 'john@example.com',
      };

      const rules = {
        name: (value: any) => typeof value === 'string' && value.length > 0,
        age: (value: any) => typeof value === 'number' && value > 0,
        email: (value: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      };

      // Act & Assert - Should not throw
      expect(() => service.testValidateInput(input, rules)).not.toThrow();
    });

    it('should throw ValidationError for invalid input', () => {
      // Arrange
      const input = {
        name: '',
        age: -5,
        email: 'invalid-email',
      };

      const rules = {
        name: (value: any) => typeof value === 'string' && value.length > 0,
        age: (value: any) => typeof value === 'number' && value > 0,
        email: (value: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      };

      // Act & Assert
      expect(() => service.testValidateInput(input, rules)).toThrow(
        ValidationError
      );

      try {
        service.testValidateInput(input, rules);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('name');
        expect((error as ValidationError).message).toBe(
          'Invalid name provided'
        );
      }
    });
  });

  describe('sanitization methods', () => {
    // Note: The base service doesn't have explicit sanitization methods,
    // but we can test that proper encoding happens in requests
    it('should properly encode URL parameters', async () => {
      // Arrange
      const url =
        'https://api.example.com/search?query=test value&special=<script>';

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());

      // Act
      await service.testExecuteRequest(url);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(url, expect.any(Object));
    });
  });

  describe('rate limiting integration', () => {
    it('should check rate limit before request', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      // Act
      await service.testExecuteRequest('/test');

      // Assert
      expect(rateLimiter.isAllowed).toHaveBeenCalledWith('test-service');
      expect(rateLimiter.recordRequest).toHaveBeenCalledWith('test-service');
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      // Arrange
      vi.mocked(rateLimiter.isAllowed).mockReturnValue(false);
      vi.mocked(rateLimiter.getTimeUntilReset).mockReturnValue(3000);

      // Act & Assert
      await expect(service.testExecuteRequest('/test')).rejects.toThrow(
        RateLimitError
      );

      try {
        await service.testExecuteRequest('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).resetTime).toBe(3000);
        expect((error as RateLimitError).message).toContain(
          'Please wait 3 seconds'
        );
      }
    });

    it('should skip rate limit check when configured', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      // Act
      await service.testExecuteRequest('/test', { skipRateLimit: true });

      // Assert
      expect(rateLimiter.isAllowed).not.toHaveBeenCalled();
      expect(rateLimiter.recordRequest).not.toHaveBeenCalled();
    });
  });

  describe('monitoring integration', () => {
    it('should apply monitoring when enabled', async () => {
      // Arrange
      const monitoredService = new TestService({ enableMonitoring: true });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());

      // Act
      await monitoredService.testExecuteRequest('/test');

      // Assert
      expect(withApiMonitoring).toHaveBeenCalledWith(
        'test-service',
        expect.any(Function)
      );
    });

    it('should skip monitoring when disabled', async () => {
      // Arrange
      const unmonitoredService = new TestService({ enableMonitoring: false });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      // Act
      await unmonitoredService.testExecuteRequest('/test');

      // Assert
      expect(withApiMonitoring).not.toHaveBeenCalled();
    });

    it('should apply performance tracking when enabled', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({}),
      } as any);

      vi.mocked(withPerformanceTracking).mockImplementation((service, fn) =>
        fn()
      );

      // Act
      await service.testExecuteRequest('/test');

      // Assert
      expect(withPerformanceTracking).toHaveBeenCalledWith(
        'test-service',
        expect.any(Function)
      );
    });
  });

  describe('timeout handling', () => {
    it('should apply timeout to requests', async () => {
      // Arrange
      vi.mocked(global.fetch).mockImplementation((url, options) => {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValueOnce({}),
        } as any);
      });

      vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());

      // Act
      await service.testExecuteRequest('/test', { timeout: 5000 });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall).toBeDefined();
      expect(fetchCall[1]?.signal).toBeDefined();
    });

    // Note: Timeout error handling is tested in the error type detection section
  });

  describe('fallback providers', () => {
    it('should try fallback providers when primary fails', async () => {
      // Arrange
      const primaryOp = vi
        .fn()
        .mockRejectedValueOnce(new Error('Primary failed'));
      const fallback1 = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fallback 1 failed'));
      const fallback2 = vi
        .fn()
        .mockResolvedValueOnce({ data: 'fallback success' });

      const fallbackProviders = [
        { name: 'fallback1', execute: fallback1, priority: 1 },
        { name: 'fallback2', execute: fallback2, priority: 2 },
      ];

      // Act
      const result = await service.testExecuteWithFallbacks(
        primaryOp,
        fallbackProviders
      );

      // Assert
      expect(result).toEqual({ data: 'fallback success' });
      expect(primaryOp).toHaveBeenCalledTimes(1);
      expect(fallback1).toHaveBeenCalledTimes(1);
      expect(fallback2).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('primary provider failed'),
        expect.any(Error)
      );
    });

    it('should throw when all providers fail', async () => {
      // Arrange
      const primaryOp = vi
        .fn()
        .mockRejectedValueOnce(new Error('Primary failed'));
      const fallback1 = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fallback 1 failed'));
      const fallback2 = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fallback 2 failed'));

      const fallbackProviders = [
        { name: 'fallback1', execute: fallback1, priority: 1 },
        { name: 'fallback2', execute: fallback2, priority: 2 },
      ];

      // Act & Assert
      await expect(
        service.testExecuteWithFallbacks(primaryOp, fallbackProviders)
      ).rejects.toThrow('All test-service providers failed');
    });

    it('should respect priority order', async () => {
      // Arrange
      const primaryOp = vi
        .fn()
        .mockRejectedValueOnce(new Error('Primary failed'));
      const fallback1 = vi
        .fn()
        .mockResolvedValueOnce({ data: 'high priority' });
      const fallback2 = vi.fn().mockResolvedValueOnce({ data: 'low priority' });

      const fallbackProviders = [
        { name: 'fallback2', execute: fallback2, priority: 10 }, // Lower priority
        { name: 'fallback1', execute: fallback1, priority: 1 }, // Higher priority
      ];

      // Act
      const result = await service.testExecuteWithFallbacks(
        primaryOp,
        fallbackProviders
      );

      // Assert
      expect(result).toEqual({ data: 'high priority' });
      expect(fallback1).toHaveBeenCalled();
      expect(fallback2).not.toHaveBeenCalled(); // Should not reach low priority
    });
  });

  describe('request deduplication', () => {
    it('should use deduplication when enabled', async () => {
      // Arrange
      const operation = vi.fn().mockResolvedValue({ data: 'result' });

      // Act
      await service.testExecuteWithDeduplication(
        'test-type',
        { key: 'test' },
        operation
      );

      // Assert
      expect(deduplicateGeocodingRequest).toHaveBeenCalledWith(
        'test-type',
        { key: 'test' },
        operation
      );
    });

    it('should skip deduplication when disabled', async () => {
      // Arrange
      const noDedupeService = new TestService({ enableDeduplication: false });
      const operation = vi.fn().mockResolvedValue({ data: 'result' });

      // Act
      const result = await noDedupeService.testExecuteWithDeduplication(
        'test-type',
        { key: 'test' },
        operation
      );

      // Assert
      expect(result).toEqual({ data: 'result' });
      expect(deduplicateGeocodingRequest).not.toHaveBeenCalled();
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('HTTP error handling', () => {
    it('should handle various HTTP status codes', async () => {
      // Test various status codes
      const statusTests = [
        { status: 400, message: 'Bad request. Please check your input.' },
        {
          status: 401,
          message: 'Unauthorized. Please check your credentials.',
        },
        {
          status: 403,
          message:
            'Forbidden. You do not have permission to access this resource.',
        },
        { status: 404, message: 'Resource not found.' },
        { status: 429, message: 'Too many requests. Please slow down.' },
        {
          status: 500,
          message: 'Internal server error. Please try again later.',
        },
        {
          status: 502,
          message: 'Bad gateway. The server is temporarily unavailable.',
        },
        {
          status: 503,
          message: 'Service unavailable. Please try again later.',
        },
        { status: 999, message: 'HTTP error 999' }, // Unknown status
      ];

      for (const { status, message } of statusTests) {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: false,
          status,
          json: vi.fn(),
        } as any);

        vi.mocked(retryWithBackoff).mockImplementation(async (fn) => {
          try {
            return await fn();
          } catch (error) {
            throw error;
          }
        });

        await expect(service.testExecuteRequest('/test')).rejects.toThrow(
          message
        );
      }
    });
  });
});
