import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocation } from '../LocationContext';
import { GeolocationService, GeolocationError, GeolocationErrorCode } from '@/services/geolocation.service';
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { TraditionalLandService } from '@/services/traditionalLand.service';
import { usePreferences } from '@/contexts/PreferencesContext';
import { analytics } from '@/services/analytics.service';
import { toast } from 'sonner';
import React from 'react';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn()
  }
}));

vi.mock('@/services/geolocation.service', () => ({
  GeolocationService: {
    getCurrentPosition: vi.fn()
  },
  GeolocationError: class GeolocationError extends Error {
    constructor(public code: number, message: string) {
      super(message);
      this.name = 'GeolocationError';
    }
  },
  GeolocationErrorCode: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    UNSUPPORTED: 4
  }
}));

vi.mock('@/services/geocoding.service', () => ({
  GeocodingService: {
    reverseGeocode: vi.fn()
  },
  GeocodingError: class GeocodingError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GeocodingError';
    }
  }
}));

vi.mock('@/services/traditionalLand.service', () => ({
  TraditionalLandService: {
    isAustralianLocation: vi.fn(),
    getTraditionalLandInfo: vi.fn()
  }
}));

vi.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: vi.fn()
}));

vi.mock('@/services/analytics.service', () => ({
  analytics: {
    trackLocationUpdated: vi.fn(),
    trackLocationRefresh: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

// Test component that uses the context
const TestComponent = ({ onRender }: { onRender?: (data: any) => void }) => {
  const locationContext = useLocation();
  
  React.useEffect(() => {
    onRender?.(locationContext);
  }, [locationContext, onRender]);

  return (
    <div>
      <div data-testid="loading">{locationContext.isLoadingLocation ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="refreshing">{locationContext.isRefreshingLocation ? 'Refreshing' : 'Not Refreshing'}</div>
      <div data-testid="countdown">{locationContext.countdown}</div>
      <div data-testid="city">{locationContext.locationData.city || 'No city'}</div>
      <div data-testid="traditional">{locationContext.locationData.traditionalName || 'No traditional info'}</div>
      <button onClick={locationContext.handleRefresh}>Refresh</button>
      <button onClick={locationContext.toggleMockLocation}>Toggle Mock</button>
    </div>
  );
};

describe('LocationContext', () => {
  const mockPosition = {
    coords: {
      latitude: -33.8688,
      longitude: 151.2093,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  };

  const mockAddressData = {
    street: '100 George Street',
    suburb: 'Sydney',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093
  };

  const mockPreferences = {
    preferences: {
      autoRefreshInterval: 30,
      enableLocationTracking: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePreferences).mockReturnValue(mockPreferences as any);
    vi.mocked(GeolocationService.getCurrentPosition).mockResolvedValue(mockPosition);
    vi.mocked(GeocodingService.reverseGeocode).mockResolvedValue(mockAddressData);
    vi.mocked(TraditionalLandService.isAustralianLocation).mockReturnValue(false);
    // Mock alert for permission denied error
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial context state', () => {
    it('should have initial loading state', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      expect(screen.getByTestId('city')).toHaveTextContent('No city');
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useLocation must be used within a LocationProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('location fetching flow', () => {
    it('should fetch location on mount', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(GeolocationService.getCurrentPosition).toHaveBeenCalled();
        expect(GeocodingService.reverseGeocode).toHaveBeenCalledWith(
          mockPosition.coords.latitude,
          mockPosition.coords.longitude,
          { minimal: true }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        expect(screen.getByTestId('city')).toHaveTextContent('Sydney');
      });

      expect(analytics.trackLocationUpdated).toHaveBeenCalledWith({
        update_type: 'initial',
        has_traditional_land_info: false
      });
    });

    it('should show refreshing state on manual refresh', async () => {
      const { rerender } = render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Click refresh button
      act(() => {
        screen.getByText('Refresh').click();
      });

      expect(screen.getByTestId('refreshing')).toHaveTextContent('Refreshing');
      expect(analytics.trackLocationRefresh).toHaveBeenCalledWith({
        update_type: 'refresh',
        refresh_type: 'manual',
        countdown_remaining: 30
      });

      await waitFor(() => {
        expect(screen.getByTestId('refreshing')).toHaveTextContent('Not Refreshing');
      });
    });
  });

  describe('mock location toggle (dev mode)', () => {
    it('should expose mock location functions', async () => {
      let capturedContext: any;
      
      render(
        <LocationProvider>
          <TestComponent onRender={(ctx) => { capturedContext = ctx; }} />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(capturedContext).toBeDefined();
      });

      expect(capturedContext.useMockLocation).toBe(false);
      expect(capturedContext.mockLocation).toBeNull();
      expect(typeof capturedContext.toggleMockLocation).toBe('function');
      expect(typeof capturedContext.setMockLocation).toBe('function');
    });
  });

  describe('auto-refresh countdown', () => {
    it('should display initial countdown value', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('countdown')).toHaveTextContent('30');
      });
    });
  });

  describe('error handling states', () => {
    it('should handle permission denied error', async () => {
      const permissionError = new GeolocationError(
        GeolocationErrorCode.PERMISSION_DENIED,
        'User denied location permission'
      );
      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(permissionError);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "📍 Location access denied",
          expect.objectContaining({
            description: "Click the location icon in your browser's address bar to enable permissions."
          })
        );
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    it('should handle position unavailable error', async () => {
      const positionError = new GeolocationError(
        GeolocationErrorCode.POSITION_UNAVAILABLE,
        'Position unavailable'
      );
      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(positionError);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "📍 Can't find your location",
          expect.objectContaining({
            description: "Please check if location services are enabled on your device."
          })
        );
      });
    });

    it('should handle timeout error', async () => {
      const timeoutError = new GeolocationError(
        GeolocationErrorCode.TIMEOUT,
        'Request timed out'
      );
      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(timeoutError);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "📍 Location request timed out",
          expect.objectContaining({
            description: "This is taking longer than usual."
          })
        );
      });
    });

    it('should handle geocoding error', async () => {
      const geocodingError = new GeocodingError('Geocoding failed');
      vi.mocked(GeocodingService.reverseGeocode).mockRejectedValue(geocodingError);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "📍 Couldn't get your address. Please try again later."
        );
      });
    });
  });

  describe('geocoding integration', () => {
    it('should fetch and display location data', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('city')).toHaveTextContent('Sydney');
      });

      expect(GeocodingService.reverseGeocode).toHaveBeenCalledWith(
        mockPosition.coords.latitude,
        mockPosition.coords.longitude,
        { minimal: true }
      );
    });
  });

  describe('traditional land info', () => {
    it('should add traditional land info for Australian locations', async () => {
      vi.mocked(TraditionalLandService.isAustralianLocation).mockReturnValue(true);
      vi.mocked(TraditionalLandService.getTraditionalLandInfo).mockReturnValue({
        traditionalName: 'Gadigal Country',
        nation: 'Eora Nation',
        acknowledgement: 'We acknowledge the Gadigal people'
      });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('traditional')).toHaveTextContent('Gadigal Country');
      });

      expect(TraditionalLandService.getTraditionalLandInfo).toHaveBeenCalledWith(
        'Sydney',
        'Sydney',
        'NSW'
      );

      expect(analytics.trackLocationUpdated).toHaveBeenCalledWith({
        update_type: 'initial',
        has_traditional_land_info: true
      });
    });

    it('should handle missing traditional land info', async () => {
      vi.mocked(TraditionalLandService.isAustralianLocation).mockReturnValue(true);
      vi.mocked(TraditionalLandService.getTraditionalLandInfo).mockReturnValue(null);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('traditional')).toHaveTextContent('No traditional info');
      });

      expect(analytics.trackLocationUpdated).toHaveBeenCalledWith({
        update_type: 'initial',
        has_traditional_land_info: false
      });
    });
  });
});