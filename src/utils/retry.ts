/**
 * Retry Utility
 *
 * Provides robust retry logic with exponential backoff and jitter for handling
 * transient failures in network requests and other operations.
 */

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffFactor?: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback executed before each retry attempt */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx status codes
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // Don't retry on client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    return true;
  },
  onRetry: () => {},
};

/**
 * Execute a function with retry logic and exponential backoff
 *
 * Automatically retries failed operations with increasing delays between attempts.
 * Includes jitter to prevent thundering herd problems when multiple clients retry simultaneously.
 *
 * @template T - Return type of the function being retried
 * @param fn - Async function to execute with retry logic
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects with the final error
 *
 * @example
 * ```typescript
 * // Retry a network request with custom options
 * const data = await retryWithBackoff(
 *   () => fetch('/api/data').then(res => res.json()),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 500,
 *     shouldRetry: (error) => error.status >= 500,
 *     onRetry: (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!opts.shouldRetry(error) || attempt === opts.maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * delay * 0.1;

      opts.onRetry(attempt, jitteredDelay, error);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * Wraps an existing function with retry logic, making it automatically retry on failures.
 * Useful for creating resilient versions of API functions or other operations that may fail.
 *
 * @template TArgs - Tuple type representing the function's arguments
 * @template TReturn - Return type of the function
 * @param fn - Original async function to make retryable
 * @param options - Retry configuration options
 * @returns New function with the same signature but retry behavior
 *
 * @example
 * ```typescript
 * // Create a retryable API function
 * const fetchUserData = makeRetryable(
 *   async (userId: string) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   },
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 *
 * // Use it like the original function - retries are automatic
 * const userData = await fetchUserData('123');
 * ```
 */
export function makeRetryable<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), options);
  };
}
