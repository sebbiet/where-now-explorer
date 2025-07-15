/**
 * Loading State Utilities
 * Provides standardized loading state management patterns
 */

import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

export interface AsyncOperationOptions {
  showToast?: boolean;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  retryable?: boolean;
  onRetry?: () => Promise<void>;
}

/**
 * Hook for managing async operation loading states
 */
export function useAsyncOperation<T = void>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const execute = useCallback(async (): Promise<T | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (options.showToast && options.loadingMessage) {
      toast.loading(options.loadingMessage);
    }

    try {
      const result = await operation();

      setState({
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      });

      if (options.showToast) {
        toast.dismiss();
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
      }

      return result;
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));

      setState({
        isLoading: false,
        error: errorInstance,
        lastUpdated: Date.now(),
      });

      if (options.showToast) {
        toast.dismiss();

        if (options.retryable && options.onRetry) {
          toast.error(options.errorMessage || errorInstance.message, {
            action: {
              label: 'Retry',
              onClick: async () => {
                await execute();
              },
            },
          });
        } else {
          toast.error(options.errorMessage || errorInstance.message);
        }
      }

      return null;
    }
  }, [operation, options]);

  const retry = useCallback(async () => {
    if (options.onRetry) {
      await options.onRetry();
    } else {
      await execute();
    }
  }, [execute, options]);

  return {
    ...state,
    execute,
    retry,
    isSuccess: !state.isLoading && !state.error && state.lastUpdated !== null,
  };
}

/**
 * Hook for managing multiple async operations with loading states
 */
export function useMultipleAsyncOperations() {
  const [operations, setOperations] = useState<Record<string, LoadingState>>(
    {}
  );

  const startOperation = useCallback((key: string) => {
    setOperations((prev) => ({
      ...prev,
      [key]: {
        isLoading: true,
        error: null,
        lastUpdated: null,
      },
    }));
  }, []);

  const finishOperation = useCallback((key: string, error?: Error) => {
    setOperations((prev) => ({
      ...prev,
      [key]: {
        isLoading: false,
        error: error || null,
        lastUpdated: Date.now(),
      },
    }));
  }, []);

  const isAnyLoading = Object.values(operations).some((op) => op.isLoading);
  const hasAnyError = Object.values(operations).some((op) => op.error !== null);

  return {
    operations,
    startOperation,
    finishOperation,
    isAnyLoading,
    hasAnyError,
    getOperation: (key: string) =>
      operations[key] || { isLoading: false, error: null, lastUpdated: null },
  };
}

/**
 * Loading state component wrapper
 */
export interface LoadingWrapperProps {
  isLoading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  fallbackMessage?: string;
}

export function LoadingWrapper({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  fallbackMessage = 'Loading...',
}: LoadingWrapperProps) {
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">{fallbackMessage}</span>
        </div>
      )
    );
  }

  if (error) {
    return (
      errorComponent || (
        <div className="flex items-center justify-center p-4 text-red-600">
          <span>Error: {error.message}</span>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * Button loading state utilities
 */
export interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void | Promise<void>;
}

/**
 * Enhanced button component with loading state
 */
export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  onClick,
}: LoadingButtonProps) {
  const handleClick = useCallback(async () => {
    if (onClick && !isLoading && !disabled) {
      await onClick();
    }
  }, [onClick, isLoading, disabled]);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <span className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Skeleton loading component
 */
export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton text component
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="1rem"
        />
      ))}
    </div>
  );
}

/**
 * Loading state constants
 */
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type LoadingStateType =
  (typeof LOADING_STATES)[keyof typeof LOADING_STATES];

/**
 * Utility function to manage loading state with timeout
 */
export function withLoadingTimeout<T>(
  operation: () => Promise<T>,
  timeout: number = 30000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    }),
  ]);
}
