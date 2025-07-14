
import React from 'react';
import { animations } from '@/styles/constants';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animated compass/globe */}
      <div className="relative w-32 h-32">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-8 border-t-sky border-r-sunshine border-b-grape border-l-soft-purple animate-spin"></div>
        
        {/* Inner spinning ring (opposite direction) */}
        <div className="absolute inset-2 rounded-full border-4 border-t-soft-orange border-r-soft-green border-b-soft-yellow border-l-soft-purple animate-spin" style={{animationDirection: 'reverse', animationDuration: animations.durations.extended}}></div>
        
        {/* Center globe emoji */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl animate-pulse">🌍</span>
        </div>
        
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{animationDuration: animations.durations.prolonged}}>
          <div className="absolute top-0 left-1/2 w-3 h-3 bg-sky rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-sunshine rounded-full -translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute left-0 top-1/2 w-3 h-3 bg-grape rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute right-0 top-1/2 w-3 h-3 bg-soft-orange rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>
      
      <p className="mt-6 text-xl font-black bg-gradient-to-r from-sky via-grape to-sunshine bg-clip-text text-transparent animate-pulse">
        🔍 Finding your location... 📍
      </p>
      
      {/* Fun loading messages that cycle */}
      <div className="mt-2 h-6">
        <p className="text-lg font-bold text-gray-600 dark:text-gray-300 animate-fade-in">
          Asking the satellites nicely...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
