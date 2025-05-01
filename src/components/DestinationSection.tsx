
import React, { useState, memo } from 'react';
import DestinationInput from '@/components/DestinationInput';
import DestinationResult from '@/components/DestinationResult';
import { useLocation } from '@/contexts/LocationContext';
import { toast } from "sonner";

interface DestinationData {
  name: string;
  distance: string;
  duration: string;
}

const DestinationSection = () => {
  const { locationData } = useLocation();
  const [destinationData, setDestinationData] = useState<DestinationData | null>(null);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);

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
      if (!(error as Error).message?.includes("Place not found")) {
        toast.error("Couldn't calculate distance to that destination");
      }
    } finally {
      setIsLoadingDestination(false);
    }
  };

  return (
    <div className="w-full">
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
    </div>
  );
};

export default memo(DestinationSection);
