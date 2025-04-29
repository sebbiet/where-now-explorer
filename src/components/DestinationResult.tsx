
import React from 'react';
import { Clock, Route } from 'lucide-react';

interface DestinationResultProps {
  destination: string;
  distance: string;
  duration: string;
}

const DestinationResult: React.FC<DestinationResultProps> = ({ 
  destination, 
  distance, 
  duration 
}) => {
  return (
    <div className="bubble bg-gradient-to-br from-white to-soft-yellow dark:from-gray-800 dark:to-gray-700 w-full max-w-md mt-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-4">Trip to {destination}</h3>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <Route className="w-6 h-6 text-sky mr-2" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Distance</p>
            <p className="text-xl font-semibold">{distance}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <Clock className="w-6 h-6 text-sky mr-2" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Travel Time</p>
            <p className="text-xl font-semibold">{duration}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationResult;
