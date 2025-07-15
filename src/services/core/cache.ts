export interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

/**
 * In-memory cache implementation
 */
export class MemoryCache implements Cache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * LocalStorage-backed cache implementation
 */
export class LocalStorageCache implements Cache {
  private readonly prefix: string;

  constructor(prefix: string = 'cache_') {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      if (Date.now() > entry.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiry: Date.now() + ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded or other errors
      console.warn('Failed to cache item:', error);
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(this.prefix)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }
}
