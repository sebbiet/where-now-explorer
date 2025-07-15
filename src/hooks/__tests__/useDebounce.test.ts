import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value update', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Update the value
      rerender({ value: 'updated', delay: 500 });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Advance timers by less than delay
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current).toBe('initial');

      // Advance timers to complete the delay
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('updated');
    });

    it('should handle rapid value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      expect(result.current).toBe('initial');

      // Rapid updates
      rerender({ value: 'update1', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('initial');

      rerender({ value: 'update2', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('initial');

      rerender({ value: 'update3', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('initial');

      // Final value should be used after delay
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe('update3');
    });

    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      // Trigger a timeout
      rerender({ value: 'updated', delay: 500 });

      // Unmount before timeout completes
      unmount();

      // clearTimeout should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle custom delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 1000 } }
      );

      rerender({ value: 'updated', delay: 1000 });

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 0 } }
      );

      rerender({ value: 'updated', delay: 0 });

      // With 0 delay, update should happen in next tick
      act(() => {
        vi.runAllTimers();
      });
      expect(result.current).toBe('updated');
    });

    it('should handle delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Change delay before first timeout completes
      rerender({ value: 'updated', delay: 300 });

      // Original timeout should be cleared, new one started
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('different data types', () => {
    it('should work with numbers', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 42, delay: 300 } }
      );

      expect(result.current).toBe(42);

      rerender({ value: 100, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(100);
    });

    it('should work with objects', () => {
      const initialObj = { name: 'John', age: 30 };
      const updatedObj = { name: 'Jane', age: 25 };

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: initialObj, delay: 300 } }
      );

      expect(result.current).toBe(initialObj);

      rerender({ value: updatedObj, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(updatedObj);
    });

    it('should work with arrays', () => {
      const initialArray = [1, 2, 3];
      const updatedArray = [4, 5, 6];

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: initialArray, delay: 300 } }
      );

      expect(result.current).toBe(initialArray);

      rerender({ value: updatedArray, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(updatedArray);
    });

    it('should work with null and undefined', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: null as string | null, delay: 300 } }
      );

      expect(result.current).toBe(null);

      rerender({ value: undefined as string | undefined, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(undefined);
    });

    it('should work with boolean values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: false, delay: 300 } }
      );

      expect(result.current).toBe(false);

      rerender({ value: true, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle value returning to original before timeout', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      // Change value
      rerender({ value: 'updated', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Change back to original
      rerender({ value: 'initial', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should remain 'initial' as it never changed from user perspective
      expect(result.current).toBe('initial');
    });

    it('should handle multiple rapid changes with cleanup', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      clearTimeoutSpy.mockClear();

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v1', delay: 300 } }
      );

      // Multiple rapid changes
      for (let i = 2; i <= 5; i++) {
        rerender({ value: `v${i}`, delay: 300 });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      // Should have cleared timeout multiple times
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);

      // Complete the final timeout
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe('v5');
    });

    it('should handle very large delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 100000 } }
      );

      rerender({ value: 'updated', delay: 100000 });

      act(() => {
        vi.advanceTimersByTime(99999);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });
});
