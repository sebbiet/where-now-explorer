# Refactoring Plan - Where Now Explorer

## Progress Summary

### Phase 1: Critical Foundation Issues ✅

- ✅ **1.1 Error Handling Deduplication** - Created centralized error handling utilities
- ✅ **1.2 Type Safety Improvements** - Replaced any types with proper interfaces
- ✅ **1.3 Service Architecture Decoupling** - Created core service infrastructure with DI

### Phase 2: Component Quality ✅

- ✅ **2.1 DestinationInput Refactoring** - Split into SearchInput, SuggestionsList, and DestinationSearch
- ✅ **2.2 Performance Optimizations** - Added memoization to contexts and components
- ✅ **2.3 Toast Pattern Standardization** - Created comprehensive toast helpers

### Phase 3: Polish & Cleanup ✅

- ✅ **3.1 Logging Standardization** - Replaced console calls with logger service
- ✅ **3.2 Test Type Safety** - Created mock types for better test type safety

## Overview

This document outlines a comprehensive refactoring plan to improve code maintainability, type safety, and overall architecture quality based on analysis of the current codebase.

## Current State Assessment

The codebase is generally well-structured with:

- ✅ Good documentation and JSDoc comments
- ✅ Comprehensive test coverage
- ✅ Modern development tooling (Prettier, ESLint, Husky)
- ✅ Strong accessibility and performance foundations

However, recent rapid development has introduced maintainability challenges that need addressing.

---

## Priority-Based Refactoring Plan

### 🚨 Phase 1: Critical Foundation Issues (Week 1)

#### 1.1 Error Handling Deduplication ✅

**Priority:** High | **Effort:** 1-2 hours | **Impact:** High  
**Status:** COMPLETED

**Problem:**

- Identical GeolocationError handling code in `LocationContext.tsx` and `useGeolocation.ts`
- 45+ similar `toast.error` patterns with inconsistent retry actions

**Solution:**

```typescript
// Create: src/utils/errorHandling.ts
export const handleGeolocationError = (
  error: GeolocationError,
  options: { onRetry?: () => void; context?: string }
) => {
  // Centralized error handling logic
};

export const createErrorToast = (
  message: string,
  options: { action?: { label: string; onClick: () => void } }
) => {
  // Standardized toast error patterns
};
```

**Files to Update:**

- `src/contexts/LocationContext.tsx` (lines 157-205)
- `src/hooks/useGeolocation.ts` (lines 36-82)
- All components using `toast.error`

#### 1.2 Type Safety Improvements ✅

**Priority:** High | **Effort:** 4-6 hours | **Impact:** High  
**Status:** COMPLETED

**Problem:**

- 50+ instances of `any` type usage reducing type safety
- Critical services lack proper typing

**Solution:**
Replace `any` types with proper interfaces:

```typescript
// Instead of: body?: any
interface RequestBody {
  [key: string]: unknown;
}

// Instead of: options?: any
interface ServiceOptions {
  timeout?: number;
  retries?: number;
  fallback?: boolean;
}
```

**Files to Update:**

- `src/services/base.service.ts` (lines 123, 156, etc.)
- `src/services/geocodingCache.service.ts` (lines 101, 127, 180)
- All service files with `any` usage

#### 1.3 Service Architecture Decoupling ✅

**Priority:** High | **Effort:** 1-2 days | **Impact:** High  
**Status:** COMPLETED (Core infrastructure created)

**Problem:**

- Tight coupling between services makes testing difficult
- BaseService class does too many things (420 lines)

**Solution:**
Implement dependency injection and composition:

```typescript
// Create: src/services/core/
interface HttpClient {
  request<T>(options: RequestOptions): Promise<T>;
}

interface Monitor {
  track(event: string, data: unknown): void;
}

interface RetryStrategy {
  execute<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>;
}

// Services become composable
class GeocodingService {
  constructor(
    private http: HttpClient,
    private monitor: Monitor,
    private retry: RetryStrategy
  ) {}
}
```

**New File Structure:**

