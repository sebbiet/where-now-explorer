
import React from 'react';
import { MapPin } from 'lucide-react';

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
    <div className="bubble bg-gradient-to-br from-white to-soft-purple dark:from-gray-800 dark:to-gray-700 w-full max-w-md animate-fade-in">
      <div className="flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-grape mr-2" />
        <h2 className="text-2xl font-bold text-center">You are here!</h2>
      </div>
      
      <div className="space-y-2">
        {street && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">Street:</span> {street}
          </p>
        )}
        
        {suburb && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">Suburb:</span> {suburb}
          </p>
        )}
        
        {city && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">City:</span> {city}
          </p>
        )}
        
        {county && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">County:</span> {county}
          </p>
        )}
        
        {state && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">State:</span> {state}
          </p>
        )}
        
        {country && (
          <p className="text-xl">
            <span className="font-semibold text-gray-600 dark:text-gray-300">Country:</span> {country}
          </p>
        )}
      </div>
    </div>
  );
};

export default LocationDisplay;
