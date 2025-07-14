
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
    <div className="w-full max-w-4xl mt-6 relative backdrop-blur-2xl rounded-3xl p-8 animate-fade-in" style={{
      background: 'rgba(255, 255, 255, 0.85)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8)
      `,
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      {/* Dark mode overlay */}
      <div className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none" style={{
        background: 'rgba(30, 41, 59, 0.9)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `
      }}></div>
      
      <div className="relative z-10">
        <h3 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-8">Trip to {destination}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <Route className="w-12 h-12 text-sky-500 dark:text-sky-400 mr-4 flex-shrink-0" />
            <div>
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium">Distance</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{distance}</p>
            </div>
          </div>
          
          <div className="flex items-center p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <Clock className="w-12 h-12 text-purple-500 dark:text-purple-400 mr-4 flex-shrink-0" />
            <div>
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium">Travel Time</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{duration}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationResult;
