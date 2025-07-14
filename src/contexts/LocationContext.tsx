import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import { GeolocationService, GeolocationError, GeolocationErrorCode } from '@/services/geolocation.service';
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { TraditionalLandService } from '@/services/traditionalLand.service';
import { usePreferences } from '@/contexts/PreferencesContext';
import { analytics } from '@/services/analytics.service';

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

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { preferences } = usePreferences();
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [countdown, setCountdown] = useState(preferences.autoRefreshInterval);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  
  // Mock location state for testing (development only)
  const [useMockLocation, setUseMockLocation] = useState(false);
  const [mockLocation, setMockLocationState] = useState<MockLocation | null>(null);
  
  // Mock location helper functions (development only)
  const setMockLocation = useCallback((location: MockLocation | null) => {
    if (process.env.NODE_ENV === 'development') {
      setMockLocationState(location);
    }
  }, []);
  
  const toggleMockLocation = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      setUseMockLocation(prev => !prev);
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
      if (process.env.NODE_ENV === 'development' && useMockLocation && mockLocation) {
        latitude = mockLocation.latitude;
        longitude = mockLocation.longitude;
      } else {
        const position = await GeolocationService.getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
      
      const addressData = await GeocodingService.reverseGeocode(latitude, longitude, {
        minimal: true // Only request essential fields
      });
      
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
            traditionalNation: traditionalInfo.nation
          });
        } else {
          setLocationData(addressData);
        }
      } else {
        setLocationData(addressData);
      }
      
      // Track successful location update
      analytics.trackLocationUpdated({
        update_type: Object.keys(locationData).length === 0 ? 'initial' : 'refresh',
        has_traditional_land_info: hasTradLandInfo,
      });
    } catch (error) {
      console.error("[LocationContext] Error getting location:", error);
      
      // Provide more helpful error messages based on the error type
      if (error instanceof GeolocationError) {
        switch (error.code) {
          case GeolocationErrorCode.PERMISSION_DENIED:
            toast.error(
              "📍 Location access denied",
              {
                description: "Click the location icon in your browser's address bar to enable permissions.",
                action: {
                  label: "Learn how",
                  onClick: () => {
                    alert("1. Look for a location icon in your browser's address bar\n2. Click it and select 'Allow'\n3. Refresh the page");
                  }
                }
              }
            );
            break;
          case GeolocationErrorCode.POSITION_UNAVAILABLE:
            toast.error(
              "📍 Can't find your location",
              {
                description: "Please check if location services are enabled on your device.",
                action: {
                  label: "Try again",
                  onClick: () => fetchLocation()
                }
              }
            );
            break;
          case GeolocationErrorCode.TIMEOUT:
            toast.error(
              "📍 Location request timed out",
              {
                description: "This is taking longer than usual.",
                action: {
                  label: "Retry",
                  onClick: () => fetchLocation()
                }
              }
            );
            break;
          case GeolocationErrorCode.UNSUPPORTED:
            toast.error("📍 Your browser doesn't support location services. Please try Chrome, Firefox, or Safari.");
            break;
          default:
            toast.error(`📍 ${error.message}`, {
              action: {
                label: "Retry",
                onClick: () => fetchLocation()
              }
            });
        }
      } else if (error instanceof GeocodingError) {
        toast.error("📍 Couldn't get your address. Please try again later.");
      } else {
        toast.error("📍 Couldn't find your location. Please make sure location services are enabled.");
      }
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
  }, [fetchLocation, isTabActive, preferences.autoRefreshInterval, preferences.enableLocationTracking]);

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


  const value = {
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
    toggleMockLocation
  };

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
