import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineModeService } from '../offlineMode.service';
import { LocationData } from '@/contexts/LocationContext';
import { RouteResult } from '../routing.service';
import { GeocodeResult } from '../geocoding.service';

// Create a test instance
let offlineService: OfflineModeService;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Timer setup will be done per test

describe('OfflineModeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    console.log = vi.fn();
    console.error = vi.fn();

    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Create new instance for each test
    offlineService = new OfflineModeService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('online/offline detection', () => {
    it('should detect initial online status', () => {
      expect(offlineService.getOnlineStatus()).toBe(true);
    });

    it('should handle offline event', () => {
      // Act - Trigger offline event
      window.dispatchEvent(new Event('offline'));

      // Assert
      expect(offlineService.getOnlineStatus()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Application is offline');
    });

    it('should handle online event', () => {
      // Arrange - Set to offline first
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });
      offlineService = new OfflineModeService();

      // Act - Trigger online event
      window.dispatchEvent(new Event('online'));

      // Assert
      expect(offlineService.getOnlineStatus()).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Application is back online');
    });

    it('should notify subscribers of status changes', () => {
      // Arrange
      const callback = vi.fn();
      offlineService.subscribeToOnlineStatus(callback);

      // Act - Go offline
      window.dispatchEvent(new Event('offline'));

      // Assert
      expect(callback).toHaveBeenCalledWith(false);

      // Act - Go online
      window.dispatchEvent(new Event('online'));

      // Assert
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should allow unsubscribing from status changes', () => {
      // Arrange
      const callback = vi.fn();
      const unsubscribe = offlineService.subscribeToOnlineStatus(callback);

      // Act - Unsubscribe
      unsubscribe();

      // Trigger event after unsubscribing
      window.dispatchEvent(new Event('offline'));

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('network check fallback', () => {
    it('should periodically check connectivity', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Act - Fast forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
      });
    });

    it('should detect offline state through fetch failure', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      // Act - Fast forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Assert
      expect(offlineService.getOnlineStatus()).toBe(false);
    });

    it('should detect online state through successful fetch', async () => {
      // Arrange - Set service to offline state first
      window.dispatchEvent(new Event('offline'));
      expect(offlineService.getOnlineStatus()).toBe(false);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Act - Fast forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Assert
      expect(offlineService.getOnlineStatus()).toBe(true);
    });
  });

  describe('route caching functionality', () => {
    const mockOrigin: LocationData = {
      latitude: 40.7128,
      longitude: -74.006,
      address: 'New York, NY',
      timestamp: Date.now(),
    };

    const mockDestination = {
      name: 'Los Angeles',
      location: {
        lat: '34.0522',
        lon: '-118.2437',
        display_name: 'Los Angeles, CA',
        place_id: 'la_123',
      } as GeocodeResult,
    };

    const mockRoute: RouteResult = {
      distanceKm: 4500,
      durationMinutes: 2700,
      formattedDistance: '4500 km',
      formattedDuration: '45 hours',
    };

    it('should cache a new route', () => {
      // Act
      offlineService.cacheRoute(mockOrigin, mockDestination, mockRoute);

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline-data',
        expect.stringContaining('"routes":[{')
      );
    });

    it('should update existing route access count', () => {
      // Arrange - Cache route first
      offlineService.cacheRoute(mockOrigin, mockDestination, mockRoute);

      // Act - Cache same route again
      offlineService.cacheRoute(mockOrigin, mockDestination, mockRoute);

      // Assert - Check that route was updated, not duplicated
      const lastCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.routes).toHaveLength(1);
      expect(savedData.routes[0].accessCount).toBe(2);
    });

    it('should enforce maximum cached routes', () => {
      // Arrange - Cache more than MAX_CACHED_ROUTES
      for (let i = 0; i < 55; i++) {
        const destination = {
          name: `City ${i}`,
          location: {
            lat: `${i}`,
            lon: `${i}`,
            display_name: `City ${i}`,
            place_id: `city_${i}`,
          } as GeocodeResult,
        };
        offlineService.cacheRoute(mockOrigin, destination, mockRoute);
      }

      // Assert - Should only keep MAX_CACHED_ROUTES
      const lastCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.routes.length).toBeLessThanOrEqual(50);
    });
  });

  describe('route retrieval from cache', () => {
    const mockOrigin: LocationData = {
      latitude: 40.7128,
      longitude: -74.006,
      address: 'New York, NY',
      timestamp: Date.now(),
    };

    const mockDestination: GeocodeResult = {
      lat: '34.0522',
      lon: '-118.2437',
      display_name: 'Los Angeles, CA',
      place_id: 'la_123',
    };

    const mockRoute: RouteResult = {
      distanceKm: 4500,
      durationMinutes: 2700,
      formattedDistance: '4500 km',
      formattedDuration: '45 hours',
    };

    it('should retrieve cached route', () => {
      // Arrange
      offlineService.cacheRoute(
        mockOrigin,
        { name: 'LA', location: mockDestination },
        mockRoute
      );

      // Act
      const cachedRoute = offlineService.getCachedRoute(
        mockOrigin,
        mockDestination
      );

      // Assert
      expect(cachedRoute).toEqual(mockRoute);
    });

    it('should return null for non-cached route', () => {
      // Act
      const cachedRoute = offlineService.getCachedRoute(
        mockOrigin,
        mockDestination
      );

      // Assert
      expect(cachedRoute).toBeNull();
    });

    it('should update access stats when retrieving route', () => {
      // Arrange
      offlineService.cacheRoute(
        mockOrigin,
        { name: 'LA', location: mockDestination },
        mockRoute
      );

      // Act
      offlineService.getCachedRoute(mockOrigin, mockDestination);

      // Assert - Check that access count was incremented
      const lastCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.routes[0].accessCount).toBe(2); // 1 from cache, 1 from retrieval
    });
  });

  describe('frequently accessed routes tracking', () => {
    it('should return frequently accessed routes sorted by access count', () => {
      // Arrange - Create routes with different access counts
      const routes = [];
      for (let i = 0; i < 15; i++) {
        const destination = {
          name: `City ${i}`,
          location: {
            lat: `${i}`,
            lon: `${i}`,
            display_name: `City ${i}`,
            place_id: `city_${i}`,
          } as GeocodeResult,
        };

        const route: RouteResult = {
          distanceKm: i * 100,
          durationMinutes: i * 60,
          formattedDistance: `${i * 100} km`,
          formattedDuration: `${i} hours`,
        };

        const origin: LocationData = {
          latitude: 40 + i * 0.1,
          longitude: -74 + i * 0.1,
          address: `Origin ${i}`,
          timestamp: Date.now(),
        };

        // Cache route multiple times to simulate access
        for (let j = 0; j < i; j++) {
          offlineService.cacheRoute(origin, destination, route);
        }

        routes.push({ destination, accessCount: i });
      }

      // Act
      const frequentRoutes = offlineService.getFrequentRoutes();

      // Assert
      expect(frequentRoutes).toHaveLength(10); // Should return top 10
      expect(frequentRoutes[0].accessCount).toBeGreaterThanOrEqual(
        frequentRoutes[1].accessCount
      );
    });
  });

  describe('storage management with LRU eviction', () => {
    it('should evict least recently used routes when storage is full', () => {
      // Arrange - Create old and new routes
      const oldTime = Date.now() - 1000000; // 1 million ms ago
      const newTime = Date.now();

      // Mock initial data with old routes
      const initialData = {
        routes: Array.from({ length: 48 }, (_, i) => ({
          id: `route_${i}`,
          origin: { latitude: i, longitude: i } as LocationData,
          destination: {
            name: `City ${i}`,
            location: {
              lat: `${i}`,
              lon: `${i}`,
              place_id: `city_${i}`,
            } as GeocodeResult,
          },
          route: {} as RouteResult,
          timestamp: oldTime,
          accessCount: 1,
          lastAccessed: oldTime,
        })),
        destinations: [],
        lastSync: oldTime,
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initialData));
      offlineService = new OfflineModeService();

      // Add 3 new routes to exceed limit
      for (let i = 48; i < 51; i++) {
        const destination = {
          name: `New City ${i}`,
          location: {
            lat: `${i}`,
            lon: `${i}`,
            display_name: `New City ${i}`,
            place_id: `new_city_${i}`,
          } as GeocodeResult,
        };

        offlineService.cacheRoute(
          { latitude: i, longitude: i } as LocationData,
          destination,
          {} as RouteResult
        );
      }

      // Assert - Should have pruned old routes
      const lastCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.routes.length).toBe(50);

      // New routes should be present
      const hasNewRoute = savedData.routes.some((r: any) =>
        r.destination.name.includes('New City')
      );
      expect(hasNewRoute).toBe(true);
    });
  });

  describe('cache invalidation', () => {
    it('should clear all offline data', () => {
      // Arrange - Add some data
      offlineService.cacheRoute(
        { latitude: 40, longitude: -74 } as LocationData,
        {
          name: 'Test City',
          location: {
            lat: '34',
            lon: '-118',
            place_id: 'test',
          } as GeocodeResult,
        },
        {} as RouteResult
      );

      // Act
      offlineService.clearOfflineData();

      // Assert
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-data');
      expect(offlineService.getCachedDestinations()).toHaveLength(0);
      expect(offlineService.getFrequentRoutes()).toHaveLength(0);
    });

    it('should clean up old routes based on age', () => {
      // Arrange - Create routes with old timestamps
      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      const recentTime = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago

      const initialData = {
        routes: [
          {
            id: 'old_route',
            origin: { latitude: 1, longitude: 1 } as LocationData,
            destination: {
              name: 'Old City',
              location: {
                lat: '1',
                lon: '1',
                place_id: 'old',
              } as GeocodeResult,
            },
            route: {} as RouteResult,
            timestamp: oldTime,
            accessCount: 10,
            lastAccessed: oldTime,
          },
          {
            id: 'recent_route',
            origin: { latitude: 2, longitude: 2 } as LocationData,
            destination: {
              name: 'Recent City',
              location: {
                lat: '2',
                lon: '2',
                place_id: 'recent',
              } as GeocodeResult,
            },
            route: {} as RouteResult,
            timestamp: recentTime,
            accessCount: 1,
            lastAccessed: recentTime,
          },
        ],
        destinations: [],
        lastSync: Date.now(),
      };

      // Reset mocks and set up initial data
      vi.clearAllMocks();
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      // Act - Create new instance which triggers cleanup
      const testService = new OfflineModeService();

      // Assert - Old route should be removed
      const savedCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === 'offline-data'
      );
      if (savedCall) {
        const savedData = JSON.parse(savedCall[1]);
        expect(savedData.routes).toHaveLength(1);
        expect(savedData.routes[0].id).toBe('recent_route');
      }
    });
  });

  describe('destination caching', () => {
    it('should cache destinations', () => {
      // Arrange
      const destination: GeocodeResult = {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: 'New York, NY',
        place_id: 'ny_123',
      };

      // Act
      offlineService.cacheDestination(destination);

      // Assert
      const destinations = offlineService.getCachedDestinations();
      expect(destinations).toHaveLength(1);
      expect(destinations[0]).toEqual(destination);
    });

    it('should not duplicate destinations', () => {
      // Arrange
      const destination: GeocodeResult = {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: 'New York, NY',
        place_id: 'ny_123',
      };

      // Act - Cache same destination twice
      offlineService.cacheDestination(destination);
      offlineService.cacheDestination(destination);

      // Assert
      const destinations = offlineService.getCachedDestinations();
      expect(destinations).toHaveLength(1);
    });

    it('should enforce maximum cached destinations', () => {
      // Arrange - Cache more than MAX_CACHED_DESTINATIONS
      for (let i = 0; i < 105; i++) {
        const destination: GeocodeResult = {
          lat: `${i}`,
          lon: `${i}`,
          display_name: `City ${i}`,
          place_id: `city_${i}`,
        };
        offlineService.cacheDestination(destination);
      }

      // Assert
      const destinations = offlineService.getCachedDestinations();
      expect(destinations).toHaveLength(100);
      // Should keep the most recent ones
      expect(destinations[0].place_id).toBe('city_5');
      expect(destinations[99].place_id).toBe('city_104');
    });
  });

  describe('offline statistics', () => {
    it('should provide offline data statistics', () => {
      // Arrange - Add some data
      const origin: LocationData = {
        latitude: 40,
        longitude: -74,
        address: 'Test',
        timestamp: Date.now(),
      };

      for (let i = 0; i < 5; i++) {
        const destination = {
          name: `City ${i}`,
          location: {
            lat: `${i}`,
            lon: `${i}`,
            display_name: `City ${i}`,
            place_id: `city_${i}`,
          } as GeocodeResult,
        };
        offlineService.cacheRoute(origin, destination, {} as RouteResult);
      }

      // Act
      const stats = offlineService.getOfflineStats();

      // Assert
      expect(stats.routeCount).toBe(5);
      expect(stats.destinationCount).toBe(5);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.lastSync).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Arrange
      let errorCount = 0;
      localStorageMock.setItem.mockImplementation(() => {
        errorCount++;
        if (errorCount === 1) {
          throw new Error('QuotaExceededError');
        }
      });

      const origin: LocationData = {
        latitude: 40,
        longitude: -74,
        address: 'Test',
        timestamp: Date.now(),
      };

      const destination = {
        name: 'Test City',
        location: {
          lat: '34',
          lon: '-118',
          display_name: 'Test City',
          place_id: 'test_123',
        } as GeocodeResult,
      };

      // Act - Should not throw
      expect(() => {
        offlineService.cacheRoute(origin, destination, {} as RouteResult);
      }).not.toThrow();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save offline data:',
        expect.any(Error)
      );
    });

    it('should handle corrupted localStorage data', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValueOnce('invalid json data');

      // Act - Should not throw when creating instance
      expect(() => {
        new OfflineModeService();
      }).not.toThrow();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load offline data:',
        expect.any(Error)
      );
    });
  });
});
