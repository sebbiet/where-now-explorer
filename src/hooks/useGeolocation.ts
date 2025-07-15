import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  GeolocationService,
  GeolocationError,
  GeolocationErrorCode,
} from '@/services/geolocation.service';
import { handleGeolocationError } from '@/utils/errorHandling';

interface UseGeolocationOptions {
  onSuccess?: (coords: GeolocationCoordinates) => void;
  onError?: (error: GeolocationError) => void;
}

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(
    null
  );
  const [error, setError] = useState<GeolocationError | null>(null);

  const getCurrentPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await GeolocationService.getCurrentPosition();
      setCoordinates(position.coords);
      options?.onSuccess?.(position.coords);
      return position.coords;
    } catch (err) {
      const geoError = err as GeolocationError;
      setError(geoError);
      options?.onError?.(geoError);

      // Use centralized error handling
      handleGeolocationError(geoError, {
        onRetry: () => getCurrentPosition(),
      });

      throw geoError;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const watchPosition = useCallback(
    (
      successCallback: PositionCallback,
      errorCallback?: PositionErrorCallback,
      options?: PositionOptions
    ) => {
      return GeolocationService.watchPosition(
        successCallback,
        errorCallback,
        options
      );
    },
    []
  );

  const clearWatch = useCallback((watchId: number) => {
    GeolocationService.clearWatch(watchId);
  }, []);

  return {
    getCurrentPosition,
    watchPosition,
    clearWatch,
    coordinates,
    isLoading,
    error,
    isSupported: GeolocationService.isSupported(),
  };
};
