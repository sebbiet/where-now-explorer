/**
 * Production Analytics Service
 * Enhanced analytics for production monitoring and insights
 */

import { logger } from '@/utils/logger';

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface UserSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  actions: number;
  errors: number;
  device: string;
  browser: string;
  location?: {
    country?: string;
    region?: string;
  };
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTimes: Record<string, number[]>;
  errorRate: number;
  bounceRate: number;
  sessionDuration: number;
}

class ProductionAnalyticsService {
  private isProduction = import.meta.env.PROD;
  private sessionId: string;
  private session: UserSession;
  private metrics: PerformanceMetrics;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.session = this.initializeSession();
    this.metrics = this.initializeMetrics();
    
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.startPerformanceMonitoring();
      this.startSessionTracking();
    }
  }

  /**
   * Track custom events
   */
  trackEvent(name: string, properties: Record<string, unknown> = {}): void {
    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.eventQueue.push(event);
    this.session.actions++;
    this.session.lastActivity = Date.now();

    logger.debug('Analytics event tracked', { 
      event: name, 
      properties,
      service: 'ProductionAnalytics' 
    });

    // Flush immediately for critical events
    if (this.isCriticalEvent(name)) {
      this.flushEvents();
    }
  }

  /**
   * Track page views
   */
  trackPageView(path: string, title?: string): void {
    this.trackEvent('page_view', {
      path,
      title: title || document.title,
      referrer: document.referrer,
      timestamp: Date.now()
    });

    this.session.pageViews++;
    this.updateMetrics();
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(element: string, action: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent('user_interaction', {
      element,
      action,
      ...properties
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, properties: Record<string, unknown> = {}): void {
    this.trackEvent('performance_metric', {
      metric,
      value,
      ...properties
    });

    // Update internal metrics
    if (metric === 'api_response_time') {
      const endpoint = properties.endpoint as string;
      if (!this.metrics.apiResponseTimes[endpoint]) {
        this.metrics.apiResponseTimes[endpoint] = [];
      }
      this.metrics.apiResponseTimes[endpoint].push(value);
    }
  }

  /**
   * Track errors with context
   */
  trackError(error: Error, context: Record<string, unknown> = {}): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });

    this.session.errors++;
    this.metrics.errorRate = this.session.errors / this.session.actions;
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent('feature_used', {
      feature,
      ...properties
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(goal: string, value?: number, properties: Record<string, unknown> = {}): void {
    this.trackEvent('conversion', {
      goal,
      value,
      ...properties
    });
  }

  /**
   * Get current session data
   */
  getSession(): UserSession {
    return { ...this.session };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Initialize session data
   */
  private initializeSession(): UserSession {
    return {
      sessionId: this.sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      actions: 0,
      errors: 0,
      device: this.getDeviceType(),
      browser: this.getBrowserInfo(),
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      renderTime: 0,
      apiResponseTimes: {},
      errorRate: 0,
      bounceRate: 0,
      sessionDuration: 0
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        this.trackUserInteraction('button', 'click', {
          text: button?.textContent?.trim(),
          id: button?.id,
          className: button?.className
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackUserInteraction('form', 'submit', {
        id: form.id,
        action: form.action,
        method: form.method
      });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden');
      } else {
        this.trackEvent('page_visible');
        this.session.lastActivity = Date.now();
      }
    });

    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        duration: Date.now() - this.session.startTime,
        pageViews: this.session.pageViews,
        actions: this.session.actions,
        errors: this.session.errors
      });
      this.flushEvents();
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // This would integrate with web-vitals library if available
    }

    // Track initial page load
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.metrics.loadTime = loadTime;
      this.trackPerformance('page_load_time', loadTime);
    });

    // Monitor navigation performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformance('navigation_timing', navEntry.loadEventEnd - navEntry.navigationStart, {
              type: 'navigation',
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
              firstPaint: navEntry.loadEventStart - navEntry.navigationStart
            });
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  /**
   * Start session tracking
   */
  private startSessionTracking(): void {
    // Update session duration every minute
    setInterval(() => {
      this.metrics.sessionDuration = Date.now() - this.session.startTime;
      
      // Auto-flush events every 5 minutes
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, 60000);

    // Track session heartbeat every 30 seconds
    setInterval(() => {
      if (Date.now() - this.session.lastActivity < 60000) { // Active in last minute
        this.trackEvent('session_heartbeat', {
          duration: Date.now() - this.session.startTime,
          isActive: !document.hidden
        });
      }
    }, 30000);
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = ['error', 'conversion', 'session_end', 'payment'];
    return criticalEvents.includes(eventName);
  }

  /**
   * Flush events to analytics endpoint
   */
  private flushEvents(): void {
    if (this.eventQueue.length === 0 || !this.isProduction) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // In production, send to analytics endpoint
    if (this.isProduction) {
      this.sendToAnalytics(events);
    } else {
      logger.debug('Analytics events (dev mode)', { events, service: 'ProductionAnalytics' });
    }
  }

  /**
   * Send events to analytics service
   */
  private async sendToAnalytics(events: AnalyticsEvent[]): Promise<void> {
    try {
      // Send to Google Analytics 4 if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        const gtag = (window as any).gtag;
        events.forEach(event => {
          gtag('event', event.name, event.properties);
        });
      }

      // Send to custom analytics endpoint if configured
      const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
      if (analyticsEndpoint) {
        await fetch(analyticsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events,
            session: this.session,
            metrics: this.metrics
          })
        });
      }
    } catch (error) {
      logger.error('Failed to send analytics events', error as Error, {
        service: 'ProductionAnalytics',
        eventCount: events.length
      });
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    this.metrics.sessionDuration = Date.now() - this.session.startTime;
    
    // Calculate bounce rate (single page view sessions)
    if (this.session.pageViews === 1 && this.session.actions <= 1) {
      this.metrics.bounceRate = 1;
    } else {
      this.metrics.bounceRate = 0;
    }
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
}

// Create singleton instance
export const productionAnalytics = new ProductionAnalyticsService();

// Initialize page view tracking
if (typeof window !== 'undefined') {
  productionAnalytics.trackPageView(window.location.pathname);
}