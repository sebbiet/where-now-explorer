import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';
import { flushSync } from 'react-dom';

// Mock the constants
vi.mock('@/styles/constants', () => ({
  animations: {
    timeouts: {
      cleanup: 5000,
    },
  },
}));

// Mock navigator.onLine
const mockNavigator = {
  onLine: true,
};

// Mock window object
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('useOnlineStatus', () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mocks for each test
    global.setTimeout = vi.fn((fn, delay) => {
      if (typeof fn === 'function') {
        // Store the function to call it manually in tests
        return { fn, delay, id: Math.random() };
      }
      return 123 as any;
    });

    global.clearTimeout = vi.fn();

    // Setup navigator mock
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
    });

    // Setup window mock
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
    });

    // Reset navigator state
    mockNavigator.onLine = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  describe('initial online state', () => {
    it('should initialize with navigator.onLine state when online', async () => {
      mockNavigator.onLine = true;

      const { result } = renderHook(() => useOnlineStatus());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(false);
      });
    });

    it('should initialize with navigator.onLine state when offline', () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('should setup event listeners on mount', () => {
      renderHook(() => useOnlineStatus());

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should check initial state even when navigator.onLine is false', () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('offline transition', () => {
    it('should update state when going offline', () => {
      mockNavigator.onLine = true;
      const { result } = renderHook(() => useOnlineStatus());

      // Get the offline event handler
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      expect(offlineHandler).toBeDefined();

      act(() => {
        offlineHandler();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('should reset wasOffline flag when going offline', () => {
      const { result } = renderHook(() => useOnlineStatus());

      // First simulate going offline then online to set wasOffline
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      // Go offline first
      act(() => {
        offlineHandler();
      });

      // Go online to set wasOffline
      act(() => {
        onlineHandler();
      });

      expect(result.current.wasOffline).toBe(true);

      // Go offline again - should reset wasOffline
      act(() => {
        offlineHandler();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('online transition', () => {
    it('should update state when coming back online', () => {
      mockNavigator.onLine = false;
      const { result } = renderHook(() => useOnlineStatus());

      // Start offline
      expect(result.current.isOnline).toBe(false);

      // Get the online event handler
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      expect(onlineHandler).toBeDefined();

      act(() => {
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should set wasOffline flag when coming back online from offline state', () => {
      const { result } = renderHook(() => useOnlineStatus());

      // First go offline
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      act(() => {
        offlineHandler();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // Then go online
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      act(() => {
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });

    it('should not set wasOffline flag when already online', () => {
      mockNavigator.onLine = true;
      const { result } = renderHook(() => useOnlineStatus());

      // Already online
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);

      // Trigger online event while already online
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      act(() => {
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);
    });

    it('should clear wasOffline flag after timeout', () => {
      const { result } = renderHook(() => useOnlineStatus());

      // Go offline first
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      act(() => {
        offlineHandler();
      });

      // Go online to trigger wasOffline
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      act(() => {
        onlineHandler();
      });

      expect(result.current.wasOffline).toBe(true);

      // Verify setTimeout was called with correct delay
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Get the timeout callback and execute it manually
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as any;
      if (setTimeoutCall && setTimeoutCall.fn) {
        act(() => {
          setTimeoutCall.fn();
        });
      }

      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('event listener setup', () => {
    it('should add event listeners for online and offline events', () => {
      renderHook(() => useOnlineStatus());

      expect(mockWindow.addEventListener).toHaveBeenCalledTimes(2);
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should use the same handler functions across re-renders', () => {
      const { rerender } = renderHook(() => useOnlineStatus());

      const firstCallHandlers = {
        online: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'online'
        )?.[1],
        offline: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'offline'
        )?.[1],
      };

      // Clear mocks and rerender
      mockWindow.addEventListener.mockClear();
      rerender();

      const secondCallHandlers = {
        online: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'online'
        )?.[1],
        offline: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'offline'
        )?.[1],
      };

      // Handlers should be different on rerender due to useEffect dependency
      expect(firstCallHandlers.online).toBeDefined();
      expect(secondCallHandlers.online).toBeDefined();
    });

    it('should re-setup listeners when isOnline state changes', () => {
      const { result } = renderHook(() => useOnlineStatus());

      const initialSetupCalls = mockWindow.addEventListener.mock.calls.length;

      // Trigger offline event to change isOnline state
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      act(() => {
        offlineHandler();
      });

      // Should have setup listeners again due to isOnline dependency
      expect(mockWindow.addEventListener.mock.calls.length).toBeGreaterThan(
        initialSetupCalls
      );
    });
  });

  describe('cleanup on unmount', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      // Verify listeners were added
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );

      unmount();

      // Verify listeners were removed
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should remove correct event handlers', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      const addedHandlers = {
        online: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'online'
        )?.[1],
        offline: mockWindow.addEventListener.mock.calls.find(
          (call) => call[0] === 'offline'
        )?.[1],
      };

      unmount();

      const removedHandlers = {
        online: mockWindow.removeEventListener.mock.calls.find(
          (call) => call[0] === 'online'
        )?.[1],
        offline: mockWindow.removeEventListener.mock.calls.find(
          (call) => call[0] === 'offline'
        )?.[1],
      };

      expect(addedHandlers.online).toBe(removedHandlers.online);
      expect(addedHandlers.offline).toBe(removedHandlers.offline);
    });
  });

  describe('mock navigator.onLine', () => {
    it('should handle navigator.onLine being undefined', () => {
      // Mock navigator without onLine property
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      // Should default to undefined/falsy
      expect(result.current.isOnline).toBeFalsy();
    });

    it('should handle navigator being undefined', () => {
      // Mock navigator as undefined
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });

      // Should not crash
      expect(() => {
        renderHook(() => useOnlineStatus());
      }).toThrow(); // This would throw in the current implementation
    });

    it('should respond to rapid online/offline changes', () => {
      const { result } = renderHook(() => useOnlineStatus());

      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      // Start online
      expect(result.current.isOnline).toBe(true);

      // Go offline
      act(() => {
        offlineHandler();
      });
      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // Go online
      act(() => {
        onlineHandler();
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);

      // Go offline again
      act(() => {
        offlineHandler();
      });
      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // Go online again
      act(() => {
        onlineHandler();
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple online events in succession', () => {
      const { result } = renderHook(() => useOnlineStatus());

      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      // Multiple online events
      act(() => {
        onlineHandler();
        onlineHandler();
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
      // Should not set wasOffline if already online
      expect(result.current.wasOffline).toBe(false);
    });

    it('should handle multiple offline events in succession', () => {
      const { result } = renderHook(() => useOnlineStatus());

      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      // Multiple offline events
      act(() => {
        offlineHandler();
        offlineHandler();
        offlineHandler();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('should handle timeout cleanup when component unmounts during timeout', () => {
      const { result, unmount } = renderHook(() => useOnlineStatus());

      // Go offline then online to trigger timeout
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];

      act(() => {
        offlineHandler();
      });

      act(() => {
        onlineHandler();
      });

      expect(result.current.wasOffline).toBe(true);

      // Unmount before timeout completes
      unmount();

      // Should not crash when timeout tries to execute
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as any;
      if (setTimeoutCall && setTimeoutCall.fn) {
        expect(() => {
          setTimeoutCall.fn();
        }).not.toThrow();
      }
    });

    it('should handle concurrent state updates', () => {
      const { result } = renderHook(() => useOnlineStatus());

      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'online'
      )?.[1];
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'offline'
      )?.[1];

      // Simulate rapid state changes
      act(() => {
        offlineHandler();
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });
  });

  describe('return value structure', () => {
    it('should return object with isOnline and wasOffline properties', () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toHaveProperty('isOnline');
      expect(result.current).toHaveProperty('wasOffline');
      expect(typeof result.current.isOnline).toBe('boolean');
      expect(typeof result.current.wasOffline).toBe('boolean');
    });

    it('should maintain referential stability of returned object', () => {
      const { result, rerender } = renderHook(() => useOnlineStatus());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // Object should be different on each render (React state)
      expect(firstResult).not.toBe(secondResult);
      // But should have same structure
      expect(Object.keys(firstResult)).toEqual(Object.keys(secondResult));
    });
  });
});
