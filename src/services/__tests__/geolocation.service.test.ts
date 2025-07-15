import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeolocationService, GeolocationErrorCode, GeolocationError, GeolocationPosition } from '../geolocation.service';
import { analytics } from '../analytics.service';
import { getErrorMessage } from '@/utils/errorMessages';

// Mock dependencies
vi.mock('../analytics.service', () => ({
  analytics: {
    track: vi.fn(),
    trackLocationPermission: vi.fn(),
  },
}));

vi.mock('@/utils/errorMessages', () => ({
  getErrorMessage: vi.fn((category: string, key: string) => `${category}_${key}`),
}));

describe('GeolocationService', () => {
  // Mock navigator.geolocation
  const mockGetCurrentPosition = vi.fn();
  const mockWatchPosition = vi.fn();
  const mockClearWatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup navigator.geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentPosition', () => {
    it('should successfully get current position', async () => {
      // Arrange
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 100,
          altitudeAccuracy: 5,
          heading: 180,
          speed: 5,
        },
        timestamp: Date.now(),
      };

      mockGetCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      // Act
      const result = await GeolocationService.getCurrentPosition();

      // Assert
      expect(result).toEqual({
        coords: mockPosition.coords,
        timestamp: mockPosition.timestamp,
      });
      expect(analytics.trackLocationPermission).toHaveBeenCalledWith(true);
      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
    });

    it('should handle permission denied error', async () => {
      // Arrange
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      // Act & Assert
      await expect(GeolocationService.getCurrentPosition()).rejects.toThrow(GeolocationError);
      
      try {
        await GeolocationService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect(error.code).toBe(GeolocationErrorCode.PERMISSION_DENIED);
        expect(error.message).toBe('LOCATION_PERMISSION_DENIED');
      }

      expect(analytics.track).toHaveBeenCalledWith('location_permission_error', {
        error_type: GeolocationErrorCode.PERMISSION_DENIED,
        error_message: 'LOCATION_PERMISSION_DENIED',
      });
    });

    it('should handle timeout error', async () => {
      // Arrange
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout expired',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      // Act & Assert
      await expect(GeolocationService.getCurrentPosition()).rejects.toThrow(GeolocationError);
      
      try {
        await GeolocationService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect(error.code).toBe(GeolocationErrorCode.TIMEOUT);
        expect(error.message).toBe('LOCATION_TIMEOUT');
      }

      expect(analytics.track).toHaveBeenCalledWith('location_permission_error', {
        error_type: GeolocationErrorCode.TIMEOUT,
        error_message: 'LOCATION_TIMEOUT',
      });
    });

    it('should handle position unavailable error', async () => {
      // Arrange
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      // Act & Assert
      await expect(GeolocationService.getCurrentPosition()).rejects.toThrow(GeolocationError);
      
      try {
        await GeolocationService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect(error.code).toBe(GeolocationErrorCode.POSITION_UNAVAILABLE);
        expect(error.message).toBe('LOCATION_UNAVAILABLE');
      }

      expect(analytics.track).toHaveBeenCalledWith('location_permission_error', {
        error_type: GeolocationErrorCode.POSITION_UNAVAILABLE,
        error_message: 'LOCATION_UNAVAILABLE',
      });
    });

    it('should handle unsupported browser', async () => {
      // Arrange
      Object.defineProperty(global.navigator, 'geolocation', {
        writable: true,
        value: undefined,
      });

      // Act & Assert
      await expect(GeolocationService.getCurrentPosition()).rejects.toThrow(GeolocationError);
      
      try {
        await GeolocationService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect(error.code).toBe(GeolocationErrorCode.UNSUPPORTED);
        expect(error.message).toBe('LOCATION_NOT_SUPPORTED');
      }

      expect(analytics.track).toHaveBeenCalledWith('location_permission_error', {
        error_type: 'unsupported',
        error_message: 'LOCATION_NOT_SUPPORTED',
      });
    });

    it('should accept custom options', async () => {
      // Arrange
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      const customOptions = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      };

      mockGetCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      // Act
      await GeolocationService.getCurrentPosition(customOptions);

      // Assert
      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        customOptions
      );
    });
  });

  describe('watchPosition', () => {
    it('should successfully watch position with mock callbacks', async () => {
      // Arrange
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 50,
          altitudeAccuracy: 5,
          heading: 90,
          speed: 10,
        },
        timestamp: Date.now(),
      };

      const mockWatchId = 123;
      const onPosition = vi.fn();
      const onError = vi.fn();

      mockWatchPosition.mockImplementation((success) => {
        success(mockPosition);
        return mockWatchId;
      });

      // Act
      const watchId = await GeolocationService.watchPosition(onPosition, onError);

      // Assert
      expect(watchId).toBe(mockWatchId);
      expect(onPosition).toHaveBeenCalledWith({
        coords: mockPosition.coords,
        timestamp: mockPosition.timestamp,
      });
      expect(onError).not.toHaveBeenCalled();
      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
    });

    it('should handle errors in watchPosition', async () => {
      // Arrange
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      const onPosition = vi.fn();
      const onError = vi.fn();

      mockWatchPosition.mockImplementation((success, error) => {
        error(mockError);
        return 456;
      });

      // Act
      const watchId = await GeolocationService.watchPosition(onPosition, onError);

      // Assert
      expect(watchId).toBe(456);
      expect(onPosition).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: GeolocationErrorCode.PERMISSION_DENIED,
        message: 'LOCATION_PERMISSION_DENIED',
      }));
    });

    it('should handle unsupported browser in watchPosition', async () => {
      // Arrange
      Object.defineProperty(global.navigator, 'geolocation', {
        writable: true,
        value: undefined,
      });

      const onPosition = vi.fn();
      const onError = vi.fn();

      // Act
      const watchId = await GeolocationService.watchPosition(onPosition, onError);

      // Assert
      expect(watchId).toBe(-1);
      expect(onPosition).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: GeolocationErrorCode.UNSUPPORTED,
        message: 'LOCATION_NOT_SUPPORTED',
      }));
    });

    it('should accept custom options in watchPosition', async () => {
      // Arrange
      const mockWatchId = 789;
      const customOptions = {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 30000,
      };

      const onPosition = vi.fn();
      const onError = vi.fn();

      mockWatchPosition.mockReturnValue(mockWatchId);

      // Act
      const watchId = await GeolocationService.watchPosition(onPosition, onError, customOptions);

      // Assert
      expect(watchId).toBe(mockWatchId);
      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        customOptions
      );
    });
  });

  describe('clearWatch', () => {
    it('should clear watch functionality', () => {
      // Arrange
      const watchId = 123;

      // Act
      GeolocationService.clearWatch(watchId);

      // Assert
      expect(mockClearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should handle missing geolocation gracefully in clearWatch', () => {
      // Arrange
      Object.defineProperty(global.navigator, 'geolocation', {
        writable: true,
        value: undefined,
      });

      // Act & Assert - should not throw
      expect(() => GeolocationService.clearWatch(123)).not.toThrow();
    });
  });

  describe('error transformation', () => {
    it('should handle unknown error codes', async () => {
      // Arrange
      const mockError = {
        code: 999, // Unknown code
        message: 'Unknown error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      // Act & Assert
      try {
        await GeolocationService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect(error.code).toBe(GeolocationErrorCode.UNKNOWN);
        expect(error.message).toBe('LOCATION_UNAVAILABLE');
      }
    });
  });
});