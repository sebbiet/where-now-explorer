/**
 * Fallback geocoding via Photon (https://photon.komoot.io).
 * Used only when the primary Nominatim proxy fails.
 * Never invents or fabricates locations.
 */

import {
  GeocodeResult,
  ReverseGeocodeResult,
  GeocodeOptions,
} from './geocoding.service';
import { BaseService, ServiceError, ValidationError } from './base.service';
import { validateCoordinates } from '@/utils/sanitization';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';

const PHOTON_BASE_URL = 'https://photon.komoot.io';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    type?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function buildDisplayName(
  properties: NonNullable<PhotonFeature['properties']>
): string {
  const locality =
    properties.city ||
    properties.town ||
    properties.village ||
    properties.suburb;
  const streetParts = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(' ');
  const parts = [
    properties.name,
    streetParts,
    properties.suburb || properties.district,
    locality,
    properties.state,
    properties.country,
  ].filter((part, index, list) => part && list.indexOf(part) === index);
  return parts.join(', ');
}

function mapFeatureToGeocodeResult(
  feature: PhotonFeature
): GeocodeResult | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || coordinates.length < 2 || !properties) {
    return null;
  }

  const [lon, lat] = coordinates;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const city = properties.city || properties.town || properties.village;
  const displayName = buildDisplayName(properties);
  if (!displayName) {
    return null;
  }

  return {
    lat: String(lat),
    lon: String(lon),
    display_name: displayName,
    address: {
      road: properties.street,
      suburb: properties.suburb || properties.district,
      city,
      town: properties.town,
      village: properties.village,
      county: properties.county,
      state: properties.state,
      country: properties.country,
      postcode: properties.postcode,
    },
    osm_id: properties.osm_id != null ? String(properties.osm_id) : undefined,
    osm_type: properties.osm_type,
    type: properties.type,
  };
}

function mapFeatureToReverseResult(
  feature: PhotonFeature,
  latitude: number,
  longitude: number
): ReverseGeocodeResult | null {
  const mapped = mapFeatureToGeocodeResult(feature);
  if (!mapped?.address) {
    return null;
  }

  return {
    street: mapped.address.road,
    suburb: mapped.address.suburb || mapped.address.neighbourhood,
    city: mapped.address.city || mapped.address.town || mapped.address.village,
    county: mapped.address.county,
    state: mapped.address.state,
    country: mapped.address.country,
    latitude,
    longitude,
  };
}

class PhotonGeocodingServiceImpl extends BaseService {
  constructor() {
    super('fallback-geocoding', {
      rateLimitKey: 'fallback-geocoding',
      maxRetries: 1,
      timeout: 10000,
      enableMonitoring: true,
      enableDeduplication: false,
      enablePerformanceTracking: true,
    });
  }

  async geocode(
    query: string,
    options?: GeocodeOptions
  ): Promise<GeocodeResult[]> {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new ValidationError(
        getErrorMessage('VALIDATION', 'REQUIRED_FIELD', {
          field: 'Search query',
        })
      );
    }

    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(options?.limit ?? 5),
      lang: 'en',
    });

    const url = `${PHOTON_BASE_URL}/api?${params.toString()}`;
    const data = await this.executeRequest<PhotonResponse>(url, {
      headers: { Accept: 'application/json' },
    });

    const results = (data.features || [])
      .map(mapFeatureToGeocodeResult)
      .filter((result): result is GeocodeResult => result !== null);

    if (results.length === 0) {
      throw new ServiceError(
        getErrorMessage('GEOCODING', 'SERVICE_UNAVAILABLE'),
        { code: 'NO_RESULTS', statusCode: 404 }
      );
    }

    logger.info('Photon geocoding successful', {
      query,
      resultCount: results.length,
    });
    return results;
  }

  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<ReverseGeocodeResult> {
    this.validateInput(
      { lat, lon },
      {
        lat: (latitude) => validateCoordinates(latitude, lon),
        lon: (longitude) => validateCoordinates(lat, longitude),
      }
    );

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      lang: 'en',
    });

    const url = `${PHOTON_BASE_URL}/reverse?${params.toString()}`;
    const data = await this.executeRequest<PhotonResponse>(url, {
      headers: { Accept: 'application/json' },
    });

    const feature = data.features?.[0];
    const result = feature
      ? mapFeatureToReverseResult(feature, lat, lon)
      : null;

    if (!result || (!result.city && !result.country && !result.state)) {
      throw new ServiceError(
        getErrorMessage('GEOCODING', 'SERVICE_UNAVAILABLE'),
        { code: 'NO_RESULTS', statusCode: 404 }
      );
    }

    return result;
  }

  async reverseGeocodeWithFallback(
    lat: number,
    lon: number,
    primaryProvider?: () => Promise<ReverseGeocodeResult>
  ): Promise<ReverseGeocodeResult> {
    if (primaryProvider) {
      try {
        return await primaryProvider();
      } catch (error) {
        logger.warn('Primary reverse geocoding failed, trying Photon', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.reverseGeocode(lat, lon);
  }

  async geocodeWithFallback(
    query: string,
    options?: GeocodeOptions,
    primaryProvider?: () => Promise<GeocodeResult[]>
  ): Promise<GeocodeResult[]> {
    if (primaryProvider) {
      try {
        const results = await primaryProvider();
        if (results && results.length > 0) {
          return results;
        }
      } catch (error) {
        logger.warn('Primary geocoding failed, trying Photon', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.geocode(query, options);
  }
}

const fallbackGeocodingInstance = new PhotonGeocodingServiceImpl();

export const fallbackGeocoding = fallbackGeocodingInstance;

export class FallbackGeocodingService {
  static async geocode(
    query: string,
    options?: GeocodeOptions
  ): Promise<GeocodeResult[]> {
    return fallbackGeocodingInstance.geocode(query, options);
  }

  static async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<ReverseGeocodeResult> {
    return fallbackGeocodingInstance.reverseGeocode(lat, lon);
  }

  static async reverseGeocodeWithFallback(
    lat: number,
    lon: number,
    primaryProvider?: () => Promise<ReverseGeocodeResult>
  ): Promise<ReverseGeocodeResult> {
    return fallbackGeocodingInstance.reverseGeocodeWithFallback(
      lat,
      lon,
      primaryProvider
    );
  }

  static async geocodeWithFallback(
    query: string,
    options?: GeocodeOptions,
    primaryProvider?: () => Promise<GeocodeResult[]>
  ): Promise<GeocodeResult[]> {
    return fallbackGeocodingInstance.geocodeWithFallback(
      query,
      options,
      primaryProvider
    );
  }
}
