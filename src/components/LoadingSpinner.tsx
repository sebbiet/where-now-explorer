
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 border-8 border-t-sky border-r-sunshine border-b-grape border-l-soft-purple rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-medium animate-pulse-gentle">Finding your location...</p>
    </div>
  );
};

export default LoadingSpinner;
