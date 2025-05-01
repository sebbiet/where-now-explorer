import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { Timer } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ThemeToggle from '@/components/ThemeToggle';
import LocationPin from '@/components/LocationPin';
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationDisplay from '@/components/LocationDisplay';
import DestinationInput from '@/components/DestinationInput';
import DestinationResult from '@/components/DestinationResult';
import FunFactCard from '@/components/FunFactCard';

// Define interfaces for data structures
interface LocationData {
  street?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface DestinationData {
  name: string;
  distance: string;
  duration: string;
}

const Index = () => {
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [destinationData, setDestinationData] = useState<DestinationData | null>(null);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
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
      // In real app, this would be an API call to OpenAI or similar service
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

  // Fetch location data - this function now only updates location-related state
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

  // Calculate distance to destination
  const calculateDistance = async (destination: string) => {
    if (!locationData.latitude || !locationData.longitude) {
      toast.error("Can't calculate distance without your current location");
      return;
    }

    setIsLoadingDestination(true);
    
    try {
      // First, geocode the destination to get its coordinates
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1&addressdetails=1`,
        {
          headers: {
            "User-Agent": "AreWeThereYetApp/1.0",
          }
        }
      );
      
      if (!geocodeResponse.ok) {
        throw new Error("Failed to find that place");
      }
      
      const places = await geocodeResponse.json();
      
      if (places.length === 0) {
        toast.error("Place not found. Try a more specific name or address.");
        throw new Error("Place not found");
      }
      
      const destLat = parseFloat(places[0].lat);
      const destLon = parseFloat(places[0].lon);
      
      // Use the display_name or the place's name from OpenStreetMap
      let destName = places[0].display_name.split(',')[0];
      
      // If a more specific place name exists, use that
      if (places[0].address && places[0].address.attraction) {
        destName = places[0].address.attraction;
      } else if (places[0].address && places[0].address.amenity) {
        destName = places[0].address.amenity;
      } else if (places[0].address && places[0].address.tourism) {
        destName = places[0].address.tourism;
      }
      
      // Now calculate distance and time using OSRM
      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${locationData.longitude},${locationData.latitude};${destLon},${destLat}?overview=false`
      );
      
      if (!routeResponse.ok) {
        throw new Error("Failed to calculate route");
      }
      
      const routeData = await routeResponse.json();
      
      if (routeData.code !== 'Ok' || !routeData.routes || routeData.routes.length === 0) {
        toast.error("Couldn't find a driving route to that destination");
        throw new Error("Failed to find a route");
      }
      
      // Extract distance and duration
      const route = routeData.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMinutes = Math.round(route.duration / 60);
      
      // Format duration in hours and minutes
      let formattedDuration = '';
      if (durationMinutes < 60) {
        formattedDuration = `${durationMinutes} minutes`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        formattedDuration = `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
      }
      
      setDestinationData({
        name: destName,
        distance: `${distanceKm} kilometers`,
        duration: formattedDuration
      });
      
    } catch (error) {
      console.error("Error calculating distance:", error);
      if (!error.message?.includes("Place not found")) {
        toast.error("Couldn't calculate distance to that destination");
      }
    } finally {
      setIsLoadingDestination(false);
    }
  };

  // Fetch location on initial load only
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);
  
  // Set up auto-refresh timer separately
  useEffect(() => {
    // Set up countdown timer
    const countdownId = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          // When countdown reaches 0, trigger the fetch location 
          // but don't reset the page
          fetchLocation();
          return 30;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(countdownId);
  }, [fetchLocation]); // Add fetchLocation to dependency array

  // Manual refresh handler that also resets the countdown
  const handleRefresh = () => {
    fetchLocation();
    setCountdown(30);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 bg-gradient-to-b from-soft-purple/30 to-soft-blue/20 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-grape">Are We There Yet?</h1>
        <p className="text-center text-lg mb-6">Let's find out exactly where we are!</p>
        
        <LocationPin />
        
        {isLoadingLocation ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className={isRefreshingLocation ? "animate-pulse" : ""}>
              <LocationDisplay locationData={locationData} />
            </div>
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleRefresh}
                className="kid-button bg-sky text-white hover:bg-sky/80 flex items-center"
                disabled={isLoadingLocation || isRefreshingLocation}
              >
                <Timer className="w-5 h-5 mr-2" />
                Refresh in {countdown}s
              </Button>
            </div>
            
            <DestinationInput 
              onDestinationSubmit={calculateDistance}
              isLoading={isLoadingDestination}
            />
            
            {destinationData && (
              <DestinationResult 
                destination={destinationData.name}
                distance={destinationData.distance}
                duration={destinationData.duration}
              />
            )}
            
            <div className={isRefreshingLocation ? "animate-pulse" : ""}>
              <FunFactCard fact={funFact} isLoading={isLoadingFunFact} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
