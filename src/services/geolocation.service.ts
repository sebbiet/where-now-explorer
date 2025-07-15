import { BaseService, ServiceError } from './base.service';
import { analytics } from './analytics.service';
import { getErrorMessage } from '@/utils/errorMessages';

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export enum GeolocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED = 'UNSUPPORTED',
  UNKNOWN = 'UNKNOWN',
}

export class GeolocationError extends ServiceError {
  constructor(
    public code: GeolocationErrorCode,
    message: string,
    originalError?: Error
  ) {
    super(message, code, 400, originalError);
    this.name = 'GeolocationError';
  }
}

class GeolocationServiceImpl extends BaseService {
  private static readonly DEFAULT_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  constructor() {
    super('geolocation', {
      rateLimitKey: 'geolocation',
      maxRetries: 2,
      timeout: 15000,
      enableMonitoring: true,
      enableDeduplication: false, // Geolocation typically shouldn't be deduplicated
      enablePerformanceTracking: true,
    });
  }

  async getCurrentPosition(
    options?: PositionOptions
  ): Promise<GeolocationPosition> {
    try {
      const opts = { ...GeolocationServiceImpl.DEFAULT_OPTIONS, ...options };

      return new Promise((resolve, reject) => {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          const error = new GeolocationError(
            GeolocationErrorCode.UNSUPPORTED,
            getErrorMessage('LOCATION', 'NOT_SUPPORTED')
          );

          analytics.track('location_permission_error', {
            error_type: 'unsupported',
            error_message: error.message,
          });

          reject(error);
          return;
        }

        // Execute geolocation request
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Track successful location permission
            analytics.trackLocationPermission(true);

            const result: GeolocationPosition = {
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            };

            resolve(result);
          },
          (error) => {
            const transformedError = this.transformGeolocationError(error);

            // Track the error
            analytics.track('location_permission_error', {
              error_type: transformedError.code,
              error_message: transformedError.message,
            });

            reject(transformedError);
          },
          opts
        );
      });
    } catch (error) {
      this.handleError(error, 'getCurrentPosition');
    }
  }

  async watchPosition(
    onPosition: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options?: PositionOptions
  ): Promise<number> {
    try {
      const opts = { ...GeolocationServiceImpl.DEFAULT_OPTIONS, ...options };

      if (!navigator.geolocation) {
        const error = new GeolocationError(
          GeolocationErrorCode.UNSUPPORTED,
          getErrorMessage('LOCATION', 'NOT_SUPPORTED')
        );
        onError(error);
        return -1;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const result: GeolocationPosition = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          };

          onPosition(result);
        },
        (error) => {
          const transformedError = this.transformGeolocationError(error);
          onError(transformedError);
        },
        opts
      );

      return watchId;
    } catch (error) {
      this.handleError(error, 'watchPosition');
    }
  }

  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Transform native geolocation errors to our custom error format
   */
  private transformGeolocationError(
    error: GeolocationPositionError
  ): GeolocationError {
    const errorMap: Record<
      number,
      { code: GeolocationErrorCode; message: string }
    > = {
      [error.PERMISSION_DENIED]: {
        code: GeolocationErrorCode.PERMISSION_DENIED,
        message: getErrorMessage('LOCATION', 'PERMISSION_DENIED'),
      },
      [error.POSITION_UNAVAILABLE]: {
        code: GeolocationErrorCode.POSITION_UNAVAILABLE,
        message: getErrorMessage('LOCATION', 'UNAVAILABLE'),
      },
      [error.TIMEOUT]: {
        code: GeolocationErrorCode.TIMEOUT,
        message: getErrorMessage('LOCATION', 'TIMEOUT'),
      },
    };

    const errorInfo = errorMap[error.code] || {
      code: GeolocationErrorCode.UNKNOWN,
      message: getErrorMessage('LOCATION', 'UNAVAILABLE'),
    };

    return new GeolocationError(errorInfo.code, errorInfo.message, error);
  }
}

// Create singleton instance
const geolocationServiceInstance = new GeolocationServiceImpl();

// Export static-like interface for backward compatibility
export class GeolocationService {
  static async getCurrentPosition(
    options?: PositionOptions
  ): Promise<GeolocationPosition> {
    return geolocationServiceInstance.getCurrentPosition(options);
  }

  static async watchPosition(
    onPosition: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options?: PositionOptions
  ): Promise<number> {
    return geolocationServiceInstance.watchPosition(
      onPosition,
      onError,
      options
    );
  }

  static clearWatch(watchId: number): void {
    return geolocationServiceInstance.clearWatch(watchId);
  }
}
