import { GeocodingCacheService } from './geocodingCache.service';
import { sanitizeDestination, validateCoordinates, validateApiResponse } from '@/utils/sanitization';
import { fallbackGeocoding } from './fallbackGeocoding.service';
import { BaseService, ServiceError, ValidationError } from './base.service';

export interface Address {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
  attraction?: string;
  amenity?: string;
  tourism?: string;
}

export interface ReverseGeocodeResult {
  street?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Address;
  place_id?: string;
  osm_type?: string;
  osm_id?: string;
  boundingbox?: string[];
  type?: string;
  importance?: number;
}

// Keep GeocodingError for backward compatibility
export class GeocodingError extends ServiceError {
  constructor(message: string, statusCode?: number | string) {
    super(message, typeof statusCode === 'string' ? statusCode : 'GEOCODING_ERROR', typeof statusCode === 'number' ? statusCode : 500);
    this.name = 'GeocodingError';
  }
}

class GeocodingServiceImpl extends BaseService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  private static readonly USER_AGENT = 'AreWeThereYetApp/1.0';
  private static readonly DEFAULT_HEADERS = {
    'User-Agent': GeocodingServiceImpl.USER_AGENT
  };

  constructor() {
    super('geocoding', {
      rateLimitKey: 'geocoding',
      maxRetries: 3,
      timeout: 10000,
      enableMonitoring: true,
      enableDeduplication: true,
      enablePerformanceTracking: true
    });
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
    options?: {
      minimal?: boolean;
    }
  ): Promise<ReverseGeocodeResult> {
    try {
      // Validate coordinates using BaseService validation
      this.validateInput({ latitude, longitude }, {
        latitude: (lat) => validateCoordinates(lat, longitude),
        longitude: (lon) => validateCoordinates(latitude, lon)
      });

      // Check cache first
      const cached = GeocodingCacheService.getReverseGeocodeCache(latitude, longitude);
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
        ...(options?.minimal && {
          extratags: '0',
          namedetails: '0'
        })
      });

      const url = `${GeocodingServiceImpl.BASE_URL}/reverse?${params.toString()}`;

      // Primary operation
      const primaryOperation = async () => {
        const data = await this.executeRequest<any>(url, {
          headers: GeocodingServiceImpl.DEFAULT_HEADERS
        });

        // Validate API response structure
        if (!validateApiResponse(data, ['address'])) {
          throw new ValidationError('Invalid response from geocoding service');
        }

        if (!data.address || typeof data.address !== 'object') {
          throw new ValidationError('Invalid address data in response');
        }

        return data;
      };

      // Execute with fallback support
      const data = await this.executeWithFallbacks(
        primaryOperation,
        [{
          name: 'fallback-geocoding',
          priority: 1,
          execute: () => fallbackGeocoding.reverseGeocodeWithFallback(
            latitude,
            longitude,
            primaryOperation
          )
        }]
      );

      // Execute with deduplication
      const result = await this.executeWithDeduplication(
        'reverse',
        { latitude, longitude },
        async () => {
          const transformedResult = {
            street: data.address.road,
            suburb: data.address.suburb || data.address.neighbourhood,
            city: data.address.city || data.address.town || data.address.village,
            county: data.address.county,
            state: data.address.state,
            country: data.address.country,
            latitude,
            longitude
          };

          // Cache the result
          GeocodingCacheService.setReverseGeocodeCache(latitude, longitude, transformedResult);

          return transformedResult;
        }
      );

      return result;
    } catch (error) {
      this.handleError(error, 'reverseGeocode');
    }
  }

  async geocode(
    query: string,
    options?: {
      limit?: number;
      addressdetails?: boolean;
      countrycodes?: string[];
      bounded?: boolean;
      viewbox?: [number, number, number, number];
    }
  ): Promise<GeocodeResult[]> {
    try {
      // Sanitize and validate input
      const sanitizedQuery = sanitizeDestination(query);
      
      if (!sanitizedQuery.trim()) {
        throw new ValidationError('Query cannot be empty');
      }

      // Check cache first
      const cached = GeocodingCacheService.getGeocodeCache(sanitizedQuery, options);
      if (cached) {
        return cached;
      }

      // Build request parameters
      const params = new URLSearchParams({
        format: 'json',
        q: sanitizedQuery,
        limit: (options?.limit || 1).toString(),
        addressdetails: (options?.addressdetails !== false ? 1 : 0).toString(),
        'accept-language': 'en',
        // Optimize response size
        polygon_geojson: '0',
        polygon_kml: '0',
        polygon_svg: '0',
        polygon_text: '0'
      });

      if (options?.countrycodes?.length) {
        params.append('countrycodes', options.countrycodes.join(','));
      }

      if (options?.bounded && options?.viewbox) {
        params.append('bounded', '1');
        params.append('viewbox', options.viewbox.join(','));
      }

      const url = `${GeocodingServiceImpl.BASE_URL}/search?${params.toString()}`;

      // Primary operation
      const primaryOperation = async () => {
        return this.executeRequest<GeocodeResult[]>(url, {
          headers: GeocodingServiceImpl.DEFAULT_HEADERS
        });
      };

      // Execute with fallback support
      const data = await this.executeWithFallbacks(
        primaryOperation,
        [{
          name: 'fallback-geocoding',
          priority: 1,
          execute: () => fallbackGeocoding.geocodeWithFallback(
            sanitizedQuery,
            options,
            primaryOperation
          )
        }]
      );

      // Execute with deduplication
      const result = await this.executeWithDeduplication(
        'geocode',
        { query: sanitizedQuery },
        async () => {
          if (!Array.isArray(data)) {
            throw new ValidationError('Invalid response from geocoding service');
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

// Export static-like interface for backward compatibility
export class GeocodingService {
  static async reverseGeocode(
    latitude: number,
    longitude: number,
    options?: { minimal?: boolean }
  ): Promise<ReverseGeocodeResult> {
    return geocodingServiceInstance.reverseGeocode(latitude, longitude, options);
  }

  static async geocode(
    query: string,
    options?: {
      limit?: number;
      addressdetails?: boolean;
      countrycodes?: string[];
      bounded?: boolean;
      viewbox?: [number, number, number, number];
    }
  ): Promise<GeocodeResult[]> {
    return geocodingServiceInstance.geocode(query, options);
  }

  static extractPlaceName(result: GeocodeResult): string {
    return geocodingServiceInstance.extractPlaceName(result);
  }

  static formatAddress(address: ReverseGeocodeResult): string {
    return geocodingServiceInstance.formatAddress(address);
  }
}