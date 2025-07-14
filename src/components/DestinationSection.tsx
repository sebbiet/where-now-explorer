
import React, { useState, memo } from 'react';
import DestinationInput from '@/components/DestinationInput';
import DestinationResult from '@/components/DestinationResult';
import { useLocation } from '@/contexts/LocationContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDestinationHistory } from '@/hooks/useDestinationHistory';
import { toast } from "sonner";
import { GeocodingService, GeocodingError } from '@/services/geocoding.service';
import { RoutingService, RoutingError } from '@/services/routing.service';
import { analytics } from '@/services/analytics.service';

interface DestinationData {
  name: string;
  distance: string;
  duration: string;
}

const DestinationSection = () => {
  const { locationData } = useLocation();
  const { preferences } = usePreferences();
  const { addToHistory } = useDestinationHistory();
  const [destinationData, setDestinationData] = useState<DestinationData | null>(null);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);

  // Calculate distance to destination
  const calculateDistance = async (destination: string) => {
    if (!locationData.latitude || !locationData.longitude) {
      toast.error("Can't calculate distance without your current location");
      return;
    }

    setIsLoadingDestination(true);
    
    // Track destination search started
    analytics.trackDestinationSearchStarted(destination.length);
    
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
      
      // Track that a destination was found and selected
      analytics.trackDestinationSuggestionSelected({
        destination_query: destination,
        destination_type: place.type || 'unknown'
      });
      
      // Calculate route
      const routeResult = await RoutingService.calculateRoute(
        { latitude: locationData.latitude, longitude: locationData.longitude },
        { latitude: destLat, longitude: destLon }
      );
      
      const result = {
        name: destName,
        distance: routeResult.formattedDistance,
        duration: routeResult.formattedDuration
      };
      
      setDestinationData(result);
      
      // Track successful destination calculation
      analytics.trackDestinationCalculated({
        distance_km: routeResult.distance / 1000,
        duration_minutes: Math.round(routeResult.duration / 60),
        destination_type: place.type || 'unknown',
        destination_query: destination
      });
      
      // Save to history if enabled
      if (preferences.saveDestinationHistory) {
        addToHistory({
          name: destName,
          displayName: place.display_name,
          distance: routeResult.formattedDistance,
          duration: routeResult.formattedDuration
        });
      }
      
    } catch (error) {
      console.error("[DestinationSection] Error calculating distance:", error);
      
      if (error instanceof GeocodingError) {
        // Track geocoding error
        analytics.trackDestinationCalculationError({
          error_type: 'geocoding_error',
          error_message: error.message,
          destination_query: destination
        });
        
        toast.error(
          "🗺️ Couldn't find that place",
          {
            description: "Try a more specific name or address",
            action: {
              label: "Clear & retry",
              onClick: () => {
                // Clear the destination data to start fresh
                setDestinationData(null);
              }
            }
          }
        );
      } else if (error instanceof RoutingError) {
        // Track routing error
        analytics.trackDestinationCalculationError({
          error_type: 'routing_error',
          error_message: error.message,
          destination_query: destination
        });
        
        if (error.code === 'NO_ROUTE') {
          toast.error(
            "🚗 No route found",
            {
              description: "We couldn't find a driving route to that destination. It might be on an island or inaccessible by car.",
              duration: 5000
            }
          );
        } else {
          toast.error(
            "📏 Couldn't calculate distance",
            {
              description: "There was a problem calculating the route.",
              action: {
                label: "Try again",
                onClick: () => calculateDistance(destination)
              }
            }
          );
        }
      } else {
        // Track unknown error
        analytics.trackDestinationCalculationError({
          error_type: 'unknown_error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          destination_query: destination
        });
        
        toast.error(
          "😕 Something went wrong",
          {
            description: "Don't worry, let's try again!",
            action: {
              label: "Retry",
              onClick: () => calculateDistance(destination)
            }
          }
        );
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
        userCountry={locationData.country}
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
