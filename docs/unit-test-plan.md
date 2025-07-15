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

## Phase 2: Utility Services Testing (High Priority) ✅ COMPLETED
**Estimated Time: 1 day**

#### 6. rateLimiter.service.test.ts ✅
- [x] Test rate limit enforcement per endpoint
- [x] Test sliding window implementation
- [x] Test multiple requests within limit
- [x] Test requests exceeding limit
- [x] Test reset timing calculations
- [x] Test concurrent request handling
- [x] Test different endpoints with different limits

#### 7. requestBatcher.service.test.ts ✅
- [x] Test single request processing
- [x] Test request queuing
- [x] Test batch processing with size limit
- [x] Test batch processing with timeout
- [x] Test error handling in batch
- [x] Test partial batch success
- [x] Test request deduplication in batch

#### 8. base.service.test.ts ✅
- [x] Test error type detection
- [x] Test retry logic with exponential backoff
- [x] Test max retry limit
- [x] Test input validation utilities
- [x] Test sanitization methods
- [x] Test rate limiting integration
- [x] Test monitoring integration

## Phase 3: Critical Hooks Testing (High Priority) ✅ COMPLETED
**Estimated Time: 1 day**

#### 9. useGeolocation.test.ts ✅
- [x] Test initial loading state
- [x] Test successful location fetch
- [x] Test permission denied handling
- [x] Test error state management
- [x] Test location update flow
- [x] Test cleanup on unmount
- [x] Mock geolocation service dependency

#### 10. useDistanceCalculation.test.ts ✅
- [x] Test distance calculation between points
- [x] Test route fetching integration
- [x] Test loading states during calculation
- [x] Test error handling for invalid inputs
- [x] Test transport mode changes
- [x] Test result caching
- [x] Mock routing service

#### 11. useDebounce.test.ts ✅
- [x] Test immediate value return
- [x] Test debounced value update
- [x] Test rapid value changes
- [x] Test cleanup on unmount
- [x] Test custom delay values

#### 12. useErrorHandler.test.ts ✅
- [x] Test error capture
- [x] Test error message formatting
- [x] Test retry functionality
- [x] Test error dismissal
- [x] Test toast notification integration
- [x] Test error recovery actions

## Phase 4: Component Testing (Medium Priority) ✅ COMPLETED
**Estimated Time: 1 day**

#### 13. LocationContext.test.tsx ✅
- [x] Test initial context state
- [x] Test location fetching flow
- [x] Test mock location toggle (dev mode)
- [x] Test auto-refresh countdown
- [x] Test manual refresh
- [x] Test error handling states
- [x] Test geocoding integration
- [x] Test traditional land info
- [x] Mock all service dependencies

#### 14. DestinationInput.test.tsx ✅
- [x] Test input rendering
- [x] Test search debouncing behavior
- [x] Test autocomplete suggestions display
- [x] Test suggestion selection (click)
- [x] Test keyboard navigation (arrow keys)
- [x] Test enter key submission
- [x] Test loading state during search
- [x] Test API error handling
- [x] Test country-aware filtering
- [x] Mock geocoding service

#### 15. ErrorBoundary.test.tsx ✅
- [x] Test error catching from child
- [x] Test error UI rendering
- [x] Test reset functionality
- [x] Test analytics tracking on error
- [x] Test multiple error scenarios
- [x] Test HOC wrapper usage

#### 16. PullToRefresh.test.tsx ✅
- [x] Test initial render
- [x] Test touch start handling
- [x] Test pull gesture tracking
- [x] Test refresh threshold detection
- [x] Test loading state during refresh
- [x] Test completion handling
- [x] Test disabled state
- [x] Mock touch events

## Phase 5: Supporting Services Testing (Medium Priority) ✅ COMPLETED
**Estimated Time: 0.5 days**

#### 17. analytics.service.test.ts ✅
- [x] Test trackEvent method
- [x] Test trackError method
- [x] Test trackTiming method
- [x] Test trackPageView method
- [x] Test location permission tracking
- [x] Test GA4 integration
- [x] Test production vs development mode
- [x] Mock gtag

#### 18. featureFlags.service.test.ts ✅
- [x] Test flag evaluation (enabled/disabled)
- [x] Test rollout percentage logic
- [x] Test user agent conditions
- [x] Test location-based conditions
- [x] Test time-based conditions
- [x] Test React hook integration
- [x] Test default values

#### 19. healthCheck.service.test.ts ✅
- [x] Test browser API checks
- [x] Test memory usage checks
- [x] Test network connectivity checks
- [x] Test storage availability checks
- [x] Test monitoring interval
- [x] Test overall status calculation
- [x] Test health endpoint middleware

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
- ✅ **Phase 2 COMPLETED**: All utility service tests (62 tests) are now implemented and passing:
  - rateLimiter.service.test.ts (19 tests)
  - requestBatcher.service.test.ts (18 tests)
  - base.service.test.ts (25 tests)
- ✅ **Phase 3 COMPLETED**: All critical hooks tests are now implemented and passing:
  - useGeolocation.test.ts (12 tests)
  - useDistanceCalculation.test.ts (14 tests)
  - useDebounce.test.ts (15 tests)
  - useErrorHandler.test.ts (20 tests)
- ✅ **Phase 4 COMPLETED**: All component tests are now implemented and passing:
  - LocationContext.test.tsx (17 tests)
  - DestinationInput.test.tsx (14 tests)
  - ErrorBoundary.test.tsx (16 tests)
  - PullToRefresh.test.tsx (15 tests)
- ✅ **Phase 5 COMPLETED**: All supporting service tests are now implemented and passing:
  - analytics.service.test.ts (26 tests)
  - featureFlags.service.test.ts (24 tests)
  - healthCheck.service.test.ts (27 tests)

This plan provides comprehensive coverage of the application's business logic while maintaining practical scope and timeline constraints.