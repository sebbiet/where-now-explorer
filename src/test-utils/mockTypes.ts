/**
 * Common mock types for testing
 */

import { vi } from 'vitest';

// Mock for navigator.geolocation
export interface MockGeolocation {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
}

// Mock for localStorage
export interface MockLocalStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  length: number;
  key: ReturnType<typeof vi.fn>;
}

// Mock for fetch response
export interface MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: Headers;
}

// Mock for window.gtag
export interface MockGtag {
  (...args: unknown[]): void;
}

// Mock for ResizeObserver
export interface MockResizeObserver {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

// Mock for IntersectionObserver
export interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
}

// Helper to create typed mocks
export const createMockGeolocation = (): MockGeolocation => ({
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
});

export const createMockLocalStorage = (): MockLocalStorage => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

export const createMockResponse = (
  options: Partial<MockResponse> = {}
): MockResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn(() => Promise.resolve({})),
  text: vi.fn(() => Promise.resolve('')),
  headers: new Headers(),
  ...options,
});

// Type guards for testing
export const isMockGeolocation = (obj: unknown): obj is MockGeolocation => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getCurrentPosition' in obj &&
    'watchPosition' in obj
  );
};

export const isMockLocalStorage = (obj: unknown): obj is MockLocalStorage => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getItem' in obj &&
    'setItem' in obj
  );
};
