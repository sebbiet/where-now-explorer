import React, { useState, memo } from 'react';
import DestinationResult from '@/components/DestinationResult';
import { useLocation } from '@/contexts/LocationContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDestinationHistory } from '@/hooks/useDestinationHistory';
import { GeocodingService, GeocodeResult } from '@/services/geocoding.service';
import { RoutingService, RoutingError } from '@/services/routing.service';
import { analytics } from '@/services/analytics.service';
import { createErrorToast } from '@/utils/errorHandling';
import { DestinationSearch } from './destination/DestinationSearch';

interface DestinationData {
  name: string;
  distance: string;
  duration: string;
}

const DestinationSection = () => {
  const { locationData } = useLocation();
  const { preferences } = usePreferences();
  const { addToHistory } = useDestinationHistory();
  const [destinationData, setDestinationData] =
    useState<DestinationData | null>(null);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);

  const handleDestinationSelect = async (place: GeocodeResult) => {
    if (!locationData.latitude || !locationData.longitude) {
      createErrorToast(
        "Can't calculate distance without your current location"
      );
      return;
    }

    setIsLoadingDestination(true);
    analytics.trackDestinationSuggestionSelected({
      destination_query: place.display_name,
      destination_type: place.type || 'unknown',
    });

    try {
      const destLat = parseFloat(place.lat);
      const destLon = parseFloat(place.lon);
      const destName = GeocodingService.extractPlaceName(place);

      const routeResult = await RoutingService.calculateRoute(
        { latitude: locationData.latitude, longitude: locationData.longitude },
        { latitude: destLat, longitude: destLon }
      );

      const result = {
        name: destName,
        distance: routeResult.formattedDistance,
        duration: routeResult.formattedDuration,
      };

      setDestinationData(result);

      analytics.trackDestinationCalculated({
        distance_km: routeResult.distance / 1000,
        duration_minutes: Math.round(routeResult.duration / 60),
        destination_type: place.type || 'unknown',
        destination_query: place.display_name,
      });

      if (preferences.saveDestinationHistory) {
        addToHistory({
          name: destName,
          displayName: place.display_name,
          distance: routeResult.formattedDistance,
          duration: routeResult.formattedDuration,
        });
      }
    } catch (error) {
      console.error('[DestinationSection] Error calculating distance:', error);

      if (error instanceof RoutingError) {
        analytics.trackDestinationCalculationError({
          error_type: 'routing_error',
          error_message: error.message,
          destination_query: place.display_name,
        });

        if (error.code === 'NO_ROUTE') {
          createErrorToast('🚗 No route found', {
            description:
              "We couldn't find a driving route to that destination. It might be on an island or inaccessible by car.",
          });
        } else {
          createErrorToast("📏 Couldn't calculate distance", {
            description: 'There was a problem calculating the route.',
          });
        }
      } else {
        analytics.trackDestinationCalculationError({
          error_type: 'unknown_error',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          destination_query: place.display_name,
        });

        createErrorToast('😕 Something went wrong', {
          description: "Don't worry, let's try again!",
        });
      }
    } finally {
      setIsLoadingDestination(false);
    }
  };

  return (
    <div className="w-full">
      <DestinationSearch
        onDestinationSelect={handleDestinationSelect}
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
