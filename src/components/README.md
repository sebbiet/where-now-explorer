# Component Documentation

This directory contains all React components for the Where Now Explorer application.

## Component Organization

### Layout Components
- **AnimatedBackground** - Provides the animated gradient background with floating bubbles
- **DecorativeElements** - Large screen decorative emojis for visual enhancement
- **PageHeader** - Top header containing theme toggle
- **PageTitle** - Main application title with animated styling
- **Footer** - Application footer with author credits

### Navigation Components
- **TabNavigation** - Toggle switch between location and destination views

### UI Components
- **GlassmorphicCard** - Reusable glass morphism card container
- **LoadingSpinner** - Animated loading indicator
- **ThemeToggle** - Light/dark mode toggle button
- **ErrorFallback** - Kid-friendly error display component

### Location Components
- **LocationSection** - Main location display with refresh functionality
- **LocationDisplay** - Shows current location details and address
- **MockLocationIndicator** - Development-only indicator for mock locations

### Destination Components
- **DestinationSection** - Destination search and distance calculator
- **DestinationInput** - Autocomplete search input for destinations
- **DistanceCalculator** - Calculates and displays route information

### Utility Components
- **DebugPanel** - Development panel for state inspection and mock locations
- **OfflineNotification** - Shows notification when app is offline
- **FirstNationsAcknowledgment** - Traditional land acknowledgment display

## Component Guidelines

### Structure
- All components use functional components with hooks
- Complex components are memoized for performance
- Props interfaces are defined with TypeScript
- Components follow single responsibility principle

### Styling
- Tailwind CSS for utility classes
- Style constants in `src/styles/constants.ts` for consistency
- Glass morphism effects for modern UI
- Dark mode support throughout

### State Management
- Local state with useState for component-specific state
- Context API for global state (Location, Preferences)
- Custom hooks for reusable logic

### Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- WCAG 2.1 AA compliant

## Example Usage

```tsx
import { GlassmorphicCard, TabNavigation } from '@/components';

function MyComponent() {
  const [activeTab, setActiveTab] = useState<'current' | 'destination'>('current');
  
  return (
    <div>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <GlassmorphicCard>
        <p>Your content here</p>
      </GlassmorphicCard>
    </div>
  );
}
```

## Best Practices

1. **Memoization**: Use `React.memo` for components that receive props and don't need frequent re-renders
2. **Error Boundaries**: Wrap feature components in error boundaries
3. **Loading States**: Always show loading indicators during async operations
4. **Responsive Design**: Ensure components work on all screen sizes
5. **Performance**: Lazy load heavy components and use code splitting