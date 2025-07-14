import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  retryable?: boolean;
  onRetry?: () => void | Promise<void>;
}

export const useErrorHandler = (defaultOptions?: ErrorHandlerOptions) => {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((
    error: Error,
    message?: string,
    options?: ErrorHandlerOptions
  ) => {
    const opts = { ...defaultOptions, ...options };
    setError(error);

    // Log error for debugging
    console.error(message || 'An error occurred:', error);

    // Show toast if enabled
    if (opts.showToast !== false) {
      const toastMessage = message || error.message || 'An unexpected error occurred';
      
      if (opts.retryable && opts.onRetry) {
        const toastId = toast.error(toastMessage, {
          action: {
            label: isRetrying ? 'Retrying...' : 'Retry',
            onClick: async () => {
              if (isRetrying) return;
              
              setIsRetrying(true);
              
              // Update toast to show loading state
              toast.loading('Retrying...', { id: toastId });
              
              try {
                await opts.onRetry?.();
                clearError();
                toast.success('Operation completed successfully', { id: toastId });
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                toast.error('Retry failed. Please try again.', { id: toastId });
              } finally {
                setIsRetrying(false);
              }
            }
          }
        });
      } else {
        toast.error(toastMessage);
      }
    }
  }, [defaultOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async () => {
    if (!defaultOptions?.onRetry) return;
    
    setIsRetrying(true);
    try {
      await defaultOptions.onRetry();
      clearError();
    } catch (retryError) {
      handleError(retryError as Error, 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  }, [defaultOptions, clearError, handleError]);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry
  };
};