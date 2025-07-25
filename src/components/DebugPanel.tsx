import React, { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDestinationHistory } from '@/hooks/useDestinationHistory';
import { GeocodingCacheService } from '@/services/geocodingCache.service';
import { LoadingButton } from '@/utils/loadingStates';
import ProductionStatus from './ProductionStatus';

const DebugPanel: React.FC = () => {
  const {
    locationData,
    isLoadingLocation,
    isRefreshingLocation,
    countdown,
    useMockLocation,
    mockLocation,
    setMockLocation,
    toggleMockLocation,
  } = useLocation();
  const { preferences } = usePreferences();
  const { history } = useDestinationHistory();

  // Local state for coordinate inputs
  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');

  // Loading states
  const [isClearing, setIsClearing] = useState(false);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  // Preset test locations
  const presetLocations = [
    { name: 'Sydney Opera House', lat: -33.8568, lng: 151.2153 },
    { name: 'Times Square, NYC', lat: 40.758, lng: -73.9855 },
    { name: 'Eiffel Tower, Paris', lat: 48.8584, lng: 2.2945 },
    { name: 'Big Ben, London', lat: 51.4994, lng: -0.1245 },
    { name: 'Golden Gate Bridge', lat: 37.8199, lng: -122.4783 },
  ];

  // Check if debug mode is enabled via URL parameter
  // Usage: ?debug=YOUR_SECRET_KEY (set via VITE_DEBUG_KEY env variable)
  // This allows viewing debug panel in production for troubleshooting
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  const debugKey = import.meta.env.VITE_DEBUG_KEY || 'development-only';
  // Only enable if key is set and matches (prevents access if env var not configured)
  const isDebugEnabled =
    debugKey !== 'development-only' && debugParam === debugKey;

  // Show in development OR when debug parameter is present
  if (process.env.NODE_ENV !== 'development' && !isDebugEnabled) {
    return null;
  }

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      localStorage.clear();
      GeocodingCacheService.clearCache();
      // Add a small delay to show the loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.reload();
    } finally {
      setIsClearing(false);
    }
  };

  const handleSetCustomLocation = async () => {
    setIsSettingLocation(true);
    try {
      const lat = parseFloat(inputLat);
      const lng = parseFloat(inputLng);

      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude values');
        return;
      }

      if (lat < -90 || lat > 90) {
        alert('Latitude must be between -90 and 90');
        return;
      }

      if (lng < -180 || lng > 180) {
        alert('Longitude must be between -180 and 180');
        return;
      }

      // Add a small delay to show the loading state
      await new Promise((resolve) => setTimeout(resolve, 300));

      setMockLocation({ latitude: lat, longitude: lng });
      // Enable mock location if not already enabled
      if (!useMockLocation) {
        toggleMockLocation();
      }
    } finally {
      setIsSettingLocation(false);
    }
  };

  const handlePresetLocation = async (
    name: string,
    lat: number,
    lng: number
  ) => {
    setLoadingPreset(name);
    try {
      // Add a small delay to show the loading state
      await new Promise((resolve) => setTimeout(resolve, 300));

      setMockLocation({ latitude: lat, longitude: lng });
      setInputLat(lat.toString());
      setInputLng(lng.toString());
      // Enable mock location if not already enabled
      if (!useMockLocation) {
        toggleMockLocation();
      }
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleResetToGPS = () => {
    setMockLocation(null);
    if (useMockLocation) {
      toggleMockLocation();
    }
    setInputLat('');
    setInputLng('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-4">
      {/* Show debug mode indicator in production */}
      {process.env.NODE_ENV === 'production' && (
        <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
          🔧 DEBUG MODE
        </div>
      )}

      {/* Production Status */}
      <div className="max-w-md">
        <ProductionStatus />
      </div>

      {/* Debug Panel */}
      <div className="bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-md max-h-96 overflow-auto">
        <h3 className="text-sm font-bold mb-2 text-yellow-400">
          🐛 Debug Panel
        </h3>

        <div className="space-y-2">
          <details className="cursor-pointer">
            <summary className="text-green-400">Location State</summary>
            <pre className="mt-1 text-gray-300 overflow-x-auto">
              {JSON.stringify(
                {
                  locationData,
                  isLoadingLocation,
                  isRefreshingLocation,
                  countdown,
                },
                null,
                2
              )}
            </pre>
          </details>

          <details className="cursor-pointer">
            <summary className="text-red-400">
              📍 Mock Location
              {useMockLocation ? '(ACTIVE)' : '(OFF)'}
            </summary>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMockLocation}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    useMockLocation
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {useMockLocation ? 'Disable Mock' : 'Enable Mock'}
                </button>
                {useMockLocation && (
                  <button
                    onClick={handleResetToGPS}
                    className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs"
                  >
                    Reset to GPS
                  </button>
                )}
              </div>

              {mockLocation && (
                <div className="text-gray-300 text-xs">
                  Current: {mockLocation.latitude.toFixed(4)},{' '}
                  {mockLocation.longitude.toFixed(4)}
                </div>
              )}

              <div className="space-y-1">
                <div className="text-gray-400 text-xs">Custom Coordinates:</div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                    step="any"
                  />
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={inputLng}
                    onChange={(e) => setInputLng(e.target.value)}
                    className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                    step="any"
                  />
                  <LoadingButton
                    isLoading={isSettingLocation}
                    loadingText="Setting..."
                    onClick={handleSetCustomLocation}
                    className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                  >
                    Set
                  </LoadingButton>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400 text-xs">Quick Locations:</div>
                <div className="grid grid-cols-1 gap-1">
                  {presetLocations.map((location) => (
                    <LoadingButton
                      key={location.name}
                      isLoading={loadingPreset === location.name}
                      loadingText="Loading..."
                      onClick={() =>
                        handlePresetLocation(
                          location.name,
                          location.lat,
                          location.lng
                        )
                      }
                      className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs text-left"
                    >
                      {location.name}
                    </LoadingButton>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <details className="cursor-pointer">
            <summary className="text-blue-400">Preferences</summary>
            <pre className="mt-1 text-gray-300 overflow-x-auto">
              {JSON.stringify(preferences, null, 2)}
            </pre>
          </details>

          <details className="cursor-pointer">
            <summary className="text-purple-400">
              Destination History ({history.length})
            </summary>
            <pre className="mt-1 text-gray-300 overflow-x-auto">
              {JSON.stringify(history, null, 2)}
            </pre>
          </details>

          <details className="cursor-pointer">
            <summary className="text-orange-400">Cache Info</summary>
            <div className="mt-1 text-gray-300">
              <p>
                localStorage used:{' '}
                {(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB
              </p>
              <p>Total items: {Object.keys(localStorage).length}</p>
            </div>
          </details>

          <div className="mt-4 space-x-2">
            <LoadingButton
              isLoading={isClearing}
              loadingText="Clearing..."
              onClick={clearAllData}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
            >
              Clear All Data
            </LoadingButton>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
