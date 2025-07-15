/**
 * Geocoding Service
 *
 * Provides location search and reverse geocoding functionality using OpenStreetMap Nominatim API.
 * Includes caching, error handling, rate limiting, and fallback support for reliable location services.
 */

import { GeocodingCacheService } from './geocodingCache.service';
import {
  sanitizeDestination,
  validateCoordinates,
  validateApiResponse,
} from '@/utils/sanitization';
import { fallbackGeocoding } from './fallbackGeocoding.service';
import { BaseService, ServiceError, ValidationError } from './base.service';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';

/**
 * Address components returned from geocoding services
 */
export interface Address {
  /** Street or road name */
  road?: string;
  /** Suburb or neighborhood name */
  suburb?: string;
  /** Neighborhood name (alternative) */
  neighbourhood?: string;
  /** City name */
  city?: string;
  /** Town name (smaller than city) */
  town?: string;
  /** Village name (smaller than town) */
  village?: string;
  /** County or administrative area */
  county?: string;
  /** State or province */
  state?: string;
  /** Country name */
  country?: string;
  /** Postal/zip code */
  postcode?: string;
  /** Tourist attraction name */
  attraction?: string;
  /** Amenity name (restaurants, shops, etc.) */
  amenity?: string;
  /** Tourism-related place */
  tourism?: string;
}

/**
 * Result from reverse geocoding (coordinates to address)
 */
export interface ReverseGeocodeResult {
  /** Street address */
  street?: string;
  /** Suburb or neighborhood */
  suburb?: string;
  /** City name */
  city?: string;
  /** County name */
  county?: string;
  /** State or province */
  state?: string;
  /** Country name */
  country?: string;
  /** Original latitude coordinate */
  latitude: number;
  /** Original longitude coordinate */
  longitude: number;
}

/**
 * Result from forward geocoding (address/place to coordinates)
 */
export interface GeocodeResult {
  /** Latitude as string */
  lat: string;
  /** Longitude as string */
  lon: string;
  /** Human-readable location description */
  display_name: string;
  /** Detailed address components */
  address?: Address;
  /** Unique place identifier */
  place_id?: string;
  /** OpenStreetMap object type */
  osm_type?: string;
  /** OpenStreetMap object ID */
  osm_id?: string;
  /** Bounding box coordinates [min_lat, max_lat, min_lon, max_lon] */
  boundingbox?: string[];
  /** Place type classification */
  type?: string;
  /** Search result importance score */
  importance?: number;
}

/**
 * Options for reverse geocoding (coordinates to address)
 */
export interface ReverseGeocodeOptions {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Whether to return minimal response data */
  minimal?: boolean;
}

/**
 * Options for forward geocoding (address/place to coordinates)
 */
export interface GeocodeOptions {
  /** Search query (address, place name, etc.) */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to include detailed address components */
  addressdetails?: boolean;
  /** Limit results to specific country codes (ISO 3166-1 alpha-2) */
  countrycodes?: string[];
  /** Whether to restrict results to the viewbox area */
  bounded?: boolean;
  /** Bounding box to prioritize results [min_lon, min_lat, max_lon, max_lat] */
  viewbox?: [number, number, number, number];
}

/**
 * Custom error class for geocoding operations
 * @deprecated Use ServiceError from base.service instead
 */
export class GeocodingError extends ServiceError {
  constructor(message: string, statusCode?: number | string) {
    super(
      message,
      typeof statusCode === 'string' ? statusCode : 'GEOCODING_ERROR',
      typeof statusCode === 'number' ? statusCode : 500
    );
    this.name = 'GeocodingError';
  }
}

class GeocodingServiceImpl extends BaseService {
  private static readonly DIRECT_URL = 'https://nominatim.openstreetmap.org';
  private static readonly USER_AGENT = 'AreWeThereYetApp/1.0';

  private get baseUrl(): string {
    // Use proxy URL if configured, otherwise fall back to default
    const proxyUrl = import.meta.env.VITE_GEOCODING_PROXY_URL;
    if (proxyUrl) {
      return proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
    }

    // Always use the proxy (Vite proxy in dev, Netlify proxy in prod)
    return '/api/geocoding';
  }

  private static readonly DEFAULT_HEADERS = {
    'User-Agent': GeocodingServiceImpl.USER_AGENT,
  };

  constructor() {
    super('geocoding', {
      rateLimitKey: 'geocoding',
      maxRetries: 3,
      timeout: 10000,
      enableMonitoring: true,
      enableDeduplication: true,
      enablePerformanceTracking: true,
    });
  }

