import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimiter } from '../rateLimiter.service';

describe('RateLimiterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear rate limiter state before each test
    rateLimiter.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('rate limit enforcement per endpoint', () => {
    it('should allow requests within rate limit', () => {
      // Arrange
      const endpoint = 'geocoding';

      // Act & Assert - Should allow up to 60 requests
      for (let i = 0; i < 60; i++) {
        expect(rateLimiter.isAllowed(endpoint)).toBe(true);
        rateLimiter.recordRequest(endpoint);
      }
    });

    it('should block requests exceeding rate limit', () => {
      // Arrange
      const endpoint = 'geocoding';

      // Record 60 requests (the limit)
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Act & Assert - 61st request should be blocked
      expect(rateLimiter.isAllowed(endpoint)).toBe(false);
    });

    it('should enforce different limits for different endpoints', () => {
      // Test geocoding endpoint (60 requests/min)
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest('geocoding');
      }
      expect(rateLimiter.isAllowed('geocoding')).toBe(false);

      // Test routing endpoint (30 requests/min)
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest('routing');
      }
      expect(rateLimiter.isAllowed('routing')).toBe(false);

      // Test geolocation endpoint (20 requests/min)
      for (let i = 0; i < 20; i++) {
        rateLimiter.recordRequest('geolocation');
      }
      expect(rateLimiter.isAllowed('geolocation')).toBe(false);
    });

    it('should use default limit for unknown endpoints', () => {
      // Arrange
      const endpoint = 'unknown-endpoint';

      // Act - Record 100 requests (default limit)
      for (let i = 0; i < 100; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Assert
      expect(rateLimiter.isAllowed(endpoint)).toBe(false);
    });
  });

  describe('sliding window implementation', () => {
    it('should allow new requests after time window passes', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'geocoding';

      // Fill up the rate limit
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest(endpoint);
      }
      expect(rateLimiter.isAllowed(endpoint)).toBe(false);

      // Act - Move time forward by 1 minute
      vi.setSystemTime(now + 60001);

      // Assert - Should allow requests again
      expect(rateLimiter.isAllowed(endpoint)).toBe(true);
    });

    it('should maintain sliding window of requests', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'geocoding';

      // Record 30 requests at the start
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Move forward 30 seconds
      vi.setSystemTime(now + 30000);

      // Record 30 more requests
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Should still be at limit (60 total in the window)
      expect(rateLimiter.isAllowed(endpoint)).toBe(false);

      // Move forward another 31 seconds (total 61 seconds from start)
      vi.setSystemTime(now + 61000);

      // First 30 requests should be outside the window now
      expect(rateLimiter.isAllowed(endpoint)).toBe(true);
    });
  });

  describe('multiple requests within limit', () => {
    it('should handle concurrent requests correctly', () => {
      // Arrange
      const endpoint = 'routing';
      const requests = [];

      // Act - Simulate concurrent requests
      for (let i = 0; i < 25; i++) {
        requests.push({
          allowed: rateLimiter.isAllowed(endpoint),
          index: i
        });
        rateLimiter.recordRequest(endpoint);
      }

      // Assert - All 25 should be allowed (under limit of 30)
      expect(requests.every(r => r.allowed)).toBe(true);
    });

    it('should track requests independently per endpoint', () => {
      // Arrange & Act
      // Record 50 geocoding requests
      for (let i = 0; i < 50; i++) {
        rateLimiter.recordRequest('geocoding');
      }

      // Record 20 routing requests
      for (let i = 0; i < 20; i++) {
        rateLimiter.recordRequest('routing');
      }

      // Assert
      expect(rateLimiter.isAllowed('geocoding')).toBe(true); // Still under 60
      expect(rateLimiter.isAllowed('routing')).toBe(true); // Still under 30
    });
  });

  describe('requests exceeding limit', () => {
    it('should calculate correct time until reset', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'geolocation';

      // Record a request
      rateLimiter.recordRequest(endpoint);

      // Move forward 30 seconds
      vi.setSystemTime(now + 30000);

      // Act
      const resetTime = rateLimiter.getTimeUntilReset(endpoint);

      // Assert - Should be 30 seconds until the first request expires
      expect(resetTime).toBe(30000);
    });

    it('should throw error with correct reset time in withRateLimit', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'geolocation';
      const mockFn = vi.fn().mockResolvedValue('success');
      const limitedFn = rateLimiter.withRateLimit(endpoint, mockFn);

      // Fill up the rate limit
      for (let i = 0; i < 20; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Act & Assert
      await expect(limitedFn()).rejects.toThrow(
        /Rate limit exceeded for geolocation. Try again in \d+ seconds./
      );
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('reset timing calculations', () => {
    it('should return 0 when no requests in window', () => {
      // Act
      const resetTime = rateLimiter.getTimeUntilReset('geocoding');

      // Assert
      expect(resetTime).toBe(0);
    });

    it('should calculate correct reset time for oldest request', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'routing';

      // Record requests at different times
      rateLimiter.recordRequest(endpoint);
      
      vi.setSystemTime(now + 10000); // 10 seconds later
      rateLimiter.recordRequest(endpoint);
      
      vi.setSystemTime(now + 20000); // 20 seconds later
      rateLimiter.recordRequest(endpoint);

      // Act
      const resetTime = rateLimiter.getTimeUntilReset(endpoint);

      // Assert - Should be 40 seconds (60 - 20) until first request expires
      expect(resetTime).toBe(40000);
    });
  });

  describe('concurrent request handling', () => {
    it('should handle rapid concurrent requests', async () => {
      // Arrange
      const endpoint = 'geocoding';
      const mockFn = vi.fn().mockImplementation((index) => 
        Promise.resolve(`result-${index}`)
      );
      const limitedFn = rateLimiter.withRateLimit(endpoint, mockFn);

      // Act - Fire off multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(limitedFn(i));
      }

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(results[0]).toBe('result-0');
      expect(results[9]).toBe('result-9');
      expect(mockFn).toHaveBeenCalledTimes(10);
    });

    it('should maintain thread safety for request counting', () => {
      // Arrange
      const endpoint = 'routing';

      // Act - Simulate "concurrent" checks and records
      const operations = [];
      for (let i = 0; i < 30; i++) {
        operations.push({
          check: rateLimiter.isAllowed(endpoint),
          record: () => rateLimiter.recordRequest(endpoint)
        });
      }

      // Execute all records
      operations.forEach(op => op.record());

      // Assert - Next request should be blocked
      expect(rateLimiter.isAllowed(endpoint)).toBe(false);
    });
  });

  describe('different endpoints with different limits', () => {
    it('should maintain separate counters for each endpoint', () => {
      // Arrange & Act
      const endpoints = ['geocoding', 'routing', 'geolocation', 'custom'];
      const counts = { geocoding: 50, routing: 25, geolocation: 15, custom: 80 };

      // Record different numbers of requests for each endpoint
      Object.entries(counts).forEach(([endpoint, count]) => {
        for (let i = 0; i < count; i++) {
          rateLimiter.recordRequest(endpoint);
        }
      });

      // Assert - Each should still be under their respective limits
      expect(rateLimiter.isAllowed('geocoding')).toBe(true); // 50 < 60
      expect(rateLimiter.isAllowed('routing')).toBe(true); // 25 < 30
      expect(rateLimiter.isAllowed('geolocation')).toBe(true); // 15 < 20
      expect(rateLimiter.isAllowed('custom')).toBe(true); // 80 < 100 (default)
    });

    it('should clean up old logs when checking limits', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Arrange
      const endpoint = 'geocoding';

      // Record old requests
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Move time forward past the window
      vi.setSystemTime(now + 70000); // 70 seconds later

      // Record new requests
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest(endpoint);
      }

      // Act - Check if allowed (this triggers cleanup)
      const allowed = rateLimiter.isAllowed(endpoint);

      // Assert - Should be allowed because old requests were cleaned up
      expect(allowed).toBe(true);
    });
  });

  describe('withRateLimit wrapper', () => {
    it('should execute function when under rate limit', async () => {
      // Arrange
      const endpoint = 'routing';
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
      const limitedFn = rateLimiter.withRateLimit(endpoint, mockFn);

      // Act
      const result = await limitedFn('arg1', 'arg2');

      // Assert
      expect(result).toEqual({ data: 'test' });
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve function signature and types', async () => {
      // Arrange
      const endpoint = 'geocoding';
      const typedFn = async (a: number, b: string): Promise<boolean> => {
        return a > 0 && b.length > 0;
      };
      const limitedFn = rateLimiter.withRateLimit(endpoint, typedFn);

      // Act
      const result = await limitedFn(5, 'test');

      // Assert
      expect(result).toBe(true);
    });

    it('should record request before executing function', async () => {
      // Arrange
      const endpoint = 'geolocation';
      let requestsBeforeExecution = 0;
      
      const mockFn = vi.fn().mockImplementation(() => {
        // Check how many requests are recorded when function executes
        let count = 0;
        for (let i = 0; i < 20; i++) {
          if (!rateLimiter.isAllowed(endpoint)) {
            requestsBeforeExecution = i;
            break;
          }
          rateLimiter.recordRequest(endpoint);
          count++;
        }
        rateLimiter.clear(); // Clean up
        return Promise.resolve(count);
      });

      const limitedFn = rateLimiter.withRateLimit(endpoint, mockFn);

      // Act
      await limitedFn();

      // Assert - The wrapped function recorded one request before execution
      expect(requestsBeforeExecution).toBe(19); // One was already recorded by withRateLimit
    });
  });
});