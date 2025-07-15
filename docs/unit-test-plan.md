# Unit Test Implementation Plan

This document outlines the detailed plan for implementing unit tests across the Where Now Explorer codebase.

## Overview

The testing strategy prioritizes business logic and critical functionality over pure UI components. Tests will be implemented using Vitest with React Testing Library, following a phased approach to achieve 80%+ coverage.

## Phase 1: Core Services Testing (High Priority) ✅ COMPLETED
**Estimated Time: 1.5 days**

### Geolocation & Location Services

#### 1. geolocation.service.test.ts ✅
- [x] Test getCurrentPosition with success scenario
- [x] Test getCurrentPosition with permission denied error
- [x] Test getCurrentPosition with timeout error
- [x] Test getCurrentPosition with position unavailable error
- [x] Test watchPosition with mock callbacks
- [x] Test clearWatch functionality
- [x] Mock navigator.geolocation API

#### 2. geocoding.service.test.ts ✅
- [x] Test searchPlaces with valid address input
- [x] Test searchPlaces with empty input
- [x] Test searchPlaces with special characters
- [x] Test reverseGeocode with valid coordinates
- [x] Test reverseGeocode with invalid coordinates
- [x] Test API error handling (404, 500, network errors)
- [x] Test retry logic on failures
- [x] Test response formatting and data sanitization
- [x] Mock fetch API responses

#### 3. routing.service.test.ts ✅
- [x] Test getRoute with driving mode
- [x] Test getRoute with walking mode
- [x] Test getRoute with cycling mode
- [x] Test distance formatting (km/m)
- [x] Test duration formatting (hours/minutes)
- [x] Test arrival time calculations
- [x] Test API error scenarios
- [x] Test invalid coordinate handling

### Data Management Services

#### 4. geocodingCache.service.test.ts ✅
- [x] Test cache get with existing entry
- [x] Test cache get with expired entry
- [x] Test cache set with new entry
- [x] Test TTL expiration logic
- [x] Test popular location tracking
- [x] Test pre-caching of nearby locations
- [x] Test storage size management
- [x] Test cache cleanup on size limit

#### 5. offlineMode.service.test.ts ✅
- [x] Test online/offline detection
- [x] Test network check fallback
- [x] Test route caching functionality
- [x] Test route retrieval from cache
- [x] Test frequently accessed routes tracking
- [x] Test storage management with LRU eviction
- [x] Test cache invalidation

## Phase 2: Utility Services Testing (High Priority)
**Estimated Time: 1 day**

#### 6. rateLimiter.service.test.ts
- [ ] Test rate limit enforcement per endpoint
- [ ] Test sliding window implementation
- [ ] Test multiple requests within limit
- [ ] Test requests exceeding limit
- [ ] Test reset timing calculations
- [ ] Test concurrent request handling
- [ ] Test different endpoints with different limits

#### 7. requestBatcher.service.test.ts
- [ ] Test single request processing
- [ ] Test request queuing
- [ ] Test batch processing with size limit
- [ ] Test batch processing with timeout
- [ ] Test error handling in batch
- [ ] Test partial batch success
- [ ] Test request deduplication in batch

#### 8. base.service.test.ts
- [ ] Test error type detection
- [ ] Test retry logic with exponential backoff
- [ ] Test max retry limit
- [ ] Test input validation utilities
- [ ] Test sanitization methods
- [ ] Test rate limiting integration
- [ ] Test monitoring integration

## Phase 3: Critical Hooks Testing (High Priority)
**Estimated Time: 1 day**

#### 9. useGeolocation.test.ts
- [ ] Test initial loading state
- [ ] Test successful location fetch
- [ ] Test permission denied handling
- [ ] Test error state management
- [ ] Test location update flow
- [ ] Test cleanup on unmount
- [ ] Mock geolocation service dependency

#### 10. useDistanceCalculation.test.ts
- [ ] Test distance calculation between points
- [ ] Test route fetching integration
- [ ] Test loading states during calculation
- [ ] Test error handling for invalid inputs
- [ ] Test transport mode changes
- [ ] Test result caching
- [ ] Mock routing service

#### 11. useDebounce.test.ts
- [ ] Test immediate value return
- [ ] Test debounced value update
- [ ] Test rapid value changes
- [ ] Test cleanup on unmount
- [ ] Test custom delay values

#### 12. useErrorHandler.test.ts
- [ ] Test error capture
- [ ] Test error message formatting
- [ ] Test retry functionality
- [ ] Test error dismissal
- [ ] Test toast notification integration
- [ ] Test error recovery actions

## Phase 4: Component Testing (Medium Priority)
**Estimated Time: 1 day**

#### 13. LocationContext.test.tsx
- [ ] Test initial context state
- [ ] Test location fetching flow
- [ ] Test mock location toggle (dev mode)
- [ ] Test auto-refresh countdown
- [ ] Test manual refresh
- [ ] Test error handling states
- [ ] Test geocoding integration
- [ ] Test traditional land info
- [ ] Mock all service dependencies

