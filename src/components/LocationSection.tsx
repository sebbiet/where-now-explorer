
import React, { memo } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationDisplay from '@/components/LocationDisplay';
import LocationPin from '@/components/LocationPin';
import { useLocation } from '@/contexts/LocationContext';

const LocationSection = () => {
  const { 
    locationData, 
    isLoadingLocation, 
    isRefreshingLocation, 
    countdown, 
    handleRefresh
  } = useLocation();

  if (isLoadingLocation) {
    return (
      <div className="w-full">
        <LocationPin />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full">
      <LocationPin />
      
      <div className={isRefreshingLocation ? "animate-pulse" : ""}>
        <LocationDisplay locationData={locationData} />
      </div>
      
      <div className="flex justify-center mt-6">
        <button 
          onClick={handleRefresh}
          className={`
            relative px-8 py-4 text-lg font-black text-white
            bg-gradient-to-r from-sky via-sunshine to-grape
            rounded-full shadow-xl transform transition-all duration-300
            hover:scale-110 hover:shadow-2xl active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isRefreshingLocation ? 'animate-pulse' : ''}
          `}
          disabled={isLoadingLocation || isRefreshingLocation}
        >
          <span className="flex items-center gap-2">
            <span className="text-2xl animate-spin" style={{animationDuration: '3s'}}>🔄</span>
            <span>Refresh in {countdown}s</span>
            <span className="text-2xl">⏰</span>
          </span>
          
          {/* Animated background effect */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
        </button>
      </div>
    </div>
  );
};

export default memo(LocationSection);
