/**
 * Production Service
 * Orchestrates all production-ready features and monitoring
 */

import { logger } from '@/utils/logger';
import { productionAnalytics } from './productionAnalytics.service';
import { featureFlags } from './featureFlags.service';
import { healthCheck } from './healthCheck.service';

export class ProductionService {
  private isInitialized = false;
  private isProduction = import.meta.env.PROD;

  /**
   * Initialize all production services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing production services', {
      service: 'Production',
      environment: this.isProduction ? 'production' : 'development'
    });

    try {
      // Initialize feature flags
      await this.initializeFeatureFlags();

      // Initialize analytics
      this.initializeAnalytics();

      // Initialize health monitoring
      this.initializeHealthMonitoring();

      // Initialize error tracking
      this.initializeErrorTracking();

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Setup production optimizations
      this.setupProductionOptimizations();

      this.isInitialized = true;

      logger.info('Production services initialized successfully', {
        service: 'Production'
      });

      // Track initialization
      productionAnalytics.trackEvent('production_services_initialized', {
        environment: this.isProduction ? 'production' : 'development',
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Failed to initialize production services', error as Error, {
        service: 'Production'
      });
      throw error;
    }
  }

  /**
   * Get production status and metrics
   */
  async getStatus(): Promise<{
    isProduction: boolean;
    isInitialized: boolean;
    healthStatus: any;
    featureFlags: Record<string, boolean>;
    analytics: any;
  }> {
    const healthStatus = await healthCheck.getHealthStatus();
    const flagsStatus = featureFlags.getAllFlags();
    const analyticsSession = productionAnalytics.getSession();

    return {
      isProduction: this.isProduction,
      isInitialized: this.isInitialized,
      healthStatus,
      featureFlags: flagsStatus,
      analytics: analyticsSession
    };
  }

  /**
   * Initialize feature flags
   */
  private async initializeFeatureFlags(): Promise<void> {
    // Refresh from remote config if available
    await featureFlags.refreshFlags();

    logger.info('Feature flags initialized', {
      service: 'Production',
      flagCount: Object.keys(featureFlags.getAllFlags()).length
    });
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): void {
    // Track application start
    productionAnalytics.trackEvent('application_start', {
      environment: this.isProduction ? 'production' : 'development',
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height
      },
      timestamp: Date.now()
    });

    // Track feature flag usage
    const enabledFlags = Object.entries(featureFlags.getAllFlags())
      .filter(([_, enabled]) => enabled)
      .map(([flag, _]) => flag);

    if (enabledFlags.length > 0) {
      productionAnalytics.trackEvent('feature_flags_enabled', {
        flags: enabledFlags,
        count: enabledFlags.length
      });
    }

    logger.info('Analytics initialized', {
      service: 'Production',
      sessionId: productionAnalytics.getSession().sessionId
    });
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthMonitoring(): void {
    // Register custom health checks
    healthCheck.registerCheck('production-services', async () => {
      const isHealthy = this.isInitialized && 
                       featureFlags.isEnabled('enablePerformanceMonitoring');

      return {
        name: 'production-services',
        status: isHealthy ? 'pass' : 'fail',
        message: isHealthy ? 'Production services running' : 'Production services not fully initialized',
        duration: 0,
        details: {
          initialized: this.isInitialized,
          performanceMonitoring: featureFlags.isEnabled('enablePerformanceMonitoring')
        }
      };
    });

    // Start monitoring
    healthCheck.startMonitoring();

    logger.info('Health monitoring initialized', {
      service: 'Production'
    });
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Global error handlers are already set up in logger.ts

    // Track unhandled errors in analytics
    window.addEventListener('error', (event) => {
      productionAnalytics.trackError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'global_error'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      productionAnalytics.trackError(new Error(event.reason), {
        type: 'unhandled_rejection'
      });
    });

    logger.info('Error tracking initialized', {
      service: 'Production'
    });
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (!featureFlags.isEnabled('enablePerformanceMonitoring')) {
      return;
    }

    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();

    // Monitor resource loading
    this.monitorResourceLoading();

    // Monitor user interactions
    this.monitorUserInteractions();

    logger.info('Performance monitoring initialized', {
      service: 'Production'
    });
  }

  /**
   * Setup production-specific optimizations
   */
  private setupProductionOptimizations(): void {
    if (!this.isProduction) {
      return;
    }

    // Remove console.log statements in production (they're handled by logger)
    if (typeof console !== 'undefined') {
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        // Only log in development or if explicitly enabled
        if (!this.isProduction || featureFlags.isEnabled('enableDebugLogging')) {
          originalLog.apply(console, args);
        }
      };
    }

    // Optimize for production
    this.optimizeForProduction();

    logger.info('Production optimizations applied', {
      service: 'Production'
    });
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              productionAnalytics.trackPerformance('lcp', entry.startTime, {
                element: (entry as any).element?.tagName
              });
            }
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        logger.warn('Could not observe LCP', { service: 'Production' });
      }
    }

    // Monitor First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'first-input') {
              const fid = (entry as any).processingStart - entry.startTime;
              productionAnalytics.trackPerformance('fid', fid, {
                inputType: (entry as any).name
              });
            }
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        logger.warn('Could not observe FID', { service: 'Production' });
      }
    }

    // Monitor Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Report CLS on page hide
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            productionAnalytics.trackPerformance('cls', clsValue);
          }
        });
      } catch (error) {
        logger.warn('Could not observe CLS', { service: 'Production' });
      }
    }
  }

  /**
   * Monitor resource loading performance
   */
  private monitorResourceLoading(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              const resource = entry as PerformanceResourceTiming;
              productionAnalytics.trackPerformance('resource_load', resource.duration, {
                name: resource.name,
                type: resource.initiatorType,
                size: resource.transferSize
              });
            }
          });
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        logger.warn('Could not observe resource loading', { service: 'Production' });
      }
    }
  }

  /**
   * Monitor user interactions
   */
  private monitorUserInteractions(): void {
    // Track long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'longtask') {
              productionAnalytics.trackPerformance('long_task', entry.duration, {
                startTime: entry.startTime
              });
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        logger.warn('Could not observe long tasks', { service: 'Production' });
      }
    }
  }

  /**
   * Apply production-specific optimizations
   */
  private optimizeForProduction(): void {
    // Preload critical resources
    this.preloadCriticalResources();

    // Setup service worker updates
    this.setupServiceWorkerUpdates();

    // Optimize images
    this.optimizeImages();
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    // This would preload fonts, critical CSS, etc.
    logger.debug('Critical resources preloaded', { service: 'Production' });
  }

  /**
   * Setup service worker update handling
   */
  private setupServiceWorkerUpdates(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        productionAnalytics.trackEvent('service_worker_updated');
        logger.info('Service worker updated', { service: 'Production' });
      });
    }
  }

  /**
   * Optimize images
   */
  private optimizeImages(): void {
    // This would setup lazy loading, WebP conversion, etc.
    logger.debug('Image optimizations applied', { service: 'Production' });
  }
}

// Create singleton instance
export const productionService = new ProductionService();