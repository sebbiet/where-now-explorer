import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RoutingService,
  RoutingError,
  RoutingProfile,
  RouteResponse,
} from '../routing.service';
import { offlineMode } from '../offlineMode.service';
import {
  deduplicateRoutingRequest,
  deduplicateGeocodingRequest,
} from '@/utils/requestDeduplication';

// Mock dependencies
vi.mock('../offlineMode.service', () => ({
  offlineMode: {
    getOnlineStatus: vi.fn(),
  },
}));

vi.mock('@/utils/requestDeduplication', () => ({
  deduplicateRoutingRequest: vi.fn((origin, destination, profile, operation) =>
    operation()
  ),
  deduplicateGeocodingRequest: vi.fn((type, params, operation) => operation()),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock console.log to avoid test output noise
const originalConsoleLog = console.log;

describe('RoutingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    vi.mocked(offlineMode.getOnlineStatus).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
  });

  describe('getRoute', () => {
    const validOrigin = { latitude: 40.7128, longitude: -74.006 };
    const validDestination = { latitude: 34.0522, longitude: -118.2437 };

    it('should calculate route with driving mode', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 4500000, // 4500 km
            duration: 162000, // 45 hours in seconds
            legs: [
              {
                distance: 4500000,
                duration: 162000,
              },
            ],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await RoutingService.calculateRoute({
        origin: validOrigin,
        destination: validDestination,
        profile: RoutingProfile.DRIVING,
      });

      // Assert
      expect(result).toEqual({
        distanceKm: 4500,
        durationMinutes: 2700,
        formattedDistance: '4500.0 kilometers',
        formattedDuration: '45 hours',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('driving/-74.006,40.7128;-118.2437,34.0522'),
        expect.any(Object)
      );
    });

    it('should calculate route with walking mode', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 5000, // 5 km
            duration: 3600, // 60 minutes in seconds
            legs: [
              {
                distance: 5000,
                duration: 3600,
              },
            ],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await RoutingService.calculateRoute({
        origin: validOrigin,
        destination: validDestination,
        profile: RoutingProfile.WALKING,
      });

      // Assert
      expect(result).toEqual({
        distanceKm: 5,
        durationMinutes: 60,
        formattedDistance: '5.0 kilometers',
        formattedDuration: '1 hour',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('walking/'),
        expect.any(Object)
      );
    });

    it('should calculate route with cycling mode', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 10000, // 10 km
            duration: 1800, // 30 minutes in seconds
            legs: [
              {
                distance: 10000,
                duration: 1800,
              },
            ],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await RoutingService.calculateRoute({
        origin: validOrigin,
        destination: validDestination,
        profile: RoutingProfile.CYCLING,
      });

      // Assert
      expect(result).toEqual({
        distanceKm: 10,
        durationMinutes: 30,
        formattedDistance: '10.0 kilometers',
        formattedDuration: '30 minutes',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cycling/'),
        expect.any(Object)
      );
    });

    it('should handle invalid coordinate input', async () => {
      // Test invalid latitude
      await expect(
        RoutingService.calculateRoute({
          origin: { latitude: 91, longitude: 0 },
          destination: validDestination,
        })
      ).rejects.toThrow();

      // Test invalid longitude
      await expect(
        RoutingService.calculateRoute({
          origin: { latitude: 0, longitude: 181 },
          destination: validDestination,
        })
      ).rejects.toThrow();

      // Test NaN values
      await expect(
        RoutingService.calculateRoute({
          origin: { latitude: NaN, longitude: 0 },
          destination: validDestination,
        })
      ).rejects.toThrow();
    });

    it('should handle API error scenarios', async () => {
      // Network error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        RoutingService.calculateRoute({
          origin: validOrigin,
          destination: validDestination,
        })
      ).rejects.toThrow();

      // Non-Ok response code
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'InvalidInput',
          message: 'Invalid coordinates',
        }),
      } as Response);

      await expect(
        RoutingService.calculateRoute({
          origin: validOrigin,
          destination: validDestination,
        })
      ).rejects.toThrow(RoutingError);
    });

    it('should handle empty route response', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [], // Empty routes array
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act & Assert
      await expect(
        RoutingService.calculateRoute({
          origin: validOrigin,
          destination: validDestination,
        })
      ).rejects.toThrow('No route found between the specified locations');
    });

    it('should use request deduplication', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 600,
            legs: [{ distance: 1000, duration: 600 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await RoutingService.calculateRoute({
        origin: validOrigin,
        destination: validDestination,
      });

      // Assert
      expect(deduplicateRoutingRequest).toHaveBeenCalledWith(
        validOrigin,
        validDestination,
        RoutingProfile.DRIVING,
        expect.any(Function)
      );
    });

    it('should handle offline mode', async () => {
      // Arrange
      vi.mocked(offlineMode.getOnlineStatus).mockReturnValue(false);

      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 600,
            legs: [{ distance: 1000, duration: 600 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await RoutingService.calculateRoute({
        origin: validOrigin,
        destination: validDestination,
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        'Offline mode: checking cached routes'
      );
    });
  });

  describe('distance formatting', () => {
    it('should format distance in kilometers', () => {
      expect(RoutingService.formatDistance(10.5)).toBe('10.5 kilometers');
      expect(RoutingService.formatDistance(1)).toBe('1.0 kilometers');
      expect(RoutingService.formatDistance(100.123)).toBe('100.1 kilometers');
    });

    it('should format distance in meters for values less than 1km', () => {
      expect(RoutingService.formatDistance(0.5)).toBe('500 meters');
      expect(RoutingService.formatDistance(0.75)).toBe('750 meters');
      expect(RoutingService.formatDistance(0.001)).toBe('1 meters');
    });
  });

  describe('duration formatting', () => {
    it('should format duration in minutes only', () => {
      expect(RoutingService.formatDuration(30)).toBe('30 minutes');
      expect(RoutingService.formatDuration(1)).toBe('1 minute');
      expect(RoutingService.formatDuration(59)).toBe('59 minutes');
    });

    it('should format duration in hours and minutes', () => {
      expect(RoutingService.formatDuration(60)).toBe('1 hour');
      expect(RoutingService.formatDuration(90)).toBe('1 hour 30 min');
      expect(RoutingService.formatDuration(125)).toBe('2 hours 5 min');
      expect(RoutingService.formatDuration(120)).toBe('2 hours');
    });
  });

  describe('arrival time calculations', () => {
    it('should calculate arrival time correctly', () => {
      // Arrange
      const now = new Date('2024-01-01T10:00:00');
      vi.setSystemTime(now);

      // Act
      const arrivalTime = RoutingService.estimateArrivalTime(90); // 90 minutes

      // Assert
      expect(arrivalTime).toEqual(new Date('2024-01-01T11:30:00'));

      vi.useRealTimers();
    });

    it('should format arrival time correctly', () => {
      // Arrange
      const arrivalTime = new Date('2024-01-01T15:45:00');

      // Act
      const formatted = RoutingService.formatArrivalTime(arrivalTime);

      // Assert
      // Note: The exact format may vary based on locale
      expect(formatted).toMatch(/15:45|3:45\s*PM/);
    });
  });

  describe('backward compatibility', () => {
    it('should support legacy interface', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 5000,
            duration: 300,
            legs: [{ distance: 5000, duration: 300 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await RoutingService.calculateRoute(
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 34.0522, longitude: -118.2437 },
        RoutingProfile.WALKING
      );

      // Assert
      expect(result.distanceKm).toBe(5);
      expect(result.durationMinutes).toBe(5);
    });

    it('should support legacy interface with options', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 5000,
            duration: 300,
            legs: [{ distance: 5000, duration: 300 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await RoutingService.calculateRoute(
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 34.0522, longitude: -118.2437 },
        RoutingProfile.DRIVING,
        {
          overview: true,
          steps: true,
          alternatives: true,
          geometries: 'geojson',
        }
      );

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('overview=true');
      expect(url).toContain('steps=true');
      expect(url).toContain('alternatives=true');
      expect(url).toContain('geometries=geojson');
    });
  });

  describe('route options', () => {
    it('should handle optional route parameters', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 600,
            legs: [{ distance: 1000, duration: 600 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await RoutingService.calculateRoute({
        origin: { latitude: 40.7128, longitude: -74.006 },
        destination: { latitude: 34.0522, longitude: -118.2437 },
        overview: true,
        steps: true,
        alternatives: false,
        geometries: 'polyline6',
      });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('overview=true');
      expect(url).toContain('steps=true');
      expect(url).toContain('alternatives=false');
      expect(url).toContain('geometries=polyline6');
    });

    it('should use default values when options not provided', async () => {
      // Arrange
      const mockResponse: RouteResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 600,
            legs: [{ distance: 1000, duration: 600 }],
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      await RoutingService.calculateRoute({
        origin: { latitude: 40.7128, longitude: -74.006 },
        destination: { latitude: 34.0522, longitude: -118.2437 },
      });

      // Assert
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('overview=false');
      expect(url).toContain('steps=false');
      expect(url).toContain('alternatives=false');
      expect(url).toContain('geometries=polyline');
    });
  });
});
