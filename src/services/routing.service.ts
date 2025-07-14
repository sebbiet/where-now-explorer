import { retryWithBackoff } from '@/utils/retry';

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

export class RoutingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'RoutingError';
  }
}

export class RoutingService {
  private static readonly BASE_URL = 'https://router.project-osrm.org/route/v1';
  
  static async calculateRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    profile: RoutingProfile = RoutingProfile.DRIVING,
    options?: {
      overview?: boolean;
      steps?: boolean;
      alternatives?: boolean;
      geometries?: 'polyline' | 'polyline6' | 'geojson';
    }
  ): Promise<RouteResult> {
    try {
      const params = new URLSearchParams({
        overview: (options?.overview ?? false).toString(),
        steps: (options?.steps ?? false).toString(),
        alternatives: (options?.alternatives ?? false).toString(),
        geometries: options?.geometries || 'polyline'
      });

      const url = `${this.BASE_URL}/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?${params}`;
      
      const fetchRoute = async () => {
        const response = await fetch(url);
        
        if (!response.ok) {
          const error = new RoutingError(
            'Failed to calculate route',
            response.status.toString()
          );
          (error as any).status = response.status;
          throw error;
        }
        
        return response.json();
      };
      
      const data: RouteResponse = await retryWithBackoff(fetchRoute, {
        maxAttempts: 3,
        onRetry: (attempt, delay) => {
          console.log(`Retrying route calculation (attempt ${attempt}) after ${Math.round(delay)}ms`);
        }
      });
      
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
      if (error instanceof RoutingError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new RoutingError(`Routing failed: ${error.message}`);
      }
      
      throw new RoutingError('An unknown error occurred during routing');
    }
  }

  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} meters`;
    }
    return `${distanceKm.toFixed(1)} kilometers`;
  }

  static formatDuration(durationMinutes: number): string {
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

  static estimateArrivalTime(durationMinutes: number): Date {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    return arrivalTime;
  }

  static formatArrivalTime(arrivalTime: Date): string {
    return arrivalTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}