/**
 * Performance Monitoring Utilities
 * Tracks key performance metrics for the application
 */

import { logger } from '@/utils/logger';

// Extended interface for layout shift entries
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// Extended interface for first input delay entries
interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // Custom metrics
  appLoadTime?: number;
  locationTime?: number;
  geocodingTime?: number;
  routingTime?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.trackAppLoad();
  }

  private initializeObservers() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Monitor paint metrics (FCP, LCP)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Monitor LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Monitor FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as FirstInputEntry;
          this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Monitor CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const clsEntry = entry as LayoutShiftEntry;
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
          }
        }
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }

  private trackAppLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.metrics.appLoadTime = loadTime;

      // Log performance metrics after load
      setTimeout(() => this.logMetrics(), 1000);
    });
  }

  // Track API call performance
  public trackAPICall<T>(apiName: string, promise: Promise<T>): Promise<T> {
    const startTime = performance.now();

    return promise.finally(() => {
      const duration = performance.now() - startTime;

      switch (apiName) {
        case 'geocoding':
          this.metrics.geocodingTime = duration;
          break;
        case 'routing':
          this.metrics.routingTime = duration;
          break;
        case 'location':
          this.metrics.locationTime = duration;
          break;
      }

      console.log(`${apiName} API call took ${duration.toFixed(2)}ms`);
    });
  }

  // Get current metrics
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Log metrics to console (development) or send to analytics (production)
  private logMetrics() {
    const metrics = this.getMetrics();

    if (process.env.NODE_ENV === 'development') {
      console.group('🚀 Performance Metrics');
      console.log('First Contentful Paint:', metrics.fcp?.toFixed(2), 'ms');
      console.log('Largest Contentful Paint:', metrics.lcp?.toFixed(2), 'ms');
      console.log('First Input Delay:', metrics.fid?.toFixed(2), 'ms');
      console.log('Cumulative Layout Shift:', metrics.cls?.toFixed(4));
      console.log('App Load Time:', metrics.appLoadTime?.toFixed(2), 'ms');

      if (metrics.locationTime) {
        console.log('Location Time:', metrics.locationTime.toFixed(2), 'ms');
      }
      if (metrics.geocodingTime) {
        console.log('Geocoding Time:', metrics.geocodingTime.toFixed(2), 'ms');
      }
      if (metrics.routingTime) {
        console.log('Routing Time:', metrics.routingTime.toFixed(2), 'ms');
      }
      console.groupEnd();
    }

    // Performance scoring
    this.scorePerformance(metrics);
  }

  private scorePerformance(metrics: PerformanceMetrics) {
    const scores = {
      fcp: this.scoreMetric(metrics.fcp, [1800, 3000]), // Good < 1.8s, Poor > 3s
      lcp: this.scoreMetric(metrics.lcp, [2500, 4000]), // Good < 2.5s, Poor > 4s
      fid: this.scoreMetric(metrics.fid, [100, 300]), // Good < 100ms, Poor > 300ms
      cls: this.scoreMetric(metrics.cls, [0.1, 0.25]), // Good < 0.1, Poor > 0.25
    };

    const averageScore =
      Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.keys(scores).length;

    if (process.env.NODE_ENV === 'development') {
      logger.info(
        `📊 Performance Score: ${(averageScore * 100).toFixed(0)}/100`,
        {
          component: 'PerformanceMonitor',
          score: (averageScore * 100).toFixed(0),
        }
      );

      if (averageScore < 0.5) {
        logger.warn('⚠️ Performance needs improvement', {
          component: 'PerformanceMonitor',
          score: averageScore,
        });
      } else if (averageScore > 0.8) {
        logger.info('✅ Excellent performance!', {
          component: 'PerformanceMonitor',
          score: averageScore,
        });
      }
    }
  }

  private scoreMetric(
    value: number | undefined,
    thresholds: [number, number]
  ): number {
    if (value === undefined) return 0;

    const [good, poor] = thresholds;
    if (value <= good) return 1;
    if (value >= poor) return 0;
    return 1 - (value - good) / (poor - good);
  }

  // Clean up observers
  public destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to wrap API calls with performance tracking
export function withPerformanceTracking<T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return performanceMonitor.trackAPICall(apiName, apiCall());
}
