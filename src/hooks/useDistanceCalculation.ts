import { useState, useCallback } from 'react';
import { RoutingService, RouteResult } from '@/services/routing.service';
import { GeocodeResult } from '@/services/geocoding.service';
import { toast } from 'sonner';
import { toastError, createErrorToast } from '@/utils/errorHandling';

interface UseDistanceCalculationOptions {
  onSuccess?: (result: RouteResult) => void;
  onError?: (error: Error) => void;
}

export const useDistanceCalculation = (
  options?: UseDistanceCalculationOptions
) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const calculateDistance = useCallback(
    async (fromLat: number, fromLng: number, destination: GeocodeResult) => {
      setIsCalculating(true);
      setError(null);
      setRouteResult(null);

      try {
        const result = await RoutingService.calculateRoute(
          fromLat,
          fromLng,
          parseFloat(destination.lat),
          parseFloat(destination.lon)
        );

        setRouteResult(result);
        options?.onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);

        // Show user-friendly error messages
        if (error.message.includes('rate limit')) {
          toastError.network(() =>
            calculateDistance(fromLat, fromLng, destination)
          );
        } else if (error.message.includes('Could not find')) {
          createErrorToast(
            "We couldn't find a route to this destination. Try a different location."
          );
        } else {
          createErrorToast('Failed to calculate route. Please try again.', {
            action: {
              label: 'Retry',
              onClick: () => calculateDistance(fromLat, fromLng, destination),
            },
          });
        }

        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [options]
  );

  const clearRoute = useCallback(() => {
    setRouteResult(null);
    setError(null);
  }, []);

  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }, []);

  return {
    calculateDistance,
    clearRoute,
    formatDistance,
    formatDuration,
    isCalculating,
    routeResult,
    error,
  };
};
