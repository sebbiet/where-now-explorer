/**
 * Standardized Error Messages Utility
 * Provides consistent error message formatting across the application
 */

export interface ErrorContext {
  service?: string;
  operation?: string;
  field?: string;
  timeout?: number;
  resetTime?: number;
  statusCode?: number;
}

export interface ErrorMessageTemplate {
  user: string;
  technical: string;
}

/**
 * Standard error message templates organized by category
 */
export const ERROR_MESSAGES = {
  // Network-related errors
  NETWORK: {
    CONNECTION_FAILED: {
      user: 'Unable to connect to the service. Please check your internet connection and try again.',
      technical: 'Network connection failed',
    },
    TIMEOUT: {
      user: (context: ErrorContext) =>
        `Request timed out after ${Math.round((context.timeout || 0) / 1000)} seconds. Please try again.`,
      technical: (context: ErrorContext) =>
        `Request timeout after ${context.timeout}ms`,
    },
    RATE_LIMITED: {
      user: (context: ErrorContext) =>
        `Too many requests. Please wait ${Math.ceil((context.resetTime || 0) / 1000)} seconds before trying again.`,
      technical: 'Rate limit exceeded',
    },
    HTTP_ERROR: {
      user: (context: ErrorContext) => {
        const statusMessages: Record<number, string> = {
          400: 'Invalid request. Please check your input and try again.',
          401: 'Authentication required. Please check your credentials.',
          403: 'Access denied. You do not have permission to perform this action.',
          404: 'The requested resource was not found.',
          408: 'Request timed out. Please try again.',
          429: 'Too many requests. Please slow down and try again.',
          500: 'Server error. Please try again in a few moments.',
          502: 'Service temporarily unavailable. Please try again later.',
          503: 'Service unavailable. Please try again later.',
          504: 'Server response timed out. Please try again.',
        };
        return (
          statusMessages[context.statusCode || 500] ||
          `Service error (${context.statusCode}). Please try again.`
        );
      },
      technical: (context: ErrorContext) => `HTTP ${context.statusCode} error`,
    },
  },

  // Validation-related errors
  VALIDATION: {
    REQUIRED_FIELD: {
      user: (context: ErrorContext) =>
        `${context.field || 'This field'} is required.`,
      technical: (context: ErrorContext) =>
        `Missing required field: ${context.field}`,
    },
    INVALID_FORMAT: {
      user: (context: ErrorContext) =>
        `Please enter a valid ${context.field || 'value'}.`,
      technical: (context: ErrorContext) =>
        `Invalid format for field: ${context.field}`,
    },
    OUT_OF_RANGE: {
      user: (context: ErrorContext) =>
        `${context.field || 'Value'} is outside the allowed range.`,
      technical: (context: ErrorContext) =>
        `Value out of range for field: ${context.field}`,
    },
    TOO_SHORT: {
      user: (context: ErrorContext) =>
        `${context.field || 'Input'} must be at least 2 characters long.`,
      technical: (context: ErrorContext) => `Field too short: ${context.field}`,
    },
    TOO_LONG: {
      user: (context: ErrorContext) =>
        `${context.field || 'Input'} is too long. Please shorten it.`,
      technical: (context: ErrorContext) => `Field too long: ${context.field}`,
    },
    INVALID_CHARACTERS: {
      user: 'Input contains invalid characters. Please use only letters, numbers, and common punctuation.',
      technical: 'Invalid characters detected in input',
    },
  },

  // Location-related errors
  LOCATION: {
    PERMISSION_DENIED: {
      user: 'Location access was denied. Please enable location permissions in your browser settings to use this feature.',
      technical: 'Geolocation permission denied',
    },
    UNAVAILABLE: {
      user: 'Location services are not available on this device. Please try again or enter your location manually.',
      technical: 'Geolocation position unavailable',
    },
    TIMEOUT: {
      user: 'Unable to get your location. Please try again or enter your location manually.',
      technical: 'Geolocation request timeout',
    },
    NOT_SUPPORTED: {
      user: 'Location services are not supported by your browser. Please enter your location manually.',
      technical: 'Geolocation not supported',
    },
  },

  // Service-specific errors
  GEOCODING: {
    NO_RESULTS: {
      user: 'No results found for that location. Please try a different search term.',
      technical: 'Geocoding returned no results',
    },
    INVALID_RESPONSE: {
      user: 'Unable to process location data. Please try again.',
      technical: 'Invalid geocoding service response',
    },
    SERVICE_UNAVAILABLE: {
      user: 'Location search service is temporarily unavailable. Please try again later.',
      technical: 'Geocoding service unavailable',
    },
  },

  ROUTING: {
    NO_ROUTE_FOUND: {
      user: 'No route found to that destination. Please try a different location.',
      technical: 'Routing service found no viable route',
    },
    INVALID_COORDINATES: {
      user: 'Invalid location coordinates. Please try a different destination.',
      technical: 'Invalid coordinates provided to routing service',
    },
  },

  // Generic service errors
  SERVICE: {
    UNKNOWN_ERROR: {
      user: 'Something went wrong. Please try again in a few moments.',
      technical: 'Unknown service error occurred',
    },
    INITIALIZATION_FAILED: {
      user: 'Unable to start the service. Please refresh the page and try again.',
      technical: 'Service initialization failed',
    },
    OPERATION_FAILED: {
      user: (context: ErrorContext) =>
        `Unable to complete ${context.operation || 'the operation'}. Please try again.`,
      technical: (context: ErrorContext) =>
        `${context.service || 'Service'} ${context.operation || 'operation'} failed`,
    },
  },

  // Storage-related errors
  STORAGE: {
    QUOTA_EXCEEDED: {
      user: 'Storage space is full. Please clear some data and try again.',
      technical: 'Storage quota exceeded',
    },
    ACCESS_DENIED: {
      user: 'Unable to save data. Please check your browser settings.',
      technical: 'Storage access denied',
    },
    INVALID_DATA: {
      user: 'Unable to save data due to invalid format.',
      technical: 'Invalid data format for storage',
    },
  },
} as const;

