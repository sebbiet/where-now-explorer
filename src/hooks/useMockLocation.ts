import { useState, useCallback } from 'react';

export interface MockLocation {
  latitude: number;
  longitude: number;
}

export const useMockLocation = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [location, setLocation] = useState<MockLocation | null>(null);

  const setMockLocation = useCallback((newLocation: MockLocation | null) => {
    if (process.env.NODE_ENV === 'development') {
      setLocation(newLocation);
    }
  }, []);

  const toggleMockLocation = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsEnabled(prev => !prev);
      if (!isEnabled && !location) {
        // Set default mock location when first enabling
        setLocation({ latitude: -33.8568, longitude: 151.2153 }); // Sydney Opera House
      }
    }
  }, [isEnabled, location]);

  const clearMockLocation = useCallback(() => {
    setLocation(null);
    setIsEnabled(false);
  }, []);

  return {
    isEnabled,
    location,
    setMockLocation,
    toggleMockLocation,
    clearMockLocation,
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};