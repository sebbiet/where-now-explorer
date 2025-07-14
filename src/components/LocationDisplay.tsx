
import React from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { sanitizeLocationData } from '@/utils/privacy';

interface LocationDisplayProps {
  locationData: {
    street?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ locationData }) => {
  const { preferences } = usePreferences();
  
  // Apply privacy settings to location data
  const sanitizedData = sanitizeLocationData(
    locationData,
    preferences.privacyMode,
    preferences.hideExactCoordinates
  );
  
  const { street, suburb, city, county, state, country } = sanitizedData;
  
  return (
    <div className="w-full max-w-4xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-grape to-sky bg-clip-text text-transparent">
          You are here! 🎉
        </h2>
        {preferences.privacyMode && (
          <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🔒 Privacy mode is active - showing approximate location only
            </p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {street && (
          <div className="bg-gradient-to-br from-soft-yellow to-sunshine p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-yellow-200/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="House">🏠</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">Street</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{street}</p>
              </div>
            </div>
          </div>
        )}
        
        {suburb && (
          <div className="bg-gradient-to-br from-soft-green to-emerald-300 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-green-200/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="Tree">🌳</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">Suburb</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{suburb}</p>
              </div>
            </div>
          </div>
        )}
        
        {city && (
          <div className="bg-gradient-to-br from-soft-purple to-grape p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-purple-300/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="City">🏙️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white opacity-90 uppercase tracking-wider">City</p>
                <p className="text-xl font-black text-white leading-tight">{city}</p>
              </div>
            </div>
          </div>
        )}
        
        {county && (
          <div className="bg-gradient-to-br from-soft-orange to-orange-400 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-orange-200/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="Building">🏛️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white opacity-90 uppercase tracking-wider">County</p>
                <p className="text-xl font-black text-white leading-tight">{county}</p>
              </div>
            </div>
          </div>
        )}
        
        {state && (
          <div className="bg-gradient-to-br from-sky to-blue-500 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-blue-200/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="Location pin">📍</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white opacity-90 uppercase tracking-wider">State</p>
                <p className="text-xl font-black text-white leading-tight">{state}</p>
              </div>
            </div>
          </div>
        )}
        
        {country && (
          <div className="bg-gradient-to-br from-pink-400 to-rose-500 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 border border-pink-200/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label="World">🌍</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white opacity-90 uppercase tracking-wider">Country</p>
                <p className="text-xl font-black text-white leading-tight">{country}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDisplay;
