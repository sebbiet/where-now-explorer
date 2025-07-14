import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { toast } from "sonner";

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
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  
  // Get current position using Geolocation API
  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("UNSUPPORTED: Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          (error) => {
            // Provide more specific error messages based on error code
            switch(error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error("PERMISSION_DENIED: Location access was denied. Please enable location permissions in your browser settings."));
                break;
              case error.POSITION_UNAVAILABLE:
                reject(new Error("POSITION_UNAVAILABLE: Location information is unavailable. Please check your device's location settings."));
                break;
              case error.TIMEOUT:
                reject(new Error("TIMEOUT: Location request timed out. Please try again."));
                break;
              default:
                reject(new Error(`UNKNOWN: An unknown error occurred: ${error.message}`));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    });
  };

  // Get address details from coordinates using reverse geocoding
  const getAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "AreWeThereYetApp/1.0",
          }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to get address");
      }
      
      const data = await response.json();
      
      return {
        street: data.address.road,
        suburb: data.address.suburb || data.address.neighbourhood,
        city: data.address.city || data.address.town || data.address.village,
        county: data.address.county,
        state: data.address.state,
        country: data.address.country,
        latitude,
        longitude
      };
    } catch (error) {
      console.error("Error fetching address data:", error);
      throw error;
    }
  };


  // Fetch location data
  const fetchLocation = useCallback(async () => {
    // Only show loading spinner on initial load, not on refreshes
    if (!Object.keys(locationData).length) {
      setIsLoadingLocation(true);
    } else {
      setIsRefreshingLocation(true);
    }
    
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      const addressData = await getAddressFromCoords(latitude, longitude);
      setLocationData(addressData);
    } catch (error) {
      console.error("Error getting location:", error);
      
      // Provide more helpful error messages based on the error type
      if (error instanceof Error) {
        if (error.message.startsWith("PERMISSION_DENIED")) {
          toast.error("📍 Location access denied. Click the location icon in your browser's address bar to enable permissions.");
        } else if (error.message.startsWith("POSITION_UNAVAILABLE")) {
          toast.error("📍 Cannot determine your location. Please check if location services are enabled on your device.");
        } else if (error.message.startsWith("TIMEOUT")) {
          toast.error("📍 Location request timed out. Please try refreshing the page.");
        } else if (error.message.startsWith("UNSUPPORTED")) {
          toast.error("📍 Your browser doesn't support location services. Please try a modern browser.");
        } else {
          toast.error(`📍 ${error.message}`);
        }
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
    setCountdown(30);
  };

  // Set up auto-refresh timer
  useEffect(() => {
    const countdownId = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          // When countdown reaches 0, trigger the fetch location
          fetchLocation();
          return 30;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownId);
  }, [fetchLocation]);

  // Initial location fetch
  useEffect(() => {
    fetchLocation();
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
