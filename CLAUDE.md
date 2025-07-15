# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start development server on port 8080
npm run build      # Production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm test           # Run unit tests with Vitest
npm run test:run   # Run tests once (CI mode)
npm run coverage   # Generate test coverage report
```

## Architecture Overview

This is a React + TypeScript web application built with Vite. The "There yet app!" provides location-based features for families, including real-time location tracking and destination progress monitoring to answer "Are we there yet?"

### Key Technology Decisions

- **UI Components**: Uses shadcn/ui component library (50+ components in `src/components/ui/`)
- **Styling**: Tailwind CSS with custom theme configuration and CSS variables
- **State Management**: React Context for location state, React Query for server state
- **Forms**: React Hook Form + Zod for validation

### Core Application Flow

1. **Location Services** (`src/contexts/LocationContext.tsx`): 
   - Watches user's geolocation using browser API
   - Performs reverse geocoding via OpenStreetMap Nominatim API
   - Updates every 30 seconds when active
2. **Destination Tracking**: Allows setting destinations and tracks distance/progress

### Development Notes

- TypeScript is configured with relaxed settings (no strict null checks)
- Path alias `@/` maps to `src/` directory
- Testing framework: Vitest with Testing Library for React components
- Comprehensive unit test suite covering services, hooks, and components
- Deployed to custom domain with GitHub Actions

### Component Patterns

- Functional components with hooks
- Provider pattern for global state
- Custom hooks in `src/hooks/` for reusable logic
- Feature-based organization (Location, Destination components)