import { GeocodingCacheService } from './geocodingCache.service';
import { retryWithBackoff } from '@/utils/retry';
import { rateLimiter } from './rateLimiter.service';
import { sanitizeDestination, validateCoordinates, validateApiResponse } from '@/utils/sanitization';
import { withPerformanceTracking } from '@/utils/performanceMonitor';

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

export class GeocodingError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GeocodingError';
  }
}

export class GeocodingService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  private static readonly USER_AGENT = 'AreWeThereYetApp/1.0';
  private static readonly DEFAULT_HEADERS = {
    'User-Agent': GeocodingService.USER_AGENT
  };

  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeResult> {
    // Validate coordinates
    if (!validateCoordinates(latitude, longitude)) {
      throw new GeocodingError('Invalid coordinates provided', 'INVALID_INPUT');
    }
    
    // Apply rate limiting
    if (!rateLimiter.isAllowed('geocoding')) {
      const resetTime = rateLimiter.getTimeUntilReset('geocoding');
      throw new GeocodingError(
        `Too many requests. Please wait ${Math.ceil(resetTime / 1000)} seconds.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }
    
    rateLimiter.recordRequest('geocoding');
    
    // Check cache first
    const cached = GeocodingCacheService.getReverseGeocodeCache(latitude, longitude);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const fetchData = async () => {
        const response = await fetch(url, {
          headers: this.DEFAULT_HEADERS
        });
        
        if (!response.ok) {
          const error = new GeocodingError(
            'Failed to get address from coordinates',
            response.status
          );
          (error as any).status = response.status;
          throw error;
        }
        
        return response.json();
      };
      
      const data = await withPerformanceTracking('geocoding', () =>
        retryWithBackoff(fetchData, {
          maxAttempts: 3,
          onRetry: (attempt, delay) => {
            console.log(`Retrying reverse geocoding (attempt ${attempt}) after ${Math.round(delay)}ms`);
          }
        })
      );
      
      // Validate API response structure
      if (!validateApiResponse(data, ['address'])) {
        throw new GeocodingError('Invalid response from geocoding service');
      }
      
      if (!data.address || typeof data.address !== 'object') {
        throw new GeocodingError('Invalid address data in response');
      }
      
      const result = {
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
      GeocodingCacheService.setReverseGeocodeCache(latitude, longitude, result);

      return result;
    } catch (error) {
      if (error instanceof GeocodingError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new GeocodingError(`Geocoding failed: ${error.message}`);
      }
      
      throw new GeocodingError('An unknown error occurred during geocoding');
    }
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
    // Sanitize and validate input
    const sanitizedQuery = sanitizeDestination(query);
    
    // Apply rate limiting
    if (!rateLimiter.isAllowed('geocoding')) {
      const resetTime = rateLimiter.getTimeUntilReset('geocoding');
      throw new GeocodingError(
        `Too many requests. Please wait ${Math.ceil(resetTime / 1000)} seconds.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }
    
    rateLimiter.recordRequest('geocoding');
    
    // Check cache first
    const cached = GeocodingCacheService.getGeocodeCache(sanitizedQuery, options);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        format: 'json',
        q: sanitizedQuery,
        limit: (options?.limit || 1).toString(),
        addressdetails: (options?.addressdetails !== false ? 1 : 0).toString()
      });

      if (options?.countrycodes?.length) {
        params.append('countrycodes', options.countrycodes.join(','));
      }

      if (options?.bounded && options?.viewbox) {
        params.append('bounded', '1');
        params.append('viewbox', options.viewbox.join(','));
      }

      const url = `${this.BASE_URL}/search?${params.toString()}`;
      
      const fetchData = async () => {
        const response = await fetch(url, {
          headers: this.DEFAULT_HEADERS
        });
        
        if (!response.ok) {
          const error = new GeocodingError(
            'Failed to geocode location',
            response.status
          );
          (error as any).status = response.status;
          throw error;
        }
        
        return response.json();
      };
      
      const data = await withPerformanceTracking('geocoding', () =>
        retryWithBackoff(fetchData, {
          maxAttempts: 3,
          onRetry: (attempt, delay) => {
            console.log(`Retrying geocoding for "${sanitizedQuery}" (attempt ${attempt}) after ${Math.round(delay)}ms`);
          }
        })
      );
      
      if (!Array.isArray(data)) {
        throw new GeocodingError('Invalid response from geocoding service');
      }
      
      // Cache the result
      GeocodingCacheService.setGeocodeCache(sanitizedQuery, options, data);
      
      return data;
    } catch (error) {
      if (error instanceof GeocodingError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new GeocodingError(`Geocoding failed: ${error.message}`);
      }
      
      throw new GeocodingError('An unknown error occurred during geocoding');
    }
  }

  static extractPlaceName(result: GeocodeResult): string {
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

  static formatAddress(address: ReverseGeocodeResult): string {
    const parts = [];
    
    if (address.street) parts.push(address.street);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }
}