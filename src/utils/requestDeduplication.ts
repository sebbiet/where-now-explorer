/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent requests to the same endpoint
 */

interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Generate a unique signature for a request
   */
  generateRequestSignature(
    url: string,
    method: string = 'GET',
    params?: Record<string, string | number | boolean>
  ): string {
    const sortedParams = params
      ? Object.keys(params)
          .sort()
          .map((key) => `${key}=${params[key]}`)
          .join('&')
      : '';

    return `${method}:${url}${sortedParams ? '?' + sortedParams : ''}`;
  }

  /**
   * Deduplicate a request
   */
  async deduplicate<T>(
    signature: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean up old pending requests
    this.cleanupExpiredRequests();

    // Check if there's already a pending request with the same signature
    const pending = this.pendingRequests.get(signature);
    if (pending) {
      console.log(`Deduplicating request: ${signature}`);
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending when complete
      this.pendingRequests.delete(signature);
    });

    // Store pending request
    this.pendingRequests.set(signature, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.pendingRequests.forEach((request, signature) => {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        expired.push(signature);
      }
    });

    expired.forEach((signature) => {
      this.pendingRequests.delete(signature);
      console.warn(`Removed expired pending request: ${signature}`);
    });
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    this.cleanupExpiredRequests();
    return this.pendingRequests.size;
  }
}

// Create singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Higher-order function to wrap a request function with deduplication
 */
export function withDeduplication<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  getSignature: (...args: TArgs) => string
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const signature = getSignature(...args);
    return requestDeduplicator.deduplicate(signature, () => fn(...args));
  };
}

/**
 * Deduplicate geocoding requests
 */
interface GeocodingParams {
  latitude?: number;
  longitude?: number;
  query?: string;
}

export function deduplicateGeocodingRequest<T>(
  type: 'geocode' | 'reverse',
  params: GeocodingParams,
  requestFn: () => Promise<T>
): Promise<T> {
  let signature: string;

  if (type === 'reverse') {
    // Round coordinates to reduce duplicate requests for nearby locations
    const lat = Math.round((params.latitude ?? 0) * 10000) / 10000;
    const lon = Math.round((params.longitude ?? 0) * 10000) / 10000;
    signature = `reverse:${lat},${lon}`;
  } else {
    signature = `geocode:${params.query?.toLowerCase().trim()}`;
  }

  return requestDeduplicator.deduplicate(signature, requestFn);
}

/**
 * Deduplicate routing requests
 */
export function deduplicateRoutingRequest<T>(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  profile: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Round coordinates
  const originKey = `${Math.round(origin.latitude * 1000) / 1000},${Math.round(origin.longitude * 1000) / 1000}`;
  const destKey = `${Math.round(destination.latitude * 1000) / 1000},${Math.round(destination.longitude * 1000) / 1000}`;
  const signature = `route:${profile}:${originKey}->${destKey}`;

  return requestDeduplicator.deduplicate(signature, requestFn);
}