  /**
   * Convert geographic coordinates to a human-readable address
   *
   * @param options - Reverse geocoding parameters
   * @returns Promise resolving to address information
   *
   * @example
   * ```typescript
   * const result = await geocoding.reverseGeocode({
   *   latitude: -33.8688,
   *   longitude: 151.2093,
   *   minimal: false
   * });
   * console.log(result.city); // "Sydney"
   * ```
   */
  async reverseGeocode(
    options: ReverseGeocodeOptions
  ): Promise<ReverseGeocodeResult> {
    try {
      const { latitude, longitude, minimal } = options;

      // Validate coordinates using BaseService validation
      this.validateInput(
        { latitude, longitude },
        {
          latitude: (lat) => validateCoordinates(lat, longitude),
          longitude: (lon) => validateCoordinates(latitude, lon),
        }
      );

      // Check cache first
      const cached = GeocodingCacheService.getReverseGeocodeCache(
        latitude,
        longitude
      );
      if (cached) {
        return cached;
      }

      // Build request parameters
      const params = new URLSearchParams({
        format: 'json',
        lat: latitude.toString(),
        lon: longitude.toString(),
        addressdetails: '1',
        'accept-language': 'en',
        ...(minimal && {
          extratags: '0',
          namedetails: '0',
        }),
      });

      const url = `${this.baseUrl}/reverse?${params.toString()}`;

      // Primary operation
      const primaryOperation = async () => {
        const data = await this.executeRequest<any>(url, {
          headers: GeocodingServiceImpl.DEFAULT_HEADERS,
        });

        // For reverse geocoding, validate that we have an address field
        if (!data || typeof data !== 'object' || !('address' in data)) {
          throw new ValidationError(
            getErrorMessage('GEOCODING', 'INVALID_RESPONSE')
          );
        }

        if (!data.address || typeof data.address !== 'object') {
          throw new ValidationError(
            getErrorMessage('GEOCODING', 'INVALID_RESPONSE')
          );
        }

        return data;
      };

      // Execute with fallback support
      const data = await this.executeWithFallbacks(primaryOperation, [
        {
          name: 'fallback-geocoding',
          priority: 1,
          execute: () =>
            fallbackGeocoding.reverseGeocodeWithFallback(
              latitude,
              longitude,
              primaryOperation
            ),
        },
      ]);

      // Execute with deduplication
      const result = await this.executeWithDeduplication(
        'reverse',
        { latitude, longitude },
        async () => {
          const transformedResult = {
            street: data.address.road,
            suburb: data.address.suburb || data.address.neighbourhood,
            city:
              data.address.city || data.address.town || data.address.village,
            county: data.address.county,
            state: data.address.state,
            country: data.address.country,
            latitude,
            longitude,
          };

          // Cache the result
          GeocodingCacheService.setReverseGeocodeCache(
            latitude,
            longitude,
            transformedResult
          );

          return transformedResult;
        }
      );

      return result;
    } catch (error) {
      this.handleError(error, 'reverseGeocode');
    }
  }

