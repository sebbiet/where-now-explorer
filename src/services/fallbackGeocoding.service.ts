/**
 * Fallback Geocoding Service
 * Provides alternative geocoding providers when primary service fails
 */

import { GeocodeResult, ReverseGeocodeResult, GeocodingError } from './geocoding.service';
import { validateCoordinates } from '@/utils/sanitization';
import { animations } from '@/styles/constants';

export interface GeocodingProvider {
  name: string;
  reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult>;
  geocode(query: string, options?: any): Promise<GeocodeResult[]>;
  isAvailable(): boolean;
  getPriority(): number;
}

/**
 * Mock provider for demonstration - would be replaced with real providers
 */
class MockGeocodingProvider implements GeocodingProvider {
  constructor(public name: string, private priority: number = 0) {}

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, animations.timeouts.debounce));
    
    return {
      street: 'Fallback Street',
      city: 'Fallback City',
      state: 'Fallback State',
      country: 'Fallback Country',
      latitude: lat,
      longitude: lon
    };
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, animations.timeouts.debounce));
    
    return [{
      lat: '-33.8688',
      lon: '151.2093',
      display_name: `${query} (Fallback Result)`,
      place_id: 'fallback-' + Date.now(),
      type: 'fallback'
    }];
  }

  isAvailable(): boolean {
    return true;
  }

  getPriority(): number {
    return this.priority;
  }
}

export class FallbackGeocodingService {
  private providers: GeocodingProvider[] = [];
  private providerStatus = new Map<string, {
    available: boolean;
    lastCheck: number;
    failureCount: number;
  }>();
  
  private static readonly STATUS_CHECK_INTERVAL = animations.timeouts.polling; // 5 minutes
  private static readonly MAX_FAILURES = 3;

  constructor() {
    // Initialize with mock providers - in production, these would be real providers
    this.addProvider(new MockGeocodingProvider('MapBox', 1));
    this.addProvider(new MockGeocodingProvider('Here', 2));
    this.addProvider(new MockGeocodingProvider('Bing', 3));
  }

  /**
   * Add a geocoding provider
   */
  addProvider(provider: GeocodingProvider): void {
    this.providers.push(provider);
    this.providerStatus.set(provider.name, {
      available: true,
      lastCheck: Date.now(),
      failureCount: 0
    });
    
    // Sort by priority
    this.providers.sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * Get available providers sorted by priority
   */
  private getAvailableProviders(): GeocodingProvider[] {
    return this.providers.filter(provider => {
      const status = this.providerStatus.get(provider.name);
      if (!status) return false;
      
      // Check if we should re-evaluate availability
      if (Date.now() - status.lastCheck > FallbackGeocodingService.STATUS_CHECK_INTERVAL) {
        status.available = provider.isAvailable();
        status.lastCheck = Date.now();
        if (status.available) {
          status.failureCount = 0;
        }
      }
      
      return status.available;
    });
  }

  /**
   * Mark provider as failed
   */
  private markProviderFailed(providerName: string): void {
    const status = this.providerStatus.get(providerName);
    if (status) {
      status.failureCount++;
      if (status.failureCount >= FallbackGeocodingService.MAX_FAILURES) {
        status.available = false;
        console.warn(`Provider ${providerName} marked as unavailable after ${status.failureCount} failures`);
      }
    }
  }

  /**
   * Reverse geocode with fallback
   */
  async reverseGeocodeWithFallback(
    lat: number,
    lon: number,
    primaryProvider?: () => Promise<ReverseGeocodeResult>
  ): Promise<ReverseGeocodeResult> {
    if (!validateCoordinates(lat, lon)) {
      throw new GeocodingError('Invalid coordinates provided');
    }

    // Try primary provider first if provided
    if (primaryProvider) {
      try {
        return await primaryProvider();
      } catch (error) {
        console.warn('Primary geocoding provider failed, trying fallbacks', error);
      }
    }

    // Try fallback providers
    const providers = this.getAvailableProviders();
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        console.log(`Attempting reverse geocoding with ${provider.name}`);
        const result = await provider.reverseGeocode(lat, lon);
        
        // Validate result
        if (result && (result.city || result.country)) {
          return result;
        }
      } catch (error) {
        console.error(`${provider.name} reverse geocoding failed:`, error);
        this.markProviderFailed(provider.name);
        errors.push(error as Error);
      }
    }

    // All providers failed
    throw new GeocodingError(
      'All geocoding providers failed. ' + 
      errors.map(e => e.message).join(', ')
    );
  }

  /**
   * Geocode with fallback
   */
  async geocodeWithFallback(
    query: string,
    options?: any,
    primaryProvider?: () => Promise<GeocodeResult[]>
  ): Promise<GeocodeResult[]> {
    // Try primary provider first if provided
    if (primaryProvider) {
      try {
        const results = await primaryProvider();
        if (results && results.length > 0) {
          return results;
        }
      } catch (error) {
        console.warn('Primary geocoding provider failed, trying fallbacks', error);
      }
    }

    // Try fallback providers
    const providers = this.getAvailableProviders();
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        console.log(`Attempting geocoding with ${provider.name}`);
        const results = await provider.geocode(query, options);
        
        // Validate results
        if (results && results.length > 0) {
          return results;
        }
      } catch (error) {
        console.error(`${provider.name} geocoding failed:`, error);
        this.markProviderFailed(provider.name);
        errors.push(error as Error);
      }
    }

    // All providers failed
    throw new GeocodingError(
      'All geocoding providers failed. ' + 
      errors.map(e => e.message).join(', ')
    );
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): Record<string, any> {
    const health: Record<string, any> = {};
    
    this.providers.forEach(provider => {
      const status = this.providerStatus.get(provider.name);
      health[provider.name] = {
        available: status?.available || false,
        failureCount: status?.failureCount || 0,
        lastCheck: status?.lastCheck ? new Date(status.lastCheck).toISOString() : null,
        priority: provider.getPriority()
      };
    });
    
    return health;
  }
}

// Export singleton instance
export const fallbackGeocoding = new FallbackGeocodingService();