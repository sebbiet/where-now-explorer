/**
 * Request Batching Service
 * Batches multiple API requests within a time window to reduce API calls
 */

import { GeocodeResult } from './geocoding.service';

interface BatchRequest<T> {
  id: string;
  request: T;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

interface BatchConfig {
  maxBatchSize: number;
  batchWindowMs: number;
  maxWaitMs: number;
}

export class RequestBatcherService {
  private batchQueues = new Map<string, BatchRequest<any>[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private configs = new Map<string, BatchConfig>();

  constructor() {
    // Configure batching for different request types
    this.configs.set('geocode', {
      maxBatchSize: 10,
      batchWindowMs: 100,
      maxWaitMs: 500
    });
    
    this.configs.set('reverse-geocode', {
      maxBatchSize: 20,
      batchWindowMs: 200,
      maxWaitMs: 1000
    });
  }

  /**
   * Add a request to the batch queue
   */
  async batch<T, R>(
    type: string,
    request: T,
    batchProcessor: (requests: T[]) => Promise<R[]>
  ): Promise<R> {
    const config = this.configs.get(type) || {
      maxBatchSize: 5,
      batchWindowMs: 100,
      maxWaitMs: 500
    };

    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest<T> = {
        id: this.generateRequestId(),
        request,
        resolve,
        reject
      };

      // Add to queue
      if (!this.batchQueues.has(type)) {
        this.batchQueues.set(type, []);
      }
      this.batchQueues.get(type)!.push(batchRequest);

      // Check if we should process immediately
      const queue = this.batchQueues.get(type)!;
      if (queue.length >= config.maxBatchSize) {
        this.processBatch(type, batchProcessor);
      } else {
        // Schedule batch processing
        this.scheduleBatch(type, batchProcessor, config);
      }
    });
  }

  /**
   * Process a batch of requests
   */
  private async processBatch<T, R>(
    type: string,
    batchProcessor: (requests: T[]) => Promise<R[]>
  ): Promise<void> {
    // Clear any pending timer
    const timer = this.batchTimers.get(type);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(type);
    }

    // Get and clear the queue
    const queue = this.batchQueues.get(type) || [];
    if (queue.length === 0) return;
    
    this.batchQueues.set(type, []);

    // Extract requests
    const requests = queue.map(item => item.request);

    try {
      // Process batch
      const results = await batchProcessor(requests);

      // Resolve individual promises
      queue.forEach((item, index) => {
        if (index < results.length) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('Batch processing returned insufficient results'));
        }
      });
    } catch (error) {
      // Reject all promises in the batch
      queue.forEach(item => item.reject(error));
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch<T, R>(
    type: string,
    batchProcessor: (requests: T[]) => Promise<R[]>,
    config: BatchConfig
  ): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(type);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(type, batchProcessor);
    }, config.batchWindowMs);

    this.batchTimers.set(type, timer);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Batch geocoding requests
   */
  async batchGeocode(
    queries: string[],
    options?: any
  ): Promise<GeocodeResult[][]> {
    // This would be implemented to make a single API call for multiple queries
    // For now, we'll simulate it - in real implementation, this would use
    // a batch geocoding endpoint if available
    const results: GeocodeResult[][] = [];
    
    // Group similar queries to reduce API calls
    const uniqueQueries = [...new Set(queries)];
    const queryResults = new Map<string, GeocodeResult[]>();

    // In a real implementation, this would make batch API calls
    // For now, we'll need to make individual calls
    for (const query of uniqueQueries) {
      try {
        // This would be replaced with actual batch API call
        const result: GeocodeResult[] = [];
        queryResults.set(query, result);
      } catch (error) {
        queryResults.set(query, []);
      }
    }

    // Map results back to original order
    for (const query of queries) {
      results.push(queryResults.get(query) || []);
    }

    return results;
  }

  /**
   * Clear all pending batches
   */
  clearPendingBatches(): void {
    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();

    // Reject all pending requests
    this.batchQueues.forEach(queue => {
      queue.forEach(item => {
        item.reject(new Error('Batch processing cancelled'));
      });
    });
    this.batchQueues.clear();
  }
}

// Export singleton instance
export const requestBatcher = new RequestBatcherService();