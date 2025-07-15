/**
 * Offline Mode Service
 * Manages offline functionality and cached routes
 */

import { LocationData } from '@/contexts/LocationContext';
import { RouteResult } from './routing.service';
import { GeocodeResult } from './geocoding.service';
import { logger } from '@/utils/logger';

interface CachedRoute {
  id: string;
  origin: LocationData;
  destination: {
    name: string;
    location: GeocodeResult;
  };
  route: RouteResult;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface OfflineData {
  routes: CachedRoute[];
  destinations: GeocodeResult[];
  lastSync: number;
}

export class OfflineModeService {
  private static readonly STORAGE_KEY = 'offline-data';
  private static readonly MAX_CACHED_ROUTES = 50;
  private static readonly MAX_CACHED_DESTINATIONS = 100;
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  private isOnline: boolean = navigator.onLine;
  private offlineData: OfflineData;
  private onlineListeners: Array<(online: boolean) => void> = [];

  constructor() {
    this.offlineData = this.loadOfflineData();
    this.setupOnlineDetection();
    this.cleanupOldData();
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
      logger.info('Application is back online', {
        service: 'OfflineModeService',
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
      logger.info('Application is offline', {
        service: 'OfflineModeService',
      });
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check connectivity by attempting to fetch a small resource
   */
  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (!this.isOnline && response.ok) {
        this.isOnline = true;
        this.notifyListeners(true);
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyListeners(false);
      }
    }
  }

  /**
   * Subscribe to online status changes
   */
  subscribeToOnlineStatus(callback: (online: boolean) => void): () => void {
    this.onlineListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.onlineListeners = this.onlineListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Notify listeners of online status change
   */
  private notifyListeners(online: boolean): void {
    this.onlineListeners.forEach((callback) => callback(online));
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Load offline data from localStorage
   */
  private loadOfflineData(): OfflineData {
    try {
      const stored = localStorage.getItem(OfflineModeService.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load offline data', error as Error, {
        service: 'OfflineModeService',
      });
    }

    return {
      routes: [],
      destinations: [],
      lastSync: Date.now(),
    };
  }

  /**
   * Save offline data to localStorage
   */
  private saveOfflineData(): void {
    try {
      localStorage.setItem(
        OfflineModeService.STORAGE_KEY,
        JSON.stringify(this.offlineData)
      );
    } catch (error) {
      logger.error('Failed to save offline data', error as Error, {
        service: 'OfflineModeService',
      });
      // If storage is full, remove least accessed routes
      this.pruneOfflineData();
    }
  }

  /**
   * Cache a route for offline use
   */
  cacheRoute(
    origin: LocationData,
    destination: { name: string; location: GeocodeResult },
    route: RouteResult
  ): void {
    const routeId = this.generateRouteId(origin, destination.location);

    // Check if route already exists
    const existingIndex = this.offlineData.routes.findIndex(
      (r) => r.id === routeId
    );

    if (existingIndex >= 0) {
      // Update existing route
      this.offlineData.routes[existingIndex].accessCount++;
      this.offlineData.routes[existingIndex].lastAccessed = Date.now();
      this.offlineData.routes[existingIndex].route = route;
    } else {
      // Add new route
      const cachedRoute: CachedRoute = {
        id: routeId,
        origin,
        destination,
        route,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      this.offlineData.routes.push(cachedRoute);

      // Enforce max size
      if (
        this.offlineData.routes.length > OfflineModeService.MAX_CACHED_ROUTES
      ) {
        this.pruneOfflineData();
      }
    }

    // Also cache the destination
    this.cacheDestination(destination.location);

    this.saveOfflineData();
  }

  /**
   * Cache a destination for offline use
   */
  cacheDestination(destination: GeocodeResult): void {
    // Check if already cached
    const exists = this.offlineData.destinations.some(
      (d) => d.place_id === destination.place_id
    );

    if (!exists) {
      this.offlineData.destinations.push(destination);

      // Enforce max size
      if (
        this.offlineData.destinations.length >
        OfflineModeService.MAX_CACHED_DESTINATIONS
      ) {
        // Remove oldest destinations
        this.offlineData.destinations = this.offlineData.destinations.slice(
          -OfflineModeService.MAX_CACHED_DESTINATIONS
        );
      }
    }
  }

  /**
   * Get cached route if available
   */
  getCachedRoute(
    origin: LocationData,
    destination: GeocodeResult
  ): RouteResult | null {
    const routeId = this.generateRouteId(origin, destination);
    const cachedRoute = this.offlineData.routes.find((r) => r.id === routeId);

    if (cachedRoute) {
      // Update access stats
      cachedRoute.accessCount++;
      cachedRoute.lastAccessed = Date.now();
      this.saveOfflineData();

      return cachedRoute.route;
    }

    return null;
  }

  /**
   * Get cached destinations for offline search
   */
  getCachedDestinations(): GeocodeResult[] {
    return this.offlineData.destinations;
  }

  /**
   * Get frequently accessed routes
   */
  getFrequentRoutes(): CachedRoute[] {
    return this.offlineData.routes
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  /**
   * Generate unique route ID
   */
  private generateRouteId(
    origin: LocationData,
    destination: GeocodeResult
  ): string {
    const originKey = `${origin.latitude?.toFixed(4)},${origin.longitude?.toFixed(4)}`;
    const destKey =
      destination.place_id || `${destination.lat},${destination.lon}`;
    return `${originKey}->${destKey}`;
  }

  /**
   * Clean up old offline data
   */
  private cleanupOldData(): void {
    const now = Date.now();

    // Remove old routes
    this.offlineData.routes = this.offlineData.routes.filter(
      (route) => now - route.timestamp < OfflineModeService.CACHE_DURATION
    );

    this.saveOfflineData();
  }

  /**
   * Prune offline data based on access patterns
   */
  private pruneOfflineData(): void {
    // Sort by access score (combination of count and recency)
    this.offlineData.routes.sort((a, b) => {
      const scoreA = a.accessCount * (1 / (Date.now() - a.lastAccessed));
      const scoreB = b.accessCount * (1 / (Date.now() - b.lastAccessed));
      return scoreB - scoreA;
    });

    // Keep only top routes
    this.offlineData.routes = this.offlineData.routes.slice(
      0,
      OfflineModeService.MAX_CACHED_ROUTES
    );

    this.saveOfflineData();
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    this.offlineData = {
      routes: [],
      destinations: [],
      lastSync: Date.now(),
    };
    localStorage.removeItem(OfflineModeService.STORAGE_KEY);
  }

  /**
   * Get offline data statistics
   */
  getOfflineStats(): {
    routeCount: number;
    destinationCount: number;
    storageSize: number;
    lastSync: Date;
  } {
    const storageSize = new Blob([JSON.stringify(this.offlineData)]).size;

    return {
      routeCount: this.offlineData.routes.length,
      destinationCount: this.offlineData.destinations.length,
      storageSize,
      lastSync: new Date(this.offlineData.lastSync),
    };
  }
}

// Export singleton instance
export const offlineMode = new OfflineModeService();
