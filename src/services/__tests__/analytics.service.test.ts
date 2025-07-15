import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics } from '../analytics.service';
import type { MockGtag } from '@/test-utils/mockTypes';

// Mock environment variables
const mockEnv = {
  DEV: false,
  MODE: 'test',
  VITE_APP_VERSION: '1.0.0',
  VITE_ENABLE_ANALYTICS: undefined,
};

vi.mock('import.meta.env', () => mockEnv);

describe('AnalyticsService', () => {
  const mockGtag = vi.fn();
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.gtag
    global.window = {
      ...global.window,
      gtag: mockGtag as MockGtag,
      dataLayer: [],
      location: {
        pathname: '/test-path',
      } as Location,
    } as Window & typeof globalThis;

    // Mock document
    global.document = {
      ...global.document,
      title: 'Test Page',
    } as Document;

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Reset environment to production mode
    mockEnv.DEV = false;
    mockEnv.VITE_ENABLE_ANALYTICS = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('trackEvent method', () => {
    it('should track events with gtag in production', () => {
      analytics.track('test_event', { test_param: 'value' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        test_param: 'value',
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should add common parameters to all events', () => {
      analytics.track('custom_event');

      expect(mockGtag).toHaveBeenCalledWith('event', 'custom_event', {
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should handle gtag errors gracefully', () => {
      mockGtag.mockImplementation(() => {
        throw new Error('gtag error');
      });

      analytics.track('error_event');

      expect(console.error).toHaveBeenCalledWith(
        '[Analytics] Error tracking event:',
        expect.any(Error)
      );
    });

    it('should warn when gtag is not available', () => {
      delete (global.window as Window & { gtag?: MockGtag }).gtag;

      analytics.track('test_event');

      expect(console.warn).toHaveBeenCalledWith(
        '[Analytics] gtag not available'
      );
      expect(mockGtag).not.toHaveBeenCalled();
    });
  });

  describe('trackError method', () => {
    it('should track error with required parameters', () => {
      const errorParams = {
        error_type: 'network_error',
        error_message: 'Connection failed',
        error_source: 'api_call',
      };

      analytics.trackError(errorParams);

      expect(mockGtag).toHaveBeenCalledWith('event', 'app_error', {
        ...errorParams,
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should track error with retry count', () => {
      const errorParams = {
        error_type: 'timeout',
        retry_count: 3,
      };

      analytics.trackError(errorParams);

      expect(mockGtag).toHaveBeenCalledWith('event', 'app_error', {
        ...errorParams,
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('trackTiming method', () => {
    it('should track custom timing events', () => {
      analytics.track('page_load_time', {
        duration: 1250,
        page: 'home',
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_load_time', {
        duration: 1250,
        page: 'home',
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('trackPageView method', () => {
    it('should track page views with current path', () => {
      analytics.trackPageView();

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/test-path',
        page_title: 'Test Page',
      });
    });

    it('should track page views with custom path', () => {
      analytics.trackPageView('/custom-path');

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/custom-path',
        page_title: 'Test Page',
      });
    });

    it('should not track page view when gtag is not available', () => {
      delete (global.window as Window & { gtag?: MockGtag }).gtag;

      analytics.trackPageView();

      expect(mockGtag).not.toHaveBeenCalled();
    });
  });

  describe('location permission tracking', () => {
    it('should track granted location permission', () => {
      const params = { timestamp: 1234567890 };

      analytics.trackLocationPermission(true, params);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'location_permission_granted',
        {
          timestamp: 1234567890,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should track denied location permission', () => {
      analytics.trackLocationPermission(false);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'location_permission_denied',
        {
          timestamp: expect.any(Number),
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should track location permission errors', () => {
      const mockError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      analytics.trackLocationPermissionError(mockError);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'location_permission_error',
        {
          error_type: 'permission_denied',
          error_message: 'User denied geolocation',
          error_code: 1,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should handle different geolocation error codes', () => {
      const timeoutError = {
        code: 3,
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      analytics.trackLocationPermissionError(timeoutError);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'location_permission_error',
        {
          error_type: 'timeout',
          error_message: 'Timeout',
          error_code: 3,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should track location updates', () => {
      const updateParams = {
        update_type: 'initial' as const,
        has_traditional_land_info: true,
      };

      analytics.trackLocationUpdated(updateParams);

      expect(mockGtag).toHaveBeenCalledWith('event', 'location_updated', {
        ...updateParams,
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should track location refresh', () => {
      const refreshParams = {
        update_type: 'refresh' as const,
        refresh_type: 'manual' as const,
        countdown_remaining: 15,
      };

      analytics.trackLocationRefresh(refreshParams);

      expect(mockGtag).toHaveBeenCalledWith('event', 'location_refresh', {
        ...refreshParams,
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('GA4 integration', () => {
    it('should use GA4 event format', () => {
      analytics.track('custom_event', {
        custom_parameter: 'value',
        numeric_value: 42,
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'custom_event', {
        custom_parameter: 'value',
        numeric_value: 42,
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should include app version in all events', () => {
      mockEnv.VITE_APP_VERSION = '2.1.0';

      analytics.track('version_test');

      expect(mockGtag).toHaveBeenCalledWith('event', 'version_test', {
        app_version: '2.1.0',
        environment: 'test',
      });
    });

    it('should fall back to default version when env var not set', () => {
      mockEnv.VITE_APP_VERSION = undefined;

      analytics.track('version_test');

      expect(mockGtag).toHaveBeenCalledWith('event', 'version_test', {
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('production vs development mode', () => {
    it('should log to console in development mode', () => {
      mockEnv.DEV = true;

      analytics.track('dev_event', { test: 'value' });

      expect(console.log).toHaveBeenCalledWith('[Analytics Dev]', 'dev_event', {
        test: 'value',
      });
      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should track events in development when analytics enabled', () => {
      mockEnv.DEV = true;
      mockEnv.VITE_ENABLE_ANALYTICS = 'true';

      analytics.track('dev_enabled_event');

      expect(mockGtag).toHaveBeenCalledWith('event', 'dev_enabled_event', {
        app_version: '1.0.0',
        environment: 'test',
      });
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should track events normally in production', () => {
      mockEnv.DEV = false;

      analytics.track('prod_event');

      expect(mockGtag).toHaveBeenCalledWith('event', 'prod_event', {
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('destination tracking', () => {
    it('should track destination search started', () => {
      analytics.trackDestinationSearchStarted(5);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'destination_search_started',
        {
          search_length: 5,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should track destination suggestion selected', () => {
      const params = {
        suggestion_index: 2,
        total_suggestions: 5,
        destination_type: 'landmark',
      };

      analytics.trackDestinationSuggestionSelected(params);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'destination_suggestion_selected',
        {
          ...params,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });

    it('should track successful destination calculation', () => {
      const params = {
        distance_km: 10.5,
        duration_minutes: 25,
        destination_type: 'address',
      };

      analytics.trackDestinationCalculated(params);

      expect(mockGtag).toHaveBeenCalledWith('event', 'destination_calculated', {
        ...params,
        success: true,
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should track destination calculation errors', () => {
      const params = {
        error_type: 'route_not_found',
        destination_query: 'invalid location',
      };

      analytics.trackDestinationCalculationError(params);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'destination_calculation_error',
        {
          ...params,
          success: false,
          app_version: '1.0.0',
          environment: 'test',
        }
      );
    });
  });

  describe('UI interaction tracking', () => {
    it('should track tab switches', () => {
      const params = {
        from_tab: 'home',
        to_tab: 'settings',
        interaction_method: 'click' as const,
      };

      analytics.trackTabSwitch(params);

      expect(mockGtag).toHaveBeenCalledWith('event', 'tab_switched', {
        ...params,
        app_version: '1.0.0',
        environment: 'test',
      });
    });

    it('should track theme toggles', () => {
      const params = {
        new_theme: 'dark' as const,
        system_preference: 'light' as const,
      };

      analytics.trackThemeToggle(params);

      expect(mockGtag).toHaveBeenCalledWith('event', 'theme_toggled', {
        ...params,
        app_version: '1.0.0',
        environment: 'test',
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing window object', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      analytics.track('no_window_event');

      // Should not throw error
      expect(console.warn).toHaveBeenCalledWith(
        '[Analytics] gtag not available'
      );

      global.window = originalWindow;
    });

    it('should handle gtag function not being available', () => {
      global.window.gtag = undefined as any;

      analytics.track('no_gtag_event');

      expect(console.warn).toHaveBeenCalledWith(
        '[Analytics] gtag not available'
      );
    });
  });
});