/**
 * Get a standardized error message
 */
export function getErrorMessage(
  category: keyof typeof ERROR_MESSAGES,
  type: string,
  context: ErrorContext = {},
  messageType: 'user' | 'technical' = 'user'
): string {
  const errorCategory = ERROR_MESSAGES[category];
  if (!errorCategory) {
    return messageType === 'user'
      ? 'An unexpected error occurred. Please try again.'
      : 'Unknown error category';
  }

  const errorTemplate = errorCategory[type as keyof typeof errorCategory];
  if (!errorTemplate) {
    return messageType === 'user'
      ? 'An unexpected error occurred. Please try again.'
      : `Unknown error type: ${type}`;
  }

  const message = errorTemplate[messageType];
  if (typeof message === 'function') {
    return message(context);
  }

  return message;
}

/**
 * Format an error for logging with consistent structure
 */
export function formatErrorForLogging(
  error: Error,
  context: ErrorContext = {}
): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    service: context.service,
    operation: context.operation,
    statusCode: context.statusCode,
    timestamp: new Date().toISOString(),
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };
}

/**
 * Create a user-friendly error message from any error
 */
export function createUserFriendlyMessage(
  error: unknown,
  context: ErrorContext = {}
): string {
  // Handle known error types
  if (error && typeof error === 'object' && 'name' in error) {
    if (error.name === 'GeolocationError' && 'code' in error) {
      switch (error.code) {
        case 1:
          return getErrorMessage('LOCATION', 'PERMISSION_DENIED', context);
        case 2:
          return getErrorMessage('LOCATION', 'UNAVAILABLE', context);
        case 3:
          return getErrorMessage('LOCATION', 'TIMEOUT', context);
        default:
          return getErrorMessage('LOCATION', 'UNAVAILABLE', context);
      }
    }

    if (error.name === 'NetworkError' && 'statusCode' in error) {
      return getErrorMessage('NETWORK', 'HTTP_ERROR', {
        ...context,
        statusCode: (error.statusCode as number) || 500,
      });
    }

    if (error.name === 'ValidationError') {
      return getErrorMessage('VALIDATION', 'INVALID_FORMAT', {
        ...context,
        field:
          ('field' in error ? (error.field as string) : undefined) || 'input',
      });
    }

    if (error.name === 'TimeoutError' && 'timeout' in error) {
      return getErrorMessage('NETWORK', 'TIMEOUT', {
        ...context,
        timeout: (error.timeout as number) || 10000,
      });
    }

    if (error.name === 'RateLimitError' && 'resetTime' in error) {
      return getErrorMessage('NETWORK', 'RATE_LIMITED', {
        ...context,
        resetTime: (error.resetTime as number) || 60000,
      });
    }
  }

  // Fallback for unknown errors
  return getErrorMessage('SERVICE', 'UNKNOWN_ERROR', context);
}
