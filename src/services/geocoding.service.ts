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
    try {
      const url = `${this.BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: this.DEFAULT_HEADERS
      });
      
      if (!response.ok) {
        throw new GeocodingError(
          'Failed to get address from coordinates',
          response.status
        );
      }
      
      const data = await response.json();
      
      if (!data || !data.address) {
        throw new GeocodingError('Invalid response from geocoding service');
      }
      
      return {
        street: data.address.road,
        suburb: data.address.suburb || data.address.neighbourhood,
        city: data.address.city || data.address.town || data.address.village,
        county: data.address.county,
        state: data.address.state,
        country: data.address.country,
        latitude,
        longitude
      };
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
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
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
      
      const response = await fetch(url, {
        headers: this.DEFAULT_HEADERS
      });
      
      if (!response.ok) {
        throw new GeocodingError(
          'Failed to geocode location',
          response.status
        );
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new GeocodingError('Invalid response from geocoding service');
      }
      
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