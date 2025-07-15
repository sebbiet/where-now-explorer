import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useDistanceCalculation } from '../useDistanceCalculation';
import { RoutingService, RouteResult } from '@/services/routing.service';
import { GeocodeResult } from '@/services/geocoding.service';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/services/routing.service', () => ({
  RoutingService: {
    calculateRoute: vi.fn(),
  },
}));

describe('useDistanceCalculation', () => {
  const mockDestination: GeocodeResult = {
    place_id: 123456,
    osm_id: 789012,
    osm_type: 'way',
    lat: '40.7580',
    lon: '-73.9855',
    display_name: 'Times Square, New York, NY',
    name: 'Times Square',
    class: 'tourism',
    type: 'attraction',
    importance: 0.9,
    boundingbox: ['40.7577', '40.7583', '-73.9858', '-73.9852'],
  };

  const mockRouteResult: RouteResult = {
    route: {
      distance: 5432.1,
      duration: 900,
      coordinates: [
        [40.7128, -74.006],
        [40.758, -73.9855],
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useDistanceCalculation());

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.routeResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should successfully calculate distance between points', async () => {
      const onSuccess = vi.fn();
      vi.mocked(RoutingService.calculateRoute).mockResolvedValue(
        mockRouteResult
      );

      const { result } = renderHook(() =>
        useDistanceCalculation({ onSuccess })
      );

      await act(async () => {
        const routeResult = await result.current.calculateDistance(
          40.7128,
          -74.006,
          mockDestination
        );
        expect(routeResult).toEqual(mockRouteResult);
      });

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.routeResult).toEqual(mockRouteResult);
      expect(result.current.error).toBeNull();
      expect(onSuccess).toHaveBeenCalledWith(mockRouteResult);
      expect(RoutingService.calculateRoute).toHaveBeenCalledWith(
        40.7128,
        -74.006,
        40.758,
        -73.9855
      );
    });

    it('should handle route fetching errors', async () => {
      const error = new Error('Network error');
      const onError = vi.fn();
      vi.mocked(RoutingService.calculateRoute).mockRejectedValue(error);

      const { result } = renderHook(() => useDistanceCalculation({ onError }));

      await act(async () => {
        try {
          await result.current.calculateDistance(
            40.7128,
            -74.006,
            mockDestination
          );
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.routeResult).toBeNull();
      expect(result.current.error).toEqual(error);
      expect(onError).toHaveBeenCalledWith(error);
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to calculate route. Please try again.',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry',
          }),
        })
      );
    });

    it('should handle rate limit errors', async () => {
      const error = new Error('You have exceeded the rate limit');
      vi.mocked(RoutingService.calculateRoute).mockRejectedValue(error);

      const { result } = renderHook(() => useDistanceCalculation());

      await act(async () => {
        try {
          await result.current.calculateDistance(
            40.7128,
            -74.006,
            mockDestination
          );
        } catch (e) {
          // Expected to throw
        }
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Too many route calculations. Please wait a moment before trying again.'
      );
    });

    it('should handle route not found errors', async () => {
      const error = new Error('Could not find a route between these locations');
      vi.mocked(RoutingService.calculateRoute).mockRejectedValue(error);

      const { result } = renderHook(() => useDistanceCalculation());

      await act(async () => {
        try {
          await result.current.calculateDistance(
            40.7128,
            -74.006,
            mockDestination
          );
        } catch (e) {
          // Expected to throw
        }
      });

      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't find a route to this destination. Try a different location."
      );
    });

    it('should show loading state during calculation', async () => {
      let resolvePromise: (value: RouteResult) => void;
      const promise = new Promise<RouteResult>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(RoutingService.calculateRoute).mockReturnValue(promise);

      const { result } = renderHook(() => useDistanceCalculation());

      act(() => {
        result.current.calculateDistance(40.7128, -74.006, mockDestination);
      });

      expect(result.current.isCalculating).toBe(true);

      await act(async () => {
        resolvePromise!(mockRouteResult);
        await promise;
      });

      expect(result.current.isCalculating).toBe(false);
    });

    it('should handle invalid coordinate inputs', async () => {
      const invalidDestination: GeocodeResult = {
        ...mockDestination,
        lat: 'invalid',
        lon: 'invalid',
      };

      vi.mocked(RoutingService.calculateRoute).mockImplementation(() => {
        throw new Error('Invalid coordinates');
      });

      const { result } = renderHook(() => useDistanceCalculation());

      await act(async () => {
        try {
          await result.current.calculateDistance(
            40.7128,
            -74.006,
            invalidDestination
          );
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('clearRoute', () => {
    it('should clear route and error state', async () => {
      vi.mocked(RoutingService.calculateRoute).mockResolvedValue(
        mockRouteResult
      );

      const { result } = renderHook(() => useDistanceCalculation());

      // First calculate a route
      await act(async () => {
        await result.current.calculateDistance(
          40.7128,
          -74.006,
          mockDestination
        );
      });

      expect(result.current.routeResult).toEqual(mockRouteResult);

      // Clear the route
      act(() => {
        result.current.clearRoute();
      });

      expect(result.current.routeResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters for values under 1000', () => {
      const { result } = renderHook(() => useDistanceCalculation());

      expect(result.current.formatDistance(500)).toBe('500 m');
      expect(result.current.formatDistance(999)).toBe('999 m');
      expect(result.current.formatDistance(0)).toBe('0 m');
    });

    it('should format distance in kilometers for values 1000 and above', () => {
      const { result } = renderHook(() => useDistanceCalculation());

      expect(result.current.formatDistance(1000)).toBe('1.0 km');
      expect(result.current.formatDistance(1500)).toBe('1.5 km');
      expect(result.current.formatDistance(10500)).toBe('10.5 km');
      expect(result.current.formatDistance(999999)).toBe('1000.0 km');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in minutes only when less than an hour', () => {
      const { result } = renderHook(() => useDistanceCalculation());

      expect(result.current.formatDuration(0)).toBe('0 min');
      expect(result.current.formatDuration(60)).toBe('1 min');
      expect(result.current.formatDuration(300)).toBe('5 min');
      expect(result.current.formatDuration(3599)).toBe('59 min');
    });

    it('should format duration in hours and minutes when 1 hour or more', () => {
      const { result } = renderHook(() => useDistanceCalculation());

      expect(result.current.formatDuration(3600)).toBe('1h 0min');
      expect(result.current.formatDuration(3660)).toBe('1h 1min');
      expect(result.current.formatDuration(7320)).toBe('2h 2min');
      expect(result.current.formatDuration(86400)).toBe('24h 0min');
    });
  });

  describe('retry functionality', () => {
    it('should allow retrying after an error', async () => {
      const error = new Error('Network error');
      vi.mocked(RoutingService.calculateRoute).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDistanceCalculation());

      await act(async () => {
        try {
          await result.current.calculateDistance(
            40.7128,
            -74.006,
            mockDestination
          );
        } catch (e) {
          // Expected to throw
        }
      });

      // Find the retry action from the toast call
      const toastCall = vi
        .mocked(toast.error)
        .mock.calls.find(
          (call) => call[0] === 'Failed to calculate route. Please try again.'
        );
      const retryAction = toastCall?.[1]?.action?.onClick;

      expect(retryAction).toBeDefined();

      // Mock successful response for retry
      vi.mocked(RoutingService.calculateRoute).mockResolvedValueOnce(
        mockRouteResult
      );

      // Execute retry
      await act(async () => {
        if (retryAction) {
          await retryAction();
        }
      });

      await waitFor(() => {
        expect(RoutingService.calculateRoute).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('result caching', () => {
    it('should reset previous results when starting new calculation', async () => {
      vi.mocked(RoutingService.calculateRoute).mockResolvedValue(
        mockRouteResult
      );

      const { result } = renderHook(() => useDistanceCalculation());

      // First calculation
      await act(async () => {
        await result.current.calculateDistance(
          40.7128,
          -74.006,
          mockDestination
        );
      });

      expect(result.current.routeResult).toEqual(mockRouteResult);

      // Start new calculation
      let resolvePromise: (value: RouteResult) => void;
      const promise = new Promise<RouteResult>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(RoutingService.calculateRoute).mockReturnValue(promise);

      act(() => {
        result.current.calculateDistance(40.7128, -74.006, mockDestination);
      });

      // Previous result should be cleared
      expect(result.current.routeResult).toBeNull();
      expect(result.current.error).toBeNull();

      // Complete the calculation
      await act(async () => {
        resolvePromise!(mockRouteResult);
        await promise;
      });
    });
  });
});
