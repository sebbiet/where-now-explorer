
import React, { useState, memo } from 'react';
import DestinationInput from '@/components/DestinationInput';
import DestinationResult from '@/components/DestinationResult';
import { useLocation } from '@/contexts/LocationContext';
import { toast } from "sonner";
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { RoutingService, RoutingError } from '@/services/routing.service';

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
      const places = await GeocodingService.geocode(destination, {
        limit: 1,
        addressdetails: true
      });
      
      if (places.length === 0) {
        toast.error("Place not found. Try a more specific name or address.");
        return;
      }
      
      const place = places[0];
      const destLat = parseFloat(place.lat);
      const destLon = parseFloat(place.lon);
      
      // Extract the place name
      const destName = GeocodingService.extractPlaceName(place);
      
      // Calculate route
      const routeResult = await RoutingService.calculateRoute(
        { latitude: locationData.latitude, longitude: locationData.longitude },
        { latitude: destLat, longitude: destLon }
      );
      
      setDestinationData({
        name: destName,
        distance: routeResult.formattedDistance,
        duration: routeResult.formattedDuration
      });
      
    } catch (error) {
      console.error("Error calculating distance:", error);
      
      if (error instanceof GeocodingError) {
        toast.error("Couldn't find that place. Please try a more specific name or address.");
      } else if (error instanceof RoutingError) {
        if (error.code === 'NO_ROUTE') {
          toast.error("Couldn't find a driving route to that destination");
        } else {
          toast.error("Couldn't calculate distance to that destination");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
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
