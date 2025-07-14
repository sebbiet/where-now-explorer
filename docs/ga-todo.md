# Google Analytics Implementation Plan for There Yet App

## Overview
This document outlines the implementation plan for adding Google Analytics (GA4) to the There Yet App, including custom events to track user behavior and app performance.

## Implementation Steps

### 1. Add Google Analytics Script ✅ COMPLETED
**File**: `index.html`

Add the following to the `<head>` section:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9T5V0V3KZ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-S9T5V0V3KZ');
</script>
```

**CSP Update Required**: ✅ COMPLETED
- ✅ Add `https://www.googletagmanager.com` to script-src
- ✅ Add `https://www.google-analytics.com` to connect-src

### 2. Create Analytics Service ✅ COMPLETED
**File**: `src/services/analytics.service.ts`

Create a centralized service to manage all analytics events with TypeScript support.

```typescript
// Example structure
interface AnalyticsEvent {
  event: string;
  category?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

class AnalyticsService {
  track(eventName: string, parameters?: any) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }
  }
}
```

**Implementation includes**:
- ✅ TypeScript interfaces for all event parameters
- ✅ Development mode logging
- ✅ Error handling for blocked trackers
- ✅ Methods for all Phase 1 & 2 events

## Proposed Events to Track

### Core User Actions

#### 1. Location Permission Events
- **Event**: `location_permission_granted`
  - When: User allows location access
  - Parameters: `timestamp`
  
- **Event**: `location_permission_denied`  
  - When: User denies location access
  - Parameters: `timestamp`

- **Event**: `location_permission_error`
  - When: Location access fails
  - Parameters: `error_type`, `error_message`

#### 2. Location Features
- **Event**: `location_refresh`
  - When: User manually refreshes location
  - Parameters: `refresh_type` (manual/automatic), `countdown_remaining`

- **Event**: `location_updated`
  - When: Location successfully updates
  - Parameters: `update_type` (initial/refresh), `has_traditional_land_info`

#### 3. Destination Search & Calculation
- **Event**: `destination_search_started`
  - When: User starts typing in destination field
  - Parameters: `search_length`

- **Event**: `destination_suggestion_selected`
  - When: User selects from autocomplete
  - Parameters: `suggestion_index`, `total_suggestions`

- **Event**: `destination_calculated`
  - When: Route successfully calculated
  - Parameters: `distance_km`, `duration_minutes`, `destination_type`

- **Event**: `destination_calculation_error`
  - When: Route calculation fails
  - Parameters: `error_type`, `destination_query`

#### 4. Navigation & UI Interactions
- **Event**: `tab_switched`
  - When: User switches between tabs
  - Parameters: `from_tab`, `to_tab`, `interaction_method` (click/keyboard)

- **Event**: `theme_toggled`
  - When: User changes theme
  - Parameters: `new_theme` (light/dark), `system_preference`

### Feature Usage Events

#### 5. PWA Installation
- **Event**: `pwa_install_prompted`
  - When: Install prompt appears
  - Parameters: `prompt_trigger` (auto/manual)

- **Event**: `pwa_install_accepted`
  - When: User installs PWA
  - Parameters: `time_to_install`

- **Event**: `pwa_install_dismissed`
  - When: User dismisses install prompt
  - Parameters: `dismiss_method`

#### 6. Privacy & Settings
- **Event**: `privacy_mode_toggled`
  - When: Privacy mode changed
  - Parameters: `new_state` (on/off)

- **Event**: `auto_refresh_changed`
  - When: Auto-refresh interval modified
  - Parameters: `old_interval`, `new_interval`

### Performance & Error Events

#### 8. API Performance
- **Event**: `api_response_time`
  - When: API calls complete
  - Parameters: `api_type` (geocoding/routing), `response_time_ms`, `success`

- **Event**: `api_error`
  - When: API calls fail
  - Parameters: `api_type`, `error_code`, `retry_count`

#### 9. App Performance
- **Event**: `page_performance`
  - When: Page loads
  - Parameters: Core Web Vitals (LCP, FID, CLS)

- **Event**: `offline_mode_activated`
  - When: App goes offline
  - Parameters: `cached_routes_count`

### User Journey Events

#### 10. Session & Engagement
- **Event**: `session_started`
  - When: User opens app
  - Parameters: `entry_point`, `referrer`

- **Event**: `destination_history_accessed`
  - When: User accesses destination history
  - Parameters: `history_count`

- **Event**: `haptic_feedback_triggered`
  - When: Haptic feedback fires (mobile)
  - Parameters: `trigger_action`, `feedback_type`

## Implementation Priority

### Phase 1 (Core Analytics) ✅ COMPLETED
1. ✅ Add GA script and update CSP
2. ✅ Create analytics service
3. ✅ Implement basic page view tracking (automatic via gtag config)
4. ✅ Add location permission events
5. ✅ Add destination search/calculation events

### Phase 2 (User Behavior) ✅ COMPLETED
1. ✅ Tab switching events
2. ✅ Theme toggle tracking
3. ✅ Manual refresh tracking
4. ✅ Error tracking (ErrorBoundary, global handlers)

### Phase 3 (Advanced Features)
1. PWA installation tracking
2. Performance metrics
3. API response tracking
4. Offline mode tracking
5. Debug feature usage

## Privacy Considerations

1. **No PII Collection**: Ensure no personally identifiable information is sent
2. **Location Privacy**: Never send actual coordinates, only track actions
3. **Consent**: Consider adding analytics consent banner if required by region
4. **Data Retention**: Configure appropriate data retention in GA4

## Testing Plan

1. Use GA4 DebugView for real-time event testing
2. Verify all events fire correctly in development
3. Test that events don't fire when offline
4. Ensure no errors when gtag is blocked by ad blockers

## Success Metrics

Track these KPIs after implementation:
- User engagement rate
- Feature adoption rates
- Error rates and types
- Performance metrics
- User journey completion rates

## Notes

- All events should gracefully handle when GA is blocked
- Consider implementing a feature flag to disable analytics in development
- Review and adjust event parameters based on initial data
- Set up custom audiences and conversions in GA4 based on key events