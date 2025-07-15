import { HttpClient, FetchHttpClient } from './http-client';
import {
  Monitor,
  NoOpMonitor,
  ConsoleMonitor,
  ProductionMonitor,
} from './monitor';
import {
  RetryStrategy,
  ExponentialBackoffRetryStrategy,
  NoRetryStrategy,
} from './retry-strategy';
import { Cache, MemoryCache, LocalStorageCache } from './cache';
import { analytics } from '@/services/analytics.service';

export interface ServiceDependencies {
  httpClient: HttpClient;
  monitor: Monitor;
  retryStrategy: RetryStrategy;
  cache: Cache;
}

/**
 * Service container for dependency injection
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private dependencies: ServiceDependencies;

  private constructor() {
    // Initialize with default implementations
    this.dependencies = {
      httpClient: new FetchHttpClient(),
      monitor: this.createMonitor(),
      retryStrategy: new ExponentialBackoffRetryStrategy(),
      cache: this.createCache(),
    };
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  getDependencies(): ServiceDependencies {
    return this.dependencies;
  }

  setHttpClient(httpClient: HttpClient): void {
    this.dependencies.httpClient = httpClient;
  }

  setMonitor(monitor: Monitor): void {
    this.dependencies.monitor = monitor;
  }

  setRetryStrategy(retryStrategy: RetryStrategy): void {
    this.dependencies.retryStrategy = retryStrategy;
  }

  setCache(cache: Cache): void {
    this.dependencies.cache = cache;
  }

  private createMonitor(): Monitor {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
      return new NoOpMonitor();
    }

    if (isDevelopment) {
      return new ConsoleMonitor();
    }

    return new ProductionMonitor(analytics);
  }

  private createCache(): Cache {
    // Use localStorage cache for browsers, memory cache for Node/tests
    if (typeof window !== 'undefined' && window.localStorage) {
      return new LocalStorageCache('wne_');
    }
    return new MemoryCache();
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();
