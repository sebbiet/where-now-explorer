import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useErrorHandler } from '../useErrorHandler';
import { logger } from '@/utils/logger';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(() => 'toast-id-1'),
    loading: vi.fn(),
    success: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should capture error and log it', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toEqual(testError);
      expect(logger.error).toHaveBeenCalledWith(
        'An error occurred',
        testError,
        { component: 'useErrorHandler' }
      );
    });

    it('should show toast notification by default', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error message');

      act(() => {
        result.current.handleError(testError);
      });

      expect(toast.error).toHaveBeenCalledWith('Test error message');
    });

    it('should use custom error message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Original error');

      act(() => {
        result.current.handleError(testError, 'Custom error message');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Custom error message',
        testError,
        { component: 'useErrorHandler' }
      );
      expect(toast.error).toHaveBeenCalledWith('Custom error message');
    });

    it('should not show toast when showToast is false', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: false }));
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toEqual(testError);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show retry action when retryable', () => {
      const onRetry = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ retryable: true, onRetry }));
      const testError = new Error('Retryable error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Retryable error',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry'
          })
        })
      );
    });

    it('should handle errors without message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('');

      act(() => {
        result.current.handleError(testError);
      });

      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    it('should merge default options with call options', () => {
      const defaultOnRetry = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ 
        showToast: false,
        retryable: true,
        onRetry: defaultOnRetry 
      }));
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError, 'Custom message', { showToast: true });
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Custom message',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry'
          })
        })
      );
    });
  });

  describe('retry functionality', () => {
    it('should handle successful retry through toast action', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useErrorHandler({ retryable: true, onRetry }));
      const testError = new Error('Retryable error');

      act(() => {
        result.current.handleError(testError);
      });

      // Get the retry action from toast
      const toastCall = vi.mocked(toast.error).mock.calls[0];
      const retryAction = toastCall[1]?.action?.onClick;

      expect(retryAction).toBeDefined();

      // Execute retry
      await act(async () => {
        if (retryAction) {
          await retryAction();
        }
      });

      expect(onRetry).toHaveBeenCalled();
      expect(toast.loading).toHaveBeenCalledWith('Retrying...', { id: 'toast-id-1' });
      expect(toast.success).toHaveBeenCalledWith(
        'Operation completed successfully',
        { id: 'toast-id-1' }
      );
      expect(result.current.error).toBeNull();
    });

    it('should handle failed retry through toast action', async () => {
      const retryError = new Error('Retry failed');
      const onRetry = vi.fn().mockRejectedValue(retryError);
      const { result } = renderHook(() => useErrorHandler({ retryable: true, onRetry }));
      const testError = new Error('Initial error');

      act(() => {
        result.current.handleError(testError);
      });

      const toastCall = vi.mocked(toast.error).mock.calls[0];
      const retryAction = toastCall[1]?.action?.onClick;

      await act(async () => {
        if (retryAction) {
          await retryAction();
        }
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Retry failed',
        retryError,
        { component: 'useErrorHandler', operation: 'retry' }
      );
      expect(toast.error).toHaveBeenCalledWith(
        'Retry failed. Please try again.',
        { id: 'toast-id-1' }
      );
    });

    it('should show Retrying label when already retrying', async () => {
      const onRetry = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { result } = renderHook(() => useErrorHandler({ retryable: true, onRetry }));
      
      // First error
      act(() => {
        result.current.handleError(new Error('First error'));
      });

      // Get first retry action
      const firstToastCall = vi.mocked(toast.error).mock.calls[0];
      const firstRetryAction = firstToastCall[1]?.action?.onClick;

      // Start retry (don't await)
      act(() => {
        if (firstRetryAction) {
          firstRetryAction();
        }
      });

      // Clear mocks to check next call
      vi.mocked(toast.error).mockClear();

      // Second error while retrying
      act(() => {
        result.current.handleError(new Error('Second error'));
      });

      // Should show "Retrying..." label
      expect(toast.error).toHaveBeenCalledWith(
        'Second error',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retrying...'
          })
        })
      );
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toEqual(testError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('retry method', () => {
    it('should execute retry function from hook', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useErrorHandler({ onRetry }));

      await act(async () => {
        await result.current.retry();
      });

      expect(onRetry).toHaveBeenCalled();
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle retry failure from hook method', async () => {
      const retryError = new Error('Retry failed');
      const onRetry = vi.fn().mockRejectedValue(retryError);
      const { result } = renderHook(() => useErrorHandler({ onRetry }));

      // First set an error so we can see if it changes
      act(() => {
        result.current.handleError(new Error('Initial error'));
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toEqual(retryError);
      expect(toast.error).toHaveBeenCalledWith('Retry failed');
    });

    it('should do nothing if no onRetry provided', async () => {
      const { result } = renderHook(() => useErrorHandler());

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isRetrying).toBe(false);
    });

    it('should update isRetrying state during retry', async () => {
      const onRetry = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const { result } = renderHook(() => useErrorHandler({ onRetry }));

      // Start retry but don't await
      act(() => {
        result.current.retry();
      });

      // Check isRetrying is true immediately after starting
      expect(result.current.isRetrying).toBe(true);

      // Wait for retry to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('error recovery actions', () => {
    it('should clear error after successful retry', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useErrorHandler({ retryable: true, onRetry }));
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toEqual(testError);

      const toastCall = vi.mocked(toast.error).mock.calls[0];
      const retryAction = toastCall[1]?.action?.onClick;

      await act(async () => {
        if (retryAction) {
          await retryAction();
        }
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle circular reference in error object', () => {
      const { result } = renderHook(() => useErrorHandler());
      const circularError = new Error('Circular error') as Error & { self?: Error };
      circularError.self = circularError;

      act(() => {
        result.current.handleError(circularError);
      });

      expect(result.current.error).toBe(circularError);
    });

    it('should handle non-Error objects', () => {
      const { result } = renderHook(() => useErrorHandler());
      const nonError = { message: 'Not an error object' };

      act(() => {
        result.current.handleError(nonError as Error);
      });

      expect(result.current.error).toEqual(nonError);
      expect(toast.error).toHaveBeenCalledWith('Not an error object');
    });

    it('should handle multiple errors in sequence', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const error3 = new Error('Error 3');

      act(() => {
        result.current.handleError(error1);
      });
      expect(result.current.error).toEqual(error1);

      act(() => {
        result.current.handleError(error2);
      });
      expect(result.current.error).toEqual(error2);

      act(() => {
        result.current.handleError(error3);
      });
      expect(result.current.error).toEqual(error3);

      expect(logger.error).toHaveBeenCalledTimes(3);
    });
  });
});