  /**
   * Convert an address or place name to geographic coordinates
   *
   * @param options - Geocoding search parameters
   * @returns Promise resolving to array of location results
   *
   * @example
   * ```typescript
   * const results = await geocoding.geocode({
   *   query: "Sydney Opera House",
   *   limit: 5,
   *   addressdetails: true,
   *   countrycodes: ["au"]
   * });
   * console.log(results[0].display_name);
   * ```
   */
  async geocode(options: GeocodeOptions): Promise<GeocodeResult[]> {
    try {
      const {
        query,
        limit = 1,
        addressdetails = true,
        countrycodes,
        bounded,
        viewbox,
      } = options;

      // Sanitize and validate input
      const sanitizedQuery = sanitizeDestination(query);

      if (!sanitizedQuery.trim()) {
        throw new ValidationError(
          getErrorMessage('VALIDATION', 'REQUIRED_FIELD', {
            field: 'Search query',
          })
        );
      }

      // Check cache first
      const cached = GeocodingCacheService.getGeocodeCache(
        sanitizedQuery,
        options
      );
      if (cached) {
        return cached;
      }

      // Build request parameters
      const params = new URLSearchParams({
        format: 'json',
        q: sanitizedQuery,
        limit: limit.toString(),
        addressdetails: (addressdetails ? 1 : 0).toString(),
        'accept-language': 'en',
        // Optimize response size
        polygon_geojson: '0',
        polygon_kml: '0',
        polygon_svg: '0',
        polygon_text: '0',
      });

      if (countrycodes?.length) {
        params.append('countrycodes', countrycodes.join(','));
      }

      if (bounded && viewbox) {
        params.append('bounded', '1');
        params.append('viewbox', viewbox.join(','));
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;

      // Primary operation
      const primaryOperation = async () => {
        try {
          const result = await this.executeRequest<GeocodeResult[]>(url, {
            headers: GeocodingServiceImpl.DEFAULT_HEADERS,
          });
          logger.info('Geocoding API successful', {
            url,
            resultCount: result.length,
          });
          return result;
        } catch (error) {
          logger.error('Geocoding API failed', error as Error, {
            url,
            query: sanitizedQuery,
            baseUrl: this.baseUrl,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      };

      // Execute with deduplication and fallback support
      const result = await this.executeWithDeduplication(
        'geocode',
        { query: sanitizedQuery },
        async () => {
          const data = await this.executeWithFallbacks(primaryOperation, [
            {
              name: 'fallback-geocoding',
              priority: 1,
              execute: () => fallbackGeocoding.geocode(sanitizedQuery, options),
            },
          ]);

          if (!Array.isArray(data)) {
            throw new ValidationError(
              getErrorMessage('GEOCODING', 'INVALID_RESPONSE')
            );
          }

          // Cache the result
          GeocodingCacheService.setGeocodeCache(sanitizedQuery, options, data);

          return data;
        }
      );

      return result;
    } catch (error) {
      this.handleError(error, 'geocode');
    }
  }

  /**
   * Extract the primary place name from a geocoding result
   *
   * Prioritizes attractions, amenities, and tourism sites over generic addresses
   *
   * @param result - Geocoding result to extract name from
   * @returns Primary place name
   */
  extractPlaceName(result: GeocodeResult): string {
    if (result.address) {
      if (result.address.attraction) {
        return result.address.attraction;
      }
      if (result.address.amenity) {
        return result.address.amenity;
      }
      if (result.address.tourism) {
        return result.address.tourism;
      }
    }

    return result.display_name.split(',')[0];
  }

  /**
   * Format an address result into a human-readable string
   *
   * @param address - Address components to format
   * @returns Formatted address string
   *
   * @example
   * ```typescript
   * const formatted = geocoding.formatAddress({
   *   street: "123 Main St",
   *   city: "Sydney",
   *   state: "NSW",
   *   country: "Australia"
   * });
   * // Returns: "123 Main St, Sydney, NSW, Australia"
   * ```
   */
  formatAddress(address: ReverseGeocodeResult): string {
    const parts = [];

    if (address.street) parts.push(address.street);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);

    return parts.join(', ');
  }
}

// Create singleton instance
const geocodingServiceInstance = new GeocodingServiceImpl();

/**
 * Static interface for geocoding operations
 *
 * Provides both modern options-based methods and legacy parameter-based methods
 * for backward compatibility. All methods are automatically rate-limited, cached,
 * and include error handling with fallback support.
 *
 * @example
 * ```typescript
 * // Modern interface
 * const results = await GeocodingService.geocode({
 *   query: "Sydney Opera House",
 *   limit: 5
 * });
 *
 * // Legacy interface (still supported)
 * const results = await GeocodingService.geocode("Sydney Opera House", { limit: 5 });
 * ```
 */
export class GeocodingService {
  /**
   * Convert coordinates to address (modern interface)
   */
  static async reverseGeocode(
    options: ReverseGeocodeOptions
  ): Promise<ReverseGeocodeResult>;

  /**
   * Convert coordinates to address (legacy interface)
   * @deprecated Use options-based interface instead
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number,
    options?: { minimal?: boolean }
  ): Promise<ReverseGeocodeResult>;

  static async reverseGeocode(
    optionsOrLatitude: ReverseGeocodeOptions | number,
    longitude?: number,
    legacyOptions?: { minimal?: boolean }
  ): Promise<ReverseGeocodeResult> {
    if (typeof optionsOrLatitude === 'object') {
      // New interface - options object
      return geocodingServiceInstance.reverseGeocode(optionsOrLatitude);
    } else {
      // Backward compatibility interface
      const options: ReverseGeocodeOptions = {
        latitude: optionsOrLatitude,
        longitude: longitude!,
        minimal: legacyOptions?.minimal,
      };
      return geocodingServiceInstance.reverseGeocode(options);
    }
  }

  /**
   * Convert address/place to coordinates (modern interface)
   */
  static async geocode(options: GeocodeOptions): Promise<GeocodeResult[]>;

  /**
   * Convert address/place to coordinates (legacy interface)
   * @deprecated Use options-based interface instead
   */
  static async geocode(
    query: string,
    options?: {
      limit?: number;
      addressdetails?: boolean;
      countrycodes?: string[];
      bounded?: boolean;
      viewbox?: [number, number, number, number];
    }
  ): Promise<GeocodeResult[]>;

  static async geocode(
    queryOrOptions: GeocodeOptions | string,
    legacyOptions?: {
      limit?: number;
      addressdetails?: boolean;
      countrycodes?: string[];
      bounded?: boolean;
      viewbox?: [number, number, number, number];
    }
  ): Promise<GeocodeResult[]> {
    if (typeof queryOrOptions === 'object') {
      // New interface - options object
      return geocodingServiceInstance.geocode(queryOrOptions);
    } else {
      // Backward compatibility interface
      const options: GeocodeOptions = {
        query: queryOrOptions,
        ...legacyOptions,
      };
      return geocodingServiceInstance.geocode(options);
    }
  }

  /**
   * Extract the primary place name from a geocoding result
   *
   * @param result - Geocoding result
   * @returns Extracted place name
   */
  static extractPlaceName(result: GeocodeResult): string {
    return geocodingServiceInstance.extractPlaceName(result);
  }

  /**
   * Format address components into a readable string
   *
   * @param address - Address result to format
   * @returns Formatted address string
   */
  static formatAddress(address: ReverseGeocodeResult): string {
    return geocodingServiceInstance.formatAddress(address);
  }
}