```
src/services/
├── core/
│   ├── http-client.ts
│   ├── monitor.ts
│   ├── retry-strategy.ts
│   └── cache.ts
├── geocoding.service.ts (refactored)
├── geolocation.service.ts (refactored)
└── routing.service.ts (refactored)
```

### 🟡 Phase 2: Component Quality (Week 2)

#### 2.1 DestinationInput Refactoring ✅

**Priority:** Medium | **Effort:** 4-6 hours | **Impact:** Medium  
**Status:** COMPLETED

**Problem:**

- 303-line component with multiple responsibilities
- Complex address parsing logic embedded in component

**Solution:**
Extract utilities and split responsibilities:

```typescript
// Create: src/utils/addressFormatting.ts
export const formatGeocodeResult = (result: GeocodeResult): string => {
  // Extract address formatting logic
};

export const parseAddressComponents = (address: ReverseGeocodeResult) => {
  // Extract address parsing logic
};

// Refactor: src/components/DestinationInput.tsx
// Split into smaller components:
// - SearchInput
// - SuggestionsList
// - AddressDisplay
```

#### 2.2 Performance Optimizations ✅

**Priority:** Medium | **Effort:** 2-3 hours | **Impact:** Medium  
**Status:** COMPLETED

**Problem:**

- Limited use of `useMemo`/`useCallback` (only 10 instances)
- Missing memoization for expensive operations

**Solution:**
Add strategic memoization:

```typescript
// In components with expensive calculations
const formattedDistance = useMemo(() => formatDistance(distance), [distance]);

const handleSearch = useCallback(
  (query: string) => {
    // Memoize callback functions
  },
  [dependencies]
);

// In contexts
const contextValue = useMemo(
  () => ({
    location,
    error,
    loading,
    getCurrentLocation,
  }),
  [location, error, loading]
);
```

#### 2.3 Toast Pattern Standardization ✅

**Priority:** Medium | **Effort:** 2-3 hours | **Impact:** Medium  
**Status:** COMPLETED

**Solution:**
Create standardized toast patterns:

```typescript
// Create: src/utils/toastHelpers.ts
export const toastError = {
  location: (onRetry?: () => void) =>
    toast.error('Location access denied', {
      action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    }),
  network: (onRetry?: () => void) =>
    toast.error('Network error occurred', {
      action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    }),
  // ... other patterns
};
```

### 🟢 Phase 3: Polish & Cleanup (Week 3)

#### 3.1 Logging Standardization ✅

**Priority:** Low | **Effort:** 2-3 hours | **Impact:** Low  
**Status:** COMPLETED

**Problem:**

- 20+ direct console calls instead of structured logging

**Solution:**
Replace with logger service:

```typescript
// Use existing logger service consistently
import { logger } from '@/utils/logger';

// Replace: console.log('Debug info', data)
// With: logger.debug('Debug info', { data })
```

#### 3.2 Test Type Safety ✅

**Priority:** Low | **Effort:** 1 day | **Impact:** Low  
**Status:** COMPLETED

**Problem:**

- Test files have extensive `as any` casting
- Relaxed type safety in tests

**Solution:**
Improve test type definitions:

```typescript
// Create proper mock types
interface MockGeolocation {
  getCurrentPosition: jest.MockedFunction<
    typeof navigator.geolocation.getCurrentPosition
  >;
  watchPosition: jest.MockedFunction<
    typeof navigator.geolocation.watchPosition
  >;
}

// Replace: (navigator.geolocation as any).getCurrentPosition
// With: (navigator.geolocation as MockGeolocation).getCurrentPosition
```

---

## Implementation Strategy

### Week 1: Foundation

**Goals:** Eliminate critical technical debt, improve type safety
**Success Metrics:**

- Reduce `any` types by 70%
- Eliminate code duplication in error handling
- Establish service architecture patterns

### Week 2: Components

**Goals:** Improve component maintainability, add performance optimizations
**Success Metrics:**

- Reduce average component size by 30%
- Add memoization to 80% of expensive operations
- Standardize all toast patterns

### Week 3: Polish

**Goals:** Clean up remaining technical debt
**Success Metrics:**

- Replace all console calls with logger
- Improve test type safety
- Document new patterns

---

## Risk Assessment

### Low Risk

