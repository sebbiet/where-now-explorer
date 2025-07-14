import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { GeolocationService, GeolocationError, GeolocationErrorCode } from '@/services/geolocation.service';

interface UseGeolocationOptions {
  onSuccess?: (coords: GeolocationCoordinates) => void;
  onError?: (error: GeolocationError) => void;
}

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null);
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
      
      // Handle different error types with user-friendly messages
      switch (geoError.code) {
        case GeolocationErrorCode.PERMISSION_DENIED:
          toast.error(
            "📍 Location access denied",
            {
              description: "Click the location icon in your browser's address bar to enable permissions.",
              action: {
                label: "Learn how",
                onClick: () => {
                  alert("1. Look for a location icon in your browser's address bar\n2. Click it and select 'Allow'\n3. Refresh the page");
                }
              }
            }
          );
          break;
        case GeolocationErrorCode.POSITION_UNAVAILABLE:
          toast.error(
            "📍 Can't find your location",
            {
              description: "Please check if location services are enabled on your device.",
              action: {
                label: "Try again",
                onClick: () => getCurrentPosition()
              }
            }
          );
          break;
        case GeolocationErrorCode.TIMEOUT:
          toast.error(
            "📍 Location request timed out",
            {
              description: "This is taking longer than usual.",
              action: {
                label: "Retry",
                onClick: () => getCurrentPosition()
              }
            }
          );
          break;
        case GeolocationErrorCode.UNSUPPORTED:
          toast.error("📍 Your browser doesn't support location services. Please try Chrome, Firefox, or Safari.");
          break;
        default:
          toast.error(`📍 ${geoError.message}`, {
            action: {
              label: "Retry",
              onClick: () => getCurrentPosition()
            }
          });
      }
      
      throw geoError;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const watchPosition = useCallback((
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback,
    options?: PositionOptions
  ) => {
    return GeolocationService.watchPosition(successCallback, errorCallback, options);
  }, []);

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
    isSupported: GeolocationService.isSupported()
  };
};