#### 14. DestinationInput.test.tsx
- [ ] Test input rendering
- [ ] Test search debouncing behavior
- [ ] Test autocomplete suggestions display
- [ ] Test suggestion selection (click)
- [ ] Test keyboard navigation (arrow keys)
- [ ] Test enter key submission
- [ ] Test loading state during search
- [ ] Test API error handling
- [ ] Test country-aware filtering
- [ ] Mock geocoding service

#### 15. ErrorBoundary.test.tsx
- [ ] Test error catching from child
- [ ] Test error UI rendering
- [ ] Test reset functionality
- [ ] Test analytics tracking on error
- [ ] Test multiple error scenarios
- [ ] Test HOC wrapper usage

#### 16. PullToRefresh.test.tsx
- [ ] Test initial render
- [ ] Test touch start handling
- [ ] Test pull gesture tracking
- [ ] Test refresh threshold detection
- [ ] Test loading state during refresh
- [ ] Test completion handling
- [ ] Test disabled state
- [ ] Mock touch events

## Phase 5: Supporting Services Testing (Medium Priority)
**Estimated Time: 0.5 days**

#### 17. analytics.service.test.ts
- [ ] Test trackEvent method
- [ ] Test trackError method
- [ ] Test trackTiming method
- [ ] Test trackPageView method
- [ ] Test location permission tracking
- [ ] Test GA4 integration
- [ ] Test production vs development mode
- [ ] Mock gtag

#### 18. featureFlags.service.test.ts
- [ ] Test flag evaluation (enabled/disabled)
- [ ] Test rollout percentage logic
- [ ] Test user agent conditions
- [ ] Test location-based conditions
- [ ] Test time-based conditions
- [ ] Test React hook integration
- [ ] Test default values

#### 19. healthCheck.service.test.ts
- [ ] Test browser API checks
- [ ] Test memory usage checks
- [ ] Test network connectivity checks
- [ ] Test storage availability checks
- [ ] Test monitoring interval
- [ ] Test overall status calculation
- [ ] Test health endpoint middleware

## Phase 6: Additional Hooks & Components (Lower Priority)
**Estimated Time: 0.5 days**

#### 20. useLocalStorage.test.ts
- [ ] Test initial value reading
- [ ] Test value writing
- [ ] Test value updating
- [ ] Test SSR safety (no window)
- [ ] Test JSON parsing errors
- [ ] Test storage quota errors

#### 21. useOnlineStatus.test.ts
- [ ] Test initial online state
- [ ] Test offline transition
- [ ] Test online transition
- [ ] Test event listener setup
- [ ] Test cleanup on unmount
- [ ] Mock navigator.onLine

#### 22. InstallPrompt.test.tsx
- [ ] Test PWA eligibility detection
- [ ] Test install prompt display
- [ ] Test install acceptance flow
- [ ] Test dismiss functionality
- [ ] Test localStorage persistence
- [ ] Test beforeinstallprompt event
- [ ] Mock PWA events

## Test Implementation Guidelines

### Test File Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName/ServiceName', () => {
  // Setup mocks
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Cleanup
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('feature/method name', () => {
    it('should handle the success case', async () => {
      // Arrange: Set up test data and mocks
      
      // Act: Execute the functionality
      
      // Assert: Verify the results
    });

    it('should handle error scenarios gracefully', async () => {
      // Test error handling
    });
  });
});
```

### Mocking Best Practices
1. Mock external dependencies (APIs, browser APIs)
2. Use `vi.mock()` for module mocking
3. Create reusable mock factories for common scenarios
4. Clear mocks between tests to prevent interference

### Assertion Guidelines
1. Test behavior, not implementation details
2. Use descriptive test names that explain the scenario
3. Follow AAA pattern: Arrange, Act, Assert
4. Test both success and failure paths
5. Verify side effects (analytics, logging)

## Coverage Goals

### Target Coverage by Category
- **Core Services**: 90%+ (critical functionality)
- **Utility Services**: 85%+
- **Hooks**: 80%+
- **Components with Logic**: 75%+
- **Context Providers**: 85%+
- **Overall Target**: 80%+

### Coverage Exclusions
- Pure UI components without logic
- Third-party component wrappers (ui/ directory)
- Type definition files
- Configuration files
- Main entry point (main.tsx)

## Success Metrics
- All tests pass in CI/CD pipeline
- No flaky tests
- Tests run in under 30 seconds
- Clear error messages on failures
- Maintainable test code

## Total Timeline: 5 days

### Progress Update (2025-07-15)
- ✅ **Phase 1 COMPLETED**: All core service tests (93 tests) are now implemented and passing:
  - geolocation.service.test.ts (13 tests)
  - geocoding.service.test.ts (20 tests)  
  - routing.service.test.ts (18 tests)
  - geocodingCache.service.test.ts (18 tests)
  - offlineMode.service.test.ts (24 tests)

This plan provides comprehensive coverage of the application's business logic while maintaining practical scope and timeline constraints.