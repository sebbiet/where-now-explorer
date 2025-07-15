import { toast } from '@/hooks/use-toast';
import {
  GeolocationError,
  GeolocationErrorCode,
} from '@/services/geolocation.service';
import { GeocodingError } from '@/services/geocoding.service';

export interface ErrorHandlerOptions {
  onRetry?: () => void;
  context?: string;
  showToast?: boolean;
}

export interface ToastActionOptions {
  label: string;
  onClick: () => void;
}

/**
 * Centralized handler for GeolocationError instances
 */
export const handleGeolocationError = (
  error: GeolocationError,
  options: ErrorHandlerOptions = {}
): void => {
  const { onRetry, showToast = true } = options;

  if (!showToast) return;

  switch (error.code) {
    case GeolocationErrorCode.PERMISSION_DENIED:
      toast.error('📍 Location access denied', {
        description:
          "Click the location icon in your browser's address bar to enable permissions.",
        action: {
          label: 'Learn how',
          onClick: () => {
            alert(
              "1. Look for a location icon in your browser's address bar\n2. Click it and select 'Allow'\n3. Refresh the page"
            );
          },
        },
      });
      break;

    case GeolocationErrorCode.POSITION_UNAVAILABLE:
      toast.error("📍 Can't find your location", {
        description:
          'Please check if location services are enabled on your device.',
        action: onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined,
      });
      break;

    case GeolocationErrorCode.TIMEOUT:
      toast.error('📍 Location request timed out', {
        description: 'This is taking longer than usual.',
        action: onRetry
          ? {
              label: 'Retry',
              onClick: onRetry,
            }
          : undefined,
      });
      break;

    case GeolocationErrorCode.UNSUPPORTED:
      toast.error(
        "📍 Your browser doesn't support location services. Please try Chrome, Firefox, or Safari."
      );
      break;

    default:
      toast.error(`📍 ${error.message}`, {
        action: onRetry
          ? {
              label: 'Retry',
              onClick: onRetry,
            }
          : undefined,
      });
  }
};

/**
 * Handler for GeocodingError instances
 */
export const handleGeocodingError = (
  error: GeocodingError,
  options: ErrorHandlerOptions = {}
): void => {
  const { onRetry, showToast = true } = options;

  if (!showToast) return;

  toast.error("📍 Couldn't get your address. Please try again later.", {
    action: onRetry
      ? {
          label: 'Retry',
          onClick: onRetry,
        }
      : undefined,
  });
};

/**
 * Generic error handler that delegates to specific handlers based on error type
 */
export const handleLocationError = (
  error: unknown,
  options: ErrorHandlerOptions = {}
): void => {
  const { onRetry, showToast = true } = options;

  if (error instanceof GeolocationError) {
    handleGeolocationError(error, options);
  } else if (error instanceof GeocodingError) {
    handleGeocodingError(error, options);
  } else {
    if (showToast) {
      toast.error(
        "📍 Couldn't find your location. Please make sure location services are enabled.",
        {
          action: onRetry
            ? {
                label: 'Retry',
                onClick: onRetry,
              }
            : undefined,
        }
      );
    }
  }
};

/**
 * Standardized toast error patterns for common scenarios
 */
export const createErrorToast = (
  message: string,
  options: {
    description?: string;
    action?: ToastActionOptions;
  } = {}
): void => {
  toast.error(message, {
    description: options.description,
    action: options.action,
  });
};

/**
 * Common toast patterns for specific error types
 */
export const toastError = {
  location: (onRetry?: () => void) =>
    createErrorToast('📍 Location access denied', {
      description:
        "Click the location icon in your browser's address bar to enable permissions.",
      action: onRetry
        ? { label: 'Retry', onClick: onRetry }
        : {
            label: 'Learn how',
            onClick: () => {
              alert(
                "1. Look for a location icon in your browser's address bar\n2. Click it and select 'Allow'\n3. Refresh the page"
              );
            },
          },
    }),

  network: (onRetry?: () => void) =>
    createErrorToast('🌐 Network error occurred', {
      description: 'Please check your internet connection and try again.',
      action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    }),

  geocoding: (onRetry?: () => void) =>
    createErrorToast("📍 Couldn't get address information", {
      description: 'Please try again or enter your destination manually.',
      action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    }),

  timeout: (onRetry?: () => void) =>
    createErrorToast('⏱️ Request timed out', {
      description: 'This is taking longer than usual.',
      action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    }),

  permission: () =>
    createErrorToast('🔒 Permission required', {
      description: 'Please grant the necessary permissions to continue.',
      action: {
        label: 'Learn how',
        onClick: () => {
          alert(
            "1. Look for permission icons in your browser's address bar\n2. Click and select 'Allow'\n3. Refresh the page if needed"
          );
        },
      },
    }),
};
