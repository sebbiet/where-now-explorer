# Testing Setup with Vitest

This document describes the testing infrastructure setup for the Where Now Explorer application.

## Overview

The project now uses Vitest as its test runner, configured to work with React, TypeScript, and the existing Vite setup.

## What Was Implemented

### 1. Dependencies Installed

- `vitest` - Fast unit test framework powered by Vite
- `@vitest/ui` - UI for viewing and interacting with tests
- `@vitest/coverage-v8` - Code coverage reporting
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Custom jest matchers for DOM testing
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM implementation for Node.js

### 2. Configuration Files

#### `vitest.config.ts`

- Extends the existing Vite configuration
- Configures jsdom as the test environment
- Sets up global test utilities
- Configures coverage reporting with sensible exclusions
- Enables CSS processing in tests

#### `tsconfig.test.json`

- TypeScript configuration specific to test files
- Includes Vitest globals and jest-dom types
- Extends the app TypeScript configuration

### 3. Test Setup

#### `src/test/setup.ts`

- Imports jest-dom matchers for extended assertions
- Configures automatic cleanup after each test
- Mocks browser APIs (matchMedia, ResizeObserver, geolocation)
- Sets up common test utilities

### 4. NPM Scripts

- `npm test` - Run tests in watch mode (interactive)
- `npm run test:run` - Run tests once (CI mode)
- `npm run test:ui` - Open Vitest UI for visual test exploration
- `npm run coverage` - Generate coverage report

### 5. Example Test

Created `src/App.test.tsx` as a simple example that:

- Mocks external service dependencies
- Tests basic rendering
- Demonstrates testing patterns

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Open test UI
npm run test:ui

# Generate coverage report
npm run coverage
```

## Next Steps

Now that the test infrastructure is in place, the next steps from the roadmap would be:

1. Create unit tests for all services:
   - `geolocation.service.ts`
   - `geocoding.service.ts`
   - `routing.service.ts`
   - And all other services in the `src/services/` directory

2. Test custom hooks:
   - `useGeolocation`
   - `useLocationSearch`
   - `useDestinationHistory`
   - And all other hooks in `src/hooks/`

3. Add integration tests for critical user flows:
   - Location permission flow
   - Setting a destination
   - Tracking progress to destination

4. Implement E2E tests for the location permission flow

5. Set up test coverage reporting and aim for 80%+ coverage

## Writing Tests

When writing new tests:

1. Place test files next to the code they test with `.test.ts(x)` extension
2. Use descriptive test names that explain what is being tested
3. Follow the Arrange-Act-Assert pattern
4. Mock external dependencies appropriately
5. Test both success and error cases

Example structure:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  it('should handle the happy path', () => {
    // Arrange
    // Act
    // Assert
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
  });
});
```
