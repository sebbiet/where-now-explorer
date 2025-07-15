import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestBatcherService } from '../requestBatcher.service';

describe('RequestBatcherService', () => {
  let batcher: RequestBatcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Create new instance for each test to ensure clean state
    batcher = new RequestBatcherService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Clean up any pending batches
    batcher.clearPendingBatches();
  });

  describe('single request processing', () => {
    it('should process a single request after batch window', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['result1']);
      const requestPromise = batcher.batch('test', 'request1', mockProcessor);

      // Act - Advance time to trigger batch processing
      vi.advanceTimersByTime(100);
      const result = await requestPromise;

      // Assert
      expect(result).toBe('result1');
      expect(mockProcessor).toHaveBeenCalledWith(['request1']);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });

    it('should handle single request with custom config', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['custom-result']);
      const requestPromise = batcher.batch('custom-type', 'request', mockProcessor);

      // Act - Default config uses 100ms window
      vi.advanceTimersByTime(100);
      const result = await requestPromise;

      // Assert
      expect(result).toBe('custom-result');
    });
  });

  describe('request queuing', () => {
    it('should queue multiple requests', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['res1', 'res2', 'res3']);
      
      // Act - Add multiple requests
      const promise1 = batcher.batch('geocode', 'req1', mockProcessor);
      const promise2 = batcher.batch('geocode', 'req2', mockProcessor);
      const promise3 = batcher.batch('geocode', 'req3', mockProcessor);

      // Trigger batch processing
      vi.advanceTimersByTime(100);

      const results = await Promise.all([promise1, promise2, promise3]);

      // Assert
      expect(results).toEqual(['res1', 'res2', 'res3']);
      expect(mockProcessor).toHaveBeenCalledWith(['req1', 'req2', 'req3']);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });

    it('should maintain separate queues for different types', async () => {
      // Arrange
      const geocodeProcessor = vi.fn().mockResolvedValue(['geo1', 'geo2']);
      const reverseProcessor = vi.fn().mockResolvedValue(['rev1', 'rev2']);

      // Act
      const geoPromise1 = batcher.batch('geocode', 'geo-req1', geocodeProcessor);
      const geoPromise2 = batcher.batch('geocode', 'geo-req2', geocodeProcessor);
      const revPromise1 = batcher.batch('reverse-geocode', 'rev-req1', reverseProcessor);
      const revPromise2 = batcher.batch('reverse-geocode', 'rev-req2', reverseProcessor);

      // Advance time to process both batches
      vi.advanceTimersByTime(200);

      const results = await Promise.all([geoPromise1, geoPromise2, revPromise1, revPromise2]);

      // Assert
      expect(results).toEqual(['geo1', 'geo2', 'rev1', 'rev2']);
      expect(geocodeProcessor).toHaveBeenCalledWith(['geo-req1', 'geo-req2']);
      expect(reverseProcessor).toHaveBeenCalledWith(['rev-req1', 'rev-req2']);
    });
  });

  describe('batch processing with size limit', () => {
    it('should process immediately when batch size is reached', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockImplementation((requests) => 
        Promise.resolve(requests.map((r: string) => `result-${r}`))
      );

      // Act - Add 10 requests (geocode batch size limit)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(batcher.batch('geocode', `req${i}`, mockProcessor));
      }

      // Should process immediately without waiting for timer
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(results[0]).toBe('result-req0');
      expect(results[9]).toBe('result-req9');
      expect(mockProcessor).toHaveBeenCalledTimes(1);
      expect(mockProcessor).toHaveBeenCalledWith(
        expect.arrayContaining(['req0', 'req1', 'req2', 'req3', 'req4', 'req5', 'req6', 'req7', 'req8', 'req9'])
      );
    });

    it('should handle multiple full batches', async () => {
      // Arrange
      const mockProcessor = vi.fn()
        .mockResolvedValueOnce(Array(10).fill('batch1'))
        .mockResolvedValueOnce(Array(5).fill('batch2'));

      // Act - Add 15 requests (1.5 batches)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(batcher.batch('geocode', `req${i}`, mockProcessor));
      }

      // First 10 should process immediately
      // Wait for second batch timer
      vi.advanceTimersByTime(100);

      const results = await Promise.all(promises);

      // Assert
      expect(mockProcessor).toHaveBeenCalledTimes(2);
      expect(results.slice(0, 10).every(r => r === 'batch1')).toBe(true);
      expect(results.slice(10).every(r => r === 'batch2')).toBe(true);
    });
  });

  describe('batch processing with timeout', () => {
    it('should process batch after window timeout', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['result']);
      const promise = batcher.batch('geocode', 'request', mockProcessor);

      // Act
      expect(mockProcessor).not.toHaveBeenCalled();
      
      // Advance time by batch window (100ms for geocode)
      vi.advanceTimersByTime(100);
      
      const result = await promise;

      // Assert
      expect(result).toBe('result');
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });

    it('should reset timer when new requests arrive', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['res1', 'res2']);

      // Act
      const promise1 = batcher.batch('geocode', 'req1', mockProcessor);
      
      // Advance time partially
      vi.advanceTimersByTime(50);
      
      // Add another request - should reset timer
      const promise2 = batcher.batch('geocode', 'req2', mockProcessor);
      
      // Advance 50ms more (total 100ms from start, but only 50ms from second request)
      vi.advanceTimersByTime(50);
      
      // Should not have processed yet
      expect(mockProcessor).not.toHaveBeenCalled();
      
      // Advance remaining time
      vi.advanceTimersByTime(50);
      
      await Promise.all([promise1, promise2]);

      // Assert
      expect(mockProcessor).toHaveBeenCalledWith(['req1', 'req2']);
    });
  });

  describe('error handling in batch', () => {
    it('should reject all requests when batch processing fails', async () => {
      // Arrange
      const mockError = new Error('Batch processing failed');
      const mockProcessor = vi.fn().mockRejectedValue(mockError);

      // Act
      const promise1 = batcher.batch('test', 'req1', mockProcessor);
      const promise2 = batcher.batch('test', 'req2', mockProcessor);
      const promise3 = batcher.batch('test', 'req3', mockProcessor);

      vi.advanceTimersByTime(100);

      // Assert
      await expect(promise1).rejects.toThrow('Batch processing failed');
      await expect(promise2).rejects.toThrow('Batch processing failed');
      await expect(promise3).rejects.toThrow('Batch processing failed');
    });

    it('should handle processor returning insufficient results', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['result1']); // Only 1 result for 3 requests

      // Act
      const promise1 = batcher.batch('test', 'req1', mockProcessor);
      const promise2 = batcher.batch('test', 'req2', mockProcessor);
      const promise3 = batcher.batch('test', 'req3', mockProcessor);

      vi.advanceTimersByTime(100);

      // Assert
      const result1 = await promise1;
      expect(result1).toBe('result1');
      
      await expect(promise2).rejects.toThrow('Batch processing returned insufficient results');
      await expect(promise3).rejects.toThrow('Batch processing returned insufficient results');
    });
  });

  describe('partial batch success', () => {
    it('should handle mixed success/failure results', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockImplementation((requests) => {
        // Return results for some requests, not others
        return Promise.resolve(requests.slice(0, Math.floor(requests.length / 2)));
      });

      // Act
      const promises = [];
      for (let i = 0; i < 4; i++) {
        promises.push(batcher.batch('test', `req${i}`, mockProcessor));
      }

      vi.advanceTimersByTime(100);

      // Assert - First half should succeed, second half should fail
      await expect(promises[0]).resolves.toBe('req0');
      await expect(promises[1]).resolves.toBe('req1');
      await expect(promises[2]).rejects.toThrow('Batch processing returned insufficient results');
      await expect(promises[3]).rejects.toThrow('Batch processing returned insufficient results');
    });
  });

  describe('request deduplication in batch', () => {
    it('should handle duplicate requests in the same batch', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockImplementation((requests) => 
        Promise.resolve(requests.map((r: string) => `processed-${r}`))
      );

      // Act - Add duplicate requests
      const promise1 = batcher.batch('test', 'same-request', mockProcessor);
      const promise2 = batcher.batch('test', 'same-request', mockProcessor);
      const promise3 = batcher.batch('test', 'different-request', mockProcessor);

      vi.advanceTimersByTime(100);

      const results = await Promise.all([promise1, promise2, promise3]);

      // Assert - Processor should receive all requests, including duplicates
      expect(mockProcessor).toHaveBeenCalledWith(['same-request', 'same-request', 'different-request']);
      expect(results).toEqual(['processed-same-request', 'processed-same-request', 'processed-different-request']);
    });
  });

  describe('clearPendingBatches', () => {
    it('should cancel all pending requests', async () => {
      // Arrange
      const mockProcessor = vi.fn().mockResolvedValue(['result']);
      
      const promise1 = batcher.batch('geocode', 'req1', mockProcessor);
      const promise2 = batcher.batch('reverse-geocode', 'req2', mockProcessor);
      const promise3 = batcher.batch('custom', 'req3', mockProcessor);

      // Act - Clear before processing
      batcher.clearPendingBatches();

      // Assert - Handle rejections properly
      const results = await Promise.allSettled([promise1, promise2, promise3]);
      
      results.forEach(result => {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason.message).toBe('Batch processing cancelled');
        }
      });
      
      expect(mockProcessor).not.toHaveBeenCalled();
    });

    it('should clear all timers', () => {
      // Arrange
      const mockProcessor = vi.fn();
      
      // Add requests to create timers
      batcher.batch('type1', 'req1', mockProcessor);
      batcher.batch('type2', 'req2', mockProcessor);
      
      // Act
      batcher.clearPendingBatches();
      
      // Advance time - nothing should process
      vi.advanceTimersByTime(1000);

      // Assert
      expect(mockProcessor).not.toHaveBeenCalled();
    });
  });

  describe('batchGeocode', () => {
    it('should batch geocode requests', async () => {
      // Arrange
      const queries = ['New York', 'Los Angeles', 'Chicago', 'New York']; // Including duplicate

      // Act
      const results = await batcher.batchGeocode(queries);

      // Assert
      expect(results).toHaveLength(4);
      expect(results.every(r => Array.isArray(r))).toBe(true);
    });

    it('should handle empty queries', async () => {
      // Act
      const results = await batcher.batchGeocode([]);

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive batches', async () => {
      // Arrange
      const mockProcessor = vi.fn()
        .mockResolvedValueOnce(['batch1-res1', 'batch1-res2'])
        .mockResolvedValueOnce(['batch2-res1', 'batch2-res2']);

      // Act - First batch
      const batch1Promise1 = batcher.batch('test', 'b1-r1', mockProcessor);
      const batch1Promise2 = batcher.batch('test', 'b1-r2', mockProcessor);
      
      vi.advanceTimersByTime(100);
      
      // Second batch immediately after
      const batch2Promise1 = batcher.batch('test', 'b2-r1', mockProcessor);
      const batch2Promise2 = batcher.batch('test', 'b2-r2', mockProcessor);
      
      vi.advanceTimersByTime(100);

      const allResults = await Promise.all([
        batch1Promise1, batch1Promise2, batch2Promise1, batch2Promise2
      ]);

      // Assert
      expect(allResults).toEqual(['batch1-res1', 'batch1-res2', 'batch2-res1', 'batch2-res2']);
      expect(mockProcessor).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent batch types', async () => {
      // Arrange
      const typeAProcessor = vi.fn().mockResolvedValue(['a1', 'a2']);
      const typeBProcessor = vi.fn().mockResolvedValue(['b1', 'b2']);
      const typeCProcessor = vi.fn().mockResolvedValue(['c1']);

      // Act - Add requests for different types
      const promises = [
        batcher.batch('typeA', 'reqA1', typeAProcessor),
        batcher.batch('typeB', 'reqB1', typeBProcessor),
        batcher.batch('typeA', 'reqA2', typeAProcessor),
        batcher.batch('typeC', 'reqC1', typeCProcessor),
        batcher.batch('typeB', 'reqB2', typeBProcessor),
      ];

      // Process all batches
      vi.advanceTimersByTime(100);

      const results = await Promise.all(promises);

      // Assert
      expect(results).toEqual(['a1', 'b1', 'a2', 'c1', 'b2']);
      expect(typeAProcessor).toHaveBeenCalledWith(['reqA1', 'reqA2']);
      expect(typeBProcessor).toHaveBeenCalledWith(['reqB1', 'reqB2']);
      expect(typeCProcessor).toHaveBeenCalledWith(['reqC1']);
    });
  });
});