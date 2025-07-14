import { BaseService, ServiceError, ValidationError } from './base.service';
import { deduplicateRoutingRequest } from '@/utils/requestDeduplication';
import { offlineMode } from './offlineMode.service';

export interface RouteWaypoint {
  hint?: string;
  distance?: number;
  name: string;
  location: [number, number];
}

export interface RouteStep {
  geometry?: string;
  maneuver?: {
    type: string;
    location: [number, number];
  };
  duration: number;
  distance: number;
  name: string;
}

export interface RouteLeg {
  steps?: RouteStep[];
  summary?: string;
  weight?: number;
  duration: number;
  distance: number;
}

export interface Route {
  legs: RouteLeg[];
  weight_name?: string;
  weight?: number;
  duration: number;
  distance: number;
}

export interface RouteResponse {
  code: string;
  message?: string;
  waypoints?: RouteWaypoint[];
  routes?: Route[];
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  formattedDistance: string;
  formattedDuration: string;
}

export enum RoutingProfile {
  DRIVING = 'driving',
  WALKING = 'walking',
  CYCLING = 'cycling'
}

export interface CalculateRouteOptions {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  profile?: RoutingProfile;
  overview?: boolean;
  steps?: boolean;
  alternatives?: boolean;
  geometries?: 'polyline' | 'polyline6' | 'geojson';
}

// Keep RoutingError for backward compatibility
export class RoutingError extends ServiceError {
  constructor(message: string, code?: string) {
    super(message, code || 'ROUTING_ERROR', 500);
    this.name = 'RoutingError';
  }
}

class RoutingServiceImpl extends BaseService {
  private static readonly BASE_URL = 'https://router.project-osrm.org/route/v1';
  
  constructor() {
    super('routing', {
      rateLimitKey: 'routing',
      maxRetries: 3,
      timeout: 10000,
      enableMonitoring: true,
      enableDeduplication: true,
      enablePerformanceTracking: true
    });
  }

  async calculateRoute(options: CalculateRouteOptions): Promise<RouteResult> {
    try {
      const { origin, destination, profile = RoutingProfile.DRIVING } = options;
      
      // Validate input coordinates
      this.validateInput({ origin, destination }, {
        origin: (o) => this.isValidCoordinates(o.latitude, o.longitude),
        destination: (d) => this.isValidCoordinates(d.latitude, d.longitude)
      });

      // Check offline cache first
      if (!offlineMode.getOnlineStatus()) {
        console.log('Offline mode: checking cached routes');
      }

      const params = new URLSearchParams({
        overview: (options.overview ?? false).toString(),
        steps: (options.steps ?? false).toString(),
        alternatives: (options.alternatives ?? false).toString(),
        geometries: options.geometries || 'polyline'
      });

      const url = `${RoutingServiceImpl.BASE_URL}/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?${params}`;
      
      // Primary routing operation
      const primaryOperation = async () => {
        const data = await this.executeRequest<RouteResponse>(url);
        
        if (data.code !== 'Ok') {
          throw new RoutingError(
            data.message || 'Failed to find a route',
            data.code
          );
        }
        
        if (!data.routes || data.routes.length === 0) {
          throw new RoutingError(
            'No route found between the specified locations',
            'NO_ROUTE'
          );
        }

        return data;
      };

      // Execute with deduplication
      const data = await this.executeWithDeduplication(
        'route',
        { origin, destination, profile },
        async () => {
          return deduplicateRoutingRequest(
            origin,
            destination,
            profile,
            primaryOperation
          );
        }
      );
      
      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMinutes = Math.round(route.duration / 60);
      
      return {
        distanceKm,
        durationMinutes,
        formattedDistance: this.formatDistance(distanceKm),
        formattedDuration: this.formatDuration(durationMinutes)
      };
    } catch (error) {
      this.handleError(error, 'calculateRoute');
    }
  }

  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} meters`;
    }
    return `${distanceKm.toFixed(1)} kilometers`;
  }

  formatDuration(durationMinutes: number): string {
    if (durationMinutes < 60) {
      return `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    let result = `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) {
      result += ` ${minutes} min`;
    }
    
    return result;
  }

  estimateArrivalTime(durationMinutes: number): Date {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    return arrivalTime;
  }

  formatArrivalTime(arrivalTime: Date): string {
    return arrivalTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }
}

// Create singleton instance
const routingServiceInstance = new RoutingServiceImpl();

// Export static-like interface for backward compatibility
export class RoutingService {
  // New options-based interface
  static async calculateRoute(options: CalculateRouteOptions): Promise<RouteResult>;
  // Backward compatibility interface
  static async calculateRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    profile?: RoutingProfile,
    routingOptions?: {
      overview?: boolean;
      steps?: boolean;
      alternatives?: boolean;
      geometries?: 'polyline' | 'polyline6' | 'geojson';
    }
  ): Promise<RouteResult>;
  
  static async calculateRoute(
    originOrOptions: CalculateRouteOptions | { latitude: number; longitude: number },
    destination?: { latitude: number; longitude: number },
    profile: RoutingProfile = RoutingProfile.DRIVING,
    routingOptions?: {
      overview?: boolean;
      steps?: boolean;
      alternatives?: boolean;
      geometries?: 'polyline' | 'polyline6' | 'geojson';
    }
  ): Promise<RouteResult> {
    // Check if using new options-based interface
    if (destination === undefined && 'origin' in originOrOptions) {
      // New interface - options object
      return routingServiceInstance.calculateRoute(originOrOptions as CalculateRouteOptions);
    } else {
      // Backward compatibility interface
      const options: CalculateRouteOptions = {
        origin: originOrOptions as { latitude: number; longitude: number },
        destination: destination!,
        profile,
        ...routingOptions
      };
      return routingServiceInstance.calculateRoute(options);
    }
  }

  static formatDistance(distanceKm: number): string {
    return routingServiceInstance.formatDistance(distanceKm);
  }

  static formatDuration(durationMinutes: number): string {
    return routingServiceInstance.formatDuration(durationMinutes);
  }

  static estimateArrivalTime(durationMinutes: number): Date {
    return routingServiceInstance.estimateArrivalTime(durationMinutes);
  }

  static formatArrivalTime(arrivalTime: Date): string {
    return routingServiceInstance.formatArrivalTime(arrivalTime);
  }
}