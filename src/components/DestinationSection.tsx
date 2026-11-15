import React, { useState, memo, useEffect, useRef, useCallback } from 'react';
import DestinationResult from '@/components/DestinationResult';
import { useLocation } from '@/contexts/LocationContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDestinationHistory } from '@/hooks/useDestinationHistory';
import { GeocodingService, GeocodeResult } from '@/services/geocoding.service';
import { RoutingService, RoutingError } from '@/services/routing.service';
import { analytics } from '@/services/analytics.service';
import { createErrorToast } from '@/utils/errorHandling';
import { coordinatesForRequest } from '@/utils/privacy';
import { DestinationSearch } from './destination/DestinationSearch';

interface DestinationData {
  name: string;
  distance: string;
  duration: string;
  arrivalTime: string;
}

const DestinationSection = () => {
  const { locationData } = useLocation();
  const { preferences } = usePreferences();
  const { addToHistory } = useDestinationHistory();
  const [destinationData, setDestinationData] =
    useState<DestinationData | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(
    null
  );
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
  const lastCalculationAt = useRef(0);
  const selectedPlaceRef = useRef<GeocodeResult | null>(null);
  selectedPlaceRef.current = selectedPlace;

  const calculateForPlace = useCallback(
    async (place: GeocodeResult, options: { recordHistory: boolean }) => {
      if (locationData.latitude == null || locationData.longitude == null) {
        createErrorToast(
          "Can't calculate distance without your current location"
        );
        return;
      }

      setIsLoadingDestination(true);
      try {
        const destLat = parseFloat(place.lat);
        const destLon = parseFloat(place.lon);
        const destName = GeocodingService.extractPlaceName(place);
        const origin = coordinatesForRequest(
          locationData.latitude,
          locationData.longitude,
          {
            privacyMode: preferences.privacyMode,
            hideExactCoordinates: preferences.hideExactCoordinates,
          }
        );

        const routeResult = await RoutingService.calculateRoute({
          origin,
          destination: { latitude: destLat, longitude: destLon },
        });

        const arrivalTime = RoutingService.formatArrivalTime(
          RoutingService.estimateArrivalTime(routeResult.durationMinutes)
        );

        const result = {
          name: destName,
          distance: routeResult.formattedDistance,
          duration: routeResult.formattedDuration,
          arrivalTime,
        };

        setDestinationData(result);
        lastCalculationAt.current = Date.now();

        analytics.trackDestinationCalculated({
          distance_km: routeResult.distanceKm,
          duration_minutes: routeResult.durationMinutes,
          destination_type: place.type || 'unknown',
          destination_query: place.display_name,
        });

        if (options.recordHistory && preferences.saveDestinationHistory) {
          addToHistory({
            name: destName,
            displayName: place.display_name,
            distance: routeResult.formattedDistance,
            duration: routeResult.formattedDuration,
            lat: place.lat,
            lon: place.lon,
          });
        }
      } catch (error) {
        console.error(
          '[DestinationSection] Error calculating distance:',
          error
        );

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
    },
    [
      addToHistory,
      locationData.latitude,
      locationData.longitude,
      preferences.hideExactCoordinates,
      preferences.privacyMode,
      preferences.saveDestinationHistory,
    ]
  );

  const handleDestinationSelect = async (place: GeocodeResult) => {
    setSelectedPlace(place);
    analytics.trackDestinationSuggestionSelected({
      destination_query: place.display_name,
      destination_type: place.type || 'unknown',
    });
    await calculateForPlace(place, { recordHistory: true });
  };

  // Recalculate as the current location updates, throttled so we do not
  // hit the public routing service on every GPS tick.
  useEffect(() => {
    const place = selectedPlaceRef.current;
    if (!place || locationData.latitude == null) {
      return;
    }
    const minIntervalMs = Math.max(
      15000,
      (preferences.autoRefreshInterval || 60) * 1000
    );
    if (Date.now() - lastCalculationAt.current < minIntervalMs) {
      return;
    }
    void calculateForPlace(place, { recordHistory: false });
  }, [
    calculateForPlace,
    locationData.latitude,
    locationData.longitude,
    preferences.autoRefreshInterval,
  ]);

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
          arrivalTime={destinationData.arrivalTime}
        />
      )}
    </div>
  );
};

export default memo(DestinationSection);
