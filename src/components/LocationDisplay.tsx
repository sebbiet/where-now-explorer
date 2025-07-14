
import React from 'react';

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
  const { street, suburb, city, county, state, country } = locationData;
  
  return (
    <div className="w-full max-w-2xl animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black bg-gradient-to-r from-grape to-sky bg-clip-text text-transparent">
          You are here! 🎉
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {street && (
          <div className="bg-gradient-to-br from-soft-yellow to-sunshine p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏠</span>
              <div>
                <p className="text-sm font-bold text-gray-700 opacity-80">Street</p>
                <p className="text-lg font-black text-gray-800">{street}</p>
              </div>
            </div>
          </div>
        )}
        
        {suburb && (
          <div className="bg-gradient-to-br from-soft-green to-emerald-300 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🌳</span>
              <div>
                <p className="text-sm font-bold text-gray-700 opacity-80">Suburb</p>
                <p className="text-lg font-black text-gray-800">{suburb}</p>
              </div>
            </div>
          </div>
        )}
        
        {city && (
          <div className="bg-gradient-to-br from-soft-purple to-grape p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏙️</span>
              <div>
                <p className="text-sm font-bold text-white opacity-80">City</p>
                <p className="text-lg font-black text-white">{city}</p>
              </div>
            </div>
          </div>
        )}
        
        {county && (
          <div className="bg-gradient-to-br from-soft-orange to-orange-400 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏛️</span>
              <div>
                <p className="text-sm font-bold text-white opacity-80">County</p>
                <p className="text-lg font-black text-white">{county}</p>
              </div>
            </div>
          </div>
        )}
        
        {state && (
          <div className="bg-gradient-to-br from-sky to-blue-500 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📍</span>
              <div>
                <p className="text-sm font-bold text-white opacity-80">State</p>
                <p className="text-lg font-black text-white">{state}</p>
              </div>
            </div>
          </div>
        )}
        
        {country && (
          <div className="bg-gradient-to-br from-pink-400 to-rose-500 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🌍</span>
              <div>
                <p className="text-sm font-bold text-white opacity-80">Country</p>
                <p className="text-lg font-black text-white">{country}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDisplay;
