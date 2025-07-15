import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeocodingService, GeocodingError, GeocodeResult, ReverseGeocodeResult } from '../geocoding.service';
import { GeocodingCacheService } from '../geocodingCache.service';
import { fallbackGeocoding } from '../fallbackGeocoding.service';
import { getErrorMessage } from '@/utils/errorMessages';
import { ValidationError } from '../base.service';

// Mock dependencies
vi.mock('../geocodingCache.service', () => ({
  GeocodingCacheService: {
    getReverseGeocodeCache: vi.fn(),
    setReverseGeocodeCache: vi.fn(),
    getGeocodeCache: vi.fn(),
    setGeocodeCache: vi.fn(),
  },
}));

vi.mock('../fallbackGeocoding.service', () => ({
  fallbackGeocoding: {
    reverseGeocodeWithFallback: vi.fn(),
    geocodeWithFallback: vi.fn(),
  },
}));

vi.mock('@/utils/errorMessages', () => ({
  getErrorMessage: vi.fn((category: string, key: string, params?: any) => {
    if (params) {
      return `${category}_${key}_${JSON.stringify(params)}`;
    }
    return `${category}_${key}`;
  }),
}));

vi.mock('@/utils/sanitization', () => ({
  sanitizeDestination: vi.fn((input: string) => input.trim()),
  validateCoordinates: vi.fn((lat: number, lon: number) => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }),
  validateApiResponse: vi.fn((data: any, requiredFields: string[]) => {
    return requiredFields.every(field => field in data);
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchPlaces (geocode)', () => {
    it('should search places with valid address input', async () => {
      // Arrange
      const mockResults: GeocodeResult[] = [
        {
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: {
            city: 'New York',
            state: 'New York',
            country: 'USA',
          },
          place_id: '12345',
          osm_type: 'city',
          osm_id: '67890',
          importance: 0.9,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      // Act
      const results = await GeocodingService.geocode({ query: 'New York' });

      // Assert
      expect(results).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search'),
        expect.objectContaining({
          headers: { 'User-Agent': 'AreWeThereYetApp/1.0' },
        })
      );
      expect(GeocodingCacheService.setGeocodeCache).toHaveBeenCalledWith(
        'New York',
        { query: 'New York' },
        mockResults
      );
    });

    it('should handle empty input in searchPlaces', async () => {
      // Act & Assert
      await expect(GeocodingService.geocode({ query: '  ' })).rejects.toThrow(ValidationError);
      
      try {
        await GeocodingService.geocode({ query: '  ' });
      } catch (error) {
        expect(error.message).toBe('VALIDATION_REQUIRED_FIELD_{"field":"Search query"}');
      }
    });

    it('should handle special characters in searchPlaces', async () => {
      // Arrange
      const specialQuery = 'Café & Restaurant @123';
      const mockResults: GeocodeResult[] = [
        {
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Café & Restaurant, Paris, France',
          address: {
            amenity: 'Café & Restaurant',
            city: 'Paris',
            country: 'France',
          },
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      // Act
      const results = await GeocodingService.geocode({ query: specialQuery });

      // Assert
      expect(results).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=Caf%C3%A9'),
        expect.any(Object)
      );
    });

    it('should use cache when available', async () => {
      // Arrange
      const cachedResults: GeocodeResult[] = [
        {
          lat: '51.5074',
          lon: '-0.1278',
          display_name: 'London, UK',
        },
      ];

      vi.mocked(GeocodingCacheService.getGeocodeCache).mockReturnValueOnce(cachedResults);

      // Act
      const results = await GeocodingService.geocode({ query: 'London' });

      // Assert
      expect(results).toEqual(cachedResults);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid response format', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => 'not an array', // Invalid response
      } as Response);

      // Act & Assert
      await expect(GeocodingService.geocode({ query: 'Test' })).rejects.toThrow();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode with valid coordinates', async () => {
      // Arrange
      const mockResponse = {
        address: {
          road: 'Main Street',
          suburb: 'Downtown',
          city: 'New York',
          state: 'New York',
          country: 'USA',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await GeocodingService.reverseGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      // Assert
      expect(result).toEqual({
        street: 'Main Street',
        suburb: 'Downtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
      });
      expect(GeocodingCacheService.setReverseGeocodeCache).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        result
      );
    });

    it('should handle invalid coordinates', async () => {
      // Arrange
      const invalidCoordinates = [
        { latitude: 91, longitude: 0 }, // Invalid latitude
        { latitude: -91, longitude: 0 }, // Invalid latitude
        { latitude: 0, longitude: 181 }, // Invalid longitude
        { latitude: 0, longitude: -181 }, // Invalid longitude
      ];

      // Act & Assert
      for (const coords of invalidCoordinates) {
        await expect(
          GeocodingService.reverseGeocode(coords)
        ).rejects.toThrow(ValidationError);
      }
    });

    it('should use cache when available for reverseGeocode', async () => {
      // Arrange
      const cachedResult: ReverseGeocodeResult = {
        street: 'Cached Street',
        city: 'Cached City',
        country: 'Cached Country',
        latitude: 40.7128,
        longitude: -74.0060,
      };

      vi.mocked(GeocodingCacheService.getReverseGeocodeCache).mockReturnValueOnce(cachedResult);

      // Act
      const result = await GeocodingService.reverseGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      // Assert
      expect(result).toEqual(cachedResult);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(
        GeocodingService.reverseGeocode({
          latitude: 40.7128,
          longitude: -74.0060,
        })
      ).rejects.toThrow();
    });

    it('should handle 404 errors', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      // Act & Assert
      await expect(
        GeocodingService.reverseGeocode({
          latitude: 40.7128,
          longitude: -74.0060,
        })
      ).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // Act & Assert
      await expect(
        GeocodingService.reverseGeocode({
          latitude: 40.7128,
          longitude: -74.0060,
        })
      ).rejects.toThrow();
    });

    it('should test retry logic on failures', async () => {
      // Arrange
      // First two attempts fail, third succeeds
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            address: {
              city: 'Success City',
              country: 'Success Country',
            },
          }),
        } as Response);

      // Act
      const result = await GeocodingService.reverseGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      // Assert
      expect(result.city).toBe('Success City');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should test response formatting and data sanitization', async () => {
      // Arrange
      const mockResponse = {
        address: {
          road: '  Main Street  ',
          neighbourhood: 'Old Town',
          town: 'Small Town',
          village: 'Village Name',
          city: null, // Testing null values
          state: 'State Name',
          country: 'Country Name',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await GeocodingService.reverseGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      // Assert
      expect(result).toEqual({
        street: '  Main Street  ',
        suburb: 'Old Town',
        city: 'Small Town', // Falls back to town since city is null
        state: 'State Name',
        country: 'Country Name',
        latitude: 40.7128,
        longitude: -74.0060,
      });
    });

    it('should handle minimal option', async () => {
      // Arrange
      const mockResponse = {
        address: {
          city: 'New York',
          country: 'USA',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await GeocodingService.reverseGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
        minimal: true,
      });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('extratags=0');
      expect(url).toContain('namedetails=0');
    });
  });

  describe('backward compatibility', () => {
    it('should support legacy reverseGeocode interface', async () => {
      // Arrange
      const mockResponse = {
        address: {
          city: 'Legacy City',
          country: 'Legacy Country',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await GeocodingService.reverseGeocode(40.7128, -74.0060);

      // Assert
      expect(result.city).toBe('Legacy City');
    });

    it('should support legacy geocode interface', async () => {
      // Arrange
      const mockResults: GeocodeResult[] = [
        {
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'Legacy Result',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      // Act
      const results = await GeocodingService.geocode('Legacy Query', { limit: 5 });

      // Assert
      expect(results).toEqual(mockResults);
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('limit=5');
    });
  });

  describe('utility methods', () => {
    it('should extract place name correctly', () => {
      // Test with attraction
      const attractionResult: GeocodeResult = {
        lat: '48.8584',
        lon: '2.2945',
        display_name: 'Eiffel Tower, Paris, France',
        address: {
          attraction: 'Eiffel Tower',
          city: 'Paris',
        },
      };
      expect(GeocodingService.extractPlaceName(attractionResult)).toBe('Eiffel Tower');

      // Test with amenity
      const amenityResult: GeocodeResult = {
        lat: '48.8584',
        lon: '2.2945',
        display_name: 'Café de Flore, Paris, France',
        address: {
          amenity: 'Café de Flore',
          city: 'Paris',
        },
      };
      expect(GeocodingService.extractPlaceName(amenityResult)).toBe('Café de Flore');

      // Test with tourism
      const tourismResult: GeocodeResult = {
        lat: '48.8584',
        lon: '2.2945',
        display_name: 'Louvre Museum, Paris, France',
        address: {
          tourism: 'Louvre Museum',
          city: 'Paris',
        },
      };
      expect(GeocodingService.extractPlaceName(tourismResult)).toBe('Louvre Museum');

      // Test fallback to display_name
      const fallbackResult: GeocodeResult = {
        lat: '48.8584',
        lon: '2.2945',
        display_name: 'Random Place, Paris, France',
      };
      expect(GeocodingService.extractPlaceName(fallbackResult)).toBe('Random Place');
    });

    it('should format address correctly', () => {
      // Test full address
      const fullAddress: ReverseGeocodeResult = {
        street: 'Main Street',
        suburb: 'Downtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
      };
      expect(GeocodingService.formatAddress(fullAddress)).toBe(
        'Main Street, Downtown, New York, New York, USA'
      );

      // Test partial address
      const partialAddress: ReverseGeocodeResult = {
        city: 'London',
        country: 'UK',
        latitude: 51.5074,
        longitude: -0.1278,
      };
      expect(GeocodingService.formatAddress(partialAddress)).toBe('London, UK');

      // Test empty address
      const emptyAddress: ReverseGeocodeResult = {
        latitude: 0,
        longitude: 0,
      };
      expect(GeocodingService.formatAddress(emptyAddress)).toBe('');
    });
  });

  describe('advanced options', () => {
    it('should handle country codes filtering', async () => {
      // Arrange
      const mockResults: GeocodeResult[] = [];
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      // Act
      await GeocodingService.geocode({
        query: 'Paris',
        countrycodes: ['fr', 'us'],
      });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('countrycodes=fr%2Cus');
    });

    it('should handle bounded search with viewbox', async () => {
      // Arrange
      const mockResults: GeocodeResult[] = [];
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      // Act
      await GeocodingService.geocode({
        query: 'Restaurant',
        bounded: true,
        viewbox: [2.2, 48.8, 2.4, 48.9],
      });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('bounded=1');
      expect(url).toContain('viewbox=2.2%2C48.8%2C2.4%2C48.9');
    });
  });
});