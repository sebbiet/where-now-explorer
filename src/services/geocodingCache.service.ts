import {
  GeocodeResult,
  ReverseGeocodeResult,
  GeocodeOptions,
} from './geocoding.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface GeocodeCache {
  geocode: Map<string, CacheEntry<GeocodeResult[]>>;
  reverseGeocode: Map<string, CacheEntry<ReverseGeocodeResult>>;
}

interface PopularityData {
  accessCount: number;
  lastAccessed: number;
}

export class GeocodingCacheService {
  private static readonly CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
  private static readonly POPULAR_CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days for popular items
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly POPULAR_THRESHOLD = 5; // Access count to be considered popular

  private static cache: GeocodeCache = {
    geocode: new Map(),
    reverseGeocode: new Map(),
  };

  private static popularity = new Map<string, PopularityData>();

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

  static getGeocodeCache(
    query: string,
    options?: Partial<GeocodeOptions>
  ): GeocodeResult[] | null {
    const key = this.createGeocodeKey(query, options);
    const entry = this.cache.geocode.get(key);

    if (!entry) return null;

    // Update popularity tracking
    this.updatePopularity(key);

    // Check if cache is expired
    const cacheDuration = this.isPopular(key)
      ? this.POPULAR_CACHE_DURATION
      : this.CACHE_DURATION;

    if (Date.now() - entry.timestamp > cacheDuration) {
      this.cache.geocode.delete(key);
      this.popularity.delete(key);
      this.saveCache();
      return null;
    }

    return entry.data;
  }

  static setGeocodeCache(
    query: string,
    options: Partial<GeocodeOptions>,
    data: GeocodeResult[]
  ): void {
    const key = this.createGeocodeKey(query, options);
    this.cache.geocode.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.enforceMaxSize();
    this.saveCache();
  }

  static getReverseGeocodeCache(
    lat: number,
    lon: number
  ): ReverseGeocodeResult | null {
    const key = this.createReverseGeocodeKey(lat, lon);
    const entry = this.cache.reverseGeocode.get(key);

    if (!entry) return null;

    // Update popularity tracking
    this.updatePopularity(key);

    // Check if cache is expired
    const cacheDuration = this.isPopular(key)
      ? this.POPULAR_CACHE_DURATION
      : this.CACHE_DURATION;

    if (Date.now() - entry.timestamp > cacheDuration) {
      this.cache.reverseGeocode.delete(key);
      this.popularity.delete(key);
      this.saveCache();
      return null;
    }

    return entry.data;
  }

  static setReverseGeocodeCache(
    lat: number,
    lon: number,
    data: ReverseGeocodeResult
  ): void {
    const key = this.createReverseGeocodeKey(lat, lon);
    this.cache.reverseGeocode.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.enforceMaxSize();
    this.saveCache();
  }

  private static createGeocodeKey(
    query: string,
    options?: Partial<GeocodeOptions>
  ): string {
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
    this.popularity.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geocoding-cache');
    }
  }

  /**
   * Update popularity data for a cache key
   */
  private static updatePopularity(key: string): void {
    const existing = this.popularity.get(key) || {
      accessCount: 0,
      lastAccessed: 0,
    };
    this.popularity.set(key, {
      accessCount: existing.accessCount + 1,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Check if a cache entry is popular
   */
  private static isPopular(key: string): boolean {
    const data = this.popularity.get(key);
    return data ? data.accessCount >= this.POPULAR_THRESHOLD : false;
  }

  /**
   * Pre-cache nearby locations for better performance
   */
  static async preCacheNearbyLocations(
    lat: number,
    lon: number
  ): Promise<void> {
    // Pre-cache locations in a grid around the current location
    const gridSize = 0.01; // About 1km
    const offsets = [-1, 0, 1];

    for (const latOffset of offsets) {
      for (const lonOffset of offsets) {
        if (latOffset === 0 && lonOffset === 0) continue; // Skip current location

        const nearbyLat = lat + latOffset * gridSize;
        const nearbyLon = lon + lonOffset * gridSize;
        const key = this.createReverseGeocodeKey(nearbyLat, nearbyLon);

        // Only pre-cache if not already cached
        if (!this.cache.reverseGeocode.has(key)) {
          // Mark for pre-caching (actual implementation would fetch these)
          console.log(`Marked for pre-caching: ${nearbyLat}, ${nearbyLon}`);
        }
      }
    }
  }
}
