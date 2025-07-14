import React from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDestinationHistory } from '@/hooks/useDestinationHistory';
import { GeocodingCacheService } from '@/services/geocodingCache.service';

const DebugPanel: React.FC = () => {
  const { locationData, isLoadingLocation, isRefreshingLocation, countdown } = useLocation();
  const { preferences } = usePreferences();
  const { history } = useDestinationHistory();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const clearAllData = () => {
    localStorage.clear();
    GeocodingCacheService.clearCache();
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-md max-h-96 overflow-auto z-50">
      <h3 className="text-sm font-bold mb-2 text-yellow-400">🐛 Debug Panel</h3>
      
      <div className="space-y-2">
        <details className="cursor-pointer">
          <summary className="text-green-400">Location State</summary>
          <pre className="mt-1 text-gray-300 overflow-x-auto">
            {JSON.stringify({
              locationData,
              isLoadingLocation,
              isRefreshingLocation,
              countdown
            }, null, 2)}
          </pre>
        </details>

        <details className="cursor-pointer">
          <summary className="text-blue-400">Preferences</summary>
          <pre className="mt-1 text-gray-300 overflow-x-auto">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </details>

        <details className="cursor-pointer">
          <summary className="text-purple-400">Destination History ({history.length})</summary>
          <pre className="mt-1 text-gray-300 overflow-x-auto">
            {JSON.stringify(history, null, 2)}
          </pre>
        </details>

        <details className="cursor-pointer">
          <summary className="text-orange-400">Cache Info</summary>
          <div className="mt-1 text-gray-300">
            <p>localStorage used: {(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</p>
            <p>Total items: {Object.keys(localStorage).length}</p>
          </div>
        </details>

        <div className="mt-4 space-x-2">
          <button
            onClick={clearAllData}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            Clear All Data
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;