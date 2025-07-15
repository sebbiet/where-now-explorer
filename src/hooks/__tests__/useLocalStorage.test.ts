import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock window object
const mockWindow = {
  localStorage: mockLocalStorage,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
};

// Mock console.warn to track warnings
const originalConsoleWarn = console.warn;

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
    
    // Setup window mock
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.warn = originalConsoleWarn;
  });

  describe('initial value reading', () => {
    it('should return initial value when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));

      expect(result.current[0]).toBe('default-value');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return stored value when localStorage has data', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored-value'));

      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));

      expect(result.current[0]).toBe('stored-value');
    });

    it('should handle complex objects', () => {
      const storedObject = { name: 'John', age: 30 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedObject));

      const { result } = renderHook(() => useLocalStorage('user', { name: '', age: 0 }));

      expect(result.current[0]).toEqual(storedObject);
    });

    it('should handle arrays', () => {
      const storedArray = ['item1', 'item2', 'item3'];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedArray));

      const { result } = renderHook(() => useLocalStorage('items', [] as string[]));

      expect(result.current[0]).toEqual(storedArray);
    });

    it('should handle boolean values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(true));

      const { result } = renderHook(() => useLocalStorage('isEnabled', false));

      expect(result.current[0]).toBe(true);
    });

    it('should handle number values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(42));

      const { result } = renderHook(() => useLocalStorage('count', 0));

      expect(result.current[0]).toBe(42);
    });
  });

  describe('value writing', () => {
    it('should write value to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
      expect(result.current[0]).toBe('new-value');
    });

    it('should write complex objects to localStorage', () => {
      const newObject = { name: 'Jane', age: 25 };
      const { result } = renderHook(() => useLocalStorage('user', { name: '', age: 0 }));

      act(() => {
        result.current[1](newObject);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(newObject));
      expect(result.current[0]).toEqual(newObject);
    });

    it('should dispatch custom event when writing', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(new Event('local-storage'));
    });

    it('should handle function-based updates', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(5));
      const { result } = renderHook(() => useLocalStorage('counter', 0));

      act(() => {
        result.current[1]((prev: number) => prev + 1);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('counter', JSON.stringify(6));
      expect(result.current[0]).toBe(6);
    });
  });

  describe('value updating', () => {
    it('should update state when localStorage changes externally', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      // Simulate external localStorage change
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('external-update'));

      // Get the storage event handler
      const storageHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'storage'
      )?.[1];

      expect(storageHandler).toBeDefined();

      act(() => {
        storageHandler();
      });

      expect(result.current[0]).toBe('external-update');
    });

    it('should update state when custom local-storage event is triggered', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      // Simulate custom event
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('custom-update'));

      // Get the custom event handler
      const customHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'local-storage'
      )?.[1];

      expect(customHandler).toBeDefined();

      act(() => {
        customHandler();
      });

      expect(result.current[0]).toBe('custom-update');
    });

    it('should remove value and reset to initial value', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored-value'));
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      // First verify it has the stored value
      expect(result.current[0]).toBe('stored-value');

      // Remove the value
      act(() => {
        result.current[2](); // removeValue function
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
      expect(result.current[0]).toBe('initial');
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(new Event('local-storage'));
    });
  });

  describe('SSR safety (no window)', () => {
    it('should return initial value when window is undefined', () => {
      // Remove window object
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const { result } = renderHook(() => useLocalStorage('test-key', 'ssr-safe'));

      expect(result.current[0]).toBe('ssr-safe');
    });

    it('should warn and not crash when setting value without window', () => {
      // Remove window object
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Tried to set localStorage key "test-key" even though environment is not a client'
      );
    });

    it('should handle addEventListener gracefully when window is undefined', () => {
      // Remove window object completely
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      // Should not throw error
      expect(() => {
        renderHook(() => useLocalStorage('test-key', 'initial'));
      }).not.toThrow();
    });
  });

  describe('JSON parsing errors', () => {
    it('should return initial value when JSON parsing fails', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json{');

      const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

      expect(result.current[0]).toBe('fallback');
      expect(console.warn).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(SyntaxError)
      );
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('undefined');

      const { result } = renderHook(() => useLocalStorage('test-key', { default: true }));

      expect(result.current[0]).toEqual({ default: true });
    });

    it('should handle null values in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('null');

      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

      // JSON.parse('null') returns null, which should use the initial value
      expect(result.current[0]).toBe('default');
    });
  });

  describe('storage quota errors', () => {
    it('should handle localStorage quota exceeded error when setting', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('large-value');
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(DOMException)
      );
      // Value should remain unchanged when setting fails
      expect(result.current[0]).toBe('initial');
    });

    it('should handle localStorage not available error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

      expect(result.current[0]).toBe('fallback');
      expect(console.warn).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      );
    });

    it('should handle removeItem errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove failed');
      });

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[2](); // removeValue
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Error removing localStorage key "test-key":',
        expect.any(Error)
      );
    });
  });

  describe('custom serializers', () => {
    it('should use custom serializer when provided', () => {
      const customSerializer = vi.fn().mockReturnValue('custom-serialized');
      const customDeserializer = vi.fn().mockReturnValue('custom-deserialized');

      mockLocalStorage.getItem.mockReturnValue('stored-value');

      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'initial', {
          serializer: customSerializer,
          deserializer: customDeserializer
        })
      );

      expect(customDeserializer).toHaveBeenCalledWith('stored-value');
      expect(result.current[0]).toBe('custom-deserialized');

      act(() => {
        result.current[1]('new-value');
      });

      expect(customSerializer).toHaveBeenCalledWith('new-value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', 'custom-serialized');
    });

    it('should handle custom serializer errors', () => {
      const faultySerializer = vi.fn().mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'initial', {
          serializer: faultySerializer
        })
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(Error)
      );
    });

    it('should handle custom deserializer errors', () => {
      const faultyDeserializer = vi.fn().mockImplementation(() => {
        throw new Error('Deserialization failed');
      });

      mockLocalStorage.getItem.mockReturnValue('stored-data');

      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'fallback', {
          deserializer: faultyDeserializer
        })
      );

      expect(result.current[0]).toBe('fallback');
      expect(console.warn).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      );
    });
  });

  describe('event listeners cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useLocalStorage('test-key', 'initial'));

      // Verify event listeners were added
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('local-storage', expect.any(Function));

      unmount();

      // Verify event listeners were removed
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('local-storage', expect.any(Function));
    });

    it('should handle multiple hooks with same key correctly', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'initial1'));
      const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'initial2'));

      // Both should start with their own initial values
      expect(result1.current[0]).toBe('initial1');
      expect(result2.current[0]).toBe('initial2');

      // Update from first hook
      act(() => {
        result1.current[1]('updated-value');
      });

      // Simulate the custom event being handled
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('updated-value'));
      
      const customHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'local-storage'
      )?.[1];

      act(() => {
        customHandler();
      });

      // Both hooks should reflect the updated value
      expect(result1.current[0]).toBe('updated-value');
      expect(result2.current[0]).toBe('updated-value');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(''));

      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

      expect(result.current[0]).toBe('');
    });

    it('should handle zero values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(0));

      const { result } = renderHook(() => useLocalStorage('test-key', 10));

      expect(result.current[0]).toBe(0);
    });

    it('should handle false boolean values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(false));

      const { result } = renderHook(() => useLocalStorage('test-key', true));

      expect(result.current[0]).toBe(false);
    });

    it('should handle localStorage returning undefined', () => {
      mockLocalStorage.getItem.mockReturnValue(undefined);

      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

      expect(result.current[0]).toBe('default');
    });

    it('should re-read value on component mount', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('mounted-value'));

      const { result, rerender } = renderHook(() => useLocalStorage('test-key', 'initial'));

      expect(result.current[0]).toBe('mounted-value');

      // Change localStorage externally
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('external-change'));

      // Rerender should trigger useEffect and re-read the value
      rerender();

      expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(2); // Once on mount, once on rerender effect
    });
  });
});