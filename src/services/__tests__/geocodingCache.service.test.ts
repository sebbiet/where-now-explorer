import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeocodingCacheService } from '../geocodingCache.service';
import { GeocodeResult, ReverseGeocodeResult } from '../geocoding.service';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock console methods
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('GeocodingCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
    console.log = vi.fn();
    
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Clear the cache before each test
    GeocodingCacheService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  describe('cache get with existing entry', () => {
    it('should retrieve existing geocode cache entry', () => {
      // Arrange
      const query = 'New York';
      const options = { limit: 5 };
      const mockResults: GeocodeResult[] = [
        {
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
        },
      ];

      // Set cache entry
      GeocodingCacheService.setGeocodeCache(query, options, mockResults);

      // Act
      const cached = GeocodingCacheService.getGeocodeCache(query, options);

      // Assert
      expect(cached).toEqual(mockResults);
    });

    it('should retrieve existing reverse geocode cache entry', () => {
      // Arrange
      const lat = 40.7128;
      const lon = -74.0060;
      const mockResult: ReverseGeocodeResult = {
        street: 'Broadway',
        city: 'New York',
        country: 'USA',
        latitude: lat,
        longitude: lon,
      };

      // Set cache entry
      GeocodingCacheService.setReverseGeocodeCache(lat, lon, mockResult);

      // Act
      const cached = GeocodingCacheService.getReverseGeocodeCache(lat, lon);

      // Assert
      expect(cached).toEqual(mockResult);
    });
  });

  describe('cache get with expired entry', () => {
    it('should return null for expired geocode cache entry', () => {
      // Arrange
      const query = 'London';
      const mockResults: GeocodeResult[] = [
        {
          lat: '51.5074',
          lon: '-0.1278',
          display_name: 'London, UK',
        },
      ];

      // Set cache entry
      GeocodingCacheService.setGeocodeCache(query, {}, mockResults);

      // Fast forward time beyond cache duration (24 hours + 1 second)
      const now = Date.now();
      vi.setSystemTime(now + 24 * 60 * 60 * 1000 + 1000);

      // Act
      const cached = GeocodingCacheService.getGeocodeCache(query, {});

      // Assert
      expect(cached).toBeNull();

      vi.useRealTimers();
    });

    it('should return null for expired reverse geocode cache entry', () => {
      // Arrange
      const lat = 51.5074;
      const lon = -0.1278;
      const mockResult: ReverseGeocodeResult = {
        city: 'London',
        country: 'UK',
        latitude: lat,
        longitude: lon,
      };

      // Set cache entry
      GeocodingCacheService.setReverseGeocodeCache(lat, lon, mockResult);

      // Fast forward time beyond cache duration
      const now = Date.now();
      vi.setSystemTime(now + 24 * 60 * 60 * 1000 + 1000);

      // Act
      const cached = GeocodingCacheService.getReverseGeocodeCache(lat, lon);

      // Assert
      expect(cached).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('cache set with new entry', () => {
    it('should set new geocode cache entry', () => {
      // Arrange
      const query = 'Paris';
      const options = { limit: 3 };
      const mockResults: GeocodeResult[] = [
        {
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Paris, France',
        },
      ];

      // Act
      GeocodingCacheService.setGeocodeCache(query, options, mockResults);

      // Assert
      const cached = GeocodingCacheService.getGeocodeCache(query, options);
      expect(cached).toEqual(mockResults);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should set new reverse geocode cache entry', () => {
      // Arrange
      const lat = 48.8566;
      const lon = 2.3522;
      const mockResult: ReverseGeocodeResult = {
        city: 'Paris',
        country: 'France',
        latitude: lat,
        longitude: lon,
      };

      // Act
      GeocodingCacheService.setReverseGeocodeCache(lat, lon, mockResult);

      // Assert
      const cached = GeocodingCacheService.getReverseGeocodeCache(lat, lon);
      expect(cached).toEqual(mockResult);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('TTL expiration logic', () => {
    it('should respect standard cache duration for non-popular entries', () => {
      // Arrange
      const query = 'Tokyo';
      const mockResults: GeocodeResult[] = [
        {
          lat: '35.6762',
          lon: '139.6503',
          display_name: 'Tokyo, Japan',
        },
      ];

      GeocodingCacheService.setGeocodeCache(query, {}, mockResults);

      // Fast forward to just before expiration
      const now = Date.now();
      vi.setSystemTime(now + 24 * 60 * 60 * 1000 - 1000);

      // Act & Assert - should still be cached
      expect(GeocodingCacheService.getGeocodeCache(query, {})).toEqual(mockResults);

      // Fast forward past expiration
      vi.setSystemTime(now + 24 * 60 * 60 * 1000 + 1000);

      // Should be expired now
      expect(GeocodingCacheService.getGeocodeCache(query, {})).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('popular location tracking', () => {
    it('should track access count for popular locations', () => {
      // Arrange
      const lat = 40.7128;
      const lon = -74.0060;
      const mockResult: ReverseGeocodeResult = {
        city: 'New York',
        country: 'USA',
        latitude: lat,
        longitude: lon,
      };

      GeocodingCacheService.setReverseGeocodeCache(lat, lon, mockResult);

      // Act - Access the location multiple times
      for (let i = 0; i < 5; i++) {
        GeocodingCacheService.getReverseGeocodeCache(lat, lon);
      }

      // Fast forward time to a point where standard cache would expire but popular cache wouldn't
      const now = Date.now();
      vi.setSystemTime(now + 3 * 24 * 60 * 60 * 1000); // 3 days

      // Assert - Should still be cached due to popularity
      const cached = GeocodingCacheService.getReverseGeocodeCache(lat, lon);
      expect(cached).toEqual(mockResult);

      vi.useRealTimers();
    });

    it('should apply extended TTL for popular entries', () => {
      // Arrange
      const query = 'Popular City';
      const mockResults: GeocodeResult[] = [
        {
          lat: '0',
          lon: '0',
          display_name: 'Popular City',
        },
      ];

      GeocodingCacheService.setGeocodeCache(query, {}, mockResults);

      // Make it popular by accessing it 5 times
      for (let i = 0; i < 5; i++) {
        GeocodingCacheService.getGeocodeCache(query, {});
      }

      // Fast forward to beyond standard cache duration but within popular cache duration
      const now = Date.now();
      vi.setSystemTime(now + 3 * 24 * 60 * 60 * 1000); // 3 days

      // Act & Assert - Should still be cached
      expect(GeocodingCacheService.getGeocodeCache(query, {})).toEqual(mockResults);

      // Fast forward beyond popular cache duration
      vi.setSystemTime(now + 8 * 24 * 60 * 60 * 1000); // 8 days

      // Should be expired now
      expect(GeocodingCacheService.getGeocodeCache(query, {})).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('pre-caching of nearby locations', () => {
    it('should mark nearby locations for pre-caching', async () => {
      // Arrange
      const lat = 40.7128;
      const lon = -74.0060;

      // Act
      await GeocodingCacheService.preCacheNearbyLocations(lat, lon);

      // Assert
      // Should log 8 nearby locations (3x3 grid minus center)
      expect(console.log).toHaveBeenCalledTimes(8);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Marked for pre-caching:')
      );
    });
  });

  describe('storage size management', () => {
    it('should enforce maximum cache size for geocode entries', () => {
      // Arrange - Add more than MAX_CACHE_SIZE entries
      for (let i = 0; i < 105; i++) {
        const query = `City${i}`;
        const results: GeocodeResult[] = [
          {
            lat: `${i}`,
            lon: `${i}`,
            display_name: query,
          },
        ];
        GeocodingCacheService.setGeocodeCache(query, {}, results);
      }

      // Assert - Should only keep the most recent 100 entries
      // The first 5 entries should be evicted
      for (let i = 0; i < 5; i++) {
        expect(GeocodingCacheService.getGeocodeCache(`City${i}`, {})).toBeNull();
      }
      
      // Recent entries should still be cached
      for (let i = 5; i < 105; i++) {
        expect(GeocodingCacheService.getGeocodeCache(`City${i}`, {})).toBeTruthy();
      }
    });

    it('should enforce maximum cache size for reverse geocode entries', () => {
      // Arrange - Add more than MAX_CACHE_SIZE entries
      for (let i = 0; i < 105; i++) {
        const result: ReverseGeocodeResult = {
          city: `City${i}`,
          country: 'Country',
          latitude: i,
          longitude: i,
        };
        GeocodingCacheService.setReverseGeocodeCache(i, i, result);
      }

      // Assert - Should only keep the most recent 100 entries
      // The first 5 entries should be evicted
      for (let i = 0; i < 5; i++) {
        expect(GeocodingCacheService.getReverseGeocodeCache(i, i)).toBeNull();
      }
      
      // Recent entries should still be cached
      for (let i = 5; i < 105; i++) {
        expect(GeocodingCacheService.getReverseGeocodeCache(i, i)).toBeTruthy();
      }
    });
  });

  describe('cache cleanup on size limit', () => {
    it('should clean up oldest entries when reaching size limit', () => {
      // Arrange
      const baseTime = Date.now();
      
      // Add entries with different timestamps
      for (let i = 0; i < 100; i++) {
        vi.setSystemTime(baseTime + i * 1000);
        const query = `Query${i}`;
        const results: GeocodeResult[] = [
          {
            lat: `${i}`,
            lon: `${i}`,
            display_name: query,
          },
        ];
        GeocodingCacheService.setGeocodeCache(query, {}, results);
      }

      // Add one more entry to trigger cleanup
      vi.setSystemTime(baseTime + 101 * 1000);
      GeocodingCacheService.setGeocodeCache('NewQuery', {}, [
        {
          lat: '101',
          lon: '101',
          display_name: 'NewQuery',
        },
      ]);

      // Assert - Oldest entry should be removed
      expect(GeocodingCacheService.getGeocodeCache('Query0', {})).toBeNull();
      
      // Newer entries should still exist
      expect(GeocodingCacheService.getGeocodeCache('Query99', {})).toBeTruthy();
      expect(GeocodingCacheService.getGeocodeCache('NewQuery', {})).toBeTruthy();

      vi.useRealTimers();
    });
  });

  describe('cache persistence', () => {
    it('should save cache to localStorage', () => {
      // Arrange
      const query = 'Berlin';
      const mockResults: GeocodeResult[] = [
        {
          lat: '52.5200',
          lon: '13.4050',
          display_name: 'Berlin, Germany',
        },
      ];

      // Act
      GeocodingCacheService.setGeocodeCache(query, {}, mockResults);

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'geocoding-cache',
        expect.any(String)
      );
    });

    it('should handle localStorage save errors gracefully', () => {
      // Arrange
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const query = 'Sydney';
      const mockResults: GeocodeResult[] = [
        {
          lat: '-33.8688',
          lon: '151.2093',
          display_name: 'Sydney, Australia',
        },
      ];

      // Act - Should not throw
      expect(() => {
        GeocodingCacheService.setGeocodeCache(query, {}, mockResults);
      }).not.toThrow();

      // Assert
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save geocoding cache:',
        expect.any(Error)
      );
    });
  });

  describe('cache invalidation', () => {
    it('should clear all caches', () => {
      // Arrange
      const geocodeResults: GeocodeResult[] = [
        {
          lat: '0',
          lon: '0',
          display_name: 'Test Location',
        },
      ];
      const reverseResult: ReverseGeocodeResult = {
        city: 'Test City',
        country: 'Test Country',
        latitude: 0,
        longitude: 0,
      };

      GeocodingCacheService.setGeocodeCache('test', {}, geocodeResults);
      GeocodingCacheService.setReverseGeocodeCache(0, 0, reverseResult);

      // Act
      GeocodingCacheService.clearCache();

      // Assert
      expect(GeocodingCacheService.getGeocodeCache('test', {})).toBeNull();
      expect(GeocodingCacheService.getReverseGeocodeCache(0, 0)).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('geocoding-cache');
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent keys for geocode requests', () => {
      // Arrange
      const query1 = 'New York';
      const query2 = 'new york'; // Different case
      const query3 = '  New York  '; // With spaces
      const options = { limit: 5 };

      const results: GeocodeResult[] = [
        {
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York',
        },
      ];

      // Act
      GeocodingCacheService.setGeocodeCache(query1, options, results);

      // Assert - All variations should retrieve the same cached result
      expect(GeocodingCacheService.getGeocodeCache(query2, options)).toEqual(results);
      expect(GeocodingCacheService.getGeocodeCache(query3, options)).toEqual(results);
    });

    it('should round coordinates for reverse geocode keys', () => {
      // Arrange
      const result: ReverseGeocodeResult = {
        city: 'Test City',
        country: 'Test Country',
        latitude: 40.71284567,
        longitude: -74.00604321,
      };

      // Set cache with precise coordinates
      GeocodingCacheService.setReverseGeocodeCache(40.71284567, -74.00604321, result);

      // Act & Assert - Nearby coordinates should retrieve the same result
      expect(GeocodingCacheService.getReverseGeocodeCache(40.71284999, -74.00604999)).toEqual(result);
      expect(GeocodingCacheService.getReverseGeocodeCache(40.71280001, -74.00600001)).toEqual(result);
    });
  });
});