
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
  funFact: string;
  isLoadingFunFact: boolean;
  countdown: number;
  fetchLocation: () => Promise<void>;
  handleRefresh: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [funFact, setFunFact] = useState("");
  const [isLoadingFunFact, setIsLoadingFunFact] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  
  // Get current position using Geolocation API
  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported by your browser");
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
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

  // Generate a fun fact about the current location
  const generateFunFact = useCallback(async (location: LocationData) => {
    if (!location.city && !location.state && !location.country) {
      return;
    }
    
    const placeName = location.city || location.suburb || location.state || location.county || location.country;
    if (!placeName) return;
    
    setIsLoadingFunFact(true);
    
    try {
      // Using a mock API call for now since we can't connect to real AI model
      setTimeout(() => {
        const facts = [
          `${placeName} has some of the friendliest squirrels in the world! They've been known to wave hello!`,
          `Did you know that ${placeName} once had a parade where all the dogs wore tiny hats?`,
          `The ice cream shops in ${placeName} once tried to create a flavor that tasted like sunshine!`,
          `In ${placeName}, there's a legend about a magical playground where slides never give you static shocks!`,
          `The clouds above ${placeName} sometimes form shapes that look like dinosaurs having a dance party!`,
          `${placeName} is home to a tree where kids leave notes for fairies, and sometimes they write back!`
        ];
        
        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        setFunFact(randomFact);
        setIsLoadingFunFact(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating fun fact:", error);
      setFunFact("Hmm, the fun fact machine seems to be on vacation today!");
      setIsLoadingFunFact(false);
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
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      const addressData = await getAddressFromCoords(latitude, longitude);
      setLocationData(addressData);
      
      // After location is fetched, generate a fun fact
      generateFunFact(addressData);
    } catch (error) {
      console.error("Error getting location:", error);
      toast.error("Couldn't find your location. Please make sure location services are enabled.");
    } finally {
      setIsLoadingLocation(false);
      setIsRefreshingLocation(false);
    }
  }, [generateFunFact]);

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
    funFact,
    isLoadingFunFact,
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
