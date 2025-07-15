# API Documentation

## Where Now Explorer API Reference

This document provides comprehensive API documentation for the Where Now Explorer application's core services, hooks, and utilities.

## Table of Contents

- [Services](#services)
  - [Geocoding Service](#geocoding-service)
  - [Geolocation Service](#geolocation-service)
  - [Routing Service](#routing-service)
- [Hooks](#hooks)
  - [useDebounce](#usedebounce)
  - [useGeolocation](#usegeolocation)
  - [useDistanceCalculation](#usedistancecalculation)
- [Utilities](#utilities)
  - [Retry Utility](#retry-utility)
  - [Haptic Feedback](#haptic-feedback)
  - [Privacy Utils](#privacy-utils)

---

## Services

### Geocoding Service

The `GeocodingService` provides location search and reverse geocoding functionality using the OpenStreetMap Nominatim API.

#### Features

- Forward geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)
- Automatic caching and rate limiting
- Fallback support for reliability
- Input sanitization and validation

#### Basic Usage

```typescript
import { GeocodingService } from '@/services/geocoding.service';

// Forward geocoding - find coordinates for an address
const results = await GeocodingService.geocode({
  query: 'Sydney Opera House',
  limit: 5,
  addressdetails: true,
  countrycodes: ['au'],
});

// Reverse geocoding - find address for coordinates
const address = await GeocodingService.reverseGeocode({
  latitude: -33.8568,
  longitude: 151.2153,
  minimal: false,
});
```

#### Methods

##### `geocode(options: GeocodeOptions): Promise<GeocodeResult[]>`

Convert an address or place name to geographic coordinates.

**Parameters:**

- `query` (string): Search query (address, place name, etc.)
- `limit` (number, optional): Maximum number of results (default: 1)
- `addressdetails` (boolean, optional): Include detailed address components (default: true)
- `countrycodes` (string[], optional): Limit results to specific countries
- `bounded` (boolean, optional): Restrict results to viewbox area
- `viewbox` (number[], optional): Bounding box [min_lon, min_lat, max_lon, max_lat]

**Returns:** Array of `GeocodeResult` objects containing coordinates and location details.

##### `reverseGeocode(options: ReverseGeocodeOptions): Promise<ReverseGeocodeResult>`

Convert geographic coordinates to a human-readable address.

**Parameters:**

- `latitude` (number): Latitude coordinate
- `longitude` (number): Longitude coordinate
- `minimal` (boolean, optional): Return minimal response data

**Returns:** `ReverseGeocodeResult` object with address components.

##### `extractPlaceName(result: GeocodeResult): string`

Extract the primary place name from a geocoding result, prioritizing attractions and points of interest.

##### `formatAddress(address: ReverseGeocodeResult): string`

Format address components into a human-readable string.

---

### Geolocation Service

Provides access to the user's current location using the browser's Geolocation API with enhanced error handling and timeout management.

#### Features

- Current position retrieval
- Position watching with updates
- Automatic error handling and retries
- Configurable accuracy and timeout
- Privacy-aware implementations

#### Basic Usage

```typescript
import { GeolocationService } from '@/services/geolocation.service';

// Get current position
const position = await GeolocationService.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
});

// Watch position changes
const watchId = GeolocationService.watchPosition(
  (position) => console.log('New position:', position),
  (error) => console.error('Location error:', error),
  { enableHighAccuracy: true }
);

// Stop watching
GeolocationService.clearWatch(watchId);
```

---

### Routing Service

Calculates routes and distances between locations using various transportation modes.

#### Features

- Distance calculation (straight-line and routed)
- Multiple transportation modes
- Route optimization
- Turn-by-turn directions
- Estimated travel times

#### Basic Usage

```typescript
import { RoutingService } from '@/services/routing.service';

// Calculate straight-line distance
const distance = RoutingService.calculateDistance(
  { latitude: -33.8568, longitude: 151.2153 },
  { latitude: -33.8688, longitude: 151.2093 }
);

// Calculate route with directions
const route = await RoutingService.calculateRoute({
  origin: { latitude: -33.8568, longitude: 151.2153 },
  destination: { latitude: -33.8688, longitude: 151.2093 },
  mode: 'driving',
});
```

---

## Hooks

### useDebounce

Custom React hook that debounces a value for a specified delay period, useful for optimizing performance in search inputs and API calls.

#### Usage

```typescript
import { useDebounce } from '@/hooks/useDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // API call happens only after user stops typing for 500ms
      searchAPI(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

#### Parameters

- `value` (T): The value to debounce
- `delay` (number): Delay in milliseconds

#### Returns

- `T`: The debounced value that updates after the delay period

---

### useGeolocation

React hook for accessing and managing the user's geolocation with built-in error handling and state management.

#### Features

- Automatic permission handling
- Real-time position updates
- Error state management
- Loading indicators
- Configurable accuracy settings

#### Usage

```typescript
import { useGeolocation } from '@/hooks/useGeolocation';

function LocationComponent() {
  const { position, error, loading, getCurrentPosition } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  });

  if (loading) return <div>Getting location...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!position) return <div>Location not available</div>;

  return (
    <div>
      Latitude: {position.coords.latitude}
      Longitude: {position.coords.longitude}
    </div>
  );
}
```

---

### useDistanceCalculation

Hook for calculating distances and managing destination tracking with real-time updates.

#### Features

- Real-time distance calculation
- Multiple measurement units
- Progress tracking
- Arrival detection
- Performance optimization

#### Usage

```typescript
import { useDistanceCalculation } from '@/hooks/useDistanceCalculation';

function DistanceTracker() {
  const { distance, progress, hasArrived } = useDistanceCalculation({
    origin: userLocation,
    destination: targetLocation,
    units: 'metric',
    arrivalThreshold: 100 // meters
  });

  return (
    <div>
      <p>Distance: {distance?.toFixed(2)} km</p>
      <p>Progress: {progress}%</p>
      {hasArrived && <p>🎉 You have arrived!</p>}
    </div>
  );
}
```

---

## Utilities

### Retry Utility

Provides robust retry logic with exponential backoff for handling transient failures in network requests and other operations.

#### Features

- Exponential backoff with jitter
- Configurable retry conditions
- Custom error handling
- Progress callbacks
- Smart failure detection

#### Usage

```typescript
import { retryWithBackoff, makeRetryable } from '@/utils/retry';

// Direct retry usage
const data = await retryWithBackoff(
  () => fetch('/api/data').then((res) => res.json()),
  {
    maxAttempts: 5,
    initialDelay: 500,
    shouldRetry: (error) => error.status >= 500,
    onRetry: (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`),
  }
);

// Create a retryable function
const fetchUserData = makeRetryable(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
  { maxAttempts: 3, initialDelay: 1000 }
);
```

---

### Haptic Feedback

Provides haptic feedback capabilities for mobile devices with graceful fallbacks.

#### Features

- Multiple feedback types (light, medium, heavy)
- Success/error patterns
- iOS Taptic Engine support
- Android vibration API support
- Automatic capability detection

#### Usage

```typescript
import { haptic } from '@/utils/haptic';

// Light feedback for button taps
haptic.light();

// Medium feedback for important actions
haptic.medium();

// Success pattern for completed actions
haptic.success();

// Error pattern for failures
haptic.error();
```

---

### Privacy Utils

Utilities for handling location privacy and data sanitization.

#### Features

- Coordinate obfuscation
- Location noise addition
- Sensitive data detection
- Privacy mode support
- Data sanitization

#### Usage

```typescript
import {
  obfuscateCoordinates,
  addLocationNoise,
  sanitizeLocationData,
} from '@/utils/privacy';

// Reduce coordinate precision
const obfuscated = obfuscateCoordinates(-33.8568, 151.2153, 2);

// Add random noise for privacy
const noisy = addLocationNoise(-33.8568, 151.2153, 500);

// Sanitize location data based on privacy settings
const sanitized = sanitizeLocationData(locationData, true, false);
```

---

## Error Handling

All services and utilities include comprehensive error handling:

- **ServiceError**: Base error class with error codes and context
- **ValidationError**: For input validation failures
- **NetworkError**: For network-related failures
- **RateLimitError**: For rate limiting violations

```typescript
try {
  const results = await GeocodingService.geocode({ query: 'Sydney' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof NetworkError) {
    console.log('Network issue:', error.message);
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

---

## Rate Limiting

Services automatically handle rate limiting with intelligent backoff:

- **Geocoding**: 1 request per second, 100 per hour
- **Routing**: 5 requests per minute
- **Reverse Geocoding**: 1 request per second

Rate limits are enforced automatically with queuing and backoff strategies.

---

## Caching

Intelligent caching reduces API calls and improves performance:

- **Geocoding results**: Cached for 1 hour
- **Reverse geocoding**: Cached for 30 minutes
- **Route calculations**: Cached for 15 minutes

Cache keys are generated based on request parameters and coordinates are rounded to prevent cache misses from minor precision differences.
