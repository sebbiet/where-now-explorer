import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useGeolocation } from '../useGeolocation';
import { GeolocationService, GeolocationError, GeolocationErrorCode } from '@/services/geolocation.service';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn()
  }
}));

vi.mock('@/services/geolocation.service', () => ({
  GeolocationService: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    isSupported: vi.fn(() => true)
  },
  GeolocationErrorCode: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    UNSUPPORTED: 4
  }
}));

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock alert for the permission denied case
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial loading state', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.coordinates).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('getCurrentPosition', () => {
    it('should handle successful location fetch', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      const onSuccess = vi.fn();
      vi.mocked(GeolocationService.getCurrentPosition).mockResolvedValue(mockPosition);

      const { result } = renderHook(() => useGeolocation({ onSuccess }));

      await act(async () => {
        await result.current.getCurrentPosition();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.coordinates).toEqual(mockPosition.coords);
      expect(result.current.error).toBeNull();
      expect(onSuccess).toHaveBeenCalledWith(mockPosition.coords);
    });

    it('should handle permission denied error', async () => {
      const mockError: GeolocationError = {
        code: GeolocationErrorCode.PERMISSION_DENIED,
        message: 'User denied location permission',
        name: 'GeolocationError'
      };

      const onError = vi.fn();
      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGeolocation({ onError }));

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(onError).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith(
        "📍 Location access denied",
        expect.objectContaining({
          description: "Click the location icon in your browser's address bar to enable permissions."
        })
      );
    });

    it('should handle position unavailable error', async () => {
      const mockError: GeolocationError = {
        code: GeolocationErrorCode.POSITION_UNAVAILABLE,
        message: 'Position unavailable',
        name: 'GeolocationError'
      };

      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(toast.error).toHaveBeenCalledWith(
        "📍 Can't find your location",
        expect.objectContaining({
          description: "Please check if location services are enabled on your device."
        })
      );
    });

    it('should handle timeout error', async () => {
      const mockError: GeolocationError = {
        code: GeolocationErrorCode.TIMEOUT,
        message: 'Request timed out',
        name: 'GeolocationError'
      };

      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(toast.error).toHaveBeenCalledWith(
        "📍 Location request timed out",
        expect.objectContaining({
          description: "This is taking longer than usual."
        })
      );
    });

    it('should handle unsupported browser error', async () => {
      const mockError: GeolocationError = {
        code: GeolocationErrorCode.UNSUPPORTED,
        message: 'Geolocation not supported',
        name: 'GeolocationError'
      };

      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(toast.error).toHaveBeenCalledWith(
        "📍 Your browser doesn't support location services. Please try Chrome, Firefox, or Safari."
      );
    });

    it('should handle generic errors', async () => {
      const mockError: GeolocationError = {
        code: 999 as GeolocationErrorCode,
        message: 'Unknown error occurred',
        name: 'GeolocationError'
      };

      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(toast.error).toHaveBeenCalledWith(
        "📍 Unknown error occurred",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Retry"
          })
        })
      );
    });

    it('should set loading state during position fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      vi.mocked(GeolocationService.getCurrentPosition).mockReturnValue(promise as Promise<GeolocationPosition>);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          coords: {
            latitude: 0,
            longitude: 0,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('watchPosition', () => {
    it('should call GeolocationService.watchPosition with correct parameters', () => {
      const successCallback = vi.fn();
      const errorCallback = vi.fn();
      const options = { enableHighAccuracy: true };
      const mockWatchId = 123;

      vi.mocked(GeolocationService.watchPosition).mockReturnValue(mockWatchId);

      const { result } = renderHook(() => useGeolocation());

      const watchId = result.current.watchPosition(successCallback, errorCallback, options);

      expect(GeolocationService.watchPosition).toHaveBeenCalledWith(
        successCallback,
        errorCallback,
        options
      );
      expect(watchId).toBe(mockWatchId);
    });
  });

  describe('clearWatch', () => {
    it('should call GeolocationService.clearWatch with correct watchId', () => {
      const { result } = renderHook(() => useGeolocation());
      const watchId = 456;

      result.current.clearWatch(watchId);

      expect(GeolocationService.clearWatch).toHaveBeenCalledWith(watchId);
    });
  });

  describe('cleanup on unmount', () => {
    it('should not cause errors when unmounting', () => {
      const { unmount } = renderHook(() => useGeolocation());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('retry functionality', () => {
    it('should allow retrying after timeout error', async () => {
      const mockError: GeolocationError = {
        code: GeolocationErrorCode.TIMEOUT,
        message: 'Request timed out',
        name: 'GeolocationError'
      };

      vi.mocked(GeolocationService.getCurrentPosition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        try {
          await result.current.getCurrentPosition();
        } catch (e) {
          // Expected to throw
        }
      });

      // Find the retry action from the toast call
      const toastCall = vi.mocked(toast.error).mock.calls.find(
        call => call[0] === "📍 Location request timed out"
      );
      const retryAction = toastCall?.[1]?.action?.onClick;

      expect(retryAction).toBeDefined();

      // Mock successful response for retry
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
      vi.mocked(GeolocationService.getCurrentPosition).mockResolvedValueOnce(mockPosition);

      // Execute retry
      await act(async () => {
        if (retryAction) {
          await retryAction();
        }
      });

      await waitFor(() => {
        expect(GeolocationService.getCurrentPosition).toHaveBeenCalledTimes(2);
      });
    });
  });
});