import { GeocodeResult, ReverseGeocodeResult } from './geocoding.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface GeocodeCache {
  geocode: Map<string, CacheEntry<GeocodeResult[]>>;
  reverseGeocode: Map<string, CacheEntry<ReverseGeocodeResult>>;
}

export class GeocodingCacheService {
  private static readonly CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
  private static readonly MAX_CACHE_SIZE = 100;
  
  private static cache: GeocodeCache = {
    geocode: new Map(),
    reverseGeocode: new Map(),
  };

  // Initialize cache from localStorage
  static {
    if (typeof window !== 'undefined') {
      try {
        const savedCache = localStorage.getItem('geocoding-cache');
        if (savedCache) {
          const parsed = JSON.parse(savedCache);
          // Convert arrays back to Maps
          this.cache.geocode = new Map(parsed.geocode);
          this.cache.reverseGeocode = new Map(parsed.reverseGeocode);
          // Clean expired entries
          this.cleanExpiredEntries();
        }
      } catch (error) {
        console.warn('Failed to load geocoding cache:', error);
      }
    }
  }

  private static saveCache(): void {
    if (typeof window !== 'undefined') {
      try {
        // Convert Maps to arrays for serialization
        const cacheData = {
          geocode: Array.from(this.cache.geocode.entries()),
          reverseGeocode: Array.from(this.cache.reverseGeocode.entries()),
        };
        localStorage.setItem('geocoding-cache', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to save geocoding cache:', error);
      }
    }
  }

  private static cleanExpiredEntries(): void {
    const now = Date.now();
    
    // Clean geocode cache
    for (const [key, entry] of this.cache.geocode.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.geocode.delete(key);
      }
    }
    
    // Clean reverse geocode cache
    for (const [key, entry] of this.cache.reverseGeocode.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.reverseGeocode.delete(key);
      }
    }
  }

  private static enforceMaxSize(): void {
    // Limit geocode cache size
    if (this.cache.geocode.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.geocode.entries());
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      // Keep only the most recent entries
      this.cache.geocode = new Map(entries.slice(-this.MAX_CACHE_SIZE));
    }
    
    // Limit reverse geocode cache size
    if (this.cache.reverseGeocode.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.reverseGeocode.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      this.cache.reverseGeocode = new Map(entries.slice(-this.MAX_CACHE_SIZE));
    }
  }

  static getGeocodeCache(query: string, options?: any): GeocodeResult[] | null {
    const key = this.createGeocodeKey(query, options);
    const entry = this.cache.geocode.get(key);
    
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.geocode.delete(key);
      this.saveCache();
      return null;
    }
    
    return entry.data;
  }

  static setGeocodeCache(query: string, options: any, data: GeocodeResult[]): void {
    const key = this.createGeocodeKey(query, options);
    this.cache.geocode.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.enforceMaxSize();
    this.saveCache();
  }

  static getReverseGeocodeCache(lat: number, lon: number): ReverseGeocodeResult | null {
    const key = this.createReverseGeocodeKey(lat, lon);
    const entry = this.cache.reverseGeocode.get(key);
    
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.reverseGeocode.delete(key);
      this.saveCache();
      return null;
    }
    
    return entry.data;
  }

  static setReverseGeocodeCache(lat: number, lon: number, data: ReverseGeocodeResult): void {
    const key = this.createReverseGeocodeKey(lat, lon);
    this.cache.reverseGeocode.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.enforceMaxSize();
    this.saveCache();
  }

  private static createGeocodeKey(query: string, options?: any): string {
    // Round coordinates to reduce cache misses for nearby locations
    const normalized = {
      q: query.toLowerCase().trim(),
      limit: options?.limit || 1,
      countrycodes: options?.countrycodes?.join(',') || '',
    };
    return JSON.stringify(normalized);
  }

  private static createReverseGeocodeKey(lat: number, lon: number): string {
    // Round to 4 decimal places (about 11 meters precision)
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    return `${roundedLat},${roundedLon}`;
  }

  static clearCache(): void {
    this.cache.geocode.clear();
    this.cache.reverseGeocode.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geocoding-cache');
    }
  }
}