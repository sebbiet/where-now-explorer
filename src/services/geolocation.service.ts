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
  UNKNOWN = 'UNKNOWN'
}

export class GeolocationError extends Error {
  constructor(
    public code: GeolocationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'GeolocationError';
  }
}

export class GeolocationService {
  private static readonly DEFAULT_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  static async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new GeolocationError(
          GeolocationErrorCode.UNSUPPORTED,
          'Geolocation is not supported by your browser'
        ));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            },
            timestamp: position.timestamp
          });
        },
        (error) => {
          const errorMap: Record<number, { code: GeolocationErrorCode; message: string }> = {
            [error.PERMISSION_DENIED]: {
              code: GeolocationErrorCode.PERMISSION_DENIED,
              message: 'Location access was denied. Please enable location permissions in your browser settings.'
            },
            [error.POSITION_UNAVAILABLE]: {
              code: GeolocationErrorCode.POSITION_UNAVAILABLE,
              message: 'Location information is unavailable. Please check your device\'s location settings.'
            },
            [error.TIMEOUT]: {
              code: GeolocationErrorCode.TIMEOUT,
              message: 'Location request timed out. Please try again.'
            }
          };

          const mappedError = errorMap[error.code] || {
            code: GeolocationErrorCode.UNKNOWN,
            message: `An unknown error occurred: ${error.message}`
          };

          reject(new GeolocationError(mappedError.code, mappedError.message));
        },
        opts
      );
    });
  }

  static watchPosition(
    successCallback: (position: GeolocationPosition) => void,
    errorCallback?: (error: GeolocationError) => void,
    options?: PositionOptions
  ): number {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    if (!navigator.geolocation) {
      errorCallback?.(new GeolocationError(
        GeolocationErrorCode.UNSUPPORTED,
        'Geolocation is not supported by your browser'
      ));
      return -1;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        successCallback({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          },
          timestamp: position.timestamp
        });
      },
      (error) => {
        if (errorCallback) {
          const errorMap: Record<number, { code: GeolocationErrorCode; message: string }> = {
            [error.PERMISSION_DENIED]: {
              code: GeolocationErrorCode.PERMISSION_DENIED,
              message: 'Location access was denied. Please enable location permissions in your browser settings.'
            },
            [error.POSITION_UNAVAILABLE]: {
              code: GeolocationErrorCode.POSITION_UNAVAILABLE,
              message: 'Location information is unavailable. Please check your device\'s location settings.'
            },
            [error.TIMEOUT]: {
              code: GeolocationErrorCode.TIMEOUT,
              message: 'Location request timed out. Please try again.'
            }
          };

          const mappedError = errorMap[error.code] || {
            code: GeolocationErrorCode.UNKNOWN,
            message: `An unknown error occurred: ${error.message}`
          };

          errorCallback(new GeolocationError(mappedError.code, mappedError.message));
        }
      },
      opts
    );
  }

  static clearWatch(watchId: number): void {
    if (navigator.geolocation && watchId >= 0) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}