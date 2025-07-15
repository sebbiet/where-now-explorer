/**
 * Privacy Utilities
 * Functions to protect user privacy by obfuscating sensitive data
 */

// Location data interface for type safety
export interface LocationData {
  latitude?: number;
  longitude?: number;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  [key: string]: unknown;
}

/**
 * Obfuscate coordinates by reducing precision
 */
export function obfuscateCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 2
): { latitude: number; longitude: number } {
  const factor = Math.pow(10, precision);
  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor,
  };
}

/**
 * Add noise to coordinates while keeping them in the general area
 */
export function addLocationNoise(
  latitude: number,
  longitude: number,
  radiusMeters: number = 500
): { latitude: number; longitude: number } {
  // Convert radius to degrees (approximate)
  const radiusDegrees = radiusMeters / 111000; // 1 degree ≈ 111km

  // Generate random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDegrees;

  // Calculate offset
  const deltaLat = distance * Math.cos(angle);
  const deltaLng =
    (distance * Math.sin(angle)) / Math.cos((latitude * Math.PI) / 180);

  return {
    latitude: latitude + deltaLat,
    longitude: longitude + deltaLng,
  };
}

/**
 * Get approximate location string without exact coordinates
 */
export function getApproximateLocationString(
  locationData: LocationData
): string {
  const parts = [];

  if (locationData.suburb) {
    parts.push(locationData.suburb);
  }
  if (locationData.city) {
    parts.push(locationData.city);
  }
  if (locationData.state) {
    parts.push(locationData.state);
  }
  if (locationData.country) {
    parts.push(locationData.country);
  }

  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

/**
 * Sanitize location data based on privacy preferences
 */
export function sanitizeLocationData(
  locationData: LocationData,
  privacyMode: boolean,
  hideExactCoordinates: boolean
): LocationData {
  const sanitized = { ...locationData };

  if (privacyMode) {
    // In privacy mode, remove or obfuscate sensitive data
    delete sanitized.street;

    // Obfuscate coordinates significantly
    if (sanitized.latitude && sanitized.longitude) {
      const obfuscated = addLocationNoise(
        sanitized.latitude,
        sanitized.longitude,
        1000 // 1km radius
      );
      sanitized.latitude = obfuscated.latitude;
      sanitized.longitude = obfuscated.longitude;
    }
  } else if (hideExactCoordinates) {
    // Just reduce coordinate precision
    if (sanitized.latitude && sanitized.longitude) {
      const obfuscated = obfuscateCoordinates(
        sanitized.latitude,
        sanitized.longitude,
        3 // 3 decimal places ≈ 100m accuracy
      );
      sanitized.latitude = obfuscated.latitude;
      sanitized.longitude = obfuscated.longitude;
    }
  }

  return sanitized;
}

/**
 * Check if a string contains sensitive information
 */
export function containsSensitiveInfo(text: string): boolean {
  const sensitivePatterns = [
    /\b\d{1,5}\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/i, // Street addresses
    /\b\d{5}(?:-\d{4})?\b/, // Postal codes
    /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  ];

  return sensitivePatterns.some((pattern) => pattern.test(text));
}

/**
 * Remove sensitive information from text
 */
export function removeSensitiveInfo(text: string): string {
  let cleaned = text;

  // Replace street addresses with generic location
  cleaned = cleaned.replace(
    /\b\d{1,5}\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/gi,
    '[Street Address]'
  );

  // Replace postal codes
  cleaned = cleaned.replace(/\b\d{5}(?:-\d{4})?\b/g, '[Postal Code]');

  // Replace phone numbers
  cleaned = cleaned.replace(
    /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    '[Phone Number]'
  );

  // Replace email addresses
  cleaned = cleaned.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[Email Address]'
  );

  return cleaned;
}
