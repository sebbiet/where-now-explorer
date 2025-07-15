import { RequestBody } from '../base.service';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: RequestBody | string | FormData | null;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface HttpClient {
  request<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
}

/**
 * Default implementation of HttpClient using fetch API
 */
export class FetchHttpClient implements HttpClient {
  async request<T = unknown>(
    url: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const { timeout = 10000, signal, ...fetchOptions } = options;

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    // Combine signals if provided
    const combinedSignal = signal
      ? AbortSignal.any([signal, abortController.signal])
      : abortController.signal;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
