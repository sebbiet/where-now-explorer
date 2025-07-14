/**
 * Google Analytics Service
 * Centralized service for tracking events in GA4
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Event parameter types for better type safety
export interface LocationPermissionParams {
  timestamp?: number;
  error_type?: string;
  error_message?: string;
}

export interface LocationUpdateParams {
  update_type: 'initial' | 'refresh' | 'automatic';
  has_traditional_land_info?: boolean;
  refresh_type?: 'manual' | 'automatic';
  countdown_remaining?: number;
}

export interface DestinationParams {
  search_length?: number;
  suggestion_index?: number;
  total_suggestions?: number;
  distance_km?: number;
  duration_minutes?: number;
  destination_type?: string;
  error_type?: string;
  destination_query?: string;
}

export interface UIInteractionParams {
  from_tab?: string;
  to_tab?: string;
  interaction_method?: 'click' | 'keyboard';
  new_theme?: 'light' | 'dark';
  system_preference?: 'light' | 'dark';
}

export interface ErrorParams {
  error_type: string;
  error_message?: string;
  error_source?: string;
  retry_count?: number;
}

class AnalyticsService {
  private isInitialized = false;
  private isDevelopment = import.meta.env.DEV;

  constructor() {
    // Check if gtag is available
    if (typeof window !== 'undefined' && window.gtag) {
      this.isInitialized = true;
    }
  }

  /**
   * Track a custom event in GA4
   */
  track(eventName: string, parameters?: Record<string, any>): void {
    // Skip tracking in development unless explicitly enabled
    if (this.isDevelopment && !import.meta.env.VITE_ENABLE_ANALYTICS) {
      console.log('[Analytics Dev]', eventName, parameters);
      return;
    }

    if (!this.isInitialized || typeof window.gtag !== 'function') {
      console.warn('[Analytics] gtag not available');
      return;
    }

    try {
      // Send event to GA4
      window.gtag('event', eventName, {
        ...parameters,
        // Add common parameters
        app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: import.meta.env.MODE,
      });
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }

  // Location Events
  trackLocationPermission(granted: boolean, params?: LocationPermissionParams): void {
    const eventName = granted ? 'location_permission_granted' : 'location_permission_denied';
    this.track(eventName, {
      ...params,
      timestamp: params?.timestamp || Date.now(),
    });
  }

  trackLocationPermissionError(error: GeolocationPositionError): void {
    this.track('location_permission_error', {
      error_type: this.getGeolocationErrorType(error),
      error_message: error.message,
      error_code: error.code,
    });
  }

  trackLocationRefresh(params: LocationUpdateParams): void {
    this.track('location_refresh', params);
  }

  trackLocationUpdated(params: LocationUpdateParams): void {
    this.track('location_updated', params);
  }

  // Destination Events
  trackDestinationSearchStarted(searchLength: number): void {
    this.track('destination_search_started', {
      search_length: searchLength,
    });
  }

  trackDestinationSuggestionSelected(params: DestinationParams): void {
    this.track('destination_suggestion_selected', params);
  }

  trackDestinationCalculated(params: DestinationParams): void {
    this.track('destination_calculated', {
      ...params,
      success: true,
    });
  }

  trackDestinationCalculationError(params: DestinationParams): void {
    this.track('destination_calculation_error', {
      ...params,
      success: false,
    });
  }

  // UI Interaction Events
  trackTabSwitch(params: UIInteractionParams): void {
    this.track('tab_switched', params);
  }

  trackThemeToggle(params: UIInteractionParams): void {
    this.track('theme_toggled', params);
  }

  // Error Events
  trackError(params: ErrorParams): void {
    this.track('app_error', params);
  }

  // Helper method to get geolocation error type
  private getGeolocationErrorType(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'permission_denied';
      case error.POSITION_UNAVAILABLE:
        return 'position_unavailable';
      case error.TIMEOUT:
        return 'timeout';
      default:
        return 'unknown';
    }
  }

  // Page view tracking (automatically handled by gtag config)
  trackPageView(path?: string): void {
    if (!this.isInitialized || typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: path || window.location.pathname,
      page_title: document.title,
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types for use in components
export type { LocationPermissionParams, LocationUpdateParams, DestinationParams, UIInteractionParams, ErrorParams };