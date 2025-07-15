import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
  useEffect,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import {
  GeolocationService,
  GeolocationError,
  GeolocationErrorCode,
} from '@/services/geolocation.service';
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { handleLocationError } from '@/utils/errorHandling';
import { TraditionalLandService } from '@/services/traditionalLand.service';
import { usePreferences } from '@/contexts/PreferencesContext';
import { analytics } from '@/services/analytics.service';
import { logger } from '@/utils/logger';

// Define interfaces for our data structures
export interface LocationData {
  street?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  traditionalName?: string;
  traditionalNation?: string;
}

interface MockLocation {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  locationData: LocationData;
  isLoadingLocation: boolean;
  isRefreshingLocation: boolean;
  countdown: number;
  fetchLocation: () => Promise<void>;
  handleRefresh: () => void;
  // Mock location for testing
  useMockLocation: boolean;
  mockLocation: MockLocation | null;
  setMockLocation: (location: MockLocation | null) => void;
  toggleMockLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { preferences } = usePreferences();
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [countdown, setCountdown] = useState(preferences.autoRefreshInterval);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  // Mock location state for testing (development only)
  const [useMockLocation, setUseMockLocation] = useState(false);
  const [mockLocation, setMockLocationState] = useState<MockLocation | null>(
    null
  );

  // Mock location helper functions (development only)
  const setMockLocation = useCallback((location: MockLocation | null) => {
    if (process.env.NODE_ENV === 'development') {
      setMockLocationState(location);
    }
  }, []);

  const toggleMockLocation = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      setUseMockLocation((prev) => !prev);
    }
  }, []);

  // Fetch location data
  const fetchLocation = useCallback(async () => {
    // Only show loading spinner on initial load, not on refreshes
    if (!Object.keys(locationData).length) {
      setIsLoadingLocation(true);
    } else {
      setIsRefreshingLocation(true);
    }

    try {
      let latitude: number;
      let longitude: number;

      // Use mock location if enabled in development
      if (
        process.env.NODE_ENV === 'development' &&
        useMockLocation &&
        mockLocation
      ) {
        latitude = mockLocation.latitude;
        longitude = mockLocation.longitude;
      } else {
        const position = await GeolocationService.getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      const addressData = await GeocodingService.reverseGeocode(
        latitude,
        longitude,
        {
          minimal: true, // Only request essential fields
        }
      );

      // Check if in Australia and add traditional land info
      let hasTradLandInfo = false;
      if (TraditionalLandService.isAustralianLocation(addressData.country)) {
        const traditionalInfo = TraditionalLandService.getTraditionalLandInfo(
          addressData.city,
          addressData.suburb,
          addressData.state
        );

        if (traditionalInfo) {
          hasTradLandInfo = true;
          setLocationData({
            ...addressData,
            traditionalName: traditionalInfo.traditionalName,
            traditionalNation: traditionalInfo.nation,
          });
        } else {
          setLocationData(addressData);
        }
      } else {
        setLocationData(addressData);
      }

      // Track successful location update
      analytics.trackLocationUpdated({
        update_type:
          Object.keys(locationData).length === 0 ? 'initial' : 'refresh',
        has_traditional_land_info: hasTradLandInfo,
      });
    } catch (error) {
      logger.error('Error getting location', error as Error, {
        component: 'LocationContext',
        operation: 'fetchLocation',
      });

      // Use centralized error handling
      handleLocationError(error, {
        onRetry: () => fetchLocation(),
        context: 'LocationContext.fetchLocation',
      });
    } finally {
      setIsLoadingLocation(false);
      setIsRefreshingLocation(false);
    }
  }, [locationData, useMockLocation, mockLocation]);

  // Manual refresh handler that also resets the countdown
  const handleRefresh = () => {
    // Track manual refresh
    analytics.trackLocationRefresh({
      update_type: 'refresh',
      refresh_type: 'manual',
      countdown_remaining: countdown,
    });

    fetchLocation();
    setCountdown(preferences.autoRefreshInterval);
  };

  // Set up auto-refresh timer
  useEffect(() => {
    const countdownId = setInterval(() => {
      // Only update countdown when tab is active
      if (isTabActive) {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            // When countdown reaches 0, trigger the fetch location
            if (preferences.enableLocationTracking) {
              fetchLocation();
            }
            return preferences.autoRefreshInterval;
          }
          return prevCount - 1;
        });
      }
    }, 1000);

    return () => clearInterval(countdownId);
  }, [
    fetchLocation,
    isTabActive,
    preferences.autoRefreshInterval,
    preferences.enableLocationTracking,
  ]);

  // Initial location fetch
  useEffect(() => {
    fetchLocation();
  }, []);

  // Refetch location when mock location settings change
  useEffect(() => {
    // Skip initial mount
    if (locationData.latitude !== undefined) {
      fetchLocation();
    }
  }, [useMockLocation, mockLocation]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      locationData,
      isLoadingLocation,
      isRefreshingLocation,
      countdown,
      fetchLocation,
      handleRefresh,
      // Mock location for testing (development only)
      useMockLocation,
      mockLocation,
      setMockLocation,
      toggleMockLocation,
    }),
    [
      locationData,
      isLoadingLocation,
      isRefreshingLocation,
      countdown,
      fetchLocation,
      handleRefresh,
      useMockLocation,
      mockLocation,
      setMockLocation,
      toggleMockLocation,
    ]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
