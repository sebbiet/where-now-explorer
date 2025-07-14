import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import { GeolocationService, GeolocationError, GeolocationErrorCode } from '@/services/geolocation.service';
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { TraditionalLandService } from '@/services/traditionalLand.service';
import { usePreferences } from '@/contexts/PreferencesContext';

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

interface LocationContextType {
  locationData: LocationData;
  isLoadingLocation: boolean;
  isRefreshingLocation: boolean;
  countdown: number;
  fetchLocation: () => Promise<void>;
  handleRefresh: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { preferences } = usePreferences();
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [countdown, setCountdown] = useState(preferences.autoRefreshInterval);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  


  // Fetch location data
  const fetchLocation = useCallback(async () => {
    // Only show loading spinner on initial load, not on refreshes
    if (!Object.keys(locationData).length) {
      setIsLoadingLocation(true);
    } else {
      setIsRefreshingLocation(true);
    }
    
    try {
      const position = await GeolocationService.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      const addressData = await GeocodingService.reverseGeocode(latitude, longitude);
      
      // Check if in Australia and add traditional land info
      if (TraditionalLandService.isAustralianLocation(addressData.country)) {
        const traditionalInfo = TraditionalLandService.getTraditionalLandInfo(
          addressData.city,
          addressData.suburb,
          addressData.state
        );
        
        if (traditionalInfo) {
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
    } catch (error) {
      console.error("Error getting location:", error);
      
      // Provide more helpful error messages based on the error type
      if (error instanceof GeolocationError) {
        switch (error.code) {
          case GeolocationErrorCode.PERMISSION_DENIED:
            toast.error("📍 Location access denied. Click the location icon in your browser's address bar to enable permissions.");
            break;
          case GeolocationErrorCode.POSITION_UNAVAILABLE:
            toast.error("📍 Cannot determine your location. Please check if location services are enabled on your device.");
            break;
          case GeolocationErrorCode.TIMEOUT:
            toast.error("📍 Location request timed out. Please try refreshing the page.");
            break;
          case GeolocationErrorCode.UNSUPPORTED:
            toast.error("📍 Your browser doesn't support location services. Please try a modern browser.");
            break;
          default:
            toast.error(`📍 ${error.message}`);
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
  }, []);

  // Manual refresh handler that also resets the countdown
  const handleRefresh = () => {
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
    handleRefresh
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
