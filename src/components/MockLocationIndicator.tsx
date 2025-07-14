import React from 'react';
import { useLocation } from '@/contexts/LocationContext';

const MockLocationIndicator: React.FC = () => {
  const { useMockLocation, mockLocation } = useLocation();
  
  // Only show in development when mock location is active
  if (process.env.NODE_ENV !== 'development' || !useMockLocation || !mockLocation) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm font-bold z-40 shadow-lg animate-pulse">
      <div className="flex items-center gap-2">
        <span className="text-lg">📍</span>
        <div>
          <div>MOCK LOCATION ACTIVE</div>
          <div className="text-xs opacity-90">
            {mockLocation.latitude.toFixed(4)}, {mockLocation.longitude.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockLocationIndicator;