# Geocoding Service Fixes and Improvements

## Current Issues Analysis

### 1. CORS Blocking Issues

The geocoding service currently makes direct calls from the browser to OpenStreetMap's Nominatim API. This causes CORS (Cross-Origin Resource Sharing) errors because:

- Nominatim API doesn't include CORS headers for browser requests
- Browser security policies block the responses
- No proxy or server-side implementation exists to handle these requests

**Evidence:**

```typescript
// src/services/geocoding.service.ts
private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
// Direct browser calls to this URL fail due to CORS
```

### 2. Limited Circuit Breaker Implementation

Current implementation has rate limiting but lacks a proper circuit breaker pattern:

- Only tracks failure counts per provider
- No state management (CLOSED, OPEN, HALF_OPEN)
- Fixed 5-minute cooldown periods
- No gradual recovery mechanism

### 3. Mock Fallback Providers

The fallback geocoding service only contains mock implementations:

```typescript
// src/services/fallbackGeocoding.service.ts
this.addProvider(new MockGeocodingProvider('MapBox', 1));
this.addProvider(new MockGeocodingProvider('Here', 2));
this.addProvider(new MockGeocodingProvider('Bing', 3));
```

## Proposed Solutions

### 1. CORS Fix Implementation

#### Option A: Server-Side Proxy (Recommended)

Create an edge function or API route to proxy geocoding requests:

**Advantages:**

- Full control over caching and rate limiting
- Can add authentication and monitoring
- Works with any geocoding provider
- No external dependencies

**Implementation:**

```typescript
// api/geocoding/reverse.ts
export async function POST(request: Request) {
  const { latitude, longitude } = await request.json();

  // Add server-side rate limiting
  if (!rateLimiter.check(request)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Make request to Nominatim from server
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        'User-Agent': 'AreWeThereYetApp/1.0',
      },
    }
  );

  const data = await response.json();

  // Return with proper CORS headers
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

#### Option B: Public CORS Proxy

Use a public CORS proxy service as a temporary solution:

```typescript
// Quick fix - not recommended for production
const CORS_PROXY = 'https://corsproxy.io/?';
const url = `${CORS_PROXY}${encodeURIComponent(nominatimUrl)}`;
```

#### Option C: Self-Hosted Nominatim

Deploy own Nominatim instance with proper CORS configuration:

- Most control but highest maintenance
- Requires significant infrastructure
- Best for high-volume applications

### 2. Proper Circuit Breaker Implementation

```typescript
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  successThreshold: number; // Successes to close from half-open
  timeout: number; // Time before trying half-open
  volumeThreshold: number; // Min requests before evaluating
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private requestCount: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successes = 0;
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

### 3. Real Fallback Provider Implementation

```typescript
// src/services/providers/mapbox.provider.ts
class MapBoxProvider implements GeocodingProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<ReverseGeocodeResult> {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${lon},${lat}.json?access_token=${this.apiKey}`
    );

    const data = await response.json();

    // Transform MapBox response to our format
    return this.transformResponse(data);
  }

  private transformResponse(data: any): ReverseGeocodeResult {
    const feature = data.features[0];
    return {
      street: this.extractComponent(feature, 'address'),
      city: this.extractComponent(feature, 'place'),
      state: this.extractComponent(feature, 'region'),
      country: this.extractComponent(feature, 'country'),
      latitude: feature.center[1],
      longitude: feature.center[0],
    };
  }
}
```

## Implementation Steps

### Phase 1: Quick CORS Fix (1-2 days)

1. Implement server-side proxy endpoint
2. Update geocoding service to use proxy
3. Add basic error handling
4. Deploy and test

### Phase 2: Circuit Breaker (3-4 days)

1. Implement circuit breaker class
2. Integrate with base service
3. Add configuration for each provider
4. Add metrics and logging
5. Test failure scenarios

### Phase 3: Real Providers (1 week)

1. Implement MapBox provider
2. Implement Here Maps provider
3. Implement Bing Maps provider
4. Add provider configuration
5. Update environment variables
6. Test provider rotation

### Phase 4: Monitoring (2-3 days)

1. Add error tracking (Sentry/similar)
2. Create provider health dashboard
3. Set up alerts for failures
4. Document runbooks

## Testing Strategy

### Unit Tests

```typescript
describe('CircuitBreaker', () => {
  it('should open circuit after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      volumeThreshold: 5,
    });

    const failingOperation = jest.fn().mockRejectedValue(new Error('Failed'));

    // First 3 failures should go through
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingOperation)).rejects.toThrow();
    }

    // 4th attempt should be rejected immediately
    await expect(breaker.execute(failingOperation)).rejects.toThrow(
      'Circuit breaker is OPEN'
    );
    expect(failingOperation).toHaveBeenCalledTimes(3);
  });
});
```

### Integration Tests

- Test with real API endpoints
- Test provider failover
- Test rate limiting
- Test CORS proxy functionality

### E2E Tests

- Test location search flow
- Test reverse geocoding on location update
- Test error states and recovery

## Configuration

### Environment Variables

```env
# Primary provider
NOMINATIM_URL=https://nominatim.openstreetmap.org

# Fallback providers
MAPBOX_API_KEY=your_api_key_here
HERE_API_KEY=your_api_key_here
BING_MAPS_KEY=your_api_key_here

# Circuit breaker settings
CIRCUIT_FAILURE_THRESHOLD=5
CIRCUIT_SUCCESS_THRESHOLD=3
CIRCUIT_TIMEOUT_MS=30000
CIRCUIT_VOLUME_THRESHOLD=10

# Rate limiting
GEOCODING_RATE_LIMIT=60
GEOCODING_RATE_WINDOW_MS=60000
```

### Deployment Considerations

- Use environment-specific configs
- Monitor API usage and costs
- Set up proper API key rotation
- Configure CDN for caching

## Monitoring and Alerts

### Key Metrics

- API response times by provider
- Success/failure rates
- Circuit breaker state changes
- Cache hit rates
- API quota usage

### Alert Conditions

- Circuit breaker opens for any provider
- Error rate > 5% over 5 minutes
- Response time > 2s for 90th percentile
- API quota > 80% used

## Migration Plan

1. **Week 1**: Deploy CORS proxy without changing client code
2. **Week 2**: Add circuit breaker to existing providers
3. **Week 3**: Add real fallback providers in shadow mode
4. **Week 4**: Enable fallback providers gradually
5. **Week 5**: Full rollout with monitoring

## Rollback Plan

Each phase can be rolled back independently:

- CORS proxy: Revert to direct calls (will break)
- Circuit breaker: Feature flag to disable
- Providers: Configuration to disable specific providers

## Future Improvements

1. **Caching Enhancements**
   - Redis/Memcached for distributed caching
   - Geohash-based cache keys
   - Offline-first with IndexedDB

2. **Performance Optimizations**
   - Request batching for multiple geocodes
   - Predictive pre-caching
   - WebWorker for background processing

3. **Advanced Features**
   - Custom geocoding models
   - Multi-language support
   - Fuzzy matching improvements
