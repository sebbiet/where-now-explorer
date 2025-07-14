export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, delay: number, error: any) => void;
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

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

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

// Utility to create a retryable version of a function
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}