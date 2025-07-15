export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface RetryStrategy {
  execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
}

/**
 * Default retry strategy with exponential backoff
 */
export class ExponentialBackoffRetryStrategy implements RetryStrategy {
  private readonly defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error: unknown) => {
      // Retry on network errors and 5xx status codes
      if (error instanceof Error) {
        return (
          error.message.includes('NetworkError') ||
          error.message.includes('HTTP 5')
        );
      }
      return false;
    },
  };

  async execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: unknown;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (
          attempt === config.maxAttempts ||
          !config.shouldRetry(error, attempt)
        ) {
          throw error;
        }

        // Wait before next attempt
        await this.sleep(Math.min(delay, config.maxDelay));

        // Increase delay for next attempt
        delay *= config.backoffMultiplier;
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * No-retry strategy for when retries are disabled
 */
export class NoRetryStrategy implements RetryStrategy {
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