- Error handling utilities (existing patterns, just centralized)
- Toast standardization (cosmetic changes)
- Logging improvements (additive changes)

### Medium Risk

- Component refactoring (requires careful testing)
- Performance optimizations (could introduce bugs if done incorrectly)

### High Risk

- Service architecture changes (major structural changes)
- Type safety improvements (could reveal hidden bugs)

### Mitigation Strategies

1. **Incremental Changes:** Make small, testable changes
2. **Comprehensive Testing:** Run full test suite after each change
3. **Feature Flags:** Use feature flags for major architectural changes
4. **Rollback Plan:** Maintain git branches for easy rollback

---

## Success Metrics

### Code Quality Metrics

- **Type Safety:** Reduce `any` usage from 50+ to <10 instances
- **Code Duplication:** Eliminate identified duplicate patterns
- **Component Complexity:** Average component size <200 lines
- **Test Coverage:** Maintain >80% coverage throughout refactoring

### Performance Metrics

- **Bundle Size:** Maintain current size (~350KB)
- **Lighthouse Scores:** Maintain >90 performance score
- **Memory Usage:** No memory leaks introduced
- **Core Web Vitals:** Maintain current metrics

### Developer Experience Metrics

- **Build Time:** No significant increase
- **Type Checking:** Faster TypeScript compilation
- **IDE Support:** Better autocomplete and error detection
- **Test Reliability:** Maintain >95% test pass rate

---

## Testing Strategy

### Unit Tests

- Test all new utilities (error handling, toast helpers)
- Ensure refactored components maintain same behavior
- Add tests for new service architecture

### Integration Tests

- Test service interactions with new architecture
- Verify error handling flows end-to-end
- Test performance optimizations don't break functionality

### Manual Testing

- Full user journey testing after each phase
- Cross-browser testing for any component changes
- Mobile testing for performance improvements

---

## Documentation Updates

### Code Documentation

- Update JSDoc for refactored functions
- Document new architectural patterns
- Add examples for new utilities

### Developer Documentation

- Update API documentation for service changes
- Document new patterns and conventions
- Add migration guide for developers

---

## Resource Requirements

### Development Time

- **Phase 1:** 2-3 days (16-24 hours)
- **Phase 2:** 1-2 days (8-16 hours)
- **Phase 3:** 1 day (6-8 hours)
- **Total:** 4-6 days (30-48 hours)

### Dependencies

- No new dependencies required
- May remove some dependencies through consolidation
- Potential TypeScript version update

---

## Long-term Benefits

### Maintainability

- Easier to add new features
- Faster bug fixes
- Better code reusability

### Performance

- Improved runtime performance
- Better development experience
- Reduced bundle size potential

### Team Productivity

- Clearer code patterns
- Better type safety
- Reduced debugging time

### Technical Debt Reduction

- Elimination of code duplication
- Improved architecture
- Better separation of concerns

---

## Refactoring Completion Summary

### All Phases Completed ✅

**Phase 1: Critical Foundation Issues** - COMPLETED

- Created centralized error handling utilities
- Improved type safety by replacing `any` types
- Built service architecture with dependency injection

**Phase 2: Component Quality** - COMPLETED

- Refactored DestinationInput into smaller components
- Added memoization for performance optimization
- Standardized toast patterns for consistent UX

**Phase 3: Polish & Cleanup** - COMPLETED

- Replaced console calls with structured logging
- Improved test type safety with proper mock types

### Key Achievements

1. **Code Quality**
   - Eliminated code duplication in error handling
   - Reduced `any` type usage significantly
   - Improved component modularity

2. **Performance**
   - Added memoization to prevent unnecessary re-renders
   - Optimized context value creation
   - Maintained bundle size and performance metrics

3. **Developer Experience**
   - Better type safety throughout the codebase
   - Consistent error handling and user feedback
   - Structured logging for easier debugging

4. **Maintainability**
   - Clear separation of concerns
   - Reusable utilities and patterns
   - Better testability with proper types

---

This refactoring plan provides a structured approach to improving code quality while minimizing risk and maintaining functionality. Each phase builds on the previous one, ensuring a stable foundation for future development.
